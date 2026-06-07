import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listBatches } from "../../api/issuer";
import { Link } from "react-router-dom";
import { Loader2, ChevronRight, Hash, Filter, ArrowUpDown } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

export default function BatchesPage() {
  // Use null (not "All") to represent "no filter" — avoids string/number confusion
  const [yearFilter, setYearFilter] = useState(null);
  const [sortBy,     setSortBy]     = useState("created_at");
  const [sortDir,    setSortDir]    = useState("desc");

  // Build params — only include academic_year if a specific year is selected
  const queryParams = {
    sort_by:  sortBy,
    sort_dir: sortDir,
    ...(yearFilter !== null && { academic_year: yearFilter }),
  };

  const { data: batches = [], isLoading, isFetching } = useQuery({
    queryKey:  ["issuer-batches", queryParams],
    queryFn:   () => listBatches(queryParams),
    staleTime: 0,       // always re-fetch when key changes — prevents stale year results
    keepPreviousData: true,
  });

  const handleYearChange = (e) => {
    const val = e.target.value;
    // Parse immediately to int — never keep as string in state
    setYearFilter(val === "" ? null : parseInt(val, 10));
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  const SortBtn = ({ field, label }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 text-xs font-medium transition-colors ${
        sortBy === field ? "text-teal-600" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Batches</h1>
      <p className="text-slate-500 text-sm mb-5">
        All certificate batches issued by your institution
      </p>

      {/* Filter bar */}
      <div className="card p-3 mb-5 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">
            Academic Year
          </label>
          <select
            className="input w-auto text-sm"
            value={yearFilter ?? ""}
            onChange={handleYearChange}
          >
            <option value="">All years</option>
            {YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 ml-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">Sort by</label>
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
            className="text-xs text-slate-500 hover:text-teal-600 flex items-center gap-1"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortDir === "desc" ? "Newest first" : "Oldest first"}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isFetching && !isLoading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" />
          )}
          <span className="text-xs text-slate-400">
            {batches.length} batch{batches.length !== 1 ? "es" : ""}
            {yearFilter ? ` for ${yearFilter}` : ""}
          </span>
          {yearFilter !== null && (
            <button
              onClick={() => setYearFilter(null)}
              className="text-xs text-teal-600 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : batches.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-400">
            {yearFilter
              ? `No batches found for academic year ${yearFilter}.`
              : "No batches uploaded yet."}
          </p>
          {yearFilter ? (
            <button onClick={() => setYearFilter(null)}
              className="text-teal-600 text-sm hover:underline mt-2 block mx-auto">
              Show all years
            </button>
          ) : (
            <Link to="/issuer/upload" className="text-teal-600 text-sm hover:underline mt-2 block">
              Upload your first batch
            </Link>
          )}
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {batches.map(b => (
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
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-teal-600 text-sm">
                  {b.total_certificates} cert{b.total_certificates !== 1 ? "s" : ""}
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