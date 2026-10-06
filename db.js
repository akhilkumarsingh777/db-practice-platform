// SQLite practice database (in-memory). Learners can only run read-only queries on it.
const Database = require('better-sqlite3');
const db = new Database(':memory:');

db.exec(`
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, city TEXT);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), order_date TEXT);
CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id), quantity INTEGER);

INSERT INTO customers VALUES (1,'Aarav','Delhi'),(2,'Priya','Mumbai'),(3,'Rohan','Delhi'),
  (4,'Sneha','Noida'),(5,'Vikram','Mumbai'),(6,'Anita','Pune');
INSERT INTO products VALUES (1,'Laptop','Electronics',55000),(2,'Phone','Electronics',20000),
  (3,'Headphones','Electronics',1500),(4,'Desk','Furniture',7000),(5,'Chair','Furniture',3500),
  (6,'Notebook','Stationery',120),(7,'Pen Pack','Stationery',250);
INSERT INTO orders VALUES (1,1,'2026-01-05'),(2,1,'2026-02-10'),(3,2,'2026-02-11'),(4,3,'2026-03-01'),
  (5,4,'2026-03-15'),(6,2,'2026-04-02'),(7,5,'2026-04-20');
INSERT INTO order_items VALUES (1,1,1,1),(2,1,3,2),(3,2,6,10),(4,3,2,1),(5,3,7,4),(6,4,4,1),
  (7,4,5,2),(8,5,3,1),(9,6,1,1),(10,6,6,5),(11,7,2,2),(12,7,5,1);
`);

const SCHEMA = `customers(id, name, city)
products(id, name, category, price)
orders(id, customer_id, order_date)
order_items(id, order_id, product_id, quantity)`;

// Only a single SELECT / WITH statement is allowed.
function runQuery(sql) {
  if (typeof sql !== 'string' || !/^\s*(select|with)\b/i.test(sql)) {
    throw new Error('Only SELECT queries are allowed.');
  }
  const stmt = db.prepare(sql); // throws on syntax errors or multiple statements
  if (!stmt.reader) throw new Error('Only SELECT queries are allowed.');
  return { columns: stmt.columns().map(c => c.name), rows: stmt.raw().all() };
}

// Compare results by values (column names/aliases don't matter).
function sameResult(a, b, ordered) {
  const norm = rows => {
    const r = rows.map(row => JSON.stringify(row.map(v => (typeof v === 'number' ? Math.round(v * 100) / 100 : v))));
    return ordered ? r : r.sort();
  };
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

module.exports = { runQuery, sameResult, SCHEMA };
