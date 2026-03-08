"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";

export function DemoButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDemo() {
    setLoading(true);
    try {
      // Seed the demo account
      const res = await fetch("/api/demo/start", { method: "POST" });
      if (!res.ok) {
        console.error("Failed to start demo");
        setLoading(false);
        return;
      }

      const { email, password } = await res.json();

      // Sign in as demo user
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Demo error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" size="lg" onClick={handleDemo} disabled={loading} className="gap-2">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      Try Demo
    </Button>
  );
}
