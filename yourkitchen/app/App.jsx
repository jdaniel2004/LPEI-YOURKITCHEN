"use client";
import { useState, useCallback, useEffect } from "react";
import Login     from "@/components/login";
import POS        from "@/components/pos";
import KDS        from "@/components/kds";
import Backoffice from "@/components/backoffice";

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const T = {
  bg:"#08080B", surface:"#0F0F14", card:"#15151C", elevated:"#1C1C25",
  border:"#252530", borderBright:"#32324A",
  accent:"#7C6AF7", accentDim:"#7C6AF720", accentMid:"#7C6AF740",
  teal:"#3ECFAE",   tealDim:"#3ECFAE18",
  danger:"#F75A5A", dangerDim:"#F75A5A18",
  warning:"#F7A94A",warningDim:"#F7A94A18",
  success:"#4AF785",successDim:"#4AF78518",
  text:"#EDEDF2",   textSec:"#8888A0", textMuted:"#4A4A60",
};

// ─── ROLE CONFIG ─────────────────────────────────────────────────────────────
//
//  role       | POS | KDS | Backoffice
//  -----------|-----|-----|----------
//  manager    |  ✓  |  ✓  |     ✓
//  waiter     |  ✓  |  —  |     —
//  kitchen    |  —  |  ✓  |     —
//
const ROLE_ACCESS = {
  manager : ["pos","kds","backoffice"],
  waiter  : ["pos"],
  kitchen : ["kds"],
};
const DEFAULT_MODULE = {
  manager : "backoffice",
  waiter  : "pos",
  kitchen : "kds",
};
const MODULE_META = {
  pos        : { label:"POS",         icon:"🖥️",  color:T.accent  },
  kds        : { label:"KDS",         icon:"👨‍🍳",  color:T.teal    },
  backoffice : { label:"Backoffice",  icon:"📊",  color:T.warning },
};

