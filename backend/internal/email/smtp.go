package email

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"net/smtp"
	"path/filepath"

	"github.com/hireflow/hireflow/backend/internal/config"
)

type smtpMailer struct {
	cfg      *config.Config
	template *template.Template
}

func NewSMTPMailer(cfg *config.Config, templatesDir string) (Mailer, error) {
	tmpl, err := template.ParseFiles(filepath.Join(templatesDir, "stage_change.html"))
	if err != nil {
		return nil, fmt.Errorf("failed to parse template: %w", err)
	}

	return &smtpMailer{
		cfg:      cfg,
		template: tmpl,
	}, nil
}

func (m *smtpMailer) SendStageChange(ctx context.Context, data StageChangeData) error {
	var body bytes.Buffer
	if err := m.template.Execute(&body, data); err != nil {
		return fmt.Errorf("failed to execute template: %w", err)
	}

	msg := []byte(
		"Subject: Update on your application for " + data.JobTitle + "\r\n" +
			"MIME-version: 1.0;\r\nContent-Type: text/html; charset=\"UTF-8\";\r\n\r\n" +
			body.String(),
	)

	auth := smtp.PlainAuth("", m.cfg.SMTPUser, m.cfg.SMTPPass, m.cfg.SMTPHost)
	addr := fmt.Sprintf("%s:%d", m.cfg.SMTPHost, m.cfg.SMTPPort)

	if err := smtp.SendMail(addr, auth, m.cfg.EmailFrom, []string{data.ToEmail}, msg); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	return nil
}
