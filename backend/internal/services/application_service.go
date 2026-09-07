package services

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hireflow/hireflow/backend/internal/models"
	"github.com/hireflow/hireflow/backend/internal/worker"
)

type ApplicationService struct {
	db    *pgxpool.Pool
	queue *asynq.Client
}

func NewApplicationService(db *pgxpool.Pool, queue *asynq.Client) *ApplicationService {
	return &ApplicationService{db: db, queue: queue}
}

// ─── Apply (public) ────────────────────────────────────────────────────────────

func (s *ApplicationService) Apply(ctx context.Context, jobID uuid.UUID, name, email, phone string, formData json.RawMessage) (*models.Application, error) {
	var stageID uuid.UUID
	err := s.db.QueryRow(ctx, "SELECT id FROM pipeline_stages WHERE job_id = $1 ORDER BY position ASC LIMIT 1", jobID).Scan(&stageID)
	if err != nil {
		return nil, fmt.Errorf("find first stage: %w", err)
	}

	if len(formData) == 0 {
		formData = json.RawMessage(`{}`)
	}

	var app models.Application
	err = s.db.QueryRow(ctx, `
		INSERT INTO applications (job_id, stage_id, candidate_name, candidate_email, candidate_phone, form_data)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, job_id, stage_id, candidate_name, candidate_email, candidate_phone, form_data, applied_at, hired_at, rejected_at
	`, jobID, stageID, name, email, phone, formData).Scan(
		&app.ID, &app.JobID, &app.StageID, &app.CandidateName, &app.CandidateEmail, &app.CandidatePhone, &app.FormData, &app.AppliedAt, &app.HiredAt, &app.RejectedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert application: %w", err)
	}

	return &app, nil
}

// ─── List ─────────────────────────────────────────────────────────────────────

func (s *ApplicationService) List(ctx context.Context, companyID uuid.UUID, jobID, stageID string, search string, page, limit int) ([]models.Application, error) {
	offset := (page - 1) * limit

	q := `
		SELECT a.id, a.job_id, a.stage_id, a.candidate_name, a.candidate_email, a.candidate_phone, a.form_data, a.applied_at, a.hired_at, a.rejected_at
		FROM applications a
		JOIN jobs j ON a.job_id = j.id
		WHERE j.company_id = $1
	`
	args := []interface{}{companyID}
	argID := 2

	if jobID != "" {
		q += fmt.Sprintf(" AND a.job_id = $%d", argID)
		args = append(args, jobID)
		argID++
	}
	if stageID != "" {
		q += fmt.Sprintf(" AND a.stage_id = $%d", argID)
		args = append(args, stageID)
		argID++
	}
	if search != "" {
		q += fmt.Sprintf(" AND (a.candidate_name ILIKE $%d OR a.candidate_email ILIKE $%d)", argID, argID)
		args = append(args, "%"+search+"%")
		argID++
	}

	q += fmt.Sprintf(" ORDER BY a.applied_at DESC LIMIT $%d OFFSET $%d", argID, argID+1)
	args = append(args, limit, offset)

	rows, err := s.db.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query applications: %w", err)
	}
	defer rows.Close()

	var apps []models.Application
	for rows.Next() {
		var app models.Application
		if err := rows.Scan(&app.ID, &app.JobID, &app.StageID, &app.CandidateName, &app.CandidateEmail, &app.CandidatePhone, &app.FormData, &app.AppliedAt, &app.HiredAt, &app.RejectedAt); err != nil {
			return nil, fmt.Errorf("scan application: %w", err)
		}
		apps = append(apps, app)
	}

	return apps, nil
}

// ─── Get ──────────────────────────────────────────────────────────────────────

func (s *ApplicationService) Get(ctx context.Context, companyID, appID uuid.UUID) (*models.Application, error) {
	var app models.Application
	err := s.db.QueryRow(ctx, `
		SELECT a.id, a.job_id, a.stage_id, a.candidate_name, a.candidate_email, a.candidate_phone, a.form_data, a.applied_at, a.hired_at, a.rejected_at
		FROM applications a
		JOIN jobs j ON a.job_id = j.id
		WHERE a.id = $1 AND j.company_id = $2
	`, appID, companyID).Scan(
		&app.ID, &app.JobID, &app.StageID, &app.CandidateName, &app.CandidateEmail, &app.CandidatePhone, &app.FormData, &app.AppliedAt, &app.HiredAt, &app.RejectedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("application not found: %w", err)
	}
	return &app, nil
}

// ─── Delete ───────────────────────────────────────────────────────────────────

