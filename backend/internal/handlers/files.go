package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hireflow/hireflow/backend/internal/middleware"
	"github.com/hireflow/hireflow/backend/internal/services"
)

type FileHandler struct {
	svc *services.FileService
}

func NewFileHandler(svc *services.FileService) *FileHandler {
	return &FileHandler{svc: svc}
}

func (h *FileHandler) Upload(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	aID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid app id"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to get file"})
		return
	}
	defer file.Close()

	fileType := c.DefaultPostForm("file_type", "cv")

	res, err := h.svc.Upload(c.Request.Context(), cID, aID, fileType, header.Filename, header.Header.Get("Content-Type"), header.Size, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, res)
}

func (h *FileHandler) GetURL(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	fID, err := uuid.Parse(c.Param("fid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file id"})
		return
	}

	url, err := h.svc.GetPresignedURL(c.Request.Context(), cID, fID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Redirect(http.StatusTemporaryRedirect, url)
}

func (h *FileHandler) Delete(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	fID, err := uuid.Parse(c.Param("fid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file id"})
		return
	}

	if err := h.svc.Delete(c.Request.Context(), cID, fID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
