"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Loader2, Plus, ExternalLink, Check, X, Bookmark } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

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

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  location: string | null;
  remoteOnly: boolean;
  resultCount: number | null;
  lastRunAt: string | null;
}

export function JobSearch() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState(false);
  const [results, setResults] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);

  useEffect(() => {
    loadSavedSearches();
  }, []);

  async function loadSavedSearches() {
    try {
      const res = await fetch("/api/saved-searches");
      if (res.ok) {
        const data = await res.json();
        setSavedSearches(data);
      }
    } catch {
      // Silently fail
    }
  }

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

  async function handleSaveSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchName.trim()) return;

    setSavingSearch(true);
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: searchName.trim(),
          query: query.trim(),
          location: location.trim() || null,
          remoteOnly: remote,
        }),
      });

      if (res.ok) {
        const newSearch = await res.json();
        setSavedSearches([newSearch, ...savedSearches]);
        setShowSaveForm(false);
        setSearchName("");
        toast.success("Search saved successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save search");
      }
    } catch {
      toast.error("Failed to save search");
    } finally {
      setSavingSearch(false);
    }
  }

  async function handleDeleteSearch(id: string) {
    if (!confirm("Delete this saved search?")) return;

    try {
      const res = await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSavedSearches(savedSearches.filter((s) => s.id !== id));
        toast.success("Search deleted successfully");
      } else {
        toast.error("Failed to delete search");
      }
    } catch {
      toast.error("Failed to delete search");
    }
  }

  function applySavedSearch(search: SavedSearch) {
    setQuery(search.query);
    setLocation(search.location || "");
    setRemote(search.remoteOnly);
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
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

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">{results.length} results</p>
                {results.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSaveForm(!showSaveForm)}
                  >
                    <Bookmark className="h-4 w-4" />
                    Save Search
                  </Button>
                )}
              </div>

              {showSaveForm && (
                <Card className="border-accent/50 bg-surface-hover">
                  <CardContent className="pt-4">
                    <form onSubmit={handleSaveSearch} className="space-y-3">
                      <input
                        type="text"
                        placeholder="e.g., ML Engineer in NYC"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={savingSearch || !searchName.trim()}
                        >
                          {savingSearch ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Bookmark className="h-4 w-4" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowSaveForm(false);
                            setSearchName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

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
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted hover:text-accent"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-muted">{result.company}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                          <span>{result.location}</span>
                          {result.remoteType && (
                            <Badge variant="info">{result.remoteType}</Badge>
                          )}
                          {result.datePosted && (
                            <span>{formatDate(result.datePosted)}</span>
                          )}
                          {result.salaryMin && result.salaryMax && (
                            <span>
                              ${result.salaryMin.toLocaleString()} -
                              ${result.salaryMax.toLocaleString()}
                            </span>
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

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                Saved Searches
              </h3>
              {savedSearches.length === 0 ? (
                <p className="text-xs text-muted">
                  Save your search criteria for quick access.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedSearches.map((search) => (
                    <div
                      key={search.id}
                      className="group flex items-start justify-between gap-2 rounded-lg border border-border p-2 hover:bg-surface-hover transition-colors text-xs"
                    >
                      <button
                        onClick={() => applySavedSearch(search)}
                        className="flex-1 text-left hover:text-accent transition-colors"
                      >
                        <p className="font-medium truncate">{search.name}</p>
                        <p className="text-muted truncate">{search.query}</p>
                      </button>
                      <button
                        onClick={() => handleDeleteSearch(search.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-danger flex-shrink-0 p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
