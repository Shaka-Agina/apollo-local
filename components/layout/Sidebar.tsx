"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";
import { useApplication } from "@/hooks/useApplication";
import { useActiveDownloadCount } from "@/hooks/useTransfers";

export function Sidebar() {
  const pathname = usePathname();
  const { data: app } = useApplication();
  const { data: activeCount = 0 } = useActiveDownloadCount();
  const connected = app?.server?.isConnected ?? false;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col border-r border-edge bg-base pt-[env(safe-area-inset-top)] sm:flex lg:w-52">
      <div className="flex h-16 items-center justify-center border-b border-edge lg:justify-start lg:px-5">
        <span className="font-mono text-sm font-bold tracking-[0.3em] text-primary">
          A<span className="hidden lg:inline">POLLO</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[44px] items-center justify-center gap-3 rounded-lg border-l-2 px-0 lg:justify-start lg:px-4",
                active
                  ? "border-accent bg-hover text-primary"
                  : "border-transparent text-secondary hover:bg-surface hover:text-primary"
              )}
            >
              <span className="relative shrink-0">
                <item.icon className="h-5 w-5" />
                {item.href === "/queue" && activeCount > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] font-bold leading-none text-[var(--bg-base)] lg:hidden">
                    {activeCount > 99 ? "99" : activeCount}
                  </span>
                )}
              </span>
              <span className="hidden min-w-0 flex-1 font-mono text-xs uppercase tracking-widest lg:inline">
                {item.label}
              </span>
              {item.href === "/queue" && activeCount > 0 && (
                <span className="hidden h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[10px] font-bold leading-none text-[var(--bg-base)] lg:flex">
                  {activeCount > 99 ? "99" : activeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-center gap-2 border-t border-edge p-4 lg:justify-start">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            connected ? "bg-accent" : "bg-destructive"
          )}
        />
        <span className="hidden font-mono text-[10px] uppercase tracking-widest text-secondary lg:inline">
          {connected ? "Online" : "Offline"}
        </span>
      </div>
    </aside>
  );
}
