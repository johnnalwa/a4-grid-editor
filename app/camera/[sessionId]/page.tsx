"use client";

import { useState, useRef, useCallback, useEffect, use } from "react";

// ─── WebRTC config (public STUN servers, no account needed) ────────────────
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};

const CHUNK = 65536; // 64 KB chunks over data channel

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Fast ICE gathering strategy (mirrors desktop):
 * - Resolves immediately when state reaches "complete"
 * - Resolves 400ms after the first host candidate (LAN path ready)
 * - Hard fallback at 2 seconds
 */
function gatherIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    let earlyTimer: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      if (earlyTimer) clearTimeout(earlyTimer);
      clearTimeout(hardTimeout);
      resolve();
    };
    const hardTimeout = setTimeout(done, 2000); // hard cap

    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") done();
    });

    pc.addEventListener("icecandidate", (ev) => {
      if (!ev.candidate) { done(); return; }
      // Start a tight timer as soon as we have at least one candidate
      if (!earlyTimer) {
        earlyTimer = setTimeout(done, 300);
      }
    });
  });
}

async function sendImageOverChannel(
  dc: RTCDataChannel,
  canvas: HTMLCanvasElement,
  name: string
) {
  const blob: Blob = await new Promise((res) =>
    canvas.toBlob((b) => res(b!), "image/jpeg", 0.88)
  );
  const buf = await blob.arrayBuffer();

  // metadata header
  dc.send(JSON.stringify({ t: "s", n: name, w: canvas.width, h: canvas.height }));

  // binary chunks with back-pressure
  let off = 0;
  while (off < buf.byteLength) {
    if (dc.bufferedAmount > CHUNK * 8) {
      await new Promise<void>((r) => {
        const id = setInterval(() => {
          if (dc.bufferedAmount < CHUNK * 2) { clearInterval(id); r(); }
        }, 30);
      });
    }
    dc.send(buf.slice(off, Math.min(off + CHUNK, buf.byteLength)));
    off += CHUNK;
  }

  // end marker
  dc.send(JSON.stringify({ t: "e" }));
}

// ─── Component ──────────────────────────────────────────────────────────────

type Phase =
  | "fetching_offer"   // waiting for PC to create offer
  | "connecting"       // answer sent, waiting for data channel
  | "ready"            // data channel open
  | "sending"          // transmitting image
  | "reconnecting"    // auto-reconnecting after channel loss
  | "error";

