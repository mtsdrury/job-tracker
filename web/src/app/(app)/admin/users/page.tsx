"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, Eye, Trash2, CreditCard, Shield } from "lucide-react";
import Link from "next/link";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  billingStatus: string;
  createdAt: string;
  isDemo: boolean;
  _count: {
    jobs: number;
    contacts: number;
    outreachEvents: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (e) {
      console.error("Failed to fetch users", e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleToggleBilling(userId: string, current: string) {
    setActionLoading(userId);
    const newStatus = current === "pro" ? "free" : "pro";
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingStatus: newStatus }),
      });
      await fetchUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleAdmin(userId: string, current: string) {
    setActionLoading(userId);
    const newRole = current === "admin" ? "user" : "admin";
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update");
      }
      await fetchUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
      await fetchUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users ({total})</h1>
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      {/* User list */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="animate-pulse flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-surface-hover" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-hover rounded w-48" />
                    <div className="h-3 bg-surface-hover rounded w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : users.length === 0 ? (
          <p className="text-muted text-center py-8">No users found</p>
        ) : (
          users.map((user) => (
            <Card key={user.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    {user.image ? (
                      <img src={user.image} alt="" className="h-10 w-10 rounded-full" />
                    ) : (
                      <span className="text-sm font-medium text-accent">
                        {user.name?.[0]?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{user.name}</p>
                      {user.role === "admin" && <Badge variant="danger">Admin</Badge>}
                      {user.isDemo && <Badge variant="warning">Demo</Badge>}
                      <Badge variant={user.billingStatus === "pro" ? "success" : "default"}>
                        {user.billingStatus}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted truncate">{user.email}</p>
                    <p className="text-xs text-muted mt-1">
                      {user._count.jobs} jobs · {user._count.contacts} contacts · {user._count.outreachEvents} outreach ·
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link href={`/admin/users/${user.id}`}>
                      <Button variant="ghost" size="sm" title="View details">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      title={user.billingStatus === "pro" ? "Downgrade to free" : "Upgrade to pro"}
                      onClick={() => handleToggleBilling(user.id, user.billingStatus)}
                      disabled={actionLoading === user.id}
                    >
                      <CreditCard className={`h-4 w-4 ${user.billingStatus === "pro" ? "text-success" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title={user.role === "admin" ? "Remove admin" : "Make admin"}
                      onClick={() => handleToggleAdmin(user.id, user.role)}
                      disabled={actionLoading === user.id}
                    >
                      <Shield className={`h-4 w-4 ${user.role === "admin" ? "text-danger" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Delete user"
                      onClick={() => handleDelete(user.id, user.email)}
                      disabled={actionLoading === user.id}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
