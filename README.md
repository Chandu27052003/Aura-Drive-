# AURA DRIVE INDIA

A premium car showroom experience built as a responsive dealership SPA with a working inventory backend, smart comparison tools, and online purchase flow.

<p align="center">
  <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80" alt="Luxury car showcase" width="100%" />
</p>

## Overview

AURA DRIVE INDIA is a modern dealership web app that combines:

- a dark premium showroom UI
- a live inventory API for vehicles
- a comparison module for new cars
- an EMI calculator for financing
- a checkout flow for purchases
- admin-style inventory controls and authentication

This project was built as a full-stack prototype using a Node.js + Express backend and a static single-page frontend.

## Features

- Direct showroom browsing without a login wall
- JWT authentication for login and registration
- Vehicle listing with category filtering and search
- Side-by-side comparison of specs and pricing
- EMI calculator with financing estimates
- Purchase flow with stock decrement logic
- Admin restocking and inventory management
- SQLite-powered data storage

## Screenshots

<p align="center">
  <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80" alt="Car showroom front view" width="48%" />
  <img src="https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=900&q=80" alt="Vehicle comparison dashboard" width="48%" />
</p>

<p align="center">
  <img src="https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=900&q=80" alt="Luxury sedan" width="48%" />
  <img src="https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=900&q=80" alt="Car purchase scenario" width="48%" />
</p>

## Tech Stack

- Frontend: HTML, CSS, Tailwind CSS, JavaScript
- Backend: Node.js, Express.js
- Database: SQLite
- Auth: JWT + bcrypt
- Testing: Jest + Supertest

## Project Structure

```bash
.
├── backend/
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── dealership.sqlite
├── frontend/
│   └── index.html
├── README.md
└── .gitignore
```

## Local Setup

### 1) Install backend dependencies

```bash
cd backend
npm install
```

### 2) Run tests

```bash
npm test
```

### 3) Configure a signing secret and start the API server

The API requires `JWT_SECRET` to contain at least 32 bytes of secret material.
Use a cryptographically random value, not a password or a value committed to Git.
There is no default signing key, and startup fails if the key is missing or too short.

For a temporary local session (Bash):

```bash
export JWT_SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"
npm start
```

For a deployed instance, set a stable, randomly generated `JWT_SECRET` through the
hosting provider's secret manager. All instances must use the same key. Changing
it invalidates existing sessions. Do not print or commit the deployed secret.
The app reads environment variables directly; it does not automatically load `.env` files.

The API will run locally at:

```bash
http://localhost:3000
```

### 4) Open the frontend

Open the file:

```bash
frontend/index.html
```

or use a local static server:

```bash
npx serve frontend
```

## API Highlights

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/vehicles`
- `GET /api/vehicles/search`
- `POST /api/vehicles`
- `PUT /api/vehicles/:id`
- `DELETE /api/vehicles/:id`
- `POST /api/vehicles/:id/purchase`
- `POST /api/vehicles/:id/restock`

## Authentication and administrator access

- Public registration always creates a `customer`, even if the request includes a role.
- Browsing and searching inventory remain public.
- Purchases require a signed-in customer or administrator.
- Creating, updating, deleting, and restocking inventory require an administrator.
- Administrator access is checked against the current database role on each request,
  so removing or demoting an administrator revokes inventory access immediately.

To provision an administrator for local development, first register the account
normally. A trusted operator can then promote that specific account directly in
the database, using a SQLite client with the correct database selected:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-admin@example.com';
```

Replace the example email with the intended registered account and verify that
exactly one row was changed. There is deliberately no public role-management
endpoint. Sign in again after promotion so the client receives the current role.

When upgrading an existing installation, review existing administrator accounts
and demote any that were not provisioned by a trusted operator. Rotate the signing
secret during the upgrade to invalidate tokens issued with the previous key.

### Test isolation

`npm test` uses an in-memory SQLite database and a random, test-only signing key.
The suite creates administrator fixtures directly in that isolated database; it
never promotes users through the registration API or modifies `dealership.sqlite`.
It covers privilege escalation, all inventory mutation permissions, invalid tokens,
administrator revocation, and customer purchases.
The backend test workflow runs the same suite on Node.js 22 and 24 for relevant
pushes and pull requests.

## AI Workflow

This project was accelerated with AI-powered assistance for:

- API contract design
- database schema shaping
- TDD test writing
- UI styling and dealership layout refinement
- financial logic for EMI calculations

## License

This project is built for showroom demo and learning purposes.

## GitHub Push

After saving your changes locally, push to your GitHub repository with:

```bash
git init
git add .
git commit -m "Initial commit: Aura Drive showroom app"
git branch -M main
git remote add origin https://github.com/Chandu27052003/Aura-Drive-.git
git push -u origin main
```

If prompted for credentials, use your GitHub username and a personal access token (PAT).
