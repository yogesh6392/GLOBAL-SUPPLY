# Intelligent Global Supply Chain Collaboration Platform

A full-stack NIET B.Tech CSE college-project application for manufacturers, suppliers, warehouse teams, logistics providers, and platform administrators. It combines organization-scoped REST workflows with a dedicated Design and Analysis of Algorithms (DAA) laboratory.

The project is intentionally transparent: dashboard totals are calculated from stored records; reorder suggestions use configured thresholds; route distances are sample graph weights. There is no live carrier integration, GPS tracking, machine-learning forecast, or claimed external dataset.

## What is implemented

- **Authentication and organization:** registration, login, logout, protected profile, bcrypt password hashes, eight-hour signed JWT sessions in HttpOnly cookies, role checks, rate-limited auth, administrator-only setup, and organization-scoped team invitations and member access management.
- **Supplier and procurement collaboration:** scoped supplier and product directory, search/sort/pagination, purchase-order items and history, and role-checked order status transitions.
- **Warehouse and inventory:** organization-owned warehouses, current stock, attributed movement history, low-stock notifications, reorder recommendations, atomic balance adjustment, and safeguards against negative stock.
- **Logistics:** participant-scoped shipments, required origin/destination, estimated delivery fields, role-checked state transitions, and timestamped manual event history.
- **Analytics and optimization:** record-based summaries, observed purchase-order value comparison, reorder rule summaries, Dijkstra-based routing, and explicit sample-network cost calculations.
- **DAA Algorithm Laboratory:** 28 JavaScript demonstrations across all five syllabus units, with sample inputs, result shapes, complexity notes, validation, and bounded exponential searches.
- **Delivery materials:** API reference, Mermaid architecture/ER diagrams, NIET project-report outline, test suite, explicit demo seeding, and a presentation checklist.

## Requirements

- Node.js 20+ and npm.
- MongoDB Community Server locally, or another reachable MongoDB URI.
- VS Code (recommended).

## Start in VS Code

1. Open this folder in VS Code.
2. In the integrated PowerShell terminal, create a private environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Edit `.env` and set `JWT_SECRET` to a unique random value of at least 32 characters. Keep `.env` private; it is ignored by Git.
4. Start MongoDB. The default URI is `mongodb://127.0.0.1:27017/global_supply_chain`.
5. In a terminal at the project root, install dependencies:

   ```powershell
   npm install
   ```

6. Start the API and frontend together:

   ```powershell
   npm run dev
   ```

7. Open `http://localhost:5173`. The API listens at `http://localhost:5000`; check `http://localhost:5000/api/health` for database readiness.

To run the API and UI in separate terminals, use `npm run dev --workspace server` and `npm run dev --workspace client`. Build the production client with `npm run build`.

If MongoDB is unavailable, the UI development server may still start, but API features require a reachable database. Automated API tests use an isolated temporary MongoDB instance and do not write to the configured project database.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | API port | `5000` |
| `CLIENT_ORIGIN` | Credentialed CORS allowed origin | `http://localhost:5173` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/global_supply_chain` |
| `JWT_SECRET` | HS256 signing secret, at least 32 characters | Required |
| `BOOTSTRAP_ADMIN_EMAIL` | Admin setup email | Not set |
| `BOOTSTRAP_ADMIN_PASSWORD` | Admin setup password, 12–72 bytes | Not set |
| `BOOTSTRAP_ADMIN_ORGANIZATION` | Admin setup organization | `Platform Administration` |
| `ALLOW_DEMO_SEED` | Explicit opt-in for sample records | Must be `true` |
| `SEED_DEMO_PASSWORD` | Temporary password shared by local demo accounts, 12–72 bytes | Not set |

## Create an administrator

Public registration never accepts the `admin` role. Supply unique values in the current terminal and run the protected setup command:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL = "admin@example.com"
$env:BOOTSTRAP_ADMIN_PASSWORD = "<your-unique-password-of-at-least-12-characters>"
$env:BOOTSTRAP_ADMIN_ORGANIZATION = "Platform Administration"
npm run admin:create --workspace server
Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL, Env:BOOTSTRAP_ADMIN_PASSWORD, Env:BOOTSTRAP_ADMIN_ORGANIZATION
```

The command refuses to overwrite an existing account. Do not commit credentials or put them in source code.

## Seed clearly labelled demo data

After the API database is set up, an explicit opt-in can create four demo roles and sample supplier, order, stock, and shipment records. The script refuses to run in production, requires a temporary password from the environment, and refuses duplicate demo accounts.

```powershell
$env:ALLOW_DEMO_SEED = "true"
$env:SEED_DEMO_PASSWORD = "<your-unique-temporary-demo-password-of-at-least-12-characters>"
npm run seed:demo --workspace server
Remove-Item Env:ALLOW_DEMO_SEED, Env:SEED_DEMO_PASSWORD
```

Demo account emails and the recommended role-by-role presentation flow are in [docs/DEMO_CHECKLIST.md](./docs/DEMO_CHECKLIST.md). All seeded accounts share the temporary password entered above. Do not use it as a production credential.

## Test and security checks

```powershell
npm test
npm run build
npm audit
```

The API tests cover registration, hashed passwords, admin-role rejection, login/invalid credentials, logout, protected routes, order/shipment participants, concurrent stock protection, interrupted-stock-movement reconciliation, explicit demo-seed opt-in and duplicate-run safeguards, algorithms, and analytics/optimization endpoints. The isolated test database may download a MongoDB binary on first use.

For a standalone MongoDB deployment, run the recoverable movement journal check with `npm run inventory:reconcile --workspace server`. On a replica set, stock movements use MongoDB transactions.

## API, diagrams and report

- Complete routes, request examples, role boundaries, and response semantics: [docs/API.md](./docs/API.md)
- Architecture and entity-relationship diagrams: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- College report outline and five-unit DAA mapping: [docs/PROJECT_REPORT_OUTLINE.md](./docs/PROJECT_REPORT_OUTLINE.md)
- Presentation walkthrough and limitations: [docs/DEMO_CHECKLIST.md](./docs/DEMO_CHECKLIST.md)

The primary demo pages are `/dashboard`, `/organization`, `/collaboration`, `/procurement`, `/inventory`, `/shipments`, `/optimization`, `/analytics`, `/algorithms`, and `/admin`.

## Important limitations

- Public registration creates one organization per account; teammates join an existing organization through a seven-day, single-use invitation link. Email delivery is not configured, so managers share links through their trusted channels.
- Partner names/IDs are discoverable to authenticated users; operational records remain scoped to organization participants.
- Inventory balance updates are atomic. Replica-set deployments use multi-document transactions. On standalone MongoDB, a pending journal entry and per-adjustment marker make partial writes detectable and retry-safe; rerun the documented reconciliation command after an interrupted process.
- The route graph and edge weights are sample data—not live road distances, traffic, GPS, or carrier quotes. The estimated cost is illustrative arithmetic.
- Supplier comparison reflects observed purchase-order values only. It does not infer supplier quality, reliability, or future performance.
- This college prototype is not a production security certification. Add deployment-specific CSRF defenses, email verification, password recovery, monitoring, and formal threat modeling before production use.
- No external hosting provider was specified, so no provider-specific deployment was performed.
