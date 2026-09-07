package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetUserID(c *gin.Context) (uuid.UUID, bool) {
	val, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, false
	}
	str, ok := val.(string)
	if !ok {
		return uuid.Nil, false
	}
	uid, err := uuid.Parse(str)
	if err != nil {
		return uuid.Nil, false
	}
	return uid, true
}

func GetCompanyID(c *gin.Context) (uuid.UUID, bool) {
	val, exists := c.Get("company_id")
	if !exists {
		return uuid.Nil, false
	}
	str, ok := val.(string)
	if !ok {
		return uuid.Nil, false
	}
	uid, err := uuid.Parse(str)
	if err != nil {
		return uuid.Nil, false
	}
	return uid, true
}
