import { Nav } from "@/components/nav";
import { requireOnboarding } from "@/lib/auth-helpers";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboarding();
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:bg-accent focus:text-white focus:p-2">
        Skip to main content
      </a>
      <Nav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
