# backend/models/database.py
from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, JSON, Enum, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum
import uuid

DATABASE_URL = "sqlite:///./autoguard_ai.db"

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False},
    echo=True  # Set to False in production
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ClaimStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    approved = "approved"
    rejected = "rejected"
    under_review = "under_review"

class DamageType(str, enum.Enum):
    scratch = "scratch"
    dent = "dent"
    crack = "crack"
    shatter = "shatter"
    deformation = "deformation"
    missing = "missing"

class SeverityLevel(str, enum.Enum):
    minor = "minor"
    moderate = "moderate"
    severe = "severe"

class AnalysisResultModel(Base):
    __tablename__ = "analysis_results"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    imageUrl = Column(String, nullable=True)
    vehicleMake = Column(String, nullable=True)
    vehicleModel = Column(String, nullable=True)
    vehicleYear = Column(Integer, nullable=True)
    vehiclePlateNumber = Column(String, nullable=True)
    vehicleVin = Column(String, nullable=True)
    vehicleColor = Column(String, nullable=True)
    damages = Column(JSON, default=list)  # List of DamageAssessment objects
    overallSeverityLevel = Column(Enum(SeverityLevel), default=SeverityLevel.minor)
    overallSeverityScore = Column(Float, default=0.0)
    overallSeverityDescription = Column(String, default="")
    totalEstimatedCost = Column(Float, default=0.0)
    aiConfidence = Column(Float, default=0.0)
    processedAt = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="processing")  # processing, completed, failed
    engine = Column(String, nullable=True)  # Local-Vision-Core or Cloud-Neural-Engine
    
    # Relationship
    claims = relationship("ClaimModel", back_populates="analysisResult")

class ClaimModel(Base):
    __tablename__ = "claims"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    claimNumber = Column(String, unique=True, index=True)
    vehiclePlate = Column(String, index=True)
    vehicleInfoJson = Column(JSON)  # Stores complete VehicleInfo
    submittedAt = Column(DateTime, default=datetime.utcnow)
    processedAt = Column(DateTime, nullable=True)
    aiConfidence = Column(Float)
    status = Column(Enum(ClaimStatus), default=ClaimStatus.pending, index=True)
    totalPayout = Column(Float, default=0.0)
    analysisResultId = Column(String, ForeignKey("analysis_results.id"), nullable=True)
    adjusterNotes = Column(Text, nullable=True)
    
    # Relationships
    analysisResult = relationship("AnalysisResultModel", back_populates="claims")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)