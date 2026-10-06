import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadBatch } from "../../api/issuer";
import { getErrorMessage } from "../../utils/errors";
import { Upload, FileText, CheckCircle2, Loader2, X } from "lucide-react";

export default function UploadBatchPage() {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const [file, setFile]             = useState(null);
  const [batchName, setBatchName]   = useState("");
  const [academicYear, setYear]     = useState(currentYear);
  const [dragging, setDragging]     = useState(false);
  const [result, setResult]         = useState(null);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("batch_name", batchName);
      fd.append("academic_year", academicYear);
      return uploadBatch(fd);
    },
    onSuccess: (data) => {
      setResult(data);
      setFile(null);
      setBatchName("");
      qc.invalidateQueries(["issuer-batches"]);
    },
  });

  const handleDrop = e => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const errors = mutation.error?.response?.data?.detail;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Upload Batch</h1>
      <p className="text-slate-500 text-sm mb-6">
        Upload a CSV or JSON file. All certificates are cryptographically
        hashed and committed in one batch.
      </p>

      {result && (
        <div className="card p-5 border-green-200 bg-green-50 mb-6">
          <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
            <CheckCircle2 className="w-5 h-5" />
            Batch committed — {result.batch_name} ({result.academic_year})
          </div>
          <p className="text-sm text-green-600">
            {result.total_certificates} certificate(s) issued and signed.
          </p>
          <button onClick={() => setResult(null)}
            className="text-xs text-green-600 underline mt-2">Upload another</button>
        </div>
      )}

      {!result && (
        <div className="card p-6 space-y-5">
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                         transition-colors ${dragging
                           ? "border-teal-400 bg-teal-50"
                           : "border-slate-200 hover:border-teal-300 hover:bg-slate-50"}`}
          >
            <input type="file" ref={fileRef} accept=".csv,.json" className="hidden"
              onChange={e => setFile(e.target.files[0])} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-5 h-5 text-teal-600" />
                <span className="font-medium text-slate-700 text-sm">{file.name}</span>
                <button onClick={e => { e.stopPropagation(); setFile(null); }}
                  className="text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-500">
                  Drop your file here or click to browse
                </p>
                <p className="text-xs text-slate-400 mt-1">.csv or .json — max 10,000 rows</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Batch Name</label>
              <input className="input" placeholder="2025 Graduates"
                value={batchName} onChange={e => setBatchName(e.target.value)} />
            </div>
            <div>
              <label className="label">Academic Year</label>
              <select className="input" value={academicYear}
                onChange={e => setYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {typeof errors === "string"
                ? getErrorMessage(mutation.error)
                : errors?.message
                ? (<>
                    <p className="font-medium mb-1">
                      {errors.message.startsWith("Validation failed")
                        ? "Some certificate details are missing or invalid."
                        : errors.message}
                    </p>
                    {errors.errors?.slice(0, 5).map((e, i) => (
                      <p key={i} className="text-xs">Row {e.row} · {e.field}: {e.error}</p>
                    ))}
                    {errors.errors?.length > 5 && (
                      <p className="text-xs text-red-400 mt-1">
                        …and {errors.errors.length - 5} more
                      </p>
                    )}
                    {errors.duplicates && (
                      <p className="text-xs mt-1">
                        Duplicates: {errors.duplicates.join(", ")}
                      </p>
                    )}
                  </>)
                : "Upload failed. Check your file and try again."}
            </div>
          )}

          <button
            onClick={() => mutation.mutate()}
            disabled={!file || !batchName || mutation.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2"
            style={{ backgroundColor: "#0f766e" }}
          >
            {mutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Upload className="w-4 h-4" />}
            {mutation.isPending ? "Processing…" : "Upload & Issue Batch"}
          </button>
        </div>
      )}
    </div>
  );
}