"use client";

// Context host for the settings sheet (legacy S.sheet === 'settings', renderSheet 2385-2420).
// Exposes openSettings(); renders exactly one SettingsSheet overlay at app root.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { SettingsSheet } from "@/components/SettingsSheet";

type Ctx = { openSettings: () => void; closeSettings: () => void };

const SettingsContext = createContext<Ctx>({ openSettings: () => {}, closeSettings: () => {} });

export function useSettings(): Ctx {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSettings = useCallback(() => setOpen(true), []);
  const closeSettings = useCallback(() => setOpen(false), []);

  return (
    <SettingsContext.Provider value={{ openSettings, closeSettings }}>
      {children}
      {open && <SettingsSheet onClose={closeSettings} />}
    </SettingsContext.Provider>
  );
}
