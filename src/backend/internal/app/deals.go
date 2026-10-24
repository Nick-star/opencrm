package app

import (
	"context"
	"github.com/Nick-star/opencrm/backend/internal/deal"
	"github.com/Nick-star/opencrm/backend/internal/fault"
	"github.com/Nick-star/opencrm/backend/internal/store"
)

func (s *Service) SaveDeal(ctx context.Context, d deal.Deal) (deal.Deal, error) {
	if err := d.Validate(); err != nil {
		return d, err
	}
	err := s.Store.Transaction(ctx, func(q *store.Queries) error {
		if d.ID != 0 {
			old, err := q.Deal(ctx, d.ID)
			if err != nil {
				return err
			}
			d.Stage = old.Stage
			d.CustomerID = old.CustomerID
		}
		c, err := q.Customer(ctx, d.CustomerID)
		if err != nil {
			return err
		}
		if c.Archived {
			return fault.Conflict("customer is archived")
		}
		d, err = q.SaveDeal(ctx, d)
		return err
	})
	return d, err
}
func (s *Service) ChangeStage(ctx context.Context, id int64, stage string, reopen bool) (deal.Deal, error) {
	var d deal.Deal
	err := s.Store.Transaction(ctx, func(q *store.Queries) error {
		var err error
		d, err = q.Deal(ctx, id)
		if err != nil {
			return err
		}
		c, err := q.Customer(ctx, d.CustomerID)
		if err != nil {
			return err
		}
		if c.Archived {
			return fault.Conflict("customer is archived")
		}
		if reopen {
			err = d.Reopen()
		} else {
			err = d.ChangeStage(stage)
		}
		if err != nil {
			return err
		}
		d, err = q.SaveDeal(ctx, d)
		return err
	})
	return d, err
}
