# A4 Grid Editor

A powerful, browser-based A4 document editor for creating multi-page print-ready layouts. Drag, drop, write, arrange and export — all in one workspace.

> **To add screenshots:** replace each `<!-- screenshot -->` comment with a real image once you have captures.

<!-- screenshot: full editor workspace overview -->
![Editor Overview](public/placeholder.svg)

---

## What It Does

A4 Grid Editor is a visual document creation tool that runs entirely in the browser. Load images (or capture them from your camera), arrange them on A4-sized pages, annotate with text or notes, and export a high-quality PDF — or share it directly via email or WhatsApp.

Built for speed: drag-and-drop assets, auto-fill pages, reorder pages in one click, export in seconds.

---

## Features

### Pages

| Feature | Description |
|---|---|
| **Regular Pages** | White A4 canvas — drag images, text, shapes and notes anywhere |
| **Notes Pages** | Full-page ruled notepad (blue lines, red margin). Type freely, spellcheck enabled. Images can still be placed on top |
| **Page Reordering** | Drag thumbnails in the sidebar, or right-click → Move to Top / Up / Down / Bottom |
| **Duplicate & Delete** | One-click duplication or removal from the header or right-click menu |

<!-- screenshot: notes page open with writing -->

### Canvas & Elements

| Feature | Description |
|---|---|
| **Drag & Drop** | Drop images from your desktop or the asset panel directly onto any page |
| **Resize & Move** | Handles on every element; snap guides align to other elements and page edges |
| **Text Elements** | Inline editing, font size, weight, alignment, color — RTL auto-detected |
| **Sticky Notes** | Coloured note blocks with editable text |
| **Shapes** | Coloured rectangles and rounded shapes |
| **Image Elements** | Upload JPEG / PNG / WebP / GIF / SVG, paste from clipboard, or capture from camera |
| **PDF Import** | Drop a PDF — every page is converted to an image automatically |
| **Z-order** | Bring to Front / Send to Back per element |
| **Copy / Paste** | Ctrl+C / Ctrl+V clipboard; duplicate with Ctrl+D |
| **Undo** | 50-step undo stack for all mutations |

<!-- screenshot: canvas with images, sticky note and text elements -->

### Layout & Grid

| Feature | Description |
|---|---|
| **Images per Page** | Choose 1, 2, 4, 6, 8, 9, 12 or 16 — auto-arranged in a grid |
| **2-Page Layout** | For 2-per-page: vertical stack or side-by-side |
| **Fill Page (No Margin)** | Tiles images edge-to-edge with 6 px gaps — apply to the current page or all pages at once via the **Fill** button in the header |
| **Snap Guides** | Blue alignment guides appear while dragging |

<!-- screenshot: fill-page applied, 4 images covering a full page -->

### Asset Panel

| Feature | Description |
|---|---|
| **Upload Files** | Multi-file drag-and-drop or file picker — images and PDFs |
| **Asset Library** | Uploaded assets stay in a sidebar library grouped by source file |
| **Search** | Filter assets by name |
| **Camera Capture** | Take photos directly with your device's local camera |
| **Remote Camera** | Scan a QR code on another phone to transfer photos wirelessly over WebRTC |

<!-- screenshot: asset panel open -->

### Share & Export

<!-- screenshot: share & export dialog with green tick checkmarks on selected pages -->

