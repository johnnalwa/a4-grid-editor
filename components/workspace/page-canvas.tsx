"use client";

import React, { useRef, useCallback, useEffect } from "react";
import type {
  DocumentPage,
  NotesPageFields,
  PageElement,
  Position,
} from "@/lib/document-types";
import {
  A4_WIDTH_PX,
  A4_HEIGHT_PX,
  createChecklistItem,
} from "@/lib/document-types";
import { DraggableElement } from "./draggable-element";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { ContextMenuTrigger } from "@radix-ui/react-context-menu";
import {
  Type,
  StickyNote,
  Square,
  ImageIcon,
  ClipboardPaste,
  Trash2,
  Copy as CopyIcon,
  Maximize2,
  LayoutGrid,
  Check as CheckIcon,
  Plus,
} from "lucide-react";

interface PageCanvasProps {
  page: DocumentPage;
  pageIndex: number;
  isActivePage: boolean;
  selectedElementId: string | null;
  zoom: number;
  onSelectPage: () => void;
  onSelectElement: (elementId: string | null) => void;
  onMoveElement: (elementId: string, position: Position) => void;
  onResizeElement: (
    elementId: string,
    size: { width: number; height: number }
  ) => void;
  onUpdateElement: (elementId: string, updates: Partial<PageElement>) => void;
  onDeleteElement: (elementId: string) => void;
  onDuplicateElement: (elementId: string) => void;
  onBringToFront: (elementId: string) => void;
  onSendToBack: (elementId: string) => void;
  onCopyElement: (elementId: string) => void;
  onPasteElement: (position: Position) => void;
  onDropAsset: (pageId: string, position: Position, data: DataTransfer) => void;
  onAddText: (position: Position) => void;
  onAddNote: (position: Position) => void;
  onAddShape: (position: Position) => void;
  onRequestImageUpload: () => void;
  onDeletePage: () => void;
  onDuplicatePage: () => void;
  hasClipboard: boolean;
  pageCount: number;
  isMobile?: boolean;
  onUpdatePageLabel?: (label: string) => void;
  onUpdateNotesPageFields?: (updates: NotesPageFields) => void;
  onRequestNextStructuredNotesPage?: () => void;
  /** Called when a drag or resize starts — used to record undo snapshot */
  onMoveStart?: () => void;
  imagesPerPage?: number;
  onSetImagesPerPage?: (val: number) => void;
  onFitCurrentPage?: () => void;
}

interface StructuredNotesPageProps {
  page: DocumentPage;
  onSelectPage: () => void;
  onUpdateNotesPageFields?: (updates: NotesPageFields) => void;
  onRequestNextStructuredNotesPage?: () => void;
  autoFocusNotes?: boolean;
}

const MAX_STRUCTURED_NOTE_LINES = 9;

