import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminSearchCertificates, adminGetCertificateStatus,
  adminChangeCertificateStatus,
} from "../../api/admin";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
  Search, Loader2, ChevronRight, SlidersHorizontal,
  AlertTriangle, ChevronUp, ChevronDown,
} from "lucide-react";

const STATUSES     = ["", "ACTIVE", "REVOKED", "SUSPENDED"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS        = ["", ...Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - i)];

const SORT_FIELDS = [
  { value: "serial_number",   label: "Serial Number" },
  { value: "fullname",        label: "Name" },
  { value: "program",         label: "Program" },
  { value: "graduation_year", label: "Year" },
  { value: "created_at",      label: "Date Added" },
];

export default function AdminCertificatesPage() {
  const qc = useQueryClient();

  // Search form state
  const [search, setSearch] = useState({
    serial_number: "", fullname: "", program: "",
    graduation_year: "", status: "", academic_year: "",
    exact_match: false, sort_by: "serial_number", sort_dir: "asc",
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [offset, setOffset]             = useState(0);
  const limit = 20;

  // Detail panel state
  const [selected,   setSelected]   = useState(null);
  const [modal,      setModal]      = useState(null);
  const [reason,     setReason]     = useState("");

  const searchMut = useMutation({
    mutationFn: () => {
      const payload = Object.fromEntries(
        Object.entries(search).filter(([, v]) => v !== "" && v !== false)
      );
      if (search.exact_match) payload.exact_match = true;
      return adminSearchCertificates(payload, { limit, offset });
    },
  });

  const detailMut = useMutation({
    mutationFn: (id) => adminGetCertificateStatus(id),
    onSuccess:  (data) => setSelected(data),
  });

  const changeMut = useMutation({
    mutationFn: ({ certId, newStatus, reason }) =>
      adminChangeCertificateStatus(certId, { new_status: newStatus, reason }),
    onSuccess: () => {
      setModal(null); setReason("");
      detailMut.mutate(selected.certificate_id);
      searchMut.mutate();
    },
  });

  const setSort = (col) => {
    setSearch(p => ({
      ...p,
      sort_by:  col,
      sort_dir: p.sort_by === col && p.sort_dir === "asc" ? "desc" : "asc",
    }));
  };

  const SortIcon = ({ col }) => {
    if (search.sort_by !== col) return null;
    return search.sort_dir === "asc"
      ? <ChevronUp className="w-3 h-3 inline ml-0.5" />
      : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Certificates</h1>
        <p className="text-slate-500 text-sm">Search and manage across all universities</p>
      </div>

      {/* Search panel */}
      <div className="card p-5 mb-5">
        {/* Basic row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="label">Serial Number</label>
            <input className="input" placeholder="CS2025-001 (exact)"
              value={search.serial_number}
              onChange={e => setSearch(p => ({ ...p, serial_number: e.target.value }))} />
          </div>
          <div>
            <label className="label">Full Name</label>
            <input className="input" placeholder="Contains name…"
              value={search.fullname}
              onChange={e => setSearch(p => ({ ...p, fullname: e.target.value }))} />
          </div>
          <div>
            <label className="label">Program</label>
            <input className="input"
              placeholder={search.exact_match ? "Exact program…" : "Contains program…"}
              value={search.program}
              onChange={e => setSearch(p => ({ ...p, program: e.target.value }))} />
          </div>
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(p => !p)}
          className="flex items-center gap-1.5 text-xs text-slate-500
                     hover:text-slate-700 mb-3"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {showAdvanced ? "Hide advanced filters" : "Advanced filters"}
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3
                           pt-3 border-t border-slate-100">
            <div>
              <label className="label">Status</label>
              <select className="input"
                value={search.status}
                onChange={e => setSearch(p => ({ ...p, status: e.target.value }))}>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s || "All statuses"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Graduation Year</label>
              <input type="number" className="input" placeholder="2025"
                value={search.graduation_year}
                onChange={e => setSearch(p => ({
                  ...p, graduation_year: e.target.value,
                }))} />
            </div>
            <div>
              <label className="label">Academic Year</label>
              <select className="input"
                value={search.academic_year}
                onChange={e => setSearch(p => ({ ...p, academic_year: e.target.value }))}>
                {YEARS.map(y => (
                  <option key={y} value={y}>{y || "All years"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sort By</label>
              <select className="input"
                value={search.sort_by}
                onChange={e => setSearch(p => ({ ...p, sort_by: e.target.value }))}>
                {SORT_FIELDS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Exact match toggle */}
            <div className="col-span-2 sm:col-span-4">
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <div
                  onClick={() => setSearch(p => ({ ...p, exact_match: !p.exact_match }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    search.exact_match ? "bg-sky-500" : "bg-slate-200"
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full
                                    shadow transition-transform ${
                    search.exact_match ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </div>
                <span className="text-sm text-slate-600">
                  Exact match for program and name
                  <span className="text-xs text-slate-400 ml-1">
                    {search.exact_match
                      ? "(typing 'computer science' only matches that exact program)"
                      : "(typing 'computer' matches all computer programs)"}
                  </span>
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => { setOffset(0); searchMut.mutate(); }}
            disabled={searchMut.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {searchMut.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Search className="w-4 h-4" />}
            Search
          </button>
          {searchMut.data && (
            <button
              onClick={() => {
                setSearch({
                  serial_number: "", fullname: "", program: "",
                  graduation_year: "", status: "", academic_year: "",
                  exact_match: false, sort_by: "serial_number", sort_dir: "asc",
                });
                searchMut.reset();
                setSelected(null);
              }}
              className="btn-secondary text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Broad warning */}
      {searchMut.data?.broad_warning && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200
                         text-amber-700 text-sm px-4 py-3 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Your search returned {searchMut.data.total} results.
          Enable <strong>Exact match</strong> above to narrow results.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Results table */}
        {searchMut.data && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center
                             justify-between text-sm">
              <span className="text-slate-500">
                {searchMut.data.total} result{searchMut.data.total !== 1 ? "s" : ""}
                {searchMut.data.total > limit &&
                  ` — showing ${offset + 1}–${Math.min(offset + limit, searchMut.data.total)}`}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={offset === 0}
                  onClick={() => { setOffset(Math.max(0, offset - limit)); searchMut.mutate(); }}
                  className="px-2 py-1 text-xs rounded border border-slate-200
                             disabled:opacity-40 hover:bg-slate-50"
                >← Prev</button>
                <button
                  disabled={offset + limit >= searchMut.data.total}
                  onClick={() => { setOffset(offset + limit); searchMut.mutate(); }}
                  className="px-2 py-1 text-xs rounded border border-slate-200
                             disabled:opacity-40 hover:bg-slate-50"
                >Next →</button>
              </div>
            </div>

            {/* Sortable table header */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left">
                    {[
                      { col: "serial_number",   label: "Serial" },
                      { col: "fullname",         label: "Name" },
                      { col: "program",          label: "Program" },
                      { col: "graduation_year",  label: "Year" },
                    ].map(({ col, label }) => (
                      <th key={col}
                        onClick={() => setSort(col)}
                        className="px-3 py-2.5 font-medium text-slate-500 text-xs
                                   cursor-pointer hover:text-slate-700 select-none">
                        {label}<SortIcon col={col} />
                      </th>
                    ))}
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {searchMut.data.results.map(cert => (
                    <tr key={cert.certificate_id}
                      onClick={() => detailMut.mutate(cert.certificate_id)}
                      className={`cursor-pointer hover:bg-slate-50 transition-colors ${
                        selected?.certificate_id === cert.certificate_id
                          ? "bg-sky-50" : ""
                      }`}
                    >
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                        {cert.serial_number}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800 max-w-[120px] truncate">
                        {cert.fullname}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 max-w-[120px] truncate">
                        {cert.program}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {cert.graduation_year}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge status={cert.current_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail panel */}
        {selected && (
          <div className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-semibold text-slate-800">{selected.fullname}</h2>
                <p className="text-xs font-mono text-slate-400">{selected.serial_number}</p>
              </div>
              <Badge status={selected.current_status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <Field label="Program"    value={selected.program} />
              <Field label="Year"       value={selected.graduation_year} />
              <Field label="Issuer"     value={selected.issuer} />
              <Field label="Batch"      value={`#${selected.batch_id} — ${selected.batch_name}`} />
            </div>

            {/* Actions */}
            {selected.current_status !== "REVOKED" && (
              <div className="flex gap-2 flex-wrap mb-4">
                {selected.current_status !== "REVOKED" && (
                  <button onClick={() => setModal({ newStatus: "REVOKED" })}
                    className="btn-danger text-sm">Revoke</button>
                )}
                {selected.current_status === "ACTIVE" && (
                  <button onClick={() => setModal({ newStatus: "SUSPENDED" })}
                    className="btn-secondary text-sm text-amber-600 border-amber-200">
                    Suspend
                  </button>
                )}
                {selected.current_status === "SUSPENDED" && (
                  <button onClick={() => setModal({ newStatus: "ACTIVE" })}
                    className="btn-secondary text-sm text-green-600 border-green-200">
                    Reinstate
                  </button>
                )}
              </div>
            )}

            {/* History */}
            <h3 className="text-xs font-semibold text-slate-400 uppercase
                            tracking-wide mb-2">History</h3>
            {selected.history.length === 0 ? (
              <p className="text-slate-400 text-xs">No status changes recorded.</p>
            ) : (
              <ol className="relative border-l border-slate-200 space-y-3 ml-2">
                {selected.history.map(h => (
                  <li key={h.id} className="ml-4">
                    <span className="absolute -left-1.5 w-3 h-3 bg-white
                                      border-2 border-sky-400 rounded-full" />
                    <p className="text-xs font-medium text-slate-700">
                      {h.old_status} → {h.new_status}
                    </p>
                    <p className="text-xs text-slate-400">
                      {h.changed_by_email} · {new Date(h.changed_at).toLocaleString()}
                    </p>
                    {h.reason && (
                      <p className="text-xs italic text-slate-500 mt-0.5">
                        "{h.reason}"
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.newStatus === "ACTIVE"    ? "Reinstate Certificate" :
               modal?.newStatus === "REVOKED"   ? "Revoke Certificate"    :
                                                  "Suspend Certificate"}
        message={
          modal?.newStatus === "REVOKED"
            ? "Permanent and irreversible. The certificate will be marked revoked."
            : modal?.newStatus === "SUSPENDED"
            ? "Certificate will appear as SUSPENDED on verification."
            : "Certificate will be reinstated to ACTIVE."
        }
        confirmLabel={modal?.newStatus === "ACTIVE" ? "Reinstate" : modal?.newStatus}
        confirmClass={modal?.newStatus === "REVOKED" ? "btn-danger" : "btn-primary"}
        loading={changeMut.isPending}
        onConfirm={() => changeMut.mutate({
          certId: selected.certificate_id,
          newStatus: modal.newStatus, reason,
        })}
      >
        <div className="mt-3">
          <label className="label text-xs">Reason</label>
          <textarea className="input text-sm resize-none" rows={2}
            value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Reason for this change…" />
        </div>
      </ConfirmModal>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}