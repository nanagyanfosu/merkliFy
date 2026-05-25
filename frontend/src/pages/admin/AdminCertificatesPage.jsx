import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  adminSearchCertificates,
  adminGetCertificateStatus,
  adminChangeCertificateStatus,
} from "../../api/admin";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { Search, Loader2, ChevronRight } from "lucide-react";

export default function AdminCertificatesPage() {
  const [search, setSearch] = useState({ serial_number: "", fullname: "", program: "" });
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);   // certificate status detail
  const [modal, setModal] = useState(null);          // { newStatus, reason }
  const [reason, setReason] = useState("");

  const searchMutation = useMutation({
    mutationFn: () => adminSearchCertificates(search),
    onSuccess: setResults,
  });

  const detailMutation = useMutation({
    mutationFn: (id) => adminGetCertificateStatus(id),
    onSuccess: setSelected,
  });

  const changeMutation = useMutation({
    mutationFn: ({ certId, newStatus, reason }) =>
      adminChangeCertificateStatus(certId, { new_status: newStatus, reason }),
    onSuccess: () => {
      setModal(null);
      detailMutation.mutate(selected.certificate_id);
      searchMutation.mutate();
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Certificates</h1>
      <p className="text-slate-500 text-sm mb-6">
        Search and manage certificates across all universities.
      </p>

      {/* Search */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <input className="input" placeholder="Serial number…"
            value={search.serial_number}
            onChange={(e) => setSearch((p) => ({ ...p, serial_number: e.target.value }))} />
          <input className="input" placeholder="Full name…"
            value={search.fullname}
            onChange={(e) => setSearch((p) => ({ ...p, fullname: e.target.value }))} />
          <input className="input" placeholder="Program…"
            value={search.program}
            onChange={(e) => setSearch((p) => ({ ...p, program: e.target.value }))} />
        </div>
        <button
          onClick={() => searchMutation.mutate()}
          disabled={searchMutation.isPending}
          className="btn-primary flex items-center gap-2"
        >
          {searchMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results list */}
        {results && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-sm text-slate-500">
              {results.total} result{results.total !== 1 ? "s" : ""}
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {results.results.map((cert) => (
                <button
                  key={cert.certificate_id}
                  onClick={() => detailMutation.mutate(cert.certificate_id)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors ${
                    selected?.certificate_id === cert.certificate_id ? "bg-brand-50" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">{cert.fullname}</p>
                    <p className="text-xs text-slate-400 font-mono">{cert.serial_number}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{cert.program} · {cert.graduation_year}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={cert.current_status} />
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Detail panel */}
        {selected && (
          <div className="card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-800">{selected.fullname}</h2>
                <p className="text-xs font-mono text-slate-400">{selected.serial_number}</p>
              </div>
              <Badge status={selected.current_status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-5">
              <Field label="Program" value={selected.program} />
              <Field label="Year" value={selected.graduation_year} />
              <Field label="Issuer" value={selected.issuer} />
              <Field label="Batch" value={`#${selected.batch_id} — ${selected.batch_name}`} />
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap mb-5">
              {selected.current_status !== "REVOKED" && (
                <button
                  onClick={() => setModal({ newStatus: "REVOKED" })}
                  className="btn-danger text-sm"
                >
                  Revoke
                </button>
              )}
              {selected.current_status === "ACTIVE" && (
                <button
                  onClick={() => setModal({ newStatus: "SUSPENDED" })}
                  className="btn-secondary text-sm text-amber-600 border-amber-200"
                >
                  Suspend
                </button>
              )}
              {selected.current_status === "SUSPENDED" && (
                <button
                  onClick={() => setModal({ newStatus: "ACTIVE" })}
                  className="btn-secondary text-sm text-green-600 border-green-200"
                >
                  Reinstate
                </button>
              )}
            </div>

            {/* History */}
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Status History
            </h3>
            {selected.history.length === 0 ? (
              <p className="text-slate-400 text-xs">No status changes recorded.</p>
            ) : (
              <div className="space-y-2">
                {selected.history.map((h) => (
                  <div key={h.id} className="text-xs bg-slate-50 rounded-lg px-3 py-2">
                    <span className="font-medium">{h.old_status} → {h.new_status}</span>
                    <span className="text-slate-400 ml-2">by {h.changed_by_email}</span>
                    {h.reason && <p className="text-slate-500 mt-0.5">"{h.reason}"</p>}
                    <p className="text-slate-400 mt-0.5">{new Date(h.changed_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        open={!!modal}
        onClose={() => setModal(null)}
        title={`${modal?.newStatus === "ACTIVE" ? "Reinstate" : modal?.newStatus} Certificate`}
        message={
          modal?.newStatus === "REVOKED"
            ? "This action is permanent and cannot be undone. The certificate will be marked as revoked."
            : modal?.newStatus === "SUSPENDED"
            ? "The certificate will be temporarily suspended."
            : "The certificate will be reinstated to ACTIVE status."
        }
        confirmLabel={modal?.newStatus === "ACTIVE" ? "Reinstate" : modal?.newStatus}
        confirmClass={modal?.newStatus === "REVOKED" ? "btn-danger" : "btn-primary"}
        loading={changeMutation.isPending}
        onConfirm={() =>
          changeMutation.mutate({
            certId: selected.certificate_id,
            newStatus: modal.newStatus,
            reason,
          })
        }
      >
        <div className="mt-3">
          <label className="label text-xs">Reason (recommended)</label>
          <input
            className="input text-sm"
            placeholder="Reason for this status change…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
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