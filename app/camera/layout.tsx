import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Camera Capture",
  description: "Capture images and send them to the A4 editor",
};

// This layout overrides the editor chrome for the /camera/* route.
// No <html> or <body> here — those come from app/layout.tsx.
export default function CameraLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 9999,
        overflow: "hidden auto",
      }}
    >
      {children}
    </div>
  );
}
