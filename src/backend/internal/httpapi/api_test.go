package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Nick-star/opencrm/backend/internal/store"
)

func TestCustomerLifecycle(t *testing.T) {
	path := filepath.Join(t.TempDir(), "test.db")
	db, err := store.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	handler := Handler(db)
	request := func(method, body string) *httptest.ResponseRecorder {
		t.Helper()
		recorder := httptest.NewRecorder()
		r := httptest.NewRequest(method, "/api/v1/customers", strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
		handler.ServeHTTP(recorder, r)
		return recorder
	}
	if got := request(http.MethodGet, ""); got.Code != 200 || !strings.Contains(got.Body.String(), `"items":[]`) {
		t.Fatalf("empty list: %s", got.Body.String())
	}
	for _, body := range []string{`{}`, `{"name":"Ada","email":"invalid"}`, `{"name":"Ada","email":"ada@example.com"} {}`} {
		if got := request(http.MethodPost, body); got.Code != 400 {
			t.Fatalf("invalid body accepted: %s", body)
		}
	}
	got := request(http.MethodPost, `{"name":" Ada ","email":"ada@example.com","company":"Analytical Engines"}`)
	if got.Code != 201 {
		t.Fatalf("create: %d %s", got.Code, got.Body.String())
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	db, err = store.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	handler = Handler(db)
	got = request(http.MethodGet, "")
	var result struct {
		Items []customerDTO `json:"items"`
	}
	if err := json.Unmarshal(got.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	customers := result.Items
	if len(customers) != 1 || customers[0].Name != "Ada" || customers[0].ID == 0 || customers[0].CreatedAt == "" {
		t.Fatalf("persisted customers: %+v", customers)
	}
}
