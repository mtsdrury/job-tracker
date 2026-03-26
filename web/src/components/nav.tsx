"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Settings,
  LogOut,
  RotateCcw,
  Loader2,
  Search,
  CreditCard,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import { NotificationBell } from "./ui/notification-bell";

const APP_NAME = "KnowSomeone";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "My Jobs", icon: Briefcase },
  { href: "/jobs/search", label: "Job Search", icon: Search },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [resetting, setResetting] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDemo = session?.user?.isDemo === true;

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Reset failed:", err);
    } finally {
      setResetting(false);
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="text-lg font-bold text-foreground"
            >
              {APP_NAME}
            </Link>
            {isDemo && (
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                Demo Mode
              </span>
            )}
            <div className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-muted hover:text-foreground hover:bg-surface"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {session?.user && (
              <>
                <NotificationBell />
                {isDemo && (
                  <button
                    onClick={handleReset}
                    disabled={resetting}
                    className="flex items-center gap-1 text-sm text-warning hover:text-foreground transition-colors"
                  >
                    {resetting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Reset Demo</span>
                  </button>
                )}
                <span className="text-sm text-muted hidden sm:inline">
                  {session.user.name}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            )}
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="sm:hidden flex items-center text-muted hover:text-foreground"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-border py-2 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:text-foreground hover:bg-surface"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
