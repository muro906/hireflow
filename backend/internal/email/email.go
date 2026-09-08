package email

import (
	"context"
	"fmt"
	"mime"
	"net/mail"

	"github.com/hireflow/hireflow/backend/internal/config"
)

type StageChangeData struct {
	CandidateName string
	JobTitle      string
	CompanyName   string
	StageName     string
	ToEmail       string
}

type Mailer interface {
	SendStageChange(ctx context.Context, data StageChangeData) error
}

// fromAddress renders the From header, pairing EMAIL_FROM with EMAIL_FROM_NAME
// when one is configured.
func fromAddress(cfg *config.Config) string {
	if cfg.EmailFromName == "" {
		return cfg.EmailFrom
	}
	addr := mail.Address{Name: cfg.EmailFromName, Address: cfg.EmailFrom}
	return addr.String()
}

// stageChangeSubject encodes the subject, since a job title may contain
// non-ASCII characters that a raw header cannot carry.
func stageChangeSubject(jobTitle string) string {
	return mime.QEncoding.Encode("UTF-8", fmt.Sprintf("Update on your application for %s", jobTitle))
}
