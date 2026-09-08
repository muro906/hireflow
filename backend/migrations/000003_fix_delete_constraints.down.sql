-- Restore the original NO ACTION constraints. Rows orphaned while the SET NULL
-- constraints were in force are removed first, since the columns become NOT NULL
-- again and would otherwise block the change.

ALTER TABLE stage_history DROP CONSTRAINT stage_history_application_id_fkey;
ALTER TABLE stage_history ADD CONSTRAINT stage_history_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE notes DROP CONSTRAINT notes_application_id_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE applications DROP CONSTRAINT applications_stage_id_fkey;
ALTER TABLE applications ADD CONSTRAINT applications_stage_id_fkey
  FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id);

ALTER TABLE stage_history DROP CONSTRAINT stage_history_to_stage_id_fkey;
ALTER TABLE stage_history ADD CONSTRAINT stage_history_to_stage_id_fkey
  FOREIGN KEY (to_stage_id) REFERENCES pipeline_stages(id);

ALTER TABLE stage_history DROP CONSTRAINT stage_history_from_stage_id_fkey;
ALTER TABLE stage_history ADD CONSTRAINT stage_history_from_stage_id_fkey
  FOREIGN KEY (from_stage_id) REFERENCES pipeline_stages(id);

DELETE FROM stage_history WHERE moved_by IS NULL;
ALTER TABLE stage_history DROP CONSTRAINT stage_history_moved_by_fkey;
ALTER TABLE stage_history ADD CONSTRAINT stage_history_moved_by_fkey
  FOREIGN KEY (moved_by) REFERENCES users(id);
ALTER TABLE stage_history ALTER COLUMN moved_by SET NOT NULL;

DELETE FROM notes WHERE user_id IS NULL;
ALTER TABLE notes DROP CONSTRAINT notes_user_id_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;
