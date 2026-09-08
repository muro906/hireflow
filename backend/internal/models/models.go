package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Company struct {
	ID        uuid.UUID `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	Slug      string    `db:"slug" json:"slug"`
	Plan      string    `db:"plan" json:"plan"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type User struct {
	ID           uuid.UUID `db:"id" json:"id"`
	CompanyID    uuid.UUID `db:"company_id" json:"company_id"`
	Email        string    `db:"email" json:"email"`
	PasswordHash string    `db:"password_hash" json:"-"`
	FullName     string    `db:"full_name" json:"full_name"`
	Role         string    `db:"role" json:"role"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at"`
}

type Job struct {
	ID             uuid.UUID       `db:"id" json:"id"`
	CompanyID      uuid.UUID       `db:"company_id" json:"company_id"`
	Title          string          `db:"title" json:"title"`
	Description    string          `db:"description" json:"description"`
	Location       string          `db:"location" json:"location"`
	EmploymentType string          `db:"employment_type" json:"employment_type"`
	Status         string          `db:"status" json:"status"`
	FormSchema     json.RawMessage `db:"form_schema" json:"form_schema"`
	CreatedAt      time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time       `db:"updated_at" json:"updated_at"`
}

type PipelineStage struct {
	ID         uuid.UUID `db:"id" json:"id"`
	CompanyID  uuid.UUID `db:"company_id" json:"company_id"`
	JobID      uuid.UUID `db:"job_id" json:"job_id"`
	Name       string    `db:"name" json:"name"`
	Position   int       `db:"position" json:"position"`
	Color      string    `db:"color" json:"color"`
	IsTerminal bool      `db:"is_terminal" json:"is_terminal"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
}

type Application struct {
	ID             uuid.UUID       `db:"id" json:"id"`
	JobID          uuid.UUID       `db:"job_id" json:"job_id"`
	StageID        uuid.UUID       `db:"stage_id" json:"stage_id"`
	CandidateName  string          `db:"candidate_name" json:"candidate_name"`
	CandidateEmail string          `db:"candidate_email" json:"candidate_email"`
	CandidatePhone string          `db:"candidate_phone" json:"candidate_phone"`
	FormData       json.RawMessage `db:"form_data" json:"form_data"`
	AppliedAt      time.Time       `db:"applied_at" json:"applied_at"`
	HiredAt        *time.Time      `db:"hired_at" json:"hired_at"`
	RejectedAt     *time.Time      `db:"rejected_at" json:"rejected_at"`
}

type ApplicationFile struct {
	ID            uuid.UUID `db:"id" json:"id"`
	ApplicationID uuid.UUID `db:"application_id" json:"application_id"`
	FileType      string    `db:"file_type" json:"file_type"`
	S3Key         string    `db:"s3_key" json:"s3_key"`
	Filename      string    `db:"filename" json:"filename"`
	ContentType   string    `db:"content_type" json:"content_type"`
	SizeBytes     int64     `db:"size_bytes" json:"size_bytes"`
	UploadedAt    time.Time `db:"uploaded_at" json:"uploaded_at"`
}

type Note struct {
	ID            uuid.UUID `db:"id" json:"id"`
	ApplicationID uuid.UUID `db:"application_id" json:"application_id"`
	// UserID is null once the author's account has been deleted.
	UserID    *uuid.UUID `db:"user_id" json:"user_id"`
	UserName  string     `db:"user_name" json:"user_name"`
	Body      string     `db:"body" json:"body"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt time.Time  `db:"updated_at" json:"updated_at"`
}

type StageHistory struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	ApplicationID uuid.UUID  `db:"application_id" json:"application_id"`
	FromStageID   *uuid.UUID `db:"from_stage_id" json:"from_stage_id"`
	ToStageID     uuid.UUID  `db:"to_stage_id" json:"to_stage_id"`
	MovedBy       uuid.UUID  `db:"moved_by" json:"moved_by"`
	MovedAt       time.Time  `db:"moved_at" json:"moved_at"`
}

type RefreshToken struct {
	ID        uuid.UUID `db:"id" json:"id"`
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	TokenHash string    `db:"token_hash" json:"token_hash"`
	ExpiresAt time.Time `db:"expires_at" json:"expires_at"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

type FormField struct {
	ID       string   `json:"id"`
	Label    string   `json:"label"`
	Type     string   `json:"type"`
	Required bool     `json:"required"`
	Options  []string `json:"options,omitempty"`
}

type FormSchema struct {
	Fields []FormField `json:"fields"`
}
