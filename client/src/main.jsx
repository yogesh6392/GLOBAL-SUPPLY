import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminPage from "./pages/AdminPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import InventoryPage from "./pages/InventoryPage";
import OrganizationPage from "./pages/OrganizationPage";
import ProcurementPage from "./pages/ProcurementPage";
import RouteOptimizationPage from "./pages/RouteOptimizationPage";
import ShipmentsPage from "./pages/ShipmentsPage";
import SuppliersProductsPage from "./pages/SuppliersProductsPage";
import AcceptInvitationPage from "./pages/AcceptInvitationPage";
import { ThemeProvider } from "./ThemeContext";
import DotGridBackground from "./components/DotGridBackground";
import "./styles.css";

function SessionNotice() {
  const { sessionError, refreshUser } = useAuth();
  if (!sessionError) return null;

  async function handleRetry() {
    try {
      await refreshUser();
    } catch (error) {
      console.error("Could not restore the signed-in user.", error);
    }
  }

  return (
    <div className="session-notice" role="alert">
      <span>{sessionError}</span>
      <button onClick={handleRetry}>Retry</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <DotGridBackground />
          <SessionNotice />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/invite/:token" element={<AcceptInvitationPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/organization" element={<OrganizationPage />} />
                <Route path="/collaboration" element={<SuppliersProductsPage />} />
                <Route path="/procurement" element={<ProcurementPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/shipments" element={<ShipmentsPage />} />
                <Route path="/optimization" element={<RouteOptimizationPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
