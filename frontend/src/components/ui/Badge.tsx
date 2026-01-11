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
    default: "bg-slate-800 text-slate-300 border border-slate-700",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border",
    destructive: "bg-red-500/10 text-red-400 border-red-500/20 border",
    warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 border",
    outline: "border border-slate-700 text-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
