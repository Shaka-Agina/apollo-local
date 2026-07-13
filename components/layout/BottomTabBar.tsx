"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";
import { useActiveDownloadCount } from "@/hooks/useTransfers";
import { usePlayerChrome } from "@/components/prefs/PlayerChromeProvider";
import { useUiPrefs } from "@/components/prefs/UiPrefsProvider";

export function BottomTabBar() {
  const pathname = usePathname();
  const { data: activeCount = 0 } = useActiveDownloadCount();
  const { expanded, artFocus } = usePlayerChrome();
  const { prefs } = useUiPrefs();

  if (expanded && artFocus && prefs.focusHideTabBar) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-base pb-[env(safe-area-inset-bottom)] sm:hidden">
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const badge = item.href === "/queue" && activeCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1",
                active ? "text-primary" : "text-muted"
              )}
            >
              <span className="relative">
                <item.icon className="h-5 w-5" />
                {badge && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] font-bold leading-none text-[var(--bg-base)]">
                    {activeCount > 99 ? "99" : activeCount}
                  </span>
                )}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
