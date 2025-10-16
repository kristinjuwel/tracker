// app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="grid items-center gap-6 rounded-2xl border bg-card p-8 md:grid-cols-2">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            One tracker for{" "}
            <span className="underline decoration-primary/40">everything</span>
          </h1>
          <p className="text-muted-foreground">
            Tasks, notes, birthdays, and even your anime watchlist — all in one
            clean, fast app.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/auth/sign-up">Get started</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-xl border bg-background p-4">
          {/* Quick add mockup */}
          <div className="space-y-3">
            <Label htmlFor="quick-add">Quick add</Label>
            <div className="flex gap-2">
              <Input
                id="quick-add"
                placeholder="e.g. Buy cake for Mom’s birthday — Fri 7pm"
              />
              <Button variant="secondary">Add</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: natural language dates like <em>“Fri 7pm”</em> are supported.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>
              Priorities, due dates, and progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Organize by collections, assign people, add subtasks, and track
            blockers.
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Lightweight and searchable.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Keep quick notes per task or standalone. Tag them for fast
            retrieval.
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Birthdays</CardTitle>
            <CardDescription>Never miss important dates.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Set reminders and repeat rules. Get nudges ahead of time.
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Watchlist</CardTitle>
            <CardDescription>Log episodes & seasons.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Track progress, ratings, and notes for shows & anime.
          </CardContent>
        </Card>
      </section>

      {/* Auth CTA */}
      <section className="rounded-2xl border bg-card p-8">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Ready to get organized?</h2>
            <p className="text-sm text-muted-foreground">
              Create an account to sync across devices and unlock reminders.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/auth/sign-up">Create account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/login">I already have one</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
