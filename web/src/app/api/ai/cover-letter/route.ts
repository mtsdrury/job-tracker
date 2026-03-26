import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Anthropic } from "@anthropic-ai/sdk";
import { generateToneGuidance, type ToneProfile } from "@/lib/tone-quiz";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    // Check billing status and fetch user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        billingStatus: true,
        name: true,
        email: true,
        config: true,
        toneProfile: true,
        writingSamples: true,
        targetRoles: true,
        resumeVersions: {
          select: { id: true, name: true, keywords: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.billingStatus !== "pro") {
      return NextResponse.json(
        { error: "Upgrade to Pro for AI-powered cover letter generation" },
        { status: 403 }
      );
    }

    // Fetch job with resume version
    const job = await prisma.job.findFirst({
      where: { id: jobId, userId: session.user.id },
      select: {
        id: true,
        title: true,
        company: true,
        description: true,
        location: true,
        resumeVersionId: true,
        resumeVersion: {
          select: { name: true, keywords: true, experienceLevel: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured. Please contact support." },
        { status: 503 }
      );
    }

    // Build resume keywords section
    const resumeKeywords = job.resumeVersion?.keywords;
    let keywordsText = "";
    if (resumeKeywords) {
      try {
        const kw = Array.isArray(resumeKeywords)
          ? resumeKeywords
          : typeof resumeKeywords === "object"
            ? Object.values(resumeKeywords as Record<string, unknown>).flat()
            : [];
        if (kw.length > 0) {
          keywordsText = `\nResume Keywords (skills and experience from the user's "${job.resumeVersion?.name || "selected"}" resume):\n${(kw as string[]).join(", ")}\n`;
        }
      } catch {
        // skip if malformed
      }
    }

    // Build tone guidance
    const toneProfile = user.toneProfile as ToneProfile | null;
    let toneGuidance = "";
    if (toneProfile) {
      toneGuidance = `\nCommunication Style Guidelines (based on the user's tone profile):\n${generateToneGuidance(toneProfile)}\n`;
    }

    // Build writing samples section
    let writingSamplesSection = "";
    if (user.writingSamples) {
      try {
        const samples = Array.isArray(user.writingSamples)
          ? user.writingSamples
          : [];
        if (samples.length > 0) {
          const sampleLabels: Record<string, string> = {
            email_reply: "Email Reply",
            story: "Casual Story",
            boss_request: "Professional Response",
          };

          const sampleTexts = samples
            .map((sample: Record<string, string> | unknown) => {
              if (typeof sample === "object" && sample !== null) {
                const s = sample as Record<string, string>;
                const label = sampleLabels[s.promptId] || s.promptId;
                return `[${label}]\n${s.response}`;
              }
              return "";
            })
            .filter(Boolean)
            .join("\n\n");

          if (sampleTexts) {
            writingSamplesSection = `\nHere are examples of how this person actually writes. Use these to match their natural voice, vocabulary choices, and sentence patterns -- but elevate the language to be polished and professional. Discard any typos, slang, or unprofessional phrasing from the samples. Extract only their authentic style:\n\n${sampleTexts}\n`;
          }
        }
      } catch {
        // skip if malformed
      }
    }

    // Build user background
    const config = (user.config as Record<string, unknown>) || {};
    const schools = (config.schools as Array<{ name?: string }>) || [];
    const schoolsText = schools
      .map((s) => s.name)
      .filter(Boolean)
      .join(", ");

    const jobDescription = job.description
      ? job.description.substring(0, 2000)
      : "";

    const experienceLevel = job.resumeVersion?.experienceLevel;
    const systemPrompt = `You are an expert cover letter writer. Your job is to produce a polished, professional cover letter that sounds like it was written by the applicant -- not by AI.

APPLICANT INFORMATION:
- Name: ${user.name || "The applicant"}
- Email: ${user.email || "Not provided"}
${schoolsText ? `- Education: ${schoolsText}` : ""}
${experienceLevel ? `- Experience Level: ${experienceLevel}` : ""}
${user.targetRoles?.length ? `- Target Roles: ${(user.targetRoles as string[]).join(", ")}` : ""}
${keywordsText}

JOB INFORMATION:
- Title: ${job.title}
- Company: ${job.company}
${job.location ? `- Location: ${job.location}` : ""}
${jobDescription ? `- Job Description:\n${jobDescription}` : ""}
${toneGuidance}
${writingSamplesSection}

COVER LETTER REQUIREMENTS:
1. Follow standard professional cover letter format:
   - Opening paragraph: Hook the reader. Mention the specific role and company. Show genuine interest.
   - Body paragraph(s): Connect the applicant's relevant skills and experience to what the job requires. Be specific -- reference actual keywords from the resume and job description.
   - Closing paragraph: Restate enthusiasm, mention availability, thank the reader.
2. Length: 250-400 words. Concise but substantive.
3. Tone: Professional but warm. Should read like a real person wrote it, not a template.
4. DO NOT include the applicant's address, date, or "Dear Hiring Manager" header -- the user will add those themselves. Start directly with the opening paragraph.
5. DO NOT include a sign-off like "Sincerely, [Name]" -- end with the closing paragraph.

CRITICAL RULES:
- NEVER use em dashes (the long dash character). Use commas, periods, or short dashes instead.
- NEVER use phrases like "I am writing to express my interest" or "I believe I would be a great fit" or "I am excited to apply" -- these are AI giveaways.
- NEVER use the word "passion" or "passionate" -- overused and generic.
- DO use specific details from the job description and resume keywords to show genuine alignment.
- DO match the applicant's natural writing voice from the samples above, but keep it professional.
- Write in first person as if the applicant is writing this themselves.`;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Write a cover letter for the ${job.title} position at ${job.company}. Make it specific to this role and company -- not generic.`,
        },
      ],
    });

    if (!message.content.length || message.content[0].type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json({ coverLetter: message.content[0].text });
  } catch (error) {
    console.error("AI cover-letter error:", error);
    let status = 500;
    let msg = "Failed to generate cover letter";
    if (error instanceof Error) {
      if (error.message.includes("rate_limit") || error.message.includes("429")) {
        status = 429;
        msg = "AI service is temporarily busy. Please try again in a moment.";
      } else if (error.message.includes("authentication") || error.message.includes("401")) {
        status = 500;
        msg = "AI service configuration error. Please contact support.";
      }
    }
    return NextResponse.json({ error: msg }, { status });
  }
}
