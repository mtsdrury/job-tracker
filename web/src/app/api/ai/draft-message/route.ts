import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Anthropic } from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId, contactId, templateId } = await req.json();

    if (!jobId || !contactId) {
      return NextResponse.json(
        { error: "jobId and contactId are required" },
        { status: 400 }
      );
    }

    // Check billing status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { billingStatus: true, name: true, config: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.billingStatus !== "pro") {
      return NextResponse.json(
        { error: "Upgrade to Pro for AI-powered drafting" },
        { status: 403 }
      );
    }

    // Fetch job details
    const job = await prisma.job.findFirst({
      where: { id: jobId, userId: session.user.id },
      select: {
        id: true,
        title: true,
        company: true,
        description: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch contact details
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId: session.user.id },
      select: {
        id: true,
        name: true,
        title: true,
        company: true,
        connectionType: true,
        school: true,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Fetch template if provided (for style reference)
    let templateBody: string | null = null;
    if (templateId) {
      const template = await prisma.messageTemplate.findFirst({
        where: { id: templateId, userId: session.user.id },
        select: { body: true },
      });
      templateBody = template?.body || null;
    }

    // Build user profile from config
    const config = (user.config as Record<string, unknown>) || {};
    const schools = (config.schools as Array<{ name?: string }>) || [];
    const connections = (config.connections as Array<{ label?: string; line?: string }>) || [];

    // Check for ANTHROPIC_API_KEY
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured. Please contact support." },
        { status: 503 }
      );
    }

    // Prepare system prompt
    const jobDescriptionPreview = job.description
      ? job.description.substring(0, 500)
      : "";

    const schoolsText = schools
      .map((s) => s.name)
      .filter(Boolean)
      .join(", ");
    const connectionsText = connections
      .map((c) => `${c.label}: "${c.line}"`)
      .join("\n");

    const systemPrompt = `You are an expert at writing personalized LinkedIn and email outreach messages for job referrals.

Job Information:
- Title: ${job.title}
- Company: ${job.company}
${jobDescriptionPreview ? `- Description (excerpt): ${jobDescriptionPreview}` : ""}

Contact Information:
- Name: ${contact.name}
- Title: ${contact.title || "Not specified"}
- Company: ${contact.company || "Not specified"}
- Connection Type: ${contact.connectionType}
${contact.school ? `- School: ${contact.school}` : ""}

User Profile:
- Name: ${user.name}
${schoolsText ? `- Schools: ${schoolsText}` : ""}
- Configured Connections:
${connectionsText || "No configured connections"}

${templateBody ? `Style Reference (use this as guidance for tone and structure):\n${templateBody}` : ""}

Write a personalized LinkedIn or email outreach message that:
1. Is brief (3-5 sentences)
2. Is genuine and not salesy
3. References their shared connection if applicable
4. Mentions the specific role naturally
5. Asks for a brief conversation or advice

Do not include placeholders like {first_name} or {company}. Write the message with actual values filled in.`;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate a personalized outreach message for ${contact.name} at ${contact.company || "their company"} about the ${job.title} role at ${job.company}.`,
        },
      ],
    });

    // Extract the message content
    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: content.text });
  } catch (error) {
    console.error("AI draft-message error:", error);
    return NextResponse.json(
      { error: "Failed to generate message" },
      { status: 500 }
    );
  }
}
