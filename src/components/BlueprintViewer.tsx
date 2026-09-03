"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PunchItem } from "@/types/database";
import { CreatePunchItemModal } from "./CreatePunchItemModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.5;
const MAX_SCALE = 6;
/** Max movement (px) from touchstart to still count as a tap */
const TAP_MAX_MOVE = 8;
/** Screen-space radius (px) in which a tap hits an existing pin */
const PIN_HIT_PX = 28;
/** Visual size of a pin on screen regardless of zoom level */
const PIN_SCREEN_PX = 32;

// ─── Severity colours ─────────────────────────────────────────────────────────

const SEVERITY_FILL: Record<string, string> = {
  critical: "#ef4444",
  major: "#f97316",
  minor: "#3b82f6",
};

// ─── Pin SVG ──────────────────────────────────────────────────────────────────
// viewBox 28×36: 28 wide, tip at (14, 34). Mount with marginTop = -height so
// the tip aligns to the coordinate.

function PinMarker({
  severity,
  pending = false,
}: {
  severity: string;
  pending?: boolean;
}) {
  const fill = SEVERITY_FILL[severity] ?? "#6b7280";
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 28 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M14 1C7.925 1 3 5.925 3 12c0 8.5 11 23 11 23S25 20.5 25 12c0-6.075-4.925-11-11-11z"
        fill={fill}
        fillOpacity={pending ? 0.55 : 1}
        stroke="white"
        strokeWidth="1.5"
      />
      <circle cx="14" cy="12" r="4.5" fill="white" fillOpacity={0.9} />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  blueprintId: string;
  projectId: string;
  imageUrl: string;
  initialItems: PunchItem[];
};

type PendingPin = { x: number; y: number }; // normalised 0-1

// ─── Component ────────────────────────────────────────────────────────────────

