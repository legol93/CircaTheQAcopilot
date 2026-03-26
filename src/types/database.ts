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

export type JiraPendingStatus = "pending" | "dismissed" | "created";

export interface JiraConnection {
  id: string;
  project_id: string;
  site_url: string;
  jira_project_key: string;
  webhook_secret: string | null;
  api_email: string | null;
  api_token: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface JiraPendingTicket {
  id: string;
  project_id: string;
  jira_issue_key: string;
  jira_issue_id: string;
  title: string;
  description: string | null;
  issue_type: string | null;
  priority: string | null;
  assignee: string | null;
  jira_url: string | null;
  status: JiraPendingStatus;
  target_suite_id: string | null;
  created_test_case_id: string | null;
  webhook_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
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

// Daily Executions
export type ExecutionSource = "manual" | "ci" | "import";
export type ExecutionEnvironment = "DEV" | "QA" | "STAGING" | "PROD";
export type ExecutionRunType = "scheduled" | "manual";
export type ExecutionResult = "passed" | "failed" | "flaky" | "skipped" | "not_run";

export interface DailyExecutionRun {
  id: string;
  project_id: string;
  run_date: string;
  created_by: string;
  notes: string | null;
  source: ExecutionSource;
  environment: ExecutionEnvironment;
  run_type: ExecutionRunType;
  summary_json: { passed: number; failed: number; flaky: number; skipped: number; total: number } | null;
  report_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyExecutionResult {
  id: string;
  run_id: string;
  test_case_id: string;
  result: ExecutionResult;
  comment: string | null;
  duration_ms: number | null;
  error_summary: string | null;
  created_at: string;
  updated_at: string;
}
