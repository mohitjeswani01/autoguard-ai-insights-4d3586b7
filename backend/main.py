# backend/main.py
import os
import shutil
import uuid
from datetime import datetime, timedelta, date
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query, Form
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
import uvicorn
import logging
from math import ceil
import threading
from concurrent.futures import ThreadPoolExecutor
import json

# Import custom services
from services.yolo_service import LocalAnalyzer
from services.fallback_service import CloudAnalyzer

# Import database and schemas
from models.database import init_db, get_db, engine, ClaimModel, AnalysisResultModel, Base, ClaimStatus, SessionLocal, InsuranceDetailsModel
from schemas import (
    UploadResponse, AnalysisResult, Claim, ClaimFilters, PaginatedResponse,
    DashboardStats, TrendDataPoint, ApproveClaimRequest, RejectClaimRequest,
    RequestReviewRequest, VehicleInfo, SeverityInfo, DamageAssessment, 
    BoundingBox, AnalysisStatus, ReportRequest, LoginRequest, Token, User,
    InsuranceFormData, InsuranceCalculations, InsuranceDetailsResponse, AnalysisResultWithInsurance
)
import base64
from pathlib import Path
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import timedelta
import secrets

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize database and manage lifecycle
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialized")
    yield

# Initialize FastAPI app
app = FastAPI(
    title="AutoGuard AI - Backend",
    description="AI-powered vehicle damage assessment API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI Services
local_ai = LocalAnalyzer()
cloud_ai = CloudAnalyzer()

# Create thread pool for background processing
executor = ThreadPoolExecutor(max_workers=2)

# ============================================
# HELPER FUNCTIONS
# ============================================

def model_to_analysis_result(db_result: AnalysisResultModel) -> AnalysisResult:
    """Convert database AnalysisResultModel to Pydantic AnalysisResult schema"""
    vehicle_info = VehicleInfo(
        make=db_result.vehicleMake,
        model=db_result.vehicleModel,
        year=db_result.vehicleYear,
        plateNumber=db_result.vehiclePlateNumber,
        vin=db_result.vehicleVin,
        color=db_result.vehicleColor,
    )
    
    severity_info = SeverityInfo(
        level=db_result.overallSeverityLevel,
        score=db_result.overallSeverityScore,
        description=db_result.overallSeverityDescription,
    )
    
    # Parse damages from JSON
    damages = []
    if db_result.damages:
        for dmg in db_result.damages:
            damage = DamageAssessment(
                id=dmg.get("id", str(uuid.uuid4())),
                partIdentified=dmg.get("partIdentified", "Unknown"),
                damageType=dmg.get("damageType", "scratch"),
                confidenceScore=dmg.get("confidenceScore", 0.0),
                boundingBox=BoundingBox(
                    x=dmg.get("boundingBox", {}).get("x", 0),
                    y=dmg.get("boundingBox", {}).get("y", 0),
                    width=dmg.get("boundingBox", {}).get("width", 0),
                    height=dmg.get("boundingBox", {}).get("height", 0),
                ),
                estimatedCost=dmg.get("estimatedCost", 0.0),
            )
            damages.append(damage)
    
    return AnalysisResult(
        id=db_result.id,
        imageUrl=db_result.imageUrl or "",
        vehicleInfo=vehicle_info,
        damages=damages,
        overallSeverity=severity_info,
        totalEstimatedCost=db_result.totalEstimatedCost,
        aiConfidence=db_result.aiConfidence,
        processedAt=db_result.processedAt.isoformat() if db_result.processedAt else "",
        status=db_result.status,
    )

def model_to_claim(db_claim: ClaimModel, db: Session) -> Claim:
    """Convert database ClaimModel to Pydantic Claim schema"""
    vehicle_info = VehicleInfo(**db_claim.vehicleInfoJson) if db_claim.vehicleInfoJson else VehicleInfo()
    
    analysis_result = None
    if db_claim.analysisResult:
        analysis_result = model_to_analysis_result(db_claim.analysisResult)
    
    return Claim(
        id=db_claim.id,
        claimNumber=db_claim.claimNumber,
        vehiclePlate=db_claim.vehiclePlate,
        vehicleInfo=vehicle_info,
        submittedAt=db_claim.submittedAt.isoformat(),
        processedAt=db_claim.processedAt.isoformat() if db_claim.processedAt else None,
        aiConfidence=db_claim.aiConfidence,
        status=db_claim.status,
        totalPayout=db_claim.totalPayout,
        analysisResult=analysis_result,
        adjusterNotes=db_claim.adjusterNotes,
    )

def generate_claim_number() -> str:
    """Generate a unique claim number"""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    random_suffix = str(uuid.uuid4())[:8].upper()
    return f"CLM-{timestamp}-{random_suffix}"

def calculate_realistic_damage_cost(damage_type: str, confidence: float, area_size: float) -> float:
    """
    Calculate realistic repair cost based on Indian market rates (Revised).
    
    Damage type base rates (INR per incident):
    - scratch: 1500
    - dent: 2500
    - crack: 5000
    - shatter: 8000
    - deformation: 12000
    - missing: 15000
    """
    base_rates = {
        "scratch": 1500,
        "dent": 2500,
        "crack": 5000,
        "shatter": 8000,
        "deformation": 12000,
        "missing": 15000,
    }
    
    # Normalize area logic: 
    # Don't let it explode. Cap the multiplier.
    # Assuming standard image size 640x640 (409600 pixels)
    # Relative area: area_size / 409600.
    
    normalized_area = 1.0
    if area_size > 0:
        ratio = area_size / (640*640)
        # Scale: small damage (0.01) -> 0.8x, large damage (0.5) -> 3x
        normalized_area = 0.8 + (ratio * 10) 
        normalized_area = min(normalized_area, 4.0) # Cap at 4x base rate for very large damage
    
    base_rate = base_rates.get(damage_type.lower(), 2500)
    
    # Cost = base_rate * size_factor * confidence_factor
    estimated_cost = base_rate * normalized_area * max(0.8, confidence)
    
    # Add labor cost (fixed + variable based on damage)
    # In India, labor is cheaper relative to parts sometimes, or vice versa depending on luxury cars.
    # We will assume:
    # Parts = 75% of total
    # Labor = 25% of total
    labor_multiplier = 0.4 # Labor is 40% of parts cost
    
    parts_cost = estimated_cost 
    labor_cost = parts_cost * labor_multiplier
    
    return round(parts_cost + labor_cost, 2)

# ============================================
# INSURANCE CALCULATION HELPERS
# ============================================

def get_irdai_depreciation_rate(age_years: float) -> float:
    """
    Get IRDAI-mandated depreciation rate based on vehicle age.
    These rates are used to calculate IDV (Insured Declared Value).
    """
    if age_years <= 0.5:
        return 0.05  # 5% for vehicles < 6 months
    elif age_years <= 1:
        return 0.15  # 15% for 6 months - 1 year
    elif age_years <= 2:
        return 0.20  # 20% for 1-2 years
    elif age_years <= 3:
        return 0.30  # 30% for 2-3 years
    elif age_years <= 4:
        return 0.40  # 40% for 3-4 years
    else:
        return 0.50  # 50% for > 4 years


def calculate_insurance_values(form_data: InsuranceFormData) -> InsuranceCalculations:
    """
    Calculate all insurance-related values based on form data.
    Returns IDV, resale value, insurer payout, and owner liability.
    """
    today = datetime.utcnow().date()
    
    # Parse purchase date
    if form_data.purchaseDate:
        try:
            purchase_date = datetime.strptime(form_data.purchaseDate, "%Y-%m-%d").date()
        except ValueError:
            purchase_date = today - timedelta(days=365)  # Default to 1 year old
    else:
        purchase_date = today - timedelta(days=365)
    
    # Calculate vehicle age in years
    age_days = (today - purchase_date).days
    age_years = age_days / 365.25
    
    # Check if NCR region (Delhi, Noida, Gurgaon, Faridabad, Ghaziabad)
    ncr_cities = ['delhi', 'noida', 'gurgaon', 'gurugram', 'faridabad', 'ghaziabad']
    is_ncr = form_data.city.lower() in ncr_cities
    
    # Get depreciation rate
    dep_rate = get_irdai_depreciation_rate(age_years)
    
    # Calculate IDV (in Lakhs)
    idv = form_data.vehiclePriceLakhs * (1 - dep_rate)
    
    # Calculate estimated resale value
    # Resale = min(98% of original, 90% of IDV * condition)
    resale = min(
        form_data.vehiclePriceLakhs * 0.98,
        idv * 0.90 * form_data.vehicleCondition
    )
    
    # Calculate claim payout based on policy type
    repair_bill = form_data.estimatedRepairBill
    deductible = 1000  # Standard deductible in INR
    
    if form_data.hasZeroDepreciation:
        # Zero-Dep: Insurer pays full amount minus deductible
        insurer_payout = max(0, repair_bill - deductible)
    else:
        # Standard: Insurer pays 60% minus deductible (40% depreciation on parts)
        insurer_payout = max(0, (repair_bill * 0.60) - deductible)
    
    # Owner liability
    owner_liability = repair_bill - insurer_payout
    
    return InsuranceCalculations(
        vehicleAgeYears=round(age_years, 2),
        calculatedIDV=round(idv, 2),
        estimatedResale=round(resale, 2),
        insurerPayout=round(insurer_payout, 2),
        ownerLiability=round(owner_liability, 2),
        depreciationRate=dep_rate,
        isNCRRegion=is_ncr
    )


def save_insurance_details(
    db: Session, 
    analysis_id: str, 
    form_data: InsuranceFormData,
    calculations: InsuranceCalculations
) -> InsuranceDetailsModel:
    """Save insurance form data and calculations to database"""
    
    # Parse purchase date
    purchase_date_obj = None
    if form_data.purchaseDate:
        try:
            purchase_date_obj = datetime.strptime(form_data.purchaseDate, "%Y-%m-%d").date()
        except ValueError:
            pass
    
    insurance_record = InsuranceDetailsModel(
        id=str(uuid.uuid4()),
        analysisId=analysis_id,
        ownerName=form_data.ownerName,
        city=form_data.city,
        fuelType=form_data.fuelType,
        vehiclePriceLakhs=form_data.vehiclePriceLakhs,
        purchaseDate=purchase_date_obj,
        vehicleCondition=form_data.vehicleCondition,
        hasZeroDepreciation=form_data.hasZeroDepreciation,
        hasReturnToInvoice=form_data.hasReturnToInvoice,
        estimatedRepairBill=form_data.estimatedRepairBill,
        calculatedIDV=calculations.calculatedIDV,
        estimatedResale=calculations.estimatedResale,
        insurerPayout=calculations.insurerPayout,
        ownerLiability=calculations.ownerLiability,
        vehicleAgeYears=calculations.vehicleAgeYears,
    )
    
    db.add(insurance_record)
    db.commit()
    db.refresh(insurance_record)
    
    return insurance_record

# ============================================
# AUTHENTICATION
# ============================================

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

def get_current_user(token: str = Depends(oauth2_scheme)):
    if token != "fake-super-secret-token":
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return User(username="admin", full_name="Admin User", disabled=False)

@app.post("/api/v1/auth/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # Demo auth: admin / admin
    if form_data.username != "admin" or form_data.password != "admin":
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"access_token": "fake-super-secret-token", "token_type": "bearer"}

@app.post("/api/v1/auth/login", response_model=Token)
async def login_json(login_data: LoginRequest):
    # JSON-based login endpoint for frontend
    if login_data.username != "admin" or login_data.password != "admin":
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"access_token": "fake-super-secret-token", "token_type": "bearer"}

