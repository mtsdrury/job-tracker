/**
 * Next Action Derivation Engine
 *
 * Rules-based engine that determines what the user should do next for each job.
 * Takes into account: outreach state, application status, strategy mode,
 * time thresholds, and interview stage.
 *
 * Returns a NextActionResult with:
 *   - action: short label (displayed as badge)
 *   - detail: longer description (for tooltips / action items)
 *   - urgency: normal | warning | urgent
 *   - category: pre_apply | post_apply | closed
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Urgency = "normal" | "warning" | "urgent";
export type ActionCategory = "pre_apply" | "post_apply" | "closed";

export interface NextActionResult {
  action: string;
  detail: string;
  urgency: Urgency;
  category: ActionCategory;
}

export interface OutreachEventInput {
  id: string;
  status: string;
  statusRank: number;
  lastActionAt: Date | string;
  contact: {
    id: string;
    name: string;
    company?: string | null;
  };
  messageDraft?: string | null;
  followUpAt?: Date | string | null;
}

export interface JobInput {
  id: string;
  company: string;
  title: string;
  applied: boolean;
  appliedAt?: Date | string | null;
  datePosted?: Date | string | null;
  interviewStage?: string | null;
  url?: string | null;
  coverLetter?: string | null;
  coverLetterFileUrl?: string | null;
  resumeVersionId?: string | null;
  nextActionOverride: boolean;
  strategyOverride?: string | null;
  archived: boolean;
  createdAt: Date | string;
  outreachEvents: OutreachEventInput[];
}

export interface UserContext {
  strategyMode: string; // "referral_first" | "speed_first"
  stalledDays: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(from: Date | string, to: Date = new Date()): number {
  const fromDate = typeof from === "string" ? new Date(from) : from;
  return Math.floor((to.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
}

function bestOutreachRank(events: OutreachEventInput[]): number {
  if (events.length === 0) return -999;
  return Math.max(...events.map((e) => e.statusRank));
}

function activeEvents(events: OutreachEventInput[]): OutreachEventInput[] {
  return events.filter((e) => e.statusRank >= 0);
}

function stalledEvents(
  events: OutreachEventInput[],
  stalledDays: number
): OutreachEventInput[] {
  return events.filter((e) => {
    if (e.statusRank < 2) return false; // only stall checks for sent+
    if (e.statusRank >= 3) return false; // responded+ aren't stalled
    const days = daysBetween(e.lastActionAt);
    return days >= stalledDays;
  });
}

function highestActiveEvent(
  events: OutreachEventInput[]
): OutreachEventInput | null {
  const active = activeEvents(events);
  if (active.length === 0) return null;
  return active.reduce((best, e) =>
    e.statusRank > best.statusRank ? e : best
  );
}

// ---------------------------------------------------------------------------
// Main derivation function
// ---------------------------------------------------------------------------

export function deriveNextAction(
  job: JobInput,
  user: UserContext,
  now: Date = new Date()
): NextActionResult {
  const strategy = job.strategyOverride || user.strategyMode;
  const stalledThreshold = user.stalledDays;
  const events = job.outreachEvents;
  const active = activeEvents(events);
  const best = bestOutreachRank(events);
  const topEvent = highestActiveEvent(events);

  // -------------------------------------------------------------------------
  // CLOSED jobs (archived, rejected, withdrawn, accepted)
  // -------------------------------------------------------------------------
  if (job.archived) {
    return {
      action: "Archived",
      detail: "This job has been archived",
      urgency: "normal",
      category: "closed",
    };
  }

  if (
    job.interviewStage === "rejected" ||
    job.interviewStage === "withdrawn"
  ) {
    return {
      action: job.interviewStage === "rejected" ? "Rejected" : "Withdrawn",
      detail: `This application was ${job.interviewStage}`,
      urgency: "normal",
      category: "closed",
    };
  }

  if (job.interviewStage === "accepted") {
    return {
      action: "Accepted!",
      detail: "Congratulations! You accepted this offer!",
      urgency: "normal",
      category: "closed",
    };
  }

  // -------------------------------------------------------------------------
  // POST-APPLICATION (applied = true)
  // -------------------------------------------------------------------------
  if (job.applied) {
    // Offer stage
    if (job.interviewStage === "offer") {
      return {
        action: "Review offer",
        detail: `You have an offer from ${job.company}! Time to evaluate.`,
        urgency: "normal",
        category: "post_apply",
      };
    }

    // Actively interviewing
    if (job.interviewStage === "interviewing") {
      return {
        action: "Interviewing",
        detail: `You're in the interview process with ${job.company}`,
        urgency: "normal",
        category: "post_apply",
      };
    }

    // Applied but no interview stage; check for staleness
    if (job.appliedAt) {
      const daysSince = daysBetween(job.appliedAt, now);

      if (daysSince > 28) {
        return {
          action: "Follow up",
          detail: `Applied ${daysSince} days ago with no response. Consider following up or moving on.`,
          urgency: "urgent",
          category: "post_apply",
        };
      }

      if (daysSince > 14) {
        return {
          action: "Follow up",
          detail: `Applied ${daysSince} days ago. A polite follow-up might help.`,
          urgency: "warning",
          category: "post_apply",
        };
      }
    }

    // Recently applied, waiting
    return {
      action: "Waiting",
      detail: `Application submitted to ${job.company}. Hang tight.`,
      urgency: "normal",
      category: "post_apply",
    };
  }

  // -------------------------------------------------------------------------
  // PRE-APPLICATION (applied = false)
  // -------------------------------------------------------------------------

  // --- No outreach events at all ---
  if (events.length === 0) {
    if (strategy === "speed_first") {
      return {
        action: "Apply or find referral",
        detail: `New job at ${job.company}. Apply quickly or find a connection first.`,
        urgency: "normal",
        category: "pre_apply",
      };
    }
    return {
      action: "Find referral",
      detail: `Search for a connection at ${job.company} to get a warm introduction.`,
      urgency: "normal",
      category: "pre_apply",
    };
  }

  // --- All outreach is dead (no_response / declined only) ---
  if (active.length === 0) {
    if (strategy === "speed_first") {
      return {
        action: "Apply now",
        detail: `All contacts at ${job.company} are unresponsive. Apply directly.`,
        urgency: "warning",
        category: "pre_apply",
      };
    }
    return {
      action: "Find another referral",
      detail: `Previous contacts at ${job.company} didn't pan out. Try someone else or apply directly.`,
      urgency: "warning",
      category: "pre_apply",
    };
  }

  // --- Referral submitted → time to apply ---
  if (best >= 7) {
    return {
      action: "Apply now",
      detail: `A referral has been submitted at ${job.company}. Apply while it's warm!`,
      urgency: "urgent",
      category: "pre_apply",
    };
  }

  // --- Referral secured → apply or wait for submission ---
  if (best >= 6) {
    return {
      action: "Apply (referral secured)",
      detail: `${topEvent?.contact.name} secured your referral at ${job.company}. Apply and confirm submission.`,
      urgency: "warning",
      category: "pre_apply",
    };
  }

  // --- Referral requested or sharing internally → wait ---
  if (best >= 4) {
    const topName = topEvent?.contact.name || "Your contact";
    const daysSince = topEvent ? daysBetween(topEvent.lastActionAt, now) : 0;

    if (daysSince >= stalledThreshold + 4) {
      return {
        action: "Follow up",
        detail: `${topName} at ${job.company} has been sharing internally for ${daysSince} days. Follow up.`,
        urgency: "urgent",
        category: "pre_apply",
      };
    }
    if (daysSince >= stalledThreshold) {
      return {
        action: "Check in",
        detail: `${topName} at ${job.company} is working on your referral. It's been ${daysSince} days, so a gentle check-in might help.`,
        urgency: "warning",
        category: "pre_apply",
      };
    }
    return {
      action: "Referral in progress",
      detail: `${topName} at ${job.company} is working on your referral. Sit tight.`,
      urgency: "normal",
      category: "pre_apply",
    };
  }

  // --- Responded (rank 3) → ask for referral ---
  if (best >= 3) {
    return {
      action: "Ask for referral",
      detail: `${topEvent?.contact.name} at ${job.company} responded! Ask if they can refer you.`,
      urgency: "warning",
      category: "pre_apply",
    };
  }

  // --- Message sent (rank 2) → waiting / follow up ---
  if (best >= 2) {
    const sentEvents = events.filter((e) => e.status === "message_sent");
    const oldestSent = sentEvents.reduce((oldest, e) => {
      const d = daysBetween(e.lastActionAt, now);
      return d > oldest.days ? { event: e, days: d } : oldest;
    }, { event: sentEvents[0], days: daysBetween(sentEvents[0].lastActionAt, now) });

    if (oldestSent.days >= stalledThreshold + 4) {
      // In speed mode, suggest applying; in referral mode, suggest follow-up
      if (strategy === "speed_first") {
        return {
          action: "Apply now",
          detail: `No response from ${oldestSent.event.contact.name} at ${job.company} after ${oldestSent.days} days. Apply directly.`,
          urgency: "urgent",
          category: "pre_apply",
        };
      }
      return {
        action: "Follow up or apply",
        detail: `${oldestSent.event.contact.name} at ${job.company} hasn't responded in ${oldestSent.days} days. Follow up or apply directly.`,
        urgency: "urgent",
        category: "pre_apply",
      };
    }

    if (oldestSent.days >= stalledThreshold) {
      return {
        action: "Follow up",
        detail: `It's been ${oldestSent.days} days since you messaged ${oldestSent.event.contact.name}. Send a follow-up.`,
        urgency: "warning",
        category: "pre_apply",
      };
    }

    return {
      action: "Waiting on reply",
      detail: `Message sent to ${oldestSent.event.contact.name} at ${job.company}. Give it a few days.`,
      urgency: "normal",
      category: "pre_apply",
    };
  }

  // --- Message drafted (rank 1) → send it ---
  if (best >= 1) {
    const draftedEvent = events.find((e) => e.status === "message_drafted");
    return {
      action: "Send message",
      detail: `Your message to ${draftedEvent?.contact.name || "a contact"} at ${job.company} is drafted. Time to send it!`,
      urgency: "warning",
      category: "pre_apply",
    };
  }

  // --- Identified only (rank 0) → draft a message ---
  return {
    action: "Draft message",
    detail: `You've identified contacts at ${job.company} but haven't drafted a message yet.`,
    urgency: "warning",
    category: "pre_apply",
  };
}

// ---------------------------------------------------------------------------
// Bulk derivation (for dashboard / list views)
// ---------------------------------------------------------------------------

export function deriveNextActions(
  jobs: JobInput[],
  user: UserContext,
  now: Date = new Date()
): Map<string, NextActionResult> {
  const results = new Map<string, NextActionResult>();
  for (const job of jobs) {
    if (!job.nextActionOverride) {
      results.set(job.id, deriveNextAction(job, user, now));
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Nudge generation (replaces inline dashboard logic)
// ---------------------------------------------------------------------------

export interface Nudge {
  message: string;
  urgency: Urgency;
  jobId: string;
  action: string;
}

export function generateNudges(
  jobs: JobInput[],
  user: UserContext,
  now: Date = new Date()
): Nudge[] {
  const nudges: Nudge[] = [];

  for (const job of jobs) {
    if (job.archived) continue;
    if (job.interviewStage === "rejected" || job.interviewStage === "withdrawn") continue;

    const result = deriveNextAction(job, user, now);

    // Only create nudges for non-normal urgency or certain key actions
    if (result.urgency !== "normal") {
      nudges.push({
        message: result.detail,
        urgency: result.urgency,
        jobId: job.id,
        action: result.action,
      });
    }

    // Also nudge for posting age (separate from the main action flow)
    if (job.datePosted && !job.applied) {
      const daysSincePosted = daysBetween(job.datePosted, now);
      if (daysSincePosted > 21) {
        nudges.push({
          message: `${job.company}: ${job.title} was posted ${daysSincePosted} days ago. This posting may expire soon.`,
          urgency: "urgent",
          jobId: job.id,
          action: "Old posting",
        });
      } else if (daysSincePosted > 10) {
        nudges.push({
          message: `${job.company}: ${job.title} was posted ${daysSincePosted} days ago.`,
          urgency: "warning",
          jobId: job.id,
          action: "Aging posting",
        });
      }
    }

    // Missing URL nudge
    if (!job.url && !job.applied) {
      nudges.push({
        message: `${job.company}: ${job.title} has no job URL saved.`,
        urgency: "normal",
        jobId: job.id,
        action: "Add URL",
      });
    }
  }

  // Sort: urgent first, then warning, then normal
  const urgencyOrder = { urgent: 0, warning: 1, normal: 2 };
  nudges.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return nudges;
}
