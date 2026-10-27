# College demonstration checklist

## Before the presentation

- [ ] Install Node.js 20+ and MongoDB; copy `.env.example` to `.env` and set a random JWT secret.
- [ ] Run `npm install`, `npm test`, and `npm run build`.
- [ ] Start MongoDB, create an administrator with the protected setup command if needed, then create illustrative demo data using the seed command.
- [ ] Start the application with `npm run dev` and verify `/api/health` reports a connected database.
- [ ] Sign in to one role at a time using the demo credentials set during seeding.

## Suggested walkthrough

1. **Landing and signup:** show the role choices and explain why public registration cannot create administrators.
2. **Manufacturer:** show the organization dashboard; explain that totals come from stored records.
3. **Supplier collaboration:** show the registered supplier organization directory and product catalogue.
4. **Procurement:** create a draft order; submit and approve it as the buyer; confirm it as the participating supplier.
5. **Inventory:** record stock-in, attempt an outbound quantity larger than available stock, then show that the API rejects it without making the balance negative.
6. **Reorder rule:** lower stock below the configured reorder point and show the suggested replenishment quantity and its formula.
7. **Logistics:** create a shipment from a confirmed order, advance supplier/provider status, then inspect the timestamped event timeline.
8. **Analytics:** explain observed database counts and the strict limits on supplier comparisons and delivery indicators.
9. **DAA lab:** demonstrate one tree, a shortest-route graph, knapsack/resource allocation, a bounded backtracking example, and the advanced heap comparison.
10. **Explain limitations:** route weights are illustrative; status timelines are manual records; no live GPS, carrier API, machine-learning forecasts, or external dataset is claimed.

## Stop conditions

- Never enter real company/private customer data into the demonstration seed.
- Do not use the temporary demo password outside the local demonstration.
- If tests fail or MongoDB is unavailable, state that fact; do not present unrun checks as passing.
