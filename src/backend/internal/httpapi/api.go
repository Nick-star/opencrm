package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Nick-star/opencrm/backend/internal/app"
	"github.com/Nick-star/opencrm/backend/internal/customer"
	"github.com/Nick-star/opencrm/backend/internal/fault"
	"github.com/Nick-star/opencrm/backend/internal/store"
)

type api struct{ service *app.Service }
type endpoint func(*http.Request) (any, error)

func Handler(db *store.Store) http.Handler {
	a := &api{&app.Service{Store: db}}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		if err := db.Ping(r.Context()); err != nil {
			respond(w, 503, map[string]string{"code": "unavailable", "error": "database unavailable"})
			return
		}
		respond(w, 200, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/v1/customers", wrap(200, a.customers))
	mux.HandleFunc("GET /api/v1/customers/{id}", wrap(200, a.customer))
	mux.HandleFunc("POST /api/v1/customers", wrap(201, a.saveCustomer))
	mux.HandleFunc("PATCH /api/v1/customers/{id}", wrap(200, a.saveCustomer))
	mux.HandleFunc("PATCH /api/v1/customers/{id}/archive", wrap(200, a.archiveCustomer))
	mux.HandleFunc("GET /api/v1/deals", wrap(200, a.deals))
	mux.HandleFunc("GET /api/v1/deals/{id}", wrap(200, a.deal))
	mux.HandleFunc("POST /api/v1/deals", wrap(201, a.saveDeal))
	mux.HandleFunc("PATCH /api/v1/deals/{id}", wrap(200, a.saveDeal))
	mux.HandleFunc("PATCH /api/v1/deals/{id}/stage", wrap(200, a.changeStage))
	mux.HandleFunc("POST /api/v1/deals/{id}/reopen", wrap(200, a.reopenDeal))
	mux.HandleFunc("GET /api/v1/tasks", wrap(200, a.tasks))
	mux.HandleFunc("GET /api/v1/tasks/{id}", wrap(200, a.task))
	mux.HandleFunc("POST /api/v1/tasks", wrap(201, a.saveTask))
	mux.HandleFunc("PATCH /api/v1/tasks/{id}", wrap(200, a.saveTask))
	mux.HandleFunc("PATCH /api/v1/tasks/{id}/completion", wrap(200, a.completeTask))
	mux.HandleFunc("GET /api/v1/dashboard", wrap(200, a.dashboard))
	return mux
}
func wrap(status int, fn endpoint) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 32<<10)
		value, err := fn(r)
		if err == nil {
			respond(w, status, value)
			return
		}
		if e, ok := errors.AsType[*fault.Error](err); ok {
			code := 400
			switch e.Code {
			case "not_found":
				code = 404
			case "conflict":
				code = 409
			}
			respond(w, code, map[string]any{"code": e.Code, "error": e.Message, "fields": e.Fields})
			return
		}
		slog.Error("request failed", "method", r.Method, "path", r.URL.Path, "error", err)
		respond(w, 500, map[string]string{"code": "internal", "error": "request could not be completed"})
	}
}
func decode(r *http.Request, value any) error {
	media, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || media != "application/json" {
		return fault.Invalid("body", "Content-Type must be application/json")
	}
	d := json.NewDecoder(r.Body)
	var raw json.RawMessage
	if err := d.Decode(&raw); err != nil {
		return fault.Invalid("body", "invalid JSON body")
	}
	if len(raw) == 0 || raw[0] != '{' {
		return fault.Invalid("body", "JSON object required")
	}
	if err := d.Decode(new(any)); err != io.EOF {
		return fault.Invalid("body", "expected a single JSON object")
	}
	fields := json.NewDecoder(bytes.NewReader(raw))
	fields.DisallowUnknownFields()
	if err := fields.Decode(value); err != nil {
		return fault.Invalid("body", "invalid JSON fields")
	}
	return nil
}

