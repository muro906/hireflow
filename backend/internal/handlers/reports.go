package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hireflow/hireflow/backend/internal/middleware"
	"github.com/hireflow/hireflow/backend/internal/services"
)

type ReportHandler struct {
	svc *services.ReportService
}

func NewReportHandler(svc *services.ReportService) *ReportHandler {
	return &ReportHandler{svc: svc}
}

func (h *ReportHandler) TimeToHire(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	res, err := h.svc.GetTimeToHire(c.Request.Context(), cID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *ReportHandler) Conversion(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	res, err := h.svc.GetConversionRates(c.Request.Context(), cID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}
