import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PunchItem, Photo, Blueprint } from "@/types/database";

export type ReportData = {
  project: { id: string; name: string; address: string | null; created_at: string };
  items: Array<
    PunchItem & {
      beforePhotoUrl: string | null;
      afterPhotoUrl: string | null;
      blueprintLabel: string | null;
    }
  >;
  generatedAt: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  // Auth check via RLS — if the user isn't a member, these queries return nothing.
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, address, created_at")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const [{ data: itemsData }, { data: photosData }, { data: blueprintsData }] =
    await Promise.all([
      supabase
        .from("punch_items")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("photos")
        .select("*")
        .in(
          "item_id",
          // We need item ids — fetch lazily after items query completes.
          // A simpler approach: fetch all photos for the project via a join.
          // Since photos only have item_id (not project_id), we select from
          // punch_items instead.
          [projectId], // placeholder — replaced below
        ),
      supabase
        .from("blueprints")
        .select("id, label")
        .eq("project_id", projectId),
    ]);

  const items = (itemsData as PunchItem[]) ?? [];
  const blueprints = (blueprintsData as Pick<Blueprint, "id" | "label">[]) ?? [];

  // Fetch photos for these specific item IDs.
  const itemIds = items.map((i) => i.id);
  let photos: Photo[] = [];
  if (itemIds.length > 0) {
    const { data: pd } = await supabase
      .from("photos")
      .select("*")
      .in("item_id", itemIds);
    photos = (pd as Photo[]) ?? [];
  }

  // Generate signed URLs in bulk for each photo file path.
  const filePaths = photos.map((p) => p.file_path);
  const signedMap = new Map<string, string>();
  if (filePaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("photos")
      .createSignedUrls(filePaths, 3600);
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) signedMap.set(s.path, s.signedUrl);
    }
  }

  const blueprintMap = new Map(blueprints.map((b) => [b.id, b.label]));
  const photosByItem = new Map<string, Photo[]>();
  for (const p of photos) {
    const arr = photosByItem.get(p.item_id) ?? [];
    arr.push(p);
    photosByItem.set(p.item_id, arr);
  }

  const enrichedItems = items.map((item) => {
    const itemPhotos = photosByItem.get(item.id) ?? [];
    const before = itemPhotos.find((p) => p.type === "before");
    const after  = itemPhotos.find((p) => p.type === "after");
    return {
      ...item,
      beforePhotoUrl: before ? (signedMap.get(before.file_path) ?? null) : null,
      afterPhotoUrl:  after  ? (signedMap.get(after.file_path)  ?? null) : null,
      blueprintLabel: item.blueprint_id ? (blueprintMap.get(item.blueprint_id) ?? null) : null,
    };
  });

  const report: ReportData = {
    project: project as ReportData["project"],
    items: enrichedItems,
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(report);
}
