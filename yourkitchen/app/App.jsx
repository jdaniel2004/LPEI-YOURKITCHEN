import { useState, useCallback, useEffect } from "react";
import Login      from "@/components/login";
import POS        from "@/components/pos";
import KDS        from "@/components/kds";
import Backoffice from "@/components/backoffice";
// ─────────────────────────────────────────────────────────────────────────────
// No teu projecto Next.js, substitui os stubs abaixo por imports reais:
//
//   import Login      from "@/components/login";
//   import POS        from "@/components/pos";
//   import KDS        from "@/components/kds";
//   import Backoffice from "@/components/backoffice";
//
// Este ficheiro de preview usa versões stub para demonstrar o routing/sessão.
// ─────────────────────────────────────────────────────────────────────────────

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

/* ─ STUBS (substituir por imports reais) ─ */
.stub-root{
  width:100%;height:100%;display:flex;align-items:center;justify-content:center;
  background:${T.bg};position:relative;overflow:hidden;
}
.stub-bg{
  position:absolute;inset:0;pointer-events:none;
  opacity:.06;
  background-image:linear-gradient(${T.border} 1px,transparent 1px),linear-gradient(90deg,${T.border} 1px,transparent 1px);
  background-size:40px 40px;
}
.stub-card{
  width:480px;background:${T.surface};border:1px solid ${T.border};
  border-radius:16px;overflow:hidden;animation:slideUp .3s ease;
}
.stub-head{
  padding:28px 32px 24px;border-bottom:1px solid ${T.border};
  display:flex;align-items:center;gap:16px;
}
.stub-icon{width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;}
.stub-title{font-size:22px;font-weight:800;}
.stub-sub{font-size:13px;color:${T.textSec};margin-top:3px;}
.stub-body{padding:24px 32px 28px;}
.stub-note{
  background:${T.elevated};border:1px solid ${T.border};border-radius:10px;
  padding:16px 18px;font-family:'DM Mono',monospace;font-size:12px;
  color:${T.textSec};line-height:1.8;margin-bottom:20px;
}
.stub-note code{color:${T.accent};background:${T.accentDim};padding:1px 5px;border-radius:3px;}
.stub-info{display:flex;flex-direction:column;gap:8px;margin-bottom:24px;}
.stub-info-row{display:flex;gap:10px;align-items:center;font-size:13px;}
.stub-info-key{color:${T.textMuted};min-width:120px;font-size:11px;letter-spacing:1px;text-transform:uppercase;}
.stub-info-val{color:${T.text};font-weight:600;}
.stub-action{
  width:100%;padding:13px;border:none;border-radius:10px;
  font-family:'Syne',sans-serif;font-size:14px;font-weight:700;cursor:pointer;
  transition:all .15s;display:flex;align-items:center;justify-content:center;gap:8px;
}
.stub-action:active{transform:scale(.98);}

