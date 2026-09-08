package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/hireflow/hireflow/backend/internal/config"
	"github.com/hireflow/hireflow/backend/internal/middleware"
	"github.com/hireflow/hireflow/backend/internal/services"
	"github.com/hireflow/hireflow/backend/internal/storage"
)

func SetupRouter(cfg *config.Config, db *pgxpool.Pool, rdb *redis.Client, store storage.Storage, queue *asynq.Client) *gin.Engine {
	r := gin.Default()

	r.Use(middleware.CORS(cfg.CORSAllowedOrigins))
	r.Use(middleware.MaxUploadSize(cfg.MaxUploadSize))

	authSvc := services.NewAuthService(db, rdb, cfg)
	compSvc := services.NewCompanyService(db)
	jobSvc := services.NewJobService(db)
	pSvc := services.NewPipelineService(db)
	appSvc := services.NewApplicationService(db, queue)
	fileSvc := services.NewFileService(db, store)
	reportSvc := services.NewReportService(db)

	authHandler := NewAuthHandler(authSvc)
	companyHandler := NewCompanyHandler(compSvc)
	jobHandler := NewJobHandler(jobSvc, pSvc)
	appHandler := NewApplicationHandler(appSvc, fileSvc)
	fileHandler := NewFileHandler(fileSvc)
	reportHandler := NewReportHandler(reportSvc)

	v1 := r.Group("/api/v1")
	{
		// Auth routes (public, rate-limited)
		auth := v1.Group("/auth", middleware.RateLimit("10-M"))
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.Refresh)
			auth.DELETE("/logout", middleware.Auth(cfg), authHandler.Logout)
		}

		// Protected routes (require JWT)
		protected := v1.Group("", middleware.Auth(cfg))
		{
			protected.GET("/companies/me", companyHandler.GetMe)
			protected.PATCH("/companies/me", companyHandler.UpdateMe)

			// Job management
			protected.POST("/jobs", jobHandler.Create)
			protected.GET("/jobs", jobHandler.List)
			protected.GET("/jobs/:id", jobHandler.Get)
			protected.PATCH("/jobs/:id", jobHandler.Update)
			protected.DELETE("/jobs/:id", jobHandler.Delete)
			protected.GET("/jobs/:id/pipeline", jobHandler.GetPipeline)

			// Application management
			protected.GET("/applications", appHandler.List)
			protected.GET("/applications/:id", appHandler.Get)
			protected.DELETE("/applications/:id", appHandler.Delete)
			protected.PATCH("/applications/:id/stage", appHandler.MoveStage)
			protected.GET("/applications/:id/history", appHandler.ListStageHistory)

			// File management
			protected.GET("/applications/:id/files", fileHandler.List)
			protected.POST("/applications/:id/files", fileHandler.Upload)
			protected.GET("/applications/:id/files/:fid", fileHandler.GetURL)
			protected.DELETE("/applications/:id/files/:fid", fileHandler.Delete)

			// Notes
			protected.POST("/applications/:id/notes", appHandler.AddNote)
			protected.GET("/applications/:id/notes", appHandler.ListNotes)
			protected.DELETE("/applications/:id/notes/:nid", appHandler.DeleteNote)

			// Reports
			protected.GET("/reports/time-to-hire", reportHandler.TimeToHire)
			protected.GET("/reports/conversion", reportHandler.Conversion)
		}

		// Public routes (no auth required)
		v1.GET("/jobs/:id/form-schema", jobHandler.GetFormSchema)
		// Rate-limited: this is an unauthenticated endpoint that accepts file uploads.
		v1.POST("/jobs/:id/apply", middleware.RateLimit("20-M"), appHandler.Apply)
	}

	return r
}
