package main

import (
	"log"

	"github.com/hibiken/asynq"
	"github.com/hireflow/hireflow/backend/internal/config"
	"github.com/hireflow/hireflow/backend/internal/db"
	"github.com/hireflow/hireflow/backend/internal/email"
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

	// Use SMTP mailer or Resend depending on config in a real app, hardcode to SMTP for now.
	mailer, err := email.NewSMTPMailer(cfg, "internal/email/templates")
	if err != nil {
		log.Fatalf("failed to init mailer: %v", err)
	}

	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: cfg.RedisURL},
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
