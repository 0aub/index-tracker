/**
 * Organization Hierarchy API Service
 */

// Build API base URL with /api/v1 prefix (consistent with api.ts)
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;

export interface Agency {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  general_managements?: GeneralManagement[];
}

export interface GeneralManagement {
  id: string;
  agency_id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  departments?: Department[];
}

export interface Department {
  id: string;
  general_management_id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationalHierarchy {
  agencies: Agency[];
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

// Agency APIs
export const agencyApi = {
  getAll: async (isActive = true): Promise<Agency[]> => {
    const params = new URLSearchParams({ is_active: String(isActive) });
    return fetchJson<Agency[]>(`${API_URL}/organization-hierarchy/agencies?${params}`);
  },

  getById: async (id: string): Promise<Agency> => {
    return fetchJson<Agency>(`${API_URL}/organization-hierarchy/agencies/${id}`);
  },

  create: async (data: Omit<Agency, 'id' | 'created_at' | 'updated_at'>): Promise<Agency> => {
    return fetchJson<Agency>(`${API_URL}/organization-hierarchy/agencies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Agency>): Promise<Agency> => {
    return fetchJson<Agency>(`${API_URL}/organization-hierarchy/agencies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/organization-hierarchy/agencies/${id}`, {
      method: 'DELETE',
    });
  }
};

// General Management APIs
export const generalManagementApi = {
  getAll: async (agencyId?: string, isActive = true): Promise<GeneralManagement[]> => {
    const params = new URLSearchParams({ is_active: String(isActive) });
    if (agencyId) params.append('agency_id', agencyId);
    return fetchJson<GeneralManagement[]>(`${API_URL}/organization-hierarchy/general-managements?${params}`);
  },

  getById: async (id: string): Promise<GeneralManagement> => {
    return fetchJson<GeneralManagement>(`${API_URL}/organization-hierarchy/general-managements/${id}`);
  },

  create: async (data: Omit<GeneralManagement, 'id' | 'created_at' | 'updated_at'>): Promise<GeneralManagement> => {
    return fetchJson<GeneralManagement>(`${API_URL}/organization-hierarchy/general-managements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<GeneralManagement>): Promise<GeneralManagement> => {
    return fetchJson<GeneralManagement>(`${API_URL}/organization-hierarchy/general-managements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/organization-hierarchy/general-managements/${id}`, {
      method: 'DELETE',
    });
  }
};

// Department APIs
export const departmentApi = {
  getAll: async (gmId?: string, isActive = true): Promise<Department[]> => {
    const params = new URLSearchParams({ is_active: String(isActive) });
    if (gmId) params.append('general_management_id', gmId);
    return fetchJson<Department[]>(`${API_URL}/organization-hierarchy/departments?${params}`);
  },

  getById: async (id: string): Promise<Department> => {
    return fetchJson<Department>(`${API_URL}/organization-hierarchy/departments/${id}`);
  },

  create: async (data: Omit<Department, 'id' | 'created_at' | 'updated_at'>): Promise<Department> => {
    return fetchJson<Department>(`${API_URL}/organization-hierarchy/departments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Department>): Promise<Department> => {
    return fetchJson<Department>(`${API_URL}/organization-hierarchy/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/organization-hierarchy/departments/${id}`, {
      method: 'DELETE',
    });
  }
};

// Get complete hierarchy
export const getCompleteHierarchy = async (isActive = true): Promise<OrganizationalHierarchy> => {
  const params = new URLSearchParams({ is_active: String(isActive) });
  return fetchJson<OrganizationalHierarchy>(`${API_URL}/organization-hierarchy/complete?${params}`);
};
