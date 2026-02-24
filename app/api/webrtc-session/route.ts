import { NextResponse } from "next/server";
import { createWebRTCSession } from "@/lib/webrtc-sessions";
import { getLocalIP } from "@/lib/get-local-ip";

export const runtime = "nodejs";

export async function POST() {
  const sessionId = createWebRTCSession();
  const ip = getLocalIP();
  return NextResponse.json({ sessionId, ip });
}
