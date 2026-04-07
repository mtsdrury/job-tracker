"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Shield, Users, BarChart3, Settings, ArrowLeft } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isAdmin) {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) return null;

  return (
    <div className="min-h-screen">
      {/* Admin header bar */}
      <div className="bg-danger/10 border-b border-danger/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-danger" />
            <span className="text-sm font-medium text-danger">Admin Mode</span>
          </div>
          <Link href="/dashboard" className="text-xs text-muted hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Back to App
          </Link>
        </div>
      </div>

      {/* Admin nav */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6 py-3">
            <Link href="/admin" className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
              <BarChart3 className="h-4 w-4" />
              Overview
            </Link>
            <Link href="/admin/users" className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
              <Users className="h-4 w-4" />
              Users
            </Link>
            <Link href="/admin/settings" className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
