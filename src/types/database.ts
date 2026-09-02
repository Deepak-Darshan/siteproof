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
