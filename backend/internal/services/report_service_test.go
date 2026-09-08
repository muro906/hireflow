package services

import (
	"context"
	"testing"
)

func findStage(t *testing.T, rows []ConversionRow, name string) ConversionRow {
	t.Helper()
	for _, r := range rows {
		if r.StageName == name {
			return r
		}
	}
	t.Fatalf("no conversion row for stage %q in %+v", name, rows)
	return ConversionRow{}
}

// The funnel must count candidates entering the first stage. They get there by
// applying, not by being moved, which the report previously missed entirely —
// the top of the funnel always read zero.
func TestConversionCountsTheFirstStage(t *testing.T) {
	pool := testPool(t)
	f := newFixture(t, pool)
	apps := NewApplicationService(pool, nil)
	reports := NewReportService(pool)
	ctx := context.Background()

	// Four apply; two advance to Screened.
	var ids []string
	for i := 0; i < 4; i++ {
		id := f.apply(t, apps, "C", "c@test.dev")
		ids = append(ids, id.String())
	}
	for i := 0; i < 2; i++ {
		if _, err := pool.Exec(ctx, `
			INSERT INTO stage_history (application_id, from_stage_id, to_stage_id, moved_by)
			VALUES ($1, $2, $3, $4)
		`, ids[i], f.stageIDs[0], f.stageIDs[1], f.userID); err != nil {
			t.Fatalf("move %d: %v", i, err)
		}
	}

	rows, err := reports.GetConversionRates(ctx, f.companyID)
	if err != nil {
		t.Fatalf("conversion: %v", err)
	}

	applied := findStage(t, rows, "Applied")
	if applied.Entered != 4 {
		t.Errorf("Applied entered = %d, want 4", applied.Entered)
	}
	if applied.Exited != 2 {
		t.Errorf("Applied exited = %d, want 2", applied.Exited)
	}
	// conversion_rate is a percentage, not a fraction: consumers render it directly.
	if applied.ConversionRate != 50 {
		t.Errorf("Applied conversion_rate = %v, want 50", applied.ConversionRate)
	}
}

// A company with no applications must produce an empty array rather than null,
// so the chart can read .length without a guard.
func TestReportsAreEmptyNotNull(t *testing.T) {
	pool := testPool(t)
	f := newFixture(t, pool)
	reports := NewReportService(pool)
	ctx := context.Background()

	tth, err := reports.GetTimeToHire(ctx, f.companyID)
	if err != nil {
		t.Fatalf("time to hire: %v", err)
	}
	if tth == nil {
		t.Error("time-to-hire = nil, want an empty slice")
	}
	if len(tth) != 0 {
		t.Errorf("time-to-hire has %d rows, want 0 with nothing hired", len(tth))
	}

	conv, err := reports.GetConversionRates(ctx, f.companyID)
	if err != nil {
		t.Fatalf("conversion: %v", err)
	}
	if conv == nil {
		t.Error("conversion = nil, want an empty slice")
	}
}

func TestReportsAreScopedToCompany(t *testing.T) {
	pool := testPool(t)
	mine := newFixture(t, pool)
	theirs := newFixture(t, pool)
	apps := NewApplicationService(pool, nil)
	reports := NewReportService(pool)
	ctx := context.Background()

	theirs.apply(t, apps, "Theirs", "theirs@test.dev")

	rows, err := reports.GetConversionRates(ctx, mine.companyID)
	if err != nil {
		t.Fatalf("conversion: %v", err)
	}
	applied := findStage(t, rows, "Applied")
	if applied.Entered != 0 {
		t.Errorf("Applied entered = %d, want 0: another tenant's candidates leaked in", applied.Entered)
	}
}
