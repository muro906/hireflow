package services

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hireflow/hireflow/backend/internal/models"
	"github.com/hireflow/hireflow/backend/internal/storage"
)

type FileService struct {
	db      *pgxpool.Pool
	storage storage.Storage
}

func NewFileService(db *pgxpool.Pool, storage storage.Storage) *FileService {
	return &FileService{db: db, storage: storage}
}

func (s *FileService) Upload(ctx context.Context, companyID, appID uuid.UUID, fileType, filename, contentType string, size int64, reader io.Reader) (*models.ApplicationFile, error) {
	// Verify the application belongs to this company
	var valid bool
	err := s.db.QueryRow(ctx, `
		SELECT true FROM applications a 
		JOIN jobs j ON a.job_id = j.id 
		WHERE a.id = $1 AND j.company_id = $2
	`, appID, companyID).Scan(&valid)
	if err != nil || !valid {
		return nil, fmt.Errorf("application not found or access denied")
	}

	if fileType == "" {
		fileType = "cv"
	}

	key := fmt.Sprintf("%s/%s/%s", companyID.String(), appID.String(), uuid.New().String())

	if err := s.storage.UploadFile(ctx, key, contentType, reader, size); err != nil {
		return nil, fmt.Errorf("storage upload: %w", err)
	}

	var file models.ApplicationFile
	err = s.db.QueryRow(ctx, `
		INSERT INTO application_files (application_id, file_type, s3_key, filename, content_type, size_bytes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, application_id, file_type, s3_key, filename, content_type, size_bytes, uploaded_at
	`, appID, fileType, key, filename, contentType, size).Scan(
		&file.ID, &file.ApplicationID, &file.FileType, &file.S3Key, &file.Filename, &file.ContentType, &file.SizeBytes, &file.UploadedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert file meta: %w", err)
	}

	return &file, nil
}

func (s *FileService) GetPresignedURL(ctx context.Context, companyID, fileID uuid.UUID) (string, error) {
	var key string
	err := s.db.QueryRow(ctx, `
		SELECT f.s3_key 
		FROM application_files f
		JOIN applications a ON f.application_id = a.id
		JOIN jobs j ON a.job_id = j.id
		WHERE f.id = $1 AND j.company_id = $2
	`, fileID, companyID).Scan(&key)
	if err != nil {
		return "", fmt.Errorf("file not found: %w", err)
	}

	return s.storage.PresignedGetURL(ctx, key, 5*time.Minute)
}

func (s *FileService) Delete(ctx context.Context, companyID, fileID uuid.UUID) error {
	var key string
	err := s.db.QueryRow(ctx, `
		SELECT f.s3_key
		FROM application_files f
		JOIN applications a ON f.application_id = a.id
		JOIN jobs j ON a.job_id = j.id
		WHERE f.id = $1 AND j.company_id = $2
	`, fileID, companyID).Scan(&key)
	if err != nil {
		return fmt.Errorf("file not found: %w", err)
	}

	// Delete from storage first, then DB
	if err := s.storage.DeleteFile(ctx, key); err != nil {
		return fmt.Errorf("storage delete: %w", err)
	}

	_, err = s.db.Exec(ctx, "DELETE FROM application_files WHERE id = $1", fileID)
	if err != nil {
		return fmt.Errorf("db delete: %w", err)
	}

	return nil
}

func (s *FileService) ListByApplication(ctx context.Context, companyID, appID uuid.UUID) ([]models.ApplicationFile, error) {
	rows, err := s.db.Query(ctx, `
		SELECT f.id, f.application_id, f.file_type, f.s3_key, f.filename, f.content_type, f.size_bytes, f.uploaded_at
		FROM application_files f
		JOIN applications a ON f.application_id = a.id
		JOIN jobs j ON a.job_id = j.id
		WHERE f.application_id = $1 AND j.company_id = $2
		ORDER BY f.uploaded_at DESC
	`, appID, companyID)
	if err != nil {
		return nil, fmt.Errorf("list files: %w", err)
	}
	defer rows.Close()

	var files []models.ApplicationFile
	for rows.Next() {
		var f models.ApplicationFile
		if err := rows.Scan(&f.ID, &f.ApplicationID, &f.FileType, &f.S3Key, &f.Filename, &f.ContentType, &f.SizeBytes, &f.UploadedAt); err != nil {
			return nil, fmt.Errorf("scan file: %w", err)
		}
		files = append(files, f)
	}
	return files, nil
}
