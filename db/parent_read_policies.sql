-- Parent read access for the reporting screens.
--
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query) if the
-- parent account sees "No session data" on /report, or an empty session drill-down.
-- Safe to re-run: every statement drops the policy first.
--
-- The parent user's profiles.role must be 'parent':
--   update public.profiles set role = 'parent' where id = '<parent-uuid>';

-- SECURITY DEFINER helper. Checking profiles directly inside a profiles policy
-- recurses; this function bypasses RLS so the check terminates.
create or replace function public.is_parent_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'parent'
  );
$$;

grant execute on function public.is_parent_user() to authenticated;

-- Read policies. The drill-down needs `attempts` in particular — without it the
-- session list renders but every session opens empty.
drop policy if exists "parent reads profiles" on public.profiles;
create policy "parent reads profiles"
  on public.profiles for select using (public.is_parent_user());

drop policy if exists "parent reads sessions" on public.sessions;
create policy "parent reads sessions"
  on public.sessions for select using (public.is_parent_user());

drop policy if exists "parent reads attempts" on public.attempts;
create policy "parent reads attempts"
  on public.attempts for select using (public.is_parent_user());

drop policy if exists "parent reads mastery" on public.mastery;
create policy "parent reads mastery"
  on public.mastery for select using (public.is_parent_user());

drop policy if exists "parent reads weekly_plans" on public.weekly_plans;
create policy "parent reads weekly_plans"
  on public.weekly_plans for select using (public.is_parent_user());

drop policy if exists "parent reads student_badges" on public.student_badges;
create policy "parent reads student_badges"
  on public.student_badges for select using (public.is_parent_user());

-- Verify: signed in as the parent, this should return Aarav's attempt count.
--   select count(*) from public.attempts;
