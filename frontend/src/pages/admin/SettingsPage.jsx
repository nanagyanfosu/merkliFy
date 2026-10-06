import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../../api/auth";
import { getRecentActivity } from "../../api/admin";
import ChangePasswordForm from "../../components/ui/ChangePasswordForm";
import {
  Settings, User, ShieldCheck, Activity, Link, Upload, Trash2,
} from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

const TABS = [
  { id: "profile",  label: "Profile",  icon: User },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "activity", label: "Activity", icon: Activity },
];

const STATUS_COLORS = {
  REVOKED:   "text-red-600 bg-red-50",
  SUSPENDED: "text-amber-600 bg-amber-50",
  ACTIVE:    "text-green-600 bg-green-50",
};

export default function AdminSettingsPage() {
  const [tab, setTab] = useState("profile");

  const { data: profile }  = useQuery({ queryKey: ["me"],    queryFn: getMe });
  const { data: activity } = useQuery({
    queryKey: ["admin-activity"],
    queryFn:  getRecentActivity,
    enabled:  tab === "activity",
    refetchInterval: 60_000,   // refresh every minute when visible
  });
  

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-sky-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-slate-500 text-sm">Administrator account</p>
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
          {/* Avatar + identity */}
          <div className="card p-5 flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center
                              text-2xl font-bold text-white flex-shrink-0
                              ${avatarBg(profile.email)}`}>
              {profile.email[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg">{profile.email}</p>
              <p className="text-sky-600 text-sm font-medium">Administrator</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Account #{profile.id}
              </p>
            </div>
          </div>

          {/* Account details */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase
                            tracking-wide mb-4">Account Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="Member since"
                value={new Date(profile.created_at).toLocaleDateString(undefined, {
                  year: "numeric", month: "long", day: "numeric"
                })} />
              <InfoRow
                label="Last login"
                value={profile.last_login
                  ? new Date(profile.last_login).toLocaleString()
                  : "First session"
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Security tab ── */}
      {tab === "security" && <ChangePasswordForm />}

      {/* ── Activity tab ── */}
      {tab === "activity" && (
        <div className="space-y-5">

          {/* Pending approvals */}
          {activity?.pending_approvals?.length > 0 && (
            <ActivitySection
              title="Pending University Approvals"
              count={activity.pending_approvals.length}
              accent="amber"
            >
              {activity.pending_approvals.map(u => (
                <div key={u.id} className="flex items-center justify-between
                                            py-2.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {u.university_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      #{u.university_code} · {u.location}
                    </p>
                  </div>
                  <RouterLink to="/admin/universities"
                    className="text-xs text-amber-600 font-medium hover:underline">
                    Review →
                  </RouterLink>
                </div>
              ))}
            </ActivitySection>
          )}

          {/* Issuers awaiting setup */}
          {activity?.pending_issuers?.length > 0 && (
            <ActivitySection
              title="Issuers Awaiting First Login"
              count={activity.pending_issuers.length}
              accent="blue"
            >
              {activity.pending_issuers.map(iss => (
                <div key={iss.id} className="py-2.5 border-b border-slate-50 last:border-0">
                  <p className="text-sm font-medium text-slate-800">{iss.email}</p>
                  <p className="text-xs text-slate-400">
                    {iss.university_name}
                    {iss.department ? ` · ${iss.department}` : ""}
                    {" · created "}{new Date(iss.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </ActivitySection>
          )}

          {/* Batch lifecycle events */}
          <ActivitySection
            title="Batch Uploads and Deletions"
            count={activity?.batch_events?.length ?? 0}
            accent="teal"
          >
            {activity?.batch_events?.length === 0 ? (
              <p className="text-slate-400 text-sm py-2">
                No batch uploads or deletions recorded yet.
              </p>
            ) : (
              activity?.batch_events?.map((event, i) => {
                const uploaded = event.event_type === "BATCH_UPLOADED";
                return (
                  <div key={`${event.created_at}-${event.batch_id}-${i}`}
                       className="flex items-start gap-3 py-2.5
                                  border-b border-slate-50 last:border-0">
                    <span className={`p-1.5 rounded-lg flex-shrink-0 ${
                      uploaded
                        ? "bg-teal-50 text-teal-600"
                        : "bg-red-50 text-red-600"
                    }`}>
                      {uploaded
                        ? <Upload className="w-3.5 h-3.5" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {uploaded ? "Batch uploaded" : "Batch deleted"}:{" "}
                        <span className="font-semibold">{event.batch_name}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {event.university_name} · {event.certificate_count}{" "}
                        certificate{event.certificate_count === 1 ? "" : "s"}
                        {" · by "}{event.actor_email}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </ActivitySection>

          {/* Recent status changes */}
          <ActivitySection
            title="Recent Certificate Status Changes"
            count={activity?.status_changes?.length ?? 0}
            accent="slate"
          >
            {activity?.status_changes?.length === 0 ? (
              <p className="text-slate-400 text-sm py-2">No recent changes.</p>
            ) : (
              activity?.status_changes?.map((c, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5
                                         border-b border-slate-50 last:border-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                                    flex-shrink-0 mt-0.5 ${STATUS_COLORS[c.new_status] || ""}`}>
                    {c.new_status}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {c.fullname}
                      <span className="font-mono text-slate-400 text-xs ml-1">
                        {c.serial_number}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {c.changed_by} · {new Date(c.changed_at).toLocaleString()}
                    </p>
                    {c.reason && (
                      <p className="text-xs italic text-slate-500">"{c.reason}"</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </ActivitySection>

          {/* Anomalous verifications */}
          {activity?.anomalies?.length > 0 && (
            <ActivitySection
              title="Anomalous Verification Attempts"
              count={activity.anomalies.length}
              accent="red"
            >
              {activity.anomalies.map((a, i) => (
                <div key={i} className="py-2.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-red-600 bg-red-50
                                      px-2 py-0.5 rounded-full">
                      {a.result}
                    </span>
                    <p className="text-xs text-slate-400">{a.ip_address}</p>
                  </div>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {a.fullname}
                    <span className="font-mono text-slate-400 text-xs ml-1">
                      {a.serial_number}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(a.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </ActivitySection>
          )}

        </div>
      )}
    </div>
  );
}

function ActivitySection({ title, count, accent, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center
                       justify-between">
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
        {count > 0 && (
          <span className="text-xs font-bold bg-slate-100 text-slate-600
                            px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      <div className="px-5">{children}</div>
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

// Derives a consistent background colour from the first character of email
function avatarBg(email) {
  const colors = [
    "bg-sky-500", "bg-violet-500", "bg-teal-500",
    "bg-rose-500", "bg-amber-500", "bg-indigo-500",
  ];
  return colors[email.charCodeAt(0) % colors.length];
}