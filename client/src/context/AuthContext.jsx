import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("malac_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem("malac_token"))
      .finally(() => setLoading(false));
  }, []);

  const saveSession = ({ user, token }) => {
    localStorage.setItem("malac_token", token);
    setUser(user);
    return user;
  };
  const logout = () => { localStorage.removeItem("malac_token"); setUser(null); };
  const isStaff = user && ["admin", "vice-admin"].includes(user.role);
  const isSuperAdmin = user?.role === "admin";
  // Effective section permissions come from the server payload (Super
  // Admin = all keys; Vice-Admin = their granted set — the legacy
  // default only when no choice was ever saved for the account).
  const permissions = user?.permissions || [];
  const hasPermission = (key) => permissions.includes(key);

  return (
    <AuthContext.Provider value={{ user, loading, saveSession, logout, isStaff, isSuperAdmin, permissions, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
