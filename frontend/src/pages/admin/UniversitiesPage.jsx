import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUniversities, registerUniversity, updateTrustStatus,
} from "../../api/admin";
import Badge from "../../components/ui/Badge";
import {
  Plus, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  MapPin, Phone, Globe, Mail,
} from "lucide-react";

export default function UniversitiesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({
    university_name: "", location: "", contact: "", domain: "",
  });
  const [registered, setRegistered] = useState(null);

  const { data: universities = [], isLoading } = useQuery({
    queryKey: ["admin-universities"],
    queryFn: listUniversities,
  });

  const registerMut = useMutation({
    mutationFn: registerUniversity,
    onSuccess: (data) => {
      setRegistered(data);
      setShowForm(false);
      setForm({ university_name: "", location: "", contact: "", domain: "" });
      qc.invalidateQueries(["admin-universities"]);
    },
  });

  const trustMut = useMutation({
    mutationFn: ({ id, status }) => updateTrustStatus(id, status),
    onSuccess: () => qc.invalidateQueries(["admin-universities"]),
  });

  const handleChange = e =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Universities</h1>
          <p className="text-slate-500 text-sm">Register and manage trusted institutions</p>
        </div>
        <button
          onClick={() => setShowForm(p => !p)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Register University
        </button>
      </div>

      {/* Success notice */}
      {registered && (
        <div className="card p-4 mb-5 border-green-200 bg-green-50">
          <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
            <CheckCircle2 className="w-4 h-4" />
            {registered.university_name} registered — Code #{registered.university_code}
          </div>
          <p className="text-sm text-green-600">
            Status is <strong>PENDING</strong>. Use the Approve button to enable
            certificate issuance.
          </p>
          <button onClick={() => setRegistered(null)}
            className="text-xs text-green-600 underline mt-1">Dismiss</button>
        </div>
      )}

      {/* Registration form */}
      {showForm && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-slate-700 mb-4">New University</h2>
          <form
            onSubmit={e => { e.preventDefault(); registerMut.mutate(form); }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="label">University Name</label>
              <input name="university_name" className="input"
                placeholder="University of Accra" value={form.university_name}
                onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Location</label>
              <input name="location" className="input"
                placeholder="Accra, Ghana" value={form.location}
                onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Contact</label>
              <input name="contact" className="input"
                placeholder="+233 XX XXX XXXX" value={form.contact}
                onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Domain</label>
              <input name="domain" className="input"
                placeholder="uni.edu.gh" value={form.domain}
                onChange={handleChange} required />
            </div>

            <div className="sm:col-span-2 flex gap-3 pt-1">
              <button type="submit" disabled={registerMut.isPending}
                className="btn-primary flex items-center gap-2">
                {registerMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Register
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="btn-secondary">Cancel</button>
            </div>
            {registerMut.isError && (
              <p className="sm:col-span-2 text-red-600 text-sm">
                {registerMut.error?.response?.data?.detail || "Registration failed."}
              </p>
            )}
          </form>
        </div>
      )}

      {/* University list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="space-y-3">
          {universities.map(u => (
            <div key={u.id} className="card overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{u.university_name}</p>
                    <span className="font-mono text-xs text-slate-400 bg-slate-100
                                     px-2 py-0.5 rounded-full">
                      #{u.university_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {u.location}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge status={u.trust_status} />

                  {/* Trust actions */}
                  {u.trust_status !== "TRUSTED" && (
                    <button
                      onClick={() => trustMut.mutate({ id: u.id, status: "TRUSTED" })}
                      className="flex items-center gap-1 text-xs font-medium
                                 text-green-600 hover:text-green-800 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  )}
                  {u.trust_status === "TRUSTED" && (
                    <button
                      onClick={() => trustMut.mutate({ id: u.id, status: "REVOKED" })}
                      className="flex items-center gap-1 text-xs font-medium
                                 text-red-500 hover:text-red-700 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Revoke Trust
                    </button>
                  )}

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {expanded === u.id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === u.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4
                                 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <InfoRow icon={Phone}  label="Contact"  value={u.contact} />
                  <InfoRow icon={Globe}  label="Domain"   value={u.domain} />
                  <div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs mb-1.5">
                      <Mail className="w-3 h-3" />
                      <span className="font-medium uppercase tracking-wide">
                        Issuer Accounts
                      </span>
                    </div>
                    {u.issuers?.length ? (
                      u.issuers.map(iss => (
                        <p key={iss.id} className="text-slate-700 text-xs py-0.5">
                          {iss.email}
                          {iss.is_temp_password && (
                            <span className="ml-2 text-amber-500 text-xs">(temp password)</span>
                          )}
                        </p>
                      ))
                    ) : (
                      <p className="text-slate-400 text-xs italic">No issuers yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
        <Icon className="w-3 h-3" />
        <span className="font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-slate-700">{value}</p>
    </div>
  );
}