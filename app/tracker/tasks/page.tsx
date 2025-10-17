import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Filters } from "@/components/tasks-filters";
import { TaskList, type TaskListRow } from "@/components/task-list";

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
  assignee?: string; // user_id
  from?: string; // YYYY-MM-DD (created_at >=)
  to?: string; // YYYY-MM-DD (created_at <=)
};

export default async function AllTasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  noStore();

  const params = await searchParams;

  // Back-compat: if someone hits /tracker/tasks?collection=UUID -> new pretty route
  if (params?.collection && /^[a-f0-9-]{16,}$/i.test(params.collection)) {
    redirect(`/tracker/collections/${params.collection}`);
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

  // Server-side query with filters
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
    parent_id: string | null;
    created_at: string;
    col_id: string;
    user_tasks?: { user_id: string }[];
  };

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
        "parent_id",
        "created_at",
        "col_id",
      ].join(", ")
    )
    .in("col_id", collectionIds)
    .order("created_at", { ascending: false });

  if (params.status) query = query.eq("status", params.status);
  if (params.priority) query = query.eq("priority", params.priority);

  // Full-text-ish search on name/description (simple ILIKE)
  if (params.q && params.q.trim()) {
    const s = `%${params.q.trim()}%`;
    // Use or(...) for combined filters
    query = query.or(`name.ilike.${s},description.ilike.${s}`);
  }

  // Date range (created_at)
  if (params.from)
    query = query.gte("created_at", new Date(params.from).toISOString());
  if (params.to) {
    const toDate = new Date(params.to);
    // Include the end day by moving to next day 00:00 and lt
    toDate.setDate(toDate.getDate() + 1);
    query = query.lt("created_at", toDate.toISOString());
  }

  // Assignee filter via a join to user_tasks
  // Supabase filter syntax: user_tasks!inner(user_id)
  if (params.assignee) {
    query = query
      .eq("user_tasks.user_id", params.assignee)
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
          "parent_id",
          "created_at",
          "col_id",
          "user_tasks!inner(user_id)",
        ].join(", ")
      );
  }

  const { data: tasksData, error } = await query.returns<DbTask[]>();

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

  // Parent names map for the list view
  const parentNameMap: Record<string, { id: string; name: string }> = {};
  (tasksData ?? []).forEach((t) => {
    parentNameMap[t.id] = { id: t.id, name: t.name };
  });

  // Build an assignee map for the visible tasks (for the List chips)
  const assigneeMap = await buildAssigneesForTasks(
    supabase,
    (tasksData ?? []).map((t) => t.id)
  );

  // Decorate rows for TaskList
  const rows: TaskListRow[] = (tasksData ?? []).map((t) => ({
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
    parent_id: t.parent_id ?? undefined,
    assignees: assigneeMap[t.id] ?? [],
  }));

  return (
    <div className="space-y-6">
      <Header
        title="All Tasks"
        description="Browse everything across the collections you can access."
      />

      <Filters
        collections={[...collections.values()]}
        current={{
          q: params.q ?? "",
          status: (params.status ?? "") as
            | ""
            | "pending"
            | "in_progress"
            | "blocked"
            | "completed"
            | "archived",
          priority: (params.priority ?? "") as
            | ""
            | "low"
            | "medium"
            | "high"
            | "urgent",
          assignee: params.assignee ?? "",
          from: params.from ?? "",
          to: params.to ?? "",
        }}
      />

      {rows.length === 0 ? (
        <EmptyState message="No tasks match your filters." />
      ) : (
        <TaskList rows={rows} parentNameMap={parentNameMap} />
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

  const ownedRes = await supabase
    .from("collections")
    .select("id, title")
    .eq("created_by", userId)
    .limit(OWNED_LIMIT);
  (ownedRes.data ?? []).forEach((row) =>
    map.set(row.id, { id: row.id, title: row.title })
  );

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
