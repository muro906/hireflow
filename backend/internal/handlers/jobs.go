package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hireflow/hireflow/backend/internal/middleware"
	"github.com/hireflow/hireflow/backend/internal/services"
)

type JobHandler struct {
	svc  *services.JobService
	pSvc *services.PipelineService
}

func NewJobHandler(svc *services.JobService, pSvc *services.PipelineService) *JobHandler {
	return &JobHandler{svc: svc, pSvc: pSvc}
}

// ─── Create ───────────────────────────────────────────────────────────────────

type createJobReq struct {
	Title          string          `json:"title" binding:"required"`
	Description    string          `json:"description"`
	Location       string          `json:"location"`
	EmploymentType string          `json:"employment_type"`
	FormSchema     json.RawMessage `json:"form_schema"`
}

func (h *JobHandler) Create(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)

	var req createJobReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	job, err := h.svc.CreateJob(c.Request.Context(), cID, req.Title, req.Description, req.Location, req.EmploymentType, req.FormSchema)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, job)
}

// ─── List ─────────────────────────────────────────────────────────────────────

func (h *JobHandler) List(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	status := c.Query("status") // optional filter

	jobs, err := h.svc.GetJobs(c.Request.Context(), cID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, jobs)
}

// ─── Get ──────────────────────────────────────────────────────────────────────

func (h *JobHandler) Get(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	jID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
		return
	}

	job, err := h.svc.GetJob(c.Request.Context(), cID, jID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
		return
	}
	c.JSON(http.StatusOK, job)
}

// ─── Update ───────────────────────────────────────────────────────────────────

type updateJobReq struct {
	Title          *string         `json:"title"`
	Description    *string         `json:"description"`
	Location       *string         `json:"location"`
	EmploymentType *string         `json:"employment_type"`
	Status         *string         `json:"status"`
	FormSchema     json.RawMessage `json:"form_schema"`
}

func (h *JobHandler) Update(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	jID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
		return
	}

	var req updateJobReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	job, err := h.svc.UpdateJob(c.Request.Context(), cID, jID, req.Title, req.Description, req.Location, req.EmploymentType, req.Status, req.FormSchema)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, job)
}

// ─── Delete ───────────────────────────────────────────────────────────────────

func (h *JobHandler) Delete(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	jID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
		return
	}

	if err := h.svc.DeleteJob(c.Request.Context(), cID, jID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ─── GetFormSchema (public) ───────────────────────────────────────────────────

func (h *JobHandler) GetFormSchema(c *gin.Context) {
	jID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
		return
	}

	// Public endpoint: fetch form schema + job title for display
	schema, title, err := h.svc.GetPublicFormSchema(c.Request.Context(), jID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"job_id":      jID,
		"job_title":   title,
		"form_schema": schema,
	})
}

// ─── GetPipeline ──────────────────────────────────────────────────────────────

func (h *JobHandler) GetPipeline(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	jID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
		return
	}

	res, err := h.pSvc.GetPipeline(c.Request.Context(), cID, jID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}
