"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FolderKanban, CheckSquare } from "lucide-react"; // icons

type LinkDef = {
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const links: LinkDef[] = [
  { href: "/collections", label: "Collections", Icon: FolderKanban },
  { href: "/tasks", label: "Tasks", Icon: CheckSquare },
];

export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard navigation"
      className="flex max-w-full items-center md:gap-2 overflow-x-auto"
    >
      {links.map(({ href, label, Icon }) => {
        const active =
          pathname === href || (href !== "/" && pathname.startsWith(href));

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            title={label} // helpful on mobile where label is hidden
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {/* Icon is always visible */}
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />

            {/* Label hidden on small, shown md+ for responsiveness */}
            <span className="hidden md:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
