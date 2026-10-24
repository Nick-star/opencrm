package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Nick-star/opencrm/backend/internal/store"
)

type testAPI struct {
	t       *testing.T
	handler http.Handler
}

func newAPI(t *testing.T) *testAPI {
	t.Helper()
	db, err := store.Open(filepath.Join(t.TempDir(), "crm.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return &testAPI{t, Handler(db)}
}
func (a *testAPI) call(method, path, body string, status int) map[string]any {
	a.t.Helper()
	w := httptest.NewRecorder()
	r := httptest.NewRequest(method, "/api/v1"+path, strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	a.handler.ServeHTTP(w, r)
	if w.Code != status {
		a.t.Fatalf("%s %s: want %d got %d: %s", method, path, status, w.Code, w.Body.String())
	}
	var value map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &value); err != nil {
		a.t.Fatal(err)
	}
	return value
}
func (a *testAPI) customer() int {
	a.t.Helper()
	c := a.call("POST", "/customers", `{"name":"Ada","email":"ada@example.com"}`, 201)
	return int(c["id"].(float64))
}

func TestCustomersSearchPaginationAndEdit(t *testing.T) {
	a := newAPI(t)
	for i := range 105 {
		a.call("POST", "/customers", fmt.Sprintf(`{"name":"Person %03d","email":"p%d@example.com"}`, i, i), 201)
	}
	list := a.call("GET", "/customers?page=6", "", 200)
	if list["total"] != float64(105) || len(list["items"].([]any)) != 5 {
		t.Fatalf("page: %+v", list)
	}
	c := a.call("GET", "/customers?q=Person%20000", "", 200)
	if c["total"] != float64(1) {
		t.Fatalf("search: %+v", c)
	}
	a.call("PATCH", "/customers/1", `{"name":"Updated","email":"new@example.com","company":"Engines","phone":"+7 123","notes":"Call tomorrow"}`, 200)
	got := a.call("GET", "/customers/1", "", 200)
	if got["phone"] != "+7 123" || got["notes"] != "Call tomorrow" {
		t.Fatalf("customer: %+v", got)
	}
	a.call("GET", "/customers?page=0", "", 400)
	a.call("GET", "/customers/9999", "", 404)
}

func TestSearchSupportsCyrillicCase(t *testing.T) {
	a := newAPI(t)
	a.call("POST", "/customers", `{"name":"Анна","email":"anna@example.com","company":"Студия"}`, 201)
	got := a.call("GET", "/customers?q=%D0%B0%D0%BD%D0%BD%D0%B0", "", 200)
	if got["total"] != float64(1) {
		t.Fatalf("Cyrillic search: %+v", got)
	}
}
