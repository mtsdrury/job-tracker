"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import { CelebrationProvider } from "@/components/celebration-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <CelebrationProvider>{children}</CelebrationProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
