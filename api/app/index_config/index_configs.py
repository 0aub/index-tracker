"""
Index Type Configurations
Centralized configuration for all supported index types (NAII, ETARI, etc.)
"""
from typing import Dict, List, Any, Optional


INDEX_TYPE_CONFIGS: Dict[str, Dict[str, Any]] = {
    'NAII': {
        # ============================================
        # Basic Information
        # ============================================
        'code': 'NAII',
        'name_ar': 'المؤشر الوطني للذكاء الاصطناعي',
        'name_en': 'National AI Index',
        'description_ar': 'مؤشر قياس مستوى نضج الذكاء الاصطناعي',
        'description_en': 'Artificial Intelligence Maturity Assessment Index',

        # ============================================
        # Maturity Level Structure
        # ============================================
        'num_levels': 6,  # Total number of maturity levels (0-5)
        'min_level': 0,
        'max_level': 5,

        # ============================================
        # Level Definitions
        # ============================================
        'level_definitions': [
            {
                'level': 0,
                'name_ar': 'غياب القدرات',
                'name_en': 'Non-existent',
                'description_ar': 'غياب القدرات والإمكانيات',
                'description_en': 'No capabilities exist',
                'color': '#E74C3C',  # Red
            },
            {
                'level': 1,
                'name_ar': 'البناء',
                'name_en': 'Initial',
                'description_ar': 'المرحلة الأولية للبناء',
                'description_en': 'Initial building phase',
                'color': '#F39C12',  # Orange
            },
            {
                'level': 2,
                'name_ar': 'التفعيل',
                'name_en': 'Repeatable',
                'description_ar': 'تفعيل القدرات وتكرارها',
                'description_en': 'Activation and repeatability',
                'color': '#F1C40F',  # Yellow
            },
            {
                'level': 3,
                'name_ar': 'التمكين',
                'name_en': 'Defined',
                'description_ar': 'تمكين القدرات وتحديدها',
                'description_en': 'Enablement and definition',
                'color': '#52BE80',  # Light Green
            },
            {
                'level': 4,
                'name_ar': 'التميز',
                'name_en': 'Managed',
                'description_ar': 'التميز في إدارة القدرات',
                'description_en': 'Excellence in management',
                'color': '#3498DB',  # Blue
            },
            {
                'level': 5,
                'name_ar': 'الريادة',
                'name_en': 'Optimized',
                'description_ar': 'الريادة والتحسين المستمر',
                'description_en': 'Leadership and continuous improvement',
                'color': '#9B59B6',  # Purple
            },
        ],

        # ============================================
        # Excel Template Configuration
        # ============================================
        'template_file': 'NAII-2025-template.xlsx',
        'template_dir': 'templates',

        # Column mappings (Excel column names in Arabic)
        'excel_columns': {
            'main_area': 'المحور الأساسي',
            'sub_domain': 'المجال الفرعي',
            'requirement_code': 'رقم المعيار',
            'question': 'السؤال',
            'maturity_level': 'مستوى النضج',
            'evidence': 'الأدلة المطلوبة',
            'acceptance_criteria': 'معايير القبول',
        },

        # ============================================
        # Parsing Rules
        # ============================================
        'parsing_rules': {
            # Pattern to extract level number from level name
            # Example: "المستوى 1: البناء" -> extracts "1"
            'level_name_pattern': r'المستوى\s*(\d+)',

            # Whether to validate exact number of levels per requirement
            'validate_exact_levels': True,

            # Whether to allow partial requirements (fewer levels than expected)
            'allow_partial_requirements': False,

            # How to parse bullet lists (evidence and criteria)
            'bullet_separators': ['•', '-', '*'],
            'numbered_pattern': r'^\d+[\\.\\)]\\s*',
        },

        # ============================================
        # Scoring & Calculation Rules
        # ============================================
        'scoring': {
            # Level at which a requirement is considered "complete"
            'completion_threshold': 5,

            # Scoring method: 'simple' (level value) or 'weighted' (custom weights)
            'method': 'simple',

            # Optional: weights per level (if method = 'weighted')
            'level_weights': None,

            # Whether higher levels include lower level requirements
            'cumulative_levels': True,
        },

        # ============================================
        # Validation Rules
        # ============================================
        'validation': {
            # Evidence requirements
            'evidence_required': True,
            'min_evidence_per_level': 1,
            'max_evidence_per_level': 20,

            # Acceptance criteria
            'criteria_required': True,
            'min_criteria_per_level': 1,
            'max_criteria_per_level': 20,

            # Requirement structure
            'require_main_area': True,
            'require_sub_domain': True,
            'require_question': True,
        },

        # ============================================
        # Display Settings
        # ============================================
        'display': {
            # Default language for display
            'default_language': 'ar',

            # Whether to show level 0 in progress indicators
            'show_level_zero': True,

            # Progress bar style
            'progress_style': 'dots',  # 'dots', 'bar', 'gauge'

            # Chart settings for reports
            'chart_max_value': 100,
            'chart_scale_by_max_level': True,  # Scale to max_level or use fixed 100
        },
    },

    # ============================================
    # ETARI Configuration
    # ============================================
    'ETARI': {
        # ============================================
        # Basic Metadata
        # ============================================
        'code': 'ETARI',
        'name_ar': 'مؤشر جاهزية تبني التقنيات الناشئة',
        'name_en': 'Emerging Technology Adoption Readiness Index',
        'description_ar': 'مؤشر لتقييم جاهزية المنظمات لتبني التقنيات الناشئة',
        'description_en': 'Index to assess organizational readiness for emerging technology adoption',
        'version': '2024',

        # ============================================
        # Level Configuration
        # ETARI uses 3 levels: 0 = Not Started, 1 = Draft, 2 = Confirmed
        # ============================================
        'num_levels': 3,  # 0, 1, and 2
        'min_level': 0,
        'max_level': 2,

        # Level definitions
        'level_definitions': [
            {
                'level': 0,
                'name_ar': 'لم يبدأ',
                'name_en': 'Not Started',
                'color': '#EF4444',  # Red
                'description_ar': 'لم يتم البدء في الإجابة على السؤال',
                'description_en': 'Question not yet started',
            },
            {
                'level': 1,
                'name_ar': 'مسودة',
                'name_en': 'Draft',
                'color': '#EAB308',  # Yellow
                'description_ar': 'تم البدء في الإجابة ولكن لم تكتمل بعد',
                'description_en': 'Answer started but not complete',
            },
            {
                'level': 2,
                'name_ar': 'مؤكد',
                'name_en': 'Confirmed',
                'color': '#10B981',  # Green
                'description_ar': 'تمت الإجابة والتأكيد على السؤال',
                'description_en': 'Question answered and confirmed',
            },
        ],

        # ============================================
        # File & Template Settings
        # ============================================
        'template_file': 'ETARI-2024-template.xlsx',
        'template_dir': 'templates',

        # Column mappings (Excel column names in Arabic - note trailing spaces!)
        'excel_columns': {
            'capability': 'القدرة ',  # Has trailing space
            'element': 'العنصر ',  # Has trailing space
            'standard': 'المعيار ',  # Has trailing space
            'goal': 'الهدف',
            'question_code': 'Unnamed: 4',  # Empty column in Excel
            'question': 'السؤال',
            'evidence_docs': 'مستندات الاثبات ',  # Has trailing space
        },

        # ============================================
        # Parsing Rules
        # ============================================
        'parsing_rules': {
            # ETARI has hierarchical code structure: X.Y.Z.W
            'code_pattern': r'^(\d+)\.(\d+)\.(\d+)\.(\d+)$',

            # Section grouping: Use Capability as section
            'section_field': 'capability',

            # Whether to validate exact structure
            'validate_hierarchy': True,

            # Expected capabilities
            'expected_capabilities': ['البحث', 'التواصل', 'الاثبات', 'التكامل'],

            # Total expected questions
            'expected_question_count': 77,

            # Bullet list parsing (for evidence docs)
            'bullet_separators': ['•', '-', '*', '\\n'],
            'numbered_pattern': r'^\d+[\\.\\)]\\s*',
        },

        # ============================================
        # Scoring & Calculation Rules
        # ============================================
        'scoring': {
            # Level at which a question is considered "complete"
            'completion_threshold': 1,

            # Scoring method: percentage of answered questions
            'method': 'completion_percentage',

            # Whether to require evidence for completion
            'evidence_required_for_completion': False,  # Only some questions need evidence

            # Minimum answer length (characters)
            'min_answer_length': 10,
        },

        # ============================================
        # Validation Rules
        # ============================================
        'validation': {
            # Evidence requirements
            'evidence_required': False,  # Not all questions need evidence
            'evidence_per_question': 'variable',  # Some need it, some don't

            # Answer requirements
            'answer_required': True,  # All questions need answers
            'min_answer_length': 10,

            # Question structure
            'require_capability': True,
            'require_element': True,
            'require_standard': True,
            'require_question': True,
            'require_goal': True,
        },

        # ============================================
        # Display Settings
        # ============================================
        'display': {
            # Default language for display
            'default_language': 'ar',

            # Don't show level 0 as a separate indicator
            'show_level_zero': False,

            # Progress bar style (not dots, since only 2 states)
            'progress_style': 'checkbox',  # 'checkbox', 'bar', 'percentage'

            # Chart settings for reports
            'chart_max_value': 100,  # Percentage-based
            'chart_scale_by_max_level': False,  # Use 0-100% scale

            # Show question codes
            'show_question_codes': True,

            # Display mode
            'display_mode': 'question_answer',  # vs 'maturity_levels'
        },
    }
}


