// User & Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  name_en: string;
  role: UserRole;
  department?: string; // For backward compatibility
  department_ar?: string | null;
  department_en?: string | null;
  agency_id?: string | null;
  general_management_id?: string | null;
  department_id?: string | null;
  active: boolean;
  created_at: string;
  last_login?: string;
  is_first_login?: boolean;
}

// System-level roles (stored in users.role)
// Only ADMIN is a system-level role. Other users have no system role.
export enum UserRole {
  ADMIN = 'ADMIN'
}

// Per-index roles (stored in index_users.role)
// These roles determine what a user can do within a specific index
export enum IndexUserRole {
  OWNER = 'OWNER',       // Index owner - full management access
  SUPERVISOR = 'SUPERVISOR', // Can review and approve
  CONTRIBUTOR = 'CONTRIBUTOR' // Can submit evidence
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  checkAuth: () => void;
  updateUser: (updates: Partial<User>) => void;
}

// Requirement Types
export interface Requirement {
  id: string;
  section: string;
  question: string;
  question_en: string;
  current_level: number;
  target_level?: number;
  assignees: string[]; // Changed to array for multiple assignees
  due_date: string;
  level_criteria?: LevelCriteria[]; // Criteria for each level
}

// Level Criteria - what's needed to achieve each level
export interface LevelCriteria {
  level: number;
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  acceptance_criteria: string[]; // List of criteria that must be met
  acceptance_criteria_en: string[];
  required_documents: RequiredDocument[]; // Documents needed for this level
}

// Required documents for a level
export interface RequiredDocument {
  name: string;
  name_en: string;
  description?: string;
  description_en?: string;
  mandatory: boolean;
}

// Evidence Types
export interface Evidence {
  id: string;
  requirement_id: string;
  level: number;
  status: EvidenceStatus;
  description?: string;
  description_en?: string;
  uploaded_by?: string;
  uploaded_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  feedback?: string;
}

export enum EvidenceStatus {
  NOT_STARTED = 'not_started',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  READY_FOR_AUDIT = 'ready_for_audit',
  CHANGES_REQUESTED = 'changes_requested',
  CONFIRMED = 'confirmed'
}

// File Submission Types
export interface FileSubmission {
  id: string;
  evidence_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  version: number;
  uploaded_by: string;
  uploaded_at: string;
  status: string;
}

// Comment Types
export interface Comment {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  created_at: string;
  type: CommentType;
  submission_id?: string;
}

export enum CommentType {
  GENERAL = 'general',
  REVIEW = 'review',
  FEEDBACK = 'feedback',
  QUESTION = 'question'
}

// Task Management Types
export interface TaskAttachment {
  id: string;
  comment_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_name_en?: string;
  attachments: TaskAttachment[];
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assigned_by: string;
  assigned_at: string;
  user_name?: string;
  user_name_en?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  index_id?: string;
  requirement_id?: string;
  due_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  creator_name?: string;
  creator_name_en?: string;
  index_name?: string;
  index_name_en?: string;
  requirement_code?: string;
  requirement_question_ar?: string;
  requirement_question_en?: string;
  requirement_main_area_ar?: string;
  requirement_main_area_en?: string;
  assignments: TaskAssignment[];
  comments: TaskComment[];
  comment_count: number;
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  todo_count: number;
  in_progress_count: number;
  completed_count: number;
}

export interface TaskCreateRequest {
  title: string;
  description?: string;
  priority?: string;
  index_id?: string;
  requirement_id?: string;
  due_date?: string;
  assignee_ids?: string[];
}

export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  index_id?: string;
  requirement_id?: string;
  due_date?: string;
}

export interface TaskCommentRequest {
  comment: string;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Activity Log for Requirements - clearer history tracking
export interface RequirementActivity {
  id: string;
  requirement_id: string;
  level: number;
  action_type: 'document_uploaded' | 'document_removed' | 'status_changed' | 'level_achieved' | 'comment_added' | 'assignee_added' | 'assignee_removed';
  actor_id: string;
  actor_name: string;
  description: string;
  description_en: string;
  metadata?: Record<string, any>; // e.g., filename, old_status, new_status
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// UI State Types
export interface UIState {
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  setLanguage: (lang: 'ar' | 'en') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
}

// Checklist Types
export interface ChecklistItem {
  id: string;
  requirement_id: string;
  text_ar: string;
  text_en?: string;
  is_checked: boolean;
  checked_by?: string;
  checked_at?: string;
  display_order: number;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at: string;
  created_by_name?: string;
  checked_by_name?: string;
}

export interface ChecklistItemCreate {
  text_ar: string;
  text_en?: string;
}

export interface ChecklistItemUpdate {
  text_ar?: string;
  text_en?: string;
  is_checked?: boolean;
  display_order?: number;
}
