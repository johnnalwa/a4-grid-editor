"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import type { PageElement } from "@/lib/document-types";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import { ContextMenuTrigger } from "@radix-ui/react-context-menu";
import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  ArrowUpToLine,
  ArrowDownToLine,
  Pencil,
  ClipboardCopy,
  GripVertical,
} from "lucide-react";

interface DraggableElementProps {
  element: PageElement;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (position: { x: number; y: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
  onUpdate: (updates: Partial<PageElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onCopyToClipboard: () => void;
  onDragStart?: () => void;
  onDrag?: (position: { x: number; y: number }) => void;
  onDragEnd?: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function DraggableElement({
  element,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onCopyToClipboard,
  onDragStart,
  onDrag,
  onDragEnd,
  containerRef,
}: DraggableElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, elX: 0, elY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // -- Drag handling --
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (element.locked || isEditing) return;
      e.stopPropagation();
      e.preventDefault();
      onSelect();
      setIsDragging(true);
      onDragStart?.();
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        elX: element.position.x,
        elY: element.position.y,
      };
    },
    [element.locked, element.position, isEditing, onSelect, onDragStart]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const scale =
        container.getBoundingClientRect().width / container.offsetWidth;
      const dx = (e.clientX - dragStart.current.x) / scale;
      const dy = (e.clientY - dragStart.current.y) / scale;
      
      const newPos = {
        x: Math.max(0, dragStart.current.elX + dx),
        y: Math.max(0, dragStart.current.elY + dy),
      };

      onDrag?.(newPos);
      onMove(newPos);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragEnd?.();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, containerRef, onMove, onDrag, onDragEnd]);

