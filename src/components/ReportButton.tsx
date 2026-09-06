"use client";

import { useState } from "react";
import type { ReportData } from "@/app/api/report/[id]/route";

type Props = { projectId: string };

export function ReportButton({ projectId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      // Fetch report data from the API route.
      const res = await fetch(`/api/report/${projectId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to load report data.");
      }
      const data: ReportData = await res.json();

      // Dynamically import pdf() and the document — keeps @react-pdf/renderer
      // out of the initial JS bundle (it's large and SSR-incompatible).
      const [{ pdf }, { PunchListReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./PunchListReport"),
      ]);

      const blob = await pdf(<PunchListReport data={data} />).toBlob();
      const url  = URL.createObjectURL(blob);

      // Trigger download.
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
