import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { verifyCertificate, getInstitutions } from "../../api/verification";
import ResultCard from "../../components/ui/ResultCard";
import { Search, Loader2, X } from "lucide-react";

const DEGREE_TYPES = [
  { label: "Select degree type…", value: "" },
  { label: "BSc — Bachelor of Science",       value: "bsc" },
  { label: "BA — Bachelor of Arts",           value: "ba" },
  { label: "BEng — Bachelor of Engineering",  value: "beng" },
  { label: "BTech — Bachelor of Technology",  value: "btech" },
  { label: "BCom — Bachelor of Commerce",     value: "bcom" },
  { label: "BEd — Bachelor of Education",     value: "bed" },
  { label: "LLB — Bachelor of Laws",          value: "llb" },
  { label: "MBBS — Bachelor of Medicine",     value: "mbbs" },
  { label: "BSc (Hons)",                      value: "bsc (hons)" },
  { label: "BA (Hons)",                       value: "ba (hons)" },
  { label: "HND — Higher National Diploma",   value: "hnd" },
  { label: "Diploma",                         value: "diploma" },
  { label: "MSc — Master of Science",         value: "msc" },
  { label: "MA — Master of Arts",             value: "ma" },
  { label: "MBA",                             value: "mba" },
  { label: "MEng — Master of Engineering",    value: "meng" },
  { label: "MPhil — Master of Philosophy",    value: "mphil" },
  { label: "PhD — Doctor of Philosophy",      value: "phd" },
  { label: "PGDip — Postgraduate Diploma",    value: "pgdip" },
];

const EMPTY = {
  serial_number:   "",
  fullname:        "",
  degree_type:     "",
  program_name:    "",
  graduation_year: "",
  issuer:          "",
};

export default function VerifyFormInline() {
  const [form, setForm] = useState(EMPTY);

  const { data: institutions = [] } = useQuery({
    queryKey:  ["public-institutions"],
    queryFn:   getInstitutions,
    staleTime: 10 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const program = form.degree_type
        ? `${form.degree_type} ${form.program_name}`.trim().toLowerCase()
        : form.program_name.trim().toLowerCase();

      return verifyCertificate({
        serial_number:   form.serial_number.trim(),
        fullname:        form.fullname.trim(),
        program,
        graduation_year: parseInt(form.graduation_year, 10),
        issuer:          form.issuer.trim(),
      });
    },
  });

  const set = (field, value) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  const handleClear = () => {
    setForm(EMPTY);
    mutation.reset();
  };

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-xl
                       shadow-sm overflow-hidden">
        {/* Form header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <p className="text-sm font-medium text-slate-600">
            Enter the details exactly as they appear on the certificate.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

            {/* Serial Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                  uppercase tracking-wide mb-1.5">
                Serial Number
              </label>
              <input
                className="w-full px-3 py-2.5 border border-slate-200
                            rounded-lg text-sm text-slate-900 bg-white
                            font-mono placeholder:font-sans
                            placeholder:text-slate-400
                            focus:outline-none focus:ring-2
                            focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g. CS2025-001"
                value={form.serial_number}
                onChange={(e) => set("serial_number", e.target.value)}
                required
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                  uppercase tracking-wide mb-1.5">
                Graduate Full Name
              </label>
              <input
                className="w-full px-3 py-2.5 border border-slate-200
                            rounded-lg text-sm text-slate-900 bg-white
                            placeholder:text-slate-400
                            focus:outline-none focus:ring-2
                            focus:ring-teal-500 focus:border-transparent"
                placeholder="As printed on the certificate"
                value={form.fullname}
                onChange={(e) => set("fullname", e.target.value)}
                required
              />
            </div>

            {/* Degree Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                  uppercase tracking-wide mb-1.5">
                Degree Type
              </label>
              <select
                className="w-full px-3 py-2.5 border border-slate-200
                            rounded-lg text-sm text-slate-900 bg-white
                            focus:outline-none focus:ring-2
                            focus:ring-teal-500 focus:border-transparent"
                value={form.degree_type}
                onChange={(e) => set("degree_type", e.target.value)}
                required
              >
                {DEGREE_TYPES.map((d) => (
                  <option key={d.value} value={d.value}
                    disabled={d.value === ""}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Program Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                  uppercase tracking-wide mb-1.5">
                Program / Discipline
              </label>
              <input
                className="w-full px-3 py-2.5 border border-slate-200
                            rounded-lg text-sm text-slate-900 bg-white
                            placeholder:text-slate-400
                            focus:outline-none focus:ring-2
                            focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g. Computer Science"
                value={form.program_name}
                onChange={(e) => set("program_name", e.target.value)}
                required
              />
              {/* Preview of combined program */}
              {form.degree_type && form.program_name && (
                <p className="text-xs text-teal-600 mt-1">
                  Will match as:{" "}
                  <span className="font-medium font-mono">
                    {form.degree_type} {form.program_name}
                  </span>
                </p>
              )}
            </div>

            {/* Graduation Year */}
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                  uppercase tracking-wide mb-1.5">
                Graduation Year
              </label>
              <input
                type="number"
                className="w-full px-3 py-2.5 border border-slate-200
                            rounded-lg text-sm text-slate-900 bg-white
                            placeholder:text-slate-400 font-mono
                            focus:outline-none focus:ring-2
                            focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g. 2025"
                value={form.graduation_year}
                onChange={(e) => set("graduation_year", e.target.value)}
                min="1900"
                max="2100"
                required
              />
            </div>

            {/* Issuing Institution */}
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                  uppercase tracking-wide mb-1.5">
                Issuing Institution
              </label>
              {institutions.length > 0 ? (
                <select
                  className="w-full px-3 py-2.5 border border-slate-200
                              rounded-lg text-sm text-slate-900 bg-white
                              focus:outline-none focus:ring-2
                              focus:ring-teal-500 focus:border-transparent"
                  value={form.issuer}
                  onChange={(e) => set("issuer", e.target.value)}
                  required
                >
                  <option value="" disabled>Select institution…</option>
                  {institutions.map((inst) => {
                    const institutionName = inst.university_name || inst.name || "";

                    return (
                      <option
                        key={inst.id}
                        value={institutionName.toLowerCase()}
                      >
                        {institutionName}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  className="w-full px-3 py-2.5 border border-slate-200
                              rounded-lg text-sm text-slate-900 bg-white
                              placeholder:text-slate-400
                              focus:outline-none focus:ring-2
                              focus:ring-teal-500 focus:border-transparent"
                  placeholder="Full institution name"
                  value={form.issuer}
                  onChange={(e) => set("issuer", e.target.value)}
                  required
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 bg-teal-600
                          hover:bg-teal-700 disabled:opacity-50
                          disabled:cursor-not-allowed text-white
                          font-semibold px-5 py-2.5 rounded-lg
                          text-sm transition-colors"
            >
              {mutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />}
              {mutation.isPending ? "Verifying…" : "Verify Certificate"}
            </button>

            {mutation.data && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1.5 text-sm
                            text-slate-500 hover:text-slate-700
                            transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Network error */}
      {mutation.isError && (
        <div className="mt-4 bg-red-50 border border-red-200
                         text-red-700 text-sm px-4 py-3 rounded-lg">
          {mutation.error?.response?.data?.detail ||
            "Verification request failed. Please check your connection and try again."}
        </div>
      )}

      {/* Result */}
      {mutation.data && (
        <div className="mt-5">
          <ResultCard result={mutation.data} />
        </div>
      )}
    </div>
  );
}