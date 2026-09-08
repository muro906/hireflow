package handlers

import "testing"

func TestIsAllowedCV(t *testing.T) {
	tests := []struct {
		name        string
		contentType string
		filename    string
		want        bool
	}{
		{"pdf by content type", "application/pdf", "cv.pdf", true},
		{"doc by content type", "application/msword", "cv.doc", true},
		{
			"docx by content type",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"cv.docx", true,
		},
		// Browsers disagree on the type for .doc/.docx, so the extension is a fallback.
		{"unknown type but pdf extension", "application/octet-stream", "cv.pdf", true},
		{"unknown type but docx extension", "", "resume.DOCX", true},
		{"executable rejected", "application/x-msdownload", "payload.exe", false},
		{"image rejected", "image/png", "selfie.png", false},
		{"no extension and no type rejected", "", "resume", false},
		{"double extension uses the last one", "", "cv.pdf.exe", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isAllowedCV(tt.contentType, tt.filename); got != tt.want {
				t.Errorf("isAllowedCV(%q, %q) = %v, want %v", tt.contentType, tt.filename, got, tt.want)
			}
		})
	}
}
