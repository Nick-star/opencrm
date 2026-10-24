package store

import (
	"context"
	"database/sql"
	"errors"
	"github.com/Nick-star/opencrm/backend/internal/deal"
	"github.com/Nick-star/opencrm/backend/internal/fault"
	"strings"
)

const dealColumns = "id,customer_id,title,amount_minor,stage,description,created_at"

func scanDeal(row scanner) (deal.Deal, error) {
	var d deal.Deal
	err := row.Scan(&d.ID, &d.CustomerID, &d.Title, &d.AmountMinor, &d.Stage, &d.Description, &d.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return d, fault.NotFound("deal")
	}
	return d, err
}
func (q *Queries) Deal(ctx context.Context, id int64) (deal.Deal, error) {
	return scanDeal(q.db.QueryRowContext(ctx, "SELECT "+dealColumns+" FROM deals WHERE id=?", id))
}
func (q *Queries) Deals(ctx context.Context, p Page) ([]deal.Deal, int, error) {
	where := " WHERE 1=1"
	args := []any{}
	if p.CustomerID != 0 {
		where += " AND customer_id=?"
		args = append(args, p.CustomerID)
	}
	if p.Stage != "" {
		where += " AND stage=?"
		args = append(args, p.Stage)
	}
	if p.Search != "" {
		where += " AND instr(unicode_lower(title),?)>0"
		args = append(args, strings.ToLower(p.Search))
	}
	var total int
	if err := q.db.QueryRowContext(ctx, "SELECT count(*) FROM deals"+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := q.db.QueryContext(ctx, "SELECT "+dealColumns+" FROM deals"+where+" ORDER BY id DESC LIMIT ? OFFSET ?", append(args, p.Size, p.Offset())...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []deal.Deal{}
	for rows.Next() {
		d, err := scanDeal(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, d)
	}
	return items, total, rows.Err()
}
func (q *Queries) SaveDeal(ctx context.Context, d deal.Deal) (deal.Deal, error) {
	if d.ID == 0 {
		return scanDeal(q.db.QueryRowContext(ctx, "INSERT INTO deals(customer_id,title,amount_minor,stage,description) VALUES(?,?,?,?,?) RETURNING "+dealColumns, d.CustomerID, d.Title, d.AmountMinor, d.Stage, d.Description))
	}
	return scanDeal(q.db.QueryRowContext(ctx, "UPDATE deals SET title=?,amount_minor=?,stage=?,description=? WHERE id=? RETURNING "+dealColumns, d.Title, d.AmountMinor, d.Stage, d.Description, d.ID))
}
