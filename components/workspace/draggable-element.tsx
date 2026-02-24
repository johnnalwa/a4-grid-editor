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
  Crop,
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
  onDragEnd,
  containerRef,
}: DraggableElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropResizeType, setCropResizeType] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0, elX: 0, elY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const cropStart = useRef<{ x: number; y: number; crop: { x: number; y: number; width: number; height: number } } | null>(null);

  // -- Drag handling --
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Don't start a drag while in crop mode — crop handles handle their own events
      if (element.locked || isEditing || isCropping) return;
      if (!e.isPrimary) return;
      e.stopPropagation();
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
    [element.locked, element.position, isEditing, isCropping, onSelect, onDragStart]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const scale =
        container.getBoundingClientRect().width / container.offsetWidth;
      const dx = (e.clientX - dragStart.current.x) / scale;
      const dy = (e.clientY - dragStart.current.y) / scale;
      onMove({
        x: Math.max(0, dragStart.current.elX + dx),
        y: Math.max(0, dragStart.current.elY + dy),
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      onDragEnd?.();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, containerRef, onMove]);

  // -- Resize handling --
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (element.locked) return;
      e.stopPropagation();
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

    const handlePointerMove = (e: PointerEvent) => {
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

    const handlePointerUp = () => setIsResizing(false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizing, containerRef, onResize]);
 
  // -- Crop handling --
  const handleCropPointerDown = useCallback(
    (e: React.PointerEvent, type: string) => {
      e.stopPropagation();
      setCropResizeType(type);
      const crop = element.crop || { x: 0, y: 0, width: 1, height: 1 };
      cropStart.current = {
        x: e.clientX,
        y: e.clientY,
        crop: { ...crop },
      };
    },
    [element.crop]
  );
 
  useEffect(() => {
    if (!cropResizeType || !cropStart.current) return;
 
    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container || !cropStart.current) return;
 
      const rect = container.getBoundingClientRect();
      const scale = rect.width / container.offsetWidth;
      
      const dx = (e.clientX - cropStart.current.x) / scale;
      const dy = (e.clientY - cropStart.current.y) / scale;
      
      const { width: cw, height: ch } = element.size;
      const startCrop = cropStart.current.crop;
      const newCrop = { ...startCrop };
 
      // Horizontal — delta is simply pixel movement / element display size → image fraction
      if (cropResizeType.includes("left")) {
        const deltaCropX = dx / cw;
        newCrop.x = Math.max(0, Math.min(startCrop.x + startCrop.width - 0.05, startCrop.x + deltaCropX));
        newCrop.width = Math.max(0.05, startCrop.width - (newCrop.x - startCrop.x));
      } else if (cropResizeType.includes("right")) {
        const deltaCropW = dx / cw;
        newCrop.width = Math.max(0.05, Math.min(1 - startCrop.x, startCrop.width + deltaCropW));
      }

      // Vertical
      if (cropResizeType.includes("top")) {
        const deltaCropY = dy / ch;
        newCrop.y = Math.max(0, Math.min(startCrop.y + startCrop.height - 0.05, startCrop.y + deltaCropY));
        newCrop.height = Math.max(0.05, startCrop.height - (newCrop.y - startCrop.y));
      } else if (cropResizeType.includes("bottom")) {
        const deltaCropH = dy / ch;
        newCrop.height = Math.max(0.05, Math.min(1 - startCrop.y, startCrop.height + deltaCropH));
      }
 
      onUpdate({ crop: newCrop });
    };
 
    const handlePointerUp = () => setCropResizeType(null);
 
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [cropResizeType, containerRef, element.size, onUpdate]);

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
      const crop = element.crop || { x: 0, y: 0, width: 1, height: 1 };
      
      return (
        <div className="w-full h-full relative overflow-hidden">
          <img
            src={element.src || "/placeholder.svg"}
            alt={element.fileName || "Uploaded image"}
            className="absolute max-w-none origin-top-left"
            style={{
              width: `${100 / crop.width}%`,
              height: `${100 / crop.height}%`,
              left: `${-crop.x * (100 / crop.width)}%`,
              top: `${-crop.y * (100 / crop.height)}%`,
            }}
            draggable={false}
            onPointerDown={handlePointerDown}
          />
        </div>
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
          onPointerDown={isEditing ? undefined : handlePointerDown}
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
          onPointerDown={isEditing ? undefined : handlePointerDown}
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
          onPointerDown={handlePointerDown}
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
          onPointerDown={(e) => {
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
            className={cn(
              "w-full h-full overflow-hidden",
              isCropping && "ring-4 ring-primary ring-inset shadow-2xl z-30"
            )}
            style={{ borderRadius: element.borderRadius || 0 }}
          >
            {renderContent()}
            
            {/* Crop Overlays */}
            {isCropping && (
              <div className="absolute inset-0 pointer-events-none z-40">
                <div className="absolute inset-0 border-2 border-white/50 border-dashed" />
                <div className="absolute inset-0 flex flex-wrap">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-1/3 h-1/3 border border-white/20" />
                  ))}
                </div>
              </div>
            )}
          </div>
 
          {/* Crop Handles */}
          {isSelected && isCropping && (
            <div className="absolute inset-0 z-50 pointer-events-none">
              <CropHandle position="top-left" onPointerDown={(e) => handleCropPointerDown(e, "top-left")} />
              <CropHandle position="top-right" onPointerDown={(e) => handleCropPointerDown(e, "top-right")} />
              <CropHandle position="bottom-left" onPointerDown={(e) => handleCropPointerDown(e, "bottom-left")} />
              <CropHandle position="bottom-right" onPointerDown={(e) => handleCropPointerDown(e, "bottom-right")} />
              <CropHandle position="top" onPointerDown={(e) => handleCropPointerDown(e, "top")} />
              <CropHandle position="bottom" onPointerDown={(e) => handleCropPointerDown(e, "bottom")} />
              <CropHandle position="left" onPointerDown={(e) => handleCropPointerDown(e, "left")} />
              <CropHandle position="right" onPointerDown={(e) => handleCropPointerDown(e, "right")} />
              
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-2 pointer-events-auto">
                <Crop className="w-3 h-3" />
                <span>Cropping Mode</span>
                <button 
                  onClick={() => setIsCropping(false)}
                  className="bg-white/20 hover:bg-white/30 rounded px-1.5 py-0.5 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* File name label for images */}
          {element.type === "image" && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 top-full pt-1.5 w-[90%] flex justify-center z-20"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                defaultValue={element.fileName || "unnamed.png"}
                className={cn(
                  "bg-surface/90 backdrop-blur-sm border border-border/60 rounded px-1.5 py-0.5 text-[9px] text-center font-medium outline-none transition-all w-full shadow-sm",
                  "hover:bg-surface hover:border-primary/40 text-muted-foreground hover:text-foreground",
                  "focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/10 focus:w-full focus:text-foreground focus:shadow-md"
                )}
                onFocus={(e) => e.target.select()}
                onBlur={(e) => {
                  if (e.target.value !== element.fileName) {
                    onUpdate({ fileName: e.target.value });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                  e.stopPropagation();
                }}
              />
            </div>
          )}

          {/* Controls bar above element */}
          {isSelected && !isEditing && (
            <>
              <div
                className="absolute -top-7 left-0 flex items-center gap-0.5 bg-primary text-primary-foreground rounded-t-md px-1.5 py-0.5 text-[10px] font-medium shadow-sm"
                onPointerDown={handlePointerDown}
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

              {/* Resize handle — hidden in crop mode to avoid conflict with crop handles */}
              {!element.locked && !isCropping && (
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 cursor-se-resize z-20"
                  onPointerDown={handleResizePointerDown}
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

        {element.type === "image" && (
          <>
            <ContextMenuItem
              className="gap-2 text-xs"
              onClick={() => setIsCropping(!isCropping)}
            >
              <Crop className="w-3.5 h-3.5" />
              {isCropping ? "Finish Cropping" : "Crop Image"}
            </ContextMenuItem>
            {element.crop && (
               <ContextMenuItem
                className="gap-2 text-xs"
                onClick={() => onUpdate({ crop: undefined })}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Crop
              </ContextMenuItem>
            )}
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

function CropHandle({ 
  position, 
  onPointerDown 
}: { 
  position: string; 
  onPointerDown: (e: React.PointerEvent) => void 
}) {
  const isCorner = position.includes("-");
  
  let classes = "absolute w-4 h-4 pointer-events-auto flex items-center justify-center group/handle";
  let innerClasses = "bg-primary border-2 border-white shadow-md transition-transform group-hover/handle:scale-125";
  
  if (position === "top-left") {
    classes += " -top-1 -left-1 cursor-nwse-resize";
    innerClasses += " w-3 h-3 rounded-sm";
  } else if (position === "top-right") {
    classes += " -top-1 -right-1 cursor-nesw-resize";
    innerClasses += " w-3 h-3 rounded-sm";
  } else if (position === "bottom-left") {
    classes += " -bottom-1 -left-1 cursor-nesw-resize";
    innerClasses += " w-3 h-3 rounded-sm";
  } else if (position === "bottom-right") {
    classes += " -bottom-1 -right-1 cursor-nwse-resize";
    innerClasses += " w-3 h-3 rounded-sm";
  } else if (position === "top") {
    classes += " -top-1 left-1/2 -translate-x-1/2 cursor-ns-resize h-4 w-8";
    innerClasses += " w-6 h-1.5 rounded-full";
  } else if (position === "bottom") {
    classes += " -bottom-1 left-1/2 -translate-x-1/2 cursor-ns-resize h-4 w-8";
    innerClasses += " w-6 h-1.5 rounded-full";
  } else if (position === "left") {
    classes += " top-1/2 -left-1 -translate-y-1/2 cursor-ew-resize w-4 h-8";
    innerClasses += " w-1.5 h-6 rounded-full";
  } else if (position === "right") {
    classes += " top-1/2 -right-1 -translate-y-1/2 cursor-ew-resize w-4 h-8";
    innerClasses += " w-1.5 h-6 rounded-full";
  }

  return (
    <div className={classes} onPointerDown={onPointerDown}>
      <div className={innerClasses} />
    </div>
  );
}
