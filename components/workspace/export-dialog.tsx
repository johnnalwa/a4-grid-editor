"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { DocumentPage, PageElement } from "@/lib/document-types";
import { A4_WIDTH_MM, A4_HEIGHT_MM, A4_WIDTH_PX, A4_HEIGHT_PX } from "@/lib/document-types";
import {
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Files,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: DocumentPage[];
  documentName: string;
}

type ExportStatus = "idle" | "generating" | "success" | "error";

export function ExportDialog({
  open,
  onOpenChange,
  pages,
  documentName,
}: ExportDialogProps) {
  const [fileName, setFileName] = useState(documentName.replace(/\.pdf$/, ""));
  const [selectedPages, setSelectedPages] = useState<Set<string>>(
    new Set(pages.map((p) => p.id))
  );
  const [mergeAll, setMergeAll] = useState(true);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const togglePage = useCallback((pageId: string) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedPages(new Set(pages.map((p) => p.id)));
  }, [pages]);

  const deselectAll = useCallback(() => {
    setSelectedPages(new Set());
  }, []);

  const handleExport = useCallback(async () => {
    const pagesToExport = pages.filter((p) => selectedPages.has(p.id));
    if (pagesToExport.length === 0) return;

    setStatus("generating");
    setErrorMessage("");

    try {
      // Parallel: import jsPDF AND preload all images at the same time
      const [{ default: jsPDF }, imageCache] = await Promise.all([
        import("jspdf"),
        preloadAllImages(pagesToExport),
      ]);

      if (mergeAll) {
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        for (let i = 0; i < pagesToExport.length; i++) {
          if (i > 0) pdf.addPage("a4", "portrait");
          const canvas = renderPageToCanvas(pagesToExport[i], imageCache);
          const imgData = canvas.toDataURL("image/jpeg", 0.92);
          pdf.addImage(imgData, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
        }

        pdf.save(`${fileName || "document"}.pdf`);
      } else {
        for (let i = 0; i < pagesToExport.length; i++) {
          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
          });
          const canvas = renderPageToCanvas(pagesToExport[i], imageCache);
          const imgData = canvas.toDataURL("image/jpeg", 0.92);
          pdf.addImage(imgData, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
          pdf.save(`${fileName || "document"}_page${i + 1}.pdf`);
        }
      }

      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Export failed"
      );
    }
  }, [pages, selectedPages, mergeAll, fileName, onOpenChange]);

  const selectedCount = selectedPages.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-surface">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Download className="w-5 h-5 text-primary" />
            Export Document
          </DialogTitle>
          <DialogDescription>
            Export your document pages as a high-quality PDF file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File name */}
          <div>
            <Label className="text-xs font-medium text-foreground">
              File Name
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="text-sm h-9"
                placeholder="document"
              />
              <span className="text-sm text-muted-foreground">.pdf</span>
            </div>
          </div>

          <Separator />

          {/* Merge option */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Files className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  Merge into single PDF
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Combine all selected pages into one file
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={mergeAll}
              onClick={() => setMergeAll(!mergeAll)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                mergeAll ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-4 w-4 rounded-full bg-primary-foreground shadow-sm transition-transform",
                  mergeAll ? "translate-x-4.5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          <Separator />

          {/* Page selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-foreground">
                Pages ({selectedCount} of {pages.length})
              </Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[10px] text-primary font-medium hover:underline"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-[10px] text-muted-foreground font-medium hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {pages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => togglePage(page.id)}
                  className={cn(
                    "aspect-[210/297] rounded-sm border-2 transition-all flex items-center justify-center text-[10px] font-bold",
                    selectedPages.has(page.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Status messages */}
          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMessage}
            </div>
          )}
          {status === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              PDF exported successfully!
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={status === "generating"}
            className="bg-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedCount === 0 || status === "generating"}
            className="gap-2"
          >
            {status === "generating" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Export {selectedCount} {selectedCount === 1 ? "Page" : "Pages"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Preload all images in parallel ──────────────────────────────────────────

async function preloadAllImages(
  pages: DocumentPage[]
): Promise<Map<string, HTMLImageElement>> {
  const srcs = new Set<string>();
  for (const page of pages) {
    for (const el of page.elements) {
      if (el.type === "image" && el.src) srcs.add(el.src);
    }
  }

  const results = await Promise.allSettled(
    [...srcs].map(
      (src) =>
        new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve([src, img]);
          img.onerror = () => reject(new Error(`Failed to load: ${src.slice(0, 60)}`));
          img.src = src;
        })
    )
  );

  const cache = new Map<string, HTMLImageElement>();
  for (const r of results) {
    if (r.status === "fulfilled") cache.set(r.value[0], r.value[1]);
  }
  return cache;
}

// ─── Synchronous canvas renderer (images preloaded) ───────────────────────────

function renderPageToCanvas(
  page: DocumentPage,
  imageCache: Map<string, HTMLImageElement>
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const scale = 2; // 2× for high DPI / crisp PDF
  canvas.width = A4_WIDTH_PX * scale;
  canvas.height = A4_HEIGHT_PX * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.scale(scale, scale);

  // Page background
  ctx.fillStyle = page.backgroundColor;
  ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

  // Elements in z-order
  const sorted = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);

  for (const element of sorted) {
    ctx.save();
    ctx.globalAlpha = element.opacity;

    if (element.type === "image" && element.src) {
      const img = imageCache.get(element.src);
      if (img) drawImage(ctx, element, img);
    } else if (element.type === "text") {
      drawText(ctx, element);
    } else if (element.type === "note") {
      drawNote(ctx, element);
    } else if (element.type === "shape") {
      drawShape(ctx, element);
    }

    ctx.restore();
  }

  return canvas;
}

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

