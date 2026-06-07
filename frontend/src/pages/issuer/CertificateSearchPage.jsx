import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { searchCertificates } from "../../api/issuer";
import { Link, useSearchParams } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import {
  Search, Loader2, ChevronRight, SlidersHorizontal,
  AlertTriangle, X,
} from "lucide-react";

const STATUSES = ["", "ACTIVE", "REVOKED", "SUSPENDED"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = ["", ...Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - i)];

export default function CertificateSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [offset, setOffset]             = useState(0);
  const limit = 25;

  const [form, setForm] = useState({
    serial_number:   searchParams.get("serial")  || "",
    fullname:        searchParams.get("name")    || "",
    program:         searchParams.get("program") || "",
    graduation_year: searchParams.get("year")    || "",
    status:          searchParams.get("status")  || "",
    academic_year:   searchParams.get("acyear")  || "",
    exact_match:     searchParams.get("exact") === "1",
    sort_by:         searchParams.get("sort")    || "serial_number",
    sort_dir:        searchParams.get("dir")     || "asc",
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== "" && v !== false)
      );
      if (form.exact_match) payload.exact_match = true;
      return searchCertificates(payload, { limit, offset });
    },
  });

  // Restore search on back-navigation
  useEffect(() => {
    if (searchParams.toString()) mutation.mutate();
  
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    setOffset(0);
    const p = {};
    if (form.serial_number)  p.serial  = form.serial_number;
    if (form.fullname)        p.name    = form.fullname;
    if (form.program)         p.program = form.program;
    if (form.graduation_year) p.year    = form.graduation_year;
    if (form.status)          p.status  = form.status;
    if (form.academic_year)   p.acyear  = form.academic_year;
    if (form.exact_match)     p.exact   = "1";
    if (form.sort_by !== "serial_number") p.sort = form.sort_by;
    if (form.sort_dir !== "asc")          p.dir  = form.sort_dir;
    setSearchParams(p);
    mutation.mutate();
  };

  const clearSearch = () => {
    setForm({
      serial_number: "", fullname: "", program: "",
      graduation_year: "", status: "", academic_year: "",
      exact_match: false, sort_by: "serial_number", sort_dir: "asc",
    });
    setSearchParams({});
    mutation.reset();
  };

  const setField = (name, value) =>
    setForm(p => ({ ...p, [name]: value }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Certificates</h1>
      <p className="text-slate-500 text-sm mb-5">
        Search your institution's certificate records
      </p>

      <div className="card p-5 mb-5">
        <form onSubmit={handleSearch}>
          {/* Basic row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="label">Serial Number</label>
              <input className="input" placeholder="CS2025-001"
                value={form.serial_number}
                onChange={e => setField("serial_number", e.target.value)} />
            </div>
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="Student name…"
                value={form.fullname}
                onChange={e => setField("fullname", e.target.value)} />
            </div>
            <div>
              <label className="label">Program</label>
              <input className="input"
                placeholder={form.exact_match ? "Exact program name" : "Contains program…"}
                value={form.program}
                onChange={e => setField("program", e.target.value)} />
            </div>
          </div>

          {/* Advanced toggle */}
          <button type="button"
            onClick={() => setShowAdvanced(p => !p)}
            className="flex items-center gap-1.5 text-xs text-slate-500
                       hover:text-slate-700 mb-3">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showAdvanced ? "Hide filters" : "More filters"}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3
                             pt-3 border-t border-slate-100">
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status}
                  onChange={e => setField("status", e.target.value)}>
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{s || "All statuses"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Graduation Year</label>
                <input type="number" className="input" placeholder="2025"
                  value={form.graduation_year}
                  onChange={e => setField("graduation_year", e.target.value)} />
              </div>
              <div>
                <label className="label">Academic Year</label>
                <select className="input" value={form.academic_year}
                  onChange={e => setField("academic_year", e.target.value)}>
                  {YEARS.map(y => (
                    <option key={y} value={y}>{y || "All years"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Sort By</label>
                <select className="input" value={form.sort_by}
                  onChange={e => setField("sort_by", e.target.value)}>
                  <option value="serial_number">Serial Number</option>
                  <option value="fullname">Name</option>
                  <option value="program">Program</option>
                  <option value="graduation_year">Year</option>
                </select>
              </div>

              <div className="col-span-2 sm:col-span-4">
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <div
                    onClick={() => setField("exact_match", !form.exact_match)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      form.exact_match ? "bg-teal-500" : "bg-slate-200"
                    }`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full
                                      shadow transition-transform ${
                      form.exact_match ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                  </div>
                  <span className="text-sm text-slate-600">
                    Exact match
                    <span className="text-xs text-slate-400 ml-1">
                      {form.exact_match
                        ? "(full program name must match)"
                        : "(program contains your text)"}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={mutation.isPending}
              className="btn-primary flex items-center gap-2"
              style={{ backgroundColor: "#0f766e" }}>
              {mutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />}
              Search
            </button>
            {mutation.data && (
              <button type="button" onClick={clearSearch}
                className="btn-secondary flex items-center gap-1.5 text-sm">
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Broad warning */}
      {mutation.data?.broad_warning && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200
                         text-amber-700 text-sm px-4 py-3 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {mutation.data.total} results found. Enable{" "}
          <strong className="mx-0.5">Exact match</strong> under filters to narrow down.
        </div>
      )}

      {mutation.isError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                         px-4 py-3 rounded-lg mb-4">
          {mutation.error?.response?.data?.detail || "Search failed."}
        </div>
      )}

      {mutation.data && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center
                           justify-between">
            <span className="text-sm text-slate-500">
              {mutation.data.total} result{mutation.data.total !== 1 ? "s" : ""}
            </span>
            {mutation.data.total > limit && (
              <div className="flex gap-1">
                <button
                  disabled={offset === 0}
                  onClick={() => { setOffset(Math.max(0, offset - limit)); mutation.mutate(); }}
                  className="px-2 py-1 text-xs rounded border border-slate-200
                             disabled:opacity-40 hover:bg-slate-50">← Prev</button>
                <button
                  disabled={offset + limit >= mutation.data.total}
                  onClick={() => { setOffset(offset + limit); mutation.mutate(); }}
                  className="px-2 py-1 text-xs rounded border border-slate-200
                             disabled:opacity-40 hover:bg-slate-50">Next →</button>
              </div>
            )}
          </div>

          {mutation.data.results.length === 0 ? (
            <p className="px-4 py-8 text-slate-400 text-sm text-center">
              No certificates matched your search.
            </p>
          ) : (
            <div className="divide-y divide-slate-50">
              {mutation.data.results.map(cert => (
                <Link
                  key={cert.certificate_id}
                  to={`/issuer/certificates/${cert.certificate_id}`}
                  state={{ searchParams: searchParams.toString() }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-800">{cert.fullname}</p>
                      {cert.academic_year && (
                        <span className="text-xs text-slate-400 bg-slate-100
                                          px-1.5 py-0.5 rounded">
                          {cert.academic_year}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {cert.serial_number} · {cert.program} · {cert.graduation_year}
                    </p>
                  </div>
                  <Badge status={cert.current_status} />
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}