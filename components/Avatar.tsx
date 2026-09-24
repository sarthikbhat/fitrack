"use client";

// Round account avatar. Uses a plain <img> with referrerPolicy="no-referrer"
// (Google avatar URLs 403 when a referrer is sent) and falls back to initials in
// an accent circle if there's no URL or the image errors.
import { useState } from "react";

function initialsOf(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const chars = parts.slice(0, 2).map((w) => w[0]);
  return chars.join("").toUpperCase();
}

export function Avatar({
  src,
  name,
  size = 32,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(src) && !failed;
  const label = name || "Account";

  return (
    <span className="avatar" style={{ width: size, height: size }} aria-hidden>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="avatar-img"
          src={src as string}
          alt={label}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="avatar-fallback" style={{ fontSize: Math.round(size * 0.4) }}>
          {initialsOf(label)}
        </span>
      )}
    </span>
  );
}
