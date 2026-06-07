import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { verifyCertificate } from "../../api/verification";
import ResultCard from "../../components/ui/ResultCard";
import { Search, Loader2, ShieldCheck } from "lucide-react";

const EMPTY = {
  serial_number: "",
  fullname: "",
  program: "",
  graduation_year: "",
  issuer: "",
};

export default function VerifyPage() {
  const [form, setForm] = useState(EMPTY);

  const mutation = useMutation({
    mutationFn: (data) =>
      verifyCertificate({
        ...data,
        graduation_year: parseInt(data.graduation_year, 10),
      }),
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const handleReset = () => {
    setForm(EMPTY);
    mutation.reset();
  };

  const { data: institutions } = useQuery({
    queryKey: ["public-institutions"],
    queryFn: () => api.get("/verify/institutions").then(r => r.data),
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center bg-brand-100 w-16 h-16 rounded-2xl mb-4">
          <ShieldCheck className="w-8 h-8 text-brand-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">
          Verify a Certificate
        </h1>
        <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm">
          Enter the exact details as they appear on the academic certificate.
          All fields are required for cryptographic verification.
        </p>
      </div>

      {/* Form */}
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Serial Number</label>
              <input
                name="serial_number"
                className="input"
                placeholder="e.g. CS2025-001"
                value={form.serial_number}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="label">Graduate Full Name</label>
              <input
                name="fullname"
                className="input"
                placeholder="e.g. Kofi Amoah"
                value={form.fullname}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="label">Program</label>
              <input
                name="program"
                className="input"
                placeholder="e.g. Computer Science"
                value={form.program}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="label">Graduation Year</label>
              <input
                name="graduation_year"
                type="number"
                className="input"
                placeholder="e.g. 2025"
                value={form.graduation_year}
                onChange={handleChange}
                required
                min="1900"
                max="2100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Issuing Institution</label>
              <input
                name="issuer"
                className="input"
                placeholder="e.g. University of Ghana"
                value={form.issuer}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {mutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />}
              {mutation.isPending ? "Verifying…" : "Verify Certificate"}
            </button>
            {mutation.data && (
              <button type="button" onClick={handleReset} className="btn-secondary">
                Clear
              </button>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="label">Issuing Institution</label>
              {institutions?.length ? (
            <select
              name="issuer"
              className="input"
              value={form.issuer}
              onChange={handleChange}
              required
            >
            <option value="">Select institution…</option>
              {institutions.map((inst) => (
            <option key={inst.id} value={inst.university_name.toLowerCase()}>
              {inst.university_name}
            </option>
            ))}
          </select>
          ) : (
          <input name="issuer" className="input" placeholder="e.g. University of Ghana"
          value={form.issuer} onChange={handleChange} required />
          )}
        </div>
        </form>
      </div>

      {/* Error */}
      {mutation.isError && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {mutation.error?.response?.data?.detail ||
            "Verification request failed. Please try again."}
        </div>
      )}

      {/* Result */}
      {mutation.data && (
        <div className="mt-6">
          <ResultCard result={mutation.data} />
        </div>
      )}

      {/* Info footer */}
      <p className="text-center text-slate-400 text-xs mt-8">
        All fields are matched against cryptographically signed records.
        Verification attempts are logged for security purposes.
      </p>
    </div>
  );
}