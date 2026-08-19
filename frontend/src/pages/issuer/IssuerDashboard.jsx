import { useQuery } from "@tanstack/react-query";
import { listBatches, getAllCertificates } from "../../api/issuer";
import { getMe } from "../../api/auth";
import api from "../../api/axios";
import { Link } from "react-router-dom";
import {
  Upload, FolderOpen, Search, ShieldCheck,
  XCircle, Clock, TrendingUp, Hash,
  ChevronRight, AlertTriangle, CheckCircle2,
} from "lucide-react";

export default function IssuerDashboard() {
  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn:  getMe,
  });

  const { data: batches = [] } = useQuery({
    queryKey: ["issuer-batches", {}],
    queryFn:  () => listBatches({}),
  });

  const { data: stats } = useQuery({
    queryKey: ["issuer-stats"],
    queryFn:  () => api.get("/issuer/stats").then(r => r.data),
  });

  const { data: statusStats } = useQuery({
    queryKey: ["issuer-status-stats"],
    queryFn:  () => api.get("/issuer/status-stats").then(r => r.data),
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["issuer-recent-activity"],
    queryFn:  () => api.get("/issuer/recent-activity").then(r => r.data),
    refetchInterval: 60_000,
  });

  const recentBatches = batches.slice(0, 3);
  const totalCerts   = stats?.total_certificates || 0;
  const totalBatches = stats?.total_batches || 0;

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {profile?.university_name || "Dashboard"}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {profile?.department
            ? `${profile.department} · `
            : ""}
          {profile?.email}
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MiniStat
          icon={Hash}
          color="teal"
          label="Certificates Issued"
          value={totalCerts}
        />
        <MiniStat
          icon={FolderOpen}
          color="blue"
          label="Batches Uploaded"
          value={totalBatches}
        />
        <MiniStat
          icon={CheckCircle2}
          color="green"
          label="Active Certificates"
          value={statusStats?.active || 0}
        />
        <MiniStat
          icon={XCircle}
          color="red"
          label="Revoked / Suspended"
          value={(statusStats?.revoked || 0) + (statusStats?.suspended || 0)}
          sub={statusStats?.revoked > 0 || statusStats?.suspended > 0
            ? `${statusStats?.revoked || 0} revoked · ${statusStats?.suspended || 0} suspended`
            : null}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          {
            to:    "/issuer/upload",
            icon:  Upload,
            label: "Upload New Batch",
            sub:   "CSV or JSON",
            color: "teal",
          },
          {
            to:    "/issuer/certificates",
            icon:  Search,
            label: "Search Certificates",
            sub:   "By name or serial",
            color: "blue",
          },
          {
            to:    "/issuer/batches",
            icon:  FolderOpen,
            label: "View All Batches",
            sub:   `${totalBatches} total`,
            color: "slate",
          },
        ].map(({ to, icon: Icon, label, sub, color }) => {
          const colors = {
            teal:  "bg-teal-50 text-teal-600 hover:bg-teal-100",
            blue:  "bg-sky-50  text-sky-600  hover:bg-sky-100",
            slate: "bg-slate-50 text-slate-600 hover:bg-slate-100",
          };
          return (
            <Link key={to} to={to}
              className={`flex items-center gap-3 p-4 rounded-xl
                           border border-slate-200 hover:border-slate-300
                           transition-all group`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center
                                justify-center flex-shrink-0 ${colors[color]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{label}</p>
                <p className="text-xs text-slate-400">{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 ml-auto
                                        group-hover:text-slate-400" />
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent batches */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4
                           border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 text-sm">
              Recent Batches
            </h2>
            <Link to="/issuer/batches"
              className="text-xs text-teal-600 hover:underline">
              View all →
            </Link>
          </div>

          {recentBatches.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <FolderOpen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No batches yet.</p>
              <Link to="/issuer/upload"
                className="text-teal-600 text-sm hover:underline mt-1 block">
                Upload your first batch →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentBatches.map(b => (
                <Link key={b.batch_id}
                  to={`/issuer/batches/${b.batch_id}`}
                  className="flex items-center gap-4 px-5 py-3.5
                               hover:bg-slate-50 transition-colors"
                >
                  <div className="bg-teal-50 p-2 rounded-lg flex-shrink-0">
                    <Hash className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">
                      {b.batch_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {b.academic_year} · {b.total_certificates} certificate
                      {b.total_certificates !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(b.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity feed */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4
                           border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 text-sm">
              Recent Activity
            </h2>
            <Link to="/issuer/certificates"
              className="text-xs text-teal-600 hover:underline">
              All certificates →
            </Link>
          </div>

          {!recentActivity?.length ? (
            <div className="px-5 py-8 text-center">
              <p className="text-slate-400 text-sm">
                No recent status changes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentActivity.slice(0, 5).map((item, i) => (
                <div key={i}
                  className="flex items-start gap-3 px-5 py-3.5">
                  <StatusIcon status={item.new_status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {item.fullname}
                    </p>
                    <p className="text-xs text-slate-400">
                      {item.old_status} → {item.new_status}
                      {item.reason ? ` · "${item.reason}"` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(item.changed_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Certificate status breakdown */}
        {statusStats && (
          <div className="bg-white border border-slate-200 rounded-xl p-5
                           lg:col-span-2">
            <h2 className="font-semibold text-slate-700 text-sm mb-4">
              Certificate Status Breakdown
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: "Active",
                  value: statusStats.active || 0,
                  color: "text-teal-600",
                  bg:    "bg-teal-50",
                },
                {
                  label: "Revoked",
                  value: statusStats.revoked || 0,
                  color: "text-red-600",
                  bg:    "bg-red-50",
                },
                {
                  label: "Suspended",
                  value: statusStats.suspended || 0,
                  color: "text-amber-600",
                  bg:    "bg-amber-50",
                },
              ].map(({ label, value, color, bg }) => (
                <div key={label}
                  className={`${bg} rounded-xl p-4 text-center`}>
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Visual bar */}
            {totalCerts > 0 && (
              <div className="mt-4 h-2 rounded-full bg-slate-100
                               overflow-hidden flex">
                <div
                  className="bg-teal-400 h-full transition-all"
                  style={{
                    width: `${((statusStats.active || 0) / totalCerts) * 100}%`
                  }}
                />
                <div
                  className="bg-amber-400 h-full transition-all"
                  style={{
                    width: `${((statusStats.suspended || 0) / totalCerts) * 100}%`
                  }}
                />
                <div
                  className="bg-red-400 h-full transition-all"
                  style={{
                    width: `${((statusStats.revoked || 0) / totalCerts) * 100}%`
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, color, label, value, sub }) {
  const colors = {
    teal:  "bg-teal-50  text-teal-600",
    blue:  "bg-sky-50   text-sky-600",
    green: "bg-green-50 text-green-600",
    red:   "bg-red-50   text-red-600",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                        mb-3 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusIcon({ status }) {
  const map = {
    REVOKED:   { icon: XCircle,      cls: "text-red-500 bg-red-50"   },
    SUSPENDED: { icon: Clock,        cls: "text-amber-500 bg-amber-50" },
    ACTIVE:    { icon: CheckCircle2, cls: "text-teal-500 bg-teal-50"  },
  };
  const cfg  = map[status] || map.ACTIVE;
  const Icon = cfg.icon;
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center
                      flex-shrink-0 ${cfg.cls}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
  );
}