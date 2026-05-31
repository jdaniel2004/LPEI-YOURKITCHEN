// Shared store for the restaurant's configured timezone (geral.timezone), so
// every live clock and timestamp across POS / KDS / Backoffice / Login renders
// in the same zone instead of the device's local zone.
//
// The value is cached in a module-level variable (read synchronously by the
// ticking clocks) and mirrored to localStorage so it survives reloads and is
// available on the pre-auth login screen.
const STORAGE_KEY = "ros_timezone";
const FALLBACK = "Europe/Lisbon";

let _tz = null;

export function getTimezone() {
  if (_tz) return _tz;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) { _tz = stored; return _tz; }
  } catch { /* SSR / no storage */ }
  return FALLBACK;
}

export function setTimezone(tz) {
  if (!tz) return;
  _tz = tz;
  try { localStorage.setItem(STORAGE_KEY, tz); } catch { /* no storage */ }
  // Notify non-ticking consumers (timestamps) so they can re-render immediately.
  try { window.dispatchEvent(new CustomEvent("ros-tz-change", { detail: tz })); } catch { /* no window */ }
}

// toLocaleTimeString / toLocaleDateString with the configured timezone injected.
export function fmtTime(date, opts = {}) {
  return new Date(date).toLocaleTimeString("pt-PT", { timeZone: getTimezone(), ...opts });
}

export function fmtDate(date, opts = {}) {
  return new Date(date).toLocaleDateString("pt-PT", { timeZone: getTimezone(), ...opts });
}
