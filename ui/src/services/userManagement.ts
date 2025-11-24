/**
 * User Management API Service
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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
  role: string;
  index_id?: string;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  role: string;
  temp_password: string;
  is_first_login: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
  temp_password: string;
  email_sent: boolean;
}

// Helper function for fetch requests
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
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
  }
};
