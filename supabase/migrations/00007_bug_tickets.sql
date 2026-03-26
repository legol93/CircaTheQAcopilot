create table bug_tickets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  jira_key text,
  jira_url text,
  source_test_case text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bug_tickets_project_id on bug_tickets(project_id);
create index idx_bug_tickets_status on bug_tickets(status);
create index idx_bug_tickets_severity on bug_tickets(severity);

alter table bug_tickets enable row level security;

create policy "Members can view bug tickets"
  on bug_tickets for select
  using (project_id in (select public.get_user_project_ids(auth.uid())));

create policy "Members can manage bug tickets"
  on bug_tickets for all
  using (project_id in (
    select project_id from project_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  ))
  with check (project_id in (
    select project_id from project_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'member')
  ));

create trigger update_bug_tickets_updated_at
  before update on bug_tickets
  for each row execute function update_updated_at();
