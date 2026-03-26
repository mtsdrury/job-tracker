/**
 * Client-safe notification utility functions.
 * These do NOT import prisma or any server-only modules.
 */

/**
 * Get formatted time difference for display
 */
export function getTimeAgoString(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks}w ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Get icon type based on notification type
 */
export function getNotificationIcon(type: string) {
  switch (type) {
    case "interview_tomorrow":
      return "calendar";
    case "stalled_job":
      return "alert-circle";
    case "follow_up_due":
      return "send";
    case "referral_responded":
      return "message-circle";
    case "outreach_reminder":
      return "bell";
    default:
      return "info";
  }
}

/**
 * Get color variant based on notification type
 */
export function getNotificationVariant(
  type: string
): "success" | "warning" | "info" | "error" {
  switch (type) {
    case "referral_responded":
      return "success";
    case "interview_tomorrow":
      return "info";
    case "stalled_job":
      return "warning";
    case "follow_up_due":
      return "warning";
    default:
      return "info";
  }
}
