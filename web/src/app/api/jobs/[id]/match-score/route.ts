import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

interface MatchScoreRequest {
  resumeVersionId: string;
}

interface MatchScoreResponse {
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const body = (await req.json()) as MatchScoreRequest;
    const { resumeVersionId } = body;

    if (!resumeVersionId) {
      return new Response(
        JSON.stringify({ error: "resumeVersionId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check billing status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { billingStatus: true },
    });

    if (!user || user.billingStatus !== "pro") {
      return new Response(
        JSON.stringify({
          error: "This feature requires a Pro subscription. Please upgrade to unlock AI-powered resume matching.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch the job
    const job = await prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        company: true,
        description: true,
        notes: true,
        userId: true,
      },
    });

    if (!job || job.userId !== session.user.id) {
      return new Response("Job not found", { status: 404 });
    }

    if (!job.description) {
      return new Response(
        JSON.stringify({
          error: "This job does not have a description. Save a job from Job Search to get AI match analysis.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch the resume version
    const resumeVersion = await prisma.resumeVersion.findUnique({
      where: { id: resumeVersionId },
      select: {
        id: true,
        name: true,
        content: true,
        fileUrl: true,
        keywords: true,
        userId: true,
      },
    });

    if (!resumeVersion || resumeVersion.userId !== session.user.id) {
      return new Response("Resume version not found", { status: 404 });
    }

    // Get resume text
    let resumeText = "";

    if (resumeVersion.fileUrl) {
      try {
        resumeText = await extractTextFromPdf(resumeVersion.fileUrl);
      } catch (error) {
        console.error("Failed to extract PDF:", error);
        // Fallback to content or keywords
        if (resumeVersion.content) {
          resumeText = resumeVersion.content;
        } else if (resumeVersion.keywords) {
          const keywords = Array.isArray(resumeVersion.keywords)
            ? resumeVersion.keywords
            : typeof resumeVersion.keywords === "string"
              ? JSON.parse(resumeVersion.keywords)
              : [];
          resumeText = keywords.join(" ");
        }
      }
    } else if (resumeVersion.content) {
      resumeText = resumeVersion.content;
    } else if (resumeVersion.keywords) {
      const keywords = Array.isArray(resumeVersion.keywords)
        ? resumeVersion.keywords
        : typeof resumeVersion.keywords === "string"
          ? JSON.parse(resumeVersion.keywords)
          : [];
      resumeText = keywords.join(" ");
    }

    if (!resumeText) {
      return new Response(
        JSON.stringify({
          error: "Could not extract text from resume. Please ensure the resume PDF is readable.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call Claude to analyze the match
    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a professional recruiter evaluating resume-to-job fit. Analyze how well this candidate's resume matches the job description.

JOB DESCRIPTION:
Title: ${job.title}
Company: ${job.company}
Description:
${job.description}

RESUME:
${resumeText}

Provide your analysis in JSON format with these exact fields:
{
  "score": <number 0-100>,
  "verdict": "<one-line verdict, e.g. 'Strong match, consider highlighting your Python experience'>",
  "strengths": [<list of 3-5 key strengths as candidate for this role>],
  "gaps": [<list of 3-5 gaps or missing skills>],
  "suggestions": [<list of 3-5 concrete things candidate can do to improve fit>]
}

Return ONLY valid JSON, no other text.`,
        },
      ],
    });

    // Parse Claude's response
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    let matchData: MatchScoreResponse;
    try {
      matchData = JSON.parse(content.text);
    } catch (error) {
      console.error("Failed to parse Claude response:", content.text);
      throw new Error("Failed to parse match score from Claude");
    }

    // Validate response structure
    if (
      typeof matchData.score !== "number" ||
      typeof matchData.verdict !== "string" ||
      !Array.isArray(matchData.strengths) ||
      !Array.isArray(matchData.gaps) ||
      !Array.isArray(matchData.suggestions)
    ) {
      throw new Error("Invalid match score response structure");
    }

    // Clamp score to 0-100
    matchData.score = Math.max(0, Math.min(100, Math.round(matchData.score)));

    return new Response(JSON.stringify(matchData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Match score API error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
