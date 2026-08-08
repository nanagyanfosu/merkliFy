import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getVerificationLogs } from "../../api/admin";
import { Loader2, Filter } from "lucide-react";

const RESULTS = [
  "ALL","AUTHENTIC","FAILED","TAMPERED",
  "BATCH_TAMPER_DETECTED","UNTRUSTED_ISSUER","REVOKED","SUSPENDED",
];

const RESULT_COLOR = {
  AUTHENTIC: "text-green-600",
  FAILED: "text-slate-500",
  TAMPERED: "text-red-600",
  BATCH_TAMPER_DETECTED: "text-red-600",
  UNTRUSTED_ISSUER: "text-orange-600",
  REVOKED: "text-red-600",
  SUSPENDED: "text-amber-600",
};

export default function VerificationLogsPage() {
  const [resultFilter, setResultFilter] = useState("ALL");
  const [serialFilter, setSerialFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const params = {
    limit,
    offset,
    ...(resultFilter !== "ALL" && { result_filter: resultFilter }),
    ...(serialFilter && { serial_number: serialFilter }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-logs", params],
    queryFn: () => getVerificationLogs(params),
    keepPreviousData: true,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Verification Logs</h1>
      <p className="text-slate-500 text-sm mb-6">
        Every public verification attempt is recorded here. Use the filters to find specific records.
      </p>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={resultFilter}
          onChange={(e) => { setResultFilter(e.target.value); setOffset(0); }}
          className="input w-auto text-sm"
        >
          {RESULTS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          className="input w-48 text-sm"
          placeholder="Filter by serial number…"
          value={serialFilter}
          onChange={(e) => { setSerialFilter(e.target.value); setOffset(0); }}
        />
        {(resultFilter !== "ALL" || serialFilter) && (
          <button
            className="text-sm text-brand-600 hover:underline"
            onClick={() => { setResultFilter("ALL"); setSerialFilter(""); setOffset(0); }}
          >
            Clear filters
          </button>
        )}
        {data && (
          <span className="ml-auto text-slate-400 text-sm">
            {data.total} total results
          </span>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Serial</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.logs?.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{log.serial_number}</td>
                    <td className="px-4 py-3">{log.fullname}</td>
                    <td className={`px-4 py-3 font-medium text-xs ${RESULT_COLOR[log.result] || ""}`}>
                      {log.result}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{log.ip_address || "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-slate-500 text-sm">
                {offset + 1}–{Math.min(offset + limit, data?.total ?? 0)} of {data?.total ?? 0}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= (data?.total ?? 0)}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}