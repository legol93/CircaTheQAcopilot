-- Add extended fields for bug tickets matching the reference UI
alter table bug_tickets add column if not exists bug_type text default 'smoke_regression' check (bug_type in ('related_ticket', 'smoke_regression'));
alter table bug_tickets add column if not exists environment text default 'QA' check (environment in ('DEV', 'QA', 'STAGING', 'PROD'));
alter table bug_tickets add column if not exists steps_to_reproduce text;
alter table bug_tickets add column if not exists actual_result text;
alter table bug_tickets add column if not exists expected_result text;
alter table bug_tickets add column if not exists labels text;
