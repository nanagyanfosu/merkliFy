import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { setupPassword } from "../../api/auth";
import { getErrorMessage } from "../../utils/errors";
import { KeyRound, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function ChangePasswordPage() {
  const { user, markPasswordChanged } = useAuth();
  const navigate = useNavigate();

  const [step,      setStep]    = useState(1);  // 1 = new pw, 2 = confirm
  const [newPw,     setNewPw]   = useState("");
  const [confirmPw, setConfirm] = useState("");
  const [showPw,    setShowPw]  = useState(false);
  const [error,     setError]   = useState("");
  const [loading,   setLoading] = useState(false);

  // Password strength check
  const strength = getStrength(newPw);

  const handleNewPassword = (e) => {
    e.preventDefault();
    setError("");
    if (newPw.length < 8) {
      return setError("Password must be at least 8 characters.");
    }
    if (strength.score < 2) {
      return setError("Password is too weak. Add numbers or symbols.");
    }
    setStep(2);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError("");
    if (newPw !== confirmPw) {
      return setError("Passwords do not match.");
    }
    setLoading(true);
    try {
      await setupPassword(newPw);
      markPasswordChanged();
      navigate(user?.role === "ADMIN" ? "/admin" : "/issuer", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't set your password. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700
                     flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center
                           bg-white/10 w-16 h-16 rounded-2xl mb-4">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white font-bold text-2xl">Set Your Password</h1>
          <p className="text-slate-400 text-sm mt-1">
            Your account was set up with a temporary password.
            Create a secure password to continue.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <StepDot active={step >= 1} done={step > 1} label="1" />
            <div className={`flex-1 h-0.5 rounded ${step > 1
              ? "bg-teal-400" : "bg-slate-200"}`} />
            <StepDot active={step >= 2} done={false} label="2" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700
                             text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Step 1: Choose new password */}
          {step === 1 && (
            <form onSubmit={handleNewPassword} className="space-y-5">
              <div>
                <h2 className="font-semibold text-slate-800 mb-1">
                  Choose a new password
                </h2>
                <p className="text-slate-500 text-xs mb-4">
                  At least 8 characters. Mix letters, numbers, and symbols
                  for a stronger password.
                </p>

                <label className="label">New password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    className="input pr-10"
                    placeholder="Enter your new password"
                    value={newPw}
                    onChange={e => { setNewPw(e.target.value); setError(""); }}
                    autoFocus
                    required
                  />
                  <button type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                               text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength indicator */}
                {newPw.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(i => (
                        <div key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= strength.score
                              ? strength.color
                              : "bg-slate-200"
                          }`} />
                      ))}
                    </div>
                    <p className={`text-xs ${strength.textColor}`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              <button type="submit"
                className="btn-primary w-full">
                Continue →
              </button>
            </form>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && (
            <form onSubmit={handleConfirm} className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-teal-500" />
                  <h2 className="font-semibold text-slate-800">
                    Confirm your new password
                  </h2>
                </div>
                <label className="label">Repeat new password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Type your new password again"
                  value={confirmPw}
                  onChange={e => { setConfirm(e.target.value); setError(""); }}
                  autoFocus
                  required
                />
                {/* Live match indicator */}
                {confirmPw.length > 0 && (
                  <p className={`text-xs mt-1.5 ${
                    newPw === confirmPw ? "text-teal-600" : "text-red-500"
                  }`}>
                    {newPw === confirmPw ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button"
                  onClick={() => { setStep(1); setConfirm(""); setError(""); }}
                  className="btn-secondary flex-1">
                  ← Back
                </button>
                <button type="submit"
                  disabled={loading || newPw !== confirmPw}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Setting up…" : "Set Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDot({ active, done, label }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center
                      text-sm font-bold border-2 transition-colors ${
      done    ? "bg-teal-500 border-teal-500 text-white" :
      active  ? "bg-white border-teal-500 text-teal-600" :
                "bg-white border-slate-200 text-slate-400"
    }`}>
      {done ? "✓" : label}
    </div>
  );
}

function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8)                       score++;
  if (pw.length >= 12)                      score++;
  if (/[0-9]/.test(pw))                     score++;
  if (/[^a-zA-Z0-9]/.test(pw))             score++;

  const levels = [
    { score: 0, label: "",             color: "",                textColor: "" },
    { score: 1, label: "Weak",         color: "bg-red-400",      textColor: "text-red-500" },
    { score: 2, label: "Fair",         color: "bg-amber-400",    textColor: "text-amber-500" },
    { score: 3, label: "Good",         color: "bg-teal-400",     textColor: "text-teal-600" },
    { score: 4, label: "Strong",       color: "bg-green-500",    textColor: "text-green-600" },
  ];
  return { ...levels[score], score };
}