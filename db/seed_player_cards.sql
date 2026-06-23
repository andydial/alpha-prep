-- Seed 50 FIFA-style player cards into public.player_cards
-- Run manually in the Supabase SQL editor.
-- Requires the `position` column (added via migration in Part 1, Step 1).

insert into public.player_cards
(id, name, rating, tier, position, pace, shooting, passing, dribbling, defending, physical, xp_cost, active)
values
-- LEGEND (95-99) — 5,000 XP
('mbappe_97', 'Kylian Mbappé', 97, 'legend', 'ST', 98, 94, 82, 96, 35, 78, 5000, true),
('messi_96', 'Lionel Messi', 96, 'legend', 'RW', 85, 92, 95, 98, 38, 65, 5000, true),
('ronaldo_95', 'Cristiano Ronaldo', 95, 'legend', 'ST', 87, 95, 78, 88, 34, 90, 5000, true),
('alisson_95', 'Alisson Becker', 95, 'legend', 'GK', 40, 20, 45, 38, 88, 72, 5000, true),
('vinicius_95', 'Vinícius Jr', 95, 'legend', 'LW', 97, 86, 75, 95, 28, 68, 5000, true),

-- ELITE (90-94) — 2,500 XP
('debruyne_93', 'Kevin De Bruyne', 93, 'elite', 'CM', 72, 82, 96, 87, 58, 75, 2500, true),
('salah_93', 'Mohamed Salah', 93, 'elite', 'RW', 94, 90, 80, 89, 45, 74, 2500, true),
('courtois_92', 'Thibaut Courtois', 92, 'elite', 'GK', 38, 18, 42, 35, 86, 68, 2500, true),
('bellingham_92', 'Jude Bellingham', 92, 'elite', 'CM', 80, 82, 85, 88, 72, 83, 2500, true),
('haaland_92', 'Erling Haaland', 92, 'elite', 'ST', 89, 95, 65, 80, 45, 92, 2500, true),
('trent_91', 'Trent Alexander-Arnold', 91, 'elite', 'RB', 78, 65, 92, 80, 70, 68, 2500, true),
('ruben_dias_91', 'Rúben Dias', 91, 'elite', 'CB', 55, 30, 62, 48, 92, 85, 2500, true),
('pedri_90', 'Pedri', 90, 'elite', 'CM', 74, 72, 88, 90, 68, 65, 2500, true),
('robertson_90', 'Andrew Robertson', 90, 'elite', 'LB', 80, 55, 82, 75, 82, 76, 2500, true),
('saka_90', 'Bukayo Saka', 90, 'elite', 'RM', 86, 80, 82, 88, 60, 68, 2500, true),

-- GOLD (80-89) — 1,200 XP
('kane_89', 'Harry Kane', 89, 'gold', 'ST', 68, 90, 82, 78, 48, 82, 1200, true),
('alaba_88', 'David Alaba', 88, 'gold', 'CB', 68, 55, 75, 72, 88, 75, 1200, true),
('diaz_88', 'Luis Díaz', 88, 'gold', 'LW', 90, 78, 70, 86, 38, 70, 1200, true),
('rodri_88', 'Rodri', 88, 'gold', 'CM', 58, 65, 88, 72, 90, 85, 1200, true),
('militao_87', 'Éder Militão', 87, 'gold', 'CB', 72, 40, 62, 65, 88, 80, 1200, true),
('rasmus_87', 'Rasmus Højlund', 87, 'gold', 'ST', 84, 82, 62, 78, 32, 78, 1200, true),
('theo_86', 'Theo Hernández', 86, 'gold', 'LB', 88, 62, 72, 80, 72, 78, 1200, true),
('mainoo_86', 'Kobbie Mainoo', 86, 'gold', 'CM', 70, 68, 80, 82, 70, 72, 1200, true),
('chiesa_85', 'Federico Chiesa', 85, 'gold', 'RM', 88, 78, 70, 84, 48, 72, 1200, true),
('gvardiol_85', 'Joško Gvardiol', 85, 'gold', 'LB', 78, 45, 68, 70, 86, 80, 1200, true),
('reece_84', 'Reece James', 84, 'gold', 'RB', 78, 60, 75, 72, 84, 75, 1200, true),
('olise_84', 'Michael Olise', 84, 'gold', 'RW', 86, 78, 74, 86, 40, 65, 1200, true),
('flekken_83', 'Mark Flekken', 83, 'gold', 'GK', 32, 15, 38, 30, 80, 62, 1200, true),
('timber_83', 'Jurriën Timber', 83, 'gold', 'CB', 75, 42, 68, 70, 84, 75, 1200, true),
('palmer_83', 'Cole Palmer', 83, 'gold', 'LM', 78, 80, 80, 86, 48, 65, 1200, true),

