import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireOnboarding() {
  const session = await requireAuth();
  if (!session.user.onboardingCompleted) {
    redirect("/onboarding");
  }
  return session;
}

export async function getSession() {
  return getServerSession(authOptions);
}
