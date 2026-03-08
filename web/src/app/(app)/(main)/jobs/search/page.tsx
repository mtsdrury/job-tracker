"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Loader2, Plus, ExternalLink, Check } from "lucide-react";

interface JobResult {
  externalId: string;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string;
  remoteType: string | null;
  url: string | null;
  description: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  datePosted: string | null;
}

export default function JobSearchPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState(false);
  const [results, setResults] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");

    const params = new URLSearchParams({ query: query.trim() });
    if (location.trim()) params.set("location", location.trim());
    if (remote) params.set("remote", "true");

    try {
      const res = await fetch(`/api/jobs/search?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Search failed");
        setResults([]);
      } else {
        const data = await res.json();
        setResults(data);
        if (data.length === 0) setError("No results found. Try different keywords.");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveJob(result: JobResult) {
    setSavingId(result.externalId);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.title,
          company: result.company,
          location: result.location,
          remoteType: result.remoteType,
          url: result.url,
          description: result.description,
          salaryMin: result.salaryMin,
          salaryMax: result.salaryMax,
          datePosted: result.datePosted,
          source: "jsearch",
          externalId: result.externalId,
        }),
      });

      if (res.ok) {
        setSavedIds((prev) => new Set(prev).add(result.externalId));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save job");
      }
    } catch {
      setError("Failed to save job");
    } finally {
      setSavingId(null);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search Jobs</h1>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Job title, keyword, or company..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="relative min-w-[160px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={remote}
              onChange={(e) => setRemote(e.target.checked)}
              className="rounded"
            />
            Remote only
          </label>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted">{results.length} results</p>
          {results.map((result) => {
            const isSaved = savedIds.has(result.externalId);
            const isSaving = savingId === result.externalId;
            return (
              <Card key={result.externalId}>
                <CardContent className="flex items-start gap-4 py-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{result.title}</p>
                      {result.url && (
                        <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-accent">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-muted">{result.company}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{result.location}</span>
                      {result.remoteType && <Badge variant="info">{result.remoteType}</Badge>}
                      {result.datePosted && <span>{formatDate(result.datePosted)}</span>}
                      {result.salaryMin && result.salaryMax && (
                        <span>${result.salaryMin.toLocaleString()} - ${result.salaryMax.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isSaved ? "secondary" : "primary"}
                    disabled={isSaved || isSaving}
                    onClick={() => saveJob(result)}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isSaved ? (
                      <>
                        <Check className="h-4 w-4" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
