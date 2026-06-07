import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { searchCertificates } from "../../api/issuer";
import { Link, useSearchParams } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import { Search, Loader2, ChevronRight, X } from "lucide-react";

export default function CertificateSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialise form from URL so back-navigation restores state
  const [form, setForm] = useState({
    serial_number: searchParams.get("serial")   || "",
    fullname:      searchParams.get("name")     || "",
    program:       searchParams.get("program")  || "",
    graduation_year: searchParams.get("year")  ? Number(searchParams.get("year")) : undefined,
  });

  const mutation = useMutation({
    mutationFn: () => searchCertificates(
      Object.fromEntries(Object.entries(form).filter(([, v]) => v !== "" && v !== undefined))
    ),
  });

  // Auto-run search if URL has params (e.g. back-navigation)
  useEffect(() => {
    if (searchParams.toString()) {
      mutation.mutate();
    }

  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Persist search in URL
    const p = {};
    if (form.serial_number)  p.serial  = form.serial_number;
    if (form.fullname)        p.name    = form.fullname;
    if (form.program)         p.program = form.program;
    if (form.graduation_year) p.year    = form.graduation_year;
    setSearchParams(p);
    mutation.mutate();
  };

  const clearSearch = () => {
    setForm({ serial_number: "", fullname: "", program: "", graduation_year: undefined });
    setSearchParams({});
    mutation.reset();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Certificates</h1>
      <p className="text-slate-500 text-sm mb-5">
        Search your institution's certificates
      </p>

      <div className="card p-5 mb-5">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="label">Serial Number</label>
              <input name="serial_number" className="input"
                placeholder="CS2025-001"
                value={form.serial_number} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Full Name</label>
              <input name="fullname" className="input"
                placeholder="Kofi Annan"
                value={form.fullname} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Program</label>
              <input name="program" className="input"
                placeholder="Computer Science"
                value={form.program} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Graduation Year</label>
              <input name="graduation_year" type="number" className="input"
                placeholder="2025"
                value={form.graduation_year || ""}
                onChange={e => setForm(p => ({
                  ...p,
                  graduation_year: e.target.value ? Number(e.target.value) : undefined,
                }))} />
            </div>
          </div>
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
                className="btn-secondary flex items-center gap-1.5">
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {mutation.isError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                         px-4 py-3 rounded-lg mb-4">
          {mutation.error?.response?.data?.detail || "Search failed."}
        </div>
      )}

      {mutation.data && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-sm text-slate-500">
            {mutation.data.total} result{mutation.data.total !== 1 ? "s" : ""}
          </div>
          {mutation.data.results.length === 0 ? (
            <p className="px-4 py-6 text-slate-400 text-sm">No certificates found.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {mutation.data.results.map(cert => (
                <Link
                  key={cert.certificate_id}
                  to={`/issuer/certificates/${cert.certificate_id}`}
                  state={{ searchParams: searchParams.toString() }}
                  className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800">{cert.fullname}</p>
                    <p className="text-xs text-slate-400">
                      {cert.serial_number} · {cert.program} · {cert.graduation_year}
                    </p>
                  </div>
                  <Badge status={cert.current_status} />
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}