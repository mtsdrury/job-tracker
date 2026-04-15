import { clsx } from "clsx";
import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-hover text-foreground border border-border",
  success: "bg-gradient-to-r from-success/15 to-success/5 text-success border border-success/25",
  warning: "bg-gradient-to-r from-warning/15 to-warning/5 text-warning border border-warning/25",
  danger: "bg-gradient-to-r from-danger/15 to-danger/5 text-danger border border-danger/25",
  info: "bg-gradient-to-r from-accent/15 to-accent/5 text-accent border border-accent/25",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