function drawImage(
  ctx: CanvasRenderingContext2D,
  element: PageElement,
  img: HTMLImageElement
) {
  const crop = element.crop ?? { x: 0, y: 0, width: 1, height: 1 };
  // Source rectangle (pixels in natural image)
  const sx = img.naturalWidth * crop.x;
  const sy = img.naturalHeight * crop.y;
  const sw = img.naturalWidth * crop.width;
  const sh = img.naturalHeight * crop.height;
  // Destination rectangle
  const dx = element.position.x;
  const dy = element.position.y;
  const dw = element.size.width;
  const dh = element.size.height;

  if (element.borderRadius) {
    ctx.save();
    roundRect(ctx, dx, dy, dw, dh, element.borderRadius);
    ctx.clip();
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

  if (element.borderRadius) {
    ctx.restore();
  }
}

function drawText(ctx: CanvasRenderingContext2D, element: PageElement) {
  ctx.fillStyle = element.color || "#1e293b";
  const weight = element.fontWeight === "bold" ? "bold" : "normal";
  ctx.font = `${weight} ${element.fontSize || 14}px Inter, system-ui, sans-serif`;

  const text = element.content || "";
  const isRtl = detectTextDirection(text) === "rtl";
  const align = isRtl ? "right" : (element.textAlign || "left");
  ctx.textAlign = align;
  ctx.direction = isRtl ? "rtl" : "ltr";

  const lines = wrapText(ctx, text, element.size.width - 8);
  const lineHeight = (element.fontSize || 14) * 1.4;

  let xBase = element.position.x + 4;
  if (align === "center") {
    xBase = element.position.x + element.size.width / 2;
  } else if (align === "right") {
    xBase = element.position.x + element.size.width - 4;
  }

  lines.forEach((line, i) => {
    ctx.fillText(
      line,
      xBase,
      element.position.y + (element.fontSize || 14) + i * lineHeight
    );
  });
}

function drawNote(ctx: CanvasRenderingContext2D, element: PageElement) {
  const r = element.borderRadius || 4;
  ctx.fillStyle = element.backgroundColor || "#fef3c7";
  roundRect(ctx, element.position.x, element.position.y, element.size.width, element.size.height, r);

  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (element.content) {
    ctx.fillStyle = element.color || "#1e293b";
    const weight = element.fontWeight === "bold" ? "bold" : "normal";
    ctx.font = `${weight} ${element.fontSize || 12}px Inter, system-ui, sans-serif`;

    const noteIsRtl = detectTextDirection(element.content) === "rtl";
    const noteAlign = noteIsRtl ? "right" : (element.textAlign || "left");
    ctx.textAlign = noteAlign;
    ctx.direction = noteIsRtl ? "rtl" : "ltr";

    const lines = wrapText(ctx, element.content, element.size.width - 24);
    const lineHeight = (element.fontSize || 12) * 1.4;

    let xBase = element.position.x + 12;
    if (noteAlign === "center") {
      xBase = element.position.x + element.size.width / 2;
    } else if (noteAlign === "right") {
      xBase = element.position.x + element.size.width - 12;
    }

    lines.forEach((line, i) => {
      ctx.fillText(
        line,
        xBase,
        element.position.y + 12 + (element.fontSize || 12) + i * lineHeight
      );
    });
  }
}

function drawShape(ctx: CanvasRenderingContext2D, element: PageElement) {
  ctx.fillStyle = element.backgroundColor || "#dbeafe";
  const r = element.borderRadius || 0;
  if (r > 0) {
    roundRect(ctx, element.position.x, element.position.y, element.size.width, element.size.height, r);
    ctx.fill();
  } else {
    ctx.fillRect(element.position.x, element.position.y, element.size.width, element.size.height);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

function detectTextDirection(text: string): "rtl" | "ltr" {
  if (!text) return "ltr";
  const trimmed = text.replace(/\s+/g, "");
  if (!trimmed) return "ltr";
  return /^[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.test(trimmed) ? "rtl" : "ltr";
}
