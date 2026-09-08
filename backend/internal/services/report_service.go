package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ReportService struct {
	db *pgxpool.Pool
}

func NewReportService(db *pgxpool.Pool) *ReportService {
	return &ReportService{db: db}
}

type TimeToHireRow struct {
	JobID    uuid.UUID `json:"job_id"`
	JobTitle string    `json:"job_title"`
	Month    time.Time `json:"month"`
	AvgDays  float64   `json:"avg_days"`
}

func (s *ReportService) GetTimeToHire(ctx context.Context, companyID uuid.UUID) ([]TimeToHireRow, error) {
	q := `
		SELECT j.id, j.title, DATE_TRUNC('month', a.applied_at) as month, AVG(EXTRACT(EPOCH FROM (a.hired_at - a.applied_at))/86400) as avg_days 
		FROM applications a
		JOIN jobs j ON a.job_id = j.id
		WHERE a.hired_at IS NOT NULL AND j.company_id = $1
		GROUP BY j.id, month 
		ORDER BY month
	`
	rows, err := s.db.Query(ctx, q, companyID)
	if err != nil {
		return nil, fmt.Errorf("query time to hire: %w", err)
	}
	defer rows.Close()

	result := []TimeToHireRow{}
	for rows.Next() {
		var r TimeToHireRow
		if err := rows.Scan(&r.JobID, &r.JobTitle, &r.Month, &r.AvgDays); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, nil
}

type ConversionRow struct {
	StageName      string  `json:"stage_name"`
	Entered        int     `json:"entered"`
	Exited         int     `json:"exited"`
	ConversionRate float64 `json:"conversion_rate"`
}

func (s *ReportService) GetConversionRates(ctx context.Context, companyID uuid.UUID) ([]ConversionRow, error) {
	q := `
		WITH stage_stats AS (
			SELECT 
				ps.id, ps.name, ps.position,
				COUNT(DISTINCT sh_in.application_id) as entered,
				COUNT(DISTINCT sh_out.application_id) as exited
			FROM pipeline_stages ps
			LEFT JOIN stage_history sh_in ON ps.id = sh_in.to_stage_id
			LEFT JOIN stage_history sh_out ON ps.id = sh_out.from_stage_id
			WHERE ps.company_id = $1
			GROUP BY ps.id, ps.name, ps.position
		)
		SELECT name, entered, exited, 
			CASE WHEN entered > 0 THEN (exited::numeric / entered::numeric) * 100.0 ELSE 0 END as conversion_rate
		FROM stage_stats
		ORDER BY position ASC
	`
	rows, err := s.db.Query(ctx, q, companyID)
	if err != nil {
		return nil, fmt.Errorf("query conversion: %w", err)
	}
	defer rows.Close()

	result := []ConversionRow{}
	for rows.Next() {
		var r ConversionRow
		if err := rows.Scan(&r.StageName, &r.Entered, &r.Exited, &r.ConversionRate); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, nil
}
