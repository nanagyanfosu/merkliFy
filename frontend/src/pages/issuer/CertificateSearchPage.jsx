import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import { getCertificateStatus, changeCertificateStatus } from "../../api/issuer";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import CertificateDetailModal from "../../components/ui/CertificateDetailModal";
import { Hash, Loader2, Search, X, Filter } from "lucide-react";

const LIMIT = 100;

export default function CertificateSearchPage() {
  const qc = useQueryClient();

  const [selectedBatch, setSelectedBatch] = useState(null);
  const [certSearch,    setCertSearch]    = useState("");
  const [overlayIndex,  setOverlayIndex]  = useState(null);
  const [modal,         setModal]         = useState(null);
  const [reason,        setReason]        = useState("");
  const [offset,        setOffset]        = useState(0);

  // Batch list
  const { data: batchSummary = [], isLoading: batchesLoading } = useQuery({
    queryKey: ["issuer-batches-summary"],
    queryFn:  () => api.get("/issuer/certificates/batches-summary")
                       .then(r => r.data),
  });

  // Auto-select the most recent batch on first load
  useEffect(() => {
    if (batchSummary.length > 0 && !selectedBatch) {
      setSelectedBatch(batchSummary[0]);
    }
  }, [batchSummary, selectedBatch]);

  // Certs for selected batch
  const { data: batchCerts, isLoading: certsLoading } = useQuery({
    queryKey: ["issuer-batch-certs", selectedBatch?.batch_id, offset],
    queryFn:  () => api.get(
      `/issuer/certificates/by-batch/${selectedBatch.batch_id}`,
      { params: { limit: LIMIT, offset } }
    ).then(r => r.data),
    enabled:  !!selectedBatch,
    staleTime: 0,
  });

  // Filter certs by local search
  const results = (batchCerts?.results || []).filter(c =>
    !certSearch ||
    c.fullname.toLowerCase().includes(certSearch.toLowerCase()) ||
    c.serial_number.toLowerCase().includes(certSearch.toLowerCase()) ||
    c.program.toLowerCase().includes(certSearch.toLowerCase())
  );

  // Selected cert for overlay
  const selectedCert = overlayIndex !== null ? results[overlayIndex] : null;
  const canAction = !!selectedCert?.is_owner;

  const { data: certDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["issuer-cert-status", selectedCert?.certificate_id],
    queryFn:  () => getCertificateStatus(selectedCert.certificate_id),
    enabled:  !!selectedCert,
  });

  const changeMut = useMutation({
    mutationFn: ({ newStatus, reason }) =>
      changeCertificateStatus(selectedCert.certificate_id, {
        new_status: newStatus, reason,
      }),
    onSuccess: () => {
      setModal(null); setReason("");
      qc.invalidateQueries(["issuer-cert-status"]);
      qc.invalidateQueries(["issuer-batch-certs"]);
    },
  });

  const openOverlay  = useCallback((idx) => setOverlayIndex(idx), []);
  const closeOverlay = useCallback(() => setOverlayIndex(null), []);
  const handlePrev   = useCallback(() => setOverlayIndex(i => i > 0 ? i - 1 : i), []);
  const handleNext   = useCallback(() =>
    setOverlayIndex(i => i < results.length - 1 ? i + 1 : i),
    [results.length]
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Certificates</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Select a batch to browse certificates. Click any row for full details.
        </p>
      </div>

      <div className="flex gap-4">

        {/* ── LEFT: Batch selector ────────────────────────────────── */}
        <div className="w-56 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase
                          tracking-wide mb-2 px-1">
            Batches
          </p>
          <div className="bg-white border border-slate-200 rounded-xl
                           overflow-hidden">
            {batchesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
              </div>
            ) : batchSummary.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">
                No batches yet.
              </p>
            ) : (
              batchSummary.map(b => (
                <button
                  key={b.batch_id}
                  onClick={() => {
                    setSelectedBatch(b);
                    setOverlayIndex(null);
                    setCertSearch("");
                    setOffset(0);
                  }}
                  className={`w-full text-left px-3 py-3 border-b
                               border-slate-50 last:border-0 transition-colors
                               ${selectedBatch?.batch_id === b.batch_id
                                 ? "bg-teal-50"
                                 : "hover:bg-slate-50"
                               }`}
                >
                  <div className="flex items-center gap-2">
                    <Hash className={`w-3 h-3 flex-shrink-0 ${
                      selectedBatch?.batch_id === b.batch_id
                        ? "text-teal-500"
                        : "text-slate-400"
                    }`} />
                    <p className={`text-xs font-medium truncate ${
                      selectedBatch?.batch_id === b.batch_id
                        ? "text-teal-700"
                        : "text-slate-700"
                    }`}>
                      {b.batch_name}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 pl-5">
                    {b.academic_year} · {b.cert_count} certs
                  </p>
                  {b.uploaded_by_dept !== "—" && (
                    <p className="text-xs text-slate-300 mt-0.5 pl-5 truncate">
                      {b.uploaded_by_dept}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Certificate table ────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {selectedBatch && (
            <div className="mb-3 flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2
                                    -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full pl-8 pr-3 py-2 border border-slate-200
                              rounded-lg text-sm focus:outline-none
                              focus:ring-2 focus:ring-teal-500"
                  placeholder="Search by name, serial, or program…"
                  value={certSearch}
                  onChange={e => setCertSearch(e.target.value)}
                />
                {certSearch && (
                  <button onClick={() => setCertSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2
                                text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 whitespace-nowrap">
                {results.length} record{results.length !== 1 ? "s" : ""}
                {certSearch ? ` matching "${certSearch}"` : ""}
              </p>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl
                           overflow-hidden">
            {!selectedBatch ? (
              <div className="flex justify-center items-center py-16
                               text-slate-400 text-sm">
                No batch selected
              </div>
            ) : certsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                {certSearch
                  ? `No certificates match "${certSearch}"`
                  : "No certificates in this batch"}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-left text-xs font-semibold
                                       text-slate-500">
                        {["Serial Number", "Name", "Program",
                          "Year", "Status"].map(h => (
                          <th key={h} className="px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {results.map((cert, idx) => (
                        <tr
                          key={cert.certificate_id}
                          onClick={() => openOverlay(idx)}
                          className="hover:bg-teal-50 cursor-pointer
                                       transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs
                                           text-slate-600">
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
                          <td className="px-4 py-3 text-slate-500
                                           font-mono text-xs">
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

                {/* Pagination */}
                {batchCerts && batchCerts.total > LIMIT && (
                  <div className="flex items-center justify-between px-4
                                   py-3 border-t border-slate-100">
                    <button
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                      className="text-sm text-slate-500 disabled:opacity-30"
                    >
                      ← Previous
                    </button>
                    <p className="text-xs text-slate-400">
                      {offset + 1}–{Math.min(offset + LIMIT, batchCerts.total)}
                      {" "}of {batchCerts.total}
                    </p>
                    <button
                      disabled={offset + LIMIT >= batchCerts.total}
                      onClick={() => setOffset(offset + LIMIT)}
                      className="text-sm text-slate-500 disabled:opacity-30"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Certificate detail overlay */}
      {overlayIndex !== null && selectedCert && (
  <CertificateDetailModal
    cert={selectedCert}
    detail={certDetail}
    loadingDetail={detailLoading}
    onClose={closeOverlay}
    onPrev={handlePrev}
    onNext={handleNext}
    hasPrev={overlayIndex > 0}
    hasNext={overlayIndex < results.length - 1}
    currentIndex={overlayIndex}
    total={results.length}
    // Use is_owner from the cert object — set by backend
    onAction={selectedCert.is_owner
      ? (newStatus) => setModal({ newStatus })
      : null}
  />
)}

      <ConfirmModal
        open={!!modal}
        onClose={() => setModal(null)}
        title={
          modal?.newStatus === "ACTIVE"    ? "Reinstate Certificate" :
          modal?.newStatus === "REVOKED"   ? "Revoke Certificate"    :
                                             "Suspend Certificate"
        }
        message={
          modal?.newStatus === "REVOKED"
            ? "This is permanent and cannot be undone."
            : modal?.newStatus === "SUSPENDED"
            ? "Certificate will appear as SUSPENDED on verification."
            : "Certificate will return to ACTIVE."
        }
        confirmLabel={modal?.newStatus === "ACTIVE" ? "Reinstate" : modal?.newStatus}
        confirmClass={modal?.newStatus === "REVOKED" ? "btn-danger" : "btn-primary"}
        loading={changeMut.isPending}
        onConfirm={() => changeMut.mutate({ newStatus: modal.newStatus, reason })}
      >
        <div className="mt-3">
          <label className="label text-xs">Reason</label>
          <textarea className="input text-sm resize-none" rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for this change…" />
        </div>
      </ConfirmModal>
    </div>
  );
}