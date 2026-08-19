import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { getMe } from "../../api/auth";
import {
  GraduationCap, LayoutDashboard, Upload, FolderOpen,
  Search, Settings, LogOut, Menu, X, ShieldCheck, HelpCircle
} from "lucide-react";

const NAV = [
  { to: "/issuer",              label: "Dashboard",      icon: LayoutDashboard, end: true },
  { to: "/issuer/upload",       label: "Upload Batch",   icon: Upload },
  { to: "/issuer/batches",      label: "Batches",        icon: FolderOpen },
  { to: "/issuer/certificates", label: "Certificates",   icon: Search },
  { to: "/issuer/settings",     label: "Settings",       icon: Settings },
  { to: "/issuer/help",         label: "Help",           icon: HelpCircle }
];

export default function IssuerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["issuer-profile"],
    queryFn: getMe,
    staleTime: 5 * 60 * 1000,
  });

  const handleLogout = () => { logout(); navigate("/issuer/login"); };

  const SidebarContent = () => (
    <div className="w-64 bg-teal-900 flex flex-col h-full">
      <div className="flex items-center justify-between px-5 h-16 border-b border-teal-800">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-teal-300 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-teal-200 font-bold text-xs tracking-wide truncate">
              {profile?.university_name || "Loading…"}
            </p>
            <p className="text-teal-400 text-xs">Issuer Portal</p>
          </div>
        </div>
        {/* Close button on mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-teal-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* University code badge */}
      {profile?.university_code && (
        <div className="mx-4 mt-3 px-3 py-1.5 bg-teal-800 rounded-lg">
          <p className="text-teal-400 text-xs">Institution Code</p>
          <p className="text-teal-200 font-mono font-bold text-sm">
            {profile.university_code}
          </p>
        </div>
      )}

      <nav className="flex-1 py-4 space-y-0.5 px-3 mt-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-teal-600 text-white"
                  : "text-teal-200 hover:bg-teal-800 hover:text-white"
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-teal-800">
        <p className="text-teal-200 text-xs font-medium truncate mb-0.5">
          {user?.email}
        </p>
        <p className="text-teal-500 text-xs mb-3">Issuer</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-teal-400 hover:text-white text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar with hamburger */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14
                 bg-teal-900 border-b border-teal-800">
  <button onClick={() => setSidebarOpen(true)}
    className="text-teal-200 hover:text-white">
    <Menu className="w-6 h-6" />
  </button>
  <div className="flex items-center gap-2">
    <ShieldCheck className="w-4 h-4 text-teal-300" />
    <span className="text-white font-bold text-sm">MerkliFy</span>
  </div>
</div>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}