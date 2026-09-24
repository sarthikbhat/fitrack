"use client";

// Promise-based confirm/prompt dialogs, mounted once at app root so every view
// (including Settings and the bottom sheets) can `await` a decision instead of
// reaching for the blocking browser `window.confirm` / `window.prompt`.
//
//   const confirm = useConfirm();
//   if (await confirm({ title: "Delete?", danger: true })) deleteThing();
//
//   const prompt = usePrompt();
//   const name = await prompt({ title: "Rename", defaultValue: current });
//   if (name) rename(name);
//
// Renders a single centered dialog reusing the app's `.overlay` / `.modal`
// styling language, sets `.locked` while open, and closes on Escape or backdrop.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export type PromptOptions = {
  title: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmRequest = {
  kind: "confirm";
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
};
type PromptRequest = {
  kind: "prompt";
  opts: PromptOptions;
  resolve: (value: string | null) => void;
};
type Request = ConfirmRequest | PromptRequest;

type Ctx = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
};

const noopConfirm = async () => false;
const noopPrompt = async () => null;
const ConfirmContext = createContext<Ctx>({ confirm: noopConfirm, prompt: noopPrompt });

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  return useContext(ConfirmContext).confirm;
}
export function usePrompt(): (opts: PromptOptions) => Promise<string | null> {
  return useContext(ConfirmContext).prompt;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setRequest({ kind: "confirm", opts, resolve });
      }),
    [],
  );
  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setRequest({ kind: "prompt", opts, resolve });
      }),
    [],
  );

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      {request && <Dialog request={request} onDone={() => setRequest(null)} />}
    </ConfirmContext.Provider>
  );
}

function Dialog({ request, onDone }: { request: Request; onDone: () => void }) {
  const { opts } = request;
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(request.kind === "prompt" ? request.opts.defaultValue ?? "" : "");
  const danger = request.kind === "confirm" && request.opts.danger === true;

  // Settle the promise exactly once, then unmount.
  const settled = useRef(false);
  const settle = useCallback(
    (result: boolean | string | null) => {
      if (settled.current) return;
      settled.current = true;
      if (request.kind === "confirm") request.resolve(result as boolean);
      else request.resolve(result as string | null);
      onDone();
    },
    [request, onDone],
  );

  const cancel = useCallback(() => settle(request.kind === "confirm" ? false : null), [settle, request.kind]);
  const accept = useCallback(() => {
    settle(request.kind === "confirm" ? true : value);
  }, [settle, request.kind, value]);

  // Body scroll-lock while open, matching the sheet/modal pattern.
  useEffect(() => {
    document.body.classList.add("locked");
    return () => document.body.classList.remove("locked");
  }, []);

  // Focus the confirm button (confirm) or the input (prompt) on open.
  useEffect(() => {
    if (request.kind === "prompt") {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      confirmBtnRef.current?.focus();
    }
  }, [request.kind]);

  // Escape cancels from anywhere.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        cancel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cancel]);

  const confirmLabel = opts.confirmLabel ?? (request.kind === "confirm" ? "Confirm" : "Save");
  const cancelLabel = opts.cancelLabel ?? "Cancel";

  return (
    <div
      className="overlay confirm-overlay"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) cancel();
      }}
    >
      <div
        className="modal confirm"
        role="dialog"
        aria-modal="true"
        aria-label={opts.title}
      >
        <h3 className="cond confirm-title">{opts.title}</h3>
        {opts.message && <p className="confirm-msg">{opts.message}</p>}

        {request.kind === "prompt" && (
          <>
            {request.opts.label && <label className="flbl confirm-label">{request.opts.label}</label>}
            <input
              ref={inputRef}
              className="search confirm-input"
              value={value}
              placeholder={request.opts.placeholder}
              autoComplete="off"
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  accept();
                }
              }}
            />
          </>
        )}

        <div className="confirmbtns">
          <button className="btn ghost" onClick={cancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            className={danger ? "btn danger" : "btn primary"}
            onClick={accept}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
