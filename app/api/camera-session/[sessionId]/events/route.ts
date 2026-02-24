import { NextRequest } from "next/server";
import { subscribeToSession, unsubscribeFromSession } from "@/lib/camera-sessions";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      const existing = subscribeToSession(sessionId, ctrl);
      if (existing === null) {
        const encoder = new TextEncoder();
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "session_not_found" })}\n\n`));
        ctrl.close();
        return;
      }

      // Send any already-captured images to newly connected listener
      const encoder = new TextEncoder();
      for (const img of existing) {
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(img)}\n\n`));
      }

      // Keep-alive ping every 20 seconds
      const ping = setInterval(() => {
        try {
          ctrl.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(ping);
        }
      }, 20_000);

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(ping);
        unsubscribeFromSession(sessionId, controller);
        try { ctrl.close(); } catch { /* ignore */ }
      });
    },
    cancel() {
      unsubscribeFromSession(sessionId, controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
