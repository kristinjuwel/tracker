"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskList, type TaskListRow } from "@/components/task-list";
import { AvatarStack } from "@/components/avatar-stack";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import TaskDetailsDialog, {
  type TaskDetails,
} from "@/components/task-details-dialog";

export function TasksBrowser({
  rows,
  parentNameMap,
  currentUserId,
  parentOptions = [],
  assigneeOptions = [],
}: {
  rows: TaskListRow[];
  parentNameMap: Record<string, { id: string; name: string }>;
  currentUserId?: string;
  parentOptions?: Array<{ id: string; name: string }>;
  assigneeOptions?: Array<{ id: string; label: string }>;
}) {
  const [view, setView] = useState<"list" | "board">("list");
  const [active, setActive] = useState<TaskDetails | null>(null);

  // Keep a local copy so we can optimistically reflect edits without a full refresh
  const [localRows, setLocalRows] = useState<TaskListRow[]>(rows);
  const [localParentNameMap, setLocalParentNameMap] = useState(parentNameMap);

  // Sync local state when props change (e.g., filters/navigation)
  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);
  useEffect(() => {
    setLocalParentNameMap(parentNameMap);
  }, [parentNameMap]);

  const composedParents = useMemo(() => {
    // Fallback parent options from parentNameMap if not provided
    if (parentOptions.length) return parentOptions;
    return Object.values(parentNameMap);
  }, [parentOptions, parentNameMap]);

  if (!localRows.length) {
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
        <TaskList
          rows={localRows}
          parentNameMap={localParentNameMap}
          currentUserId={currentUserId}
          onRowClick={(t) => {
            const details: TaskDetails = {
              id: t.id,
              name: t.name,
              description: t.description ?? null,
              status: t.status,
              priority: t.priority,
              progress: typeof t.progress === "number" ? t.progress : null,
              start_date: t.start_date ?? null,
              end_date: t.end_date ?? null,
              deadline: t.deadline ?? null,
              link: t.link ?? null,
              parent_id: t.parent_id ?? undefined,
              created_at: t.created_at,
              assignees: t.assignees ?? [],
              ...(typeof t.col_id === "string" ? { col_id: t.col_id } : {}),
            };
            setActive(details);
          }}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {localRows.map((t) => (
            <Card
              key={t.id}
              className="p-4 cursor-pointer"
              onClick={() => {
                const details: TaskDetails = {
                  id: t.id,
                  name: t.name,
                  description: t.description ?? null,
                  status: t.status,
                  priority: t.priority,
                  progress: typeof t.progress === "number" ? t.progress : null,
                  start_date: t.start_date ?? null,
                  end_date: t.end_date ?? null,
                  deadline: t.deadline ?? null,
                  link: t.link ?? null,
                  parent_id: t.parent_id ?? undefined,
                  created_at: t.created_at,
                  assignees: t.assignees ?? [],
                  ...(typeof t.col_id === "string" ? { col_id: t.col_id } : {}),
                };
                setActive(details);
              }}
            >
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
                    {t.parent_id && localParentNameMap[t.parent_id] ? (
                      <span className="text-muted-foreground">
                        Parent: {localParentNameMap[t.parent_id].name}
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
                  <div className="mt-2 items-center">
                    {(() => {
                      const list = t.assignees ?? [];
                      if (!list.length)
                        return (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        );
                      const currentIncluded = currentUserId
                        ? list.some((a) => a.id === currentUserId)
                        : false;
                      const others = currentUserId
                        ? list.filter((a) => a.id !== currentUserId)
                        : list;
                      return (
                        <div className="flex items-center gap-2">
                          {currentIncluded ? (
                            <CurrentUserAvatar className="h-6 w-6" />
                          ) : null}
                          <AvatarStack
                            avatars={others.map((a) => ({ name: a.label }))}
                            maxAvatarsAmount={4}
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TaskDetailsDialog
        open={!!active}
        onOpenChange={(v) => {
          if (!v) setActive(null);
        }}
        task={active}
        parentOptions={composedParents}
        assigneeOptions={assigneeOptions}
        onSaved={(updated) => {
          // Update local list so changes are visible immediately
          setLocalRows((prev) =>
            prev.map((x) =>
              x.id === updated.id
                ? {
                    ...x,
                    name: updated.name,
                    description: updated.description ?? undefined,
                    status: updated.status,
                    priority: updated.priority,
                    progress:
                      typeof updated.progress === "number"
                        ? updated.progress
                        : undefined,
                    start_date: updated.start_date ?? undefined,
                    end_date: updated.end_date ?? undefined,
                    deadline: updated.deadline ?? undefined,
                    link: updated.link ?? undefined,
                    parent_id: updated.parent_id ?? undefined,
                    col_id: updated.col_id ?? undefined,
                    assignees: updated.assignees ?? [],
                  }
                : x
            )
          );
          // If the edited task can be a parent for others and its name changed, update the parent map
          setLocalParentNameMap((prev) => ({
            ...prev,
            [updated.id]: { id: updated.id, name: updated.name },
          }));
          setActive(null);
        }}
        onDeleted={(id) => {
          setLocalRows((prev) => prev.filter((t) => t.id !== id));
          setActive(null);
        }}
      />
    </div>
  );
}

export default TasksBrowser;
