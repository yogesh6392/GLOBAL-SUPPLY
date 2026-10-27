import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getApiError } from "../api";
import NotificationCenter from "./NotificationCenter";
import ThemeToggle from "./ThemeToggle";

const navigationGroups = [
  {
    label: "WORKSPACE",
    items: [
      { to: "/dashboard", label: "Overview", icon: "▦", roles: null },
      { to: "/collaboration", label: "Suppliers & products", icon: "◇", roles: null },
      { to: "/procurement", label: "Purchase orders", icon: "▤", roles: null },
      { to: "/inventory", label: "Inventory", icon: "▣", roles: null },
      { to: "/shipments", label: "Shipments", icon: "↗", roles: null }
    ]
  },
  {
    label: "INTELLIGENCE",
    items: [
      { to: "/optimization", label: "Route optimization", icon: "⌖", roles: ["admin", "manufacturer", "logistics_provider"] },
      { to: "/analytics", label: "Analytics & reports", icon: "◷", roles: null },
      { to: "/algorithms", label: "DAA algorithm lab", icon: "⌘", roles: null }
    ]
  },
  {
    label: "MANAGEMENT",
    items: [
      { to: "/organization", label: "Organization profile", icon: "⌂", roles: null },
      { to: "/admin", label: "Administration", icon: "⚙", roles: ["admin"] }
    ]
  }
];

const pageNames = Object.fromEntries(
  navigationGroups.flatMap(({ items }) => items.map(({ to, label }) => [to, label]))
);

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      window.alert(getApiError(error));
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Workspace sidebar">
        <Link className="brand" to="/" aria-label="Global Supply Chain home">
          <span className="brand-mark">G</span>
          <span>Global<span className="brand-light">Chain</span></span>
        </Link>
        <nav className="side-nav" aria-label="Main navigation">
          {navigationGroups.map(({ label: groupLabel, items }) => {
            const visibleItems = items.filter((item) => !item.roles || item.roles.includes(user?.role));
            if (!visibleItems.length) return null;
            return (
              <div className="nav-group" key={groupLabel}>
                <div className="workspace-label">{groupLabel}</div>
                {visibleItems.map(({ to, label, icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={label}
                    aria-label={label}
                    className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                  >
                    <span className="nav-icon" aria-hidden="true">{icon}</span>
                    <span className="nav-label">{label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">{user?.fullName?.charAt(0)?.toUpperCase()}</div>
          <div className="user-mini">
            <strong>{user?.fullName}</strong>
            <span>{user?.role?.replaceAll("_", " ")}</span>
          </div>
          <button className="icon-button" onClick={handleLogout} aria-label="Sign out" title="Sign out">↗</button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <span className="breadcrumb">Workspace <span>/</span> {pageNames[location.pathname] ?? "Overview"}</span>
          <div className="topbar-right">
            <span className="status-dot" aria-hidden="true"></span>
            <span>{user?.organization?.name ?? "Workspace"}</span>
            <ThemeToggle />
            <NotificationCenter />
            <button className="topbar-logout" onClick={handleLogout}>Sign out</button>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
