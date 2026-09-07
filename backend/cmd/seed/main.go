package main

import (
	"context"
	"log"

	"github.com/hireflow/hireflow/backend/internal/config"
	"github.com/hireflow/hireflow/backend/internal/db"
	"github.com/hireflow/hireflow/backend/internal/redis"
	"github.com/hireflow/hireflow/backend/internal/services"
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

	rdb, err := redis.New(cfg)
	if err != nil {
		log.Fatalf("failed to connect to redis: %v", err)
	}
	defer rdb.Close()

	authSvc := services.NewAuthService(pool, rdb, cfg)
	
	ctx := context.Background()
	user, _, _, err := authSvc.Register(ctx, "Acme Corp", "admin@acme.com", "password123", "Admin User")
	if err != nil {
		log.Fatalf("seed error: %v", err)
	}
	
	log.Printf("Successfully seeded demo data: %v", user)
}
