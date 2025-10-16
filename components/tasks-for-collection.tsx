"use client";

import { useMemo, useState } from "react";
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

type Task = {
  id: string;
  name: string;
  description: string | null;
  status: "pending" | "in_progress" | "blocked" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
};

export function TasksForCollection({
  initialTasks,
  collectionId,
  userId,
}: {
  initialTasks: Task[];
  collectionId: string;
  userId: string;
}) {
  const supabase = createClient();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!q) return tasks;
    const s = q.toLowerCase();
    return tasks.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        (t.description ?? "").toLowerCase().includes(s)
    );
  }, [q, tasks]);

  const handleCreateTask = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const optimistic: Task = {
      id: `tmp-${crypto.randomUUID()}`,
      name: name.trim(),
      description: desc.trim() || null,
      status: "pending",
      priority: "medium",
      created_at: new Date().toISOString(),
    };
    setTasks((s) => [optimistic, ...s]);

    // RLS for insert on tasks requires:
    // - public.can_edit_collection(col_id) is true (owner/editor)
    // - created_by = auth.uid()
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        col_id: collectionId,
        name: optimistic.name,
        description: optimistic.description,
        status: "pending",
        priority: "medium",
        created_by: userId,
      })
      .select("id, name, description, status, priority, created_at")
      .single();

    if (error || !data) {
      setTasks((s) => s.filter((t) => t.id !== optimistic.id));
      alert("Failed to create task");
    } else {
      setTasks((s) => [data, ...s.filter((t) => t.id !== optimistic.id)]);
    }

    setSaving(false);
    setOpen(false);
    setName("");
    setDesc("");
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tasks…"
          className="w-full sm:w-80"
        />
        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
          Add Task
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">No tasks yet.</div>
      ) : (
        <div className="divide-y rounded-xl border">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <div className="font-medium">{t.name}</div>
                {t.description ? (
                  <div className="text-sm text-muted-foreground">
                    {t.description}
                  </div>
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground sm:text-right">
                <div>Status: {t.status}</div>
                <div>Priority: {t.priority}</div>
                <div>{new Date(t.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>
              Create a task in this collection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="task-name">Name</Label>
              <Input
                id="task-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Draft brief"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description (optional)</Label>
              <Input
                id="task-desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What needs to be done?"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
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
