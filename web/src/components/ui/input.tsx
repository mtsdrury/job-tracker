import { clsx } from "clsx";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-widest text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            "w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent focus:shadow-lg focus:shadow-accent-glow",
            error ? "border-danger" : "border-border hover:border-border-hover",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
