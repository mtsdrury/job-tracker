import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Back to home */}
      <div className="border-b border-border bg-surface/50">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/50 py-8">
        <div className="mx-auto max-w-4xl px-6 text-center text-sm text-muted">
          <p>&copy; {new Date().getFullYear()} KnowSomeone. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
