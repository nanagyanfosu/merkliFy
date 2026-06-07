import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listBatches } from "../../api/issuer";
import { Link } from "react-router-dom";
import { Loader2, ChevronRight, Hash, Filter } from "lucide-react";

export default function BatchesPage() {
  const currentYear = new Date().getFullYear();
  const years = ["All", ...Array.from({ length: 8 }, (_, i) => currentYear - i)];

  const [yearFilter, setYearFilter] = useState("All");
  const [sortDir, setSortDir]       = useState("desc");

  const params = {
    sort_by:  "created_at",
    sort_dir: sortDir,
    ...(yearFilter !== "All" && { academic_year: yearFilter }),
  };

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["issuer-batches", params],
    queryFn:  () => listBatches(params),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Batches</h1>
      <p className="text-slate-500 text-sm mb-5">All issued certificate batches</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <Filter className="w-4 h-4 text-slate-400" />
        <select className="input w-auto text-sm" value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input w-auto text-sm" value={sortDir}
          onChange={e => setSortDir(e.target.value)}>
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
        <span className="text-slate-400 text-sm ml-auto">
          {batches.length} batch{batches.length !== 1 ? "es" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : batches.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          No batches found.
          <Link to="/issuer/upload" className="text-teal-600 hover:underline ml-1">
            Upload one.
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {batches.map(b => (
            <Link key={b.batch_id} to={`/issuer/batches/${b.batch_id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="bg-teal-100 p-2.5 rounded-lg flex-shrink-0">
                <Hash className="w-4 h-4 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800">{b.batch_name}</p>
                <p className="text-xs text-slate-400">Academic Year {b.academic_year}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-teal-600 text-sm">
                  {b.total_certificates} certs
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(b.created_at).toLocaleDateString()}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}