import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary, getPendingRegistrations,
         approvePendingRegistration, rejectPendingRegistration }
  from "../../api/admin";
import { Link } from "react-router-dom";
import {
  University, ShieldCheck, Users, AlertTriangle,
  Clock, FileUp, TrendingUp, ChevronRight,
  ArrowUpRight, ArrowDownRight, Globe
} from "lucide-react";

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-summary"],
    queryFn:  getDashboardSummary,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent
                         rounded-full animate-spin" />
      </div>
    );
  }

  const { universities, issuers, activity } = data || {};
  const verifyDelta  = (activity?.verifications_today || 0) -
                     (activity?.verifications_yesterday || 0);
  const authenticRate = activity?.verifications_today > 0
  ? Math.round(
      ((activity?.authentic_today || 0) / activity.verifications_today) * 100
    )
  : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          System overview — live
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

  {/* Card 1: Platform reach */}
  <StatCard
    icon={Globe}
    color="teal"
    label="Total Verifiable Certificates"
    value={activity?.total_certificates_system || "—"}
    sub="across all institutions"
  />

  {/* Card 2: Verification health */}
  <StatCard
    icon={ShieldCheck}
    color="green"
    label="Verification Success Rate"
    value={authenticRate !== null ? `${authenticRate}%` : "—"}
    sub={`${activity?.verifications_today || 0} checks today`}
  />

  {/* Card 3: Anomalies */}
  <StatCard
    icon={AlertTriangle}
    color={activity?.anomalies_last_24h > 0 ? "red" : "slate"}
    label="Anomalies (24h)"
    value={activity?.anomalies_last_24h ?? 0}
    sub={activity?.anomalies_last_24h > 0
      ? "Review verification logs"
      : "No issues detected"}
    subAlert={activity?.anomalies_last_24h > 0}
  />

  {/* Card 4: Recent uploads */}
  <StatCard
    icon={FileUp}
    color="indigo"
    label="Batches This Week"
    value={activity?.batches_last_7_days ?? 0}
    sub={`${activity?.status_changes_last_7_days || 0} status changes`}
  />
</div>

      {/* Alert strip — anomalies */}
      {activity?.anomalies_last_24h > 0 && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border
                         border-red-200 rounded-xl px-5 py-3.5">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-semibold">
              {activity.anomalies_last_24h} anomalous verification
              {activity.anomalies_last_24h !== 1 ? "s" : ""}
            </span>
            {" "}detected in the last 24 hours.{" "}
            <Link to="/admin/logs"
              className="underline hover:no-underline">
              View logs →
            </Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Pending university approvals */}
        <SummaryCard
          title="Pending University Approvals"
          count={universities?.pending_list?.length || 0}
          linkTo="/admin/universities"
          linkLabel="Manage universities"
          emptyMessage="No universities awaiting approval."
        >
          {universities?.pending_list?.map(u => (
            <Link key={u.id}
              to="/admin/universities"
              className="flex items-center justify-between py-2.5
                          border-b border-slate-50 last:border-0
                          hover:opacity-75 transition-opacity"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {u.university_name}
                </p>
                <p className="text-xs text-slate-400">
                  {u.location} · #{u.university_code}
                </p>
              </div>
              <span className="text-xs text-amber-600 font-medium
                                bg-amber-50 border border-amber-200
                                px-2 py-0.5 rounded-full">
                Pending
              </span>
            </Link>
          ))}
        </SummaryCard>

        {/* Issuers awaiting first login */}
        <SummaryCard
          title="Issuers Awaiting First Login"
          count={issuers?.pending_list?.length || 0}
          linkTo="/admin/issuers"
          linkLabel="Manage issuers"
          emptyMessage="All issuer accounts have completed first login."
        >
          {issuers?.pending_list?.map(iss => (
            <Link key={iss.id}
              to={`/admin/issuers`}
              className="flex items-center justify-between py-2.5
                          border-b border-slate-50 last:border-0
                          hover:opacity-75 transition-opacity"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {iss.email}
                </p>
                <p className="text-xs text-slate-400">
                  {iss.university_name}
                  {iss.department ? ` · ${iss.department}` : ""}
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Created by {iss.created_by} on{" "}
                  {new Date(iss.created_at).toLocaleDateString()}
                </p>
              </div>
              <Clock className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 ml-3" />
            </Link>
          ))}
        </SummaryCard>

        {/* Activity summary */}
        <SummaryCard
          title="Recent Activity"
          linkTo="/admin/settings"
          linkLabel="View full activity"
        >
          <div className="space-y-3 py-1">
            <ActivityRow
              icon={FileUp}
              label="Batches uploaded"
              value={activity?.batches_last_7_days || 0}
              sub="last 7 days"
            />
            <ActivityRow
              icon={ShieldCheck}
              label="Verifications"
              value={activity?.verifications_today || 0}
              sub="today"
            />
            <ActivityRow
              icon={AlertTriangle}
              label="Anomalies"
              value={activity?.anomalies_last_24h || 0}
              sub="last 24 hours"
              alert={activity?.anomalies_last_24h > 0}
            />
            <ActivityRow
              icon={Clock}
              label="Status changes"
              value={activity?.status_changes_last_7_days || 0}
              sub="last 7 days"
            />
          </div>
        </SummaryCard>

        {/* Trusted universities quick list */}
        <SummaryCard
          title="Trusted Universities"
          count={universities?.trusted || 0}
          linkTo="/admin/universities"
          linkLabel="View all"
        >
          {universities?.pending_list?.length === 0 &&
           universities?.trusted > 0 && (
            <p className="text-sm text-slate-400 py-2">
              All {universities.trusted} university
              {universities.trusted !== 1 ? "ies" : ""}
              {" "}are trusted.{" "}
              <Link to="/admin/universities"
                className="text-sky-600 hover:underline">
                View →
              </Link>
            </p>
          )}
        </SummaryCard>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, sub, subAlert, trend }) {
  const colors = {
    blue:   { bg: "bg-sky-50",    icon: "text-sky-600"   },
    green:  { bg: "bg-green-50",  icon: "text-green-600" },
    teal:   { bg: "bg-teal-50",   icon: "text-teal-600"  },
    indigo: { bg: "bg-indigo-50", icon: "text-indigo-600" },
    red:    { bg: "bg-red-50",    icon: "text-red-600"    },
    slate:  { bg: "bg-slate-50",  icon: "text-slate-500"  },
  };
  const c = colors[color] || { bg: "bg-slate-50", icon: "text-slate-500" };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className={`w-9 h-9 ${c.bg} rounded-lg flex items-center
                        justify-center mb-3`}>
        <Icon className={`w-4.5 h-4.5 ${c.icon}`} />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && (
        <p className={`text-xs mt-1.5 font-medium ${
          subAlert
            ? "text-amber-600"
            : trend === "up"
            ? "text-green-600"
            : trend === "down"
            ? "text-red-500"
            : "text-slate-400"
        }`}>
          {trend === "up" && <ArrowUpRight className="w-3 h-3 inline mr-0.5" />}
          {trend === "down" && <ArrowDownRight className="w-3 h-3 inline mr-0.5" />}
          {sub}
        </p>
      )}
    </div>
  );
}

