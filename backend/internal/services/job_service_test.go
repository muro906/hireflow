package services

import (
	"context"
	"encoding/json"
	"testing"
)

// DeleteJob is an archive, not a delete: the README documents it that way and the
// UI promises existing applicants are kept. A hard delete also failed outright
// once any candidate had moved between stages.
func TestDeleteJobArchivesAndKeepsApplications(t *testing.T) {
	pool := testPool(t)
	f := newFixture(t, pool)
	jobs := NewJobService(pool)
	apps := NewApplicationService(pool, nil)
	ctx := context.Background()

	appID := f.apply(t, apps, "Ada", "ada@test.dev")

	// A candidate who has moved stages is the case that used to fail.
	if _, err := pool.Exec(ctx, `
		INSERT INTO stage_history (application_id, from_stage_id, to_stage_id, moved_by)
		VALUES ($1, $2, $3, $4)
	`, appID, f.stageIDs[0], f.stageIDs[1], f.userID); err != nil {
		t.Fatalf("insert history: %v", err)
	}

	if err := jobs.DeleteJob(ctx, f.companyID, f.jobID); err != nil {
		t.Fatalf("archive job: %v", err)
	}

	job, err := jobs.GetJob(ctx, f.companyID, f.jobID)
	if err != nil {
		t.Fatalf("job should still exist after archiving: %v", err)
	}
	if job.Status != "closed" {
		t.Errorf("status = %q, want closed", job.Status)
	}

	_, total, err := apps.List(ctx, f.companyID, "", "", "", 1, 20)
	if err != nil {
		t.Fatalf("list applications: %v", err)
	}
	if total != 1 {
		t.Errorf("applications after archiving = %d, want 1 (they must be kept)", total)
	}
}

// Archiving closes the job, which is what makes the public apply page stop
// serving it.
func TestArchivedJobIsNoLongerPubliclyOpen(t *testing.T) {
	pool := testPool(t)
	f := newFixture(t, pool)
	jobs := NewJobService(pool)
	ctx := context.Background()

	if _, _, err := jobs.GetPublicFormSchema(ctx, f.jobID); err != nil {
		t.Fatalf("open job should be publicly visible: %v", err)
	}

	if err := jobs.DeleteJob(ctx, f.companyID, f.jobID); err != nil {
		t.Fatalf("archive job: %v", err)
	}

	if _, _, err := jobs.GetPublicFormSchema(ctx, f.jobID); err == nil {
		t.Error("archived job is still accepting applications")
	}
}

func TestDeleteJobIsScopedToCompany(t *testing.T) {
	pool := testPool(t)
	mine := newFixture(t, pool)
	theirs := newFixture(t, pool)
	jobs := NewJobService(pool)

	if err := jobs.DeleteJob(context.Background(), theirs.companyID, mine.jobID); err == nil {
		t.Error("another tenant archived my job")
	}
}

// Creating a job seeds its pipeline, which the Kanban board depends on.
func TestCreateJobSeedsPipelineStages(t *testing.T) {
	pool := testPool(t)
	f := newFixture(t, pool)
	jobs := NewJobService(pool)
	ctx := context.Background()

	job, err := jobs.CreateJob(ctx, f.companyID, "Designer", "", "Remote", "full-time", json.RawMessage(`{"fields":[]}`))
	if err != nil {
		t.Fatalf("create job: %v", err)
	}

	var count int
	if err := pool.QueryRow(ctx,
		"SELECT count(*) FROM pipeline_stages WHERE job_id = $1", job.ID,
	).Scan(&count); err != nil {
		t.Fatalf("count stages: %v", err)
	}
	if count != 6 {
		t.Errorf("seeded %d stages, want 6", count)
	}
	if job.Status != "draft" {
		t.Errorf("new job status = %q, want draft", job.Status)
	}
}
