package httpapi

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/mail"
	"strings"

	"github.com/Nick-star/opencrm/backend/internal/store"
)

func Handler(db *store.Store) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		if err := db.Ping(r.Context()); err != nil {
			fail(w, 503, "database unavailable")
			return
		}
		respond(w, 200, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/v1/customers", func(w http.ResponseWriter, r *http.Request) {
		customers, err := db.Customers(r.Context())
		if err != nil {
			slog.Error("list customers", "error", err)
			fail(w, 500, "could not load customers")
			return
		}
		respond(w, 200, customers)
	})
	mux.HandleFunc("POST /api/v1/customers", func(w http.ResponseWriter, r *http.Request) {
		var c store.Customer
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&c); err != nil {
			fail(w, 400, "invalid JSON body")
			return
		}
		if err := decoder.Decode(new(any)); err != io.EOF {
			fail(w, 400, "expected a single JSON object")
			return
		}
		c.Name, c.Email, c.Company = strings.TrimSpace(c.Name), strings.TrimSpace(c.Email), strings.TrimSpace(c.Company)
		address, err := mail.ParseAddress(c.Email)
		if c.Name == "" || len(c.Name) > 120 || len(c.Company) > 120 || len(c.Email) > 254 || err != nil || address.Address != c.Email {
			fail(w, 400, "provide a name, valid email and company up to 120 characters")
			return
		}
		c, err = db.CreateCustomer(r.Context(), c)
		if err != nil {
			slog.Error("create customer", "error", err)
			fail(w, 500, "could not create customer")
			return
		}
		respond(w, 201, c)
	})
	return mux
}

func fail(w http.ResponseWriter, status int, message string) {
	respond(w, status, map[string]string{"error": message})
}
func respond(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		slog.Error("encode response", "error", err)
	}
}
