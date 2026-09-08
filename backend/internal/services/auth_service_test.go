package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/hireflow/hireflow/backend/internal/config"
)

func TestSlugify(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"Acme", "acme"},
		{"Acme Inc", "acme-inc"},
		{"Acme, Inc.", "acme-inc"},
		{"  Spaced   Out  ", "spaced-out"},
		{"Ünïcödé Ltd", "n-c-d-ltd"},
		{"Hyphen--Heavy", "hyphen-heavy"},
		{"---leading and trailing---", "leading-and-trailing"},
		{"Numbers 123 OK", "numbers-123-ok"},
		// A name of only stripped characters still needs a usable slug.
		{"!!!", "company"},
		{"", "company"},
	}

	for _, tt := range tests {
		t.Run(tt.in, func(t *testing.T) {
			got := slugify(tt.in)
			if got != tt.want {
				t.Errorf("slugify(%q) = %q, want %q", tt.in, got, tt.want)
			}
			if strings.HasPrefix(got, "-") || strings.HasSuffix(got, "-") {
				t.Errorf("slugify(%q) = %q: must not start or end with a hyphen", tt.in, got)
			}
		})
	}
}

// Company names are not unique across tenants, so repeated registrations of the
// same name must each get their own slug rather than colliding on the unique index.
func TestUniqueSlugDeduplicates(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()

	base := fmt.Sprintf("slugtest-%d", randomSuffix(t))

	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // rolled back to keep the test isolated

	var got []string
	for i := 0; i < 3; i++ {
		slug, err := uniqueSlug(ctx, tx, base)
		if err != nil {
			t.Fatalf("uniqueSlug: %v", err)
		}
		got = append(got, slug)

		if _, err := tx.Exec(ctx,
			"INSERT INTO companies (name, slug) VALUES ($1, $2)", "Slug Test", slug,
		); err != nil {
			t.Fatalf("insert company %d: %v", i, err)
		}
	}

	want := []string{base, base + "-2", base + "-3"}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("slug %d = %q, want %q", i, got[i], want[i])
		}
	}
}

func TestUniqueSlugLeavesFreeBaseAlone(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()

	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // rolled back to keep the test isolated

	base := fmt.Sprintf("unused-%d", randomSuffix(t))
	slug, err := uniqueSlug(ctx, tx, base)
	if err != nil {
		t.Fatalf("uniqueSlug: %v", err)
	}
	if slug != base {
		t.Errorf("uniqueSlug(%q) = %q, want the base slug unchanged", base, slug)
	}
}

// newAuthService builds an AuthService against the test database. Redis is
// required for refresh tokens, so tests needing it skip when it is unreachable.
func newAuthService(t *testing.T, pool *pgxpool.Pool) *AuthService {
	t.Helper()

	url := os.Getenv("REDIS_URL")
	if url == "" {
		url = "redis://localhost:6380"
	}
	opt, err := redis.ParseURL(url)
	if err != nil {
		t.Skipf("bad REDIS_URL %q: %v", url, err)
	}
	rdb := redis.NewClient(opt)
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		t.Skipf("redis unreachable at %s: %v", url, err)
	}
	t.Cleanup(func() { rdb.Close() })

	return NewAuthService(pool, rdb, &config.Config{JWTSecret: "test-secret-not-used-in-production"})
}

func cleanupCompanyOf(t *testing.T, pool *pgxpool.Pool, companyID uuid.UUID) {
	t.Helper()
	t.Cleanup(func() {
		if _, err := pool.Exec(context.Background(), "DELETE FROM companies WHERE id = $1", companyID); err != nil {
			t.Errorf("cleanup company: %v", err)
		}
	})
}