func (s *ApplicationService) Delete(ctx context.Context, companyID, appID uuid.UUID) error {
	tag, err := s.db.Exec(ctx, `
		DELETE FROM applications a
		USING jobs j
		WHERE a.job_id = j.id AND a.id = $1 AND j.company_id = $2
	`, appID, companyID)
	if err != nil {
		return fmt.Errorf("delete application: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("application not found")
	}
	return nil
}

// ─── Move Stage ───────────────────────────────────────────────────────────────

func (s *ApplicationService) MoveStage(ctx context.Context, companyID, userID, appID, newStageID uuid.UUID) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var currentStageID uuid.UUID
	var jobID uuid.UUID
	err = tx.QueryRow(ctx, `
		SELECT a.stage_id, a.job_id
		FROM applications a
		JOIN jobs j ON a.job_id = j.id
		WHERE a.id = $1 AND j.company_id = $2
	`, appID, companyID).Scan(&currentStageID, &jobID)
	if err != nil {
		return fmt.Errorf("application not found or unowned: %w", err)
	}

	var newStageName string
	err = tx.QueryRow(ctx, "SELECT name FROM pipeline_stages WHERE id = $1 AND job_id = $2", newStageID, jobID).Scan(&newStageName)
	if err != nil {
		return fmt.Errorf("invalid new stage: %w", err)
	}

	_, err = tx.Exec(ctx, `
		UPDATE applications 
		SET stage_id     = $1,
		    hired_at     = CASE WHEN $3 = 'Hired'    THEN NOW() ELSE hired_at    END,
		    rejected_at  = CASE WHEN $3 = 'Rejected' THEN NOW() ELSE rejected_at END
		WHERE id = $2
	`, newStageID, appID, newStageName)
	if err != nil {
		return fmt.Errorf("update application: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO stage_history (application_id, from_stage_id, to_stage_id, moved_by)
		VALUES ($1, $2, $3, $4)
	`, appID, currentStageID, newStageID, userID)
	if err != nil {
		return fmt.Errorf("insert history: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	// Enqueue email notification (best-effort, non-blocking)
	task, err := worker.NewEmailStageChangeTask(worker.EmailStageChangePayload{
		ApplicationID: appID.String(),
		ToStageID:     newStageID.String(),
	})
	if err == nil {
		s.queue.Enqueue(task) //nolint:errcheck
	}

	return nil
}

// ─── Notes ────────────────────────────────────────────────────────────────────

func (s *ApplicationService) AddNote(ctx context.Context, companyID, userID, appID uuid.UUID, body string) (*models.Note, error) {
	// Verify ownership
	var exists bool
	err := s.db.QueryRow(ctx, `
		SELECT true FROM applications a JOIN jobs j ON a.job_id = j.id
		WHERE a.id = $1 AND j.company_id = $2
	`, appID, companyID).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("application not found: %w", err)
	}

	var note models.Note
	err = s.db.QueryRow(ctx, `
		INSERT INTO notes (application_id, user_id, body)
		VALUES ($1, $2, $3)
		RETURNING id, application_id, user_id, body, created_at, updated_at
	`, appID, userID, body).Scan(
		&note.ID, &note.ApplicationID, &note.UserID, &note.Body, &note.CreatedAt, &note.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert note: %w", err)
	}
	return &note, nil
}

func (s *ApplicationService) ListNotes(ctx context.Context, companyID, appID uuid.UUID) ([]models.Note, error) {
	rows, err := s.db.Query(ctx, `
		SELECT n.id, n.application_id, n.user_id, n.body, n.created_at, n.updated_at
		FROM notes n
		JOIN applications a ON n.application_id = a.id
		JOIN jobs j ON a.job_id = j.id
		WHERE n.application_id = $1 AND j.company_id = $2
		ORDER BY n.created_at ASC
	`, appID, companyID)
	if err != nil {
		return nil, fmt.Errorf("list notes: %w", err)
	}
	defer rows.Close()

	var notes []models.Note
	for rows.Next() {
		var n models.Note
		if err := rows.Scan(&n.ID, &n.ApplicationID, &n.UserID, &n.Body, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan note: %w", err)
		}
		notes = append(notes, n)
	}
	return notes, nil
}

func (s *ApplicationService) DeleteNote(ctx context.Context, companyID, userID, noteID uuid.UUID) error {
	tag, err := s.db.Exec(ctx, `
		DELETE FROM notes n
		USING applications a, jobs j
		WHERE n.application_id = a.id
		  AND a.job_id = j.id
		  AND n.id = $1
		  AND j.company_id = $2
		  AND n.user_id = $3
	`, noteID, companyID, userID)
	if err != nil {
		return fmt.Errorf("delete note: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("note not found or unauthorized")
	}
	return nil
}
