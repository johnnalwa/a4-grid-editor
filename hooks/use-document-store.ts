"use client";

import { useState, useCallback } from "react";
import type {
  DocumentState,
  DocumentPage,
  PageElement,
  Position,
} from "@/lib/document-types";
import {
  createPage,
  createTextElement,
  createNoteElement,
  createImageElement,
  createShapeElement,
} from "@/lib/document-types";

const initialPages: DocumentPage[] = [
  createPage("page-1"),
  createPage("page-2"),
  createPage("page-3"),
];

const initialState: DocumentState = {
  id: "doc-1",
  name: "Untitled Document",
  pages: initialPages,
  selectedPageId: "page-1",
  selectedElementId: null,
};

export function useDocumentStore() {
  const [state, setState] = useState<DocumentState>(initialState);

  const setDocumentName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, name }));
  }, []);

  const selectPage = useCallback((pageId: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedPageId: pageId,
      selectedElementId: null,
    }));
  }, []);

  const selectElement = useCallback((elementId: string | null) => {
    setState((prev) => ({ ...prev, selectedElementId: elementId }));
  }, []);

  const addPage = useCallback(() => {
    const newPage = createPage();
    setState((prev) => ({
      ...prev,
      pages: [...prev.pages, newPage],
      selectedPageId: newPage.id,
      selectedElementId: null,
    }));
  }, []);

  const deletePage = useCallback((pageId: string) => {
    setState((prev) => {
      if (prev.pages.length <= 1) return prev;
      const newPages = prev.pages.filter((p) => p.id !== pageId);
      const newSelectedPageId =
        prev.selectedPageId === pageId ? newPages[0]?.id ?? null : prev.selectedPageId;
      return {
        ...prev,
        pages: newPages,
        selectedPageId: newSelectedPageId,
        selectedElementId: null,
      };
    });
  }, []);

  const duplicatePage = useCallback((pageId: string) => {
    setState((prev) => {
      const pageIndex = prev.pages.findIndex((p) => p.id === pageId);
      if (pageIndex === -1) return prev;
      const original = prev.pages[pageIndex];
      const duplicate: DocumentPage = {
        ...original,
        id: `page-${Date.now()}`,
        elements: original.elements.map((el) => ({
          ...el,
          id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        })),
      };
      const newPages = [...prev.pages];
      newPages.splice(pageIndex + 1, 0, duplicate);
      return { ...prev, pages: newPages, selectedPageId: duplicate.id };
    });
  }, []);

  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const newPages = [...prev.pages];
      const [moved] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, moved);
      return { ...prev, pages: newPages };
    });
  }, []);

  const updatePageBackground = useCallback(
    (pageId: string, backgroundColor: string) => {
      setState((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === pageId ? { ...p, backgroundColor } : p
        ),
      }));
    },
    []
  );

  // Element operations
  const addElement = useCallback(
    (pageId: string, element: PageElement) => {
      setState((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === pageId
            ? {
                ...p,
                elements: [
                  ...p.elements,
                  {
                    ...element,
                    zIndex: p.elements.length + 1,
                  },
                ],
              }
            : p
        ),
        selectedElementId: element.id,
      }));
    },
    []
  );

  const updateElement = useCallback(
    (pageId: string, elementId: string, updates: Partial<PageElement>) => {
      setState((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === pageId
            ? {
                ...p,
                elements: p.elements.map((el) =>
                  el.id === elementId ? { ...el, ...updates } : el
                ),
              }
            : p
        ),
      }));
    },
    []
  );

  const deleteElement = useCallback(
    (pageId: string, elementId: string) => {
      setState((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === pageId
            ? { ...p, elements: p.elements.filter((el) => el.id !== elementId) }
            : p
        ),
        selectedElementId:
          prev.selectedElementId === elementId ? null : prev.selectedElementId,
      }));
    },
    []
  );

  const addTextToPage = useCallback(
    (pageId: string, position?: Position) => {
      const pos = position || { x: 40, y: 40 };
      const element = createTextElement(pos);
      addElement(pageId, element);
    },
    [addElement]
  );

  const addNoteToPage = useCallback(
    (pageId: string, position?: Position) => {
      const pos = position || { x: 40, y: 40 };
      const element = createNoteElement(pos);
      addElement(pageId, element);
    },
    [addElement]
  );

  const addImageToPage = useCallback(
    (
      pageId: string,
      src: string,
      fileName: string,
      naturalWidth: number,
      naturalHeight: number,
      position?: Position
    ) => {
      const pos = position || { x: 40, y: 40 };
      const element = createImageElement(
        pos,
        src,
        fileName,
        naturalWidth,
        naturalHeight
      );
      addElement(pageId, element);
    },
    [addElement]
  );

  const addShapeToPage = useCallback(
    (pageId: string, position?: Position) => {
      const pos = position || { x: 40, y: 40 };
      const element = createShapeElement(pos);
      addElement(pageId, element);
    },
    [addElement]
  );

  const duplicateElementInPage = useCallback(
    (pageId: string, elementId: string) => {
      setState((prev) => {
        const page = prev.pages.find((p) => p.id === pageId);
        if (!page) return prev;
        const el = page.elements.find((e) => e.id === elementId);
        if (!el) return prev;
        const newEl: PageElement = {
          ...el,
          id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          position: { x: el.position.x + 20, y: el.position.y + 20 },
          zIndex: page.elements.length + 1,
        };
        return {
          ...prev,
          pages: prev.pages.map((p) =>
            p.id === pageId
              ? { ...p, elements: [...p.elements, newEl] }
              : p
          ),
          selectedElementId: newEl.id,
        };
      });
    },
    []
  );

  const bringToFront = useCallback(
    (pageId: string, elementId: string) => {
      setState((prev) => ({
        ...prev,
        pages: prev.pages.map((p) => {
          if (p.id !== pageId) return p;
          const maxZ = Math.max(...p.elements.map((e) => e.zIndex), 0);
          return {
            ...p,
            elements: p.elements.map((el) =>
              el.id === elementId ? { ...el, zIndex: maxZ + 1 } : el
            ),
          };
        }),
      }));
    },
    []
  );

  const sendToBack = useCallback(
    (pageId: string, elementId: string) => {
      setState((prev) => ({
        ...prev,
        pages: prev.pages.map((p) => {
          if (p.id !== pageId) return p;
          const minZ = Math.min(...p.elements.map((e) => e.zIndex), 1);
          return {
            ...p,
            elements: p.elements.map((el) =>
              el.id === elementId
                ? { ...el, zIndex: Math.max(0, minZ - 1) }
                : el
            ),
          };
        }),
      }));
    },
    []
  );

  const moveElement = useCallback(
    (pageId: string, elementId: string, position: Position) => {
      updateElement(pageId, elementId, { position });
    },
    [updateElement]
  );

  const resizeElement = useCallback(
    (
      pageId: string,
      elementId: string,
      size: { width: number; height: number }
    ) => {
      updateElement(pageId, elementId, { size });
    },
    [updateElement]
  );

  const getSelectedPage = useCallback((): DocumentPage | null => {
    return (
      state.pages.find((p) => p.id === state.selectedPageId) ?? null
    );
  }, [state.pages, state.selectedPageId]);

  const getSelectedElement = useCallback((): PageElement | null => {
    if (!state.selectedPageId || !state.selectedElementId) return null;
    const page = state.pages.find((p) => p.id === state.selectedPageId);
    if (!page) return null;
    return (
      page.elements.find((el) => el.id === state.selectedElementId) ?? null
    );
  }, [state.pages, state.selectedPageId, state.selectedElementId]);

  return {
    state,
    setDocumentName,
    selectPage,
    selectElement,
    addPage,
    deletePage,
    duplicatePage,
    reorderPages,
    updatePageBackground,
    addElement,
    updateElement,
    deleteElement,
    addTextToPage,
    addNoteToPage,
    addImageToPage,
    addShapeToPage,
    moveElement,
    resizeElement,
    duplicateElementInPage,
    bringToFront,
    sendToBack,
    getSelectedPage,
    getSelectedElement,
  };
}
