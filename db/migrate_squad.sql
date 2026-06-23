-- Squad pitch screen (Part 2) — schema additions.
-- Run manually in the Supabase SQL editor before using /squad.

-- Which pitch slot a card is assigned to (e.g. 'GK', 'CB1', 'ST2').
-- NULL = on the bench (not in the starting 11).
alter table public.student_cards
  add column if not exists squad_position text;

-- Aarav's chosen formation. Drives the pitch layout.
alter table public.profiles
  add column if not exists formation text default '4-3-3';
