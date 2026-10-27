# College demonstration checklist

## Browser-only Vercel presentation

- [ ] Open the Vercel site and choose a role from the sample account list on the sign-in page.
- [ ] Shared browser-demo password: `demo123`.
- [ ] No server, database, or Vercel environment variables are needed for this presentation deployment.
- [ ] Use **Reset demo** in the workspace banner to restore the sample data between presentation runs.
- [ ] Explain that actions update illustrative data in the current browser only; this deployment has no backend authentication or shared persistence.

## Optional full-stack local development

- [ ] Install Node.js 20+ and MongoDB; copy `.env.example` to `.env` and set a random JWT secret.
- [ ] Run `npm install` and `npm test`.
- [ ] Start MongoDB, create an administrator with the protected setup command if needed, then create illustrative database demo data using the seed command.
- [ ] Start the API and UI separately with `npm run dev --workspace server` and `npm run dev --workspace client`.

## Suggested walkthrough

1. **Landing and sign-in:** explain that the hosted presentation version runs entirely in the browser and contains clearly labelled sample data.
2. **Manufacturer:** show the organization dashboard; explain that the displayed figures are computed from editable illustrative records.
3. **Supplier collaboration:** show the registered supplier organization directory and product catalogue.
4. **Procurement:** create a draft order; submit and approve it as the buyer; confirm it as the participating supplier.
5. **Inventory:** record stock-in, attempt an outbound quantity larger than available stock, then show that the browser demo prevents a negative sample balance.
6. **Reorder rule:** lower stock below the configured reorder point and show the suggested replenishment quantity and its formula.
7. **Logistics:** create a shipment from a confirmed order, advance supplier/provider status, then inspect the timestamped event timeline.
8. **Analytics:** explain observed database counts and the strict limits on supplier comparisons and delivery indicators.
9. **DAA lab:** demonstrate one tree, a shortest-route graph, knapsack/resource allocation, a bounded backtracking example, and the advanced heap comparison.
10. **Explain limitations:** route weights are illustrative; status timelines are manual sample records; no live GPS, carrier API, machine-learning forecasts, external dataset, or hosted backend is connected.

## Stop conditions

- The hosted presentation accounts and records are fictional browser-side samples—not secure accounts. Custom sample-account passwords are stored in this browser and are not protected.
- Do not use the shared demo password for real accounts or services.
- If tests fail or MongoDB is unavailable, state that fact; do not present unrun checks as passing.
