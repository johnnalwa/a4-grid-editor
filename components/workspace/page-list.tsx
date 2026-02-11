"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { DocumentPage } from "@/lib/document-types";
import { cn } from "@/lib/utils";
import { PlusCircle } from "lucide-react";

interface PageListProps {
  pages: DocumentPage[];
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
}

export function PageList({
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
}: PageListProps) {
  return (
    <div className="w-20 border-r border-border bg-surface shrink-0 flex flex-col">
      <div className="p-2 border-b border-border">
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block text-center">
          Pages
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              onClick={() => onSelectPage(page.id)}
              className={cn(
                "w-full aspect-[210/297] rounded-sm border-2 transition-all relative overflow-hidden",
                selectedPageId === page.id
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40"
              )}
              style={{ backgroundColor: page.backgroundColor }}
            >
              {/* Mini element previews */}
              {page.elements.map((el) => (
                <div
                  key={el.id}
                  className="absolute"
                  style={{
                    left: `${(el.position.x / 595) * 100}%`,
                    top: `${(el.position.y / 842) * 100}%`,
                    width: `${(el.size.width / 595) * 100}%`,
                    height: `${(el.size.height / 842) * 100}%`,
                    backgroundColor:
                      el.type === "image"
                        ? "#94a3b8"
                        : el.type === "note"
                          ? el.backgroundColor || "#fef3c7"
                          : el.type === "shape"
                            ? el.backgroundColor || "#dbeafe"
                            : "#cbd5e1",
                    borderRadius:
                      el.borderRadius
                        ? `${Math.max(1, el.borderRadius * 0.1)}px`
                        : "1px",
                    opacity: el.opacity,
                  }}
                />
              ))}
              <span className="absolute bottom-0.5 right-1 text-[8px] font-bold text-muted-foreground">
                {index + 1}
              </span>
            </button>
          ))}

          {/* Add page */}
          <button
            type="button"
            onClick={onAddPage}
            className="w-full aspect-[210/297] rounded-sm border-2 border-dashed border-border hover:border-primary flex items-center justify-center transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}