@app.get("/api/v1/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# ============================================
# ANALYSIS ENDPOINTS
# ============================================
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

@app.post("/api/v1/analysis/upload", response_model=UploadResponse)
async def upload_image(
    image: UploadFile = File(...), 
    insurance_data: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload an image for vehicle damage analysis with optional insurance form data.
    
    Parameters:
    - image: Vehicle damage image file
    - insurance_data: Optional JSON string with insurance form data
    
    The insurance data enhances AI analysis with context about:
    - Vehicle age, price, condition
    - Insurance policy type (Zero-Dep, RTI)
    - Regional pricing factors
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not an image.")
    
    try:
        analysis_id = str(uuid.uuid4())
        # Save with unique name
        file_ext = Path(image.filename).suffix if image.filename else ".jpg"
        saved_filename = f"{analysis_id}{file_ext}"
        saved_path = UPLOADS_DIR / saved_filename
        
        # Save file to persistent storage
        content = await image.read()
        with open(saved_path, "wb") as f:
            f.write(content)
        
        # Store relative URL path for frontend access
        image_url = f"/api/v1/uploads/{saved_filename}"
        
        # Also keep temp path for AI processing
        temp_path = str(saved_path)
        
        # Create pending analysis record
        db_analysis = AnalysisResultModel(
            id=analysis_id,
            imageUrl=image_url,  # Store URL, not file path
            status="processing",
            aiConfidence=0.0,
            overallSeverityLevel="minor",
            overallSeverityScore=0.0,
            overallSeverityDescription="Analyzing damage...",
        )
        db.add(db_analysis)
        db.commit()
        
        # Parse and save insurance data if provided
        insurance_form = None
        if insurance_data:
            try:
                insurance_json = json.loads(insurance_data)
                insurance_form = InsuranceFormData(**insurance_json)
                
                # *** FIX: stamp vehicle name + plate onto the analysis record NOW ***
                if insurance_form.vehicleName:
                    db_analysis.vehicleModel = insurance_form.vehicleName
                if insurance_form.plateNumber:
                    db_analysis.vehiclePlateNumber = insurance_form.plateNumber
                if insurance_form.ownerName:
                    db_analysis.vehicleMake = insurance_form.ownerName
                db.commit()  # persist vehicle info immediately
                
                # Calculate insurance values
                calculations = calculate_insurance_values(insurance_form)
                
                # Save to database
                save_insurance_details(db, analysis_id, insurance_form, calculations)
                
                logger.info(f"Saved insurance details for analysis {analysis_id}")
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Invalid insurance data format: {e}")
                # Continue without insurance data - don't fail the upload
        
        logger.info(f"Created analysis record: {analysis_id}, saved image to {saved_path}")
        
        # Submit for background processing (pass insurance_form for enhanced prompt)
        executor.submit(process_image_sync, analysis_id, temp_path, insurance_form)
        
        return UploadResponse(
            analysisId=analysis_id,
            status="processing",
            estimatedTime=15,
        )
    
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
@app.get("/api/v1/uploads/{filename}")
async def get_uploaded_image(filename: str):
    """Serve uploaded image files"""
    file_path = UPLOADS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(file_path, media_type="image/jpeg")


def process_image_sync(analysis_id: str, temp_path: str, insurance_form: Optional[InsuranceFormData] = None):
    """
    Background worker - does NOT delete image file.
    Image is stored persistently in uploads directory.
    
    Args:
        analysis_id: Unique ID for this analysis
        temp_path: Path to the uploaded image
        insurance_form: Optional insurance form data for enhanced analysis
    """
    db = SessionLocal()
    try:
        logger.info(f"Starting background processing for {analysis_id}")
        
        db_analysis = db.query(AnalysisResultModel).filter(
            AnalysisResultModel.id == analysis_id
        ).first()
        
        if not db_analysis:
            logger.error(f"Analysis {analysis_id} not found")
            return
        
        # PRIORITY 1: Cloud Analysis (Gemini) with insurance context
        cloud_success = False
        try:
            logger.info(f"Attempting Cloud (Gemini) analysis for {analysis_id}")
            cloud_result = cloud_ai.get_analysis(temp_path, insurance_form)
            
            # Check if we got valid damages or a high confidence result
            if cloud_result and (cloud_result.get("damages") or cloud_result.get("confidence", 0) > 0):
                format_and_save_result(db_analysis, cloud_result, "Cloud-Neural-Engine", db)
                logger.info(f"Cloud analysis completed successfully for {analysis_id}")
                cloud_success = True
            else:
                logger.warning(f"Cloud analysis returned empty/low confidence for {analysis_id}")
        
        except Exception as e:
            logger.error(f"Cloud analysis failed: {str(e)}")
        
        # PRIORITY 2: Local Fallback (YOLO) if Cloud failed
        if not cloud_success:
            logger.info(f"Falling back to Local (YOLO) detection for {analysis_id}")
            try:
                yolo_result = local_ai.detect(temp_path)
                
                if yolo_result is not None:
                    format_and_save_yolo_result_improved(db_analysis, yolo_result, "Local-Vision-Core", db)
                    logger.info(f"YOLO analysis completed for {analysis_id}")
                else:
                    logger.warning(f"All analysis methods failed for {analysis_id}")
                    format_empty_result(db_analysis, db)
            except Exception as e:
                logger.error(f"Local analysis failed: {str(e)}")
                format_empty_result(db_analysis, db)
        
        db.commit()
        logger.info(f"Processing complete for {analysis_id}")
        
    except Exception as e:
        logger.error(f"Error processing {analysis_id}: {str(e)}")
        try:
            db_analysis = db.query(AnalysisResultModel).filter(
                AnalysisResultModel.id == analysis_id
            ).first()
            if db_analysis:
                db_analysis.status = "failed"
                db_analysis.overallSeverityDescription = f"Processing error: {str(e)}"
                db.commit()
        except:
            pass
    
    finally:
        db.close()
        # Do NOT delete the image file - it's stored persistently
        logger.info(f"Preserved image file at {temp_path}")


def format_empty_result(db_analysis: AnalysisResultModel, db: Session):
    """Create an empty analysis result when all detection fails"""
    db_analysis.damages = []
    db_analysis.totalEstimatedCost = 0.0
    db_analysis.aiConfidence = 0.0
    db_analysis.engine = "Fallback-Empty"
    db_analysis.status = "completed"
    db_analysis.processedAt = datetime.utcnow()
    db_analysis.overallSeverityLevel = "minor"
    db_analysis.overallSeverityScore = 0.0
    db_analysis.overallSeverityDescription = "No damages detected"

def format_and_save_yolo_result_improved(
    db_analysis: AnalysisResultModel,
    yolo_result,
    engine: str,
    db: Session
):
    """Parse YOLO results with realistic cost calculation"""
    damages = []
    total_cost = 0.0
    confidence_scores = []
    
    if hasattr(yolo_result, 'boxes') and yolo_result.boxes is not None:
        for idx, box in enumerate(yolo_result.boxes):
            confidence = float(box.conf[0]) if hasattr(box.conf, '__getitem__') else float(box.conf)
            confidence_scores.append(confidence)
            
            xyxy = box.xyxy[0] if hasattr(box.xyxy, '__getitem__') else box.xyxy
            x, y, x2, y2 = [float(v) for v in xyxy]
            
            # Determine damage type based on detection (you can improve this logic)
            damage_types = ["scratch", "dent", "crack", "shatter", "deformation", "missing"]
            damage_type = damage_types[idx % len(damage_types)]
            
            # Calculate area
            area = (x2 - x) * (y2 - y)
            
            # Realistic cost calculation
            estimated_cost = calculate_realistic_damage_cost(damage_type, confidence, area)
            total_cost += estimated_cost
            
            damage = {
                "id": str(uuid.uuid4()),
                "partIdentified": f"Part {idx + 1}",
                "damageType": damage_type,
                "confidenceScore": confidence,
                "boundingBox": {
                    "x": x,
                    "y": y,
                    "width": x2 - x,
                    "height": y2 - y,
                },
                "estimatedCost": estimated_cost,
            }
            damages.append(damage)
    
    avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
    
    if avg_confidence > 0.8:
        severity_level = "severe"
        severity_score = 80 + (avg_confidence - 0.8) * 20
    elif avg_confidence > 0.5:
        severity_level = "moderate"
        severity_score = 50 + (avg_confidence - 0.5) * 60
    else:
        severity_level = "minor"
        severity_score = avg_confidence * 50
    
    db_analysis.damages = damages
    db_analysis.totalEstimatedCost = total_cost
    db_analysis.aiConfidence = avg_confidence
    db_analysis.engine = engine
    db_analysis.status = "completed"
    db_analysis.processedAt = datetime.utcnow()
    db_analysis.overallSeverityLevel = severity_level
    db_analysis.overallSeverityScore = min(severity_score, 100.0)
    db_analysis.overallSeverityDescription = f"{severity_level.capitalize()} vehicle damage detected"

def format_and_save_result(
    db_analysis: AnalysisResultModel,
    cloud_result: dict,
    engine: str,
    db: Session
):
    """Parse cloud analysis results and save to database"""
    damages = cloud_result.get("damages", [])
    total_cost = cloud_result.get("totalEstimatedCost", sum(d.get("estimatedCost", 0) for d in damages))
    confidence = cloud_result.get("confidence", 0.7)

    # Map AI overallSeverity or derive from confidence
    ai_severity = cloud_result.get("overallSeverity", None)
    if ai_severity in ("minor", "moderate", "severe"):
        severity_level = ai_severity
    else:
        severity_level = "severe" if confidence > 0.75 else "moderate" if confidence > 0.5 else "minor"
    severity_score = confidence * 100

    # Format damages — use 'part' key (new normalised format)
    formatted_damages = []
    for dmg in damages:
        formatted_damages.append({
            "id": str(uuid.uuid4()),
            "partIdentified": dmg.get("part", dmg.get("partIdentified", "Unknown")),
            "damageType": dmg.get("damageType", "scratch"),
            "confidenceScore": float(dmg.get("confidence", dmg.get("confidenceScore", 0.5))),
            "boundingBox": dmg.get("boundingBox", {"x": 0, "y": 0, "width": 0, "height": 0}),
            "estimatedCost": float(dmg.get("estimatedCost", 0)),
        })

    db_analysis.damages = formatted_damages
    db_analysis.totalEstimatedCost = float(total_cost)
    db_analysis.aiConfidence = confidence
    db_analysis.engine = engine
    db_analysis.status = "completed"
    db_analysis.processedAt = datetime.utcnow()
    db_analysis.overallSeverityLevel = severity_level
    db_analysis.overallSeverityScore = min(severity_score, 100.0)
    db_analysis.overallSeverityDescription = f"{severity_level.capitalize()} vehicle damage detected"

@app.get("/api/v1/analysis/{analysis_id}", response_model=AnalysisResult)
async def get_analysis_result(analysis_id: str, db: Session = Depends(get_db)):
    """Retrieve analysis results by ID"""
    db_analysis = db.query(AnalysisResultModel).filter(
        AnalysisResultModel.id == analysis_id
    ).first()
    
    if not db_analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return model_to_analysis_result(db_analysis)


@app.get("/api/v1/analysis/{analysis_id}/with-insurance", response_model=AnalysisResultWithInsurance)
async def get_analysis_with_insurance(analysis_id: str, db: Session = Depends(get_db)):
    """Retrieve analysis results with insurance details"""
    db_analysis = db.query(AnalysisResultModel).filter(
        AnalysisResultModel.id == analysis_id
    ).first()
    
    if not db_analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Get base analysis result
    result = model_to_analysis_result(db_analysis)
    
    # Get insurance details if available
    insurance_details = None
    if db_analysis.insuranceDetails:
        ins = db_analysis.insuranceDetails
        calculations = None
        if ins.calculatedIDV is not None:
            calculations = InsuranceCalculations(
                vehicleAgeYears=ins.vehicleAgeYears or 0,
                calculatedIDV=ins.calculatedIDV,
                estimatedResale=ins.estimatedResale or 0,
                insurerPayout=ins.insurerPayout or 0,
                ownerLiability=ins.ownerLiability or 0,
                depreciationRate=get_irdai_depreciation_rate(ins.vehicleAgeYears or 0),
                isNCRRegion=ins.city.lower() in ['delhi', 'noida', 'gurgaon', 'gurugram', 'faridabad', 'ghaziabad']
            )
        
        insurance_details = InsuranceDetailsResponse(
            id=ins.id,
            analysisId=ins.analysisId,
            ownerName=ins.ownerName,
            city=ins.city,
            fuelType=ins.fuelType,
            vehiclePriceLakhs=ins.vehiclePriceLakhs,
            purchaseDate=ins.purchaseDate.isoformat() if ins.purchaseDate else None,
            vehicleCondition=ins.vehicleCondition,
            hasZeroDepreciation=ins.hasZeroDepreciation,
            hasReturnToInvoice=ins.hasReturnToInvoice,
            estimatedRepairBill=ins.estimatedRepairBill,
            calculations=calculations
        )
    
    return AnalysisResultWithInsurance(
        **result.dict(),
        insuranceDetails=insurance_details
    )


@app.get("/api/v1/analysis/{analysis_id}/insurance", response_model=InsuranceDetailsResponse)
async def get_insurance_details(analysis_id: str, db: Session = Depends(get_db)):
    """Get insurance details for an analysis"""
    insurance = db.query(InsuranceDetailsModel).filter(
        InsuranceDetailsModel.analysisId == analysis_id
    ).first()
    
    if not insurance:
        raise HTTPException(status_code=404, detail="Insurance details not found for this analysis")
    
    calculations = None
    if insurance.calculatedIDV is not None:
        calculations = InsuranceCalculations(
            vehicleAgeYears=insurance.vehicleAgeYears or 0,
            calculatedIDV=insurance.calculatedIDV,
            estimatedResale=insurance.estimatedResale or 0,
            insurerPayout=insurance.insurerPayout or 0,
            ownerLiability=insurance.ownerLiability or 0,
            depreciationRate=get_irdai_depreciation_rate(insurance.vehicleAgeYears or 0),
            isNCRRegion=insurance.city.lower() in ['delhi', 'noida', 'gurgaon', 'gurugram', 'faridabad', 'ghaziabad']
        )
    
    return InsuranceDetailsResponse(
        id=insurance.id,
        analysisId=insurance.analysisId,
        ownerName=insurance.ownerName,
        city=insurance.city,
        fuelType=insurance.fuelType,
        vehiclePriceLakhs=insurance.vehiclePriceLakhs,
        purchaseDate=insurance.purchaseDate.isoformat() if insurance.purchaseDate else None,
        vehicleCondition=insurance.vehicleCondition,
        hasZeroDepreciation=insurance.hasZeroDepreciation,
        hasReturnToInvoice=insurance.hasReturnToInvoice,
        estimatedRepairBill=insurance.estimatedRepairBill,
        calculations=calculations
    )


@app.get("/api/v1/analysis/{analysis_id}/status", response_model=AnalysisStatus)
async def get_analysis_status(analysis_id: str, db: Session = Depends(get_db)):
    """Get analysis processing status"""
    db_analysis = db.query(AnalysisResultModel).filter(
        AnalysisResultModel.id == analysis_id
    ).first()
    
    if not db_analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Calculate progress based on status
    progress = 100 if db_analysis.status == "completed" else \
              50 if db_analysis.status == "processing" else \
              0
    
    return AnalysisStatus(
        status=db_analysis.status,
        progress=progress,
    )

# ============================================
# CLAIMS ENDPOINTS
# ============================================

@app.get("/api/v1/claims", response_model=PaginatedResponse)
async def get_claims(
    status: Optional[str] = Query(None),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    minConfidence: Optional[float] = Query(None),
    searchQuery: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Retrieve claims with filtering and pagination.
    
    Query parameters:
    - status: Filter by claim status (pending, processing, approved, rejected, under_review)
    - dateFrom: Filter claims from this date (ISO format)
    - dateTo: Filter claims to this date (ISO format)
    - minConfidence: Filter by minimum AI confidence score
    - searchQuery: Search by claim number or vehicle plate
    - page: Page number (1-indexed)
    - limit: Results per page
    """
    query = db.query(ClaimModel)
    
    # Apply filters
    if status:
        query = query.filter(ClaimModel.status == status)
    
    if dateFrom:
        try:
            date_from = datetime.fromisoformat(dateFrom)
            query = query.filter(ClaimModel.submittedAt >= date_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid dateFrom format")
    
    if dateTo:
        try:
            date_to = datetime.fromisoformat(dateTo)
            query = query.filter(ClaimModel.submittedAt <= date_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid dateTo format")
    
    if minConfidence is not None:
        query = query.filter(ClaimModel.aiConfidence >= minConfidence)
    
    if searchQuery:
        query = query.filter(
            or_(
                ClaimModel.claimNumber.ilike(f"%{searchQuery}%"),
                ClaimModel.vehiclePlate.ilike(f"%{searchQuery}%"),
            )
        )
    
    # Get total count before pagination
    total = query.count()
    
    # Pagination
    limit = min(limit, 100)
    offset = (page - 1) * limit
    
    # Calculate total pages
    total_pages = ceil(total / limit) if limit > 0 else 0
    
    # Get paginated data
    claims = query.order_by(desc(ClaimModel.submittedAt)).offset(offset).limit(limit).all()
    
    # Convert to Pydantic models
    data = [model_to_claim(claim, db) for claim in claims]
    
    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        totalPages=total_pages
    )
    

@app.post("/api/v1/claims", response_model=Claim)
async def create_claim(
    analysis_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """Create a claim from an analysis result"""
    analysis = db.query(AnalysisResultModel).filter(
        AnalysisResultModel.id == analysis_id
    ).first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Check if claim already exists
    existing_claim = db.query(ClaimModel).filter(
        ClaimModel.id == analysis_id
    ).first()
    
    if existing_claim:
        return model_to_claim(existing_claim, db)
    
    # Create new claim
    claim_number = generate_claim_number()
    
    vehicle_info = {
        "make": analysis.vehicleMake,
        "model": analysis.vehicleModel,
        "year": analysis.vehicleYear,
        "plateNumber": analysis.vehiclePlateNumber,
        "vin": analysis.vehicleVin,
        "color": analysis.vehicleColor,
    }
    
    new_claim = ClaimModel(
        id=analysis_id,
        claimNumber=claim_number,
        vehiclePlate=analysis.vehiclePlateNumber or "Unknown",
        vehicleInfoJson=vehicle_info,
        analysisResultId=analysis_id,
        aiConfidence=analysis.aiConfidence,
        status=ClaimStatus.pending,
        totalPayout=analysis.totalEstimatedCost,
        submittedAt=datetime.utcnow(),
    )
    
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)
    
    logger.info(f"Created claim {claim_number} for analysis {analysis_id}")
    
    
    
    return model_to_claim(new_claim, db)

@app.get("/api/v1/claims/{claim_id}", response_model=Claim)
async def get_claim(claim_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific claim by ID"""
    claim = db.query(ClaimModel).filter(ClaimModel.id == claim_id).first()
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    return model_to_claim(claim, db)

@app.post("/api/v1/claims/{claim_id}/approve", response_model=Claim)
async def approve_claim(
    claim_id: str,
    request: ApproveClaimRequest,
    db: Session = Depends(get_db),
):
    """Approve a claim"""
    claim = db.query(ClaimModel).filter(ClaimModel.id == claim_id).first()
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    claim.status = ClaimStatus.approved
    claim.processedAt = datetime.utcnow()
    if request.notes:
        claim.adjusterNotes = request.notes
    
    db.commit()
    db.refresh(claim)
    
    return model_to_claim(claim, db)

@app.post("/api/v1/claims/{claim_id}/reject", response_model=Claim)
async def reject_claim(
    claim_id: str,
    request: RejectClaimRequest,
    db: Session = Depends(get_db),
):
    """Reject a claim"""
    claim = db.query(ClaimModel).filter(ClaimModel.id == claim_id).first()
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    claim.status = ClaimStatus.rejected
    claim.processedAt = datetime.utcnow()
    claim.adjusterNotes = request.reason
    
    db.commit()
    db.refresh(claim)
    
    return model_to_claim(claim, db)

@app.post("/api/v1/claims/{claim_id}/review", response_model=Claim)
async def request_review(
    claim_id: str,
    request: RequestReviewRequest,
    db: Session = Depends(get_db),
):
    """Request review for a claim"""
    claim = db.query(ClaimModel).filter(ClaimModel.id == claim_id).first()
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    claim.status = ClaimStatus.under_review
    claim.adjusterNotes = request.notes
    
    db.commit()
    db.refresh(claim)
    
    return model_to_claim(claim, db)

# ============================================
# REPORTS ENDPOINTS
# ============================================

@app.post("/api/v1/reports/generate")
async def generate_report(
    request: ReportRequest,
    db: Session = Depends(get_db),
):
    """Generate a report (PDF/JSON) for a claim"""
    claim = db.query(ClaimModel).filter(ClaimModel.id == request.claimId).first()
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Build report data
    
    if request.format == "json":
        # Return JSON report
        report_data = {
            "claim": model_to_claim(claim, db).dict(),
            "includedImages": request.includeImages,
            "includedMetrics": request.includeConfidenceMetrics,
        }
        return report_data
    
    elif request.format == "pdf":
        # In production, use reportlab or WeasyPrint to generate PDF
        raise HTTPException(status_code=501, detail="PDF generation not yet implemented")
    
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'json' or 'pdf'")

@app.get("/api/v1/reports/{claim_id}/download")
async def download_report(claim_id: str, db: Session = Depends(get_db)):
    """Get download URL for a report"""
    claim = db.query(ClaimModel).filter(ClaimModel.id == claim_id).first()
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # In production, generate signed URL to S3 or similar
    download_url = f"/api/v1/reports/{claim_id}/file"
    
    return {"downloadUrl": download_url}

# ============================================
# ANALYTICS ENDPOINTS
# ============================================

@app.get("/api/v1/analytics/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get aggregated dashboard statistics"""
    total_claims = db.query(ClaimModel).count()
    pending_claims = db.query(ClaimModel).filter(
        ClaimModel.status == ClaimStatus.pending
    ).count()
    
    # Count approved claims from today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    approved_today = db.query(ClaimModel).filter(
        and_(
            ClaimModel.status == ClaimStatus.approved,
            ClaimModel.processedAt >= today,
        )
    ).count()
    
    # Calculate average processing time (in hours)
    processed_claims = db.query(ClaimModel).filter(
        ClaimModel.processedAt.isnot(None)
    ).all()
    
    if processed_claims:
        total_time = sum(
            (claim.processedAt - claim.submittedAt).total_seconds() / 3600
            for claim in processed_claims
        )
        average_processing_time = total_time / len(processed_claims)
    else:
        average_processing_time = 0.0
    
    # Calculate total payouts
    total_payouts = sum(claim.totalPayout for claim in db.query(ClaimModel).all())
    
    return DashboardStats(
        totalClaims=total_claims,
        pendingClaims=pending_claims,
        approvedToday=approved_today,
        averageProcessingTime=average_processing_time,
        totalPayouts=total_payouts,
    )

@app.get("/api/v1/analytics/trends", response_model=List[TrendDataPoint])
async def get_claims_trend(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    """Get claims trend over the specified number of days"""
    trends = []
    
    for i in range(days):
        date = datetime.utcnow() - timedelta(days=i)
        date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        claims_count = db.query(ClaimModel).filter(
            and_(
                ClaimModel.submittedAt >= date_start,
                ClaimModel.submittedAt <= date_end,
            )
        ).count()
        
        approved_count = db.query(ClaimModel).filter(
            and_(
                ClaimModel.status == ClaimStatus.approved,
                ClaimModel.submittedAt >= date_start,
                ClaimModel.submittedAt <= date_end,
            )
        ).count()
        
        rejected_count = db.query(ClaimModel).filter(
            and_(
                ClaimModel.status == ClaimStatus.rejected,
                ClaimModel.submittedAt >= date_start,
                ClaimModel.submittedAt <= date_end,
            )
        ).count()
        
        trends.append(
            TrendDataPoint(
                date=date.strftime("%Y-%m-%d"),
                claims=claims_count,
                approved=approved_count,
                rejected=rejected_count,
            )
        )
    
    # Reverse to have chronological order
    return list(reversed(trends))

# ============================================
# HEALTH CHECK
# ============================================

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }

# ============================================
# ROOT ENDPOINT
# ============================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "app": "AutoGuard AI Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)