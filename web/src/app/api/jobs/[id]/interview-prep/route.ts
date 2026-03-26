import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Anthropic } from "@anthropic-ai/sdk";

interface PrepQuestion {
  question: string;
  category: "behavioral" | "technical" | "company" | "ask_interviewer";
}

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

    // Check billing status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { billingStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.billingStatus !== "pro") {
      return NextResponse.json(
        {
          error: "Upgrade to Pro for AI-generated interview prep questions",
        },
        { status: 403 }
      );
    }

    // Fetch job details
    const job = await prisma.job.findFirst({
      where: { id, userId: session.user.id },
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

    // Check if API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured. Please contact support." },
        { status: 503 }
      );
    }

    // Prepare system prompt
    const descriptionSnippet = job.description
      ? job.description.substring(0, 800)
      : "";

    const systemPrompt = `You are a career coach specializing in interview preparation. Generate 8-10 thoughtful interview preparation questions for a candidate interviewing at ${job.company} for the ${job.title} role.

Mix behavioral, technical, and company-specific questions. Include 2-3 questions the candidate should ask the interviewer.

Format your response as a JSON array of objects with the following structure:
[
  {
    "question": "the question text",
    "category": "behavioral" or "technical" or "company" or "ask_interviewer"
  },
  ...
]

CRITICAL RULE: Never use em dashes (the long dash character) in questions. Use commas, periods, or short dashes instead.

Only respond with valid JSON, no other text.`;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate interview prep questions for a ${job.title} position at ${job.company}.${descriptionSnippet ? ` Job description excerpt: ${descriptionSnippet}` : ""}`,
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

    // Parse the JSON response
    let questions: PrepQuestion[];
    try {
      questions = JSON.parse(content.text);
    } catch {
      console.error("Failed to parse interview prep questions JSON:", content.text);
      return NextResponse.json(
        { error: "Failed to parse generated questions" },
        { status: 500 }
      );
    }

    // Store the questions in the Interview model's prepNotes field
    // First, check if there's an interview record for this job
    let interview = await prisma.interview.findFirst({
      where: { jobId: job.id, userId: session.user.id },
    });

    // If no interview exists, create one
    if (!interview) {
      interview = await prisma.interview.create({
        data: {
          jobId: job.id,
          userId: session.user.id,
          stage: "phone_screen",
          prepNotes: JSON.stringify(questions),
        },
      });
    } else {
      // Update the existing interview with the prep notes
      interview = await prisma.interview.update({
        where: { id: interview.id },
        data: { prepNotes: JSON.stringify(questions) },
      });
    }

    return NextResponse.json({ questions, interviewId: interview.id });
  } catch (error) {
    console.error("Interview prep generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate interview prep questions" },
      { status: 500 }
    );
  }
}
