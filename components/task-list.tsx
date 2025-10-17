"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AvatarStack } from "@/components/avatar-stack";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import RemindModal from "@/components/remind-modal";
import { toast } from "sonner";

// Format a date string as dd/mm/yyyy. Handles ISO strings safely.
function formatDateDMY(input?: string | null): string {
  if (!input) return "—";
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

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
  col_id?: string | null;
  assignees?: { id: string; label: string }[];
};

export function TaskList({
  rows,
  parentNameMap,
  currentUserId,
  onRowClick,
}: {
  rows: TaskListRow[];
  parentNameMap: Record<string, { id: string; name: string }>;
  currentUserId?: string;
  onRowClick?: (task: TaskListRow) => void;
}) {
  const items = useMemo(() => rows, [rows]);
  const [nextReminders, setNextReminders] = useState<
    Record<string, { id: string; due_at: string }>
  >({});

  useEffect(() => {
    const ids = items.map((t) => t.id);
    if (!ids.length) return;
    let cancelled = false;
    async function load() {
      const url = new URL("/api/tasks/reminders/next", window.location.origin);
      url.searchParams.set("task_ids", ids.join(","));
      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = (await res.json()) as Record<
        string,
        { id: string; task_id: string; due_at: string }
      >;
      if (!cancelled) {
        const map: Record<string, { id: string; due_at: string }> = {};
        for (const [taskId, r] of Object.entries(data ?? {})) {
          map[taskId] = { id: r.id, due_at: r.due_at };
        }
        setNextReminders(map);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [items]);

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
            <th className="px-3 py-2">Next reminder</th>
            <th className="px-3 py-2 text-center">Remind</th>
            <th className="px-3 py-2 text-right">Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr
              key={t.id}
              className={`border-t ${
                onRowClick ? "cursor-pointer hover:bg-muted/40" : ""
              }`}
              onClick={() => onRowClick?.(t)}
            >
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
                  <div className="flex items-center gap-2">
                    {/* Current user avatar shown first if part of assignees */}
                    {currentUserId &&
                    t.assignees.some((a) => a.id === currentUserId) ? (
                      <CurrentUserAvatar className="h-6 w-6" />
                    ) : null}
                    <AvatarStack
                      avatars={t.assignees
                        .filter((a) => a.id !== currentUserId)
                        .map((a) => ({ name: a.label }))}
                      maxAvatarsAmount={4}
                    />
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
                {t.deadline ? formatDateDMY(t.deadline) : "—"}
              </td>
              <td className="px-3 py-2 text-center">
                {nextReminders[t.id] ? (
                  <Badge variant="secondary">
                    {new Date(nextReminders[t.id].due_at).toLocaleString()}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-center">
                <QuickRemindCell task={t} />
              </td>
              <td className="px-3 py-2 text-right text-muted-foreground">
                {formatDateDMY(t.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuickRemindCell({ task }: { task: TaskListRow }) {
  const [open, setOpen] = useState(false);
  const assignees = task.assignees ?? [];
  const deadline = task.deadline ? new Date(task.deadline) : null;

  function buildDueISO(daysBefore: number, hour = 9, minute = 0) {
    if (!deadline) return null;
    const d = new Date(deadline);
    d.setDate(d.getDate() - daysBefore);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  }

  async function createQuick(daysBefore: number, recipients?: string[]) {
    const dueISO = buildDueISO(daysBefore);
    if (!dueISO) {
      toast.error("No deadline set");
      return;
    }
    const res = await fetch("/api/tasks/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: task.id,
        due_at: dueISO,
        details: `Reminder for ${task.name}`,
        recipient_user_ids:
          recipients && recipients.length ? recipients : undefined,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j?.error || "Failed to add reminder");
    } else {
      toast.success("Reminder added");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline">
            Set
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Quick reminder</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => void createQuick(0)}
            disabled={!deadline}
          >
            On deadline (9:00 AM)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void createQuick(2)}
            disabled={!deadline}
          >
            2 days before (9:00 AM)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void createQuick(5)}
            disabled={!deadline}
          >
            5 days before (9:00 AM)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {assignees.length ? (
            <>
              <DropdownMenuLabel className="text-xs">
                Only notify…
              </DropdownMenuLabel>
              {assignees.map((a) => (
                <DropdownMenuItem
                  key={a.id}
                  onClick={() => void createQuick(0, [a.id])}
                  disabled={!deadline}
                >
                  {a.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem onClick={() => setOpen(true)}>
            More options…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RemindModal
        open={open}
        onOpenChange={setOpen}
        taskId={task.id}
        taskName={task.name}
        deadline={task.deadline ?? null}
        assignees={assignees}
      />
    </>
  );
}
