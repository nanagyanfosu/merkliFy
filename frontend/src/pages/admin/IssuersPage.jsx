import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUniversities, createIssuer, resetIssuerPassword } from "../../api/admin";
import Badge from "../../components/ui/Badge";
import {
  UserPlus, Loader2, Copy, CheckCircle2, RefreshCw, Eye, EyeOff,
} from "lucide-react";

export default function IssuersPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: "", university_id: "" });
  const [created, setCreated] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [copied, setCopied] = useState(false);

  const { data: universities = [] } = useQuery({
    queryKey: ["admin-universities"],
    queryFn: listUniversities,
  });

  const trusted = universities.filter(u => u.trust_status === "TRUSTED");

  const createMut = useMutation({
    mutationFn: () => createIssuer(form.email, parseInt(form.university_id)),
    onSuccess: (data) => {
      setCreated(data);
      setForm({ email: "", university_id: "" });
      qc.invalidateQueries(["admin-universities"]);
    },
  });

  const resetMut = useMutation({
    mutationFn: (userId) => resetIssuerPassword(userId),
    onSuccess: (data) => setResetResult(data),
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePasswordVisibility = (id) =>
    setShowPasswords(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Issuer Accounts</h1>
        <p className="text-slate-500 text-sm">
          Create login credentials for university staff. Passwords are
          auto-generated and must be changed on first login.
        </p>
      </div>

      {/* Password created banner */}
      {created && (
        <div className="card p-5 mb-6 border-green-200 bg-green-50">
          <div className="flex items-center gap-2 text-green-700 font-semibold mb-3">
            <CheckCircle2 className="w-4 h-4" />
            Account created for {created.email}
          </div>
          <p className="text-sm text-green-700 mb-3">
            Share this temporary password securely. It will not be shown again.
          </p>
          <div className="flex items-center gap-3 bg-white border border-green-200
                           rounded-lg px-4 py-3">
            <code className="flex-1 font-mono text-slate-800 text-sm tracking-wider">
              {showPasswords.created
                ? created.temp_password
                : "•".repeat(created.temp_password?.length || 14)}
            </code>
            <button
              onClick={() => togglePasswordVisibility("created")}
              className="text-slate-400 hover:text-slate-600"
            >
              {showPasswords.created
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => copyToClipboard(created.temp_password)}
              className="flex items-center gap-1 text-sm text-sky-600 font-medium
                         hover:text-sky-800"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button onClick={() => setCreated(null)}
            className="text-xs text-green-600 underline mt-3 block">
            Dismiss
          </button>
        </div>
      )}

      {/* Reset result banner */}
      {resetResult && (
        <div className="card p-5 mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 text-amber-700 font-semibold mb-2">
            <RefreshCw className="w-4 h-4" />
            Password reset for {resetResult.email}
          </div>
          <div className="flex items-center gap-3 bg-white border border-amber-200
                           rounded-lg px-4 py-3">
            <code className="flex-1 font-mono text-slate-800 text-sm tracking-wider">
              {showPasswords.reset
                ? resetResult.new_password
                : "•".repeat(resetResult.new_password?.length || 14)}
            </code>
            <button
              onClick={() => togglePasswordVisibility("reset")}
              className="text-slate-400 hover:text-slate-600"
            >
              {showPasswords.reset
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => copyToClipboard(resetResult.new_password)}
              className="flex items-center gap-1 text-sm text-sky-600 font-medium"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button onClick={() => setResetResult(null)}
            className="text-xs text-amber-600 underline mt-2 block">Dismiss</button>
        </div>
      )}

      {/* Create form */}
      <div className="card p-6 mb-8">
        <h2 className="font-semibold text-slate-700 mb-4">Create New Issuer Account</h2>
        <form
          onSubmit={e => { e.preventDefault(); createMut.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="label">University</label>
            <select className="input" value={form.university_id}
              onChange={e => setForm(p => ({ ...p, university_id: e.target.value }))}
              required>
              <option value="">Select a trusted university…</option>
              {trusted.map(u => (
                <option key={u.id} value={u.id}>
                  {u.university_name} (#{u.university_code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Issuer Email</label>
            <input type="email" className="input"
              placeholder="registrar@university.edu.gh"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required />
          </div>
          {createMut.isError && (
            <p className="text-red-600 text-sm">
              {createMut.error?.response?.data?.detail || "Failed to create account."}
            </p>
          )}
          <button type="submit" disabled={createMut.isPending}
            className="btn-primary flex items-center gap-2">
            {createMut.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <UserPlus className="w-4 h-4" />}
            {createMut.isPending ? "Creating…" : "Create Account"}
          </button>
        </form>
      </div>

      {/* Existing issuers grouped by university */}
      <h2 className="font-semibold text-slate-700 mb-3">All Issuer Accounts</h2>
      <div className="space-y-4">
        {universities
          .filter(u => u.issuers?.length > 0)
          .map(u => (
            <div key={u.id} className="card overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100
                               flex items-center gap-2">
                <p className="font-medium text-sm text-slate-700">{u.university_name}</p>
                <Badge status={u.trust_status} />
              </div>
              <div className="divide-y divide-slate-50">
                {u.issuers.map(iss => (
                  <div key={iss.id}
                    className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{iss.email}</p>
                      {iss.is_temp_password && (
                        <p className="text-xs text-amber-500">Awaiting password change</p>
                      )}
                    </div>
                    <button
                      onClick={() => resetMut.mutate(iss.id)}
                      disabled={resetMut.isPending}
                      className="flex items-center gap-1.5 text-xs font-medium
                                 text-slate-500 hover:text-sky-600 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reset Password
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}