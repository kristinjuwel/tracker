import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { TasksForCollection } from "@/components/tasks-for-collection";
import { Card, CardContent } from "@/components/ui/card";
import { Filters } from "@/components/tasks-filters";
import { CollectionDetails } from "@/components/collection-details";

export default async function CollectionTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    status?:
      | "pending"
      | "in_progress"
      | "blocked"
      | "completed"
      | "archived"
      | "";
    priority?: "low" | "medium" | "high" | "urgent" | "";
    assignee?: string;
    from?: string;
    to?: string;
  }>;
}) {
  noStore();
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Confirm access and get collection details
  const { data: collection, error: colErr } = await supabase
    .from("collections")
    .select("id, title, description, image")
    .eq("id", id)
    .maybeSingle();

  if (colErr || !collection) {
    return (
      <div className="space-y-4">
        <Header
          title="Tasks"
          description="Collection not found or inaccessible."
        />
        <EmptyState />
      </div>
    );
  }

  // Determine current user's role in this collection (for edit perms)
  let canEdit = false;
  {
    const { data: myMembership } = await supabase
      .from("user_collections")
      .select("role")
      .eq("col_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    const role = (myMembership?.role ?? "viewer") as
      | "owner"
      | "editor"
      | "viewer";
    canEdit = role === "owner" || role === "editor";
  }

  // Load assignee options limited to members of this collection
  type MemberRow = { user_id: string };
  const { data: memberRows } = await supabase
    .from("user_collections")
    .select("user_id")
    .eq("col_id", id)
    .returns<MemberRow[]>();
  const memberIds = Array.from(
    new Set((memberRows ?? []).map((m) => m.user_id).filter(Boolean))
  );
  type Profile = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  let assigneeOptions: { id: string; label: string }[] = [];
  if (memberIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", memberIds)
      .returns<Profile[]>();
    assigneeOptions = (profs ?? []).map((p) => ({
      id: p.id,
      label:
        p.first_name || p.last_name
          ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
          : p.email ?? p.id,
    }));
    assigneeOptions.sort((a, b) => a.label.localeCompare(b.label));
  }

  // Load tasks for the collection (use parent_task_id from DB) with filters
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
      ].join(", ")
    )
    .eq("col_id", id)
    .order("created_at", { ascending: false });

  if (sp.status) query = query.eq("status", sp.status);
  if (sp.priority) query = query.eq("priority", sp.priority);
  if (sp.from) query = query.gte("created_at", new Date(sp.from).toISOString());
  if (sp.to) {
    const toDate = new Date(sp.to as string);
    toDate.setDate(toDate.getDate() + 1);
    query = query.lt("created_at", toDate.toISOString());
  }
  if (sp.assignee && sp.assignee.trim()) {
    const term = sp.assignee.trim();
    const ids: string[] = [];
    const looksLikeId = /^[a-f0-9-]{16,}$/i.test(term);
    if (looksLikeId) ids.push(term);
    if (!looksLikeId) {
      const s = `%${term}%`;
      const { data: profs } = await supabase
        .from("profiles")
        .select("id")
        .or(
          [
            `first_name.ilike.${s}`,
            `last_name.ilike.${s}`,
            `email.ilike.${s}`,
          ].join(",")
        );
      (profs ?? []).forEach((p: { id: string }) => ids.push(p.id));
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
            "user_tasks!inner(user_id)",
          ].join(", ")
        )
        .in("user_tasks.user_id", ids);
    }
  }

  const tasksRes = await query;

  if (tasksRes.error) {
    return (
      <div className="space-y-4">
        <Header
          title={collection.title}
          description="We couldn’t load tasks for this collection."
        />
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {tasksRes.error.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Types for mapping DB -> UI
  type DBTaskRow = {
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
    parent_task_id: string | null;
    created_at: string;
  };

  // Keep your UI-facing type with parent_id, but map from parent_task_id
  type TaskRow = Omit<DBTaskRow, "parent_task_id"> & {
    parent_id: string | null;
  };

  const tasksData: TaskRow[] = (
    (tasksRes.data ?? []) as unknown as DBTaskRow[]
  ).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    status: t.status,
    priority: t.priority,
    progress: t.progress,
    start_date: t.start_date,
    end_date: t.end_date,
    deadline: t.deadline,
    link: t.link,
    created_at: t.created_at,
    parent_id: t.parent_task_id, // alias for components expecting parent_id
  }));

  const parentMap: Record<string, { id: string; name: string }> = {};
  tasksData.forEach((t) => {
    parentMap[t.id] = { id: t.id, name: t.name };
  });

  return (
    <div className="space-y-6">
      <CollectionDetails
        collectionId={collection.id}
        userId={user.id}
        canEdit={canEdit}
        initial={{
          title: collection.title,
          description: collection.description,
          image: collection.image,
        }}
      />

      <Filters
        collections={[{ id: collection.id, title: collection.title }]}
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
        showCollection={false}
      />

      <TasksForCollection
        initialTasks={tasksData}
        collectionId={collection.id}
        userId={user.id}
        initialParentNameMap={parentMap}
      />
    </div>
  );
}

function Header({
  title,
  description,
  secondaryAction,
}: {
  title: string;
  description?: string;
  secondaryAction?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {secondaryAction ? (
        <Link
          href={secondaryAction.href}
          className="text-sm font-medium text-primary hover:underline"
        >
          {secondaryAction.label}
        </Link>
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
