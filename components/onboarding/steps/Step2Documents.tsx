"use client";

import { useState, useCallback } from "react";
import { Upload, FileCheck2, XCircle, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KycDocument, DocStatus } from "@/lib/types/onboarding";

interface Step2DocumentsProps {
  documents: KycDocument[];
  onChange: (docs: KycDocument[]) => void;
}

const STATUS_CONFIG: Record<DocStatus, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  required: { label: "Required", icon: AlertCircle, className: "text-zinc-400" },
  uploaded: { label: "Uploaded", icon: Clock, className: "text-amber-500" },
  verified: { label: "Verified", icon: CheckCircle2, className: "text-green-600" },
  rejected: { label: "Rejected", icon: XCircle, className: "text-red-500" },
};

function DocumentCard({
  doc,
  onUpload,
}: {
  doc: KycDocument;
  onUpload: (id: string, file: File) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const cfg = STATUS_CONFIG[doc.status];
  const Icon = cfg.icon;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onUpload(doc.id, file);
    },
    [doc.id, onUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onUpload(doc.id, file);
    },
    [doc.id, onUpload]
  );

  return (
    <div
      className={cn(
        "bg-white border rounded-xl p-4 transition-all",
        doc.status === "rejected" ? "border-red-200 bg-red-50/30" :
        doc.status === "verified" ? "border-green-200 bg-green-50/30" :
        doc.status === "uploaded" ? "border-amber-200 bg-amber-50/20" :
        "border-zinc-200"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-800">{doc.label}</p>
            {doc.required && (
              <span className="text-xs text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">
                Required
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{doc.description}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Icon className={cn("w-4 h-4", cfg.className)} />
          <span className={cn("text-xs font-medium", cfg.className)}>{cfg.label}</span>
        </div>
      </div>

      {doc.status === "rejected" && doc.rejectionReason && (
        <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          Rejection reason: {doc.rejectionReason}
        </div>
      )}

      {doc.status === "verified" ? (
        <div className="flex items-center gap-2 text-xs text-green-700">
          <FileCheck2 className="w-4 h-4" />
          <span>{doc.fileName}</span>
          {doc.uploadedAt && (
            <span className="text-green-500">
              · Verified on {new Date(doc.uploadedAt).toLocaleDateString("en-US")}
            </span>
          )}
        </div>
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors",
            dragging ? "border-indigo-400 bg-indigo-50" : "border-zinc-200 hover:border-indigo-300 hover:bg-zinc-50"
          )}
        >
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileInput} />
          <Upload className="w-5 h-5 text-zinc-400 mb-2" />
          {doc.fileName ? (
            <p className="text-xs text-zinc-600 font-medium">{doc.fileName}</p>
          ) : (
            <>
              <p className="text-xs text-zinc-600 font-medium">Drop or click to upload</p>
              <p className="text-xs text-zinc-400 mt-0.5">PDF, JPG, PNG — max 10 MB</p>
            </>
          )}
        </label>
      )}
    </div>
  );
}

export function Step2Documents({ documents, onChange }: Step2DocumentsProps) {
  function handleUpload(id: string, file: File) {
    const updated = documents.map((d) =>
      d.id === id
        ? {
            ...d,
            status: "uploaded" as DocStatus,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
          }
        : d
    );
    onChange(updated);

    // Simulate async verification (mock)
    setTimeout(() => {
      const verified = updated.map((d) =>
        d.id === id ? { ...d, status: "verified" as DocStatus } : d
      );
      onChange(verified);
    }, 3000);
  }

  const requiredDocs = documents.filter((d) => d.required);
  const optionalDocs = documents.filter((d) => !d.required);
  const uploadedCount = documents.filter((d) => d.status !== "required").length;
  const verifiedCount = documents.filter((d) => d.status === "verified").length;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-700">Document progress</span>
          <span className="text-xs text-zinc-500">{verifiedCount}/{documents.length} verified</span>
        </div>
        <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(verifiedCount / documents.length) * 100}%` }}
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-zinc-500">
          <span>{uploadedCount} uploaded</span>
          <span className="text-green-600">{verifiedCount} verified</span>
          <span className="text-red-500">
            {documents.filter((d) => d.status === "rejected").length} rejected
          </span>
        </div>
      </div>

      {/* Required */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-800 mb-3">Required documents</h3>
        <div className="space-y-3">
          {requiredDocs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onUpload={handleUpload} />
          ))}
        </div>
      </div>

      {/* Optional */}
      {optionalDocs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-800 mb-3">Optional documents</h3>
          <div className="space-y-3">
            {optionalDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onUpload={handleUpload} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
