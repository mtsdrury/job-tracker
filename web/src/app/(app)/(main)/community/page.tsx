"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Search, Users, BarChart3, UserPlus, Send, Check, X } from "lucide-react";

// ---------- Types ----------

interface InsiderListing {
  id: string;
  name: string;
  avatar: string | null;
  company: string;
  role: string;
  department: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  activeRequests: number;
  maxRequests: number;
  available: boolean;
  joinedAt: string;
}

interface MyRequest {
  id: string;
  targetRole: string;
  message: string;
  status: string;
  insiderNote: string | null;
  createdAt: string;
  insiderProfile: {
    company: string;
    role: string;
    user: { name: string; image: string | null };
  };
}

interface IncomingRequest {
  id: string;
  targetRole: string;
  message: string;
  status: string;
  createdAt: string;
  requester: { name: string; image: string | null };
}

interface InsiderProfile {
  id: string;
  company: string;
  role: string;
  department: string | null;
  linkedinUrl: string | null;
  bio: string | null;
  maxRequests: number;
  active: boolean;
  referralRequests: IncomingRequest[];
}

interface CommunityStats {
  overview: {
    totalUsers: number;
    totalJobs: number;
    totalOutreach: number;
    totalInsiders: number;
    totalReferralRequests: number;
    completedReferrals: number;
  };
  pipeline: { applied: number; interviewing: number; offers: number };
  referralImpact: {
    withReferral: { total: number; interviews: number; interviewRate: number };
    withoutReferral: { total: number; interviews: number; interviewRate: number };
    multiplier: number;
  };
  topCompanies: Array<{ company: string; insiders: number }>;
  avgDaysToApply: number | null;
}

// ---------- Tab Constants ----------

