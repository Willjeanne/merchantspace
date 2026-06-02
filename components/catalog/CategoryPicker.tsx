"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronDown, Check, FolderOpen, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VtexCategory } from "@/lib/types/catalog";

interface CategoryPickerProps {
  categories: VtexCategory[];
  defaultValue?: number;
  name?: string;
  required?: boolean;
  disabled?: boolean;
}

function flatFindCategory(
  cats: VtexCategory[],
  id: number
): VtexCategory | null {
  for (const c of cats) {
    if (c.id === id) return c;
    if (c.children?.length) {
      const found = flatFindCategory(c.children, id);
      if (found) return found;
    }
  }
  return null;
}

function buildPath(cats: VtexCategory[], id: number): string {
  function search(
    nodes: VtexCategory[],
    target: number,
    path: string[]
  ): string[] | null {
    for (const node of nodes) {
      const curr = [...path, node.name];
      if (node.id === target) return curr;
      if (node.children?.length) {
        const found = search(node.children, target, curr);
        if (found) return found;
      }
    }
    return null;
  }
  return (search(cats, id, []) ?? []).join(" › ");
}

function CategoryNode({
  category,
  level,
  selectedId,
  onSelect,
}: {
  category: VtexCategory;
  level: number;
  selectedId: number | null;
  onSelect: (id: number, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = category.children?.length > 0;
  const isSelected = selectedId === category.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm cursor-pointer transition-colors",
          isSelected
            ? "bg-indigo-50 text-indigo-700 font-medium"
            : "text-zinc-700 hover:bg-zinc-50"
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors"
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

        <button
          type="button"
          className="flex items-center gap-1.5 flex-1 text-left"
          onClick={() => onSelect(category.id, category.name)}
        >
          {hasChildren ? (
            open ? (
              <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <span className="truncate">{category.name}</span>
          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 ml-auto shrink-0" />}
        </button>
      </div>

      {hasChildren && open && (
        <div>
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryPicker({
  categories,
  defaultValue,
  name = "categoryId",
  required = false,
  disabled = false,
}: CategoryPickerProps) {
  const [selectedId, setSelectedId] = useState<number | null>(defaultValue ?? null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = selectedId ? buildPath(categories, selectedId) : "";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setOpen(false);
  };

  if (categories.length === 0) {
    return (
      <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-400">
        No categories available
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selectedId ?? ""} />

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500",
          disabled
            ? "border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed"
            : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 cursor-pointer",
          !selectedId && "text-zinc-400"
        )}
      >
        <span className="truncate">
          {selectedLabel || "Select a category…"}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-zinc-400 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg py-1">
          {categories.map((cat) => (
            <CategoryNode
              key={cat.id}
              category={cat}
              level={0}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
