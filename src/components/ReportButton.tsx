"use client";

import { useState } from "react";
import type { ReportData } from "@/app/api/report/[id]/route";

type Props = { projectId: string };

/**
 * Fetch an image URL and return it as a base64 data URI.
 * Returns null on any failure so the PDF can show a placeholder instead.
 * This runs in the browser (no CORS issues with signed Supabase URLs)
 * and prevents @react-pdf/renderer from trying to fetch URLs itself,
 * which crashes with "Offset is outside the bounds of the DataView".
 */
async function toDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

/** Convert all photo URLs in the report data to base64 data URIs. */
async function prefetchPhotos(data: ReportData): Promise<ReportData> {
  const items = await Promise.all(
    data.items.map(async (item) => {
      const [beforePhotoUrl, afterPhotoUrl] = await Promise.all([
        item.beforePhotoUrl ? toDataUri(item.beforePhotoUrl) : null,
        item.afterPhotoUrl  ? toDataUri(item.afterPhotoUrl)  : null,
      ]);
      return { ...item, beforePhotoUrl, afterPhotoUrl };
    })
  );
  return { ...data, items };
}

export function ReportButton({ projectId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/report/${projectId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to load report data.");
      }
      const rawData: ReportData = await res.json();

      // Pre-fetch all images as base64 — this avoids CORS/auth failures
      // that occur when @react-pdf/renderer tries to fetch the URLs itself.
      const data = await prefetchPhotos(rawData);

      const [{ pdf }, { PunchListReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./PunchListReport"),
      ]);

      const blob = await pdf(<PunchListReport data={data} />).toBlob();
      const url  = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.project.name.replace(/[^a-z0-9]/gi, "_")}_punch_list.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin w-4 h-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity=".25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            Generating…
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Report
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
