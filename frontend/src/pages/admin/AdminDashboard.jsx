import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDashboardSummary, approvePendingRegistration,
  rejectPendingRegistration,
} from "../../api/admin";
import { Link } from "react-router-dom";
import {
  FileCheck, Building2, Users, ShieldCheck,
  ChevronRight, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

export default function AdminDashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey:         ["admin-dashboard-summary"],
    queryFn:          getDashboardSummary,
    refetchInterval:  60_000,
    staleTime:        0,
  });

  const approveMut = useMutation({
    mutationFn: approvePendingRegistration,
    onSuccess:  () => qc.refetchQueries({ queryKey: ["admin-dashboard-summary"] }),
  });
  const rejectMut = useMutation({
    mutationFn: rejectPendingRegistration,
    onSuccess:  () => qc.refetchQueries({ queryKey: ["admin-dashboard-summary"] }),
  });

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent
                       rounded-full animate-spin" />
    </div>
  );

  const { universities, issuers, activity } = data || {};

  const verifyDelta = (activity?.verifications_today || 0) -
                      (activity?.verifications_yesterday || 0);

  const successRate = activity?.verifications_today > 0
    ? Math.round(
        ((activity.authentic_today || 0) / activity.verifications_today) * 100
      )
    : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">System overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={FileCheck}
          color="teal"
          label="Verifiable Certificates"
          value={(activity?.total_certificates_system || 0).toLocaleString()}
          sub="across all institutions"
        />
        <StatCard
          icon={Building2}
          color="blue"
          label="Institutions"
          value={universities?.total || 0}
          sub={`${universities?.trusted || 0} trusted`}
          subAlert={universities?.pending > 0}
        />
        <StatCard
          icon={Users}
          color="indigo"
          label="Issuer Accounts"
          value={issuers?.total || 0}
          sub={issuers?.pending_login > 0
            ? `${issuers.pending_login} awaiting first login`
            : "all active"}
          subAlert={issuers?.pending_login > 0}
        />
        <StatCard
          icon={ShieldCheck}
          color="green"
          label="Verification Success Rate"
          value={successRate !== null ? `${successRate}%` : "-"}
          sub={`${activity?.verifications_today || 0} checks today`}
          trend={verifyDelta >= 0 ? "up" : "down"}
          trendVal={verifyDelta}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {universities?.pending_list?.length > 0 && (
          <SummaryCard
            title="Pending University Approvals"
            count={universities.pending_list.length}
            accent="amber"
          >
            {universities.pending_list.map(u => (
              <div key={u.id}
                className="flex items-center justify-between py-2.5
                             border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {u.university_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {u.location} · #{u.university_code}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMut.mutate(u.id)}
                    className="text-xs font-semibold text-white bg-teal-600
                                hover:bg-teal-700 px-2.5 py-1 rounded-lg"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectMut.mutate(u.id)}
                    className="text-xs font-semibold text-red-600 border
                                border-red-200 hover:bg-red-50 px-2.5 py-1
                                rounded-lg"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </SummaryCard>
        )}

        {issuers?.pending_list?.length > 0 && (
          <SummaryCard
            title="Issuers Awaiting First Login"
            count={issuers.pending_list.length}
            accent="blue"
          >
            {issuers.pending_list.map(iss => (
              <div key={iss.id}
                className="py-2.5 border-b border-slate-50 last:border-0">
                <p className="text-sm font-medium text-slate-800">
                  {iss.email}
                </p>
                <p className="text-xs text-slate-400">
                  {iss.university_name}
                  {iss.department ? ` · ${iss.department}` : ""}
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Created {new Date(iss.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </SummaryCard>
        )}

        <SummaryCard
          title="Trusted Institutions"
          count={universities?.trusted_list?.length || 0}
          accent="green"
          link={{ to: "/admin/universities", label: "Manage" }}
        >
          {(!universities?.trusted_list?.length) ? (
            <p className="text-slate-400 text-sm py-2">
              No trusted institutions yet.
            </p>
          ) : (
            universities.trusted_list.map(u => (
              <Link key={u.id} to="/admin/universities"
                className="flex items-center justify-between py-2.5
                             border-b border-slate-50 last:border-0
                             hover:opacity-75 transition-opacity">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {u.university_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {u.location} · #{u.university_code}
                  </p>
                </div>
                <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
              </Link>
            ))
          )}
        </SummaryCard>

        <SummaryCard
          title="Today's Verification Activity"
          accent="slate"
          link={{ to: "/admin/logs", label: "View logs" }}
        >
          <div className="space-y-3 py-1">
            <ActivityRow label="Verifications today"
              value={activity?.verifications_today || 0} />
            <ActivityRow label="Successful (AUTHENTIC)"
              value={activity?.authentic_today || 0} color="teal" />
            <ActivityRow label="Yesterday's total"
              value={activity?.verifications_yesterday || 0} muted />
          </div>
        </SummaryCard>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, sub, subAlert, trend, trendVal }) {
  const colors = {
    teal:   { bg: "bg-teal-50",   icon: "text-teal-600"   },
    blue:   { bg: "bg-sky-50",    icon: "text-sky-600"    },
    indigo: { bg: "bg-indigo-50", icon: "text-indigo-600" },
    green:  { bg: "bg-green-50",  icon: "text-green-600"  },
  };
  const c = colors[color];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className={`w-9 h-9 ${c.bg} rounded-lg flex items-center
                        justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${c.icon}`} />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && (
        <p className={`text-xs mt-1.5 font-medium ${
          subAlert    ? "text-amber-600" :
          trend === "up"   ? "text-green-600" :
          trend === "down" ? "text-red-500" :
                             "text-slate-400"
        }`}>
          {trend === "up" && trendVal > 0 &&
            <ArrowUpRight className="w-3 h-3 inline mr-0.5" />}
          {trend === "down" &&
            <ArrowDownRight className="w-3 h-3 inline mr-0.5" />}
          {sub}
        </p>
      )}
    </div>
  );
}

function SummaryCard({ title, count, accent, link, children }) {
  const accents = {
    amber: "border-l-amber-300",
    blue:  "border-l-sky-300",
    green: "border-l-teal-300",
    slate: "border-l-slate-200",
    red:   "border-l-red-300",
  };
  return (
    <div className={`bg-white border border-slate-200 rounded-xl
                      overflow-hidden border-l-4 ${accents[accent] || accents.slate}`}>
      <div className="flex items-center justify-between px-5 py-4
                       border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-700 text-sm">{title}</h2>
          {count > 0 && (
            <span className="text-xs font-bold bg-slate-100 text-slate-500
                              px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        {link && (
          <Link to={link.to}
            className="text-xs text-sky-600 hover:underline flex items-center gap-1">
            {link.label}
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

function ActivityRow({ label, value, color, muted }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${muted ? "text-slate-400" : "text-slate-600"}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${
        color === "teal" ? "text-teal-600" : "text-slate-800"
      }`}>
        {value}
      </span>
    </div>
  );
}
