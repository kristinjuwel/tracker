// app/layout.tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import "./globals.css";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { DashboardTabs } from "@/components/dashboard-tabs";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Tracker — one place for tasks, notes, dates & shows",
  description:
    "A simple, fast tracker for tasks, notes, birthdays, and your watchlist — built with Next.js + Supabase.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Top Nav */}
          <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
              <Link href="/" className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
                  T
                </span>
                <span className="font-semibold tracking-tight">Tracker</span>
              </Link>
              <div className="flex items-center gap-2">
                <DashboardTabs />
              </div>
              <div className="flex items-center gap-2">
                <ThemeSwitcher />
                <AuthButton />
              </div>
            </div>
          </header>

          {/* Page Content with spacing */}
          <main className="mx-auto max-w-6xl px-4 my-10">{children}</main>

          {/* Footer with top margin for breathing room */}
          <footer className="border-t mt-10">
            <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">
              © 2025 Tracker · Built with Next.js & Supabase
            </div>
          </footer>
          {/* Global toaster for app-wide notifications */}
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
