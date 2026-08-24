-- EduTest alignment migration — 24 August 2026
--
-- The EDSC Alpha entrance test is an EduTest paper (Verbal Reasoning,
-- Numerical Reasoning, Reading Comprehension, Mathematics, Written Expression),
-- not an ACER paper. This migration retargets the topic list at that exam,
-- adds the session-timer columns, and seeds the timer settings.
--
-- Safe to re-run. Supabase Dashboard -> SQL Editor -> New Query -> Run.

-- ── 1. Re-home the two topics that were always numerical reasoning ──────────
-- Renaming rather than replacing keeps Aarav's mastery history attached.
update public.topics set domain = 'numerical', name = 'Number & Letter Sequences' where id = 'abstract_sequences';
update public.topics set domain = 'numerical', name = 'Number Matrices & Grids'   where id = 'abstract_pattern_matrix';

-- ── 2. Retire the topics that are not on the EduTest paper ──────────────────
-- Kept (not deleted) so historical attempts and mastery rows still resolve.
update public.topics set active = false where id in ('abstract_spatial', 'abstract_odd_shape');

-- ── 3. New EduTest topics ───────────────────────────────────────────────────
insert into public.topics (id, domain, name, year_level, difficulty_base, active) values
  ('numerical_arithmetic',     'numerical', 'Arithmetic Reasoning & Worded Logic', 6, 6, true),
  ('numerical_properties',     'numerical', 'Number Properties & Relationships',   6, 6, true),
  ('numerical_proportion',     'numerical', 'Rates, Ratio & Proportion',           6, 7, true),
  ('verbal_logical_deduction', 'verbal',    'Logical Deduction',                   6, 7, true),
  ('verbal_codes',             'verbal',    'Letter & Word Codes',                 6, 6, true)
on conflict (id) do update
  set domain = excluded.domain,
      name = excluded.name,
      difficulty_base = excluded.difficulty_base,
      active = excluded.active;

-- ── 4. Rename topics whose labels now match the exam ────────────────────────
update public.topics set name = 'Synonyms & Antonyms'      where id = 'verbal_antonyms';
update public.topics set name = 'Number Sense & Operations' where id = 'maths_number_sense';
update public.topics set name = 'Patterns & Algebra'        where id = 'maths_algebra';
update public.topics set name = 'Measurement & Geometry'    where id = 'maths_geometry';
update public.topics set name = 'Statistics & Probability'  where id = 'maths_data';
update public.topics set name = 'Multi-step Word Problems'  where id = 'maths_word_problems';
update public.topics set difficulty_base = 5 where id = 'maths_time_money';

-- ── 5. Session timer columns ────────────────────────────────────────────────
-- The app degrades gracefully without these (it retries the update without
-- them on error 42703), but the parent report is richer with them.
alter table public.sessions add column if not exists time_limit_seconds int;
alter table public.sessions add column if not exists timed_out boolean default false;

-- ── 6. Timer settings defaults ──────────────────────────────────────────────
-- 60 seconds per question is the real EduTest pace.
insert into public.settings (key, value) values
  ('timer_enabled', 'true'),
  ('timer_seconds_per_question', '60'),
  ('writing_time_seconds', '900')
on conflict (key) do nothing;

-- ── 7. Relabel the badge that used to mean abstract reasoning ───────────────
-- The id stays so badges Aarav has already earned are not lost; only what it
-- stands for changes. runSessionEnd now awards it for Numerical Reasoning.
update public.badges
   set name = 'Numbers Genius',
       description = 'Reach 85%+ mastery in any Numerical Reasoning topic',
       icon = '🔢'
 where id = 'abstract_genius';

-- ── 8. Let the signed-in app read the topic list ────────────────────────────
-- useStudySession reads this to work out which topic IDs actually exist before
-- it writes an attempt row, so a missing policy here silently disables the new
-- topics rather than breaking anything.
alter table public.topics enable row level security;
drop policy if exists "topics readable by authenticated" on public.topics;
create policy "topics readable by authenticated"
  on public.topics for select
  to authenticated
  using (true);

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect: maths 8, numerical 5, reading 5, verbal 7, writing 3, no abstract.
-- select domain, count(*) from public.topics where active group by domain order by domain;
