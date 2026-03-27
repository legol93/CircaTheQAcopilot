-- Update priority constraint to accept test type values
alter table test_cases drop constraint if exists test_cases_priority_check;
alter table test_cases add constraint test_cases_priority_check
  check (priority in ('low', 'medium', 'high', 'critical', 'automated', 'manual', 'hybrid', 'exploratory'));
