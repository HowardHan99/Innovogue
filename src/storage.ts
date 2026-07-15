/* =============== storage =============== */

/* localStorage is not always there. It throws in sandboxed iframes (the
   claude.ai artifact environment), in Safari private mode, and on file://
   in some browsers. Every one of those is a place we actually demo from, so
   a throw here must not take the page down: we fall back to memory and keep
   the session working, we just lose it on reload.

   The seed codec (seed.ts) is what makes that survivable, because it can
   carry the whole pocket in the URL and never touch storage at all. */

export type Backend = "local" | "memory";

let backend: Backend = "memory";
const mem = new Map<string, string>();

let probed = false;
function probe(): void {
  if (probed) return;
  probed = true;
  try {
    const k = "__dd_probe__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    backend = "local";
  } catch {
    backend = "memory";
  }
}

/** Which backend we ended up on. Pages can surface this so a user is never
    silently promised persistence they are not getting. */
export function storageBackend(): Backend {
  probe();
  return backend;
}

export function isPersistent(): boolean {
  return storageBackend() === "local";
}

export function get(key: string): string | null {
  probe();
  try {
    return backend === "local" ? window.localStorage.getItem(key) : mem.get(key) ?? null;
  } catch {
    return mem.get(key) ?? null;
  }
}

export function set(key: string, value: string): void {
  probe();
  mem.set(key, value);
  if (backend !== "local") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota or a mid-session revoke. memory already holds it. */
    backend = "memory";
  }
}

export function remove(key: string): void {
  probe();
  mem.delete(key);
  if (backend !== "local") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing left to do */
  }
}

export function readJSON<T>(key: string): T | null {
  const raw = get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    set(key, JSON.stringify(value));
  } catch {
    /* circular or unserializable: caller passed something it should not have */
  }
}
