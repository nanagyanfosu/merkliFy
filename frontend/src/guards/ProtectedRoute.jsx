import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getToken } from "../api/axios";

export default function ProtectedRoute({ children, loginPath = "/admin/login" }) {
  const { user } = useAuth();
  const location = useLocation();

  // Accept either live React state OR a valid token in sessionStorage.
  // The token check covers the one-render gap on page refresh before
  // AuthContext has re-hydrated from sessionStorage.
  const isAuthenticated = !!user || !!getToken();

  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (user?.is_temp_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}