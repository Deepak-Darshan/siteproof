"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhotoCapture, type CapturedPhoto } from "@/components/PhotoCapture";
import { uploadPhoto, updateItemStatus } from "@/app/actions/photos";
import type { PunchItemStatus } from "@/types/database";

type Props = {
  itemId: string;
  projectId: string;
  status: PunchItemStatus;
};

export function ResolveSection({ itemId, projectId, status }: Props) {
  const router = useRouter();
  const [showCapture, setShowCapture] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleCapture(photo: CapturedPhoto) {
    setError(null);
    const formData = new FormData();
    formData.set("file", new File([photo.blob], "photo.jpg", { type: "image/jpeg" }));
    formData.set("item_id", itemId);
    formData.set("project_id", projectId);
    formData.set("type", "after");
    formData.set("taken_at", photo.takenAt.toISOString());
    if (photo.lat != null) formData.set("lat", String(photo.lat));
    if (photo.lng != null) formData.set("lng", String(photo.lng));

    const result = await uploadPhoto(formData);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    // Move status to in_review (subcontractor uploaded proof).
    const statusResult = await updateItemStatus(itemId, projectId, "in_review");
    if ("error" in statusResult) {
      setError(statusResult.error);
      return;
    }

    setShowCapture(false);
    startTransition(() => router.refresh());
  }

  if (status === "resolved") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-50 rounded-xl border border-green-200">
        <CheckIcon />
        <span className="text-sm font-medium text-green-800">Item resolved</span>
      </div>
    );
  }

  if (status === "in_review") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 rounded-xl border border-amber-200">
        <ClockIcon />
        <span className="text-sm font-medium text-amber-800">Awaiting review</span>
      </div>
    );
  }

  // status === "open"
  if (showCapture) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="font-semibold text-zinc-900 text-sm mb-3">Upload after photo</h3>
        {error && (
          <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        <PhotoCapture
          onCapture={handleCapture}
          onCancel={() => { setShowCapture(false); setError(null); }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() => setShowCapture(true)}
        className="w-full h-12 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 transition-colors"
      >
        Mark resolved — upload after photo
      </button>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 shrink-0" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
