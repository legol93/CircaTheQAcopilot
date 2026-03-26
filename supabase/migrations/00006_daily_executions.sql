-- Daily Executions: runs and per-test-case results

-- Each daily execution run
create table daily_execution_runs (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  run_date        date not null,
  created_by      uuid not null references auth.users(id),
  notes           text,
  source          text not null default 'manual'
                       check (source in ('manual', 'ci', 'import')),
  environment     text not null default 'DEV'
                       check (environment in ('DEV', 'QA', 'STAGING', 'PROD')),
  run_type        text not null default 'scheduled'
                       check (run_type in ('scheduled', 'manual')),
  summary_json    jsonb,
  report_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Result per test case per run
create table daily_execution_results (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references daily_execution_runs(id) on delete cascade,
  test_case_id    uuid not null references test_cases(id) on delete cascade,
  result          text not null default 'not_run'
                       check (result in ('passed', 'failed', 'flaky', 'skipped', 'not_run')),
  comment         text,
  duration_ms     integer,
  error_summary   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(run_id, test_case_id)
);

-- Indexes
create index idx_daily_execution_runs_project_id on daily_execution_runs(project_id);
create index idx_daily_execution_runs_run_date on daily_execution_runs(run_date);
create index idx_daily_execution_results_run_id on daily_execution_results(run_id);
create index idx_daily_execution_results_test_case_id on daily_execution_results(test_case_id);
create index idx_daily_execution_results_result on daily_execution_results(result);

-- RLS
alter table daily_execution_runs enable row level security;
alter table daily_execution_results enable row level security;

-- daily_execution_runs: members can view
create policy "Members can view daily execution runs"
  on daily_execution_runs for select
  using (project_id in (select public.get_user_project_ids(auth.uid())));

-- daily_execution_runs: members can manage (insert/update/delete)
create policy "Members can manage daily execution runs"
  on daily_execution_runs for all
  using (project_id in (
    select project_id from project_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  ))
  with check (project_id in (
    select project_id from project_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  ));

-- daily_execution_results: members can view via run -> project
create policy "Members can view daily execution results"
  on daily_execution_results for select
  using (run_id in (
    select der.id from daily_execution_runs der
    where der.project_id in (select public.get_user_project_ids(auth.uid()))
  ));

-- daily_execution_results: members can manage via run -> project
create policy "Members can manage daily execution results"
  on daily_execution_results for all
  using (run_id in (
    select der.id from daily_execution_runs der
    join project_members pm on pm.project_id = der.project_id
    where pm.user_id = auth.uid() and pm.role in ('owner', 'admin', 'member')
  ))
  with check (run_id in (
    select der.id from daily_execution_runs der
    join project_members pm on pm.project_id = der.project_id
    where pm.user_id = auth.uid() and pm.role in ('owner', 'admin', 'member')
  ));

-- Triggers for updated_at
create trigger update_daily_execution_runs_updated_at
  before update on daily_execution_runs
  for each row execute function update_updated_at();

create trigger update_daily_execution_results_updated_at
  before update on daily_execution_results
  for each row execute function update_updated_at();
