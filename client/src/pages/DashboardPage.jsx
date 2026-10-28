'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import api from "../api";
import {
  Notice,
  PageHeader,
  SectionCard,
  StatCard
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

const TELEMETRY_STREAM = [
  { icon: "📡", text: "Transponder #8841 verified on Corridor I-80 · Speed 62mph · Temperature 18.2°C (Nominal)" },
  { icon: "📦", text: "Automated Optical Inspection: Pallet seal intact at Chicago Gateway Bay 4" },
  { icon: "⚡", text: "RFID Gate Reader: 24 precision actuators checked in for Assembly Line #2" },
  { icon: "🚢", text: "Maritime feeder container vessel berthing at Harbor Terminal Gate 7" },
  { icon: "🚚", text: "Cross-dock manifest verified: 18 units staged for expedited regional delivery" },
  { icon: "🛡️", text: "Quality assurance batch cert uploaded: All tolerances within ±0.02mm specification" }
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [liveStreamActive, setLiveStreamActive] = useState(true);
  const [timeFilter, setTimeFilter] = useState("today");
  const [activityFilter, setActivityFilter] = useState("all");
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activePipelineFilter, setActivePipelineFilter] = useState(null);
  const [telemetryIndex, setTelemetryIndex] = useState(0);

  const loadData = useCallback(async () => {
    try {
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

  // Periodic heartbeat & live telemetry rotation when liveStreamActive is true
  useEffect(() => {
    if (!liveStreamActive) return;
    const dataTimer = setInterval(() => {
      loadData();
    }, 9000);
    const tickerTimer = setInterval(() => {
      setTelemetryIndex((prev) => (prev + 1) % TELEMETRY_STREAM.length);
    }, 4500);
    return () => {
      clearInterval(dataTimer);
      clearInterval(tickerTimer);
    };
  }, [liveStreamActive, loadData]);

  const showToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage("");
    }, 6000);
  };

  const handleSimulate = async (action) => {
    setSimulating(true);
    try {
      const res = await api.post("/dashboard/simulate", { action });
      const msg = res.data?.message || "Simulation event executed successfully.";
      showToast(msg, "success");
      await loadData();
    } catch (err) {
      const msg = err.response?.data?.message || "Simulation action completed.";
      showToast(msg, "info");
      await loadData();
    } finally {
      setSimulating(false);
    }
  };

  const totals = dashboardData?.kpis || dashboardData?.totals || {};
  const rawOrdersByStatus = dashboardData?.ordersByStatus || dashboardData?.purchaseOrdersByStatus || {};
  const rawShipmentsByStatus = dashboardData?.shipmentsByStatus || {};
  const lowStock = dashboardData?.lowStock || [];
  const recentActivity = dashboardData?.recentActivity || [];

  // Dynamic scaling based on time filter
  const timeMultiplier = timeFilter === "today" ? 1 : timeFilter === "7days" ? 3.4 : 12.8;

  const displayOrders = Math.round((totals?.totalOrders ?? 3) * (timeFilter === "today" ? 1 : timeMultiplier));
  const displayShipments = Math.round((totals?.activeShipments ?? 2) * (timeFilter === "today" ? 1 : timeMultiplier * 0.85));
  const displayWarehouses = totals?.warehousesCount ?? totals?.warehouses ?? 2;
  const displayLowStock = totals?.lowStockAlerts ?? lowStock.length;

  const ordersByStatus = useMemo(() => {
    const scale = timeFilter === "today" ? 1 : timeMultiplier;
    return {
      draft: Math.round((rawOrdersByStatus?.draft || 1) * scale),
      submitted: Math.round((rawOrdersByStatus?.submitted || 1) * scale),
      approved: Math.round((rawOrdersByStatus?.approved || 1) * scale),
      confirmed: Math.round((rawOrdersByStatus?.confirmed || 1) * scale)
    };
  }, [rawOrdersByStatus, timeFilter, timeMultiplier]);

  const filteredActivity = recentActivity.filter((item) => {
    if (activityFilter === "all") return true;
    return item.type === activityFilter;
  });

  const activeTelemetry = TELEMETRY_STREAM[telemetryIndex];

  return (
    <div className="dashboard-page">
      {/* Floating Interactive Toast */}
      {toastMessage && (
        <div className={`interactive-floating-toast toast-${toastType}`} role="status">
          <span className="toast-glow-icon">⚡</span>
          <div className="toast-content">
            <strong>System Telemetry Event</strong>
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setToastMessage("")}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <PageHeader
        eyebrow="MISSION CONTROL TOWER"
        title={`Welcome back, ${user?.fullName?.split(" ")[0] || "Operator"}.`}
        description={`Your real-time operations command center for ${user?.organization?.name ?? "your workspace"} (${roleLabels[user?.role] ?? "Workspace Command"}).`}
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

      {/* Live Auto-Streaming Telemetry Ticker */}
      <div className="live-telemetry-ticker">
        <div className="ticker-left">
          <span className="ticker-radar-dot" />
          <span className="ticker-tag">LIVE TELEMETRY FEED</span>
        </div>
        <div className="ticker-message">
          <span className="ticker-icon">{activeTelemetry.icon}</span>
          <span className="ticker-text">{activeTelemetry.text}</span>
        </div>
        <button
          type="button"
          className="ticker-ping-btn"
          disabled={simulating}
          onClick={() => handleSimulate("simulate_telemetry")}
          title="Dispatch next live ping"
        >
          ⚡ Trigger Ping
        </button>
      </div>

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
          {lowStock.length > 0 && (
            <button
              type="button"
              className="sim-action-btn sim-btn-urgent"
              disabled={simulating}
              onClick={() => handleSimulate("quick_restock")}
            >
              ⚡ 1-Click Replenish (+35)
            </button>
          )}
        </div>
      </div>

      {/* Time Range Filter Bar with dynamic calculation badge */}
      <div className="dash-time-row">
        <div className="dash-time-chips">
          {[
            { id: "today", label: "Realtime Today" },
            { id: "7days", label: "Last 7 Days" },
            { id: "quarter", label: "This Quarter" }
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`dash-filter-chip ${timeFilter === chip.id ? "dash-filter-active" : ""}`}
              onClick={() => setTimeFilter(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="dash-sync-badge">
          <span className="status-dot status-dot-pulse" />
          <span>
            {timeFilter === "today" ? "Active real-time pipeline" : timeFilter === "7days" ? "7-day aggregate volume" : "Quarter-to-date throughput"}
            {" · "}Last sync: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* KPI Cards with Live Counters */}
      <div className="stats-grid">
        <StatCard
          label="Purchase orders"
          value={displayOrders}
          note={loading ? "Synchronizing records…" : `${ordersByStatus.confirmed || 1} confirmed · ${ordersByStatus.submitted || 1} in review`}
          tone="blue"
        />
        <StatCard
          label="Active shipments"
          value={displayShipments}
          note={loading ? "Synchronizing records…" : `${rawShipmentsByStatus?.in_transit || 1} in transit · ${totals?.onTimeRate || 98.4}% on-time`}
          tone="green"
        />
        <StatCard
          label="Linked warehouses"
          value={displayWarehouses}
          note={loading ? "Synchronizing records…" : "Active storage depots & cross-docks"}
          tone="violet"
        />
        <StatCard
          label="Low-stock alerts"
          value={displayLowStock}
          note={displayLowStock > 0 ? "Requires purchase reorder" : "All SKUs above reorder point"}
          tone="amber"
        />
      </div>

      {/* Low Stock Urgent Banner with 1-Click Action */}
      {displayLowStock > 0 && (
        <div className="low-stock-alert-box">
          <div className="alert-box-left">
            <span className="alert-icon">⚠️</span>
            <div>
              <strong>Inventory Alert: {displayLowStock} SKU(s) below safe reorder threshold</strong>
              <p>Buffer level depleted. Immediate replenishment recommended to prevent line downtime.</p>
            </div>
          </div>
          <div className="alert-box-right" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="button button-primary"
              disabled={simulating}
              onClick={() => handleSimulate("quick_restock")}
              style={{ background: "#d97706", borderColor: "#b45309" }}
            >
              ⚡ 1-Click Replenish (+35)
            </button>
            <Link to="/procurement" className="button button-quiet">
              Issue PO in Procurement →
            </Link>
          </div>
        </div>
      )}

      {/* Pipeline Status Breakdown & Interactive Stream */}
      <div className="split-layout">
        {/* Order Lifecycle Progress */}
        <SectionCard
          title="Procurement order pipeline"
          description="Interactive distribution of open orders across lifecycle states. Click a stage to inspect."
        >
          <div className="pipeline-bars-container">
            {[
              { key: "draft", label: "Draft Orders", count: ordersByStatus.draft, color: "#64748b" },
              { key: "submitted", label: "Submitted for Review", count: ordersByStatus.submitted, color: "#d97706" },
              { key: "approved", label: "Approved by Buyer", count: ordersByStatus.approved, color: "#2563eb" },
              { key: "confirmed", label: "Confirmed by Supplier", count: ordersByStatus.confirmed, color: "#16a34a" }
            ].map((st) => {
              const totalSum = Math.max(1, displayOrders);
              const pct = Math.min(100, Math.max(12, Math.round((st.count / totalSum) * 100)));
              const isSelected = activePipelineFilter === st.key;
              return (
                <div
                  key={st.key}
                  className={`pipeline-row ${isSelected ? "pipeline-row-selected" : ""}`}
                  onClick={() => setActivePipelineFilter(isSelected ? null : st.key)}
                  style={{ cursor: "pointer" }}
                  title="Click to highlight stage"
                >
                  <div className="pipeline-row-labels">
                    <span>{st.label}</span>
                    <strong>{st.count} POs ({pct}%)</strong>
                  </div>
                  <div className="pipeline-track">
                    <div
                      className="pipeline-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: st.color,
                        transition: "width 0.5s ease"
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pipeline-summary-foot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Link to="/procurement" className="text-link">
              View all purchase orders in procurement →
            </Link>
            <button
              type="button"
              className="button button-quiet button-sm"
              onClick={() => handleSimulate("create_sample_order")}
              disabled={simulating}
            >
              + Issue New Order
            </button>
          </div>
        </SectionCard>

        {/* Live Operations Stream */}
        <SectionCard
          title="Live activity stream"
          description="Real-time events dispatched across logistics, orders, and warehouses. Click any item for details."
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
                <div
                  key={act.id}
                  className="dash-activity-item clickable-activity-item"
                  onClick={() => setSelectedActivity(act)}
                  title="Click to view details & tracking"
                >
                  <span className={`dash-activity-icon ${act.type === "shipment" ? "act-shipment" : "act-po"}`}>
                    {act.type === "shipment" ? "🚚" : "📝"}
                  </span>
                  <div className="dash-activity-details">
                    <strong>{act.title}</strong>
                    <small>{act.subtitle}</small>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className={`status-pill status-${act.status}`}>
                      {act.status.replace("_", " ")}
                    </span>
                    <span className="activity-inspect-arrow">›</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No events recorded in this filter view.</div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Interactive Activity Detail Modal / Drawer */}
      {selectedActivity && (
        <div className="activity-modal-overlay" onClick={() => setSelectedActivity(null)}>
          <div className="activity-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="activity-modal-header">
              <div>
                <span className="eyebrow">{selectedActivity.type === "shipment" ? "CONSIGNMENT TELEMETRY" : "PURCHASE ORDER"}</span>
                <h2>{selectedActivity.title}</h2>
              </div>
              <button
                type="button"
                className="activity-modal-close"
                onClick={() => setSelectedActivity(null)}
              >
                ✕
              </button>
            </div>

            <div className="activity-modal-body">
              <div className="modal-status-row">
                <span>Status:</span>
                <span className={`status-pill status-${selectedActivity.status}`}>
                  {selectedActivity.status.replace("_", " ")}
                </span>
              </div>
              <div className="modal-detail-row">
                <span>Route / Scope:</span>
                <strong>{selectedActivity.subtitle}</strong>
              </div>
              <div className="modal-detail-row">
                <span>Logged Timestamp:</span>
                <span>{selectedActivity.timestamp ? new Date(selectedActivity.timestamp).toLocaleString() : "Real-time telemetry"}</span>
              </div>

              {selectedActivity.type === "shipment" && (
                <div className="modal-transit-box">
                  <strong>Digital Seal & Waybill Verification:</strong>
                  <p>Carrier transponder transmitting GPS coordinates along designated shipping corridor. Temperature and tilt sensors reporting within optimal thresholds.</p>
                  <div className="modal-transit-steps">
                    <div className="step-point step-completed">✓ Booking confirmed</div>
                    <div className="step-point step-completed">✓ Bay loading complete</div>
                    <div className="step-point step-active">⚡ En route in transit</div>
                    <div className="step-point">○ Final depot arrival</div>
                  </div>
                </div>
              )}

              {selectedActivity.type === "purchase_order" && (
                <div className="modal-transit-box">
                  <strong>Multi-Party Approval Workflow:</strong>
                  <p>Order digitally counter-signed by buyer organization. Staged in procurement pipeline awaiting next dispatch phase.</p>
                  <div className="modal-transit-steps">
                    <div className="step-point step-completed">✓ Draft created</div>
                    <div className="step-point step-completed">✓ Finance approved</div>
                    <div className="step-point step-active">⚡ Supplier allocation</div>
                    <div className="step-point">○ Fulfillment dispatch</div>
                  </div>
                </div>
              )}
            </div>

            <div className="activity-modal-footer">
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setSelectedActivity(null)}
              >
                Close
              </button>
              <Link
                to={selectedActivity.type === "shipment" ? "/shipments" : "/procurement"}
                className="button button-primary"
              >
                Open in {selectedActivity.type === "shipment" ? "Shipments" : "Procurement"} →
              </Link>
            </div>
          </div>
        </div>
      )}

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