def get_index_config(index_type: str) -> Dict[str, Any]:
    """
    Get configuration for a specific index type

    Args:
        index_type: The index type code (e.g., 'NAII', 'ETARI')

    Returns:
        Dictionary containing all configuration for the index type

    Raises:
        ValueError: If index_type is not found in configurations
    """
    if index_type not in INDEX_TYPE_CONFIGS:
        raise ValueError(
            f"Unknown index type: '{index_type}'. "
            f"Available types: {', '.join(get_available_index_types())}"
        )
    return INDEX_TYPE_CONFIGS[index_type]


def get_available_index_types() -> List[str]:
    """
    Get list of all supported index types

    Returns:
        List of index type codes
    """
    return list(INDEX_TYPE_CONFIGS.keys())


def get_level_definition(index_type: str, level: int) -> Optional[Dict[str, Any]]:
    """
    Get definition for a specific maturity level

    Args:
        index_type: The index type code
        level: The maturity level number

    Returns:
        Dictionary with level definition or None if not found
    """
    config = get_index_config(index_type)
    for level_def in config['level_definitions']:
        if level_def['level'] == level:
            return level_def
    return None


def get_level_color(index_type: str, level: int) -> str:
    """
    Get color for a specific maturity level

    Args:
        index_type: The index type code
        level: The maturity level number

    Returns:
        Hex color code (e.g., '#E74C3C') or default gray
    """
    level_def = get_level_definition(index_type, level)
    return level_def['color'] if level_def else '#666666'


