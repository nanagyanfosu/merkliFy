import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { verifyCertificate, getInstitutions } from "../../api/verification";
import { Search, Loader2, X, ShieldCheck, CheckCircle2,
         AlertCircle, Clock, HelpCircle } from "lucide-react";
import { getErrorMessage } from "../../utils/errors";

const COOLDOWN_SECONDS = 10;

const RESULT_CONFIG = {
  AUTHENTIC: {
    icon:       CheckCircle2,
    iconClass:  "text-teal-600",
    bgClass:    "bg-teal-50 border-teal-200",
    titleClass: "text-teal-800",
    title:      "Certificate Verified",
    showFields: true,
  },
  NOT_VERIFIED: {
    icon:       HelpCircle,
    iconClass:  "text-slate-400",
    bgClass:    "bg-white border-slate-200",
    titleClass: "text-slate-700",
    title:      "Could Not Be Verified",
    showFields: false,
  },
  REVOKED: {
    icon:       AlertCircle,
    iconClass:  "text-red-500",
    bgClass:    "bg-red-50 border-red-200",
    titleClass: "text-red-800",
    title:      "Certificate Revoked",
    showFields: true,
  },
  SUSPENDED: {
    icon:       Clock,
    iconClass:  "text-amber-500",
    bgClass:    "bg-amber-50 border-amber-200",
    titleClass: "text-amber-800",
    title:      "Certificate Suspended",
    showFields: true,
  },
  CANNOT_VERIFY: {
    icon:       AlertCircle,
    iconClass:  "text-orange-500",
    bgClass:    "bg-orange-50 border-orange-200",
    titleClass: "text-orange-800",
    title:      "Verification Unavailable",
    showFields: false,
  },
};

const EMPTY = { serial_number: "", fullname: "", issuer: "" };

export default function VerifyPage() {
  const [form,     setForm]     = useState(EMPTY);
  const [cooldown, setCooldown] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const cooldownRef = useRef(null);

  const { data: institutions = [] } = useQuery({
    queryKey:  ["public-institutions"],
    queryFn:   getInstitutions,
    staleTime: 10 * 60 * 1000,
  });

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const mutation = useMutation({
    mutationFn: () => verifyCertificate({
      serial_number: form.serial_number.trim(),
      fullname:      form.fullname.trim(),
      issuer:        form.issuer.trim(),
    }),
    onSuccess: () => { startCooldown(); setShowModal(true); },
    onError:   () => startCooldown(),
  });

  const handleFieldChange = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    if (cooldown > 0) {
      clearInterval(cooldownRef.current);
      setCooldown(0);
    }
  };

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
    setShowModal(false);
  };

  const buttonBlocked = mutation.isPending || cooldown > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Verify an academic record
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Enter these details from the certificate you are looking for.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl
                         shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            <FormField label="Serial Number"
              >
              <input
                className="input font-mono"
                placeholder="e.g. 1010010010101"
                value={form.serial_number}
                onChange={e => handleFieldChange("serial_number", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Graduate Full Name"
              hint="Enter the full name as it appears on the certificate">
              <input
                className="input"
                placeholder="e.g. John Kwame Doe"
                value={form.fullname}
                onChange={e => handleFieldChange("fullname", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Issuing Institution"
              >
              {institutions.length > 0 ? (
                <select
                  className="input"
                  value={form.issuer}
                  onChange={e => handleFieldChange("issuer", e.target.value)}
                  required
                >
                  <option value="" disabled>Select an institution…</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.university_name.toLowerCase()}>
                      {inst.university_name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  placeholder="e.g. University of Accra"
                  value={form.issuer}
                  onChange={e => handleFieldChange("issuer", e.target.value)}
                  required
                />
              )}
            </FormField>

            <div className="flex items-center gap-3 pt-2">
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
                  <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</>
                ) : cooldown > 0 ? (
                  <><span className="font-mono text-xs w-4">{cooldown}s</span>
                    Please wait</>
                ) : (
                  <><Search className="w-4 h-4" />Verify Certificate</>
                )}
              </button>

              {mutation.data && (
                <button type="button" onClick={handleClear}
                  className="flex items-center gap-1.5 text-sm
                              text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>

            {/* {cooldown > 0 && (
              <p className="text-xs text-slate-400">
                Please wait {cooldown} second{cooldown !== 1 ? "s" : ""} before
                verifying again. Editing any field above will reset this.
              </p>
            )} */}
          </form>
        </div>

        {mutation.isError && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700
                           text-sm px-4 py-3 rounded-lg">
            {getErrorMessage(mutation.error,
              "Something went wrong. Please check your connection and try again.")}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-6 text-center">
          Verification queries are anonymously logged for security.
          No personal data is stored against your search.
        </p>
      </div>

      {/* Result Modal */}
      {showModal && mutation.data && (
        <ResultModal
          result={mutation.data}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600
                          uppercase tracking-wide mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function ResultModal({ result, onClose }) {
  const cfg  = RESULT_CONFIG[result.result] || RESULT_CONFIG.NOT_VERIFIED;
  const Icon = cfg.icon;

  // Close on backdrop click or Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className={`relative w-full max-w-md border-2 rounded-2xl p-6
                        shadow-2xl ${cfg.bgClass}
                        animate-in fade-in zoom-in-95 duration-200`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400
                      hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon + title */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center
                            justify-center flex-shrink-0
                            ${cfg.bgClass} border`}>
            <Icon className={`w-5 h-5 ${cfg.iconClass}`} />
          </div>
          <div>
            <p className={`font-bold text-lg ${cfg.titleClass}`}>
              {cfg.title}
            </p>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed">
              {result.message}
            </p>
          </div>
        </div>

        {/* Certificate fields */}
        {cfg.showFields && result.serial_number && (
          <div className="border-t border-slate-200 pt-4 mt-4
                           grid grid-cols-2 gap-4">
            {[
              { label: "Serial Number",   value: result.serial_number, mono: true },
              { label: "Graduation Year", value: result.graduation_year, mono: true },
              { label: "Full Name",       value: result.fullname },
              { label: "Program",         value: result.program },
              {
                label: "Issuing Institution",
                value: result.issuer,
                full: true,
              },
            ].map(({ label, value, mono, full }) => (
              <div key={label} className={full ? "col-span-2" : ""}>
                <p className="text-xs font-semibold text-slate-400
                                uppercase tracking-wide mb-0.5">
                  {label}
                </p>
                <p className={`text-sm font-medium text-slate-800 ${
                  mono ? "font-mono" : ""
                }`}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full border border-slate-200 hover:bg-slate-100
                      text-slate-700 font-medium py-2.5 rounded-lg text-sm
                      transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}