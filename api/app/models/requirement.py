"""
Requirement and related models
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Requirement(Base):
    """
    Requirement model - represents a single requirement in an index
    Each requirement has 6 maturity levels (0-5)
    """

    __tablename__ = "requirements"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Basic Info
    code = Column(String, unique=True, nullable=False, index=True)  # e.g., AI.AQ.ST.1
    question_ar = Column(Text, nullable=False)
    question_en = Column(Text, nullable=True)

    # Classification
    main_area_ar = Column(String, nullable=False, index=True)  # المحور الأساسي
    main_area_en = Column(String, nullable=True)
    sub_domain_ar = Column(String, nullable=False)  # المجال الفرعي
    sub_domain_en = Column(String, nullable=True)

    # Index Reference
    index_id = Column(String, ForeignKey("indices.id"), nullable=False, index=True)

    # Order/Display
    display_order = Column(Integer, nullable=False, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    index = relationship("Index", back_populates="requirements")
    maturity_levels = relationship("MaturityLevel", back_populates="requirement", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="requirement", cascade="all, delete-orphan")
    evidence_submissions = relationship("EvidenceSubmission", back_populates="requirement", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="requirement", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="requirement", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Requirement {self.code} - {self.question_ar[:50]}>"


class MaturityLevel(Base):
    """
    Maturity Level model - represents one of 6 maturity levels for a requirement
    Levels: 0 (غياب القدرات), 1 (البناء), 2 (التفعيل), 3 (التمكين), 4 (التميز), 5 (الريادة)
    """

    __tablename__ = "maturity_levels"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Requirement Reference
    requirement_id = Column(String, ForeignKey("requirements.id"), nullable=False, index=True)

    # Level Info
    level = Column(Integer, nullable=False)  # 0-5
    level_name_ar = Column(String, nullable=False)  # e.g., "المستوى 1: البناء"
    level_name_en = Column(String, nullable=True)

    # Readiness Status
    readiness_ar = Column(String, nullable=True)  # e.g., "جاهز"
    readiness_en = Column(String, nullable=True)

    # Scoring
    score = Column(Float, nullable=True)  # Calculated score for this level

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    requirement = relationship("Requirement", back_populates="maturity_levels")
    evidence_requirements = relationship("EvidenceRequirement", back_populates="maturity_level", cascade="all, delete-orphan")
    acceptance_criteria = relationship("AcceptanceCriteria", back_populates="maturity_level", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<MaturityLevel {self.requirement_id} Level {self.level}>"


class EvidenceRequirement(Base):
    """
    Evidence Requirement model - represents required evidence for a maturity level
    """

    __tablename__ = "evidence_requirements"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Maturity Level Reference
    maturity_level_id = Column(String, ForeignKey("maturity_levels.id"), nullable=False, index=True)

    # Evidence Details
    evidence_ar = Column(Text, nullable=False)  # الأدلة المطلوبة
    evidence_en = Column(Text, nullable=True)

    # Order
    display_order = Column(Integer, nullable=False, default=0)

    # Verification
    is_mandatory = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    maturity_level = relationship("MaturityLevel", back_populates="evidence_requirements")

    def __repr__(self):
        return f"<EvidenceRequirement {self.id} for Level {self.maturity_level_id}>"


class AcceptanceCriteria(Base):
    """
    Acceptance Criteria model - represents acceptance criteria for a maturity level
    """

    __tablename__ = "acceptance_criteria"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Maturity Level Reference
    maturity_level_id = Column(String, ForeignKey("maturity_levels.id"), nullable=False, index=True)

    # Criteria Details
    criteria_ar = Column(Text, nullable=False)  # معايير القبول
    criteria_en = Column(Text, nullable=True)

    # Order
    display_order = Column(Integer, nullable=False, default=0)

    # Verification
    is_mandatory = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    maturity_level = relationship("MaturityLevel", back_populates="acceptance_criteria")

    def __repr__(self):
        return f"<AcceptanceCriteria {self.id} for Level {self.maturity_level_id}>"
