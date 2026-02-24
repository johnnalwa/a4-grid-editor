"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Camera, FlipHorizontal2, X, Check, Loader2, Zap, ZapOff } from "lucide-react";
import type { UploadedAsset } from "./asset-panel";
import { cn } from "@/lib/utils";

interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (asset: UploadedAsset) => void;
  captureCounter: React.MutableRefObject<number>;
}

export function CameraModal({ open, onClose, onCapture, captureCounter }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);
  const [sessionCaptures, setSessionCaptures] = useState<UploadedAsset[]>([]);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  const startCamera = useCallback(async (mode: "environment" | "user") => {
    setCameraReady(false);
    setCameraError(null);
    setTorchOn(false);
    setTorchAvailable(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    const constraints: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 2560 },
          aspectRatio: { ideal: 3 / 4 },
        },
        audio: false,
      },
      { video: { facingMode: { ideal: mode } }, audio: false },
      { video: true, audio: false },
    ];

    let stream: MediaStream | null = null;
    let lastErr = "";
    for (const c of constraints) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(c);
        break;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "";
      }
    }

    if (!stream) {
      if (lastErr.includes("NotAllowed") || lastErr.includes("Permission")) {
        setCameraError("Camera access denied.\nAllow camera permission in your browser settings.");
      } else if (lastErr.includes("NotFound") || lastErr.includes("DevicesNotFound")) {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError("Could not start camera.\nCheck that no other app is using it.");
      }
      return;
    }

    streamRef.current = stream;

    // Check torch / flashlight capability
    const track = stream.getVideoTracks()[0];
    if (track && typeof track.getCapabilities === "function") {
      const caps = track.getCapabilities() as Record<string, unknown>;
      if (caps.torch) setTorchAvailable(true);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().then(() => setCameraReady(true)).catch(() => setCameraReady(true));
      };
    }
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const newVal = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: newVal } as MediaTrackConstraintSet] });
      setTorchOn(newVal);
    } catch {
      // torch not supported on this device/browser
    }
  }, [torchOn]);

  // Start / stop with modal visibility
  useEffect(() => {
    if (open) {
      setSessionCaptures([]);
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Restart on facing-mode flip
  useEffect(() => {
    if (open) startCamera(facingMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraReady || capturing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 960;

    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, vw, vh);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    captureCounter.current += 1;
    const name = `Capture${captureCounter.current}`;

    const asset: UploadedAsset = {
      id: `cam-local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      type: "image",
      src: dataUrl,
      thumbnailSrc: dataUrl,
      naturalWidth: vw,
      naturalHeight: vh,
      size: Math.round(dataUrl.length * 0.75),
    };

    setCapturing(true);
    setFlashVisible(true);
    setSessionCaptures((prev) => [asset, ...prev]);
    onCapture(asset);

    setTimeout(() => setFlashVisible(false), 120);
    setTimeout(() => setCapturing(false), 350);
  }, [cameraReady, capturing, facingMode, captureCounter, onCapture]);

  // Space / Enter shortcut
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleCapture();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, handleCapture]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className={cn(
          // On small screens: fill the viewport. On larger screens: cap at 400px.
          "w-full max-w-[min(100vw,400px)] p-0 overflow-hidden",
          "bg-zinc-950 border-zinc-800 text-white rounded-2xl",
          // Full-height on very small screens so video fills nicely
          "sm:max-h-[90vh] max-h-screen"
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Camera Capture</DialogTitle>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-sm font-semibold tracking-tight">Camera Capture</span>
            {sessionCaptures.length > 0 && (
              <span className="text-[10px] text-zinc-400 bg-zinc-800 rounded-full px-2 py-0.5 font-medium">
                {sessionCaptures.length} taken
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Torch / Flashlight button */}
            {torchAvailable && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg transition-colors",
                  torchOn
                    ? "text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
                onClick={toggleTorch}
                disabled={!cameraReady}
                title={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
              >
                {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
              onClick={() => setFacingMode((p) => (p === "environment" ? "user" : "environment"))}
              disabled={!cameraReady}
              title="Flip camera"
            >
              <FlipHorizontal2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Portrait video area — responsive, uses remaining viewport height ── */}
        <div
          className="relative w-full bg-black overflow-hidden"
          style={{ aspectRatio: "3 / 4" }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              facingMode === "user" && "[transform:scaleX(-1)]",
              !cameraReady && !cameraError && "opacity-0"
            )}
          />

          {/* Initialising overlay */}
          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
              <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
              <p className="text-xs text-zinc-500">Starting camera…</p>
            </div>
          )}

          {/* Error overlay */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950 px-8 text-center">
              <Camera className="w-12 h-12 text-zinc-700" />
              <p className="text-sm text-red-400 whitespace-pre-line leading-relaxed">
                {cameraError}
              </p>
              <Button
                size="sm"
                onClick={() => startCamera(facingMode)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white border-none h-8 text-xs px-4"
              >
                Try again
              </Button>
            </div>
          )}

          {/* Shutter flash */}
          {flashVisible && (
            <div
              className="absolute inset-0 bg-white pointer-events-none"
              style={{ opacity: 0.45 }}
            />
          )}

          {/* Torch active indicator */}
          {torchOn && cameraReady && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-yellow-400/20 border border-yellow-400/30 rounded-full px-2 py-1 backdrop-blur-sm">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-yellow-300 font-medium">Flash ON</span>
            </div>
          )}

          {/* Document alignment guides */}
          {cameraReady && (
            <div className="absolute inset-0 pointer-events-none select-none">
              {(
                [
                  "top-5 left-5 border-t-[2.5px] border-l-[2.5px] rounded-tl",
                  "top-5 right-5 border-t-[2.5px] border-r-[2.5px] rounded-tr",
                  "bottom-16 left-5 border-b-[2.5px] border-l-[2.5px] rounded-bl",
                  "bottom-16 right-5 border-b-[2.5px] border-r-[2.5px] rounded-br",
                ] as const
              ).map((cls, i) => (
                <span key={i} className={cn("absolute w-7 h-7 border-white/50", cls)} />
              ))}
              <p className="absolute bottom-[52px] left-0 right-0 text-center text-[10px] text-white/30 tracking-wide">
                align document within frame
              </p>
            </div>
          )}

          {/* Live / status badge */}
          {!cameraError && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 rounded-full px-2 py-1 backdrop-blur-sm">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  cameraReady
                    ? "bg-green-400 shadow-[0_0_4px_#4ade80]"
                    : "bg-yellow-400 animate-pulse"
                )}
              />
              <span className="text-[10px] text-white/80 font-medium">
                {cameraReady ? "LIVE" : "Starting…"}
              </span>
            </div>
          )}

          {/* Recent captures strip */}
          {sessionCaptures.length > 0 && (
            <div className="absolute bottom-2 left-2 flex gap-1">
              {sessionCaptures.slice(0, 5).map((cap, i) => (
                <div
                  key={cap.id}
                  className={cn(
                    "w-10 h-10 rounded-md overflow-hidden border-2 shrink-0",
                    i === 0 ? "border-green-400" : "border-white/20"
                  )}
                >
                  <img src={cap.src} alt={cap.name} className="w-full h-full object-cover" draggable={false} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Controls bar ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-950">
          {/* Left: count label */}
          <div className="w-16 text-center">
            {sessionCaptures.length > 0 ? (
              <>
                <p className="text-2xl font-bold text-white leading-none">{sessionCaptures.length}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">photos</p>
              </>
            ) : (
              <p className="text-[10px] text-zinc-600 leading-tight">
                Press<br />
                <kbd className="bg-zinc-800 px-1 rounded text-zinc-400 text-[10px]">Space</kbd>
              </p>
            )}
          </div>

          {/* Centre: shutter */}
          <button
            onClick={handleCapture}
            disabled={!cameraReady || capturing}
            className={cn(
              "relative w-[72px] h-[72px] rounded-full transition-all duration-100",
              "flex items-center justify-center",
              cameraReady && !capturing
                ? "hover:scale-105 active:scale-90 cursor-pointer"
                : "opacity-50 cursor-not-allowed"
            )}
            style={{
              background: cameraReady ? "#ffffff" : "#27272a",
              boxShadow: cameraReady ? "0 0 0 4px rgba(255,255,255,0.15)" : "none",
            }}
            title="Capture (Space)"
          >
            {capturing ? (
              <Loader2 className="w-5 h-5 text-black animate-spin" />
            ) : (
              <span
                className="rounded-full block"
                style={{
                  width: 54,
                  height: 54,
                  background: cameraReady ? "#000" : "#3f3f46",
                }}
              />
            )}
          </button>

          {/* Right: done */}
          <div className="w-16 flex justify-end">
            {sessionCaptures.length > 0 ? (
              <button
                onClick={handleClose}
                className="flex flex-col items-center gap-1 text-green-400 hover:text-green-300 transition-colors"
              >
                <Check className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Done</span>
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
