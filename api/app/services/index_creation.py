"""
Index Creation Service - Creates index and requirements from parsed Excel data
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import uuid

from app.models.index import Index, IndexStatus
from app.models.requirement import (
    Requirement,
    MaturityLevel,
    EvidenceRequirement,
    AcceptanceCriteria
)
from app.models.audit import AuditLog
from app.services.excel_parser import ExcelParser, ExcelParsingError


class IndexCreationError(Exception):
    """Custom exception for index creation errors"""
    pass


class IndexCreationService:
    """Service for creating indices from Excel files"""

    @staticmethod
    def create_index_from_excel(
        db: Session,
        file_content: bytes,
        filename: str,
        index_code: str,
        index_name_ar: str,
        index_name_en: str,
        organization_id: str,
        created_by_user_id: str,
        description_ar: str = None,
        description_en: str = None,
        version: str = "1.0"
    ) -> Index:
        """
        Create a complete index from an Excel file

        Args:
            db: Database session
            file_content: Excel file content as bytes
            filename: Original filename
            index_code: Unique code for the index
            index_name_ar: Index name in Arabic
            index_name_en: Index name in English
            organization_id: ID of the organization
            created_by_user_id: ID of user creating the index
            description_ar: Description in Arabic
            description_en: Description in English
            version: Index version

        Returns:
            Created Index object

        Raises:
            IndexCreationError: If creation fails
        """
        try:
            # Generate index ID
            index_id = str(uuid.uuid4())

            # Parse Excel file
            parsed_data = ExcelParser.parse_excel(file_content, index_id)

            # Start transaction
            db.begin_nested()

            try:
                # Create Index
                index = Index(
                    id=index_id,
                    code=index_code,
                    name_ar=index_name_ar,
                    name_en=index_name_en,
                    description_ar=description_ar,
                    description_en=description_en,
                    version=version,
                    status=IndexStatus.DRAFT,
                    organization_id=organization_id,
                    excel_filename=filename,
                    excel_upload_date=datetime.utcnow(),
                    total_requirements=parsed_data['total_requirements'],
                    total_areas=IndexCreationService._count_unique_areas(parsed_data['requirements'])
                )
                db.add(index)
                db.flush()

                # Create Requirements with all nested data
                for idx, req_data in enumerate(parsed_data['requirements']):
                    IndexCreationService._create_requirement(
                        db,
                        req_data,
                        display_order=idx + 1
                    )

                # Create audit log
                audit_log = AuditLog(
                    id=str(uuid.uuid4()),
                    action="create_index",
                    entity_type="index",
                    entity_id=index_id,
                    user_id=created_by_user_id,
                    description=f"Created index {index_code} from Excel file {filename}",
                    meta_data={
                        'total_requirements': parsed_data['total_requirements'],
                        'total_rows': parsed_data['total_rows'],
                        'filename': filename
                    }
                )
                db.add(audit_log)

                # Commit transaction
                db.commit()

                return index

            except IntegrityError as e:
                db.rollback()
                if "code" in str(e):
                    raise IndexCreationError(f"Index with code '{index_code}' already exists")
                raise IndexCreationError(f"Database integrity error: {str(e)}")

        except ExcelParsingError as e:
            raise IndexCreationError(f"Excel parsing failed: {str(e)}")
        except Exception as e:
            db.rollback()
            raise IndexCreationError(f"Failed to create index: {str(e)}")

    @staticmethod
    def _create_requirement(
        db: Session,
        req_data: Dict[str, Any],
        display_order: int
    ) -> Requirement:
        """Create a requirement with all its maturity levels"""

        # Create Requirement
        requirement = Requirement(
            id=req_data['id'],
            code=req_data['code'],
            question_ar=req_data['question_ar'],
            main_area_ar=req_data['main_area_ar'],
            sub_domain_ar=req_data['sub_domain_ar'],
            index_id=req_data['index_id'],
            display_order=display_order
        )
        db.add(requirement)
        db.flush()

        # Create Maturity Levels
        for level_data in req_data['maturity_levels']:
            IndexCreationService._create_maturity_level(db, level_data)

        return requirement

    @staticmethod
    def _create_maturity_level(
        db: Session,
        level_data: Dict[str, Any]
    ) -> MaturityLevel:
        """Create a maturity level with evidence and criteria"""

        # Create Maturity Level
        maturity_level = MaturityLevel(
            id=level_data['id'],
            requirement_id=level_data['requirement_id'],
            level=level_data['level'],
            level_name_ar=level_data['level_name_ar'],
            readiness_ar=level_data['readiness_ar']
        )
        db.add(maturity_level)
        db.flush()

        # Create Evidence Requirements
        for evidence_data in level_data['evidence_requirements']:
            evidence = EvidenceRequirement(
                id=evidence_data['id'],
                maturity_level_id=evidence_data['maturity_level_id'],
                evidence_ar=evidence_data['evidence_ar'],
                display_order=evidence_data['display_order']
            )
            db.add(evidence)

        # Create Acceptance Criteria
        for criteria_data in level_data['acceptance_criteria']:
            criteria = AcceptanceCriteria(
                id=criteria_data['id'],
                maturity_level_id=criteria_data['maturity_level_id'],
                criteria_ar=criteria_data['criteria_ar'],
                display_order=criteria_data['display_order']
            )
            db.add(criteria)

        return maturity_level

    @staticmethod
    def _count_unique_areas(requirements: List[Dict[str, Any]]) -> int:
        """Count unique main areas in requirements"""
        unique_areas = set()
        for req in requirements:
            if req.get('main_area_ar'):
                unique_areas.add(req['main_area_ar'])
        return len(unique_areas)

    @staticmethod
    def get_index_statistics(db: Session, index_id: str) -> Dict[str, Any]:
        """
        Get statistics for an index

        Returns:
            Dictionary with counts of requirements, levels, evidence, etc.
        """
        from sqlalchemy import func

        # Count requirements
        req_count = db.query(func.count(Requirement.id)).filter(
            Requirement.index_id == index_id
        ).scalar()

        # Count maturity levels
        level_count = db.query(func.count(MaturityLevel.id)).join(
            Requirement
        ).filter(Requirement.index_id == index_id).scalar()

        # Count evidence requirements
        evidence_count = db.query(func.count(EvidenceRequirement.id)).join(
            MaturityLevel
        ).join(Requirement).filter(
            Requirement.index_id == index_id
        ).scalar()

        # Count acceptance criteria
        criteria_count = db.query(func.count(AcceptanceCriteria.id)).join(
            MaturityLevel
        ).join(Requirement).filter(
            Requirement.index_id == index_id
        ).scalar()

        # Count unique main areas
        unique_areas = db.query(func.count(func.distinct(Requirement.main_area_ar))).filter(
            Requirement.index_id == index_id
        ).scalar()

        return {
            'total_requirements': req_count,
            'total_maturity_levels': level_count,
            'total_evidence_requirements': evidence_count,
            'total_acceptance_criteria': criteria_count,
            'total_unique_areas': unique_areas,
            'expected_levels_per_requirement': 6
        }
