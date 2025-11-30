/**
 * User Management API Service
 */

// Build API base URL with /api/v1 prefix (consistent with api.ts)
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;

export interface UserIndexRole {
  index_id: string;
  index_code: string;
  index_name_ar: string;
  role: string;
  assigned_at: string;
}

export interface UserWithRoles {
  id: string;
  email: string;
  full_name_ar: string;
  full_name_en?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  first_name_en?: string;
  last_name_en?: string;
  role: string;
  is_active: boolean;
  is_first_login: boolean;
  agency_id?: string;
  agency_name_ar?: string;
  general_management_id?: string;
  gm_name_ar?: string;
  department_id?: string;
  dept_name_ar?: string;
  last_login?: string;
  created_at: string;
  index_roles: UserIndexRole[];
}

export interface CreateUserRequest {
  email: string;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  temp_password: string;
  is_active: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
  temp_password: string;
  email_sent: boolean;
}

export interface UpdateUserStatusRequest {
  user_id: string;
  is_active: boolean;
}

export interface UpdateUserStatusResponse {
  message: string;
  user_id: string;
  is_active: boolean;
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

// Helper function for fetch requests
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers as Record<string, string>,
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const userManagementApi = {
  // List all users with their index roles
  getAllUsers: async (params?: {
    role?: string;
    is_active?: boolean;
    is_first_login?: boolean;
    agency_id?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<UserWithRoles[]> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    return fetchJson<UserWithRoles[]>(`${API_URL}/user-management/users?${queryParams}`);
  },

  // Create a new user
  createUser: async (data: CreateUserRequest): Promise<CreateUserResponse> => {
    return fetchJson<CreateUserResponse>(`${API_URL}/user-management/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Reset user password (admin only)
  resetPassword: async (userId: string): Promise<ResetPasswordResponse> => {
    return fetchJson<ResetPasswordResponse>(`${API_URL}/user-management/users/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  },

  // Complete first-time setup
  completeSetup: async (data: {
    first_name_ar: string;
    last_name_ar: string;
    first_name_en: string;
    last_name_en: string;
    agency_id: string;
    general_management_id: string;
    department_id: string;
    new_password: string;
  }) => {
    return fetchJson(`${API_URL}/user-management/complete-setup`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update user status (activate/deactivate)
  updateUserStatus: async (data: UpdateUserStatusRequest): Promise<UpdateUserStatusResponse> => {
    return fetchJson<UpdateUserStatusResponse>(`${API_URL}/user-management/users/update-status`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
};
