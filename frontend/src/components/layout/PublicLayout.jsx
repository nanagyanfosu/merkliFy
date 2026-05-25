// src/components/layout/PublicLayout.jsx
import { Outlet } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-brand-600" />
            <span className="font-semibold text-slate-800">merkliFy</span>
            <span className="hidden sm:inline text-slate-400 text-sm">
              | Certificate Verification System
            </span>
          </div>
          {/* No admin/issuer login button — portals are accessed directly */}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-5">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <p className="text-slate-400 text-xs">
            Cryptographic Academic Certificate Verification System
          </p>
          {/* Discreet institution access links — not prominently placed */}
          <div className="flex gap-4 text-xs text-slate-300">
            <a href="/admin/login" className="hover:text-slate-500 transition-colors">
              Admin
            </a>
            <a href="/issuer/login" className="hover:text-slate-500 transition-colors">
              Institutions
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}