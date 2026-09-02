"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import type { Project } from "@/types/database";

const STATUS_LABEL: Record<Project["status"], string> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

const STATUS_STYLE: Record<Project["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-blue-50 text-blue-700",
  archived: "bg-zinc-100 text-zinc-500",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ProjectsList({ projects }: { projects: Project[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-900">Projects</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
          aria-label="Create new project"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" />
            </svg>
          </div>
          <p className="text-zinc-900 font-medium">No projects yet</p>
          <p className="text-zinc-500 text-sm max-w-xs">
            Create your first project to start tracking punch items and photos.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-2 h-10 px-5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            Create project
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/dashboard/projects/${project.id}`}
                className="block bg-white rounded-xl border border-zinc-200 p-4 hover:border-zinc-300 hover:shadow-sm transition-all active:bg-zinc-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 truncate">
                      {project.name}
                    </p>
                    {project.address && (
                      <p className="text-sm text-zinc-500 mt-0.5 truncate">
                        {project.address}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[project.status]}`}
                  >
                    {STATUS_LABEL[project.status]}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-3">
                  Created {formatDate(project.created_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
