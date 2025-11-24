"""
Requirement and related models
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Float, Boolean, UniqueConstraint
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
    code = Column(String, nullable=False, index=True)  # e.g., AI.AQ.ST.1 or 1.1.1.1 (ETARI)
    question_ar = Column(Text, nullable=False)
    question_en = Column(Text, nullable=True)

    # Classification
    main_area_ar = Column(String, nullable=False, index=True)  # المحور الأساسي (NAII: Main Area, ETARI: Capability)
    main_area_en = Column(String, nullable=True)
    sub_domain_ar = Column(String, nullable=False)  # المجال الفرعي (NAII: Sub-domain, ETARI: Standard/Criteria)
    sub_domain_en = Column(String, nullable=True)

    # ETARI-specific fields (nullable for NAII)
    element_ar = Column(String, nullable=True)  # العنصر (ETARI only)
    element_en = Column(String, nullable=True)
    objective_ar = Column(Text, nullable=True)  # الهدف (ETARI: Goal/Objective)
    objective_en = Column(Text, nullable=True)
    evidence_description_ar = Column(Text, nullable=True)  # مستندات الاثبات (ETARI: Evidence description)
    evidence_description_en = Column(Text, nullable=True)

    # Index Reference
    index_id = Column(String, ForeignKey("indices.id"), nullable=False, index=True)

    # Order/Display
    display_order = Column(Integer, nullable=False, default=0)

    # ETARI Answer fields (for question-answer based indices)
    answer_ar = Column(Text, nullable=True)  # Answer text in Arabic
    answer_en = Column(Text, nullable=True)  # Answer text in English
    answer_status = Column(String(50), nullable=True)  # draft, pending_review, approved, rejected
    answered_by = Column(String, ForeignKey("users.id"), nullable=True)  # User who answered
    answered_at = Column(DateTime, nullable=True)  # When answer was saved
    reviewed_by = Column(String, ForeignKey("users.id"), nullable=True)  # Reviewer user ID
    reviewer_comment_ar = Column(Text, nullable=True)  # Reviewer feedback in Arabic
    reviewer_comment_en = Column(Text, nullable=True)  # Reviewer feedback in English
    reviewed_at = Column(DateTime, nullable=True)  # When answer was reviewed

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Versioning - link to previous year's requirement
    previous_requirement_id = Column(String, ForeignKey("requirements.id"), nullable=True, index=True)

    # Relationships
    index = relationship("Index", back_populates="requirements")
    maturity_levels = relationship("MaturityLevel", back_populates="requirement", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="requirement", cascade="all, delete-orphan")
    evidence_submissions = relationship("EvidenceSubmission", back_populates="requirement", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="requirement", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="requirement", cascade="all, delete-orphan")
    activities = relationship("RequirementActivity", back_populates="requirement", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="requirement", cascade="all, delete-orphan")

    # Self-referencing relationship for versioning
    previous_requirement = relationship("Requirement", remote_side=[id], foreign_keys=[previous_requirement_id])

    # Table arguments - composite unique constraint
    __table_args__ = (
        UniqueConstraint('index_id', 'code', name='requirements_index_code_unique'),
    )

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
