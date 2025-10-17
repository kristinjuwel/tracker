"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskList } from "@/components/task-list";
import { AvatarStack } from "@/components/avatar-stack";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import TaskDetailsDialog, {
  type TaskDetails,
} from "@/components/task-details-dialog";

const supabase = createClient();

type Task = {
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
  parent_id?: string | null;
  created_at: string;
};

type AssigneeOption = {
  user_id: string;
  label: string;
};

export function TasksForCollection({
  initialTasks,
  collectionId,
  userId,
  initialParentNameMap,
}: {
  initialTasks: Task[];
  collectionId: string;
  userId: string;
  initialParentNameMap?: Record<string, { id: string; name: string }>;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const qs = useSearchParams();
  const q = (qs.get("q") ?? "").trim();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"board" | "list">("list"); // default to list

  // Task form fields
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<Task["status"]>("pending");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [progress, setProgress] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [parentId, setParentId] = useState<string>("");

  // Members & assignees
  const [members, setMembers] = useState<AssigneeOption[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<TaskDetails | null>(null);

  // Map for parent task names (used in list view)
  const [parentNameMap, setParentNameMap] = useState<
    Record<string, { id: string; name: string }>
  >(initialParentNameMap ?? {});

  // Cache assignees for all tasks (used for search and display)
  const [assigneesCache, setAssigneesCache] = useState<
    Record<string, { id: string; label: string }[]>
  >({});

  // Load assignees for ALL tasks on mount/update (for search functionality)
  useEffect(() => {
    const loadAllAssignees = async () => {
      if (!tasks.length) return;
      const ids = tasks.map((t) => t.id);
      type UserTaskRow = { task_id: string; user_id: string };
      const { data: utRaw = [] } = await supabase
        .from("user_tasks")
        .select("task_id, user_id")
        .in("task_id", ids);

      const ut: UserTaskRow[] = (utRaw ?? []) as UserTaskRow[];
      const uniqueUserIds = Array.from(new Set(ut.map((r) => r.user_id)));
      const labelMap: Record<string, string> = {};

      if (uniqueUserIds.length) {
        type ProfileRow = {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        };
        const res = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", uniqueUserIds);
        for (const p of (res.data ?? []) as ProfileRow[]) {
          const label =
            p.first_name || p.last_name
              ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
              : p.email ?? p.id;
          labelMap[p.id] = label;
        }
      }

      const utByTask = new Map<string, { id: string; label: string }[]>();
      ut.forEach((row) => {
        const arr = utByTask.get(row.task_id) ?? [];
        arr.push({
          id: row.user_id,
          label: labelMap[row.user_id] ?? row.user_id,
        });
        utByTask.set(row.task_id, arr);
      });

      setAssigneesCache(Object.fromEntries(Array.from(utByTask.entries())));
    };
    void loadAllAssignees();
  }, [tasks]);

  // Load members to assign tasks
  useEffect(() => {
    const loadMembers = async () => {
      const { data: uc = [] } = await supabase
        .from("user_collections")
        .select("user_id")
        .eq("col_id", collectionId);

      const ids = (uc as Array<{ user_id: string }>).map((r) => r.user_id);
      if (!ids.length) {
        setMembers([]);
        return;
      }

      const res = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", ids);

      const m = (
        (res.data ?? []) as Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        }>
      ).map((p) => ({
        user_id: p.id,
        label:
          p.first_name || p.last_name
            ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
            : p.email ?? p.id,
      }));
      setMembers(m);
    };
    void loadMembers();
  }, [collectionId]);

  // Option list of potential parents (only tasks in same collection)
  const parentOptions = useMemo(() => {
    return tasks.map((t) => ({ id: t.id, name: t.name }));
  }, [tasks]);

  const assigneeOptionsForDialog = useMemo(
    () => members.map((m) => ({ id: m.user_id, label: m.label })),
    [members]
  );

  const filtered = useMemo(() => {
    if (!q) return tasks;
    const term = q.toLowerCase();

    // Date formatter mirroring display (dd/mm/yyyy)
    const toDMY = (input?: string | null) => {
      if (!input) return "";
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
      if (m) return `${m[3]}/${m[2]}/${m[1]}`;
      const d = new Date(input);
      if (isNaN(d.getTime())) return "";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const norm = (v?: string | null) => (v ?? "").toString().toLowerCase();

    return tasks.filter((t) => {
      const parentName =
        t.parent_id && initialParentNameMap?.[t.parent_id]
          ? initialParentNameMap[t.parent_id].name
          : "";
      const assigneeNames = (assigneesCache[t.id] ?? [])
        .map((a) => a.label)
        .join(" ");
      const statusReadable = t.status.replaceAll("_", " ");
      const progressStr =
        typeof t.progress === "number" ? `${t.progress}%` : "";
      const deadlineStr = toDMY(t.deadline);
      const createdStr = toDMY(t.created_at);
      const startStr = toDMY(t.start_date);
      const endStr = toDMY(t.end_date);

      const haystack = [
        norm(t.name),
        norm(t.description),
        norm(t.link),
        norm(parentName),
        norm(assigneeNames),
        norm(t.priority),
        norm(t.status),
        norm(statusReadable),
        norm(progressStr),
        norm(deadlineStr),
        norm(createdStr),
        norm(startStr),
        norm(endStr),
      ].join(" ");

      return haystack.includes(term);
    });
  }, [q, tasks, initialParentNameMap, assigneesCache]);
  const resetForm = () => {
    setName("");
    setDesc("");
    setStatus("pending");
    setPriority("medium");
    setProgress(0);
    setStartDate("");
    setEndDate("");
    setDeadline("");
    setLink("");
    setAssignees([]);
    setParentId("");
  };

  const handleCreateTask = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const optimistic: Task = {
      id: `tmp-${crypto.randomUUID()}`,
      name: name.trim(),
      description: desc.trim() || null,
      status,
      priority,
      progress,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      end_date: endDate ? new Date(endDate).toISOString() : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      link: link || null,
      parent_id: parentId || null,
      created_at: new Date().toISOString(),
    };
    setTasks((s) => [optimistic, ...s]);

    // Insert task (RLS assumes created_by must be auth.uid())
    const { data: taskRow, error } = await supabase
      .from("tasks")
      .insert({
        col_id: collectionId,
        name: optimistic.name,
        description: optimistic.description,
        status: optimistic.status,
        priority: optimistic.priority,
        progress: optimistic.progress,
        start_date: optimistic.start_date,
        end_date: optimistic.end_date,
        deadline: optimistic.deadline,
        link: optimistic.link,
        parent_task_id: optimistic.parent_id,
        created_by: userId,
      })
      .select(
        "id, name, description, status, priority, progress, start_date, end_date, deadline, link, parent_id:parent_task_id, created_at"
      )
      .single();

    if (error || !taskRow) {
      setTasks((s) => s.filter((t) => t.id !== optimistic.id));
      alert(error?.message || "Failed to create task");
      setSaving(false);
      return;
    }

    // If parent chosen, ensure parent name map has it
    if (taskRow.parent_id && !parentNameMap[taskRow.parent_id]) {
      const parent = tasks.find((t) => t.id === taskRow.parent_id);
      if (parent)
        setParentNameMap((m) => ({
          ...m,
          [parent.id]: { id: parent.id, name: parent.name },
        }));
    }

    // Insert assignees
    if (assignees.length) {
      const rows = assignees.map((uid) => ({
        task_id: taskRow.id,
        user_id: uid,
        role: "assignee" as const,
      }));
      const { error: uerr } = await supabase.from("user_tasks").insert(rows);
      if (uerr) {
      }
    }

    setTasks((s) => [
      taskRow as Task,
      ...s.filter((t) => t.id !== optimistic.id),
    ]);
    setSaving(false);
    setOpen(false);
    resetForm();
  };

  // Prepare data for list view with assignees aggregated from cache
  const listRows = useMemo(() => {
    return filtered.map((t) => ({
      ...t,
      assignees: assigneesCache[t.id] ?? [],
    }));
  }, [filtered, assigneesCache]);

  const composedListRows = listRows;

  return (
    <div className="space-y-6">
      {/* Toolbar: view toggle (search handled by page-level Filters) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-2">
          <div className="hidden sm:flex rounded border p-1 text-xs">
            <button
              className={`rounded px-2 py-1 ${
                view === "list" ? "bg-muted" : ""
              }`}
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
        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
          Add Task
        </Button>
      </div>

      {/* View switcher */}
      {view === "list" ? (
        <TaskList
          rows={composedListRows}
          parentNameMap={parentNameMap}
          currentUserId={userId}
          onRowClick={(t) =>
            setActive({
              ...t,
              assignees: assigneesCache[t.id] ?? [],
            })
          }
        />
      ) : // Simple board-style cards (existing minimal version)
      filtered.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">No tasks yet.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((t) => (
            <Card
              key={t.id}
              className="p-4 cursor-pointer"
              onClick={() =>
                setActive({
                  ...t,
                  assignees: assigneesCache[t.id] ?? [],
                })
              }
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
                    {t.parent_id && parentNameMap[t.parent_id] ? (
                      <span className="text-muted-foreground">
                        Parent: {parentNameMap[t.parent_id].name}
                      </span>
                    ) : null}
                  </div>
                  {/* Assignees avatars */}

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
                      const assignees = assigneesCache[t.id] ?? [];
                      if (!assignees.length)
                        return (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        );
                      const currentIncluded = assignees.some(
                        (a) => a.id === userId
                      );
                      const others = assignees.filter((a) => a.id !== userId);
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
        parentOptions={parentOptions}
        assigneeOptions={assigneeOptionsForDialog}
        onSaved={(updated) => {
          // Update tasks list
          setTasks((prev) =>
            prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x))
          );
          // Update parent name map if needed
          if (updated.parent_id && !parentNameMap[updated.parent_id]) {
            const parent = tasks.find((t) => t.id === updated.parent_id);
            if (parent) {
              setParentNameMap((m) => ({
                ...m,
                [parent.id]: { id: parent.id, name: parent.name },
              }));
            }
          }
          // Update cached assignees for this task
          setAssigneesCache((prev) => ({
            ...prev,
            [updated.id]: updated.assignees ?? [],
          }));
          setActive(null);
        }}
      />

      {/* Add Task dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-60 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>
              Create a task in this collection.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="task-name">Name</Label>
              <Input
                id="task-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Draft brief"
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="task-desc">Description</Label>
              <textarea
                id="task-desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What needs to be done?"
                className="min-h-[84px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as Task["priority"])
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="progress">Progress</Label>
              <input
                id="progress"
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value, 10))}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">{progress}%</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Link (optional)</Label>
              <Input
                id="link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start">Start date</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end">End date</Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">Parent task (optional)</Label>
              <select
                id="parent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">— None —</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>Assignees</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {members.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    No members to assign. Use the Members button to invite
                    people.
                  </div>
                ) : (
                  members.map((m) => {
                    const checked = assignees.includes(m.user_id);
                    return (
                      <label
                        key={m.user_id}
                        className="flex cursor-pointer items-center gap-2 rounded border p-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setAssignees((prev) =>
                              checked
                                ? prev.filter((id) => id !== m.user_id)
                                : [...prev, m.user_id]
                            );
                          }}
                        />
                        <span className="truncate">{m.label}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={saving || !name.trim()}
              className="w-full sm:w-auto"
            >
              {saving ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
