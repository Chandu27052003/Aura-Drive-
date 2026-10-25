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

### 3) Start the API server

```bash
npm start
```

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
