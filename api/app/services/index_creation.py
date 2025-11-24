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
from app.index_config.index_configs import get_index_config


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
        index_type: str,  # NEW: Index type parameter
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
            index_type: Type of index ('NAII', 'ETARI', etc.)
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
        import logging
        logger = logging.getLogger(__name__)

        try:
            # Generate index ID
            index_id = str(uuid.uuid4())

            logger.info(f"Creating {index_type} index with code: {index_code}")

            # Parse Excel file with index type
            parsed_data = ExcelParser.parse_excel(file_content, index_id, index_type)
            logger.info(f"Excel parsed successfully: {parsed_data['total_requirements']} requirements found")

            # Start transaction
            db.begin_nested()

            try:
                logger.info(f"Creating index object with ID: {index_id}")

                # Create Index
                index = Index(
                    id=index_id,
                    code=index_code,
                    index_type=index_type,  # Store index type
                    name_ar=index_name_ar,
                    name_en=index_name_en,
                    description_ar=description_ar,
                    description_en=description_en,
                    version=version,
                    status=IndexStatus.NOT_STARTED,
                    organization_id=organization_id,
                    excel_filename=filename,
                    excel_upload_date=datetime.utcnow(),
                    total_requirements=parsed_data['total_requirements'],
                    total_areas=IndexCreationService._count_unique_areas(parsed_data['requirements'])
                )
                db.add(index)
                logger.info("Index object added to session, flushing...")
                db.flush()
                logger.info("Index flushed successfully, creating requirements...")

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
                logger.error(f"IntegrityError occurred: {str(e)}")
                logger.error(f"Full exception: {repr(e)}")

                error_msg = str(e)
                # Check for specific constraint violations
                if "indices_code_key" in error_msg or "duplicate key value violates unique constraint" in error_msg and "code" in error_msg:
                    raise IndexCreationError(f"Index with code '{index_code}' already exists")
                elif "organization_id" in error_msg and "is not present in table" in error_msg:
                    raise IndexCreationError(f"Organization with ID '{organization_id}' does not exist")
                elif "foreign key constraint" in error_msg:
                    raise IndexCreationError(f"Database constraint violation: {error_msg}")
                else:
                    raise IndexCreationError(f"Database integrity error: {error_msg}")

        except ExcelParsingError as e:
            logger.error(f"ExcelParsingError: {str(e)}")
            raise IndexCreationError(f"Excel parsing failed: {str(e)}")
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected exception: {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise IndexCreationError(f"Failed to create index: {str(e)}")

    @staticmethod
    def _create_requirement(
        db: Session,
        req_data: Dict[str, Any],
        display_order: int
    ) -> Requirement:
        """Create a requirement with all its maturity levels"""

        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"Creating requirement with code: {req_data.get('code')}")
        logger.info(f"Requirement data keys: {list(req_data.keys())}")
        logger.info(f"Number of maturity levels: {len(req_data.get('maturity_levels', []))}")

        # Create Requirement - include all fields from req_data
        requirement = Requirement(
            id=req_data['id'],
            code=req_data['code'],
            question_ar=req_data['question_ar'],
            question_en=req_data.get('question_en'),
            main_area_ar=req_data['main_area_ar'],
            main_area_en=req_data.get('main_area_en'),
            sub_domain_ar=req_data['sub_domain_ar'],
            sub_domain_en=req_data.get('sub_domain_en'),
            index_id=req_data['index_id'],
            display_order=display_order,
            # ETARI-specific fields
            element_ar=req_data.get('element_ar'),
            element_en=req_data.get('element_en'),
            objective_ar=req_data.get('objective_ar'),
            objective_en=req_data.get('objective_en'),
            evidence_description_ar=req_data.get('evidence_description_ar'),  # ← THIS WAS MISSING!
            evidence_description_en=req_data.get('evidence_description_en')
        )
        db.add(requirement)
        db.flush()
        logger.info(f"Requirement {req_data['code']} created successfully")

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

        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"Creating maturity level {level_data.get('level')} for requirement {level_data.get('requirement_id')}")
        logger.info(f"Level data keys: {list(level_data.keys())}")
        logger.info(f"Level name AR: {level_data.get('level_name_ar', 'N/A')[:50]}")
        logger.info(f"Readiness AR: '{level_data.get('readiness_ar', 'N/A')}'")

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
        logger.info(f"Maturity level {level_data['level']} created successfully")

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

        # Get index to determine type
        index = db.query(Index).filter(Index.id == index_id).first()
        if not index:
            raise IndexCreationError(f"Index with ID {index_id} not found")

        # Get configuration for this index type
        config = get_index_config(index.index_type)

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
            'expected_levels_per_requirement': config['num_levels'],  # From config
            'max_maturity_level': config['max_level'],  # Add max level info
            'index_type': index.index_type  # Include index type in response
        }
