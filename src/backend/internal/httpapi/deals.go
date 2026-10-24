package httpapi

import (
	"github.com/Nick-star/opencrm/backend/internal/deal"
	"github.com/Nick-star/opencrm/backend/internal/fault"
	"net/http"
)

type dealDTO struct {
	ID          int64  `json:"id"`
	CustomerID  int64  `json:"customerId"`
	Title       string `json:"title"`
	AmountMinor int64  `json:"amountMinor"`
	Stage       string `json:"stage"`
	Description string `json:"description"`
	CreatedAt   string `json:"createdAt"`
}

func dealView(d deal.Deal) dealDTO {
	return dealDTO{d.ID, d.CustomerID, d.Title, d.AmountMinor, d.Stage, d.Description, d.CreatedAt}
}
func (a *api) deals(r *http.Request) (any, error) {
	p, err := page(r)
	if err != nil {
		return nil, err
	}
	if p.Stage != "" && !deal.ValidStage(p.Stage) {
		return nil, fault.Invalid("stage", "invalid stage")
	}
	items, total, err := a.service.Store.Deals(r.Context(), p)
	if err != nil {
		return nil, err
	}
	views := make([]dealDTO, 0, len(items))
	for _, d := range items {
		views = append(views, dealView(d))
	}
	return listDTO[dealDTO]{views, total, p.Number, p.Size}, nil
}
func (a *api) deal(r *http.Request) (any, error) {
	key, err := id(r)
	if err != nil {
		return nil, err
	}
	d, err := a.service.Store.Deal(r.Context(), key)
	return dealView(d), err
}
func (a *api) saveDeal(r *http.Request) (any, error) {
	var input struct {
		CustomerID  *int64  `json:"customerId"`
		Title       *string `json:"title"`
		AmountMinor *int64  `json:"amountMinor"`
		Description *string `json:"description"`
	}
	if err := decode(r, &input); err != nil {
		return nil, err
	}
	d := deal.Deal{Stage: "new"}
	if r.Method == http.MethodPatch {
		key, err := id(r)
		if err != nil {
			return nil, err
		}
		d, err = a.service.Store.Deal(r.Context(), key)
		if err != nil {
			return nil, err
		}
		if input.CustomerID != nil && *input.CustomerID != d.CustomerID {
			return nil, fault.Invalid("customerId", "customer cannot be changed")
		}
	}
	if input.CustomerID != nil {
		d.CustomerID = *input.CustomerID
	}
	if input.Title != nil {
		d.Title = *input.Title
	}
	if input.AmountMinor != nil {
		d.AmountMinor = *input.AmountMinor
	}
	if input.Description != nil {
		d.Description = *input.Description
	}
	d, err := a.service.SaveDeal(r.Context(), d)
	return dealView(d), err
}
func (a *api) changeStage(r *http.Request) (any, error) {
	key, err := id(r)
	if err != nil {
		return nil, err
	}
	var input struct {
		Stage string `json:"stage"`
	}
	if err := decode(r, &input); err != nil {
		return nil, err
	}
	d, err := a.service.ChangeStage(r.Context(), key, input.Stage, false)
	return dealView(d), err
}
func (a *api) reopenDeal(r *http.Request) (any, error) {
	key, err := id(r)
	if err != nil {
		return nil, err
	}
	var input struct{}
	if err := decode(r, &input); err != nil {
		return nil, err
	}
	d, err := a.service.ChangeStage(r.Context(), key, "", true)
	return dealView(d), err
}
