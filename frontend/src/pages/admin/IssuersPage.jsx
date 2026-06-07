import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUniversities, createIssuer, resetIssuerPassword } from "../../api/admin";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Badge from "../../components/ui/Badge";
import { UserPlus, Loader2, Copy, CheckCircle2, RefreshCw, Eye, EyeOff } from "lucide-react";

export default function IssuersPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    email: "", university_id: "", issuer_name: "", department: "",
  });
  const [created,     setCreated]     = useState(null);
  const [resetTarget, setResetTarget] = useState(null);  // issuer to reset
  const [resetResult, setResetResult] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [copied, setCopied] = useState(false);
  const [issuerSearch, setIssuerSearch] = useState("");
  const [uniFilter,    setUniFilter]    = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: universities = [] } = useQuery({
    queryKey: ["admin-universities"], queryFn: listUniversities,
  });
  const trusted = universities.filter(u => u.trust_status === "TRUSTED");

  const allIssuers = universities.flatMap(u =>
  (u.issuers || []).map(iss => ({ ...iss, university_name: u.university_name, university_id: u.id }))
);

  const filteredIssuers = allIssuers.filter(iss => {
  const matchesSearch = !issuerSearch || [
    iss.email, iss.issuer_name || "", iss.department || "",
  ].some(v => v.toLowerCase().includes(issuerSearch.toLowerCase()));

  const matchesUni = uniFilter === "all" || String(iss.university_id) === uniFilter;

  const matchesStatus = statusFilter === "all" ||
    (statusFilter === "pending" && iss.is_temp_password) ||
    (statusFilter === "active"  && !iss.is_temp_password);

  return matchesSearch && matchesUni && matchesStatus;
});

  const createMut = useMutation({
    mutationFn: () => createIssuer(
      form.email, parseInt(form.university_id),
      form.issuer_name, form.department
    ),
    onSuccess: (data) => {
      setCreated(data);
      setForm({ email: "", university_id: "", issuer_name: "", department: "" });
      qc.invalidateQueries(["admin-universities"]);
    },
  });

  const resetMut = useMutation({
    mutationFn: (userId) => resetIssuerPassword(userId),
    onSuccess: (data) => {
      setResetResult(data);
      setResetTarget(null);
    },
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggle = (key) => setShowPasswords(p => ({ ...p, [key]: !p[key] }));

  const PasswordBox = ({ value, showKey }) => (
    <div className="flex items-center gap-3 bg-white border border-slate-200
                     rounded-lg px-4 py-3 mt-2">
      <code className="flex-1 font-mono text-slate-800 text-sm tracking-wider">
        {showPasswords[showKey] ? value : "•".repeat(value?.length || 14)}
      </code>
      <button onClick={() => toggle(showKey)} className="text-slate-400 hover:text-slate-600">
        {showPasswords[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
      <button onClick={() => copyToClipboard(value)}
        className="text-xs text-sky-600 font-medium hover:text-sky-800 flex items-center gap-1">
        <Copy className="w-3.5 h-3.5" />
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Issuer Accounts</h1>
        <p className="text-slate-500 text-sm">
          Manage university staff login credentials. Passwords are auto-generated.
        </p>
      </div>

      {/* Created banner */}
      {created && (
        <div className="card p-5 mb-6 border-green-200 bg-green-50">
          <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
            <CheckCircle2 className="w-4 h-4" />
            Account created — {created.email}
          </div>
          <p className="text-xs text-green-600 mb-1">
            Department code: <strong>{created.department_code}</strong>
          </p>
          <p className="text-sm text-green-700">
            Share this temporary password securely. Not shown again.
          </p>
          <PasswordBox value={created.temp_password} showKey="created" />
          <button onClick={() => setCreated(null)}
            className="text-xs text-green-600 underline mt-3 block">Dismiss</button>
        </div>
      )}

      {/* Reset result banner */}
      {resetResult && (
        <div className="card p-5 mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 text-amber-700 font-semibold mb-1">
            <RefreshCw className="w-4 h-4" />
            Password reset — {resetResult.email}
          </div>
          <PasswordBox value={resetResult.new_password} showKey="reset" />
          <button onClick={() => setResetResult(null)}
            className="text-xs text-amber-600 underline mt-2 block">Dismiss</button>
        </div>
      )}

      {/* Create form */}
      <div className="card p-6 mb-8">
        <h2 className="font-semibold text-slate-700 mb-4">Create New Issuer Account</h2>
        <form onSubmit={e => { e.preventDefault(); createMut.mutate(); }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label className="label">University</label>
            <select className="input"
              value={form.university_id}
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


<div>
  <label className="label">Issuer Name</label>
  <input type="text" className="input"
    placeholder="e.g. Dr. Kwame Mensah or Registrar's Office"
    value={form.issuer_name}
    onChange={e => setForm(p => ({ ...p, issuer_name: e.target.value }))}
    required   
    minLength={2}
  />
  <p className="text-xs text-slate-400 mt-1">
    Full name of the person or office responsible for certificate issuance.
  </p>
</div>

          <div>
            <label className="label">
              Department
              <span className="text-slate-400 font-normal text-xs ml-1">(optional)</span>
            </label>
            <input type="text" className="input"
              placeholder="e.g. Faculty of Engineering"
              value={form.department}
              onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
          </div>

          <div className="sm:col-span-2 pt-1">
            {createMut.isError && (
              <p className="text-red-600 text-sm mb-3">
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
          </div>
        </form>
      </div>

      {/* Existing issuers */}
      <div>
  <h2 className="font-semibold text-slate-700 mb-3">All Issuer Accounts</h2>

  {/* Filter bar */}
  <div className="card p-3 mb-4 flex flex-wrap gap-3 items-center">
    <input
      className="input flex-1 min-w-[160px] text-sm"
      placeholder="Search by email, name, or department…"
      value={issuerSearch}
      onChange={e => setIssuerSearch(e.target.value)}
    />
    <select className="input w-auto text-sm" value={uniFilter}
      onChange={e => setUniFilter(e.target.value)}>
      <option value="all">All universities</option>
      {universities.map(u => (
        <option key={u.id} value={String(u.id)}>{u.university_name}</option>
      ))}
    </select>
    <select className="input w-auto text-sm" value={statusFilter}
      onChange={e => setStatusFilter(e.target.value)}>
      <option value="all">All statuses</option>
      <option value="active">Active</option>
      <option value="pending">Awaiting first login</option>
    </select>
    <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">
      {filteredIssuers.length} of {allIssuers.length} accounts
    </span>
  </div>

  {filteredIssuers.length === 0 ? (
    <div className="card p-8 text-center text-slate-400 text-sm">
      No issuer accounts match your filters.
    </div>
  ) : (
    <div className="card divide-y divide-slate-100 overflow-hidden">
      {filteredIssuers.map(iss => (
        <div key={iss.id} className="flex items-center justify-between px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-slate-800">{iss.email}</p>
              {iss.is_temp_password && (
                <span className="text-xs bg-amber-100 text-amber-700
                                  px-2 py-0.5 rounded-full">
                  Awaiting setup
                </span>
              )}
            </div>
            {iss.issuer_name && (
              <p className="text-xs text-slate-600">{iss.issuer_name}</p>
            )}
            <p className="text-xs text-slate-400">
              {iss.department ? `${iss.department} · ` : ""}
              {iss.university_name}
              {iss.department_code && (
                <span className="font-mono ml-1 text-slate-300">
                  {iss.department_code}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setResetTarget(iss)}
            disabled={resetMut.isPending}
            className="flex items-center gap-1.5 text-xs font-medium
                       text-slate-400 hover:text-sky-600 transition-colors ml-4 flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Password
          </button>
        </div>
      ))}
    </div>
  )}
</div>

      {/* Reset password confirmation modal */}
      <ConfirmModal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset Issuer Password"
        message={
          resetTarget
            ? `This will immediately invalidate the current password for
               ${resetTarget.email}. They will be locked out until you
               share the new temporary password with them.`
            : ""
        }
        confirmLabel="Reset Password"
        confirmClass="btn-primary"
        loading={resetMut.isPending}
        onConfirm={() => resetMut.mutate(resetTarget.id)}
      />
    </div>
  );
}