/**
 * API Service - Handles all backend API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ============================================================================
// Types
// ============================================================================

export interface Index {
  id: string;
  code: string;
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
  question_ar: string;
  question_en: string | null;
  main_area_ar: string;
  main_area_en: string | null;
  sub_domain_ar: string;
  sub_domain_en: string | null;
  index_id: string;
  display_order: number;
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
// API Error Handling
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

    const response = await fetch(`${API_BASE_URL}/indices?${queryParams}`);
    return handleResponse<Index[]>(response);
  },

  /**
   * Get single index by ID
   */
  async getById(id: string): Promise<Index> {
    const response = await fetch(`${API_BASE_URL}/indices/${id}`);
    return handleResponse<Index>(response);
  },

  /**
   * Download Excel template
   */
  downloadTemplate(): string {
    return `${API_BASE_URL}/indices/template`;
  },

  /**
   * Create index from Excel upload
   */
  async createFromExcel(data: {
    file: File;
    code: string;
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
    formData.append('name_ar', data.name_ar);
    if (data.name_en) formData.append('name_en', data.name_en);
    if (data.description_ar) formData.append('description_ar', data.description_ar);
    if (data.description_en) formData.append('description_en', data.description_en);
    formData.append('version', data.version || '1.0');
    formData.append('organization_id', data.organization_id);
    formData.append('created_by_user_id', data.created_by_user_id);

    const response = await fetch(`${API_BASE_URL}/indices/upload`, {
      method: 'POST',
      body: formData,
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Index>(response);
  },

  /**
   * Delete (archive) index
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/indices/${id}`, {
      method: 'DELETE',
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
    const response = await fetch(`${API_BASE_URL}/indices/${id}/statistics`);
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
      approved_documents: number;
      assigned_requirements: number;
      rejected_documents: number;
      total_uploads: number;
      total_comments: number;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/indices/${id}/user-engagement`);
    return handleResponse(response);
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

    const response = await fetch(`${API_BASE_URL}/requirements?${queryParams}`);
    return handleResponse<Requirement[]>(response);
  },

  /**
   * Get single requirement with all details
   */
  async getById(id: string): Promise<Requirement> {
    const response = await fetch(`${API_BASE_URL}/requirements/${id}`);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Requirement>(response);
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Assignment[]>(response);
  },

  /**
   * Get assignments for a requirement
   */
  async getByRequirement(requirementId: string): Promise<AssignmentWithUser[]> {
    const response = await fetch(`${API_BASE_URL}/assignments/requirement/${requirementId}`);
    return handleResponse<AssignmentWithUser[]>(response);
  },

  /**
   * Get assignments for a user
   */
  async getByUser(userId: string): Promise<Assignment[]> {
    const response = await fetch(`${API_BASE_URL}/assignments/user/${userId}`);
    return handleResponse<Assignment[]>(response);
  },

  /**
   * Get assignments for an index
   */
  async getByIndex(indexId: string): Promise<Assignment[]> {
    const response = await fetch(`${API_BASE_URL}/assignments/index/${indexId}`);
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
      headers: { 'Content-Type': 'application/json' },
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
      { method: 'DELETE' }
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

    const response = await fetch(`${API_BASE_URL}/users?${queryParams}`);
    return handleResponse<User[]>(response);
  },

  /**
   * Get single user by ID
   */
  async getById(id: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`);
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

    const response = await fetch(`${API_BASE_URL}/index-users?${queryParams}`);
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

    const response = await fetch(`${API_BASE_URL}/index-users/with-details?${queryParams}`);
    return handleResponse<IndexUserWithDetails[]>(response);
  },

  /**
   * Get single index user by ID
   */
  async getById(id: string): Promise<IndexUser> {
    const response = await fetch(`${API_BASE_URL}/index-users/${id}`);
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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

    const response = await fetch(`${API_BASE_URL}/evidence?${queryParams}`);
    return handleResponse<Evidence[]>(response);
  },

  /**
   * Get single evidence by ID with versions and activities
   */
  async getById(id: string): Promise<EvidenceWithVersions> {
    const response = await fetch(`${API_BASE_URL}/evidence/${id}`);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comment }),
    });
    return handleResponse<Evidence>(response);
  },

  /**
   * Delete evidence
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/evidence/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new APIError('Failed to delete evidence', response.status);
    }
  },

  /**
   * Get activity log for evidence
   */
  async getActivities(evidenceId: string): Promise<EvidenceActivity[]> {
    const response = await fetch(`${API_BASE_URL}/evidence/${evidenceId}/activities`);
    return handleResponse<EvidenceActivity[]>(response);
  },

  /**
   * Get all versions of evidence
   */
  async getVersions(evidenceId: string): Promise<EvidenceVersion[]> {
    const response = await fetch(`${API_BASE_URL}/evidence/${evidenceId}/versions`);
    return handleResponse<EvidenceVersion[]>(response);
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
};

export default api;
