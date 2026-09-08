package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hireflow/hireflow/backend/internal/middleware"
	"github.com/hireflow/hireflow/backend/internal/services"
)

type CompanyHandler struct {
	svc *services.CompanyService
}

func NewCompanyHandler(svc *services.CompanyService) *CompanyHandler {
	return &CompanyHandler{svc: svc}
}

func (h *CompanyHandler) GetMe(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	comp, err := h.svc.GetCompany(c.Request.Context(), cID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, comp)
}

type updateReq struct {
	Name string `json:"name" binding:"required"`
}

func (h *CompanyHandler) UpdateMe(c *gin.Context) {
	cID, _ := middleware.GetCompanyID(c)
	var req updateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comp, err := h.svc.UpdateCompany(c.Request.Context(), cID, req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, comp)
}
