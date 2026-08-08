import { Outlet } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-brand-600" />
            <span className="font-bold text-slate-900 tracking-tight text-lg">
              MerkliFy
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

