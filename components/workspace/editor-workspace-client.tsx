"use client";

import dynamic from "next/dynamic";

const EditorWorkspace = dynamic(
  () => import("./editor-workspace").then((m) => m.EditorWorkspace),
  { ssr: false }
);

export function EditorWorkspaceClient() {
  return <EditorWorkspace />;
}
