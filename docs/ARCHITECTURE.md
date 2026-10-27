# Architecture and data model

## Component architecture

```mermaid
flowchart LR
    Browser["React 18 + Vite\nReact Router · Axios"] -->|HTTP / JSON + HttpOnly cookie| API["Express REST API"]
    API --> Security["Helmet · CORS · auth rate limit\nvalidation · JWT · role checks"]
    API --> Auth["Auth + organization controllers"]
    API --> Procurement["Supplier · product · purchase order"]
    API --> Inventory["Warehouse · inventory · movement"]
    API --> Logistics["Shipment · timeline · notification"]
    API --> Algorithms["DAA algorithms + optimizers"]
    Auth --> Mongo[("MongoDB / Mongoose")]
    Procurement --> Mongo
    Inventory --> Mongo
    Logistics --> Mongo
    Analytics["Organization-scoped analytics"] --> Mongo
    API --> Analytics
    Algorithms --> API
```

## Entity relationship diagram

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : has
    ORGANIZATION ||--o{ INVITATION : invites
    ORGANIZATION ||--o{ SUPPLIER : owns_directory_entry
    ORGANIZATION ||--o{ PRODUCT : owns
    ORGANIZATION ||--o{ WAREHOUSE : owns
    ORGANIZATION ||--o{ INVENTORY : scopes
    PRODUCT ||--o{ INVENTORY : stocked_as
    WAREHOUSE ||--o{ INVENTORY : stores
    INVENTORY ||--o{ INVENTORY_MOVEMENT : adjusted_by
    ORGANIZATION ||--o{ PURCHASE_ORDER : buys
    ORGANIZATION ||--o{ PURCHASE_ORDER : supplies
    SUPPLIER ||--o{ PURCHASE_ORDER : fulfills
    PRODUCT ||--o{ PURCHASE_ORDER_ITEM : ordered
    PURCHASE_ORDER ||--|{ PURCHASE_ORDER_ITEM : contains
    PURCHASE_ORDER ||--o{ SHIPMENT : fulfilled_by
    ORGANIZATION ||--o{ SHIPMENT : buyer
    ORGANIZATION ||--o{ SHIPMENT : supplier
    ORGANIZATION ||--o{ SHIPMENT : logistics_provider
    SHIPMENT ||--o{ SHIPMENT_EVENT : records
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDIT_LOG : performs
```

Purchase-order items, shipment timelines, and transitions are embedded in their parent document so each state change can be applied atomically to that record. Inventory balance is a dedicated organization/product/warehouse document with a unique compound index; retained movement records are actor-attributed and track pending/applied/failed recovery status.

## Trust boundaries and consistency

- The API derives organization scope from the verified JWT's current database user, not a caller-supplied organization ID.
- Organization administrators and manufacturers can invite non-administrator teammates. Invitation links are single-use, expire after seven days, and store only a hash of the token. Members are disabled rather than deleted, preserving historical actor references; disabled accounts cannot authenticate.
- Supplier and logistics organizations are linked as explicit partners. Purchase-order and shipment reads require participation.
- Authentication tokens are signed using a configured secret, expire after eight hours, and are stored in HttpOnly cookies. Role checks are enforced at API handlers.
- Stock balance changes use an atomic MongoDB update; outbound changes also use a `quantity >= requested quantity` predicate. Replica-set deployments use a multi-document transaction for the balance and movement writes.
- Purchase-order and shipment transitions compare the prior status in the update filter to detect races.
- The default standalone MongoDB local configuration does not support multi-document transactions. Its alternative writes a pending movement first, then applies the balance update atomically with that movement's ID. A crash before the balance update is replayed; a crash after the update is detected by the ID marker so it is not double-applied. Run `npm run inventory:reconcile --workspace server` after an interrupted process.
- The journal protects recovery from process interruption, but this prototype is not a financial ledger; production deployment should use a replica set, reconciliation monitoring, and an independently reviewed audit policy.
- Analytics are database aggregations and explicitly identify the source. The route optimizer uses a tiny documented demonstration graph, not an external map service.

## Runtime shape

The `client` Vite development server proxies `/api` to Express. In production, serve the built client and expose the API from an HTTPS deployment with a matching `CLIENT_ORIGIN`, production cookie settings, private `JWT_SECRET`, and MongoDB connection string.
