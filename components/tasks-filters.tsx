"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CollectionOpt = { id: string; title: string };
type AssigneeOpt = { id: string; label: string };

export type FiltersProps = {
  collections: CollectionOpt[];
  assignees: AssigneeOpt[];
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
    assigneeId: string; // user id or "" for any
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
  };
  showCollection?: boolean; // when false, hide collection picker and ignore 'collection' param
};

export function Filters({
  collections,
  assignees,
  current,
  showCollection = true,
}: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const qs = useSearchParams();

  // Sentinels for "no filter" (Select cannot use empty values well)
  const ANY = "__ANY__";
  const ALL = "__ALL__";

  // Local UI state (Apply commits to URL)
  const [q, setQ] = useState(current.q);
  const [status, setStatus] = useState<string>(current.status || ANY);
  const [priority, setPriority] = useState<string>(current.priority || ANY);
  const [assigneeId, setAssigneeId] = useState<string>(
    current.assigneeId || ANY
  );
  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);
  const [collection, setCollection] = useState<string>(
    qs.get("collection") ?? ALL
  );
  // UI: show/hide advanced filters rendered at the bottom
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    setQ(current.q);
    setStatus(current.status || ANY);
    setPriority(current.priority || ANY);
    setAssigneeId(current.assigneeId || ANY);
    setFrom(current.from);
    setTo(current.to);
    if (showCollection) {
      setCollection(qs.get("collection") ?? ALL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  const collectionOptions = useMemo<CollectionOpt[]>(
    () => [{ id: ALL, title: "All collections" }, ...collections],
    [collections]
  );

  const updateURL = useCallback(
    (params: {
      q?: string;
      status?: string;
      priority?: string;
      assigneeId?: string;
      from?: string;
      to?: string;
      collection?: string;
    }) => {
      const next = new URLSearchParams(qs.toString());
      const set = (key: string, val: string) => {
        if (val) next.set(key, val);
        else next.delete(key);
      };

      set("q", (params.q ?? q).trim());

      const currentStatus = params.status ?? status;
      if (currentStatus === ANY) next.delete("status");
      else set("status", currentStatus);

      const currentPriority = params.priority ?? priority;
      if (currentPriority === ANY) next.delete("priority");
      else set("priority", currentPriority);

      const currentAssignee = params.assigneeId ?? assigneeId;
      if (currentAssignee === ANY) next.delete("assignee");
      else set("assignee", currentAssignee);
      set("from", params.from ?? from);
      set("to", params.to ?? to);

      if (showCollection) {
        const currentCollection = params.collection ?? collection;
        if (currentCollection === ALL) next.delete("collection");
        else set("collection", currentCollection);
      }

      router.replace(`${pathname}?${next.toString()}`);
    },
    [
      q,
      status,
      priority,
      assigneeId,
      from,
      to,
      collection,
      pathname,
      qs,
      router,
      showCollection,
    ]
  );

  // Debounce search input for real-time filtering
  const debounceTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      updateURL({ q });
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Real-time updates for other filters
  useEffect(() => {
    updateURL({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, priority, assigneeId, from, to, collection]);

  const clear = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  return (
    <div className="rounded-md border bg-card/40 p-3">
      {/* Top bar: Search left, actions right (stack on mobile) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Search
          </label>
          <Input
            placeholder="Search by name, status, priority, date, assignee, etc…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            inputMode="text"
          />
        </div>

        <div className="flex gap-2 sm:self-end sm:pt-6">
          <Button
            variant="ghost"
            onClick={() => setShowMore((v) => !v)}
            className="w-full sm:w-auto"
          >
            {showMore ? "Hide filters" : "More filters"}
          </Button>
          <Button
            variant="outline"
            onClick={clear}
            className="w-full sm:w-auto"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Advanced filters rendered at the bottom when toggled */}
      {showMore ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-6">
          {/* Collection */}
          {showCollection ? (
            <div className="space-y-1 w-full">
              <label className="text-xs font-medium text-muted-foreground">
                Collection
              </label>
              <Select value={collection} onValueChange={setCollection}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All collections" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {collectionOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {/* Status */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Priority
            </label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Assignee
            </label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value={ANY}>Any</SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              From
            </label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          {/* To */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              To
            </label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
