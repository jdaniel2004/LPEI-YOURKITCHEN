import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { fmtTime, fmtDate, setTimezone } from "@/lib/timezone";

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const T = {
  bg:"#08080B",surface:"#0F0F14",card:"#15151C",elevated:"#1C1C25",
  border:"#252530",borderBright:"#32324A",
  accent:"#7C6AF7",accentDim:"#7C6AF720",accentMid:"#7C6AF740",
  teal:"#3ECFAE",tealDim:"#3ECFAE18",
  danger:"#F75A5A",dangerDim:"#F75A5A18",
  warning:"#F7A94A",warningDim:"#F7A94A18",
  success:"#4AF785",successDim:"#4AF78518",
  purple:"#B06AF7",purpleDim:"#B06AF718",
  blue:"#4A9EF7",blueDim:"#4A9EF718",
  text:"#FFFFFF",textSec:"#D0D0DC",textMuted:"#8E8EA4",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtEur(v){return `€${Number(v).toFixed(2)}`;}
function fmtElapsed(iso){const m=Math.floor((Date.now()-new Date(iso))/60000);return m<60?`${m}m`:`${Math.floor(m/60)}h${m%60<10?"0":""}${m%60}m`;}
const DAYS_PT=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const PAY_METHOD_LABEL={numerario:"Numerário",cartao:"Cartão",mbway:"MB Way",multibanco:"Multibanco"};

// ─── UNIT SYSTEM ─────────────────────────────────────────────────────────────
const UNIT_DEFS=[
  // peso — base: g
  {id:"mg", label:"mg — miligrama",  group:"weight", toBase:0.001},
  {id:"g",  label:"g — grama",       group:"weight", toBase:1},
  {id:"kg", label:"kg — quilograma", group:"weight", toBase:1000},
  // volume — base: ml
  {id:"ml", label:"ml — mililitro",  group:"volume", toBase:1},
  {id:"cl", label:"cl — centilitro", group:"volume", toBase:10},
  {id:"dl", label:"dl — decilitro",  group:"volume", toBase:100},
  {id:"L",  label:"L — litro",       group:"volume", toBase:1000},
  // contagem — base: un
  {id:"un", label:"un — unidade",    group:"count",  toBase:1},
  {id:"pcs",label:"pcs — peca",      group:"count",  toBase:1},
  {id:"cx", label:"cx — caixa",      group:"count",  toBase:1},
  {id:"dz", label:"dz — duzia",      group:"count",  toBase:12},
];
function fmtQty(v){
  const n=Number(v);
  if(!isFinite(n))return"—";
  return n%1===0?String(n):n.toFixed(n<10?3:2).replace(/\.?0+$/,"");
}
function getConversions(unit,qty){
  const def=UNIT_DEFS.find(u=>u.id===unit);
  if(!def||!qty||isNaN(qty))return[];
  const baseVal=qty*def.toBase;
  return UNIT_DEFS
    .filter(u=>u.group===def.group&&u.id!==unit)
    .map(u=>({unit:u.id,val:baseVal/u.toBase}))
    .filter(c=>c.val>=0.001&&c.val<1e6);
}
const STATUS_C={
  free:    {label:"Livre",   c:T.success, bg:T.successDim},
  occupied:{label:"Ocupada", c:T.warning, bg:T.warningDim},
  bill:    {label:"Servido", c:T.danger,  bg:T.dangerDim},
  locked:  {label:"Em Uso",  c:T.blue,    bg:T.blueDim},
};
const LEVEL_C={INFO:{c:T.accent,bg:T.accentDim},WARN:{c:T.warning,bg:T.warningDim},ERROR:{c:T.danger,bg:T.dangerDim},ACTION:{c:T.teal,bg:T.tealDim},CANCEL:{c:T.danger,bg:T.dangerDim}};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{width:100%;height:100%;background:${T.bg};color:${T.text};font-family:'Syne',sans-serif;overflow:hidden;}
::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px;}
input,textarea,select{font-family:'Syne',sans-serif;color:${T.text};}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

.bo-root{display:flex;width:100vw;height:100vh;overflow:hidden;}

/* SIDEBAR */
.sidebar{display:flex;flex-direction:column;background:${T.surface};border-right:1px solid ${T.border};transition:width .25s cubic-bezier(.4,0,.2,1);overflow:hidden;flex-shrink:0;z-index:20;}
.sidebar.expanded{width:220px;}.sidebar.collapsed{width:56px;}
.sb-logo{display:flex;align-items:center;gap:10px;padding:16px 14px;border-bottom:1px solid ${T.border};height:52px;flex-shrink:0;overflow:hidden;white-space:nowrap;}
.sb-logo-dot{width:8px;height:8px;border-radius:50%;background:${T.accent};box-shadow:0 0 10px ${T.accent};flex-shrink:0;}
.sb-logo-text{font-size:15px;font-weight:800;letter-spacing:-.5px;}
.sb-logo-sub{font-size:10px;color:${T.textMuted};margin-left:2px;}
.sb-nav{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 6px;}
.sb-item{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:7px;cursor:pointer;transition:all .15s;white-space:nowrap;overflow:hidden;color:${T.textSec};margin-bottom:2px;}
.sb-item:hover{background:${T.elevated};color:${T.text};}
.sb-item.active{background:${T.accentDim};color:${T.accent};}
.sb-item svg{flex-shrink:0;width:16px;height:16px;}
.sb-label{font-size:12px;font-weight:600;letter-spacing:.2px;}
.sb-sep{height:1px;background:${T.border};margin:8px 6px;}
.sb-bottom{padding:8px 6px 12px;border-top:1px solid ${T.border};}
.sb-ext{display:flex;align-items:center;gap:10px;padding:8px 8px;border-radius:7px;cursor:pointer;color:${T.textMuted};white-space:nowrap;overflow:hidden;transition:all .15s;font-size:11px;font-weight:600;}
.sb-ext:hover{background:${T.elevated};color:${T.text};}
.sb-collapse{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 10px;background:${T.elevated};border:1px solid ${T.borderBright};border-radius:8px;color:${T.text};cursor:pointer;transition:all .15s;margin-top:6px;font-family:inherit;font-size:12px;font-weight:700;letter-spacing:.3px;}
.sb-collapse svg{width:22px;height:22px;flex-shrink:0;}
.sb-collapse:hover{border-color:${T.accent};background:${T.accentDim};color:${T.accent};}

/* MAIN */
.bo-main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.bo-topbar{height:52px;border-bottom:1px solid ${T.border};display:flex;align-items:center;padding:0 20px;gap:12px;background:${T.surface};flex-shrink:0;}
.bo-section-title{font-size:16px;font-weight:700;}
.bo-topbar-right{margin-left:auto;display:flex;align-items:center;gap:8px;}
.bo-content{flex:1;overflow-y:auto;padding:20px 20px 60px;animation:fadeIn .2s;}

/* CARDS */
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
.kpi-card{background:${T.card};border:1px solid ${T.border};border-radius:10px;padding:16px;}
.kpi-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${T.textMuted};margin-bottom:8px;}
.kpi-value{font-size:26px;font-weight:800;font-family:'DM Mono',monospace;letter-spacing:-1px;}
.kpi-sub{font-size:11px;color:${T.textMuted};margin-top:4px;}
.kpi-trend{font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:4px;margin-top:6px;}
.card{background:${T.card};border:1px solid ${T.border};border-radius:10px;}
.card-head{padding:14px 16px;border-bottom:1px solid ${T.border};display:flex;align-items:center;justify-content:space-between;}
.card-title{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${T.textSec};}
.card-body{padding:16px;}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;}

/* TABLE */
.data-table{width:100%;border-collapse:collapse;}
.data-table th{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${T.textMuted};padding:8px 12px;text-align:left;border-bottom:1px solid ${T.border};}
.data-table td{padding:10px 12px;border-bottom:1px solid ${T.border};font-size:13px;vertical-align:middle;}
.data-table tr:last-child td{border-bottom:none;}
.data-table tr:hover td{background:${T.elevated};}
.data-table.mono td{font-family:'DM Mono',monospace;font-size:12px;}

/* BADGE */
.badge{display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;letter-spacing:.3px;}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:none;border-radius:7px;padding:8px 14px;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;letter-spacing:.2px;}
.btn:active{transform:scale(.97);}
.btn:disabled{opacity:.35;cursor:not-allowed;transform:none!important;}
.btn-ghost{background:${T.elevated};border:1px solid ${T.border};color:${T.textSec};}
.btn-ghost:hover{border-color:${T.borderBright};color:${T.text};}
.btn-accent{background:${T.accentDim};border:1px solid ${T.accent}44;color:${T.accent};}
.btn-accent:hover{background:${T.accentMid};}
.btn-solid{background:${T.accent};border:1px solid ${T.accent};color:#fff;}
.btn-solid:hover{background:#6a59e8;}
.btn-danger{background:${T.dangerDim};border:1px solid ${T.danger}44;color:${T.danger};}
.btn-sm{padding:5px 10px;font-size:11px;border-radius:5px;}
.btn-icon{width:30px;height:30px;padding:0;border-radius:6px;}

/* FORM */
.form-group{margin-bottom:14px;}
.form-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${T.textMuted};margin-bottom:6px;display:block;}
.form-input{width:100%;background:${T.card};border:1px solid ${T.border};border-radius:7px;color:${T.text};font-family:'Syne',sans-serif;font-size:13px;padding:9px 11px;outline:none;transition:border-color .15s;}
.form-input:focus{border-color:${T.accent}55;}
.form-select{width:100%;background:${T.card};border:1px solid ${T.border};border-radius:7px;color:${T.text};font-family:'Syne',sans-serif;font-size:13px;padding:9px 11px;outline:none;appearance:none;cursor:pointer;}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}

/* MODAL */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;animation:fadeIn .15s;}
.modal{background:${T.elevated};border:1px solid ${T.borderBright};border-radius:14px;box-shadow:0 32px 80px rgba(0,0,0,.6);animation:slideUp .2s ease;max-height:90vh;overflow-y:auto;}
.modal-hd{padding:20px 24px 0;display:flex;align-items:flex-start;justify-content:space-between;}
.modal-title{font-size:16px;font-weight:700;}
.modal-sub{font-size:12px;color:${T.textSec};margin-top:3px;}
.modal-close{background:none;border:none;color:${T.textMuted};cursor:pointer;font-size:18px;padding:2px;transition:color .15s;}
.modal-close:hover{color:${T.text};}
.modal-body{padding:20px 24px;}
.modal-foot{padding:0 24px 20px;display:flex;gap:8px;justify-content:flex-end;}

