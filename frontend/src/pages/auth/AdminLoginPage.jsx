import { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ShieldCheck, Loader2, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    const data = await login(email, password);

    if (data.role !== "ADMIN") {
      setError(
        "This portal is for administrators only. " 
      );
      setLoading(false);
      return;
    }

    if (data.is_temp_password) {
      navigate("/change-password");
    } else {
      navigate("/admin");
    }
  } catch (err) {
    setError(
      err.response?.data?.detail ||
      "Login failed. Please check your credentials."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-white/10 p-3 rounded-xl">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">CACVS</h1>
            <p className="text-brand-200 text-xs">Administrator Portal</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-brand-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              Administrator Sign In
            </h2>
          </div>
          <p className="text-slate-400 text-xs mb-6">
            Restricted access. Administrators only.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="admin@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in to Admin Portal"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-center">
            <p className="text-slate-400 text-xs">
              Not an administrator?
            </p>
            <div className="flex justify-center gap-4 text-xs">
              <Link to="/issuer/login" className="text-teal-600 hover:underline">
                Issuer login →
              </Link>
              <Link to="/" className="text-slate-400 hover:underline">
                Public verification →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}