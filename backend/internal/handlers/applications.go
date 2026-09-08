package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hireflow/hireflow/backend/internal/middleware"
	"github.com/hireflow/hireflow/backend/internal/services"
)

type ApplicationHandler struct {
	svc   *services.ApplicationService
	files *services.FileService
}

func NewApplicationHandler(svc *services.ApplicationService, files *services.FileService) *ApplicationHandler {
	return &ApplicationHandler{svc: svc, files: files}
}

// ─── Apply (public) ────────────────────────────────────────────────────────────

type applyReq struct {
	Name     string          `json:"candidate_name" binding:"required"`
	Email    string          `json:"candidate_email" binding:"required,email"`
	Phone    string          `json:"candidate_phone"`
	FormData json.RawMessage `json:"form_data"`
}

var errUnsupportedCV = errors.New("CV must be a PDF, DOC or DOCX file")

// cvContentTypes are the document types a candidate may attach as a CV.
var cvContentTypes = map[string]bool{
	"application/pdf":    true,
	"application/msword": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
}

var cvExtensions = map[string]bool{".pdf": true, ".doc": true, ".docx": true}

// Apply accepts either a JSON body or, when the candidate attaches a CV, a
// multipart/form-data body carrying the same fields plus a "cv" file part.
func (h *ApplicationHandler) Apply(c *gin.Context) {
	jID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
		return
	}

	var req applyReq
	multipart := strings.HasPrefix(c.ContentType(), "multipart/form-data")

	if multipart {
		req.Name = c.PostForm("candidate_name")
		req.Email = c.PostForm("candidate_email")
		req.Phone = c.PostForm("candidate_phone")
		if fd := c.PostForm("form_data"); fd != "" {
			if !json.Valid([]byte(fd)) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "form_data must be valid JSON"})
				return
			}
			req.FormData = json.RawMessage(fd)
		}
		if req.Name == "" || req.Email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "candidate_name and candidate_email are required"})
			return
		}
	} else if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	app, err := h.svc.Apply(c.Request.Context(), jID, req.Name, req.Email, req.Phone, req.FormData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if multipart {
		if err := h.attachCV(c, app.ID); err != nil {
			// The application is already saved; report the CV failure without
			// discarding it, so the candidate does not silently lose the submission.
			c.JSON(http.StatusCreated, gin.H{"application": app, "cv_error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, app)
}

// attachCV stores the optional "cv" part of a multipart apply request.
func (h *ApplicationHandler) attachCV(c *gin.Context, appID uuid.UUID) error {
	file, header, err := c.Request.FormFile("cv")
	if err != nil {
		return nil // no CV attached — the field is optional at the API level
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !cvContentTypes[contentType] && !cvExtensions[ext] {
		return errUnsupportedCV
	}

	_, err = h.files.UploadForApplication(
		c.Request.Context(), appID, "cv",
		filepath.Base(header.Filename), contentType, header.Size, file,
	)
	return err
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

	apps, total, err := h.svc.List(c.Request.Context(), cID, jobID, stageID, search, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":  apps,
		"total": total,
		"page":  page,
		"limit": limit,
	})
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

// ─── Stage history ────────────────────────────────────────────────────────────

func (h *ApplicationHandler) ListStageHistory(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	aID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application id"})
		return
	}

	entries, err := h.svc.ListStageHistory(c.Request.Context(), cID, aID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, entries)
}
