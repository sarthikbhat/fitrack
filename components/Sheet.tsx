"use client";

// Generic bottom-sheet overlay (legacy `.modal.sheet` + renderSheet shell, 501-515,2354-2364).
// Backdrop click, Escape, and `.locked` body scroll-lock all close the sheet, mirroring
// the ExerciseModal pattern. Callers supply a title, an optional hint line, and the body.
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/data/icons";

export function Sheet({
  title,
  hint,
  onClose,
  children,
}: {
  title: string;
  hint?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.classList.add("locked");
    return () => document.body.classList.remove("locked");
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="overlay"
      ref={overlayRef}
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="modal sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="pickhead">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <h3 className="cond" style={{ fontSize: 19 }}>
              {title}
            </h3>
            <button className="close" style={{ position: "static" }} ref={closeRef} onClick={onClose} aria-label="close">
              <Icon name="close" />
            </button>
          </div>
          {hint && (
            <p className="shint" style={{ margin: "8px 0 0" }}>
              {hint}
            </p>
          )}
        </div>
        <div className="sheetbody" style={{ paddingTop: 6 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
