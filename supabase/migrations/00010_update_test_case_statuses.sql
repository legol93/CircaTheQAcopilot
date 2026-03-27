-- Update status constraint to include new statuses
alter table test_cases drop constraint if exists test_cases_status_check;
alter table test_cases add constraint test_cases_status_check
  check (status in ('draft', 'active', 'deprecated', 'fail', 'pass_dev_env', 'pass_qa_env', 'released'));
