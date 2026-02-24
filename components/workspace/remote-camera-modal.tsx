"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QRCode from "react-qr-code";
import {
  QrCode, X, Loader2, CheckCircle2, Smartphone,
  Wifi, Link, ChevronDown, ChevronUp, RefreshCw, Signal,
} from "lucide-react";
import type { UploadedAsset } from "./asset-panel";
import { cn } from "@/lib/utils";

// ─── WebRTC ─────────────────────────────────────────────────────────────────

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};

/**
 * Fast ICE gathering strategy:
 * - Resolves immediately when state reaches "complete"
 * - Resolves 400ms after the first host candidate arrives (LAN path is ready)
 * - Hard fallback at 2 seconds (was 12s)
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
    const hardTimeout = setTimeout(done, 2_000);
    pc.addEventListener("icegatheringstatechange", function check() {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        done();
      }
    });
    pc.addEventListener("icecandidate", (ev) => {
      if (!ev.candidate) { done(); return; }
      // First host candidate means the LAN path is ready; wait 400ms for more
      if (!earlyTimer && ev.candidate.type === "host") {
        earlyTimer = setTimeout(done, 400);
      }
    });
  });
}

// ─── Hosting detection ───────────────────────────────────────────────────────

function detectHosting(serverIp: string): { baseUrl: string; isHosted: boolean } {
  if (typeof window === "undefined") return { baseUrl: "", isHosted: false };
  const { protocol, hostname, port } = window.location;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const isLanIp = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname);
  if (protocol === "https:" && !isLocalhost && !isLanIp) {
    return { baseUrl: window.location.origin, isHosted: true };
  }
  return { baseUrl: `${protocol}//${serverIp}:${port || "3000"}`, isHosted: false };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RemoteCameraModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (asset: UploadedAsset) => void;
  captureCounter: React.MutableRefObject<number>;
}

type Phase =
  | "idle"
  | "creating"      // building offer
  | "waiting"       // QR shown, phone hasn't scanned yet
  | "connecting"    // phone answered, ICE negotiating
  | "connected"     // data channel open
  | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export function RemoteCameraModal({
  open, onClose, onCapture, captureCounter,
}: RemoteCameraModalProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cameraUrl, setCameraUrl] = useState("");
  const [isHosted, setIsHosted] = useState(false);
  const [tunnelBase, setTunnelBase] = useState("");
  const [tunnelOpen, setTunnelOpen] = useState(false);
  const [receivedAssets, setReceivedAssets] = useState<UploadedAsset[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<ArrayBuffer[]>([]);
  const metaRef = useRef<{ name: string; width: number; height: number } | null>(null);
  /** Always holds the active session ID so DC-close callbacks don't go stale. */
  const sessionIdRef = useRef<string | null>(null);
  /** Prevents two concurrent offer builds. */
  const buildingRef = useRef(false);
  /**
   * Ref to the latest buildOffer fn so the dc.onclose closure can always call
   * the current version without capturing a stale reference.
   */
  const buildOfferRef = useRef<((sid: string) => Promise<void>) | null>(null);

  // Effective URL for QR (tunnel overrides local IP)
  const effectiveUrl = tunnelBase.trim()
    ? `${tunnelBase.trim().replace(/\/$/, "")}/camera/${sessionId}`
    : cameraUrl;

  // ── Data channel message handler ─────────────────────────────────────────
  const handleDCMessage = useCallback(
    (ev: MessageEvent) => {
      if (typeof ev.data === "string") {
        const msg = JSON.parse(ev.data) as { t: string; n: string; w: number; h: number };
        if (msg.t === "s") {
          metaRef.current = { name: msg.n, width: msg.w, height: msg.h };
          chunksRef.current = [];
        } else if (msg.t === "e" && metaRef.current) {
          const blob = new Blob(chunksRef.current, { type: "image/jpeg" });
          const m = metaRef.current;
          metaRef.current = null;
          chunksRef.current = [];
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            captureCounter.current += 1;
            const asset: UploadedAsset = {
              id: `cam-rtc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: `Capture${captureCounter.current}`,
              type: "image",
              src: dataUrl,
              thumbnailSrc: dataUrl,
              naturalWidth: m.width,
              naturalHeight: m.height,
              size: blob.size,
            };
            setReceivedAssets((p) => [asset, ...p]);
            onCapture(asset);
          };
          reader.readAsDataURL(blob);
        }
      } else if (ev.data instanceof ArrayBuffer) {
        chunksRef.current.push(ev.data);
      }
    },
    [captureCounter, onCapture]
  );

  // ── Build / rebuild an offer for the given session ────────────────────────
  const buildOffer = useCallback(async (sid: string) => {
    if (buildingRef.current) return;
    buildingRef.current = true;

    clearInterval(pollRef.current ?? 0);
    pcRef.current?.close();
    pcRef.current = null;
    chunksRef.current = [];
    metaRef.current = null;
    setPhase("creating");
    setErrorMsg("");

    try {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      const dc = pc.createDataChannel("images", { ordered: true });
      dc.binaryType = "arraybuffer";
      dc.onopen = () => setPhase("connected");
      dc.onmessage = handleDCMessage;
      dc.onerror = () => setPhase("error");
      dc.onclose = () => {
        setPhase((p) => {
          if (p === "connected" || p === "connecting") {
            // Auto-rebuild offer after a short pause so phone can re-answer.
            // Uses ref to get the latest buildOffer — avoids stale closure.
            setTimeout(() => {
              const currentSid = sessionIdRef.current;
              if (currentSid) {
                buildingRef.current = false; // reset guard before rebuilding
                buildOfferRef.current?.(currentSid);
              }
            }, 800);
            return "waiting";
          }
          return p;
        });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await gatherIce(pc); // fast: ~400ms on LAN, 2s hard cap

      await fetch(`/api/webrtc-session/${sid}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer: pc.localDescription }),
      });

      setPhase("waiting");

      // Poll for phone's answer — 300ms for near-instant detection
      pollRef.current = setInterval(async () => {
        const current = pcRef.current;
        if (!current || current.signalingState === "stable") {
          clearInterval(pollRef.current ?? 0);
          return;
        }
        try {
          const r = await fetch(`/api/webrtc-session/${sid}/answer`);
          const { answer } = (await r.json()) as { answer: RTCSessionDescriptionInit | null };
          if (answer && current.signalingState !== "stable") {
            await current.setRemoteDescription(answer);
            setPhase("connecting");
            clearInterval(pollRef.current ?? 0);
          }
        } catch { /* network blip — retry next tick */ }
      }, 300);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to start");
      setPhase("error");
    } finally {
      buildingRef.current = false;
    }
  }, [handleDCMessage]);

  // Keep the ref pointing at the latest buildOffer so dc.onclose is never stale
  useEffect(() => { buildOfferRef.current = buildOffer; }, [buildOffer]);

  // ── Start a completely new WebRTC session ─────────────────────────────────
  const startSession = useCallback(async () => {
    buildingRef.current = false; // reset in case previous run left it set
    clearInterval(pollRef.current ?? 0);
    pcRef.current?.close();
    pcRef.current = null;
    setReceivedAssets([]);
    setPhase("creating");
    setErrorMsg("");

    try {
      const res = await fetch("/api/webrtc-session", { method: "POST" });
      const { sessionId: sid, ip } = (await res.json()) as { sessionId: string; ip: string };
      sessionIdRef.current = sid;
      setSessionId(sid);

      const { baseUrl, isHosted: hosted } = detectHosting(ip);
      setIsHosted(hosted);
      setCameraUrl(`${baseUrl}/camera/${sid}`);

      await buildOffer(sid);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to start");
      setPhase("error");
    }
  }, [buildOffer]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      startSession();
    } else {
      clearInterval(pollRef.current ?? 0);
      pcRef.current?.close();
      pcRef.current = null;
      buildingRef.current = false;
      sessionIdRef.current = null;
      setPhase("idle");
      setSessionId(null);
      setCameraUrl("");
      setReceivedAssets([]);
      setTunnelBase("");
      setTunnelOpen(false);
      setIsHosted(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ─── Render ────────────────────────────────────────────────────────────────
  const statusLabel: Record<Phase, string> = {
    idle: "",
    creating: "Building connection…",
    waiting: "Waiting for device to scan…",
    connecting: "Establishing P2P link…",
    connected: "Connected — receive photos now",
    error: "Connection failed",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-background border-border">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <QrCode className="w-4 h-4 text-primary" />
              Remote Camera
            </DialogTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">

          {/* ── How it works ── */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Smartphone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {phase === "connected"
                ? "Phone connected. Tap the shutter — photos arrive here instantly. The link stays valid if you navigate away."
                : "Scan the QR code with your phone. Photos are sent directly browser-to-browser — no server storage."}
            </p>
          </div>

          {/* ── Hosted badge ── */}
          {isHosted && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
              <p className="text-[11px] text-green-700 dark:text-green-400 leading-relaxed">
                <strong>Public HTTPS detected.</strong> QR works from any device on any network.
              </p>
            </div>
          )}

          {/* ── Tunnel URL (local dev only) ── */}
          {!isHosted && (
            <div className="rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setTunnelOpen((p) => !p)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Link className="w-3.5 h-3.5 text-primary" />
                  Use tunnel for cross-network access
                </div>
                {tunnelOpen
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>

              {tunnelOpen && (
                <div className="px-3 pb-3 pt-1 flex flex-col gap-2 border-t border-border bg-muted/20">
                  <p className="text-[11px] text-muted-foreground">
                    Run one of these in a terminal, then paste the URL:
                  </p>
                  {[
                    { l: "localtunnel", c: "npx localtunnel --port 3000" },
                    { l: "ngrok", c: "ngrok http 3000" },
                    { l: "cloudflare", c: "npx cloudflared tunnel --url http://localhost:3000" },
                  ].map(({ l, c }) => (
                    <div key={c} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-20 shrink-0">{l}</span>
                      <div
                        onClick={() => navigator.clipboard.writeText(c).catch(() => {})}
                        className="flex-1 flex items-center gap-1.5 bg-zinc-900 dark:bg-zinc-800 text-zinc-200 rounded px-2 py-1 cursor-pointer hover:bg-zinc-800 transition-colors"
                        title="Click to copy"
                      >
                        <code className="text-[10px] flex-1 select-all">{c}</code>
                        <span className="text-[9px] text-zinc-500 shrink-0">copy</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="https://xxxx.loca.lt  or  https://xxxx.ngrok-free.app"
                      value={tunnelBase}
                      onChange={(e) => setTunnelBase(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                    {tunnelBase && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setTunnelBase("")}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  {tunnelBase.trim() && (
                    <p className="text-[11px] text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      QR now uses tunnel — works from any network, camera enabled.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── QR Code ── */}
          <div className="flex flex-col items-center gap-3">
            {phase === "creating" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Preparing session…</p>
              </div>
            )}

            {phase === "error" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-sm text-destructive text-center">{errorMsg || "Connection failed"}</p>
                <Button size="sm" variant="outline" onClick={startSession}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try again
                </Button>
              </div>
            )}

            {sessionId && phase !== "creating" && phase !== "error" && effectiveUrl && (
              <>
                {/* QR */}
                <div className={cn("p-4 bg-white rounded-xl shadow-md transition-opacity", phase === "connected" && "opacity-50")}>
                  <QRCode value={effectiveUrl} size={168} style={{ display: "block" }} />
                </div>

                {/* URL */}
                <div className="w-full">
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted border border-border">
                    <code className="text-[11px] flex-1 truncate text-foreground/80 select-all">{effectiveUrl}</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                      onClick={() => navigator.clipboard.writeText(effectiveUrl).catch(() => {})} title="Copy">
                      <span className="text-[10px]">📋</span>
                    </Button>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full",
                    phase === "connected" && "bg-green-500 shadow-[0_0_6px_#22c55e]",
                    phase === "connecting" && "bg-blue-400 animate-pulse",
                    phase === "waiting" && "bg-yellow-500 animate-pulse",
                  )} />
                  <span className="text-[11px] text-muted-foreground">{statusLabel[phase]}</span>
                </div>
              </>
            )}
          </div>

          {/* ── Received images ── */}
          {receivedAssets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Signal className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs font-medium">
                  {receivedAssets.length} image{receivedAssets.length > 1 ? "s" : ""} received
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {receivedAssets.slice(0, 10).map((a, i) => (
                  <div key={a.id} className={cn("aspect-square rounded-md overflow-hidden border-2", i === 0 ? "border-green-400" : "border-border")}>
                    <img src={a.src} alt={a.name} className="w-full h-full object-cover" />
                  </div>
                ))}
                {receivedAssets.length > 10 && (
                  <div className="aspect-square rounded-md border-2 border-border bg-muted flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground font-medium">+{receivedAssets.length - 10}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Local-dev connectivity note ── */}
          {!isHosted && !tunnelBase.trim() && phase !== "error" && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
              <Wifi className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                <strong>Same Wi-Fi required</strong> for the QR URL shown. Expand the tunnel option
                above for cross-network or HTTPS camera access.
              </p>
            </div>
          )}

          {/* ── P2P note ── */}
          <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed">
            Images travel directly from your phone to this browser (WebRTC).
            They are never stored on any server — works on Vercel, Railway, or any host.
          </p>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={startSession} disabled={phase === "creating"}>
              <RefreshCw className="w-3 h-3 mr-1.5" /> New Session
            </Button>
            <Button size="sm" className="flex-1 text-xs" onClick={onClose}>
              {receivedAssets.length > 0 ? `Done (${receivedAssets.length} added)` : "Close"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
