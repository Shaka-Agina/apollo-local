"use client";

import { BottomTabBar } from "./BottomTabBar";
import { Sidebar } from "./Sidebar";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { MiniPlayer } from "@/components/player/MiniPlayer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <div className="min-h-dvh bg-base">
        <Sidebar />
        <main className="pb-40 pt-[env(safe-area-inset-top)] sm:pb-24 sm:pl-16 lg:pl-52">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
        <MiniPlayer />
        <BottomTabBar />
      </div>
    </PlayerProvider>
  );
}
