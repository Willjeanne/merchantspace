"use client";

import { useActionState, useState, useRef } from "react";
import { ImagePlus, Loader2, CheckCircle2, Link2, Upload } from "lucide-react";
import { addSkuImageUrlAction, addSkuImageFileAction } from "@/lib/actions/catalog";
import type { AddImageState } from "@/lib/actions/catalog";
import { cn } from "@/lib/utils";

interface AddImageFormProps {
  skuId: number;
  productId: number;
}

function UrlForm({ skuId, productId }: AddImageFormProps) {
  const [state, formAction, isPending] = useActionState<AddImageState, FormData>(
    addSkuImageUrlAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="skuId" value={skuId} />
      <input type="hidden" name="productId" value={productId} />
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-zinc-500 mb-1">
            Any public image URL (Pixabay, Imgur, S3…)
          </label>
          <input
            name="imageUrl"
            type="url"
            placeholder="https://example.com/product.jpg"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 shrink-0"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          {isPending ? "Uploading…" : "Add"}
        </button>
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle2 className="w-3.5 h-3.5" /> Image added — refresh to see it.
        </p>
      )}
    </form>
  );
}

function FileForm({ skuId, productId }: AddImageFormProps) {
  const [state, formAction, isPending] = useActionState<AddImageState, FormData>(
    addSkuImageFileAction,
    {}
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string | null>(null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="skuId" value={skuId} />
      <input type="hidden" name="productId" value={productId} />

      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 cursor-pointer transition-colors",
          filename
            ? "border-indigo-300 bg-indigo-50"
            : "border-zinc-200 bg-zinc-50 hover:border-indigo-300 hover:bg-indigo-50"
        )}
      >
        <Upload className="w-6 h-6 text-zinc-400" />
        <p className="text-sm text-zinc-600">
          {filename ?? "Click to select an image"}
        </p>
        <p className="text-xs text-zinc-400">JPEG, PNG, GIF, WebP · max 5 MB</p>
        <input
          ref={inputRef}
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => setFilename(e.target.files?.[0]?.name ?? null)}
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !filename}
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        {isPending ? "Uploading…" : "Upload"}
      </button>

      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle2 className="w-3.5 h-3.5" /> Image uploaded — refresh to see it.
        </p>
      )}
    </form>
  );
}

export function AddImageForm({ skuId, productId }: AddImageFormProps) {
  const [tab, setTab] = useState<"url" | "file">("url");

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        {(["url", "file"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            {t === "url" ? (
              <><Link2 className="w-3.5 h-3.5" />From URL</>
            ) : (
              <><Upload className="w-3.5 h-3.5" />Upload file</>
            )}
          </button>
        ))}
      </div>

      {tab === "url" ? (
        <UrlForm skuId={skuId} productId={productId} />
      ) : (
        <FileForm skuId={skuId} productId={productId} />
      )}
    </div>
  );
}
