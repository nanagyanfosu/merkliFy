import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRole } from "../api/axios";

export default function RoleGuard({ role, redirectTo, children }) {
  const { user } = useAuth();

  // Use live state if available, fall back to stored role
  const currentRole = user?.role || getRole();

  if (!currentRole || currentRole !== role) {
    const fallback =
      redirectTo ||
      (currentRole === "ADMIN" ? "/admin" : "/issuer/login");
    return <Navigate to={fallback} replace />;
  }

  return children;
}