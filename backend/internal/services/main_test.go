package services

import (
	"context"
	"math/rand"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// randomSuffix keeps fixture names from colliding between runs against a
// database that is not reset in between.
func randomSuffix(t *testing.T) int {
	t.Helper()
	return rand.Intn(1_000_000_000) //nolint:gosec // test fixture naming only
}

// testPool connects to the database named by TEST_DATABASE_URL (falling back to
// DATABASE_URL). Tests that need it skip when it is unset or when -short is
// given, so `make test-short` stays runnable without any infrastructure.
func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		url = os.Getenv("DATABASE_URL")
	}
	if url == "" {
		t.Skip("set TEST_DATABASE_URL or DATABASE_URL to run integration tests")
	}

	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Skipf("database unreachable at %s: %v", url, err)
	}

	t.Cleanup(pool.Close)
	return pool
}
