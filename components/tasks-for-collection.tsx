"use client";

import { useEffect, useMemo, useState } from "react";
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
import { CollectionMembers } from "@/components/collection-members";

const supabase = createClient();

type Task = {
  id: string;
  name: string;
  description?: string | null;
  status: "pending" | "in_progress" | "blocked" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  progress?: number;
  start_date?: string | null;
  end_date?: string | null;
  deadline?: string | null;
  link?: string | null;
  created_at: string;
};

// Local type for selectable assignees in this component
type AssigneeOption = {
  user_id: string;
  label: string;
};

export function TasksForCollection({
  initialTasks,
  collectionId,
  userId,
  collectionTitle,
}: {
  initialTasks: Task[];
  collectionId: string;
  userId: string;
  collectionTitle: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  // Task fields
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<Task["status"]>("pending");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [progress, setProgress] = useState(0);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [link, setLink] = useState<string>("");

  // Members & assignees (options for assignment)
  const [members, setMembers] = useState<AssigneeOption[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Load collection members (to assign tasks)
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

  const filtered = useMemo(() => {
    if (!q) return tasks;
    const s = q.toLowerCase();
    return tasks.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        (t.description ?? "").toLowerCase().includes(s)
    );
  }, [q, tasks]);

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
      created_at: new Date().toISOString(),
    };
    setTasks((s) => [optimistic, ...s]);

    // Insert task (RLS: creator must be owner/editor; created_by = auth.uid())
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
        created_by: userId,
      })
      .select(
        "id, name, description, status, priority, progress, start_date, end_date, deadline, link, created_at"
      )
      .single();

    if (error || !taskRow) {
      setTasks((s) => s.filter((t) => t.id !== optimistic.id));
      alert(error?.message || "Failed to create task");
      setSaving(false);
      return;
    }

    // Insert assignees (user_tasks)
    if (assignees.length) {
      const rows = assignees.map((uid) => ({
        task_id: taskRow.id,
        user_id: uid,
        role: "assignee" as const,
      }));
      const { error: uerr } = await supabase.from("user_tasks").insert(rows);
      if (uerr) {
        // Non-fatal; task exists. You can show a toast.
        // console.warn(uerr.message);
      }
    }

    // Replace optimistic row with real one
    setTasks((s) => [taskRow, ...s.filter((t) => t.id !== optimistic.id)]);
    setSaving(false);
    setOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Members manager */}
      <CollectionMembers collectionId={collectionId} currentUserId={userId} />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search tasks in “${collectionTitle}”…`}
          className="w-full sm:w-96"
        />
        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
          Add Task
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">No tasks yet.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((t) => (
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
                    {t.progress !== undefined ? (
                      <span className="text-muted-foreground">
                        Progress: {t.progress}%
                      </span>
                    ) : null}
                    {t.deadline ? (
                      <span className="text-muted-foreground">
                        Due {new Date(t.deadline).toLocaleDateString()}
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

      {/* Add Task dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl">
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

            <div className="sm:col-span-2 space-y-2">
              <Label>Assignees</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {members.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    No members to assign. Add members above.
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
