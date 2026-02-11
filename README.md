# 📄 A4 Grid Editor

A premium, modern, and highly interactive drag-and-drop document editor designed for creating multi-page A4 layouts. Built with performance and user experience in mind.

![Document Editor Banner](https://images.unsplash.com/photo-1542435503-956c469947f6?q=80&w=2000&auto=format&fit=crop)

## ✨ Features

- **🎯 Precision Canvas**: A grid-based workspace tailored for A4 dimensions with pixel-perfect positioning.
- **🖱️ Drag & Drop Interface**: Seamlessly drag elements from the asset panel or your desktop directly onto the canvas.
- **📝 Rich Element Types**:
  - **Text**: Fully customizable typography.
  - **Shapes**: Dynamic vector shapes for layouts.
  - **Notes**: Sticky-style notes for quick annotations.
  - **Images**: Upload and manage high-resolution assets.
- **📑 Multi-Page Management**: Create, duplicate, and reorder pages within a single document session.
- **🎨 Advanced Styling**: Real-time property editing for colors, typography, borders, and more.
- **📤 Pro Export**: Export your masterpiece to high-quality PDF format using `jsPDF` and `html2canvas`.
- **🌙 Dark Mode**: A sleek, eye-friendly interface for late-night design sessions.
- **⌨️ Power User Shortcuts**: Standard mapping for copy/paste, delete, zoom, and panel toggles.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Architecture**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **State Management**: Custom React Hooks for optimized document state
- **Rendering & Export**: `jsPDF` & `html2canvas`
- **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or pnpm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/a4-grid-editor.git
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## 🎹 Keyboard Shortcuts

| Shortcut             | Action                     |
| :------------------- | :------------------------- |
| `Ctrl/Cmd + C`       | Copy Selected Element      |
| `Ctrl/Cmd + V`       | Paste Element              |
| `Delete / Backspace` | Delete Selected Element    |
| `Ctrl/Cmd + D`       | Duplicate Selected Element |
| `Ctrl/Cmd + +/-/0`   | Zoom In / Out / Reset      |
| `Ctrl/Cmd + B`       | Toggle Asset Panel         |
| `Esc`                | Deselect All               |

## 📐 Architecture Overview

The application follows a modular component-based architecture:

- **`/components/workspace`**: The core editor logic, including the canvas, panels, and toolbars.
- **`/hooks`**: Centralized state management for document pages and elements.
- **`/lib`**: Type definitions and creation utilities for document elements.
- **`/app`**: Next.js route handlers and global styles.

---

Developed with ❤️ by the A4 Grid Editor Team.
