"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PhotoCapture, type CapturedPhoto } from "@/components/PhotoCapture";
import { savePhoto } from "@/app/actions/photos";

type Props = {
  itemId: string;
  projectId: string;
};

export function BeforePhotoSection({ itemId, projectId }: Props) {
  const router = useRouter();
  const [showCapture, setShowCapture] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleCapture(photo: CapturedPhoto) {
    setError(null);

    // Upload directly from the browser to Supabase Storage.
    const supabase = createClient();
    const filePath = `${projectId}/${itemId}/before_${Date.now()}.jpg`;

    const { error: storageError } = await supabase.storage
      .from("photos")
      .upload(filePath, new File([photo.blob], "photo.jpg", { type: "image/jpeg" }), {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (storageError) {
      setError(`Upload failed: ${storageError.message}`);
      return;
    }

    const result = await savePhoto(
      itemId, projectId, "before", filePath,
      photo.takenAt.toISOString(), photo.lat, photo.lng,
    );

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setShowCapture(false);
    startTransition(() => router.refresh());
  }

  if (showCapture) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="font-semibold text-zinc-900 text-sm mb-3">Upload before photo</h3>
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-200 py-8 text-zinc-400">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      <p className="text-sm">No before photo yet</p>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mx-4 text-center">{error}</p>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() => setShowCapture(true)}
        className="px-4 h-9 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 transition-colors"
      >
        Add before photo
      </button>
    </div>
  );
}
