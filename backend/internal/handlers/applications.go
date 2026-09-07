package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hireflow/hireflow/backend/internal/middleware"
	"github.com/hireflow/hireflow/backend/internal/services"
)

type ApplicationHandler struct {
	svc *services.ApplicationService
}

func NewApplicationHandler(svc *services.ApplicationService) *ApplicationHandler {
	return &ApplicationHandler{svc: svc}
}

// ─── Apply (public) ────────────────────────────────────────────────────────────

type applyReq struct {
	Name     string          `json:"candidate_name" binding:"required"`
	Email    string          `json:"candidate_email" binding:"required,email"`
	Phone    string          `json:"candidate_phone"`
	FormData json.RawMessage `json:"form_data"`
}

func (h *ApplicationHandler) Apply(c *gin.Context) {
	jID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
		return
	}

	var req applyReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	app, err := h.svc.Apply(c.Request.Context(), jID, req.Name, req.Email, req.Phone, req.FormData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, app)
}

// ─── List ─────────────────────────────────────────────────────────────────────

func (h *ApplicationHandler) List(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)

	jobID := c.Query("job_id")
	stageID := c.Query("stage_id")
	search := c.Query("search")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	apps, err := h.svc.List(c.Request.Context(), cID, jobID, stageID, search, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, apps)
}

// ─── Get ──────────────────────────────────────────────────────────────────────

func (h *ApplicationHandler) Get(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	aID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application id"})
		return
	}

	app, err := h.svc.Get(c.Request.Context(), cID, aID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "application not found"})
		return
	}
	c.JSON(http.StatusOK, app)
}

// ─── Delete ───────────────────────────────────────────────────────────────────

func (h *ApplicationHandler) Delete(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	aID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application id"})
		return
	}

	if err := h.svc.Delete(c.Request.Context(), cID, aID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ─── Stage move ───────────────────────────────────────────────────────────────

type moveReq struct {
	StageID uuid.UUID `json:"stage_id" binding:"required"`
}

func (h *ApplicationHandler) MoveStage(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	uID, _ := middleware.GetUserID(c)
	aID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid app id"})
		return
	}

	var req moveReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.MoveStage(c.Request.Context(), cID, uID, aID, req.StageID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ─── Notes ────────────────────────────────────────────────────────────────────

type noteReq struct {
	Body string `json:"body" binding:"required"`
}

func (h *ApplicationHandler) AddNote(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	uID, _ := middleware.GetUserID(c)
	aID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application id"})
		return
	}

	var req noteReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	note, err := h.svc.AddNote(c.Request.Context(), cID, uID, aID, req.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, note)
}

func (h *ApplicationHandler) ListNotes(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	aID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application id"})
		return
	}

	notes, err := h.svc.ListNotes(c.Request.Context(), cID, aID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, notes)
}

func (h *ApplicationHandler) DeleteNote(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	uID, _ := middleware.GetUserID(c)
	nID, err := uuid.Parse(c.Param("nid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid note id"})
		return
	}

	if err := h.svc.DeleteNote(c.Request.Context(), cID, uID, nID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
