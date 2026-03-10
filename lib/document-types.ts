export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type ElementType = "image" | "text" | "note" | "shape";

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageElement {
  id: string;
  type: ElementType;
  position: Position;
  size: Size;
  rotation: number;
  zIndex: number;
  locked: boolean;
  opacity: number;
  crop?: CropData;
  // ... rest of the properties
  content?: string; // For text/note
  src?: string; // For image (data URL or object URL)
  fileName?: string; // Original file name for images
  naturalWidth?: number;
  naturalHeight?: number;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: "left" | "center" | "right";
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export type NotesLayout = "blank" | "structured";

export interface NotesPageFields {
  notesLayout?: NotesLayout;
  pageLabel?: string;
  pageDate?: string;
  pageSubject?: string;
  checklistItems?: ChecklistItem[];
}

export interface DocumentPage extends NotesPageFields {
  id: string;
  elements: PageElement[];
  backgroundColor: string;
  pageType?: "regular" | "notes";
}

export interface DocumentState {
  id: string;
  name: string;
  pages: DocumentPage[];
  selectedPageId: string | null;
  selectedElementId: string | null;
}

// A4 dimensions in pixels at 96 DPI (standard screen)
export const A4_WIDTH_PX = 595;
export const A4_HEIGHT_PX = 842;

// A4 in mm
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export function createPage(id?: string): DocumentPage {
  return {
    id: id || `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    elements: [],
    backgroundColor: "#ffffff",
    pageType: "regular",
  };
}

function makeChecklistItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createChecklistItem(text = "", checked = false): ChecklistItem {
  return {
    id: makeChecklistItemId(),
    text,
    checked,
  };
}

export function createNotesPage(
  id?: string,
  opts?: NotesPageFields
): DocumentPage {
  const defaultChecklist =
    opts?.checklistItems ??
    (opts?.notesLayout === "structured" ? NOTES_TEMPLATE_CHECKLIST : []);

  return {
    id: id || `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    elements: [],
    backgroundColor: "#ffffff",
    pageType: "notes",
    notesLayout: opts?.notesLayout ?? "blank",
    pageLabel: opts?.pageLabel ?? "",
    pageDate: opts?.pageDate ?? "",
    pageSubject: opts?.pageSubject ?? "",
    checklistItems: defaultChecklist.map((item) => ({ ...item })),
  };
}

export const NOTES_TEMPLATE_CHECKLIST: ChecklistItem[] = Array.from(
  { length: 5 },
  () => createChecklistItem()
);

export const NOTES_TEMPLATE_CONTENT: NotesPageFields = {
  notesLayout: "structured",
  pageLabel: "",
  pageDate: "",
  pageSubject: "",
  checklistItems: NOTES_TEMPLATE_CHECKLIST,
};

export function createTextElement(
  position: Position,
  content = "Double-click to edit"
): PageElement {
  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: "text",
    position,
    size: { width: 200, height: 40 },
    rotation: 0,
    zIndex: 1,
    locked: false,
    opacity: 1,
    content,
    fontSize: 14,
    fontWeight: "normal",
    textAlign: "left",
    color: "#1e293b",
  };
}

export function createNoteElement(position: Position): PageElement {
  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: "note",
    position,
    size: { width: 180, height: 120 },
    rotation: 0,
    zIndex: 1,
    locked: false,
    opacity: 1,
    content: "",
    fontSize: 12,
    fontWeight: "normal",
    textAlign: "left",
    color: "#1e293b",
    backgroundColor: "#fef3c7",
    borderRadius: 4,
  };
}

export function createImageElement(
  position: Position,
  src: string,
  fileName: string,
  naturalWidth: number,
  naturalHeight: number
): PageElement {
  // Scale to fit within page bounds while maintaining aspect ratio
  const maxWidth = A4_WIDTH_PX * 0.85;
  const maxHeight = A4_HEIGHT_PX * 0.6;
  const scale = Math.min(
    maxWidth / naturalWidth,
    maxHeight / naturalHeight,
    1
  );
  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: "image",
    position,
    size: {
      width: Math.round(naturalWidth * scale),
      height: Math.round(naturalHeight * scale),
    },
    rotation: 0,
    zIndex: 1,
    locked: false,
    opacity: 1,
    src,
    fileName,
    naturalWidth,
    naturalHeight,
  };
}

export function createShapeElement(position: Position): PageElement {
  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: "shape",
    position,
    size: { width: 120, height: 120 },
    rotation: 0,
    zIndex: 1,
    locked: false,
    opacity: 1,
    backgroundColor: "#dbeafe",
    borderRadius: 8,
  };
}
