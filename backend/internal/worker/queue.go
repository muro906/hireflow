package worker

import (
	"encoding/json"

	"github.com/hibiken/asynq"
)

const TypeEmailStageChange = "email:stage_change"

type EmailStageChangePayload struct {
	ApplicationID string `json:"application_id"`
	ToStageID     string `json:"to_stage_id"`
}

func NewEmailStageChangeTask(payload EmailStageChangePayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeEmailStageChange, data), nil
}
