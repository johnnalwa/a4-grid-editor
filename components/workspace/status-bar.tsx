"use client";

import { Keyboard, MousePointer } from "lucide-react";

interface StatusBarProps {
  pageCount: number;
  selectedPageId: string | null;
  selectedElementId: string | null;
  elementCount: number;
  zoom: number;
}

export function StatusBar({
  pageCount,
  selectedPageId,
  selectedElementId,
  elementCount,
  zoom,
}: StatusBarProps) {
  return (
    <footer className="h-7 border-t border-border bg-surface flex items-center justify-between px-4 shrink-0 text-[10px] font-medium text-muted-foreground">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Ready
        </span>
        <span>A4 (210 x 297mm)</span>
        {selectedPageId && (
          <span className="text-primary font-semibold flex items-center gap-1">
            <MousePointer className="w-3 h-3" />
            {selectedElementId ? "Element Selected" : "Page Active"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="tabular-nums">{zoom}%</span>
        <span>
          {elementCount} element{elementCount !== 1 ? "s" : ""}
        </span>
        <span>
          {pageCount} {pageCount === 1 ? "page" : "pages"}
        </span>
        <span className="flex items-center gap-1 hidden sm:flex">
          <Keyboard className="w-3 h-3" />
          Del to remove
        </span>
      </div>
    </footer>
  );
}
