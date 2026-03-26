import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrichContact } from "@/lib/apollo-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if user is pro
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { billingStatus: true, apolloApiKey: true },
    });

    if (!user || user.billingStatus !== "pro") {
      return NextResponse.json(
        { error: "This feature is only available for pro users" },
        { status: 403 }
      );
    }

    if (!user.apolloApiKey) {
      return NextResponse.json(
        { error: "Apollo API key not configured. Please add it in settings." },
        { status: 400 }
      );
    }

    // Get the contact
    const contact = await prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (contact.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Parse contact name into first and last name
    const nameParts = contact.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || firstName;

    if (!contact.company) {
      return NextResponse.json(
        { error: "Contact must have a company to be enriched" },
        { status: 400 }
      );
    }

    // Call Apollo API
    const enrichmentResult = await enrichContact(
      user.apolloApiKey,
      firstName,
      lastName,
      contact.company
    );

    if (!enrichmentResult) {
      return NextResponse.json(
        {
          error: "Contact not found in Apollo database",
          contact: {
            ...contact,
            enrichedAt: null,
          },
        },
        { status: 404 }
      );
    }

    // Update contact with enriched data
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: {
        email: enrichmentResult.email || contact.email,
        title: enrichmentResult.title || contact.title,
        linkedinUrl: enrichmentResult.linkedinUrl || contact.linkedinUrl,
        headline: enrichmentResult.headline,
        photoUrl: enrichmentResult.photoUrl,
        city: enrichmentResult.city,
        state: enrichmentResult.state,
        country: enrichmentResult.country,
        enrichedAt: enrichmentResult.enrichedAt,
      },
    });

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error("Enrichment error:", error);

    if (error instanceof Error) {
      // Handle specific Apollo errors
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: error.message },
          { status: 429 }
        );
      }
      if (error.message.includes("Invalid Apollo API key")) {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to enrich contact" },
      { status: 500 }
    );
  }
}
