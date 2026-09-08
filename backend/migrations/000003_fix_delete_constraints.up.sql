-- Foreign keys that reference users or pipeline_stages were created with the
-- default NO ACTION, which made several ordinary deletions impossible:
--
--   * a user who had ever written a note or moved a candidate could not be
--     removed, which also made their company undeletable;
--   * a job could not be deleted once any candidate had moved between stages,
--     because stage_history still referenced the job's pipeline stages.
--
-- Author references become SET NULL so the note and the audit trail survive the
-- person leaving; stage references cascade, since history about a stage is
-- meaningless once the stage is gone.

ALTER TABLE notes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE notes DROP CONSTRAINT notes_user_id_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE stage_history ALTER COLUMN moved_by DROP NOT NULL;
ALTER TABLE stage_history DROP CONSTRAINT stage_history_moved_by_fkey;
ALTER TABLE stage_history ADD CONSTRAINT stage_history_moved_by_fkey
  FOREIGN KEY (moved_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE stage_history DROP CONSTRAINT stage_history_from_stage_id_fkey;
ALTER TABLE stage_history ADD CONSTRAINT stage_history_from_stage_id_fkey
  FOREIGN KEY (from_stage_id) REFERENCES pipeline_stages(id) ON DELETE CASCADE;

ALTER TABLE stage_history DROP CONSTRAINT stage_history_to_stage_id_fkey;
ALTER TABLE stage_history ADD CONSTRAINT stage_history_to_stage_id_fkey
  FOREIGN KEY (to_stage_id) REFERENCES pipeline_stages(id) ON DELETE CASCADE;

-- An application cannot outlive the stage it sits in; both die with the job.
ALTER TABLE applications DROP CONSTRAINT applications_stage_id_fkey;
ALTER TABLE applications ADD CONSTRAINT applications_stage_id_fkey
  FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id) ON DELETE CASCADE;

-- Deleting a company fans out down two paths at once: to its users (setting
-- notes.user_id and stage_history.moved_by to NULL) and to its jobs and their
-- applications (deleting those same rows). The SET NULL update would be checked
-- against an application row the other path has already removed, so these two
-- checks are deferred to commit, by which point the rows are gone.
ALTER TABLE notes DROP CONSTRAINT notes_application_id_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE stage_history DROP CONSTRAINT stage_history_application_id_fkey;
ALTER TABLE stage_history ADD CONSTRAINT stage_history_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;
