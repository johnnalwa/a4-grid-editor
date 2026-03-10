"use client";

import React from "react"

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { WorkspaceHeader } from "./workspace-header";
import { convertPdfToImages } from "@/lib/pdf-utils";
import { AssetPanel } from "./asset-panel";
import type { UploadedAsset } from "./asset-panel";
import { PageList } from "./page-list";
import { PageCanvas } from "./page-canvas";
import { PropertiesPanel } from "./properties-panel";
import { ZoomControls } from "./zoom-controls";
import { StatusBar } from "./status-bar";
import { ExportDialog } from "./export-dialog";
import { CameraModal } from "./camera-modal";
import { RemoteCameraModal } from "./remote-camera-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDocumentStore } from "@/hooks/use-document-store";
import { cn } from "@/lib/utils";
import type { PageElement, Position } from "@/lib/document-types";
import {
  createTextElement,
  createNoteElement,
  createImageElement,
  createShapeElement,
} from "@/lib/document-types";
import {
  PanelLeft,
  SlidersHorizontal,
  Layers,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 175, 200];

export function EditorWorkspace() {
  const store = useDocumentStore();
  const [zoom, setZoom] = useState(75);
  const [assetPanelOpen, setAssetPanelOpen] = useState(true);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [remoteCameraOpen, setRemoteCameraOpen] = useState(false);
  const [mobilePageListOpen, setMobilePageListOpen] = useState(false);
  // Global capture counter — shared across local and remote sessions so names never collide
  const captureCounter = useRef(0);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setAssetPanelOpen(false);
      } else {
        setAssetPanelOpen(true);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update properties panel visibility based on selection
  useEffect(() => {
    if (store.state.selectedElementId || store.state.selectedPageId) {
      if (!isMobile) setPropertiesPanelOpen(true);
    } else {
      setPropertiesPanelOpen(false);
    }
  }, [store.state.selectedElementId, store.state.selectedPageId, isMobile]);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [clipboard, setClipboard] = useState<PageElement | null>(null);
  const [imagesPerPage, setImagesPerPage] = useState(4);
  const [twoPageLayout, setTwoPageLayout] = useState<"horizontal" | "vertical">("vertical");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasChangedLayout = useRef(false);

  // Auto-rearrange when grid settings change (skip initial mount)
  useEffect(() => {
    if (!hasChangedLayout.current) {
      hasChangedLayout.current = true;
      return;
    }
    store.rearrangePages(imagesPerPage, twoPageLayout);
  }, [imagesPerPage, twoPageLayout]);

  // Dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const nextStep = ZOOM_STEPS.find((s) => s > prev);
      return nextStep ?? prev;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const prevStep = [...ZOOM_STEPS].reverse().find((s) => s < prev);
      return prevStep ?? prev;
    });
  }, []);

  const handleResetZoom = useCallback(() => setZoom(75), []);

  // --------------- File upload ---------------
  const handleUploadFiles = useCallback(
    async (files: FileList | File[], dropTarget?: { pageId: string; position: Position }) => {
      const fileList = Array.from(files);
      const imageFiles = fileList.filter(f => f.type.startsWith("image/"));
      const pdfFiles = fileList.filter(f => f.type === "application/pdf");
      
      if (imageFiles.length === 0 && pdfFiles.length === 0) return;

      const promise = new Promise<{count: number}>(async (resolve, reject) => {
          try {
            const loadedImages: { 
              src: string; 
              name: string; 
              width: number; 
              height: number; 
              size: number;
              parentFile?: string;
            }[] = [];
            
            // Process Image Files
            for (const file of imageFiles) {
              const src = await new Promise<string>((res, rej) => {
                const reader = new FileReader();
                reader.onload = (e) => res(e.target?.result as string);
                reader.onerror = () => rej(new Error(`Failed to read file: ${file.name}`));
                reader.readAsDataURL(file);
              });

              const img = await new Promise<HTMLImageElement>((res, rej) => {
                const i = new window.Image();
                i.crossOrigin = "anonymous";
                i.onload = () => res(i);
                i.onerror = () => rej(new Error(`Failed to load image: ${file.name}`));
                i.src = src;
              });

              loadedImages.push({
                src,
                name: file.name,
                width: img.naturalWidth,
                height: img.naturalHeight,
                size: file.size,
              });
            }

            // Process PDF Files
            for (const file of pdfFiles) {
              try {
                const pdfImages = await convertPdfToImages(file);
                loadedImages.push(...pdfImages.map(img => ({
                  ...img,
                  size: file.size / pdfImages.length, // Rough estimate
                  parentFile: file.name,
                })));
              } catch (err) {
                console.error("PDF conversion error:", err);
                throw new Error(`Failed to convert PDF: ${file.name}`);
              }
            }

            // Update assets panel
            const newAssets: UploadedAsset[] = loadedImages.map(img => ({
              id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: img.name,
              type: "image",
              src: img.src,
              thumbnailSrc: img.src,
              naturalWidth: img.width,
              naturalHeight: img.height,
              size: img.size,
              parentFile: img.parentFile,
            }));
            setUploadedAssets((prev) => [...prev, ...newAssets]);
 
            // Arrangement
            if (dropTarget && loadedImages.length === 1) {
              // Targeted single drop: land exactly where dropped
              const img = loadedImages[0];
              const el = createImageElement(
                dropTarget.position,
                img.src,
                img.name,
                img.width,
                img.height
              );
              store.addElement(dropTarget.pageId, el);
              store.selectPage(dropTarget.pageId);
            } else {
              // Bulk upload or no target: use store's grid placement helper
              store.addImagesInBatch(loadedImages, imagesPerPage);
            }
 
            resolve({ count: loadedImages.length });
          } catch (err: any) {
            reject(err);
          }
        });

        toast.promise(promise, {
          loading: 'Uploading images...',
          success: (data) => `Successfully uploaded ${data.count} images`,
          error: (err) => err.message || 'Failed to upload images',
        });
    },
    [store, imagesPerPage]
  );

  // Clipboard paste for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const active = document.activeElement;
      const isTextInput =
        active &&
        (active.getAttribute("contenteditable") === "true" ||
          active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA");

      if (isTextInput) return;

      const items = e.clipboardData?.items;
      const clipboardFiles = e.clipboardData?.files;
      const files: File[] = [];

      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith("image/")) {
            const file = items[i].getAsFile();
            if (file) files.push(file);
          }
        }
      }

      if (files.length === 0 && clipboardFiles && clipboardFiles.length > 0) {
        for (let i = 0; i < clipboardFiles.length; i++) {
          if (clipboardFiles[i].type.startsWith("image/")) {
            files.push(clipboardFiles[i]);
          }
        }
      }

      if (files.length > 0) {
        handleUploadFiles(files);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleUploadFiles]);

  const handleRemoveAsset = useCallback((id: string) => {
    setUploadedAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // --------------- Camera capture handler ---------------
  // Called by both CameraModal (local) and RemoteCameraModal (remote) on each captured image.
  // Adds the asset to the panel AND places it on the current/next available page immediately.
  const handleCameraCapture = useCallback(
    (asset: UploadedAsset) => {
      setUploadedAssets((prev) => [...prev, asset]);
      store.addImagesInBatch(
        [{ src: asset.src, name: asset.name, width: asset.naturalWidth, height: asset.naturalHeight }],
        imagesPerPage
      );
    },
    [store, imagesPerPage]
  );

  // Hidden file input handler for page context menu "Upload Image"
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleUploadFiles(e.target.files);
        e.target.value = "";
      }
    },
    [handleUploadFiles]
  );

  // --------------- Drop handling ---------------
  const handleDropAsset = useCallback(
    (pageId: string, position: Position, dataTransfer: DataTransfer) => {
      const assetData = dataTransfer.getData("application/x-asset");
      if (assetData) {
        try {
          const parsed = JSON.parse(assetData);
          if (parsed.type === "image") {
            const el = createImageElement(
              position,
              parsed.src,
              parsed.fileName,
              parsed.naturalWidth,
              parsed.naturalHeight
            );
            store.addElement(pageId, el);
          } else if (parsed.type === "text") {
            store.addElement(pageId, createTextElement(position));
          } else if (parsed.type === "note") {
            store.addElement(pageId, createNoteElement(position));
          } else if (parsed.type === "shape") {
            store.addElement(pageId, createShapeElement(position));
          }
        } catch {
          // ignore
        }
        return;
      }

      // Check for image URL drop from other tabs/browser
      const html = dataTransfer.getData("text/html");
      const url = dataTransfer.getData("url") || dataTransfer.getData("text/uri-list");

      if (html) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const img = doc.querySelector("img");
          if (img && img.src) {
            const src = img.src;
            const fileName = src.split("/").pop() || "dropped-image";
            const tempImg = new window.Image();
            tempImg.crossOrigin = "anonymous";
            tempImg.onload = () => {
              store.addImageToPage(
                pageId,
                src,
                fileName,
                tempImg.naturalWidth,
                tempImg.naturalHeight,
                position
              );
            };
            tempImg.src = src;
            return;
          }
        } catch {
          // fallback to URL
        }
      }

      if (url && url.match(/\.(jpeg|jpg|gif|png|webp|svg|avif)$|data:image/i)) {
        const tempImg = new window.Image();
        tempImg.crossOrigin = "anonymous";
        tempImg.onload = () => {
          store.addImageToPage(
            pageId,
            url,
            "dropped-image",
            tempImg.naturalWidth,
            tempImg.naturalHeight,
            position
          );
        };
        tempImg.src = url;
        return;
      }

      // Dropped files from OS
      if (dataTransfer.files && dataTransfer.files.length > 0) {
        handleUploadFiles(dataTransfer.files, { pageId, position });
      }
    },
    [store, handleUploadFiles]
  );

  // --------------- Add element shortcuts (for asset panel) ---------------
  const handleAddText = useCallback(() => {
    if (store.state.selectedPageId) {
      store.addTextToPage(store.state.selectedPageId);
    }
  }, [store]);

  const handleAddNote = useCallback(() => {
    if (store.state.selectedPageId) {
      store.addNoteToPage(store.state.selectedPageId);
    }
  }, [store]);

  const handleFitCurrentPage = useCallback(() => {
    if (store.state.selectedPageId) {
      store.fitImagesToFill([store.state.selectedPageId]);
    }
  }, [store]);

  const handleFitAllPages = useCallback(() => {
    store.fitImagesToFill(
      store.state.pages.filter((p) => p.pageType !== "notes").map((p) => p.id)
    );
  }, [store]);

  const handleUpdatePageLabel = useCallback(
    (pageId: string, label: string) => {
      store.updatePageLabel(pageId, label);
    },
    [store]
  );

  const handleAddShape = useCallback(() => {
    if (store.state.selectedPageId) {
      store.addShapeToPage(store.state.selectedPageId);
    }
  }, [store]);

  const handleAddAsset = useCallback((asset: UploadedAsset) => {
    store.addImagesInBatch(
      [{
        src: asset.src,
        name: asset.name,
        width: asset.naturalWidth,
        height: asset.naturalHeight
      }],
      imagesPerPage
    );
    if (isMobile) {
      setAssetPanelOpen(false);
    }
  }, [store, imagesPerPage, isMobile]);

  // --------------- Properties panel ---------------
  const selectedPage = store.getSelectedPage();
  const selectedElement = store.getSelectedElement();

  const handleUpdateElement = useCallback(
    (updates: Partial<PageElement>) => {
      if (store.state.selectedPageId && store.state.selectedElementId) {
        store.updateElement(
          store.state.selectedPageId,
          store.state.selectedElementId,
          updates
        );
      }
    },
    [store]
  );

  const handleDeleteElement = useCallback(() => {
    if (store.state.selectedPageId && store.state.selectedElementId) {
      store.deleteElement(
        store.state.selectedPageId,
        store.state.selectedElementId
      );
    }
  }, [store]);

  const handleDuplicateElement = useCallback(() => {
    if (
      store.state.selectedPageId &&
      store.state.selectedElementId &&
      selectedElement
    ) {
      const newEl: PageElement = {
        ...selectedElement,
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        position: {
          x: selectedElement.position.x + 20,
          y: selectedElement.position.y + 20,
        },
      };
      store.addElement(store.state.selectedPageId, newEl);
    }
  }, [store, selectedElement]);

  const handleUpdatePageBackground = useCallback(
    (color: string) => {
      if (store.state.selectedPageId) {
        store.updatePageBackground(store.state.selectedPageId, color);
      }
    },
    [store]
  );

  const handleDeletePage = useCallback(() => {
    if (store.state.selectedPageId) {
      store.deletePage(store.state.selectedPageId);
    }
  }, [store]);

  const handleDuplicatePage = useCallback(() => {
    if (store.state.selectedPageId) {
      store.duplicatePage(store.state.selectedPageId);
    }
  }, [store]);

  // --------------- Clipboard ---------------
  const handleCopyElement = useCallback(
    (pageId: string, elementId: string) => {
      const page = store.state.pages.find((p) => p.id === pageId);
      if (!page) return;
      const el = page.elements.find((e) => e.id === elementId);
      if (el) setClipboard({ ...el });
    },
    [store.state.pages]
  );

  const handlePasteElement = useCallback(
    (pageId: string, position: Position) => {
      if (!clipboard) return;
      const newEl: PageElement = {
        ...clipboard,
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        position,
      };
      store.addElement(pageId, newEl);
    },
    [clipboard, store]
  );

  // --------------- Keyboard shortcuts ---------------
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't steal keys while editing text
      const active = document.activeElement;
      const isTextInput =
        active &&
        (active.getAttribute("contenteditable") === "true" ||
          active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA");

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !isTextInput) {
        e.preventDefault();
        store.undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        handleResetZoom();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setAssetPanelOpen((prev) => !prev);
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "d" &&
        store.state.selectedPageId &&
        store.state.selectedElementId
      ) {
        e.preventDefault();
        store.duplicateElementInPage(
          store.state.selectedPageId,
          store.state.selectedElementId
        );
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "c" &&
        !isTextInput &&
        store.state.selectedPageId &&
        store.state.selectedElementId
      ) {
        e.preventDefault();
        handleCopyElement(
          store.state.selectedPageId,
          store.state.selectedElementId
        );
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "v" &&
        !isTextInput &&
        store.state.selectedPageId &&
        clipboard
      ) {
        e.preventDefault();
        handlePasteElement(store.state.selectedPageId, {
          x: 60,
          y: 60,
        });
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !isTextInput &&
        store.state.selectedElementId &&
        store.state.selectedPageId
      ) {
        e.preventDefault();
        handleDeleteElement();
      } else if (e.key === "Escape") {
        store.selectElement(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleDeleteElement,
    handleCopyElement,
    handlePasteElement,
    clipboard,
    store,
  ]);

  // Total element count
  const totalElements = useMemo(
    () => store.state.pages.reduce((sum, p) => sum + p.elements.length, 0),
    [store.state.pages]
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen flex flex-col bg-background">
        {/* Hidden file input for context-menu triggered uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        <WorkspaceHeader
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          pageCount={store.state.pages.length}
          onAddPage={store.addPage}
          onAddNotesPage={store.addNotesPage}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          documentName={store.state.name}
          onSetDocumentName={store.setDocumentName}
          assetPanelOpen={assetPanelOpen}
          onToggleAssetPanel={() => setAssetPanelOpen((prev) => !prev)}
          onExport={() => setExportOpen(true)}
          selectedPageId={store.state.selectedPageId}
          onDeletePage={handleDeletePage}
          onDuplicatePage={handleDuplicatePage}
          imagesPerPage={imagesPerPage}
          onSetImagesPerPage={setImagesPerPage}
          twoPageLayout={twoPageLayout}
          onSetTwoPageLayout={setTwoPageLayout}
          canUndo={store.canUndo}
          onUndo={store.undo}
          onFitCurrentPage={handleFitCurrentPage}
          onFitAllPages={handleFitAllPages}
        />

        <div className="flex flex-1 overflow-hidden relative">
          {/* Asset Panel - Overlay on mobile, sidebar on desktop */}
          <div className={cn(
            isMobile ? "absolute inset-y-0 left-0 z-[100] shadow-2xl" : "relative"
          )}>
            <AssetPanel
              isOpen={assetPanelOpen}
              uploadedAssets={uploadedAssets}
              onUploadFiles={handleUploadFiles}
              onRemoveAsset={handleRemoveAsset}
              onAddText={handleAddText}
              onAddNote={handleAddNote}
              onAddShape={handleAddShape}
              onAddAsset={handleAddAsset}
              selectedPageId={store.state.selectedPageId}
              isMobile={isMobile}
              onClose={() => setAssetPanelOpen(false)}
              onOpenCamera={() => {
                if (isMobile) setAssetPanelOpen(false);
                setCameraOpen(true);
              }}
              onOpenRemoteCamera={() => {
                if (isMobile) setAssetPanelOpen(false);
                setRemoteCameraOpen(true);
              }}
            />
          </div>

          {/* Page thumbnails list - Overlay on mobile, sidebar on desktop */}
          {(!isMobile || mobilePageListOpen) && (
            <div className={cn(
              isMobile ? "absolute inset-y-0 left-0 z-[100] shadow-2xl bg-surface" : "relative"
            )}>
              <PageList
                pages={store.state.pages}
                selectedPageId={store.state.selectedPageId}
                onSelectPage={(id) => {
                  store.selectPage(id);
                  if (isMobile) setMobilePageListOpen(false);
                }}
                onAddPage={store.addPage}
                onAddNotesPage={store.addNotesPage}
                onReorderPage={store.reorderPages}
              />
            </div>
          )}

          {/* Main canvas area */}
          <ScrollArea className="flex-1 bg-canvas h-full">
            <main className="p-4 md:p-8 min-h-full">
              <div className="flex flex-col items-center gap-10">
                {store.state.pages.map((page, index) => (
                  <PageCanvas
                    key={page.id}
                    page={page}
                    pageIndex={index}
                    isActivePage={store.state.selectedPageId === page.id}
                    selectedElementId={
                      store.state.selectedPageId === page.id
                        ? store.state.selectedElementId
                        : null
                    }
                    zoom={isMobile ? Math.min(zoom, 50) : zoom} // Auto-zoom out on mobile
                    onSelectPage={() => store.selectPage(page.id)}
                    onSelectElement={store.selectElement}
                    onMoveElement={(elId, pos) =>
                      store.moveElement(page.id, elId, pos)
                    }
                    onResizeElement={(elId, size) =>
                      store.resizeElement(page.id, elId, size)
                    }
                    onUpdateElement={(elId, updates) =>
                      store.updateElement(page.id, elId, updates)
                    }
                    onDeleteElement={(elId) =>
                      store.deleteElement(page.id, elId)
                    }
                    onDuplicateElement={(elId) =>
                      store.duplicateElementInPage(page.id, elId)
                    }
                    onBringToFront={(elId) =>
                      store.bringToFront(page.id, elId)
                    }
                    onSendToBack={(elId) =>
                      store.sendToBack(page.id, elId)
                    }
                    onCopyElement={(elId) =>
                      handleCopyElement(page.id, elId)
                    }
                    onPasteElement={(pos) =>
                      handlePasteElement(page.id, pos)
                    }
                    onDropAsset={handleDropAsset}
                    onAddText={(pos) =>
                      store.addTextToPage(page.id, pos)
                    }
                    onAddNote={(pos) =>
                      store.addNoteToPage(page.id, pos)
                    }
                    onAddShape={(pos) =>
                      store.addShapeToPage(page.id, pos)
                    }
                    onRequestImageUpload={() =>
                      fileInputRef.current?.click()
                    }
                    onDeletePage={() => store.deletePage(page.id)}
                    onDuplicatePage={() => store.duplicatePage(page.id)}
                    hasClipboard={clipboard !== null}
                    pageCount={store.state.pages.length}
                    isMobile={isMobile}
                    onMoveStart={store.recordSnapshot}
                    onUpdatePageLabel={(label) => handleUpdatePageLabel(page.id, label)}
                  />
                ))}
              </div>
            </main>
          </ScrollArea>

          {/* Properties panel - Overlay on mobile, sidebar on desktop */}
          <div className={cn(
            isMobile ? "absolute inset-y-0 right-0 z-[100] shadow-2xl" : "relative",
            !isMobile && !propertiesPanelOpen && "hidden"
          )}>
            <PropertiesPanel
              isOpen={propertiesPanelOpen}
              onClose={() => setPropertiesPanelOpen(false)}
              selectedElement={selectedElement}
              selectedPage={selectedPage}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onDuplicateElement={handleDuplicateElement}
              onUpdatePageBackground={handleUpdatePageBackground}
              isMobile={isMobile}
            />
          </div>

          {/* Zoom controls - adjust position on mobile */}
          {!isMobile && (
            <ZoomControls
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
            />
          )}
          
          {/* Mobile Backdrops */}
          {isMobile && (assetPanelOpen || mobilePageListOpen || (propertiesPanelOpen && (selectedElement || selectedPage))) && (
            <div 
              className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-50 animate-in fade-in duration-200"
              onClick={() => {
                setAssetPanelOpen(false);
                setPropertiesPanelOpen(false);
                setMobilePageListOpen(false);
              }}
            />
          )}
        </div>

        {/* ── Mobile Bottom Toolbar ── */}
        {isMobile && (
          <div className="h-12 border-t border-border bg-surface flex items-center justify-between px-2 shrink-0 z-30">
            {/* Left group */}
            <div className="flex items-center gap-1">
              <Button
                variant={assetPanelOpen ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  setAssetPanelOpen((p) => !p);
                  setPropertiesPanelOpen(false);
                  setMobilePageListOpen(false);
                }}
                title="Assets & Tools"
              >
                <PanelLeft className="w-4 h-4" />
              </Button>
              <Button
                variant={mobilePageListOpen ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  setMobilePageListOpen((p) => !p);
                  setAssetPanelOpen(false);
                  setPropertiesPanelOpen(false);
                }}
                title="Pages"
              >
                <Layers className="w-4 h-4" />
              </Button>
            </div>

            {/* Center: page navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!store.state.selectedPageId || store.state.pages.findIndex(p => p.id === store.state.selectedPageId) <= 0}
                onClick={() => {
                  const idx = store.state.pages.findIndex(p => p.id === store.state.selectedPageId);
                  if (idx > 0) store.selectPage(store.state.pages[idx - 1].id);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums min-w-[60px] text-center">
                {store.state.selectedPageId
                  ? `${store.state.pages.findIndex(p => p.id === store.state.selectedPageId) + 1} / ${store.state.pages.length}`
                  : `${store.state.pages.length} pages`
                }
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!store.state.selectedPageId || store.state.pages.findIndex(p => p.id === store.state.selectedPageId) >= store.state.pages.length - 1}
                onClick={() => {
                  const idx = store.state.pages.findIndex(p => p.id === store.state.selectedPageId);
                  if (idx < store.state.pages.length - 1) store.selectPage(store.state.pages[idx + 1].id);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={store.addPage}
                title="Add page"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Right group */}
            <div className="flex items-center gap-1">
              <Button
                variant={propertiesPanelOpen ? "secondary" : "ghost"}
                size="icon"
                className={cn(
                  "h-9 w-9",
                  (selectedElement || selectedPage) && !propertiesPanelOpen && "text-primary"
                )}
                onClick={() => {
                  setPropertiesPanelOpen((p) => !p);
                  setAssetPanelOpen(false);
                  setMobilePageListOpen(false);
                }}
                disabled={!selectedElement && !selectedPage}
                title="Properties"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="hidden sm:block">
          <StatusBar
            pageCount={store.state.pages.length}
            selectedPageId={store.state.selectedPageId}
            selectedElementId={store.state.selectedElementId}
            elementCount={totalElements}
            zoom={zoom}
          />
        </div>

        {/* Export dialog */}
        <ExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          pages={store.state.pages}
          documentName={store.state.name}
        />

        {/* Local camera capture */}
        <CameraModal
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onCapture={handleCameraCapture}
          captureCounter={captureCounter}
        />

        {/* Remote camera via QR code */}
        <RemoteCameraModal
          open={remoteCameraOpen}
          onClose={() => setRemoteCameraOpen(false)}
          onCapture={handleCameraCapture}
          captureCounter={captureCounter}
        />
      </div>
    </TooltipProvider>
  );
}
