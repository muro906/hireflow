package main

import (
	"fmt"
	"log"
	"strings"

	"github.com/hibiken/asynq"
	"github.com/hireflow/hireflow/backend/internal/config"
	"github.com/hireflow/hireflow/backend/internal/db"
	"github.com/hireflow/hireflow/backend/internal/email"
	"github.com/hireflow/hireflow/backend/internal/redis"
	"github.com/hireflow/hireflow/backend/internal/worker"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	pool, err := db.New(cfg)
	if err != nil {
		log.Fatalf("failed to connect to db: %v", err)
	}
	defer pool.Close()

	mailer, err := newMailer(cfg)
	if err != nil {
		log.Fatalf("failed to init mailer: %v", err)
	}

	queueOpt, err := redis.AsynqOpt(cfg)
	if err != nil {
		log.Fatalf("failed to configure task queue: %v", err)
	}

	srv := asynq.NewServer(
		queueOpt,
		asynq.Config{
			Concurrency: 10,
		},
	)

	mux := asynq.NewServeMux()
	emailHandler := worker.NewEmailTaskHandler(pool, mailer)
	mux.HandleFunc(worker.TypeEmailStageChange, emailHandler.ProcessTask)

	log.Println("Starting worker server...")
	if err := srv.Run(mux); err != nil {
		log.Fatalf("worker server failed: %v", err)
	}
}

const templatesDir = "internal/email/templates"

// newMailer honours EMAIL_PROVIDER, which the README and .env.example both
// document. It was previously hardcoded to SMTP, so setting it to "resend" did
// nothing and the Resend adapter was unreachable.
func newMailer(cfg *config.Config) (email.Mailer, error) {
	switch provider := strings.ToLower(strings.TrimSpace(cfg.EmailProvider)); provider {
	case "resend":
		log.Println("email provider: resend")
		return email.NewResendMailer(cfg, templatesDir)
	case "", "smtp":
		log.Println("email provider: smtp")
		return email.NewSMTPMailer(cfg, templatesDir)
	default:
		return nil, fmt.Errorf("unknown EMAIL_PROVIDER %q: want smtp or resend", provider)
	}
}
