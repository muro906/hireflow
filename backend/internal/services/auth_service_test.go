package services

import (
	"context"
	"fmt"
	"strings"
	"testing"
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
