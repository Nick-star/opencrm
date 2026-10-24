package store

import (
	"context"
	"database/sql"
	"embed"
	"fmt"

	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var migrations embed.FS

type Customer struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Company   string `json:"company"`
	CreatedAt string `json:"createdAt"`
}

type Store struct{ db *sql.DB }

func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	db.SetMaxOpenConns(1)
	schema, err := migrations.ReadFile("schema.sql")
	if err == nil {
		_, err = db.Exec(string(schema))
	}
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("initialize sqlite: %w", err)
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error                   { return s.db.Close() }
func (s *Store) Ping(ctx context.Context) error { return s.db.PingContext(ctx) }

func (s *Store) Customers(ctx context.Context) ([]Customer, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT id, name, email, company, created_at FROM customers ORDER BY id DESC LIMIT 100")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	customers := make([]Customer, 0)
	for rows.Next() {
		var c Customer
		if err := rows.Scan(&c.ID, &c.Name, &c.Email, &c.Company, &c.CreatedAt); err != nil {
			return nil, err
		}
		customers = append(customers, c)
	}
	return customers, rows.Err()
}

func (s *Store) CreateCustomer(ctx context.Context, c Customer) (Customer, error) {
	err := s.db.QueryRowContext(ctx, "INSERT INTO customers(name, email, company) VALUES (?, ?, ?) RETURNING id, created_at", c.Name, c.Email, c.Company).Scan(&c.ID, &c.CreatedAt)
	return c, err
}
