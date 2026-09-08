package email

import (
	"strings"
	"testing"

	"github.com/hireflow/hireflow/backend/internal/config"
)

func TestFromAddress(t *testing.T) {
	tests := []struct {
		name string
		cfg  *config.Config
		want string
	}{
		{
			"name and address",
			&config.Config{EmailFrom: "noreply@hireflow.local", EmailFromName: "HireFlow"},
			`"HireFlow" <noreply@hireflow.local>`,
		},
		{
			"address only when no name is configured",
			&config.Config{EmailFrom: "noreply@hireflow.local"},
			"noreply@hireflow.local",
		},
		{
			"a name needing quoting is escaped, not injected",
			&config.Config{EmailFrom: "noreply@hireflow.local", EmailFromName: `Ac"me, Inc.`},
			`"Ac\"me, Inc." <noreply@hireflow.local>`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := fromAddress(tt.cfg); got != tt.want {
				t.Errorf("fromAddress() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestStageChangeSubject(t *testing.T) {
	if got, want := stageChangeSubject("Backend Engineer"), "Update on your application for Backend Engineer"; got != want {
		t.Errorf("subject = %q, want %q", got, want)
	}

	// A non-ASCII job title must be encoded rather than placed raw in a header.
	got := stageChangeSubject("Ingénieur Systèmes")
	if strings.ContainsAny(got, "éè") {
		t.Errorf("subject = %q, want the non-ASCII characters encoded", got)
	}
	if !strings.HasPrefix(got, "=?UTF-8?") {
		t.Errorf("subject = %q, want an RFC 2047 encoded-word", got)
	}

	// A header value must never contain a newline: that would let a crafted job
	// title inject extra headers.
	if strings.ContainsAny(got, "\r\n") {
		t.Errorf("subject = %q contains a line break", got)
	}
}

func TestStageChangeSubjectRejectsHeaderInjection(t *testing.T) {
	got := stageChangeSubject("Engineer\r\nBcc: attacker@evil.test")
	if strings.Contains(got, "\r") || strings.Contains(got, "\n") {
		t.Errorf("subject = %q still contains a line break; header injection is possible", got)
	}
}
