// User & Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  name_en: string;
  role: UserRole;
  department?: string;
  active: boolean;
  created_at: string;
  last_login?: string;
}

export enum UserRole {
  ADMIN = 'admin',
  INDEX_MANAGER = 'index_manager',
  SECTION_COORDINATOR = 'section_coordinator',
  CONTRIBUTOR = 'contributor',
  AUDITOR = 'auditor',
  VIEWER = 'viewer'
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
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

// Task Types
export interface Task {
  id: string;
  title: string;
  description?: string;
  requirement_id?: string;
  evidence_id?: string;
  assigned_to: string;
  assigned_by: string;
  due_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  completed_at?: string;
}

export enum TaskStatus {
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
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
