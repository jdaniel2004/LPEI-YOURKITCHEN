import { useState, useEffect, useRef, useCallback } from "react";
import { fmtTime, fmtDate } from "@/lib/timezone";
import { subscribeRealtime } from "@/lib/realtime";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg: "#08080B",
  surface: "#0F0F14",
  card: "#15151C",
  elevated: "#1C1C25",
  border: "#252530",
  borderBright: "#32324A",
  accent: "#7C6AF7",
  accentDim: "#7C6AF720",
  teal: "#3ECFAE",
  tealDim: "#3ECFAE18",
  danger: "#F75A5A",
  dangerDim: "#F75A5A18",
  warning: "#F7A94A",
  warningDim: "#F7A94A18",
  success: "#4AF785",
  successDim: "#4AF78518",
  text: "#FFFFFF",
  textSec: "#D0D0DC",
  textMuted: "#8E8EA4",
};

// ─── API HELPERS ──────────────────────────────────────────────────────────────
const DB_TO_KDS = { open: "pendente", sent: "em_preparacao", bill: "pronto" };

function mapTicket(o) {
  const sentLines = (o.lines || []).filter(l => l.sent && !l.cancelled);
  const maxBatch = sentLines.reduce((m, l) => Math.max(m, l.sent_batch ?? 0), 0);
  const toItem = l => ({
    id: l.id,
    name: l.name,
    qty: l.qty,
    notes: Array.isArray(l.modifiers) && l.modifiers.length
      ? l.modifiers.join(", ")
      : (l.notes || ""),
    sent: l.sent,
    cancelled: l.cancelled,
  });
  // What the kitchen is working on now: every sent batch not yet delivered.
  // `delivered` is only set when a batch is marked "Pronto", so two consecutive
  // sends to the same table (e.g. Francesinha then Cola) stay visible together
  // instead of replacing each other. Once a batch is "Pronto" but still awaiting
  // serving (and no newer batch exists), fall back to the latest batch so the
  // "Pronto" column isn't left empty.
  const pending = sentLines.filter(l => !l.delivered);
  const currentBatch = pending.length > 0
    ? pending
    : sentLines.filter(l => (l.sent_batch ?? 0) === maxBatch);
  // Timer starts when the oldest visible item reached the kitchen, and freezes
  // at the moment it was marked ready (ready_at), so it stops counting on "Pronto".
  const startedAt = currentBatch.length
    ? Math.min(...currentBatch.map(l => new Date(l.created_at).getTime()))
    : new Date(o.created_at).getTime();
  const readyTimes = currentBatch.map(l => l.ready_at).filter(Boolean).map(t => new Date(t).getTime());
  const readyAt = readyTimes.length === currentBatch.length && readyTimes.length > 0
    ? Math.max(...readyTimes) : null;
  return {
    id: o.id,
    type: o.table ? "mesa" : (o.notes?.includes("take") ? "take-away" : "balcao"),
    table: o.table?.label || null,
    waiter: o.waiter?.name || "—",
    notes: o.notes || null,
    createdAt: new Date(o.created_at).getTime(),
    startedAt,
    readyAt,
    status: DB_TO_KDS[o.status] || "pendente",
    // Items in play now (undelivered batches); delivered ones don't reappear
    items: currentBatch.map(toItem),
  };
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function elapsed(createdAt) {
  return Math.floor((Date.now() - createdAt) / 1000);
}
// Elapsed-time formatter for ticket timers (seconds → "m:ss"). Named distinctly
// from the imported fmtTime(date, opts) clock formatter to avoid a name clash.
function fmtTimer(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function timerColor(secs) {
  if (secs < 5 * 60) return { color: T.success, bg: T.successDim, pulse: false };
  if (secs < 12 * 60) return { color: T.warning, bg: T.warningDim, pulse: false };
  return { color: T.danger, bg: T.dangerDim, pulse: true };
}
function typeLabel(type, table) {
  if (type === "mesa") return { label: `Mesa ${table}`, color: T.accent, bg: T.accentDim };
  if (type === "take-away") return { label: "Take-Away", color: T.teal, bg: T.tealDim };
  return { label: "Balcão", color: T.warning, bg: T.warningDim };
}
function statusLabel(s) {
  if (s === "pendente") return "Pendente";
  if (s === "em_preparacao") return "Em Preparação";
  return "Pronto";
}
function nextStatus(s) {
  if (s === "pendente") return "em_preparacao";
  if (s === "em_preparacao") return "pronto";
  return null;
}
function nextLabel(s) {
  if (s === "pendente") return "Iniciar";
  if (s === "em_preparacao") return "Marcar Pronto";
  return null;
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${T.bg};
    color: ${T.text};
    font-family: 'Syne', sans-serif;
    overflow: hidden;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }

  @keyframes pulse-red {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 ${T.danger}44; }
    50% { opacity: 0.75; box-shadow: 0 0 0 6px transparent; }
  }
  @keyframes pulse-border {
    0%, 100% { border-color: ${T.danger}; }
    50% { border-color: ${T.danger}44; }
  }
  @keyframes slide-in {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes slide-out {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to { opacity: 0; transform: translateY(-12px) scale(0.97); }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes count-up {
    from { transform: translateY(4px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes glow-success {
    0% { box-shadow: 0 0 0 0 ${T.success}55; }
    50% { box-shadow: 0 0 24px 8px ${T.success}22; }
    100% { box-shadow: 0 0 0 0 transparent; }
  }
  @keyframes shimmer {
    from { background-position: -200% 0; }
    to { background-position: 200% 0; }
  }

  .kds-root {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: ${T.bg};
  }

  .kds-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 56px;
    border-bottom: 1px solid ${T.border};
    background: ${T.surface};
    flex-shrink: 0;
    position: relative;
    z-index: 10;
  }

  .kds-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    font-size: 18px;
    letter-spacing: -0.5px;
  }
  .kds-logo-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: ${T.accent};
    box-shadow: 0 0 12px ${T.accent};
  }

  .kds-meta {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .kds-clock {
    font-family: 'DM Mono', monospace;
    font-size: 20px;
    font-weight: 500;
    color: ${T.text};
    letter-spacing: 1px;
  }
  .kds-date {
    font-size: 12px;
    color: ${T.textMuted};
    font-family: 'DM Mono', monospace;
  }

  .kds-cols-wrap {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1px;
    flex: 1;
    overflow: hidden;
    background: ${T.border};
  }

  .kds-col {
    display: flex;
    flex-direction: column;
    background: ${T.bg};
    overflow: hidden;
  }

  .kds-col-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px 12px;
    background: ${T.surface};
    border-bottom: 2px solid transparent;
    flex-shrink: 0;
  }

  .kds-col-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: ${T.textSec};
  }
  .kds-col-count {
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 20px;
    min-width: 28px;
    text-align: center;
  }

  .col-pendente .kds-col-header { border-color: ${T.textMuted}; }
  .col-em_preparacao .kds-col-header { border-color: ${T.warning}; }
  .col-pronto .kds-col-header { border-color: ${T.success}; }
  .col-pendente .kds-col-count { background: ${T.elevated}; color: ${T.textSec}; }
  .col-em_preparacao .kds-col-count { background: ${T.warningDim}; color: ${T.warning}; }
  .col-pronto .kds-col-count { background: ${T.successDim}; color: ${T.success}; }

  .kds-col-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .kds-ticket {
    background: ${T.card};
    border: 1px solid ${T.border};
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
    animation: slide-in 0.25s ease;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .kds-ticket:hover { border-color: ${T.borderBright}; }
  .kds-ticket.is-urgent {
    animation: pulse-border 2s infinite;
    box-shadow: inset 0 0 0 1px ${T.danger}33;
  }
  .kds-ticket.is-done {
    opacity: 0.65;
    filter: saturate(0.4);
  }
  .kds-ticket.is-done:hover { opacity: 0.85; filter: saturate(0.6); }

  .ticket-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 8px;
    border-bottom: 1px solid ${T.border};
  }
  .ticket-top-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ticket-type-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 5px;
    letter-spacing: 0.3px;
  }
  .ticket-id {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: ${T.textMuted};
  }
  .timer-badge {
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    font-weight: 500;
    padding: 3px 9px;
    border-radius: 6px;
    letter-spacing: 0.5px;
    transition: all 0.5s;
  }
  .timer-badge.pulsing {
    animation: pulse-red 1.5s infinite;
  }

  .ticket-waiter {
    padding: 6px 12px;
    font-size: 11px;
    color: ${T.textMuted};
    border-bottom: 1px solid ${T.border};
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .ticket-waiter span { color: ${T.textSec}; font-weight: 600; }

  .ticket-notes {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: ${T.warning};
    background: ${T.warningDim};
    border-bottom: 1px solid ${T.warning}33;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ticket-items {
    padding: 8px 0;
    max-height: 200px;
    overflow-y: auto;
  }
  .ticket-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 5px 12px;
    transition: background 0.15s;
    position: relative;
  }
  .ticket-item:hover { background: ${T.elevated}; }
  .ticket-item.is-cancelled {
    opacity: 0.35;
    text-decoration: line-through;
  }
  .item-qty {
    font-family: 'DM Mono', monospace;
    font-size: 15px;
    font-weight: 500;
    color: ${T.accent};
    min-width: 22px;
    flex-shrink: 0;
    padding-top: 1px;
  }
  .item-content { flex: 1; min-width: 0; }
  .item-name {
    font-size: 14px;
    font-weight: 600;
    color: ${T.text};
    line-height: 1.2;
  }
  .item-notes {
    font-size: 12px;
    font-weight: 700;
    color: ${T.warning};
    margin-top: 2px;
    line-height: 1.3;
  }
  .ticket-footer {
    padding: 10px 12px;
    border-top: 1px solid ${T.border};
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .ticket-action-btn {
    flex: 1;
    border: none;
    border-radius: 7px;
    padding: 11px 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: 'Syne', sans-serif;
    letter-spacing: 0.3px;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 42px;
  }
  .btn-iniciar {
    background: ${T.accentDim};
    color: ${T.accent};
    border: 1px solid ${T.accent}44;
  }
  .btn-iniciar:hover { background: ${T.accent}30; border-color: ${T.accent}88; }
  .btn-iniciar:active { transform: scale(0.97); }
  .btn-pronto {
    background: ${T.tealDim};
    color: ${T.teal};
    border: 1px solid ${T.teal}44;
  }
  .btn-pronto:hover { background: ${T.teal}28; border-color: ${T.teal}88; }
  .btn-pronto:active { transform: scale(0.97); }
  .btn-servido {
    background: ${T.successDim};
    color: ${T.success};
    border: 1px solid ${T.success}44;
    font-size: 12px;
  }
  .btn-servido:hover { background: ${T.success}28; }
  .btn-servido:active { transform: scale(0.97); }
  .btn-cancel-order {
    flex: 0 0 auto;
    background: ${T.dangerDim};
    color: ${T.danger};
    border: 1px solid ${T.danger}44;
    font-size: 12px;
  }
  .btn-cancel-order:hover { background: ${T.danger}28; border-color: ${T.danger}88; }
  .btn-cancel-order:active { transform: scale(0.97); }

  .ticket-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px 20px;
    color: ${T.textMuted};
  }
  .ticket-empty-icon { font-size: 28px; opacity: 0.3; }
  .ticket-empty-text { font-size: 13px; letter-spacing: 0.5px; }

  /* Modal anular */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(4px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fade-in 0.15s ease;
  }
  .modal-box {
    background: ${T.elevated};
    border: 1px solid ${T.borderBright};
    border-radius: 14px;
    padding: 28px;
    width: 420px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.6);
    animation: slide-in 0.2s ease;
  }
  .modal-title {
    font-size: 17px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .modal-sub {
    font-size: 13px;
    color: ${T.textSec};
    margin-bottom: 20px;
  }
  .modal-sub strong { color: ${T.warning}; }
  .modal-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: ${T.textMuted};
    margin-bottom: 8px;
  }
  .modal-textarea {
    width: 100%;
    background: ${T.card};
    border: 1px solid ${T.border};
    border-radius: 8px;
    color: ${T.text};
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    padding: 12px;
    resize: none;
    height: 80px;
    outline: none;
    transition: border-color 0.15s;
    margin-bottom: 20px;
  }
  .modal-textarea:focus { border-color: ${T.borderBright}; }
  .modal-btns { display: flex; gap: 10px; justify-content: flex-end; }
  .modal-btn-cancel {
    background: ${T.elevated};
    border: 1px solid ${T.border};
    color: ${T.textSec};
    border-radius: 8px;
    padding: 10px 18px;
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .modal-btn-cancel:hover { border-color: ${T.borderBright}; color: ${T.text}; }
  .modal-btn-confirm {
    background: ${T.dangerDim};
    border: 1px solid ${T.danger}55;
    color: ${T.danger};
    border-radius: 8px;
    padding: 10px 18px;
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  .modal-btn-confirm:hover { background: ${T.danger}28; }

  /* Toast */
  .toast-stack {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }
  .toast {
    background: ${T.elevated};
    border: 1px solid ${T.border};
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 13px;
    color: ${T.text};
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    animation: slide-in 0.25s ease;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 260px;
    pointer-events: auto;
  }
  .toast-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Logs panel */
  .logs-panel {
    position: fixed;
    right: 0; top: 0; bottom: 0;
    width: 340px;
    background: ${T.surface};
    border-left: 1px solid ${T.border};
    z-index: 50;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    box-shadow: -16px 0 48px rgba(0,0,0,0.4);
  }
  .logs-panel.open { transform: translateX(0); }
  .logs-header {
    padding: 16px 18px;
    border-bottom: 1px solid ${T.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .logs-title { font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: ${T.textSec}; }
  .logs-close { background: none; border: none; color: ${T.textMuted}; cursor: pointer; font-size: 18px; padding: 4px; border-radius: 4px; transition: color 0.15s; }
  .logs-close:hover { color: ${T.text}; }
  .logs-body { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
  .log-entry {
    background: ${T.card};
    border-radius: 8px;
    padding: 10px 12px;
    border-left: 3px solid transparent;
    animation: slide-in 0.2s ease;
  }
  .log-entry.INFO { border-color: ${T.accent}; }
  .log-entry.WARN { border-color: ${T.warning}; }
  .log-entry.ACTION { border-color: ${T.teal}; }
  .log-entry.CANCEL { border-color: ${T.danger}; }
  .log-time { font-family: 'DM Mono', monospace; font-size: 10px; color: ${T.textMuted}; margin-bottom: 3px; }
  .log-msg { font-size: 12px; color: ${T.textSec}; line-height: 1.4; }
  .log-msg strong { color: ${T.text}; }
  .log-comment { font-size: 11px; color: ${T.textMuted}; font-style: italic; margin-top: 3px; }

  /* Header btns */
  .header-btn {
    background: ${T.elevated};
    border: 1px solid ${T.border};
    color: ${T.textSec};
    border-radius: 8px;
    padding: 8px 14px;
    font-family: 'Syne', sans-serif;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
    letter-spacing: 0.3px;
  }
  .header-btn:hover { border-color: ${T.borderBright}; color: ${T.text}; }
  .header-btn.active { background: ${T.accentDim}; border-color: ${T.accent}44; color: ${T.accent}; }

  .live-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: ${T.success};
    box-shadow: 0 0 8px ${T.success};
    animation: pulse-red 2s infinite;
  }
  .live-dot-wrap { display: flex; align-items: center; gap: 6px; font-size: 11px; color: ${T.textMuted}; font-family: 'DM Mono', monospace; }

  @media(max-width:900px){
    .item-qty { font-size: 12px; min-width: 18px; }
    .item-name { font-size: 12px; }
    .item-notes { font-size: 11px; }
    .ticket-footer { flex-wrap: wrap; padding: 8px 10px; gap: 6px; }
    .ticket-action-btn { font-size: 12px; padding: 9px 8px; min-height: 36px; }
    .btn-cancel-order { flex: 1 1 100%; }
  }
`;

// ─── CLOCK ─────────────────────────────────────────────────────────────────────
function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hm = fmtTime(now, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = fmtDate(now, { weekday: "short", day: "2-digit", month: "short" });
  return (
    <div style={{ textAlign: "right" }}>
      <div className="kds-clock">{hm}</div>
      <div className="kds-date">{date}</div>
    </div>
  );
}

// ─── TIMER BADGE ───────────────────────────────────────────────────────────────
// Counts up from startedAt; freezes once the order is ready ("Pronto").
// Uses ready_at (endedAt) when available for an exact, reload-safe value; if not
// (e.g. migration not run), it still stops counting by capturing the moment the
// ticket was first seen as done.
function TimerBadge({ startedAt, endedAt, done }) {
  const capturedRef = useRef(null);
  const frozen = endedAt != null || !!done;
  const calc = () => {
    let end;
    if (endedAt != null) end = endedAt;
    else if (done) { if (capturedRef.current == null) capturedRef.current = Date.now(); end = capturedRef.current; }
    else { capturedRef.current = null; end = Date.now(); }
    return Math.max(0, Math.floor((end - startedAt) / 1000));
  };
  const [secs, setSecs] = useState(calc);
  useEffect(() => {
    setSecs(calc());
    if (frozen) return;
    const t = setInterval(() => setSecs(calc()), 1000);
    return () => clearInterval(t);
  }, [startedAt, endedAt, done, frozen]);
  const { color, bg, pulse } = frozen
    ? { color: T.success, bg: T.successDim, pulse: false }
    : timerColor(secs);
  return (
    <div
      className={`timer-badge${pulse ? " pulsing" : ""}`}
      style={{ color, background: bg, border: `1px solid ${color}44` }}
      title={frozen ? "Tempo de preparação" : "A preparar"}
    >
      {frozen ? `✓ ${fmtTimer(secs)}` : fmtTimer(secs)}
    </div>
  );
}

// ─── CANCEL MODAL ──────────────────────────────────────────────────────────────
function CancelModal({ title, subtitle, confirmLabel, onConfirm, onClose }) {
  const [motivo, setMotivo] = useState("");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-sub">{subtitle}</div>
        <div className="modal-label">Motivo (obrigatório para log)</div>
        <textarea
          className="modal-textarea"
          placeholder="Ex: Cliente desistiu, item esgotado, erro de lançamento..."
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          autoFocus
        />
        <div className="modal-btns">
          <button className="modal-btn-cancel" onClick={onClose}>Voltar</button>
          <button
            className="modal-btn-confirm"
            onClick={() => motivo.trim() && onConfirm(motivo)}
            style={{ opacity: motivo.trim() ? 1 : 0.4 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TICKET ────────────────────────────────────────────────────────────────────
function KDSTicket({ ticket, onAdvance, onCancelOrder }) {
  const isDone = ticket.status === "pronto";
  // Don't show "urgent" pulsing once the order is ready
  const secs = elapsed(ticket.startedAt ?? ticket.createdAt);
  const { pulse } = isDone ? { pulse: false } : timerColor(secs);
  const { label, color, bg } = typeLabel(ticket.type, ticket.table);
  const next = nextStatus(ticket.status);
  const nextLbl = nextLabel(ticket.status);
  const [cancelOrderOpen, setCancelOrderOpen] = useState(false);

  return (
    <>
      <div className={`kds-ticket${pulse ? " is-urgent" : ""}${isDone ? " is-done" : ""}`}>
        <div className="ticket-top">
          <div className="ticket-top-left">
            <div className="ticket-type-badge" style={{ color, background: bg }}>
              {label}
            </div>
          </div>
          <TimerBadge startedAt={ticket.startedAt ?? ticket.createdAt} endedAt={ticket.readyAt} done={isDone} />
        </div>

        <div className="ticket-waiter">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
          <span>{ticket.waiter}</span>
        </div>

        {ticket.notes && (
          <div className="ticket-notes">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {ticket.notes}
          </div>
        )}

        <div className="ticket-items">
          {ticket.items.map(item => (
            <div
              key={item.id}
              className={`ticket-item${item.cancelled ? " is-cancelled" : ""}`}
            >
              <div className="item-qty">{item.qty}×</div>
              <div className="item-content">
                <div className="item-name">{item.name}</div>
                {item.notes && <div className="item-notes">⚠ {item.notes}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="ticket-footer">
          {next && (
            <button
              className={`ticket-action-btn ${next === "em_preparacao" ? "btn-iniciar" : "btn-pronto"}`}
              onClick={() => onAdvance(ticket.id, next)}
            >
              {next === "em_preparacao" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              )}
              {nextLbl}
            </button>
          )}
          {isDone && (
            <button
              className="ticket-action-btn btn-servido"
              onClick={() => onAdvance(ticket.id, "servido")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              Servido — Arquivar
            </button>
          )}
          {!isDone && <button
            className="ticket-action-btn btn-cancel-order"
            onClick={() => setCancelOrderOpen(true)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            Cancelar Pedido
          </button>}
        </div>
      </div>

      {cancelOrderOpen && (
        <CancelModal
          title="Cancelar Pedido Completo"
          subtitle={<>Todos os itens de <strong>{label}</strong> serão anulados — Ticket #{ticket.id}</>}
          confirmLabel="Cancelar Pedido"
          onClose={() => setCancelOrderOpen(false)}
          onConfirm={(motivo) => {
            onCancelOrder(ticket.id, motivo);
            setCancelOrderOpen(false);
          }}
        />
      )}
    </>
  );
}

// ─── COLUMN ────────────────────────────────────────────────────────────────────
function KDSColumn({ status, tickets, onAdvance, onCancelOrder }) {
  const col = {
    pendente: { title: "Pendente", cls: "col-pendente" },
    em_preparacao: { title: "Em Preparação", cls: "col-em_preparacao" },
    pronto: { title: "Pronto", cls: "col-pronto" },
  }[status];

  return (
    <div className={`kds-col ${col.cls}`}>
      <div className="kds-col-header">
        <div className="kds-col-title">{col.title}</div>
        <div className="kds-col-count">{tickets.length}</div>
      </div>
      <div className="kds-col-body">
        {tickets.length === 0 ? (
          <div className="ticket-empty">
            <div className="ticket-empty-icon">◎</div>
            <div className="ticket-empty-text">Sem tickets</div>
          </div>
        ) : (
          tickets.map(t => (
            <KDSTicket
              key={t.id}
              ticket={t}
              onAdvance={onAdvance}
              onCancelOrder={onCancelOrder}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── TOAST SYSTEM ──────────────────────────────────────────────────────────────
function Toasts({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <div className="toast-dot" style={{ background: t.color || T.teal }} />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── LOGS PANEL ────────────────────────────────────────────────────────────────
function LogsPanel({ logs, open, onClose }) {
  const bodyRef = useRef();
  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs, open]);

  return (
    <div className={`logs-panel${open ? " open" : ""}`}>
      <div className="logs-header">
        <div className="logs-title">Log do Sistema</div>
        <button className="logs-close" onClick={onClose}>✕</button>
      </div>
      <div className="logs-body" ref={bodyRef}>
        {logs.map(l => (
          <div key={l.id} className={`log-entry ${l.level}`}>
            <div className="log-time">{l.time}</div>
            <div className="log-msg" dangerouslySetInnerHTML={{ __html: l.msg }} />
            {l.comment && <div className="log-comment">"{l.comment}"</div>}
          </div>
        ))}
        {logs.length === 0 && (
          <div style={{ color: T.textMuted, fontSize: 12, textAlign: "center", marginTop: 40 }}>
            Sem registos
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────
export default function KDS() {
  const [tickets, setTickets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const logIdRef = useRef(100);
  const toastIdRef = useRef(0);

  const addLog = useCallback((level, msg, comment = null) => {
    const time = fmtTime(new Date(), { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [...prev.slice(-199), { id: ++logIdRef.current, level, time, msg, comment }]);
  }, []);

  const addToast = useCallback((msg, color = T.teal) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, msg, color }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const archivedRef = useRef(new Set());
  const inFlightRef = useRef(new Set());

  // Load archived IDs from localStorage on mount, then sync via Realtime
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("kds_archived") || "[]");
      archivedRef.current = new Set(stored);
    } catch {}

    const load = () => {
      fetch("/api/kds/tickets")
        .then(r => r.json())
        .then(data => {
          if (!Array.isArray(data)) return;
          const incoming = data.map(mapTicket);
          // Clean up archived IDs that no longer exist in DB (e.g. paid orders)
          const liveIds = new Set(incoming.map(t => t.id));
          const staleArchived = [...archivedRef.current].filter(id => !liveIds.has(id));
          if (staleArchived.length > 0) {
            staleArchived.forEach(id => archivedRef.current.delete(id));
            try { localStorage.setItem("kds_archived", JSON.stringify([...archivedRef.current])); } catch {}
          }
          const fresh = incoming.filter(t => !archivedRef.current.has(t.id));
          // Don't overwrite tickets whose PATCH is still in-flight — the server
          // may not have committed yet and would roll back the optimistic state.
          setTickets(prev => fresh.map(t => {
            if (inFlightRef.current.has(t.id)) {
              return prev.find(p => p.id === t.id) ?? t;
            }
            return t;
          }));
        })
        .catch(() => {});
    };

    load(); // first paint; subscribeRealtime also re-syncs on SUBSCRIBED/reconnect
    // Live POS→KDS updates over Supabase Realtime (WebSocket) instead of the old
    // 8s HTTP poll — new/changed tickets surface in <1s (RNF1).
    return subscribeRealtime(["orders", "order_lines"], load, { name: "kds-tickets" });
  }, []);

  const handleAdvance = useCallback(async (ticketId, next) => {
    if (next === "servido") {
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      archivedRef.current.add(ticketId);
      try { localStorage.setItem("kds_archived", JSON.stringify([...archivedRef.current])); } catch {}
      addLog("ACTION", `Ticket <strong>#${ticketId.slice(0,8)}</strong> arquivado (servido).`);
      addToast(`Ticket arquivado`, T.teal);
      return;
    }
    // Capture current state for rollback and toast before the optimistic update
    const prevTicket = tickets.find(t => t.id === ticketId);
    const prevStatus = prevTicket?.status;
    // Mark in-flight so the poll doesn't overwrite our optimistic state
    inFlightRef.current.add(ticketId);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: next } : t));
    try {
      await fetch(`/api/kds/tickets/${ticketId}`, { method: "PATCH" });
      addLog("ACTION", `Ticket <strong>#${ticketId.slice(0,8)}</strong> → <strong>${statusLabel(next)}</strong>.`);
      if (next === "pronto") {
        addToast(`Mesa ${prevTicket?.table || "—"} pronto! 🔔`, T.success);
      }
    } catch {
      // Rollback to actual previous status
      if (prevStatus) {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: prevStatus } : t));
      }
      addToast("Erro ao avançar ticket", T.danger);
    } finally {
      inFlightRef.current.delete(ticketId);
    }
  }, [addLog, addToast, tickets]);

  const handleCancelOrder = useCallback(async (ticketId, motivo) => {
    const ticket = tickets.find(t => t.id === ticketId);
    // Optimistic — remove the whole ticket from the board
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    try {
      const res = await fetch(`/api/orders/${ticketId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: motivo }),
      });
      if (!res.ok) throw new Error();
      // Don't let the poll re-add it before the DB reflects "cancelled"
      archivedRef.current.add(ticketId);
      try { localStorage.setItem("kds_archived", JSON.stringify([...archivedRef.current])); } catch {}
      addLog("CANCEL", `Pedido <strong>#${ticketId.slice(0,8)}</strong> (${ticket?.table ? `Mesa ${ticket.table}` : "balcão"}) anulado por completo.`, motivo);
      addToast(`Pedido anulado — ${ticket?.table ? `Mesa ${ticket.table}` : "balcão"}`, T.danger);
    } catch {
      if (ticket) setTickets(prev => prev.some(t => t.id === ticketId) ? prev : [...prev, ticket]);
      addToast("Erro ao cancelar pedido", T.danger);
    }
  }, [addLog, addToast, tickets]);

  const byStatus = (s) => tickets.filter(t => t.status === s);
  const totalActive = tickets.filter(t => t.status !== "pronto").length;

  return (
    <>
      <style>{css}</style>
      <div className="kds-root">
        {/* HEADER */}
        <header className="kds-header">
          <div className="kds-logo">
            <div className="kds-logo-dot" />
            KDS
            <span style={{ color: T.textMuted, fontWeight: 400, fontSize: 14, marginLeft: 4 }}>
              — Cozinha
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="live-dot-wrap">
              <div className="live-dot" />
              {totalActive} activo{totalActive !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="kds-meta">
            <button
              className={`header-btn${logsOpen ? " active" : ""}`}
              onClick={() => setLogsOpen(v => !v)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Logs
              {logs.length > 0 && (
                <span style={{
                  background: T.accent, color: "#fff", borderRadius: 10,
                  fontSize: 10, padding: "1px 5px", minWidth: 18, textAlign: "center"
                }}>{logs.length}</span>
              )}
            </button>
            <Clock />
          </div>
        </header>

        {/* COLUMNS */}
        <div className="kds-cols-wrap">
          {["pendente", "em_preparacao", "pronto"].map(s => (
            <KDSColumn
              key={s}
              status={s}
              tickets={byStatus(s)}
              onAdvance={handleAdvance}
              onCancelOrder={handleCancelOrder}
            />
          ))}
        </div>
      </div>

      {/* LOGS PANEL */}
      <LogsPanel logs={logs} open={logsOpen} onClose={() => setLogsOpen(false)} />

      {/* TOASTS */}
      <Toasts toasts={toasts} />
    </>
  );
}
