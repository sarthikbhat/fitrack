"use client";

// Owner-only profile editor, hosted in the Settings sheet's Account section.
// Edits username (+ bio, optional display name) → updateMyProfile, with inline
// validation and a friendly conflict error. Seeds fields from the loaded profile.
import { useState } from "react";
import { useMyProfile } from "@/lib/useMyProfile";
import {
  updateMyProfile,
  validateUsername,
  usernameErrorMessage,
  type Profile,
} from "@/lib/profile";

// Load the profile, then mount the form keyed by profile id so the fields seed
// from useState initializers (no state-syncing effect needed).
export function ProfileEditor() {
  const { profile, loading, refresh } = useMyProfile();
  if (loading && !profile) {
    return <p className="shint" style={{ margin: "6px 0 0" }}>Loading your profile…</p>;
  }
  return <ProfileForm key={profile?.id ?? "none"} profile={profile} refresh={refresh} />;
}

function ProfileForm({
  profile,
  refresh,
}: {
  profile: Profile | null;
  refresh: () => void;
}) {
  const [username, setUsername] = useState(profile?.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onSave = async () => {
    setErr(null);
    setSaved(false);
    const uname = username.trim().toLowerCase();
    const vErr = validateUsername(uname);
    if (vErr) {
      setErr(usernameErrorMessage(vErr));
      return;
    }
    setSaving(true);
    const res = await updateMyProfile({
      username: uname,
      display_name: displayName,
      bio,
    });
    setSaving(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setSaved(true);
    refresh();
  };

  return (
    <div className="profedit">
      <label className="flbl">Username</label>
      <div className="profedit-uname">
        <span className="profedit-at">@</span>
        <input
          className="search"
          value={username}
          placeholder="username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => {
            setUsername(e.target.value);
            setSaved(false);
          }}
        />
      </div>
      <p className="shint" style={{ margin: "4px 0 0" }}>
        Your public handle at /u/{username || "username"} - 3–20 chars, a–z, 0–9, _
      </p>

      <label className="flbl" style={{ marginTop: 12 }}>Display name</label>
      <input
        className="search"
        value={displayName}
        placeholder="Your name"
        autoComplete="off"
        onChange={(e) => {
          setDisplayName(e.target.value);
          setSaved(false);
        }}
      />

      <label className="flbl" style={{ marginTop: 12 }}>Bio</label>
      <textarea
        className="search profedit-bio"
        value={bio}
        placeholder="A short line about your training"
        rows={3}
        onChange={(e) => {
          setBio(e.target.value);
          setSaved(false);
        }}
      />

      {err && (
        <p className="shint" style={{ color: "var(--danger)", marginTop: 8 }}>
          {err}
        </p>
      )}
      {saved && !err && (
        <p className="shint" style={{ color: "var(--accent)", marginTop: 8 }}>
          Profile saved.
        </p>
      )}
      <button
        className="btn"
        style={{ width: "100%", marginTop: 10 }}
        disabled={saving}
        onClick={onSave}
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}
