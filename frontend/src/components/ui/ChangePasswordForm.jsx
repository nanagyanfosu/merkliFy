import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { changePassword, verifyPassword } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import {
  KeyRound, Loader2, CheckCircle2, Eye, EyeOff,
  ArrowRight, ShieldCheck,
} from "lucide-react";

export default function ChangePasswordForm() {
  const { markPasswordChanged } = useAuth();

  const [step,       setStep]     = useState(1);
  const [current,    setCurrent]  = useState("");
  const [newPw,      setNewPw]    = useState("");
  const [confirmPw,  setConfirm]  = useState("");
  const [showCurr,   setShowCurr] = useState(false);
  const [showNew,    setShowNew]  = useState(false);
  const [success,    setSuccess]  = useState(false);
  const [stepError,  setStepErr]  = useState("");

  const strength = getStrength(newPw);

  // Step 1: verify current password
  const verifyMut = useMutation({
    mutationFn: () => verifyPassword(current),
    onSuccess:  () => { setStepErr(""); setStep(2); },
    onError:    (err) => setStepErr(
      err.response?.data?.detail || "Current password is incorrect."
    ),
  });

  // Step 2: submit new password
  const changeMut = useMutation({
    mutationFn: () => changePassword(current, newPw),
    onSuccess:  () => {
      setSuccess(true);
      markPasswordChanged();
      setCurrent(""); setNewPw(""); setConfirm("");
      setStep(1);
      setTimeout(() => setSuccess(false), 5000);
    },
    onError: (err) => setStepErr(
      err.response?.data?.detail || "Failed to update password."
    ),
  });

  const handleStep1 = (e) => {
    e.preventDefault();
    setStepErr("");
    if (!current) return setStepErr("Please enter your current password.");
    verifyMut.mutate();
  };

  const handleStep2 = (e) => {
    e.preventDefault();
    setStepErr("");
    if (newPw.length < 8) return setStepErr("Password must be at least 8 characters.");
    if (strength.score < 2) return setStepErr("Password is too weak.");
    if (newPw !== confirmPw) return setStepErr("Passwords do not match.");
    if (current === newPw) return setStepErr("New password must differ from current.");
    changeMut.mutate();
  };

  const reset = () => {
    setStep(1); setStepErr("");
    setCurrent(""); setNewPw(""); setConfirm("");
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5">
        <KeyRound className="w-4 h-4 text-slate-500" />
        <h2 className="font-semibold text-slate-800">Change Password</h2>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200
                         text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Password updated successfully.
        </div>
      )}

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        <StepDot n={1} active={step === 1} done={step > 1} />
        <div className={`flex-1 h-0.5 rounded transition-colors ${
          step > 1 ? "bg-sky-400" : "bg-slate-200"}`} />
        <StepDot n={2} active={step === 2} done={false} />
      </div>

      {stepError && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200
                       px-3 py-2 rounded-lg mb-4">
          {stepError}
        </p>
      )}

      {/* Step 1 — verify current password */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-4">
          <div>
            <p className="text-sm text-slate-500 mb-3">
              First, confirm your current password.
            </p>
            <label className="label">Current Password</label>
            <div className="relative">
              <input
                type={showCurr ? "text" : "password"}
                className="input pr-10"
                placeholder="Your current password"
                value={current}
                onChange={e => { setCurrent(e.target.value); setStepErr(""); }}
                autoFocus required />
              <button type="button" onClick={() => setShowCurr(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showCurr ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={verifyMut.isPending || !current}
            className="btn-primary flex items-center gap-2">
            {verifyMut.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ArrowRight className="w-4 h-4" />}
            {verifyMut.isPending ? "Verifying…" : "Verify & Continue"}
          </button>
        </form>
      )}

      {/* Step 2 — set new password */}
      {step === 2 && (
        <form onSubmit={handleStep2} className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-teal-500" />
            <p className="text-sm text-teal-700 font-medium">
              Current password verified. Set your new password below.
            </p>
          </div>

          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className="input pr-10"
                placeholder="At least 8 characters"
                value={newPw}
                onChange={e => { setNewPw(e.target.value); setStepErr(""); }}
                autoFocus required />
              <button type="button" onClick={() => setShowNew(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPw.length > 0 && (
              <div className="mt-1.5">
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4].map(i => (
                    <div key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i <= strength.score ? strength.color : "bg-slate-200"
                      }`} />
                  ))}
                </div>
                <p className={`text-xs ${strength.textColor}`}>{strength.label}</p>
              </div>
            )}
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input"
              placeholder="Repeat new password"
              value={confirmPw}
              onChange={e => { setConfirm(e.target.value); setStepErr(""); }}
              required />
            {confirmPw.length > 0 && (
              <p className={`text-xs mt-1 ${
                newPw === confirmPw ? "text-teal-600" : "text-red-500"
              }`}>
                {newPw === confirmPw ? "✓ Passwords match" : "✗ No match"}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={reset}
              className="btn-secondary">
              ← Back
            </button>
            <button type="submit"
              disabled={changeMut.isPending || newPw !== confirmPw}
              className="btn-primary flex items-center gap-2 flex-1 justify-center">
              {changeMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {changeMut.isPending ? "Saving…" : "Update Password"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function StepDot({ n, active, done }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center
                      text-xs font-bold border-2 transition-colors ${
      done   ? "bg-sky-500 border-sky-500 text-white"   :
      active ? "border-sky-500 text-sky-600 bg-white"   :
               "border-slate-200 text-slate-400 bg-white"
    }`}>
      {done ? "✓" : n}
    </div>
  );
}

function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8)              score++;
  if (pw.length >= 12)             score++;
  if (/[0-9]/.test(pw))           score++;
  if (/[^a-zA-Z0-9]/.test(pw))   score++;
  const levels = [
    { score: 0, label: "",       color: "",             textColor: "" },
    { score: 1, label: "Weak",   color: "bg-red-400",   textColor: "text-red-500" },
    { score: 2, label: "Fair",   color: "bg-amber-400", textColor: "text-amber-500" },
    { score: 3, label: "Good",   color: "bg-teal-400",  textColor: "text-teal-600" },
    { score: 4, label: "Strong", color: "bg-green-500", textColor: "text-green-600" },
  ];
  return { ...levels[score], score };
}