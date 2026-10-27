import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { getApiError } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.data.user);
      setSessionError("");
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null);
        setSessionError("");
        return;
      }
      setSessionError(getApiError(error));
      throw error;
    }
  }, []);

  useEffect(() => {
    refreshUser()
      .catch((error) => {
        console.error("Could not restore the signed-in user.", error);
      })
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    setUser(data.data.user);
  }, []);

  const register = useCallback(async (details) => {
    const { data } = await api.post("/auth/register", details);
    setUser(data.data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, sessionError, refreshUser, login, register, logout }),
    [user, loading, sessionError, refreshUser, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
