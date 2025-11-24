"""
Excel Parser Service - Parses uploaded Excel files to extract index requirements
Supports multiple index types through configuration system
"""
from io import BytesIO
from typing import Dict, Any, List
import pandas as pd
import uuid
from datetime import datetime
import re

from app.index_config.index_configs import get_index_config, get_all_excel_columns


class ExcelParsingError(Exception):
    """Custom exception for Excel parsing errors"""
    pass


class ExcelParser:
    """
    Service for parsing Excel files containing index requirements
    Supports multiple index types through configuration system
    """

    @classmethod
    def parse_excel(cls, file_content: bytes, index_id: str, index_type: str = 'NAII') -> Dict[str, Any]:
        """
        Parse Excel file and return structured data based on index type configuration

        Args:
            file_content: Excel file as bytes
            index_id: ID of the index being created
            index_type: Type of index (e.g., 'NAII', 'ETARI')

        Returns:
            Dictionary containing parsed requirements data

        Raises:
            ExcelParsingError: If parsing fails
        """
        try:
            # Load configuration for this index type
            config = get_index_config(index_type)

            # Read Excel file
            df = pd.read_excel(BytesIO(file_content), engine='openpyxl')

            # Validate structure using config
            cls._validate_structure(df, config)

            # Extract metadata
            metadata = cls._extract_metadata(df, index_type)

            # Group rows by requirement and parse using config
            requirements = cls._group_by_requirements(df, index_id, config)

            return {
                'metadata': metadata,
                'requirements': requirements,
                'total_requirements': len(requirements),
                'total_rows': len(df),
                'index_type': index_type
            }

        except ValueError as ve:
            # Configuration errors
            raise ExcelParsingError(f"Configuration error: {str(ve)}")
        except Exception as e:
            raise ExcelParsingError(f"Failed to parse Excel file: {str(e)}")

    @classmethod
    def _validate_structure(cls, df: pd.DataFrame, config: Dict[str, Any]) -> None:
        """
        Validate that Excel has required columns based on index configuration

        Args:
            df: DataFrame to validate
            config: Index type configuration
        """
        df_columns = df.columns.tolist()

        # Get required columns from config
        required_cols = list(config['excel_columns'].values())

        missing_columns = []
        for required_col in required_cols:
            if required_col not in df_columns:
                missing_columns.append(required_col)

        if missing_columns:
            raise ExcelParsingError(
                f"Missing required columns: {', '.join(missing_columns)}"
            )

        if len(df) == 0:
            raise ExcelParsingError("Excel file is empty")

    @classmethod
    def _extract_metadata(cls, df: pd.DataFrame, index_type: str) -> Dict[str, Any]:
        """
        Extract metadata from the Excel file

        Args:
            df: DataFrame to extract metadata from
            index_type: Type of index being parsed
        """
        return {
            'index_type': index_type,
            'total_rows': len(df),
            'columns': df.columns.tolist(),
            'parsed_at': datetime.utcnow().isoformat()
        }

    @classmethod
    def _group_by_requirements(cls, df: pd.DataFrame, index_id: str, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Group rows by requirement code and structure the data based on index configuration

        Args:
            df: DataFrame containing requirement data
            index_id: ID of the index being created
            config: Index type configuration

        Returns:
            List of requirement dictionaries with maturity levels
        """
        # Check if this is ETARI - use different parsing logic
        if config['code'] == 'ETARI':
            return cls._parse_etari_requirements(df, index_id, config)

        # NAII parsing logic (existing)
        requirements = []
        col_names = config['excel_columns']
        expected_levels = config['num_levels']
        validate_exact = config['parsing_rules']['validate_exact_levels']

        # Group by requirement code column
        grouped = df.groupby(col_names['requirement_code'])

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
                'question_ar': str(first_row[col_names['question']]).strip() if pd.notna(first_row[col_names['question']]) else "",
                'main_area_ar': str(first_row[col_names['main_area']]).strip() if pd.notna(first_row[col_names['main_area']]) else "",
                'sub_domain_ar': str(first_row[col_names['sub_domain']]).strip() if pd.notna(first_row[col_names['sub_domain']]) else "",
                'maturity_levels': []
            }

            # Process each maturity level
            for idx, row in group.iterrows():
                level_data = cls._parse_maturity_level(row, req_id, config)
                requirement_data['maturity_levels'].append(level_data)

            # Validate level count if required by config
            if validate_exact and len(requirement_data['maturity_levels']) != expected_levels:
                print(f"Warning: Requirement {req_code} has {len(requirement_data['maturity_levels'])} levels instead of {expected_levels}")

            requirements.append(requirement_data)

        return requirements

    @classmethod
    def _parse_maturity_level(cls, row: pd.Series, requirement_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a single maturity level row based on configuration

        Args:
            row: DataFrame row containing maturity level data
            requirement_id: ID of the parent requirement
            config: Index type configuration

        Returns:
            Dictionary with maturity level data
        """
        level_id = str(uuid.uuid4())
        col_names = config['excel_columns']
        parsing_rules = config['parsing_rules']

        # Extract level number from level name using config pattern
        level_name = str(row[col_names['maturity_level']]).strip() if pd.notna(row[col_names['maturity_level']]) else ""
        level_number = cls._extract_level_number(level_name, parsing_rules['level_name_pattern'])

        # Parse evidence requirements (bullet-pointed list)
        evidence_text = str(row[col_names['evidence']]).strip() if pd.notna(row[col_names['evidence']]) else ""
        evidence_items = cls._parse_bullet_list(evidence_text, parsing_rules)

        # Parse acceptance criteria (bullet-pointed list)
        criteria_text = str(row[col_names['acceptance_criteria']]).strip() if pd.notna(row[col_names['acceptance_criteria']]) else ""
        criteria_items = cls._parse_bullet_list(criteria_text, parsing_rules)

        return {
            'id': level_id,
            'requirement_id': requirement_id,
            'level': level_number,
            'level_name_ar': level_name,
            'readiness_ar': "",  # Column removed from NAII-2025 template
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
    def _extract_level_number(cls, level_name: str, pattern: str) -> int:
        """
        Extract level number from level name using regex pattern from config

        Args:
            level_name: The full level name (e.g., "المستوى 1: البناء")
            pattern: Regex pattern to extract number (from config)

        Returns:
            Level number (int) or 0 if extraction fails
        """
        try:
            match = re.search(pattern, level_name)
            if match:
                return int(match.group(1))
            return 0
        except Exception:
            return 0

    @classmethod
    def _parse_bullet_list(cls, text: str, parsing_rules: Dict[str, Any]) -> List[str]:
        """
        Parse bullet-pointed text into list of items using config rules

        Args:
            text: Text containing bullet-pointed items
            parsing_rules: Parsing rules from index configuration

        Returns:
            List of parsed items

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
        bullet_chars = ''.join(parsing_rules['bullet_separators'])
        numbered_pattern = parsing_rules['numbered_pattern']

        for line in lines:
            line = line.strip()

            # Skip empty lines
            if not line:
                continue

            # Remove common bullet characters from config
            line = line.lstrip(bullet_chars)
            line = line.strip()

            # Remove numbering using pattern from config
            line = re.sub(numbered_pattern, '', line)
            line = re.sub(r'^[أ-ي][\.\)]\s*', '', line)

            if line:
                items.append(line)

        return items

    @classmethod
    def _parse_etari_requirements(cls, df: pd.DataFrame, index_id: str, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Parse ETARI requirements - different structure than NAII

        ETARI Structure:
        - Each row is ONE question (not multiple levels per requirement)
        - Hierarchy: Capability → Element → Standard → Question
        - Section = Capability (القدرة)
        - Requirement = Standard (المعيار)
        - Only 1 level per question (answered/not answered)

        Args:
            df: DataFrame containing ETARI data
            index_id: ID of the index being created
            config: ETARI configuration

        Returns:
            List of requirement dictionaries
        """
        requirements = []
        col_names = config['excel_columns']

        # Clean the dataframe - drop rows where question code is empty
        # Assuming code is stored in a column or we use row number
        df_clean = df.dropna(subset=[col_names['question']])

        # Counter for generating codes if missing
        question_num = 1

        for idx, row in df_clean.iterrows():
            # Skip rows with empty question
            question_text = str(row[col_names['question']]).strip() if pd.notna(row[col_names['question']]) else ""
            if not question_text or question_text == 'nan':
                continue

            # Extract data from row
            capability = str(row[col_names['capability']]).strip() if pd.notna(row[col_names['capability']]) else ""
            element = str(row[col_names['element']]).strip() if pd.notna(row[col_names['element']]) else ""
            standard = str(row[col_names['standard']]).strip() if pd.notna(row[col_names['standard']]) else ""
            goal = str(row[col_names['goal']]).strip() if pd.notna(row[col_names['goal']]) else ""
            evidence_docs = str(row[col_names['evidence_docs']]).strip() if pd.notna(row[col_names['evidence_docs']]) else ""

            # Try to get code from data - ETARI template has codes in the sheet
            # The code might be embedded in the row or we need to extract from context
            # For now, use row index as fallback
            req_code = f"ETARI-Q{question_num:03d}"

            # Try to extract code from the row if there's a pattern like "1.1.1.1"
            # Check if any cell contains a code-like pattern
            for col in df.columns:
                cell_value = str(row[col]).strip()
                if re.match(r'^\d+\.\d+\.\d+\.\d+$', cell_value):
                    req_code = cell_value
                    break

            # Create unique IDs
            req_id = str(uuid.uuid4())
            level_id = str(uuid.uuid4())

            # ETARI uses Capability as section
            section = capability if capability else "عام"

            # Build requirement data - ETARI structure
            requirement_data = {
                'id': req_id,
                'code': req_code,
                'index_id': index_id,
                # ETARI field mapping:
                'question_ar': question_text,  # السؤال - The question itself
                'question_en': None,  # Not used in ETARI
                'main_area_ar': capability if capability else 'عام',  # القدرة - Main capability area
                'main_area_en': None,
                'element_ar': element if element else None,  # العنصر - Element
                'element_en': None,
                'sub_domain_ar': standard if standard else '',  # المعيار - Standard/Criteria
                'sub_domain_en': None,
                'objective_ar': goal if goal else None,  # الهدف - Goal/Objective
                'objective_en': None,
                'evidence_description_ar': evidence_docs if evidence_docs else None,  # مستندات الاثبات
                'evidence_description_en': None,
                'maturity_levels': []  # ETARI has NO maturity levels - evidence uploaded directly to requirement
            }

            requirements.append(requirement_data)
            question_num += 1

        return requirements


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
