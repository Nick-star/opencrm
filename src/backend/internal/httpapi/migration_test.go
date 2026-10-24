package httpapi

import (
	"database/sql"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Nick-star/opencrm/backend/internal/store"
)

func TestLegacyDatabaseMigration(t *testing.T) {
	path := filepath.Join(t.TempDir(), "legacy.db")
	legacy, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	_, err = legacy.Exec(`CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, company TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT '2026-01-01T00:00:00Z'); INSERT INTO customers(name,email) VALUES ('Legacy','old@example.com'); PRAGMA user_version=1;`)
	if err != nil {
		t.Fatal(err)
	}
	legacy.Close()
	db, err := store.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	response := httptest.NewRecorder()
	Handler(db).ServeHTTP(response, httptest.NewRequest("GET", "/api/v1/customers", nil))
	if response.Code != 200 || !strings.Contains(response.Body.String(), `"phone":""`) || !strings.Contains(response.Body.String(), "old@example.com") {
		t.Fatalf("legacy migration: %d %s", response.Code, response.Body.String())
	}
}

func TestFutureDatabaseIsRejected(t *testing.T) {
	path := filepath.Join(t.TempDir(), "future.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec("PRAGMA user_version=999"); err != nil {
		t.Fatal(err)
	}
	db.Close()
	app, err := store.Open(path)
	if app != nil {
		app.Close()
	}
	if err == nil {
		t.Fatal("future database was accepted")
	}
}
