import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { verifyCertificate, getInstitutions } from "../../api/verification";
import ResultCard from "../../components/ui/ResultCard";
import { Search, Loader2, X, ShieldCheck } from "lucide-react";

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

const COOLDOWN_SECONDS = 10;

export default function VerifyPage() {
  const [form,       setForm]       = useState(EMPTY);
  const [cooldown,   setCooldown]   = useState(0);
  const cooldownRef = useRef(null);

  const { data: institutions = [] } = useQuery({
    queryKey:  ["public-institutions"],
    queryFn:   getInstitutions,
    staleTime: 10 * 60 * 1000,
  });

  // Start cooldown countdown after a result arrives
  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Clear cooldown if user edits any field — they are starting fresh
  const handleFieldChange = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    if (cooldown > 0) {
      clearInterval(cooldownRef.current);
      setCooldown(0);
      mutation.reset();
    }
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

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
    onSuccess: () => startCooldown(),
    onError:   () => startCooldown(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (cooldown > 0 || mutation.isPending) return;
    mutation.mutate();
  };

  const handleClear = () => {
    clearInterval(cooldownRef.current);
    setCooldown(0);
    setForm(EMPTY);
    mutation.reset();
  };

  // Button is blocked if: pending OR on cooldown
  const buttonBlocked = mutation.isPending || cooldown > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Simple header for standalone verify page */}
      {/* <header className="bg-white border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center
                         justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-500" />
            <span className="font-bold text-slate-900 text-sm">
              MerkliFy
            </span>
          </div>
          <a href="/"
            className="text-sm text-slate-400 hover:text-slate-600
                        transition-colors">
            ← Back
          </a>
        </div>
      </header> */}

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Verify an academic degree
          </h1>
          <p className="text-slate-500 text-sm">
            Enter the details exactly as they appear on the certificate.
            All fields are required.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl
                         shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <Field label="Serial Number">
                <input
                  className="input font-mono"
                  placeholder="e.g. CS2025-001"
                  value={form.serial_number}
                  onChange={e => handleFieldChange("serial_number", e.target.value)}
                  required
                />
              </Field>

              <Field label="Graduate Full Name">
                <input
                  className="input"
                  placeholder="As printed on the certificate"
                  value={form.fullname}
                  onChange={e => handleFieldChange("fullname", e.target.value)}
                  required
                />
              </Field>

              <Field label="Degree Type">
                <select
                  className="input"
                  value={form.degree_type}
                  onChange={e => handleFieldChange("degree_type", e.target.value)}
                  required
                >
                  {DEGREE_TYPES.map(d => (
                    <option key={d.value} value={d.value}
                      disabled={d.value === ""}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Program"
                hint={form.degree_type && form.program_name
                  ? `Matching as: ${form.degree_type} ${form.program_name}`
                  : null}
              >
                <input
                  className="input"
                  placeholder="e.g. Computer Science"
                  value={form.program_name}
                  onChange={e => handleFieldChange("program_name", e.target.value)}
                  required
                />
              </Field>

              <Field label="Graduation Year">
                <input
                  type="number"
                  className="input font-mono"
                  placeholder="e.g. 2025"
                  value={form.graduation_year}
                  onChange={e => handleFieldChange("graduation_year", e.target.value)}
                  min="1900"
                  max="2100"
                  required
                />
              </Field>

              <Field label="Issuing Institution">
                {institutions.length > 0 ? (
                  <select
                    className="input"
                    value={form.issuer}
                    onChange={e => handleFieldChange("issuer", e.target.value)}
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
                    className="input"
                    placeholder="Full institution name"
                    value={form.issuer}
                    onChange={e => handleFieldChange("issuer", e.target.value)}
                    required
                  />
                )}
              </Field>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={buttonBlocked}
                className="flex items-center gap-2 bg-teal-600
                            hover:bg-teal-700 disabled:opacity-50
                            disabled:cursor-not-allowed text-white
                            font-semibold px-5 py-2.5 rounded-lg
                            text-sm transition-colors min-w-[160px]
                            justify-center"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying…
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <span className="font-mono text-xs">
                      {cooldown}s
                    </span>
                    Wait before retrying
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Verify Certificate
                  </>
                )}
              </button>

              {(mutation.data || mutation.isError) && cooldown === 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1.5 text-sm
                              text-slate-400 hover:text-slate-600
                              transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>

            {/* Cooldown explanation — shown during cooldown */}
            {cooldown > 0 && (
              <p className="text-xs text-slate-400 pt-1">
                To prevent misuse, please wait {cooldown} second
                {cooldown !== 1 ? "s" : ""} before submitting again.
                Editing any field above will reset the wait.
              </p>
            )}
          </form>
        </div>

        {/* Error */}
        {mutation.isError && (
          <div className="mt-4 bg-red-50 border border-red-200
                           text-red-700 text-sm px-4 py-3 rounded-lg">
            {mutation.error?.response?.data?.detail ||
              "Request failed. Check your connection and try again."}
          </div>
        )}

        {/* Result */}
        {mutation.data && (
          <div className="mt-5">
            <ResultCard result={mutation.data} />
          </div>
        )}

        <p className="text-xs text-slate-400 mt-8 text-center leading-relaxed">
          Verification attempts are anonymously logged for security monitoring.
          No personal information is stored against your query.
        </p>
      </div>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500
                          uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-teal-600 mt-1 font-mono">{hint}</p>
      )}
    </div>
  );
}