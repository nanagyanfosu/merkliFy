import {
  CheckCircle2, XCircle, AlertCircle,
  Clock, HelpCircle,
} from "lucide-react";

const CONFIG = {
  AUTHENTIC: {
    icon:        CheckCircle2,
    iconClass:   "text-teal-600",
    borderClass: "border-teal-200 bg-teal-50/40",
    labelClass:  "text-teal-700",
    label:       "Certificate Verified",
    sub:         "This certificate is authentic and currently active.",
    showFields:  true,
  },
  NOT_VERIFIED: {
    icon:        HelpCircle,
    iconClass:   "text-slate-400",
    borderClass: "border-slate-200 bg-slate-50",
    labelClass:  "text-slate-700",
    label:       "Details Could Not Be Matched",
    sub:         "Check all five fields are entered exactly as they appear on the certificate and try again.",
    showFields:  false,
  },
  REVOKED: {
    icon:        XCircle,
    iconClass:   "text-red-500",
    borderClass: "border-red-200 bg-red-50/40",
    labelClass:  "text-red-700",
    label:       "Certificate Revoked",
    sub:         "This certificate has been formally revoked by the issuing institution. Contact them for further information.",
    showFields:  true,
  },
  SUSPENDED: {
    icon:        Clock,
    iconClass:   "text-amber-500",
    borderClass: "border-amber-200 bg-amber-50/40",
    labelClass:  "text-amber-700",
    label:       "Certificate Suspended",
    sub:         "This certificate is temporarily suspended. Contact the issuing institution for details.",
    showFields:  true,
  },
  CANNOT_VERIFY: {
    icon:        AlertCircle,
    iconClass:   "text-orange-500",
    borderClass: "border-orange-200 bg-orange-50/40",
    labelClass:  "text-orange-700",
    label:       "Verification Unavailable",
    sub:         "A system integrity issue was detected. Contact the issuing institution directly.",
    showFields:  false,
  },
};

export default function ResultCard({ result }) {
  const cfg  = CONFIG[result.result] || CONFIG.NOT_VERIFIED;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border p-5 ${cfg.borderClass}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.iconClass}`} />
        <div>
          <p className={`font-semibold text-sm ${cfg.labelClass}`}>
            {cfg.label}
          </p>
          <p className="text-slate-500 text-sm mt-0.5 leading-relaxed">
            {cfg.sub}
          </p>
        </div>
      </div>

      {/* Certificate fields — shown only when relevant */}
      {cfg.showFields && result.serial_number && (
        <div className="border-t border-black/8 pt-4
                         grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Serial Number"   value={result.serial_number} mono />
          <Field label="Graduation Year" value={result.graduation_year} mono />
          <Field label="Program"         value={result.program} />
          <Field label="Issuing Body"    value={result.issuer} />
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase
                     tracking-wide mb-0.5">
        {label}
      </p>
      <p className={`text-sm text-slate-800 font-medium ${
        mono ? "font-mono" : ""
      }`}>
        {value}
      </p>
    </div>
  );
}