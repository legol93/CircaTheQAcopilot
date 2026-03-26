-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Project Members
create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz default now() not null,
  unique(project_id, user_id)
);

-- Test Suites
create table test_suites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  description text,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Test Cases
create table test_cases (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid references test_suites(id) on delete cascade not null,
  title text not null,
  description text,
  preconditions text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'draft' check (status in ('draft', 'active', 'deprecated')),
  ai_generated boolean default false not null,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Test Steps
create table test_steps (
  id uuid primary key default gen_random_uuid(),
  test_case_id uuid references test_cases(id) on delete cascade not null,
  step_number int not null,
  action text not null,
  expected_result text not null,
  ai_generated boolean default false not null
);

-- Attachments
create table attachments (
  id uuid primary key default gen_random_uuid(),
  test_case_id uuid references test_cases(id) on delete cascade not null,
  file_name text not null,
  file_path text not null,
  file_type text,
  uploaded_by uuid references auth.users(id) not null,
  created_at timestamptz default now() not null
);

-- Test Runs
create table test_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  executed_by uuid references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now() not null
);

-- Test Run Results
create table test_run_results (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid references test_runs(id) on delete cascade not null,
  test_case_id uuid references test_cases(id) on delete cascade not null,
  status text not null default 'not_run' check (status in ('passed', 'failed', 'blocked', 'skipped', 'not_run')),
  notes text,
  executed_by uuid references auth.users(id),
  executed_at timestamptz,
  unique(test_run_id, test_case_id)
);

-- AI Prompts Log (for future AI features)
create table ai_prompts_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  project_id uuid references projects(id) on delete cascade,
  prompt text not null,
  response text not null,
  model text not null,
  tokens_used int,
  created_at timestamptz default now() not null
);

-- Row Level Security
alter table projects enable row level security;
alter table project_members enable row level security;
alter table test_suites enable row level security;
alter table test_cases enable row level security;
alter table test_steps enable row level security;
alter table attachments enable row level security;
alter table test_runs enable row level security;
alter table test_run_results enable row level security;
alter table ai_prompts_log enable row level security;

-- RLS Policies: users can access projects they are members of
create policy "Users can view their projects"
  on projects for select
  using (id in (select project_id from project_members where user_id = auth.uid()));

create policy "Users can create projects"
  on projects for insert
  with check (created_by = auth.uid());

create policy "Admins and owners can update projects"
  on projects for update
  using (id in (
    select project_id from project_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  ));

create policy "Owners can delete projects"
  on projects for delete
  using (id in (
    select project_id from project_members
    where user_id = auth.uid() and role = 'owner'
  ));

-- Members can view other members in their projects
create policy "Members can view project members"
  on project_members for select
  using (project_id in (select project_id from project_members where user_id = auth.uid()));

-- All child tables: access if user is member of the parent project
create policy "Members can view test suites"
  on test_suites for select
  using (project_id in (select project_id from project_members where user_id = auth.uid()));

create policy "Members can manage test suites"
  on test_suites for all
  using (project_id in (
    select project_id from project_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  ));

create policy "Members can view test cases"
  on test_cases for select
  using (suite_id in (
    select ts.id from test_suites ts
    join project_members pm on pm.project_id = ts.project_id
    where pm.user_id = auth.uid()
  ));

create policy "Members can manage test cases"
  on test_cases for all
  using (suite_id in (
    select ts.id from test_suites ts
    join project_members pm on pm.project_id = ts.project_id
    where pm.user_id = auth.uid() and pm.role in ('owner', 'admin', 'member')
  ));

create policy "Members can view test steps"
  on test_steps for select
  using (test_case_id in (
    select tc.id from test_cases tc
    join test_suites ts on ts.id = tc.suite_id
    join project_members pm on pm.project_id = ts.project_id
    where pm.user_id = auth.uid()
  ));

create policy "Members can manage test steps"
  on test_steps for all
  using (test_case_id in (
    select tc.id from test_cases tc
    join test_suites ts on ts.id = tc.suite_id
    join project_members pm on pm.project_id = ts.project_id
    where pm.user_id = auth.uid() and pm.role in ('owner', 'admin', 'member')
  ));

create policy "Members can view test runs"
  on test_runs for select
  using (project_id in (select project_id from project_members where user_id = auth.uid()));

create policy "Members can manage test runs"
  on test_runs for all
  using (project_id in (
    select project_id from project_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  ));

create policy "Members can view test run results"
  on test_run_results for select
  using (test_run_id in (
    select tr.id from test_runs tr
    join project_members pm on pm.project_id = tr.project_id
    where pm.user_id = auth.uid()
  ));

create policy "Members can manage test run results"
  on test_run_results for all
  using (test_run_id in (
    select tr.id from test_runs tr
    join project_members pm on pm.project_id = tr.project_id
    where pm.user_id = auth.uid() and pm.role in ('owner', 'admin', 'member')
  ));

create policy "Users can view their own ai logs"
  on ai_prompts_log for select
  using (user_id = auth.uid());

create policy "Users can insert ai logs"
  on ai_prompts_log for insert
  with check (user_id = auth.uid());

-- Auto-add creator as owner when project is created
create or replace function add_project_owner()
returns trigger as $$
begin
  insert into project_members (project_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_project_created
  after insert on projects
  for each row execute function add_project_owner();

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_projects_updated_at before update on projects
  for each row execute function update_updated_at();
create trigger update_test_suites_updated_at before update on test_suites
  for each row execute function update_updated_at();
create trigger update_test_cases_updated_at before update on test_cases
  for each row execute function update_updated_at();
