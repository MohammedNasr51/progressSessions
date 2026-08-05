# BrightPath Progress API

A small shared backend for the BrightPath frontend. It runs with Node.js locally and is ready for Deno Deploy. MongoDB Atlas stores the shared monthly session data.

## API

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Deployment health check |
| `GET` | `/api/months/:month/sessions` | Public | Read a month's sessions |
| `PUT` | `/api/months/:month/sessions` | Admin | Replace all sessions for a month |
| `PUT` | `/api/months/:month/sessions/:id` | Admin | Create or update one session |
| `DELETE` | `/api/months/:month/sessions/:id` | Admin | Delete one session |

Write routes require an `X-Admin-Key` header matching the server's `ADMIN_KEY` environment variable.

## Run locally with Node

1. Copy `.env.example` to `.env` and insert the MongoDB Atlas connection string.
2. Load those environment values in your terminal or editor.
3. Install and run:

```bash
npm install
npm test
npm run dev
```

Node does not load `.env` automatically in this project. With Node 20.6+, you can alternatively run `node --env-file=.env src/server.js`.

## Run locally with Deno

```bash
deno install
deno task test
deno task start
```

Granting `--allow-env` and `--allow-net` is already included in the Deno tasks.

## MongoDB Atlas setup

1. Create a cluster and a database user.
2. Allow network access from the deployment. Deno Deploy uses dynamic outbound addresses, so Atlas commonly requires `0.0.0.0/0`; use a strong database password and least-privilege database user if you enable it.
3. Copy the Atlas driver connection string into the `MONGODB_URI` environment variable.
4. Set `MONGODB_DB` to `brightpath` or another database name.

The API creates the `sessions` collection and indexes automatically after its first successful connection.

## Deploy to Deno Deploy

1. Put this `backend` folder in its own GitHub repository (its contents should be at the repository root).
2. In Deno Deploy, create an application and connect that repository.
3. Use `src/server.js` as the entry point or `deno task start` as the run command, depending on the dashboard flow.
4. Add these environment variables/secrets in Deno Deploy: `MONGODB_URI`, `MONGODB_DB`, `ADMIN_KEY`, and `ALLOWED_ORIGINS`.
5. Set `ALLOWED_ORIGINS` to the exact GitHub Pages origin, for example `https://mohammednasr51.github.io`.
6. Deploy, then open `/health` on the deployment URL.

### Exact Deno Deploy configuration

The committed `deno.json` now supplies these settings automatically:

- App directory: repository root
- Framework preset: none
- Install command: `deno install`
- Build command: none
- Runtime mode: dynamic
- Entrypoint: `src/server.js`

Use the new dashboard at `https://console.deno.com`, not Deno Deploy Classic. Add every environment variable to both **Production** and **Development** contexts so production, branch, and preview timelines can start.

Never put `MONGODB_URI` or `ADMIN_KEY` in Git or in frontend JavaScript.

## Example request

```bash
curl -X PUT "http://localhost:8000/api/months/2026-08/sessions/session-1" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{"number":1,"title":"Fractions","date":"2026-08-05","note":"Great progress","status":"great"}'
```

The frontend is not connected to this API yet. Once the backend is deployed, add its public URL and admin key handling to the frontend.
