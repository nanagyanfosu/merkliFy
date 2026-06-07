import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../../api/auth";
import api from "../../api/axios";
import ChangePasswordForm from "../../components/ui/ChangePasswordForm";
import Badge from "../../components/ui/Badge";
import { Settings, User, ShieldCheck, BarChart3 } from "lucide-react";

const TABS = [
  { id: "profile",  label: "Profile",    icon: User },
  { id: "security", label: "Security",   icon: ShieldCheck },
  { id: "stats",    label: "Statistics", icon: BarChart3 },
];

function avatarBg(email) {
  const colors = [
    "bg-teal-500", "bg-sky-500", "bg-violet-500",
    "bg-rose-500", "bg-amber-500", "bg-indigo-500",
  ];
  return colors[(email || "a").charCodeAt(0) % colors.length];
}

export default function IssuerSettingsPage() {
  const [tab, setTab] = useState("profile");

  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: stats }   = useQuery({
    queryKey: ["issuer-stats"],
    queryFn:  () => api.get("/issuer/stats").then(r => r.data),
    enabled:  tab === "stats",
  });

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-teal-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-slate-500 text-sm">Your issuer account</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm
                         font-medium transition-colors ${tab === id
                           ? "bg-white text-slate-800 shadow-sm"
                           : "text-slate-500 hover:text-slate-700"}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {tab === "profile" && profile && (
        <div className="space-y-4">

          {/* Avatar card */}
          <div className="card p-5 flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center
                              text-2xl font-bold text-white flex-shrink-0
                              ${avatarBg(profile.email)}`}>
              {(profile.issuer_name || profile.email)[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg">
                {profile.issuer_name || profile.email}
              </p>
              {profile.department && (
                <p className="text-teal-600 text-sm">{profile.department}</p>
              )}
              {profile.department_code && (
                <p className="font-mono text-slate-400 text-xs">
                  {profile.department_code}
                </p>
              )}
            </div>
          </div>

          {/* Institution */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase
                            tracking-wide mb-4">Institution</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <p className="text-xs text-slate-400 mb-0.5">University</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800">
                    {profile.university_name || "—"}
                  </p>
                  {profile.university_trust && (
                    <Badge status={profile.university_trust} />
                  )}
                </div>
                {profile.university_location && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {profile.university_location}
                  </p>
                )}
              </div>
              <InfoRow label="Institution Code"
                value={profile.university_code ? `#${profile.university_code}` : "—"} />
            </div>
          </div>

          {/* Account */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase
                            tracking-wide mb-4">Account</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Account ID" value={`#${profile.id}`} />
              <InfoRow
                label="Member since"
                value={new Date(profile.created_at).toLocaleDateString(undefined, {
                  year: "numeric", month: "long", day: "numeric",
                })}
              />
              <InfoRow
                label="Last login"
                value={profile.last_login
                  ? new Date(profile.last_login).toLocaleString()
                  : "First session"}
              />
            </div>
          </div>

        </div>
      )}

      {/* ── Security tab ── */}
      {tab === "security" && <ChangePasswordForm />}

      {/* ── Statistics tab ── */}
      {tab === "stats" && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard value={stats.total_batches}       label="Batches Issued" />
            <StatCard value={stats.total_certificates}  label="Certificates Issued" />
          </div>
          <p className="text-xs text-slate-400 text-center">
            Statistics reflect all batches uploaded under your institution's account.
          </p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="card p-5 text-center">
      <p className="text-4xl font-bold text-teal-600">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}