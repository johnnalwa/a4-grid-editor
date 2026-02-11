"use client";

import React, { useRef, useCallback } from "react";
import type { DocumentPage, PageElement, Position } from "@/lib/document-types";
import { A4_WIDTH_PX, A4_HEIGHT_PX } from "@/lib/document-types";
import { DraggableElement } from "./draggable-element";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
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
}: PageCanvasProps) {
  const [guides, setGuides] = React.useState<{x?: number, y?: number}[]>([]);
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

  const handleDrag = useCallback((elementId: string, position: Position) => {
    const activeElement = page.elements.find(el => el.id === elementId);
    if (!activeElement) return;

    const threshold = 5;
    const newGuides: {x?: number, y?: number}[] = [];
    const snappedPos = { ...position };

    const otherElements = page.elements.filter(el => el.id !== elementId);
    
    // Y-axis (Horizontal guides)
    const yTargets = [
      0, A4_HEIGHT_PX, // Page edges
      ...otherElements.flatMap(el => [el.position.y, el.position.y + el.size.height, el.position.y + el.size.height / 2])
    ];

    for (const targetY of yTargets) {
      if (Math.abs(snappedPos.y - targetY) < threshold) {
        snappedPos.y = targetY;
        newGuides.push({ y: targetY });
      } else if (Math.abs(snappedPos.y + activeElement.size.height - targetY) < threshold) {
        snappedPos.y = targetY - activeElement.size.height;
        newGuides.push({ y: targetY });
      } else if (Math.abs(snappedPos.y + activeElement.size.height / 2 - targetY) < threshold) {
        snappedPos.y = targetY - activeElement.size.height / 2;
        newGuides.push({ y: targetY });
      }
    }

    // X-axis (Vertical guides)
    const xTargets = [
      0, A4_WIDTH_PX, // Page edges
      ...otherElements.flatMap(el => [el.position.x, el.position.x + el.size.width, el.position.x + el.size.width / 2])
    ];

    for (const targetX of xTargets) {
      if (Math.abs(snappedPos.x - targetX) < threshold) {
        snappedPos.x = targetX;
        newGuides.push({ x: targetX });
      } else if (Math.abs(snappedPos.x + activeElement.size.width - targetX) < threshold) {
        snappedPos.x = targetX - activeElement.size.width;
        newGuides.push({ x: targetX });
      } else if (Math.abs(snappedPos.x + activeElement.size.width / 2 - targetX) < threshold) {
        snappedPos.x = targetX - activeElement.size.width / 2;
        newGuides.push({ x: targetX });
      }
    }

    setGuides(newGuides);
    onMoveElement(elementId, snappedPos);
  }, [page.elements, onMoveElement]);

  const scale = zoom / 100;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Page label */}
      <div
        className={cn(
          "text-[10px] font-bold uppercase tracking-widest transition-colors",
          isActivePage ? "text-primary" : "text-muted-foreground"
        )}
      >
        Page {pageIndex + 1}
        {page.elements.length > 0 && (
          <span className="text-muted-foreground font-normal ml-2">
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
              {/* Grid overlay for active page */}
              {isActivePage && (
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

              {/* Page margin guides for active page */}
              {isActivePage && (
                <div
                  className="absolute pointer-events-none border border-dashed border-primary/10"
                  style={{ left: 40, top: 40, right: 40, bottom: 40 }}
                  data-canvas="true"
                />
              )}

              {/* Alignment Guides */}
              {isActivePage && guides.map((guide, i) => (
                <div
                  key={i}
                  className="absolute bg-primary/40 pointer-events-none z-50"
                  style={{
                    left: guide.x !== undefined ? guide.x : 0,
                    top: guide.y !== undefined ? guide.y : 0,
                    width: guide.x !== undefined ? 1 : '100%',
                    height: guide.y !== undefined ? 1 : '100%',
                  }}
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
                  onMove={(pos) => onMoveElement(element.id, pos)}
                  onDrag={(pos) => handleDrag(element.id, pos)}
                  onDragEnd={() => setGuides([])}
                  onResize={(size) => onResizeElement(element.id, size)}
                  onUpdate={(updates) => onUpdateElement(element.id, updates)}
                  onDelete={() => onDeleteElement(element.id)}
                  onDuplicate={() => onDuplicateElement(element.id)}
                  onBringToFront={() => onBringToFront(element.id)}
                  onSendToBack={() => onSendToBack(element.id)}
                  onCopyToClipboard={() => onCopyElement(element.id)}
                  containerRef={containerRef}
                />
              ))}

              {/* Empty state */}
              {page.elements.length === 0 && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  data-canvas="true"
                >
                  <div className="text-center space-y-2 opacity-30">
                    <p className="text-sm font-medium text-foreground">
                      Drop assets here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Or right-click to add elements
                    </p>
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
