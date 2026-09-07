package main

import (
	"fmt"
	"log"

	"github.com/hibiken/asynq"
	"github.com/hireflow/hireflow/backend/internal/config"
	"github.com/hireflow/hireflow/backend/internal/db"
	"github.com/hireflow/hireflow/backend/internal/handlers"
	"github.com/hireflow/hireflow/backend/internal/redis"
	"github.com/hireflow/hireflow/backend/internal/storage"
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

	if err := db.RunMigrations(pool, "migrations", cfg.DatabaseURL); err != nil {
		log.Fatalf("migrations failed: %v", err)
	}

	rdb, err := redis.New(cfg)
	if err != nil {
		log.Fatalf("failed to connect to redis: %v", err)
	}
	defer rdb.Close()

	store, err := storage.New(cfg)
	if err != nil {
		log.Fatalf("failed to init storage: %v", err)
	}

	queue := asynq.NewClient(asynq.RedisClientOpt{Addr: cfg.RedisURL})
	defer queue.Close()

	r := handlers.SetupRouter(cfg, pool, rdb, store, queue)
	
	log.Printf("Server listening on port %s", cfg.Port)
	if err := r.Run(fmt.Sprintf(":%s", cfg.Port)); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
