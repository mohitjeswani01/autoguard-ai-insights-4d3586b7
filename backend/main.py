# backend/main.py
import os
import shutil
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
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

# Import custom services
from services.yolo_service import LocalAnalyzer
from services.fallback_service import CloudAnalyzer

# Import database and schemas
from models.database import init_db, get_db, engine, ClaimModel, AnalysisResultModel, Base, ClaimStatus, SessionLocal
from schemas import (
    UploadResponse, AnalysisResult, Claim, ClaimFilters, PaginatedResponse,
    DashboardStats, TrendDataPoint, ApproveClaimRequest, RejectClaimRequest,
    RequestReviewRequest, VehicleInfo, SeverityInfo, DamageAssessment, 
    BoundingBox, AnalysisStatus, ReportRequest, LoginRequest, Token, User
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
async def upload_image(image: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload an image for vehicle damage analysis.
    Stores image persistently and creates analysis record.
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
        
        logger.info(f"Created analysis record: {analysis_id}, saved image to {saved_path}")
        
        # Submit for background processing
        executor.submit(process_image_sync, analysis_id, temp_path)
        
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


def process_image_sync(analysis_id: str, temp_path: str):
    """
    Background worker - does NOT delete image file.
    Image is stored persistently in uploads directory.
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
        
        # Try Local YOLO
        logger.info(f"Attempting YOLO detection for {analysis_id}")
        yolo_result = local_ai.detect(temp_path)
        
        if yolo_result is None:
            logger.info(f"YOLO failed, falling back to Cloud for {analysis_id}")
            try:
                cloud_result = cloud_ai.get_analysis(temp_path)
                if cloud_result and cloud_result.get("damages"):
                    format_and_save_result(db_analysis, cloud_result, "Cloud-Neural-Engine", db)
                    logger.info(f"Cloud analysis completed for {analysis_id}")
                else:
                    logger.warning(f"Cloud analysis returned empty result for {analysis_id}")
                    format_empty_result(db_analysis, db)
            except Exception as e:
                logger.error(f"Cloud analysis failed: {str(e)}")
                format_empty_result(db_analysis, db)
        else:
            format_and_save_yolo_result_improved(db_analysis, yolo_result, "Local-Vision-Core", db)
            logger.info(f"YOLO analysis completed for {analysis_id}")
        
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
    total_cost = sum(d.get("estimatedCost", 0) for d in damages)
    confidence = cloud_result.get("confidence", 0.7)
    
    # Format damages
    formatted_damages = []
    for dmg in damages:
        formatted_damages.append({
            "id": str(uuid.uuid4()),
            "partIdentified": dmg.get("part", "Unknown"),
            "damageType": dmg.get("damageType", "scratch"),
            "confidenceScore": dmg.get("confidence", 0.5),
            "boundingBox": dmg.get("boundingBox", {"x": 0, "y": 0, "width": 0, "height": 0}),
            "estimatedCost": dmg.get("estimatedCost", 0),
        })
    
    severity_level = "severe" if confidence > 0.7 else "moderate" if confidence > 0.5 else "minor"
    severity_score = confidence * 100
    
    db_analysis.damages = formatted_damages
    db_analysis.totalEstimatedCost = total_cost
    db_analysis.aiConfidence = confidence
    db_analysis.engine = engine
    db_analysis.status = "completed"
    db_analysis.processedAt = datetime.utcnow()
    db_analysis.overallSeverityLevel = severity_level
    db_analysis.overallSeverityScore = severity_score
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