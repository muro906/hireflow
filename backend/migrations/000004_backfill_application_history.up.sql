-- Applications created before entry-into-first-stage was recorded have no
-- history row for the application itself, so the conversion funnel counts them
-- as never having entered the pipeline. Give each one the event it should have
-- had, dated to when the candidate actually applied.
--
-- Idempotent: the NOT EXISTS guard skips applications that already have one.

INSERT INTO stage_history (application_id, from_stage_id, to_stage_id, moved_by, moved_at)
SELECT a.id, NULL, first_stage.id, NULL, a.applied_at
FROM applications a
JOIN LATERAL (
  SELECT ps.id
  FROM pipeline_stages ps
  WHERE ps.job_id = a.job_id
  ORDER BY ps.position ASC
  LIMIT 1
) AS first_stage ON TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM stage_history h
  WHERE h.application_id = a.id
    AND h.from_stage_id IS NULL
);
