ALTER TABLE customers ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1));
CREATE TABLE deals (
 id INTEGER PRIMARY KEY,
 customer_id INTEGER NOT NULL REFERENCES customers(id),
 title TEXT NOT NULL,
 amount_minor INTEGER NOT NULL CHECK(amount_minor BETWEEN 0 AND 1000000000000),
 stage TEXT NOT NULL DEFAULT 'new' CHECK(stage IN ('new','negotiation','proposal','won','lost')),
 description TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX deals_customer ON deals(customer_id);
CREATE TABLE tasks (
 id INTEGER PRIMARY KEY,
 customer_id INTEGER NOT NULL REFERENCES customers(id),
 deal_id INTEGER REFERENCES deals(id),
 title TEXT NOT NULL,
 due_at TEXT NOT NULL,
 completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX tasks_customer ON tasks(customer_id);
CREATE INDEX tasks_due ON tasks(completed,due_at);
