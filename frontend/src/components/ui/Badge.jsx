const STATUS_STYLES = {
  ACTIVE:    "bg-green-100 text-green-700 border-green-200",
  REVOKED:   "bg-red-100 text-red-700 border-red-200",
  SUSPENDED: "bg-amber-100 text-amber-700 border-amber-200",
  PENDING:   "bg-slate-100 text-slate-600 border-slate-200",
  TRUSTED:   "bg-green-100 text-green-700 border-green-200",
  ADMIN:     "bg-purple-100 text-purple-700 border-purple-200",
  ISSUER:    "bg-teal-100 text-teal-700 border-teal-200",
};

export default function Badge({ status, className = "" }) {
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs
                  font-medium border ${style} ${className}`}
    >
      {status}
    </span>
  );
}