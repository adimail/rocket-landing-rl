import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "destructive" | "warning" | "outline";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-900",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 border",
    destructive: "bg-red-50 text-red-700 border-red-200 border",
    warning: "bg-amber-50 text-amber-700 border-amber-200 border",
    outline: "border border-slate-200 text-slate-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
