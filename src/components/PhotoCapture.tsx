"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export type CapturedPhoto = {
  blob: Blob;
  takenAt: Date;
  lat: number | null;
  lng: number | null;
};

type Props = {
  /** Called when the user has captured/selected and confirmed a photo. */
  onCapture: (photo: CapturedPhoto) => void;
  onCancel: () => void;
};

// Compress a raw image blob to max 1920px wide, returning a new JPEG blob.
async function compressImage(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const maxW = 1920;
  const scale = bitmap.width > maxW ? maxW / bitmap.width : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      0.88
    );
  });
}

// Extract EXIF GPS from a blob using exifr (dynamic import keeps it out of
// the initial JS bundle — it's only needed inside this component).
async function extractExif(
  blob: Blob
): Promise<{ takenAt: Date; lat: number | null; lng: number | null }> {
  try {
    const exifr = await import("exifr");
    const exif = await exifr.default.parse(blob, {
      pick: ["DateTimeOriginal", "latitude", "longitude"],
    });
    const takenAt =
      exif?.DateTimeOriginal instanceof Date
        ? exif.DateTimeOriginal
        : new Date();
    const lat = typeof exif?.latitude === "number" ? exif.latitude : null;
    const lng = typeof exif?.longitude === "number" ? exif.longitude : null;
    return { takenAt, lat, lng };
  } catch {
    return { takenAt: new Date(), lat: null, lng: null };
  }
}

type Mode = "idle" | "camera" | "preview";

export function PhotoCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // ── Camera lifecycle ──────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode("camera");
    } catch {
      setCameraError(
        "Camera access was denied. Use the gallery button to upload a photo instead."
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Stop the stream whenever we leave camera mode or unmount.
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // ── Capture from camera ───────────────────────────────────────────────────

  function captureFrame() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);

    canvas.toBlob(
      async (raw) => {
        if (!raw) return;
        stopCamera();
        const blob = await compressImage(raw);
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setPreview(url);
        setMode("preview");
      },
      "image/jpeg",
      0.92
    );
  }

  // ── Gallery file input ────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    setProcessing(true);
    try {
      const blob = await compressImage(file);
      const url = URL.createObjectURL(blob);
      setCapturedBlob(blob);
      setPreview(url);
      setMode("preview");
    } finally {
      setProcessing(false);
      // Reset so the same file can be re-selected.
      e.target.value = "";
    }
  }

  // ── Confirm captured photo ────────────────────────────────────────────────

  async function handleConfirm() {
    if (!capturedBlob) return;
    setProcessing(true);
    try {
      const { takenAt, lat, lng } = await extractExif(capturedBlob);
      onCapture({ blob: capturedBlob, takenAt, lat, lng });
    } finally {
      setProcessing(false);
    }
  }

  function handleRetake() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setCapturedBlob(null);
    setMode("idle");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4">
      {/* ── Idle: action buttons ── */}
      {mode === "idle" && (
        <>
          {cameraError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 w-full text-center">
              {cameraError}
            </p>
          )}

          {processing && (
            <p className="text-sm text-zinc-500">Processing…</p>
          )}

          {!processing && (
            <div className="flex gap-3 w-full">
              {/* Camera button */}
              <button
                type="button"
                onClick={startCamera}
                className="flex-1 flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
              >
                <CameraIcon />
                <span className="text-sm font-medium">Take photo</span>
              </button>

              {/* Gallery button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
              >
                <GalleryIcon />
                <span className="text-sm font-medium">Choose photo</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Cancel
          </button>
        </>
      )}

      {/* ── Camera live preview ── */}
      {mode === "camera" && (
        <div className="w-full flex flex-col items-center gap-3">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-xl bg-black"
            style={{ maxHeight: "60dvh", objectFit: "cover" }}
          />
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => { stopCamera(); setMode("idle"); }}
              className="flex-1 h-11 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={captureFrame}
              className="flex-1 h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Capture
            </button>
          </div>
          {/* Gallery fallback even in camera mode */}
          <button
            type="button"
            onClick={() => { stopCamera(); setMode("idle"); fileInputRef.current?.click(); }}
            className="text-sm text-zinc-500 hover:text-zinc-700 underline transition-colors"
          >
            Choose from gallery instead
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* ── Preview: confirm or retake ── */}
      {mode === "preview" && preview && (
        <div className="w-full flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Captured photo preview"
            className="w-full rounded-xl object-cover"
            style={{ maxHeight: "60dvh" }}
          />
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={handleRetake}
              disabled={processing}
              className="flex-1 h-11 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={processing}
              className="flex-1 h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {processing ? "Processing…" : "Use photo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
