package httpapi

import (
	"github.com/Nick-star/opencrm/backend/internal/store"
	"net/http"
)

func (a *api) dashboard(r *http.Request) (any, error) {
	p := store.Page{Number: 1, Size: 20}
	if err := window(r, &p); err != nil {
		return nil, err
	}
	var summary store.Dashboard
	var today, overdue listDTO[taskDTO]
	err := a.service.Store.Transaction(r.Context(), func(q *store.Queries) error {
		var err error
		summary, err = q.Dashboard(r.Context())
		if err != nil {
			return err
		}
		for filter, target := range map[string]*listDTO[taskDTO]{"today": &today, "overdue": &overdue} {
			p.Filter = filter
			items, total, err := q.Tasks(r.Context(), p)
			if err != nil {
				return err
			}
			views := make([]taskDTO, 0, len(items))
			for _, t := range items {
				views = append(views, taskView(t))
			}
			*target = listDTO[taskDTO]{views, total, 1, 20}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return struct {
		ActiveCustomers int              `json:"activeCustomers"`
		OpenDeals       int              `json:"openDeals"`
		WonDeals        int              `json:"wonDeals"`
		OpenAmountMinor int64            `json:"openAmountMinor"`
		WonAmountMinor  int64            `json:"wonAmountMinor"`
		Today           listDTO[taskDTO] `json:"today"`
		Overdue         listDTO[taskDTO] `json:"overdue"`
	}{summary.ActiveCustomers, summary.OpenDeals, summary.WonDeals, summary.OpenAmountMinor, summary.WonAmountMinor, today, overdue}, nil
}
