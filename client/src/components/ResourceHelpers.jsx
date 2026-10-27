import { useCallback, useEffect, useState } from "react";
import api, { getApiError } from "../api";

export function useApiResource(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(path);
      setData(response.data.data);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-heading-action">{action}</div>}
    </div>
  );
}

export function Notice({ children, tone = "info" }) {
  if (!children) return null;
  return <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

export function LoadingState({ children = "Loading workspace records…" }) {
  return <div className="loading-panel" aria-live="polite">{children}</div>;
}

export function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>;
}

export function DataTable({ columns, rows, emptyMessage }) {
  if (!rows.length) return <EmptyState>{emptyMessage}</EmptyState>;

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? row._id ?? index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : (row[column.key] ?? "—")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusPill({ children }) {
  const status = String(children ?? "unknown").toLowerCase().replaceAll(" ", "_");
  return <span className={`status-pill status-${status}`}>{String(children ?? "Unknown").replaceAll("_", " ")}</span>;
}

export function SectionCard({ title, description, action, children }) {
  return (
    <section className="surface-card">
      <div className="surface-heading">
        <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ label, value, note, tone = "blue" }) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
      <small>{note}</small>
    </article>
  );
}

export function PaginationControls({ pagination, page, onChange }) {
  if (!pagination || pagination.pages < 2) return null;
  return (
    <div className="pagination-controls" aria-label="Pagination">
      <span>{pagination.total} records · page {page} of {pagination.pages}</span>
      <div>
        <button className="table-action" onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1}>Previous</button>
        <button className="table-action" onClick={() => onChange(Math.min(pagination.pages, page + 1))} disabled={page >= pagination.pages}>Next</button>
      </div>
    </div>
  );
}

export function SearchField({ value, onChange, label = "Search records" }) {
  return (
    <label className="search-field">
      <span>{label}</span>
      <input type="search" maxLength="100" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search…" />
    </label>
  );
}

export function useSubmitAction(onSuccess) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(action, successMessage) {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(successMessage);
      await onSuccess?.();
      return true;
    } catch (requestError) {
      setError(getApiError(requestError));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, error, message, submit };
}