  // -- Resize handling --
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (element.locked) return;
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: element.size.width,
        h: element.size.height,
      };
    },
    [element.locked, element.size]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const scale =
        container.getBoundingClientRect().width / container.offsetWidth;
      const dx = (e.clientX - resizeStart.current.x) / scale;
      const dy = (e.clientY - resizeStart.current.y) / scale;
      onResize({
        width: Math.max(40, resizeStart.current.w + dx),
        height: Math.max(24, resizeStart.current.h + dy),
      });
    };

    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, containerRef, onResize]);

  // -- Text editing --
  const startEditing = useCallback(() => {
    if (element.type !== "text" && element.type !== "note") return;
    setIsEditing(true);
    // Focus the contentEditable after React renders
    requestAnimationFrame(() => {
      const el = editRef.current;
      if (el) {
        el.focus();
        // Place cursor at end
        const range = document.createRange();
        const sel = window.getSelection();
        if (el.childNodes.length > 0) {
          range.selectNodeContents(el);
          range.collapse(false);
        } else {
          range.setStart(el, 0);
          range.collapse(true);
        }
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  }, [element.type]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      startEditing();
    },
    [startEditing]
  );

  const handleBlur = useCallback(() => {
    if (isEditing && editRef.current) {
      onUpdate({ content: editRef.current.innerText || "" });
    }
    setIsEditing(false);
  }, [isEditing, onUpdate]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (isEditing && editRef.current) {
          onUpdate({ content: editRef.current.innerText || "" });
        }
        setIsEditing(false);
      }
      // Allow normal typing; don't propagate to workspace shortcuts
      e.stopPropagation();
    },
    [isEditing, onUpdate]
  );

  const handleOuterKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isEditing) return; // handled by inner
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onDelete();
      }
      if (e.key === "Enter" && (element.type === "text" || element.type === "note")) {
        e.preventDefault();
        startEditing();
      }
    },
    [isEditing, onDelete, element.type, startEditing]
  );

  // Determine text direction of the content
  const textDir = detectDirection(element.content || "");

  // -- Render inner content --
  const renderContent = () => {
    if (element.type === "image" && element.src) {
      return (
        <img
          src={element.src || "/placeholder.svg"}
          alt={element.fileName || "Uploaded image"}
          className="w-full h-full object-cover"
          draggable={false}
          onMouseDown={handleMouseDown}
        />
      );
    }

    if (element.type === "text") {
      return (
        <div
          ref={editRef}
          dir={textDir}
          className={cn(
            "w-full h-full px-2 py-1 outline-none whitespace-pre-wrap break-words",
            isEditing && "ring-2 ring-primary/50 rounded-sm bg-surface cursor-text"
          )}
          style={{
            fontSize: element.fontSize || 14,
            fontWeight: element.fontWeight || "normal",
            textAlign: textDir === "rtl" ? "right" : (element.textAlign || "left"),
            color: element.color || "#1e293b",
            direction: textDir,
            unicodeBidi: "plaintext",
          }}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onDoubleClick={handleDoubleClick}
          onBlur={handleBlur}
          onKeyDown={isEditing ? handleEditKeyDown : undefined}
          onMouseDown={isEditing ? undefined : handleMouseDown}
        >
          {element.content || (
            <span className="text-muted-foreground/50 italic text-[11px] pointer-events-none select-none">
              Double-click to type...
            </span>
          )}
        </div>
      );
    }

    if (element.type === "note") {
      return (
        <div
          ref={editRef}
          dir={textDir}
          className={cn(
            "w-full h-full p-3 outline-none shadow-sm whitespace-pre-wrap break-words",
            isEditing && "ring-2 ring-primary/50 cursor-text"
          )}
          style={{
            fontSize: element.fontSize || 12,
            fontWeight: element.fontWeight || "normal",
            textAlign: textDir === "rtl" ? "right" : (element.textAlign || "left"),
            color: element.color || "#1e293b",
            backgroundColor: element.backgroundColor || "#fef3c7",
            borderRadius: element.borderRadius || 4,
            direction: textDir,
            unicodeBidi: "plaintext",
          }}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onDoubleClick={handleDoubleClick}
          onBlur={handleBlur}
          onKeyDown={isEditing ? handleEditKeyDown : undefined}
          onMouseDown={isEditing ? undefined : handleMouseDown}
        >
          {element.content || (
            <span className="text-muted-foreground/60 italic text-[11px] pointer-events-none select-none">
              Double-click to add note...
            </span>
          )}
        </div>
      );
    }

    if (element.type === "shape") {
      return (
        <div
          className="w-full h-full"
          style={{
            backgroundColor: element.backgroundColor || "#dbeafe",
            borderRadius: element.borderRadius || 0,
          }}
          onMouseDown={handleMouseDown}
        />
      );
    }

    return null;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={isEditing}>
        <div
          ref={elementRef}
          className={cn(
            "absolute select-none group/el",
            isDragging && "cursor-grabbing z-50",
            !isDragging && !element.locked && !isEditing && "cursor-grab",
            element.locked && "cursor-default",
            isEditing && "cursor-text"
          )}
          style={{
            left: element.position.x,
            top: element.position.y,
            width: element.size.width,
            height: element.size.height,
            zIndex: element.zIndex,
            opacity: element.opacity,
          }}
          onMouseDown={(e) => {
            if (!isEditing) {
              e.stopPropagation();
              onSelect();
            }
          }}
          onKeyDown={handleOuterKeyDown}
          tabIndex={0}
          role="button"
          aria-label={`${element.type} element`}
        >
          {/* Selection outline */}
          {isSelected && (
            <div className="absolute -inset-px border-2 border-primary rounded-sm pointer-events-none z-10" />
          )}

          {/* Element content */}
          <div
            className="w-full h-full overflow-hidden"
            style={{ borderRadius: element.borderRadius || 0 }}
          >
            {renderContent()}
          </div>

          {/* Controls bar above element */}
          {isSelected && !isEditing && (
            <>
              <div
                className="absolute -top-7 left-0 flex items-center gap-0.5 bg-primary text-primary-foreground rounded-t-md px-1.5 py-0.5 text-[10px] font-medium shadow-sm"
                onMouseDown={handleMouseDown}
              >
                <GripVertical className="w-3 h-3" />
                <span className="capitalize">{element.type}</span>
              </div>

              <div className="absolute -top-7 right-0 flex items-center gap-0.5">
                <button
                  type="button"
                  className="p-0.5 bg-surface rounded shadow-sm border border-border hover:bg-muted transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate({ locked: !element.locked });
                  }}
                  title={element.locked ? "Unlock" : "Lock"}
                >
                  {element.locked ? (
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <Unlock className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
                <button
                  type="button"
                  className="p-0.5 bg-surface rounded shadow-sm border border-border hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Resize handle */}
              {!element.locked && (
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 cursor-se-resize z-20"
                  onMouseDown={handleResizeMouseDown}
                >
                  <div className="w-2.5 h-2.5 bg-primary rounded-sm border-2 border-primary-foreground shadow-sm absolute bottom-0 right-0" />
                </div>
              )}
            </>
          )}
        </div>
      </ContextMenuTrigger>

      {/* Right-click context menu */}
      <ContextMenuContent className="w-56">
        <ContextMenuLabel className="text-xs capitalize">
          {element.type} Element
        </ContextMenuLabel>
        <ContextMenuSeparator />

        {(element.type === "text" || element.type === "note") && (
          <>
            <ContextMenuItem
              className="gap-2 text-xs"
              onClick={() => startEditing()}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Text
              <ContextMenuShortcut>Enter</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        <ContextMenuItem
          className="gap-2 text-xs"
          onClick={onDuplicate}
        >
          <Copy className="w-3.5 h-3.5" />
          Duplicate
          <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem
          className="gap-2 text-xs"
          onClick={onCopyToClipboard}
        >
          <ClipboardCopy className="w-3.5 h-3.5" />
          Copy
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          className="gap-2 text-xs"
          onClick={onBringToFront}
        >
          <ArrowUpToLine className="w-3.5 h-3.5" />
          Bring to Front
        </ContextMenuItem>

        <ContextMenuItem
          className="gap-2 text-xs"
          onClick={onSendToBack}
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          Send to Back
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          className="gap-2 text-xs"
          onClick={() => onUpdate({ locked: !element.locked })}
        >
          {element.locked ? (
            <Unlock className="w-3.5 h-3.5" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          {element.locked ? "Unlock" : "Lock"}
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          className="gap-2 text-xs text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Detect whether the given text starts with RTL characters.
 * Falls back to "ltr" for empty or purely LTR content.
 */
function detectDirection(text: string): "rtl" | "ltr" {
  if (!text) return "ltr";
  // Strip whitespace and check first meaningful character
  const trimmed = text.replace(/\s+/g, "");
  if (!trimmed) return "ltr";
  // RTL Unicode ranges: Arabic, Hebrew, Thaana, Syriac, NKo, etc.
  const rtlRegex = /^[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
  return rtlRegex.test(trimmed) ? "rtl" : "ltr";
}
