"use client";

import React from "react"

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceHeader } from "./workspace-header";
import { AssetPanel } from "./asset-panel";
import type { UploadedAsset } from "./asset-panel";
import { PageList } from "./page-list";
import { PageCanvas } from "./page-canvas";
import { PropertiesPanel } from "./properties-panel";
import { ZoomControls } from "./zoom-controls";
import { StatusBar } from "./status-bar";
import { ExportDialog } from "./export-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDocumentStore } from "@/hooks/use-document-store";
import type { PageElement, Position } from "@/lib/document-types";
import {
  createTextElement,
  createNoteElement,
  createImageElement,
  createShapeElement,
} from "@/lib/document-types";

const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 175, 200];

export function EditorWorkspace() {
  const store = useDocumentStore();
  const [zoom, setZoom] = useState(75);
  const [assetPanelOpen, setAssetPanelOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [clipboard, setClipboard] = useState<PageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    (files: FileList) => {
      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const asset: UploadedAsset = {
              id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: file.name,
              type: "image",
              src,
              thumbnailSrc: src,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              size: file.size,
            };
            setUploadedAssets((prev) => [...prev, asset]);

            if (store.state.selectedPageId) {
              store.addImageToPage(
                store.state.selectedPageId,
                src,
                file.name,
                img.naturalWidth,
                img.naturalHeight
              );
            }
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      });
    },
    [store]
  );

  const handleRemoveAsset = useCallback((id: string) => {
    setUploadedAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

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

      // Dropped files from OS
      if (dataTransfer.files && dataTransfer.files.length > 0) {
        Array.from(dataTransfer.files).forEach((file) => {
          if (!file.type.startsWith("image/")) return;

          const reader = new FileReader();
          reader.onload = (e) => {
            const src = e.target?.result as string;
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const asset: UploadedAsset = {
                id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: file.name,
                type: "image",
                src,
                thumbnailSrc: src,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                size: file.size,
              };
              setUploadedAssets((prev) => [...prev, asset]);

              const el = createImageElement(
                position,
                src,
                file.name,
                img.naturalWidth,
                img.naturalHeight
              );
              store.addElement(pageId, el);
            };
            img.src = src;
          };
          reader.readAsDataURL(file);
        });
      }
    },
    [store]
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

  const handleAddShape = useCallback(() => {
    if (store.state.selectedPageId) {
      store.addShapeToPage(store.state.selectedPageId);
    }
  }, [store]);

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

      if ((e.metaKey || e.ctrlKey) && e.key === "=") {
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
          accept="image/*"
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
        />

        <div className="flex flex-1 overflow-hidden relative">
          {/* Asset Panel */}
          <AssetPanel
            isOpen={assetPanelOpen}
            uploadedAssets={uploadedAssets}
            onUploadFiles={handleUploadFiles}
            onRemoveAsset={handleRemoveAsset}
            onAddText={handleAddText}
            onAddNote={handleAddNote}
            onAddShape={handleAddShape}
            selectedPageId={store.state.selectedPageId}
          />

          {/* Page thumbnails list */}
          <PageList
            pages={store.state.pages}
            selectedPageId={store.state.selectedPageId}
            onSelectPage={store.selectPage}
            onAddPage={store.addPage}
          />

          {/* Main canvas area */}
          <ScrollArea className="flex-1 bg-canvas">
            <main className="p-8 min-h-[calc(100vh-5rem)]">
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
                    zoom={zoom}
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
                  />
                ))}
              </div>
            </main>
          </ScrollArea>

          {/* Properties panel */}
          <PropertiesPanel
            selectedElement={selectedElement}
            selectedPage={selectedPage}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onDuplicateElement={handleDuplicateElement}
            onUpdatePageBackground={handleUpdatePageBackground}
          />

          {/* Zoom controls */}
          <ZoomControls
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
          />
        </div>

        <StatusBar
          pageCount={store.state.pages.length}
          selectedPageId={store.state.selectedPageId}
          selectedElementId={store.state.selectedElementId}
          elementCount={totalElements}
          zoom={zoom}
        />

        {/* Export dialog */}
        <ExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          pages={store.state.pages}
          documentName={store.state.name}
        />
      </div>
    </TooltipProvider>
  );
}
