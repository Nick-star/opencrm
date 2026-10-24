package task

import (
	"github.com/Nick-star/opencrm/backend/internal/fault"
	"strings"
	"time"
	"unicode/utf8"
)

type Task struct {
	ID, CustomerID, DealID  int64
	Title, DueAt, CreatedAt string
	Completed               bool
}

func (t *Task) Validate() error {
	t.Title = strings.TrimSpace(t.Title)
	if n := utf8.RuneCountInString(t.Title); n < 1 || n > 120 {
		return fault.Invalid("title", "title must contain 1 to 120 characters")
	}
	if t.CustomerID < 1 {
		return fault.Invalid("customerId", "customer required")
	}
	if t.DealID < 0 {
		return fault.Invalid("dealId", "invalid deal")
	}
	due, err := time.Parse(time.RFC3339Nano, t.DueAt)
	if err != nil || due.Year() < 1970 || due.Year() > 9999 {
		return fault.Invalid("dueAt", "valid timestamp with offset required")
	}
	t.DueAt = due.UTC().Format(time.RFC3339Nano)
	return nil
}
