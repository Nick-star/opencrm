package app

import (
	"context"
	"github.com/Nick-star/opencrm/backend/internal/fault"
	"github.com/Nick-star/opencrm/backend/internal/store"
	"github.com/Nick-star/opencrm/backend/internal/task"
)

func (s *Service) SaveTask(ctx context.Context, t task.Task) (task.Task, error) {
	if err := t.Validate(); err != nil {
		return t, err
	}
	err := s.Store.Transaction(ctx, func(q *store.Queries) error {
		if t.ID != 0 {
			old, err := q.Task(ctx, t.ID)
			if err != nil {
				return err
			}
			t.CustomerID = old.CustomerID
			t.Completed = old.Completed
		}
		c, err := q.Customer(ctx, t.CustomerID)
		if err != nil {
			return err
		}
		if c.Archived {
			return fault.Conflict("customer is archived")
		}
		if t.DealID != 0 {
			d, err := q.Deal(ctx, t.DealID)
			if err != nil {
				return err
			}
			if d.CustomerID != t.CustomerID {
				return fault.Invalid("dealId", "deal belongs to a different customer")
			}
		}
		t, err = q.SaveTask(ctx, t)
		return err
	})
	return t, err
}
func (s *Service) CompleteTask(ctx context.Context, id int64, completed bool) (task.Task, error) {
	var t task.Task
	err := s.Store.Transaction(ctx, func(q *store.Queries) error {
		var err error
		t, err = q.Task(ctx, id)
		if err != nil {
			return err
		}
		c, err := q.Customer(ctx, t.CustomerID)
		if err != nil {
			return err
		}
		if c.Archived {
			return fault.Conflict("customer is archived")
		}
		t.Completed = completed
		t, err = q.SaveTask(ctx, t)
		return err
	})
	return t, err
}
