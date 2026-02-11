"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  FileText,
  Minus,
  Plus,
  PlusCircle,
  Download,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  Pencil,
  Check,
  Trash2,
  Copy,
} from "lucide-react";

interface WorkspaceHeaderProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  pageCount: number;
  onAddPage: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  documentName: string;
  onSetDocumentName: (name: string) => void;
  assetPanelOpen: boolean;
  onToggleAssetPanel: () => void;
  onExport: () => void;
  selectedPageId: string | null;
  onDeletePage: () => void;
  onDuplicatePage: () => void;
}

export function WorkspaceHeader({
  zoom,
  onZoomIn,
  onZoomOut,
  pageCount,
  onAddPage,
  darkMode,
  onToggleDarkMode,
  documentName,
  onSetDocumentName,
  assetPanelOpen,
  onToggleAssetPanel,
  onExport,
  selectedPageId,
  onDeletePage,
  onDuplicatePage,
}: WorkspaceHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(documentName);

  const handleSaveName = () => {
    onSetDocumentName(nameValue.trim() || "Untitled Document");
    setIsEditingName(false);
  };

  return (
    <TooltipProvider>
      <header className="h-12 border-b border-border bg-surface flex items-center justify-between px-3 z-20 shrink-0">
        <div className="flex items-center gap-3">
          {/* Sidebar toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onToggleAssetPanel}
              >
                {assetPanelOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeft className="w-4 h-4" />
                )}
                <span className="sr-only">Toggle asset panel</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {assetPanelOpen ? "Hide Panel" : "Show Panel"}
            </TooltipContent>
          </Tooltip>

          <div className="h-5 w-px bg-border" />

          {/* Document name */}
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <Input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  className="h-7 text-xs w-48"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleSaveName}
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="flex items-center gap-1.5 hover:bg-muted rounded px-2 py-1 transition-colors"
                onClick={() => {
                  setNameValue(documentName);
                  setIsEditingName(true);
                }}
              >
                <span className="font-medium text-xs text-foreground truncate max-w-[200px]">
                  {documentName}
                </span>
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-border hidden md:block" />

          {/* Zoom controls */}
          <div className="hidden md:flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={onZoomOut}
                  disabled={zoom <= 25}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span className="sr-only">Zoom out</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            <span className="px-2 text-[11px] font-medium w-11 text-center text-foreground tabular-nums">
              {zoom}%
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={onZoomIn}
                  disabled={zoom >= 200}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="sr-only">Zoom in</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </div>

          <span className="text-[11px] text-muted-foreground hidden lg:inline tabular-nums">
            {pageCount} {pageCount === 1 ? "page" : "pages"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Page actions */}
          {selectedPageId && (
            <div className="hidden sm:flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onDuplicatePage}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="sr-only">Duplicate page</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicate Page</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={onDeletePage}
                    disabled={pageCount <= 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="sr-only">Delete page</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Page</TooltipContent>
              </Tooltip>
              <div className="h-5 w-px bg-border mx-0.5" />
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onToggleDarkMode}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                <span className="sr-only">Toggle dark mode</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {darkMode ? "Light Mode" : "Dark Mode"}
            </TooltipContent>
          </Tooltip>

          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 bg-transparent"
            onClick={onAddPage}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Page</span>
          </Button>

          <Button
            size="sm"
            className="text-xs gap-1.5 shadow-sm h-8"
            onClick={onExport}
          >
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </Button>
        </div>
      </header>
    </TooltipProvider>
  );
}
