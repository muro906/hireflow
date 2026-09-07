package services

import (
\t"context"
\t"fmt"
\t"time"

\t"github.com/google/uuid"
\t"github.com/jackc/pgx/v5/pgxpool"
\t"github.com/hireflow/hireflow/backend/internal/models"
)

type CompanyService struct {
\tdb *pgxpool.Pool
}

func NewCompanyService(db *pgxpool.Pool) *CompanyService {
\treturn &CompanyService{db: db}
}

func (s *CompanyService) GetCompany(ctx context.Context, id uuid.UUID) (*models.Company, error) {
\tvar c models.Company
\terr := s.db.QueryRow(ctx, "SELECT id, name, slug, plan, created_at, updated_at FROM companies WHERE id = $1", id).Scan(
\t\t&c.ID, &c.Name, &c.Slug, &c.Plan, &c.CreatedAt, &c.UpdatedAt,
\t)
\tif err != nil {
\t\treturn nil, fmt.Errorf("query company: %w", err)
\t}
\treturn &c, nil
}

func (s *CompanyService) UpdateCompany(ctx context.Context, id uuid.UUID, name string) (*models.Company, error) {
\tvar c models.Company
\terr := s.db.QueryRow(ctx, "UPDATE companies SET name = $1, updated_at = $2 WHERE id = $3 RETURNING id, name, slug, plan, created_at, updated_at", name, time.Now(), id).Scan(
\t\t&c.ID, &c.Name, &c.Slug, &c.Plan, &c.CreatedAt, &c.UpdatedAt,
\t)
\tif err != nil {
\t\treturn nil, fmt.Errorf("update company: %w", err)
\t}
\treturn &c, nil
}
