package services

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// fixture is a company with one job, its pipeline stages and an admin user.
type fixture struct {
	companyID uuid.UUID
	userID    uuid.UUID
	jobID     uuid.UUID
	stageIDs  []uuid.UUID
}

// newFixture builds an isolated tenant. Everything cascades from the company row,
// so cleanup is a single delete.
func newFixture(t *testing.T, pool *pgxpool.Pool) fixture {
	t.Helper()
	ctx := context.Background()

	n := randomSuffix(t)
	var f fixture

	if err := pool.QueryRow(ctx,
		"INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id",
		"Fixture Co", fmt.Sprintf("fixture-%d", n),
	).Scan(&f.companyID); err != nil {
		t.Fatalf("insert company: %v", err)
	}

	t.Cleanup(func() {
		ctx := context.Background()
		// stage_history.moved_by references users with no ON DELETE CASCADE, so
		// applications (which do cascade to stage_history) must go first.
		if _, err := pool.Exec(ctx,
			"DELETE FROM applications WHERE job_id IN (SELECT id FROM jobs WHERE company_id = $1)", f.companyID,
		); err != nil {
			t.Errorf("cleanup applications: %v", err)
		}
		if _, err := pool.Exec(ctx, "DELETE FROM companies WHERE id = $1", f.companyID); err != nil {
			t.Errorf("cleanup company: %v", err)
		}
	})

	if err := pool.QueryRow(ctx, `
		INSERT INTO users (company_id, email, password_hash, full_name, role)
		VALUES ($1, $2, 'x', 'Test Recruiter', 'admin') RETURNING id
	`, f.companyID, fmt.Sprintf("rec-%d@fixture.test", n)).Scan(&f.userID); err != nil {
		t.Fatalf("insert user: %v", err)
	}

	if err := pool.QueryRow(ctx, `
		INSERT INTO jobs (company_id, title, description, location, employment_type, status, form_schema)
		VALUES ($1, 'Engineer', '', 'Remote', 'full-time', 'open', '{"fields":[]}') RETURNING id
	`, f.companyID).Scan(&f.jobID); err != nil {
		t.Fatalf("insert job: %v", err)
	}

	for i, name := range []string{"Applied", "Screened"} {
		var id uuid.UUID
		if err := pool.QueryRow(ctx, `
			INSERT INTO pipeline_stages (company_id, job_id, name, position, color, is_terminal)
			VALUES ($1, $2, $3, $4, '#6366f1', false) RETURNING id
		`, f.companyID, f.jobID, name, i).Scan(&id); err != nil {
			t.Fatalf("insert stage %s: %v", name, err)
		}
		f.stageIDs = append(f.stageIDs, id)
	}

	return f
}

func (f fixture) apply(t *testing.T, s *ApplicationService, name, email string) uuid.UUID {
	t.Helper()
	app, err := s.Apply(context.Background(), f.jobID, name, email, "", json.RawMessage(`{}`))
	if err != nil {
		t.Fatalf("apply %s: %v", name, err)
	}
	return app.ID
}

// Apply must place a candidate in the first pipeline stage by position.
func TestApplyUsesFirstStage(t *testing.T) {
	pool := testPool(t)
	f := newFixture(t, pool)
	svc := NewApplicationService(pool, nil)

	app, err := svc.Apply(context.Background(), f.jobID, "Ada", "ada@test.dev", "+1555", json.RawMessage(`{"yrs":"7"}`))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}

	if app.StageID != f.stageIDs[0] {
		t.Errorf("stage = %v, want first stage %v", app.StageID, f.stageIDs[0])
	}
	if app.CandidateName != "Ada" || app.CandidateEmail != "ada@test.dev" {
		t.Errorf("candidate = %q/%q, want Ada/ada@test.dev", app.CandidateName, app.CandidateEmail)
	}
}

// Apply must tolerate an empty form_data body rather than writing invalid JSON.
func TestApplyDefaultsEmptyFormData(t *testing.T) {
	pool := testPool(t)
	f := newFixture(t, pool)
	svc := NewApplicationService(pool, nil)

	app, err := svc.Apply(context.Background(), f.jobID, "Grace", "grace@test.dev", "", nil)
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	if got := string(app.FormData); got != "{}" {
		t.Errorf("form_data = %q, want {}", got)
	}
}

// The total must count every match, not just the rows on the current page —
// this is what the applicant list paginates on.
func TestListTotalIsIndependentOfPageSize(t *testing.T) {
	pool := testPool(t)
	f := newFixture(t, pool)
	svc := NewApplicationService(pool, nil)

	for i := 0; i < 5; i++ {
		f.apply(t, svc, fmt.Sprintf("Cand %d", i), fmt.Sprintf("c%d@test.dev", i))
	}

	apps, total, err := svc.List(context.Background(), f.companyID, "", "", "", 1, 2)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 5 {
		t.Errorf("total = %d, want 5", total)
	}
	if len(apps) != 2 {
		t.Errorf("returned %d rows, want 2 (the page size)", len(apps))
	}

	// The last page is partial; the total must not change with it.
	apps, total, err = svc.List(context.Background(), f.companyID, "", "", "", 3, 2)
	if err != nil {
		t.Fatalf("list page 3: %v", err)
	}
	if total != 5 {
		t.Errorf("page 3 total = %d, want 5", total)
	}
	if len(apps) != 1 {
		t.Errorf("page 3 returned %d rows, want 1", len(apps))
	}
}

