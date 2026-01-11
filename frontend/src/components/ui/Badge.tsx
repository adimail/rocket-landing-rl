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
    success: "bg-yellow-400 text-black border-yellow-500 border",
    destructive: "bg-red-500 text-white border-red-600 border",
    warning: "bg-yellow-200 text-yellow-800 border-yellow-300 border",
    outline: "border border-yellow-400 text-yellow-600",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase cursor-pointer",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
