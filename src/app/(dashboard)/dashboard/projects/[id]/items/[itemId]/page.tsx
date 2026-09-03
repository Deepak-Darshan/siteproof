import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { PunchItem, Blueprint, Photo } from "@/types/database";
import { ResolveSection } from "./ResolveSection";

type Props = {
  params: Promise<{ id: string; itemId: string }>;
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-100",    text: "text-red-700",    label: "Critical" },
  major:    { bg: "bg-amber-100",  text: "text-amber-700",  label: "Major" },
  minor:    { bg: "bg-blue-100",   text: "text-blue-700",   label: "Minor" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  open:      { bg: "bg-zinc-100",   text: "text-zinc-600",   label: "Open" },
  in_review: { bg: "bg-amber-100",  text: "text-amber-700",  label: "In Review" },
  resolved:  { bg: "bg-green-100",  text: "text-green-700",  label: "Resolved" },
};

const TRADE_LABELS: Record<string, string> = {
  electrical: "Electrical",
  plumbing:   "Plumbing",
  carpentry:  "Carpentry",
  painting:   "Painting",
  tiling:     "Tiling",
  hvac:       "HVAC",
  structural: "Structural",
  other:      "Other",
};

export default async function PunchItemDetailPage({ params }: Props) {
  const { id: projectId, itemId } = await params;
  const supabase = await createClient();

  // Fetch the punch item (RLS ensures project membership).
  const { data: itemData, error: itemError } = await supabase
    .from("punch_items")
    .select("*")
    .eq("id", itemId)
    .eq("project_id", projectId)
    .single();

  if (itemError || !itemData) notFound();
  const item = itemData as PunchItem;

  // Fetch photos attached to this item.
  const { data: photosData } = await supabase
    .from("photos")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: true });

  const photos = (photosData as Photo[]) ?? [];
  const beforePhoto = photos.find((p) => p.type === "before");
  const afterPhoto  = photos.find((p) => p.type === "after");

  // Generate signed URLs for photos (60-min expiry).
  async function signedUrl(path: string) {
    const { data } = await supabase.storage
      .from("photos")
      .createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  }

  // Check if the current user is an admin on this project.
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = user
    ? await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .single()
    : { data: null };
  const isAdmin = membership?.role === "admin";

  const [beforeUrl, afterUrl, blueprintUrl] = await Promise.all([
    beforePhoto ? signedUrl(beforePhoto.file_path) : null,
    afterPhoto  ? signedUrl(afterPhoto.file_path)  : null,
    // Fetch blueprint thumbnail if pinned.
    (async () => {
      if (!item.blueprint_id) return null;
      const { data: bp } = await supabase
        .from("blueprints")
        .select("file_path")
        .eq("id", item.blueprint_id)
        .single();
      if (!bp) return null;
      const bpData = bp as Pick<Blueprint, "file_path">;
      const { data } = await supabase.storage
        .from("blueprints")
        .createSignedUrl(bpData.file_path, 3600);
      return data?.signedUrl ?? null;
    })(),
  ]);

  const sev    = SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.minor;
  const status = STATUS_STYLES[item.status]     ?? STATUS_STYLES.open;

  return (
    <main className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-5">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-600 shrink-0"
          aria-label="Back to project"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="font-bold text-zinc-900 text-xl truncate">{item.title}</h1>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${sev.bg} ${sev.text}`}>
          {sev.label}
        </span>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
          {status.label}
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600">
          {TRADE_LABELS[item.trade] ?? item.trade}
        </span>
      </div>

      {/* Description */}
      {item.description && (
        <section>
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-1">Description</p>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{item.description}</p>
        </section>
      )}

      {/* Blueprint pin location */}
      {blueprintUrl && item.pin_x != null && item.pin_y != null && (
        <section>
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Pin location</p>
          <Link
            href={`/dashboard/projects/${projectId}/blueprint/${item.blueprint_id}`}
            className="block relative rounded-xl overflow-hidden border border-zinc-200 hover:border-zinc-300 transition-colors"
            style={{ aspectRatio: "16/9" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blueprintUrl}
              alt="Blueprint"
              className="w-full h-full object-contain bg-zinc-800"
            />
            {/* Pin dot overlay */}
            <div
              className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg"
              style={{
                left:      `${item.pin_x * 100}%`,
                top:       `${item.pin_y * 100}%`,
                transform: "translate(-50%, -50%)",
                backgroundColor:
                  item.severity === "critical" ? "#ef4444" :
                  item.severity === "major"    ? "#f97316" : "#3b82f6",
              }}
            />
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-md">
              Tap to view blueprint
            </div>
          </Link>
        </section>
      )}

      {/* Before photo */}
      <section>
        <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Before photo</p>
        {beforeUrl ? (
          <PhotoCard url={beforeUrl} label="Before" date={beforePhoto!.taken_at} lat={beforePhoto!.lat} lng={beforePhoto!.lng} />
        ) : (
          <EmptyPhotoSlot label="No before photo yet" />
        )}
      </section>

      {/* After photo (only when present) */}
      {afterUrl && (
        <section>
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">After photo</p>
          <PhotoCard url={afterUrl} label="After" date={afterPhoto!.taken_at} lat={afterPhoto!.lat} lng={afterPhoto!.lng} />
        </section>
      )}

      {/* Resolve action */}
      <section>
        <ResolveSection
          itemId={itemId}
          projectId={projectId}
          status={item.status}
          isAdmin={isAdmin}
        />
      </section>

      {/* Timestamps */}
      <section className="text-xs text-zinc-400 space-y-0.5 pt-2 border-t border-zinc-100">
        <p>Created {new Date(item.created_at).toLocaleString()}</p>
        {item.resolved_at && (
          <p>Resolved {new Date(item.resolved_at).toLocaleString()}</p>
        )}
      </section>
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PhotoCard({
  url,
  label,
  date,
  lat,
  lng,
}: {
  url: string;
  label: string;
  date: string;
  lat: number | null;
  lng: number | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`${label} photo`}
        className="w-full object-cover"
        style={{ maxHeight: "55dvh" }}
      />
      <div className="px-3 py-2 text-xs text-zinc-500 space-y-0.5">
        <p>{new Date(date).toLocaleString()}</p>
        {lat != null && lng != null && (
          <p>
            GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyPhotoSlot({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 py-10 text-zinc-400">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      <p className="text-sm">{label}</p>
    </div>
  );
}
