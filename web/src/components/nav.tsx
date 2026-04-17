"use client";

import { useEffect, useRef, useState } from "react";
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
  CreditCard,
  Globe,
  Menu,
  X,
  Shield,
  ChevronDown,
} from "lucide-react";
import { NotificationBell } from "./ui/notification-bell";

const APP_NAME = "KnowSomeone";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/community", label: "Community", icon: Globe },
];

const profileItems = [
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [resetting, setResetting] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const isDemo = session?.user?.isDemo === true;
  const isAdmin = session?.user?.isAdmin === true;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [profileOpen]);

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
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl shadow-lg shadow-black/10">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-8 min-w-0">
            <Link
              href="/dashboard"
              className="text-base sm:text-lg font-heading font-bold text-foreground flex-shrink-0 tracking-tight"
            >
              {APP_NAME}
            </Link>
            {isDemo && (
              <span className="rounded-full bg-accent/10 px-2 sm:px-3 py-1 text-xs font-medium text-accent flex-shrink-0">
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
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-accent/15 to-accent/5 text-accent border-b-2 border-accent"
                        : "text-muted hover:text-foreground hover:bg-surface-hover"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/admin"
                  className={clsx(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/admin")
                      ? "bg-danger/10 text-danger"
                      : "text-danger/70 hover:text-danger hover:bg-danger/5"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {session?.user && (
              <>
                <NotificationBell />
                {isDemo && (
                  <button
                    onClick={handleReset}
                    disabled={resetting}
                    className="flex items-center gap-1 text-sm text-warning hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={resetting ? "Resetting demo" : "Reset demo data"}
                  >
                    {resetting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Reset Demo</span>
                  </button>
                )}

                {/* Profile dropdown (desktop) */}
                <div ref={profileRef} className="relative hidden sm:block">
                  <button
                    onClick={() => setProfileOpen((o) => !o)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    aria-label="Open profile menu"
                    aria-expanded={profileOpen}
                    aria-haspopup="menu"
                  >
                    <span className="max-w-[140px] truncate">{session.user.name}</span>
                    <ChevronDown
                      className={clsx(
                        "h-4 w-4 transition-transform",
                        profileOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {profileOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-background shadow-lg shadow-black/20 overflow-hidden"
                    >
                      {session.user.email && (
                        <div className="px-3 py-2 border-b border-border">
                          <p className="text-xs text-muted truncate">{session.user.email}</p>
                        </div>
                      )}
                      {profileItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname.startsWith(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setProfileOpen(false)}
                            role="menuitem"
                            className={clsx(
                              "flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                              isActive
                                ? "bg-accent/10 text-accent"
                                : "text-foreground hover:bg-surface-hover"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          signOut({ callbackUrl: "/" });
                        }}
                        role="menuitem"
                        className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="sm:hidden flex items-center text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div id="mobile-nav" className="sm:hidden border-t border-border py-2 px-2" role="navigation" aria-label="Mobile navigation">
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
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-danger/10 text-danger"
                    : "text-danger/70 hover:text-danger hover:bg-danger/5"
                )}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}

            {session?.user && (
              <div className="mt-2 pt-2 border-t border-border">
                {session.user.name && (
                  <p className="px-3 py-1 text-xs text-muted truncate">
                    {session.user.name}
                  </p>
                )}
                {profileItems.map((item) => {
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
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
