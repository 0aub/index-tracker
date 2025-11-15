"""
Excel Parser Service - Parses uploaded Excel files to extract index requirements
"""
from io import BytesIO
from typing import Dict, Any, List
import pandas as pd
import uuid
from datetime import datetime


class ExcelParsingError(Exception):
    """Custom exception for Excel parsing errors"""
    pass


class ExcelParser:
    """Service for parsing Excel files containing index requirements"""

    # Expected column names (Arabic)
    REQUIRED_COLUMNS = [
        "المحور الأساسي",      # Main Area
        "المجال الفرعي",      # Sub-domain
        "رقم المعيار",        # Requirement Code
        "السؤال",            # Question
        "مستوى النضج",        # Maturity Level
        "الجاهزية",          # Readiness
        "الأدلة المطلوبة",    # Required Evidence
        "معايير القبول"      # Acceptance Criteria
    ]

    @classmethod
    def parse_excel(cls, file_content: bytes, index_id: str) -> Dict[str, Any]:
        """
        Parse Excel file and return structured data

        Args:
            file_content: Excel file as bytes
            index_id: ID of the index being created

        Returns:
            Dictionary containing parsed requirements data

        Raises:
            ExcelParsingError: If parsing fails
        """
        try:
            # Read Excel file
            df = pd.read_excel(BytesIO(file_content), engine='openpyxl')

            # Validate structure
            cls._validate_structure(df)

            # Extract metadata
            metadata = cls._extract_metadata(df)

            # Group rows by requirement and parse
            requirements = cls._group_by_requirements(df, index_id)

            return {
                'metadata': metadata,
                'requirements': requirements,
                'total_requirements': len(requirements),
                'total_rows': len(df)
            }

        except Exception as e:
            raise ExcelParsingError(f"Failed to parse Excel file: {str(e)}")

    @classmethod
    def _validate_structure(cls, df: pd.DataFrame) -> None:
        """Validate that Excel has required columns"""
        df_columns = df.columns.tolist()

        missing_columns = []
        for required_col in cls.REQUIRED_COLUMNS:
            if required_col not in df_columns:
                missing_columns.append(required_col)

        if missing_columns:
            raise ExcelParsingError(
                f"Missing required columns: {', '.join(missing_columns)}"
            )

        if len(df) == 0:
            raise ExcelParsingError("Excel file is empty")

    @classmethod
    def _extract_metadata(cls, df: pd.DataFrame) -> Dict[str, Any]:
        """Extract metadata from the Excel file"""
        return {
            'total_rows': len(df),
            'columns': df.columns.tolist(),
            'parsed_at': datetime.utcnow().isoformat()
        }

    @classmethod
    def _group_by_requirements(cls, df: pd.DataFrame, index_id: str) -> List[Dict[str, Any]]:
        """
        Group rows by requirement code and structure the data
        Each requirement should have 6 maturity levels (0-5)
        """
        requirements = []
        grouped = df.groupby("رقم المعيار")

        for req_code, group in grouped:
            # Skip if requirement code is empty or NaN
            if pd.isna(req_code) or str(req_code).strip() == "":
                continue

            # Get basic requirement info from first row
            first_row = group.iloc[0]

            req_id = str(uuid.uuid4())
            requirement_data = {
                'id': req_id,
                'code': str(req_code).strip(),
                'index_id': index_id,
                'question_ar': str(first_row["السؤال"]).strip() if pd.notna(first_row["السؤال"]) else "",
                'main_area_ar': str(first_row["المحور الأساسي"]).strip() if pd.notna(first_row["المحور الأساسي"]) else "",
                'sub_domain_ar': str(first_row["المجال الفرعي"]).strip() if pd.notna(first_row["المجال الفرعي"]) else "",
                'maturity_levels': []
            }

            # Process each maturity level (should be 6 levels: 0-5)
            for idx, row in group.iterrows():
                level_data = cls._parse_maturity_level(row, req_id)
                requirement_data['maturity_levels'].append(level_data)

            # Validate that we have 6 levels
            if len(requirement_data['maturity_levels']) != 6:
                print(f"Warning: Requirement {req_code} has {len(requirement_data['maturity_levels'])} levels instead of 6")

            requirements.append(requirement_data)

        return requirements

    @classmethod
    def _parse_maturity_level(cls, row: pd.Series, requirement_id: str) -> Dict[str, Any]:
        """Parse a single maturity level row"""
        level_id = str(uuid.uuid4())

        # Extract level number from level name (e.g., "المستوى 1: البناء" -> 1)
        level_name = str(row["مستوى النضج"]).strip() if pd.notna(row["مستوى النضج"]) else ""
        level_number = cls._extract_level_number(level_name)

        # Parse evidence requirements (bullet-pointed list)
        evidence_text = str(row["الأدلة المطلوبة"]).strip() if pd.notna(row["الأدلة المطلوبة"]) else ""
        evidence_items = cls._parse_bullet_list(evidence_text)

        # Parse acceptance criteria (bullet-pointed list)
        criteria_text = str(row["معايير القبول"]).strip() if pd.notna(row["معايير القبول"]) else ""
        criteria_items = cls._parse_bullet_list(criteria_text)

        return {
            'id': level_id,
            'requirement_id': requirement_id,
            'level': level_number,
            'level_name_ar': level_name,
            'readiness_ar': str(row["الجاهزية"]).strip() if pd.notna(row["الجاهزية"]) else "",
            'evidence_requirements': [
                {
                    'id': str(uuid.uuid4()),
                    'maturity_level_id': level_id,
                    'evidence_ar': item,
                    'display_order': idx
                }
                for idx, item in enumerate(evidence_items)
            ],
            'acceptance_criteria': [
                {
                    'id': str(uuid.uuid4()),
                    'maturity_level_id': level_id,
                    'criteria_ar': item,
                    'display_order': idx
                }
                for idx, item in enumerate(criteria_items)
            ]
        }

    @classmethod
    def _extract_level_number(cls, level_name: str) -> int:
        """
        Extract level number from level name
        e.g., "المستوى 1: البناء" -> 1
        """
        try:
            # Look for number after "المستوى"
            if "المستوى" in level_name:
                parts = level_name.split(":")
                if len(parts) > 0:
                    number_part = parts[0].replace("المستوى", "").strip()
                    return int(number_part)
            return 0
        except:
            return 0

    @classmethod
    def _parse_bullet_list(cls, text: str) -> List[str]:
        """
        Parse bullet-pointed text into list of items
        Handles multiple formats:
        - Newline-separated
        - Bullet characters (•, -, *)
        - Numbered lists
        """
        if not text or text == "nan" or text == "":
            return []

        # Split by newlines first
        lines = text.split('\n')

        items = []
        for line in lines:
            line = line.strip()

            # Skip empty lines
            if not line:
                continue

            # Remove common bullet characters
            line = line.lstrip('•-*')
            line = line.strip()

            # Remove numbering (e.g., "1.", "1)", "أ.")
            import re
            line = re.sub(r'^\d+[\.\)]\s*', '', line)
            line = re.sub(r'^[أ-ي][\.\)]\s*', '', line)

            if line:
                items.append(line)

        return items


class ExcelValidator:
    """Validates Excel file structure before parsing"""

    @staticmethod
    def validate_file_size(file_size: int, max_size: int = 10 * 1024 * 1024) -> bool:
        """Validate file size (default max: 10MB)"""
        return file_size <= max_size

    @staticmethod
    def validate_file_extension(filename: str, allowed_extensions: List[str] = ['.xlsx', '.xls']) -> bool:
        """Validate file extension"""
        return any(filename.lower().endswith(ext) for ext in allowed_extensions)

    @staticmethod
    def is_valid_excel(file_content: bytes) -> bool:
        """Check if file content is valid Excel"""
        try:
            pd.read_excel(BytesIO(file_content), engine='openpyxl')
            return True
        except:
            return False
