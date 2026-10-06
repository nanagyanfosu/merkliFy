import { useEffect } from "react";
import {
  X, ChevronLeft, ChevronRight, ShieldCheck,
  XCircle, Clock, AlertCircle, Trash2,
} from "lucide-react";
import Badge from "./Badge";

const STATUS_ICON = {
  ACTIVE:    { icon: ShieldCheck, cls: "text-teal-500" },
  REVOKED:   { icon: XCircle,    cls: "text-red-500"   },
  SUSPENDED: { icon: Clock,      cls: "text-amber-500" },
};

export default function CertificateDetailModal({
  cert,
  detail,
  loadingDetail,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  currentIndex,
  total,
  onAction,          // function(newStatus) — triggers confirm flow
  onDeleteBatch,     // function(batchId) — delete whole batch from detail
  actionLoading,
}) {
  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowLeft"  && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasPrev, hasNext, onClose, onPrev, onNext]);

  const StatusInfo = STATUS_ICON[cert?.current_status] || STATUS_ICON.ACTIVE;
  const StatusIcon = StatusInfo.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full
                       max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4
                         border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <StatusIcon className={`w-5 h-5 flex-shrink-0 ${StatusInfo.cls}`} />
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">
                {cert?.fullname || "Loading…"}
              </p>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                {cert?.serial_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {cert?.current_status && (
              <Badge status={cert.current_status} />
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600
                          transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loadingDetail ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-teal-500
                               border-t-transparent rounded-full animate-spin" />
            </div>
          ) : detail ? (
            <div className="space-y-5">
              {/* Certificate fields */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Program",         value: detail.program },
                  { label: "Graduation Year", value: detail.graduation_year, mono: true },
                  { label: "Serial Number",   value: detail.serial_number,   mono: true },
                  { label: "Issuing Body",    value: detail.issuer },
                  { label: "Batch",
                    value: `#${detail.batch_id} — ${detail.batch_name}`,
                    full: true },
                ].map(({ label, value, mono, full }) => (
                  <div key={label} className={full ? "col-span-2" : ""}>
                    <p className="text-xs font-semibold text-slate-400
                                    uppercase tracking-wide mb-0.5">
                      {label}
                    </p>
                    <p className={`text-sm font-medium text-slate-800 ${
                      mono ? "font-mono" : ""
                    }`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Lifecycle actions */}
              {onAction && detail.current_status !== "REVOKED" && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400
                                  uppercase tracking-wide mb-3">
                    Actions
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {detail.current_status !== "REVOKED" && (
                      <button
                        onClick={() => onAction("REVOKED")}
                        className="text-xs font-semibold text-white
                                    bg-red-500 hover:bg-red-600 px-3
                                    py-1.5 rounded-lg transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                    {detail.current_status === "ACTIVE" && (
                      <button
                        onClick={() => onAction("SUSPENDED")}
                        className="text-xs font-semibold text-amber-700
                                    border border-amber-200 hover:bg-amber-50
                                    px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Suspend
                      </button>
                    )}
                    {detail.current_status === "SUSPENDED" && (
                      <>
                        <button
                          onClick={() => onAction("ACTIVE")}
                          className="text-xs font-semibold text-teal-700
                                      border border-teal-200 hover:bg-teal-50
                                      px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Reinstate
                        </button>
                        <button
                          onClick={() => onAction("REVOKED")}
                          className="text-xs font-semibold text-white
                                      bg-red-500 hover:bg-red-600 px-3
                                      py-1.5 rounded-lg transition-colors"
                        >
                          Escalate to Revoked
                        </button>
                      </>
                    )}
                  </div>

                </div>
              )}

              {onDeleteBatch && detail && (
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => onDeleteBatch(detail.batch_id)}
                    className="text-xs text-red-500 hover:text-red-700
                                flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete entire batch
                  </button>
                </div>
              )}

              {/* Audit history */}
              {detail.history && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400
                                  uppercase tracking-wide mb-3">
                    Status History
                  </p>
                  {detail.history.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No status changes recorded.
                    </p>
                  ) : (
                    <ol className="relative border-l border-slate-200
                                    space-y-4 ml-2">
                      {detail.history.map(h => (
                        <li key={h.id} className="ml-4">
                          <span className="absolute -left-1.5 w-3 h-3 bg-white
                                           border-2 border-teal-400
                                           rounded-full" />
                          <p className="text-sm font-medium text-slate-800">
                            {h.old_status} → {h.new_status}
                          </p>
                          <p className="text-xs text-slate-400">
                            {h.changed_by_email} ·{" "}
                            {new Date(h.changed_at).toLocaleString()}
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
          ) : null}
        </div>

        {/* Footer — navigation */}
        <div className="flex items-center justify-between px-6 py-4
                         border-t border-slate-100 flex-shrink-0
                         bg-slate-50/60">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="flex items-center gap-1.5 text-sm text-slate-500
                        hover:text-slate-800 disabled:opacity-30
                        disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <p className="text-xs text-slate-400">
            {currentIndex + 1} of {total}
            <span className="ml-2 text-slate-300">
              (← → to navigate, Esc to close)
            </span>
          </p>

          <button
            onClick={onNext}
            disabled={!hasNext}
            className="flex items-center gap-1.5 text-sm text-slate-500
                        hover:text-slate-800 disabled:opacity-30
                        disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}