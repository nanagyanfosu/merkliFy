import {
  CheckCircle2, XCircle, AlertTriangle, ShieldAlert,
  ShieldOff, Clock, HelpCircle,
} from "lucide-react";

const CONFIG = {
  AUTHENTIC:              { icon: CheckCircle2, bg: "bg-green-50",  border: "border-green-300",  iconColor: "text-green-500",  titleColor: "text-green-800",  title: "Certificate Verified",      sub: "This certificate is authentic and currently active." },
  FAILED:                 { icon: HelpCircle,   bg: "bg-slate-50",  border: "border-slate-200",  iconColor: "text-slate-400",  titleColor: "text-slate-700",  title: "Not Found",                 sub: "No certificate matched the details provided." },
  TAMPERED:               { icon: AlertTriangle,bg: "bg-red-50",    border: "border-red-300",    iconColor: "text-red-500",    titleColor: "text-red-800",    title: "Tampering Detected",        sub: "Certificate data does not match the original issued record." },
  BATCH_TAMPER_DETECTED:  { icon: ShieldAlert,  bg: "bg-red-50",    border: "border-red-300",    iconColor: "text-red-500",    titleColor: "text-red-800",    title: "Batch Integrity Failure",   sub: "The batch containing this certificate may have been altered." },
  UNTRUSTED_ISSUER:       { icon: ShieldOff,    bg: "bg-orange-50", border: "border-orange-300", iconColor: "text-orange-500", titleColor: "text-orange-800", title: "Untrusted Issuer",          sub: "The issuer's digital signature could not be verified." },
  REVOKED:                { icon: XCircle,      bg: "bg-red-50",    border: "border-red-300",    iconColor: "text-red-500",    titleColor: "text-red-800",    title: "Certificate Revoked",       sub: "This certificate has been revoked by the issuing institution." },
  SUSPENDED:              { icon: Clock,        bg: "bg-amber-50",  border: "border-amber-300",  iconColor: "text-amber-500",  titleColor: "text-amber-800",  title: "Certificate Suspended",     sub: "Temporarily suspended. Contact the issuing institution." },
};

export default function ResultCard({ result }) {
  const cfg  = CONFIG[result.result] || CONFIG.FAILED;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border-2 p-6 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-4">
        <Icon className={`w-8 h-8 flex-shrink-0 mt-0.5 ${cfg.iconColor}`} />
        <div>
          <h3 className={`font-bold text-lg ${cfg.titleColor}`}>{cfg.title}</h3>
          <p className="text-slate-600 text-sm mt-0.5">{cfg.sub}</p>
        </div>
      </div>

      {/* Show public certificate fields*/}
      {result.serial_number && (
        <div className="mt-5 pt-5 border-t border-black/10
                         grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Serial Number"   value={result.serial_number} />
          <Field label="Program"         value={result.program} />
          <Field label="Issuing Body"    value={result.issuer} />
          <Field label="Graduation Year" value={result.graduation_year} />
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400 italic">{result.message}</p>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}