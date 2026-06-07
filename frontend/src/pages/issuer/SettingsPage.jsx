import ChangePasswordForm from "../../components/ui/ChangePasswordForm";
import { Settings } from "lucide-react";

export default function IssuerSettingsPage() {
  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-teal-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-slate-500 text-sm">Manage your issuer account</p>
        </div>
      </div>
      <ChangePasswordForm />
    </div>
  );
}