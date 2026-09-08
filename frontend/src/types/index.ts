export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
}

export interface User {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'recruiter';
}

export type FieldType = 'text' | 'textarea' | 'number' | 'url' | 'email' | 'select' | 'checkbox' | 'date' | 'file';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export interface FormSchema {
  fields: FormField[];
}

export interface Job {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string;
  employment_type: string;
  status: 'draft' | 'open' | 'closed';
  form_schema: FormSchema;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  job_id: string;
  name: string;
  position: number;
  color: string;
  is_terminal: boolean;
}

export interface Application {
  id: string;
  job_id: string;
  stage_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  form_data: Record<string, unknown>;
  applied_at: string;
  hired_at?: string;
  rejected_at?: string;
}

export interface ApplicationFile {
  id: string;
  application_id: string;
  file_type: 'cv' | 'attachment';
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface Note {
  id: string;
  application_id: string;
  /** Null once the author's account has been deleted; user_name reads "Deleted user". */
  user_id: string | null;
  user_name: string;
  body: string;
  created_at: string;
}

export interface StageHistoryEntry {
  id: string;
  from_stage_name?: string;
  to_stage_name: string;
  moved_by_name: string;
  moved_at: string;
}

export interface PipelineData {
  stages: PipelineStage[];
  applications: Record<string, Application[]>;
}

export interface TimeToHireData {
  job_id: string;
  job_title: string;
  month: string;
  avg_days: number;
}

/** One pipeline stage's throughput. `conversion_rate` is already a percentage. */
export interface ConversionData {
  stage_name: string;
  entered: number;
  exited: number;
  conversion_rate: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface ApiError {
  error: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
