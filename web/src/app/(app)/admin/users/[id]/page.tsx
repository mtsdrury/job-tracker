"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Briefcase, Users as UsersIcon, MessageSquare, CreditCard, Shield, Eye } from "lucide-react";

interface UserDetail {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  billingStatus: string;
  stripeCustomerId: string | null;
  strategyMode: string;
  stalledDays: number;
  createdAt: string;
  config: Record<string, unknown>;
  targetRoles: string[];
  preferredLocations: string[];
  remotePreference: string | null;
  jobs: Array<{
    id: string;
    title: string;
    company: string;
    applied: boolean;
    appliedAt: string | null;
    interviewStage: string | null;
    nextAction: string | null;
    isClosed: boolean;
    archived: boolean;
    createdAt: string;
  }>;
  contacts: Array<{
    id: string;
    name: string;
    company: string | null;
    title: string | null;
    connectionType: string;
  }>;
  outreachEvents: Array<{
    id: string;
    status: string;
    platform: string | null;
    lastActionAt: string;
    contact: { name: string; company: string | null };
  }>;
}

export default function AdminUserDetail() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"jobs" | "contacts" | "outreach" | "config">("jobs");

  useEffect(() => {
    fetch(`/api/admin/users/${params.id}`)
      .then((r) => r.json())
      .then(setUser)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <div className="animate-pulse text-muted">Loading user...</div>;
  }

  if (!user) {
    return <p className="text-danger">User not found</p>;
  }

  const isDemo = (user.config as Record<string, unknown>)?.is_demo === true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-surface-hover rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            {user.role === "admin" && <Badge variant="danger">Admin</Badge>}
            {isDemo && <Badge variant="warning">Demo</Badge>}
            <Badge variant={user.billingStatus === "pro" ? "success" : "secondary"}>
              {user.billingStatus}
            </Badge>
          </div>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>

      {/* User info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted" />
              <div>
                <p className="text-xs text-muted">Jobs</p>
                <p className="text-lg font-bold">{user.jobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-muted" />
              <div>
                <p className="text-xs text-muted">Contacts</p>
                <p className="text-lg font-bold">{user.contacts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted" />
              <div>
                <p className="text-xs text-muted">Outreach</p>
                <p className="text-lg font-bold">{user.outreachEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted" />
              <div>
                <p className="text-xs text-muted">Strategy</p>
                <p className="text-lg font-bold capitalize">{user.strategyMode.replace("_", " ")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile details */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex gap-8">
            <div>
              <span className="text-muted">Joined:</span>{" "}
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
            <div>
              <span className="text-muted">Stalled days:</span> {user.stalledDays}
            </div>
            <div>
              <span className="text-muted">Remote:</span> {user.remotePreference || "Any"}
            </div>
          </div>
          {user.targetRoles.length > 0 && (
            <div>
              <span className="text-muted">Target roles:</span>{" "}
              {user.targetRoles.join(", ")}
            </div>
          )}
          {user.preferredLocations.length > 0 && (
            <div>
              <span className="text-muted">Preferred locations:</span>{" "}
              {user.preferredLocations.join(", ")}
            </div>
          )}
          {user.stripeCustomerId && (
            <div>
              <span className="text-muted">Stripe ID:</span>{" "}
              <code className="text-xs bg-surface-hover px-1 py-0.5 rounded">{user.stripeCustomerId}</code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data tabs */}
      <div className="flex gap-2 border-b border-border/50 pb-1">
        {(["jobs", "contacts", "outreach", "config"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm rounded-t-lg transition-colors ${
              tab === t ? "bg-surface-hover font-medium text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "jobs" && (
        <div className="space-y-2">
          {user.jobs.length === 0 ? (
            <p className="text-muted text-sm py-4">No jobs</p>
          ) : (
            user.jobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{job.company}</p>
                      <p className="text-sm text-muted">{job.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.applied && <Badge variant="success">Applied</Badge>}
                      {job.isClosed && <Badge variant="danger">Closed</Badge>}
                      {job.archived && <Badge variant="secondary">Archived</Badge>}
                      {job.interviewStage && (
                        <Badge variant="primary">{job.interviewStage}</Badge>
                      )}
                      {job.nextAction && (
                        <span className="text-xs text-muted">{job.nextAction}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "contacts" && (
        <div className="space-y-2">
          {user.contacts.length === 0 ? (
            <p className="text-muted text-sm py-4">No contacts</p>
          ) : (
            user.contacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-muted">
                        {[contact.title, contact.company].filter(Boolean).join(" at ")}
                      </p>
                    </div>
                    <Badge variant="secondary">{contact.connectionType}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "outreach" && (
        <div className="space-y-2">
          {user.outreachEvents.length === 0 ? (
            <p className="text-muted text-sm py-4">No outreach</p>
          ) : (
            user.outreachEvents.map((event) => (
              <Card key={event.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{event.contact.name}</p>
                      <p className="text-sm text-muted">
                        {event.contact.company} · {event.platform || "Unknown platform"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{event.status}</Badge>
                      <span className="text-xs text-muted">
                        {new Date(event.lastActionAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "config" && (
        <Card>
          <CardContent className="pt-4">
            <pre className="text-xs bg-surface-hover p-4 rounded-lg overflow-auto max-h-96">
              {JSON.stringify(user.config, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