func TestListTotalRespectsSearch(t *testing.T) {
	pool := testPool(t)
	f := newFixture(t, pool)
	svc := NewApplicationService(pool, nil)

	f.apply(t, svc, "Ada Lovelace", "ada@test.dev")
	f.apply(t, svc, "Grace Hopper", "grace@test.dev")
	f.apply(t, svc, "Alan Turing", "alan@test.dev")

	apps, total, err := svc.List(context.Background(), f.companyID, "", "", "grace", 1, 20)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 1 {
		t.Errorf("search total = %d, want 1", total)
	}
	if len(apps) != 1 || apps[0].CandidateName != "Grace Hopper" {
		t.Errorf("search returned %v, want only Grace Hopper", apps)
	}
}

// Tenants must never see each other's applications.
func TestListIsScopedToCompany(t *testing.T) {
	pool := testPool(t)
	mine := newFixture(t, pool)
	theirs := newFixture(t, pool)
	svc := NewApplicationService(pool, nil)

	mine.apply(t, svc, "Mine", "mine@test.dev")
	theirs.apply(t, svc, "Theirs", "theirs@test.dev")

	apps, total, err := svc.List(context.Background(), mine.companyID, "", "", "", 1, 20)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 1 || len(apps) != 1 {
		t.Fatalf("total = %d with %d rows, want exactly my own application", total, len(apps))
	}
	if apps[0].CandidateName != "Mine" {
		t.Errorf("got %q, want only my own candidate", apps[0].CandidateName)
	}
}

// The applicant timeline renders names, so history must resolve them — including
// a null from_stage for the first move.
func TestListStageHistoryResolvesNames(t *testing.T) {
	pool := testPool(t)
	f := newFixture(t, pool)
	svc := NewApplicationService(pool, nil)
	ctx := context.Background()

	appID := f.apply(t, svc, "Ada", "ada@test.dev")

	if _, err := pool.Exec(ctx, `
		INSERT INTO stage_history (application_id, from_stage_id, to_stage_id, moved_by)
		VALUES ($1, $2, $3, $4)
	`, appID, f.stageIDs[0], f.stageIDs[1], f.userID); err != nil {
		t.Fatalf("insert history: %v", err)
	}

	entries, err := svc.ListStageHistory(ctx, f.companyID, appID)
	if err != nil {
		t.Fatalf("history: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("got %d entries, want 1", len(entries))
	}

	e := entries[0]
	if e.FromStageName == nil || *e.FromStageName != "Applied" {
		t.Errorf("from_stage_name = %v, want Applied", e.FromStageName)
	}
	if e.ToStageName != "Screened" {
		t.Errorf("to_stage_name = %q, want Screened", e.ToStageName)
	}
	if e.MovedByName != "Test Recruiter" {
		t.Errorf("moved_by_name = %q, want Test Recruiter", e.MovedByName)
	}
}

// An application with no moves yet must return an empty list, not null, so the
// frontend can map over it directly.
func TestListStageHistoryEmptyIsNotNull(t *testing.T) {
	pool := testPool(t)
	f := newFixture(t, pool)
	svc := NewApplicationService(pool, nil)

	appID := f.apply(t, svc, "Fresh", "fresh@test.dev")

	entries, err := svc.ListStageHistory(context.Background(), f.companyID, appID)
	if err != nil {
		t.Fatalf("history: %v", err)
	}
	if entries == nil {
		t.Error("history = nil, want an empty slice so it serialises as []")
	}
	if len(entries) != 0 {
		t.Errorf("got %d entries, want 0", len(entries))
	}
}

// History is company-scoped: another tenant must not be able to read it.
func TestListStageHistoryIsScopedToCompany(t *testing.T) {
	pool := testPool(t)
	mine := newFixture(t, pool)
	theirs := newFixture(t, pool)
	svc := NewApplicationService(pool, nil)
	ctx := context.Background()

	appID := mine.apply(t, svc, "Ada", "ada@test.dev")
	if _, err := pool.Exec(ctx, `
		INSERT INTO stage_history (application_id, from_stage_id, to_stage_id, moved_by)
		VALUES ($1, $2, $3, $4)
	`, appID, mine.stageIDs[0], mine.stageIDs[1], mine.userID); err != nil {
		t.Fatalf("insert history: %v", err)
	}

	entries, err := svc.ListStageHistory(ctx, theirs.companyID, appID)
	if err != nil {
		t.Fatalf("history: %v", err)
	}
	if len(entries) != 0 {
		t.Errorf("other tenant read %d history entries, want 0", len(entries))
	}
}
