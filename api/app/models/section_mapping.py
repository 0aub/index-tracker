"""
Section Mapping model for mapping section names between index versions
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database import Base


class SectionMapping(Base):
    """Section mapping between two index versions"""

    __tablename__ = "section_mappings"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys - which indices are being mapped
    current_index_id = Column(String, ForeignKey("indices.id"), nullable=False, index=True)
    previous_index_id = Column(String, ForeignKey("indices.id"), nullable=False, index=True)

    # Main area mapping (محور رئيسي)
    main_area_from_ar = Column(String, nullable=False)
    main_area_to_ar = Column(String, nullable=False)
    main_area_from_en = Column(String, nullable=True)
    main_area_to_en = Column(String, nullable=True)

    # Element mapping (العنصر) - optional for ETARI
    element_from_ar = Column(String, nullable=True)
    element_to_ar = Column(String, nullable=True)
    element_from_en = Column(String, nullable=True)
    element_to_en = Column(String, nullable=True)

    # Sub-domain mapping (المعيار / المجال الفرعي)
    sub_domain_from_ar = Column(String, nullable=True)
    sub_domain_to_ar = Column(String, nullable=True)
    sub_domain_from_en = Column(String, nullable=True)
    sub_domain_to_en = Column(String, nullable=True)

    # Timestamps and audit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)

    # Relationships
    current_index = relationship("Index", foreign_keys=[current_index_id], backref="incoming_mappings")
    previous_index = relationship("Index", foreign_keys=[previous_index_id], backref="outgoing_mappings")
    creator = relationship("User", foreign_keys=[created_by])
