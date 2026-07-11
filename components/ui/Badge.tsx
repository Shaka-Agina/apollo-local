import { cn } from "@/lib/utils";

type Tone = "default" | "active" | "muted" | "destructive";

const toneClasses: Record<Tone, string> = {
  default: "border-edge text-secondary",
  active: "border-accent text-primary",
  muted: "border-edge text-muted",
  destructive: "border-destructive text-destructive",
};

export function Badge({
  tone = "default",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
