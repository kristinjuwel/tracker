"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function RemindModal({
  open,
  onOpenChange,
  taskId,
  taskName,
  deadline,
  assignees,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taskId: string;
  taskName: string;
  deadline: string | null;
  assignees: { id: string; label: string }[];
}) {
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("09:00");
  const [note, setNote] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const deadlineDate = useMemo(
    () => (deadline ? new Date(deadline) : null),
    [deadline]
  );

  function buildDueISO(d: Date) {
    return new Date(d).toISOString();
  }

  function applyPreset(daysBefore: number) {
    if (!deadlineDate) return;
    const d = new Date(deadlineDate);
    d.setDate(d.getDate() - daysBefore);
    const [hh, mm] = (time || "09:00").split(":");
    d.setHours(parseInt(hh || "9", 10), parseInt(mm || "0", 10), 0, 0);
    setDate(d.toISOString().slice(0, 10));
  }

  async function addReminder(custom?: boolean) {
    try {
      setSaving(true);
      let dueISO: string | null = null;
      if (custom) {
        if (!date) {
          toast.error("Pick a date");
          return;
        }
        const [hh, mm] = (time || "09:00").split(":");
        const when = new Date(
          `${date}T${(hh || "09").padStart(2, "0")}:${(mm || "00").padStart(
            2,
            "0"
          )}:00`
        );
        dueISO = buildDueISO(when);
      } else if (deadlineDate) {
        // default to on deadline using chosen time
        const [hh, mm] = (time || "09:00").split(":");
        const when = new Date(deadlineDate);
        when.setHours(parseInt(hh || "9", 10), parseInt(mm || "0", 10), 0, 0);
        dueISO = buildDueISO(when);
      }
      if (!dueISO) {
        toast.error("No due date computed");
        return;
      }
      const res = await fetch("/api/tasks/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          due_at: dueISO,
          details: note || null,
          recipient_user_ids: selected.length ? selected : undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error || "Failed to add reminder");
      } else {
        toast.success("Reminder added");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Remind for “{taskName}”</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!deadlineDate}
              onClick={() => applyPreset(0)}
            >
              On deadline
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!deadlineDate}
              onClick={() => applyPreset(2)}
            >
              2 days before
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!deadlineDate}
              onClick={() => applyPreset(5)}
            >
              5 days before
            </Button>
          </div>

          <div className="grid gap-2 grid-cols-2">
            <div>
              <Label htmlFor="r-date">Date</Label>
              <Input
                id="r-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="r-time">Time</Label>
              <Input
                id="r-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="r-note">Note</Label>
              <Input
                id="r-note"
                placeholder="Optional note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs">Notify assignees</Label>
            <div className="grid gap-2 grid-cols-2">
              {assignees.map((a) => {
                const checked = selected.includes(a.id);
                return (
                  <label key={a.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, a.id]
                            : prev.filter((x) => x !== a.id)
                        )
                      }
                    />
                    <span className="truncate">{a.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              If none selected, all assignees will be emailed. If none, the
              creator will be notified.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Close
            </Button>
            <Button onClick={() => void addReminder(true)} disabled={saving}>
              Add reminder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RemindModal;
