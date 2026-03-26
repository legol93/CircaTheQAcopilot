create table bug_ticket_steps (
  id uuid primary key default gen_random_uuid(),
  bug_ticket_id uuid not null references bug_tickets(id) on delete cascade,
  step_number int not null,
  description text not null,
  created_at timestamptz not null default now(),
  unique(bug_ticket_id, step_number)
);

create index idx_bug_ticket_steps_ticket_id on bug_ticket_steps(bug_ticket_id);

alter table bug_ticket_steps enable row level security;

create policy "Members can view bug ticket steps"
  on bug_ticket_steps for select
  using (bug_ticket_id in (
    select bt.id from bug_tickets bt
    where bt.project_id in (select public.get_user_project_ids(auth.uid()))
  ));

create policy "Members can manage bug ticket steps"
  on bug_ticket_steps for all
  using (bug_ticket_id in (
    select bt.id from bug_tickets bt
    join project_members pm on pm.project_id = bt.project_id
    where pm.user_id = auth.uid() and pm.role in ('owner', 'admin', 'member')
  ))
  with check (bug_ticket_id in (
    select bt.id from bug_tickets bt
    join project_members pm on pm.project_id = bt.project_id
    where pm.user_id = auth.uid() and pm.role in ('owner', 'admin', 'member')
  ));
