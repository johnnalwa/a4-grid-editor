/**
 * Tiny in-memory store for WebRTC SDP signaling data.
 *
 * Each session stores only the offer and answer SDP (~4 KB total).
 * offerVersion increments every time the PC posts a new offer so the
 * phone can detect a reconnect without comparing full SDP strings.
 *
 * When a new offer is stored, the old answer is automatically cleared
 * so the phone knows it must send a fresh answer.
 */

interface WebRTCSession {
  id: string;
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  /** Increments each time the PC posts a new offer (reconnect detection). */
  offerVersion: number;
  createdAt: number;
}

const g = globalThis as Record<string, unknown>;
if (!g.__webrtcSessions) g.__webrtcSessions = new Map<string, WebRTCSession>();
const sessions = g.__webrtcSessions as Map<string, WebRTCSession>;

function cleanup() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > 20 * 60_000) sessions.delete(id);
  }
}

export function createWebRTCSession(): string {
  cleanup();
  const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessions.set(id, { id, offer: null, answer: null, offerVersion: 0, createdAt: Date.now() });
  return id;
}

export function sessionExists(id: string): boolean {
  return sessions.has(id);
}

/**
 * Store a new offer and bump the version counter.
 * Automatically clears the old answer so the phone must create a fresh one.
 */
export function setOffer(id: string, offer: RTCSessionDescriptionInit): boolean {
  const s = sessions.get(id);
  if (!s) return false;
  s.offer = offer;
  s.answer = null; // force fresh answer on reconnect
  s.offerVersion += 1;
  return true;
}

export function getOffer(id: string): { offer: RTCSessionDescriptionInit | null; version: number } | null {
  const s = sessions.get(id);
  if (!s) return null;
  return { offer: s.offer, version: s.offerVersion };
}

export function setAnswer(id: string, answer: RTCSessionDescriptionInit): boolean {
  const s = sessions.get(id);
  if (!s) return false;
  s.answer = answer;
  return true;
}

export function getAnswer(id: string): RTCSessionDescriptionInit | null {
  return sessions.get(id)?.answer ?? null;
}