/* ─ SESSION SUMMARY (manager dashboard quick-nav) ─ */
.quick-nav{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px;}
.qn-card{
  padding:16px;border-radius:10px;border:1px solid transparent;cursor:pointer;
  transition:all .2s;text-align:center;
}
.qn-card:hover{transform:translateY(-2px);}
.qn-card:active{transform:scale(.97);}
.qn-icon{font-size:24px;margin-bottom:8px;}
.qn-label{font-size:13px;font-weight:700;}
.qn-sub{font-size:11px;margin-top:3px;}
`;

// ─── CLOCK ────────────────────────────────────────────────────────────────────
function GClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return <div className="g-clock">{t.toLocaleTimeString("pt-PT", { hour:"2-digit", minute:"2-digit" })}</div>;
}

// ─── GLOBAL NAV ───────────────────────────────────────────────────────────────
function GlobalNav({ session, navigate, logout, canAccess }) {
  const roleColor = session.role === "manager" ? T.accent : session.role === "kitchen" ? T.teal : T.warning;
  const roleLabel = { manager:"GESTOR", waiter:"WAITER", kitchen:"COZINHA" }[session.role];
  const initials  = session.name.slice(0, 2).toUpperCase();

  return (
    <nav className="g-nav">
      <div className="g-logo">
        <div className="g-logo-dot" />
        RestaurantOS
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

// ─── MODULE STUBS ─────────────────────────────────────────────────────────────
// Substitui cada Stub por import real do ficheiro correspondente.

function POSStub({ session, onNavigate }) {
  return (
    <div className="stub-root">
      <div className="stub-bg" />
      <div className="stub-card">
        <div className="stub-head">
          <div className="stub-icon" style={{ background:T.accentDim, border:`1px solid ${T.accent}33` }}>🖥️</div>
          <div>
            <div className="stub-title" style={{ color:T.accent }}>POS</div>
            <div className="stub-sub">Point of Sale — Gestão de Pedidos</div>
          </div>
        </div>
        <div className="stub-body">
          <div className="stub-note">
            Substituir por: <code>import POS from "@/components/pos"</code><br/>
            Ficheiro: <code>pos.jsx</code> — FundoManeio → FloorMap → OrderScreen → Payment
          </div>
          <div className="stub-info">
            <div className="stub-info-row"><span className="stub-info-key">Utilizador</span><span className="stub-info-val">{session.name}</span></div>
            <div className="stub-info-row"><span className="stub-info-key">Função</span><span className="stub-info-val">{session.role}</span></div>
            <div className="stub-info-row"><span className="stub-info-key">Login às</span><span className="stub-info-val" style={{ fontFamily:"'DM Mono',monospace" }}>{session.loginAt?.toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"})}</span></div>
          </div>
          <button className="stub-action" style={{ background:T.accent, color:"#fff" }} onClick={() => alert("POS real: importa pos.jsx aqui")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            Abrir POS
          </button>
        </div>
      </div>
    </div>
  );
}

function KDSStub({ session }) {
  return (
    <div className="stub-root">
      <div className="stub-bg" />
      <div className="stub-card">
        <div className="stub-head">
          <div className="stub-icon" style={{ background:T.tealDim, border:`1px solid ${T.teal}33` }}>👨‍🍳</div>
          <div>
            <div className="stub-title" style={{ color:T.teal }}>KDS</div>
            <div className="stub-sub">Kitchen Display System — Cozinha</div>
          </div>
        </div>
        <div className="stub-body">
          <div className="stub-note">
            Substituir por: <code>import KDS from "@/components/kds"</code><br/>
            Ficheiro: <code>kds.jsx</code> — Pendente → Em Preparação → Pronto
          </div>
          <div className="stub-info">
            <div className="stub-info-row"><span className="stub-info-key">Utilizador</span><span className="stub-info-val">{session.name}</span></div>
            <div className="stub-info-row"><span className="stub-info-key">Função</span><span className="stub-info-val">{session.role}</span></div>
          </div>
          <button className="stub-action" style={{ background:T.teal, color:T.bg }} onClick={() => alert("KDS real: importa kds.jsx aqui")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            Abrir KDS
          </button>
        </div>
      </div>
    </div>
  );
}

function BackofficeStub({ session, onNavigate }) {
  const modules = [
    { id:"pos",  ...MODULE_META.pos  },
    { id:"kds",  ...MODULE_META.kds  },
  ];
  return (
    <div className="stub-root">
      <div className="stub-bg" />
      <div className="stub-card">
        <div className="stub-head">
          <div className="stub-icon" style={{ background:T.warningDim, border:`1px solid ${T.warning}33` }}>📊</div>
          <div>
            <div className="stub-title" style={{ color:T.warning }}>Backoffice</div>
            <div className="stub-sub">Dashboard · Analytics · Gestão</div>
          </div>
        </div>
        <div className="stub-body">
          <div className="stub-note">
            Substituir por: <code>import Backoffice from "@/components/backoffice"</code><br/>
            Ficheiro: <code>backoffice.jsx</code> — 10 secções completas
          </div>
          <div className="stub-info">
            <div className="stub-info-row"><span className="stub-info-key">Gestor</span><span className="stub-info-val">{session.name}</span></div>
            <div className="stub-info-row"><span className="stub-info-key">Acesso</span><span className="stub-info-val" style={{ color:T.success }}>Total</span></div>
          </div>
          <button className="stub-action" style={{ background:T.warning, color:T.bg, marginBottom:16 }} onClick={() => alert("Backoffice real: importa backoffice.jsx aqui")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            Abrir Backoffice
          </button>
          <div style={{ fontSize:11, color:T.textMuted, marginBottom:10, textTransform:"uppercase", letterSpacing:"1.5px", fontWeight:700 }}>Acesso Rápido</div>
          <div className="quick-nav">
            {modules.map(m => (
              <div key={m.id} className="qn-card" style={{ background:`${m.color}10`, border:`1px solid ${m.color}33`, "--c":m.color }} onClick={() => onNavigate(m.id)}>
                <div className="qn-icon">{m.icon}</div>
                <div className="qn-label" style={{ color:m.color }}>{m.label}</div>
                <div className="qn-sub" style={{ color:T.textMuted }}>Abrir →</div>
              </div>
            ))}
            <div className="qn-card" style={{ background:`${T.success}10`, border:`1px solid ${T.success}33`, cursor:"default" }}>
              <div className="qn-icon">🕐</div>
              <div className="qn-label" style={{ color:T.success }}>{new Date().toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"})}</div>
              <div className="qn-sub" style={{ color:T.textMuted }}>Turno activo</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN STUB ───────────────────────────────────────────────────────────────
// Em produção: substitui por <Login onSuccess={login} />

const MOCK_STAFF = [
  { id:"s1", name:"Sofia",   role:"waiter",  initials:"SO", color:T.accent  },
  { id:"s2", name:"João",    role:"waiter",  initials:"JO", color:T.teal    },
  { id:"s4", name:"Rui",     role:"kitchen", initials:"RU", color:"#B06AF7" },
];

function LoginStub({ onLogin }) {
  const [mode, setMode]   = useState(null); // null | "manager" | "staff"
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [err, setErr]     = useState("");

  const tryManager = () => {
    if (email === "admin@restaurantos.pt" && pw === "admin123")
      onLogin({ id:"m1", name:"Gestor", role:"manager", email });
    else setErr("Credenciais incorrectas.");
  };

  if (!mode) return (
    <div style={{ width:"100vw", height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg, flexDirection:"column", gap:32 }}>
      <style>{CSS}</style>
      <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:16, fontWeight:800 }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:T.accent, boxShadow:`0 0 14px ${T.accent}` }} />
        RestaurantOS
      </div>
      <div style={{ display:"flex", gap:12 }}>
        {[
          { id:"manager", label:"Gestor", icon:"🔐", color:T.accent, sub:"Email + Password" },
          { id:"staff",   label:"Funcionário", icon:"👤", color:T.teal,   sub:"Nome + PIN" },
        ].map(c => (
          <div key={c.id} onClick={() => setMode(c.id)} style={{
            width:200, padding:"32px 20px", background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:14, cursor:"pointer", textAlign:"center",
            transition:"all .2s", display:"flex", flexDirection:"column", alignItems:"center", gap:14,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=`${c.color}55`; e.currentTarget.style.transform="translateY(-3px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.transform="none"; }}
          >
            <div style={{ width:56, height:56, borderRadius:"50%", background:`${c.color}18`, border:`1px solid ${c.color}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{c.icon}</div>
            <div>
              <div style={{ fontSize:17, fontWeight:800, color:c.color }}>{c.label}</div>
              <div style={{ fontSize:12, color:T.textMuted, marginTop:4 }}>{c.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:11, color:T.textMuted, fontFamily:"'DM Mono',monospace" }}>RestaurantOS · MVP</div>
    </div>
  );

  if (mode === "manager") return (
    <div style={{ width:"100vw", height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg }}>
      <style>{CSS}</style>
      <div style={{ width:380, background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, overflow:"hidden", animation:"slideUp .3s ease" }}>
        <div style={{ padding:"24px 28px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:T.accentDim, border:`1px solid ${T.accent}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🔐</div>
          <div><div style={{ fontSize:17, fontWeight:800 }}>Gestor</div><div style={{ fontSize:12, color:T.textSec }}>Acesso completo ao sistema</div></div>
        </div>
        <div style={{ padding:"24px 28px", display:"flex", flexDirection:"column", gap:14 }}>
          {[
            { label:"Email",    val:email,  set:setEmail, type:"email",    ph:"admin@restaurantos.pt" },
            { label:"Password", val:pw,     set:setPw,    type:"password", ph:"••••••••"              },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", color:T.textMuted, marginBottom:6 }}>{f.label}</div>
              <input style={{ width:"100%", background:T.card, border:`1px solid ${err?T.danger:T.border}`, borderRadius:8, color:T.text, fontFamily:"'Syne',sans-serif", fontSize:14, padding:"11px 14px", outline:"none" }}
                type={f.type} placeholder={f.ph} value={f.val}
                onChange={e => { f.set(e.target.value); setErr(""); }}
                onKeyDown={e => e.key==="Enter" && tryManager()}
              />
            </div>
          ))}
          {err && <div style={{ fontSize:12, color:T.danger, background:T.dangerDim, border:`1px solid ${T.danger}22`, borderRadius:8, padding:"10px 12px", animation:"fadeIn .2s" }}>⚠ {err}</div>}
          <button onClick={tryManager} style={{ padding:"13px", background:T.accent, border:"none", borderRadius:10, color:"#fff", fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, cursor:"pointer", marginTop:4 }}>
            Entrar
          </button>
          <div style={{ textAlign:"center", fontSize:11, color:T.textMuted, fontFamily:"'DM Mono',monospace" }}>admin@restaurantos.pt · admin123</div>
          <button onClick={() => setMode(null)} style={{ background:"none", border:"none", color:T.textMuted, fontSize:12, cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>← Voltar</button>
        </div>
      </div>
    </div>
  );

  // Staff picker
  return (
    <div style={{ width:"100vw", height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg }}>
      <style>{CSS}</style>
      <div style={{ width:420, animation:"slideUp .3s ease" }}>
        <div style={{ textAlign:"center", fontSize:11, fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", color:T.textMuted, marginBottom:20 }}>Quem és tu?</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          {MOCK_STAFF.map(s => (
            <div key={s.id} onClick={() => { onLogin({ ...s }); }}
              style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"18px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, transition:"all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=`${s.color}55`; e.currentTarget.style.transform="translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.transform="none"; }}
            >
              <div style={{ width:44, height:44, borderRadius:"50%", background:`${s.color}18`, border:`1px solid ${s.color}33`, color:s.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800 }}>{s.initials}</div>
              <div><div style={{ fontSize:14, fontWeight:700 }}>{s.name}</div><div style={{ fontSize:11, color:T.textMuted }}>{s.role}</div></div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center" }}>
          <button onClick={() => setMode(null)} style={{ background:"none", border:"none", color:T.textMuted, fontSize:12, cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>← Voltar</button>
        </div>
        <div style={{ textAlign:"center", marginTop:12, fontSize:11, color:T.textMuted, fontFamily:"'DM Mono',monospace" }}>PIN omitido neste preview — login directo</div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { session, login, logout, navigate, canAccess } = useSession();

  // Render sem sessão → Login
  if (!session) {
    return (
      <>
        <style>{CSS}</style>
        {/*
          Em produção:
            <Login onSuccess={login} />
          
          Preview usa stub simplificado (sem PIN completo):
        */}
        <LoginStub onLogin={login} />
      </>
    );
  }

  // Render com sessão → módulo activo
  const renderModule = () => {
    switch (session.module) {
      case "pos":
        // Em produção: return <POS session={session} />;
        return <POSStub session={session} onNavigate={navigate} />;
      case "kds":
        // Em produção: return <KDS session={session} />;
        return <KDSStub session={session} />;
      case "backoffice":
        // Em produção: return <Backoffice session={session} />;
        return <BackofficeStub session={session} onNavigate={navigate} />;
      default:
        return null;
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app-shell">
        <GlobalNav session={session} navigate={navigate} logout={logout} canAccess={canAccess} />
        <div className="module-area">
          <div className="module-frame" key={session.module}>
            {renderModule()}
          </div>
        </div>
      </div>
    </>
  );
}
