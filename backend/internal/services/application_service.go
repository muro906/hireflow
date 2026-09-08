package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/hireflow/hireflow/backend/internal/models"
	"github.com/hireflow/hireflow/backend/internal/worker"
	"github.com/jackc/pgx/v5/pgxpool"
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

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op once committed

	var app models.Application
	err = tx.QueryRow(ctx, `
		INSERT INTO applications (job_id, stage_id, candidate_name, candidate_email, candidate_phone, form_data)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, job_id, stage_id, candidate_name, candidate_email, candidate_phone, form_data, applied_at, hired_at, rejected_at
	`, jobID, stageID, name, email, phone, formData).Scan(
		&app.ID, &app.JobID, &app.StageID, &app.CandidateName, &app.CandidateEmail, &app.CandidatePhone, &app.FormData, &app.AppliedAt, &app.HiredAt, &app.RejectedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert application: %w", err)
	}

	// Record entry into the first stage. Without this the candidate has no
	// history until a recruiter moves them, which left the conversion funnel
	// reporting nobody as having entered the first stage. moved_by is null
	// because the candidate applied themselves; a null from_stage_id is what
	// marks the row as the application itself rather than a recruiter's move.
	_, err = tx.Exec(ctx, `
		INSERT INTO stage_history (application_id, from_stage_id, to_stage_id, moved_by)
		VALUES ($1, NULL, $2, NULL)
	`, app.ID, stageID)
	if err != nil {
		return nil, fmt.Errorf("insert application history: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return &app, nil
}

// ─── List ─────────────────────────────────────────────────────────────────────

// List returns one page of applications along with the total number of rows
// matching the filters, so callers can paginate without guessing from page size.
func (s *ApplicationService) List(ctx context.Context, companyID uuid.UUID, jobID, stageID string, search string, page, limit int) ([]models.Application, int, error) {
	offset := (page - 1) * limit

	where := " WHERE j.company_id = $1"
	args := []interface{}{companyID}
	argID := 2

	if jobID != "" {
		where += fmt.Sprintf(" AND a.job_id = $%d", argID)
		args = append(args, jobID)
		argID++
	}
	if stageID != "" {
		where += fmt.Sprintf(" AND a.stage_id = $%d", argID)
		args = append(args, stageID)
		argID++
	}
	if search != "" {
		where += fmt.Sprintf(" AND (a.candidate_name ILIKE $%d OR a.candidate_email ILIKE $%d)", argID, argID)
		args = append(args, "%"+search+"%")
		argID++
	}

	var total int
	countQ := "SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id = j.id" + where
	if err := s.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count applications: %w", err)
	}

	q := `
		SELECT a.id, a.job_id, a.stage_id, a.candidate_name, a.candidate_email, a.candidate_phone, a.form_data, a.applied_at, a.hired_at, a.rejected_at
		FROM applications a
		JOIN jobs j ON a.job_id = j.id
	` + where
	q += fmt.Sprintf(" ORDER BY a.applied_at DESC LIMIT $%d OFFSET $%d", argID, argID+1)
	args = append(args, limit, offset)

	rows, err := s.db.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query applications: %w", err)
	}
	defer rows.Close()

	apps := []models.Application{}
	for rows.Next() {
		var app models.Application
		if err := rows.Scan(&app.ID, &app.JobID, &app.StageID, &app.CandidateName, &app.CandidateEmail, &app.CandidatePhone, &app.FormData, &app.AppliedAt, &app.HiredAt, &app.RejectedAt); err != nil {
			return nil, 0, fmt.Errorf("scan application: %w", err)
		}
		apps = append(apps, app)
	}

	return apps, total, nil
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
		WITH inserted AS (
			INSERT INTO notes (application_id, user_id, body)
			VALUES ($1, $2, $3)
			RETURNING id, application_id, user_id, body, created_at, updated_at
		)
		SELECT i.id, i.application_id, i.user_id, COALESCE(u.full_name, 'Deleted user'),
		       i.body, i.created_at, i.updated_at
		FROM inserted i
		LEFT JOIN users u ON i.user_id = u.id
	`, appID, userID, body).Scan(
		&note.ID, &note.ApplicationID, &note.UserID, &note.UserName, &note.Body, &note.CreatedAt, &note.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert note: %w", err)
	}
	return &note, nil
}

func (s *ApplicationService) ListNotes(ctx context.Context, companyID, appID uuid.UUID) ([]models.Note, error) {
	rows, err := s.db.Query(ctx, `
		SELECT n.id, n.application_id, n.user_id, COALESCE(u.full_name, 'Deleted user'),
		       n.body, n.created_at, n.updated_at
		FROM notes n
		JOIN applications a ON n.application_id = a.id
		JOIN jobs j ON a.job_id = j.id
		LEFT JOIN users u ON n.user_id = u.id
		WHERE n.application_id = $1 AND j.company_id = $2
		ORDER BY n.created_at ASC
	`, appID, companyID)
	if err != nil {
		return nil, fmt.Errorf("list notes: %w", err)
	}
	defer rows.Close()

	notes := []models.Note{}
	for rows.Next() {
		var n models.Note
		if err := rows.Scan(&n.ID, &n.ApplicationID, &n.UserID, &n.UserName, &n.Body, &n.CreatedAt, &n.UpdatedAt); err != nil {
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

// ─── Stage history ────────────────────────────────────────────────────────────

// StageHistoryEntry is one stage transition with the stage and user names
// resolved, which is what the applicant timeline renders.
type StageHistoryEntry struct {
	ID            uuid.UUID `json:"id"`
	FromStageName *string   `json:"from_stage_name"`
	ToStageName   string    `json:"to_stage_name"`
	MovedByName   string    `json:"moved_by_name"`
	MovedAt       time.Time `json:"moved_at"`
}

func (s *ApplicationService) ListStageHistory(ctx context.Context, companyID, appID uuid.UUID) ([]StageHistoryEntry, error) {
	rows, err := s.db.Query(ctx, `
		SELECT h.id, from_stage.name, to_stage.name,
		       CASE
		         WHEN h.moved_by IS NULL AND h.from_stage_id IS NULL THEN 'Candidate'
		         ELSE COALESCE(u.full_name, 'Deleted user')
		       END,
		       h.moved_at
		FROM stage_history h
		JOIN applications a ON h.application_id = a.id
		JOIN jobs j ON a.job_id = j.id
		JOIN pipeline_stages to_stage ON h.to_stage_id = to_stage.id
		LEFT JOIN pipeline_stages from_stage ON h.from_stage_id = from_stage.id
		LEFT JOIN users u ON h.moved_by = u.id
		WHERE h.application_id = $1 AND j.company_id = $2
		ORDER BY h.moved_at DESC
	`, appID, companyID)
	if err != nil {
		return nil, fmt.Errorf("query stage history: %w", err)
	}
	defer rows.Close()

	entries := []StageHistoryEntry{}
	for rows.Next() {
		var e StageHistoryEntry
		if err := rows.Scan(&e.ID, &e.FromStageName, &e.ToStageName, &e.MovedByName, &e.MovedAt); err != nil {
			return nil, fmt.Errorf("scan stage history: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, nil
}
