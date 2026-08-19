import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-2 border-[var(--line)] bg-[var(--paper)] hard-shadow-sm",
        className
      )}
      {...props}
    />
  );
}
