import api from "../api";
import {
  DataTable,
  Notice,
  PageHeader,
  SectionCard,
  StatCard,
  useApiResource
} from "../components/ResourceHelpers";

export default function AnalyticsPage() {
  const analytics = useApiResource("/analytics/overview");
  async function downloadReport() {
    try {
      const { data } = await api.get("/analytics/overview");
      const file = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = "supply-chain-analytics.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(error.response?.data?.message ?? "Could not export analytics.");
    }
  }

  const totals = analytics.data?.totals;
  return (
    <div className="workspace-page">
      <PageHeader eyebrow="ANALYTICS" title="Analytics & reports" description="Summaries are calculated from records visible to your organization—never invented demo metrics." action={<button className="button button-quiet" onClick={downloadReport}>Export JSON report</button>} />
      {analytics.error && <Notice tone="error">{analytics.error}</Notice>}
      {analytics.data && <Notice>Data source: recorded workspace documents. Report generated {new Date(analytics.data.generatedAt).toLocaleString()}.</Notice>}
      <div className="stats-grid">
        <StatCard label="Purchase orders" value={totals?.purchaseOrders ?? "—"} note={analytics.loading ? "Loading records" : "Buyer or supplier participation"} />
        <StatCard label="Shipments" value={totals?.shipments ?? "—"} note="Participating shipment records" tone="green" />
        <StatCard label="Warehouses" value={totals?.warehouses ?? "—"} note="Organization-owned locations" tone="violet" />
        <StatCard label="Low-stock items" value={totals?.lowStockProducts ?? "—"} note="Configured reorder rules only" tone="amber" />
      </div>
      <div className="split-layout">
        <SectionCard title="Purchase orders by status" description="Counts include orders visible to your organization.">
          <div className="status-breakdown">{Object.entries(analytics.data?.purchaseOrdersByStatus ?? {}).map(([status, count]) => <div className="breakdown-row" key={status}><span>{status.replaceAll("_", " ")}</span><div className="breakdown-track"><span style={{ width: `${Math.min(100, totals?.purchaseOrders ? count / totals.purchaseOrders * 100 : 0)}%` }} /></div><strong>{count}</strong></div>)}</div>
        </SectionCard>
        <SectionCard title="Shipment delivery indicators" description="Only actual delivery dates and recorded delay status are counted.">
          <div className="delivery-summary">
            <div><strong>{analytics.data?.shipmentStatus?.inTransit ?? "—"}</strong><span>In transit</span></div>
            <div><strong>{analytics.data?.shipmentStatus?.delayed ?? "—"}</strong><span>Reported delayed</span></div>
            <div><strong>{analytics.data?.shipmentStatus?.delivered ?? "—"}</strong><span>Delivered</span></div>
            <div><strong>{analytics.data?.shipmentStatus?.onTimeDelivered ?? "—"}</strong><span>On time (recorded ETA)</span></div>
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Observed supplier comparison" description="Recorded purchase-order values only. These figures are not quality scores, forecasts or an independent supplier rating.">
        <DataTable emptyMessage={analytics.loading ? "Calculating from recorded purchase orders…" : "No supplier purchase orders are available to compare."} columns={[
          { key: "name", label: "Supplier" },
          { key: "observedOrders", label: "Observed orders" },
          { key: "observedItemValue", label: "Total item value", render: (supplier) => supplier.observedItemValue.toFixed(2) },
          { key: "averageOrderValue", label: "Average per order", render: (supplier) => supplier.averageOrderValue.toFixed(2) },
          { key: "basis", label: "Basis" }
        ]} rows={analytics.data?.supplierComparison ?? []} />
      </SectionCard>
      <SectionCard title="Inventory risk" description="Reorder thresholds are organization-configured rules, not predictions.">
        <DataTable emptyMessage={analytics.loading ? "Reviewing stock thresholds…" : "No products currently fall below configured reorder thresholds."} columns={[
          { key: "sku", label: "SKU" },
          { key: "name", label: "Product" },
          { key: "quantity", label: "On hand" },
          { key: "reorderPoint", label: "Threshold" },
          { key: "suggestedQuantity", label: "Suggested replenishment" }
        ]} rows={analytics.data?.lowStock ?? []} />
      </SectionCard>
    </div>
  );
}
