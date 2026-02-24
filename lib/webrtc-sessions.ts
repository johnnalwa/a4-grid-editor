import { Redis } from "@upstash/redis";

/**
 * Tiny store for WebRTC SDP signaling data.
 * 
 * On Vercel (Production), we use Upstash Redis because in-memory maps 
 * do not persist across serverless function instances.
 * 
 * For Local Development, we fallback to an in-memory Map if Redis env vars are missing.
 */

interface WebRTCSession {
  id: string;
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  /** Increments each time the PC posts a new offer (reconnect detection). */
  offerVersion: number;
  createdAt: number;
}

// ─── Redis Setup ───────────────────────────────────────────────────────────
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const SESSION_TTL = 20 * 60; // 20 minutes in seconds

// ─── In-Memory Fallback (Local Dev) ────────────────────────────────────────
const g = globalThis as Record<string, unknown>;
if (!g.__webrtcSessions) g.__webrtcSessions = new Map<string, WebRTCSession>();
const sessions = g.__webrtcSessions as Map<string, WebRTCSession>;

function cleanupLocal() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > 20 * 60_000) sessions.delete(id);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function createWebRTCSession(): Promise<string> {
  const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const session: WebRTCSession = { id, offer: null, answer: null, offerVersion: 0, createdAt: Date.now() };

  if (redis) {
    await redis.set(`rtc:${id}`, JSON.stringify(session), { ex: SESSION_TTL });
  } else {
    cleanupLocal();
    sessions.set(id, session);
  }
  return id;
}

export async function sessionExists(id: string): Promise<boolean> {
  if (redis) {
    const exists = await redis.exists(`rtc:${id}`);
    return exists > 0;
  }
  return sessions.has(id);
}

/**
 * Store a new offer and bump the version counter.
 * Automatically clears the old answer so the phone must create a fresh one.
 */
export async function setOffer(id: string, offer: RTCSessionDescriptionInit): Promise<boolean> {
  if (redis) {
    const raw = await redis.get<string>(`rtc:${id}`);
    if (!raw) return false;
    const s = (typeof raw === "string" ? JSON.parse(raw) : raw) as WebRTCSession;
    s.offer = offer;
    s.answer = null; 
    s.offerVersion += 1;
    await redis.set(`rtc:${id}`, JSON.stringify(s), { ex: SESSION_TTL });
    return true;
  } else {
    const s = sessions.get(id);
    if (!s) return false;
    s.offer = offer;
    s.answer = null;
    s.offerVersion += 1;
    return true;
  }
}

export async function getOffer(id: string): Promise<{ offer: RTCSessionDescriptionInit | null; version: number } | null> {
  if (redis) {
    const raw = await redis.get<string>(`rtc:${id}`);
    if (!raw) return null;
    const s = (typeof raw === "string" ? JSON.parse(raw) : raw) as WebRTCSession;
    return { offer: s.offer, version: s.offerVersion };
  } else {
    const s = sessions.get(id);
    if (!s) return null;
    return { offer: s.offer, version: s.offerVersion };
  }
}

export async function setAnswer(id: string, answer: RTCSessionDescriptionInit): Promise<boolean> {
  if (redis) {
    const raw = await redis.get<string>(`rtc:${id}`);
    if (!raw) return false;
    const s = (typeof raw === "string" ? JSON.parse(raw) : raw) as WebRTCSession;
    s.answer = answer;
    await redis.set(`rtc:${id}`, JSON.stringify(s), { ex: SESSION_TTL });
    return true;
  } else {
    const s = sessions.get(id);
    if (!s) return false;
    s.answer = answer;
    return true;
  }
}

export async function getAnswer(id: string): Promise<RTCSessionDescriptionInit | null> {
  if (redis) {
    const raw = await redis.get<string>(`rtc:${id}`);
    if (!raw) return null;
    const s = (typeof raw === "string" ? JSON.parse(raw) : raw) as WebRTCSession;
    return s.answer;
  }
  return sessions.get(id)?.answer ?? null;
}

export function getStorageType(): "redis" | "memory" {
  return redis ? "redis" : "memory";
}
