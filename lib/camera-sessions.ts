// Server-side in-memory session store for remote camera capture
// Uses globalThis to survive Next.js hot reloads in development

export interface CapturedImageData {
  id: string;
  dataUrl: string;
  name: string;
  width: number;
  height: number;
  timestamp: number;
}

interface CameraSession {
  id: string;
  images: CapturedImageData[];
  listeners: Set<ReadableStreamDefaultController<Uint8Array>>;
  createdAt: number;
  lastActivity: number;
}

// Persist across hot reloads
const g = globalThis as Record<string, unknown>;
if (!g.__cameraSessions) {
  g.__cameraSessions = new Map<string, CameraSession>();
}
const sessions: Map<string, CameraSession> = g.__cameraSessions as Map<string, CameraSession>;

function cleanup() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > 3_600_000) {
      for (const ctrl of session.listeners) {
        try { ctrl.close(); } catch { /* ignore */ }
      }
      sessions.delete(id);
    }
  }
}

export function createSession(): string {
  cleanup();
  const id = `cam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessions.set(id, {
    id,
    images: [],
    listeners: new Set(),
    createdAt: Date.now(),
    lastActivity: Date.now(),
  });
  return id;
}

export function getSession(id: string): CameraSession | undefined {
  return sessions.get(id);
}

export function addImageToSession(
  sessionId: string,
  image: CapturedImageData
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  session.images.push(image);
  session.lastActivity = Date.now();

  const encoder = new TextEncoder();
  const data = encoder.encode(`data: ${JSON.stringify(image)}\n\n`);

  const dead: ReadableStreamDefaultController<Uint8Array>[] = [];
  for (const ctrl of session.listeners) {
    try {
      ctrl.enqueue(data);
    } catch {
      dead.push(ctrl);
    }
  }
  dead.forEach((d) => session.listeners.delete(d));

  return true;
}

export function subscribeToSession(
  sessionId: string,
  ctrl: ReadableStreamDefaultController<Uint8Array>
): CapturedImageData[] | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.listeners.add(ctrl);
  session.lastActivity = Date.now();
  return [...session.images];
}

export function unsubscribeFromSession(
  sessionId: string,
  ctrl: ReadableStreamDefaultController<Uint8Array>
) {
  sessions.get(sessionId)?.listeners.delete(ctrl);
}
