import { useApiResource } from "./ResourceHelpers";

export default function NotificationCenter() {
  const { data, error, loading } = useApiResource("/inventory/notifications?limit=5");
  const notifications = data?.notifications ?? [];

  return (
    <details className="notification-center">
      <summary aria-label="Recent notifications">
        <span aria-hidden="true">♢</span>
        <span className="notification-count">{data?.pagination?.total ?? (loading ? "…" : notifications.length)}</span>
      </summary>
      <div className="notification-popover">
        <strong>Recent notifications</strong>
        {error && <span className="notification-empty">Could not load notifications.</span>}
        {!error && !notifications.length && <span className="notification-empty">{loading ? "Loading…" : "No notifications yet."}</span>}
        {notifications.map((item) => (
          <div className="notification-item" key={item._id}>
            <span>{item.message}</span>
            <time>{new Date(item.createdAt).toLocaleString()}</time>
          </div>
        ))}
      </div>
    </details>
  );
}
