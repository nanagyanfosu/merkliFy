import { createContext, useContext, useState, useCallback } from "react";
import { saveToken, clearToken, getToken, getRole } from "../api/axios";
import { login as apiLogin } from "../api/auth";

const AuthContext = createContext(null);

function readStoredSession() {
  const token = getToken();
  const role  = getRole();
  if (!token || !role) return null;
  return { role, is_temp_password: false };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredSession());

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);


    if (!data?.access_token) {
      throw new Error(
        "Login response did not include an access_token. " +
        "Check the console for the raw response structure."
      );
    }

    // Save to sessionStorage first — interceptor reads from there
    saveToken(data.access_token, data.role);

    // Then commit React state
    setUser({
      email,
      role: data.role,
      is_temp_password: Boolean(data.is_temp_password),
    });

    return data;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const markPasswordChanged = useCallback(() => {
    setUser((prev) => (prev ? { ...prev, is_temp_password: false } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, markPasswordChanged }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};