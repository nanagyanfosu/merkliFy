import { useQuery } from "@tanstack/react-query";
import { listUniversities } from "../../api/admin";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import {
  University, ShieldCheck, Users, ChevronRight, Plus,
} from "lucide-react";

export default function AdminDashboard() {
  const { data: universities = [] } = useQuery({
    queryKey: ["admin-universities"],
    queryFn: listUniversities,
  });

  const trusted   = universities.filter(u => u.trust_status === "TRUSTED");
  const pending   = universities.filter(u => u.trust_status === "PENDING");
  const totalIssuers = universities.reduce((s, u) => s + (u.issuers?.length || 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">System overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={University}  color="blue"
          label="Registered Universities" value={universities.length} />
        <StatCard icon={ShieldCheck} color="green"
          label="Trusted Universities"    value={trusted.length} />
        <StatCard icon={Users}       color="teal"
          label="Total Issuer Accounts"   value={totalIssuers} />
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="card p-5 mb-6 border-amber-200 bg-amber-50">
          <h2 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Pending Approval ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map(u => (
              <div key={u.id} className="flex items-center justify-between
                                         bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                <div>
                  <p className="font-medium text-sm text-slate-800">{u.university_name}</p>
                  <p className="text-xs text-slate-400">{u.location}</p>
                </div>
                <Link
                  to="/admin/universities"
                  className="text-xs text-amber-600 font-medium hover:underline"
                >
                  Review →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trusted universities */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Trusted Universities</h2>
          <Link
            to="/admin/universities"
            className="flex items-center gap-1 text-sm text-sky-600 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Register new
          </Link>
        </div>

        {trusted.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-400 text-sm">
            No trusted universities yet.{" "}
            <Link to="/admin/universities" className="text-sky-600 hover:underline">
              Register and approve one.
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {trusted.map(u => (
              <div key={u.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                <div className="bg-sky-100 p-2 rounded-lg flex-shrink-0">
                  <University className="w-4 h-4 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800">{u.university_name}</p>
                  <p className="text-xs text-slate-400">{u.location}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">
                    {u.issuers?.length || 0} issuer{(u.issuers?.length || 0) !== 1 ? "s" : ""}
                  </p>
                  <p className="font-mono text-xs text-slate-400">#{u.university_code}</p>
                </div>
                <Badge status="TRUSTED" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value }) {
  const colors = {
    blue:  { bg: "bg-sky-100",   icon: "text-sky-600"   },
    green: { bg: "bg-green-100", icon: "text-green-600" },
    teal:  { bg: "bg-teal-100",  icon: "text-teal-600"  },
  };
  const c = colors[color];
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`${c.bg} p-3 rounded-xl`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}