package handlers

import (
\t"net/http"

\t"github.com/gin-gonic/gin"
\t"github.com/hireflow/hireflow/backend/internal/middleware"
\t"github.com/hireflow/hireflow/backend/internal/services"
)

type CompanyHandler struct {
\tsvc *services.CompanyService
}

func NewCompanyHandler(svc *services.CompanyService) *CompanyHandler {
\treturn &CompanyHandler{svc: svc}
}

func (h *CompanyHandler) GetMe(c *gin.Context) {
\tcID, _ := middleware.GetCompanyID(c)
\tcomp, err := h.svc.GetCompany(c.Request.Context(), cID)
\tif err != nil {
\t\tc.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
\t\treturn
\t}
\tc.JSON(http.StatusOK, comp)
}

type updateReq struct {
\tName string `json:"name" binding:"required"`
}

func (h *CompanyHandler) UpdateMe(c *gin.Context) {
\tcID, _ := middleware.GetCompanyID(c)
\tvar req updateReq
\tif err := c.ShouldBindJSON(&req); err != nil {
\t\tc.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
\t\treturn
\t}

\tcomp, err := h.svc.UpdateCompany(c.Request.Context(), cID, req.Name)
\tif err != nil {
\t\tc.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
\t\treturn
\t}
\tc.JSON(http.StatusOK, comp)
}
