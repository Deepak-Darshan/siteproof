/**
 * @react-pdf/renderer document — renders entirely client-side.
 * This file must NOT be imported at the module level from any server component.
 * Use dynamic import inside ReportButton instead.
 */
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { ReportData } from "@/app/api/report/[id]/route";

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa25L7SUc.woff2",
      fontWeight: 700,
    },
  ],
});

const BRAND = "#18181b"; // zinc-900
const MUTED  = "#71717a"; // zinc-500
const LINE   = "#e4e4e7"; // zinc-200

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

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9,
    color: BRAND,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    backgroundColor: "#ffffff",
  },

  // Header
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  headerMeta: { fontSize: 9, color: MUTED },

  divider: { borderBottom: `1 solid ${LINE}`, marginVertical: 16 },

  // Summary row
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#f4f4f5",
  },
  summaryNum: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  summaryLabel: { fontSize: 8, color: MUTED },

  // Item card
  card: {
    marginBottom: 16,
    borderRadius: 8,
    border: `1 solid ${LINE}`,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fafafa",
    borderBottom: `1 solid ${LINE}`,
  },
  cardTitle: { fontSize: 10, fontWeight: 700, flex: 1, marginRight: 8 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 7,
    fontWeight: 700,
    color: "#ffffff",
  },
  cardBody: { padding: 10 },
  metaRow: { flexDirection: "row", gap: 12, marginBottom: 6 },
  metaLabel: { color: MUTED, marginRight: 3 },

  description: { color: "#3f3f46", marginBottom: 8, lineHeight: 1.5 },

  // Photos
  photoRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  photoBox: { flex: 1 },
  photoLabel: { fontSize: 7, color: MUTED, marginBottom: 3, fontWeight: 700 },
  photoImg: { width: "100%", borderRadius: 4, objectFit: "cover" },
  noPhoto: {
    height: 70,
    backgroundColor: "#f4f4f5",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  noPhotoText: { fontSize: 7, color: MUTED },

  // Footer
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

export function PunchListReport({ data }: { data: ReportData }) {
  const total    = data.items.length;
  const resolved = data.items.filter((i) => i.status === "resolved").length;
  const open     = data.items.filter((i) => i.status === "open").length;
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
          {data.project.address && (
            <Text style={s.headerMeta}>{data.project.address}</Text>
          )}
          <Text style={[s.headerMeta, { marginTop: 2 }]}>
            Punch List Report — Generated {generated}
          </Text>
        </View>

        <View style={s.divider} />

        {/* Summary */}
        <View style={s.summaryRow}>
          <SummaryCard num={total}    label="Total items" />
          <SummaryCard num={open}     label="Open" />
          <SummaryCard num={resolved} label="Resolved" />
          <SummaryCard num={critical} label="Critical" />
        </View>

        {/* Items */}
        {data.items.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Badge
                text={SEV_LABELS[item.severity] ?? item.severity}
                color={SEV_COLORS[item.severity] ?? "#71717a"}
              />
              <View style={{ width: 6 }} />
              <Badge
                text={STATUS_LABELS[item.status] ?? item.status}
                color={STATUS_COLORS[item.status] ?? "#71717a"}
              />
            </View>
            <View style={s.cardBody}>
              {/* Meta */}
              <View style={s.metaRow}>
                <Text>
                  <Text style={s.metaLabel}>Trade: </Text>
                  {TRADE_LABELS[item.trade] ?? item.trade}
                </Text>
                {item.blueprintLabel && (
                  <Text>
                    <Text style={s.metaLabel}>Sheet: </Text>
                    {item.blueprintLabel}
                  </Text>
                )}
                {item.resolved_at && (
                  <Text>
                    <Text style={s.metaLabel}>Resolved: </Text>
                    {new Date(item.resolved_at).toLocaleDateString("en-AU")}
                  </Text>
                )}
              </View>

              {/* Description */}
              {item.description && (
                <Text style={s.description}>{item.description}</Text>
              )}

              {/* Photos */}
              {(item.beforePhotoUrl || item.afterPhotoUrl) && (
                <View style={s.photoRow}>
                  <View style={s.photoBox}>
                    <Text style={s.photoLabel}>BEFORE</Text>
                    {item.beforePhotoUrl ? (
                      <Image src={item.beforePhotoUrl} style={s.photoImg} />
                    ) : (
                      <View style={s.noPhoto}>
                        <Text style={s.noPhotoText}>No photo</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.photoBox}>
                    <Text style={s.photoLabel}>AFTER</Text>
                    {item.afterPhotoUrl ? (
                      <Image src={item.afterPhotoUrl} style={s.photoImg} />
                    ) : (
                      <View style={s.noPhoto}>
                        <Text style={s.noPhotoText}>No photo</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        ))}

        {/* Footer */}
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
