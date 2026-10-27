# REST API reference

Base URL: `http://localhost:5000/api`

Successful responses use `{ "success": true, "message": "...", "data": { ... } }`. Errors use `{ "success": false, "message": "...", "details"?: [...] }`. Browser sessions use an eight-hour HttpOnly `auth_token` cookie. Postman can retain this cookie or send its value in a bearer-token authorization header.

Most operations endpoints are organization-scoped. Purchase orders and shipments are visible to participating organizations only. Invalid foreign IDs return 404 rather than revealing another organization's private record.

## Health and authentication

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | API and MongoDB readiness; 503 when database is disconnected |
| `POST` | `/auth/register` | Public, rate-limited | Create a non-admin account and its organization |
| `POST` | `/auth/login` | Public, rate-limited | Verify credentials and set the HttpOnly cookie |
| `POST` | `/auth/logout` | Authenticated | Clear the session cookie |
| `GET` | `/auth/me` | Authenticated | Return the current user's public profile |

Example registration:

```json
{
  "fullName": "Alex Morgan",
  "email": "alex@example.com",
  "password": "a-unique-password",
  "role": "manufacturer",
  "organizationName": "Northstar Manufacturing"
}
```

Public roles are `manufacturer`, `supplier`, `warehouse_manager`, and `logistics_provider`. Administrator accounts can only be provisioned by `npm run admin:create --workspace server`.

## Organization and partner directory

| Method | Path | Access | Request / result |
|---|---|---|---|
| `GET` | `/organization` | Authenticated | Current organization's profile |
| `PATCH` | `/organization` | Admin or manufacturer | `{ "name": "New organization name" }` |
| `GET` | `/organization/members` | Admin or manufacturer | Current organization members |
| `PATCH` | `/organization/members/:id` | Admin or manufacturer | `{ "role": "warehouse_manager" }` or `{ "active": false }`; cannot alter self or remove the last active manager |
| `GET` | `/organization/invitations` | Admin or manufacturer | Active pending invitations |
| `POST` | `/organization/invitations` | Admin or manufacturer | `{ "email": "teammate@example.com", "role": "supplier" }`; returns a one-time shareable link |
| `DELETE` | `/organization/invitations/:id` | Admin or manufacturer | Revoke a pending invitation |
| `GET` | `/auth/invitations/:token` | Public | Validate invitation and return invited email, role, organization and expiry |
| `POST` | `/auth/invitations/:token/accept` | Public, rate-limited | `{ "fullName": "Alex Morgan", "password": "a-unique-password" }`; creates an account in the inviting organization |
| `GET` | `/partners/suppliers` | Authenticated | Names/IDs of organizations with supplier accounts |
| `GET` | `/partners/logistics` | Authenticated | Names/IDs of organizations with logistics accounts |
| `GET` | `/admin/users` | Admin only | At most 250 account summaries, without password hashes |

Partner directories expose organization names and IDs only; they do not expose partner account email addresses or private records.

Invitation tokens are generated from cryptographically secure random bytes; only a SHA-256 token hash is stored. Links expire after seven days and are single-use. Since no email delivery provider is configured, an organization manager copies and shares the returned link through their own trusted channel. Members can be disabled instead of deleted so historical actor references remain intact; disabled users cannot sign in or use existing sessions.

## Procurement

| Method | Path | Access | Request / result |
|---|---|---|---|
| `GET` | `/suppliers?q=atlas&page=1&limit=20&sort=name&order=asc` | Authenticated, own organization | Filtered supplier records and pagination metadata |
| `POST` | `/suppliers` | Admin or manufacturer | `{ "name": "...", "participantOrganization": "<registered supplier org ID>" }` |
| `GET` | `/products?q=bolt&page=1&limit=20&sort=sku` | Authenticated, own organization | Filtered catalogue and pagination metadata |
| `POST` | `/products` | Admin or manufacturer | `{ "sku": "B-10", "name": "Bolt", "unit": "box", "reorderPoint": 20 }` |
| `GET` | `/purchase-orders?status=confirmed&page=1&limit=20&q=bolt` | Authenticated, buyer or supplier participant | Participant orders with items and status |
| `POST` | `/purchase-orders` | Admin or manufacturer | `{ "supplier": "<supplier record ID>", "items": [{ "product": "<product ID>", "quantity": 4, "unitPrice": 2.5 }], "notes": "optional" }` |
| `PATCH` | `/purchase-orders/:id/status` | Participant and role-dependent | `{ "status": "submitted", "note": "optional" }` |

