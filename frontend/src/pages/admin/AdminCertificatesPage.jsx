import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import {
  adminGetCertificateStatus,
  adminChangeCertificateStatus,
  deleteAdminBatch,
} from "../../api/admin";
import Badge from "../../components/ui/Badge";
import ConfirmModal from "../../components/ui/ConfirmModal";
import CertificateDetailModal from "../../components/ui/CertificateDetailModal";
import { Search, Loader2, X, Filter } from "lucide-react";

const STATUSES = ["", "ACTIVE", "REVOKED", "SUSPENDED"];
const LIMIT    = 50;

export default function AdminCertificatesPage() {
  const qc = useQueryClient();

  // Browse state
  const [uniFilter,   setUniFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQ,      setSearchQ]     = useState("");
  const [offset,       setOffset]      = useState(0);

  // Overlay state
  const [overlayIndex, setOverlayIndex] = useState(null); // index in results
  const [modal,        setModal]        = useState(null);
  const [reason,       setReason]       = useState("");

  // University summary for filter dropdown
  const { data: uniSummary = [] } = useQuery({
    queryKey: ["admin-certs-uni-summary"],
    queryFn:  () => api.get("/admin/certificates/universities-summary")
                       .then(r => r.data),
  });

  // Main cert list
  const browseParams = {
    limit:  LIMIT,
    offset,
    ...(uniFilter    && { university_id: parseInt(uniFilter) }),
    ...(statusFilter && { status: statusFilter }),
  };

  const { data: certs, isLoading } = useQuery({
    queryKey: ["admin-certs-browse", browseParams],
    queryFn:  () => api.get("/admin/certificates/by-university",
                            { params: browseParams }).then(r => r.data),
    staleTime: 0,
    keepPreviousData: true,
  });

  // Filter by local search (name / serial)
  const results = (certs?.results || []).filter(c =>
    !searchQ ||
    c.fullname.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.serial_number.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.program.toLowerCase().includes(searchQ.toLowerCase())
  );

  // Selected cert for the overlay
  const selectedCert = overlayIndex !== null ? results[overlayIndex] : null;

  // Detail for selected cert
  const { data: certDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-cert-status", selectedCert?.certificate_id],
    queryFn:  () => adminGetCertificateStatus(selectedCert.certificate_id),
    enabled:  !!selectedCert,
  });

  const changeMut = useMutation({
    mutationFn: ({ newStatus, reason }) =>
      adminChangeCertificateStatus(selectedCert.certificate_id, {
        new_status: newStatus, reason,
      }),
    onSuccess: () => {
      setModal(null); setReason("");
      qc.invalidateQueries(["admin-cert-status"]);
      qc.invalidateQueries(["admin-certs-browse"]);
    },
  });

  const deleteBatchMut = useMutation({
    mutationFn: (batchId) => deleteAdminBatch(batchId),
    onSuccess: () => {
      setOverlayIndex(null);
      qc.invalidateQueries(["admin-certs-browse"]);
      qc.invalidateQueries(["admin-certs-uni-summary"]);
    },
  });

  const openOverlay = useCallback((idx) => setOverlayIndex(idx), []);
  const closeOverlay = useCallback(() => setOverlayIndex(null), []);

  const handlePrev = useCallback(() => {
    setOverlayIndex(i => (i > 0 ? i - 1 : i));
  }, []);

  const handleNext = useCallback(() => {
    setOverlayIndex(i => (i < results.length - 1 ? i + 1 : i));
  }, [results.length]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Certificates</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          All certificates across all institutions.
          Click any row to view details.
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-end">

          {/* Search */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-slate-500
                                uppercase tracking-wide mb-1.5">
              Search
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2
                                  -translate-y-1/2 text-slate-400" />
              <input
                className="w-full pl-8 pr-3 py-2 border border-slate-200
                            rounded-lg text-sm focus:outline-none
                            focus:ring-2 focus:ring-sky-500"
                placeholder="Name, serial number, or program…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
              />
            </div>
          </div>

          {/* University filter */}
          <div className="min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500
                                uppercase tracking-wide mb-1.5">
              Institution
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg
                          text-sm bg-white focus:outline-none focus:ring-2
                          focus:ring-sky-500"
              value={uniFilter}
              onChange={e => { setUniFilter(e.target.value); setOffset(0); }}
            >
              <option value="">All institutions</option>
              {uniSummary.map(u => (
                <option key={u.id} value={u.id}>
                  {u.university_name} ({u.cert_count})
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="min-w-[140px]">
            <label className="block text-xs font-semibold text-slate-500
                                uppercase tracking-wide mb-1.5">
              Status
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg
                          text-sm bg-white focus:outline-none focus:ring-2
                          focus:ring-sky-500"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setOffset(0); }}
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s || "All statuses"}</option>
              ))}
            </select>
          </div>

          {/* Clear */}
          {(uniFilter || statusFilter || searchQ) && (
            <button
              onClick={() => {
                setUniFilter(""); setStatusFilter("");
                setSearchQ(""); setOffset(0);
              }}
              className="flex items-center gap-1.5 text-sm text-slate-500
                          hover:text-slate-700 border border-slate-200
                          px-3 py-2 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}

          <p className="text-xs text-slate-400 ml-auto self-end pb-2">
            {certs ? `${certs.total} total` : ""}
            {searchQ && results.length !== certs?.total
              ? ` · ${results.length} shown` : ""}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            No certificates found matching your filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs font-semibold text-slate-500">
                    {["Serial Number", "Name", "Program", "Year",
                      "Institution", "Status"].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {results.map((cert, idx) => (
                    <tr
                      key={cert.certificate_id}
                      onClick={() => openOverlay(idx)}
                      className="hover:bg-sky-50 cursor-pointer
                                   transition-colors group"
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
                      <td className="px-4 py-3 text-slate-500 font-mono
                                       text-xs">
                        {cert.graduation_year}
                      </td>
                      <td className="px-4 py-3 text-slate-500
                                       max-w-[160px] truncate text-xs">
                        {cert.issuer}
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
            {certs && certs.total > LIMIT && (
              <div className="flex items-center justify-between px-4 py-3
                               border-t border-slate-100">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  className="flex items-center gap-1 text-sm text-slate-500
                              hover:text-slate-800 disabled:opacity-30
                              disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <p className="text-xs text-slate-400">
                  {offset + 1}–{Math.min(offset + LIMIT, certs.total)}
                  {" "}of {certs.total}
                </p>
                <button
                  disabled={offset + LIMIT >= certs.total}
                  onClick={() => setOffset(offset + LIMIT)}
                  className="flex items-center gap-1 text-sm text-slate-500
                              hover:text-slate-800 disabled:opacity-30
                              disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
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
          onAction={(newStatus) => setModal({ newStatus })}
          onDeleteBatch={(batchId) => deleteBatchMut.mutate(batchId)}
          actionLoading={changeMut.isPending}
        />
      )}

      {/* Confirm action modal */}
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
        onConfirm={() =>
          changeMut.mutate({ newStatus: modal.newStatus, reason })
        }
      >
        <div className="mt-3">
          <label className="label text-xs">Reason</label>
          <textarea
            className="input text-sm resize-none" rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for this change…"
          />
        </div>
      </ConfirmModal>
    </div>
  );
}