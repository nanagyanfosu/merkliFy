import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listBatches } from "../../api/issuer";
import { Link } from "react-router-dom";
import {
  Loader2, ChevronRight, Hash, Filter,
  ArrowUpDown, User, Eye,
} from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

export default function BatchesPage() {
  const [yearFilter,   setYearFilter]   = useState(null);
  const [sortBy,       setSortBy]       = useState("created_at");
  const [sortDir,      setSortDir]      = useState("desc");
  const [viewMode,     setViewMode]     = useState("mine"); // "mine" | "all"
  const [deptFilter,   setDeptFilter]   = useState("all"); // department filter

  const { data: myBatches = [], isLoading: myLoading } = useQuery({
    queryKey: ["issuer-batches-mine", yearFilter, sortBy, sortDir],
    queryFn:  () => listBatches({
      own_only: true,
      ...(yearFilter !== null && { academic_year: yearFilter }),
      sort_by:  sortBy,
      sort_dir: sortDir,
    }),
    staleTime: 0,
  });

  const { data: allBatches = [], isLoading: allLoading } = useQuery({
    queryKey: ["issuer-batches-all", yearFilter, sortBy, sortDir],
    queryFn:  () => listBatches({
      own_only: false,
      ...(yearFilter !== null && { academic_year: yearFilter }),
      sort_by:  sortBy,
      sort_dir: sortDir,
    }),
    enabled:  viewMode === "all",
    staleTime: 0,
  });

  const batches    = viewMode === "mine" ? myBatches : allBatches;
  const isLoading  = viewMode === "mine" ? myLoading : allLoading;

  // Extract unique departments from all batches for filter
  const departments = [...new Set(
    allBatches
      .map(b => b.uploaded_by_dept)
      .filter(Boolean)
  )].sort();

  // Apply dept filter when viewing all
  const visibleBatches = (viewMode === "all" && deptFilter !== "all")
    ? batches.filter(b => b.uploaded_by_dept === deptFilter)
    : batches;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Batches</h1>
      <p className="text-slate-500 text-sm mb-5">
        Certificate batches issued by your institution
      </p>

      {/* View toggle — mine vs all */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-5">
        <button
          onClick={() => setViewMode("mine")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm
                       font-medium transition-colors ${
            viewMode === "mine"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          My Batches
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            viewMode === "mine"
              ? "bg-teal-100 text-teal-700"
              : "bg-slate-200 text-slate-500"
          }`}>
            {myBatches.length}
          </span>
        </button>
        <button
          onClick={() => setViewMode("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm
                       font-medium transition-colors ${
            viewMode === "all"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          All Institution Batches
        </button>
      </div>

      {/* Filter bar */}
      <div className="card p-3 mb-5 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">
            Year
          </label>
          <select
            className="input w-auto text-sm"
            value={yearFilter ?? ""}
            onChange={e => setYearFilter(
              e.target.value === "" ? null : parseInt(e.target.value, 10)
            )}
          >
            <option value="">All years</option>
            {YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Department filter — only shown in "all" mode */}
        {viewMode === "all" && departments.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">
              Department
            </label>
            <select
              className="input w-auto text-sm"
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
            >
              <option value="all">All departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">
            Sort by
          </label>
          <select
            className="input w-auto text-sm"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="created_at">Upload date</option>
            <option value="academic_year">Academic year</option>
            <option value="batch_name">Name</option>
            <option value="total_certificates">Certificate count</option>
          </select>
          <button
            onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
            className="text-xs text-slate-500 hover:text-teal-600
                        flex items-center gap-1"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortDir === "desc" ? "Newest first" : "Oldest first"}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {visibleBatches.length} batch
            {visibleBatches.length !== 1 ? "es" : ""}
            {yearFilter ? ` for ${yearFilter}` : ""}
          </span>
          {(yearFilter !== null || deptFilter !== "all") && (
            <button
              onClick={() => { setYearFilter(null); setDeptFilter("all"); }}
              className="text-xs text-teal-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : visibleBatches.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-400">
            {viewMode === "mine"
              ? "You have not uploaded any batches yet."
              : "No batches found."}
          </p>
          {viewMode === "mine" && (
            <Link to="/issuer/upload"
              className="text-teal-600 text-sm hover:underline mt-2 block">
              Upload your first batch →
            </Link>
          )}
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {visibleBatches.map(b => (
            <Link
              key={b.batch_id}
              to={`/issuer/batches/${b.batch_id}`}
              className="flex items-center gap-4 px-5 py-4
                           hover:bg-slate-50 transition-colors"
            >
              <div className="bg-teal-100 p-2.5 rounded-lg flex-shrink-0">
                <Hash className="w-4 h-4 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800">{b.batch_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Academic Year {b.academic_year}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Uploaded by{" "}
                  <span className="font-medium text-slate-600">
                    {b.uploaded_by_name}
                  </span>
                  {b.uploaded_by_dept && b.uploaded_by_dept !== b.uploaded_by_name
                    ? ` · ${b.uploaded_by_dept}`
                    : ""}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-teal-600 text-sm">
                  {b.total_certificates} cert
                  {b.total_certificates !== 1 ? "s" : ""}
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