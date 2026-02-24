import { NextRequest, NextResponse } from "next/server";
import { addImageToSession } from "@/lib/camera-sessions";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  let body: { dataUrl: string; name: string; width: number; height: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { dataUrl, name, width, height } = body;
  if (!dataUrl || !name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const image = {
    id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dataUrl,
    name,
    width: width || 0,
    height: height || 0,
    timestamp: Date.now(),
  };

  const ok = addImageToSession(sessionId, image);
  if (!ok) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Pre-flight for tunnel / cross-origin requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
