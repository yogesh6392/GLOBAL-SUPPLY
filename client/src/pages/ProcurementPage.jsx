import { useState } from "react";
import { useAuth } from "../AuthContext";
import api from "../api";
import {
  DataTable,
  Notice,
  PaginationControls,
  PageHeader,
  SearchField,
  SectionCard,
  StatusPill,
  useApiResource
} from "../components/ResourceHelpers";

export default function ProcurementPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const orders = useApiResource(`/purchase-orders?page=${page}&limit=10&q=${encodeURIComponent(search)}${statusFilter ? `&status=${statusFilter}` : ""}`);
  const suppliers = useApiResource("/suppliers");
  const products = useApiResource("/products");
  const [form, setForm] = useState({ supplier: "", product: "", quantity: "1", unitPrice: "0", notes: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const canCreate = ["admin", "manufacturer"].includes(user?.role);

  async function createOrder(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.post("/purchase-orders", {
        supplier: form.supplier,
        items: [{ product: form.product, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }],
        notes: form.notes
      });
      setForm({ ...form, quantity: "1", unitPrice: "0", notes: "" });
      setMessage("Purchase order created as a draft. Submit it when ready.");
      await orders.reload();
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Could not create purchase order.");
    } finally {
      setSaving(false);
    }
  }

  async function transition(order, status) {
    setError("");
    setMessage("");
    try {
      await api.patch(`/purchase-orders/${order._id}/status`, { status });
      setMessage(`Purchase order ${status}.`);
      await orders.reload();
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Could not update purchase order.");
    }
  }

  function actionsFor(order) {
    if (["admin", "manufacturer"].includes(user?.role)) {
      if (order.status === "draft") return <button className="table-action" onClick={() => transition(order, "submitted")}>Submit</button>;
      if (order.status === "submitted") return <span className="inline-actions"><button className="table-action" onClick={() => transition(order, "approved")}>Approve</button><button className="table-action danger-action" onClick={() => transition(order, "rejected")}>Reject</button></span>;
    }
    if (["admin", "supplier"].includes(user?.role) && order.status === "approved") {
      return <button className="table-action" onClick={() => transition(order, "confirmed")}>Confirm</button>;
    }
    return "—";
  }

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="PROCUREMENT" title="Purchase orders" description="Create orders and coordinate buyer/supplier workflow steps." />
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      {canCreate && <SectionCard title="Create purchase order" description="Orders start as drafts and are submitted through a role-checked workflow.">
        <form className="form-grid" onSubmit={createOrder}>
          <label htmlFor="order-supplier">Supplier</label>
          <select id="order-supplier" value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} required>
            <option value="">Choose supplier</option>{(suppliers.data?.suppliers ?? []).map((supplier) => <option value={supplier._id} key={supplier._id}>{supplier.name}</option>)}
          </select>
          <label htmlFor="order-product">Product</label>
          <select id="order-product" value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })} required>
            <option value="">Choose product</option>{(products.data?.products ?? []).map((product) => <option value={product._id} key={product._id}>{product.sku} · {product.name}</option>)}
          </select>
          <label htmlFor="order-quantity">Quantity</label><input id="order-quantity" type="number" min="0.000001" step="any" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required />
          <label htmlFor="order-price">Unit price</label><input id="order-price" type="number" min="0" step="any" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} required />
          <label htmlFor="order-notes">Notes</label><input id="order-notes" maxLength="2000" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <div className="form-grid-actions"><button className="button button-primary" disabled={saving || suppliers.loading || products.loading}>{saving ? "Creating…" : "Create draft order"}</button></div>
        </form>
      </SectionCard>}
      <SectionCard title="Order activity" description="Orders are visible only to their purchasing and participating supplier organizations.">
        <DataTable emptyMessage={orders.loading ? "Loading purchase orders…" : "No purchase orders recorded yet."} columns={[
          { key: "createdAt", label: "Created", render: (order) => new Date(order.createdAt).toLocaleDateString() },
          { key: "supplier", label: "Supplier", render: (order) => order.supplier?.name ?? "Partner supplier" },
          { key: "items", label: "Items", render: (order) => order.items?.map((item) => `${item.sku} × ${item.quantity}`).join(", ") ?? "—" },
          { key: "status", label: "Status", render: (order) => <StatusPill>{order.status}</StatusPill> },
          { key: "actions", label: "Next step", render: actionsFor }
        ]} rows={orders.data?.purchaseOrders ?? []} />
        <div className="list-filters">
          <SearchField value={search} onChange={(value) => { setSearch(value); setPage(1); }} label="Search orders" />
          <label className="search-field"><span>Filter status</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="">All statuses</option>{["draft", "submitted", "approved", "rejected", "confirmed"].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        </div>
        <PaginationControls pagination={orders.data?.pagination} page={page} onChange={setPage} />
      </SectionCard>
    </div>
  );
}
