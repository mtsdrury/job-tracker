import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, email not sent");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: "KnowSomeone <noreply@knowsomeone.com>",
      to,
      subject,
      html,
    });

    return { success: !result.error, error: result.error };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error: String(error) };
  }
}

export interface DigestData {
  weekStart: Date;
  weekEnd: Date;
  jobsAdded: {
    count: number;
    items: Array<{ company: string; title: string }>;
  };
  jobsApplied: {
    count: number;
    items: Array<{ company: string; title: string }>;
  };
  outreachEvents: {
    count: number;
    items: Array<{
      company: string;
      role: string;
      contact: string;
      status: string;
      updatedAt: Date;
    }>;
  };
  upcomingInterviews: {
    count: number;
    items: Array<{
      company: string;
      title: string;
      stage: string;
      scheduledAt: Date;
    }>;
  };
  stalledJobs: {
    count: number;
    items: Array<{ company: string; title: string; daysSinceUpdate: number }>;
  };
  pipelineSummary: {
    totalActive: number;
    totalApplied: number;
    totalInterviewing: number;
    totalOffers: number;
  };
}

function generateDigestHtml(userName: string, data: DigestData): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f9fafb;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 32px 24px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 8px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
          }
          .content {
            padding: 32px 24px;
          }
          .greeting {
            font-size: 16px;
            margin-bottom: 24px;
            color: #333;
          }
          .section {
            margin-bottom: 32px;
          }
          .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #667eea;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #f0f0f0;
          }
          .metric-box {
            background-color: #f9fafb;
            border-left: 4px solid #667eea;
            padding: 12px 16px;
            margin-bottom: 12px;
            border-radius: 4px;
          }
          .metric-number {
            font-size: 24px;
            font-weight: 700;
            color: #667eea;
          }
          .metric-label {
            font-size: 14px;
            color: #666;
            margin-top: 4px;
          }
          .job-item {
            padding: 12px;
            background-color: #f9fafb;
            border-left: 3px solid #667eea;
            margin-bottom: 8px;
            border-radius: 4px;
          }
          .job-company {
            font-weight: 600;
            color: #333;
            font-size: 14px;
          }
          .job-title {
            font-size: 13px;
            color: #666;
            margin-top: 2px;
          }
          .outreach-item {
            padding: 12px;
            background-color: #f9fafb;
            border-left: 3px solid #764ba2;
            margin-bottom: 8px;
            border-radius: 4px;
          }
          .outreach-company {
            font-weight: 600;
            color: #333;
            font-size: 14px;
          }
          .outreach-contact {
            font-size: 13px;
            color: #666;
            margin-top: 2px;
          }
          .status-badge {
            display: inline-block;
            font-size: 11px;
            padding: 2px 8px;
            border-radius: 12px;
            margin-top: 4px;
            background-color: #e9ecef;
            color: #333;
          }
          .interview-item {
            padding: 12px;
            background-color: #fff8e1;
            border-left: 3px solid #ffc107;
            margin-bottom: 8px;
            border-radius: 4px;
          }
          .interview-company {
            font-weight: 600;
            color: #333;
            font-size: 14px;
          }
          .interview-date {
            font-size: 13px;
            color: #666;
            margin-top: 2px;
          }
          .stalled-item {
            padding: 12px;
            background-color: #fce8e6;
            border-left: 3px solid #ea4335;
            margin-bottom: 8px;
            border-radius: 4px;
          }
          .stalled-company {
            font-weight: 600;
            color: #333;
            font-size: 14px;
          }
          .stalled-days {
            font-size: 13px;
            color: #d32f2f;
            margin-top: 2px;
            font-weight: 500;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 24px;
          }
          .summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px;
            border-radius: 6px;
            text-align: center;
          }
          .summary-card.secondary {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          .summary-number {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .summary-label {
            font-size: 12px;
            opacity: 0.9;
          }
          .empty-state {
            padding: 16px;
            background-color: #f9fafb;
            border-radius: 4px;
            text-align: center;
            color: #999;
            font-size: 14px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 32px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            margin: 24px 0;
            text-align: center;
          }
          .footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer-text {
            font-size: 12px;
            color: #666;
            margin-bottom: 12px;
          }
          .unsubscribe {
            font-size: 11px;
            color: #999;
          }
          .unsubscribe a {
            color: #667eea;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>KnowSomeone</h1>
            <p>Your Week in Review</p>
          </div>

          <div class="content">
            <div class="greeting">
              Hi ${escapeHtml(userName)},
            </div>

            <p>Here's a summary of your job search activity this week (${formatDate(data.weekStart)} to ${formatDate(data.weekEnd)}).</p>

            <!-- Pipeline Snapshot -->
            <div class="section">
              <div class="section-title">Pipeline Snapshot</div>
              <div class="summary-grid">
                <div class="summary-card">
                  <div class="summary-number">${data.pipelineSummary.totalActive}</div>
                  <div class="summary-label">Active</div>
                </div>
                <div class="summary-card secondary">
                  <div class="summary-number">${data.pipelineSummary.totalApplied}</div>
                  <div class="summary-label">Applied</div>
                </div>
                <div class="summary-card">
                  <div class="summary-number">${data.pipelineSummary.totalInterviewing}</div>
                  <div class="summary-label">Interviewing</div>
                </div>
                <div class="summary-card secondary">
                  <div class="summary-number">${data.pipelineSummary.totalOffers}</div>
                  <div class="summary-label">Offers</div>
                </div>
              </div>
            </div>

            <!-- New Jobs Added -->
            ${
              data.jobsAdded.count > 0
                ? `
              <div class="section">
                <div class="section-title">New Jobs Added (${data.jobsAdded.count})</div>
                ${data.jobsAdded.items.map((job) => `
                  <div class="job-item">
                    <div class="job-company">${escapeHtml(job.company)}</div>
                    <div class="job-title">${escapeHtml(job.title)}</div>
                  </div>
                `).join("")}
              </div>
            `
                : ""
            }

            <!-- Jobs Applied This Week -->
            ${
              data.jobsApplied.count > 0
                ? `
              <div class="section">
                <div class="section-title">Jobs Applied (${data.jobsApplied.count})</div>
                ${data.jobsApplied.items.map((job) => `
                  <div class="job-item">
                    <div class="job-company">${escapeHtml(job.company)}</div>
                    <div class="job-title">${escapeHtml(job.title)}</div>
                  </div>
                `).join("")}
              </div>
            `
                : ""
            }

            <!-- Outreach Events -->
            ${
              data.outreachEvents.count > 0
                ? `
              <div class="section">
                <div class="section-title">Outreach Updates (${data.outreachEvents.count})</div>
                ${data.outreachEvents.items.map((event) => `
                  <div class="outreach-item">
                    <div class="outreach-company">${escapeHtml(event.company)}</div>
                    <div class="outreach-contact">with ${escapeHtml(event.contact)}</div>
                    <div class="status-badge">${escapeHtml(event.status)}</div>
                  </div>
                `).join("")}
              </div>
            `
                : ""
            }

            <!-- Upcoming Interviews -->
            ${
              data.upcomingInterviews.count > 0
                ? `
              <div class="section">
                <div class="section-title">Upcoming Interviews (${data.upcomingInterviews.count})</div>
                ${data.upcomingInterviews.items.map((interview) => `
                  <div class="interview-item">
                    <div class="interview-company">${escapeHtml(interview.company)}</div>
                    <div class="interview-date">${formatDate(interview.scheduledAt)} | ${escapeHtml(interview.stage)}</div>
                  </div>
                `).join("")}
              </div>
            `
                : ""
            }

            <!-- Stalled Jobs -->
            ${
              data.stalledJobs.count > 0
                ? `
              <div class="section">
                <div class="section-title">Action Needed (${data.stalledJobs.count})</div>
                <p style="font-size: 13px; color: #666; margin-bottom: 12px;">These jobs haven't had activity in ${data.stalledJobs.items[0]?.daysSinceUpdate || 5} days. Consider following up.</p>
                ${data.stalledJobs.items.map((job) => `
                  <div class="stalled-item">
                    <div class="stalled-company">${escapeHtml(job.company)}</div>
                    <div class="stalled-days">${job.daysSinceUpdate} days without activity</div>
                  </div>
                `).join("")}
              </div>
            `
                : ""
            }

            <div style="text-align: center; margin-top: 32px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://knowsomeone.com"}/dashboard" class="cta-button">
                Open KnowSomeone
              </a>
            </div>
          </div>

          <div class="footer">
            <div class="footer-text">
              You're receiving this because you're signed up for weekly digests on KnowSomeone.
            </div>
            <div class="unsubscribe">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://knowsomeone.com"}/settings">Manage email preferences</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export async function sendDigestEmail(userName: string, email: string, data: DigestData) {
  const subject = `Your Job Search Week in Review (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
  const html = generateDigestHtml(userName, data);
  return sendEmail(email, subject, html);
}