func id(r *http.Request) (int64, error) {
	v, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || v < 1 {
		return 0, fault.Invalid("id", "invalid id")
	}
	return v, nil
}
func page(r *http.Request) (store.Page, error) {
	p := store.Page{Number: 1, Size: 20, Search: strings.TrimSpace(r.URL.Query().Get("q")), Archived: r.URL.Query().Get("archived"), Stage: r.URL.Query().Get("stage"), Filter: r.URL.Query().Get("filter")}
	for key, target := range map[string]*int{"page": &p.Number, "pageSize": &p.Size} {
		if raw := r.URL.Query().Get(key); raw != "" {
			v, err := strconv.Atoi(raw)
			if err != nil || v < 1 || v > 1000000 {
				return p, fault.Invalid(key, "invalid pagination")
			}
			*target = v
		}
	}
	if p.Size > 100 {
		return p, fault.Invalid("pageSize", "pageSize exceeds 100")
	}
	if p.Archived != "" && p.Archived != "false" && p.Archived != "true" && p.Archived != "all" {
		return p, fault.Invalid("archived", "invalid archive filter")
	}
	if raw := r.URL.Query().Get("customerId"); raw != "" {
		v, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || v < 1 {
			return p, fault.Invalid("customerId", "invalid customer")
		}
		p.CustomerID = v
	}
	return p, nil
}
func window(r *http.Request, p *store.Page) error {
	zone := r.URL.Query().Get("timeZone")
	if zone == "" {
		zone = "UTC"
	}
	loc, err := time.LoadLocation(zone)
	if err != nil {
		return fault.Invalid("timeZone", "invalid IANA time zone")
	}
	now := time.Now()
	local := now.In(loc)
	start := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, loc)
	p.Now = now.UTC().Format(time.RFC3339Nano)
	p.DayStart = start.UTC().Format(time.RFC3339Nano)
	p.DayEnd = start.AddDate(0, 0, 1).UTC().Format(time.RFC3339Nano)
	return nil
}

type listDTO[T any] struct {
	Items    []T `json:"items"`
	Total    int `json:"total"`
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
}
type customerDTO struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Company   string `json:"company"`
	Phone     string `json:"phone"`
	Notes     string `json:"notes"`
	Archived  bool   `json:"archived"`
	CreatedAt string `json:"createdAt"`
}

func customerView(c customer.Customer) customerDTO {
	return customerDTO{c.ID, c.Name, c.Email, c.Company, c.Phone, c.Notes, c.Archived, c.CreatedAt}
}
func (a *api) customers(r *http.Request) (any, error) {
	p, err := page(r)
	if err != nil {
		return nil, err
	}
	items, total, err := a.service.Store.Customers(r.Context(), p)
	if err != nil {
		return nil, err
	}
	views := make([]customerDTO, 0, len(items))
	for _, c := range items {
		views = append(views, customerView(c))
	}
	return listDTO[customerDTO]{views, total, p.Number, p.Size}, nil
}
func (a *api) customer(r *http.Request) (any, error) {
	key, err := id(r)
	if err != nil {
		return nil, err
	}
	c, err := a.service.Store.Customer(r.Context(), key)
	return customerView(c), err
}
func (a *api) saveCustomer(r *http.Request) (any, error) {
	var input struct{ Name, Email, Company, Phone, Notes *string }
	if err := decode(r, &input); err != nil {
		return nil, err
	}
	var c customer.Customer
	if r.Method == http.MethodPatch {
		key, err := id(r)
		if err != nil {
			return nil, err
		}
		c, err = a.service.Store.Customer(r.Context(), key)
		if err != nil {
			return nil, err
		}
	}
	for source, target := range map[*string]*string{input.Name: &c.Name, input.Email: &c.Email, input.Company: &c.Company, input.Phone: &c.Phone, input.Notes: &c.Notes} {
		if source != nil {
			*target = *source
		}
	}
	c, err := a.service.SaveCustomer(r.Context(), c)
	return customerView(c), err
}
func (a *api) archiveCustomer(r *http.Request) (any, error) {
	key, err := id(r)
	if err != nil {
		return nil, err
	}
	var input struct {
		Archived *bool `json:"archived"`
	}
	if err := decode(r, &input); err != nil {
		return nil, err
	}
	if input.Archived == nil {
		return nil, fault.Invalid("archived", "archived required")
	}
	c, err := a.service.ArchiveCustomer(r.Context(), key, *input.Archived)
	return customerView(c), err
}
func respond(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		slog.Error("encode response", "error", err)
	}
}
