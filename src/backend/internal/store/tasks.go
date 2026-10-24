package store

import (
	"context"
	"database/sql"
	"errors"
	"github.com/Nick-star/opencrm/backend/internal/fault"
	"github.com/Nick-star/opencrm/backend/internal/task"
)

const taskColumns = "id,customer_id,deal_id,title,due_at,completed,created_at"

func scanTask(row scanner) (task.Task, error) {
	var t task.Task
	var related sql.NullInt64
	err := row.Scan(&t.ID, &t.CustomerID, &related, &t.Title, &t.DueAt, &t.Completed, &t.CreatedAt)
	t.DealID = related.Int64
	if errors.Is(err, sql.ErrNoRows) {
		return t, fault.NotFound("task")
	}
	return t, err
}
func (q *Queries) Task(ctx context.Context, id int64) (task.Task, error) {
	return scanTask(q.db.QueryRowContext(ctx, "SELECT "+taskColumns+" FROM tasks WHERE id=?", id))
}
func (q *Queries) Tasks(ctx context.Context, p Page) ([]task.Task, int, error) {
	where := " WHERE 1=1"
	args := []any{}
	if p.CustomerID != 0 {
		where += " AND customer_id=?"
		args = append(args, p.CustomerID)
	}
	switch p.Filter {
	case "today":
		where += " AND completed=0 AND julianday(due_at)>=julianday(?) AND julianday(due_at)<julianday(?)"
		args = append(args, p.DayStart, p.DayEnd)
	case "overdue":
		where += " AND completed=0 AND julianday(due_at)<julianday(?)"
		args = append(args, p.Now)
	case "completed":
		where += " AND completed=1"
	case "open":
		where += " AND completed=0"
	}
	var total int
	if err := q.db.QueryRowContext(ctx, "SELECT count(*) FROM tasks"+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := q.db.QueryContext(ctx, "SELECT "+taskColumns+" FROM tasks"+where+" ORDER BY julianday(due_at),id LIMIT ? OFFSET ?", append(args, p.Size, p.Offset())...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []task.Task{}
	for rows.Next() {
		t, err := scanTask(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, t)
	}
	return items, total, rows.Err()
}
func (q *Queries) SaveTask(ctx context.Context, t task.Task) (task.Task, error) {
	var related any
	if t.DealID != 0 {
		related = t.DealID
	}
	if t.ID == 0 {
		return scanTask(q.db.QueryRowContext(ctx, "INSERT INTO tasks(customer_id,deal_id,title,due_at) VALUES(?,?,?,?) RETURNING "+taskColumns, t.CustomerID, related, t.Title, t.DueAt))
	}
	return scanTask(q.db.QueryRowContext(ctx, "UPDATE tasks SET deal_id=?,title=?,due_at=?,completed=? WHERE id=? RETURNING "+taskColumns, related, t.Title, t.DueAt, t.Completed, t.ID))
}
