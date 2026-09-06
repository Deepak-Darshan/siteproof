export type Profile = {
  id: string;
  full_name: string;
  company: string | null;
  role: "gc" | "sub";
  created_at: string;
};

export type Project = {
  id: string;
  name: string;
  address: string | null;
  status: "active" | "completed" | "archived";
  owner_id: string;
  created_at: string;
};

export type ProjectMember = {
  project_id: string;
  user_id: string;
  role: "admin" | "member";
  invited_at: string;
};

export type Blueprint = {
  id: string;
  project_id: string;
  label: string;
  file_path: string;
  width: number;
  height: number;
  created_at: string;
};

export type PunchItemSeverity = "critical" | "major" | "minor";
export type PunchItemTrade =
  | "electrical"
  | "plumbing"
  | "carpentry"
  | "painting"
  | "tiling"
  | "hvac"
  | "structural"
  | "other";
export type PunchItemStatus = "open" | "in_review" | "resolved";

export type PunchItem = {
  id: string;
  project_id: string;
  blueprint_id: string | null;
  title: string;
  description: string | null;
  severity: PunchItemSeverity;
  trade: PunchItemTrade;
  status: PunchItemStatus;
  pin_x: number | null;
  pin_y: number | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
};

export type PhotoType = "before" | "after";

export type Photo = {
  id: string;
  item_id: string;
  type: PhotoType;
  file_path: string;
  taken_at: string;
  lat: number | null;
  lng: number | null;
  uploaded_by: string;
  created_at: string;
};

export type ActivityAction =
  | "item_created"
  | "photo_added"
  | "status_changed"
  | "item_resolved"
  | "item_reopened";

export type ActivityLog = {
  id: string;
  project_id: string;
  item_id: string | null;
  user_id: string;
  action: ActivityAction;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ProjectInvite = {
  id: string;
  project_id: string;
  invited_by: string;
  email: string;
  role: "admin" | "member";
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};
