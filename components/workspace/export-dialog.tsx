"use client";

import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { DocumentPage, PageElement } from "@/lib/document-types";
import { A4_WIDTH_MM, A4_HEIGHT_MM, A4_WIDTH_PX, A4_HEIGHT_PX } from "@/lib/document-types";
import {
  Download,
  Mail,
  MessageCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Files,
  Check,
  Share2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: DocumentPage[];
  documentName: string;
}

type ExportStatus = "idle" | "generating" | "success" | "error";
type ShareMethod = "pdf" | "email" | "whatsapp";

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
  const [activeShare, setActiveShare] = useState<ShareMethod | null>(null);

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

  // ── Core PDF generation ────────────────────────────────────────────────────
  const generatePDFBlob = useCallback(async (): Promise<Blob | null> => {
    const pagesToExport = pages.filter((p) => selectedPages.has(p.id));
    if (pagesToExport.length === 0) return null;

    const [{ default: jsPDF }, imageCache] = await Promise.all([
      import("jspdf"),
      preloadAllImages(pagesToExport),
    ]);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    for (let i = 0; i < pagesToExport.length; i++) {
      if (i > 0) pdf.addPage("a4", "portrait");
      const canvas = renderPageToCanvas(pagesToExport[i], imageCache);
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
    }
    return pdf.output("blob") as Blob;
  }, [pages, selectedPages, mergeAll]);

  // ── Save PDF ────────────────────────────────────────────────────────────────
  const handleSavePDF = useCallback(async () => {
    const pagesToExport = pages.filter((p) => selectedPages.has(p.id));
    if (pagesToExport.length === 0) return;

    setStatus("generating");
    setActiveShare("pdf");
    setErrorMessage("");

    try {
      const [{ default: jsPDF }, imageCache] = await Promise.all([
        import("jspdf"),
        preloadAllImages(pagesToExport),
      ]);

      if (mergeAll) {
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        for (let i = 0; i < pagesToExport.length; i++) {
          if (i > 0) pdf.addPage("a4", "portrait");
          const canvas = renderPageToCanvas(pagesToExport[i], imageCache);
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
        }
        pdf.save(`${fileName || "document"}.pdf`);
      } else {
        for (let i = 0; i < pagesToExport.length; i++) {
          const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
          const canvas = renderPageToCanvas(pagesToExport[i], imageCache);
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
          pdf.save(`${fileName || "document"}_page${i + 1}.pdf`);
        }
      }

      setStatus("success");
      setTimeout(() => { setStatus("idle"); setActiveShare(null); onOpenChange(false); }, 1500);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Export failed");
      setActiveShare(null);
    }
  }, [pages, selectedPages, mergeAll, fileName, onOpenChange, generatePDFBlob]);

  // ── Share helpers ──────────────────────────────────────────────────────────
  const downloadBlobAndOpen = (blob: Blob, name: string, url: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = name;
    a.click();
    URL.revokeObjectURL(blobUrl);
    setTimeout(() => window.open(url, "_blank"), 600);
  };

  const handleShareEmail = useCallback(async () => {
    setStatus("generating");
    setActiveShare("email");
    setErrorMessage("");
    try {
      const blob = await generatePDFBlob();
      if (!blob) throw new Error("No pages selected");

      const pdfName = `${fileName || "document"}.pdf`;
      const pdfFile = new File([blob], pdfName, { type: "application/pdf" });

      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({ files: [pdfFile], title: fileName || "Document" });
      } else {
        downloadBlobAndOpen(
          blob,
          pdfName,
          `mailto:?subject=${encodeURIComponent(fileName || "Document")}&body=${encodeURIComponent(`Hi,\n\nPlease find the attached document: ${pdfName}\n\nBest regards`)}`
        );
      }
      setStatus("success");
      setTimeout(() => { setStatus("idle"); setActiveShare(null); }, 2000);
    } catch (err: any) {
      if (err?.name === "AbortError") { setStatus("idle"); setActiveShare(null); return; }
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Share failed");
      setActiveShare(null);
    }
  }, [generatePDFBlob, fileName]);

  const handleShareWhatsApp = useCallback(async () => {
    setStatus("generating");
    setActiveShare("whatsapp");
    setErrorMessage("");
    try {
      const blob = await generatePDFBlob();
      if (!blob) throw new Error("No pages selected");

      const pdfName = `${fileName || "document"}.pdf`;
      const pdfFile = new File([blob], pdfName, { type: "application/pdf" });

      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({ files: [pdfFile], title: fileName || "Document" });
      } else {
        downloadBlobAndOpen(
          blob,
          pdfName,
          `https://wa.me/?text=${encodeURIComponent(`📄 ${pdfName}`)}`
        );
      }
      setStatus("success");
      setTimeout(() => { setStatus("idle"); setActiveShare(null); }, 2000);
    } catch (err: any) {
      if (err?.name === "AbortError") { setStatus("idle"); setActiveShare(null); return; }
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Share failed");
      setActiveShare(null);
    }
  }, [generatePDFBlob, fileName]);

  const selectedCount = selectedPages.size;
  const isWorking = status === "generating";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-surface">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Share2 className="w-5 h-5 text-primary" />
            Share & Export
          </DialogTitle>
          <DialogDescription>
            Select pages, then save as PDF or share directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File name */}
          <div>
            <Label className="text-xs font-medium text-foreground">File Name</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="text-sm h-9"
                placeholder="document"
              />
              <span className="text-sm text-muted-foreground shrink-0">.pdf</span>
            </div>
          </div>

          <Separator />

          {/* Page selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs font-medium text-foreground">
                Select Pages
                <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                  ({selectedCount} of {pages.length} selected)
                </span>
              </Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[10px] text-primary font-semibold hover:underline"
                >
                  All
                </button>
                <span className="text-muted-foreground text-[10px]">·</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-[10px] text-muted-foreground font-semibold hover:underline"
                >
                  None
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {pages.map((page, index) => {
                const isSelected = selectedPages.has(page.id);
                const isNotes = page.pageType === "notes";
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => togglePage(page.id)}
                    className={cn(
                      "aspect-[210/297] rounded border-2 transition-all relative overflow-hidden group",
                      isSelected
                        ? "border-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/40"
                        : "border-border hover:border-emerald-400/50"
                    )}
                    style={{ backgroundColor: page.backgroundColor }}
                  >
                    {/* Notes page mini lines */}
                    {isNotes && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(transparent, transparent 5px, #9ec5e870 5px, #9ec5e870 6px)",
                          backgroundSize: "100% 6px",
                        }}
                      />
                    )}

                    {/* Mini element previews */}
                    {page.elements.slice(0, 12).map((el) => (
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

                    {/* Selected overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-emerald-500/10">
                        <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                      </div>
                    )}

                    {/* Not-selected overlay (subtle) */}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-background/30 group-hover:bg-transparent transition-colors" />
                    )}

                    {/* Notes badge */}
                    {isNotes && (
                      <span className="absolute bottom-0.5 left-0.5 text-[6px] font-black bg-amber-400/80 text-amber-900 px-0.5 rounded-sm">
                        N
                      </span>
                    )}

                    {/* Page number */}
                    <span
                      className={cn(
                        "absolute bottom-0.5 right-1 text-[8px] font-bold",
                        isSelected ? "text-emerald-600" : "text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Merge option */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Files className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-foreground">Merge into single PDF</p>
                <p className="text-[10px] text-muted-foreground">Combine all selected pages into one file</p>
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
              {activeShare === "email"
                ? "PDF downloaded — paste it into your email!"
                : activeShare === "whatsapp"
                  ? "PDF downloaded — attach it in WhatsApp!"
                  : "PDF exported successfully!"}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="grid grid-cols-3 gap-2">
            {/* Save PDF */}
            <Button
              onClick={handleSavePDF}
              disabled={selectedCount === 0 || isWorking}
              className="gap-1.5 text-xs h-10 flex-col py-1.5 bg-primary hover:bg-primary/90"
            >
              {isWorking && activeShare === "pdf" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="text-[10px] leading-tight">Save PDF</span>
            </Button>

            {/* Share via Email */}
            <Button
              variant="outline"
              onClick={handleShareEmail}
              disabled={selectedCount === 0 || isWorking}
              className="gap-1.5 text-xs h-10 flex-col py-1.5 bg-transparent border-border hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/30"
            >
              {isWorking && activeShare === "email" ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : (
                <Mail className="w-4 h-4 text-blue-500" />
              )}
              <span className="text-[10px] leading-tight">Email</span>
            </Button>

            {/* Share via WhatsApp */}
            <Button
              variant="outline"
              onClick={handleShareWhatsApp}
              disabled={selectedCount === 0 || isWorking}
              className="gap-1.5 text-xs h-10 flex-col py-1.5 bg-transparent border-border hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950/30"
            >
              {isWorking && activeShare === "whatsapp" ? (
                <Loader2 className="w-4 h-4 animate-spin text-green-500" />
              ) : (
                <MessageCircle className="w-4 h-4 text-green-500" />
              )}
              <span className="text-[10px] leading-tight">WhatsApp</span>
            </Button>
          </div>

          <p className="text-[9px] text-muted-foreground text-center leading-tight">
            Email & WhatsApp will download the PDF first, then open the app.
            On mobile, native sharing is used when available.
          </p>

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isWorking}
            className="text-xs h-8 text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Preload all images in parallel ───────────────────────────────────────────

async function preloadAllImages(pages: DocumentPage[]): Promise<Map<string, HTMLImageElement>> {
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

// ─── Synchronous canvas renderer ──────────────────────────────────────────────

function renderPageToCanvas(
  page: DocumentPage,
  imageCache: Map<string, HTMLImageElement>
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = A4_WIDTH_PX * scale;
  canvas.height = A4_HEIGHT_PX * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = page.backgroundColor;
  ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

  // Notes page: classic notebook look — blue lines, red margin on white
  if (page.pageType === "notes") {
    // Horizontal blue ruled lines every 32px
    ctx.strokeStyle = "#9ec5e8";
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.6;
    for (let y = 32; y < A4_HEIGHT_PX; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(A4_WIDTH_PX, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Red left margin line
    ctx.strokeStyle = "rgba(210, 50, 50, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(54, 0);
    ctx.lineTo(54, A4_HEIGHT_PX);
    ctx.stroke();

    // Notes content text — wrap long lines and track y position
    if (page.pageLabel) {
      ctx.fillStyle = "#1e293b";
      ctx.font = "14px Inter, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.direction = "ltr";
      const maxTextWidth = A4_WIDTH_PX - 66 - 20; // right margin 20px
      const rawLines = page.pageLabel.split("\n");
      let currentY = 30; // baseline of first line (sits just above the 32px rule line)
      for (const rawLine of rawLines) {
        const wrappedLines = rawLine === "" ? [""] : wrapText(ctx, rawLine, maxTextWidth);
        for (const wLine of wrappedLines) {
          if (currentY > A4_HEIGHT_PX + 16) break;
          ctx.fillText(wLine, 66, currentY);
          currentY += 32;
        }
        if (currentY > A4_HEIGHT_PX + 16) break;
      }
    }
  }

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

function drawImage(ctx: CanvasRenderingContext2D, element: PageElement, img: HTMLImageElement) {
  const crop = element.crop ?? { x: 0, y: 0, width: 1, height: 1 };
  const sx = img.naturalWidth * crop.x;
  const sy = img.naturalHeight * crop.y;
  const sw = img.naturalWidth * crop.width;
  const sh = img.naturalHeight * crop.height;
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
  if (element.borderRadius) ctx.restore();
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
  if (align === "center") xBase = element.position.x + element.size.width / 2;
  else if (align === "right") xBase = element.position.x + element.size.width - 4;
  lines.forEach((line, i) => {
    ctx.fillText(line, xBase, element.position.y + (element.fontSize || 14) + i * lineHeight);
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
    if (noteAlign === "center") xBase = element.position.x + element.size.width / 2;
    else if (noteAlign === "right") xBase = element.position.x + element.size.width - 12;
    lines.forEach((line, i) => {
      ctx.fillText(line, xBase, element.position.y + 12 + (element.fontSize || 12) + i * lineHeight);
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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
