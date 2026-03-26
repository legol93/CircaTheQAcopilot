export type Priority = "low" | "medium" | "high" | "critical";
export type Status = "draft" | "active" | "deprecated";
export type RunStatus = "pending" | "in_progress" | "completed";
export type ResultStatus = "passed" | "failed" | "blocked" | "skipped" | "not_run";

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
  role: "owner" | "admin" | "member" | "viewer";
  created_at: string;
}