// Registering an address twice used to succeed and create an account that could
// never log in: login resolves an address to one user, and it was always the
// other one.
func TestRegisterRejectsDuplicateEmail(t *testing.T) {
	pool := testPool(t)
	svc := newAuthService(t, pool)
	ctx := context.Background()

	email := fmt.Sprintf("dup-%d@test.dev", randomSuffix(t))

	user, _, _, err := svc.Register(ctx, "Alpha Corp", email, "supersecret123", "A")
	if err != nil {
		t.Fatalf("first register: %v", err)
	}
	cleanupCompanyOf(t, pool, user.CompanyID)

	// Registration inserts the company before the user, so a rejection has to
	// roll the company back rather than orphan it.
	var before int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM companies").Scan(&before); err != nil {
		t.Fatalf("count companies: %v", err)
	}

	_, _, _, err = svc.Register(ctx, "Beta Corp", email, "differentpw456", "B")
	if !errors.Is(err, ErrEmailTaken) {
		t.Fatalf("second register error = %v, want ErrEmailTaken", err)
	}

	var after int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM companies").Scan(&after); err != nil {
		t.Fatalf("count companies: %v", err)
	}
	if after != before {
		t.Errorf("company count went %d -> %d; the rejected registration was not rolled back", before, after)
	}
}

// Uniqueness is on the lowercased address, so case cannot be used to slip past it.
func TestRegisterEmailUniquenessIgnoresCase(t *testing.T) {
	pool := testPool(t)
	svc := newAuthService(t, pool)
	ctx := context.Background()

	email := fmt.Sprintf("Case-%d@Test.dev", randomSuffix(t))

	user, _, _, err := svc.Register(ctx, "Alpha Corp", email, "supersecret123", "A")
	if err != nil {
		t.Fatalf("first register: %v", err)
	}
	cleanupCompanyOf(t, pool, user.CompanyID)

	_, _, _, err = svc.Register(ctx, "Beta Corp", strings.ToLower(email), "differentpw456", "B")
	if !errors.Is(err, ErrEmailTaken) {
		t.Errorf("lowercased duplicate error = %v, want ErrEmailTaken", err)
	}
}

func TestLoginReturnsTheRegisteredAccount(t *testing.T) {
	pool := testPool(t)
	svc := newAuthService(t, pool)
	ctx := context.Background()

	email := fmt.Sprintf("login-%d@test.dev", randomSuffix(t))
	registered, _, _, err := svc.Register(ctx, "Alpha Corp", email, "supersecret123", "A")
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	cleanupCompanyOf(t, pool, registered.CompanyID)

	user, access, refresh, err := svc.Login(ctx, email, "supersecret123")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if user.ID != registered.ID {
		t.Errorf("logged into user %v, want %v", user.ID, registered.ID)
	}
	if access == "" || refresh == "" {
		t.Error("login must return both tokens")
	}

	if _, _, _, err := svc.Login(ctx, email, "wrong-password"); err == nil {
		t.Error("login accepted the wrong password")
	}
}

// Refresh rotates: the presented token must not remain usable afterwards.
func TestRefreshRotatesAndInvalidatesTheOldToken(t *testing.T) {
	pool := testPool(t)
	svc := newAuthService(t, pool)
	ctx := context.Background()

	email := fmt.Sprintf("refresh-%d@test.dev", randomSuffix(t))
	user, _, refresh, err := svc.Register(ctx, "Alpha Corp", email, "supersecret123", "A")
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	cleanupCompanyOf(t, pool, user.CompanyID)

	_, newRefresh, err := svc.Refresh(ctx, refresh)
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	if newRefresh == refresh {
		t.Error("refresh returned the same token; it must rotate")
	}

	if _, _, err := svc.Refresh(ctx, refresh); err == nil {
		t.Error("the old refresh token still works after rotation")
	}
}

func TestLogoutInvalidatesTheRefreshToken(t *testing.T) {
	pool := testPool(t)
	svc := newAuthService(t, pool)
	ctx := context.Background()

	email := fmt.Sprintf("logout-%d@test.dev", randomSuffix(t))
	user, _, refresh, err := svc.Register(ctx, "Alpha Corp", email, "supersecret123", "A")
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	cleanupCompanyOf(t, pool, user.CompanyID)

	if err := svc.Logout(ctx, refresh); err != nil {
		t.Fatalf("logout: %v", err)
	}
	if _, _, err := svc.Refresh(ctx, refresh); err == nil {
		t.Error("refresh token still works after logout")
	}
}
