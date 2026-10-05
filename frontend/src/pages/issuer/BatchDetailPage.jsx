import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import { changeCertificateStatus, deleteOwnBatch } from "../../api/issuer";
import Badge from "../../components/ui/Badge";
import CertificateDetailModal from "../../components/ui/CertificateDetailModal";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
  Loader2, ArrowLeft, Hash, User,
  Calendar, Trash2, AlertTriangle,
} from "lucide-react";

export default function BatchDetailPage() {
  const { batchId }  = useParams();
  const navigate     = useNavigate();
  const qc           = useQueryClient();

  const [overlayIndex,    setOverlayIndex]    = useState(null);
  const [actionModal,     setActionModal]     = useState(null);  // revoke/suspend
  const [deleteModal,     setDeleteModal]     = useState(false); // delete batch
  const [reason,          setReason]          = useState("");

  // Load batch + all certs in one request
  const { data, isLoading, isError } = useQuery({
    queryKey: ["issuer-batch-detail", batchId],
    queryFn:  () =>
      api.get(`/issuer/batches/${batchId}/certificates`).then(r => r.data),
    staleTime: 0,
  });

  const certificates = data?.certificates || [];
  const selectedCert = overlayIndex !== null ? certificates[overlayIndex] : null;

  // is_owner = true means the logged-in issuer uploaded this batch
  const isOwner = data?.is_owner === true;

  // Revoke / suspend a certificate
  const changeMut = useMutation({
    mutationFn: ({ newStatus, reason }) =>
      changeCertificateStatus(selectedCert.certificate_id, {
        new_status: newStatus,
        reason,
      }),
    onSuccess: () => {
      setActionModal(null);
      setReason("");
      qc.invalidateQueries(["issuer-batch-detail", batchId]);
    },
  });

  // Delete the entire batch
  const deleteMut = useMutation({
    mutationFn: () => deleteOwnBatch(parseInt(batchId, 10)),
    onSuccess: (result) => {
      // Invalidate related queries so lists update
      qc.invalidateQueries(["issuer-batches-mine"]);
      qc.invalidateQueries(["issuer-batches-all"]);
      qc.invalidateQueries(["issuer-batches-summary"]);
      qc.invalidateQueries(["issuer-my-batches"]);
      // Redirect back to batches list
      navigate("/issuer/batches", { replace: true });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 text-sm">
          Batch not found or you do not have access to it.
        </p>
        <Link to="/issuer/batches"
          className="text-teal-600 hover:underline text-sm mt-2 block">
          ← Back to batches
        </Link>
      </div>
    );
  }

  return (
    <div>

      {/* Back navigation */}
      <Link to="/issuer/batches"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500
                    hover:text-slate-800 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        All Batches
      </Link>

      {/* Batch header card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {data.batch_name}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {data.total} certificate{data.total !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Right side: ownership badge + delete button */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {!isOwner && (
              <span className="bg-amber-50 border border-amber-200
                                text-amber-700 text-xs font-medium
                                px-3 py-1.5 rounded-lg">
                View only — uploaded by another department
              </span>
            )}

            {isOwner && (
              <button
                onClick={() => setDeleteModal(true)}
                className="flex items-center gap-1.5 text-sm text-red-500
                            hover:text-red-700 border border-red-200
                            hover:bg-red-50 px-3 py-2 rounded-lg
                            transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Batch
              </button>
            )}
          </div>
        </div>

        {/* Batch metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4
                         border-t border-slate-100">
          <MetaRow icon={Calendar} label="Academic Year"
            value={data.academic_year} />
          <MetaRow icon={Hash}     label="Batch ID"
            value={`#${batchId}`} />
          <MetaRow icon={User}     label="Uploaded By"
            value={data.uploaded_by} />
        </div>
      </div>

      {/* Certificate table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center
                         justify-between">
          <p className="text-xs font-medium text-slate-500">
            {certificates.length} certificates
          </p>
          <p className="text-xs text-slate-400">
            Click any row for full details
            {isOwner && " and actions"}
          </p>
        </div>

        {certificates.length === 0 ? (
          <p className="text-center py-10 text-slate-400 text-sm">
            No certificates in this batch.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs font-semibold text-slate-500">
                  {["Serial Number", "Name", "Program", "Year", "Status"]
                    .map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {certificates.map((cert, idx) => (
                  <tr
                    key={cert.certificate_id}
                    onClick={() => setOverlayIndex(idx)}
                    className="hover:bg-teal-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {cert.serial_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800
                                     max-w-[150px] truncate">
                      {cert.fullname}
                    </td>
                    <td className="px-4 py-3 text-slate-500
                                     max-w-[160px] truncate">
                      {cert.program}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      {cert.graduation_year}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={cert.current_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CERTIFICATE DETAIL OVERLAY ─────────────────────────────── */}
      {overlayIndex !== null && selectedCert && (
        <CertificateDetailModal
          cert={selectedCert}
          detail={selectedCert}       // history is embedded in cert object
          loadingDetail={false}
          onClose={() => setOverlayIndex(null)}
          onPrev={() => setOverlayIndex(i => Math.max(0, i - 1))}
          onNext={() =>
            setOverlayIndex(i => Math.min(certificates.length - 1, i + 1))
          }
          hasPrev={overlayIndex > 0}
          hasNext={overlayIndex < certificates.length - 1}
          currentIndex={overlayIndex}
          total={certificates.length}
          onAction={
            // Only pass onAction if this issuer owns the batch
            // AND the cert is not already revoked
            isOwner && selectedCert.current_status !== "REVOKED"
              ? (newStatus) => setActionModal({ newStatus })
              : null
          }
        />
      )}

      {/* ── REVOKE / SUSPEND CONFIRMATION ─────────────────────────── */}
      <ConfirmModal
        open={!!actionModal}
        onClose={() => { setActionModal(null); setReason(""); }}
        title={
          actionModal?.newStatus === "ACTIVE"    ? "Reinstate Certificate" :
          actionModal?.newStatus === "REVOKED"   ? "Revoke Certificate"    :
                                                   "Suspend Certificate"
        }
        message={
          actionModal?.newStatus === "REVOKED"
            ? "Revocation is permanent and cannot be undone. The certificate will return REVOKED on all future verifications."
            : actionModal?.newStatus === "SUSPENDED"
            ? "The certificate will appear as SUSPENDED on public verification. You can reinstate it later."
            : "The certificate will return to ACTIVE status and pass verification again."
        }
        confirmLabel={
          actionModal?.newStatus === "ACTIVE"  ? "Reinstate" :
          actionModal?.newStatus === "REVOKED" ? "Revoke"    : "Suspend"
        }
        confirmClass={
          actionModal?.newStatus === "REVOKED"
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-sky-600 hover:bg-sky-700 text-white"
        }
        loading={changeMut.isPending}
        onConfirm={() =>
          changeMut.mutate({
            newStatus: actionModal.newStatus,
            reason,
          })
        }
      >
        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-500
                              uppercase tracking-wide mb-1.5">
            Reason
          </label>
          <textarea
            className="w-full px-3 py-2 border border-slate-200 rounded-lg
                        text-sm resize-none focus:outline-none focus:ring-2
                        focus:ring-sky-500"
            rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for this change…"
          />
        </div>
      </ConfirmModal>

      {/* ── DELETE BATCH CONFIRMATION ──────────────────────────────── */}
      <ConfirmModal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete This Batch"
        message={
          `You are about to permanently delete "${data.batch_name}" ` +
          `and all ${data.total} certificates it contains. ` +
          `This cannot be undone. Anyone who tries to verify these ` +
          `certificates after deletion will receive "Not Verified". ` +
          `Only do this if the batch was uploaded in error.`
        }
        confirmLabel="Delete Permanently"
        confirmClass="bg-red-600 hover:bg-red-700 text-white"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      >
        {/* Extra warning inside the modal body */}
        <div className="mt-3 flex items-start gap-2.5 bg-red-50 border
                         border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-relaxed">
            Deleting a batch removes its Merkle proofs and digital
            signature records permanently. This action is logged.
          </p>
        </div>
      </ConfirmModal>

    </div>
  );
}

function MetaRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-medium text-slate-800 text-sm">{value}</p>
      </div>
    </div>
  );
}