def get_level_name(index_type: str, level: int, language: str = 'ar') -> str:
    """
    Get name for a specific maturity level

    Args:
        index_type: The index type code
        level: The maturity level number
        language: 'ar' or 'en'

    Returns:
        Level name in requested language or empty string
    """
    level_def = get_level_definition(index_type, level)
    if not level_def:
        return ''

    key = 'name_ar' if language == 'ar' else 'name_en'
    return level_def.get(key, '')


def validate_level(index_type: str, level: int) -> bool:
    """
    Validate if a level number is valid for the index type

    Args:
        index_type: The index type code
        level: The maturity level number

    Returns:
        True if level is valid, False otherwise
    """
    config = get_index_config(index_type)
    return config['min_level'] <= level <= config['max_level']


def get_excel_column_name(index_type: str, column_key: str) -> Optional[str]:
    """
    Get Excel column name for a specific field

    Args:
        index_type: The index type code
        column_key: Key for the column (e.g., 'main_area', 'question')

    Returns:
        Excel column name or None if not found
    """
    config = get_index_config(index_type)
    return config['excel_columns'].get(column_key)


def get_all_excel_columns(index_type: str) -> List[str]:
    """
    Get all required Excel column names for an index type

    Args:
        index_type: The index type code

    Returns:
        List of Excel column names
    """
    config = get_index_config(index_type)
    return list(config['excel_columns'].values())