export default function CameraCapturePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  /** Tracks the last offerVersion we consumed so we only process new offers */
  const lastOfferVersionRef = useRef<number>(0);
  /** Prevents concurrent connect() calls */
  const connectingRef = useRef(false);
  /** Set to true when the component unmounts */
  const cancelledRef = useRef(false);
  /** Queued files to send after reconnect */
  const pendingFilesRef = useRef<File[]>([]);

  const [phase, setPhase] = useState<Phase>("fetching_offer");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [captureCount, setCaptureCount] = useState(0);
  const [recentCaptures, setRecentCaptures] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Camera ───────────────────────────────────────────────────────────────
  const startCamera = useCallback(async (mode: "environment" | "user") => {
    setCameraError(null);
    setCameraReady(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 2560 }, aspectRatio: { ideal: 3 / 4 } }, audio: false },
      { video: { facingMode: { ideal: mode } }, audio: false },
      { video: true, audio: false },
    ];

    let stream: MediaStream | null = null;
    let lastMsg = "";
    for (const c of attempts) {
      try { stream = await navigator.mediaDevices.getUserMedia(c); break; }
      catch (e) { lastMsg = e instanceof Error ? e.message : ""; }
    }

    if (!stream) {
      if (lastMsg.includes("NotAllowed") || lastMsg.includes("Permission")) {
        setCameraError("Camera permission denied.\nAllow access in browser settings.");
      } else if (lastMsg.includes("NotFound")) {
        setCameraError("No camera found.");
      } else {
        setCameraError("Camera unavailable.\nUse file upload below.");
      }
      return;
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().then(() => setCameraReady(true)).catch(() => setCameraReady(true));
      };
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [facingMode, startCamera]);

  // ── WebRTC connect (called on mount and on auto-reconnect) ────────────
  const connect = useCallback(async () => {
    if (connectingRef.current || cancelledRef.current) return;
    connectingRef.current = true;

    // Clean up previous connection
    dcRef.current?.close();
    pcRef.current?.close();
    dcRef.current = null;
    pcRef.current = null;

    setPhase("fetching_offer");
    setErrorMsg("");

    try {
      // Poll for PC's offer — 200ms intervals for fast pickup
      let offer: RTCSessionDescriptionInit | null = null;
      let offerVersion = 0;
      while (!offer && !cancelledRef.current) {
        try {
          const r = await fetch(`/api/webrtc-session/${sessionId}/offer`);
          if (!r.ok) {
            await new Promise((res) => setTimeout(res, 200));
            continue;
          }
          const d = await r.json() as { offer: RTCSessionDescriptionInit | null; offerVersion?: number };
          if (d.offer && (d.offerVersion ?? 0) > lastOfferVersionRef.current) {
            offer = d.offer;
            offerVersion = d.offerVersion ?? 0;
          } else {
            await new Promise((res) => setTimeout(res, 200));
          }
        } catch { await new Promise((res) => setTimeout(res, 200)); }
      }
      if (cancelledRef.current || !offer) { connectingRef.current = false; return; }

      lastOfferVersionRef.current = offerVersion;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Receive data channel created by PC
      pc.ondatachannel = (ev) => {
        const dc = ev.channel;
        dcRef.current = dc;
        dc.binaryType = "arraybuffer";
        dc.onopen = () => {
          if (!cancelledRef.current) {
            setPhase("ready");
            // Drain any files queued during gallery navigation
            drainPendingFiles();
          }
        };
        dc.onclose = () => {
          if (!cancelledRef.current) {
            // Auto-reconnect instead of erroring out
            connectingRef.current = false;
            setPhase("reconnecting");
            setTimeout(() => { connect(); }, 500);
          }
        };
        dc.onerror = () => {
          if (!cancelledRef.current) {
            connectingRef.current = false;
            setPhase("reconnecting");
            setTimeout(() => { connect(); }, 500);
          }
        };
      };

      // Also watch for connection failure at ICE level
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          if (!cancelledRef.current) {
            connectingRef.current = false;
            setPhase("reconnecting");
            setTimeout(() => { connect(); }, 500);
          }
        }
      };

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await gatherIce(pc); // fast: ~400ms on LAN, 2s hard cap

      if (cancelledRef.current) { connectingRef.current = false; return; }

      await fetch(`/api/webrtc-session/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: pc.localDescription }),
      });

      setPhase("connecting");
    } catch (e) {
      if (!cancelledRef.current) {
        setErrorMsg(e instanceof Error ? e.message : "WebRTC failed");
        setPhase("error");
      }
    } finally {
      connectingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Initial connection ────────────────────────────────────────────────────
  useEffect(() => {
    cancelledRef.current = false;
    connect();
    return () => {
      cancelledRef.current = true;
      dcRef.current?.close();
      pcRef.current?.close();
    };
  }, [connect]);

  // ── Visibility change handler (gallery / file picker return) ──────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      // Returned from gallery — check if channel is still alive
      const dc = dcRef.current;
      if (!dc || dc.readyState !== "open") {
        // Channel died while we were away — auto-reconnect
        if (phase !== "fetching_offer" && phase !== "connecting" && phase !== "reconnecting") {
          connectingRef.current = false;
          setPhase("reconnecting");
          setTimeout(() => { connect(); }, 300);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [connect, phase]);

  // ── Send queued files after reconnect ─────────────────────────────────
  const drainPendingFiles = useCallback(async () => {
    const files = pendingFilesRef.current.splice(0);
    if (!files.length) return;
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      const img = await new Promise<HTMLImageElement>((resolve) => {
        const url = URL.createObjectURL(file);
        const el = new window.Image();
        el.onload = () => { URL.revokeObjectURL(url); resolve(el); };
        el.src = url;
      });

      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = img.naturalWidth;
      tmpCanvas.height = img.naturalHeight;
      tmpCanvas.getContext("2d")!.drawImage(img, 0, 0);

      setCaptureCount((c) => {
        const newCount = c + 1;
        const thumb = tmpCanvas.toDataURL("image/jpeg", 0.4);
        setRecentCaptures((p) => [thumb, ...p.slice(0, 4)]);
        setPhase("sending");
        sendImageOverChannel(dc, tmpCanvas, `Capture${newCount}`).finally(() => setPhase("ready"));
        return newCount;
      });
      // Small delay between sends to avoid overwhelming
      await new Promise((r) => setTimeout(r, 100));
    }
  }, []);

  // ── Capture ───────────────────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !dcRef.current || phase !== "ready") return;
    const dc = dcRef.current;
    if (dc.readyState !== "open") return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Preview thumbnail
    const thumb = canvas.toDataURL("image/jpeg", 0.4);
    const newCount = captureCount + 1;
    setCaptureCount(newCount);
    setRecentCaptures((p) => [thumb, ...p.slice(0, 4)]);

    setPhase("sending");
    try {
      await sendImageOverChannel(dc, canvas, `Capture${newCount}`);
    } finally {
      setPhase("ready");
    }
  }, [captureCount, facingMode, phase]);

  // ── File upload — resilient to gallery navigation ─────────────────────
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      e.target.value = "";
      const fileArray = Array.from(files);

      const dc = dcRef.current;
      if (!dc || dc.readyState !== "open") {
        // Channel not ready (probably dropped while in gallery) — queue files
        pendingFilesRef.current.push(...fileArray);
        return;
      }

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        if (!file.type.startsWith("image/")) continue;

        const img = await new Promise<HTMLImageElement>((resolve) => {
          const url = URL.createObjectURL(file);
          const el = new window.Image();
          el.onload = () => { URL.revokeObjectURL(url); resolve(el); };
          el.src = url;
        });

        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = img.naturalWidth;
        tmpCanvas.height = img.naturalHeight;
        tmpCanvas.getContext("2d")!.drawImage(img, 0, 0);

        const newCount = captureCount + i + 1;
        const thumb = tmpCanvas.toDataURL("image/jpeg", 0.4);
        setRecentCaptures((p) => [thumb, ...p.slice(0, 4)]);

        setPhase("sending");
        try { await sendImageOverChannel(dc, tmpCanvas, `Capture${newCount}`); }
        finally { setPhase("ready"); }
      }
      setCaptureCount((c) => c + fileArray.length);
    },
    [captureCount]
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  const isReady = phase === "ready";
  const isSending = phase === "sending";
  const isReconnecting = phase === "reconnecting";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#000", color: "#fff", fontFamily: "system-ui, sans-serif", userSelect: "none", overflow: "hidden" }}>

      {/* Status bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isReady ? "#22c55e" : phase === "error" ? "#ef4444" : isReconnecting ? "#60a5fa" : "#f59e0b", boxShadow: isReady ? "0 0 6px #22c55e" : "none", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {phase === "fetching_offer" && "Waiting for editor…"}
            {phase === "connecting" && "Establishing connection…"}
            {phase === "ready" && "Connected"}
            {phase === "sending" && "Sending…"}
            {phase === "reconnecting" && "Reconnecting…"}
            {phase === "error" && "Connection failed"}
          </span>
        </div>
        {captureCount > 0 && (
          <div style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.5)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#86efac", fontWeight: 600 }}>
            ✓ {captureCount} sent
          </div>
        )}
      </div>

      {/* Portrait video — 3:4 */}
      <div style={{ flex: 1, position: "relative", background: "#111", aspectRatio: "3/4", maxHeight: "70dvh", overflow: "hidden", flexShrink: 0 }}>

        {!cameraError ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", transform: facingMode === "user" ? "scaleX(-1)" : "none", opacity: cameraReady ? 1 : 0, transition: "opacity 0.3s" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
            <span style={{ fontSize: 48 }}>📷</span>
            <p style={{ color: "#f87171", fontSize: 14, maxWidth: 280, lineHeight: 1.5, whiteSpace: "pre-line" }}>{cameraError}</p>
          </div>
        )}

        {!cameraReady && !cameraError && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
            <div style={{ width: 40, height: 40, border: "3px solid #3f3f46", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}

        {/* Connection overlay — shown until data channel opens */}
        {phase !== "ready" && phase !== "sending" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", gap: 16, backdropFilter: "blur(4px)" }}>
            {phase === "error" ? (
              <>
                <span style={{ fontSize: 40 }}>⚠️</span>
                <p style={{ color: "#f87171", fontSize: 14, textAlign: "center", maxWidth: 260, lineHeight: 1.5 }}>{errorMsg || "Connection failed. Please refresh this page."}</p>
                <button
                  onClick={() => { connectingRef.current = false; connect(); }}
                  style={{ padding: "8px 24px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, cursor: "pointer" }}
                >
                  🔄 Retry
                </button>
              </>
            ) : isReconnecting ? (
              <>
                <div style={{ width: 40, height: 40, border: "3px solid #3f3f46", borderTopColor: "#60a5fa", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", textAlign: "center", maxWidth: 240 }}>
                  Reconnecting — this should be quick…
                </p>
              </>
            ) : (
              <>
                <div style={{ width: 40, height: 40, border: "3px solid #3f3f46", borderTopColor: "#60a5fa", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", textAlign: "center", maxWidth: 240 }}>
                  {phase === "fetching_offer" ? "Waiting for the editor to be ready…" : "Establishing secure P2P connection…"}
                </p>
              </>
            )}
          </div>
        )}

        {/* Document alignment guides */}
        {isReady && cameraReady && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {[["top:16px;left:16px;borderTop:2px solid;borderLeft:2px solid", "tl"], ["top:16px;right:16px;borderTop:2px solid;borderRight:2px solid", "tr"], ["bottom:60px;left:16px;borderBottom:2px solid;borderLeft:2px solid", "bl"], ["bottom:60px;right:16px;borderBottom:2px solid;borderRight:2px solid", "br"]].map(([s]) => (
              <span key={s} style={{ position: "absolute", width: 26, height: 26, borderColor: "rgba(255,255,255,0.45)", ...(Object.fromEntries((s as string).split(";").filter(Boolean).map((p) => { const [k, v] = p.split(":"); return [k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v]; }))) }} />
            ))}
          </div>
        )}

        {/* Flip button */}
        {isReady && cameraReady && (
          <button onClick={() => setFacingMode((m) => m === "environment" ? "user" : "environment")}
            style={{ position: "absolute", top: 60, right: 12, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, backdropFilter: "blur(8px)" }}>
            🔄
          </button>
        )}

        {/* Recent captures strip */}
        {recentCaptures.length > 0 && (
          <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", gap: 4 }}>
            {recentCaptures.map((src, i) => (
              <div key={i} style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", border: `2px solid ${i === 0 ? "#22c55e" : "rgba(255,255,255,0.25)"}`, flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ background: "#111", padding: "20px 24px 36px", display: "flex", flexDirection: "column", gap: 16, alignItems: "center", flex: 1 }}>

        {/* Capture row */}
        <div style={{ display: "flex", alignItems: "center", gap: 32, width: "100%", justifyContent: "center" }}>
          {/* Count */}
          <div style={{ minWidth: 48, textAlign: "center" }}>
            {captureCount > 0 ? (
              <><span style={{ display: "block", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{captureCount}</span><span style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>sent</span></>
            ) : (
              <span style={{ fontSize: 11, color: "#4b5563" }}>{isReady ? "Ready" : "…"}</span>
            )}
          </div>

          {/* Shutter */}
          <button
            onClick={handleCapture}
            disabled={!isReady || !cameraReady}
            style={{ width: 76, height: 76, borderRadius: "50%", background: isReady && cameraReady ? "#ffffff" : "#27272a", border: "4px solid rgba(255,255,255,0.2)", cursor: isReady && cameraReady ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isReady ? "0 0 0 2px #fff" : "none", transition: "transform 0.1s, background 0.1s", flexShrink: 0 }}
            onPointerDown={(e) => { if (isReady) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.93)"; }}
            onPointerUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            {isSending ? (
              <div style={{ width: 24, height: 24, border: "3px solid #3f3f46", borderTopColor: "#000", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            ) : (
              <span style={{ width: 56, height: 56, borderRadius: "50%", background: isReady && cameraReady ? "#000" : "#3f3f46", display: "block" }} />
            )}
          </button>

          <div style={{ minWidth: 48 }} />
        </div>

        {/* File upload — always shown so user can select files even during reconnect */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", fontSize: 13, color: "#94a3b8", background: "rgba(255,255,255,0.04)", width: "100%", justifyContent: "center", boxSizing: "border-box" }}>
          📁 Upload from gallery
          <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFileUpload} />
        </label>

        {isReconnecting && (
          <p style={{ fontSize: 11, color: "#60a5fa", textAlign: "center", margin: 0, lineHeight: 1.4 }}>
            📡 Reconnecting to editor — your photos will be sent once connected.
          </p>
        )}

        <p style={{ fontSize: 11, color: "#374151", textAlign: "center", margin: 0, lineHeight: 1.4 }}>
          Photos are sent peer-to-peer — they never pass through any server.
        </p>
      </div>

      {/* Hidden canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
