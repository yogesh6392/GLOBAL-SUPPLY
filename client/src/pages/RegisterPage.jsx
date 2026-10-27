import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getApiError } from "../api";
import ThemeToggle from "../components/ThemeToggle";

const roles = [
  ["manufacturer", "Manufacturer"],
  ["supplier", "Supplier"],
  ["warehouse_manager", "Warehouse manager"],
  ["logistics_provider", "Logistics provider"]
];

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "manufacturer", organizationName: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-header"><Link className="brand auth-brand" to="/"><span className="brand-mark">G</span><span>Global<span className="brand-light">Chain</span></span></Link><ThemeToggle /></div>
      <section className="auth-card register-card">
        <div className="eyebrow">START COLLABORATING</div><h1>Create your workspace</h1><p className="auth-intro">Set up your organization to get started.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="fullName">Your name</label><input id="fullName" autoComplete="name" required minLength="2" maxLength="100" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Alex Morgan" />
          <label htmlFor="organizationName">Organization name</label><input id="organizationName" autoComplete="organization" required minLength="2" maxLength="120" value={form.organizationName} onChange={(event) => setForm({ ...form, organizationName: event.target.value })} placeholder="Northstar Manufacturing" />
          <label htmlFor="role">I work as a</label><select id="role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{roles.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
          <label htmlFor="email">Work email</label><input id="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" />
          <label htmlFor="password">Password</label><input id="password" type="password" autoComplete="new-password" required minLength="8" maxLength="72" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" />
          <p className="field-note">Administrator access is provisioned separately and cannot be selected here.</p>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary button-full" disabled={submitting}>{submitting ? "Creating workspace…" : "Create account"} <span aria-hidden="true">→</span></button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </section>
      <p className="auth-footer">Your organization, connected.</p>
    </main>
  );
}
