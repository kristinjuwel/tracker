import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { TasksForCollection } from "@/components/tasks-for-collection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type SearchParams = {
  collection?: string;
  col_id?: string;
};

type TaskRecord = {
  id: string;
  name: string;
  description: string | null;
  status: "pending" | "in_progress" | "blocked" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  col_id: string;
};

type CollectionSummary = {
  id: string;
  title: string;
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  noStore();

  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } = {} } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const collectionFromParams = params?.collection ?? params?.col_id ?? null;

  const accessibleCollections = await loadAccessibleCollections(
    supabase,
    user.id
  );

  if (collectionFromParams) {
    return renderCollectionTasks({
      supabase,
      collectionId: collectionFromParams,
      collections: accessibleCollections,
      userId: user.id,
    });
  }

  return renderAllTasks({
    supabase,
    collections: accessibleCollections,
  });
}

async function loadAccessibleCollections(
  supabase: SupabaseServerClient,
  userId: string
): Promise<Map<string, CollectionSummary>> {
  const map = new Map<string, CollectionSummary>();

  const OWNED_LIMIT = 200;
  const MEMBER_LIMIT = 400;

  const ownedRes = await supabase
    .from("collections")
    .select("id, title")
    .eq("created_by", userId)
    .limit(OWNED_LIMIT);

  if (!ownedRes.error) {
    for (const row of ownedRes.data ?? []) {
      map.set(row.id, { id: row.id, title: row.title });
    }
  }

  const memberRes = await supabase
    .from("user_collections")
    .select("col_id")
    .eq("user_id", userId)
    .limit(MEMBER_LIMIT);

  if (!memberRes.error) {
    const idsToFetch = (memberRes.data ?? [])
      .map((r) => r.col_id)
      .filter((id): id is string => Boolean(id) && !map.has(id));

    if (idsToFetch.length) {
      const detailsRes = await supabase
        .from("collections")
        .select("id, title")
        .in("id", idsToFetch);

      if (!detailsRes.error) {
        for (const row of detailsRes.data ?? []) {
          map.set(row.id, { id: row.id, title: row.title });
        }
      }
    }
  }

  return map;
}

async function renderCollectionTasks({
  supabase,
  collectionId,
  collections,
  userId,
}: {
  supabase: SupabaseServerClient;
  collectionId: string;
  collections: Map<string, CollectionSummary>;
  userId: string;
}) {
  if (!collections.has(collectionId)) {
    // Try to load the collection directly in case the membership query was stale.
    const result = await supabase
      .from("collections")
      .select("id, title")
      .eq("id", collectionId)
      .maybeSingle();

    if (!result.data) {
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

    collections.set(result.data.id, {
      id: result.data.id,
      title: result.data.title,
    });
  }

  const tasksRes = await supabase
    .from("tasks")
    .select("id, name, description, status, priority, created_at")
    .eq("col_id", collectionId)
    .order("created_at", { ascending: false });

  if (tasksRes.error) {
    return (
      <div className="space-y-4">
        <Header
          title="Tasks"
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

  const initialTasks = (tasksRes.data ?? []).map((task) => ({
    id: task.id,
    name: task.name,
    description: task.description,
    status: task.status,
    priority: task.priority,
    created_at: task.created_at,
  }));

  const collection = collections.get(collectionId);

  return (
    <div className="space-y-6">
      <Header
        title={collection?.title ?? "Collection"}
        description="View and manage tasks within this collection."
        secondaryAction={{ label: "View all tasks", href: "/tracker/tasks" }}
      />

      <TasksForCollection
        initialTasks={initialTasks}
        collectionId={collectionId}
        userId={userId}
      />
    </div>
  );
}

async function renderAllTasks({
  supabase,
  collections,
}: {
  supabase: SupabaseServerClient;
  collections: Map<string, CollectionSummary>;
}) {
  const collectionIds = [...collections.keys()];

  if (collectionIds.length === 0) {
    return (
      <div className="space-y-4">
        <Header
          title="Tasks"
          description="You don’t have access to any collections yet."
        />
        <EmptyState />
      </div>
    );
  }

  const tasksRes = await supabase
    .from("tasks")
    .select("id, name, description, status, priority, created_at, col_id")
    .in("col_id", collectionIds)
    .order("created_at", { ascending: false });

  if (tasksRes.error) {
    return (
      <div className="space-y-4">
        <Header
          title="Tasks"
          description="We couldn’t load your tasks right now."
        />
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {tasksRes.error.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  const tasksByCollection = groupTasksByCollection(tasksRes.data ?? []);

  return (
    <div className="space-y-6">
      <Header
        title="All Tasks"
        description="Browse everything across the collections you can access."
      />

      {tasksByCollection.length === 0 ? (
        <EmptyState message="No tasks found yet. Try creating one from a collection." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tasksByCollection.map(({ collectionId, tasks }) => {
            const collection = collections.get(collectionId);
            return (
              <Card key={collectionId} className="flex h-full flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {collection?.title ?? "Untitled collection"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {tasks.length} task{tasks.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Link
                    href={`/tracker/tasks?collection=${collectionId}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open
                  </Link>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  {tasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium">{task.name}</span>
                        <Badge variant="secondary" className="capitalize">
                          {task.status.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      {task.description ? (
                        <p className="text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="capitalize">
                          Priority: {task.priority}
                        </span>
                        <span>
                          {new Date(task.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {tasks.length > 4 ? (
                    <p className="text-xs text-muted-foreground">
                      And {tasks.length - 4} more...
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function groupTasksByCollection(tasks: TaskRecord[]) {
  const groups = new Map<string, TaskRecord[]>();

  for (const task of tasks) {
    if (!groups.has(task.col_id)) {
      groups.set(task.col_id, []);
    }
    groups.get(task.col_id)!.push(task);
  }

  return [...groups.entries()]
    .sort(([, tasksA], [, tasksB]) => {
      const firstA = tasksA[0];
      const firstB = tasksB[0];
      const timeA = firstA ? new Date(firstA.created_at).getTime() : 0;
      const timeB = firstB ? new Date(firstB.created_at).getTime() : 0;
      return timeB - timeA;
    })
    .map(([collectionId, groupedTasks]) => ({
      collectionId,
      tasks: groupedTasks,
    }));
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
