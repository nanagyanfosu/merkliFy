import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  ShieldCheck, LayoutDashboard, University, Users,
  ScrollText, Search, Settings, LogOut, Menu, X,
} from "lucide-react";

const NAV = [
  { to: "/admin",              label: "Dashboard",         icon: LayoutDashboard, end: true },
  { to: "/admin/universities", label: "Universities",      icon: University },
  { to: "/admin/issuers",      label: "Issuers",           icon: Users },
  { to: "/admin/certificates", label: "Certificates",      icon: Search },
  { to: "/admin/logs",         label: "Verification Logs", icon: ScrollText },
  { to: "/admin/settings",     label: "Settings",          icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/admin/login"); };

  const SidebarContent = () => (
    <div className="w-64 bg-slate-900 flex flex-col h-full">
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-sky-400" />
          <div>
            <p className="text-sky-300 font-bold text-sm tracking-wide">merkliFy</p>
            <p className="text-slate-500 text-xs">Admin Portal</p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-5 space-y-0.5 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
               transition-colors ${isActive
                 ? "bg-sky-600 text-white"
                 : "text-sky-200 hover:bg-slate-700 hover:text-white"}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <p className="text-sky-300 text-xs font-medium truncate mb-0.5">{user?.email}</p>
        <p className="text-slate-500 text-xs mb-3">Administrator</p>
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-white
                     text-sm transition-colors">
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
          <div className="fixed inset-0 bg-black/50"
               onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50">
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14
                 bg-slate-900 border-b border-slate-700">
  <button onClick={() => setSidebarOpen(true)}
    className="text-slate-400 hover:text-white">
    <Menu className="w-6 h-6" />
  </button>
  {/* MerkliFy brand, not portal name */}
  <div className="flex items-center gap-2">
    <ShieldCheck className="w-4 h-4 text-sky-400" />
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