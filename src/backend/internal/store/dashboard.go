package store

import "context"

type Dashboard struct {
	ActiveCustomers, OpenDeals, WonDeals int
	OpenAmountMinor, WonAmountMinor      int64
}

func (q *Queries) Dashboard(ctx context.Context) (Dashboard, error) {
	var d Dashboard
	err := q.db.QueryRowContext(ctx, `SELECT (SELECT count(*) FROM customers WHERE archived=0),coalesce(sum(CASE WHEN stage NOT IN ('won','lost') THEN 1 ELSE 0 END),0),coalesce(sum(CASE WHEN stage='won' THEN 1 ELSE 0 END),0),coalesce(sum(CASE WHEN stage NOT IN ('won','lost') THEN amount_minor ELSE 0 END),0),coalesce(sum(CASE WHEN stage='won' THEN amount_minor ELSE 0 END),0) FROM deals`).Scan(&d.ActiveCustomers, &d.OpenDeals, &d.WonDeals, &d.OpenAmountMinor, &d.WonAmountMinor)
	return d, err
}
