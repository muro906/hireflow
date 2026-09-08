-- Removes application-entry rows, returning history to the state where the
-- pipeline only records recruiter-driven moves.
--
-- This cannot tell a backfilled row from one written by a real application, so
-- it removes both. That is the intended meaning of reverting this migration,
-- but note the application code writes these rows for every new application, so
-- they will reappear unless the code is rolled back too.

DELETE FROM stage_history
WHERE from_stage_id IS NULL
  AND moved_by IS NULL;
