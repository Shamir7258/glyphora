import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const WIZARD_STEPS = ["Files", "Details", "Preview", "Pricing", "License", "Review"] as const;

export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:gap-2">
      {WIZARD_STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                done && "border-primary bg-primary text-primary-foreground",
                active && !done && "border-primary text-primary",
                !active && !done && "border-border text-muted-foreground"
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span className={cn("text-sm whitespace-nowrap", active ? "font-medium text-foreground" : "text-muted-foreground")}>
              {label}
            </span>
            {i < WIZARD_STEPS.length - 1 && <div className="mx-1 h-px w-4 bg-border sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}
