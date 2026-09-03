"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadBlueprint } from "@/app/actions/blueprints";

type Props = {
  projectId: string;
};

export default function BlueprintUpload({ projectId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setLabel("");
    setDimensions(null);
    setError(null);
    setIsOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate file type
    if (!selected.type.startsWith("image/")) {
      setError("Please select an image file (JPG, PNG).");
      return;
    }

    // Validate file size (max 10MB)
    if (selected.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB.");
      return;
    }

    setFile(selected);
    setError(null);

    // Read image dimensions and create preview
    const url = URL.createObjectURL(selected);
    setPreview(url);

    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;

    // Auto-fill label from filename
    if (!label) {
      const name = selected.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      setLabel(name.charAt(0).toUpperCase() + name.slice(1));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !dimensions) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("project_id", projectId);
    formData.set("label", label.trim() || "Untitled");
    formData.set("width", String(dimensions.width));
    formData.set("height", String(dimensions.height));

    try {
      const result = await uploadBlueprint(formData);

      if ("error" in result) {
        setError(result.error);
        setUploading(false);
        return;
      }

      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setUploading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors active:bg-zinc-100"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Upload Blueprint
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4"
    >
      {/* File picker */}
      {!file ? (
        <label className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-zinc-300 rounded-lg cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-colors">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-400"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="text-sm text-zinc-500">
            Tap to select a floor plan image
          </span>
          <span className="text-xs text-zinc-400">JPG or PNG, max 10 MB</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>
      ) : (
        <div className="relative">
          {preview && (
            <img
              src={preview}
              alt="Blueprint preview"
              className="w-full rounded-lg object-contain max-h-48 bg-zinc-100"
            />
          )}
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setPreview(null);
              setDimensions(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
            aria-label="Remove file"
          >
            ×
          </button>
          {dimensions && (
            <p className="text-xs text-zinc-400 mt-1">
              {dimensions.width} × {dimensions.height}px
            </p>
          )}
        </div>
      )}

      {/* Label */}
      <div>
        <label
          htmlFor="bp-label"
          className="block text-sm font-medium text-zinc-700 mb-1"
        >
          Sheet name
        </label>
        <input
          id="bp-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Ground Floor"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={uploading}
          className="flex-1 py-2.5 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!file || !dimensions || uploading}
          className="flex-1 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>
    </form>
  );
}
