import { NextRequest, NextResponse } from "next/server";
import { getOffer, setOffer, sessionExists } from "@/lib/webrtc-sessions";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Phone polls this until the PC's offer is ready. Returns { offer, offerVersion }. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!sessionExists(sessionId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  }
  const data = getOffer(sessionId);
  return NextResponse.json(
    { offer: data?.offer ?? null, offerVersion: data?.version ?? 0 },
    { headers: CORS }
  );
}

/** PC posts its completed offer. Clears old answer automatically (via setOffer). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!sessionExists(sessionId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  }
  const { offer } = (await request.json()) as { offer: RTCSessionDescriptionInit };
  setOffer(sessionId, offer);
  return NextResponse.json({ ok: true }, { headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
