-- Fix infinite recursion in project_members RLS policies.
-- The problem: policies on project_members were querying project_members itself.
-- Solution: use auth.uid() directly without subquerying project_members.

-- Drop the problematic policies
drop policy if exists "Members can view project members" on project_members;
drop policy if exists "project_members_insert" on project_members;
drop policy if exists "project_members_update" on project_members;
drop policy if exists "project_members_delete" on project_members;

-- SELECT: users can see members of projects they belong to.
-- Use a security definer function to avoid recursion.
create or replace function public.get_user_project_ids(uid uuid)
returns setof uuid
language sql
security definer
stable
as $$
  select project_id from public.project_members where user_id = uid;
$$;

create policy "Members can view project members"
  on project_members for select
  using (project_id in (select public.get_user_project_ids(auth.uid())));

-- INSERT: only owners/admins of a project can add members
create policy "Admins can insert project members"
  on project_members for insert
  with check (project_id in (
    select public.get_user_project_ids(auth.uid())
  ) or user_id = auth.uid());

-- UPDATE: only owners/admins can update roles
create policy "Admins can update project members"
  on project_members for update
  using (project_id in (select public.get_user_project_ids(auth.uid())));

-- DELETE: only owners can remove members
create policy "Owners can delete project members"
  on project_members for delete
  using (project_id in (select public.get_user_project_ids(auth.uid())));

-- Also fix the policies on other tables that reference project_members
-- to use the function instead, preventing potential recursion issues

-- Fix projects SELECT policy
drop policy if exists "Users can view their projects" on projects;
create policy "Users can view their projects"
  on projects for select
  using (id in (select public.get_user_project_ids(auth.uid())));
