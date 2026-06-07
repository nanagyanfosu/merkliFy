import { useQuery } from "@tanstack/react-query";
import { listBatches } from "../../api/issuer";
import { Link } from "react-router-dom";
import { Upload, FolderOpen, ChevronRight, Loader2 } from "lucide-react";

export default function IssuerDashboard() {
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["issuer-batches"],
    queryFn: listBatches,
  });

  const totalCerts = batches.reduce((s, b) => s + b.total_certificates, 0);
  const recent = batches.slice(0, 3);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Dashboard</h1>
      <p className="text-slate-500 text-sm mb-6">
        Certificate issuance overview for your institution
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="card p-5 flex items-center gap-4">
          <div className="bg-teal-100 p-3 rounded-xl">
            <FolderOpen className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{batches.length}</p>
            <p className="text-xs text-slate-500">Total Batches Issued</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="bg-brand-100 p-3 rounded-xl">
            <Upload className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{totalCerts}</p>
            <p className="text-xs text-slate-500">Total Certificates Issued</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link to="/issuer/upload" className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4 group">
          <div className="bg-teal-100 p-3 rounded-xl group-hover:bg-teal-200 transition-colors">
            <Upload className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Upload New Batch</p>
            <p className="text-xs text-slate-500">Import CSV or JSON certificate data</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
        </Link>
        <Link to="/issuer/certificates" className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4 group">
          <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition-colors">
            <FolderOpen className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Manage Certificates</p>
            <p className="text-xs text-slate-500">Search, revoke, or suspend</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
        </Link>
      </div>

      {/* Recent batches */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-700">Recent Batches</h2>
          <Link to="/issuer/batches" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        ) : recent.length === 0 ? (
          <p className="text-slate-400 text-sm">No batches uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {recent.map((b) => (
              <Link
                key={b.batch_id}
                to={`/issuer/batches/${b.batch_id}`}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 hover:opacity-75 transition-opacity"
              >
                <div>
                  <p className="font-medium text-sm">{b.batch_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-teal-600">
                    {b.total_certificates} certs
                  </p>
                  <p className="text-xs text-slate-400">{b.created_at?.substring(0, 10)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}