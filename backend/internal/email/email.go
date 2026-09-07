package email

import (
	"context"
)

type StageChangeData struct {
	CandidateName string
	JobTitle      string
	CompanyName   string
	StageName     string
	ToEmail       string
}

type Mailer interface {
	SendStageChange(ctx context.Context, data StageChangeData) error
}
