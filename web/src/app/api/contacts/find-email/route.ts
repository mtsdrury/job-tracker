import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findEmail } from "@/lib/hunter-client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { contactId, domain } = await req.json();

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400 }
      );
    }

    // Check billing status and get Hunter API key
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { billingStatus: true, hunterApiKey: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.billingStatus !== "pro") {
      return NextResponse.json(
        { error: "Upgrade to Pro to use email finder" },
        { status: 403 }
      );
    }

    if (!user.hunterApiKey) {
      return NextResponse.json(
        { error: "Add your Hunter.io API key in Settings to find emails" },
        { status: 400 }
      );
    }

    // Fetch the contact
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId: session.user.id },
      select: { id: true, name: true, company: true, email: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Parse first/last name from contact name
    const nameParts = (contact.name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "Contact needs both a first and last name to find their email" },
        { status: 400 }
      );
    }

    // Determine the company domain
    // Priority: explicit domain param > contact's company > empty
    let companyDomain = domain || "";

    if (!companyDomain && contact.company) {
      // Guess domain from company name: "Google Inc." -> "google.com"
      // Strip common corporate suffixes before converting to domain
      companyDomain = contact.company
        .replace(/\b(inc\.?|llc\.?|ltd\.?|co\.?|corp\.?|corporation|company|group|holdings?|technologies|solutions)\b/gi, "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        + ".com";
    }

    if (!companyDomain) {
      return NextResponse.json(
        { error: "Could not determine company domain. Add the company name to the contact or provide a domain." },
        { status: 400 }
      );
    }

    // Call Hunter.io
    const result = await findEmail(
      user.hunterApiKey,
      firstName,
      lastName,
      companyDomain
    );

    // Update the contact's email if found with decent confidence
    if (result.email && result.score >= 50) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          email: result.email,
          ...(result.position ? { title: result.position } : {}),
        },
      });
    }

    return NextResponse.json({
      email: result.email,
      confidence: result.score,
      position: result.position,
      sources: result.sources.length,
      saved: result.score >= 50,
    });
  } catch (error) {
    console.error("Email finder error:", error);
    const message = error instanceof Error ? error.message : "Failed to find email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
