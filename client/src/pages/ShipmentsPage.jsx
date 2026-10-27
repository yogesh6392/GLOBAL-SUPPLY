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

export default function ShipmentsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const shipments = useApiResource(`/shipments?page=${page}&limit=10&q=${encodeURIComponent(search)}`);
  const orders = useApiResource("/purchase-orders");
  const partners = useApiResource("/partners/logistics");
  const [form, setForm] = useState({ purchaseOrder: "", providerOrganization: "", origin: "", destination: "", trackingNumber: "", expectedDelivery: "" });
  const [notice, setNotice] = useState({ message: "", error: "" });
  const [saving, setSaving] = useState(false);
  const canCreate = ["admin", "manufacturer"].includes(user?.role);

  async function createShipment(event) {
    event.preventDefault();
    setSaving(true);
    setNotice({ message: "", error: "" });
    try {
      await api.post("/shipments", {
        ...form,
        expectedDelivery: form.expectedDelivery ? new Date(`${form.expectedDelivery}T00:00:00`).toISOString() : undefined
      });
      setForm({ ...form, trackingNumber: "", expectedDelivery: "" });
      setNotice({ message: "Shipment created from a confirmed purchase order.", error: "" });
      await shipments.reload();
    } catch (error) {
      setNotice({ message: "", error: error.response?.data?.message ?? "Could not create shipment." });
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(shipment, status) {
    setNotice({ message: "", error: "" });
    try {
      await api.patch(`/shipments/${shipment._id}/status`, { status });
      setNotice({ message: `Shipment updated to ${status.replaceAll("_", " ")}.`, error: "" });
      await shipments.reload();
    } catch (error) {
      setNotice({ message: "", error: error.response?.data?.message ?? "Could not update shipment." });
    }
  }

  async function addNote(shipment) {
    const message = window.prompt("Add an operational shipment update:");
    if (!message?.trim()) return;
    setNotice({ message: "", error: "" });
    try {
      await api.post(`/shipments/${shipment._id}/events`, { message });
      setNotice({ message: "Shipment update recorded.", error: "" });
      await shipments.reload();
    } catch (error) {
      setNotice({ message: "", error: error.response?.data?.message ?? "Could not record shipment update." });
    }
  }

  function shipmentActions(shipment) {
    if (user?.role === "supplier" && shipment.status === "pending") {
      return <button className="table-action" onClick={() => setStatus(shipment, "ready")}>Mark ready</button>;
    }
    if (user?.role === "logistics_provider" && ["ready", "in_transit", "delayed"].includes(shipment.status)) {
      if (shipment.status === "ready") return <button className="table-action" onClick={() => setStatus(shipment, "in_transit")}>Mark in transit</button>;
      return <span className="inline-actions"><button className="table-action" onClick={() => setStatus(shipment, shipment.status === "delayed" ? "in_transit" : "delayed")}>{shipment.status === "delayed" ? "Resume transit" : "Report delay"}</button><button className="table-action" onClick={() => setStatus(shipment, "delivered")}>Mark delivered</button></span>;
    }
    if (user?.role === "admin" || user?.role === "manufacturer" || user?.role === "supplier" || user?.role === "logistics_provider") {
      return <button className="table-action" onClick={() => addNote(shipment)}>Add update</button>;
    }
    return "—";
  }

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="LOGISTICS" title="Shipments" description="Coordinate shipments and update event timelines. This is not live GPS tracking." />
      {notice.error && <Notice tone="error">{notice.error}</Notice>}
      {notice.message && <Notice tone="success">{notice.message}</Notice>}
      {canCreate && <SectionCard title="Create shipment" description="A supplier must confirm the purchase order before dispatch planning begins.">
        <form className="form-grid" onSubmit={createShipment}>
          <label htmlFor="shipment-order">Confirmed purchase order</label><select id="shipment-order" value={form.purchaseOrder} onChange={(event) => setForm({ ...form, purchaseOrder: event.target.value })} required><option value="">Choose confirmed order</option>{(orders.data?.purchaseOrders ?? []).filter((order) => order.status === "confirmed").map((order) => <option value={order._id} key={order._id}>Order {order._id.slice(-6)}</option>)}</select>
          <label htmlFor="shipment-provider">Logistics provider</label><select id="shipment-provider" value={form.providerOrganization} onChange={(event) => setForm({ ...form, providerOrganization: event.target.value })} required><option value="">Choose registered provider</option>{(partners.data?.organizations ?? []).map((partner) => <option value={partner.id} key={partner.id}>{partner.name}</option>)}</select>
          <label htmlFor="shipment-origin">Origin</label><input id="shipment-origin" maxLength="240" value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value })} required />
          <label htmlFor="shipment-destination">Destination</label><input id="shipment-destination" maxLength="240" value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} required />
          <label htmlFor="shipment-tracking">Reference / tracking number</label><input id="shipment-tracking" maxLength="100" value={form.trackingNumber} onChange={(event) => setForm({ ...form, trackingNumber: event.target.value })} />
          <label htmlFor="shipment-eta">Estimated delivery date</label><input id="shipment-eta" type="date" value={form.expectedDelivery} onChange={(event) => setForm({ ...form, expectedDelivery: event.target.value })} />
          <div className="form-grid-actions"><button className="button button-primary" disabled={saving}>{saving ? "Creating…" : "Create shipment"}</button></div>
        </form>
      </SectionCard>}
      <SectionCard title="Shipment activity" description="Shipment records are visible to participating buyer, supplier and provider organizations.">
        <SearchField value={search} onChange={(value) => { setSearch(value); setPage(1); }} label="Search shipment activity" />
        <DataTable emptyMessage={shipments.loading ? "Loading shipment records…" : "No shipments are recorded yet."} columns={[
          { key: "trackingNumber", label: "Reference" },
          { key: "origin", label: "Origin", render: (shipment) => shipment.origin ?? "—" },
          { key: "destination", label: "Destination", render: (shipment) => shipment.destination ?? "—" },
          { key: "expectedDelivery", label: "Estimated delivery", render: (shipment) => shipment.expectedDelivery ? new Date(shipment.expectedDelivery).toLocaleDateString() : "Not set" },
          { key: "status", label: "Status", render: (shipment) => <StatusPill>{shipment.status}</StatusPill> },
          { key: "delay", label: "Delivery indicator", render: (shipment) => {
            const late = shipment.status !== "delivered" && shipment.expectedDelivery && new Date(shipment.expectedDelivery) < new Date();
            return shipment.status === "delayed" || late ? <span className="risk-label">Delay reported / date elapsed</span> : "No recorded delay";
          } },
          { key: "timeline", label: "Timeline", render: (shipment) => <details className="timeline-details"><summary>{shipment.timeline?.length ?? 0} events</summary>{(shipment.timeline ?? []).map((event, index) => <div className="timeline-event" key={`${event.at}-${index}`}><strong>{event.status.replaceAll("_", " ")}</strong><time>{new Date(event.at).toLocaleString()}</time><span>{event.message}</span></div>)}</details> },
          { key: "actions", label: "Action", render: shipmentActions }
        ]} rows={shipments.data?.shipments ?? []} />
        <PaginationControls pagination={shipments.data?.pagination} page={page} onChange={setPage} />
      </SectionCard>
    </div>
  );
}
