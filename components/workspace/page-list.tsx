"use client";

import { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotesTypeDialog } from "./notes-type-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import { ContextMenuTrigger } from "@radix-ui/react-context-menu";
import type { DocumentPage } from "@/lib/document-types";
import { cn } from "@/lib/utils";
import {
  PlusCircle,
  NotebookPen,
  GripVertical,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface PageListProps {
  pages: DocumentPage[];
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onAddNotesPage?: () => void;
  onAddNotesPageTemplate?: () => void;
  onReorderPage?: (fromIndex: number, toIndex: number) => void;
}

export function PageList({
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onAddNotesPage,
  onAddNotesPageTemplate,
  onReorderPage,
}: PageListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      if (dragIndex === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = e.currentTarget.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      setDropTarget(e.clientY < mid ? index : index + 1);
    },
    [dragIndex]
  );

  const handleContainerDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (dragIndex === null || dropTarget === null || !onReorderPage) return;
      let to = dropTarget;
      if (dragIndex < to) to = to - 1;
      if (to !== dragIndex) onReorderPage(dragIndex, to);
      setDragIndex(null);
      setDropTarget(null);
    },
    [dragIndex, dropTarget, onReorderPage]
  );

  // ── Context-menu moves ─────────────────────────────────────────────────────
  const moveToTop = useCallback(
    (index: number) => onReorderPage?.(index, 0),
    [onReorderPage]
  );
  const moveUp = useCallback(
    (index: number) => onReorderPage?.(index, index - 1),
    [onReorderPage]
  );
  const moveDown = useCallback(
    (index: number) => onReorderPage?.(index, index + 1),
    [onReorderPage]
  );
  const moveToBottom = useCallback(
    (index: number) => onReorderPage?.(index, pages.length - 1),
    [onReorderPage, pages.length]
  );

  return (
    <div className="w-20 border-r border-border bg-surface shrink-0 flex flex-col">
      <div className="p-3 border-b border-border bg-muted/30">
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block text-center">
          Pages
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div
          className="p-2 space-y-0"
          onDrop={handleContainerDrop}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        >
          {pages.map((page, index) => {
            const isNotes = page.pageType === "notes";
            const isSelected = selectedPageId === page.id;
            const isDragging = dragIndex === index;
            const showLineBefore = dropTarget === index && dragIndex !== index;
            const showLineAfter =
              dropTarget === index + 1 &&
              index === pages.length - 1 &&
              dragIndex !== index;

            return (
              <div
                key={page.id}
                className="relative"
                onDragOver={(e) => handleDragOver(e, index)}
              >
                {/* Drop indicator — above */}
                {showLineBefore && (
                  <div className="absolute -top-0.5 left-1 right-1 h-0.5 rounded-full bg-primary z-20 shadow-sm shadow-primary/40" />
                )}

                <div className="py-0.5">
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        draggable={!!onReorderPage}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectPage(page.id)}
                        title={`Page ${index + 1}${isNotes ? " (Notes)" : ""}  — right-click to move`}
                        className={cn(
                          "w-full aspect-[210/297] rounded-sm border-2 transition-all relative overflow-hidden group",
                          isDragging && "opacity-40 scale-95 border-dashed",
                          !isDragging && isSelected
                            ? isNotes
                              ? "border-amber-400 ring-1 ring-amber-400/30"
                              : "border-primary ring-1 ring-primary/30"
                            : !isDragging && "border-border hover:border-primary/40"
                        )}
                        style={{ backgroundColor: page.backgroundColor }}
                      >
                        {/* Drag grip hint */}
                        {onReorderPage && (
                          <div className="absolute top-0 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-50 transition-opacity z-10 pointer-events-none">
                            <GripVertical className="w-3 h-3 text-muted-foreground mt-0.5" />
                          </div>
                        )}

                        {/* Notes: lined background preview */}
                        {isNotes && (
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              backgroundImage:
                                "repeating-linear-gradient(transparent, transparent 5px, #9ec5e890 5px, #9ec5e890 6px)",
                              backgroundSize: "100% 6px",
                            }}
                          />
                        )}

                        {/* Notes: red margin line preview */}
                        {isNotes && (
                          <div
                            className="absolute top-0 bottom-0 pointer-events-none"
                            style={{
                              left: "10%",
                              width: 1,
                              backgroundColor: "rgba(210, 50, 50, 0.45)",
                            }}
                          />
                        )}

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
                              borderRadius: el.borderRadius
                                ? `${Math.max(1, el.borderRadius * 0.1)}px`
                                : "1px",
                              opacity: el.opacity,
                            }}
                          />
                        ))}

                        {/* Notes badge */}
                        {isNotes && (
                          <span className="absolute top-0.5 left-0.5 text-[6px] font-black bg-amber-400/80 text-amber-900 px-0.5 rounded-sm leading-tight">
                            N
                          </span>
                        )}

                        {/* Page number */}
                        <span
                          className={cn(
                            "absolute bottom-0.5 right-1 text-[8px] font-bold",
                            isSelected
                              ? isNotes
                                ? "text-amber-600"
                                : "text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {index + 1}
                        </span>
                      </button>
                    </ContextMenuTrigger>

                    {/* Right-click context menu */}
                    <ContextMenuContent className="w-44">
                      <ContextMenuLabel className="text-[10px] text-muted-foreground">
                        Page {index + 1}{isNotes ? " · Notes" : ""}
                      </ContextMenuLabel>
                      <ContextMenuSeparator />

                      <ContextMenuItem
                        className="gap-2 text-xs"
                        onClick={() => moveToTop(index)}
                        disabled={index === 0}
                      >
                        <ArrowUpToLine className="w-3.5 h-3.5" />
                        Move to Top
                      </ContextMenuItem>

                      <ContextMenuItem
                        className="gap-2 text-xs"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                        Move Up
                      </ContextMenuItem>

                      <ContextMenuItem
                        className="gap-2 text-xs"
                        onClick={() => moveDown(index)}
                        disabled={index === pages.length - 1}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        Move Down
                      </ContextMenuItem>

                      <ContextMenuItem
                        className="gap-2 text-xs"
                        onClick={() => moveToBottom(index)}
                        disabled={index === pages.length - 1}
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        Move to Bottom
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </div>

                {/* Drop indicator — below last */}
                {showLineAfter && (
                  <div className="absolute -bottom-0.5 left-1 right-1 h-0.5 rounded-full bg-primary z-20 shadow-sm shadow-primary/40" />
                )}
              </div>
            );
          })}

          {/* Add regular page */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onAddPage}
              title="Add regular page"
              className="w-full aspect-[210/297] rounded-sm border-2 border-dashed border-border hover:border-primary flex items-center justify-center transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Add notes page */}
          {onAddNotesPage && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setNotesDialogOpen(true)}
                title="Add notes page"
                className="w-full aspect-[210/297] rounded-sm border-2 border-dashed border-amber-300 hover:border-amber-500 flex flex-col items-center justify-center gap-0.5 transition-colors"
                style={{ backgroundColor: "rgba(255,252,220,0.4)" }}
              >
                <NotebookPen className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[7px] font-bold text-amber-600 uppercase tracking-wide">
                  Notes
                </span>
              </button>
            </div>
          )}
        </div>
      </ScrollArea>

      {onAddNotesPage && (
        <NotesTypeDialog
          open={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
          onSelectBlank={onAddNotesPage}
          onSelectTemplate={onAddNotesPageTemplate ?? onAddNotesPage}
        />
      )}
    </div>
  );
}