/* TOGGLE */
.toggle{width:36px;height:20px;border-radius:10px;border:none;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;}
.toggle::after{content:'';position:absolute;width:14px;height:14px;border-radius:50%;background:#fff;top:3px;transition:left .2s;}
.toggle.on{background:${T.success};}
.toggle.on::after{left:19px;}
.toggle.off{background:${T.border};}
.toggle.off::after{left:3px;}

/* FILTERS */
.filters-row{display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap;}
.filter-input{background:${T.card};border:1px solid ${T.border};border-radius:7px;color:${T.text};font-family:'Syne',sans-serif;font-size:12px;padding:7px 11px;outline:none;transition:border-color .15s;}
.filter-input:focus{border-color:${T.accent}55;}
.filter-chip{padding:5px 12px;border:1px solid ${T.border};border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;transition:all .12s;background:${T.card};color:${T.textSec};}
.filter-chip.active{background:${T.accentDim};border-color:${T.accent}44;color:${T.accent};}

/* SETTINGS TABS */
.stab-row{display:flex;gap:0;border-bottom:1px solid ${T.border};margin-bottom:20px;}
.stab{padding:10px 20px;font-size:12px;font-weight:600;color:${T.textMuted};cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;}
.stab.active{color:${T.accent};border-color:${T.accent};}

/* MISC */
.section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.section-h{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${T.textMuted};}
.empty-state{text-align:center;padding:40px;color:${T.textMuted};font-size:13px;}
.live-dot{width:7px;height:7px;border-radius:50%;background:${T.success};box-shadow:0 0 8px ${T.success};display:inline-block;}
.mono{font-family:'DM Mono',monospace;}
.tag{display:inline-flex;align-items:center;gap:4px;background:${T.elevated};border:1px solid ${T.border};border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;color:${T.textSec};}
.tag-del{background:none;border:none;color:${T.textMuted};cursor:pointer;font-size:13px;padding:0 0 0 2px;line-height:1;transition:color .12s;}
.tag-del:hover{color:${T.danger};}
.mod-block{background:${T.card};border:1px solid ${T.border};border-radius:8px;padding:10px 12px;margin-bottom:6px;}
@media(max-width:900px){
  .kpi-grid{grid-template-columns:repeat(2,1fr);}
  .grid-2,.grid-3{grid-template-columns:1fr;}
  .form-row{grid-template-columns:1fr;}
  .stab{padding:8px 12px;font-size:11px;}
}
@media(max-width:600px){
  .kpi-grid{grid-template-columns:1fr 1fr;}
  .sidebar.expanded{width:56px;}
  .sb-label,.sb-logo-text,.sb-logo-sub,.sb-ext span{display:none;}
}
@media print{
  body>*{visibility:hidden!important;}
  .receipt-print,.receipt-print *{visibility:visible!important;color:#000!important;border-color:#999!important;}
  .receipt-print{position:fixed;top:0;left:50%;transform:translateX(-50%);width:280px;padding:16px;background:#fff;color:#000;font-family:monospace;}
}
`;

// ─── SMALL SHARED ─────────────────────────────────────────────────────────────
function Toggle({on,onChange}){return<button className={`toggle ${on?"on":"off"}`}onClick={()=>onChange(!on)}/>;}
function Badge({children,color,bg}){return<span className="badge"style={{color,background:bg}}>{children}</span>;}
function CloseBtn({onClick}){return<button className="modal-close"onClick={onClick}>✕</button>;}
function Inp({label,...p}){return<div className="form-group"><label className="form-label">{label}</label><input className="form-input"{...p}/></div>;}
function Sel({label,children,...p}){return<div className="form-group"><label className="form-label">{label}</label><select className="form-select"{...p}>{children}</select></div>;}

// Icon components
const Ic={
  Dashboard:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><rect x="3"y="3"width="7"height="7"rx="1"/><rect x="14"y="3"width="7"height="7"rx="1"/><rect x="14"y="14"width="7"height="7"rx="1"/><rect x="3"y="14"width="7"height="7"rx="1"/></svg>,
  Analytics:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Menu:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>,
  Tables:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><rect x="3"y="3"width="18"height="18"rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  Staff:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="9"cy="7"r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>,
  Calendar:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><rect x="3"y="4"width="18"height="18"rx="2"/><line x1="16"y1="2"x2="16"y2="6"/><line x1="8"y1="2"x2="8"y2="6"/><line x1="3"y1="10"x2="21"y2="10"/></svg>,
  Tag:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7"y1="7"x2="7.01"y2="7"/></svg>,
  Orders:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16"y1="13"x2="8"y2="13"/><line x1="16"y1="17"x2="8"y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Logs:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12"y1="19"x2="20"y2="19"/></svg>,
  Settings:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="12"cy="12"r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  POS:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><rect x="2"y="3"width="20"height="14"rx="2"/><line x1="8"y1="21"x2="16"y2="21"/><line x1="12"y1="17"x2="12"y2="21"/></svg>,
  KDS:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  Plus:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><line x1="12"y1="5"x2="12"y2="19"/><line x1="5"y1="12"x2="19"y2="12"/></svg>,
  Edit:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Down:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  Up:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>,
  ChevLeft:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevRight:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>,
  Export:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12"y1="15"x2="12"y2="3"/></svg>,
  Leaf:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M17 8C8 10 5.9 16.17 3.82 19.32c1.51-1.26 3.99-2.1 6.77-1.3C13.11 18.89 16 21 19 21c1-5 0-13-2-13z"/></svg>,
  Grid:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><rect x="3"y="3"width="7"height="7"rx="1"/><rect x="14"y="3"width="7"height="7"rx="1"/><rect x="14"y="14"width="7"height="7"rx="1"/><rect x="3"y="14"width="7"height="7"rx="1"/></svg>,
  MapPin:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12"cy="10"r="3"/></svg>,
  Layers:()=><svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
};

const TOOLTIP_STYLE={background:T.elevated,border:`1px solid ${T.border}`,borderRadius:8,fontFamily:"'DM Mono',monospace",fontSize:12,color:T.text};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard(){
  const [summary,setSummary]=useState(null);
  const [tables,setTables]=useState([]);
  const [recent,setRecent]=useState([]);
  const [onShift,setOnShift]=useState([]);
  useEffect(()=>{
    Promise.all([
      fetch("/api/analytics/summary").then(r=>r.json()),
      fetch("/api/tables").then(r=>r.json()),
      fetch("/api/orders?status=paid&limit=16").then(r=>r.json()),
      fetch("/api/staff").then(r=>r.json()),
    ]).then(([sum,tbls,ords,staff])=>{
      if(sum&&!sum.error)setSummary(sum);
      setTables(Array.isArray(tbls)?tbls:[]);
      // Drop phantom €0.00 orders (empty follow-ups) before taking the latest 4.
      setRecent(Array.isArray(ords)?ords.filter(o=>(o.lines||[]).some(l=>!l.cancelled)).slice(0,4):[]);
      setOnShift(Array.isArray(staff)?staff.filter(s=>s.active):[]);
    }).catch(()=>{});
  },[]);
  const occ=tables.filter(t=>t.status!=="free").length;
  const kpis=[
    {label:"Receita (7 dias)",value:summary?fmtEur(summary.revenue):"—",sub:`${summary?.orders||0} pedidos`,color:T.success},
    {label:"Pedidos",value:String(summary?.orders??0),sub:`Ticket médio: ${summary?fmtEur(summary.avgTicket):"—"}`,color:T.accent},
    {label:"Ticket Médio",value:summary?fmtEur(summary.avgTicket):"—",sub:"últimos 7 dias",color:T.teal},
    {label:"Mesas Ocupadas",value:`${occ}/${tables.length}`,sub:"em tempo real",color:T.warning},
  ];
  return(
    <div>
      <div className="kpi-grid">
        {kpis.map(k=>(
          <div key={k.label} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{color:k.color}}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-head"><div className="card-title">Pedidos Recentes</div></div>
          <table className="data-table">
            <tbody>
              {recent.length===0&&<tr><td colSpan={4}style={{color:T.textMuted,textAlign:"center",padding:16}}>Sem pedidos recentes</td></tr>}
              {recent.map(o=>{
                const total=(o.lines||[]).filter(l=>!l.cancelled).reduce((s,l)=>s+(l.unit_price+l.extra_price)*l.qty,0);
                const t=new Date(o.paid_at||o.created_at);
                return(
                  <tr key={o.id}>
                    <td><span style={{fontWeight:700}}>{o.table?.label||"—"}</span></td>
                    <td style={{color:T.textSec,fontSize:12}}>{o.waiter?.name||"—"}</td>
                    <td><span className="mono"style={{color:T.accent}}>{fmtEur(total)}</span></td>
                    <td><Badge color={T.textSec}bg={T.elevated}>{fmtTime(t,{hour:"2-digit",minute:"2-digit"})}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Equipa Activa</div></div>
          <div className="card-body"style={{display:"flex",gap:10,flexWrap:"wrap",padding:"12px 16px"}}>
            {onShift.length===0&&<div style={{color:T.textMuted,fontSize:12}}>Nenhum funcionário activo</div>}
            {onShift.map(s=>(
              <div key={s.id}style={{display:"flex",alignItems:"center",gap:8,background:T.elevated,borderRadius:8,padding:"6px 12px",border:`1px solid ${T.border}`}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:T.accentDim,border:`1px solid ${T.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:T.accent}}>{s.name.slice(0,2).toUpperCase()}</div>
                <div><div style={{fontSize:12,fontWeight:600}}>{s.name}</div><div style={{fontSize:10,color:T.textMuted}}>{s.role}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">Estado das Mesas — Live <span className="live-dot"style={{marginLeft:6}}/></div></div>
        <div className="card-body"style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))",gap:8}}>
          {tables.length===0&&<div style={{color:T.textMuted,fontSize:12}}>A carregar...</div>}
          {tables.map(t=>{const st=STATUS_C[t.status]||STATUS_C.free;return(
            <div key={t.id}style={{background:st.bg,border:`1px solid ${st.c}33`,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:800,color:st.c}}>{t.label}</div>
              <div style={{fontSize:9,color:st.c,fontWeight:600,marginTop:2,letterSpacing:.5}}>{st.label.toUpperCase()}</div>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
function Analytics(){
  const [period,setPeriod]=useState("hoje");
  const [summary,setSummary]=useState(null);
  const [hourData,setHourData]=useState([]);
  const [payData,setPayData]=useState([]);
  const [topItems,setTopItems]=useState([]);
  const [prepItems,setPrepItems]=useState([]);
  const [avgPrepMin,setAvgPrepMin]=useState(0);
  const todayStr=(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;})();
  const [customFrom,setCustomFrom]=useState(todayStr);
  const [customTo,setCustomTo]=useState(todayStr);
  const periods=["hoje","7d","30d","custom"];
  const periodLabel={"hoje":"Hoje","7d":"7 Dias","30d":"30 Dias","custom":"Personalizado"};
  useEffect(()=>{
    let from,to;
    if(period==="custom"){
      if(!customFrom||!customTo)return;
      from=new Date(customFrom+"T00:00:00").toISOString();
      to=new Date(customTo+"T23:59:59").toISOString();
    }else{
      const now=new Date();
      const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      if(period==="hoje")from=today.toISOString();
      else if(period==="7d")from=new Date(+today-6*86400000).toISOString();
      else from=new Date(+today-29*86400000).toISOString();
      to=new Date(+today+86400000).toISOString();
    }
    const q=`from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    Promise.all([
      fetch(`/api/analytics/summary?${q}`).then(r=>r.json()),
      fetch(`/api/analytics/hourly?${q}`).then(r=>r.json()),
      fetch(`/api/analytics/payments?${q}`).then(r=>r.json()),
      fetch(`/api/analytics/items?${q}&limit=10`).then(r=>r.json()),
    ]).then(([sum,hour,pay,itemsData])=>{
      if(sum&&!sum.error)setSummary(sum);
      setHourData(Array.isArray(hour)?hour.map(h=>({h:h.label,v:h.revenue})):[]);
      const totalRev=Array.isArray(pay)?pay.reduce((s,p)=>s+p.total,0):0;
      setPayData(Array.isArray(pay)?pay.map((p,i)=>({
        method:p.method,pct:totalRev>0?Math.round((p.total/totalRev)*100):0,
        color:[T.accent,T.teal,T.warning,T.success][i%4],
      })):[]);
      if(itemsData&&!itemsData.error){
        setTopItems(Array.isArray(itemsData.standalone)?itemsData.standalone:[]);
        setPrepItems(Array.isArray(itemsData.prep)?itemsData.prep:[]);
        setAvgPrepMin(itemsData.avgPrepMin||0);
      }
    }).catch(()=>{});
  },[period,customFrom,customTo]);
  const exportCSV=()=>{
    const rows=[["Tipo","Item","Qtd","Receita"]];
    topItems.forEach(i=>rows.push(["item",i.name,i.qty,i.revenue]));
    rows.push([]);rows.push(["Tipo","Item","Tempo médio (min)","Amostras"]);
    prepItems.forEach(p=>rows.push(["prep",p.name,p.avgMin,p.count]));
    const csv=rows.map(r=>r.join(",")).join("\n");
    const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download="analytics.csv";a.click();
  };
  const maxItem=topItems.length>0?Math.max(...topItems.map(i=>i.revenue)):1;
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,gap:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          {periods.map(p=><button key={p}className={`filter-chip${period===p?" active":""}`}onClick={()=>setPeriod(p)}>{periodLabel[p]}</button>)}
          {period==="custom"&&(
            <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:4}}>
              <input type="date"className="form-input"style={{width:150,padding:"6px 8px"}}value={customFrom}max={customTo||todayStr}onChange={e=>setCustomFrom(e.target.value)}/>
              <span style={{fontSize:12,color:T.textMuted}}>até</span>
              <input type="date"className="form-input"style={{width:150,padding:"6px 8px"}}value={customTo}min={customFrom}max={todayStr}onChange={e=>setCustomTo(e.target.value)}/>
            </div>
          )}
        </div>
        <button className="btn btn-ghost"onClick={exportCSV}><Ic.Export/>Exportar CSV</button>
      </div>
      <div className="kpi-grid">
        {[
          {label:"Total Receita",value:summary?fmtEur(summary.revenue):"—",color:T.success},
          {label:"Pedidos",value:String(summary?.orders??0),color:T.accent},
          {label:"Ticket Médio",value:summary?fmtEur(summary.avgTicket):"—",color:T.teal},
          {label:"Itens Vendidos",value:String(summary?.items??0),color:T.warning},
          {label:"Itens / Pedido",value:String(summary?.avgItemsPerOrder??0),color:T.blue},
          {label:"Prep. Média",value:avgPrepMin?`${avgPrepMin} min`:"—",color:T.purple},
          {label:"Itens Anulados",value:String(summary?.cancelledItems??0),color:T.danger},
          {label:"Gorjetas",value:summary?.totalTips!=null?fmtEur(summary.totalTips):"—",color:T.teal},
        ].map(k=>(
          <div key={k.label}className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value"style={{color:k.color,fontSize:22}}>{k.value}</div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-head"><div className="card-title">Receita {period==="hoje"?"por hora (hoje)":period==="custom"?(customFrom===customTo?"por hora":"por dia"):period==="7d"?"por dia (7 dias)":"por dia (30 dias)"}</div></div>
          <div className="card-body">
            <ResponsiveContainer width="100%"height={180}>
              <LineChart data={hourData}>
                <CartesianGrid strokeDasharray="3 3"stroke={T.border}vertical={false}/>
                <XAxis dataKey="h"tick={{fill:T.textMuted,fontSize:10,fontFamily:"'DM Mono',monospace"}}axisLine={false}tickLine={false}/>
                <YAxis tick={{fill:T.textMuted,fontSize:10,fontFamily:"'DM Mono',monospace"}}axisLine={false}tickLine={false}tickFormatter={v=>`€${v}`}width={40}/>
                <Tooltip contentStyle={TOOLTIP_STYLE}formatter={v=>[fmtEur(v),"Receita"]}/>
                <Line type="monotone"dataKey="v"stroke={T.teal}strokeWidth={2}dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Métodos de Pagamento</div></div>
          <div className="card-body"style={{display:"flex",flexDirection:"column",gap:14}}>
            {payData.length===0&&<div style={{color:T.textMuted,fontSize:12,textAlign:"center",padding:20}}>Sem dados</div>}
            {payData.map(p=>(
              <div key={p.method}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                  <span style={{fontWeight:600}}>{p.method}</span>
                  <span className="mono"style={{color:T.textSec}}>{p.pct}%</span>
                </div>
                <div style={{background:T.border,borderRadius:4,height:8}}>
                  <div style={{background:p.color,width:`${p.pct}%`,height:"100%",borderRadius:4,transition:"width .5s"}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid-2">
        {/* Top standalone items */}
        <div className="card">
          <div className="card-head"><div className="card-title">Top Itens <span style={{fontSize:11,color:T.textMuted,fontWeight:400}}>(avulso)</span></div></div>
          <div className="card-body"style={{display:"flex",flexDirection:"column",gap:12}}>
            {topItems.length===0&&<div style={{color:T.textMuted,fontSize:12,textAlign:"center",padding:20}}>Sem dados</div>}
            {topItems.map((item,i)=>(
              <div key={item.name}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                  <span><span style={{color:T.textMuted,marginRight:8,fontFamily:"'DM Mono',monospace"}}>#{i+1}</span><span style={{fontWeight:600}}>{item.name}</span></span>
                  <span className="mono"style={{color:T.accent}}>{fmtEur(item.revenue)} <span style={{color:T.textMuted}}>({item.qty}×)</span></span>
                </div>
                <div style={{background:T.border,borderRadius:4,height:6}}>
                  <div style={{background:T.accent,width:`${(item.revenue/maxItem)*100}%`,height:"100%",borderRadius:4}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Average prep time per item (KDS) */}
      <div className="card"style={{marginTop:16}}>
        <div className="card-head"><div className="card-title">Tempo Médio de Preparação <span style={{fontSize:11,color:T.textMuted,fontWeight:400}}>(por item · do envio até "Pronto")</span></div></div>
        <div className="card-body"style={{display:"flex",flexDirection:"column",gap:12}}>
          {prepItems.length===0&&<div style={{color:T.textMuted,fontSize:12,textAlign:"center",padding:20}}>Sem dados de preparação no período. (Os tempos começam a ser registados quando o KDS marca pedidos como "Pronto".)</div>}
          {(()=>{const maxPrep=prepItems.length>0?Math.max(...prepItems.map(p=>p.avgMin)):1;return prepItems.map(p=>(
            <div key={p.name}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                <span style={{fontWeight:600}}>{p.name}</span>
                <span className="mono"style={{color:T.purple}}>{p.avgMin} min <span style={{color:T.textMuted}}>({p.count}×)</span></span>
              </div>
              <div style={{background:T.border,borderRadius:4,height:6}}>
                <div style={{background:T.purple,width:`${(p.avgMin/maxPrep)*100}%`,height:"100%",borderRadius:4}}/>
              </div>
            </div>
          ));})()}
        </div>
      </div>
    </div>
  );
}

// ─── MENU & STOCK ─────────────────────────────────────────────────────────────
function MenuStock(){
  const [items,setItems]=useState([]);
  const [categories,setCategories]=useState([]);
  const [activeCat,setActiveCat]=useState("Todas");
  const [editItem,setEditItem]=useState(null);
  const [form,setForm]=useState({});
  const [errMsg,setErrMsg]=useState("");
  const [mods,setMods]=useState([]);
  const [editMod,setEditMod]=useState(null);
  const [modForm,setModForm]=useState({name:"",required:false,options:[{label:"",price:""}]});
  const [allIngredients,setAllIngredients]=useState([]);
  const [linkedIngredients,setLinkedIngredients]=useState([]);
  const [selIngredient,setSelIngredient]=useState("");
  const [selIngQty,setSelIngQty]=useState("1");
  const [selIngUnit,setSelIngUnit]=useState("un");
  const [allTemplates,setAllTemplates]=useState([]);
  const [linkedTemplateIds,setLinkedTemplateIds]=useState([]);
  const [vatRates,setVatRates]=useState([6,13,23]);
  const [uploadingImg,setUploadingImg]=useState(false);

  useEffect(()=>{
    Promise.all([
      fetch("/api/menu/items?active=false").then(r=>r.json()),
      fetch("/api/menu/categories").then(r=>r.json()),
      fetch("/api/ingredients").then(r=>r.json()),
      fetch("/api/menu/modifiers").then(r=>r.json()),
      fetch("/api/settings").then(r=>r.json()).catch(()=>null),
    ]).then(([its,cats,ings,tpls,settings])=>{
      const catList=Array.isArray(cats)?cats:[];
      setCategories(catList);
      setAllIngredients(Array.isArray(ings)?ings:[]);
      setAllTemplates(Array.isArray(tpls)?tpls:[]);
      // VAT options come from the configured fiscal rates (active ones)
      const rates=settings&&!settings.error?settings["fiscal.rates"]:null;
      if(Array.isArray(rates)&&rates.length>0){
        setVatRates(rates.filter(r=>r.active!==false).map(r=>Number(r.value)).filter(v=>!isNaN(v)));
      }
      if(Array.isArray(its)){
        setItems(its.map(i=>({
          id:i.id,catId:i.category_id,cat:i.category?.name||"",
          name:i.name,price:i.price,vat:i.vat_rate,
          stock:i.stock,active:i.active,image:i.image_url||"",
        })));
      }
    }).catch(()=>{});
  },[]);

  const cats=["Todas",...categories.map(c=>c.name)];
  const filtered=activeCat==="Todas"?items:items.filter(i=>i.cat===activeCat);

  const openEdit=async(item)=>{
    setForm({...item,image_url:item.image||"",stock:item.stock===null||item.stock===undefined?"":item.stock});
    setMods([]);setLinkedIngredients([]);setLinkedTemplateIds([]);setErrMsg("");setSelIngQty("1");setSelIngUnit("un");setUploadingImg(false);setEditItem(item.id);
    try{
      const [detail,ings,links]=await Promise.all([
        fetch(`/api/menu/items/${item.id}`).then(r=>r.json()),
        fetch(`/api/menu/items/${item.id}/ingredients`).then(r=>r.json()),
        fetch(`/api/menu/items/${item.id}/modifier-links`).then(r=>r.json()),
      ]);
      setMods(detail.modifiers||[]);
      setLinkedIngredients(Array.isArray(ings)?ings:[]);
      setLinkedTemplateIds(Array.isArray(links)?links.map(l=>l.template_id):[]);
    }catch{}
  };

  const openNew=()=>{
    const first=categories[0];
    setForm({catId:first?.id||"",cat:first?.name||"",name:"",price:"",vat:23,stock:"",active:true,image_url:""});
    setMods([]);setLinkedIngredients([]);setLinkedTemplateIds([]);setErrMsg("");setSelIngQty("1");setSelIngUnit("un");setUploadingImg(false);
    setEditItem("new");
  };

  const uploadImage=async(file)=>{
    if(!file)return;
    setUploadingImg(true);setErrMsg("");
    try{
      const fd=new FormData();fd.append("file",file);
      const r=await fetch("/api/menu/upload",{method:"POST",body:fd});
      const data=await r.json();
      if(data.error){setErrMsg(data.error);return;}
      setForm(p=>({...p,image_url:data.url}));
    }catch{setErrMsg("Erro ao carregar imagem");}
    finally{setUploadingImg(false);}
  };

  const toggleTemplate=async(tplId)=>{
    const isLinked=linkedTemplateIds.includes(tplId);
    setLinkedTemplateIds(p=>isLinked?p.filter(x=>x!==tplId):[...p,tplId]);
    if(editItem==="new")return; // applied after item creation in saveItem
    const method=isLinked?"DELETE":"POST";
    await fetch(`/api/menu/items/${editItem}/modifier-links`,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify({template_id:tplId})}).catch(()=>{
      setLinkedTemplateIds(p=>isLinked?[...p,tplId]:p.filter(x=>x!==tplId)); // rollback
    });
  };

  const saveItem=async()=>{
    setErrMsg("");
    if(!form.name){setErrMsg("Nome obrigatório");return;}
    if(!form.catId){setErrMsg("Selecciona uma categoria. Cria primeiro em Menu → Categorias.");return;}
    const body={
      category_id:form.catId,name:form.name,emoji:form.emoji,
      image_url:form.image_url||null,
      price:parseFloat(form.price)||0,vat_rate:parseInt(form.vat)||23,
      stock:form.stock===""||form.stock===undefined?null:parseInt(form.stock)||0,
      active:form.active,
    };
    if(editItem==="new"){
      const r=await fetch("/api/menu/items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(data.error){setErrMsg(data.error);return;}
      if(mods.length>0){
        await Promise.all(mods.map(m=>
          fetch(`/api/menu/items/${data.id}/modifiers`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:m.name,required:m.required,options:m.options})}).catch(()=>{})
        ));
      }
      if(linkedIngredients.length>0){
        await Promise.all(linkedIngredients.map(li=>
          fetch(`/api/menu/items/${data.id}/ingredients`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ingredient_id:li.ingredient_id,qty:li.qty})}).catch(()=>{})
        ));
      }
      if(linkedTemplateIds.length>0){
        await Promise.all(linkedTemplateIds.map(tid=>
          fetch(`/api/menu/items/${data.id}/modifier-links`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({template_id:tid})}).catch(()=>{})
        ));
      }
      setItems(p=>[...p,{id:data.id,catId:data.category_id,cat:form.cat,name:data.name,price:data.price,vat:data.vat_rate,stock:data.stock,active:data.active,image:data.image_url||""}]);
    } else {
      const r=await fetch(`/api/menu/items/${editItem}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(data.error){setErrMsg(data.error);return;}
      setItems(p=>p.map(i=>i.id===editItem?{...i,catId:form.catId,cat:form.cat,name:data.name,price:data.price,vat:data.vat_rate,stock:data.stock,active:data.active,image:data.image_url||""}:i));
    }
    setEditItem(null);
  };

  const toggleActive=(id)=>{
    const item=items.find(i=>i.id===id);if(!item)return;
    const v=!item.active;
    setItems(p=>p.map(i=>i.id===id?{...i,active:v}:i));
    fetch(`/api/menu/items/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({active:v})}).catch(()=>{
      setItems(p=>p.map(i=>i.id===id?{...i,active:!v}:i));
    });
  };

  const updateStock=(id,delta)=>{
    const item=items.find(i=>i.id===id);
    if(!item||item.stock===null||item.stock===undefined)return;
    const ns=Math.max(0,item.stock+delta);
    setItems(p=>p.map(i=>i.id===id?{...i,stock:ns}:i));
    fetch(`/api/menu/items/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({stock:ns})}).catch(()=>{
      setItems(p=>p.map(i=>i.id===id?{...i,stock:item.stock}:i));
    });
  };

  const openNewMod=()=>{setModForm({name:"",required:false,options:[{label:"",price:""}]});setEditMod("new");};
  const openEditMod=(m)=>{setModForm({name:m.name,required:m.required,options:(m.options||[]).map(o=>({label:o.label,price:o.extra_price||0}))});setEditMod(m.id);};
  const saveMod=async()=>{
    const body={name:modForm.name,required:modForm.required,options:modForm.options.filter(o=>o.label.trim()).map(o=>({label:o.label,extra_price:parseFloat(o.price)||0}))};
    if(editItem==="new"){
      // Local-only: will be posted after item creation in saveItem
      if(editMod==="new"){
        setMods(p=>[...p,{id:`local_${Date.now()}`,name:body.name,required:body.required,options:body.options}]);
      } else {
        setMods(p=>p.map(m=>m.id===editMod?{...m,name:body.name,required:body.required,options:body.options}:m));
      }
      setEditMod(null);return;
    }
    if(editMod==="new"){
      const r=await fetch(`/api/menu/items/${editItem}/modifiers`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(!data.error)setMods(p=>[...p,data]);
    } else {
      const r=await fetch(`/api/menu/items/${editItem}/modifiers/${editMod}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(!data.error)setMods(p=>p.map(m=>m.id===editMod?data:m));
    }
    setEditMod(null);
  };
  const deleteMod=async(modId)=>{
    setMods(p=>p.filter(m=>m.id!==modId));
    if(editItem!=="new") await fetch(`/api/menu/items/${editItem}/modifiers/${modId}`,{method:"DELETE"}).catch(()=>{});
  };
  const addModOption=()=>setModForm(p=>({...p,options:[...p.options,{label:"",price:""}]}));
  const removeModOption=(i)=>setModForm(p=>({...p,options:p.options.filter((_,j)=>j!==i)}));
  const setModOpt=(i,k,v)=>setModForm(p=>({...p,options:p.options.map((o,j)=>j===i?{...o,[k]:v}:o)}));

  const addIngredient=async()=>{
    if(!selIngredient)return;
    const ing=allIngredients.find(i=>i.id===selIngredient);
    const enteredQty=parseFloat(selIngQty)||1;
    // convert entered unit → ingredient's native unit
    const fromDef=UNIT_DEFS.find(u=>u.id===selIngUnit);
    const toDef=UNIT_DEFS.find(u=>u.id===(ing?.unit||"un"));
    let qty=enteredQty;
    if(fromDef&&toDef&&fromDef.group===toDef.group&&toDef.toBase>0){
      qty=Math.round((enteredQty*fromDef.toBase/toDef.toBase)*10000)/10000;
    }
    if(editItem==="new"){
      const local={ingredient_id:selIngredient,qty,ingredient:{id:selIngredient,name:ing?.name||"",unit:ing?.unit||"un"}};
      setLinkedIngredients(p=>[...p.filter(li=>li.ingredient_id!==selIngredient),local]);
      setSelIngredient("");setSelIngQty("1");setSelIngUnit("un");
      return;
    }
    const r=await fetch(`/api/menu/items/${editItem}/ingredients`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ingredient_id:selIngredient,qty})});
    const data=await r.json();
    if(!data.error){setLinkedIngredients(p=>[...p.filter(li=>li.ingredient_id!==selIngredient),data]);setSelIngredient("");setSelIngQty("1");setSelIngUnit("un");}
  };
  const removeIngredient=async(ingId)=>{
    setLinkedIngredients(p=>p.filter(li=>li.ingredient_id!==ingId));
    if(editItem!=="new"){
      await fetch(`/api/menu/items/${editItem}/ingredients`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({ingredient_id:ingId})}).catch(()=>{});
    }
  };

  return(
    <div style={{display:"flex",gap:0,height:"100%",margin:"-20px"}}>
      <div style={{width:160,background:T.surface,borderRight:`1px solid ${T.border}`,padding:"12px 8px",flexShrink:0}}>
        {cats.map(c=>(
          <div key={c}onClick={()=>setActiveCat(c)}style={{padding:"9px 12px",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:600,color:activeCat===c?T.accent:T.textSec,background:activeCat===c?T.accentDim:"transparent",marginBottom:2,transition:"all .12s"}}>
            {c}<span style={{marginLeft:6,fontSize:10,color:T.textMuted}}>({c==="Todas"?items.length:items.filter(i=>i.cat===c).length})</span>
          </div>
        ))}
      </div>
      <div style={{flex:1,overflow:"auto",padding:20}}>
        <div className="section-head">
          <div className="section-h">{activeCat} — {filtered.length} itens</div>
          <button className="btn btn-solid"onClick={openNew}><Ic.Plus/>Novo Item</button>
        </div>
        {categories.length===0&&<div style={{background:T.warningDim,border:`1px solid ${T.warning}44`,borderRadius:8,padding:"10px 14px",fontSize:12,color:T.warning,marginBottom:12}}>Não existem categorias. Adiciona primeiro em <strong>Menu → Categorias</strong>.</div>}
        <table className="data-table">
          <thead><tr><th>Item</th><th>Categoria</th><th>Preço</th><th>IVA</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {filtered.map(item=>(
              <tr key={item.id}>
                <td>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:34,height:34,borderRadius:7,border:`1px solid ${T.border}`,background:T.card,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {item.image?<img src={item.image}alt=""style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:14,opacity:.4}}>🍽️</span>}
                    </div>
                    <span style={{fontWeight:600}}>{item.name}</span>
                  </div>
                </td>
                <td><Badge color={T.textSec}bg={T.elevated}>{item.cat}</Badge></td>
                <td><span className="mono"style={{color:T.accent}}>{fmtEur(item.price)}</span></td>
                <td><span className="mono"style={{color:T.textMuted}}>{item.vat}%</span></td>
                <td>
                  {item.stock===null||item.stock===undefined?<span style={{color:T.textMuted,fontSize:11}}>—</span>:(
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <button className="btn btn-ghost btn-icon btn-sm"onClick={()=>updateStock(item.id,-1)}>−</button>
                      <span className="mono"style={{color:item.stock<=3?T.danger:item.stock<=5?T.warning:T.text,fontWeight:700,minWidth:20,textAlign:"center"}}>{item.stock}</span>
                      <button className="btn btn-ghost btn-icon btn-sm"onClick={()=>updateStock(item.id,1)}>+</button>
                    </div>
                  )}
                </td>
                <td><Toggle on={item.active}onChange={()=>toggleActive(item.id)}/></td>
                <td><button className="btn btn-ghost btn-icon btn-sm"onClick={()=>openEdit(item)}><Ic.Edit/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editItem&&(
        <div className="overlay"onClick={()=>setEditItem(null)}>
          <div className="modal"style={{width:520}}onClick={e=>e.stopPropagation()}>
            <div className="modal-hd"><div><div className="modal-title">{editItem==="new"?"Novo Item":"Editar Item"}</div></div><CloseBtn onClick={()=>setEditItem(null)}/></div>
            <div className="modal-body">
              <Inp label="Nome"value={form.name||""}onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
              <div style={{display:"flex",alignItems:"center",gap:12,marginTop:12}}>
                <div style={{width:64,height:64,borderRadius:10,border:`1px solid ${T.border}`,background:T.card,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {form.image_url
                    ?<img src={form.image_url}alt=""style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    :<span style={{fontSize:22,opacity:.4}}>🖼️</span>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <span className="form-label"style={{margin:0}}>Imagem do produto</span>
                  <div style={{display:"flex",gap:6}}>
                    <label className={`btn btn-ghost btn-sm${uploadingImg?" disabled":""}`}style={{cursor:uploadingImg?"default":"pointer"}}>
                      {uploadingImg?"A carregar...":form.image_url?"Trocar imagem":"Carregar imagem"}
                      <input type="file"accept="image/*"style={{display:"none"}}disabled={uploadingImg}onChange={e=>uploadImage(e.target.files?.[0])}/>
                    </label>
                    {form.image_url&&<button className="btn btn-danger btn-sm"onClick={()=>setForm(p=>({...p,image_url:""}))}>Remover</button>}
                  </div>
                </div>
              </div>
              <div className="form-row">
                <Sel label="Categoria"value={form.catId||""}onChange={e=>{const c=categories.find(x=>x.id===e.target.value);setForm(p=>({...p,catId:e.target.value,cat:c?.name||""}));}}>{categories.map(c=><option key={c.id}value={c.id}>{c.name}</option>)}</Sel>
                <Sel label="IVA"value={form.vat??23}onChange={e=>setForm(p=>({...p,vat:e.target.value}))}>
                  {Array.from(new Set([...(vatRates.length?vatRates:[6,13,23]),Number(form.vat)].filter(v=>v!=null&&!isNaN(v)))).sort((a,b)=>a-b).map(v=><option key={v}value={v}>{v}%</option>)}
                </Sel>
              </div>
              <div className="form-row"><Inp label="Preço (€)"type="number"step="0.01"value={form.price||""}onChange={e=>setForm(p=>({...p,price:e.target.value}))}/><Inp label="Stock (vazio = sem tracking)"type="number"value={form.stock===undefined?"":form.stock}onChange={e=>setForm(p=>({...p,stock:e.target.value}))}/></div>
              <div style={{display:"flex",alignItems:"center",gap:10}}><Toggle on={!!form.active}onChange={v=>setForm(p=>({...p,active:v}))}/><span style={{fontSize:13,color:T.textSec}}>Item activo no POS</span></div>
              {errMsg&&<div style={{marginTop:8,fontSize:12,color:T.danger,background:T.dangerDim,borderRadius:6,padding:"6px 10px"}}>{errMsg}</div>}
              <div style={{marginTop:16,borderTop:`1px solid ${T.border}`,paddingTop:14}}>
                <span className="form-label"style={{display:"block",marginBottom:8}}>Modificadores da biblioteca</span>
                {allTemplates.length===0&&<div style={{fontSize:11,color:T.textMuted}}>Sem modificadores na biblioteca. Cria em <strong>Modificadores</strong>.</div>}
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {allTemplates.map(t=>{
                    const linked=linkedTemplateIds.includes(t.id);
                    return(
                      <div key={t.id}onClick={()=>toggleTemplate(t.id)}style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",border:`1px solid ${linked?T.accent+"55":T.border}`,background:linked?T.accentDim:T.card,borderRadius:8,cursor:"pointer"}}>
                        <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${linked?T.accent:T.border}`,background:linked?T.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {linked&&<svg width="10"height="10"viewBox="0 0 12 12"fill="none"><polyline points="2 6 5 9 10 3"stroke="#fff"strokeWidth="2"strokeLinecap="round"/></svg>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600}}>{t.name}{t.required&&<span style={{fontSize:10,color:T.danger,marginLeft:6}}>obrigatório</span>}</div>
                          <div style={{fontSize:11,color:T.textMuted}}>{(t.options||[]).map(o=>`${o.label}${o.extra_price>0?` +€${Number(o.extra_price).toFixed(2)}`:""}`).join(" · ")||"Sem opções"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{marginTop:16,borderTop:`1px solid ${T.border}`,paddingTop:14}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <span className="form-label"style={{margin:0}}>Personalizados (só este item)</span>
                  <button className="btn btn-ghost btn-sm"onClick={openNewMod}><Ic.Plus/>Adicionar</button>
                </div>
                {mods.length===0&&<div style={{fontSize:12,color:T.textMuted,padding:"4px 0 8px"}}>Sem modificadores específicos deste item.</div>}
                {mods.map(m=>(
                  <div key={m.id}className="mod-block">
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                      <div>
                        <span style={{fontWeight:700,fontSize:13}}>{m.name}</span>
                        {m.required&&<Badge color={T.danger}bg={T.dangerDim}style={{marginLeft:6}}>Obrigatório</Badge>}
                        <div style={{fontSize:11,color:T.textMuted,marginTop:3}}>{(m.options||[]).map(o=>`${o.label}${o.extra_price>0?` +€${Number(o.extra_price).toFixed(2)}`:""}`).join(" · ")||"Sem opções"}</div>
                      </div>
                      <div style={{display:"flex",gap:4,flexShrink:0,marginLeft:8}}>
                        <button className="btn btn-ghost btn-icon btn-sm"onClick={()=>openEditMod(m)}><Ic.Edit/></button>
                        <button className="btn btn-danger btn-icon btn-sm"onClick={()=>deleteMod(m.id)}><Ic.Trash/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:16,borderTop:`1px solid ${T.border}`,paddingTop:14}}>
                <span className="form-label"style={{display:"block",marginBottom:8}}>Ingredientes</span>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                  {linkedIngredients.map(li=>(
                    <span key={li.ingredient_id}className="tag">{li.qty||1} {li.ingredient?.unit||"un"} {li.ingredient?.name||"?"}<button className="tag-del"onClick={()=>removeIngredient(li.ingredient_id)}>×</button></span>
                  ))}
                  {linkedIngredients.length===0&&<span style={{fontSize:11,color:T.textMuted}}>Sem ingredientes.</span>}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <select className="form-select"style={{flex:2}}value={selIngredient}onChange={e=>{
                    setSelIngredient(e.target.value);
                    const ing=allIngredients.find(i=>i.id===e.target.value);
                    setSelIngUnit(ing?.unit||"un");
                  }}>
                    <option value="">Selecionar ingrediente...</option>
                    {allIngredients.filter(i=>!linkedIngredients.find(li=>li.ingredient_id===i.id)).map(i=>(
                      <option key={i.id}value={i.id}>{i.name}</option>
                    ))}
                  </select>
                  <input className="form-input"style={{width:62}}type="number"step="any"min="0.001"placeholder="Qtd"value={selIngQty}onChange={e=>setSelIngQty(e.target.value)}/>
                  <select className="form-select"style={{width:60}}value={selIngUnit}onChange={e=>setSelIngUnit(e.target.value)}disabled={!selIngredient}>
                    {(()=>{
                      const ing=allIngredients.find(i=>i.id===selIngredient);
                      const def=UNIT_DEFS.find(u=>u.id===(ing?.unit||"un"));
                      const grp=def?.group||"count";
                      return UNIT_DEFS.filter(u=>u.group===grp).map(u=><option key={u.id}value={u.id}>{u.id}</option>);
                    })()}
                  </select>
                  <button className="btn btn-ghost"onClick={addIngredient}disabled={!selIngredient}>Adicionar</button>
                </div>
                {allIngredients.length===0&&<div style={{fontSize:11,color:T.textMuted,marginTop:6}}>Adiciona ingredientes em <strong>Ingredientes</strong>.</div>}
              </div>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost"onClick={()=>setEditItem(null)}>Cancelar</button><button className="btn btn-solid"onClick={saveItem}>Guardar</button></div>
          </div>
        </div>
      )}
      {editMod!==null&&(
        <div className="overlay"onClick={()=>setEditMod(null)}style={{zIndex:110}}>
          <div className="modal"style={{width:440}}onClick={e=>e.stopPropagation()}>
            <div className="modal-hd"><div className="modal-title">{editMod==="new"?"Novo Modificador":"Editar Modificador"}</div><CloseBtn onClick={()=>setEditMod(null)}/></div>
            <div className="modal-body">
              <div className="form-row">
                <Inp label="Nome do Grupo"value={modForm.name}onChange={e=>setModForm(p=>({...p,name:e.target.value}))}/>
                <div className="form-group"style={{display:"flex",alignItems:"center",gap:10,paddingTop:22}}>
                  <Toggle on={modForm.required}onChange={v=>setModForm(p=>({...p,required:v}))}/><span style={{fontSize:13,color:T.textSec}}>Obrigatório</span>
                </div>
              </div>
              <div className="form-label"style={{marginBottom:8}}>Opções</div>
              {modForm.options.map((opt,i)=>(
                <div key={i}style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-end"}}>
                  <div style={{flex:2}}><input className="form-input"placeholder="Etiqueta"value={opt.label}onChange={e=>setModOpt(i,"label",e.target.value)}/></div>
                  <div style={{flex:1}}><input className="form-input"placeholder="+€ extra"type="number"step="0.01"value={opt.price}onChange={e=>setModOpt(i,"price",e.target.value)}/></div>
                  <button className="btn btn-danger btn-icon btn-sm"style={{flexShrink:0}}onClick={()=>removeModOption(i)}><Ic.Trash/></button>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm"style={{marginTop:4}}onClick={addModOption}><Ic.Plus/>Opção</button>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost"onClick={()=>setEditMod(null)}>Cancelar</button><button className="btn btn-solid"onClick={saveMod}disabled={!modForm.name}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TABLES MGMT ─────────────────────────────────────────────────────────────
function TablesMgmt(){
  const [tables,setTables]=useState([]);
  const [zones,setZones]=useState([]);
  const [zone,setZone]=useState(null);
  const [editTable,setEditTable]=useState(null);
  const [stateModal,setStateModal]=useState(null);
  const [newStatus,setNewStatus]=useState("");
  const [comment,setComment]=useState("");
  const [selected,setSelected]=useState(new Set());
  const [bulkStatus,setBulkStatus]=useState("free");
  const [taOrders,setTaOrders]=useState([]);
  useEffect(()=>{
    Promise.all([
      fetch("/api/tables").then(r=>r.json()),
      fetch("/api/zones").then(r=>r.json()),
      fetch("/api/orders?limit=200").then(r=>r.json()),
    ]).then(([tablesData,zonesData,ordersData])=>{
      if(Array.isArray(zonesData)){
        setZones(zonesData);
        if(zonesData.length>0)setZone(zonesData[0].name);
      }
      if(!Array.isArray(tablesData))return;
      const mapped=tablesData.map(t=>({id:t.label,dbId:t.id,zoneId:t.zone?.id,zone:t.zone?.name||"",seats:t.seats,status:t.status}));
      setTables(mapped);
      if(Array.isArray(ordersData)){
        setTaOrders(ordersData.filter(o=>o.type==="takeaway"&&o.status!=="paid"&&o.status!=="cancelled"));
      }
    }).catch(()=>{});
  },[]);
  const closeTaOrder=async(orderId)=>{
    await fetch(`/api/orders/${orderId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"paid"})}).catch(()=>{});
    setTaOrders(p=>p.filter(o=>o.id!==orderId));
  };
  const filtered=zone?tables.filter(t=>t.zone===zone):tables;
  const saveStateChange=async()=>{
    const prev=tables.find(t=>t.id===stateModal.id);
    setTables(p=>p.map(t=>t.id===stateModal.id?{...t,status:newStatus}:t));
    const r=await fetch(`/api/tables/${stateModal.dbId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:newStatus})});
    if(!r.ok&&prev)setTables(p=>p.map(t=>t.id===stateModal.id?prev:t));
    setStateModal(null);setComment("");
  };
  const saveTableEdit=async()=>{
    if(!editTable.id)return;
    const zoneObj=zones.find(z=>z.name===editTable.zone)||zones.find(z=>z.id===editTable.zoneId);
    const body={label:editTable.id,seats:editTable.seats,zone_id:zoneObj?.id};
    if(editTable.dbId){
      const r=await fetch(`/api/tables/${editTable.dbId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(!data.error)setTables(p=>p.map(t=>t.dbId===editTable.dbId?{...t,id:data.label,seats:data.seats,zone:zoneObj?.name||t.zone}:t));
    } else {
      const r=await fetch("/api/tables",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(!data.error)setTables(p=>[...p,{id:data.label,dbId:data.id,zoneId:data.zone_id,zone:zoneObj?.name||"",seats:data.seats,status:"free"}]);
    }
    setEditTable(null);
  };
  const toggleSel=(dbId)=>setSelected(p=>{const n=new Set(p);n.has(dbId)?n.delete(dbId):n.add(dbId);return n;});
  const clearOrders=async()=>{
    for(const dbId of selected){
      const orders=await fetch(`/api/orders?table_id=${dbId}&limit=50`).then(r=>r.json()).catch(()=>[]);
      const open=Array.isArray(orders)?orders.filter(o=>o.status!=="paid"&&o.status!=="cancelled"):[];
      await Promise.all(open.map(o=>fetch(`/api/orders/${o.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"paid"})})));
      await fetch(`/api/tables/${dbId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"free"})});
    }
    setTables(p=>p.map(t=>selected.has(t.dbId)?{...t,status:"free"}:t));
    setSelected(new Set());
  };
  const applyBulkStatus=async()=>{
    await Promise.all([...selected].map(dbId=>fetch(`/api/tables/${dbId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:bulkStatus})})));
    setTables(p=>p.map(t=>selected.has(t.dbId)?{...t,status:bulkStatus}:t));
    setSelected(new Set());
  };
  const deleteTable=async(dbId)=>{
    const r=await fetch(`/api/tables/${dbId}`,{method:"DELETE"});
    if(r.status===204||r.ok){
      setTables(p=>p.filter(t=>t.dbId!==dbId));
    } else {
      const data=await r.json().catch(()=>({}));
      alert(`Não foi possível apagar a mesa: ${data.error||"erro desconhecido"}. Pode existir um pedido associado.`);
    }
  };
  return(
    <div>
      <div className="section-head">
        <div style={{display:"flex",gap:6}}>
          {zones.map(z=><button key={z.id}className={`filter-chip${zone===z.name?" active":""}`}onClick={()=>setZone(z.name)}>{z.name} ({tables.filter(t=>t.zone===z.name).length})</button>)}
          <button className={`filter-chip${zone==="__ta__"?" active":""}`}onClick={()=>setZone("__ta__")}>Take-Away ({taOrders.length})</button>
        </div>
        <button className="btn btn-solid"onClick={()=>setEditTable({id:"",zoneId:zones[0]?.id||"",zone:zones[0]?.name||"",seats:4,status:"free",dbId:null})}><Ic.Plus/>Nova Mesa</button>
      </div>
      {selected.size>0&&(
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:T.elevated,border:`1px solid ${T.accent}44`,borderRadius:10,marginBottom:12,flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:T.accent}}>{selected.size} mesa{selected.size!==1?"s":""} selecionada{selected.size!==1?"s":""}</span>
          <button className="btn btn-ghost btn-sm"onClick={()=>setSelected(new Set())}>Desselecionar</button>
          <div style={{flex:1}}/>
          <button className="btn btn-danger btn-sm"onClick={clearOrders}>Limpar Pedidos &amp; Libertar</button>
          <select style={{background:T.card,border:`1px solid ${T.border}`,color:T.text,borderRadius:6,padding:"5px 8px",fontSize:12,fontFamily:"inherit",cursor:"pointer"}}value={bulkStatus}onChange={e=>setBulkStatus(e.target.value)}>
            {Object.entries(STATUS_C).map(([k,v])=><option key={k}value={k}>{v.label}</option>)}
          </select>
          <button className="btn btn-solid btn-sm"onClick={applyBulkStatus}>Aplicar Estado</button>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
        {zone==="__ta__"?taOrders.length===0
          ?<div style={{gridColumn:"1/-1",color:T.textMuted,fontSize:13,padding:24,textAlign:"center"}}>Sem pedidos take-away activos</div>
          :taOrders.map(o=>{
            const taStMap={open:STATUS_C.occupied,sent:STATUS_C.occupied,bill:STATUS_C.bill};
            const st=taStMap[o.status]||STATUS_C.occupied;
            const items=(o.lines||[]).filter(l=>!l.cancelled).length;
            return(
              <div key={o.id}className="card"style={{border:`1px solid ${st.c}33`}}>
                <div style={{padding:"14px 14px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{fontSize:15,fontWeight:800,color:st.c,fontFamily:"'DM Mono',monospace"}}>#{o.id.slice(0,6).toUpperCase()}</div>
                    <Badge color={st.c}bg={st.bg}>{o.status==="bill"?"Conta":o.status==="sent"?"Cozinha":"Aberto"}</Badge>
                  </div>
                  <div style={{fontSize:11,color:T.textSec,marginBottom:10,display:"flex",flexDirection:"column",gap:2}}>
                    <span>{o.waiter?.name||"—"}</span>
                    <span style={{fontFamily:"'DM Mono',monospace"}}>{items} item{items!==1?"s":""} · {fmtElapsed(o.created_at)}</span>
                  </div>
                  <button className="btn btn-danger btn-sm"style={{width:"100%"}}onClick={()=>closeTaOrder(o.id)}>Fechar</button>
                </div>
              </div>
            );
          })
        :filtered.map(t=>{const st=STATUS_C[t.status]||STATUS_C.free;const isSel=selected.has(t.dbId);return(
          <div key={t.dbId}className="card"style={{border:`1px solid ${isSel?T.accent:st.c}33`,outline:isSel?`2px solid ${T.accent}`:undefined,cursor:"pointer"}}onClick={()=>toggleSel(t.dbId)}>
            <div style={{padding:"14px 14px 10px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:15,height:15,borderRadius:"50%",border:`2px solid ${isSel?T.accent:T.border}`,background:isSel?T.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .12s"}}>
                    {isSel&&<svg width="8"height="8"viewBox="0 0 12 12"fill="none"><polyline points="2,6 5,9 10,3"stroke={T.bg}strokeWidth="2.2"strokeLinecap="round"strokeLinejoin="round"/></svg>}
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:st.c}}>{t.id}</div>
                </div>
                <Badge color={st.c}bg={st.bg}>{st.label}</Badge>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:T.textSec,marginBottom:10}}>
                <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
                  <span style={{fontFamily:"'DM Mono',monospace",fontWeight:600,color:T.text}}>{t.seats}</span>
                  <span>{t.seats===1?"lugar":"lugares"}</span>
                </span>
                <span style={{color:T.textMuted}}>·</span>
                <span>{t.zone||"—"}</span>
              </div>
              <div style={{display:"flex",gap:6}}onClick={e=>e.stopPropagation()}>
                <button className="btn btn-ghost btn-sm"style={{flex:1}}onClick={()=>{setStateModal(t);setNewStatus(t.status);}}>Estado</button>
                <button className="btn btn-ghost btn-icon btn-sm"onClick={()=>setEditTable({...t})}><Ic.Edit/></button>
                <button className="btn btn-danger btn-icon btn-sm"onClick={()=>deleteTable(t.dbId)}><Ic.Trash/></button>
              </div>
            </div>
          </div>
        );})}
      </div>
      {stateModal&&(
        <div className="overlay"onClick={()=>setStateModal(null)}>
          <div className="modal"style={{width:380}}onClick={e=>e.stopPropagation()}>
            <div className="modal-hd"><div><div className="modal-title">Alterar Estado — {stateModal.id}</div><div className="modal-sub">Operação registada nos logs</div></div><CloseBtn onClick={()=>setStateModal(null)}/></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Novo Estado</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {Object.entries(STATUS_C).map(([k,v])=>(
                    <div key={k}onClick={()=>setNewStatus(k)}style={{padding:"10px 12px",border:`1px solid ${newStatus===k?v.c:T.border}`,borderRadius:8,cursor:"pointer",background:newStatus===k?v.bg:T.card,transition:"all .12s"}}>
                      <span style={{color:v.c,fontWeight:700,fontSize:13}}>{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Inp label="Comentário (vai para logs)"value={comment}onChange={e=>setComment(e.target.value)}placeholder="Opcional"/>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost"onClick={()=>setStateModal(null)}>Cancelar</button><button className="btn btn-solid"onClick={saveStateChange}>Confirmar</button></div>
          </div>
        </div>
      )}
      {editTable&&(
        <div className="overlay"onClick={()=>setEditTable(null)}>
          <div className="modal"style={{width:360}}onClick={e=>e.stopPropagation()}>
            <div className="modal-hd"><div className="modal-title">{editTable.dbId?"Editar Mesa":"Nova Mesa"}</div><CloseBtn onClick={()=>setEditTable(null)}/></div>
            <div className="modal-body">
              <div className="form-row">
                <Inp label="ID da Mesa"value={editTable.id}onChange={e=>setEditTable(p=>({...p,id:e.target.value}))}placeholder="M9"/>
                <Inp label="Lugares"type="number"value={editTable.seats}onChange={e=>setEditTable(p=>({...p,seats:parseInt(e.target.value)||0}))}/>
              </div>
              <Sel label="Zona"value={editTable.zoneId||""}onChange={e=>{const z=zones.find(x=>x.id===e.target.value);setEditTable(p=>({...p,zoneId:e.target.value,zone:z?.name||""}));}}>{zones.map(z=><option key={z.id}value={z.id}>{z.name}</option>)}</Sel>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost"onClick={()=>setEditTable(null)}>Cancelar</button>
              <button className="btn btn-solid"onClick={saveTableEdit}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CATEGORIES MGMT ─────────────────────────────────────────────────────────
function CategoriesMgmt(){
  const [cats,setCats]=useState([]);
  const [editCat,setEditCat]=useState(null);
  const [form,setForm]=useState({});
  const [dragIndex,setDragIndex]=useState(null);
  useEffect(()=>{
    fetch("/api/menu/categories").then(r=>r.json()).then(data=>{
      if(Array.isArray(data))setCats(data.map(c=>({id:c.id,name:c.name,emoji:c.emoji||"",position:c.position||0})).sort((a,b)=>a.position-b.position));
    }).catch(()=>{});
  },[]);
  const save=async()=>{
    if(editCat==="new"){
      const body={name:form.name,emoji:form.emoji,position:cats.length};
      const r=await fetch("/api/menu/categories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(!data.error)setCats(p=>[...p,{id:data.id,name:data.name,emoji:data.emoji||"",position:data.position}]);
    } else {
      const body={name:form.name,emoji:form.emoji};
      const r=await fetch(`/api/menu/categories/${editCat}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(!data.error)setCats(p=>p.map(c=>c.id===editCat?{...c,name:data.name,emoji:data.emoji||""}:c));
    }
    setEditCat(null);
  };
  // Reorder the list locally while dragging, persisting new positions on drop.
  const handleDragOver=(e,overIndex)=>{
    e.preventDefault();
    if(dragIndex===null||dragIndex===overIndex)return;
    setCats(p=>{const next=[...p];const[moved]=next.splice(dragIndex,1);next.splice(overIndex,0,moved);return next;});
    setDragIndex(overIndex);
  };
  const handleDrop=async()=>{
    setDragIndex(null);
    const ordered=cats;
    setCats(ordered.map((c,i)=>({...c,position:i})));
    await Promise.all(ordered.map((c,i)=>c.position===i?null:
      fetch(`/api/menu/categories/${c.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({position:i})}).catch(()=>{})
    ));
  };
  const deleteCat=async(id)=>{
    const r=await fetch(`/api/menu/categories/${id}`,{method:"DELETE"});
    if(r.status===204||r.ok){
      setCats(p=>p.filter(c=>c.id!==id));
    } else {
      const data=await r.json().catch(()=>({}));
      alert(`Não foi possível apagar: ${data.error||"existem itens associados"}`);
    }
  };
  return(
    <div>
      <div className="section-head">
        <div className="section-h">{cats.length} categorias</div>
        <button className="btn btn-solid"onClick={()=>{setForm({name:"",emoji:"",position:cats.length});setEditCat("new");}}><Ic.Plus/>Nova Categoria</button>
      </div>
      {cats.length>0&&<div style={{fontSize:11,color:T.textMuted,marginBottom:10}}>Arrasta as categorias para alterar a ordem no menu.</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
        {cats.map((c,i)=>(
          <div
            key={c.id}
            className="card"
            draggable
            onDragStart={()=>setDragIndex(i)}
            onDragOver={e=>handleDragOver(e,i)}
            onDragEnd={handleDrop}
            style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"grab",opacity:dragIndex===i?0.4:1}}
          >
            <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
              <span style={{color:T.textMuted,fontSize:16,lineHeight:1,flexShrink:0}}>⠿</span>
              <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:13}}>{c.emoji?`${c.emoji} `:""}{c.name}</div><div style={{fontSize:11,color:T.textMuted}}>{i+1}ª no menu</div></div>
            </div>
            <div style={{display:"flex",gap:4}}>
              <button className="btn btn-ghost btn-icon btn-sm"onClick={()=>{setForm({...c});setEditCat(c.id);}}><Ic.Edit/></button>
              <button className="btn btn-danger btn-icon btn-sm"onClick={()=>deleteCat(c.id)}><Ic.Trash/></button>
            </div>
          </div>
        ))}
        {cats.length===0&&<div className="empty-state">Sem categorias. Adicione a primeira.</div>}
      </div>
      {editCat&&(
        <div className="overlay"onClick={()=>setEditCat(null)}>
          <div className="modal"style={{width:380}}onClick={e=>e.stopPropagation()}>
            <div className="modal-hd"><div className="modal-title">{editCat==="new"?"Nova Categoria":"Editar Categoria"}</div><CloseBtn onClick={()=>setEditCat(null)}/></div>
            <div className="modal-body">
              <Inp label="Nome"value={form.name||""}onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost"onClick={()=>setEditCat(null)}>Cancelar</button><button className="btn btn-solid"onClick={save}disabled={!form.name}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MODIFIERS LIBRARY ────────────────────────────────────────────────────────
function ModifiersMgmt(){
  return <ItemModifiersLib/>;
}

function ItemModifiersLib(){
  const [templates,setTemplates]=useState([]);
  const [allIngredients,setAllIngredients]=useState([]);
  const [edit,setEdit]=useState(null); // "new" | id | null
  const [form,setForm]=useState({name:"",options:[{label:"",price:"",ingredientId:"",ingredientQty:""}]});
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    Promise.all([
      fetch("/api/menu/modifiers").then(r=>r.json()),
      fetch("/api/ingredients").then(r=>r.json()).catch(()=>[]),
    ]).then(([ts,ings])=>{
      if(Array.isArray(ts))setTemplates(ts);
      if(Array.isArray(ings))setAllIngredients(ings);
    }).catch(()=>{});
  },[]);

  const blankOpt={label:"",price:"",ingredientId:"",ingredientQty:"",ingredientUnit:""};
  const openNew=()=>{setForm({name:"",options:[{...blankOpt}]});setEdit("new");};
  const openEdit=(t)=>{
    const opts=(t.options||[]).map(o=>({label:o.label,price:o.extra_price||0,ingredientId:o.ingredient_id||"",ingredientQty:o.ingredient_qty!=null?o.ingredient_qty:"",ingredientUnit:o.ingredient_unit||(o.ingredient_id?ingUnit(o.ingredient_id):"g")}));
    setForm({name:t.name,options:opts.length?opts:[{...blankOpt}]});
    setEdit(t.id);
  };
  const setOpt=(i,k,v)=>setForm(p=>({...p,options:p.options.map((o,j)=>{
    if(j!==i) return o;
    const next={...o,[k]:v};
    // default the unit to the ingredient's unit when an ingredient is picked
    if(k==="ingredientId"){const u=allIngredients.find(x=>x.id===v)?.unit;if(u&&!o.ingredientUnit)next.ingredientUnit=u;}
    return next;
  })}));
  const addOpt=()=>setForm(p=>({...p,options:[...p.options,{...blankOpt}]}));
  const removeOpt=(i)=>setForm(p=>({...p,options:p.options.filter((_,j)=>j!==i)}));
  const ingUnit=(id)=>allIngredients.find(x=>x.id===id)?.unit||"";
  const unitOptsFor=(o)=>{
    const ing=allIngredients.find(x=>x.id===o.ingredientId);
    const grp=ing?UNIT_DEFS.find(u=>u.id===ing.unit)?.group:null;
    return grp?UNIT_DEFS.filter(u=>u.group===grp):UNIT_DEFS;
  };

  const save=async()=>{
    if(!form.name.trim())return;
    setSaving(true);
    const body={
      name:form.name.trim(),
      options:form.options.filter(o=>o.label.trim()).map(o=>{
        const hasQty=o.ingredientQty!==""&&o.ingredientQty!=null;
        return {
          label:o.label.trim(),
          extra_price:parseFloat(o.price)||0,
          ingredient_id:o.ingredientId||null,
          ingredient_qty:hasQty?parseFloat(o.ingredientQty)||0:null,
          ingredient_unit:hasQty?(o.ingredientUnit||ingUnit(o.ingredientId)||"g"):null,
        };
      }),
    };
    try{
      if(edit==="new"){
        const r=await fetch("/api/menu/modifiers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
        const d=await r.json();
        if(!d.error)setTemplates(p=>[...p,d]);
      } else {
        const r=await fetch(`/api/menu/modifiers/${edit}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
        const d=await r.json();
        if(!d.error)setTemplates(p=>p.map(t=>t.id===edit?d:t));
      }
      setEdit(null);
    }finally{setSaving(false);}
  };
  const del=async(id)=>{
    if(!confirm("Apagar este modificador? Será removido de todos os itens ligados."))return;
    const r=await fetch(`/api/menu/modifiers/${id}`,{method:"DELETE"});
    if(r.status===204||r.ok)setTemplates(p=>p.filter(t=>t.id!==id));
  };
  const optLabel=(o)=>{
    let s=o.label;
    if(o.extra_price>0)s+=` +€${Number(o.extra_price).toFixed(2)}`;
    if(o.ingredient_qty){
      const u=o.ingredient_unit||o.ingredient?.unit||"";
      s+=o.ingredient_id?` · ${o.ingredient_qty}${u} ${o.ingredient?.name||""}`:` · +${o.ingredient_qty}${u} (extra à base)`;
    }
    return s;
  };

  return(
    <div>
      <div className="section-head">
        <div className="section-h">{templates.length} modificadores na biblioteca</div>
        <button className="btn btn-solid"onClick={openNew}><Ic.Plus/>Novo Modificador</button>
      </div>
      <div style={{fontSize:12,color:T.textMuted,marginBottom:12}}>
        Define um modificador uma vez e liga-o a vários itens em <strong>Items do Menu</strong>. Uma opção pode descontar um ingrediente do stock (ex: "Espiral 200g" → 200g de Massa Espiral).
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
        {templates.map(t=>(
          <div key={t.id}className="card"style={{padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14}}>{t.name}</div>
                <div style={{fontSize:11,color:T.textMuted,marginTop:4}}>
                  {(t.options||[]).map(optLabel).join(" · ")||"Sem opções"}
                </div>
              </div>
              <div style={{display:"flex",gap:4,flexShrink:0}}>
                <button className="btn btn-ghost btn-icon btn-sm"onClick={()=>openEdit(t)}><Ic.Edit/></button>
                <button className="btn btn-danger btn-icon btn-sm"onClick={()=>del(t.id)}><Ic.Trash/></button>
              </div>
            </div>
          </div>
        ))}
        {templates.length===0&&<div className="empty-state">Sem modificadores. Cria o primeiro (ex: "Com ovo +€1" ou "Espiral 200g").</div>}
      </div>
      {edit&&(
        <div className="overlay"onClick={()=>setEdit(null)}>
          <div className="modal"style={{width:720}}onClick={e=>e.stopPropagation()}>
            <div className="modal-hd"><div className="modal-title">{edit==="new"?"Novo Modificador":"Editar Modificador"}</div><CloseBtn onClick={()=>setEdit(null)}/></div>
            <div className="modal-body">
              <Inp label="Nome do Grupo (ex: Tipo de massa)"value={form.name}onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
              <div className="form-label"style={{marginBottom:8,marginTop:6}}>Opções</div>
              <div style={{display:"flex",fontSize:10,color:T.textMuted,gap:10,padding:"0 4px 4px"}}>
                <span style={{flex:2}}>Etiqueta</span><span style={{width:90}}>Preço (+€)</span><span style={{flex:2}}>Ingrediente</span><span style={{width:80}}>Qtd</span><span style={{width:90}}>Unidade</span><span style={{width:32}}/>
              </div>
              {form.options.map((opt,i)=>(
                <div key={i}style={{display:"flex",gap:10,marginBottom:8,alignItems:"center"}}>
                  <input className="form-input"style={{flex:2}}placeholder="ex: Espiral 200g"value={opt.label}onChange={e=>setOpt(i,"label",e.target.value)}/>
                  <input className="form-input"style={{width:90}}type="number"step="0.01"placeholder="0"value={opt.price}onChange={e=>setOpt(i,"price",e.target.value)}/>
                  <select className="form-select"style={{flex:2}}value={opt.ingredientId}onChange={e=>setOpt(i,"ingredientId",e.target.value)}>
                    <option value="">— extra/nenhum —</option>
                    {allIngredients.map(ing=><option key={ing.id}value={ing.id}>{ing.name}</option>)}
                  </select>
                  <input className="form-input"style={{width:80}}type="number"step="any"placeholder="0"value={opt.ingredientQty}onChange={e=>setOpt(i,"ingredientQty",e.target.value)}/>
                  <select className="form-select"style={{width:90}}value={opt.ingredientUnit||""}onChange={e=>setOpt(i,"ingredientUnit",e.target.value)}>
                    {unitOptsFor(opt).map(u=><option key={u.id}value={u.id}>{u.id}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-icon btn-sm"onClick={()=>removeOpt(i)}><Ic.Trash/></button>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm"onClick={addOpt}><Ic.Plus/>Adicionar opção</button>
              <div style={{fontSize:11,color:T.textMuted,marginTop:8,lineHeight:1.5}}>
                • <strong>Com ingrediente + qtd</strong>: ao escolher no POS desconta essa quantidade do stock (ex: "Espiral" → 200g de Massa Espiral).<br/>
                • <strong>Sem ingrediente mas com qtd</strong> (extra, ex: "+200g"): desconta essa quantidade do <strong>ingrediente escolhido na base</strong>. A unidade é convertida automaticamente.
              </div>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost"onClick={()=>setEdit(null)}>Cancelar</button><button className="btn btn-solid"onClick={save}disabled={!form.name.trim()||saving}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── ZONES MGMT ───────────────────────────────────────────────────────────────
function ZonesMgmt(){
  const [zones,setZones]=useState([]);
  const [editZone,setEditZone]=useState(null);
  const [form,setForm]=useState({});
  useEffect(()=>{
    fetch("/api/zones").then(r=>r.json()).then(data=>{
      if(Array.isArray(data))setZones(data);
    }).catch(()=>{});
  },[]);
  const save=async()=>{
    if(editZone==="new"){
      const r=await fetch("/api/zones",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:form.name})});
      const data=await r.json();
      if(!data.error)setZones(p=>[...p,data]);
    } else {
      const r=await fetch(`/api/zones/${editZone}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:form.name})});
      const data=await r.json();
      if(!data.error)setZones(p=>p.map(z=>z.id===editZone?data:z));
    }
    setEditZone(null);
  };
  const deleteZone=async(id)=>{
    const r=await fetch(`/api/zones/${id}`,{method:"DELETE"});
    if(r.status===204||r.ok){
      setZones(p=>p.filter(z=>z.id!==id));
    } else {
      const data=await r.json().catch(()=>({}));
      alert(`Não foi possível apagar: ${data.error||"existem mesas associadas a esta zona"}`);
    }
  };
  return(
    <div>
      <div className="section-head">
        <div className="section-h">{zones.length} zonas</div>
        <button className="btn btn-solid"onClick={()=>{setForm({name:""});setEditZone("new");}}><Ic.Plus/>Nova Zona</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
        {zones.map(z=>(
          <div key={z.id}className="card"style={{padding:"16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontWeight:700,fontSize:14}}>{z.name}</span>
            <div style={{display:"flex",gap:4}}>
              <button className="btn btn-ghost btn-icon btn-sm"onClick={()=>{setForm({name:z.name});setEditZone(z.id);}}><Ic.Edit/></button>
              <button className="btn btn-danger btn-icon btn-sm"onClick={()=>deleteZone(z.id)}><Ic.Trash/></button>
            </div>
          </div>
        ))}
        {zones.length===0&&<div className="empty-state">Sem zonas. Adicione a primeira (ex: Interior, Esplanada).</div>}
      </div>
      {editZone&&(
        <div className="overlay"onClick={()=>setEditZone(null)}>
          <div className="modal"style={{width:340}}onClick={e=>e.stopPropagation()}>
            <div className="modal-hd"><div className="modal-title">{editZone==="new"?"Nova Zona":"Editar Zona"}</div><CloseBtn onClick={()=>setEditZone(null)}/></div>
            <div className="modal-body"><Inp label="Nome da Zona"value={form.name||""}onChange={e=>setForm(p=>({...p,name:e.target.value}))}placeholder="ex: Interior"/></div>
            <div className="modal-foot"><button className="btn btn-ghost"onClick={()=>setEditZone(null)}>Cancelar</button><button className="btn btn-solid"onClick={save}disabled={!form.name}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── INGREDIENTS MGMT ────────────────────────────────────────────────────────
function IngredientsMgmt(){
  const [ings,setIngs]=useState([]);
  const [editIng,setEditIng]=useState(null);
  const [form,setForm]=useState({});
  const [search,setSearch]=useState("");
  useEffect(()=>{
    fetch("/api/ingredients").then(r=>r.json()).then(data=>{
      if(Array.isArray(data))setIngs(data);
    }).catch(()=>{});
  },[]);
  const save=async()=>{
    const body={name:form.name,unit:form.unit||"un",stock_qty:parseFloat(form.stock_qty)||0,is_modifier:!!form.is_modifier};
    if(editIng==="new"){
      const r=await fetch("/api/ingredients",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(!data.error)setIngs(p=>[...p,data]);
    } else {
      const r=await fetch(`/api/ingredients/${editIng}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(!data.error)setIngs(p=>p.map(i=>i.id===editIng?data:i));
    }
    setEditIng(null);
  };
  const UNIT_STEP={mg:100,g:1,kg:0.1,ml:10,cl:1,dl:0.1,L:0.1,un:1,pcs:1,cx:1,dz:1};
  const adjustStock=async(id,delta)=>{
    const ing=ings.find(i=>i.id===id);if(!ing)return;
    const step=(UNIT_STEP[ing.unit]||1)*delta;
    const ns=Math.max(0,Math.round(((ing.stock_qty||0)+step)*1000)/1000);
    setIngs(p=>p.map(i=>i.id===id?{...i,stock_qty:ns}:i));
    await fetch(`/api/ingredients/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({stock_qty:ns})}).catch(()=>setIngs(p=>p.map(i=>i.id===id?{...i,stock_qty:ing.stock_qty}:i)));
  };
  const deleteIng=async(id)=>{
    const r=await fetch(`/api/ingredients/${id}`,{method:"DELETE"});
    if(r.status===204||r.ok){
      setIngs(p=>p.filter(i=>i.id!==id));
    } else {
      const data=await r.json().catch(()=>({}));
      alert(`Não foi possível apagar: ${data.error||"erro desconhecido"}`);
    }
  };
  const filtered=ings.filter(i=>!search||i.name.toLowerCase().includes(search.toLowerCase()));
  return(
    <div>
      <div className="section-head">
        <div className="section-h">{ings.length} ingredientes</div>
        <button className="btn btn-solid"onClick={()=>{setForm({name:"",unit:"g",stock_qty:0,is_modifier:false});setEditIng("new");}}><Ic.Plus/>Novo Ingrediente</button>
      </div>
      <div className="filters-row">
        <input className="filter-input"placeholder="Pesquisar ingrediente..."value={search}onChange={e=>setSearch(e.target.value)}style={{width:260}}/>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Unidade</th><th>Stock</th><th>Modificador</th><th></th></tr></thead>
          <tbody>
            {filtered.length===0&&<tr><td colSpan={4}><div className="empty-state">Sem ingredientes</div></td></tr>}
            {filtered.map(i=>(
              <tr key={i.id}>
                <td style={{fontWeight:600}}>{i.name}</td>
                <td><Badge color={T.teal}bg={T.tealDim}>{i.unit||"un"}</Badge></td>
                <td>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <button className="btn btn-ghost btn-icon btn-sm"onClick={()=>adjustStock(i.id,-1)}>−</button>
                    <div style={{textAlign:"center",minWidth:80}}>
                      <span className="mono"style={{color:(i.stock_qty||0)<=5?T.warning:T.text,fontWeight:700}}>{fmtQty(i.stock_qty||0)} {i.unit||"un"}</span>
                      {(()=>{const cv=getConversions(i.unit,i.stock_qty||0);return cv.length>0?<div style={{fontSize:10,color:T.textMuted,marginTop:1}}>{cv.slice(0,2).map(c=>`${fmtQty(c.val)} ${c.unit}`).join(" · ")}</div>:null;})()}
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm"onClick={()=>adjustStock(i.id,1)}>+</button>
                  </div>
                </td>
                <td style={{textAlign:"center"}}>
                  {i.is_modifier&&<Badge color={T.accent}bg={T.accentDim}>POS</Badge>}
                </td>
                <td><div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                  <button className="btn btn-ghost btn-icon btn-sm"onClick={()=>{setForm({name:i.name,unit:i.unit||"un",stock_qty:i.stock_qty||0,is_modifier:!!i.is_modifier});setEditIng(i.id);}}><Ic.Edit/></button>
                  <button className="btn btn-danger btn-icon btn-sm"onClick={()=>deleteIng(i.id)}><Ic.Trash/></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editIng&&(
        <div className="overlay"onClick={()=>setEditIng(null)}>
          <div className="modal"style={{width:360}}onClick={e=>e.stopPropagation()}>
            <div className="modal-hd"><div className="modal-title">{editIng==="new"?"Novo Ingrediente":"Editar Ingrediente"}</div><CloseBtn onClick={()=>setEditIng(null)}/></div>
            <div className="modal-body">
              <Inp label="Nome"value={form.name||""}onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
              <Sel label="Unidade"value={form.unit||"g"}onChange={e=>setForm(p=>({...p,unit:e.target.value}))}>
                <optgroup label="Peso">{UNIT_DEFS.filter(u=>u.group==="weight").map(u=><option key={u.id}value={u.id}>{u.label}</option>)}</optgroup>
                <optgroup label="Volume">{UNIT_DEFS.filter(u=>u.group==="volume").map(u=><option key={u.id}value={u.id}>{u.label}</option>)}</optgroup>
                <optgroup label="Contagem">{UNIT_DEFS.filter(u=>u.group==="count").map(u=><option key={u.id}value={u.id}>{u.label}</option>)}</optgroup>
              </Sel>
              <div className="form-group">
                <label className="form-label">Stock atual</label>
                <input className="form-input"type="number"step="0.001"min="0"value={form.stock_qty===undefined?"":form.stock_qty}onChange={e=>setForm(p=>({...p,stock_qty:e.target.value}))}/>
                {(()=>{const cv=getConversions(form.unit,parseFloat(form.stock_qty)||0);return cv.length>0?<div style={{fontSize:11,color:T.textMuted,marginTop:5}}>{fmtQty(parseFloat(form.stock_qty)||0)} {form.unit} = {cv.map(c=>`${fmtQty(c.val)} ${c.unit}`).join(" = ")}</div>:null;})()}
              </div>
              <div className="form-group">
                <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                  <input type="checkbox"checked={!!form.is_modifier}onChange={e=>setForm(p=>({...p,is_modifier:e.target.checked}))}/>
                  <span className="form-label"style={{margin:0}}>Modificador de pedido (visível no POS)</span>
                </label>
                <div style={{fontSize:11,color:T.textMuted,marginTop:4}}>O POS permite retirar ou adicionar extra deste ingrediente em cada item.</div>
              </div>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost"onClick={()=>setEditIng(null)}>Cancelar</button><button className="btn btn-solid"onClick={save}disabled={!form.name}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STAFF ────────────────────────────────────────────────────────────────────
function StaffMgmt(){
  const [staff,setStaff]=useState([]);
  const [editStaff,setEditStaff]=useState(null);
  const [form,setForm]=useState({});
  const [staffErr,setStaffErr]=useState("");
  useEffect(()=>{
    fetch("/api/staff").then(r=>r.json()).then(data=>{
      if(!Array.isArray(data))return;
      setStaff(data.map(s=>({id:s.id,name:s.name,role:s.role,active:s.active,since:new Date(s.created_at).toLocaleDateString("pt-PT",{month:"short",year:"numeric"})})));
    }).catch(()=>{});
  },[]);
  const openEdit=(s)=>{setForm({...s,pin:""});setEditStaff(s.id);};
  const openNew=()=>{setForm({name:"",role:"waiter",pin:"",email:"",password:"",active:true});setEditStaff("new");};
  const save=async()=>{
    setStaffErr("");
    if(editStaff==="new"){
      const payload={name:form.name,role:form.role};
      if(form.role==="manager"){payload.email=form.email;payload.password=form.password;}
      else{payload.pin=form.pin;}
      const r=await fetch("/api/staff",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await r.json();
      if(data.error){setStaffErr(data.error);return;}
      setStaff(p=>[...p,{id:data.id,name:data.name,role:data.role,active:data.active,since:new Date(data.created_at).toLocaleDateString("pt-PT",{month:"short",year:"numeric"})}]);
    } else {
      const body={name:form.name,role:form.role,active:form.active};
      if(form.pin)body.pin=form.pin;
      const r=await fetch(`/api/staff/${editStaff}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(!data.error)setStaff(p=>p.map(s=>s.id===editStaff?{...s,name:data.name,role:data.role,active:data.active}:s));
    }
    setEditStaff(null);
  };
  const toggleActive=async(id,v)=>{
    setStaff(p=>p.map(s=>s.id===id?{...s,active:v}:s));
    await fetch(`/api/staff/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({active:v})}).catch(()=>{
      setStaff(p=>p.map(s=>s.id===id?{...s,active:!v}:s));
    });
  };
  const deleteStaff=async(id)=>{
    setStaff(p=>p.filter(s=>s.id!==id));
    await fetch(`/api/staff/${id}`,{method:"DELETE"}).catch(()=>{});
  };
  return(
    <div>
      <div className="section-head"><div className="section-h">{staff.length} funcionários</div><button className="btn btn-solid"onClick={openNew}><Ic.Plus/>Novo Funcionário</button></div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Função</th><th>PIN</th><th>Desde</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {staff.map(s=>(
              <tr key={s.id}>
                <td><div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:T.accentDim,border:`1px solid ${T.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:T.accent}}>{s.name.slice(0,2).toUpperCase()}</div>
                  <span style={{fontWeight:600}}>{s.name}</span>
                </div></td>
                <td><Badge color={s.role==="kitchen"?T.warning:T.teal}bg={s.role==="kitchen"?T.warningDim:T.tealDim}>{s.role}</Badge></td>
                <td><span className="mono"style={{letterSpacing:4,color:T.textMuted}}>••••</span></td>
                <td style={{color:T.textSec,fontSize:12}}>{s.since}</td>
                <td><div style={{display:"flex",alignItems:"center",gap:8}}><Toggle on={s.active}onChange={v=>toggleActive(s.id,v)}/><span style={{fontSize:11,color:s.active?T.success:T.textMuted}}>{s.active?"Activo":"Inactivo"}</span></div></td>
                <td><div style={{display:"flex",gap:4}}><button className="btn btn-ghost btn-icon btn-sm"onClick={()=>openEdit(s)}><Ic.Edit/></button><button className="btn btn-danger btn-icon btn-sm"onClick={()=>deleteStaff(s.id)}><Ic.Trash/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editStaff&&(
        <div className="overlay"onClick={()=>setEditStaff(null)}>
          <div className="modal"style={{width:400}}onClick={e=>e.stopPropagation()}>
            <div className="modal-hd"><div className="modal-title">{editStaff==="new"?"Novo Funcionário":"Editar Funcionário"}</div><CloseBtn onClick={()=>setEditStaff(null)}/></div>
            <div className="modal-body">
              <Inp label="Nome"value={form.name||""}onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
              {form.role!=="manager"?(
                <div className="form-row">
                  <Sel label="Função"value={form.role||"waiter"}onChange={e=>setForm(p=>({...p,role:e.target.value}))}><option value="waiter">Waiter</option><option value="kitchen">Cozinha</option><option value="manager">Gestor</option></Sel>
                  <Inp label={editStaff==="new"?"PIN (4 dígitos)":"Novo PIN (vazio = manter)"}type="password"maxLength={4}value={form.pin||""}onChange={e=>setForm(p=>({...p,pin:e.target.value}))}/>
                </div>
              ):(
                <Sel label="Função"value={form.role||"waiter"}onChange={e=>setForm(p=>({...p,role:e.target.value}))}><option value="waiter">Waiter</option><option value="kitchen">Cozinha</option><option value="manager">Gestor</option></Sel>
              )}
              {editStaff==="new"&&form.role==="manager"&&(
                <>
                  <Inp label="Email (login do gestor)"type="email"value={form.email||""}onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
                  <Inp label="Password"type="password"value={form.password||""}onChange={e=>setForm(p=>({...p,password:e.target.value}))}/>
                  <div style={{fontSize:11,color:T.textMuted,marginTop:-4,marginBottom:8,lineHeight:1.5}}>Os gestores entram no Backoffice/KDS com email + password.</div>
                </>
              )}
              <div style={{display:"flex",alignItems:"center",gap:10,marginTop:4}}><Toggle on={!!form.active}onChange={v=>setForm(p=>({...p,active:v}))}/><span style={{fontSize:13,color:T.textSec}}>Activo</span></div>
              {staffErr&&<div style={{marginTop:8,fontSize:12,color:T.danger,background:T.dangerDim,borderRadius:6,padding:"6px 10px"}}>{staffErr}</div>}
            </div>
            <div className="modal-foot"><button className="btn btn-ghost"onClick={()=>{setEditStaff(null);setStaffErr("");}}>Cancelar</button><button className="btn btn-solid"onClick={save}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DESCONTOS ────────────────────────────────────────────────────────────────
function Campaigns(){
  const [camps,setCamps]=useState([]);
  const [editC,setEditC]=useState(null);
  const [form,setForm]=useState({});
  const [errMsg,setErrMsg]=useState("");
  useEffect(()=>{
    fetch("/api/campaigns?active=false").then(r=>r.json()).then(cs=>{
      if(Array.isArray(cs))setCamps(cs.map(c=>({id:c.id,name:c.name,type:c.type,value:c.value,days:c.days||[],start:c.start_time||"00:00",end:c.end_time||"23:59",active:c.active})));
    }).catch(()=>{});
  },[]);
  const toggleDay=(d)=>setForm(p=>({...p,days:p.days.includes(d)?p.days.filter(x=>x!==d):[...p.days,d].sort()}));
  const save=async()=>{
    if(!form.name){setErrMsg("Nome obrigatório");return;}
    setErrMsg("");
    const body={name:form.name,type:form.type,value:parseFloat(form.value)||0,days:form.days,start_time:form.start,end_time:form.end};
    if(editC==="new"){
      const r=await fetch("/api/campaigns",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(data.error){setErrMsg(data.error);return;}
      setCamps(p=>[...p,{...form,id:data.id,active:true}]);
    } else {
      const r=await fetch(`/api/campaigns/${editC}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();
      if(data.error){setErrMsg(data.error);return;}
      setCamps(p=>p.map(c=>c.id===editC?{...form,id:editC}:c));
    }
    setEditC(null);
  };
  const toggleActive=async(id,v)=>{
    setCamps(p=>p.map(c=>c.id===id?{...c,active:v}:c));
    await fetch(`/api/campaigns/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({active:v})}).catch(()=>{});
  };
  const deleteC=async(id)=>{
    setCamps(p=>p.filter(c=>c.id!==id));
    await fetch(`/api/campaigns/${id}`,{method:"DELETE"}).catch(()=>{});
  };
  return(
    <div>
      <div className="section-head"><div className="section-h">{camps.length} descontos</div><button className="btn btn-solid"onClick={()=>{setForm({name:"",type:"percent",value:0,days:[],start:"00:00",end:"23:59",active:true});setEditC("new");}}><Ic.Plus/>Novo Desconto</button></div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Desconto</th><th>Dias</th><th>Horario</th><th>Activa</th><th></th></tr></thead>
          <tbody>
            {camps.length===0&&<tr><td colSpan={6}><div className="empty-state">Sem descontos</div></td></tr>}
            {camps.map(c=>(
              <tr key={c.id}>
                <td style={{fontWeight:600}}>{c.name}</td>
                <td><span style={{color:T.warning,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{c.type==="percent"?`${c.value}%`:`-€${Number(c.value).toFixed(2)}`}</span></td>
                <td><span style={{fontSize:11,color:T.textSec}}>{(c.days||[]).map(d=>DAYS_PT[d%7]).join(", ")||"—"}</span></td>
                <td><span className="mono"style={{fontSize:11,color:T.textMuted}}>{c.start}–{c.end}</span></td>
                <td><Toggle on={c.active}onChange={v=>toggleActive(c.id,v)}/></td>
                <td><div style={{display:"flex",gap:4}}><button className="btn btn-ghost btn-icon btn-sm"onClick={()=>{setForm({...c});setEditC(c.id);}}><Ic.Edit/></button><button className="btn btn-danger btn-icon btn-sm"onClick={()=>deleteC(c.id)}><Ic.Trash/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editC&&(
        <div className="overlay"onClick={()=>setEditC(null)}>
          <div className="modal"style={{width:480}}onClick={e=>e.stopPropagation()}>
            <div className="modal-hd"><div className="modal-title">{editC==="new"?"Novo Desconto":"Editar Desconto"}</div><CloseBtn onClick={()=>setEditC(null)}/></div>
            <div className="modal-body">
              <Inp label="Nome"value={form.name||""}onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
              <div className="form-row">
                <Sel label="Tipo"value={form.type||"percent"}onChange={e=>setForm(p=>({...p,type:e.target.value}))}><option value="percent">Percentagem (%)</option><option value="fixed">Valor Fixo (€)</option></Sel>
                <Inp label={form.type==="fixed"?"Valor (€)":"Percentagem (%)"}type="number"value={form.value||""}onChange={e=>setForm(p=>({...p,value:parseFloat(e.target.value)||0}))}/>
              </div>
              <div><label className="form-label">Dias validos</label><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{DAYS_PT.slice(1).map((d,i)=><button key={i+1}onClick={()=>toggleDay(i+1)}style={{padding:"4px 8px",borderRadius:5,border:`1px solid ${(form.days||[]).includes(i+1)?T.accent:T.border}`,background:(form.days||[]).includes(i+1)?T.accentDim:T.card,color:(form.days||[]).includes(i+1)?T.accent:T.textSec,fontSize:11,fontWeight:600,cursor:"pointer"}}>{d}</button>)}</div></div>
              <div className="form-row"style={{marginTop:8}}><Inp label="Hora Inicio"type="time"value={form.start||"00:00"}onChange={e=>setForm(p=>({...p,start:e.target.value}))}/><Inp label="Hora Fim"type="time"value={form.end||"23:59"}onChange={e=>setForm(p=>({...p,end:e.target.value}))}/></div>
              {errMsg&&<div style={{marginTop:8,fontSize:12,color:T.danger,background:T.dangerDim,borderRadius:6,padding:"6px 10px"}}>{errMsg}</div>}
            </div>
            <div className="modal-foot"><button className="btn btn-ghost"onClick={()=>{setEditC(null);setErrMsg("");}}>Cancelar</button><button className="btn btn-solid"onClick={save}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RECEIPT MODAL (BACKOFFICE) ───────────────────────────────────────────────
function ReceiptModalBO({order,onClose}){
  const METHOD_LABELS=PAY_METHOD_LABEL;
  const dt=new Date(order.datetime);
  const dateStr=fmtDate(dt,{day:"2-digit",month:"2-digit",year:"numeric"});
  const timeStr=fmtTime(dt,{hour:"2-digit",minute:"2-digit"});
  const vatRate=23;
  const vatAmt=order.total*vatRate/(100+vatRate);
  const subtotalNet=order.total-vatAmt;
  return(
    <div className="overlay"style={{zIndex:200}}onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal"style={{width:320,maxHeight:"92vh",overflowY:"auto"}}>
        <div className="modal-hd">
          <div><div className="modal-title">Recibo</div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button className="btn btn-ghost btn-sm"onClick={()=>window.print()}>🖨 Imprimir</button>
            <button className="modal-close"onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="receipt-print"style={{padding:"0 20px 20px",fontFamily:"'DM Mono',monospace"}}>
          <div style={{textAlign:"center",padding:"16px 0 12px",borderBottom:`1px dashed ${T.border}`}}>
            <div style={{fontSize:17,fontWeight:800,fontFamily:"'Syne',sans-serif",color:T.text,letterSpacing:-.3}}>Yourkitchen</div>
            <div style={{fontSize:12,color:T.textSec,marginTop:4}}>Mesa {order.table}</div>
            <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{dateStr} · {timeStr}</div>
            {order.waiter&&order.waiter!=="—"&&<div style={{fontSize:11,color:T.textMuted}}>Funcionário: {order.waiter}</div>}
          </div>
          <div style={{padding:"10px 0",borderBottom:`1px dashed ${T.border}`}}>
            {order.rawLines.map((item,i)=>(
              <div key={i}style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:12,marginBottom:4}}>
                <span style={{color:T.textSec,flex:1,marginRight:8}}>{item.qty}× {item.name}</span>
                <span style={{color:T.text,flexShrink:0}}>{fmtEur((item.unit_price+item.extra_price)*item.qty)}</span>
              </div>
            ))}
          </div>
          <div style={{padding:"10px 0",borderBottom:`1px dashed ${T.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4,color:T.textMuted}}><span>Subtotal (s/IVA)</span><span>{fmtEur(subtotalNet)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4,color:T.textMuted}}><span>IVA {vatRate}%</span><span>{fmtEur(vatAmt)}</span></div>
            {order.discount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4,color:T.success}}><span>− Desconto</span><span>− {fmtEur(order.discount)}</span></div>}
            <div style={{display:"flex",justifyContent:"space-between",fontSize:16,fontWeight:700,color:T.text,marginTop:6}}><span>TOTAL</span><span>{fmtEur(order.total)}</span></div>
            {order.tip>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:T.teal,marginTop:2}}><span>Gorjeta</span><span>+ {fmtEur(order.tip)}</span></div>}
          </div>
          <div style={{padding:"10px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:T.textSec}}><span>Método</span><span style={{color:T.text}}>{METHOD_LABELS[order.method]||order.method}</span></div>
          </div>
          <div style={{textAlign:"center",paddingTop:8,borderTop:`1px dashed ${T.border}`,fontSize:11,color:T.textMuted}}>Obrigado pela visita!</div>
        </div>
      </div>
    </div>
  );
}

// ─── ORDER HISTORY ────────────────────────────────────────────────────────────
function OrderHistory(){
  const [orders,setOrders]=useState([]);
  const [search,setSearch]=useState("");
  const [dateFilter,setDateFilter]=useState("Todos");
  const [fromDt,setFromDt]=useState(""); // datetime-local: limite inferior
  const [toDt,setToDt]=useState("");     // datetime-local: limite superior
  const [expanded,setExpanded]=useState(null);
  const [viewReceipt,setViewReceipt]=useState(null);
  useEffect(()=>{
    Promise.all([
      fetch("/api/orders?status=paid&limit=100").then(r=>r.json()),
      fetch("/api/analytics/payments?from="+new Date(Date.now()-30*86400000).toISOString()).then(r=>r.json()).catch(()=>[]),
    ]).then(([data])=>{
      if(!Array.isArray(data))return;
      setOrders(data
        // Skip phantom orders with no real (non-cancelled) lines — empty
        // follow-up orders auto-created on "send" that were never used.
        .filter(o=>(o.lines||[]).some(l=>!l.cancelled))
        .map(o=>{
        const lines=(o.lines||[]).filter(l=>!l.cancelled);
        const total=lines.reduce((s,l)=>s+(Number(l.unit_price)+Number(l.extra_price||0))*l.qty,0);
        const items=lines.reduce((s,l)=>s+l.qty,0);
        const d=new Date(o.paid_at||o.created_at);
        const pays=(Array.isArray(o.payments)?o.payments:[]).map(p=>({
          method:p.method,amount:Number(p.amount||0),tip:Number(p.tip||0),
          items:Array.isArray(p.items)?p.items:null,
        }));
        // Distinct payment methods used (an item-split bill can mix methods).
        const methods=[...new Set(pays.map(p=>p.method))];
        const method=methods.length?methods.map(m=>PAY_METHOD_LABEL[m]||m).join(", "):"—";
        const tip=pays.reduce((s,p)=>s+p.tip,0);
        return{id:o.id,table:o.table?.label||"—",waiter:o.waiter?.name||"—",items,total,method,tip,payments:pays,
          time:fmtTime(d,{hour:"2-digit",minute:"2-digit"}),
          date:fmtDate(d),
          datetime:o.paid_at||o.created_at,
          discount:Number(o.discount_value||0),
          lines:lines.map(l=>`${l.qty}x ${l.name}`),
          rawLines:lines.map(l=>({qty:l.qty,name:l.name,unit_price:Number(l.unit_price),extra_price:Number(l.extra_price||0)})),
        };
      }));
    }).catch(()=>{});
  },[]);
  const todayStr=fmtDate(new Date());
  const yestStr=fmtDate(new Date(Date.now()-86400000));
  const dates=["Todos","Hoje","Ontem"];
  const rangeActive=!!(fromDt||toDt);
  const fromMs=fromDt?new Date(fromDt).getTime():null;
  const toMs=toDt?new Date(toDt).getTime():null;
  const filtered=orders.filter(o=>{
    // Custom date/time range takes precedence over the quick chips.
    if(rangeActive){
      const t=new Date(o.datetime).getTime();
      if(fromMs!=null&&t<fromMs)return false;
      if(toMs!=null&&t>toMs)return false;
    }else{
      if(dateFilter==="Hoje"&&o.date!==todayStr)return false;
      if(dateFilter==="Ontem"&&o.date!==yestStr)return false;
    }
    if(search&&!o.table.toLowerCase().includes(search.toLowerCase())&&!o.waiter.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });
  return(
    <div>
      <div className="filters-row">
        <input className="filter-input"placeholder="Pesquisar mesa, funcionário..."value={search}onChange={e=>setSearch(e.target.value)}style={{width:240}}/>
        {dates.map(d=><button key={d}className={`filter-chip${!rangeActive&&dateFilter===d?" active":""}`}onClick={()=>{setFromDt("");setToDt("");setDateFilter(d);}}>{d}</button>)}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:11,color:T.textMuted}}>De</span>
          <input type="datetime-local"className="filter-input"value={fromDt}onChange={e=>setFromDt(e.target.value)}style={{width:185,colorScheme:"dark"}}/>
          <span style={{fontSize:11,color:T.textMuted}}>Até</span>
          <input type="datetime-local"className="filter-input"value={toDt}onChange={e=>setToDt(e.target.value)}style={{width:185,colorScheme:"dark"}}/>
          {rangeActive&&<button className="filter-chip"onClick={()=>{setFromDt("");setToDt("");}}title="Limpar intervalo">✕</button>}
        </div>
        <button className="btn btn-ghost"style={{marginLeft:"auto"}}onClick={()=>{}}><Ic.Export/>Exportar</button>
      </div>
      <div className="card" style={{overflowX:"auto"}}>
        <table className="data-table">
          <thead><tr><th></th><th>ID</th><th>Mesa</th><th>Funcionário</th><th>Itens</th><th>Total</th><th>Gorjeta</th><th>Método</th><th>Data/Hora</th><th></th></tr></thead>
          <tbody>
            {filtered.map(o=>(
              <Fragment key={o.id}>
                <tr>
                  <td style={{width:32}}><button className="btn btn-ghost btn-icon btn-sm"onClick={()=>setExpanded(expanded===o.id?null:o.id)}>{expanded===o.id?<Ic.Up/>:<Ic.Down/>}</button></td>
                  <td><span className="mono"style={{color:T.textMuted,fontSize:11}}>{o.id.slice(0,8)}</span></td>
                  <td style={{fontWeight:700}}>{o.table}</td>
                  <td style={{color:T.textSec}}>{o.waiter}</td>
                  <td><span className="mono">{o.items}</span></td>
                  <td><span className="mono"style={{color:T.accent,fontWeight:700}}>{fmtEur(o.total)}</span></td>
                  <td>{o.tip>0?<span className="mono"style={{color:T.teal,fontWeight:700}}>+{fmtEur(o.tip)}</span>:<span style={{color:T.textMuted}}>—</span>}</td>
                  <td><Badge color={T.textSec}bg={T.elevated}>{o.method}</Badge></td>
                  <td><span style={{color:T.textMuted,fontSize:11}}>{o.date}</span><span className="mono"style={{color:T.textSec,marginLeft:6}}>{o.time}</span></td>
                  <td><button className="btn btn-ghost btn-sm"onClick={()=>setViewReceipt(o)}>Recibo</button></td>
                </tr>
                {expanded===o.id&&(
                  <tr>
                    <td colSpan={10}style={{background:T.elevated,padding:"12px 20px"}}>
                      <div style={{fontSize:11,color:T.textMuted,fontWeight:700,letterSpacing:.5,marginBottom:6}}>ITENS DO PEDIDO</div>
                      <div style={{fontSize:12,color:T.textSec,display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
                        {o.lines.map((l,i)=><span key={i}style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:5,padding:"3px 10px"}}>{l}</span>)}
                      </div>
                      <div style={{fontSize:11,color:T.textMuted,fontWeight:700,letterSpacing:.5,marginBottom:6}}>
                        PAGAMENTOS{o.payments.length>1?` · ${o.payments.length} transações`:""}
                      </div>
                      {o.payments.length===0
                        ?<div style={{fontSize:12,color:T.textMuted}}>Sem registo de pagamento</div>
                        :<div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {o.payments.map((p,i)=>(
                            <div key={i}style={{display:"flex",alignItems:"baseline",flexWrap:"wrap",gap:10,fontSize:12}}>
                              <Badge color={T.textSec}bg={T.card}>{PAY_METHOD_LABEL[p.method]||p.method}</Badge>
                              <span className="mono"style={{color:T.accent,fontWeight:700}}>{fmtEur(p.amount)}</span>
                              {p.tip>0&&<span className="mono"style={{color:T.teal}}>+{fmtEur(p.tip)} gorjeta</span>}
                              {p.items
                                ?<span style={{color:T.textSec}}>· {p.items.map(it=>`${it.qty}x ${it.name}`).join(", ")}</span>
                                :<span style={{color:T.textMuted}}>· pedido completo</span>}
                            </div>
                          ))}
                        </div>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&<div className="empty-state">Sem pedidos encontrados</div>}
      </div>
      {viewReceipt&&<ReceiptModalBO order={viewReceipt}onClose={()=>setViewReceipt(null)}/>}
    </div>
  );
}

// ─── LOGS ─────────────────────────────────────────────────────────────────────
function LogsSection(){
  const [logs,setLogs]=useState([]);
  const [level,setLevel]=useState("Todos");
  const [module,setModule]=useState("Todos");
  const [search,setSearch]=useState("");
  useEffect(()=>{
    fetch("/api/logs?limit=200").then(r=>r.json()).then(data=>{
      if(!Array.isArray(data))return;
      setLogs(data.map(l=>{const d=new Date(l.created_at);return{id:l.id,level:l.level,module:l.module,date:fmtDate(d,{day:"2-digit",month:"2-digit",year:"2-digit"}),time:fmtTime(d,{hour:"2-digit",minute:"2-digit",second:"2-digit"}),msg:l.message,comment:l.comment,who:l.staff?.name||null};}));
    }).catch(()=>{});
  },[]);
  const levels=["Todos","ACTION","CANCEL"];
  const modules=["Todos","POS","KDS","BACKOFFICE"];
  const filtered=logs.filter(l=>{
    if(level!=="Todos"&&l.level!==level)return false;
    if(module!=="Todos"&&l.module!==module)return false;
    if(search&&!l.msg.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });
  const exportLogs=()=>{
    const csv=["ID,Level,Module,Date,Time,Who,Message",...filtered.map(l=>`${l.id},${l.level},${l.module},${l.date},${l.time},${l.who||"—"},"${l.msg}"`)].join("\n");
    const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download="logs.csv";a.click();
  };
  return(
    <div>
      <div className="filters-row">
        <input className="filter-input"placeholder="Pesquisar..."value={search}onChange={e=>setSearch(e.target.value)}style={{width:220}}/>
        {levels.map(l=><button key={l}className={`filter-chip${level===l?" active":""}`}onClick={()=>setLevel(l)}>{l}</button>)}
      </div>
      <div className="filters-row">
        <span style={{fontSize:11,color:T.textMuted}}>Módulo:</span>
        {modules.map(m=><button key={m}className={`filter-chip${module===m?" active":""}`}onClick={()=>setModule(m)}>{m}</button>)}
        <button className="btn btn-ghost btn-sm"style={{marginLeft:"auto"}}onClick={exportLogs}><Ic.Export/>CSV</button>
      </div>
      <div className="card">
        <table className="data-table mono">
          <thead><tr><th>Nível</th><th>Módulo</th><th>Hora</th><th>Quem</th><th>Mensagem</th></tr></thead>
          <tbody>
            {filtered.length===0&&<tr><td colSpan={5}><div className="empty-state">Sem logs para os filtros seleccionados</div></td></tr>}
            {filtered.map(l=>{const lc=LEVEL_C[l.level]||LEVEL_C.INFO;return(
              <tr key={l.id}>
                <td><Badge color={lc.c}bg={lc.bg}>{l.level}</Badge></td>
                <td><Badge color={T.textSec}bg={T.elevated}>{l.module}</Badge></td>
                <td style={{fontFamily:"'DM Mono',monospace",fontSize:11,whiteSpace:"nowrap"}}><span style={{color:T.textMuted}}>{l.date}</span><span style={{color:T.textMuted,margin:"0 4px"}}>·</span><span style={{color:T.textSec}}>{l.time}</span></td>
                <td style={{fontWeight:600,fontSize:12,whiteSpace:"nowrap"}}>{l.who||<span style={{color:T.textMuted}}>—</span>}</td>
                <td>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:T.textSec}}>{l.msg}</div>
                  {l.comment&&<div style={{fontSize:11,color:T.textMuted,fontStyle:"italic",marginTop:2}}>"{l.comment}"</div>}
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
const SETTINGS_DEFAULTS={
  geral:{name:"YourKitchen",address:"",phone:"",email:"",timezone:"Europe/Lisbon"},
  fiscal:{nif:"",regime:"normal",rates:[
    {id:"r6",label:"Taxa Reduzida",value:6,active:true},
    {id:"r13",label:"Taxa Intermédia",value:13,active:true},
    {id:"r23",label:"Taxa Normal",value:23,active:true},
  ]},
  kds:{alertYellow:5,alertRed:12,autoRefresh:3},
  caixa:{defaultFundo:50,maxTurno:8,confirmAbertura:true},
  horario:{turnos:[
    {id:"t1",name:"Almoço",start:"11:30",end:"15:00"},
    {id:"t2",name:"Jantar",start:"18:30",end:"22:00"},
  ]},
};
function SettingsSection({onAppNameChange}={}){
  const [tab,setTab]=useState("geral");
  const [s,setS]=useState(SETTINGS_DEFAULTS);
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    fetch("/api/settings").then(r=>r.json()).then(flat=>{
      if(!flat||flat.error)return;
      setS(prev=>({
        geral:{name:flat["geral.name"]??prev.geral.name,address:flat["geral.address"]??prev.geral.address,phone:flat["geral.phone"]??prev.geral.phone,email:flat["geral.email"]??prev.geral.email,timezone:flat["geral.timezone"]??prev.geral.timezone},
        fiscal:{nif:flat["fiscal.nif"]??prev.fiscal.nif,regime:flat["fiscal.regime"]??prev.fiscal.regime,rates:flat["fiscal.rates"]??prev.fiscal.rates},
        kds:{alertYellow:flat["kds.alertYellow"]??prev.kds.alertYellow,alertRed:flat["kds.alertRed"]??prev.kds.alertRed,autoRefresh:flat["kds.autoRefresh"]??prev.kds.autoRefresh},
        caixa:{defaultFundo:flat["caixa.defaultFundo"]??prev.caixa.defaultFundo,maxTurno:flat["caixa.maxTurno"]??prev.caixa.maxTurno,confirmAbertura:flat["caixa.confirmAbertura"]??prev.caixa.confirmAbertura},
        horario:{turnos:Array.isArray(flat["horario.turnos"])?flat["horario.turnos"]:prev.horario.turnos},
      }));
      if(flat["geral.timezone"]) setTimezone(flat["geral.timezone"]);
    }).catch(()=>{});
  },[]);
  const patchKey=async(key,value)=>fetch(`/api/settings/${encodeURIComponent(key)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({value})});
  const saveSection=async(keys,section)=>{
    setSaving(true);
    await Promise.all(keys.map(k=>patchKey(`${section}.${k}`,s[section][k]))).catch(()=>{});
    setSaving(false);
    if(section==="geral"){ // propagate the name + timezone to the whole app immediately
      onAppNameChange?.(s.geral.name||"RestaurantOS");
      try{localStorage.setItem("ros_app_name",s.geral.name||"RestaurantOS");}catch{}
      if(s.geral.timezone) setTimezone(s.geral.timezone);
    }
  };
  const setG=(k,v)=>setS(p=>({...p,geral:{...p.geral,[k]:v}}));
  const setF=(k,v)=>setS(p=>({...p,fiscal:{...p.fiscal,[k]:v}}));
  const setRate=(id,k,v)=>setS(p=>({...p,fiscal:{...p.fiscal,rates:p.fiscal.rates.map(x=>x.id===id?{...x,[k]:v}:x)}}));
  const saveFiscal=()=>{
    if(window.confirm("Vais alterar a configuração de IVA. As taxas afetam o cálculo fiscal de novos lançamentos e os itens passam a usar os novos valores. Confirmar?"))
      saveSection(["nif","regime","rates"],"fiscal");
  };
  const setK=(k,v)=>setS(p=>({...p,kds:{...p.kds,[k]:v}}));
  const setC=(k,v)=>setS(p=>({...p,caixa:{...p.caixa,[k]:v}}));
  const addTurno=()=>setS(p=>({...p,horario:{turnos:[...p.horario.turnos,{id:`t${Date.now()}`,name:"Novo turno",start:"12:00",end:"15:00"}]}}));
  const setTurno=(id,k,v)=>setS(p=>({...p,horario:{turnos:p.horario.turnos.map(t=>t.id===id?{...t,[k]:v}:t)}}));
  const removeTurno=(id)=>setS(p=>({...p,horario:{turnos:p.horario.turnos.filter(t=>t.id!==id)}}));
  return(
    <div>
      <div className="stab-row">{["geral","fiscal","kds"].map(t=><div key={t}className={`stab${tab===t?" active":""}`}onClick={()=>setTab(t)}>{t==="fiscal"?"Fiscal & IVA":t==="kds"?"KDS":"Geral"}</div>)}</div>
      <div style={{maxWidth:520}}>
        {tab==="geral"&&<div className="card"><div className="card-body">
          <Inp label="Nome do Restaurante"value={s.geral.name}onChange={e=>setG("name",e.target.value)}/>
          <Inp label="Morada"value={s.geral.address}onChange={e=>setG("address",e.target.value)}/>
          <div className="form-row"><Inp label="Telefone"value={s.geral.phone}onChange={e=>setG("phone",e.target.value)}/><Inp label="Email"value={s.geral.email}onChange={e=>setG("email",e.target.value)}/></div>
          <Sel label="Fuso Horário"value={s.geral.timezone}onChange={e=>setG("timezone",e.target.value)}>
            <option value="UTC">UTC</option>
            <option value="Europe/Lisbon">Europe/Lisbon (WET/WEST)</option>
            <option value="Europe/London">Europe/London (GMT/BST)</option>
            <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
            <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
            <option value="America/New_York">America/New_York (EST/EDT)</option>
            <option value="America/Chicago">America/Chicago (CST/CDT)</option>
            <option value="America/Denver">America/Denver (MST/MDT)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
            <option value="America/Sao_Paulo">America/Sao_Paulo (BRT)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
          </Sel>
          <button className="btn btn-solid"disabled={saving}onClick={()=>saveSection(["name","address","phone","email","timezone"],"geral")}>{saving?"A guardar...":"Guardar"}</button>
        </div></div>}
        {tab==="fiscal"&&<div className="card"><div className="card-body">
          <Inp label="NIF do Restaurante"value={s.fiscal.nif}onChange={e=>setF("nif",e.target.value)}/>
          <Sel label="Regime de IVA"value={s.fiscal.regime}onChange={e=>setF("regime",e.target.value)}><option value="normal">Regime Normal</option><option value="simplificado">Regime Simplificado</option><option value="isento">Isento</option></Sel>
          <div className="form-group"><label className="form-label">Taxas de IVA</label>
            {(s.fiscal.rates||[]).map(r=>(
              <div key={r.id}style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:T.card,border:`1px solid ${T.border}`,borderRadius:8,marginBottom:6}}>
                <Toggle on={r.active}onChange={v=>setRate(r.id,"active",v)}/>
                <input className="form-input"style={{flex:1}}value={r.label}onChange={e=>setRate(r.id,"label",e.target.value)}/>
                <input className="form-input"style={{width:70,textAlign:"right"}}type="number"step="0.5"min="0"max="100"value={r.value}onChange={e=>setRate(r.id,"value",parseFloat(e.target.value)||0)}/>
                <span className="mono"style={{color:T.textMuted}}>%</span>
              </div>
            ))}
            <div style={{fontSize:11,color:T.warning,marginTop:4}}>⚠ Alterar uma taxa pede confirmação. Itens existentes mantêm a sua taxa até serem reeditados.</div>
          </div>
          <button className="btn btn-solid"disabled={saving}onClick={saveFiscal}>{saving?"A guardar...":"Guardar"}</button>
        </div></div>}
        {tab==="kds"&&<div className="card"><div className="card-body">
          <div className="form-row">
            <Inp label="Alerta Amarelo (min)"type="number"value={s.kds.alertYellow}onChange={e=>setK("alertYellow",parseInt(e.target.value)||5)}/>
            <Inp label="Alerta Vermelho (min)"type="number"value={s.kds.alertRed}onChange={e=>setK("alertRed",parseInt(e.target.value)||12)}/>
          </div>
          <Inp label="Auto-refresh (segundos)"type="number"value={s.kds.autoRefresh}onChange={e=>setK("autoRefresh",parseInt(e.target.value)||3)}/>
          <div style={{background:T.elevated,borderRadius:8,padding:"12px 14px",fontSize:12,color:T.textSec,marginTop:4}}>
            Ticket ficará <span style={{color:T.warning,fontWeight:700}}>amarelo</span> após <strong>{s.kds.alertYellow} min</strong> e <span style={{color:T.danger,fontWeight:700}}>vermelho</span> após <strong>{s.kds.alertRed} min</strong>.
          </div>
          <button className="btn btn-solid"style={{marginTop:14}}disabled={saving}onClick={()=>saveSection(["alertYellow","alertRed","autoRefresh"],"kds")}>{saving?"A guardar...":"Guardar"}</button>
        </div></div>}
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV=[
  {id:"dashboard",label:"Dashboard",Icon:Ic.Dashboard},
  {id:"analytics",label:"Analytics",Icon:Ic.Analytics},
  {id:"menu",label:"Items do Menu",Icon:Ic.Menu},
  {id:"modifiers",label:"Modificadores",Icon:Ic.Layers},
  {id:"categories",label:"Categorias",Icon:Ic.Grid},
  {id:"ingredients",label:"Ingredientes",Icon:Ic.Leaf},
  {id:"tables",label:"Mesas",Icon:Ic.Tables},
  {id:"zones",label:"Zonas",Icon:Ic.MapPin},
  {id:"staff",label:"Equipa",Icon:Ic.Staff},
  {id:"campaigns",label:"Descontos",Icon:Ic.Tag},
  {id:"orders",label:"Pedidos",Icon:Ic.Orders},
  {id:"logs",label:"Logs",Icon:Ic.Logs},
  {id:"settings",label:"Definicoes",Icon:Ic.Settings},
];
const SECTION_TITLES={dashboard:"Dashboard",analytics:"Analytics",menu:"Items do Menu",modifiers:"Modificadores",categories:"Categorias de Menu",ingredients:"Ingredientes",tables:"Gestao de Mesas",zones:"Zonas",staff:"Gestao de Equipa",campaigns:"Descontos",orders:"Historico de Pedidos",logs:"Logs do Sistema",settings:"Definicoes"};

function Sidebar({active,onSelect,collapsed,onCollapse,appName="RestaurantOS"}){
  return(
    <nav className={`sidebar ${collapsed?"collapsed":"expanded"}`}>
      <div className="sb-logo">
        <div className="sb-logo-dot"/>
        {!collapsed&&<><span className="sb-logo-text">{appName}</span><span className="sb-logo-sub">v1</span></>}
      </div>
      <div className="sb-nav">
        {NAV.map(({id,label,Icon})=>(
          <div key={id}className={`sb-item${active===id?" active":""}`}onClick={()=>onSelect(id)}>
            <Icon/>{!collapsed&&<span className="sb-label">{label}</span>}
          </div>
        ))}
      </div>
      <div className="sb-bottom">
        <div className="sb-sep"/>
        <button className="sb-collapse"onClick={onCollapse}title={collapsed?"Expandir":"Recolher"}>
          {collapsed?<Ic.ChevRight/>:<Ic.ChevLeft/>}
          {!collapsed&&<span style={{marginLeft:8,fontSize:11,fontWeight:600}}>Recolher</span>}
        </button>
      </div>
    </nav>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Backoffice({appName="RestaurantOS",onAppNameChange}){
  const [section,setSection]=useState("dashboard");
  const [collapsed,setCollapsed]=useState(false);

  const sections={
    dashboard:<Dashboard/>,analytics:<Analytics/>,menu:<MenuStock/>,
    modifiers:<ModifiersMgmt/>,
    categories:<CategoriesMgmt/>,ingredients:<IngredientsMgmt/>,
    tables:<TablesMgmt/>,zones:<ZonesMgmt/>,
    staff:<StaffMgmt/>,
    campaigns:<Campaigns/>,orders:<OrderHistory/>,logs:<LogsSection/>,settings:<SettingsSection onAppNameChange={onAppNameChange}/>,
  };

  return(
    <>
      <style>{CSS}</style>
      <div className="bo-root">
        <Sidebar active={section}onSelect={setSection}collapsed={collapsed}onCollapse={()=>setCollapsed(v=>!v)}appName={appName}/>
        <div className="bo-main">
          <div className="bo-topbar">
            <div className="bo-section-title">{SECTION_TITLES[section]}</div>
            <div className="bo-topbar-right">
              <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:T.textMuted,fontFamily:"'DM Mono',monospace"}}>
                <span className="live-dot"/>Live
              </div>
              <div style={{width:1,height:20,background:T.border,margin:"0 4px"}}/>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 10px",background:T.elevated,border:`1px solid ${T.border}`,borderRadius:8}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:T.accentDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:T.accent}}>GE</div>
                <span style={{fontSize:12,fontWeight:600}}>Gestor</span>
              </div>
            </div>
          </div>
          <div className="bo-content"style={{padding:section==="menu"?0:20}}>
            {sections[section]}
          </div>
        </div>
      </div>
    </>
  );
}