Status progression: buyer submits a `draft`; buyer may approve or reject a `submitted` order; the participating supplier confirms an `approved` order. A conditional status update rejects conflicting concurrent transitions with 409. Supported query status values: `draft`, `submitted`, `approved`, `rejected`, `confirmed`. Search is escaped and limited to 100 characters; page size is at most 100.

## Warehouses and inventory

| Method | Path | Access | Request / result |
|---|---|---|---|
| `GET` | `/warehouses?q=north&page=1&limit=20` | Authenticated, own organization | Warehouse directory |
| `POST` | `/warehouses` | Admin, manufacturer, or warehouse manager | `{ "name": "...", "code": "...", "address": "optional" }` |
| `GET` | `/inventory` | Authenticated, own organization | Current stock with populated product and warehouse |
| `GET` | `/inventory/movements?page=1&limit=20` | Authenticated, own organization | Paginated, actor-attributed movement history |
| `POST` | `/inventory/movements` | Admin, manufacturer, or warehouse manager | `{ "product": "<product ID>", "warehouse": "<warehouse ID>", "direction": "in", "quantity": 8, "reason": "optional" }` |
| `GET` | `/inventory/reorder-suggestions` | Authenticated, own organization | Rules-based threshold comparison using summed stock |
| `GET` | `/inventory/notifications` | Authenticated, current user | The current user's organization-scoped notifications |

Outbound adjustments use a conditional atomic database update requiring sufficient stock. Replica-set deployments write stock and movement records in a transaction. Standalone deployments use a pending journal entry and per-adjustment marker; `npm run inventory:reconcile --workspace server` safely retries interrupted writes. Quantities must be positive, and the inventory schema rejects negative balances. Reorder amount is `max(0, reorderPoint - current quantity)`; the endpoint does not claim to predict future demand.

## Shipments

| Method | Path | Access | Request / result |
|---|---|---|---|
| `GET` | `/shipments?status=in_transit&page=1&limit=20&q=demo` | Authenticated participant | Visible shipments with ETA and event history |
| `POST` | `/shipments` | Admin or manufacturer | `{ "purchaseOrder": "<confirmed PO ID>", "providerOrganization": "<registered logistics org ID>", "origin": "...", "destination": "...", "expectedDelivery": "2030-01-01T00:00:00Z", "trackingNumber": "optional", "estimatedCost": 42.5 }` |
| `PATCH` | `/shipments/:id/status` | Participant organization and role | `{ "status": "in_transit", "message": "optional" }` |
| `POST` | `/shipments/:id/events` | Authenticated participant | `{ "message": "Warehouse handoff completed" }` |

The supplier marks a pending shipment ready. The assigned logistics organization can move it to transit, report a delay, or mark delivery. The buyer can cancel a pending or ready shipment. Transitions append timestamped events. An expired ETA is displayed as an indicator, not claimed as live tracking.

## Analytics and algorithms

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/analytics/overview` | Authenticated; participant/organization filters | Database-derived order, shipment, warehouse, supplier-value, and low-stock summaries |
| `GET` | `/algorithms` | Authenticated | Catalog of algorithm inputs, examples, result shapes, unit, and complexity |
| `POST` | `/algorithms/run` | Authenticated | Run one capped algorithm with its algorithm ID and JSON input |
| `GET` | `/optimization/network` | Authenticated | Explicit illustrative graph vertices and sample edge weights |
| `POST` | `/optimization/route` | Authenticated | `{ "origin": "Central Hub", "destination": "South Port", "costPerDistance": 2 }` |

The algorithm catalog includes BST, AVL and threaded trees; heap sort and priority queues; graph representations/traversal/components/Dijkstra/Bellman–Ford/Floyd–Warshall/MST/transitive closure; 0/1 knapsack, LCS, matrix-chain and resource-allocation DP; N-Queens, graph colouring, subset-sum, Hamiltonian cycle, dynamic-programming TSP and branch-and-bound TSP; red-black/B/B+ trees and binomial/Fibonacci heaps.

Backtracking and dynamic-programming implementations enforce input and state-size caps. Route-planning weights and costs are sample values—not live road-network distances, traffic, GPS data, or carrier quotes.

## Status codes

`200` successful read/update; `201` new record; `400` invalid input; `401` missing/invalid session; `403` insufficient role; `404` resource unavailable in the caller's scope; `409` duplicate record, insufficient stock, or invalid concurrent transition; `429` authentication rate limit; `500` unexpected server failure; `503` MongoDB not ready.
