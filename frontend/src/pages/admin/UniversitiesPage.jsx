import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUniversities, updateUniversity, trustUniversity,
  createUniversity,
} from "../../api/admin";
import Badge from "../../components/ui/Badge";
import { getErrorMessage } from "../../utils/errors";
import {
  Building2, ChevronDown, ChevronUp, Pencil, X,
  Check, Loader2, Globe, Phone, Mail, Calendar,
  Users, Plus,
} from "lucide-react";

const INSTITUTION_TYPES = [
  "University", "Polytechnic", "College",
  "Professional Institution", "Vocational Institute", "Other",
];

const EMPTY_CREATE = {
  university_name: "", institution_type: "University",
  location: "", official_email: "", phone: "",
  website_url: "", domain: "", year_established: "",
  student_population: "",
};

export default function UniversitiesPage() {
  const qc = useQueryClient();

  const [detailUni,    setDetailUni]    = useState(null);
  const [editingUni,   setEditingUni]   = useState(null);
  const [editForm,     setEditForm]     = useState({});
  const [showCreate,   setShowCreate]   = useState(false);
  const [createForm,   setCreateForm]   = useState(EMPTY_CREATE);
  const [saveMsg,      setSaveMsg]      = useState("");
  const [saveError,    setSaveError]    = useState("");

  const { data: universities = [], isLoading } = useQuery({
    queryKey:  ["admin-universities"],
    queryFn:   listUniversities,
    staleTime: 0,
  });

  const trustMut = useMutation({
    mutationFn: ({ id, status }) => trustUniversity(id, status),
    onSuccess:  () => qc.refetchQueries({ queryKey: ["admin-universities"] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateUniversity(id, data),
    onSuccess: async () => {
      // refetchQueries waits for the server response before updating the UI
      await qc.refetchQueries({ queryKey: ["admin-universities"] });
      setEditingUni(null);
      setEditForm({});
      setSaveError("");
      setSaveMsg("Changes saved successfully.");
      setTimeout(() => setSaveMsg(""), 4000);
    },
    onError: (err) => {
      setSaveError(
        getErrorMessage(err, "We couldn't save the changes. Please try again.")
      );
    },
  });

  const createMut = useMutation({
    mutationFn: (data) => createUniversity(data),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["admin-universities"] });
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
      setSaveMsg("University registered successfully.");
      setTimeout(() => setSaveMsg(""), 4000);
    },
    onError: (err) => {
      setSaveError(
        getErrorMessage(err, "We couldn't register the institution. Please try again.")
      );
    },
  });

  // Use ?? so null values from the server become empty strings,
  // preventing the form from showing "null" or being uncontrolled
  const startEditing = (u) => {
    setSaveError("");
    setEditingUni(u.id);
    setEditForm({
      university_name:    u.university_name    ?? "",
      institution_type:   u.institution_type   ?? "University",
      location:           u.location           ?? "",
      official_email:     u.official_email     ?? "",
      phone:              u.phone              ?? "",
      website_url:        u.website_url        ?? "",
      domain:             u.domain             ?? "",
      year_established:   u.year_established   != null ? String(u.year_established) : "",
      student_population: u.student_population != null ? String(u.student_population) : "",
    });
  };

  const cancelEditing = () => {
    setEditingUni(null);
    setEditForm({});
    setSaveError("");
  };

  const saveEditing = (id) => {
    setSaveError("");
    // Send ALL fields including empty strings as null
    // so the server can clear previously-set values
    const payload = {};
    Object.entries(editForm).forEach(([key, val]) => {
      if (key === "year_established" || key === "student_population") {
        payload[key] = val !== "" ? parseInt(val, 10) : null;
      } else {
        // Send empty string as null so the server clears the field
        payload[key] = val !== "" ? val : null;
      }
    });
    // Remove null entries for fields that were never shown
    // (university_name and domain are always required — keep them)
    updateMut.mutate({ id, data: payload });
  };

  const inp = "w-full px-3 py-2 border border-slate-200 rounded-lg " +
              "text-sm bg-white focus:outline-none focus:ring-2 " +
              "focus:ring-sky-500";

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Universities</h1>
          <p className="text-slate-500 text-sm">
            {universities.length} registered institution
            {universities.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(p => !p); setSaveError(""); }}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700
                      text-white text-sm font-semibold px-4 py-2.5
                      rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Register University
        </button>
      </div>

      {/* Global messages */}
      {saveMsg && (
        <div className="flex items-center gap-2 bg-green-50 border
                         border-green-200 text-green-700 text-sm px-4
                         py-3 rounded-lg mb-4">
          <Check className="w-4 h-4 flex-shrink-0" />
          {saveMsg}
        </div>
      )}

      {/* Create university form */}
      {showCreate && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-800">
              Register New University
            </h2>
            <button onClick={() => setShowCreate(false)}
              className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "university_name", label: "University Name *",
                type: "text", placeholder: "University of Accra" },
              { key: "location", label: "Location *",
                type: "text", placeholder: "Accra, Ghana" },
              { key: "official_email", label: "Official Email",
                type: "email", placeholder: "registrar@university.edu.gh" },
              { key: "phone", label: "Phone",
                type: "text", placeholder: "+233 XX XXX XXXX" },
              { key: "website_url", label: "Website",
                type: "url", placeholder: "https://university.edu.gh" },
              { key: "domain", label: "Domain *",
                type: "text", placeholder: "university.edu.gh" },
              { key: "year_established", label: "Year Established",
                type: "number", placeholder: "1948" },
              { key: "student_population", label: "Approx. Student Population",
                type: "number", placeholder: "15000" },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {label}
                </label>
                <input type={type} className={inp}
                  placeholder={placeholder}
                  value={createForm[key]}
                  onChange={e => setCreateForm(p => ({
                    ...p, [key]: e.target.value
                  }))} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Institution Type *
              </label>
              <select className={inp}
                value={createForm.institution_type}
                onChange={e => setCreateForm(p => ({
                  ...p, institution_type: e.target.value
                }))}>
                {INSTITUTION_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {saveError && createMut.isError && (
            <p className="text-red-600 text-sm mt-3">{saveError}</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => {
                setSaveError("");
                const data = { ...createForm };
                if (data.year_established)
                  data.year_established = parseInt(data.year_established);
                if (data.student_population)
                  data.student_population = parseInt(data.student_population);
                Object.keys(data).forEach(k => {
                  if (data[k] === "") data[k] = null;
                });
                createMut.mutate(data);
              }}
              disabled={createMut.isPending}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700
                          text-white text-sm font-semibold px-4 py-2.5
                          rounded-lg disabled:opacity-50 transition-colors"
            >
              {createMut.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Check className="w-4 h-4" />}
              Register
            </button>
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg
                          text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* University list */}
      <div className="space-y-3">
        {universities.map(u => {
          const isOpen    = detailUni === u.id;
          const isEditing = editingUni === u.id;

          return (
            <div key={u.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden">

              {/* Row header */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-9 h-9 bg-sky-50 rounded-lg flex items-center
                                   justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {u.university_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      #{u.university_code} · {u.location}
                      {u.institution_type ? ` · ${u.institution_type}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge status={u.trust_status} />

                  {u.trust_status === "PENDING" && (
                    <button
                      onClick={() => trustMut.mutate({ id: u.id, status: "TRUSTED" })}
                      disabled={trustMut.isPending}
                      className="text-xs font-semibold text-white bg-teal-600
                                  hover:bg-teal-700 px-3 py-1.5 rounded-lg
                                  transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {u.trust_status === "TRUSTED" && (
                    <button
                      onClick={() => trustMut.mutate({ id: u.id, status: "REVOKED" })}
                      disabled={trustMut.isPending}
                      className="text-xs font-semibold text-red-600 border
                                  border-red-200 hover:bg-red-50 px-3 py-1.5
                                  rounded-lg transition-colors"
                    >
                      Revoke Trust
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (isEditing) {
                        cancelEditing();
                      } else {
                        startEditing(u);
                        setDetailUni(u.id);
                      }
                    }}
                    className="text-slate-400 hover:text-sky-600 transition-colors
                                p-1 rounded"
                    title={isEditing ? "Cancel editing" : "Edit details"}
                  >
                    {isEditing
                      ? <X className="w-4 h-4" />
                      : <Pencil className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => {
                      setDetailUni(isOpen ? null : u.id);
                      if (!isOpen) cancelEditing();
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded"
                  >
                    {isOpen
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Detail / edit panel */}
              {isOpen && (
                <div className="border-t border-slate-100">
                  {isEditing ? (
                    /* EDIT MODE */
                    <div className="px-5 py-5">
                      <p className="text-xs font-semibold text-sky-600
                                     uppercase tracking-wide mb-4">
                        Editing — {u.university_name}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium
                                             text-slate-600 mb-1">
                            University Name
                          </label>
                          <input className={inp}
                            value={editForm.university_name ?? ""}
                            onChange={e => setEditForm(p => ({
                              ...p, university_name: e.target.value
                            }))} />
                        </div>

                        <div>
                          <label className="block text-xs font-medium
                                             text-slate-600 mb-1">
                            Type
                          </label>
                          <select className={inp}
                            value={editForm.institution_type ?? "University"}
                            onChange={e => setEditForm(p => ({
                              ...p, institution_type: e.target.value
                            }))}>
                            {INSTITUTION_TYPES.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        {[
                          { key: "location",           label: "Location",
                            type: "text",  placeholder: "Accra, Ghana" },
                          { key: "official_email",      label: "Official Email",
                            type: "email", placeholder: "registrar@uni.edu.gh" },
                          { key: "phone",              label: "Phone",
                            type: "text",  placeholder: "+233 XX XXX XXXX" },
                          { key: "website_url",        label: "Website",
                            type: "url",   placeholder: "https://university.edu.gh" },
                          { key: "domain",             label: "Domain",
                            type: "text",  placeholder: "university.edu.gh" },
                          { key: "year_established",   label: "Year Established",
                            type: "number", placeholder: "1948" },
                          { key: "student_population", label: "Approx. Student Population",
                            type: "number", placeholder: "15000" },
                        ].map(({ key, label, type, placeholder }) => (
                          <div key={key}>
                            <label className="block text-xs font-medium
                                               text-slate-600 mb-1">
                              {label}
                            </label>
                            <input type={type} className={inp}
                              placeholder={placeholder}
                              value={editForm[key] ?? ""}
                              onChange={e => setEditForm(p => ({
                                ...p, [key]: e.target.value
                              }))} />
                          </div>
                        ))}
                      </div>

                      {saveError && (
                        <p className="text-red-600 text-sm mb-3 bg-red-50
                                       border border-red-200 px-3 py-2 rounded-lg">
                          {saveError}
                        </p>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => saveEditing(u.id)}
                          disabled={updateMut.isPending}
                          className="flex items-center gap-2 bg-sky-600
                                      hover:bg-sky-700 text-white text-sm
                                      font-semibold px-4 py-2 rounded-lg
                                      disabled:opacity-50 transition-colors"
                        >
                          {updateMut.isPending
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Check className="w-4 h-4" />}
                          {updateMut.isPending ? "Saving…" : "Save Changes"}
                        </button>
                        <button onClick={cancelEditing}
                          className="px-4 py-2 border border-slate-200
                                      rounded-lg text-sm text-slate-600
                                      hover:bg-slate-50">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* READ MODE */
                    <div className="px-5 py-5">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-5
                                       text-sm mb-5">
                        {[
                          { icon: Building2, label: "Type",
                            value: u.institution_type || "—" },
                          { icon: Building2, label: "Location",
                            value: u.location || "—" },
                          { icon: Mail,      label: "Official Email",
                            value: u.official_email || "—" },
                          { icon: Phone,     label: "Phone",
                            value: u.phone || "—" },
                          { icon: Globe,     label: "Website",
                            value: u.website_url || "—", link: true },
                          { icon: Globe,     label: "Domain",
                            value: u.domain || "—" },
                          { icon: Calendar,  label: "Year Established",
                            value: u.year_established || "—" },
                          { icon: Users,     label: "Student Population",
                            value: u.student_population
                              ? u.student_population.toLocaleString() : "—" },
                          { icon: Calendar,  label: "Registered",
                            value: new Date(u.created_at).toLocaleDateString() },
                        ].map(({ icon: Icon, label, value, link }) => (
                          <div key={label}>
                            <p className="text-xs text-slate-400 mb-0.5">
                              {label}
                            </p>
                            {link && value !== "—" ? (
                              <a href={value} target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-600 hover:underline
                                             text-sm font-medium">
                                {value}
                              </a>
                            ) : (
                              <p className="font-medium text-slate-800">
                                {value}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Issuers */}
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-xs font-semibold text-slate-400
                                        uppercase tracking-wide mb-3">
                          Issuer Accounts ({u.issuers?.length || 0})
                        </p>
                        {u.issuers?.length > 0 ? (
                          <div className="space-y-2">
                            {u.issuers.map(iss => (
                              <div key={iss.id}
                                className="flex items-center justify-between
                                             py-2 border-b border-slate-50
                                             last:border-0">
                                <div>
                                  <p className="text-sm font-medium text-slate-800">
                                    {iss.issuer_name || iss.email}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {iss.email}
                                    {iss.department ? ` · ${iss.department}` : ""}
                                    {iss.department_code ? ` · ${iss.department_code}` : ""}
                                  </p>
                                </div>
                                {iss.is_temp_password && (
                                  <span className="text-xs text-amber-600
                                                    bg-amber-50 border border-amber-100
                                                    px-2 py-0.5 rounded-full">
                                    Awaiting setup
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">
                            No issuer accounts yet.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}