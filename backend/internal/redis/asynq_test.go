package redis

import (
	"testing"

	"github.com/hibiken/asynq"
	"github.com/hireflow/hireflow/backend/internal/config"
)

// asynq's Addr is a host:port pair. Handing it the raw REDIS_URL made every
// Enqueue fail to dial, silently, so no stage-change email was ever sent.
func TestAsynqOptParsesRedisURL(t *testing.T) {
	opt, err := AsynqOpt(&config.Config{RedisURL: "redis://localhost:6380"})
	if err != nil {
		t.Fatalf("AsynqOpt: %v", err)
	}

	clientOpt, ok := opt.(asynq.RedisClientOpt)
	if !ok {
		t.Fatalf("got %T, want asynq.RedisClientOpt", opt)
	}
	if clientOpt.Addr != "localhost:6380" {
		t.Errorf("Addr = %q, want %q — the scheme must not survive into the dial address", clientOpt.Addr, "localhost:6380")
	}
}

func TestAsynqOptCarriesCredentialsAndDatabase(t *testing.T) {
	opt, err := AsynqOpt(&config.Config{RedisURL: "redis://user:secret@redis.internal:6379/3"})
	if err != nil {
		t.Fatalf("AsynqOpt: %v", err)
	}

	clientOpt, ok := opt.(asynq.RedisClientOpt)
	if !ok {
		t.Fatalf("got %T, want asynq.RedisClientOpt", opt)
	}
	if clientOpt.Addr != "redis.internal:6379" {
		t.Errorf("Addr = %q, want redis.internal:6379", clientOpt.Addr)
	}
	if clientOpt.Password != "secret" {
		t.Errorf("Password = %q, want it carried through", clientOpt.Password)
	}
	if clientOpt.DB != 3 {
		t.Errorf("DB = %d, want 3", clientOpt.DB)
	}
}

func TestAsynqOptRejectsAnInvalidURL(t *testing.T) {
	if _, err := AsynqOpt(&config.Config{RedisURL: "localhost:6380"}); err == nil {
		t.Error("a bare host:port has no scheme and must be rejected loudly, not dialled blindly")
	}
}
