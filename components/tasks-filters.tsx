"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function Filters({
  collections,
  current,
}: {
  collections: { id: string; title: string }[];
  current: {
    q: string;
    status:
      | ""
      | "pending"
      | "in_progress"
      | "blocked"
      | "completed"
      | "archived";
    priority: "" | "low" | "medium" | "high" | "urgent";
    assignee: string;
    from: string;
    to: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const apply = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(sp?.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (!v) params.delete(k);
      else params.set(k, v);
    });
    router.replace(`${pathname}?${params.toString()}`);
  };

  const clearAll = () => router.replace(pathname);

  const statuses = useMemo(
    () => [
      { v: "", l: "Any" },
      { v: "pending", l: "Pending" },
      { v: "in_progress", l: "In progress" },
      { v: "blocked", l: "Blocked" },
      { v: "completed", l: "Completed" },
      { v: "archived", l: "Archived" },
    ],
    []
  );

  const priorities = useMemo(
    () => [
      { v: "", l: "Any" },
      { v: "low", l: "Low" },
      { v: "medium", l: "Medium" },
      { v: "high", l: "High" },
      { v: "urgent", l: "Urgent" },
    ],
    []
  );

  return (
    <div className="grid gap-3 rounded border p-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
      <div className="sm:col-span-2">
        <Input
          placeholder="Search tasks…"
          defaultValue={current.q}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              apply({ q: (e.target as HTMLInputElement).value || undefined });
          }}
        />
      </div>

      <div className="space-y-1">
        <Label>Status</Label>
        <select
          className="w-full rounded border bg-background px-2 py-1 text-sm"
          defaultValue={current.status}
          onChange={(e) => apply({ status: e.target.value || undefined })}
        >
          {statuses.map((s) => (
            <option key={s.v} value={s.v}>
              {s.l}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label>Priority</Label>
        <select
          className="w-full rounded border bg-background px-2 py-1 text-sm"
          defaultValue={current.priority}
          onChange={(e) => apply({ priority: e.target.value || undefined })}
        >
          {priorities.map((p) => (
            <option key={p.v} value={p.v}>
              {p.l}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label>From</Label>
        <Input
          type="date"
          defaultValue={current.from}
          onChange={(e) => apply({ from: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-1">
        <Label>To</Label>
        <Input
          type="date"
          defaultValue={current.to}
          onChange={(e) => apply({ to: e.target.value || undefined })}
        />
      </div>

      {/* Assignee filter (free text user_id for now, can swap to select if you pass options) */}
      <div className="space-y-1 sm:col-span-2 md:col-span-1">
        <Label>Assignee (user id)</Label>
        <Input
          placeholder="uuid…"
          defaultValue={current.assignee}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              apply({
                assignee: (e.target as HTMLInputElement).value || undefined,
              });
          }}
        />
      </div>

      {/* Collection filter optional: uncomment to expose */}

      <div className="space-y-1 sm:col-span-2">
        <Label>Collection</Label>
        <select
          className="w-full rounded border bg-background px-2 py-1 text-sm"
          defaultValue={sp.get("collection") ?? ""}
          onChange={(e) => apply({ collection: e.target.value || undefined })}
        >
          <option value="">Any</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2 flex items-end justify-end gap-2">
        <Button variant="outline" onClick={clearAll}>
          Clear
        </Button>
        <Button onClick={() => apply({ q: sp.get("q") ?? undefined })}>
          Apply
        </Button>
      </div>
    </div>
  );
}
