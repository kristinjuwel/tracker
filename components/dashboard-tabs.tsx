"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils"; // or your own cx helper

const links = [
  { href: "/", label: "Collections" }, // this resolves to /(dashboard)/page.tsx
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/settings", label: "Settings" },
];

export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2">
      {links.map((l) => {
        const active =
          pathname === l.href ||
          (l.href !== "/" && pathname.startsWith(l.href));

        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
