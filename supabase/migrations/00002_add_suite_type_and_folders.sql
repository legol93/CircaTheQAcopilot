-- Add type to test_suites to differentiate folders vs sprints
alter table test_suites add column type text not null default 'folder' check (type in ('folder', 'sprint'));

-- Add icon and color for visual customization
alter table test_suites add column icon text;
alter table test_suites add column color text;
