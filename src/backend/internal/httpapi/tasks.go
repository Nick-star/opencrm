package httpapi

import (
	"encoding/json"
	"github.com/Nick-star/opencrm/backend/internal/fault"
	"github.com/Nick-star/opencrm/backend/internal/task"
	"net/http"
)

type taskDTO struct {
	ID         int64  `json:"id"`
	CustomerID int64  `json:"customerId"`
	DealID     *int64 `json:"dealId"`
	Title      string `json:"title"`
	DueAt      string `json:"dueAt"`
	Completed  bool   `json:"completed"`
	CreatedAt  string `json:"createdAt"`
}

func taskView(t task.Task) taskDTO {
	var related *int64
	if t.DealID != 0 {
		related = new(t.DealID)
	}
	return taskDTO{t.ID, t.CustomerID, related, t.Title, t.DueAt, t.Completed, t.CreatedAt}
}
func (a *api) tasks(r *http.Request) (any, error) {
	p, err := page(r)
	if err != nil {
		return nil, err
	}
	switch p.Filter {
	case "", "all", "today", "overdue", "completed", "open":
	default:
		return nil, fault.Invalid("filter", "invalid task filter")
	}
	if err := window(r, &p); err != nil {
		return nil, err
	}
	items, total, err := a.service.Store.Tasks(r.Context(), p)
	if err != nil {
		return nil, err
	}
	views := make([]taskDTO, 0, len(items))
	for _, t := range items {
		views = append(views, taskView(t))
	}
	return listDTO[taskDTO]{views, total, p.Number, p.Size}, nil
}
func (a *api) task(r *http.Request) (any, error) {
	key, err := id(r)
	if err != nil {
		return nil, err
	}
	t, err := a.service.Store.Task(r.Context(), key)
	return taskView(t), err
}
func (a *api) saveTask(r *http.Request) (any, error) {
	var input struct {
		CustomerID *int64          `json:"customerId"`
		DealID     json.RawMessage `json:"dealId"`
		Title      *string         `json:"title"`
		DueAt      *string         `json:"dueAt"`
	}
	if err := decode(r, &input); err != nil {
		return nil, err
	}
	var t task.Task
	if r.Method == http.MethodPatch {
		key, err := id(r)
		if err != nil {
			return nil, err
		}
		t, err = a.service.Store.Task(r.Context(), key)
		if err != nil {
			return nil, err
		}
		if input.CustomerID != nil && *input.CustomerID != t.CustomerID {
			return nil, fault.Invalid("customerId", "customer cannot be changed")
		}
	}
	if input.CustomerID != nil {
		t.CustomerID = *input.CustomerID
	}
	if input.Title != nil {
		t.Title = *input.Title
	}
	if input.DueAt != nil {
		t.DueAt = *input.DueAt
	}
	if input.DealID != nil {
		var related *int64
		if err := json.Unmarshal(input.DealID, &related); err != nil {
			return nil, fault.Invalid("dealId", "invalid deal")
		}
		t.DealID = 0
		if related != nil {
			if *related < 1 {
				return nil, fault.Invalid("dealId", "invalid deal")
			}
			t.DealID = *related
		}
	}
	t, err := a.service.SaveTask(r.Context(), t)
	return taskView(t), err
}
func (a *api) completeTask(r *http.Request) (any, error) {
	key, err := id(r)
	if err != nil {
		return nil, err
	}
	var input struct {
		Completed *bool `json:"completed"`
	}
	if err := decode(r, &input); err != nil {
		return nil, err
	}
	if input.Completed == nil {
		return nil, fault.Invalid("completed", "completed required")
	}
	t, err := a.service.CompleteTask(r.Context(), key, *input.Completed)
	return taskView(t), err
}
