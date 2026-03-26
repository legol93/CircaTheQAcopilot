export type Priority = "low" | "medium" | "high" | "critical";
export type Status = "draft" | "active" | "deprecated";
export type RunStatus = "pending" | "in_progress" | "completed";
export type ResultStatus = "passed" | "failed" | "blocked" | "skipped" | "not_run";
export type SuiteType = "folder" | "sprint";
export type MemberRole = "owner" | "admin" | "member" | "viewer";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TestSuite {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  type: SuiteType;
  icon: string | null;
  color: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  id: string;
  suite_id: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  priority: Priority;
  status: Status;
  ai_generated: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TestStep {
  id: string;
  test_case_id: string;
  step_number: number;
  action: string;
  expected_result: string;
  ai_generated: boolean;
}

export interface Attachment {
  id: string;
  test_case_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface TestRun {
  id: string;
  project_id: string;
  name: string;
  status: RunStatus;
  executed_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface TestRunResult {
  id: string;
  test_run_id: string;
  test_case_id: string;
  status: ResultStatus;
  notes: string | null;
  executed_by: string | null;
  executed_at: string | null;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
}

export interface AiPromptLog {
  id: string;
  user_id: string;
  project_id: string | null;
  prompt: string;
  response: string;
  model: string;
  tokens_used: number | null;
  created_at: string;
}
