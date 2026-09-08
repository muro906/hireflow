package worker

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
	"github.com/hireflow/hireflow/backend/internal/email"
	"github.com/jackc/pgx/v5/pgxpool"
)

type EmailTaskHandler struct {
	db     *pgxpool.Pool
	mailer email.Mailer
}

func NewEmailTaskHandler(db *pgxpool.Pool, mailer email.Mailer) *EmailTaskHandler {
	return &EmailTaskHandler{db: db, mailer: mailer}
}

func (h *EmailTaskHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var p EmailStageChangePayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %w", err)
	}

	query := `
		SELECT a.candidate_name, a.candidate_email, j.title, c.name, ps.name
		FROM applications a
		JOIN jobs j ON a.job_id = j.id
		JOIN companies c ON j.company_id = c.id
		JOIN pipeline_stages ps ON a.stage_id = ps.id
		WHERE a.id = $1 AND ps.id = $2
	`

	var data email.StageChangeData
	err := h.db.QueryRow(ctx, query, p.ApplicationID, p.ToStageID).Scan(
		&data.CandidateName,
		&data.ToEmail,
		&data.JobTitle,
		&data.CompanyName,
		&data.StageName,
	)
	if err != nil {
		return fmt.Errorf("failed to query application details: %w", err)
	}

	if err := h.mailer.SendStageChange(ctx, data); err != nil {
		return fmt.Errorf("failed to send stage change email: %w", err)
	}

	return nil
}
