package customer

import (
	"github.com/Nick-star/opencrm/backend/internal/fault"
	"net/mail"
	"strings"
	"unicode/utf8"
)

type Customer struct {
	ID                                            int64
	Name, Email, Company, Phone, Notes, CreatedAt string
	Archived                                      bool
}

func (c *Customer) Validate() error {
	c.Name = strings.TrimSpace(c.Name)
	c.Email = strings.TrimSpace(c.Email)
	c.Company = strings.TrimSpace(c.Company)
	c.Phone = strings.TrimSpace(c.Phone)
	if n := utf8.RuneCountInString(c.Name); n < 1 || n > 120 {
		return fault.Invalid("name", "name must contain 1 to 120 characters")
	}
	address, err := mail.ParseAddress(c.Email)
	if err != nil || address.Address != c.Email || len(c.Email) > 254 {
		return fault.Invalid("email", "valid email required")
	}
	if utf8.RuneCountInString(c.Company) > 120 {
		return fault.Invalid("company", "company is too long")
	}
	if utf8.RuneCountInString(c.Phone) > 50 {
		return fault.Invalid("phone", "phone is too long")
	}
	if utf8.RuneCountInString(c.Notes) > 5000 {
		return fault.Invalid("notes", "notes are too long")
	}
	return nil
}
