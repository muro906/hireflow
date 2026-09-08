package redis

import (
	"fmt"

	"github.com/hibiken/asynq"
	"github.com/hireflow/hireflow/backend/internal/config"
)

// AsynqOpt converts REDIS_URL into asynq connection options.
//
// asynq's RedisClientOpt.Addr is a host:port pair, not a URL. Passing the raw
// REDIS_URL made every Enqueue fail to dial, and because enqueueing is
// best-effort the failure was silent: no stage-change email was ever sent.
func AsynqOpt(cfg *config.Config) (asynq.RedisConnOpt, error) {
	opt, err := asynq.ParseRedisURI(cfg.RedisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid redis url %q: %w", cfg.RedisURL, err)
	}
	return opt, nil
}
