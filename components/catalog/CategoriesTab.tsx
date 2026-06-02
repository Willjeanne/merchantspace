"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, ChevronDown, Loader2, FolderPlus, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { createCategoryAction } from "@/lib/actions/catalog";
import type { CategoryActionState } from "@/lib/actions/catalog";
import type { VtexCategory } from "@/lib/types/catalog";

interface CategoriesTabProps {
  categories: VtexCategory[];
}

function AddCategoryForm({
  parentId,
  parentName,
  onCancel,
}: {
  parentId: number | null;
  parentName: string | null;
  onCancel: () => void;
}) {
  const [state, formAction, isPending] = useActionState<CategoryActionState, FormData>(
    createCategoryAction,
    {}
  );
  const [isActive, setIsActive] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onCancel();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form
      action={formAction}
      className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 space-y-3 mt-2"
    >
      {parentId !== null && (
        <input type="hidden" name="parentCategoryId" value={parentId} />
      )}
      <p className="text-xs font-medium text-indigo-700">
        {parentName ? `New subcategory under "${parentName}"` : "New root category"}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Name */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            autoFocus
            placeholder="Category name…"
            className="w-full rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-2">Status</label>
          <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
              isActive
                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                : "bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", isActive ? "bg-green-500" : "bg-zinc-400")} />
            {isActive ? "Active" : "Inactive"}
          </button>
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
          <textarea
            name="description"
            rows={2}
            placeholder="Optional description for this category"
            className="w-full rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </button>
      </div>
      {state.error && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}
    </form>
  );
}

function CategoryTreeNode({
  category,
  level,
  addingUnder,
  setAddingUnder,
}: {
  category: VtexCategory;
  level: number;
  addingUnder: number | null;
  setAddingUnder: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = category.children?.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-50 transition-colors group"
        style={{ paddingLeft: `${12 + level * 20}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-zinc-400 hover:text-zinc-600 transition-colors shrink-0"
          >
            {open ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {open && hasChildren ? (
          <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-amber-500 shrink-0" />
        )}

        <span className="flex-1 text-sm font-medium text-zinc-800">
          {category.name}
        </span>
        {category.isActive === false && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-medium">
            Inactive
          </span>
        )}
        <span className="text-xs text-zinc-400 font-mono">#{category.id}</span>

        <button
          type="button"
          onClick={() =>
            setAddingUnder(addingUnder === category.id ? null : category.id)
          }
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 transition-all ml-2"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          Add sub
        </button>
      </div>

      {addingUnder === category.id && (
        <div style={{ paddingLeft: `${28 + level * 20}px` }}>
          <AddCategoryForm
            parentId={category.id}
            parentName={category.name}
            onCancel={() => setAddingUnder(null)}
          />
        </div>
      )}

      {hasChildren && open && (
        <div>
          {category.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              level={level + 1}
              addingUnder={addingUnder}
              setAddingUnder={setAddingUnder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoriesTab({ categories }: CategoriesTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [addingUnder, setAddingUnder] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {categories.length} root categor{categories.length !== 1 ? "ies" : "y"}
        </p>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Category
          </button>
        )}
      </div>

      {showCreate && (
        <AddCategoryForm
          parentId={null}
          parentName={null}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Folder className="w-10 h-10 text-zinc-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-700">No categories yet</p>
              <p className="text-xs text-zinc-400 mt-1">
                Create a category to organize your products.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-2">
            {categories.map((cat) => (
              <CategoryTreeNode
                key={cat.id}
                category={cat}
                level={0}
                addingUnder={addingUnder}
                setAddingUnder={setAddingUnder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
