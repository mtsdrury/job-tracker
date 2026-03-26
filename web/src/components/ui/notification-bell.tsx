"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { clsx } from "clsx";
import { getTimeAgoString, getNotificationIcon } from "@/lib/notification-utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  jobId: string | null;
  createdAt: string;
  job?: {
    id: string;
    title: string;
    company: string;
  } | null;
  data?: Record<string, unknown> | null;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  // Generate notifications on mount and fetch
  useEffect(() => {
    const generateAndFetch = async () => {
      try {
        // Generate new notifications based on current pipeline state
        const generateRes = await fetch("/api/notifications/generate", {
          method: "POST",
        });
        if (!generateRes.ok && generateRes.status !== 404) {
          console.error("Failed to generate notifications:", generateRes.status);
        }
      } catch (error) {
        console.error("Failed to generate notifications:", error);
      }

      // Always fetch notifications, even if generation fails
      await fetchNotifications();
    };

    generateAndFetch();
  }, []);

  // Poll for new notifications every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Handle marking notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Handle marking all as read
  const handleMarkAllAsRead = async () => {
    try {
      setIsLoading(true);
      await fetch("/api/notifications/read-all", { method: "POST" });
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clicking on a notification
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    if (notification.jobId) {
      router.push(`/jobs/${notification.jobId}`);
      setIsOpen(false);
    }
  };

  // Group notifications by date
  const groupedNotifications = {
    today: [] as Notification[],
    earlier: [] as Notification[],
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const notif of notifications) {
    const notifDate = new Date(notif.createdAt);
    notifDate.setHours(0, 0, 0, 0);

    if (notifDate.getTime() === today.getTime()) {
      groupedNotifications.today.push(notif);
    } else {
      groupedNotifications.earlier.push(notif);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted hover:text-foreground transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1 -translate-y-1 bg-danger rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[500px] overflow-hidden rounded-lg border border-border bg-background shadow-lg z-50 flex flex-col">
          {/* Header */}
          <div className="border-b border-border px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isLoading}
                className="text-xs font-medium text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Marking..." : "Mark all as read"}
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted text-sm">
                No notifications yet
              </div>
            ) : (
              <>
                {/* Today */}
                {groupedNotifications.today.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-muted bg-surface/50 sticky top-0">
                      Today
                    </div>
                    {groupedNotifications.today.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notification={notif}
                        onClick={() => handleNotificationClick(notif)}
                      />
                    ))}
                  </div>
                )}

                {/* Earlier */}
                {groupedNotifications.earlier.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-muted bg-surface/50 sticky top-10">
                      Earlier
                    </div>
                    {groupedNotifications.earlier.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notification={notif}
                        onClick={() => handleNotificationClick(notif)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const Icon = getIconComponent(getNotificationIcon(notification.type));
  const timeAgo = getTimeAgoString(new Date(notification.createdAt));

  const bgClass = notification.read ? "bg-transparent" : "bg-accent/5";
  const borderClass = notification.read ? "border-transparent" : "border-accent/20";

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left px-4 py-3 border-b border-border hover:bg-surface transition-colors",
        bgClass,
        "focus:outline-none focus:ring-2 focus:ring-accent/50"
      )}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-1">
          <Icon className={clsx(
            "h-4 w-4",
            notification.read ? "text-muted" : "text-accent"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={clsx(
              "text-sm font-medium leading-tight",
              notification.read ? "text-muted" : "text-foreground"
            )}>
              {notification.title}
            </p>
            {!notification.read && (
              <span className="flex-shrink-0 mt-0.5 h-2 w-2 rounded-full bg-accent" />
            )}
          </div>
          <p className="text-xs text-muted leading-tight mt-1">
            {notification.message}
          </p>
          <p className="text-xs text-muted/60 mt-1.5">
            {timeAgo}
          </p>
        </div>
      </div>
    </button>
  );
}

function getIconComponent(iconType: string) {
  // Using basic icons from lucide; these would be imported individually in a real app
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    calendar: (props) => (
      <svg
        {...props}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    "alert-circle": (props) => (
      <svg
        {...props}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    send: (props) => (
      <svg
        {...props}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
        />
      </svg>
    ),
    "message-circle": (props) => (
      <svg
        {...props}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
    bell: (props) => (
      <svg
        {...props}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
    info: (props) => (
      <svg
        {...props}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return icons[iconType] || icons.info;
}
