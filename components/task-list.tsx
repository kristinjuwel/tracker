"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type TaskListRow = {
  id: string;
  name: string;
  description?: string | null;
  status: "pending" | "in_progress" | "blocked" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  progress?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  deadline?: string | null;
  link?: string | null;
  created_at: string;
  parent_id?: string | null;
  assignees?: { id: string; label: string }[];
};

export function TaskList({
  rows,
  parentNameMap,
}: {
  rows: TaskListRow[];
  parentNameMap: Record<string, { id: string; name: string }>;
}) {
  const items = useMemo(() => rows, [rows]);

  if (!items.length) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">No tasks yet.</Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded border">
      <table className="min-w-[800px] w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-left">Task</th>
            <th className="px-3 py-2 text-left">Parent</th>
            <th className="px-3 py-2 text-left">Assignees</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Priority</th>
            <th className="px-3 py-2">Progress</th>
            <th className="px-3 py-2">Due</th>
            <th className="px-3 py-2 text-right">Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="px-3 py-2 align-top">
                <div className="font-medium truncate max-w-[320px]">
                  {t.name}
                </div>
                {t.description ? (
                  <div className="text-muted-foreground line-clamp-2 max-w-[420px]">
                    {t.description}
                  </div>
                ) : null}
                {t.link ? (
                  <a
                    href={t.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    Open link
                  </a>
                ) : null}
              </td>
              <td className="px-3 py-2 align-top text-muted-foreground">
                {t.parent_id && parentNameMap[t.parent_id]
                  ? parentNameMap[t.parent_id].name
                  : "—"}
              </td>
              <td className="px-3 py-2 align-top">
                {t.assignees && t.assignees.length ? (
                  <div className="flex flex-wrap gap-1">
                    {t.assignees.map((a) => (
                      <span
                        key={a.id}
                        className="rounded bg-muted px-2 py-0.5 text-xs"
                      >
                        {a.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-center">
                <Badge variant="secondary" className="capitalize">
                  {t.status.replaceAll("_", " ")}
                </Badge>
              </td>
              <td className="px-3 py-2 text-center">
                <Badge className="capitalize">{t.priority}</Badge>
              </td>
              <td className="px-3 py-2 text-center text-muted-foreground">
                {typeof t.progress === "number" ? `${t.progress}%` : "—"}
              </td>
              <td className="px-3 py-2 text-center text-muted-foreground">
                {t.deadline ? new Date(t.deadline).toLocaleDateString() : "—"}
              </td>
              <td className="px-3 py-2 text-right text-muted-foreground">
                {new Date(t.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
