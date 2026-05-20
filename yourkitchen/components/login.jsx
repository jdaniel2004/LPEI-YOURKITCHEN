import { useState, useEffect, useRef, useCallback } from "react";

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const T = {
  bg:"#08080B", surface:"#0F0F14", card:"#15151C", elevated:"#1C1C25",
  border:"#252530", borderBright:"#32324A",
  accent:"#7C6AF7", accentDim:"#7C6AF718", accentMid:"#7C6AF740",
  teal:"#3ECFAE", tealDim:"#3ECFAE18",
  danger:"#F75A5A", dangerDim:"#F75A5A18",
  success:"#4AF785", successDim:"#4AF78518",
  text:"#EDEDF2", textSec:"#8888A0", textMuted:"#4A4A60",
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const ROLE_COLORS = ["#7C6AF7","#3ECFAE","#F7A94A","#B06AF7","#4A9EF7","#F75A5A"];
function staffColor(name){ let h=0; for(const c of name) h=(h*31+c.charCodeAt(0))&0xffff; return ROLE_COLORS[h%ROLE_COLORS.length]; }
function staffInitials(name){ const w=name.trim().split(/\s+/); return (w[0]?.[0]??"")+(w[1]?.[0]??w[0]?.[1]??"").toUpperCase(); }

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{width:100%;height:100%;overflow:hidden;background:${T.bg};color:${T.text};font-family:'Syne',sans-serif;-webkit-tap-highlight-color:transparent;user-select:none;}
input{font-family:'Syne',sans-serif;color:${T.text};}

@keyframes fadeIn   { from{opacity:0} to{opacity:1} }
@keyframes slideUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
@keyframes slideLeft{ from{opacity:0;transform:translateX(32px)} to{opacity:1;transform:translateX(0)} }
@keyframes slideRight{from{opacity:0;transform:translateX(-32px)} to{opacity:1;transform:translateX(0)} }
@keyframes shake    { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-8px)} 80%{transform:translateX(8px)} }
@keyframes dotPop   { 0%{transform:scale(0)} 60%{transform:scale(1.3)} 100%{transform:scale(1)} }
@keyframes spin     { from{transform:rotate(0)} to{transform:rotate(360deg)} }
@keyframes bgDrift  { 0%,100%{transform:scale(1) rotate(0deg)} 50%{transform:scale(1.08) rotate(3deg)} }
@keyframes success  { 0%{transform:scale(.8);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
@keyframes glow     { 0%,100%{box-shadow:0 0 20px ${T.accent}44} 50%{box-shadow:0 0 40px ${T.accent}88} }
@keyframes countDown{ from{stroke-dashoffset:0} to{stroke-dashoffset:157} }

/* ─ ROOT ─ */
.login-root {
  width:100vw; height:100vh;
  display:flex; align-items:center; justify-content:center;
  position:relative; overflow:hidden;
}

/* ─ BACKGROUND ─ */
.bg-layer {
  position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(ellipse 80% 60% at 20% 50%, ${T.accent}0A 0%, transparent 60%),
    radial-gradient(ellipse 60% 80% at 80% 30%, ${T.teal}06 0%, transparent 60%),
    radial-gradient(ellipse 40% 40% at 60% 80%, #B06AF706 0%, transparent 60%);
  animation: bgDrift 18s ease-in-out infinite;
}
.bg-grid {
  position:absolute; inset:0; pointer-events:none;
  background-image:
    linear-gradient(${T.border}40 1px, transparent 1px),
    linear-gradient(90deg, ${T.border}40 1px, transparent 1px);
  background-size:40px 40px;
  mask-image:radial-gradient(ellipse 70% 70% at 50% 50%, black 0%, transparent 80%);
  opacity:.4;
}

/* ─ WORDMARK ─ */
.wordmark {
  position:absolute; top:24px; left:50%; transform:translateX(-50%);
  display:flex; align-items:center; gap:10px;
  animation:fadeIn .6s ease;
}
.wm-dot { width:9px; height:9px; border-radius:50%; background:${T.accent}; box-shadow:0 0 14px ${T.accent}; }
.wm-text { font-size:15px; font-weight:800; letter-spacing:-.5px; color:${T.text}; }
.wm-ver  { font-size:11px; color:${T.textMuted}; font-family:'DM Mono',monospace; margin-left:2px; }

/* ─ SELECTOR ─ */
.selector-wrap  { display:flex; flex-direction:column; align-items:center; gap:32px; animation:slideUp .5s ease; }
.selector-title { font-size:13px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:${T.textMuted}; }
.selector-cards { display:flex; gap:16px; }

.sel-card {
  width:220px; padding:36px 24px 32px;
  background:${T.surface}; border:1px solid ${T.border};
  border-radius:16px; cursor:pointer; text-align:center;
  transition:all .25s cubic-bezier(.4,0,.2,1);
  display:flex; flex-direction:column; align-items:center; gap:16px;
  position:relative; overflow:hidden;
}
.sel-card::before {
  content:''; position:absolute; inset:0;
  opacity:0; transition:opacity .25s;
  border-radius:16px;
}
.sel-card.manager::before { background:radial-gradient(ellipse at 50% 0%, ${T.accent}18 0%, transparent 70%); }
.sel-card.staff::before   { background:radial-gradient(ellipse at 50% 0%, ${T.teal}18 0%, transparent 70%); }
.sel-card:hover { transform:translateY(-4px); border-color:${T.borderBright}; }
.sel-card:hover::before   { opacity:1; }
.sel-card:active           { transform:scale(.97); }
.sel-card.manager:hover    { border-color:${T.accent}55; box-shadow:0 0 0 1px ${T.accent}22; }
.sel-card.staff:hover      { border-color:${T.teal}55;   box-shadow:0 0 0 1px ${T.teal}22; }

.sel-icon {
  width:64px; height:64px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:28px; border:1px solid transparent;
  transition:all .25s;
}
.sel-card.manager .sel-icon { background:${T.accentDim}; border-color:${T.accent}33; }
.sel-card.staff   .sel-icon { background:${T.tealDim};   border-color:${T.teal}33; }
.sel-card:hover .sel-icon   { transform:scale(1.08); }

.sel-label { font-size:18px; font-weight:800; letter-spacing:-.3px; }
.sel-card.manager .sel-label { color:${T.accent}; }
.sel-card.staff   .sel-label { color:${T.teal}; }
.sel-sub   { font-size:12px; color:${T.textMuted}; line-height:1.5; }

/* ─ BACK BUTTON ─ */
.back-btn {
  position:absolute; top:20px; left:20px;
  display:flex; align-items:center; gap:6px;
  background:${T.elevated}; border:1px solid ${T.border};
  color:${T.textSec}; font-family:'Syne',sans-serif; font-size:12px; font-weight:600;
  padding:8px 14px; border-radius:8px; cursor:pointer;
  transition:all .15s; animation:fadeIn .3s ease;
}
.back-btn:hover { border-color:${T.borderBright}; color:${T.text}; }
.back-btn:active{ transform:scale(.97); }

/* ─ MANAGER LOGIN ─ */
.manager-wrap {
  width:400px; animation:slideLeft .35s ease;
}
.login-card {
  background:${T.surface}; border:1px solid ${T.border};
  border-radius:16px; overflow:hidden;
}
.login-card-head {
  padding:28px 28px 24px; border-bottom:1px solid ${T.border};
  display:flex; align-items:center; gap:14px;
}
.login-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; }
.login-icon.mgr { background:${T.accentDim}; border:1px solid ${T.accent}33; }
.login-card-title { font-size:18px; font-weight:800; }
.login-card-sub { font-size:12px; color:${T.textSec}; margin-top:2px; }
.login-card-body { padding:24px 28px 28px; display:flex; flex-direction:column; gap:16px; }

.field-wrap { display:flex; flex-direction:column; gap:6px; }
.field-label { font-size:10px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:${T.textMuted}; }
.field-input-wrap { position:relative; }
.field-input {
  width:100%; background:${T.card}; border:1px solid ${T.border};
  border-radius:8px; color:${T.text}; font-family:'Syne',sans-serif;
  font-size:14px; padding:12px 14px; outline:none; transition:all .15s;
}
.field-input:focus { border-color:${T.accent}55; box-shadow:0 0 0 3px ${T.accentDim}; }
.field-input.error { border-color:${T.danger}55; }
.toggle-vis {
  position:absolute; right:12px; top:50%; transform:translateY(-50%);
  background:none; border:none; color:${T.textMuted}; cursor:pointer;
  padding:4px; transition:color .15s;
}
.toggle-vis:hover { color:${T.text}; }
.error-msg { font-size:12px; color:${T.danger}; display:flex; align-items:center; gap:6px; padding:10px 12px; background:${T.dangerDim}; border:1px solid ${T.danger}22; border-radius:8px; animation:fadeIn .2s; }
.login-btn {
  width:100%; padding:14px; background:${T.accent}; border:none;
  border-radius:10px; color:#fff; font-family:'Syne',sans-serif;
  font-size:14px; font-weight:700; cursor:pointer; letter-spacing:.3px;
  transition:all .2s; display:flex; align-items:center; justify-content:center; gap:8px;
}
.login-btn:hover { background:#6a59e8; }
.login-btn:active{ transform:scale(.98); }
.login-btn:disabled{ opacity:.5; cursor:not-allowed; transform:none; }
.login-hint { font-size:11px; color:${T.textMuted}; text-align:center; font-family:'DM Mono',monospace; }

/* ─ STAFF GRID ─ */
.staff-wrap { width:520px; animation:slideLeft .35s ease; }
.staff-grid-title { font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:${T.textMuted}; margin-bottom:16px; text-align:center; }
.staff-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }

.staff-tile {
  background:${T.surface}; border:1px solid ${T.border};
  border-radius:12px; padding:20px 16px;
  cursor:pointer; display:flex; align-items:center; gap:14px;
  transition:all .2s; position:relative; overflow:hidden;
}
.staff-tile::before { content:''; position:absolute; inset:0; opacity:0; transition:opacity .2s; }
.staff-tile:hover   { transform:translateY(-2px); }
.staff-tile:active  { transform:scale(.97); }
.staff-tile.selected{ animation:glow .8s ease; }
.st-avatar {
  width:48px; height:48px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:16px; font-weight:800; flex-shrink:0;
  transition:transform .2s;
}
.staff-tile:hover .st-avatar { transform:scale(1.05); }
.st-name { font-size:15px; font-weight:700; }
.st-role { font-size:11px; color:${T.textMuted}; margin-top:2px; font-weight:500; }

/* ─ PIN PAD ─ */
.pin-wrap   { width:340px; animation:slideLeft .3s ease; display:flex; flex-direction:column; align-items:center; gap:0; }
.pin-staff  { display:flex; align-items:center; gap:12px; margin-bottom:28px; }
.pin-av     { width:52px; height:52px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:17px; font-weight:800; }
.pin-name   { font-size:20px; font-weight:800; }
.pin-role   { font-size:12px; color:${T.textMuted}; margin-top:2px; }

.pin-dots   { display:flex; gap:14px; margin-bottom:28px; height:20px; align-items:center; }
.pin-dot    {
  width:16px; height:16px; border-radius:50%; border:2px solid ${T.border};
  transition:all .2s; background:transparent;
}
.pin-dot.filled { border-color:var(--dot-color,${T.accent}); background:var(--dot-color,${T.accent}); animation:dotPop .2s ease; }
.pin-dot.error  { border-color:${T.danger}; background:${T.danger}; }

.pin-pad    { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; width:100%; }
.pin-pad.shake { animation:shake .35s ease; }
.pn-btn {
  aspect-ratio:1; background:${T.card}; border:1px solid ${T.border};
  color:${T.text}; font-family:'DM Mono',monospace; font-size:22px; font-weight:500;
  border-radius:12px; cursor:pointer; transition:all .12s;
  display:flex; align-items:center; justify-content:center;
}
.pn-btn:hover  { background:${T.elevated}; border-color:${T.borderBright}; }
.pn-btn:active { transform:scale(.93); background:${T.accentDim}; border-color:${T.accent}55; }
.pn-btn.del    { font-size:16px; color:${T.textSec}; }
.pn-btn.empty  { pointer-events:none; background:transparent; border-color:transparent; }

.pin-timeout {
  display:flex; align-items:center; gap:8px; margin-top:20px;
  font-size:11px; color:${T.textMuted}; font-family:'DM Mono',monospace;
}
.timeout-ring { position:relative; width:20px; height:20px; flex-shrink:0; }
.timeout-ring svg { transform:rotate(-90deg); }
.timeout-track { fill:none; stroke:${T.border}; stroke-width:2.5; }
.timeout-prog  { fill:none; stroke:${T.accent}; stroke-width:2.5; stroke-linecap:round; stroke-dasharray:157; transition:stroke-dashoffset .9s linear; }

/* ─ SUCCESS ─ */
.success-wrap { display:flex; flex-direction:column; align-items:center; gap:20px; animation:success .5s ease forwards; }
.success-ring { width:96px; height:96px; border-radius:50%; display:flex; align-items:center; justify-content:center; animation:glow 1.5s ease infinite; }
.success-check{ font-size:42px; }
.success-label{ font-size:22px; font-weight:800; }
.success-sub  { font-size:13px; color:${T.textSec}; }
.success-pill { background:${T.accentDim}; border:1px solid ${T.accent}44; color:${T.accent}; border-radius:20px; padding:6px 16px; font-size:12px; font-weight:700; margin-top:4px; }
`;

// ─── CLOCK ────────────────────────────────────────────────────────────────────
function Clock(){
  const [t,setT]=useState(null);
  useEffect(()=>{setT(new Date());const i=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(i);},[]);
  if(!t) return null;
  const d=t.toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"});
  const h=t.toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"});
  return(
    <div style={{position:"absolute",bottom:24,left:"50%",transform:"translateX(-50%)",textAlign:"center",animation:"fadeIn .8s ease"}}>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:28,fontWeight:500,letterSpacing:2,color:T.textSec}}>{h}</div>
      <div style={{fontSize:12,color:T.textMuted,marginTop:4,textTransform:"capitalize"}}>{d}</div>
    </div>
  );
}

// ─── SELECTOR ────────────────────────────────────────────────────────────────
function Selector({onSelect}){
  return(
    <div className="selector-wrap">
      <div className="selector-title">Identificação</div>
      <div className="selector-cards">
        <div className="sel-card manager" onClick={()=>onSelect("manager")}>
          <div className="sel-icon">🔐</div>
          <div>
            <div className="sel-label">Gestor</div>
            <div className="sel-sub">Acesso completo<br/>Email + Password</div>
          </div>
          <div style={{marginTop:4,fontSize:11,color:T.accent,fontFamily:"'DM Mono',monospace",letterSpacing:.5}}>ADMIN →</div>
        </div>
        <div className="sel-card staff" onClick={()=>onSelect("staff")}>
          <div className="sel-icon">👤</div>
          <div>
            <div className="sel-label">Funcionário</div>
            <div className="sel-sub">POS / Cozinha<br/>Nome + PIN</div>
          </div>
          <div style={{marginTop:4,fontSize:11,color:T.teal,fontFamily:"'DM Mono',monospace",letterSpacing:.5}}>TURNO →</div>
        </div>
      </div>
      <div style={{fontSize:11,color:T.textMuted,fontFamily:"'DM Mono',monospace",letterSpacing:.5}}>
        RestaurantOS · v1.0 · MVP
      </div>
    </div>
  );
}

// ─── MANAGER LOGIN ────────────────────────────────────────────────────────────
function ManagerLogin({onBack,onSuccess}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [showPw,setShowPw]=useState(false);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  const submit=async()=>{
    if(!email||!password){setError("Preenche email e password.");return;}
    setLoading(true);setError("");
    try{
      const r=await fetch("/api/auth/manager",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const d=await r.json();
      if(!r.ok){setError(d.error||"Email ou password incorrectos.");setLoading(false);return;}
      onSuccess(d.user);
    }catch{setError("Erro de ligação. Tenta novamente.");setLoading(false);}
  };

  return(
    <div className="manager-wrap">
      <button className="back-btn" onClick={onBack}>
        <svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Voltar
      </button>
      <div className="login-card">
        <div className="login-card-head">
          <div className="login-icon mgr">🔐</div>
          <div>
            <div className="login-card-title">Gestor</div>
            <div className="login-card-sub">Acesso ao Backoffice e POS</div>
          </div>
        </div>
        <div className="login-card-body">
          <div className="field-wrap">
            <div className="field-label">Email</div>
            <input
              className={`field-input${error?" error":""}`}
              type="email" placeholder="admin@restaurantos.pt"
              value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
              onKeyDown={e=>e.key==="Enter"&&submit()}
              autoFocus
            />
          </div>
          <div className="field-wrap">
            <div className="field-label">Password</div>
            <div className="field-input-wrap">
              <input
                className={`field-input${error?" error":""}`}
                type={showPw?"text":"password"} placeholder="••••••••"
                value={password} onChange={e=>{setPassword(e.target.value);setError("");}}
                onKeyDown={e=>e.key==="Enter"&&submit()}
                style={{paddingRight:44}}
              />
              <button className="toggle-vis" onClick={()=>setShowPw(v=>!v)} tabIndex={-1}>
                {showPw
                  ? <svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1"y1="1"x2="23"y2="23"/></svg>
                  : <svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12"cy="12"r="3"/></svg>
                }
              </button>
            </div>
          </div>
          {error&&<div className="error-msg"><svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><circle cx="12"cy="12"r="10"/><line x1="12"y1="8"x2="12"y2="12"/><line x1="12"y1="16"x2="12.01"y2="16"/></svg>{error}</div>}
          <button className="login-btn" onClick={submit} disabled={loading}>
            {loading
              ? <svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"style={{animation:"spin .8s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              : <svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15"y1="12"x2="3"y2="12"/></svg>
            }
            {loading?"A verificar...":"Entrar"}
          </button>
          <div className="login-hint">admin@restaurantos.pt · admin123</div>
        </div>
      </div>
    </div>
  );
}

// ─── STAFF PICK ───────────────────────────────────────────────────────────────
function StaffPick({onSelect,onBack}){
  const [staff,setStaff]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    fetch("/api/auth/staff")
      .then(r=>r.json())
      .then(d=>{ setStaff(Array.isArray(d)?d:[]); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);

  const ROLE_LABEL={manager:"Gestor",waiter:"Empregado",kitchen:"Cozinha"};

  return(
    <div className="staff-wrap">
      <button className="back-btn" onClick={onBack}>
        <svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Voltar
      </button>
      <div style={{marginTop:8}}>
        <div className="staff-grid-title">Quem és tu?</div>
        {loading
          ? <div style={{color:T.textMuted,textAlign:"center",padding:32,fontFamily:"'DM Mono',monospace",fontSize:13}}>A carregar...</div>
          : <div className="staff-grid">
              {staff.map(s=>{
                const color=staffColor(s.name);
                const initials=staffInitials(s.name);
                return(
                  <div key={s.id} className="staff-tile" style={{"--tile-color":color}} onClick={()=>onSelect({...s,color,initials})}>
                    <style>{`.staff-tile:hover{border-color:${color}44!important;background:${color}08!important;}`}</style>
                    <div className="st-avatar" style={{background:`${color}18`,border:`1px solid ${color}33`,color}}>{initials}</div>
                    <div>
                      <div className="st-name">{s.name}</div>
                      <div className="st-role">{ROLE_LABEL[s.role]??s.role}</div>
                    </div>
                    <svg style={{marginLeft:"auto",color,opacity:.4}} width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}

// ─── PIN PAD ──────────────────────────────────────────────────────────────────
const TIMEOUT_SECS = 30;

function PinPad({staff,onSuccess,onBack}){
  const [pin,setPin]=useState([]);
  const [error,setError]=useState(false);
  const [shake,setShake]=useState(false);
  const [timeLeft,setTimeLeft]=useState(TIMEOUT_SECS);
  const timerRef=useRef(null);

  // Countdown
  useEffect(()=>{
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){clearInterval(timerRef.current);onBack();return 0;}
        return t-1;
      });
    },1000);
    return()=>clearInterval(timerRef.current);
  },[onBack]);

  // Auto-submit at 4 digits
  useEffect(()=>{
    if(pin.length!==4) return;
    const entered=pin.join("");
    clearInterval(timerRef.current);
    fetch("/api/auth/staff",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({staffId:staff.id,pin:entered})})
      .then(r=>r.json())
      .then(d=>{
        if(d.ok){ setTimeout(()=>onSuccess(d.user),200); }
        else{ setError(true);setShake(true); setTimeout(()=>{setPin([]);setError(false);setShake(false); timerRef.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){clearInterval(timerRef.current);onBack();return 0;}return t-1;}),1000);},600); }
      })
      .catch(()=>{ setError(true);setShake(true); setTimeout(()=>{setPin([]);setError(false);setShake(false);},600); });
  },[pin,staff,onSuccess,onBack]);

  const press=(d)=>{
    if(d==="⌫"){setPin(p=>p.slice(0,-1));return;}
    if(pin.length>=4) return;
    setPin(p=>[...p,d]);
  };

  const progress=((TIMEOUT_SECS-timeLeft)/TIMEOUT_SECS)*157;

  return(
    <div className="pin-wrap">
      <button className="back-btn" onClick={onBack}>
        <svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Voltar
      </button>

      <div className="pin-staff" style={{marginTop:8}}>
        <div className="pin-av" style={{background:`${staff.color}18`,border:`1px solid ${staff.color}33`,color:staff.color}}>
          {staff.initials}
        </div>
        <div>
          <div className="pin-name">{staff.name}</div>
          <div className="pin-role">{staff.role}</div>
        </div>
      </div>

      <div className="pin-dots">
        {[0,1,2,3].map(i=>(
          <div
            key={i}
            className={`pin-dot${pin.length>i?(error?" error":" filled"):""}`}
            style={{"--dot-color":error?T.danger:staff.color}}
          />
        ))}
      </div>

      {error&&(
        <div style={{fontSize:12,color:T.danger,marginBottom:12,animation:"fadeIn .15s",fontWeight:600}}>
          PIN incorrecto. Tenta novamente.
        </div>
      )}

      <div className={`pin-pad${shake?" shake":""}`}>
        {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d,i)=>(
          <button
            key={i}
            className={`pn-btn${d===""?" empty":d==="⌫"?" del":""}`}
            onClick={()=>d&&press(d)}
          >
            {d==="⌫"
              ? <svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18"y1="9"x2="12"y2="15"/><line x1="12"y1="9"x2="18"y2="15"/></svg>
              : d
            }
          </button>
        ))}
      </div>

      <div className="pin-timeout">
        <div className="timeout-ring">
          <svg width="20"height="20"viewBox="0 0 50 50">
            <circle className="timeout-track"cx="25"cy="25"r="20"/>
            <circle className="timeout-prog"cx="25"cy="25"r="20"style={{strokeDashoffset:progress,stroke:timeLeft<=10?T.danger:staff.color}}/>
          </svg>
        </div>
        Timeout em {timeLeft}s
      </div>
    </div>
  );
}

// ─── SUCCESS ──────────────────────────────────────────────────────────────────
function SuccessScreen({user}){
  const isManager=user.role==="manager";
  const color=isManager?T.accent:T.teal;
  return(
    <div className="success-wrap">
      <div className="success-ring" style={{background:`${color}18`,border:`2px solid ${color}44`}}>
        <div className="success-check">✓</div>
      </div>
      <div>
        <div className="success-label" style={{color,textAlign:"center"}}>
          Bem-vindo{user.name.slice(-1)==="a"?"a":""}, {user.name}!
        </div>
        <div className="success-sub" style={{textAlign:"center",marginTop:6}}>
          {isManager?"A redirecionar para o Backoffice...":"A redirecionar para o POS..."}
        </div>
      </div>
      <div className="success-pill" style={{color,background:`${color}18`,border:`1px solid ${color}33`}}>
        {isManager?"GESTOR · BACKOFFICE":"TURNO INICIADO · POS"}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,color:T.textMuted,fontSize:12,fontFamily:"'DM Mono',monospace"}}>
        <svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        A carregar...
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Login({ onSuccess }){
  // screen: selector | manager | staff-pick | staff-pin | success
  const [screen,setScreen]=useState("selector");
  const [selectedStaff,setSelectedStaff]=useState(null);
  const [loggedUser,setLoggedUser]=useState(null);

  const handleSuccess=(user)=>{
    setLoggedUser(user);
    setScreen("success");
    // Navegar para o módulo certo após 1.2 s de animação de sucesso
    setTimeout(()=>{ if(onSuccess) onSuccess(user); },1200);
  };

  return(
    <>
      <style>{CSS}</style>
      <div className="login-root">
        <div className="bg-layer"/>
        <div className="bg-grid"/>

        <div className="wordmark">
          <div className="wm-dot"/>
          <div className="wm-text">RestaurantOS</div>
          <div className="wm-ver">v1</div>
        </div>

        {screen==="selector" && <Selector onSelect={s=>setScreen(s==="manager"?"manager":"staff-pick")}/>}
        {screen==="manager"  && <ManagerLogin onBack={()=>setScreen("selector")} onSuccess={handleSuccess}/>}
        {screen==="staff-pick"&&(
          <StaffPick
            onBack={()=>setScreen("selector")}
            onSelect={s=>{setSelectedStaff(s);setScreen("staff-pin");}}
          />
        )}
        {screen==="staff-pin"&&selectedStaff&&(
          <PinPad
            staff={selectedStaff}
            onBack={()=>setScreen("staff-pick")}
            onSuccess={handleSuccess}
          />
        )}
        {screen==="success"&&loggedUser&&<SuccessScreen user={loggedUser}/>}

        <Clock/>
      </div>
    </>
  );
}
