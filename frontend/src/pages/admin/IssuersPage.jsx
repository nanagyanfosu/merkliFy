import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUniversities, createIssuer,
  resetIssuerPassword, getIssuerDetail, updateIssuer,
} from "../../api/admin";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Badge from "../../components/ui/Badge";
import { getErrorMessage } from "../../utils/errors";
import {
  UserPlus, Loader2, Copy, CheckCircle2,
  RefreshCw, Eye, EyeOff, X, ChevronRight,
  Building2, Hash, Calendar, Upload, Pencil, Check
} from "lucide-react";

export default function IssuersPage() {
  const qc = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedId,     setSelectedId]     = useState(null);
  const [resetTarget,    setResetTarget]     = useState(null);
  const [resetResult,    setResetResult]     = useState(null);
  const [created,        setCreated]         = useState(null);
  const [showPass,       setShowPass]        = useState(false);
  const [copied,         setCopied]          = useState(false);
  const [issuerSearch,   setIssuerSearch]    = useState("");
  const [uniFilter,      setUniFilter]       = useState("all");
  const [statusFilter,   setStatusFilter]    = useState("all");
  const [isEditingIssuer, setIsEditingIssuer] = useState(false);
  const [issuerEditForm,  setIssuerEditForm]  = useState({});
  const [editSaveMsg,     setEditSaveMsg]     = useState("");
  const [issuerSaveError, setIssuerSaveError] = useState("");

  const [form, setForm] = useState({
    email: "", university_id: "", issuer_name: "", department: "",
  });

  const { data: universities = [] } = useQuery({
    queryKey: ["admin-universities"],
    queryFn:  listUniversities,
  });

  const trusted = universities.filter(u => u.trust_status === "TRUSTED");

  const { data: selectedIssuer, isLoading: loadingDetail } = useQuery({
    queryKey: ["admin-issuer-detail", selectedId],
    queryFn:  () => getIssuerDetail(selectedId),
    enabled:  !!selectedId,
  });

  const createMut = useMutation({
    mutationFn: () => createIssuer(
      form.email, parseInt(form.university_id),
      form.issuer_name, form.department
    ),
    onSuccess: (data) => {
      setCreated(data);
      setShowCreateForm(false);
      setForm({ email: "", university_id: "", issuer_name: "", department: "" });
      qc.invalidateQueries(["admin-universities"]);
      qc.invalidateQueries(["admin-dashboard-summary"]);
    },
  });

  const updateIssuerMut = useMutation({
  mutationFn: ({ id, data }) => updateIssuer(id, data),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["admin-universities"] });
      await qc.refetchQueries({ queryKey: ["admin-issuer-detail", selectedId] });
      setIsEditingIssuer(false);
      setIssuerSaveError("");
      setEditSaveMsg("Changes saved.");
      setTimeout(() => setEditSaveMsg(""), 3000);
    },
    onError: (err) => {
      setIssuerSaveError(
        getErrorMessage(err, "We couldn't save the changes. Please try again.")
      );
    },
  });

  const startEditIssuer = (detail) => {
    setIssuerSaveError("");
    setIssuerEditForm({
      issuer_name:   detail.issuer_name   ?? "",
      department:    detail.department    ?? "",
      email:         detail.email         ?? "",
      university_id: detail.university?.id ?? "",
    });
    setIsEditingIssuer(true);
  };

  const resetMut = useMutation({
    mutationFn: (userId) => resetIssuerPassword(userId),
    onSuccess: (data) => {
      setResetResult(data);
      setResetTarget(null);
      qc.invalidateQueries(["admin-issuer-detail", selectedId]);
    },
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


const allIssuers = universities
  .slice()
  .sort((a, b) => a.university_name.localeCompare(b.university_name))
  .flatMap(u =>
    (u.issuers || [])
      .slice()
      .sort((a, b) => (a.issuer_name || a.email)
        .localeCompare(b.issuer_name || b.email))
      .map(iss => ({
        ...iss,
        university_name: u.university_name,
        university_id:   u.id,
      }))
  );

  // Auto-select the first issuer when the list loads
// so there is never an empty state on the right panel
    useEffect(() => {
  if (allIssuers.length > 0 && !selectedId) {
    setSelectedId(allIssuers[0].id);
    }
  }, [allIssuers.length]); // only on first load

  const filteredIssuers = allIssuers.filter(iss => {
    const matchSearch = !issuerSearch || [
      iss.email,
      iss.issuer_name || "",
      iss.department  || "",
    ].some(v => v.toLowerCase().includes(issuerSearch.toLowerCase()));

    const matchUni = uniFilter === "all" ||
                     String(iss.university_id) === uniFilter;

    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "pending"  &&  iss.is_temp_password) ||
      (statusFilter === "active"   && !iss.is_temp_password);

    return matchSearch && matchUni && matchStatus;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Issuer Accounts
          </h1>
          <p className="text-slate-500 text-sm">
            {allIssuers.length} account{allIssuers.length !== 1 ? "s" : ""}
            {" "}across {universities.length} institution{universities.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(p => !p)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700
                      text-white text-sm font-semibold px-4 py-2.5
                      rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Create Account
        </button>
      </div>

      {/* Created banner */}
      {created && (
        <div className="bg-green-50 border border-green-200 rounded-xl
                         p-5 mb-5">
          <div className="flex items-center gap-2 text-green-700
                           font-semibold mb-2">
            <CheckCircle2 className="w-4 h-4" />
            Account created — {created.email}
          </div>
          <p className="text-sm text-green-600 mb-1">
            Department code:{" "}
            <span className="font-mono font-bold">
              {created.department_code}
            </span>
          </p>
          <p className="text-sm text-green-700 mb-2">
            Temporary password — share securely. Not shown again.
          </p>
          <div className="flex items-center gap-3 bg-white border
                           border-green-200 rounded-lg px-4 py-2.5">
            <code className="flex-1 font-mono text-sm text-slate-800
                              tracking-wider">
              {showPass ? created.temp_password
                        : "•".repeat(created.temp_password?.length || 14)}
            </code>
            <button onClick={() => setShowPass(p => !p)}
              className="text-slate-400 hover:text-slate-600">
              {showPass ? <EyeOff className="w-4 h-4" />
                        : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => copyToClipboard(created.temp_password)}
              className="text-sky-600 hover:text-sky-800 text-xs
                          font-semibold flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button onClick={() => setCreated(null)}
            className="text-xs text-green-600 underline mt-2 block">
            Dismiss
          </button>
        </div>
      )}

      {/* Reset result banner */}
      {resetResult && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl
                         p-5 mb-5">
          <div className="flex items-center gap-2 text-amber-700
                           font-semibold mb-2">
            <RefreshCw className="w-4 h-4" />
            Password reset — {resetResult.email}
          </div>
          <div className="flex items-center gap-3 bg-white border
                           border-amber-200 rounded-lg px-4 py-2.5">
            <code className="flex-1 font-mono text-sm text-slate-800">
              {showPass ? resetResult.new_password
                        : "•".repeat(resetResult.new_password?.length || 14)}
            </code>
            <button onClick={() => setShowPass(p => !p)}
              className="text-slate-400 hover:text-slate-600">
              {showPass ? <EyeOff className="w-4 h-4" />
                        : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => copyToClipboard(resetResult.new_password)}
              className="text-sky-600 text-xs font-semibold
                          flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button onClick={() => setResetResult(null)}
            className="text-xs text-amber-600 underline mt-2 block">
            Dismiss
          </button>
        </div>
      )}

      {/* Create form — hidden by default */}
      {showCreateForm && (
        <div className="bg-white border border-slate-200 rounded-xl
                         p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">
              New Issuer Account
            </h2>
            <button onClick={() => setShowCreateForm(false)}
              className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form
            onSubmit={e => { e.preventDefault(); createMut.mutate(); }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                  uppercase tracking-wide mb-1.5">
                University
              </label>
              <select
                className="w-full px-3 py-2.5 border border-slate-200
                            rounded-lg text-sm text-slate-900 bg-white
                            focus:outline-none focus:ring-2
                            focus:ring-sky-500"
                value={form.university_id}
                onChange={e => setForm(p => ({
                  ...p, university_id: e.target.value
                }))}
                required
              >
                <option value="">Select trusted university…</option>
                {trusted.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.university_name} (#{u.university_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                  uppercase tracking-wide mb-1.5">
                Issuer Email
              </label>
              <input type="email"
                className="w-full px-3 py-2.5 border border-slate-200
                            rounded-lg text-sm focus:outline-none
                            focus:ring-2 focus:ring-sky-500"
                placeholder="registrar@university.edu"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                  uppercase tracking-wide mb-1.5">
                Issuer Name <span className="text-red-400">*</span>
              </label>
              <input type="text"
                className="w-full px-3 py-2.5 border border-slate-200
                            rounded-lg text-sm focus:outline-none
                            focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. Dr. Kwame Mensah"
                value={form.issuer_name}
                onChange={e => setForm(p => ({
                  ...p, issuer_name: e.target.value
                }))}
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                  uppercase tracking-wide mb-1.5">
                Department
              </label>
              <input type="text"
                className="w-full px-3 py-2.5 border border-slate-200
                            rounded-lg text-sm focus:outline-none
                            focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. Faculty of Engineering"
                value={form.department}
                onChange={e => setForm(p => ({
                  ...p, department: e.target.value
                }))}
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-1">
              <button type="submit"
                disabled={createMut.isPending}
                className="flex items-center gap-2 bg-sky-600
                            hover:bg-sky-700 text-white text-sm
                            font-semibold px-4 py-2.5 rounded-lg
                            disabled:opacity-50 transition-colors"
              >
                {createMut.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <UserPlus className="w-4 h-4" />}
                Create Account
              </button>
              <button type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg
                            text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
            {createMut.isError && (
              <p className="sm:col-span-2 text-red-600 text-sm">
                {getErrorMessage(createMut.error,
                  "We couldn't create the issuer account. Please try again.")}
              </p>
            )}
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Issuer list */}
        <div className="lg:col-span-2">
          {/* Filter bar */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <input
              className="flex-1 min-w-0 px-3 py-2 border border-slate-200
                          rounded-lg text-sm focus:outline-none focus:ring-2
                          focus:ring-sky-500"
              placeholder="Search by email, name, department…"
              value={issuerSearch}
              onChange={e => setIssuerSearch(e.target.value)}
            />
            <select
              className="px-3 py-2 border border-slate-200 rounded-lg
                          text-sm text-slate-700 bg-white focus:outline-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl
                           overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-xs
                             text-slate-400 font-medium">
              {filteredIssuers.length} of {allIssuers.length} accounts
            </div>
            {filteredIssuers.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-400 text-center">
                No accounts match your filters.
              </p>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredIssuers.map(iss => (
                  <button
                    key={iss.id}
                    onClick={() => setSelectedId(
                      selectedId === iss.id ? null : iss.id
                    )}
                    className={`w-full text-left px-4 py-3.5 hover:bg-slate-50
                                 transition-colors flex items-center gap-3 ${
                      selectedId === iss.id ? "bg-sky-50" : ""
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center
                                      justify-center text-xs font-bold
                                      flex-shrink-0 ${
                      iss.is_temp_password
                        ? "bg-amber-100 text-amber-700"
                        : "bg-sky-100 text-sky-700"
                    }`}>
                      {(iss.issuer_name || iss.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {iss.issuer_name || iss.email}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {iss.department
                          ? `${iss.department} · `
                          : ""}{iss.university_name}
                      </p>
                    </div>
                    {iss.is_temp_password && (
                      <span className="text-xs text-amber-600 bg-amber-50
                                        border border-amber-200 px-1.5 py-0.5
                                        rounded-full flex-shrink-0">
                        Setup
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300
                                              flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {selectedId ? (
            loadingDetail ? (
              <div className="bg-white border border-slate-200 rounded-xl
                               p-8 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
              </div>
            ) : selectedIssuer ? (
              <div className="bg-white border border-slate-200 rounded-xl
                               overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100
                                 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sky-100
                                     flex items-center justify-center
                                     text-sky-700 font-bold text-lg">
                      {(selectedIssuer.issuer_name ||
                        selectedIssuer.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {selectedIssuer.issuer_name || "—"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {selectedIssuer.email}
                      </p>
                      {selectedIssuer.is_temp_password && (
                        <span className="text-xs text-amber-600 bg-amber-50
                                          border border-amber-100 px-2 py-0.5
                                          rounded-full mt-1 inline-block">
                          Awaiting first login
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedId(null)}
                    className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {editSaveMsg && (
  <div className="mx-5 mt-3 flex items-center gap-2 bg-green-50
                   border border-green-200 text-green-700 text-sm
                   px-4 py-2.5 rounded-lg">
    <Check className="w-4 h-4" />
    {editSaveMsg}
  </div>
)}

                {isEditingIssuer ? (
                  <div className="px-5 py-5 border-b border-slate-100">
                    <p className="text-xs font-semibold text-sky-600 uppercase
                                   tracking-wide mb-4">
                      Editing Issuer Account
                    </p>
                    <div className="space-y-3">
                      {[
                        { key: "issuer_name",  label: "Issuer Name",  type: "text",
                          placeholder: "Dr. Kwame Mensah" },
                        { key: "department",   label: "Department",   type: "text",
                          placeholder: "Faculty of Engineering" },
                        { key: "email",        label: "Email Address",type: "email",
                          placeholder: "registrar@university.edu" },
                      ].map(({ key, label, type, placeholder }) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            {label}
                          </label>
                          <input type={type}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg
                                       text-sm focus:outline-none focus:ring-2
                                       focus:ring-sky-500 bg-white"
                            placeholder={placeholder}
                            value={issuerEditForm[key]}
                            onChange={e => setIssuerEditForm(p => ({
                              ...p, [key]: e.target.value
                            }))} />
                        </div>
                      ))}

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          University
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg
                                     text-sm focus:outline-none focus:ring-2
                                     focus:ring-sky-500 bg-white"
                          value={issuerEditForm.university_id}
                          onChange={e => setIssuerEditForm(p => ({
                            ...p, university_id: parseInt(e.target.value)
                          }))}>
                          {trusted.map(u => (
                            <option key={u.id} value={u.id}>{u.university_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => updateIssuerMut.mutate({
                          id:   selectedId,
                          data: Object.fromEntries(
                            Object.entries(issuerEditForm).filter(([, v]) => v !== "")
                          ),
                        })}
                        disabled={updateIssuerMut.isPending}
                        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700
                                   text-white text-sm font-semibold px-4 py-2 rounded-lg
                                   disabled:opacity-50 transition-colors"
                      >
                        {updateIssuerMut.isPending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Check className="w-4 h-4" />}
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingIssuer(false)}
                        className="px-4 py-2 border border-slate-200 rounded-lg
                                   text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>

                    {issuerSaveError && (
                      <p className="text-red-600 text-sm mt-2 bg-red-50 border border-red-200
                                     px-3 py-2 rounded-lg">
                        {issuerSaveError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="px-5 py-5 border-b border-slate-100">
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => startEditIssuer(selectedIssuer)}
                        className="flex items-center gap-1.5 text-xs text-sky-600
                                   hover:text-sky-800 font-medium border border-sky-200
                                   hover:bg-sky-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Details
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <DetailRow icon={Building2} label="University"
                        value={selectedIssuer.university?.university_name || "—"} />
                      <DetailRow icon={Hash} label="Department Code"
                        value={selectedIssuer.department_code || "—"} mono />
                      <DetailRow icon={Building2} label="Department"
                        value={selectedIssuer.department || "Not specified"} />
                      <DetailRow icon={Building2} label="Institution Code"
                        value={selectedIssuer.university?.university_code
                          ? `#${selectedIssuer.university.university_code}`
                          : "—"} mono />
                      <DetailRow icon={Calendar} label="Account Created"
                        value={new Date(selectedIssuer.created_at)
                          .toLocaleDateString(undefined, {
                            year: "numeric", month: "short", day: "numeric",
                          })} />
                      <DetailRow icon={Calendar} label="Last Login"
                        value={
                          selectedIssuer.last_login
                            ? new Date(selectedIssuer.last_login)
                                .toLocaleString(undefined, {
                                  dateStyle: "medium", timeStyle: "short",
                                })
                            : "Never logged in"
                        } />
                    </div>
                  </div>
                )}

                {/* Upload stats */}
                <div className="px-6 py-5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-400
                                  uppercase tracking-wide mb-3">
                    Upload Statistics
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <StatBox icon={Upload} label="Batches Uploaded"
                      value={selectedIssuer.stats?.total_batches || 0} />
                    <StatBox icon={Hash} label="Certificates Issued"
                      value={selectedIssuer.stats?.total_certs || 0} />
                  </div>
                  {selectedIssuer.stats?.last_batch_name && (
                    <p className="text-xs text-slate-400 mt-3">
                      Last batch:{" "}
                      <span className="font-medium text-slate-600">
                        {selectedIssuer.stats.last_batch_name}
                      </span>
                      {" "}·{" "}
                      {new Date(selectedIssuer.stats.last_batch_date)
                        .toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4">
                  <button
                    onClick={() => setResetTarget(selectedIssuer)}
                    className="flex items-center gap-2 text-sm
                                text-slate-500 hover:text-sky-600
                                transition-colors font-medium"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset Password
                  </button>
                </div>
              </div>
            ) : null
          ) : (
            <div className="bg-slate-50 border border-slate-200
                             border-dashed rounded-xl p-10 text-center">
              <p className="text-slate-400 text-sm">
                Select an issuer account to view details.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm reset modal */}
      <ConfirmModal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset Issuer Password"
        message={resetTarget
          ? `This will immediately invalidate the current password for
             ${resetTarget.email}. They will need the new temporary
             password to log in.`
          : ""}
        confirmLabel="Reset Password"
        confirmClass="btn-primary"
        loading={resetMut.isPending}
        onConfirm={() => resetMut.mutate(resetTarget.id)}
      />
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, mono }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-slate-800 ${
        mono ? "font-mono" : ""
      }`}>
        {value}
      </p>
    </div>
  );
}

function StatBox({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3.5 flex items-center gap-3">
      <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <div>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}