"use client";

// Context host for the exercise picker (legacy S.picker + renderPicker).
// Exposes openPicker(dayId); renders exactly one Picker overlay at app root.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Picker } from "@/components/Picker";

type Ctx = { openPicker: (dayId: string) => void; closePicker: () => void };

const PickerContext = createContext<Ctx>({ openPicker: () => {}, closePicker: () => {} });

export function usePicker(): Ctx {
  return useContext(PickerContext);
}

export function PickerProvider({ children }: { children: ReactNode }) {
  const [dayId, setDayId] = useState<string | null>(null);
  const openPicker = useCallback((id: string) => setDayId(id), []);
  const closePicker = useCallback(() => setDayId(null), []);

  return (
    <PickerContext.Provider value={{ openPicker, closePicker }}>
      {children}
      {dayId && <Picker dayId={dayId} onClose={closePicker} />}
    </PickerContext.Provider>
  );
}
