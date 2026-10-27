import { useState } from "react";
import { useAuth } from "../AuthContext";
import api from "../api";
import {
  DataTable,
  Notice,
  PaginationControls,
  PageHeader,
  SectionCard,
  useApiResource
} from "../components/ResourceHelpers";

export default function InventoryPage() {
  const { user } = useAuth();
  const [movementPage, setMovementPage] = useState(1);
  const warehouses = useApiResource("/warehouses");
  const products = useApiResource("/products");
  const inventory = useApiResource("/inventory");
  const movements = useApiResource(`/inventory/movements?page=${movementPage}&limit=10`);
  const suggestions = useApiResource("/inventory/reorder-suggestions");
  const [warehouseForm, setWarehouseForm] = useState({ name: "", code: "", address: "" });
  const [moveForm, setMoveForm] = useState({ warehouse: "", product: "", direction: "in", quantity: "1", reason: "" });
  const [notice, setNotice] = useState({ message: "", error: "" });
  const [saving, setSaving] = useState(false);
  const canManageWarehouse = ["admin", "manufacturer", "warehouse_manager"].includes(user?.role);
  const canMoveStock = ["admin", "manufacturer", "warehouse_manager"].includes(user?.role);

  async function createWarehouse(event) {
    event.preventDefault();
    setNotice({ message: "", error: "" });
    setSaving(true);
    try {
      await api.post("/warehouses", warehouseForm);
      setWarehouseForm({ name: "", code: "", address: "" });
      setNotice({ message: "Warehouse created.", error: "" });
      await warehouses.reload();
    } catch (error) {
      setNotice({ message: "", error: error.response?.data?.message ?? "Could not create warehouse." });
    } finally {
      setSaving(false);
    }
  }

  async function recordMovement(event) {
    event.preventDefault();
    setNotice({ message: "", error: "" });
    setSaving(true);
    try {
      await api.post("/inventory/movements", { ...moveForm, quantity: Number(moveForm.quantity) });
      setNotice({ message: "Inventory movement recorded.", error: "" });
      await Promise.all([inventory.reload(), suggestions.reload()]);
    } catch (error) {
      setNotice({ message: "", error: error.response?.data?.message ?? "Could not record stock movement." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="WAREHOUSE OPERATIONS" title="Inventory & warehouses" description="Record stock movements safely and review data-based reorder suggestions." />
      {notice.error && <Notice tone="error">{notice.error}</Notice>}
      {notice.message && <Notice tone="success">{notice.message}</Notice>}
      <div className="split-layout">
        <SectionCard title="Warehouses" description="Warehouse records belong to your organization.">
          {canManageWarehouse && <form className="compact-form" onSubmit={createWarehouse}>
            <label htmlFor="warehouse-name">Warehouse name</label><input id="warehouse-name" maxLength="160" value={warehouseForm.name} onChange={(event) => setWarehouseForm({ ...warehouseForm, name: event.target.value })} required />
            <label htmlFor="warehouse-code">Warehouse code</label><input id="warehouse-code" maxLength="80" value={warehouseForm.code} onChange={(event) => setWarehouseForm({ ...warehouseForm, code: event.target.value })} required />
            <label htmlFor="warehouse-address">Address</label><input id="warehouse-address" maxLength="500" value={warehouseForm.address} onChange={(event) => setWarehouseForm({ ...warehouseForm, address: event.target.value })} />
            <button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Add warehouse"}</button>
          </form>}
          <DataTable emptyMessage={warehouses.loading ? "Loading warehouses…" : "No warehouse records yet."} columns={[
            { key: "code", label: "Code" },
            { key: "name", label: "Warehouse" },
            { key: "address", label: "Address" }
          ]} rows={warehouses.data?.warehouses ?? []} />
        </SectionCard>
        <SectionCard title="Stock movement" description="Outbound movement uses an atomic stock guard and cannot make quantities negative.">
          {canMoveStock && <form className="compact-form" onSubmit={recordMovement}>
            <label htmlFor="stock-warehouse">Warehouse</label><select id="stock-warehouse" value={moveForm.warehouse} onChange={(event) => setMoveForm({ ...moveForm, warehouse: event.target.value })} required><option value="">Choose warehouse</option>{(warehouses.data?.warehouses ?? []).map((warehouse) => <option value={warehouse._id} key={warehouse._id}>{warehouse.code} · {warehouse.name}</option>)}</select>
            <label htmlFor="stock-product">Product</label><select id="stock-product" value={moveForm.product} onChange={(event) => setMoveForm({ ...moveForm, product: event.target.value })} required><option value="">Choose product</option>{(products.data?.products ?? []).map((product) => <option value={product._id} key={product._id}>{product.sku} · {product.name}</option>)}</select>
            <label htmlFor="stock-direction">Movement type</label><select id="stock-direction" value={moveForm.direction} onChange={(event) => setMoveForm({ ...moveForm, direction: event.target.value })}><option value="in">Stock in</option><option value="out">Stock out</option></select>
            <label htmlFor="stock-quantity">Quantity</label><input id="stock-quantity" type="number" min="0.000001" step="any" value={moveForm.quantity} onChange={(event) => setMoveForm({ ...moveForm, quantity: event.target.value })} required />
            <label htmlFor="stock-reason">Reason</label><input id="stock-reason" maxLength="300" value={moveForm.reason} onChange={(event) => setMoveForm({ ...moveForm, reason: event.target.value })} />
            <button className="button button-primary" disabled={saving}>{saving ? "Recording…" : "Record movement"}</button>
          </form>}
        </SectionCard>
      </div>
      <SectionCard title="Current stock" description="Quantities are the latest recorded database values, grouped by warehouse and product.">
        <DataTable emptyMessage={inventory.loading ? "Loading inventory…" : "No stock has been recorded yet."} columns={[
          { key: "product", label: "Product", render: (row) => row.product?.name ?? "—" },
          { key: "sku", label: "SKU", render: (row) => row.product?.sku ?? "—" },
          { key: "warehouse", label: "Warehouse", render: (row) => row.warehouse?.name ?? "—" },
          { key: "quantity", label: "On hand" },
          { key: "reorderPoint", label: "Reorder point", render: (row) => row.product?.reorderPoint ?? 0 }
        ]} rows={inventory.data?.inventory ?? []} />
      </SectionCard>
      <SectionCard title="Reorder suggestions" description="Calculated as max(0, configured reorder point − current organization stock).">
        <DataTable emptyMessage={suggestions.loading ? "Calculating suggestions…" : "No products currently fall below their configured reorder points."} columns={[
          { key: "product", label: "Product", render: (item) => item.product.name },
          { key: "quantity", label: "On hand" },
          { key: "reorderPoint", label: "Configured threshold" },
          { key: "suggestedQuantity", label: "Suggested replenishment" }
        ]} rows={suggestions.data?.suggestions ?? []} />
      </SectionCard>
      <SectionCard title="Inventory movement history" description="Actor-attributed records of stock receipts and issues.">
        <DataTable emptyMessage={movements.loading ? "Loading movement history…" : "No inventory movements have been recorded."} columns={[
          { key: "createdAt", label: "Recorded", render: (movement) => new Date(movement.createdAt).toLocaleString() },
          { key: "product", label: "Product", render: (movement) => movement.product?.name ?? "—" },
          { key: "warehouse", label: "Warehouse", render: (movement) => movement.warehouse?.name ?? "—" },
          { key: "direction", label: "Direction", render: (movement) => movement.direction === "in" ? "Stock in" : "Stock out" },
          { key: "quantity", label: "Quantity" },
          { key: "reason", label: "Reason" },
          { key: "performedBy", label: "Recorded by", render: (movement) => movement.performedBy?.fullName ?? "—" }
        ]} rows={movements.data?.movements ?? []} />
        <PaginationControls pagination={movements.data?.pagination} page={movementPage} onChange={setMovementPage} />
      </SectionCard>
    </div>
  );
}
