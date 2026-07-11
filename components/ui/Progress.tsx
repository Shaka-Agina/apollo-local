import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
}: {
  value: number; // 0–100
  className?: string;
}) {
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-edge", className)}>
      <div
        className="h-full bg-accent transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
