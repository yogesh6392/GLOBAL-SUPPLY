import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import {
  Notice,
  PageHeader,
  SectionCard,
  StatCard,
  useApiResource
} from "../components/ResourceHelpers";

const roleLabels = {
  admin: "Platform administrator",
  manufacturer: "Manufacturer",
  supplier: "Supplier",
  warehouse_manager: "Warehouse manager",
  logistics_provider: "Logistics provider"
};

const modules = [
  { to: "/collaboration", title: "Suppliers & products", description: "Maintain supplier relationships and product catalogues.", icon: "◇", tone: "icon-violet" },
  { to: "/procurement", title: "Purchase orders", description: "Create orders and coordinate status transitions.", icon: "▤", tone: "icon-blue" },
  { to: "/inventory", title: "Inventory", description: "Record warehouse stock and review reorder signals.", icon: "▣", tone: "icon-green" },
  { to: "/shipments", title: "Logistics", description: "Coordinate planned shipments and event timelines.", icon: "↗", tone: "icon-amber" },
  { to: "/analytics", title: "Analytics", description: "Review summaries calculated from your organization records.", icon: "◷", tone: "icon-blue" },
  { to: "/algorithms", title: "DAA lab", description: "Explore five syllabus units through interactive algorithms.", icon: "⌘", tone: "icon-violet" }
];

export default function DashboardPage() {
  const { user } = useAuth();
  const analytics = useApiResource("/analytics/overview");
  const totals = analytics.data?.totals;

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="YOUR CONTROL TOWER"
        title={`Good to have you here, ${user?.fullName?.split(" ")[0]}.`}
        description={`Your ${roleLabels[user?.role] ?? "team"} workspace for ${user?.organization?.name ?? "your organization"}.`}
        action={<Link className="button button-quiet" to="/organization">Organization profile →</Link>}
      />
      {analytics.error && <Notice tone="error">{analytics.error}</Notice>}
      <div className="stats-grid">
        <StatCard label="Purchase orders" value={totals?.purchaseOrders ?? "—"} note={analytics.loading ? "Loading recorded data" : "Visible to your organization"} />
        <StatCard label="Shipments" value={totals?.shipments ?? "—"} note="Recorded partner shipments" tone="green" />
        <StatCard label="Warehouses" value={totals?.warehouses ?? "—"} note="Organization-owned locations" tone="violet" />
        <StatCard label="Low-stock items" value={totals?.lowStockProducts ?? "—"} note="Configured thresholds only" tone="amber" />
      </div>
      <SectionCard title="Your operations workspace" description="Choose a workflow. Counts and activity are calculated from your organization's records.">
        <div className="module-grid">
          {modules.map((item) => (
            <Link className="module-card operational-module" to={item.to} key={item.to}>
              <div className={`module-icon ${item.tone}`}>{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className="module-link">Open workspace <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </SectionCard>
      <Notice>
        {analytics.data
          ? `Metrics calculated from organization records at ${new Date(analytics.data.generatedAt).toLocaleString()}. No live tracking is connected.`
          : "Metrics are calculated from organization records. No live tracking is connected."}
      </Notice>
    </div>
  );
}
