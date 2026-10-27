import { demoApi, DEMO_ACCOUNTS, DEMO_PASSWORD } from "./demoApi";

const BASE_URL = "/api";
const DEMO_SESSION_KEY = "globalchain-demo-session-v1";

export function isDemoSessionActive() {
  try {
    return Boolean(window.localStorage.getItem(DEMO_SESSION_KEY));
  } catch {
    return false;
  }
}

export function getApiError(error) {
  return error.response?.data?.message ?? error.message ?? "The service could not be reached. Please try again.";
}

async function request(method, path, body) {
  const isDemoActive = isDemoSessionActive();

  // If this is a login attempt with demo credentials, or demo mode is active
  if (path === "/auth/login" && body?.email) {
    const isDemoEmail = DEMO_ACCOUNTS.some(
      (acc) => acc.email.toLowerCase() === body.email.toLowerCase()
    ) || body.email.endsWith("@demo.globalchain.local");

    if (isDemoEmail) {
      return demoApi.post(path, body);
    }
  }

  // If demo session is active, route through demoApi
  if (isDemoActive) {
    if (path === "/auth/logout") {
      return demoApi.post(path, body);
    }
    return demoApi[method.toLowerCase()](path, body);
  }

  // Try real API
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      if (!response.ok) {
        if (path === "/auth/me") {
          return demoApi.get(path);
        }
        if (path === "/auth/login") {
          console.warn("Backend unavailable, attempting demo login fallback.");
          return demoApi.post(path, body);
        }
        const error = new Error(`Server returned ${response.status}`);
        error.response = { status: response.status, data: { message: error.message } };
        throw error;
      }
      data = { message: text };
    }

    if (!response.ok) {
      // If server returned 503 (database unavailable), fallback for demo experience
      if ((response.status === 503 || response.status === 404) && path.startsWith("/auth/")) {
        console.warn("API database unavailable, falling back to local demoApi.");
        return demoApi[method.toLowerCase()](path, body);
      }

      const error = new Error(data.message ?? "The request could not be completed.");
      error.response = { status: response.status, data };
      throw error;
    }

    return { data, status: response.status };
  } catch (err) {
    // If network error occurred and it's auth/me or login, fallback to demoApi
    if (path === "/auth/me" || path === "/auth/login") {
      console.warn("API unreachable, falling back to demoApi:", err.message);
      return demoApi[method.toLowerCase()](path, body);
    }
    throw err;
  }
}

const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path)
};

export default api;