// ─── SESSION HOOK ─────────────────────────────────────────────────────────────
function useSession() {
  const [session, setSession] = useState(null); // null = não autenticado

  const login = useCallback((user) => {
    setSession({
      ...user,
      loginAt : new Date(),
      module  : DEFAULT_MODULE[user.role] || "pos",
    });
  }, []);

  const logout = useCallback(() => setSession(null), []);

  const navigate = useCallback((mod) => {
    setSession(s => {
      if (!s) return s;
      if (!ROLE_ACCESS[s.role]?.includes(mod)) return s; // guard
      return { ...s, module: mod };
    });
  }, []);

  const canAccess = useCallback((mod) => {
    if (!session) return false;
    return ROLE_ACCESS[session.role]?.includes(mod) ?? false;
  }, [session]);

  return { session, login, logout, navigate, canAccess };
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{width:100%;height:100%;overflow:hidden;background:${T.bg};color:${T.text};font-family:'Syne',sans-serif;-webkit-tap-highlight-color:transparent;user-select:none;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px;}
@keyframes fadeIn {from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes glow   {0%,100%{box-shadow:0 0 16px var(--c)44}50%{box-shadow:0 0 32px var(--c)88}}

/* ─ SHELL ─ */
.app-shell{width:100vw;height:100vh;display:flex;flex-direction:column;overflow:hidden;}

/* ─ GLOBAL NAV ─ */
.g-nav{
  height:52px;background:${T.surface};border-bottom:1px solid ${T.border};
  display:flex;align-items:center;padding:0 16px;gap:12px;
  flex-shrink:0;z-index:50;
}
.g-logo{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:800;letter-spacing:-.5px;}
.g-logo-dot{width:8px;height:8px;border-radius:50%;background:${T.accent};box-shadow:0 0 10px ${T.accent};}
.g-sep{width:1px;height:22px;background:${T.border};}
.g-tabs{display:flex;gap:4px;}
.g-tab{
  display:flex;align-items:center;gap:7px;padding:7px 14px;border-radius:8px;
  font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;
  border:1px solid transparent;
}
.g-tab:hover{background:${T.elevated};border-color:${T.border};}
.g-tab.active{border-color:var(--tc)44;background:var(--tc)18;color:var(--tc);}
.g-tab.locked{opacity:.3;cursor:not-allowed;pointer-events:none;}
.g-tab-icon{font-size:14px;}
.g-right{margin-left:auto;display:flex;align-items:center;gap:10px;}
.g-user{
  display:flex;align-items:center;gap:8px;padding:5px 12px;
  background:${T.elevated};border:1px solid ${T.border};border-radius:8px;
}
.g-avatar{
  width:26px;height:26px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:10px;font-weight:800;
}
.g-user-name{font-size:12px;font-weight:600;}
.g-role-badge{
  font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;
  letter-spacing:.5px;
}
.g-logout{
  background:${T.elevated};border:1px solid ${T.border};color:${T.textSec};
  border-radius:8px;padding:7px 12px;font-family:'Syne',sans-serif;
  font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;
  display:flex;align-items:center;gap:6px;
}
.g-logout:hover{border-color:${T.danger}44;color:${T.danger};background:${T.dangerDim};}
.g-clock{font-family:'DM Mono',monospace;font-size:13px;color:${T.textMuted};}

/* ─ MODULE AREA ─ */
.module-area{flex:1;overflow:hidden;position:relative;}
.module-frame{width:100%;height:100%;animation:fadeIn .2s ease;}

`;

// ─── CLOCK ────────────────────────────────────────────────────────────────────
function GClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return <div className="g-clock">{t.toLocaleTimeString("pt-PT", { hour:"2-digit", minute:"2-digit" })}</div>;
}

// ─── GLOBAL NAV ───────────────────────────────────────────────────────────────
function GlobalNav({ session, navigate, logout, canAccess, appName }) {
  const roleColor = session.role === "manager" ? T.accent : session.role === "kitchen" ? T.teal : T.warning;
  const roleLabel = { manager:"GESTOR", waiter:"WAITER", kitchen:"COZINHA" }[session.role];
  const initials  = session.name.slice(0, 2).toUpperCase();

  return (
    <nav className="g-nav">
      <div className="g-logo">
        <div className="g-logo-dot" />
        {appName}
      </div>
      <div className="g-sep" />
      <div className="g-tabs">
        {Object.entries(MODULE_META).map(([id, meta]) => {
          const active  = session.module === id;
          const locked  = !canAccess(id);
          return (
            <div
              key={id}
              className={`g-tab${active ? " active" : ""}${locked ? " locked" : ""}`}
              style={{ "--tc": meta.color }}
              onClick={() => !locked && navigate(id)}
              title={locked ? `Sem acesso (${session.role})` : meta.label}
            >
              <span className="g-tab-icon">{meta.icon}</span>
              {meta.label}
              {locked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity:.5 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
            </div>
          );
        })}
      </div>

      <div className="g-right">
        <GClock />
        <div className="g-user">
          <div className="g-avatar" style={{ background:`${roleColor}18`, border:`1px solid ${roleColor}33`, color:roleColor }}>
            {initials}
          </div>
          <div>
            <div className="g-user-name">{session.name}</div>
          </div>
          <div className="g-role-badge" style={{ color:roleColor, background:`${roleColor}18` }}>
            {roleLabel}
          </div>
        </div>
        <button className="g-logout" onClick={logout}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sair
        </button>
      </div>
    </nav>
  );
}


// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { session, login, logout, navigate, canAccess } = useSession();
  const [appName, setAppName] = useState("RestaurantOS");

  // Load the configured restaurant name once authenticated; cache it for the
  // login screen (which is pre-auth and cannot read settings).
  useEffect(() => {
    if (!session) return;
    fetch("/api/settings").then(r => r.json()).then(flat => {
      const n = flat && !flat.error ? flat["geral.name"] : null;
      if (n) { setAppName(n); try { localStorage.setItem("ros_app_name", n); } catch {} }
    }).catch(() => {});
  }, [session]);

  // Render sem sessão → Login
  if (!session) {
    return (
      <>
        <style>{CSS}</style>
        <Login onSuccess={login} />
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="app-shell">
        <GlobalNav session={session} navigate={navigate} logout={logout} canAccess={canAccess} appName={appName} />
        <div className="module-area">
          {canAccess("pos") && (
            <div className="module-frame" style={{display:session.module==="pos"?"block":"none"}}>
              <POS session={session} appName={appName} />
            </div>
          )}
          {canAccess("kds") && (
            <div className="module-frame" style={{display:session.module==="kds"?"block":"none"}}>
              <KDS />
            </div>
          )}
          {canAccess("backoffice") && (
            <div className="module-frame" style={{display:session.module==="backoffice"?"block":"none"}}>
              <Backoffice appName={appName} onAppNameChange={setAppName} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
