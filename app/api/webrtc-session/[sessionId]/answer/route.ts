import { NextRequest, NextResponse } from "next/server";
import { getAnswer, setAnswer, sessionExists } from "@/lib/webrtc-sessions";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** PC polls this until the phone's answer is ready */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!(await sessionExists(sessionId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  }
  return NextResponse.json({ answer: await getAnswer(sessionId) }, { headers: CORS });
}

/** Phone posts its completed answer (with gathered ICE candidates) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!(await sessionExists(sessionId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  }
  const { answer } = (await request.json()) as { answer: RTCSessionDescriptionInit };
  await setAnswer(sessionId, answer);
  return NextResponse.json({ ok: true }, { headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
