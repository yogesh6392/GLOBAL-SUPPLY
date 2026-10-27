import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertRole,
  requireDate,
  requireObject,
  requirePositiveNumber,
  requireText,
  requireValidId
} from "../validators/operations.js";

test("operation validators accept well-formed identifiers, dates, and quantities", () => {
  assert.equal(requireValidId("507f1f77bcf86cd799439011", "Product"), undefined);
  assert.equal(requirePositiveNumber(0, "Reorder point", { allowZero: true }), undefined);
  assert.ok(requireDate("2026-10-27T00:00:00.000Z", "Expected delivery") instanceof Date);
  assert.doesNotThrow(() => requireObject({ product: "id" }, ["product"]));
  assert.doesNotThrow(() => requireText(" SKU-1 ", "SKU", 80));
});

test("operation validators reject malformed or unsafe request values", () => {
  assert.throws(() => requireValidId("not-an-id", "Product"), { status: 400 });
  assert.throws(() => requirePositiveNumber(-1, "Quantity"), { status: 400 });
  assert.throws(() => requirePositiveNumber(Number.NaN, "Quantity"), { status: 400 });
  assert.throws(() => requirePositiveNumber(0.0000001, "Quantity", { minimum: 0.000001 }), { status: 400 });
  assert.throws(() => requireDate("invalid", "Expected delivery"), { status: 400 });
  assert.throws(() => requireObject([], ["product"]), { status: 400 });
  assert.throws(() => requireText("", "SKU"), { status: 400 });
});

test("operation role guard denies roles outside the permitted set", () => {
  assert.doesNotThrow(() => assertRole("warehouse_manager", ["admin", "warehouse_manager"]));
  assert.throws(() => assertRole("supplier", ["admin", "warehouse_manager"]), { status: 403 });
});
