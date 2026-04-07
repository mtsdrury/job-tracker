"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>External Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-surface-hover transition-colors"
          >
            <div>
              <p className="font-medium">Stripe Dashboard</p>
              <p className="text-xs text-muted">Manage billing, subscriptions, and payments</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted" />
          </a>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-surface-hover transition-colors"
          >
            <div>
              <p className="font-medium">Supabase Dashboard</p>
              <p className="text-xs text-muted">Database, auth, and storage management</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted" />
          </a>
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-surface-hover transition-colors"
          >
            <div>
              <p className="font-medium">Vercel Dashboard</p>
              <p className="text-xs text-muted">Deployments, domains, and environment variables</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted" />
          </a>
          <a
            href="https://console.cloud.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-surface-hover transition-colors"
          >
            <div>
              <p className="font-medium">Google Cloud Console</p>
              <p className="text-xs text-muted">OAuth credentials and API keys</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted" />
          </a>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle>App Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <span className="text-muted">Free tier job limit</span>
            <span className="font-medium">25 jobs</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <span className="text-muted">Default strategy</span>
            <span className="font-medium">Referral First</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <span className="text-muted">Default stalled days</span>
            <span className="font-medium">5 days</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted">Demo account auto-expiry</span>
            <Badge variant="warning">Not configured</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Feature flags placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted py-4">
            Feature flags will be available here once implemented. For now, feature control is done via environment variables in Vercel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
