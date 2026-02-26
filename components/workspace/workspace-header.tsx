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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Minus,
  Plus,
  PlusCircle,
  Share2,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  Pencil,
  Check,
  Trash2,
  Copy,
  Undo2,
  Maximize2,
  NotebookPen,
  ChevronDown,
} from "lucide-react";

interface WorkspaceHeaderProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  pageCount: number;
  onAddPage: () => void;
  onAddNotesPage?: () => void;
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
  imagesPerPage: number;
  onSetImagesPerPage: (val: number) => void;
  twoPageLayout: "horizontal" | "vertical";
  onSetTwoPageLayout: (val: "horizontal" | "vertical") => void;
  canUndo: boolean;
  onUndo: () => void;
  onFitCurrentPage?: () => void;
  onFitAllPages?: () => void;
}

export function WorkspaceHeader({
  zoom,
  onZoomIn,
  onZoomOut,
  pageCount,
  onAddPage,
  onAddNotesPage,
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
  imagesPerPage,
  onSetImagesPerPage,
  twoPageLayout,
  onSetTwoPageLayout,
  canUndo,
  onUndo,
  onFitCurrentPage,
  onFitAllPages,
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
            <TooltipContent>{assetPanelOpen ? "Hide Panel" : "Show Panel"}</TooltipContent>
          </Tooltip>

          <div className="h-5 w-px bg-border hidden sm:block" />

          {/* Document name */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground shrink-0 hidden sm:flex">
              <FileText className="w-3.5 h-3.5" />
            </div>
            {isEditingName ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  className="h-7 text-xs w-full max-w-[120px] sm:max-w-[200px]"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveName}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="flex items-center gap-1.5 hover:bg-muted rounded px-2 py-1 transition-colors min-w-0"
                onClick={() => { setNameValue(documentName); setIsEditingName(true); }}
              >
                <span className="font-medium text-xs text-foreground truncate max-w-[100px] sm:max-w-[200px]">
                  {documentName}
                </span>
                <Pencil className="w-3 h-3 text-muted-foreground shrink-0" />
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-border hidden md:block" />

          {/* Images per page */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              Images/Page:
            </span>
            <select
              value={imagesPerPage}
              onChange={(e) => onSetImagesPerPage(Number(e.target.value))}
              className="h-7 bg-muted border-none text-[11px] font-medium rounded px-1.5 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
            >
              {[1, 2, 4, 6, 8, 9, 12, 16].map((num) => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
            {imagesPerPage === 2 && (
              <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => onSetTwoPageLayout("vertical")}
                  className={`h-6 px-1.5 rounded text-[10px] font-medium transition-all ${
                    twoPageLayout === "vertical"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Stack vertically (top/bottom)"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="1" width="10" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="2" y="8" width="10" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onSetTwoPageLayout("horizontal")}
                  className={`h-6 px-1.5 rounded text-[10px] font-medium transition-all ${
                    twoPageLayout === "horizontal"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Place side by side (left/right)"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="2" width="5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="8" y="2" width="5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-border hidden lg:block" />

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
          {/* Fit to Fill dropdown */}
          {(onFitCurrentPage || onFitAllPages) && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-muted-foreground hover:text-foreground hidden sm:flex px-2"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-medium hidden lg:inline">Fill</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Fit images to fill page — no margins</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Fill Page (no margin)
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onFitCurrentPage && (
                  <DropdownMenuItem
                    className="text-xs gap-2"
                    onClick={onFitCurrentPage}
                    disabled={!selectedPageId}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Fill Current Page
                  </DropdownMenuItem>
                )}
                {onFitAllPages && (
                  <DropdownMenuItem
                    className="text-xs gap-2"
                    onClick={onFitAllPages}
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-primary" />
                    Fill All Pages
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
                className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="w-4 h-4" />
                <span className="sr-only">Undo</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onToggleDarkMode}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="sr-only">Toggle dark mode</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{darkMode ? "Light Mode" : "Dark Mode"}</TooltipContent>
          </Tooltip>

          {/* Add page dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 h-8 bg-transparent"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Page</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="text-xs gap-2" onClick={onAddPage}>
                <PlusCircle className="w-3.5 h-3.5" />
                Regular Page
              </DropdownMenuItem>
              {onAddNotesPage && (
                <DropdownMenuItem
                  className="text-xs gap-2"
                  onClick={onAddNotesPage}
                >
                  <NotebookPen className="w-3.5 h-3.5 text-amber-500" />
                  <span>Notes Page</span>
                  <span className="ml-auto text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-1 rounded font-bold">
                    NEW
                  </span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share & Export button */}
          <Button
            size="sm"
            className="text-xs gap-1.5 shadow-sm h-8"
            onClick={onExport}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share & Export</span>
          </Button>
        </div>
      </header>
    </TooltipProvider>
  );
}
