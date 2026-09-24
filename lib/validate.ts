import type { State } from "@/lib/types";
import { CURRENT_VERSION, migrate } from "@/lib/migrate";

/**
 * Parse a user-supplied backup string into a valid State.
 * Runs the blob through the same {@link migrate} path the store uses on rehydrate,
 * so both current and legacy shapes are accepted. Throws on:
 *  - non-JSON / non-object / array input (garbage),
 *  - a `v` newer than this app can understand,
 *  - a migrated result that fails a basic shape check.
 * Callers (importState) catch and surface a friendly error.
 */
export function parseImport(json: string): State {
  let blob: unknown;
  try {
    blob = JSON.parse(json);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!blob || typeof blob !== "object" || Array.isArray(blob)) {
    throw new Error("That file isn't a valid Fitrack backup.");
  }

  // Reject blobs written by a newer app version - we can't safely downgrade them.
  const v = (blob as { v?: unknown }).v;
  if (typeof v === "number" && v > CURRENT_VERSION) {
    throw new Error("This backup is from a newer version of Fitrack.");
  }

  const state = migrate(blob);
  if (
    !state ||
    typeof state !== "object" ||
    typeof state.userId !== "string" ||
    typeof state.body !== "object" ||
    typeof state.goals !== "object" ||
    typeof state.settings !== "object"
  ) {
    throw new Error("That file isn't a valid Fitrack backup.");
  }
  return state;
}
