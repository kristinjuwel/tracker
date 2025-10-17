import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Filters } from "@/components/tasks-filters";
import type { TaskListRow } from "@/components/task-list";
import { TasksBrowser } from "@/components/tasks-browser";
import AddTaskAnywhere from "@/components/add-task-anywhere";

export type SearchParams = {
  q?: string;
  collection?: string;
  status?:
    | "pending"
    | "in_progress"
    | "blocked"
    | "completed"
    | "archived"
    | "";
  priority?: "low" | "medium" | "high" | "urgent" | "";
  assignee?: string; // name/email or user_id
  from?: string; // YYYY-MM-DD (created_at >=)
  to?: string; // YYYY-MM-DD (created_at <=)
};

export default async function AllTasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  noStore();
  const sp = await searchParams;

  if (sp?.collection && /^[a-f0-9-]{16,}$/i.test(sp.collection)) {
    redirect(`/collections/${sp.collection}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Build accessible collections map (owned + member)
  const collections = await loadAccessibleCollections(supabase, user.id);
  const collectionIds = [...collections.keys()];

  if (collectionIds.length === 0) {
    return (
      <div className="space-y-4">
        <Header
          title="All Tasks"
          description="You don’t have access to any collections yet."
        />
        <EmptyState />
      </div>
    );
  }

  // DB row type (note: parent_task_id in DB)
  type DbTask = {
    id: string;
    name: string;
    description: string | null;
    status: "pending" | "in_progress" | "blocked" | "completed" | "archived";
    priority: "low" | "medium" | "high" | "urgent";
    progress: number | null;
    start_date: string | null;
    end_date: string | null;
    deadline: string | null;
    link: string | null;
    parent_task_id: string | null; // ✓ correct column
    created_at: string;
    col_id: string;
    user_tasks?: { user_id: string }[]; // when joined
  };

  // Base select (use parent_task_id). Include personal tasks (col_id is null) created by user
  let query = supabase
    .from("tasks")
    .select(
      [
        "id",
        "name",
        "description",
        "status",
        "priority",
        "progress",
        "start_date",
        "end_date",
        "deadline",
        "link",
        "parent_task_id",
        "created_at",
        "col_id",
        "created_by",
      ].join(", ")
    )
    .or(
      [
        `col_id.in.(${collectionIds.join(",")})`,
        `and(col_id.is.null,created_by.eq.${user.id})`,
      ].join(",")
    )
    .order("created_at", { ascending: false });

  if (sp.status) query = query.eq("status", sp.status);
  if (sp.priority) query = query.eq("priority", sp.priority);

  if (sp.from) query = query.gte("created_at", new Date(sp.from).toISOString());
  if (sp.to) {
    const toDate = new Date(sp.to);
    toDate.setDate(toDate.getDate() + 1); // include end day
    query = query.lt("created_at", toDate.toISOString());
  }

  if (sp.assignee && sp.assignee.trim()) {
    const term = sp.assignee.trim();
    const ids: string[] = [];
    const looksLikeId = /^[a-f0-9-]{16,}$/i.test(term);
    if (looksLikeId) ids.push(term);

    if (!looksLikeId) {
      type ProfileLite = { id: string };
      const s = `%${term}%`;
      const profRes = await supabase
        .from("profiles")
        .select("id")
        .or(
          [
            `first_name.ilike.${s}`,
            `last_name.ilike.${s}`,
            `email.ilike.${s}`,
          ].join(",")
        )
        .limit(100)
        .returns<ProfileLite[]>();
      (profRes.data ?? []).forEach((p) => ids.push(p.id));
    }

    if (ids.length === 0) {
      query = query.eq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      query = query
        .select(
          [
            "id",
            "name",
            "description",
            "status",
            "priority",
            "progress",
            "start_date",
            "end_date",
            "deadline",
            "link",
            "parent_task_id",
            "created_at",
            "col_id",
            "user_tasks!inner(user_id)",
          ].join(", ")
        )
        .in("user_tasks.user_id", ids);
    }
  }

  const { data: tasksDataRaw, error } = await query.returns<DbTask[]>();

  if (error) {
    return (
      <div className="space-y-4">
        <Header
          title="All Tasks"
          description="We couldn’t load your tasks right now."
        />
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {error.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  const tasksData = tasksDataRaw ?? [];

  // Parent names map for the list view
  const parentNameMap: Record<string, { id: string; name: string }> = {};
  tasksData.forEach((t) => {
    parentNameMap[t.id] = { id: t.id, name: t.name };
  });

  // Assignee chips for visible tasks
  const assigneeMap = await buildAssigneesForTasks(
    supabase,
    tasksData.map((t) => t.id)
  );

  // Build a unique list of potential assignees from members of accessible collections
  const assigneeOptions = await buildAssigneeOptions(supabase, collectionIds);

  // Map DB -> UI rows (alias parent_task_id -> parent_id)
  const rows: TaskListRow[] = tasksData.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? undefined,
    status: t.status,
    priority: t.priority,
    progress: t.progress ?? undefined,
    start_date: t.start_date ?? undefined,
    end_date: t.end_date ?? undefined,
    deadline: t.deadline ?? undefined,
    link: t.link ?? undefined,
    created_at: t.created_at,
    parent_id: t.parent_task_id ?? undefined, // ✓ alias for UI components
    col_id: t.col_id ?? undefined,
    assignees: assigneeMap[t.id] ?? [],
  }));

  // Additional in-memory search across any displayed details (case-insensitive)
  const filteredRows = (() => {
    const term = sp.q?.trim().toLowerCase();
    if (!term) return rows;

    // Simple date formatter mirroring the list display (dd/mm/yyyy)
    const toDMY = (input?: string) => {
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

    return rows.filter((r) => {
      const parentName =
        r.parent_id && parentNameMap[r.parent_id]
          ? parentNameMap[r.parent_id].name
          : "";
      const assignees = (r.assignees ?? []).map((a) => a.label).join(" ");
      const statusReadable = r.status.replaceAll("_", " ");
      const progressStr =
        typeof r.progress === "number" ? `${r.progress}%` : "";
      const dueStr = r.deadline ? toDMY(r.deadline) : "";
      const createdStr = toDMY(r.created_at);

      const haystack = [
        norm(r.name),
        norm(r.description ?? undefined),
        norm(r.link ?? undefined),
        norm(parentName),
        norm(assignees),
        norm(r.priority),
        norm(r.status),
        norm(statusReadable),
        norm(progressStr),
        norm(dueStr),
        norm(createdStr),
      ].join(" ");

      return haystack.includes(term);
    });
  })();

  return (
    <div className="space-y-6 min-h-screen">
      <Header
        title="All Tasks"
        description="Browse everything across the collections you can access."
      />

      <div className="flex justify-end">
        <AddTaskAnywhere
          collections={[...collections.values()]}
          currentUserId={user.id}
          assigneeOptions={assigneeOptions}
        />
      </div>

      <Filters
        collections={[...collections.values()]}
        assignees={assigneeOptions}
        current={{
          q: sp.q ?? "",
          status: (sp.status ?? "") as
            | ""
            | "pending"
            | "in_progress"
            | "blocked"
            | "completed"
            | "archived",
          priority: (sp.priority ?? "") as
            | ""
            | "low"
            | "medium"
            | "high"
            | "urgent",
          assigneeId: sp.assignee ?? "",
          from: sp.from ?? "",
          to: sp.to ?? "",
        }}
      />

      {filteredRows.length === 0 ? (
        <EmptyState message="No tasks match your filters." />
      ) : (
        <TasksBrowser
          rows={filteredRows}
          parentNameMap={parentNameMap}
          currentUserId={user.id}
          assigneeOptions={assigneeOptions}
        />
      )}
    </div>
  );
}

async function loadAccessibleCollections(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const map = new Map<string, { id: string; title: string }>();

  const OWNED_LIMIT = 200;
  const MEMBER_LIMIT = 400;

  // Owned collections
  const ownedRes = await supabase
    .from("collections")
    .select("id, title")
    .eq("created_by", userId)
    .limit(OWNED_LIMIT);

  (ownedRes.data ?? []).forEach((row) =>
    map.set(row.id, { id: row.id, title: row.title })
  );

  // Member collections
  const memberRes = await supabase
    .from("user_collections")
    .select("col_id")
    .eq("user_id", userId)
    .limit(MEMBER_LIMIT);

  const idsToFetch = (memberRes.data ?? [])
    .map((r) => r.col_id)
    .filter((id): id is string => Boolean(id) && !map.has(id));

  if (idsToFetch.length) {
    const detailsRes = await supabase
      .from("collections")
      .select("id, title")
      .in("id", idsToFetch);
    (detailsRes.data ?? []).forEach((row) =>
      map.set(row.id, { id: row.id, title: row.title })
    );
  }

  return map;
}

async function buildAssigneeOptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  collectionIds: string[]
) {
  type MemberRow = { user_id: string };
  const options: { id: string; label: string }[] = [];
  if (!collectionIds.length) return options;

  const { data: membersRaw } = await supabase
    .from("user_collections")
    .select("user_id")
    .in("col_id", collectionIds)
    .returns<MemberRow[]>();

  const userIds = Array.from(
    new Set((membersRaw ?? []).map((m) => m.user_id).filter(Boolean))
  );

  if (!userIds.length) return options;

  type Profile = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  const { data: profilesRaw } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", userIds)
    .returns<Profile[]>();

  const profiles = profilesRaw ?? [];
  profiles.forEach((p) => {
    const label =
      p.first_name || p.last_name
        ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
        : p.email ?? p.id;
    options.push({ id: p.id, label });
  });

  options.sort((a, b) => a.label.localeCompare(b.label));
  return options;
}

async function buildAssigneesForTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskIds: string[]
) {
  const result: Record<string, { id: string; label: string }[]> = {};
  if (!taskIds.length) return result;

  type UserTask = { task_id: string; user_id: string };
  const { data: utRaw } = await supabase
    .from("user_tasks")
    .select("task_id, user_id")
    .in("task_id", taskIds)
    .returns<UserTask[]>();

  const ut: UserTask[] = utRaw ?? [];
  const uniqueUserIds = Array.from(new Set(ut.map((r) => r.user_id)));

  const labelMap: Record<string, string> = {};
  if (uniqueUserIds.length) {
    type Profile = {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    };
    const res = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", uniqueUserIds)
      .returns<Profile[]>();
    for (const p of res.data ?? []) {
      const label =
        p.first_name || p.last_name
          ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
          : p.email ?? p.id;
      labelMap[p.id] = label;
    }
  }

  ut.forEach((row) => {
    const arr = result[row.task_id] ?? [];
    arr.push({ id: row.user_id, label: labelMap[row.user_id] ?? row.user_id });
    result[row.task_id] = arr;
  });
  return result;
}

function Header({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        {message ?? "No tasks to show yet."}
      </CardContent>
    </Card>
  );
}
