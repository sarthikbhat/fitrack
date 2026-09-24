"use client";

// React replacement for the legacy global `S.modal` + `renderModal` (1971-2024).
// A context exposes openExercise(name) — the local-first path, which name-matches the
// exercise across the offline databases — and openExerciseById(id, name), the catalog
// path, which skips name-matching and pulls the EDB detail record directly by id. The
// provider renders exactly one overlay for whichever target is active.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ExerciseModal } from "@/components/exercise/ExerciseModal";

type Target = { name: string; edbId?: string };
type Ctx = {
  openExercise: (name: string) => void;
  openExerciseById: (id: string, name?: string) => void;
  closeExercise: () => void;
};

const ExerciseModalContext = createContext<Ctx>({
  openExercise: () => {},
  openExerciseById: () => {},
  closeExercise: () => {},
});

export function useExerciseModal(): Ctx {
  return useContext(ExerciseModalContext);
}

export function ExerciseModalProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null);
  const openExercise = useCallback((name: string) => setTarget({ name }), []);
  const openExerciseById = useCallback(
    (id: string, name?: string) => setTarget({ name: name || "", edbId: id }),
    [],
  );
  const closeExercise = useCallback(() => setTarget(null), []);

  return (
    <ExerciseModalContext.Provider value={{ openExercise, openExerciseById, closeExercise }}>
      {children}
      {target && (
        <ExerciseModal
          key={target.edbId || target.name}
          name={target.name}
          edbId={target.edbId}
          onClose={closeExercise}
        />
      )}
    </ExerciseModalContext.Provider>
  );
}
