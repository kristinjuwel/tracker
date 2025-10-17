"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Status = "pending" | "in_progress" | "blocked" | "completed" | "archived";
type Priority = "low" | "medium" | "high" | "urgent";

export function AddTaskAnywhere({
  collections,
  assigneeOptions,
  currentUserId,
  className,
}: {
  collections: Array<{ id: string; title: string }>;
  assigneeOptions: Array<{ id: string; label: string }>;
  currentUserId: string;
  className?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [colId, setColId] = useState<string>(""); // empty string means no collection
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

  const [parentOptions, setParentOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    // Reset parent choices when collection changes
    setParentId("");
    if (!colId) {
      setParentOptions([]);
      return;
    }
    const loadParents = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, name")
        .eq("col_id", colId)
        .order("created_at", { ascending: false })
        .limit(500);
      const rows = (data ?? []) as Array<{ id: string; name: string }>;
      setParentOptions(rows);
    };
    void loadParents();
  }, [colId, supabase]);

  const resetForm = () => {
    setColId("");
    setName("");
    setDesc("");
    setStatus("pending");
    setPriority("medium");
    setProgress(0);
    setStartDate("");
    setEndDate("");
    setDeadline("");
    setLink("");
    setParentId("");
    setAssignees([]);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const payload = {
      col_id: colId || null,
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
      created_by: currentUserId,
    } as const;

    const { data: inserted, error } = await supabase
      .from("tasks")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    if (inserted?.id && assignees.length) {
      await supabase
        .from("user_tasks")
        .insert(
          assignees.map((uid) => ({
            task_id: inserted.id,
            user_id: uid,
            role: "assignee" as const,
          }))
        );
    }

    setSaving(false);
    setOpen(false);
    resetForm();
    router.refresh();
  };

  return (
    <div className={className}>
      <Button onClick={() => setOpen(true)}>Add Task</Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-full md:h-5/6 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>
              Create a task in a collection or keep it personal.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="collection">Collection</Label>
              <select
                id="collection"
                value={colId}
                onChange={(e) => setColId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">— None —</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

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
                onChange={(e) => setStatus(e.target.value as Status)}
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
                onChange={(e) => setPriority(e.target.value as Priority)}
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
                disabled={!colId}
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
                {assigneeOptions.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    No available members to assign.
                  </div>
                ) : (
                  assigneeOptions.map((opt) => {
                    const checked = assignees.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className="flex cursor-pointer items-center gap-2 rounded border p-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setAssignees((prev) =>
                              checked
                                ? prev.filter((id) => id !== opt.id)
                                : [...prev, opt.id]
                            );
                          }}
                        />
                        <span className="truncate">{opt.label}</span>
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
              onClick={handleCreate}
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

export default AddTaskAnywhere;