const TABS = [
  { id: "browse", label: "Find Insiders", icon: Search },
  { id: "stats", label: "Community Stats", icon: BarChart3 },
  { id: "requests", label: "My Referrals", icon: Send },
  { id: "profile", label: "Become an Insider", icon: UserPlus },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ---------- Main Component ----------

export default function CommunityPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const activeTab = (searchParams.get("tab") as TabId) || "browse";

  function setTab(tab: TabId) {
    router.push(tab === "browse" ? "/community" : `/community?tab=${tab}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Community</h1>
        <p className="text-sm text-muted mt-1">
          Connect with insiders who can refer you, or pay it forward by referring others.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "browse" && <BrowseInsidersTab />}
      {activeTab === "stats" && <StatsTab />}
      {activeTab === "requests" && <MyRequestsTab />}
      {activeTab === "profile" && <InsiderProfileTab />}
    </div>
  );
}

// ---------- Browse Insiders Tab ----------

function BrowseInsidersTab() {
  const [insiders, setInsiders] = useState<InsiderListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({ targetRole: "", message: "" });
  const toast = useToast();

  const fetchInsiders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("company", search);
    const res = await fetch(`/api/community/insiders?${params}`);
    if (res.ok) {
      const data = await res.json();
      setInsiders(data.insiders);
      setTotalPages(data.pages);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchInsiders();
  }, [fetchInsiders]);

  async function submitRequest(insiderId: string) {
    if (!requestForm.targetRole || !requestForm.message) {
      toast.error("Please fill in the role and message");
      return;
    }
    const res = await fetch("/api/community/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        insiderProfileId: insiderId,
        targetRole: requestForm.targetRole,
        message: requestForm.message,
      }),
    });
    if (res.ok) {
      toast.success("Referral request sent!");
      setRequestingId(null);
      setRequestForm({ targetRole: "", message: "" });
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to send request");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search by company name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted py-8 text-center">Loading insiders...</p>
      ) : insiders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-8 w-8 mx-auto text-muted mb-3" />
            <p className="text-sm text-muted">
              {search
                ? `No insiders found at "${search}" yet. Be the first!`
                : "No insiders have signed up yet. Be the first to pay it forward!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insiders.map((insider) => (
            <Card key={insider.id}>
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-accent">
                      {insider.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{insider.name}</p>
                    <p className="text-xs text-muted">
                      {insider.role} at {insider.company}
                    </p>
                    {insider.department && (
                      <p className="text-xs text-muted">{insider.department}</p>
                    )}
                    {insider.bio && (
                      <p className="text-xs text-muted mt-2">{insider.bio}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant={insider.available ? "success" : "warning"}>
                        {insider.available ? "Available" : "At capacity"}
                      </Badge>
                      {insider.linkedinUrl && (
                        <a
                          href={insider.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline"
                        >
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                  {insider.available && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setRequestingId(requestingId === insider.id ? null : insider.id)
                      }
                    >
                      Request
                    </Button>
                  )}
                </div>

                {/* Inline request form */}
                {requestingId === insider.id && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <Input
                      placeholder="What role are you targeting?"
                      value={requestForm.targetRole}
                      onChange={(e) =>
                        setRequestForm({ ...requestForm, targetRole: e.target.value })
                      }
                    />
                    <Textarea
                      placeholder="Introduce yourself and explain why you'd be a good fit..."
                      value={requestForm.message}
                      onChange={(e) =>
                        setRequestForm({ ...requestForm, message: e.target.value })
                      }
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => submitRequest(insider.id)}>
                        <Send className="h-3 w-3" />
                        Send Request
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRequestingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted py-1.5">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------- Stats Tab ----------

function StatsTab() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/community/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted py-8 text-center">Loading stats...</p>;
  }

  if (!stats) {
    return <p className="text-sm text-muted py-8 text-center">Could not load stats.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Users", value: stats.overview.totalUsers },
          { label: "Jobs Tracked", value: stats.overview.totalJobs },
          { label: "Outreach Sent", value: stats.overview.totalOutreach },
          { label: "Insiders", value: stats.overview.totalInsiders },
          { label: "Referral Requests", value: stats.overview.totalReferralRequests },
          { label: "Referrals Made", value: stats.overview.completedReferrals },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-muted">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral impact */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-success/5 border border-success/20 p-4 text-center">
              <p className="text-3xl font-bold text-success">
                {stats.referralImpact.withReferral.interviewRate}%
              </p>
              <p className="text-xs text-muted mt-1">Interview rate with referral</p>
              <p className="text-xs text-muted">
                ({stats.referralImpact.withReferral.interviews} of{" "}
                {stats.referralImpact.withReferral.total} jobs)
              </p>
            </div>
            <div className="rounded-lg bg-accent/5 border border-accent/20 p-4 text-center">
              <p className="text-3xl font-bold text-accent">
                {stats.referralImpact.multiplier > 0
                  ? `${stats.referralImpact.multiplier}x`
                  : "N/A"}
              </p>
              <p className="text-xs text-muted mt-1">Referral advantage</p>
              <p className="text-xs text-muted">
                compared to applying without one
              </p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-3xl font-bold">
                {stats.referralImpact.withoutReferral.interviewRate}%
              </p>
              <p className="text-xs text-muted mt-1">Interview rate without referral</p>
              <p className="text-xs text-muted">
                ({stats.referralImpact.withoutReferral.interviews} of{" "}
                {stats.referralImpact.withoutReferral.total} jobs)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top companies */}
      {stats.topCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Companies with Insiders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topCompanies.map((c) => (
                <div key={c.company} className="flex items-center justify-between py-1.5">
                  <span className="text-sm font-medium">{c.company}</span>
                  <Badge variant="info">
                    {c.insiders} insider{c.insiders !== 1 ? "s" : ""}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline & timing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Community Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Applied</span>
              <span className="font-medium">{stats.pipeline.applied.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Interviewing</span>
              <span className="font-medium">{stats.pipeline.interviewing.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Offers</span>
              <span className="font-medium">{stats.pipeline.offers.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Timing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats.avgDaysToApply !== null ? `${stats.avgDaysToApply} days` : "N/A"}
            </p>
            <p className="text-xs text-muted mt-1">Average days from adding a job to applying</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------- My Requests Tab ----------

function MyRequestsTab() {
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/community/requests")
      .then((r) => r.json())
      .then((data) => setRequests(data.requests || []))
      .finally(() => setLoading(false));
  }, []);

  async function withdrawRequest(id: string) {
    const res = await fetch(`/api/community/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "withdrawn" }),
    });
    if (res.ok) {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "withdrawn" } : r)));
      toast.success("Request withdrawn");
    }
  }

  const statusVariant = (s: string) => {
    if (s === "accepted" || s === "completed") return "success" as const;
    if (s === "pending") return "warning" as const;
    if (s === "declined" || s === "withdrawn") return "danger" as const;
    return "default" as const;
  };

  if (loading) {
    return <p className="text-sm text-muted py-8 text-center">Loading...</p>;
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Send className="h-8 w-8 mx-auto text-muted mb-3" />
          <p className="text-sm text-muted">
            You haven't sent any referral requests yet. Browse insiders to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <Card key={req.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-sm">
                  {req.insiderProfile.user.name} at {req.insiderProfile.company}
                </p>
                <p className="text-xs text-muted">{req.insiderProfile.role}</p>
                <p className="text-xs text-muted mt-1">
                  Targeting: {req.targetRole}
                </p>
                <p className="text-xs text-muted mt-1 line-clamp-2">{req.message}</p>
                {req.insiderNote && (
                  <div className="mt-2 p-2 rounded bg-accent/5 border border-accent/20">
                    <p className="text-xs font-medium text-accent">Insider response:</p>
                    <p className="text-xs mt-1">{req.insiderNote}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={statusVariant(req.status)}>
                  {req.status}
                </Badge>
                <span className="text-xs text-muted">
                  {new Date(req.createdAt).toLocaleDateString()}
                </span>
                {req.status === "pending" && (
                  <button
                    onClick={() => withdrawRequest(req.id)}
                    className="text-xs text-danger hover:underline"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------- Insider Profile Tab ----------

function InsiderProfileTab() {
  const [profile, setProfile] = useState<InsiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company: "",
    role: "",
    department: "",
    linkedinUrl: "",
    bio: "",
    maxRequests: 5,
    active: true,
  });
  const toast = useToast();

  useEffect(() => {
    fetch("/api/community/insiders/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setForm({
            company: data.profile.company || "",
            role: data.profile.role || "",
            department: data.profile.department || "",
            linkedinUrl: data.profile.linkedinUrl || "",
            bio: data.profile.bio || "",
            maxRequests: data.profile.maxRequests || 5,
            active: data.profile.active,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    if (!form.company || !form.role) {
      toast.error("Company and role are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/community/insiders/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      toast.success(profile ? "Profile updated" : "You're now an insider! Welcome to the community.");
    } else {
      toast.error("Failed to save profile");
    }
    setSaving(false);
  }

  async function handleRequestAction(requestId: string, action: "accepted" | "declined", note?: string) {
    const res = await fetch(`/api/community/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action, insiderNote: note || null }),
    });
    if (res.ok) {
      // Refresh profile to update request list
      const r = await fetch("/api/community/insiders/me");
      const data = await r.json();
      if (data.profile) setProfile(data.profile);
      toast.success(action === "accepted" ? "Request accepted" : "Request declined");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted py-8 text-center">Loading...</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {profile ? "Your Insider Profile" : "Become an Insider"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!profile && (
            <p className="text-sm text-muted">
              Got hired through a referral -- or just want to help others? Create an insider
              profile so job seekers at your company can request a referral from you.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Company *</label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Where do you work?"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Role *</label>
              <Input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Your current title"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Department</label>
              <Input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Engineering, Sales, etc."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">LinkedIn URL</label>
              <Input
                value={form.linkedinUrl}
                onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Short bio (why should people ask you for a referral?)
            </label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="I've been at the company for 2 years and know the hiring process well..."
            />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Max active requests
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.maxRequests}
                onChange={(e) =>
                  setForm({ ...form, maxRequests: parseInt(e.target.value) || 5 })
                }
                className="w-24"
              />
            </div>
            {profile && (
              <div className="pt-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="rounded"
                  />
                  Profile active (visible to others)
                </label>
              </div>
            )}
          </div>
          <Button onClick={saveProfile} disabled={saving}>
            {saving ? "Saving..." : profile ? "Update Profile" : "Create Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Incoming requests */}
      {profile && profile.referralRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Incoming Requests ({profile.referralRequests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.referralRequests.map((req) => (
              <div key={req.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{req.requester.name}</p>
                    <p className="text-xs text-muted">Targeting: {req.targetRole}</p>
                    <p className="text-xs mt-2">{req.message}</p>
                  </div>
                  <Badge variant={req.status === "pending" ? "warning" : "success"}>
                    {req.status}
                  </Badge>
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleRequestAction(req.id, "accepted")}
                    >
                      <Check className="h-3 w-3" />
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRequestAction(req.id, "declined")}
                    >
                      <X className="h-3 w-3" />
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