-- SILVER (70-79) — 500 XP
('onana_79', 'André Onana', 79, 'silver', 'GK', 30, 14, 35, 28, 76, 60, 500, true),
('wan_bissaka_78', 'Aaron Wan-Bissaka', 78, 'silver', 'RB', 74, 38, 58, 68, 80, 68, 500, true),
('gabriel_78', 'Gabriel Magalhães', 78, 'silver', 'CB', 60, 35, 58, 52, 82, 78, 500, true),
('mcateer_77', 'Liam Delap', 77, 'silver', 'ST', 78, 72, 55, 68, 30, 80, 500, true),
('mykolenko_77', 'Vitaliy Mykolenko', 77, 'silver', 'LB', 74, 42, 62, 65, 74, 68, 500, true),
('winks_76', 'Harry Winks', 76, 'silver', 'CM', 62, 55, 74, 68, 65, 62, 500, true),
('doku_76', 'Jérémy Doku', 76, 'silver', 'LW', 94, 65, 62, 88, 28, 58, 500, true),
('destiny_75', 'Destiny Udogie', 75, 'silver', 'LB', 78, 45, 62, 68, 72, 70, 500, true),
('kalvin_75', 'Kalvin Phillips', 75, 'silver', 'CM', 55, 52, 70, 60, 74, 72, 500, true),
('kepa_74', 'Kepa Arrizabalaga', 74, 'silver', 'GK', 28, 12, 32, 25, 72, 55, 500, true),
('telles_74', 'Alex Telles', 74, 'silver', 'LB', 70, 48, 62, 65, 72, 68, 500, true),
('coady_73', 'Conor Coady', 73, 'silver', 'CB', 52, 32, 55, 45, 76, 72, 500, true),
('johnstone_72', 'Sam Johnstone', 72, 'silver', 'GK', 25, 10, 28, 22, 70, 52, 500, true),
('tarkowski_71', 'James Tarkowski', 71, 'silver', 'CB', 50, 30, 52, 42, 74, 78, 500, true),
('eiting_70', 'Oliver Skipp', 70, 'silver', 'RM', 68, 55, 65, 62, 62, 65, 500, true),

-- BRONZE (60-69) — 200 XP
('flaherty_69', 'Scott Flaherty', 69, 'bronze', 'CM', 58, 48, 62, 58, 58, 60, 200, true),
('norris_68', 'James Norris', 68, 'bronze', 'RB', 65, 32, 52, 58, 65, 60, 200, true),
('walsh_67', 'Danny Walsh', 67, 'bronze', 'CB', 48, 25, 48, 38, 68, 65, 200, true),
('brennan_66', 'Ciarán Brennan', 66, 'bronze', 'LB', 62, 35, 50, 55, 62, 58, 200, true),
('hartley_65', 'Tom Hartley', 65, 'bronze', 'ST', 65, 58, 42, 55, 22, 62, 200, true),
('mcdougall_64', 'Kyle McDougall', 64, 'bronze', 'GK', 22, 8, 25, 18, 62, 48, 200, true),
('osei_63', 'Marcus Osei', 63, 'bronze', 'LW', 72, 50, 45, 65, 18, 50, 200, true),
('briggs_62', 'Jordan Briggs', 62, 'bronze', 'RM', 65, 45, 48, 58, 25, 52, 200, true),
('stone_61', 'Ryan Stone', 61, 'bronze', 'CB', 45, 22, 42, 35, 62, 60, 200, true),
('mills_60', 'Alex Mills', 60, 'bronze', 'RB', 58, 28, 45, 48, 58, 55, 200, true)
on conflict (id) do nothing;
