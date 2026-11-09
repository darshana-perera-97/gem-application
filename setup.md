# Setup

GEM is a React frontend and an Express API backed by MongoDB. The API listens on port `1324`. The frontend runs on port `3000` and calls that API.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer, with npm
- [Docker](https://docs.docker.com/get-docker/) (used to run MongoDB)

A local MongoDB on `127.0.0.1:27017` works in place of Docker. The database name is `gem`.

## 1. Start MongoDB

From the project root:

```bash
docker compose up -d
```

This starts MongoDB 7 and publishes it only on `127.0.0.1:27017`. Data is kept in the `gem-mongo-data` volume.

Check that the container is running:

```bash
docker compose ps
```

Stop it later with:

```bash
docker compose down
```

## 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

`.env` is gitignored. The example values are:

```
PORT=1324
MONGODB_URI=mongodb://127.0.0.1:27017/gem
FRONTEND_URL=http://localhost:3000
FIREBASE_PROJECT_ID=gen-lang-client-0021275657
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:1324/api/auth/google/callback
AUTH_SECRET=replace-with-a-long-random-string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-before-going-live
SMTP_HOST=mail.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Sign in with Google uses the Firebase project in `frontend/src/firebase-applet-config.json`. `FIREBASE_PROJECT_ID` lets the API check that sign-in. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are only needed for the optional redirect flow, with `GOOGLE_CALLBACK_URL` registered on that OAuth client. Email sign-in sends a 6-digit code through the `SMTP_*` account. Platform admin sign-in at [http://localhost:3000/admin](http://localhost:3000/admin) uses `ADMIN_USERNAME` and `ADMIN_PASSWORD` from this file (not stored in MongoDB). Restart the API after saving values in this file. Phone sign-in still uses Firebase.

On startup the API connects to MongoDB, creates collections and indexes, and seeds the catalog if it is empty. You should see:

```
Server listening on http://localhost:1324
```

Confirm it:

```bash
curl http://localhost:1324/api/health
```

A healthy response looks like `{"status":"ok","database":"gem"}`.

Other scripts, from `backend/`:

| Command | What it does |
| --- | --- |
| `npm start` | Run the API without file watching |
| `npm run dev` | Run the API and restart on file changes |
| `npm run db:init` | Create collections and indexes, then exit |
| `npm run db:seed` | Seed the catalog if it is empty, then exit |

`npm run dev` already runs init and seed, so the last two are only needed on their own.

## 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

The frontend calls `http://localhost:1324` by default. To point it at another API, create `frontend/.env` (also gitignored) with:

```
REACT_APP_API_URL=http://localhost:1324
```

Restart `npm start` after changing that file. Create React App only reads `REACT_APP_*` variables.

Auth and Firestore use the config in `frontend/src/firebase-applet-config.json`.

Other scripts, from `frontend/`:

| Command | What it does |
| --- | --- |
| `npm start` | Development server on port 3000 |
| `npm test` | Run tests in watch mode |
| `npm run build` | Production build in `frontend/build` |

## Troubleshooting

**`MongoDB connection failed`** — MongoDB is not reachable. Start it with `docker compose up -d` from the project root, then restart the API.

**Frontend cannot load data** — The API must be running on port `1324`, or `REACT_APP_API_URL` must match wherever it is running.

**Port already in use** — Something else is bound to `3000`, `1324`, or `27017`. Stop that process, or change `PORT` in `backend/.env` and set the same host in `REACT_APP_API_URL`.
