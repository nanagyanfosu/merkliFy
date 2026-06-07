import { useParams, Link, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCertificateStatus, changeCertificateStatus } from "../../api/issuer";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useState } from "react";

export default function CertificateStatusPage() {
  const { certId }  = useParams();
  const location    = useLocation();
  const qc          = useQueryClient();

  const [modal,  setModal]  = useState(null);
  const [reason, setReason] = useState("");

  // Restore previous search URL on back navigation
  const backUrl = location.state?.searchParams
    ? `/issuer/certificates?${location.state.searchParams}`
    : "/issuer/certificates";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["issuer-cert-status", certId],
    queryFn:  () => getCertificateStatus(certId),
  });

  const mutation = useMutation({
    mutationFn: ({ newStatus, reason }) =>
      changeCertificateStatus(certId, { new_status: newStatus, reason }),
    onSuccess: () => {
      setModal(null);
      setReason("");
      qc.invalidateQueries(["issuer-cert-status", certId]);
    },
  });

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
    </div>
  );

  if (isError) return (
    <div className="card p-6 text-red-600 text-sm">Failed to load certificates.</div>
  );

  const isRevoked = data.current_status === "REVOKED";

  return (
    <div className="max-w-2xl">
      {/* Back to search results */}
      <Link to={backUrl}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ChevronLeft className="w-4 h-4" />
        Back to search results
      </Link>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{data.fullname}</h1>
          <p className="text-slate-400 text-sm font-mono">{data.serial_number}</p>
        </div>
        <Badge status={data.current_status} className="mt-1" />
      </div>

      {/* Certificate details */}
      <div className="card p-5 mb-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Program"         value={data.program} />
          <Field label="Graduation Year" value={data.graduation_year} />
          <Field label="Issuer"          value={data.issuer} />
          <Field label="Batch"           value={`${data.batch_name} (${data.batch_id})`} />
        </div>
      </div>

      {/* Lifecycle actions */}
      {!isRevoked && (
        <div className="card p-5 mb-5">
          <h2 className="font-semibold text-slate-700 mb-1">Status Management</h2>
          <p className="text-xs text-slate-400 mb-4">
            All changes are permanently recorded. Revocation cannot be undone.
          </p>
          <div className="flex gap-2 flex-wrap">
            {data.current_status === "ACTIVE" && (<>
              <button onClick={() => setModal({ newStatus: "REVOKED" })}
                className="btn-danger text-sm">
                Revoke Certificate
              </button>
              <button onClick={() => setModal({ newStatus: "SUSPENDED" })}
                className="btn-secondary text-sm text-amber-600 border-amber-300">
                Suspend Certificate
              </button>
            </>)}

            {data.current_status === "SUSPENDED" && (<>
              <button onClick={() => setModal({ newStatus: "ACTIVE" })}
                className="btn-secondary text-sm text-green-600 border-green-300">
                Reinstate Certificate
              </button>
              <button onClick={() => setModal({ newStatus: "REVOKED" })}
                className="btn-danger text-sm">
                Escalate to Revoked
              </button>
            </>)}
          </div>
        </div>
      )}

      {isRevoked && (
        <div className="card p-4 mb-5 bg-red-50 border-red-200">
          <p className="text-sm text-red-700">
            This certificate has been permanently revoked and cannot be changed.
          </p>
        </div>
      )}

      {/* Audit history */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-700 mb-4">Status History</h2>
        {data.history.length === 0 ? (
          <p className="text-slate-400 text-sm">No status changes recorded.</p>
        ) : (
          <ol className="relative border-l border-slate-200 space-y-5 ml-2">
            {data.history.map(h => (
              <li key={h.id} className="ml-5">
                <span className="absolute -left-1.5 w-3 h-3 bg-white border-2
                                  border-teal-400 rounded-full" />
                <div className="bg-slate-50 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-slate-800">
                    {h.old_status} → {h.new_status}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    by {h.changed_by_email} ·{" "}
                    {new Date(h.changed_at).toLocaleString()}
                  </p>
                  {h.reason && (
                    <p className="text-xs text-slate-600 italic mt-1.5
                                   bg-white border border-slate-100 rounded px-3 py-1.5">
                      "{h.reason}"
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <ConfirmModal
        open={!!modal}
        onClose={() => { setModal(null); setReason(""); }}
        title={
          modal?.newStatus === "ACTIVE"   ? "Reinstate Certificate"  :
          modal?.newStatus === "REVOKED"  ? "Revoke Certificate"     :
                                            "Suspend Certificate"
        }
        message={
          modal?.newStatus === "REVOKED"
            ? "This will permanently revoke the certificate. This cannot be undone."
            : modal?.newStatus === "SUSPENDED"
            ? "The certificate will appear as SUSPENDED on public verification."
            : "The certificate will be reinstated to ACTIVE status."
        }
        confirmLabel={modal?.newStatus === "ACTIVE" ? "Reinstate" : modal?.newStatus}
        confirmClass={modal?.newStatus === "REVOKED" ? "btn-danger" : "btn-primary"}
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate({ newStatus: modal.newStatus, reason })}
      >
        <div className="mt-3">
          <label className="label text-xs">
            Reason
            {modal?.newStatus === "REVOKED"
              ? " (strongly recommended)"
              : " (optional)"}
          </label>
          <textarea className="input text-sm resize-none" rows={2}
            placeholder="Explain why this status change is being made…"
            value={reason}
            onChange={e => setReason(e.target.value)} />
        </div>
      </ConfirmModal>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="font-medium text-slate-700">{value}</p>
    </div>
  );
}