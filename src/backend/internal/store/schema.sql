PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS customers (
 id INTEGER PRIMARY KEY,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
 email TEXT NOT NULL,
 company TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
PRAGMA user_version = 1;
