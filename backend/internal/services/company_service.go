package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/hireflow/hireflow/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CompanyService struct {
	db *pgxpool.Pool
}

func NewCompanyService(db *pgxpool.Pool) *CompanyService {
	return &CompanyService{db: db}
}

func (s *CompanyService) GetCompany(ctx context.Context, id uuid.UUID) (*models.Company, error) {
	var c models.Company
	err := s.db.QueryRow(ctx, "SELECT id, name, slug, plan, created_at, updated_at FROM companies WHERE id = $1", id).Scan(
		&c.ID, &c.Name, &c.Slug, &c.Plan, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("query company: %w", err)
	}
	return &c, nil
}

func (s *CompanyService) UpdateCompany(ctx context.Context, id uuid.UUID, name string) (*models.Company, error) {
	var c models.Company
	err := s.db.QueryRow(ctx, "UPDATE companies SET name = $1, updated_at = $2 WHERE id = $3 RETURNING id, name, slug, plan, created_at, updated_at", name, time.Now(), id).Scan(
		&c.ID, &c.Name, &c.Slug, &c.Plan, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("update company: %w", err)
	}
	return &c, nil
}
