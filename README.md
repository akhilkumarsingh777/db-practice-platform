# DB Practice Platform

A full-stack web app where learners practice **SQL** on a live database, take **quizzes** on SQL and MongoDB, and track progress. Built to show how SQL and NoSQL work together in one application.

**Stack:** Node.js, Express, SQLite (better-sqlite3), MongoDB + Mongoose, JWT auth, vanilla JS frontend.

## Why two databases?

| Database | Used for | Why |
|---|---|---|
| SQLite (SQL) | E-commerce practice data (`customers`, `products`, `orders`, `order_items`) | Relational data with foreign keys is ideal for teaching JOINs, GROUP BY, subqueries, window functions |
| MongoDB (Mongoose) | Users, attempts, progress, admin-added exercises | Flexible documents that grow per user; aggregation-friendly |

## Features

- Sign up / log in (bcrypt-hashed passwords, JWT sessions)
- 8 SQL exercises (filtering to window functions). Learners write a query, it runs on SQLite, and the result is checked against the expected result (so any correct query passes, not just one exact answer)
- Only a single `SELECT`/`WITH` statement is allowed, so learners cannot modify the practice database
- 6 quiz questions (SQL, indexing, MongoDB design, aggregation, Mongoose) with explanations
- Dashboard with progress per topic
- Admin API to add new exercises (content creation workflow)

## Setup

Requirements: Node.js 18+ and MongoDB running locally (or a MongoDB Atlas URI).

```bash
npm install
npm start
```

Open http://localhost:3000

Optional environment variables:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/db_practice   # or your Atlas URI
JWT_SECRET=change-this
ADMIN_EMAIL=you@example.com                       # this email becomes admin on sign up
PORT=3000
```

## API

| Method | Route | Description |
|---|---|---|
| POST | `/api/register`, `/api/login` | Auth, returns a JWT |
| GET | `/api/exercises` | Exercises + schema + solved status |
| POST | `/api/exercises/:id/run` | Run a SELECT query and check it |
| GET | `/api/quiz` | Quiz questions (answers hidden) |
| POST | `/api/quiz/:id` | Submit an answer, get explanation |
| GET | `/api/progress` | Solved count per topic |
| POST | `/api/admin/exercises` | Admin only: add an exercise |

Add an exercise as admin (replace `TOKEN`):

```bash
curl -X POST http://localhost:3000/api/admin/exercises \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"topic":"Filtering","title":"Mumbai customers","prompt":"List customers from Mumbai.","hint":"WHERE city","solution":"SELECT name FROM customers WHERE city = '"'"'Mumbai'"'"'"}'
```

## Project structure

```
server.js        Express app, routes, auth
db.js            SQLite practice database, safe query runner, result checker
models.js        Mongoose models: User, Attempt, Exercise
data/            Exercise and quiz content
public/          Frontend (index.html, app.js)
```

## Possible improvements

- Add a MongoDB practice section with a query sandbox
- Show `EXPLAIN QUERY PLAN` output to teach indexing
- More exercises and a UI for admins
