package email

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"net/smtp"
	"path/filepath"
	"strings"
	"time"

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

	// From, To and Date are required headers. Sending them only in the SMTP
	// envelope left the message itself without them, which mail clients show as
	// a blank sender and spam filters score heavily against.
	headers := []string{
		"From: " + fromAddress(m.cfg),
		"To: " + data.ToEmail,
		"Subject: " + stageChangeSubject(data.JobTitle),
		"Date: " + time.Now().Format(time.RFC1123Z),
		"MIME-Version: 1.0",
		`Content-Type: text/html; charset="UTF-8"`,
	}
	msg := []byte(strings.Join(headers, "\r\n") + "\r\n\r\n" + body.String())

	addr := fmt.Sprintf("%s:%d", m.cfg.SMTPHost, m.cfg.SMTPPort)

	// PlainAuth refuses to run over an unencrypted link, so only offer it when
	// credentials are actually configured; local relays such as MailHog take none.
	var auth smtp.Auth
	if m.cfg.SMTPUser != "" {
		auth = smtp.PlainAuth("", m.cfg.SMTPUser, m.cfg.SMTPPass, m.cfg.SMTPHost)
	}

	if err := smtp.SendMail(addr, auth, m.cfg.EmailFrom, []string{data.ToEmail}, msg); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	return nil
}
