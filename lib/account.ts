"use client";

// Client side of self-serve account deletion. Sends the current session's access
// token to the server route (which holds the service-role key and does the actual
// admin delete + cascade), then, on success, signs out and resets local data so the
// app returns to a clean first-run state.
import { getSupabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";
import { useStore } from "@/lib/store";

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

export async function deleteMyAccount(): Promise<DeleteAccountResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Sign in to delete your account." };

  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "Sign in to delete your account." };

  let res: Response;
  try {
    res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    return { ok: false, error: "Network error. Try again." };
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error || "Couldn't delete the account. Try again." };
  }

  // Cloud data is gone. End the session and wipe local data so the next launch
  // starts fresh at onboarding.
  await signOut();
  useStore.getState().resetAll();
  return { ok: true };
}
