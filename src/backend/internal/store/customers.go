package store

import (
	"context"
	"database/sql"
	"errors"

	"github.com/Nick-star/opencrm/backend/internal/customer"
	"github.com/Nick-star/opencrm/backend/internal/fault"
	"strings"
)

type Page struct {
	Number, Size          int
	Search, Archived      string
	CustomerID            int64
	Stage, Filter         string
	Now, DayStart, DayEnd string
}

func (p Page) Offset() int { return (p.Number - 1) * p.Size }

const customerColumns = "id,name,email,company,phone,notes,archived,created_at"

type scanner interface{ Scan(...any) error }

func scanCustomer(row scanner) (customer.Customer, error) {
	var c customer.Customer
	err := row.Scan(&c.ID, &c.Name, &c.Email, &c.Company, &c.Phone, &c.Notes, &c.Archived, &c.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return c, fault.NotFound("customer")
	}
	return c, err
}
func (q *Queries) Customer(ctx context.Context, id int64) (customer.Customer, error) {
	return scanCustomer(q.db.QueryRowContext(ctx, "SELECT "+customerColumns+" FROM customers WHERE id=?", id))
}
func (q *Queries) Customers(ctx context.Context, p Page) ([]customer.Customer, int, error) {
	where := " WHERE 1=1"
	args := []any{}
	if p.Archived != "all" {
		where += " AND archived=?"
		args = append(args, p.Archived == "true")
	}
	if p.Search != "" {
		where += " AND instr(unicode_lower(name||' '||email||' '||company),?)>0"
		args = append(args, strings.ToLower(p.Search))
	}
	var total int
	if err := q.db.QueryRowContext(ctx, "SELECT count(*) FROM customers"+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := q.db.QueryContext(ctx, "SELECT "+customerColumns+" FROM customers"+where+" ORDER BY id DESC LIMIT ? OFFSET ?", append(args, p.Size, p.Offset())...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []customer.Customer{}
	for rows.Next() {
		c, err := scanCustomer(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, c)
	}
	return items, total, rows.Err()
}
func (q *Queries) SaveCustomer(ctx context.Context, c customer.Customer) (customer.Customer, error) {
	if c.ID == 0 {
		return scanCustomer(q.db.QueryRowContext(ctx, "INSERT INTO customers(name,email,company,phone,notes) VALUES(?,?,?,?,?) RETURNING "+customerColumns, c.Name, c.Email, c.Company, c.Phone, c.Notes))
	}
	return scanCustomer(q.db.QueryRowContext(ctx, "UPDATE customers SET name=?,email=?,company=?,phone=?,notes=?,archived=? WHERE id=? RETURNING "+customerColumns, c.Name, c.Email, c.Company, c.Phone, c.Notes, c.Archived, c.ID))
}
func (q *Queries) CustomerHasOpenWork(ctx context.Context, id int64) (bool, error) {
	var exists bool
	err := q.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM deals WHERE customer_id=? AND stage NOT IN ('won','lost')) OR EXISTS(SELECT 1 FROM tasks WHERE customer_id=? AND completed=0)`, id, id).Scan(&exists)
	return exists, err
}
