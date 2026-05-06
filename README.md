# SQL Practice Lab

A simple local SQL learning platform for practicing PostgreSQL with a prepared relational dataset.

## What is included

- Next.js App Router with TypeScript and TailwindCSS
- PostgreSQL via Docker Compose
- `pg` / node-postgres API routes
- Seeded `customers`, `products`, and `orders` tables
- `order_line_items` view for view-based practice
- 70 SQL questions from beginner to intermediate level
- Run, submit, reveal solution, reset SQL, result table, evaluation panel, and schema sidebar

## Run locally

```bash
docker compose up --build
```

If you already built an older image and the app does not open, reset the local containers and rebuild:

```bash
docker compose down -v
docker compose up --build
```

Open:

```text
http://localhost:3000
```

PostgreSQL is exposed on:

```text
localhost:5432
```

Local database URL:

```text
postgres://app_user:app_password@localhost:5432/sql_practice
```

## Reset the database volume

PostgreSQL only runs the files in `init/` when the database volume is created for the first time.
If you change seed data or schema and want a clean reload:

```bash
docker compose down -v
docker compose up --build
```

## Development without Docker

Create a local `.env` from the example:

```bash
cp .env.example .env
```

Install dependencies and run Next.js:

```bash
npm install
npm run dev
```

You still need a PostgreSQL database available at `DATABASE_URL`.

## Evaluation behavior

Most SELECT-style submissions use `validationMode: "result_match"`.
The app runs the student's SQL and the official solution SQL, normalizes returned values, then compares columns and rows.

For questions where `orderMatters` is false, row order is ignored. For questions that require `ORDER BY` or `LIMIT`, row order is checked.

Queries run inside a transaction and are rolled back after execution so local practice does not damage the seed dataset.

Exercises for `CREATE VIEW`, `INSERT`, `UPDATE`, `DELETE`, `TRANSACTION`, foreign key behavior, `INDEX`, and `EXPLAIN` use `validationMode: "manual"`.
Manual submissions do not auto-compare results; submitting reveals the official solution for teaching review.
