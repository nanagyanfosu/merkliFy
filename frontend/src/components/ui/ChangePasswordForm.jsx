import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { changePassword } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { KeyRound, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function ChangePasswordForm() {
  const { markPasswordChanged } = useAuth();
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const [clientError, setClientError] = useState("");

  const mutation = useMutation({
    mutationFn: () => changePassword(next),
    onSuccess: () => {
      setSuccess(true);
      markPasswordChanged();
      setCurrent(""); setNext(""); setConfirm("");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setClientError("");
    if (next.length < 8) return setClientError("New password must be at least 8 characters.");
    if (next !== confirm) return setClientError("Passwords do not match.");
    mutation.mutate();
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              className="input pr-10"
              placeholder="Min. 8 characters"
              value={next}
              onChange={e => setNext(e.target.value)}
              required
            />
            <button type="button"
              onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="label">Confirm New Password</label>
          <input type="password" className="input"
            placeholder="Repeat new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required />
        </div>

        {(clientError || mutation.isError) && (
          <p className="text-red-600 text-sm">
            {clientError || mutation.error?.response?.data?.detail || "Failed to update password."}
          </p>
        )}

        <button type="submit" disabled={mutation.isPending}
          className="btn-primary flex items-center gap-2">
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {mutation.isPending ? "Saving…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}