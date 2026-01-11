import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "px-4 py-2 bg-blue text-fg font-mono rounded hover:bg-aqua transition-colors disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
