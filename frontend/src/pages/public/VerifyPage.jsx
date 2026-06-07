import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { verifyCertificate, getInstitutions } from "../../api/verification";
import ResultCard from "../../components/ui/ResultCard";
import { Search, Loader2, ShieldCheck } from "lucide-react";


const DEGREE_TYPES = [
  { label: "Not specified", value: "" },
  { label: "BSc — Bachelor of Science",         value: "bsc" },
  { label: "BA — Bachelor of Arts",             value: "ba" },
  { label: "BEng — Bachelor of Engineering",    value: "beng" },
  { label: "BTech — Bachelor of Technology",    value: "btech" },
  { label: "BCom — Bachelor of Commerce",       value: "bcom" },
  { label: "BEd — Bachelor of Education",       value: "bed" },
  { label: "LLB — Bachelor of Laws",            value: "llb" },
  { label: "MBBS — Bachelor of Medicine",       value: "mbbs" },
  { label: "BSc (Hons)",                        value: "bsc (hons)" },
  { label: "BA (Hons)",                         value: "ba (hons)" },
  { label: "HND — Higher National Diploma",     value: "hnd" },
  { label: "Diploma",                           value: "diploma" },
  { label: "MSc — Master of Science",           value: "msc" },
  { label: "MA — Master of Arts",               value: "ma" },
  { label: "MBA — Master of Business Admin",    value: "mba" },
  { label: "MEng — Master of Engineering",      value: "meng" },
  { label: "MPhil — Master of Philosophy",      value: "mphil" },
  { label: "PhD — Doctor of Philosophy",        value: "phd" },
  { label: "PGDip — Postgraduate Diploma",      value: "pgdip" },
];

const EMPTY = {
  serial_number:   "",
  fullname:        "",
  degree_type:     "",   // UI only — combined into program before sending
  program_name:    "",   // UI only — combined into program before sending
  graduation_year: "",
  issuer:          "",
};

export default function VerifyPage() {
  const [form, setForm] = useState(EMPTY);

  const { data: institutions = [] } = useQuery({
    queryKey: ["public-institutions"],
    queryFn:  getInstitutions,
    staleTime: 10 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: (data) => verifyCertificate(data),
  });

  const handleChange = e =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();

    const combined_program = form.degree_type
      ? `${form.degree_type} ${form.program_name}`.trim().toLowerCase()
      : form.program_name.trim().toLowerCase();

    mutation.mutate({
      serial_number:   form.serial_number.trim(),
      fullname:        form.fullname.trim(),
      program:         combined_program,
      graduation_year: parseInt(form.graduation_year, 10),
      issuer:          form.issuer.trim(),
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center
                         bg-brand-100 w-16 h-16 rounded-2xl mb-4">
          <ShieldCheck className="w-8 h-8 text-brand-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">Verify a Certificate</h1>
        <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">
          Enter the exact details from the certificate. All fields are required.
        </p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Serial Number */}
            <div>
              <label className="label">Serial Number</label>
              <input name="serial_number" className="input"
                placeholder="e.g. CS2025-001"
                value={form.serial_number} onChange={handleChange} required />
            </div>

            {/* Full Name */}
            <div>
              <label className="label">Graduate Full Name</label>
              <input name="fullname" className="input"
                placeholder="e.g. John Doe"
                value={form.fullname} onChange={handleChange} required />
            </div>

            {/* Degree Type + Program — two fields that combine into one */}
            <div>
              <label className="label">Degree Type</label>
              <select name="degree_type" className="input"
                value={form.degree_type} onChange={handleChange}>
                {DEGREE_TYPES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                Program / Discipline
                <span className="text-slate-400 font-normal ml-1 text-xs">
                  (without degree prefix)
                </span>
              </label>
              <input name="program_name" className="input"
                placeholder="e.g. Computer Science"
                value={form.program_name} onChange={handleChange} required />
              {/* Preview of how it will be combined */}
              {form.degree_type && form.program_name && (
                <p className="text-xs text-teal-600 mt-1">
                  Will verify as: "
                  <strong>
                    {form.degree_type} {form.program_name}
                  </strong>
                  "
                </p>
              )}
            </div>

            {/* Graduation Year */}
            <div>
              <label className="label">Graduation Year</label>
              <input name="graduation_year" type="number" className="input"
                placeholder="e.g. 2025"
                value={form.graduation_year} onChange={handleChange}
                required min="1900" max="2100" />
            </div>

            {/* Issuing Institution */}
            <div>
              <label className="label">Issuing Institution</label>
              {institutions.length > 0 ? (
                <select name="issuer" className="input"
                  value={form.issuer} onChange={handleChange} required>
                  <option value="">Select institution…</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={(inst?.university_name || "").toLowerCase()}>
                      {inst?.university_name || ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input name="issuer" className="input"
                  placeholder="e.g. University of Accra"
                  value={form.issuer} onChange={handleChange} required />
              )}
            </div>

          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={mutation.isPending}
              className="btn-primary flex items-center gap-2">
              {mutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />}
              {mutation.isPending ? "Verifying…" : "Verify Certificate"}
            </button>
            {mutation.data && (
              <button type="button"
                onClick={() => { mutation.reset(); setForm(EMPTY); }}
                className="btn-secondary">
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {mutation.isError && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700
                         text-sm px-4 py-3 rounded-lg">
          {mutation.error?.response?.data?.detail ||
            "Verification request failed. Please try again."}
        </div>
      )}

      {mutation.data && (
        <div className="mt-6">
          <ResultCard result={mutation.data} />
        </div>
      )}

      <p className="text-center text-slate-400 text-xs mt-8">
        All verification attempts are logged. Fields are matched against
        cryptographically signed records.
      </p>
    </div>
  );
}