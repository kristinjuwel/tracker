"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskList, type TaskListRow } from "@/components/task-list";

export function TasksBrowser({
  rows,
  parentNameMap,
}: {
  rows: TaskListRow[];
  parentNameMap: Record<string, { id: string; name: string }>;
}) {
  const [view, setView] = useState<"list" | "board">("list");

  if (!rows.length) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">No tasks yet.</Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <div className="rounded border p-1 text-xs">
          <button
            className={`rounded px-2 py-1 ${view === "list" ? "bg-muted" : ""}`}
            onClick={() => setView("list")}
          >
            List
          </button>
          <button
            className={`rounded px-2 py-1 ${
              view === "board" ? "bg-muted" : ""
            }`}
            onClick={() => setView("board")}
          >
            Board
          </button>
        </div>
      </div>

      {view === "list" ? (
        <TaskList rows={rows} parentNameMap={parentNameMap} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.name}</div>
                  {t.description ? (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {t.description}
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary" className="capitalize">
                      {t.status.replaceAll("_", " ")}
                    </Badge>
                    <Badge className="capitalize">{t.priority}</Badge>
                    {typeof t.progress === "number" ? (
                      <span className="text-muted-foreground">
                        Progress: {t.progress}%
                      </span>
                    ) : null}
                    {t.deadline ? (
                      <span className="text-muted-foreground">
                        Due {new Date(t.deadline).toLocaleDateString()}
                      </span>
                    ) : null}
                    {t.parent_id && parentNameMap[t.parent_id] ? (
                      <span className="text-muted-foreground">
                        Parent: {parentNameMap[t.parent_id].name}
                      </span>
                    ) : null}
                  </div>
                  {t.link ? (
                    <a
                      href={t.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-primary hover:underline"
                    >
                      Open link
                    </a>
                  ) : null}
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default TasksBrowser;
