"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Status = "pending" | "in_progress" | "blocked" | "completed" | "archived";
type Priority = "low" | "medium" | "high" | "urgent";

export type TaskDetails = {
  id: string;
  col_id?: string;
  name: string;
  description?: string | null;
  status: Status;
  priority: Priority;
  progress?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  deadline?: string | null;
  link?: string | null;
  parent_id?: string | null;
  created_at: string;
  assignees?: { id: string; label: string }[];
};

export function TaskDetailsDialog({
  open,
  onOpenChange,
  task,
  parentOptions,
  assigneeOptions,
  onSaved,
  collections,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: TaskDetails | null;
  parentOptions: Array<{ id: string; name: string }>;
  assigneeOptions: Array<{ id: string; label: string }>;
  onSaved?: (updated: TaskDetails) => void;
  collections?: Array<{ id: string; title: string }>;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<Status>("pending");
  const [priority, setPriority] = useState<Priority>("medium");
  const [progress, setProgress] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [parentId, setParentId] = useState<string>("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [colId, setColId] = useState<string>("");
  const [parentOpts, setParentOpts] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [collectionsList, setCollectionsList] = useState<
    Array<{ id: string; title: string }>
  >([]);

  useEffect(() => {
    if (!task) return;
    setName(task.name);
    setDesc(task.description ?? "");
    setStatus(task.status);
    setPriority(task.priority);
    setProgress(typeof task.progress === "number" ? task.progress : 0);
    setStartDate(task.start_date ? isoToDateInput(task.start_date) : "");
    setEndDate(task.end_date ? isoToDateInput(task.end_date) : "");
    setDeadline(task.deadline ? isoToDateInput(task.deadline) : "");
    setLink(task.link ?? "");
    setParentId(task.parent_id ?? "");
    setAssignees((task.assignees ?? []).map((a) => a.id));
    setColId(task.col_id ?? "");
    // initialize parent options from prop initially
    setParentOpts(parentOptions);
  }, [task, parentOptions]);

  // Load accessible collections (owned + member) if not provided
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (collections && collections.length) {
        if (!cancelled) setCollectionsList(collections);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const map = new Map<string, { id: string; title: string }>();
      type CollectionRow = { id: string; title: string };
      type UserCollectionRow = { col_id: string };

      const owned = await supabase
        .from("collections")
        .select("id, title")
        .eq("created_by", user.id)
        .limit(200);
      ((owned.data ?? []) as CollectionRow[]).forEach((r) =>
        map.set(r.id, { id: r.id, title: r.title })
      );

      const member = await supabase
        .from("user_collections")
        .select("col_id")
        .eq("user_id", user.id)
        .limit(400);
      const memberRows = (member.data ?? []) as UserCollectionRow[];
      const ids = Array.from(
        new Set(memberRows.map((r) => r.col_id).filter(Boolean))
      )
        .filter((id): id is string => typeof id === "string")
        .filter((id) => !map.has(id));
      if (ids.length) {
        const details = await supabase
          .from("collections")
          .select("id, title")
          .in("id", ids);
        ((details.data ?? []) as CollectionRow[]).forEach((r) =>
          map.set(r.id, { id: r.id, title: r.title })
        );
      }
      if (!cancelled) setCollectionsList(Array.from(map.values()));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [collections, supabase]);

  function isoToDateInput(v: string) {
    // Return yyyy-mm-dd portion
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(v);
    return m ? m[1] : new Date(v).toISOString().slice(0, 10);
  }

  async function handleSave() {
    if (!task) return;
    setSaving(true);

    const updateBody = {
      name: name.trim(),
      description: desc.trim() || null,
      status,
      priority,
      progress,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      end_date: endDate ? new Date(endDate).toISOString() : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      link: link || null,
      parent_task_id: parentId || null,
    } as const;

    const { error: updErr } = await supabase
      .from("tasks")
      .update({ ...updateBody, col_id: colId || null })
      .eq("id", task.id);

    if (updErr) {
      alert(updErr.message);
      setSaving(false);
      return;
    }

    // Update assignees in user_tasks (diff update)
    const desired = new Set(assignees);
    // Fetch existing
    type UserTaskRow = { user_id: string };
    const { data: existingRaw } = await supabase
      .from("user_tasks")
      .select("user_id")
      .eq("task_id", task.id);
    const existing: UserTaskRow[] = (existingRaw ?? []) as UserTaskRow[];
    const existingIds = new Set<string>(existing.map((r) => r.user_id));

    const toAdd = Array.from(desired).filter((id) => !existingIds.has(id));
    const toRemove = Array.from(existingIds).filter((id) => !desired.has(id));

    if (toRemove.length) {
      await supabase
        .from("user_tasks")
        .delete()
        .eq("task_id", task.id)
        .in("user_id", toRemove);
    }
    if (toAdd.length) {
      await supabase.from("user_tasks").insert(
        toAdd.map((uid) => ({
          task_id: task.id,
          user_id: uid,
          role: "assignee" as const,
        }))
      );
    }

    const updated: TaskDetails = {
      ...task,
      name: updateBody.name,
      description: updateBody.description,
      status: updateBody.status,
      priority: updateBody.priority,
      progress: updateBody.progress,
      start_date: updateBody.start_date,
      end_date: updateBody.end_date,
      deadline: updateBody.deadline,
      link: updateBody.link,
      parent_id: updateBody.parent_task_id ?? undefined,
      col_id: colId || undefined,
      assignees: assignees.map((id) => {
        const found = assigneeOptions.find((o) => o.id === id);
        return found ? { id: found.id, label: found.label } : { id, label: id };
      }),
    };

    onSaved?.(updated);
    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-full md:h-5/6 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details and assignees.
          </DialogDescription>
        </DialogHeader>

        {!task ? null : (
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Collection selection (optional) */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="collection">Collection</Label>
              <select
                id="collection"
                value={colId}
                onChange={async (e) => {
                  const v = e.target.value;
                  setColId(v);
                  // Clear parent when changing collection
                  setParentId("");
                  if (!v) {
                    setParentOpts([]);
                    return;
                  }
                  const { data } = await supabase
                    .from("tasks")
                    .select("id, name")
                    .eq("col_id", v)
                    .order("created_at", { ascending: false })
                    .limit(500);
                  setParentOpts(
                    (data ?? []) as Array<{ id: string; name: string }>
                  );
                }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">— None —</option>
                {collectionsList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Move this task to a collection or keep it personal.
              </p>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="task-name">Name</Label>
              <Input
                id="task-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="task-desc">Description</Label>
              <textarea
                id="task-desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="min-h-[84px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
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
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
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
              <Label htmlFor="link">Link</Label>
              <Input
                id="link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
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
              <Label htmlFor="parent">Parent task</Label>
              <select
                id="parent"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                disabled={!colId}
              >
                <option value="">— None —</option>
                {parentOpts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Assignees</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {assigneeOptions.map((opt) => {
                  const checked = assignees.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className="flex cursor-pointer items-center gap-2 rounded border p-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setAssignees((prev) =>
                            e.target.checked
                              ? [...prev, opt.id]
                              : prev.filter((id) => id !== opt.id)
                          );
                        }}
                      />
                      <span className="truncate">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default TaskDetailsDialog;
