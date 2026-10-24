package httpapi

import (
	"fmt"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/Nick-star/opencrm/backend/internal/store"
)

func TestCRMStateSurvivesRestart(t *testing.T) {
	path := filepath.Join(t.TempDir(), "crm.db")
	db, err := store.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	a := &testAPI{t, Handler(db)}
	customerID := a.customer()
	d := a.call("POST", "/deals", fmt.Sprintf(`{"customerId":%d,"title":"Persisted deal","amountMinor":10101}`, customerID), 201)
	task := a.call("POST", "/tasks", fmt.Sprintf(`{"customerId":%d,"dealId":%d,"title":"Persisted task","dueAt":"2026-01-01T00:00:00Z"}`, customerID, int(d["id"].(float64))), 201)
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	db, err = store.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	a.handler = Handler(db)
	got := a.call("GET", fmt.Sprintf("/deals/%d", int(d["id"].(float64))), "", 200)
	if got["amountMinor"] != float64(10101) {
		t.Fatal(got)
	}
	got = a.call("GET", fmt.Sprintf("/tasks/%d", int(task["id"].(float64))), "", 200)
	if got["dealId"] != d["id"] {
		t.Fatal(got)
	}
}
func TestArchiveAndNewTaskAreAtomic(t *testing.T) {
	a := newAPI(t)
	customerID := a.customer()
	var statuses [2]int
	var wg sync.WaitGroup
	for i := range 2 {
		wg.Go(func() {
			path := fmt.Sprintf("/customers/%d/archive", customerID)
			method, body := "PATCH", `{"archived":true}`
			if i == 1 {
				path = "/tasks"
				method = "POST"
				body = fmt.Sprintf(`{"customerId":%d,"title":"Concurrent","dueAt":"2030-01-01T00:00:00Z"}`, customerID)
			}
			r := httptest.NewRequest(method, "/api/v1"+path, strings.NewReader(body))
			r.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			a.handler.ServeHTTP(w, r)
			statuses[i] = w.Code
		})
	}
	wg.Wait()
	if !((statuses[0] == 200 && statuses[1] == 409) || (statuses[0] == 409 && statuses[1] == 201)) {
		t.Fatalf("non-atomic outcomes: %v", statuses)
	}
}
