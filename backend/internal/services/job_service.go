package services

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/hireflow/hireflow/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type JobService struct {
	db *pgxpool.Pool
}

func NewJobService(db *pgxpool.Pool) *JobService {
	return &JobService{db: db}
}

// ─── CreateJob ────────────────────────────────────────────────────────────────

func (s *JobService) CreateJob(ctx context.Context, companyID uuid.UUID, title, description, location, empType string, formSchema json.RawMessage) (*models.Job, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if len(formSchema) == 0 {
		formSchema = json.RawMessage(`{"fields":[]}`)
	}

	var job models.Job
	err = tx.QueryRow(ctx, `
		INSERT INTO jobs (company_id, title, description, location, employment_type, form_schema)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, company_id, title, description, location, employment_type, status, form_schema, created_at, updated_at
	`, companyID, title, description, location, empType, formSchema).Scan(
		&job.ID, &job.CompanyID, &job.Title, &job.Description, &job.Location, &job.EmploymentType, &job.Status, &job.FormSchema, &job.CreatedAt, &job.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert job: %w", err)
	}

	// Seed default pipeline stages
	stages := []struct {
		Name     string
		Color    string
		Terminal bool
	}{
		{"Applied", "#22c55e", false},
		{"Screened", "#3b82f6", false},
		{"Interview", "#f59e0b", false},
		{"Offer", "#8b5cf6", false},
		{"Hired", "#10b981", true},
		{"Rejected", "#ef4444", true},
	}

	for i, stg := range stages {
		_, err = tx.Exec(ctx, `
			INSERT INTO pipeline_stages (company_id, job_id, name, position, color, is_terminal)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, companyID, job.ID, stg.Name, i, stg.Color, stg.Terminal)
		if err != nil {
			return nil, fmt.Errorf("insert stage %s: %w", stg.Name, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return &job, nil
}

// ─── GetJobs ──────────────────────────────────────────────────────────────────

func (s *JobService) GetJobs(ctx context.Context, companyID uuid.UUID, status string) ([]models.Job, error) {
	q := `SELECT id, company_id, title, description, location, employment_type, status, form_schema, created_at, updated_at 
	      FROM jobs WHERE company_id = $1`
	args := []interface{}{companyID}

	if status != "" {
		q += " AND status = $2"
		args = append(args, status)
	}
	q += " ORDER BY created_at DESC"

	rows, err := s.db.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query jobs: %w", err)
	}
	defer rows.Close()

	jobs := []models.Job{}
	for rows.Next() {
		var job models.Job
		if err := rows.Scan(&job.ID, &job.CompanyID, &job.Title, &job.Description, &job.Location, &job.EmploymentType, &job.Status, &job.FormSchema, &job.CreatedAt, &job.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan job: %w", err)
		}
		jobs = append(jobs, job)
	}
	return jobs, nil
}

// ─── GetJob ───────────────────────────────────────────────────────────────────

func (s *JobService) GetJob(ctx context.Context, companyID, jobID uuid.UUID) (*models.Job, error) {
	var job models.Job
	err := s.db.QueryRow(ctx, `
		SELECT id, company_id, title, description, location, employment_type, status, form_schema, created_at, updated_at
		FROM jobs WHERE id = $1 AND company_id = $2
	`, jobID, companyID).Scan(
		&job.ID, &job.CompanyID, &job.Title, &job.Description, &job.Location, &job.EmploymentType, &job.Status, &job.FormSchema, &job.CreatedAt, &job.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("query job: %w", err)
	}
	return &job, nil
}

// ─── UpdateJob ────────────────────────────────────────────────────────────────

func (s *JobService) UpdateJob(ctx context.Context, companyID, jobID uuid.UUID, title, description, location, empType, status *string, formSchema json.RawMessage) (*models.Job, error) {
	// Build dynamic SET clause
	setClauses := []string{"updated_at = NOW()"}
	args := []interface{}{}
	argN := 1

	appendField := func(col string, val interface{}) {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", col, argN))
		args = append(args, val)
		argN++
	}

	if title != nil {
		appendField("title", *title)
	}
	if description != nil {
		appendField("description", *description)
	}
	if location != nil {
		appendField("location", *location)
	}
	if empType != nil {
		appendField("employment_type", *empType)
	}
	if status != nil {
		appendField("status", *status)
	}
	if len(formSchema) > 0 {
		appendField("form_schema", formSchema)
	}

	// Build query
	q := "UPDATE jobs SET "
	for i, clause := range setClauses {
		if i > 0 {
			q += ", "
		}
		q += clause
	}
	q += fmt.Sprintf(" WHERE id = $%d AND company_id = $%d", argN, argN+1)
	q += " RETURNING id, company_id, title, description, location, employment_type, status, form_schema, created_at, updated_at"
	args = append(args, jobID, companyID)

	var job models.Job
	err := s.db.QueryRow(ctx, q, args...).Scan(
		&job.ID, &job.CompanyID, &job.Title, &job.Description, &job.Location, &job.EmploymentType, &job.Status, &job.FormSchema, &job.CreatedAt, &job.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("update job: %w", err)
	}
	return &job, nil
}

// ─── DeleteJob ────────────────────────────────────────────────────────────────

// DeleteJob archives a job by closing it, which is what the API documents and
// what the UI promises ("existing applicants are kept"). It is deliberately not
// a DELETE: that would discard every application, note and file attached to the
// job, and it failed outright once any candidate had moved between stages.
func (s *JobService) DeleteJob(ctx context.Context, companyID, jobID uuid.UUID) error {
	tag, err := s.db.Exec(ctx,
		"UPDATE jobs SET status = 'closed', updated_at = NOW() WHERE id = $1 AND company_id = $2",
		jobID, companyID)
	if err != nil {
		return fmt.Errorf("archive job: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("job not found")
	}
	return nil
}

// ─── GetPublicFormSchema (no auth required) ───────────────────────────────────

func (s *JobService) GetPublicFormSchema(ctx context.Context, jobID uuid.UUID) (json.RawMessage, string, error) {
	var formSchema json.RawMessage
	var title string
	err := s.db.QueryRow(ctx,
		"SELECT form_schema, title FROM jobs WHERE id = $1 AND status = 'open'",
		jobID,
	).Scan(&formSchema, &title)
	if err != nil {
		return nil, "", fmt.Errorf("job not found or not open: %w", err)
	}
	return formSchema, title, nil
}
