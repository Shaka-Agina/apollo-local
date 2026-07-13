"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_UI_PREFS,
  mergeUiPrefs,
  readUiPrefsFromStorage,
  writeUiPrefsToStorage,
  type UiPrefs,
} from "@/lib/ui-prefs";

interface UiPrefsContextValue {
  prefs: UiPrefs;
  setPrefs: (patch: Partial<UiPrefs>) => void;
  resetPrefs: () => void;
  ready: boolean;
}

const UiPrefsContext = createContext<UiPrefsContextValue | null>(null);

export function UiPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<UiPrefs>(DEFAULT_UI_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefsState(readUiPrefsFromStorage());
    setReady(true);
  }, []);

  const setPrefs = useCallback((patch: Partial<UiPrefs>) => {
    setPrefsState((prev) => {
      const next = mergeUiPrefs({ ...prev, ...patch });
      writeUiPrefsToStorage(next);
      return next;
    });
  }, []);

  const resetPrefs = useCallback(() => {
    writeUiPrefsToStorage(DEFAULT_UI_PREFS);
    setPrefsState(DEFAULT_UI_PREFS);
  }, []);

  const value = useMemo(
    () => ({ prefs, setPrefs, resetPrefs, ready }),
    [prefs, setPrefs, resetPrefs, ready]
  );

  return (
    <UiPrefsContext.Provider value={value}>{children}</UiPrefsContext.Provider>
  );
}

export function useUiPrefs() {
  const ctx = useContext(UiPrefsContext);
  if (!ctx) throw new Error("useUiPrefs must be used within UiPrefsProvider");
  return ctx;
}
