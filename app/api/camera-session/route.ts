import { NextResponse } from "next/server";
import { createSession } from "@/lib/camera-sessions";
import { getLocalIP } from "@/lib/get-local-ip";

export const runtime = "nodejs";

export async function POST() {
  const sessionId = createSession();
  const ip = getLocalIP();
  return NextResponse.json({ sessionId, ip });
}
