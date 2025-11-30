/**
 * Tasks API Service - Handles all task-related API calls
 */

import type {
  Task,
  TaskListResponse,
  TaskCreateRequest,
  TaskUpdateRequest,
  TaskCommentRequest,
  TaskComment,
  TaskAttachment
} from '../types';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE_URL = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;

/**
 * Get authentication token from localStorage
 */
const getAuthToken = (): string | null => {
  const authStr = localStorage.getItem('auth-storage');
  if (!authStr) return null;

  try {
    const auth = JSON.parse(authStr);
    return auth?.state?.token || null;
  } catch {
    return null;
  }
};

/**
 * Create auth headers with token
 */
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

/**
 * Fetch all tasks with optional filters
 */
export const fetchTasks = async (filters?: {
  status?: string;
  index_id?: string;
  priority?: string;
  assigned_to_me?: boolean;
}): Promise<TaskListResponse> => {
  const params = new URLSearchParams();

  if (filters?.status) params.append('status', filters.status);
  if (filters?.index_id) params.append('index_id', filters.index_id);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.assigned_to_me) params.append('assigned_to_me', 'true');

  const queryString = params.toString();
  const url = queryString
    ? `${API_BASE_URL}/tasks?${queryString}`
    : `${API_BASE_URL}/tasks`;

  const response = await fetch(url, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Fetch a single task by ID
 */
export const fetchTask = async (taskId: string): Promise<Task> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch task: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Create a new task
 */
export const createTask = async (taskData: TaskCreateRequest): Promise<Task> => {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(taskData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create task');
  }

  return response.json();
};

/**
 * Update an existing task
 */
export const updateTask = async (
  taskId: string,
  taskData: TaskUpdateRequest
): Promise<Task> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(taskData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update task');
  }

  return response.json();
};

/**
 * Delete a task
 */
export const deleteTask = async (taskId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete task');
  }
};

/**
 * Add a comment to a task
 */
export const addComment = async (
  taskId: string,
  commentData: TaskCommentRequest
): Promise<TaskComment> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(commentData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add comment');
  }

  return response.json();
};

/**
 * Upload an attachment to a comment
 */
export const uploadAttachment = async (
  taskId: string,
  commentId: string,
  file: File
): Promise<TaskAttachment> => {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_BASE_URL}/tasks/${taskId}/comments/${commentId}/attachments`,
    {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: formData
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload attachment');
  }

  return response.json();
};
