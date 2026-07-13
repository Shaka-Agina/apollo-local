"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface PlayerChromeState {
  expanded: boolean;
  artFocus: boolean;
  setExpanded: (v: boolean) => void;
  setArtFocus: (v: boolean | ((prev: boolean) => boolean)) => void;
}

const PlayerChromeContext = createContext<PlayerChromeState | null>(null);

export function PlayerChromeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [artFocus, setArtFocus] = useState(false);

  const setExpandedSafe = useCallback((v: boolean) => {
    setExpanded(v);
    if (!v) setArtFocus(false);
  }, []);

  const value = useMemo(
    () => ({
      expanded,
      artFocus,
      setExpanded: setExpandedSafe,
      setArtFocus,
    }),
    [expanded, artFocus, setExpandedSafe]
  );

  return (
    <PlayerChromeContext.Provider value={value}>
      {children}
    </PlayerChromeContext.Provider>
  );
}

export function usePlayerChrome() {
  const ctx = useContext(PlayerChromeContext);
  if (!ctx) {
    throw new Error("usePlayerChrome must be used within PlayerChromeProvider");
  }
  return ctx;
}