| Action | How It Works |
|---|---|
| **Save PDF** | Renders each page at 2× resolution for crisp print quality, downloads via jsPDF |
| **Share via Email** | Generates the PDF, downloads it, then opens your mail client pre-filled. On mobile, uses the native Web Share API to attach the file directly |
| **Share via WhatsApp** | Same flow — downloads PDF then opens WhatsApp Web (or native share on mobile) |
| **Page Selection** | Thumbnail grid with **green checkmark + green border** for selected pages. Toggle individually or use All / None |
| **Merge Option** | Combine all selected pages into one PDF, or download each page separately |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl / Cmd + Z` | Undo |
| `Ctrl / Cmd + C` | Copy selected element |
| `Ctrl / Cmd + V` | Paste element |
| `Ctrl / Cmd + D` | Duplicate selected element |
| `Delete / Backspace` | Delete selected element |
| `Ctrl / Cmd + =` | Zoom in |
| `Ctrl / Cmd + -` | Zoom out |
| `Ctrl / Cmd + 0` | Reset zoom to 75 % |
| `Ctrl / Cmd + B` | Toggle asset panel |
| `Escape` | Deselect all |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| UI | [React 19](https://react.dev/) |
| Styling | [Tailwind CSS 3](https://tailwindcss.com/) |
| Components | [shadcn/ui](https://ui.shadcn.com/) · [Radix UI](https://www.radix-ui.com/) |
| State | Custom React hooks (`useDocumentStore`) with undo stack |
| PDF Export | [jsPDF](https://github.com/parallax/jsPDF) + browser Canvas API |
| Camera / QR | WebRTC + [react-qr-code](https://github.com/rosskhanas/react-qr-code) |
| Icons | [Lucide React](https://lucide.dev/) |
| Toasts | [Sonner](https://sonner.emilkowal.ski/) |
| Language | TypeScript 5.7 |

---

## Project Structure

```
a4-grid-editor/
├── app/                             # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/                         # API routes (WebRTC signaling)
│
├── components/
│   ├── ui/                          # shadcn/ui primitives
│   └── workspace/                   # Editor components
│       ├── editor-workspace.tsx     # Root editor shell & state wiring
│       ├── workspace-header.tsx     # Top toolbar (zoom, fill, add page, share)
│       ├── page-canvas.tsx          # A4 canvas with element rendering
│       ├── page-list.tsx            # Sidebar thumbnails + drag/right-click reorder
│       ├── draggable-element.tsx    # Drag / resize / select wrapper
│       ├── asset-panel.tsx          # Asset library & tools sidebar
│       ├── properties-panel.tsx     # Element & page property editor
│       ├── export-dialog.tsx        # Share & export modal (PDF / Email / WhatsApp)
│       ├── camera-modal.tsx         # Local camera capture
│       ├── remote-camera-modal.tsx  # Remote camera via QR / WebRTC
│       ├── zoom-controls.tsx        # Floating zoom widget
│       └── status-bar.tsx           # Bottom status bar
│
├── hooks/
│   └── use-document-store.ts        # All document state & mutations
│
└── lib/
    ├── document-types.ts            # TypeScript interfaces & element factories
    ├── pdf-utils.ts                 # PDF → image conversion
    └── utils.ts                     # Tailwind merge helper
```

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- `npm`, `pnpm`, or `yarn`

### Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/your-repo/a4-grid-editor.git
cd a4-grid-editor

# 2. Install dependencies
pnpm install        # or: npm install

# 3. Start the dev server
pnpm dev            # → http://localhost:3000
```

### Build for Production

```bash
pnpm build
pnpm start
```

---

## Page Types

### Regular Page
Standard white A4 canvas. Place images, text, shapes or sticky notes anywhere on the page with full drag, resize and rotate support.

### Notes Page
Full-page ruled notepad — classic **blue horizontal lines** and a **red left margin line**, just like physical notebook paper. Click anywhere on the page and start typing. Spell-check is active. Image elements can still be placed on top of the writing area as overlays.

**Add a Notes page:**
- Header → **Add Page** dropdown → **Notes Page**
- Page list sidebar → amber **Notes** button at the bottom
- Right-click any page thumbnail → existing options still apply

---

## Fill Page (No Margin)

The **Fill** button in the header tiles all images on a page to cover it completely — no wasted white space — with just 6 px of breathing room between images. The grid is calculated automatically based on the number of images.

- **Fill Current Page** — applies only to the selected page
- **Fill All Pages** — applies to every page in the document in one action

Both operations are fully undoable.

---

## Sharing & Exporting

The **Share & Export** dialog renders each selected page at 2× resolution for sharp output at any print size.

- **Email / WhatsApp sharing** works best on **mobile** where the Web Share API can attach the PDF directly.
- On **desktop**, the PDF downloads first and the respective app opens in a new tab for manual attachment.

---

## License

MIT — free to use and modify.

---

*Built by the Innotech Prime Softwares team.*
