package store

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"embed"
	"fmt"
	"strings"

	"modernc.org/sqlite"
)

//go:embed schema.sql migrations/*.sql
var migrations embed.FS

type Store struct {
	db *sql.DB
	*Queries
}
type Queries struct{ db executor }
type executor interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func init() {
	sqlite.MustRegisterDeterministicScalarFunction("unicode_lower", 1, func(_ *sqlite.FunctionContext, args []driver.Value) (driver.Value, error) {
		value, ok := args[0].(string)
		if !ok {
			return nil, nil
		}
		return strings.ToLower(value), nil
	})
}

func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;"); err != nil {
		db.Close()
		return nil, err
	}
	tx, err := db.Begin()
	if err != nil {
		db.Close()
		return nil, err
	}
	defer tx.Rollback()
	var version int
	err = tx.QueryRow("PRAGMA user_version").Scan(&version)
	if err == nil && version > 2 {
		err = fmt.Errorf("database version %d is newer than supported version 2", version)
	}
	if err == nil && version == 0 {
		schema, readErr := migrations.ReadFile("schema.sql")
		err = readErr
		if err == nil {
			_, err = tx.Exec(string(schema))
			version = 1
		}
	}
	if err == nil && version == 1 {
		migration, readErr := migrations.ReadFile("migrations/002_crm.sql")
		err = readErr
		if err == nil {
			_, err = tx.Exec(string(migration) + "PRAGMA user_version=2;")
		}
	}
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("migrate sqlite: %w", err)
	}
	return &Store{db: db, Queries: &Queries{db: db}}, nil
}

func (s *Store) Close() error                   { return s.db.Close() }
func (s *Store) Ping(ctx context.Context) error { return s.db.PingContext(ctx) }

func (s *Store) Transaction(ctx context.Context, fn func(*Queries) error) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := fn(&Queries{db: tx}); err != nil {
		return err
	}
	return tx.Commit()
}