function SummaryCard({ title, count, linkTo, linkLabel, emptyMessage, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
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
        {linkTo && (
          <Link to={linkTo}
            className="text-xs text-sky-600 hover:underline flex items-center gap-1">
            {linkLabel}
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="px-5 py-3">
        {(!children || (Array.isArray(children) && children.every(c => !c))) && emptyMessage ? (
          <p className="text-sm text-slate-400 py-2">{emptyMessage}</p>
        ) : children}
      </div>
    </div>
  );
}

function ActivityRow({ icon: Icon, label, value, sub, alert }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Icon className={`w-3.5 h-3.5 ${
          alert ? "text-red-500" : "text-slate-400"
        }`} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <div className="text-right">
        <span className={`text-sm font-semibold ${
          alert && value > 0 ? "text-red-600" : "text-slate-800"
        }`}>
          {value}
        </span>
        <span className="text-xs text-slate-400 ml-1">{sub}</span>
      </div>
    </div>
  );
}

function PendingRegistrationsCard() {
  const qc = useQueryClient();
  const { data: regs = [] } = useQuery({
    queryKey: ["pending-registrations"],
    queryFn:  getPendingRegistrations,
  });

  const approveMut = useMutation({
    mutationFn: approvePendingRegistration,
    onSuccess: () => qc.invalidateQueries(["pending-registrations"]),
  });

  const rejectMut = useMutation({
    mutationFn: rejectPendingRegistration,
    onSuccess: () => qc.invalidateQueries(["pending-registrations"]),
  });

  if (regs.length === 0) return null;

  return (
    <div className="bg-white border-2 border-amber-200 rounded-xl
                     overflow-hidden mb-5">
      <div className="px-5 py-3 bg-amber-50 border-b border-amber-100
                       flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <h2 className="font-semibold text-amber-800 text-sm">
          Institution Requests ({regs.length})
        </h2>
      </div>
      <div className="divide-y divide-slate-50">
        {regs.map(r => (
          <div key={r.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm">
                  {r.university_name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {r.institution_type} · {r.location}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {r.contact_name} ({r.contact_role}) · {r.official_email}
                </p>
                {r.website_url && (
                  <a href={r.website_url} target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-600 hover:underline mt-0.5 block">
                    {r.website_url}
                  </a>
                )}
                {r.notes && (
                  <p className="text-xs text-slate-400 italic mt-1">
                    "{r.notes}"
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => approveMut.mutate(r.id)}
                  disabled={approveMut.isPending}
                  className="text-xs font-semibold text-white
                              bg-teal-600 hover:bg-teal-700
                              px-3 py-1.5 rounded-lg disabled:opacity-50
                              transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => rejectMut.mutate(r.id)}
                  disabled={rejectMut.isPending}
                  className="text-xs font-semibold text-red-600
                              border border-red-200 hover:bg-red-50
                              px-3 py-1.5 rounded-lg transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}