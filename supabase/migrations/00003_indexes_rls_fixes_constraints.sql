-- ============================================================
-- Migration 00003: Indexes, RLS fixes, and constraint improvements
-- ============================================================

-- ============================================================
-- 1. INDEXES on foreign keys and frequently filtered columns
-- ============================================================

-- project_members
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- test_suites
CREATE INDEX idx_test_suites_project_id ON test_suites(project_id);
CREATE INDEX idx_test_suites_type ON test_suites(type);
CREATE INDEX idx_test_suites_created_by ON test_suites(created_by);

-- test_cases
CREATE INDEX idx_test_cases_suite_id ON test_cases(suite_id);
CREATE INDEX idx_test_cases_status ON test_cases(status);
CREATE INDEX idx_test_cases_priority ON test_cases(priority);
CREATE INDEX idx_test_cases_created_by ON test_cases(created_by);

-- test_steps
CREATE INDEX idx_test_steps_test_case_id ON test_steps(test_case_id);

-- attachments
CREATE INDEX idx_attachments_test_case_id ON attachments(test_case_id);
CREATE INDEX idx_attachments_uploaded_by ON attachments(uploaded_by);

-- test_runs
CREATE INDEX idx_test_runs_project_id ON test_runs(project_id);
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_runs_executed_by ON test_runs(executed_by);

-- test_run_results
CREATE INDEX idx_test_run_results_test_run_id ON test_run_results(test_run_id);
CREATE INDEX idx_test_run_results_test_case_id ON test_run_results(test_case_id);
CREATE INDEX idx_test_run_results_status ON test_run_results(status);

-- ai_prompts_log
CREATE INDEX idx_ai_prompts_log_user_id ON ai_prompts_log(user_id);
CREATE INDEX idx_ai_prompts_log_project_id ON ai_prompts_log(project_id);

-- ============================================================
-- 2. FIX RLS policies: FOR ALL needs WITH CHECK for INSERT
--    Drop and recreate policies that use FOR ALL with only USING
-- ============================================================

-- test_suites: "Members can manage test suites"
DROP POLICY "Members can manage test suites" ON test_suites;
CREATE POLICY "Members can manage test suites"
  ON test_suites FOR ALL
  USING (project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  ))
  WITH CHECK (project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  ));

-- test_cases: "Members can manage test cases"
DROP POLICY "Members can manage test cases" ON test_cases;
CREATE POLICY "Members can manage test cases"
  ON test_cases FOR ALL
  USING (suite_id IN (
    SELECT ts.id FROM test_suites ts
    JOIN project_members pm ON pm.project_id = ts.project_id
    WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'member')
  ))
  WITH CHECK (suite_id IN (
    SELECT ts.id FROM test_suites ts
    JOIN project_members pm ON pm.project_id = ts.project_id
    WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'member')
  ));

-- test_steps: "Members can manage test steps"
DROP POLICY "Members can manage test steps" ON test_steps;
CREATE POLICY "Members can manage test steps"
  ON test_steps FOR ALL
  USING (test_case_id IN (
    SELECT tc.id FROM test_cases tc
    JOIN test_suites ts ON ts.id = tc.suite_id
    JOIN project_members pm ON pm.project_id = ts.project_id
    WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'member')
  ))
  WITH CHECK (test_case_id IN (
    SELECT tc.id FROM test_cases tc
    JOIN test_suites ts ON ts.id = tc.suite_id
    JOIN project_members pm ON pm.project_id = ts.project_id
    WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'member')
  ));

-- test_runs: "Members can manage test runs"
DROP POLICY "Members can manage test runs" ON test_runs;
CREATE POLICY "Members can manage test runs"
  ON test_runs FOR ALL
  USING (project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  ))
  WITH CHECK (project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  ));

-- test_run_results: "Members can manage test run results"
DROP POLICY "Members can manage test run results" ON test_run_results;
CREATE POLICY "Members can manage test run results"
  ON test_run_results FOR ALL
  USING (test_run_id IN (
    SELECT tr.id FROM test_runs tr
    JOIN project_members pm ON pm.project_id = tr.project_id
    WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'member')
  ))
  WITH CHECK (test_run_id IN (
    SELECT tr.id FROM test_runs tr
    JOIN project_members pm ON pm.project_id = tr.project_id
    WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'member')
  ));

-- ============================================================
-- 3. MISSING RLS policies for project_members (INSERT/UPDATE/DELETE)
-- ============================================================

CREATE POLICY "Admins and owners can add project members"
  ON project_members FOR INSERT
  WITH CHECK (project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins and owners can update project members"
  ON project_members FOR UPDATE
  USING (project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ))
  WITH CHECK (project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Owners can remove project members"
  ON project_members FOR DELETE
  USING (project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- ============================================================
-- 4. MISSING RLS policies for attachments (INSERT/UPDATE/DELETE)
-- ============================================================

CREATE POLICY "Members can view attachments"
  ON attachments FOR SELECT
  USING (test_case_id IN (
    SELECT tc.id FROM test_cases tc
    JOIN test_suites ts ON ts.id = tc.suite_id
    JOIN project_members pm ON pm.project_id = ts.project_id
    WHERE pm.user_id = auth.uid()
  ));

CREATE POLICY "Members can manage attachments"
  ON attachments FOR INSERT
  WITH CHECK (test_case_id IN (
    SELECT tc.id FROM test_cases tc
    JOIN test_suites ts ON ts.id = tc.suite_id
    JOIN project_members pm ON pm.project_id = ts.project_id
    WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'member')
  ));

CREATE POLICY "Members can delete attachments"
  ON attachments FOR DELETE
  USING (test_case_id IN (
    SELECT tc.id FROM test_cases tc
    JOIN test_suites ts ON ts.id = tc.suite_id
    JOIN project_members pm ON pm.project_id = ts.project_id
    WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin', 'member')
  ));

-- ============================================================
-- 5. CONSTRAINT: unique step ordering within a test case
-- ============================================================

ALTER TABLE test_steps ADD CONSTRAINT unique_step_order UNIQUE (test_case_id, step_number);

-- ============================================================
-- 6. CONSTRAINT: test_steps step_number must be positive
-- ============================================================

ALTER TABLE test_steps ADD CONSTRAINT step_number_positive CHECK (step_number > 0);

-- ============================================================
-- 7. CONSTRAINT: projects name cannot be empty
-- ============================================================

ALTER TABLE projects ADD CONSTRAINT projects_name_not_empty CHECK (char_length(trim(name)) > 0);
ALTER TABLE test_suites ADD CONSTRAINT test_suites_name_not_empty CHECK (char_length(trim(name)) > 0);
ALTER TABLE test_cases ADD CONSTRAINT test_cases_title_not_empty CHECK (char_length(trim(title)) > 0);
ALTER TABLE test_runs ADD CONSTRAINT test_runs_name_not_empty CHECK (char_length(trim(name)) > 0);
