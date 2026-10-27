import mongoose from "mongoose";
import { Inventory, InventoryMovement } from "../models/Operations.js";
import HttpError from "../utils/HttpError.js";

function isTransactionsUnavailable(error) {
  return error?.code === 20 ||
    error?.code === 303 ||
    error?.codeName === "IllegalOperation" ||
    /Transaction numbers are only allowed|replica set|mongos/i.test(error?.message ?? "");
}

async function updateBalance({ key, userId, direction, quantity, token, session }) {
  const filter = token ? { ...key, appliedMovements: { $ne: token } } : key;
  const update = {
    $inc: { quantity: direction === "in" ? quantity : -quantity },
    $set: { updatedBy: userId },
    ...(token ? { $addToSet: { appliedMovements: token } } : {})
  };
  if (direction === "out") filter.quantity = { $gte: quantity };
  const options = { new: true, runValidators: true, session };

  if (direction === "out") {
    return Inventory.findOneAndUpdate(filter, update, options);
  }

  try {
    return await Inventory.findOneAndUpdate(
      filter,
      { ...update, $setOnInsert: key },
      { ...options, upsert: true, setDefaultsOnInsert: false }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    return Inventory.findOneAndUpdate(filter, update, options);
  }
}

async function commitWithTransaction(adjustment) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const movement = new InventoryMovement({ ...adjustment, status: "applied" });
      await movement.save({ session });
      const inventory = await updateBalance({
        ...adjustment,
        session
      });
      if (!inventory) throw new HttpError(409, "Insufficient stock for this movement.");
      result = { inventory, movement };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function commitWithRecoverableJournal(adjustment) {
  const movement = await InventoryMovement.create({ ...adjustment, status: "pending" });
  const inventory = await updateBalance({ ...adjustment, token: movement._id });
  if (!inventory) {
    await InventoryMovement.updateOne({ _id: movement._id }, { $set: { status: "failed" } });
    throw new HttpError(409, "Insufficient stock for this movement.");
  }

  await InventoryMovement.updateOne(
    { _id: movement._id, status: "pending" },
    { $set: { status: "applied" } }
  );
  await Inventory.updateOne(
    { ...adjustment.key },
    { $pull: { appliedMovements: movement._id } }
  );
  movement.status = "applied";
  return { inventory, movement };
}

/**
 * Use a replica-set transaction when available. On a standalone MongoDB,
 * record a pending movement before the balance update and tag the atomic
 * balance update with that movement ID. A crash can then be reconciled
 * without applying the same movement twice.
 */
export async function applyStockAdjustment({ organization, product, warehouse, direction, quantity, reason, userId }) {
  const key = { organization, product, warehouse };
  const adjustment = { ...key, direction, quantity, reason, performedBy: userId };
  try {
    return await commitWithTransaction(adjustment);
  } catch (error) {
    if (!isTransactionsUnavailable(error)) throw error;
  }
  return commitWithRecoverableJournal({ ...adjustment, key });
}

export async function reconcilePendingStockMovements() {
  const pending = await InventoryMovement.find({ status: "pending" }).sort({ createdAt: 1 });
  const results = [];
  for (const movement of pending) {
    const key = {
      organization: movement.organization,
      product: movement.product,
      warehouse: movement.warehouse
    };
    const taggedInventory = await Inventory.findOne({
      ...key,
      appliedMovements: movement._id
    });
    if (!taggedInventory) {
      const inventory = await updateBalance({
        key,
        userId: movement.performedBy,
        direction: movement.direction,
        quantity: movement.quantity,
        token: movement._id
      });
      if (!inventory) {
        await InventoryMovement.updateOne(
          { _id: movement._id, status: "pending" },
          { $set: { status: "failed" } }
        );
        results.push({ movementId: String(movement._id), status: "failed" });
        continue;
      }
    }
    await InventoryMovement.updateOne(
      { _id: movement._id, status: "pending" },
      { $set: { status: "applied" } }
    );
    await Inventory.updateOne(key, { $pull: { appliedMovements: movement._id } });
    results.push({ movementId: String(movement._id), status: "applied" });
  }
  return results;
}
