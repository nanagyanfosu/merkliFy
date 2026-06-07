import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBatchDetail } from "../../api/issuer";
import { Loader2, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function BatchDetailPage() {
  const { batchId } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["issuer-batch", batchId],
    queryFn: () => getBatchDetail(batchId),
  });

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  );

  if (isError) return (
    <div className="card p-6 text-red-600">Failed to load batch details.</div>
  );

  return (
    <div>
      <Link
        to="/issuer/batches"
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to batches
      </Link>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">{data.batch_name}</h1>

      <div className="card p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Batch ID</p>
            <p className="font-medium">#{data.batch_id}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Total Certificates</p>
            <p className="font-medium">{data.total_certificates}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Created</p>
            <p className="font-medium">{new Date(data.created_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-medium text-slate-600">
          Certificates in this batch
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500 text-xs">
                <th className="px-4 py-2.5 font-medium">Serial</th>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Program</th>
                <th className="px-4 py-2.5 font-medium">Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.certificates.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{c.serial_number}</td>
                  <td className="px-4 py-3">{c.fullname}</td>
                  <td className="px-4 py-3 text-slate-500">{c.program}</td>
                  <td className="px-4 py-3 text-slate-500">{c.graduation_year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}