"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function NewJobPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    company: "",
    title: "",
    location: "",
    url: "",
    description: "",
    salaryMin: "",
    salaryMax: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      const msg = data.error || "Something went wrong";
      setError(msg);
      toast.error(msg);
      setLoading(false);
      return;
    }

    const job = await res.json();
    toast.success(`Added ${form.company} — ${form.title}`);
    router.push(`/jobs/${job.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Add a New Job</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="company"
                label="Company"
                value={form.company}
                onChange={(e) => updateField("company", e.target.value)}
                placeholder="Google"
                required
              />
              <Input
                id="title"
                label="Role"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Software Engineer"
                required
              />
            </div>
            <Input
              id="location"
              label="Location"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="Los Angeles, CA"
            />
            <Input
              id="url"
              label="Job URL"
              value={form.url}
              onChange={(e) => updateField("url", e.target.value)}
              placeholder="https://..."
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="salary-min"
                label="Salary Min"
                type="number"
                value={form.salaryMin}
                onChange={(e) => updateField("salaryMin", e.target.value)}
                placeholder="80000"
              />
              <Input
                id="salary-max"
                label="Salary Max"
                type="number"
                value={form.salaryMax}
                onChange={(e) => updateField("salaryMax", e.target.value)}
                placeholder="120000"
              />
            </div>
            <Textarea
              id="description"
              label="Job Description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Paste the job description here..."
              rows={6}
            />
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Job"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