function StructuredNotesPage({
  page,
  onSelectPage,
  onUpdateNotesPageFields,
  onRequestNextStructuredNotesPage,
  autoFocusNotes = false,
}: StructuredNotesPageProps) {
  const checklistItems = page.checklistItems ?? [];
  const dateInputRef = useRef<HTMLInputElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const checklistInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pendingChecklistFocusId = useRef<string | null>(null);

  const activatePage = useCallback(
    (event: React.SyntheticEvent) => {
      event.stopPropagation();
      onSelectPage();
    },
    [onSelectPage]
  );

  const stopContextMenu = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);

  useEffect(() => {
    if (!pendingChecklistFocusId.current) return;

    const input = checklistInputRefs.current[pendingChecklistFocusId.current];
    if (!input) return;

    input.focus();
    const cursor = input.value.length;
    input.setSelectionRange(cursor, cursor);
    pendingChecklistFocusId.current = null;
  }, [checklistItems]);

  const focusChecklistInput = useCallback((itemId: string) => {
    const input = checklistInputRefs.current[itemId];
    if (!input) return;

    input.focus();
    const cursor = input.value.length;
    input.setSelectionRange(cursor, cursor);
  }, []);

  const updateChecklistItems = useCallback(
    (nextItems: typeof checklistItems) => {
      onUpdateNotesPageFields?.({ checklistItems: nextItems });
    },
    [onUpdateNotesPageFields]
  );

  const handleChecklistToggle = useCallback(
    (itemId: string, checked: boolean) => {
      updateChecklistItems(
        checklistItems.map((item) =>
          item.id === itemId ? { ...item, checked } : item
        )
      );
    },
    [checklistItems, updateChecklistItems]
  );

  const handleChecklistTextChange = useCallback(
    (itemId: string, text: string) => {
      updateChecklistItems(
        checklistItems.map((item) =>
          item.id === itemId ? { ...item, text } : item
        )
      );
    },
    [checklistItems, updateChecklistItems]
  );

  const handleAddChecklistItem = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      activatePage(event);
      updateChecklistItems([...checklistItems, createChecklistItem()]);
    },
    [activatePage, checklistItems, updateChecklistItems]
  );

  const handleRemoveChecklistItem = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, itemId: string) => {
      activatePage(event);
      updateChecklistItems(checklistItems.filter((item) => item.id !== itemId));
    },
    [activatePage, checklistItems, updateChecklistItems]
  );

  const handleDateKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      subjectInputRef.current?.focus();
    },
    []
  );

  const handleSubjectKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      notesTextareaRef.current?.focus();
    },
    []
  );

  const handleNotesKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter") return;

      const lineCount = (page.pageLabel || "").split("\n").length;
      if (lineCount < MAX_STRUCTURED_NOTE_LINES) return;

      event.preventDefault();
      onRequestNextStructuredNotesPage?.();
    },
    [onRequestNextStructuredNotesPage, page.pageLabel]
  );

  const handleChecklistKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, itemId: string) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      onSelectPage();

      const currentIndex = checklistItems.findIndex((item) => item.id === itemId);
      const nextItem = checklistItems[currentIndex + 1];

      if (nextItem) {
        focusChecklistInput(nextItem.id);
        return;
      }

      const newItem = createChecklistItem();
      pendingChecklistFocusId.current = newItem.id;
      updateChecklistItems([...checklistItems, newItem]);
    },
    [checklistItems, focusChecklistInput, onSelectPage, updateChecklistItems]
  );

  return (
    <div
      className="absolute inset-0 z-[1] pointer-events-none"
      style={{ padding: "0 24px 22px 66px" }}
    >
      <div
        className="pointer-events-auto grid h-full"
        style={{ gridTemplateRows: "32px 32px 32px 288px 32px 256px" }}
      >
        <label
          className="flex h-8 items-end gap-3 pb-1 text-slate-900"
          onPointerDown={activatePage}
          onClick={activatePage}
          onContextMenu={stopContextMenu}
        >
          <span className="w-16 text-[12px] font-black uppercase tracking-[0.2em] leading-none">
            Date
          </span>
          <input
            ref={dateInputRef}
            value={page.pageDate || ""}
            onChange={(event) =>
              onUpdateNotesPageFields?.({ pageDate: event.target.value })
            }
            onKeyDown={handleDateKeyDown}
            placeholder="Add the date"
            className="h-8 flex-1 border-none bg-transparent px-0 pb-0 text-[14px] font-semibold leading-8 text-slate-700 outline-none placeholder:text-slate-400"
            spellCheck={false}
          />
        </label>

        <label
          className="flex h-8 items-end gap-3 pb-1 text-slate-900"
          onPointerDown={activatePage}
          onClick={activatePage}
          onContextMenu={stopContextMenu}
        >
          <span className="w-16 text-[12px] font-black uppercase tracking-[0.2em] leading-none">
            Subject
          </span>
          <input
            ref={subjectInputRef}
            value={page.pageSubject || ""}
            onChange={(event) =>
              onUpdateNotesPageFields?.({ pageSubject: event.target.value })
            }
            onKeyDown={handleSubjectKeyDown}
            placeholder="Add a subject"
            className="h-8 flex-1 border-none bg-transparent px-0 pb-0 text-[15px] font-bold leading-8 text-slate-900 outline-none placeholder:text-slate-500"
            spellCheck
          />
        </label>

        <div className="flex h-8 items-end pb-1">
          <span className="inline-flex items-center rounded-sm bg-blue-600 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-sm">
            Notes
          </span>
        </div>
        <textarea
          ref={notesTextareaRef}
          value={page.pageLabel || ""}
          onChange={(event) =>
            onUpdateNotesPageFields?.({ pageLabel: event.target.value })
          }
          onKeyDown={handleNotesKeyDown}
          placeholder="Write your notes here"
          spellCheck
          autoFocus={autoFocusNotes}
          wrap="off"
          className="h-full w-full resize-none overflow-hidden border-none bg-transparent p-0 text-[14px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
          style={{ lineHeight: "32px" }}
          onPointerDown={activatePage}
          onClick={activatePage}
          onContextMenu={stopContextMenu}
        />

        <div className="flex h-8 items-end justify-between gap-3 pb-1">
          <span className="inline-flex items-center rounded-sm bg-blue-600 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-sm">
            Checklist
          </span>
          <button
            type="button"
            className="mb-0.5 inline-flex h-7 items-center gap-1.5 rounded-full bg-slate-900/5 px-3 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-900/10"
            onClick={handleAddChecklistItem}
            onPointerDown={activatePage}
            onContextMenu={stopContextMenu}
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        </div>

        <div className="pr-1">
          {checklistItems.length === 0 ? (
            <button
              type="button"
              className="inline-flex h-8 items-end rounded-md px-1 pb-1 text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-700"
              onClick={handleAddChecklistItem}
              onPointerDown={activatePage}
              onContextMenu={stopContextMenu}
            >
              Add your first checklist item
            </button>
          ) : (
            checklistItems.map((item) => (
              <div
                key={item.id}
                className="flex h-8 items-end gap-2 pb-1"
                onPointerDown={activatePage}
                onClick={activatePage}
                onContextMenu={stopContextMenu}
              >
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(checked) =>
                    handleChecklistToggle(item.id, checked === true)
                  }
                  className="mb-1 h-4 w-4 border-slate-500 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                />
                <input
                  ref={(node) => {
                    checklistInputRefs.current[item.id] = node;
                  }}
                  value={item.text}
                  onChange={(event) =>
                    handleChecklistTextChange(item.id, event.target.value)
                  }
                  onKeyDown={(event) => handleChecklistKeyDown(event, item.id)}
                  placeholder="Checklist item"
                  className={cn(
                    "h-8 flex-1 border-none bg-transparent px-0 pb-0 text-[14px] font-medium leading-8 text-slate-800 outline-none placeholder:text-slate-400",
                    item.checked && "text-slate-600"
                  )}
                  spellCheck
                />
                <button
                  type="button"
                  className="mb-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-900/10 hover:text-slate-700"
                  onClick={(event) => handleRemoveChecklistItem(event, item.id)}
                  onPointerDown={activatePage}
                  onContextMenu={stopContextMenu}
                  aria-label="Remove checklist item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function PageCanvas({
  page,
  pageIndex,
  isActivePage,
  selectedElementId,
  zoom,
  onSelectPage,
  onSelectElement,
  onMoveElement,
  onResizeElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onBringToFront,
  onSendToBack,
  onCopyElement,
  onPasteElement,
  onDropAsset,
  onAddText,
  onAddNote,
  onAddShape,
  onRequestImageUpload,
  onDeletePage,
  onDuplicatePage,
  hasClipboard,
  pageCount,
  isMobile = false,
  onUpdatePageLabel,
  onUpdateNotesPageFields,
  onRequestNextStructuredNotesPage,
  onMoveStart,
  imagesPerPage,
  onSetImagesPerPage,
  onFitCurrentPage,
}: PageCanvasProps) {
  const [guides, setGuides] = React.useState<{ x: number[]; y: number[] }>({
    x: [],
    y: [],
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const contextClickPos = useRef<Position>({ x: 100, y: 100 });

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (
        e.target === e.currentTarget ||
        (e.target as HTMLElement).dataset.canvas
      ) {
        onSelectPage();
        onSelectElement(null);
      }
    },
    [onSelectPage, onSelectElement]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scale = zoom / 100;
      const position: Position = {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
      onDropAsset(page.id, position, e.dataTransfer);
    },
    [page.id, zoom, onDropAsset]
  );

  const handleMoveElementInternal = useCallback(
    (elId: string, pos: Position) => {
      const SNAP_THRESHOLD = 5;
      const movingEl = page.elements.find((e) => e.id === elId);
      if (!movingEl) return;

      let snappedX = pos.x;
      let snappedY = pos.y;
      const activeGuidesX: number[] = [];
      const activeGuidesY: number[] = [];

      const targets = page.elements.filter((e) => e.id !== elId);
      const pageTargetsX = [0, A4_WIDTH_PX / 2, A4_WIDTH_PX];
      const pageTargetsY = [0, A4_HEIGHT_PX / 2, A4_HEIGHT_PX];

      // X snapping
      const movingEdgesX = [
        pos.x,
        pos.x + movingEl.size.width / 2,
        pos.x + movingEl.size.width,
      ];

      targets.forEach((target) => {
        const targetEdgesX = [
          target.position.x,
          target.position.x + target.size.width / 2,
          target.position.x + target.size.width,
        ];
        movingEdgesX.forEach((mEdge, mi) => {
          targetEdgesX.forEach((tEdge) => {
            if (Math.abs(mEdge - tEdge) < SNAP_THRESHOLD) {
              snappedX =
                tEdge -
                (mi === 0 ? 0 : mi === 1 ? movingEl.size.width / 2 : movingEl.size.width);
              if (!activeGuidesX.includes(tEdge)) activeGuidesX.push(tEdge);
            }
          });
        });
      });

      pageTargetsX.forEach((tEdge) => {
        movingEdgesX.forEach((mEdge, mi) => {
          if (Math.abs(mEdge - tEdge) < SNAP_THRESHOLD) {
            snappedX =
              tEdge -
              (mi === 0 ? 0 : mi === 1 ? movingEl.size.width / 2 : movingEl.size.width);
            if (!activeGuidesX.includes(tEdge)) activeGuidesX.push(tEdge);
          }
        });
      });

      // Y snapping
      const movingEdgesY = [
        pos.y,
        pos.y + movingEl.size.height / 2,
        pos.y + movingEl.size.height,
      ];

      targets.forEach((target) => {
        const targetEdgesY = [
          target.position.y,
          target.position.y + target.size.height / 2,
          target.position.y + target.size.height,
        ];
        movingEdgesY.forEach((mEdge, mi) => {
          targetEdgesY.forEach((tEdge) => {
            if (Math.abs(mEdge - tEdge) < SNAP_THRESHOLD) {
              snappedY =
                tEdge -
                (mi === 0 ? 0 : mi === 1 ? movingEl.size.height / 2 : movingEl.size.height);
              if (!activeGuidesY.includes(tEdge)) activeGuidesY.push(tEdge);
            }
          });
        });
      });

      pageTargetsY.forEach((tEdge) => {
        movingEdgesY.forEach((mEdge, mi) => {
          if (Math.abs(mEdge - tEdge) < SNAP_THRESHOLD) {
            snappedY =
              tEdge -
              (mi === 0 ? 0 : mi === 1 ? movingEl.size.height / 2 : movingEl.size.height);
            if (!activeGuidesY.includes(tEdge)) activeGuidesY.push(tEdge);
          }
        });
      });

      setGuides({ x: activeGuidesX, y: activeGuidesY });
      onMoveElement(elId, { x: snappedX, y: snappedY });
    },
    [page.elements, onMoveElement]
  );

  // Track where the user right-clicked on the canvas for "Add at cursor" actions
  const handleContextMenuCapture = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scale = zoom / 100;
      contextClickPos.current = {
        x: Math.max(0, (e.clientX - rect.left) / scale),
        y: Math.max(0, (e.clientY - rect.top) / scale),
      };
    },
    [zoom]
  );

  const scale = zoom / 100;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Page label */}
      <div
        className={cn(
          "text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5",
          isActivePage ? "text-primary" : "text-muted-foreground"
        )}
      >
        {page.pageType === "notes" ? (
          <span className="inline-flex items-center gap-1">
            <span className="bg-amber-400/80 text-amber-900 text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-wider">
              Notes
            </span>
            Page {pageIndex + 1}
          </span>
        ) : (
          <span>Page {pageIndex + 1}</span>
        )}
        {page.elements.length > 0 && (
          <span className="text-muted-foreground font-normal">
            ({page.elements.length} element{page.elements.length !== 1 ? "s" : ""})
          </span>
        )}
      </div>

      {/* The A4 page with page-level context menu */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "relative shadow-xl transition-shadow",
              isActivePage && "ring-2 ring-primary shadow-2xl"
            )}
            style={{
              width: A4_WIDTH_PX * scale,
              height: A4_HEIGHT_PX * scale,
            }}
            onContextMenuCapture={handleContextMenuCapture}
          >
            <div
              ref={containerRef}
              className="origin-top-left relative overflow-hidden"
              style={{
                width: A4_WIDTH_PX,
                height: A4_HEIGHT_PX,
                transform: `scale(${scale})`,
                backgroundColor: page.backgroundColor,
              }}
              onClick={handleCanvasClick}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              data-canvas="true"
              data-page-id={page.id}
            >
              {/* ── NOTES PAGE: full-page notepad ── */}
              {page.pageType === "notes" && (
                <>
                  {/* Classic notebook horizontal lines — blue on white */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(transparent, transparent 31px, #9ec5e8 31px, #9ec5e8 32px)",
                      backgroundSize: "100% 32px",
                      backgroundPosition: "0 0",
                      opacity: 0.55,
                    }}
                    data-canvas="true"
                  />

                  {/* Red left margin line */}
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none"
                    style={{
                      left: 54,
                      width: 2,
                      backgroundColor: "rgba(210, 50, 50, 0.55)",
                    }}
                    data-canvas="true"
                    />

                  {page.notesLayout === "structured" ? (
                    <StructuredNotesPage
                      page={page}
                      onSelectPage={onSelectPage}
                      onUpdateNotesPageFields={onUpdateNotesPageFields}
                      onRequestNextStructuredNotesPage={onRequestNextStructuredNotesPage}
                      autoFocusNotes={isActivePage && !page.pageLabel}
                    />
                  ) : (
                    <textarea
                      value={page.pageLabel || ""}
                      onChange={(e) => onUpdatePageLabel?.(e.target.value)}
                    placeholder="Start writing your notes…"
                      spellCheck
                      className="absolute inset-0 w-full h-full bg-transparent resize-none outline-none placeholder:text-slate-300"
                      style={{
                        padding: "8px 20px 20px 66px",
                        fontSize: "14px",
                        lineHeight: "32px",
                        fontFamily: "inherit",
                        color: "#1e293b",
                        zIndex: 1,
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onSelectPage();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPage();
                      }}
                      onContextMenu={(e) => e.stopPropagation()}
                    />
                  )}
                </>
              )}

              {/* Grid overlay for active regular page (skip for notes — lines already there) */}
              {isActivePage && page.pageType !== "notes" && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.03]"
                  style={{
                    backgroundImage:
                      "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                  data-canvas="true"
                />
              )}

              {/* Page margin guides for active regular page */}
              {isActivePage && page.pageType !== "notes" && (
                <div
                  className="absolute pointer-events-none border border-dashed border-primary/10"
                  style={{ left: 40, top: 40, right: 40, bottom: 40 }}
                  data-canvas="true"
                />
              )}

              {/* Snapping Guides - Vertical */}
              {guides.x.map((x, i) => (
                <div
                  key={`guide-x-${i}`}
                  className="absolute top-0 bottom-0 border-l border-primary/50 pointer-events-none z-[100]"
                  style={{ left: x }}
                />
              ))}

              {/* Snapping Guides - Horizontal */}
              {guides.y.map((y, i) => (
                <div
                  key={`guide-y-${i}`}
                  className="absolute left-0 right-0 border-t border-primary/50 pointer-events-none z-[100]"
                  style={{ top: y }}
                />
              ))}

              {/* Rendered elements */}
              {page.elements.map((element) => (
                <DraggableElement
                  key={element.id}
                  element={element}
                  isSelected={selectedElementId === element.id}
                  onSelect={() => {
                    onSelectPage();
                    onSelectElement(element.id);
                  }}
                  onMove={(pos) => handleMoveElementInternal(element.id, pos)}
                  onResize={(size) => onResizeElement(element.id, size)}
                  onUpdate={(updates) => onUpdateElement(element.id, updates)}
                  onDelete={() => onDeleteElement(element.id)}
                  onDuplicate={() => onDuplicateElement(element.id)}
                  onBringToFront={() => onBringToFront(element.id)}
                  onSendToBack={() => onSendToBack(element.id)}
                  onCopyToClipboard={() => onCopyElement(element.id)}
                  onDragStart={onMoveStart}
                  onDragEnd={() => setGuides({ x: [], y: [] })}
                  containerRef={containerRef}
                />
              ))}

              {/* Empty state (regular pages only — notes page shows textarea placeholder) */}
              {page.elements.length === 0 && page.pageType !== "notes" && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  data-canvas="true"
                >
                  <div className="text-center space-y-2 opacity-30">
                    <p className="text-sm font-medium text-foreground">Drop assets here</p>
                    <p className="text-xs text-muted-foreground">Or right-click to add elements</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ContextMenuTrigger>

        {/* Page-level right-click context menu */}
        <ContextMenuContent className="w-52">
          <ContextMenuLabel className="text-xs">
            Page {pageIndex + 1}
          </ContextMenuLabel>
          <ContextMenuSeparator />

          <ContextMenuItem
            className="gap-2 text-xs"
            onClick={() => onAddText(contextClickPos.current)}
          >
            <Type className="w-3.5 h-3.5" />
            Add Text Here
          </ContextMenuItem>

          <ContextMenuItem
            className="gap-2 text-xs"
            onClick={() => onAddNote(contextClickPos.current)}
          >
            <StickyNote className="w-3.5 h-3.5" />
            Add Note Here
          </ContextMenuItem>

          <ContextMenuItem
            className="gap-2 text-xs"
            onClick={() => onAddShape(contextClickPos.current)}
          >
            <Square className="w-3.5 h-3.5" />
            Add Shape Here
          </ContextMenuItem>

          <ContextMenuItem
            className="gap-2 text-xs"
            onClick={onRequestImageUpload}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Upload Image
          </ContextMenuItem>

          {hasClipboard && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="gap-2 text-xs"
                onClick={() => onPasteElement(contextClickPos.current)}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                Paste Element
              </ContextMenuItem>
            </>
          )}

          {/* Images per page + Fit — only for regular pages */}
          {page.pageType !== "notes" && (onSetImagesPerPage || onFitCurrentPage) && (
            <>
              <ContextMenuSeparator />
              {onSetImagesPerPage && imagesPerPage !== undefined && (
                <ContextMenuSub>
                  <ContextMenuSubTrigger className="gap-2 text-xs">
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Images/Page ({imagesPerPage})
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-36">
                    {[1, 2, 4, 6, 8, 9, 12, 16].map((n) => (
                      <ContextMenuItem
                        key={n}
                        className="text-xs gap-2"
                        onClick={() => onSetImagesPerPage(n)}
                      >
                        {imagesPerPage === n && <CheckIcon className="w-3 h-3 text-primary" />}
                        {imagesPerPage !== n && <span className="w-3" />}
                        {n} {n === 1 ? "image" : "images"}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              )}
              {onFitCurrentPage && (
                <ContextMenuItem
                  className="gap-2 text-xs"
                  onClick={onFitCurrentPage}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Fit Images to Fill
                </ContextMenuItem>
              )}
            </>
          )}

          <ContextMenuSeparator />

          <ContextMenuItem
            className="gap-2 text-xs"
            onClick={onDuplicatePage}
          >
            <CopyIcon className="w-3.5 h-3.5" />
            Duplicate Page
          </ContextMenuItem>

          {pageCount > 1 && (
            <ContextMenuItem
              className="gap-2 text-xs text-destructive focus:text-destructive"
              onClick={onDeletePage}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Page
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
