package main

import (
	"strings"
	"testing"

	"github.com/hireflow/hireflow/backend/internal/config"
)

// EMAIL_PROVIDER is documented in the README and set in .env, but the worker
// hardcoded SMTP, so selecting Resend silently did nothing.
func TestNewMailerHonoursEmailProvider(t *testing.T) {
	// Templates are resolved relative to the backend root, which is two levels up.
	t.Chdir("../..")

	tests := []struct {
		provider string
		wantErr  bool
	}{
		{"smtp", false},
		{"resend", false},
		{"SMTP", false},     // case-insensitive
		{" resend ", false}, // tolerant of stray whitespace
		{"", false},         // defaults to smtp
		{"sendgrid", true},
	}

	for _, tt := range tests {
		t.Run("provider="+tt.provider, func(t *testing.T) {
			mailer, err := newMailer(&config.Config{EmailProvider: tt.provider})
			if tt.wantErr {
				if err == nil {
					t.Fatalf("newMailer(%q) succeeded, want an error naming the valid providers", tt.provider)
				}
				if !strings.Contains(err.Error(), "smtp") || !strings.Contains(err.Error(), "resend") {
					t.Errorf("error %q should name the supported providers", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("newMailer(%q): %v", tt.provider, err)
			}
			if mailer == nil {
				t.Errorf("newMailer(%q) returned a nil mailer", tt.provider)
			}
		})
	}
}
