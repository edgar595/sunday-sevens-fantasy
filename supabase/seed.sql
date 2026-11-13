-- Sunday Sevens Fantasy: your current league data (13 November 2026).
-- Run this after schema.sql, once. It adds your two sides, players, Sundays and the first news story.

insert into public.sides (id, name, short, color, gk) values
  ('t-vijana', 'Vijana', 'VIJ', '#3ba7e0', '#f2c230'),
  ('t-wazee', 'Wazee', 'WAZ', '#8B1E3F', '#4FC3B0')
on conflict (id) do nothing;

insert into public.players (id, name, team, pos, price) values
  ('q-016', 'Barkley', 't-vijana', 'DEF', 5.5),
  ('q-015', 'Ben', 't-vijana', 'DEF', 5.5),
  ('q-013', 'Brian Kiptoo', 't-vijana', 'DEF', 5),
  ('q-014', 'Kevin Omondi', 't-vijana', 'DEF', 4.5),
  ('q-023', 'Maxi', 't-vijana', 'FWD', 6),
  ('q-024', 'Trah', 't-vijana', 'FWD', 7),
  ('q-017', 'Ibrah', 't-vijana', 'MID', 7.5),
  ('q-018', 'Jamaal', 't-vijana', 'MID', 6.5),
  ('q-021', 'Joshu', 't-vijana', 'MID', 6),
  ('q-022', 'Mato', 't-vijana', 'MID', 6),
  ('q-019', 'Maxi Msanii', 't-vijana', 'MID', 6.5),
  ('q-020', 'Salli', 't-vijana', 'MID', 6.5),
  ('q-002', 'CP', 't-wazee', 'DEF', 4),
  ('q-005', 'Eddy', 't-wazee', 'DEF', 4),
  ('q-006', 'Kinos', 't-wazee', 'DEF', 4),
  ('q-004', 'Merlin', 't-wazee', 'DEF', 6),
  ('q-012', 'Felo', 't-wazee', 'FWD', 8),
  ('q-011', 'Mike', 't-wazee', 'FWD', 6),
  ('q-008', 'Julie', 't-wazee', 'MID', 6),
  ('q-007', 'Siwa', 't-wazee', 'MID', 7.5),
  ('q-009', 'Teef', 't-wazee', 'MID', 7)
on conflict (id) do nothing;

insert into public.sundays (id, gw, date, ko, games, home, away) values
  ('sun-06', 1, '2026-11-15', '09:00', 4, 't-wazee', 't-vijana'),
  ('sun-07', 2, '2026-11-22', '09:00', 4, 't-wazee', 't-vijana'),
  ('sun-08', 3, '2026-11-29', '09:00', 4, 't-wazee', 't-vijana'),
  ('sun-09', 4, '2026-12-06', '09:00', 4, 't-wazee', 't-vijana'),
  ('sun-10', 5, '2026-12-13', '09:00', 4, 't-wazee', 't-vijana')
on conflict (id) do nothing;

insert into public.news (id, title, body, side, created_at) values
  ('wazee-on-a-roll', 'Wazee are on a roll', 'The old guard are flying. Wazee have been winning game after game in recent Sunday kickabouts, and it shows: sharp passing, nobody ducking the running, and finishing that has left Vijana chasing shadows.

Vijana will be desperate to stop the run when the season proper starts this Sunday. Four games of 15 minutes, and every one counts.

Fantasy managers, take note: Wazee players in this kind of form could be the smartest picks for gameweek 1. Get your team in before the first game at 9:00.', 't-wazee', '2026-11-13T09:00:00.000Z')
on conflict (id) do nothing;
