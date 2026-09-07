package email

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"path/filepath"

	"github.com/hireflow/hireflow/backend/internal/config"
	"github.com/resend/resend-go/v2"
)

type resendMailer struct {
	client   *resend.Client
	cfg      *config.Config
	template *template.Template
}

func NewResendMailer(cfg *config.Config, templatesDir string) (Mailer, error) {
	tmpl, err := template.ParseFiles(filepath.Join(templatesDir, "stage_change.html"))
	if err != nil {
		return nil, fmt.Errorf("failed to parse template: %w", err)
	}

	client := resend.NewClient(cfg.ResendAPIKey)
	return &resendMailer{
		client:   client,
		cfg:      cfg,
		template: tmpl,
	}, nil
}

func (m *resendMailer) SendStageChange(ctx context.Context, data StageChangeData) error {
	var body bytes.Buffer
	if err := m.template.Execute(&body, data); err != nil {
		return fmt.Errorf("failed to execute template: %w", err)
	}

	params := &resend.SendEmailRequest{
		From:    m.cfg.EmailFrom,
		To:      []string{data.ToEmail},
		Subject: fmt.Sprintf("Update on your application for %s", data.JobTitle),
		Html:    body.String(),
	}

	_, err := m.client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("failed to send email via resend: %w", err)
	}
	return nil
}
