# College demonstration checklist

## Vercel deployment

- [ ] Install Node.js 20+ and MongoDB; copy `.env.example` to `.env` and set a random JWT secret.
- [ ] Create a MongoDB Atlas database and database user. Configure its network access to permit Vercel serverless connections.
- [ ] Add `MONGODB_URI`, `JWT_SECRET` (unique, at least 32 characters), and `CLIENT_ORIGIN` (the exact deployed site origin) to Vercel Production environment variables. Never use `VITE_` prefixes for secrets.
- [ ] Set the Vercel project root to the repository root; deploy `main` and verify `/api/health` reports a connected database.
- [ ] Register a normal account, sign in, and verify organization data persists after reloading or signing in from another browser.
- [ ] For an administrator, run the protected one-time `admin:create` script locally against the hosted MongoDB. Do not expose bootstrap credentials in the client or commit them.
- [ ] Run `npm install`, `npm test`, and `npm run build`.

## Local full-stack development

- [ ] Start MongoDB, create an administrator with the protected setup command if needed, then create illustrative database demo data using the seed command.
- [ ] Start the API and UI separately with `npm run dev --workspace server` and `npm run dev --workspace client`.

## Suggested walkthrough

1. **Landing and sign-in:** create an organization account or sign in with a previously registered account.
2. **Manufacturer:** show the organization dashboard; explain that the displayed figures are computed from its records.
3. **Supplier collaboration:** show the registered supplier organization directory and product catalogue.
4. **Procurement:** create a draft order; submit and approve it as the buyer; confirm it as the participating supplier.
5. **Inventory:** record stock-in, attempt an outbound quantity larger than available stock, then show that the API prevents a negative balance.
6. **Reorder rule:** lower stock below the configured reorder point and show the suggested replenishment quantity and its formula.
7. **Logistics:** create a shipment from a confirmed order, advance supplier/provider status, then inspect the timestamped event timeline.
8. **Analytics:** explain observed database counts and the strict limits on supplier comparisons and delivery indicators.
9. **DAA lab:** demonstrate one tree, a shortest-route graph, knapsack/resource allocation, a bounded backtracking example, and the advanced heap comparison.
10. **Explain limitations:** route weights are illustrative; status timelines are manual records; no live GPS, carrier API, machine-learning forecasts, or external dataset is connected.

## Stop conditions

- Use only authorized accounts and avoid presenting illustrative seeded records as external/live data.
- If tests fail or MongoDB is unavailable, state that fact; do not present unrun checks as passing.
