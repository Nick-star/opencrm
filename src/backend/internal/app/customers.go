package app

import (
	"context"
	"github.com/Nick-star/opencrm/backend/internal/customer"
	"github.com/Nick-star/opencrm/backend/internal/fault"
	"github.com/Nick-star/opencrm/backend/internal/store"
)

type Service struct{ Store *store.Store }

func (s *Service) SaveCustomer(ctx context.Context, c customer.Customer) (customer.Customer, error) {
	if err := c.Validate(); err != nil {
		return c, err
	}
	err := s.Store.Transaction(ctx, func(q *store.Queries) error {
		if c.ID != 0 {
			old, err := q.Customer(ctx, c.ID)
			if err != nil {
				return err
			}
			c.Archived = old.Archived
		}
		saved, err := q.SaveCustomer(ctx, c)
		c = saved
		return err
	})
	return c, err
}
func (s *Service) ArchiveCustomer(ctx context.Context, id int64, archived bool) (customer.Customer, error) {
	var c customer.Customer
	err := s.Store.Transaction(ctx, func(q *store.Queries) error {
		var err error
		c, err = q.Customer(ctx, id)
		if err != nil {
			return err
		}
		if archived {
			open, err := q.CustomerHasOpenWork(ctx, id)
			if err != nil {
				return err
			}
			if open {
				return fault.Conflict("customer has open deals or tasks")
			}
		}
		c.Archived = archived
		c, err = q.SaveCustomer(ctx, c)
		return err
	})
	return c, err
}
