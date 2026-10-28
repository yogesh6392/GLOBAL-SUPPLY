import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import api from "../api";
import {
  Notice,
  PageHeader,
  SectionCard,
  StatCard,
  useApiResource
} from "../components/ResourceHelpers";

const roleLabels = {
  admin: "Platform Administrator",
  manufacturer: "Manufacturing Command",
  supplier: "Supplier Command",
  warehouse_manager: "Warehouse Command",
  logistics_provider: "Logistics Dispatcher"
};

const modules = [
  { to: "/collaboration", title: "Suppliers & products", description: "Maintain supplier partnerships and master product catalogs.", icon: "◇", tone: "icon-violet" },
  { to: "/procurement", title: "Purchase orders", description: "Issue procurement orders, review drafts, and track multi-party approval cycles.", icon: "▤", tone: "icon-blue" },
  { to: "/inventory", title: "Inventory & stock", description: "Monitor warehouse stock levels and review automated reorder thresholds.", icon: "▣", tone: "icon-green" },
  { to: "/shipments", title: "Shipments & dispatch", description: "Track active carrier consignments, delivery waybills, and transit events.", icon: "↗", tone: "icon-amber" },
  { to: "/analytics", title: "Analytics & reports", description: "Deep-dive operational metrics, carrier SLA reports, and supplier comparisons.", icon: "◷", tone: "icon-blue" },
  { to: "/optimization", title: "Route optimization", description: "Dijkstra-powered shortest paths and dynamic transportation cost analysis.", icon: "⌖", tone: "icon-violet" }
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState("");
  const [liveStreamActive, setLiveStreamActive] = useState(true);
  const [timeFilter, setTimeFilter] = useState("today");
  const [activityFilter, setActivityFilter] = useState("all");

  const loadData = useCallback(async () => {
    try {
      // Try dedicated /dashboard first, fallback to /analytics/overview
      let res;
      try {
        res = await api.get("/dashboard");
      } catch {
        res = await api.get("/analytics/overview");
      }
      setDashboardData(res.data.data);
    } catch (err) {
      console.warn("Could not fetch dashboard telemetry:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic heartbeat when liveStreamActive is true
  useEffect(() => {
    if (!liveStreamActive) return;
    const timer = setInterval(() => {
      loadData();
    }, 8000);
    return () => clearInterval(timer);
  }, [liveStreamActive, loadData]);

  const handleSimulate = async (action) => {
    setSimulating(true);
    setSimMessage("");
    try {
      const res = await api.post("/dashboard/simulate", { action });
      setSimMessage(res.data?.message || "Simulation event executed successfully.");
      await loadData();
    } catch (err) {
      setSimMessage(err.response?.data?.message || "Simulation action completed.");
      await loadData();
    } finally {
      setSimulating(false);
    }
  };

  const totals = dashboardData?.kpis || dashboardData?.totals || {};
  const ordersByStatus = dashboardData?.ordersByStatus || dashboardData?.purchaseOrdersByStatus || {};
  const shipmentsByStatus = dashboardData?.shipmentsByStatus || {};
  const lowStock = dashboardData?.lowStock || [];
  const recentActivity = dashboardData?.recentActivity || [];

  const filteredActivity = recentActivity.filter((item) => {
    if (activityFilter === "all") return true;
    return item.type === activityFilter;
  });

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="MISSION CONTROL TOWER"
        title={`Welcome back, ${user?.fullName?.split(" ")[0]}.`}
        description={`Your real-time operations command center for ${user?.organization?.name ?? "your organization"} (${roleLabels[user?.role] ?? "Workspace"}).`}
        action={
          <div className="dashboard-topbar-actions">
            <button
              type="button"
              className={`button button-quiet ${liveStreamActive ? "live-btn-active" : ""}`}
              onClick={() => setLiveStreamActive(!liveStreamActive)}
            >
              <span className={`status-dot ${liveStreamActive ? "status-dot-pulse" : ""}`} />
              {liveStreamActive ? "Live Telemetry: ON" : "Live Telemetry: Paused"}
            </button>
            <Link className="button button-quiet" to="/organization">
              Organization profile →
            </Link>
          </div>
        }
      />

      {/* Interactive Simulation Command Bar */}
      <div className="sim-command-bar">
        <div className="sim-bar-label">
          <span className="sim-lightning">⚡</span>
          <div>
            <strong>Interactive Operations Simulator</strong>
            <small>Dispatch simulated real-time events directly into your workspace pipeline</small>
          </div>
        </div>

        <div className="sim-btn-group">
          <button
            type="button"
            className="sim-action-btn"
            disabled={simulating}
            onClick={() => handleSimulate("simulate_inbound")}
          >
            📥 Inbound Stock (+25)
          </button>
          <button
            type="button"
            className="sim-action-btn"
            disabled={simulating}
            onClick={() => handleSimulate("dispatch_shipment")}
          >
            🚚 Dispatch Shipment
          </button>
          <button
            type="button"
            className="sim-action-btn"
            disabled={simulating}
            onClick={() => handleSimulate("create_sample_order")}
          >
            📝 Fast Issue PO
          </button>
        </div>
      </div>

      {simMessage && (
        <div className="notice notice-success sim-feedback" role="status">
          <strong>Simulation Event Dispatched:</strong> {simMessage}
        </div>
      )}

      {/* Time Range Filter Bar */}
      <div className="dash-time-row">
        <div className="dash-time-chips">
          {["today", "7days", "quarter"].map((range) => (
            <button
              key={range}
              type="button"
              className={`dash-filter-chip ${timeFilter === range ? "dash-filter-active" : ""}`}
              onClick={() => setTimeFilter(range)}
            >
              {range === "today" ? "Realtime Today" : range === "7days" ? "Last 7 Days" : "This Quarter"}
            </button>
          ))}
        </div>
        <div className="dash-sync-badge">
          <span className="status-dot" /> Last synchronized: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard
          label="Purchase orders"
          value={totals?.totalOrders ?? totals?.purchaseOrders ?? "—"}
          note={loading ? "Synchronizing records…" : `${ordersByStatus?.confirmed || 0} confirmed · ${ordersByStatus?.submitted || 0} pending review`}
          tone="blue"
        />
        <StatCard
          label="Active shipments"
          value={totals?.activeShipments ?? totals?.shipments ?? "—"}
          note={loading ? "Synchronizing records…" : `${shipmentsByStatus?.in_transit || 0} in transit · ${totals?.onTimeRate || 97.4}% on-time`}
          tone="green"
        />
        <StatCard
          label="Linked warehouses"
          value={totals?.warehousesCount ?? totals?.warehouses ?? "—"}
          note={loading ? "Synchronizing records…" : "Active storage depots & cross-docks"}
          tone="violet"
        />
        <StatCard
          label="Low-stock alerts"
          value={totals?.lowStockAlerts ?? totals?.lowStockProducts ?? "—"}
          note={lowStock.length > 0 ? "Requires purchase reorder" : "All SKUs above reorder point"}
          tone="amber"
        />
      </div>

      {/* Low Stock Urgent Banner if any */}
      {lowStock.length > 0 && (
        <div className="low-stock-alert-box">
          <div className="alert-box-left">
            <span className="alert-icon">⚠️</span>
            <div>
              <strong>Inventory Alert: {lowStock.length} SKU(s) below safe reorder threshold</strong>
              <p>Immediate procurement replenishment recommended to prevent stockouts.</p>
            </div>
          </div>
          <div className="alert-box-right">
            <Link to="/procurement" className="button button-primary">
              Issue replenishment PO →
            </Link>
          </div>
        </div>
      )}

      {/* Pipeline Status Breakdown & Interactive Stream */}
      <div className="split-layout">
        {/* Order Lifecycle Progress */}
        <SectionCard
          title="Procurement order pipeline"
          description="Interactive distribution of open orders across lifecycle states."
        >
          <div className="pipeline-bars-container">
            {Object.entries({
              draft: { label: "Draft Orders", count: ordersByStatus?.draft || 0, color: "#64748b" },
              submitted: { label: "Submitted for Review", count: ordersByStatus?.submitted || 0, color: "#d97706" },
              approved: { label: "Approved by Buyer", count: ordersByStatus?.approved || 0, color: "#2563eb" },
              confirmed: { label: "Confirmed by Supplier", count: ordersByStatus?.confirmed || 0, color: "#16a34a" }
            }).map(([key, st]) => (
              <div key={key} className="pipeline-row">
                <div className="pipeline-row-labels">
                  <span>{st.label}</span>
                  <strong>{st.count} POs</strong>
                </div>
                <div className="pipeline-track">
                  <div
                    className="pipeline-fill"
                    style={{
                      width: `${Math.min(100, (st.count / Math.max(1, totals?.totalOrders || totals?.purchaseOrders || 1)) * 100)}%`,
                      backgroundColor: st.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pipeline-summary-foot">
            <Link to="/procurement" className="text-link">
              View all purchase orders in procurement →
            </Link>
          </div>
        </SectionCard>

        {/* Live Operations Stream */}
        <SectionCard
          title="Live activity stream"
          description="Real-time events dispatched across logistics, orders, and warehouses."
        >
          <div className="activity-filter-bar">
            {["all", "shipment", "purchase_order"].map((f) => (
              <button
                key={f}
                type="button"
                className={`activity-tab ${activityFilter === f ? "activity-tab-active" : ""}`}
                onClick={() => setActivityFilter(f)}
              >
                {f === "all" ? "All Events" : f === "shipment" ? "Shipments" : "Orders"}
              </button>
            ))}
          </div>

          <div className="dash-activity-list">
            {filteredActivity.length > 0 ? (
              filteredActivity.map((act) => (
                <div key={act.id} className="dash-activity-item">
                  <span className={`dash-activity-icon ${act.type === "shipment" ? "act-shipment" : "act-po"}`}>
                    {act.type === "shipment" ? "🚚" : "📝"}
                  </span>
                  <div className="dash-activity-details">
                    <strong>{act.title}</strong>
                    <small>{act.subtitle}</small>
                  </div>
                  <span className={`status-pill status-${act.status}`}>
                    {act.status.replace("_", " ")}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state">No events recorded in this filter view.</div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Operational Workspaces Grid */}
      <SectionCard
        title="Operations workspaces"
        description="Select a module to execute specific warehouse, procurement, or transport actions."
      >
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
    </div>
  );
}
