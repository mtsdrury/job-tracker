"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Briefcase, MessageSquare, UserPlus, CreditCard, TestTube } from "lucide-react";

interface Stats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  demoUsers: number;
  recentSignups: number;
  totalJobs: number;
  appliedJobs: number;
  totalContacts: number;
  totalOutreach: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-surface-hover rounded w-20" />
                  <div className="h-8 bg-surface-hover rounded w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return <p className="text-danger">Failed to load stats</p>;

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-accent" },
    { label: "Pro Users", value: stats.proUsers, icon: CreditCard, color: "text-success" },
    { label: "Free Users", value: stats.freeUsers, icon: Users, color: "text-muted" },
    { label: "Demo Users", value: stats.demoUsers, icon: TestTube, color: "text-warning" },
    { label: "Signups (7d)", value: stats.recentSignups, icon: UserPlus, color: "text-accent" },
    { label: "Total Jobs", value: stats.totalJobs, icon: Briefcase, color: "text-foreground" },
    { label: "Applied Jobs", value: stats.appliedJobs, icon: Briefcase, color: "text-success" },
    { label: "Outreach Events", value: stats.totalOutreach, icon: MessageSquare, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <card.icon className={`h-5 w-5 ${card.color}`} />
                <div>
                  <p className="text-xs text-muted">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
