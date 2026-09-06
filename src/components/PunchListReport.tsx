/**
 * @react-pdf/renderer document — renders entirely client-side.
 * This file must NOT be imported at the module level from any server component.
 * Use dynamic import inside ReportButton instead.
 *
 * IMPORTANT: Do NOT use Font.register with WOFF2 sources — fontkit (used
 * internally by react-pdf) does not reliably parse WOFF2 and throws
 * "Offset is outside the bounds of the DataView". Use built-in fonts only.
 *
 * IMPORTANT: Never pass external https:// URLs to <Image src>. All photo
 * sources must be pre-fetched as base64 data URIs by ReportButton before
 * calling pdf(). This component only renders <Image> when src starts with
 * "data:" — anything else is shown as a text placeholder.
 */
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ReportData } from "@/app/api/report/[id]/route";

// ── Design tokens ──────────────────────────────────────────────────────────────

const BRAND = "#18181b";
const MUTED  = "#71717a";
const LINE   = "#e4e4e7";

const SEV_COLORS: Record<string, string> = {
  critical: "#ef4444",
  major:    "#f97316",
  minor:    "#3b82f6",
};

const STATUS_COLORS: Record<string, string> = {
  open:      "#71717a",
  in_review: "#d97706",
  resolved:  "#16a34a",
};

const STATUS_LABELS: Record<string, string> = {
  open:      "Open",
  in_review: "In Review",
  resolved:  "Resolved",
};

const SEV_LABELS: Record<string, string> = {
  critical: "Critical",
  major:    "Major",
  minor:    "Minor",
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

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    // Helvetica is a built-in PDF font — no external fetch required.
    fontFamily: "Helvetica",
    fontSize: 9,
    color: BRAND,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    backgroundColor: "#ffffff",
  },

  header: { marginBottom: 20 },
  headerTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  headerMeta: { fontSize: 9, color: MUTED },

  divider: { borderBottom: `1 solid ${LINE}`, marginVertical: 14 },

  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    borderRadius: 5,
    padding: 10,
    backgroundColor: "#f4f4f5",
  },
  summaryNum: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  summaryLabel: { fontSize: 8, color: MUTED },

  card: {
    marginBottom: 14,
    borderRadius: 6,
    border: `1 solid ${LINE}`,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#fafafa",
    borderBottom: `1 solid ${LINE}`,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  cardTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", flex: 1, marginRight: 6 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  cardBody: { padding: 8 },
  metaRow: { flexDirection: "row", gap: 10, marginBottom: 5, flexWrap: "wrap" },
  metaLabel: { color: MUTED },

  description: { color: "#3f3f46", marginBottom: 6, lineHeight: 1.4 },

  photoRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  photoBox: { flex: 1 },
  photoLabel: { fontSize: 7, color: MUTED, marginBottom: 3, fontFamily: "Helvetica-Bold" },
  photoImg: { width: "100%", borderRadius: 3 },
  noPhoto: {
    height: 64,
    backgroundColor: "#f4f4f5",
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  noPhotoText: { fontSize: 7, color: MUTED },

  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: { fontSize: 10, color: MUTED },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: MUTED },
});

// ── Sub-components ─────────────────────────────────────────────────────────────

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={[s.badge, { backgroundColor: color }]}>
      <Text>{text}</Text>
    </View>
  );
}

function SummaryCard({ num, label }: { num: number; label: string }) {
  return (
    <View style={s.summaryCard}>
      <Text style={s.summaryNum}>{num}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}

/**
 * Safely render a photo. Only uses <Image> when src is a data URI (pre-fetched
 * by ReportButton). External URLs and null both render a placeholder instead.
 */
function PhotoSlot({ src, label }: { src: string | null; label: string }) {
  const isDataUri = typeof src === "string" && src.startsWith("data:");
  return (
    <View style={s.photoBox}>
      <Text style={s.photoLabel}>{label}</Text>
      {isDataUri ? (
        <Image src={src} style={s.photoImg} />
      ) : (
        <View style={s.noPhoto}>
          <Text style={s.noPhotoText}>
            {src ? "Photo unavailable" : "No photo"}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Document ───────────────────────────────────────────────────────────────────

export function PunchListReport({ data }: { data: ReportData }) {
  const total    = data.items.length;
  const open     = data.items.filter((i) => i.status === "open").length;
  const inReview = data.items.filter((i) => i.status === "in_review").length;
  const resolved = data.items.filter((i) => i.status === "resolved").length;
  const critical = data.items.filter((i) => i.severity === "critical").length;

  const generated = new Date(data.generatedAt).toLocaleString("en-AU", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <Document title={`${data.project.name} — Punch List Report`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{data.project.name}</Text>
          {data.project.address ? (
            <Text style={s.headerMeta}>{data.project.address}</Text>
          ) : null}
          <Text style={[s.headerMeta, { marginTop: 2 }]}>
            Punch List Report — Generated {generated}
          </Text>
        </View>

        <View style={s.divider} />

        {/* Summary stats */}
        <View style={s.summaryRow}>
          <SummaryCard num={total}    label="Total items" />
          <SummaryCard num={open}     label="Open" />
          <SummaryCard num={inReview} label="In Review" />
          <SummaryCard num={resolved} label="Resolved" />
          <SummaryCard num={critical} label="Critical" />
        </View>

        {/* Item list */}
        {data.items.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyText}>No punch items in this project yet.</Text>
          </View>
        ) : (
          data.items.map((item) => {
            const hasPhotos = item.beforePhotoUrl !== null || item.afterPhotoUrl !== null;
            return (
              <View key={item.id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Badge
                    text={SEV_LABELS[item.severity] ?? item.severity}
                    color={SEV_COLORS[item.severity] ?? "#71717a"}
                  />
                  <View style={{ width: 5 }} />
                  <Badge
                    text={STATUS_LABELS[item.status] ?? item.status}
                    color={STATUS_COLORS[item.status] ?? "#71717a"}
                  />
                </View>
                <View style={s.cardBody}>
                  {/* Meta row */}
                  <View style={s.metaRow}>
                    <Text>
                      <Text style={s.metaLabel}>Trade: </Text>
                      {TRADE_LABELS[item.trade] ?? item.trade}
                    </Text>
                    {item.blueprintLabel ? (
                      <Text>
                        <Text style={s.metaLabel}>Sheet: </Text>
                        {item.blueprintLabel}
                      </Text>
                    ) : null}
                    {item.resolved_at ? (
                      <Text>
                        <Text style={s.metaLabel}>Resolved: </Text>
                        {new Date(item.resolved_at).toLocaleDateString("en-AU")}
                      </Text>
                    ) : null}
                  </View>

                  {/* Description */}
                  {item.description ? (
                    <Text style={s.description}>{item.description}</Text>
                  ) : null}

                  {/* Photos — only shown when at least one slot is non-null */}
                  {hasPhotos ? (
                    <View style={s.photoRow}>
                      <PhotoSlot src={item.beforePhotoUrl} label="BEFORE" />
                      <PhotoSlot src={item.afterPhotoUrl}  label="AFTER" />
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}

        {/* Footer — repeats on every page */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>SiteProof — Confidential</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
