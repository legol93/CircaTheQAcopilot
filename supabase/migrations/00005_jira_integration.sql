-- Jira integration: connections and pending tickets

-- Store Jira connection settings per project
create table jira_connections (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  site_url        text not null,
  jira_project_key text not null,
  webhook_secret  text,
  api_email       text,
  api_token       text,
  created_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(project_id)
);

-- Pending tickets awaiting user decision
create table jira_pending_tickets (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references projects(id) on delete cascade,
  jira_issue_key       text not null,
  jira_issue_id        text not null,
  title                text not null,
  description          text,
  issue_type           text,
  priority             text,
  assignee             text,
  jira_url             text,
  status               text not null default 'pending'
                            check (status in ('pending', 'dismissed', 'created')),
  target_suite_id      uuid references test_suites(id) on delete set null,
  created_test_case_id uuid references test_cases(id) on delete set null,
  webhook_payload      jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique(project_id, jira_issue_key)
);

-- Indexes
create index idx_jira_connections_project_id on jira_connections(project_id);
create index idx_jira_pending_project_id on jira_pending_tickets(project_id);
create index idx_jira_pending_status on jira_pending_tickets(status);
create index idx_jira_pending_created on jira_pending_tickets(created_at desc);

-- RLS
alter table jira_connections enable row level security;
alter table jira_pending_tickets enable row level security;

-- jira_connections: members can view, admins/owners can manage
create policy "Members can view jira connections"
  on jira_connections for select
  using (project_id in (select public.get_user_project_ids(auth.uid())));

create policy "Admins can manage jira connections"
  on jira_connections for all
  using (project_id in (
    select project_id from project_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  ))
  with check (project_id in (
    select project_id from project_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  ));

-- Service role bypass for jira_connections
create policy "Service role can manage jira connections"
  on jira_connections for all
  to service_role
  using (true)
  with check (true);

-- jira_pending_tickets: members can view and update
create policy "Members can view pending tickets"
  on jira_pending_tickets for select
  using (project_id in (select public.get_user_project_ids(auth.uid())));

create policy "Members can update pending tickets"
  on jira_pending_tickets for update
  using (project_id in (
    select project_id from project_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  ))
  with check (project_id in (
    select project_id from project_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  ));

-- Service role bypass for pending tickets
create policy "Service role can select pending tickets"
  on jira_pending_tickets for select
  to service_role
  using (true);

create policy "Service role can insert pending tickets"
  on jira_pending_tickets for insert
  to service_role
  with check (true);

create policy "Service role can update pending tickets"
  on jira_pending_tickets for update
  to service_role
  using (true)
  with check (true);

create policy "Service role can delete pending tickets"
  on jira_pending_tickets for delete
  to service_role
  using (true);

-- Triggers for updated_at
create trigger update_jira_connections_updated_at
  before update on jira_connections
  for each row execute function update_updated_at();

create trigger update_jira_pending_tickets_updated_at
  before update on jira_pending_tickets
  for each row execute function update_updated_at();
