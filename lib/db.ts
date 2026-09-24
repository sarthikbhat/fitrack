import { get, set, del } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

// Zustand's persist middleware expects a string-based get/set/removeItem
// interface. idb-keyval stores those strings in IndexedDB (async, roomy).
export const idbStorage: StateStorage = {
  getItem: async (name) => (await get(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};