export function BlueprintViewer({
  blueprintId,
  projectId,
  imageUrl,
  initialItems,
}: Props) {
  const router = useRouter();
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const imgRef  = useRef<HTMLImageElement>(null);

  // Live transform values — mutated imperatively so touchmove never triggers
  // a React re-render (keeps the gesture at 60 fps).
  const txRef    = useRef(0);
  const tyRef    = useRef(0);
  const scaleRef = useRef(1);

  // React state only for things that need to re-render: pin sizes + items list.
  const [displayScale, setDisplayScale] = useState(1);

  // Items: kept in both a ref (for gesture closures) and state (for render).
  const itemsRef = useRef<PunchItem[]>(initialItems);
  const [items, setItems] = useState<PunchItem[]>(initialItems);

  // Pending pin placed on tap, before the modal is confirmed.
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [modalOpen,  setModalOpen]  = useState(false);

  // ── Gesture tracking (all refs — no re-renders during gesture) ────────────

  const g = useRef({
    fingers: 0,
    totalMove: 0,
    // Pan
    panStartClientX: 0, panStartClientY: 0,
    panStartTx: 0, panStartTy: 0,
    tapStartClientX: 0, tapStartClientY: 0,
    // Pinch
    pinchStartDist: 0, pinchStartScale: 1,
    pinchMidContainerX: 0, pinchMidContainerY: 0,
    pinchStartTx: 0, pinchStartTy: 0,
  });

  const mouse = useRef({
    dragging: false,
    moved: false,
    startClientX: 0, startClientY: 0,
    startTx: 0, startTy: 0,
  });

  // ── Core helpers ──────────────────────────────────────────────────────────

  const applyTransform = useCallback((tx: number, ty: number, s: number) => {
    s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
    txRef.current    = tx;
    tyRef.current    = ty;
    scaleRef.current = s;
    if (innerRef.current) {
      innerRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    }
  }, []);

  function outerRect() {
    return outerRef.current!.getBoundingClientRect();
  }

  function imgLayoutSize() {
    // clientWidth/Height = layout size (before CSS transform scale)
    const img = imgRef.current;
    return img ? { w: img.clientWidth, h: img.clientHeight } : { w: 0, h: 0 };
  }

  function touchDist(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) {
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  }

  /** Convert a screen position to normalised image coordinates [0, 1]. */
  function screenToNorm(cx: number, cy: number): PendingPin | null {
    const rect = outerRect();
    const { w, h } = imgLayoutSize();
    if (!w || !h) return null;
    const ox   = cx - rect.left;
    const oy   = cy - rect.top;
    const imgX = (ox - txRef.current) / scaleRef.current;
    const imgY = (oy - tyRef.current) / scaleRef.current;
    const nx   = imgX / w;
    const ny   = imgY / h;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;
    return { x: nx, y: ny };
  }

  /** Find an existing pin within PIN_HIT_PX of the screen position. */
  function pinAtScreen(cx: number, cy: number): PunchItem | null {
    const rect = outerRect();
    const { w, h } = imgLayoutSize();
    const s  = scaleRef.current;
    const tx = txRef.current;
    const ty = tyRef.current;
    for (const item of itemsRef.current) {
      if (item.pin_x == null || item.pin_y == null) continue;
      const pinSx = rect.left + item.pin_x * w * s + tx;
      const pinSy = rect.top  + item.pin_y * h * s + ty;
      if (Math.hypot(cx - pinSx, cy - pinSy) < PIN_HIT_PX) return item;
    }
    return null;
  }

  function handleTap(cx: number, cy: number) {
    const existing = pinAtScreen(cx, cy);
    if (existing) {
      router.push(`/dashboard/projects/${projectId}/items/${existing.id}`);
      return;
    }

    const norm = screenToNorm(cx, cy);
    if (!norm) return;
    setPendingPin(norm);
    setModalOpen(true);
  }

  // ── Native event listeners (passive:false required for preventDefault) ────

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    // Wheel: zoom toward cursor on desktop
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = outerRect();
      const cx    = e.clientX - rect.left;
      const cy    = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newS  = scaleRef.current * delta;
      const imgX  = (cx - txRef.current) / scaleRef.current;
      const imgY  = (cy - tyRef.current) / scaleRef.current;
      applyTransform(cx - imgX * newS, cy - imgY * newS, newS);
      setDisplayScale(newS);
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyTransform]);

  // ── Touch handlers ────────────────────────────────────────────────────────
  // touch-action:none on the outer div means the browser won't scroll the
  // page, so we don't need e.preventDefault() here.

  function onTouchStart(e: React.TouchEvent) {
    const gg = g.current;
    gg.fingers   = e.touches.length;
    gg.totalMove = 0;

    if (e.touches.length === 1) {
      const t = e.touches[0];
      gg.panStartClientX = t.clientX;
      gg.panStartClientY = t.clientY;
      gg.panStartTx      = txRef.current;
      gg.panStartTy      = tyRef.current;
      gg.tapStartClientX = t.clientX;
      gg.tapStartClientY = t.clientY;
    } else if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const rect = outerRect();
      gg.pinchStartDist       = touchDist(t1, t2);
      gg.pinchStartScale      = scaleRef.current;
      gg.pinchMidContainerX   = (t1.clientX + t2.clientX) / 2 - rect.left;
      gg.pinchMidContainerY   = (t1.clientY + t2.clientY) / 2 - rect.top;
      gg.pinchStartTx         = txRef.current;
      gg.pinchStartTy         = tyRef.current;
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    const gg = g.current;

    if (e.touches.length === 1 && gg.fingers === 1) {
      const t  = e.touches[0];
      const dx = t.clientX - gg.panStartClientX;
      const dy = t.clientY - gg.panStartClientY;
      gg.totalMove = Math.hypot(t.clientX - gg.tapStartClientX, t.clientY - gg.tapStartClientY);
      applyTransform(gg.panStartTx + dx, gg.panStartTy + dy, scaleRef.current);

    } else if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const rect    = outerRect();
      const dist    = touchDist(t1, t2);
      const newS    = (dist / gg.pinchStartDist) * gg.pinchStartScale;
      const newMidX = (t1.clientX + t2.clientX) / 2 - rect.left;
      const newMidY = (t1.clientY + t2.clientY) / 2 - rect.top;
      // Keep the pinch midpoint fixed in image space
      const imgMidX = (gg.pinchMidContainerX - gg.pinchStartTx) / gg.pinchStartScale;
      const imgMidY = (gg.pinchMidContainerY - gg.pinchStartTy) / gg.pinchStartScale;
      gg.totalMove  = TAP_MAX_MOVE + 1; // definitely not a tap
      applyTransform(newMidX - imgMidX * newS, newMidY - imgMidY * newS, newS);
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const gg = g.current;
    const wasSingle = gg.fingers === 1;
    const isTap     = wasSingle && gg.totalMove < TAP_MAX_MOVE && e.changedTouches.length === 1;

    gg.fingers = e.touches.length;

    if (isTap) {
      const t = e.changedTouches[0];
      handleTap(t.clientX, t.clientY);
    }

    if (e.touches.length === 0) setDisplayScale(scaleRef.current);
  }

  // ── Mouse handlers (desktop pan + click-to-pin) ───────────────────────────

  function onMouseDown(e: React.MouseEvent) {
    const m = mouse.current;
    m.dragging     = true;
    m.moved        = false;
    m.startClientX = e.clientX;
    m.startClientY = e.clientY;
    m.startTx      = txRef.current;
    m.startTy      = tyRef.current;
  }

  function onMouseMove(e: React.MouseEvent) {
    const m = mouse.current;
    if (!m.dragging) return;
    const dx = e.clientX - m.startClientX;
    const dy = e.clientY - m.startClientY;
    if (Math.hypot(dx, dy) > 3) m.moved = true;
    applyTransform(m.startTx + dx, m.startTy + dy, scaleRef.current);
  }

  function onMouseUp(e: React.MouseEvent) {
    const m = mouse.current;
    if (m.dragging && !m.moved) handleTap(e.clientX, e.clientY);
    m.dragging = false;
    setDisplayScale(scaleRef.current);
  }

  function onMouseLeave() {
    mouse.current.dragging = false;
  }

  // ── Item created callback ─────────────────────────────────────────────────

  function handleItemCreated(item: PunchItem) {
    const next = [...itemsRef.current, item];
    itemsRef.current = next;
    setItems(next);
    setPendingPin(null);
    setModalOpen(false);
  }

  // ── Pin sizing ────────────────────────────────────────────────────────────
  // Pins live inside the scaled inner div. To keep them a constant visual size
  // we divide by displayScale: a 16px div inside a 2× container = 32px on screen.
  const pinW = PIN_SCREEN_PX / displayScale;
  // 28:36 aspect ratio for the SVG viewBox
  const pinH = pinW * (36 / 28);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Gesture surface */}
      <div
        ref={outerRef}
        className="relative w-full h-full overflow-hidden bg-zinc-800 select-none"
        style={{ touchAction: "none", cursor: "crosshair" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {/* Transformed layer: image + pins move together */}
        <div
          ref={innerRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transformOrigin: "0 0",
            transform: "translate(0px, 0px) scale(1)",
            willChange: "transform",
          }}
        >
          {/* Blueprint image — fills container width, height = natural aspect */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Blueprint"
            draggable={false}
            className="block w-full select-none pointer-events-none"
            style={{ maxWidth: "none" }}
          />

          {/* Existing punch-item pins */}
          {items.map((item) =>
            item.pin_x != null && item.pin_y != null ? (
              <div
                key={item.id}
                style={{
                  position: "absolute",
                  left: `${item.pin_x * 100}%`,
                  top: `${item.pin_y * 100}%`,
                  width: pinW,
                  height: pinH,
                  marginLeft: -pinW / 2,
                  marginTop: -pinH,
                  pointerEvents: "none",
                }}
                title={item.title}
              >
                <PinMarker severity={item.severity} />
              </div>
            ) : null
          )}

          {/* Pending pin — placed on tap before the modal is confirmed */}
          {pendingPin && (
            <div
              style={{
                position: "absolute",
                left: `${pendingPin.x * 100}%`,
                top: `${pendingPin.y * 100}%`,
                width: pinW,
                height: pinH,
                marginLeft: -pinW / 2,
                marginTop: -pinH,
                pointerEvents: "none",
              }}
            >
              <PinMarker severity="major" pending />
            </div>
          )}
        </div>

        {/* Zoom level indicator */}
        <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-mono px-2 py-1 rounded-md pointer-events-none select-none">
          {Math.round(displayScale * 100)}%
        </div>
      </div>

      {/* Create punch item modal */}
      {pendingPin && (
        <CreatePunchItemModal
          isOpen={modalOpen}
          onClose={() => { setPendingPin(null); setModalOpen(false); }}
          onCreated={handleItemCreated}
          blueprintId={blueprintId}
          projectId={projectId}
          pinX={pendingPin.x}
          pinY={pendingPin.y}
        />
      )}
    </>
  );
}
