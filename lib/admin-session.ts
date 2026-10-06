export const ADMIN_IDLE_MS = 30 * 60 * 1000;
const KEY = "mfy-admin-last-activity";
let memoryActivity = 0;
export function lastActivity() { try { return Number(sessionStorage.getItem(KEY)) || memoryActivity; } catch { return memoryActivity; } }
export function touchActivity(now = Date.now()) { memoryActivity = now; try { sessionStorage.setItem(KEY, String(now)); } catch { /* Memory fallback. */ } }
export function clearActivity() { memoryActivity = 0; try { sessionStorage.removeItem(KEY); } catch { /* Storage unavailable. */ } }
export function idleExpired(now = Date.now()) { const last = lastActivity(); return last > 0 && now - last >= ADMIN_IDLE_MS; }
export function startIdleTimer(onExpire: () => void) {
  if (!lastActivity()) touchActivity();
  let ended = false, timer: ReturnType<typeof setTimeout>;
  const check = () => {
    clearTimeout(timer);
    if (ended) return;
    if (idleExpired()) { ended = true; onExpire(); return; }
    timer = setTimeout(check, Math.max(1, ADMIN_IDLE_MS - (Date.now() - lastActivity())));
  };
  const activity = () => { if (idleExpired()) { check(); return; } if (Date.now() - lastActivity() > 1000) touchActivity(); check(); };
  const visible = () => { if (!document.hidden) check(); };
  const events = ["pointerdown", "keydown", "scroll", "touchstart"];
  events.forEach(event => window.addEventListener(event, activity, { passive: true }));
  window.addEventListener("focus", check); document.addEventListener("visibilitychange", visible); check();
  return () => { ended = true; clearTimeout(timer); events.forEach(event => window.removeEventListener(event, activity)); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", visible); };
}
