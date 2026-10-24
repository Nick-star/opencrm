package deal

import (
	"github.com/Nick-star/opencrm/backend/internal/fault"
	"slices"
	"strings"
	"unicode/utf8"
)

const MaxAmountMinor int64 = 1000000000000

type Deal struct {
	ID, CustomerID, AmountMinor          int64
	Title, Stage, Description, CreatedAt string
}

func ValidStage(stage string) bool {
	return slices.Contains([]string{"new", "negotiation", "proposal", "won", "lost"}, stage)
}
func (d Deal) Closed() bool { return d.Stage == "won" || d.Stage == "lost" }
func (d *Deal) Validate() error {
	d.Title = strings.TrimSpace(d.Title)
	if n := utf8.RuneCountInString(d.Title); n < 1 || n > 120 {
		return fault.Invalid("title", "title must contain 1 to 120 characters")
	}
	if d.CustomerID < 1 {
		return fault.Invalid("customerId", "customer required")
	}
	if d.AmountMinor < 0 || d.AmountMinor > MaxAmountMinor {
		return fault.Invalid("amountMinor", "invalid amount")
	}
	if !ValidStage(d.Stage) {
		return fault.Invalid("stage", "invalid stage")
	}
	if utf8.RuneCountInString(d.Description) > 5000 {
		return fault.Invalid("description", "description is too long")
	}
	return nil
}
func (d *Deal) ChangeStage(stage string) error {
	if !ValidStage(stage) {
		return fault.Invalid("stage", "invalid stage")
	}
	if d.Closed() && stage != d.Stage {
		return fault.Conflict("closed deal must be reopened")
	}
	d.Stage = stage
	return nil
}
func (d *Deal) Reopen() error {
	if !d.Closed() {
		return fault.Conflict("only closed deals can be reopened")
	}
	d.Stage = "new"
	return nil
}
