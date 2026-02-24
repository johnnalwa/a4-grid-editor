"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { PageElement, DocumentPage } from "@/lib/document-types";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Layers,
  Palette,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertiesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedElement: PageElement | null;
  selectedPage: DocumentPage | null;
  onUpdateElement: (updates: Partial<PageElement>) => void;
  onDeleteElement: () => void;
  onDuplicateElement: () => void;
  onUpdatePageBackground: (color: string) => void;
  isMobile?: boolean;
}

const NOTE_COLORS = [
  { label: "Yellow", value: "#fef3c7" },
  { label: "Blue", value: "#dbeafe" },
  { label: "Green", value: "#d1fae5" },
  { label: "Pink", value: "#fce7f3" },
  { label: "Purple", value: "#ede9fe" },
  { label: "Orange", value: "#fed7aa" },
];

const PAGE_BG_COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Warm", value: "#fefce8" },
  { label: "Cool", value: "#f0f9ff" },
  { label: "Gray", value: "#f8fafc" },
  { label: "Dark", value: "#1e293b" },
];

const A4_WIDTH_PX = 595;
const A4_HEIGHT_PX = 842;
const A4_MARGIN_PX = 40;

export function PropertiesPanel({
  isOpen,
  onClose,
  selectedElement,
  selectedPage,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onUpdatePageBackground,
  isMobile = false,
}: PropertiesPanelProps) {
  if (!isOpen || (!selectedElement && !selectedPage)) {
    return null;
  }

  const panelClasses = cn(
    "border-l border-border bg-surface shrink-0 flex flex-col transition-all duration-300 h-full shadow-lg",
    isMobile ? "w-full sm:w-80" : "w-64"
  );

  if (!selectedElement && !selectedPage) {
    return (
      <aside className={panelClasses}>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Layers className="w-8 h-8 text-muted-foreground/30 mb-3" />
          <p className="text-xs font-medium text-muted-foreground">
            Select an element to view properties
          </p>
        </div>
      </aside>
    );
  }

  // Show page properties when no element is selected
  if (!selectedElement && selectedPage) {
    return (
      <aside className={panelClasses}>
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground">Page Properties</h3>
          {isMobile && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                Background
              </Label>
              <div className="flex flex-wrap gap-2">
                {PAGE_BG_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => onUpdatePageBackground(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-md border-2 transition-all",
                      selectedPage.backgroundColor === color.value
                        ? "border-primary scale-110"
                        : "border-border hover:border-primary/50"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
              <div className="mt-2">
                <Input
                  type="color"
                  value={selectedPage.backgroundColor}
                  onChange={(e) => onUpdatePageBackground(e.target.value)}
                  className="h-8 w-full cursor-pointer"
                />
              </div>
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                Elements
              </Label>
              <p className="text-xs text-muted-foreground">
                {selectedPage.elements.length} element{selectedPage.elements.length !== 1 ? "s" : ""} on this page
              </p>
            </div>
          </div>
        </ScrollArea>
      </aside>
    );
  }

  if (!selectedElement) return null;

  const isTextOrNote =
    selectedElement.type === "text" || selectedElement.type === "note";

  return (
    <aside className={panelClasses}>
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button variant="ghost" size="icon" className="h-6 w-6 mr-1" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
          <h3 className="text-xs font-bold text-foreground capitalize">
            {selectedElement.type}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onDuplicateElement}
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-destructive"
            onClick={onDeleteElement}
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Position */}
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
              Position
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">X</Label>
                <Input
                  type="number"
                  value={Math.round(selectedElement.position.x)}
                  onChange={(e) =>
                    onUpdateElement({
                      position: {
                        ...selectedElement.position,
                        x: Number(e.target.value),
                      },
                    })
                  }
                  className="h-7 text-xs"
                  disabled={selectedElement.locked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Y</Label>
                <Input
                  type="number"
                  value={Math.round(selectedElement.position.y)}
                  onChange={(e) =>
                    onUpdateElement({
                      position: {
                        ...selectedElement.position,
                        y: Number(e.target.value),
                      },
                    })
                  }
                  className="h-7 text-xs"
                  disabled={selectedElement.locked}
                />
              </div>
            </div>
          </div>

          {/* Size */}
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
              Size
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">W</Label>
                <Input
                  type="number"
                  value={Math.round(selectedElement.size.width)}
                  onChange={(e) =>
                    onUpdateElement({
                      size: {
                        ...selectedElement.size,
                        width: Math.max(20, Number(e.target.value)),
                      },
                    })
                  }
                  className="h-7 text-xs"
                  disabled={selectedElement.locked}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">H</Label>
                <Input
                  type="number"
                  value={Math.round(selectedElement.size.height)}
                  onChange={(e) =>
                    onUpdateElement({
                      size: {
                        ...selectedElement.size,
                        height: Math.max(20, Number(e.target.value)),
                      },
                    })
                  }
                  className="h-7 text-xs"
                  disabled={selectedElement.locked}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Opacity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Opacity
              </Label>
              <span className="text-[10px] text-muted-foreground font-medium">
                {Math.round(selectedElement.opacity * 100)}%
              </span>
            </div>
            <Slider
              value={[selectedElement.opacity * 100]}
              onValueChange={([val]) =>
                onUpdateElement({ opacity: val / 100 })
              }
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Lock */}
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Lock Position
            </Label>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() =>
                onUpdateElement({ locked: !selectedElement.locked })
              }
            >
              {selectedElement.locked ? (
                <Lock className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>

          {/* Text/Note properties */}
          {isTextOrNote && (
            <>
              <Separator />
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Typography
                </Label>
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      Size
                    </Label>
                    <Input
                      type="number"
                      value={selectedElement.fontSize || 14}
                      onChange={(e) =>
                        onUpdateElement({
                          fontSize: Math.max(8, Number(e.target.value)),
                        })
                      }
                      className="h-7 text-xs"
                      min={8}
                      max={72}
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant={
                        selectedElement.fontWeight === "bold"
                          ? "secondary"
                          : "ghost"
                      }
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        onUpdateElement({
                          fontWeight:
                            selectedElement.fontWeight === "bold"
                              ? "normal"
                              : "bold",
                        })
                      }
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </Button>
                    <div className="h-4 w-px bg-border" />
                    <Button
                      variant={
                        selectedElement.textAlign === "left"
                          ? "secondary"
                          : "ghost"
                      }
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        onUpdateElement({ textAlign: "left" })
                      }
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant={
                        selectedElement.textAlign === "center"
                          ? "secondary"
                          : "ghost"
                      }
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        onUpdateElement({ textAlign: "center" })
                      }
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant={
                        selectedElement.textAlign === "right"
                          ? "secondary"
                          : "ghost"
                      }
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        onUpdateElement({ textAlign: "right" })
                      }
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      Text Color
                    </Label>
                    <Input
                      type="color"
                      value={selectedElement.color || "#1e293b"}
                      onChange={(e) =>
                        onUpdateElement({ color: e.target.value })
                      }
                      className="h-7 w-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Note colors */}
          {selectedElement.type === "note" && (
            <>
              <Separator />
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Palette className="w-3 h-3" />
                  Note Color
                </Label>
                <div className="flex flex-wrap gap-2">
                  {NOTE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() =>
                        onUpdateElement({ backgroundColor: color.value })
                      }
                      className={cn(
                        "w-7 h-7 rounded-md border-2 transition-all",
                        selectedElement.backgroundColor === color.value
                          ? "border-primary scale-110"
                          : "border-border hover:border-primary/50"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Shape properties */}
          {selectedElement.type === "shape" && (
            <>
              <Separator />
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Fill Color
                </Label>
                <Input
                  type="color"
                  value={selectedElement.backgroundColor || "#dbeafe"}
                  onChange={(e) =>
                    onUpdateElement({ backgroundColor: e.target.value })
                  }
                  className="h-8 w-full cursor-pointer"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Corner Radius
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {selectedElement.borderRadius || 0}px
                  </span>
                </div>
                <Slider
                  value={[selectedElement.borderRadius || 0]}
                  onValueChange={([val]) =>
                    onUpdateElement({ borderRadius: val })
                  }
                  min={0}
                  max={100}
                  step={2}
                  className="w-full"
                />
              </div>
            </>
          )}

          {/* Image info */}
          {selectedElement.type === "image" && selectedElement.fileName && (
            <>
              <Separator />
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                  File Name
                </Label>
                <Input
                  className="h-7 text-xs"
                  defaultValue={selectedElement.fileName || "unnamed.png"}
                  onBlur={(e) => {
                    if (e.target.value !== selectedElement.fileName) {
                      onUpdateElement({ fileName: e.target.value });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                />
              </div>
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 block">
                  Scaling & Layout
                </Label>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] px-2 shadow-sm"
                      onClick={() => {
                        const ratio = selectedElement.size.height / selectedElement.size.width;
                        const targetW = A4_WIDTH_PX - (A4_MARGIN_PX * 2);
                        onUpdateElement({
                          size: { width: targetW, height: targetW * ratio },
                          position: { ...selectedElement.position, x: A4_MARGIN_PX }
                        });
                      }}
                    >
                      Fit Margin
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] px-2 shadow-sm"
                      onClick={() => {
                        const ratio = selectedElement.size.height / selectedElement.size.width;
                        onUpdateElement({
                          size: { width: A4_WIDTH_PX, height: A4_WIDTH_PX * ratio },
                          position: { ...selectedElement.position, x: 0 }
                        });
                      }}
                    >
                      Fit Width
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] px-2 shadow-sm col-span-2"
                      onClick={() => {
                        onUpdateElement({
                          size: { width: A4_WIDTH_PX, height: A4_HEIGHT_PX },
                          position: { x: 0, y: 0 }
                        });
                      }}
                    >
                      Fit Screen (No Margin)
                    </Button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-[10px] text-muted-foreground">Proportional Scale</Label>
                      <span className="text-[10px] font-mono text-muted-foreground">{Math.round(selectedElement.size.width)}px w</span>
                    </div>
                    <Slider
                      value={[selectedElement.size.width]}
                      onValueChange={([val]) => {
                        if (val === selectedElement.size.width) return;
                        const ratio = selectedElement.size.height / selectedElement.size.width;
                        onUpdateElement({
                          size: { width: val, height: val * ratio }
                        });
                      }}
                      min={40}
                      max={A4_WIDTH_PX + 100}
                      step={1}
                      className="py-2"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Corner Radius
                </Label>
                <Slider
                  value={[selectedElement.borderRadius || 0]}
                  onValueChange={([val]) =>
                    onUpdateElement({ borderRadius: val })
                  }
                  min={0}
                  max={50}
                  step={2}
                  className="w-full"
                />
              </div>

              {selectedElement.crop && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[10px] h-7 gap-2"
                    onClick={() => onUpdateElement({ crop: undefined })}
                  >
                    <Trash2 className="w-3 h-3" />
                    Reset Image Crop
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
