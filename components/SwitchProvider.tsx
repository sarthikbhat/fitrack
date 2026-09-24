"use client";

// Context host for the switch-workout sheet (legacy S.sheet === 'switch').
// Exposes openSwitch(); renders exactly one SwitchSheet overlay at app root.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { SwitchSheet } from "@/components/SwitchSheet";

type Ctx = { openSwitch: () => void; closeSwitch: () => void };

const SwitchContext = createContext<Ctx>({ openSwitch: () => {}, closeSwitch: () => {} });

export function useSwitch(): Ctx {
  return useContext(SwitchContext);
}

export function SwitchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSwitch = useCallback(() => setOpen(true), []);
  const closeSwitch = useCallback(() => setOpen(false), []);

  return (
    <SwitchContext.Provider value={{ openSwitch, closeSwitch }}>
      {children}
      {open && <SwitchSheet onClose={closeSwitch} />}
    </SwitchContext.Provider>
  );
}
