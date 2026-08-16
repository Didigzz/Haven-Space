# Haven Space Project Context

Haven Space is a boarding house platform connecting boarders and landlords, with an admin management layer. It is built as a modern serverless application leveraging the Cloudflare ecosystem.

## Project Overview

- **Frontend:** Static Multi-Page Application (MPA) using vanilla HTML, CSS, and modern JavaScript.
  - **Hosting:** Cloudflare Pages.
  - **Architecture:** Modular JS with dynamic imports based on `data-view` attributes on the `<body>` tag.
- **Backend:** RESTful API built with TypeScript and [Hono](https://hono.dev/).
  - **Hosting:** Cloudflare Workers.
  - **Database:** Cloudflare D1 (Distributed SQL).
  - **Authentication:** JWT-based (stored in cookies/localStorage) with bcrypt password hashing and Google OAuth support.
- **Uploads:** Handled via [UploadThing](https://uploadthing.com/).
- **Tooling:** [Bun](https://bun.sh/) is the primary runtime, package manager, and test runner. [Wrangler](https://developers.cloudflare.com/workers/wrangler/) for Cloudflare development and deployment.

## Project Structure

- `/client`: Frontend source code.
  - `/js`: Modular JavaScript components.
    - `/auth`: Authentication logic (login, signup, etc.).
    - `/shared`: Shared utilities (icons, routing, toast, theme).
    - `/views`: View-specific initialization logic.
  - `/css`: Stylesheets.
  - `/assets`: Images, SVGs, and other static assets.
- `/workers/api`: Cloudflare Worker API.
  - `/src`: TypeScript source.
    - `/repositories`: Data access layer using D1.
    - `/routes`: Hono route definitions.
    - `/lib`: Shared utilities (auth, validation, HTTP helpers).
  - `/migrations`: D1 database migrations.
- `/scripts`: Build and maintenance scripts.
- `/docs`: Detailed project documentation (design, schemas, manuals).
- `schema_simple.sql`: Reference SQL schema for the D1 database.

## Key Commands

### Setup

```bash
bun install
bun install --cwd workers/api
```

### Development

- **Run Frontend:** `bun run dev` (Starts Cloudflare Pages local dev server at `http://localhost:8788`)
- **Run API:** `bun run cf:api:dev` (Starts Worker local dev server at `http://localhost:8787`)
- **Database Migrations (Local):** `bun run --cwd workers/api migrate:local`

### Testing & Quality

- **Typecheck API:** `bun run cf:api:typecheck`
- **Test API:** `bun run cf:api:test`
- **Lint Frontend:** `bun run lint`
- **Format Code:** `bun run format`

### Deployment

- **Full Deploy:** `bun run deploy` (Deploys both Worker and Pages)
- **Deploy API:** `bun run cf:api:deploy`
- **Deploy Pages:** `bun run cf:pages:deploy`

## Development Conventions

### Backend

- **Hono & TypeScript:** Use Hono for routing. Strictly type environment bindings and request/response payloads.
- **Repository Pattern:** Keep database logic in `workers/api/src/repositories`. Routes should call repository methods rather than D1 directly.
- **Error Handling:** Use `HttpError` and `jsonResponse`/`responseFromError` helpers from `lib/http` for consistent API responses.
- **Validation:** Validate incoming JSON using helpers in `lib/validation`.

### Frontend

- **Modular JS:** Organize logic into ES modules in `client/js`.
- **View Initialization:** Views are initialized via `client/js/main.js` which detects `data-view` on the body.
- **API Communication:** Use `CONFIG.API_BASE_URL` from `client/js/config.js` for all API calls.
- **Icons:** Use the centralized icon library via `getIcon` in `client/js/shared/icons.js`.

### General

- **Naming:** Use `camelCase` for JavaScript/TypeScript variables and functions, `snake_case` for database columns and API response fields (where matching DB schema).
- **Commits:** Follow conventional commit messages.
