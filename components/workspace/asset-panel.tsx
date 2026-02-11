"use client";

import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  ImageIcon,
  Type,
  StickyNote,
  Square,
  CloudUpload,
  GripVertical,
  X,
  FileImage,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadedAsset {
  id: string;
  name: string;
  type: "image";
  src: string;
  thumbnailSrc: string;
  naturalWidth: number;
  naturalHeight: number;
  size: number;
}

interface AssetPanelProps {
  isOpen: boolean;
  uploadedAssets: UploadedAsset[];
  onUploadFiles: (files: FileList) => void;
  onRemoveAsset: (id: string) => void;
  onAddText: () => void;
  onAddNote: () => void;
  onAddShape: () => void;
  selectedPageId: string | null;
}

export function AssetPanel({
  isOpen,
  uploadedAssets,
  onUploadFiles,
  onRemoveAsset,
  onAddText,
  onAddNote,
  onAddShape,
  selectedPageId,
}: AssetPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [assetsExpanded, setAssetsExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = uploadedAssets.filter((asset) =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onUploadFiles(e.target.files);
        e.target.value = "";
      }
    },
    [onUploadFiles]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, asset: UploadedAsset) => {
      e.dataTransfer.setData(
        "application/x-asset",
        JSON.stringify({
          type: "image",
          src: asset.src,
          fileName: asset.name,
          naturalWidth: asset.naturalWidth,
          naturalHeight: asset.naturalHeight,
        })
      );
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  const handleToolDragStart = useCallback(
    (e: React.DragEvent, toolType: string) => {
      e.dataTransfer.setData(
        "application/x-asset",
        JSON.stringify({ type: toolType })
      );
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const noPageSelected = !selectedPageId;

  return (
    <aside
      className={cn(
        "border-r border-border bg-surface flex flex-col shrink-0 transition-all duration-300",
        isOpen ? "w-72" : "w-0 overflow-hidden"
      )}
    >
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-9 text-xs bg-muted border-none h-8"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Quick tools */}
        <div className="p-3">
          <button
            type="button"
            className="flex items-center gap-2 w-full text-left mb-2"
            onClick={() => setToolsExpanded(!toolsExpanded)}
          >
            {toolsExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Add to Page
            </span>
          </button>
          {toolsExpanded && (
            <div className="grid grid-cols-2 gap-2">
              <ToolButton
                icon={<Type className="w-4 h-4" />}
                label="Text"
                onClick={onAddText}
                disabled={noPageSelected}
                onDragStart={(e) => handleToolDragStart(e, "text")}
              />
              <ToolButton
                icon={<StickyNote className="w-4 h-4" />}
                label="Sticky Note"
                onClick={onAddNote}
                disabled={noPageSelected}
                onDragStart={(e) => handleToolDragStart(e, "note")}
              />
              <ToolButton
                icon={<Square className="w-4 h-4" />}
                label="Shape"
                onClick={onAddShape}
                disabled={noPageSelected}
                onDragStart={(e) => handleToolDragStart(e, "shape")}
              />
              <ToolButton
                icon={<ImageIcon className="w-4 h-4" />}
                label="Image"
                onClick={() => fileInputRef.current?.click()}
                disabled={false}
              />
            </div>
          )}
        </div>

        {/* Uploaded assets */}
        <div className="p-3 pt-0">
          <button
            type="button"
            className="flex items-center gap-2 w-full text-left mb-2"
            onClick={() => setAssetsExpanded(!assetsExpanded)}
          >
            {assetsExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Uploaded Assets
            </span>
            {uploadedAssets.length > 0 && (
              <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                {uploadedAssets.length}
              </span>
            )}
          </button>

          {assetsExpanded && (
            <>
              {filteredAssets.length === 0 && uploadedAssets.length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                  <FileImage className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">
                    No assets yet
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    Upload images to get started
                  </p>
                </div>
              )}

              {filteredAssets.length === 0 && uploadedAssets.length > 0 && (
                <div className="text-center py-6">
                  <p className="text-[11px] text-muted-foreground">
                    No matching assets
                  </p>
                </div>
              )}

              <div className="space-y-1">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, asset)}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors cursor-grab active:cursor-grabbing group"
                  >
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 border border-border">
                      <img
                        src={asset.thumbnailSrc || "/placeholder.svg"}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">
                        {asset.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {asset.naturalWidth}x{asset.naturalHeight} -- {formatSize(asset.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveAsset(asset.id);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                        title="Remove asset"
                      >
                        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                      <GripVertical className="w-3 h-3 text-muted-foreground/30" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Upload area */}
      <div className="p-3 border-t border-border">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          className="w-full text-xs gap-2 text-muted-foreground hover:text-foreground bg-transparent"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <CloudUpload className="w-4 h-4" />
          Upload Files
        </Button>
      </div>
    </aside>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
  disabled,
  onDragStart,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  return (
    <button
      type="button"
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border",
        "hover:bg-muted hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-border",
        "cursor-grab active:cursor-grabbing"
      )}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
