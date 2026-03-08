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
      <Nav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
