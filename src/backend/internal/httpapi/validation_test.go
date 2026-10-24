package httpapi

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRejectsUnexpectedMutationBodies(t *testing.T) {
	a := newAPI(t)
	a.customer()
	for _, body := range []string{`null`, `[]`, `{"name":"A","email":"a@example.com","id":42}`, `{"name":"A","email":"a@example.com"} {}`, strings.Repeat(" ", 33000)} {
		a.call("POST", "/customers", body, 400)
	}
	r := httptest.NewRequest("POST", "/api/v1/customers", strings.NewReader(`{"name":"Injected","email":"injected@example.com"}`))
	r.Header.Set("Content-Type", "text/plain")
	w := httptest.NewRecorder()
	a.handler.ServeHTTP(w, r)
	if w.Code != 400 {
		t.Fatalf("plain text mutation accepted: %d %s", w.Code, w.Body.String())
	}
}
