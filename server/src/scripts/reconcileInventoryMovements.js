import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { getConfig } from "../config/env.js";
import { reconcilePendingStockMovements } from "../services/stockAdjustments.js";

await connectDatabase(getConfig().mongoUri);
try {
  const results = await reconcilePendingStockMovements();
  console.log(`Reconciled ${results.length} pending inventory movement(s).`);
  for (const result of results) {
    console.log(`  ${result.movementId}: ${result.status}`);
  }
} finally {
  await mongoose.disconnect();
}
