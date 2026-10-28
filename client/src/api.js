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

  // If this is a login attempt with demo credentials
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

  // Try real backend API
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
      // If server returned non-JSON error (e.g. Vite proxy ECONNREFUSED 500, or HTML 502/503/504)
      if (!response.ok) {
        if (path === "/auth/me" || path === "/auth/login" || path === "/auth/register" || path === "/auth/logout") {
          console.warn("Backend unavailable, falling back to local workspace mode for", path);
          return demoApi[method.toLowerCase()](path, body);
        }
        const error = new Error(`Server returned ${response.status}`);
        error.response = { status: response.status, data: { message: error.message } };
        throw error;
      }
      data = { message: text };
    }

    if (!response.ok) {
      // If server returned 5xx (500, 502, 503, 504) or database offline on Vercel
      if (response.status >= 500) {
        console.warn(`API returned ${response.status}, falling back to local workspace mode for ${path}`);
        try {
          return await demoApi[method.toLowerCase()](path, body);
        } catch (demoErr) {
          if (demoErr.response) throw demoErr;
        }
      }

      // If login returned 401/404, check if credentials exist in local demo storage
      if (path === "/auth/login" && (response.status === 401 || response.status === 404)) {
        try {
          return await demoApi.post(path, body);
        } catch {
          // preserve backend error
        }
      }

      const error = new Error(data.message ?? "The request could not be completed.");
      error.response = { status: response.status, data };
      throw error;
    }

    return { data, status: response.status };
  } catch (err) {
    if (err.response) throw err;
    // If network error occurred (e.g. server down, offline, fetch failed)
    console.warn("API unreachable, falling back to local workspace mode:", err.message);
    try {
      return await demoApi[method.toLowerCase()](path, body);
    } catch {
      throw err;
    }
  }
}

const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path)
};

export default api;
