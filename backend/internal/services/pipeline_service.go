package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hireflow/hireflow/backend/internal/models"
)

type PipelineService struct {
	db *pgxpool.Pool
}

func NewPipelineService(db *pgxpool.Pool) *PipelineService {
	return &PipelineService{db: db}
}

type PipelineResponse struct {
	Stages       []models.PipelineStage            `json:"stages"`
	Applications map[uuid.UUID][]models.Application `json:"applications"`
}

func (s *PipelineService) GetPipeline(ctx context.Context, companyID, jobID uuid.UUID) (*PipelineResponse, error) {
	// Validate job ownership
	var exists bool
	err := s.db.QueryRow(ctx, "SELECT true FROM jobs WHERE id = $1 AND company_id = $2", jobID, companyID).Scan(&exists)
	if err != nil || !exists {
		return nil, fmt.Errorf("job not found")
	}

	q := `
		SELECT 
			ps.id, ps.company_id, ps.job_id, ps.name, ps.position, ps.color, ps.is_terminal, ps.created_at,
			a.id, a.job_id, a.stage_id, a.candidate_name, a.candidate_email, a.candidate_phone, a.form_data, a.applied_at, a.hired_at, a.rejected_at
		FROM pipeline_stages ps
		LEFT JOIN applications a ON ps.id = a.stage_id
		WHERE ps.job_id = $1
		ORDER BY ps.position ASC, a.applied_at DESC
	`
	rows, err := s.db.Query(ctx, q, jobID)
	if err != nil {
		return nil, fmt.Errorf("query pipeline: %w", err)
	}
	defer rows.Close()

	res := &PipelineResponse{
		Stages:       []models.PipelineStage{},
		Applications: make(map[uuid.UUID][]models.Application),
	}
	
	stagesMap := make(map[uuid.UUID]bool)
	
	for rows.Next() {
		var stg models.PipelineStage
		var app models.Application
		var appID *uuid.UUID
		
		if err := rows.Scan(
			&stg.ID, &stg.CompanyID, &stg.JobID, &stg.Name, &stg.Position, &stg.Color, &stg.IsTerminal, &stg.CreatedAt,
			&appID, &app.JobID, &app.StageID, &app.CandidateName, &app.CandidateEmail, &app.CandidatePhone, &app.FormData, &app.AppliedAt, &app.HiredAt, &app.RejectedAt,
		); err != nil {
			return nil, fmt.Errorf("scan pipeline row: %w", err)
		}
		
		if !stagesMap[stg.ID] {
			res.Stages = append(res.Stages, stg)
			stagesMap[stg.ID] = true
			if _, ok := res.Applications[stg.ID]; !ok {
				res.Applications[stg.ID] = []models.Application{}
			}
		}
		
		if appID != nil {
			app.ID = *appID
			res.Applications[stg.ID] = append(res.Applications[stg.ID], app)
		}
	}

	return res, nil
}