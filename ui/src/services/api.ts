/**
 * API Service - Handles all backend API calls
 */

// Build API base URL with /api/v1 prefix
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE_URL = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;

// ============================================================================
// Types
// ============================================================================

export interface Index {
  id: string;
  code: string;
  index_type: string;  // NEW: 'NAII', 'ETARI', etc.
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  version: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'archived';
  organization_id: string;
  total_requirements: number;
  total_areas: number;
  total_evidence: number;
  excel_filename: string | null;
  excel_upload_date: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  start_date: string | null;
  end_date: string | null;
  // Versioning and completion fields
  is_completed: boolean;
  completed_at: string | null;
  previous_index_id: string | null;
  // User's role in this specific index (from index_users table)
  user_role?: string | null;  // 'OWNER', 'SUPERVISOR', 'CONTRIBUTOR'
}

export interface Recommendation {
  id: string;
  requirement_id: string;
  index_id: string;
  current_status_ar: string | null;
  current_status_en: string | null;
  recommendation_ar: string;
  recommendation_en: string | null;
  status: 'pending' | 'addressed' | 'in_progress';
  addressed_comment: string | null;
  addressed_by: string | null;
  addressed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecommendationUploadResult {
  total_rows: number;
  matched: number;
  unmatched: number;
  created: number;
  updated: number;
  matched_requirements: Array<{
    row: number;
    requirement_code: string;
    requirement_id: string;
    main_area: string;
    element: string;
    sub_element: string;
  }>;
  unmatched_rows: Array<{
    row: number;
    main_area: string;
    element: string;
    sub_element: string;
    recommendation: string;
  }>;
}

export interface EvidenceRequirement {
  id: string;
  evidence_ar: string;
  evidence_en: string | null;
  display_order: number;
  is_mandatory: boolean;
}

export interface AcceptanceCriteria {
  id: string;
  criteria_ar: string;
  criteria_en: string | null;
  display_order: number;
  is_mandatory: boolean;
}

export interface MaturityLevel {
  id: string;
  level: number;
  level_name_ar: string;
  level_name_en: string | null;
  readiness_ar: string | null;
  readiness_en: string | null;
  score: number | null;
  evidence_requirements: EvidenceRequirement[];
  acceptance_criteria: AcceptanceCriteria[];
}

export interface Requirement {
  id: string;
  code: string;
  display_order: number;
  question_ar: string;
  question_en: string | null;
  main_area_ar: string;
  main_area_en: string | null;
  sub_domain_ar: string;
  sub_domain_en: string | null;
  // ETARI-specific fields (optional, only populated for ETARI index type)
  element_ar?: string | null;
  element_en?: string | null;
  objective_ar?: string | null;
  objective_en?: string | null;
  evidence_description_ar?: string | null;
  evidence_description_en?: string | null;
  // Evidence requirement flag
  requires_evidence: boolean;
  // ETARI Answer fields
  answer_ar?: string | null;
  answer_en?: string | null;
  answer_status?: 'draft' | 'pending_review' | 'approved' | 'rejected' | null;
  answered_by?: string | null;
  answered_at?: string | null;
  reviewed_by?: string | null;
  reviewer_comment_ar?: string | null;
  reviewer_comment_en?: string | null;
  reviewed_at?: string | null;
  // Evidence count (populated in list view)
  evidence_count?: number;
  // Recommendations count (populated in list view)
  recommendations_count?: number;
  index_id: string;
  maturity_levels: MaturityLevel[];
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name_ar: string;
  full_name_en: string | null;
  role: 'admin' | 'index_manager' | 'section_coordinator' | 'contributor';
  organization_id: string;
  department_ar: string | null;
  department_en: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface Assignment {
  id: string;
  index_id: string;
  requirement_id: string;
  user_id: string;
  assigned_by: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'review';
  current_level: string | null;
  completion_percentage: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AssignmentWithUser extends Assignment {
  user_name_ar: string;
  user_name_en: string | null;
  user_role: string;
  user_department_ar: string | null;
}

export interface Evidence {
  id: string;
  requirement_id: string;
  assignment_id: string | null;
  maturity_level: number;
  document_name: string;
  current_version: number;
  status: 'draft' | 'submitted' | 'confirmed' | 'approved' | 'rejected';
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface EvidenceVersion {
  id: string;
  evidence_id: string;
  version_number: number;
  filename: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  upload_comment: string | null;
  uploaded_at: string;
}

export interface EvidenceActivity {
  id: string;
  evidence_id: string;
  version_number: number | null;
  action: 'uploaded_draft' | 'uploaded_version' | 'submitted' | 'confirmed' | 'rejected' | 'approved';
  actor_id: string;
  comment: string | null;
  created_at: string;
}

export interface EvidenceWithVersions extends Evidence {
  versions: EvidenceVersion[];
  activities: EvidenceActivity[];
}

export interface RequirementActivity {
  id: string;
  requirement_id: string;
  maturity_level: number | null;
  action_type: string;
  actor_id: string;
  actor_name: string | null;
  actor_name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  comment: string | null;
  created_at: string;
}

export interface PreviousEvidence {
  id: string;
  document_name: string;
  status: string;
  current_version: number;
  mime_type: string | null;
  created_at: string;
}

export interface PreviousRecommendation {
  id: string;
  current_status_ar: string | null;  // الوضع الراهن
  current_status_en: string | null;
  recommendation_ar: string;
  recommendation_en: string | null;
  status: string;
  addressed_comment: string | null;
  created_at: string;
}

export interface PreviousRequirementData {
  previous_requirement_id: string;
  previous_index_id: string;
  previous_index_name_ar: string;
  previous_index_name_en: string | null;
  answer_ar: string | null;
  answer_en: string | null;
  answer_status: string | null;
  answered_at: string | null;
  evidence: PreviousEvidence[];
  recommendation: PreviousRecommendation | null;
}

// ============================================================================
// Previous Year Context (New Feature)
// ============================================================================

export interface StandardGroupRequirement {
  code: string;
  question_ar: string;
  question_en: string | null;
  answer_ar: string | null;
  answer_en: string | null;
  answer_status: string | null;
  evidence: PreviousEvidence[];
}

export interface StandardGroupData {
  sub_domain_ar: string;
  sub_domain_en: string | null;
  recommendation: PreviousRecommendation | null;
  requirements: StandardGroupRequirement[];
}

export interface PreviousYearContextResponse {
  matched: boolean;
  previous_index_code: string;
  previous_index_name_ar: string;
  previous_index_name_en: string | null;
  matched_requirement: StandardGroupRequirement | null;
  matched_recommendation: PreviousRecommendation | null;
  standard_group: StandardGroupData | null;
}

export interface IndexUser {
  id: string;
  index_id: string;
  user_id: string;
  role: 'owner' | 'supervisor' | 'contributor';
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IndexUserWithDetails extends IndexUser {
  user_username: string | null;
  user_full_name_ar: string | null;
  user_full_name_en: string | null;
  user_email: string | null;
}

// ============================================================================
// API Error Handling & Auth
// ============================================================================

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Helper function to get auth token from localStorage
function getAuthToken(): string | null {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed.state?.token || null;
    }
  } catch (error) {
    console.error('Failed to get auth token:', error);
  }
  return null;
}

// Helper function to get auth headers for JSON requests
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// Helper function to get auth headers for FormData/file uploads (no Content-Type)
function getAuthHeadersForUpload(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// Helper function to add auth headers to existing headers
function addAuthToHeaders(headers: HeadersInit = {}): HeadersInit {
  const token = getAuthToken();
  if (token) {
    return {
      ...headers,
      'Authorization': `Bearer ${token}`,
    };
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new APIError(
      error.detail || 'An error occurred',
      response.status,
      error
    );
  }
  return response.json();
}

// ============================================================================
// Indices API
// ============================================================================

export const indicesAPI = {
  /**
   * Get all indices
   */
  async getAll(params?: {
    organization_id?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<Index[]> {
    const queryParams = new URLSearchParams();
    if (params?.organization_id) queryParams.append('organization_id', params.organization_id);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/indices?${queryParams}`, {
      cache: 'no-store',
      headers: addAuthToHeaders({
        'Cache-Control': 'no-cache'
      })
    });
    return handleResponse<Index[]>(response);
  },

  /**
   * Get single index by ID
   */
  async getById(id: string): Promise<Index> {
    const response = await fetch(`${API_BASE_URL}/indices/${id}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<Index>(response);
  },

  /**
   * Download Excel template
   */
  downloadTemplate(indexType: string = 'NAII'): string {
    return `${API_BASE_URL}/indices/template?index_type=${indexType}`;
  },

  /**
   * Create index from Excel upload
   */
  async createFromExcel(data: {
    file: File;
    code: string;
    index_type?: string;  // NEW: Index type ('NAII', 'ETARI', etc.)
    name_ar: string;
    name_en?: string;
    description_ar?: string;
    description_en?: string;
    version?: string;
    organization_id: string;
    created_by_user_id: string;
  }): Promise<Index> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('code', data.code);
    formData.append('index_type', data.index_type || 'NAII');  // Default to NAII
    formData.append('name_ar', data.name_ar);
    if (data.name_en) formData.append('name_en', data.name_en);
    if (data.description_ar) formData.append('description_ar', data.description_ar);
    if (data.description_en) formData.append('description_en', data.description_en);
    formData.append('version', data.version || '1.0');
    formData.append('organization_id', data.organization_id);
    formData.append('created_by_user_id', data.created_by_user_id);

    const response = await fetch(`${API_BASE_URL}/indices/upload`, {
      method: 'POST',
      headers: getAuthHeadersForUpload(),
      body: formData,
    });
    return handleResponse<Index>(response);
  },

  /**
   * Create an empty index without Excel upload
   */
  async createEmpty(data: {
    code: string;
    index_type: string;
    name_ar: string;
    name_en?: string;
    description_ar?: string;
    description_en?: string;
    version?: string;
    organization_id: string;
    start_date?: string;
    end_date?: string;
  }): Promise<Index> {
    const response = await fetch(`${API_BASE_URL}/indices/create-empty`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Index>(response);
  },

  /**
   * Update index
   */
  async update(
    id: string,
    data: {
      name_ar?: string;
      name_en?: string;
      description_ar?: string;
      description_en?: string;
      status?: string;
    }
  ): Promise<Index> {
    const response = await fetch(`${API_BASE_URL}/indices/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Index>(response);
  },

  /**
   * Delete index
   * @param id - Index ID
   * @param hardDelete - If true, permanently delete. If false, archive (soft delete)
   */
  async delete(id: string, hardDelete: boolean = true): Promise<void> {
    const url = hardDelete
      ? `${API_BASE_URL}/indices/${id}?hard_delete=true`
      : `${API_BASE_URL}/indices/${id}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: addAuthToHeaders(),
    });
    if (!response.ok) {
      throw new APIError('Failed to delete index', response.status);
    }
  },

  /**
   * Get index statistics
   */
  async getStatistics(id: string): Promise<{
    total_requirements: number;
    total_maturity_levels: number;
    total_evidence_requirements: number;
    total_acceptance_criteria: number;
    total_unique_areas: number;
    expected_levels_per_requirement: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/indices/${id}/statistics`, {
      headers: addAuthToHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Get user engagement statistics for an index
   */
  async getUserEngagement(id: string): Promise<{
    index_id: string;
    user_statistics: Array<{
      user_id: string;
      username: string;
      full_name_ar: string | null;
      full_name_en: string | null;
      user_role: string | null;  // System role (ADMIN, etc.)
      index_role: string | null;  // Index role (OWNER, SUPERVISOR, CONTRIBUTOR)
      approved_documents: number;
      assigned_requirements: number;
      rejected_documents: number;
      total_uploads: number;
      total_comments: number;
      documents_reviewed: number;
      draft_documents: number;
      submitted_documents: number;
      confirmed_documents: number;
      checklist_items_completed: number;
      review_comments: number;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/indices/${id}/user-engagement`, {
      headers: addAuthToHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Mark an index as completed
   */
  async complete(id: string): Promise<Index> {
    const response = await fetch(`${API_BASE_URL}/indices/${id}/complete`, {
      method: 'POST',
      headers: addAuthToHeaders(),
    });
    return handleResponse<Index>(response);
  },

  /**
   * Get recommendations for an index
   */
  async getRecommendations(id: string): Promise<{
    index_id: string;
    total_recommendations: number;
    recommendations: Array<{
      id: string;
      requirement_id: string;
      recommendation_ar: string;
      recommendation_en: string | null;
      status: string;
      addressed_at: string | null;
      created_at: string;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/indices/${id}/recommendations`, {
      headers: addAuthToHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Get list of completed indices (for linking)
   */
  async getCompleted(params?: {
    organization_id?: string;
    index_type?: string;
  }): Promise<Index[]> {
    const queryParams = new URLSearchParams();
    if (params?.organization_id) queryParams.append('organization_id', params.organization_id);
    if (params?.index_type) queryParams.append('index_type', params.index_type);

    const response = await fetch(`${API_BASE_URL}/indices/completed/list?${queryParams}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<Index[]>(response);
  },
};

// ============================================================================
// Requirements API
// ============================================================================

export const requirementsAPI = {
  /**
   * Get all requirements
   */
  async getAll(params?: {
    index_id?: string;
    main_area_ar?: string;
    skip?: number;
    limit?: number;
  }): Promise<Requirement[]> {
    const queryParams = new URLSearchParams();
    if (params?.index_id) queryParams.append('index_id', params.index_id);
    if (params?.main_area_ar) queryParams.append('main_area_ar', params.main_area_ar);
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/requirements?${queryParams}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<Requirement[]>(response);
  },

  /**
   * Get single requirement with all details
   */
  async getById(id: string): Promise<Requirement> {
    const response = await fetch(`${API_BASE_URL}/requirements/${id}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<Requirement>(response);
  },

  /**
   * Update requirement
   */
  async update(
    id: string,
    data: {
      question_ar?: string;
      question_en?: string;
      main_area_ar?: string;
      main_area_en?: string;
      sub_domain_ar?: string;
      sub_domain_en?: string;
    }
  ): Promise<Requirement> {
    const response = await fetch(`${API_BASE_URL}/requirements/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Requirement>(response);
  },

  /**
   * Save answer for ETARI requirement
   */
  async saveAnswer(
    id: string,
    userId: string,
    data: {
      answer_ar: string;
      answer_en?: string;
    }
  ): Promise<Requirement> {
    const response = await fetch(`${API_BASE_URL}/requirements/${id}/answer?user_id=${userId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Requirement>(response);
  },

  /**
   * Submit answer for review
   */
  async submitForReview(id: string, userId: string): Promise<Requirement> {
    const response = await fetch(`${API_BASE_URL}/requirements/${id}/submit-for-review?user_id=${userId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<Requirement>(response);
  },

  /**
   * Confirm an approved answer
   */
  async confirmAnswer(id: string, reviewerId: string): Promise<Requirement> {
    const response = await fetch(`${API_BASE_URL}/requirements/${id}/confirm-answer?reviewer_id=${reviewerId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<Requirement>(response);
  },

  /**
   * Review an answer
   */
  async reviewAnswer(
    id: string,
    reviewerId: string,
    data: {
      action: 'approve' | 'reject' | 'request_changes';
      reviewer_comment_ar?: string;
      reviewer_comment_en?: string;
    }
  ): Promise<Requirement> {
    const response = await fetch(`${API_BASE_URL}/requirements/${id}/review?reviewer_id=${reviewerId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Requirement>(response);
  },

  /**
   * Get requirement activities
   */
  async getActivities(id: string): Promise<RequirementActivity[]> {
    const response = await fetch(`${API_BASE_URL}/requirements/${id}/activities`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<RequirementActivity[]>(response);
  },

  /**
   * Get previous year's data for a requirement
   */
  async getPreviousData(id: string): Promise<PreviousRequirementData | null> {
    const response = await fetch(`${API_BASE_URL}/requirements/${id}/previous-data`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<PreviousRequirementData | null>(response);
  },

  /**
   * Get recommendations for a requirement
   */
  async getRecommendations(id: string): Promise<Recommendation[]> {
    const response = await fetch(`${API_BASE_URL}/requirements/${id}/recommendations`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<Recommendation[]>(response);
  },

  /**
   * Get previous year context for a requirement (NEW FEATURE)
   * Returns matched requirement or المعيار group data from previous year
   */
  async getPreviousYearContext(id: string): Promise<PreviousYearContextResponse | null> {
    const response = await fetch(`${API_BASE_URL}/requirements/${id}/previous-year-context`, {
      headers: addAuthToHeaders()
    });
    if (response.status === 404) {
      return null; // No previous year exists
    }
    return handleResponse<PreviousYearContextResponse | null>(response);
  },

  /**
   * Create a new requirement
   */
  async create(
    indexId: string,
    actorId: string,
    data: {
      code: string;
      question_ar: string;
      question_en?: string;
      main_area_ar: string;
      main_area_en?: string;
      sub_domain_ar: string;
      sub_domain_en?: string;
      element_ar?: string;
      element_en?: string;
      objective_ar?: string;
      objective_en?: string;
      evidence_description_ar?: string;
      evidence_description_en?: string;
      requires_evidence: boolean;
      display_order: number;
    }
  ): Promise<Requirement> {
    const response = await fetch(
      `${API_BASE_URL}/requirements?index_id=${indexId}&actor_id=${actorId}`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse<Requirement>(response);
  },

  /**
   * Update an existing requirement
   */
  async updateRequirement(
    id: string,
    actorId: string,
    data: {
      code?: string;
      question_ar?: string;
      question_en?: string;
      main_area_ar?: string;
      main_area_en?: string;
      sub_domain_ar?: string;
      sub_domain_en?: string;
      element_ar?: string;
      element_en?: string;
      objective_ar?: string;
      objective_en?: string;
      evidence_description_ar?: string;
      evidence_description_en?: string;
      requires_evidence?: boolean;
      display_order?: number;
    }
  ): Promise<Requirement> {
    const response = await fetch(
      `${API_BASE_URL}/requirements/${id}?actor_id=${actorId}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse<Requirement>(response);
  },

  /**
   * Delete a requirement
   */
  async delete(
    id: string,
    actorId: string,
    force: boolean = false
  ): Promise<{ message: string; deleted_code: string; deleted_answer: boolean; deleted_evidence_count: number; deleted_recommendation_count: number }> {
    const response = await fetch(
      `${API_BASE_URL}/requirements/${id}?actor_id=${actorId}&force=${force}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<{ message: string; deleted_code: string; deleted_answer: boolean; deleted_evidence_count: number; deleted_recommendation_count: number }>(response);
  },

  /**
   * Reorder a requirement (move up or down)
   */
  async reorder(
    indexId: string,
    requirementId: string,
    direction: 'up' | 'down',
    actorId: string
  ): Promise<{ message: string; old_order: number; new_order: number }> {
    const response = await fetch(
      `${API_BASE_URL}/requirements/reorder?index_id=${indexId}&requirement_id=${requirementId}&direction=${direction}&actor_id=${actorId}`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<{ message: string; old_order: number; new_order: number }>(response);
  },

  /**
   * Get unique sections/domains for autocomplete
   */
  async getSections(indexId: string): Promise<{
    main_areas: Array<{ ar: string; en: string }>;
    sub_domains: Array<{ ar: string; en: string }>;
    elements: Array<{ ar: string; en: string }>;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/requirements/sections/${indexId}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<{
      main_areas: Array<{ ar: string; en: string }>;
      sub_domains: Array<{ ar: string; en: string }>;
      elements: Array<{ ar: string; en: string }>;
    }>(response);
  },
};

// ============================================================================
// Assignments API
// ============================================================================

export const assignmentsAPI = {
  /**
   * Create single assignment
   */
  async create(data: {
    index_id: string;
    requirement_id: string;
    user_id: string;
    assigned_by?: string;
  }): Promise<Assignment> {
    const response = await fetch(`${API_BASE_URL}/assignments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Assignment>(response);
  },

  /**
   * Create multiple assignments
   */
  async createBatch(data: {
    index_id: string;
    requirement_id: string;
    user_ids: string[];
    assigned_by?: string;
  }): Promise<Assignment[]> {
    const response = await fetch(`${API_BASE_URL}/assignments/batch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Assignment[]>(response);
  },

  /**
   * Get assignments for a requirement
   */
  async getByRequirement(requirementId: string): Promise<AssignmentWithUser[]> {
    const response = await fetch(`${API_BASE_URL}/assignments/requirement/${requirementId}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<AssignmentWithUser[]>(response);
  },

  /**
   * Get assignments for a user
   */
  async getByUser(userId: string): Promise<Assignment[]> {
    const response = await fetch(`${API_BASE_URL}/assignments/user/${userId}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<Assignment[]>(response);
  },

  /**
   * Get assignments for an index
   */
  async getByIndex(indexId: string): Promise<Assignment[]> {
    const response = await fetch(`${API_BASE_URL}/assignments/index/${indexId}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<Assignment[]>(response);
  },

  /**
   * Update assignment
   */
  async update(
    id: string,
    data: {
      status?: string;
      current_level?: string;
      completion_percentage?: string;
    }
  ): Promise<Assignment> {
    const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Assignment>(response);
  },

  /**
   * Delete assignment
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
      method: 'DELETE',
      headers: addAuthToHeaders(),
    });
    if (!response.ok) {
      throw new APIError('Failed to delete assignment', response.status);
    }
  },

  /**
   * Delete assignment by requirement and user
   */
  async deleteByRequirementAndUser(requirementId: string, userId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/assignments/requirement/${requirementId}/user/${userId}`,
      {
        method: 'DELETE',
        headers: addAuthToHeaders(),
      }
    );
    if (!response.ok) {
      throw new APIError('Failed to delete assignment', response.status);
    }
  },
};

// ============================================================================
// Users API
// ============================================================================

export const usersAPI = {
  /**
   * Get all users
   */
  async getAll(params?: {
    organization_id?: string;
    index_id?: string;
    role?: string;
    is_active?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<User[]> {
    const queryParams = new URLSearchParams();
    if (params?.organization_id) queryParams.append('organization_id', params.organization_id);
    if (params?.index_id) queryParams.append('index_id', params.index_id);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/users?${queryParams}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<User[]>(response);
  },

  /**
   * Get single user by ID
   */
  async getById(id: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<User>(response);
  },
};

// ============================================================================
// Index Users API
// ============================================================================

export const indexUsersAPI = {
  /**
   * Get all index users with optional filters
   */
  async getAll(params?: {
    index_id?: string;
    user_id?: string;
    role?: string;
  }): Promise<IndexUser[]> {
    const queryParams = new URLSearchParams();
    if (params?.index_id) queryParams.append('index_id', params.index_id);
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.role) queryParams.append('role', params.role);

    const response = await fetch(`${API_BASE_URL}/index-users?${queryParams}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<IndexUser[]>(response);
  },

  /**
   * Get index users with user details
   */
  async getAllWithDetails(params?: {
    index_id?: string;
  }): Promise<IndexUserWithDetails[]> {
    const queryParams = new URLSearchParams();
    if (params?.index_id) queryParams.append('index_id', params.index_id);

    const response = await fetch(`${API_BASE_URL}/index-users/with-details?${queryParams}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<IndexUserWithDetails[]>(response);
  },

  /**
   * Get single index user by ID
   */
  async getById(id: string): Promise<IndexUser> {
    const response = await fetch(`${API_BASE_URL}/index-users/${id}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<IndexUser>(response);
  },

  /**
   * Add a user to an index
   */
  async create(data: {
    index_id: string;
    user_id: string;
    role: 'owner' | 'supervisor' | 'contributor';
    added_by?: string;
  }): Promise<IndexUser> {
    const response = await fetch(`${API_BASE_URL}/index-users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<IndexUser>(response);
  },

  /**
   * Update index user role
   */
  async update(id: string, data: {
    role?: 'owner' | 'supervisor' | 'contributor';
  }): Promise<IndexUser> {
    const response = await fetch(`${API_BASE_URL}/index-users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<IndexUser>(response);
  },

  /**
   * Remove a user from an index
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/index-users/${id}`, {
      method: 'DELETE',
      headers: addAuthToHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete index user');
    }
  },
};

// ============================================================================
// Evidence API
// ============================================================================

export const evidenceAPI = {
  /**
   * List all evidence with optional filters
   */
  async getAll(params?: {
    requirement_id?: string;
    assignment_id?: string;
    status_filter?: string;
  }): Promise<Evidence[]> {
    const queryParams = new URLSearchParams();
    if (params?.requirement_id) queryParams.append('requirement_id', params.requirement_id);
    if (params?.assignment_id) queryParams.append('assignment_id', params.assignment_id);
    if (params?.status_filter) queryParams.append('status_filter', params.status_filter);

    const response = await fetch(`${API_BASE_URL}/evidence?${queryParams}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<Evidence[]>(response);
  },

  /**
   * Get single evidence by ID with versions and activities
   */
  async getById(id: string): Promise<EvidenceWithVersions> {
    const response = await fetch(`${API_BASE_URL}/evidence/${id}`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<EvidenceWithVersions>(response);
  },

  /**
   * Upload new evidence file
   */
  async upload(data: {
    file: File;
    requirement_id: string;
    maturity_level: number;
    document_name: string;
    uploaded_by: string;
    assignment_id?: string;
    upload_comment?: string;
  }): Promise<Evidence> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('requirement_id', data.requirement_id);
    formData.append('maturity_level', data.maturity_level.toString());
    formData.append('document_name', data.document_name);
    formData.append('uploaded_by', data.uploaded_by);
    if (data.assignment_id) formData.append('assignment_id', data.assignment_id);
    if (data.upload_comment) formData.append('upload_comment', data.upload_comment);

    const response = await fetch(`${API_BASE_URL}/evidence/upload`, {
      method: 'POST',
      headers: getAuthHeadersForUpload(),
      body: formData,
    });
    return handleResponse<Evidence>(response);
  },

  /**
   * Upload new version of existing evidence
   */
  async uploadVersion(
    evidenceId: string,
    data: {
      file: File;
      uploaded_by: string;
      upload_comment?: string;
    }
  ): Promise<EvidenceVersion> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('uploaded_by', data.uploaded_by);
    if (data.upload_comment) formData.append('upload_comment', data.upload_comment);

    const response = await fetch(`${API_BASE_URL}/evidence/${evidenceId}/upload-version`, {
      method: 'POST',
      headers: getAuthHeadersForUpload(),
      body: formData,
    });
    return handleResponse<EvidenceVersion>(response);
  },

  /**
   * Perform action on evidence (submit, confirm, approve, reject)
   */
  async performAction(
    evidenceId: string,
    action: 'submit' | 'confirm' | 'approve' | 'reject',
    actorId: string,
    comment?: string
  ): Promise<Evidence> {
    const response = await fetch(`${API_BASE_URL}/evidence/${evidenceId}/action?actor_id=${actorId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, comment }),
    });
    return handleResponse<Evidence>(response);
  },

  /**
   * Delete evidence
   */
  async delete(id: string, actorId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/evidence/${id}?actor_id=${actorId}`, {
      method: 'DELETE',
      headers: addAuthToHeaders(),
    });
    if (!response.ok) {
      throw new APIError('Failed to delete evidence', response.status);
    }
  },

  /**
   * Get activity log for evidence
   */
  async getActivities(evidenceId: string): Promise<EvidenceActivity[]> {
    const response = await fetch(`${API_BASE_URL}/evidence/${evidenceId}/activities`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<EvidenceActivity[]>(response);
  },

  /**
   * Get all versions of evidence
   */
  async getVersions(evidenceId: string): Promise<EvidenceVersion[]> {
    const response = await fetch(`${API_BASE_URL}/evidence/${evidenceId}/versions`, {
      headers: addAuthToHeaders()
    });
    return handleResponse<EvidenceVersion[]>(response);
  },

  /**
   * Copy evidence from one requirement to another (e.g., from previous year)
   */
  async copy(
    evidenceId: string,
    targetRequirementId: string,
    targetMaturityLevel: number,
    copiedBy: string
  ): Promise<Evidence> {
    const queryParams = new URLSearchParams({
      target_requirement_id: targetRequirementId,
      target_maturity_level: targetMaturityLevel.toString(),
      copied_by: copiedBy,
    });
    const response = await fetch(`${API_BASE_URL}/evidence/${evidenceId}/copy?${queryParams}`, {
      method: 'POST',
      headers: addAuthToHeaders(),
    });
    return handleResponse<Evidence>(response);
  },

  /**
   * Download evidence file
   */
  async download(evidenceId: string, version: number): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/evidence/${evidenceId}/download/${version}`, {
      headers: addAuthToHeaders()
    });
    if (!response.ok) {
      throw new APIError('Failed to download evidence', response.status);
    }
    return response.blob();
  },
};

// ============================================================================
// Notifications Types & API
// ============================================================================

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  task_id: string | null;
  requirement_id: string | null;
  evidence_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_name_en: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

export interface NotificationUnreadCount {
  count: number;
}

export const notificationsAPI = {
  /**
   * Get user notifications with optional filters
   */
  async getAll(params?: {
    is_read?: boolean;
    notification_type?: string;
    skip?: number;
    limit?: number;
  }): Promise<NotificationListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.is_read !== undefined) queryParams.append('is_read', params.is_read.toString());
    if (params?.notification_type) queryParams.append('notification_type', params.notification_type);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/notifications?${queryParams}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<NotificationListResponse>(response);
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<NotificationUnreadCount> {
    const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<NotificationUnreadCount>(response);
  },

  /**
   * Mark specific notifications as read
   */
  async markAsRead(notificationIds: string[]): Promise<{ message: string; count: number }> {
    const response = await fetch(`${API_BASE_URL}/notifications/mark-read`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notification_ids: notificationIds }),
    });
    return handleResponse<{ message: string; count: number }>(response);
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ message: string; count: number }> {
    const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string; count: number }>(response);
  },

  /**
   * Mark specific notifications as unread
   */
  async markAsUnread(notificationIds: string[]): Promise<{ message: string; count: number }> {
    const response = await fetch(`${API_BASE_URL}/notifications/mark-unread`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notification_ids: notificationIds }),
    });
    return handleResponse<{ message: string; count: number }>(response);
  },

  /**
   * Delete a notification
   */
  async delete(notificationId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
  },
};

// ============================================================================
// Recommendations API
// ============================================================================

export const recommendationsAPI = {
  /**
   * Upload recommendations Excel file for an index
   */
  async upload(indexId: string, file: File): Promise<RecommendationUploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/recommendations/upload/${indexId}`, {
      method: 'POST',
      headers: getAuthHeadersForUpload(),
      body: formData,
    });
    return handleResponse<RecommendationUploadResult>(response);
  },

  /**
   * Create recommendation manually for a requirement
   */
  async create(data: {
    requirement_id: string;
    current_status_ar: string;
    recommendation_ar: string;
  }): Promise<Recommendation> {
    const formData = new FormData();
    formData.append('requirement_id', data.requirement_id);
    formData.append('current_status_ar', data.current_status_ar);
    formData.append('recommendation_ar', data.recommendation_ar);

    const response = await fetch(`${API_BASE_URL}/recommendations`, {
      method: 'POST',
      headers: getAuthHeadersForUpload(),
      body: formData,
    });
    return handleResponse<Recommendation>(response);
  },

  /**
   * Create recommendation for a group (all requirements matching main_area, element, and sub_domain)
   */
  async createForGroup(data: {
    index_id: string;
    main_area_ar: string;
    element_ar: string;
    sub_domain_ar: string;
    current_status_ar: string;
    recommendation_ar: string;
  }): Promise<{ requirements_count: number; created: number; updated: number }> {
    const response = await fetch(`${API_BASE_URL}/recommendations/group`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ requirements_count: number; created: number; updated: number }>(response);
  },

  /**
   * Get recommendation for a specific requirement
   */
  async getByRequirement(requirementId: string): Promise<Recommendation> {
    const response = await fetch(`${API_BASE_URL}/recommendations/requirement/${requirementId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<Recommendation>(response);
  },

  /**
   * Get all recommendations for an index
   */
  async getByIndex(indexId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/recommendations/index/${indexId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },

  /**
   * Get recommendations template download URL
   */
  getTemplateUrl(): string {
    return `${API_BASE_URL}/recommendations/template`;
  },

  /**
   * Update recommendation status
   */
  async update(id: string, data: {
    status?: 'pending' | 'addressed' | 'in_progress';
    addressed_comment?: string;
    current_status_ar?: string;
    recommendation_ar?: string;
  }): Promise<Recommendation> {
    const response = await fetch(`${API_BASE_URL}/recommendations/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Recommendation>(response);
  },

  /**
   * Delete recommendation
   */
  async delete(id: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/recommendations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
  },
};

// ============================================================================
// Checklist Types & API
// ============================================================================

export interface ChecklistItem {
  id: string;
  requirement_id: string;
  text_ar: string;
  text_en: string | null;
  is_checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
  display_order: number;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  created_by_name: string | null;
  checked_by_name: string | null;
}

export const checklistAPI = {
  /**
   * Get all checklist items for a requirement
   */
  async getAll(requirementId: string): Promise<ChecklistItem[]> {
    const response = await fetch(`${API_BASE_URL}/checklist/${requirementId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ChecklistItem[]>(response);
  },

  /**
   * Create a new checklist item
   */
  async create(requirementId: string, data: {
    text_ar: string;
    text_en?: string;
  }): Promise<ChecklistItem> {
    const response = await fetch(`${API_BASE_URL}/checklist/${requirementId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<ChecklistItem>(response);
  },

  /**
   * Update a checklist item
   */
  async update(itemId: string, data: {
    text_ar?: string;
    text_en?: string;
    is_checked?: boolean;
    display_order?: number;
  }): Promise<ChecklistItem> {
    const response = await fetch(`${API_BASE_URL}/checklist/${itemId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<ChecklistItem>(response);
  },

  /**
   * Delete a checklist item
   */
  async delete(itemId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/checklist/${itemId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new APIError('Failed to delete checklist item', response.status);
    }
  },

  /**
   * Toggle a checklist item's checked status
   */
  async toggle(itemId: string): Promise<ChecklistItem> {
    const response = await fetch(`${API_BASE_URL}/checklist/${itemId}/toggle`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<ChecklistItem>(response);
  },
};

// ============================================================================
// Section Mappings API
// ============================================================================

export interface SectionMapping {
  id: string;
  current_index_id: string;
  previous_index_id: string;
  main_area_from_ar: string;
  main_area_to_ar: string;
  main_area_from_en?: string | null;
  main_area_to_en?: string | null;
  element_from_ar?: string | null;
  element_to_ar?: string | null;
  element_from_en?: string | null;
  element_to_en?: string | null;
  sub_domain_from_ar?: string | null;
  sub_domain_to_ar?: string | null;
  sub_domain_from_en?: string | null;
  sub_domain_to_en?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface SectionComparisonItem {
  level: 'main_area' | 'element' | 'sub_domain';
  previous_value_ar?: string | null;
  previous_value_en?: string | null;
  current_value_ar?: string | null;
  current_value_en?: string | null;
  is_mapped: boolean;
  mapping_id?: string | null;
  parent_main_area_ar?: string | null;
  parent_element_ar?: string | null;
}

export interface SectionComparisonResponse {
  current_index_id: string;
  previous_index_id: string;
  current_index_name_ar: string;
  previous_index_name_ar: string;
  comparisons: SectionComparisonItem[];
}

export const sectionMappingsAPI = {
  /**
   * Compare sections between two indices
   */
  async compare(currentIndexId: string, previousIndexId: string): Promise<SectionComparisonResponse> {
    const response = await fetch(
      `${API_BASE_URL}/section-mappings/compare/${currentIndexId}/${previousIndexId}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<SectionComparisonResponse>(response);
  },

  /**
   * Get all section mappings for an index
   */
  async getAll(currentIndexId: string, previousIndexId?: string): Promise<SectionMapping[]> {
    const queryParams = new URLSearchParams();
    if (previousIndexId) queryParams.append('previous_index_id', previousIndexId);

    const response = await fetch(
      `${API_BASE_URL}/section-mappings/${currentIndexId}?${queryParams}`,
      {
        headers: getAuthHeaders(),
      }
    );
    const result = await handleResponse<{ mappings: SectionMapping[] }>(response);
    return result.mappings;
  },

  /**
   * Create a single section mapping
   */
  async create(
    currentIndexId: string,
    previousIndexId: string,
    mapping: Omit<SectionMapping, 'id' | 'current_index_id' | 'previous_index_id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<SectionMapping> {
    const response = await fetch(
      `${API_BASE_URL}/section-mappings/${currentIndexId}?previous_index_id=${previousIndexId}`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(mapping),
      }
    );
    return handleResponse<SectionMapping>(response);
  },

  /**
   * Bulk create/update section mappings
   */
  async bulkCreate(
    currentIndexId: string,
    previousIndexId: string,
    mappings: Array<Omit<SectionMapping, 'id' | 'current_index_id' | 'previous_index_id' | 'created_at' | 'updated_at' | 'created_by'>>
  ): Promise<SectionMapping[]> {
    const response = await fetch(
      `${API_BASE_URL}/section-mappings/${currentIndexId}/bulk`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          previous_index_id: previousIndexId,
          mappings,
        }),
      }
    );
    return handleResponse<SectionMapping[]>(response);
  },

  /**
   * Update a section mapping
   */
  async update(mappingId: string, data: Partial<SectionMapping>): Promise<SectionMapping> {
    const response = await fetch(
      `${API_BASE_URL}/section-mappings/${mappingId}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse<SectionMapping>(response);
  },

  /**
   * Delete a section mapping
   */
  async delete(mappingId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/section-mappings/${mappingId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete section mapping');
    }
  },

  /**
   * Get suggested mappings based on text similarity
   */
  async suggest(
    currentIndexId: string,
    previousIndexId: string
  ): Promise<Array<Omit<SectionMapping, 'id' | 'current_index_id' | 'previous_index_id' | 'created_at' | 'updated_at' | 'created_by'>>> {
    const response = await fetch(
      `${API_BASE_URL}/section-mappings/${currentIndexId}/suggest?previous_index_id=${previousIndexId}`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<Array<Omit<SectionMapping, 'id' | 'current_index_id' | 'previous_index_id' | 'created_at' | 'updated_at' | 'created_by'>>>(response);
  },
};

// ============================================================================
// Knowledge Center API
// ============================================================================

export interface KnowledgeItem {
  id: string;
  title: string;
  description: string | null;
  content_type: 'youtube' | 'pdf' | 'pptx';
  content_url: string;
  thumbnail_path: string | null;
  file_name: string | null;
  file_size: number | null;
  index_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  display_order: number;
  creator_name: string | null;
  creator_name_en: string | null;
}

export interface KnowledgeItemListResponse {
  items: KnowledgeItem[];
  total: number;
}

export const knowledgeAPI = {
  /**
   * Get all knowledge items for an index
   */
  async getAll(indexId: string): Promise<KnowledgeItemListResponse> {
    const response = await fetch(
      `${API_BASE_URL}/knowledge?index_id=${indexId}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<KnowledgeItemListResponse>(response);
  },

  /**
   * Get a single knowledge item
   */
  async getById(itemId: string): Promise<KnowledgeItem> {
    const response = await fetch(
      `${API_BASE_URL}/knowledge/${itemId}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<KnowledgeItem>(response);
  },

  /**
   * Create a knowledge item (with optional file upload)
   */
  async create(data: {
    index_id: string;
    title: string;
    description?: string;
    content_type: 'youtube' | 'pdf' | 'pptx';
    content_url?: string;
    display_order?: number;
    file?: File;
  }): Promise<KnowledgeItem> {
    const formData = new FormData();
    formData.append('index_id', data.index_id);
    formData.append('title', data.title);
    formData.append('content_type', data.content_type);
    if (data.description) formData.append('description', data.description);
    if (data.content_url) formData.append('content_url', data.content_url);
    if (data.display_order !== undefined) formData.append('display_order', data.display_order.toString());
    if (data.file) formData.append('file', data.file);

    const response = await fetch(`${API_BASE_URL}/knowledge`, {
      method: 'POST',
      headers: getAuthHeadersForUpload(),
      body: formData,
    });
    return handleResponse<KnowledgeItem>(response);
  },

  /**
   * Update a knowledge item
   */
  async update(itemId: string, data: {
    title?: string;
    description?: string;
    content_url?: string;
    display_order?: number;
  }): Promise<KnowledgeItem> {
    const response = await fetch(
      `${API_BASE_URL}/knowledge/${itemId}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse<KnowledgeItem>(response);
  },

  /**
   * Delete a knowledge item
   */
  async delete(itemId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/knowledge/${itemId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete knowledge item');
    }
  },

  /**
   * Get download URL for a file
   */
  getDownloadUrl(itemId: string): string {
    return `${API_BASE_URL}/knowledge/${itemId}/download`;
  },
};

// ============================================================================
// Support Types and API
// ============================================================================

export interface SupportAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  thread_id: string | null;
  reply_id: string | null;
  created_by: string;
  created_at: string;
}

export interface SupportReply {
  id: string;
  content: string;
  thread_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_name: string | null;
  creator_name_en: string | null;
  attachments: SupportAttachment[];
}

export interface SupportThread {
  id: string;
  title: string;
  content: string;
  index_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_resolved: boolean;
  creator_name: string | null;
  creator_name_en: string | null;
  replies_count: number;
  attachments: SupportAttachment[];
  replies?: SupportReply[];
}

export interface SupportThreadListResponse {
  threads: SupportThread[];
  total: number;
}

export const supportAPI = {
  /**
   * Get all support threads for an index
   */
  async getAll(indexId: string, skip = 0, limit = 50): Promise<SupportThreadListResponse> {
    const response = await fetch(
      `${API_BASE_URL}/support?index_id=${indexId}&skip=${skip}&limit=${limit}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<SupportThreadListResponse>(response);
  },

  /**
   * Get a single support thread with replies
   */
  async getById(threadId: string): Promise<SupportThread> {
    const response = await fetch(
      `${API_BASE_URL}/support/${threadId}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<SupportThread>(response);
  },

  /**
   * Create a support thread
   */
  async create(data: {
    index_id: string;
    title: string;
    content: string;
    files?: File[];
  }): Promise<SupportThread> {
    const formData = new FormData();
    formData.append('index_id', data.index_id);
    formData.append('title', data.title);
    formData.append('content', data.content);
    if (data.files) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }

    const response = await fetch(`${API_BASE_URL}/support`, {
      method: 'POST',
      headers: getAuthHeadersForUpload(),
      body: formData,
    });
    return handleResponse<SupportThread>(response);
  },

  /**
   * Update a support thread
   */
  async update(threadId: string, data: {
    title?: string;
    content?: string;
    is_resolved?: boolean;
  }): Promise<SupportThread> {
    const response = await fetch(
      `${API_BASE_URL}/support/${threadId}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse<SupportThread>(response);
  },

  /**
   * Delete a support thread
   */
  async delete(threadId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/support/${threadId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete support thread');
    }
  },

  /**
   * Create a reply to a thread
   */
  async createReply(threadId: string, data: {
    content: string;
    files?: File[];
  }): Promise<SupportReply> {
    const formData = new FormData();
    formData.append('content', data.content);
    if (data.files) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }

    const response = await fetch(`${API_BASE_URL}/support/${threadId}/replies`, {
      method: 'POST',
      headers: getAuthHeadersForUpload(),
      body: formData,
    });
    return handleResponse<SupportReply>(response);
  },

  /**
   * Delete a reply
   */
  async deleteReply(threadId: string, replyId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/support/${threadId}/replies/${replyId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete reply');
    }
  },

  /**
   * Get unread support count (threads in last 24 hours)
   */
  async getUnreadCount(indexId: string): Promise<{ count: number }> {
    const response = await fetch(
      `${API_BASE_URL}/support/unread-count?index_id=${indexId}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<{ count: number }>(response);
  },

  /**
   * Get attachment download URL
   */
  getAttachmentDownloadUrl(attachmentId: string): string {
    return `${API_BASE_URL}/support/attachments/${attachmentId}/download`;
  },
};

// ============================================================================
// Export all APIs
// ============================================================================

export const api = {
  indices: indicesAPI,
  requirements: requirementsAPI,
  assignments: assignmentsAPI,
  users: usersAPI,
  indexUsers: indexUsersAPI,
  evidence: evidenceAPI,
  recommendations: recommendationsAPI,
  notifications: notificationsAPI,
  checklist: checklistAPI,
  sectionMappings: sectionMappingsAPI,
  knowledge: knowledgeAPI,
  support: supportAPI,
};

// Convenience function for fetching indices (used by Tasks page)
export const fetchIndices = (): Promise<Index[]> => {
  return indicesAPI.getAll();
};

export default api;
