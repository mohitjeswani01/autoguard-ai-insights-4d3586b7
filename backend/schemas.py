# backend/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

# Enums
class DamageTypeEnum(str, Enum):
    scratch = "scratch"
    dent = "dent"
    crack = "crack"
    shatter = "shatter"
    deformation = "deformation"
    missing = "missing"

class SeverityLevelEnum(str, Enum):
    minor = "minor"
    moderate = "moderate"
    severe = "severe"

class ClaimStatusEnum(str, Enum):
    pending = "pending"
    processing = "processing"
    approved = "approved"
    rejected = "rejected"
    under_review = "under_review"

class AnalysisStatusEnum(str, Enum):
    processing = "processing"
    completed = "completed"
    failed = "failed"

class FuelTypeEnum(str, Enum):
    petrol = "Petrol"
    diesel = "Diesel"
    cng = "CNG"
    electric = "Electric"
    hybrid = "Hybrid"

# BoundingBox
class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float

# DamageAssessment
class DamageAssessment(BaseModel):
    id: str
    partIdentified: str
    damageType: DamageTypeEnum
    confidenceScore: float
    boundingBox: BoundingBox
    estimatedCost: float

# SeverityInfo
class SeverityInfo(BaseModel):
    level: SeverityLevelEnum
    score: float  # 0-100
    description: str

# VehicleInfo
class VehicleInfo(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    plateNumber: Optional[str] = None
    vin: Optional[str] = None
    color: Optional[str] = None

# AnalysisResult
class AnalysisResult(BaseModel):
    id: str
    imageUrl: str
    vehicleInfo: VehicleInfo
    damages: List[DamageAssessment]
    overallSeverity: SeverityInfo
    totalEstimatedCost: float
    aiConfidence: float
    processedAt: str
    status: AnalysisStatusEnum

    class Config:
        from_attributes = True

# UploadResponse
class UploadResponse(BaseModel):
    analysisId: str
    status: str  # queued, processing
    estimatedTime: int  # seconds

# Claim
class Claim(BaseModel):
    id: str
    claimNumber: str
    vehiclePlate: str
    vehicleInfo: VehicleInfo
    submittedAt: str
    processedAt: Optional[str] = None
    aiConfidence: float
    status: ClaimStatusEnum
    totalPayout: float
    analysisResult: Optional[AnalysisResult] = None
    adjusterNotes: Optional[str] = None

    class Config:
        from_attributes = True

# ClaimFilters
class ClaimFilters(BaseModel):
    status: Optional[ClaimStatusEnum] = None
    dateFrom: Optional[str] = None
    dateTo: Optional[str] = None
    minConfidence: Optional[float] = None
    searchQuery: Optional[str] = None
    page: Optional[int] = 1
    limit: Optional[int] = 10

# PaginatedResponse
class PaginatedResponse(BaseModel):
    data: List[Claim]
    total: int
    page: int
    limit: int
    totalPages: int

# ReportRequest
class ReportRequest(BaseModel):
    claimId: str
    includeImages: bool
    includeConfidenceMetrics: bool
    format: str  # pdf, json

# Approve/Reject requests
class ApproveClaimRequest(BaseModel):
    notes: Optional[str] = None

class RejectClaimRequest(BaseModel):
    reason: str

class RequestReviewRequest(BaseModel):
    notes: str

# Dashboard Stats
class DashboardStats(BaseModel):
    totalClaims: int
    pendingClaims: int
    approvedToday: int
    averageProcessingTime: float
    totalPayouts: float

# Trend Data
class TrendDataPoint(BaseModel):
    date: str
    claims: int
    approved: int
    rejected: int

# API Error
class ApiError(BaseModel):
    code: str
    message: str
    details: Optional[dict] = None

class AnalysisStatus(BaseModel):
    status: str
    progress: int

# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

# ============================================
# INSURANCE FORM SCHEMAS
# ============================================

class InsuranceFormData(BaseModel):
    """Input schema for insurance form submission"""
    ownerName: Optional[str] = Field(None, description="Vehicle owner's name")
    vehicleName: Optional[str] = Field(None, description="Vehicle make/model name e.g. Maruti Swift")
    plateNumber: Optional[str] = Field(None, description="Vehicle registration plate number")
    city: str = Field("Mumbai", description="City for regional pricing")
    fuelType: str = Field("Petrol", description="Fuel type: Petrol, Diesel, CNG, Electric, Hybrid")
    vehiclePriceLakhs: float = Field(10.0, ge=1.0, le=500.0, description="Vehicle price in Lakhs INR")
    purchaseDate: Optional[str] = Field(None, description="Purchase date in YYYY-MM-DD format")
    vehicleCondition: float = Field(1.0, ge=0.0, le=1.0, description="Condition rating 0.0-1.0")
    hasZeroDepreciation: bool = Field(False, description="Zero-Depreciation add-on")
    hasReturnToInvoice: bool = Field(False, description="Return-to-Invoice add-on")
    estimatedRepairBill: float = Field(50000.0, ge=0, description="Estimated repair bill in INR")

    class Config:
        json_schema_extra = {
            "example": {
                "ownerName": "Rajesh Kumar",
                "city": "Mumbai",
                "fuelType": "Petrol",
                "vehiclePriceLakhs": 12.5,
                "purchaseDate": "2022-03-15",
                "vehicleCondition": 0.9,
                "hasZeroDepreciation": True,
                "hasReturnToInvoice": False,
                "estimatedRepairBill": 75000
            }
        }


class InsuranceCalculations(BaseModel):
    """Calculated insurance values based on form data"""
    vehicleAgeYears: float = Field(..., description="Vehicle age in years")
    calculatedIDV: float = Field(..., description="Insured Declared Value in Lakhs")
    estimatedResale: float = Field(..., description="Estimated resale value in Lakhs")
    insurerPayout: float = Field(..., description="Amount insurer pays in INR")
    ownerLiability: float = Field(..., description="Amount owner pays in INR")
    depreciationRate: float = Field(..., description="IRDAI depreciation rate applied")
    isNCRRegion: bool = Field(..., description="Whether city is in NCR region")


class InsuranceDetailsResponse(BaseModel):
    """Response schema with form data + calculations"""
    id: str
    analysisId: str
    ownerName: Optional[str] = None
    city: str
    fuelType: str
    vehiclePriceLakhs: float
    purchaseDate: Optional[str] = None
    vehicleCondition: float
    hasZeroDepreciation: bool
    hasReturnToInvoice: bool
    estimatedRepairBill: float
    calculations: Optional[InsuranceCalculations] = None

    class Config:
        from_attributes = True


class AnalysisResultWithInsurance(AnalysisResult):
    """Extended analysis result including insurance details"""
    insuranceDetails: Optional[InsuranceDetailsResponse] = None