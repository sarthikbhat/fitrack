"use client";

// Share-a-plan control: a button that publishes the current program or nutrition
// plan to a public link, then shows the link in a Sheet with a Copy button.
// Signed-out users are offered a sign-in prompt (sharing needs an owner); viewing
// and cloning the resulting link never require an account.
import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { Icon } from "@/data/icons";
import { createShare, type ShareKind } from "@/lib/share";
import { useConfirm } from "@/components/ConfirmProvider";
import { signInWithGoogle } from "@/lib/auth";

export function ShareButton({
  kind,
  getPayload,
  label = "Share",
  className = "btn sm ghost",
}: {
  kind: ShareKind;
  /** Read the current plan payload at click time (title + data to publish). */
  getPayload: () => { title: string; data: unknown };
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const confirm = useConfirm();

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    const { title, data } = getPayload();
    const res = await createShare({ kind, title, data });
    setBusy(false);

    if (res.ok) {
      setCopied(false);
      setUrl(res.url);
      return;
    }

    // Signed out / unconfigured / insert failure - explain, and offer sign-in.
    const wantsSignIn = /sign in/i.test(res.error);
    const ok = await confirm({
      title: wantsSignIn ? "Sign in to share" : "Couldn't share",
      message: wantsSignIn
        ? `${res.error} Your link is public — anyone with it can view and clone this plan.`
        : res.error,
      confirmLabel: wantsSignIn ? "Sign in" : "OK",
      cancelLabel: wantsSignIn ? "Cancel" : "Close",
    });
    if (ok && wantsSignIn) void signInWithGoogle();
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard blocked (permissions / insecure origin): the input is selectable
      // as a fallback, so leave the label unchanged.
    }
  };

  return (
    <>
      <button className={className} onClick={onShare} disabled={busy} aria-label={label}>
        <Icon name="share" />
        &nbsp;{busy ? "Sharing…" : label}
      </button>

      {url && (
        <Sheet
          title="Share this plan"
          hint="Anyone with this link can view it — no account needed."
          onClose={() => setUrl(null)}
        >
          <div className="sharelink">
            <input
              className="sharelink-url"
              readOnly
              value={url}
              aria-label="Share link"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button className="btn primary" onClick={copy}>
              <Icon name={copied ? "check" : "link"} />
              &nbsp;{copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="shint" style={{ margin: "12px 2px 0" }}>
            Recipients can clone it straight into their own app.
          </p>
        </Sheet>
      )}
    </>
  );
}
