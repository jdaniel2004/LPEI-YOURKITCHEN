import { useState, useEffect, useRef, useCallback } from "react";

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
  text:"#EDEDF2",textSec:"#8888A0",textMuted:"#4A4A60",
};

// ─── API HELPERS ──────────────────────────────────────────────────────────────
function mapOrder(o) {
  return {
    id: o.id,
    tableId: o.table?.label || null,
    tableDbId: o.table_id,
    waiterId: o.waiter_id,
    items: (o.lines || []).map(l => ({
      lineId: l.id,
      itemId: l.item_id,
      name: l.name,
      qty: l.qty,
      price: l.unit_price,
      vat: l.vat_rate,
      mods: Array.isArray(l.modifiers) ? l.modifiers : [],
      notes: l.notes || "",
      sent: l.sent,
      sentBatch: l.sent_batch ?? 0,
      delivered: l.delivered ?? false,
      cancelled: l.cancelled,
      paidQty: l.paid_qty ?? 0,
      extraPrice: l.extra_price || 0,
      modifierIngredients: Array.isArray(l.modifier_ingredients) ? l.modifier_ingredients : [],
    })),
    notes: o.notes || "",
    type: o.type || "table",
    status: o.status,
    sentAt: o.created_at ? new Date(o.created_at).getTime() : null,
    paid: o.status === "paid",
  };
}

// Build the grouped POS menu (categories + items) from API responses.
// Pure function so it can run both on initial load and on the live-sync poll.
function buildMenu(menuRes, modifierIngIds){
  const catMap={};
  if(Array.isArray(menuRes)){
    menuRes.forEach(item=>{
      const cat=item.category;if(!cat)return;
      if(!catMap[cat.id]) catMap[cat.id]={id:cat.id,name:cat.name,emoji:cat.emoji||"🍽️",items:[],position:cat.position??0};
      const mapOpt=o=>({id:o.id,label:o.label,price:o.extra_price||0,ingredientId:o.ingredient_id||null,ingredientQty:o.ingredient_qty!=null?Number(o.ingredient_qty):null,ingredientUnit:o.ingredient_unit||null,ingredientStoredUnit:o.ingredient?.unit||null,ingredientName:o.ingredient?.name||null});
      // Per-item custom modifiers
      const customMods=(item.modifiers||[]).map(m=>({
        id:m.id,name:m.name,
        options:(m.options||[]).map(mapOpt),
      }));
      // Linked library modifiers (synchronised templates)
      const linkedMods=(item.templateLinks||[])
        .map(tl=>tl.template).filter(Boolean)
        .map(t=>({
          id:t.id,name:t.name,
          options:(t.options||[]).map(mapOpt),
        }));
      catMap[cat.id].items.push({
        id:item.id,name:item.name,emoji:item.emoji||"🍽️",
        price:item.price,vat:item.vat_rate,stock:item.stock,
        mods:[...customMods,...linkedMods],
        ingredientMods:(item.ingredients||[])
          .filter(ii=>ii.ingredient?.id&&modifierIngIds.has(ii.ingredient.id))
          .map(ii=>({id:ii.ingredient.id,name:ii.ingredient.name})),
      });
    });
  }
  return Object.values(catMap).sort((a,b)=>a.position-b.position);
}



// ─── HELPERS ──────────────────────────────────────────────────────────────────
let _lineId = 1000;
const newLineId = () => `l${++_lineId}`;

// Convert a quantity between units of the same measure group (weight/volume/count).
// Mirrors the backoffice UNIT_DEFS factors. Cross-group or unknown → returned as-is.
const _UNIT_FACTOR = { mg:["w",0.001], g:["w",1], kg:["w",1000], ml:["v",1], cl:["v",10], dl:["v",100], L:["v",1000], un:["c",1], pcs:["c",1], cx:["c",1], dz:["c",12] };
function convUnit(qty, from, to){
  if(!from || !to || from===to) return qty;
  const f=_UNIT_FACTOR[from], t=_UNIT_FACTOR[to];
  if(!f || !t || f[0]!==t[0] || !t[1]) return qty;
  return (qty * f[1]) / t[1];
}

function fmtEur(v){ return `€${Number(v).toFixed(2)}`; }
function fmtMins(ms){
  const m=Math.floor(ms/60000);
  if(m<60) return `${m}m`;
  return `${Math.floor(m/60)}h${String(m%60).padStart(2,"0")}`;
}
function nowTime(){
  return new Date().toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
}
function orderTotal(items){
  return items.filter(i=>!i.cancelled).reduce((s,i)=>s+(i.price+(i.extraPrice||0))*i.qty,0);
}
function orderVAT(items){
  const map={};
  items.filter(i=>!i.cancelled).forEach(i=>{
    const rate=i.vat;
    const base=(i.price+(i.extraPrice||0))*i.qty;
    const vat=base-(base/(1+rate/100));
    map[rate]=(map[rate]||0)+vat;
  });
  return map;
}
function stockForItem(menuStock, itemId){
  return menuStock[itemId]!==undefined ? menuStock[itemId] : null;
}

const STATUS_MAP = {
  free:   {label:"Livre",   color:T.success, bg:T.successDim, border:`${T.success}44`},
  occupied:{label:"Ocupada",color:T.warning, bg:T.warningDim, border:`${T.warning}44`},
  bill:   {label:"Servido", color:T.danger,  bg:T.dangerDim,  border:`${T.danger}44`},
  reserved:{label:"Reserva",color:T.purple,  bg:T.purpleDim,  border:`${T.purple}44`},
  locked: {label:"Em uso",  color:T.blue,    bg:T.blueDim,    border:`${T.blue}44`},
};

const RESV_STATUS = {
  pending:   {label:"Pendente",  color:T.warning, bg:T.warningDim},
  confirmed: {label:"Confirmada",color:T.success, bg:T.successDim},
  seated:    {label:"Sentada",   color:T.blue,    bg:T.blueDim},
  cancelled: {label:"Cancelada", color:T.danger,  bg:T.dangerDim},
  completed: {label:"Concluída", color:T.textMuted,bg:"#ffffff10"},
};

// ─── TURNOS (operating shifts) ──────────────────────────────────────────────────
function hhmmToMin(t){
  if(!t) return null;
  const [h,m]=String(t).slice(0,5).split(":").map(Number);
  if(Number.isNaN(h)) return null;
  return h*60+(m||0);
}
// True if `mins` falls within [start,end]; handles windows that cross midnight.
function inTurnoWindow(mins,start,end){
  const s=hhmmToMin(start),e=hhmmToMin(end);
  if(s==null||e==null||mins==null) return false;
  return e>=s ? (mins>=s&&mins<=e) : (mins>=s||mins<=e);
}
function currentTurno(turnos,now=new Date()){
  const mins=now.getHours()*60+now.getMinutes();
  return (turnos||[]).find(t=>inTurnoWindow(mins,t.start,t.end))||null;
}
function turnoForTime(turnos,time){
  return (turnos||[]).find(t=>inTurnoWindow(hhmmToMin(time),t.start,t.end))||null;
}
function localDateStr(now=new Date()){
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}
// A reservation is active only on its day and during the turno that covers its time.
// With no turnos configured we don't block anything.
function reservationActive(resv,turnos,now=new Date()){
  if(!Array.isArray(turnos)||turnos.length===0) return true;
  if(resv.date!==localDateStr(now)) return false;
  const cur=currentTurno(turnos,now);
  if(!cur) return false;
  const rt=turnoForTime(turnos,resv.time);
  return !!rt && rt.start===cur.start && rt.end===cur.end;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{width:100%;height:100%;overflow:hidden;background:${T.bg};color:${T.text};font-family:'Syne',sans-serif;-webkit-tap-highlight-color:transparent;user-select:none;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px;}
input,textarea{font-family:'Syne',sans-serif;color:${T.text};}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

/* ─ LAYOUT ─ */
.pos-root{width:100vw;height:100%;display:flex;flex-direction:column;overflow:hidden;}

/* ─ TOPBAR ─ */
.topbar{height:52px;background:${T.surface};border-bottom:1px solid ${T.border};display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0;z-index:20;}
.topbar-logo{font-weight:800;font-size:16px;letter-spacing:-.5px;display:flex;align-items:center;gap:8px;}
.topbar-dot{width:7px;height:7px;border-radius:50%;background:${T.accent};box-shadow:0 0 10px ${T.accent};}
.topbar-sep{width:1px;height:22px;background:${T.border};}
.topbar-staff{display:flex;align-items:center;gap:8px;padding:4px 10px;background:${T.elevated};border:1px solid ${T.border};border-radius:8px;font-size:12px;color:${T.textSec};}
.staff-avatar{width:24px;height:24px;border-radius:50%;background:${T.accentDim};border:1px solid ${T.accent}44;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${T.accent};}
.topbar-right{margin-left:auto;display:flex;align-items:center;gap:8px;}
.topbar-clock{font-family:'DM Mono',monospace;font-size:14px;color:${T.textSec};}

/* ─ BUTTONS ─ */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:none;border-radius:8px;padding:10px 16px;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;letter-spacing:.2px;}
.btn:active{transform:scale(.97);}
.btn-ghost{background:${T.elevated};border:1px solid ${T.border};color:${T.textSec};}
.btn-ghost:hover{border-color:${T.borderBright};color:${T.text};}
.btn-accent{background:${T.accentDim};border:1px solid ${T.accent}44;color:${T.accent};}
.btn-accent:hover{background:${T.accentMid};}
.btn-teal{background:${T.tealDim};border:1px solid ${T.teal}44;color:${T.teal};}
.btn-teal:hover{background:${T.teal}28;}
.btn-danger{background:${T.dangerDim};border:1px solid ${T.danger}44;color:${T.danger};}
.btn-danger:hover{background:${T.danger}28;}
.btn-success{background:${T.successDim};border:1px solid ${T.success}44;color:${T.success};}
.btn-success:hover{background:${T.success}28;}
.btn-warning{background:${T.warningDim};border:1px solid ${T.warning}44;color:${T.warning};}
.btn-warning:hover{background:${T.warning}28;}
.btn-solid-accent{background:${T.accent};border:1px solid ${T.accent};color:#fff;}
.btn-solid-accent:hover{background:#6a59e8;}
.btn-solid-success{background:${T.success};border:1px solid ${T.success};color:#08080B;}
.btn-solid-success:hover{background:#38e070;}
.btn-lg{padding:13px 20px;font-size:14px;border-radius:10px;}
.btn-sm{padding:6px 10px;font-size:11px;border-radius:6px;}
.btn:disabled{opacity:.35;cursor:not-allowed;transform:none!important;}

/* ─ MODAL ─ */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;animation:fadeIn .15s ease;}
.modal{background:${T.elevated};border:1px solid ${T.borderBright};border-radius:14px;box-shadow:0 32px 80px rgba(0,0,0,.6);animation:slideUp .2s ease;}
.modal-header{padding:20px 24px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.modal-title{font-size:17px;font-weight:700;}
.modal-sub{font-size:13px;color:${T.textSec};margin-top:3px;}
.modal-close{background:none;border:none;color:${T.textMuted};cursor:pointer;font-size:18px;padding:2px;line-height:1;transition:color .15s;flex-shrink:0;}
.modal-close:hover{color:${T.text};}
.modal-body{padding:20px 24px;}
.modal-footer{padding:0 24px 20px;display:flex;gap:8px;justify-content:flex-end;}

/* ─ FUNDO MANEIO ─ */
.fundo-screen{flex:1;display:flex;align-items:center;justify-content:center;background:${T.bg};animation:fadeIn .3s;}
.fundo-card{width:440px;background:${T.surface};border:1px solid ${T.border};border-radius:16px;overflow:hidden;}
.fundo-card-head{padding:24px 28px 20px;border-bottom:1px solid ${T.border};}
.fundo-card-title{font-size:20px;font-weight:800;margin-bottom:4px;}
.fundo-card-sub{font-size:13px;color:${T.textSec};}
.fundo-display{font-family:'DM Mono',monospace;font-size:42px;font-weight:500;letter-spacing:2px;color:${T.text};padding:24px 28px 0;text-align:center;}
.fundo-display.empty{color:${T.textMuted};}
.fundo-numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:16px 20px 20px;background:${T.bg};}
.numpad-btn{background:${T.card};border:1px solid ${T.border};color:${T.text};font-size:20px;font-family:'DM Mono',monospace;font-weight:500;padding:16px;cursor:pointer;transition:all .1s;border-radius:6px;}
.numpad-btn:hover{background:${T.elevated};border-color:${T.borderBright};}
.numpad-btn:active{transform:scale(.95);background:${T.accentDim};}
.numpad-btn.del{color:${T.textSec};font-size:16px;}
.numpad-btn.zero{grid-column:span 2;}
.fundo-confirm{margin:0 20px 20px;padding:14px;font-size:15px;}

/* ─ FLOOR ─ */
.floor-screen{flex:1;display:flex;flex-direction:column;overflow:hidden;animation:fadeIn .2s;}
.floor-stats{display:flex;align-items:center;gap:0;border-bottom:1px solid ${T.border};background:${T.surface};flex-shrink:0;}
.stat-item{flex:1;padding:10px 18px;border-right:1px solid ${T.border};}
.stat-item:last-child{border-right:none;}
.stat-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${T.textMuted};margin-bottom:3px;}
.stat-value{font-size:17px;font-weight:700;font-family:'DM Mono',monospace;}
.floor-zones{display:flex;gap:0;border-bottom:1px solid ${T.border};background:${T.surface};flex-shrink:0;}
.zone-tab{flex:1;padding:11px 20px;text-align:center;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${T.textMuted};cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;}
.zone-tab.active{color:${T.accent};border-color:${T.accent};}
.zone-tab:hover:not(.active){color:${T.textSec};}
.floor-body{flex:1;overflow-y:auto;padding:16px;}
.tables-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;}
.table-card{border:1px solid ${T.border};border-radius:10px;padding:12px;cursor:pointer;transition:all .18s;background:${T.card};min-height:100px;display:flex;flex-direction:column;gap:6px;position:relative;}
.table-card:hover{border-color:${T.borderBright};transform:translateY(-1px);}
.table-card:active{transform:scale(.98);}
.table-card.status-free{border-color:${T.success}33;}
.table-card.status-occupied{border-color:${T.warning}33;}
.table-card.status-bill{border-color:${T.danger}33;}
.table-card.status-reserved{border-color:${T.purple}33;}
.table-card.status-locked{border-color:${T.blue}33;opacity:.75;cursor:not-allowed;}
.table-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.table-id{font-size:16px;font-weight:800;letter-spacing:-.5px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.table-status-dot{width:8px;height:8px;border-radius:50%;}
.table-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;letter-spacing:.3px;flex-shrink:0;white-space:nowrap;}
.table-meta{display:flex;align-items:center;justify-content:space-between;margin-top:auto;}
.table-seats{font-size:11px;color:${T.textMuted};display:flex;align-items:center;gap:3px;}
.table-waiter-av{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;background:${T.accentDim};color:${T.accent};}
.table-since{font-size:10px;font-family:'DM Mono',monospace;color:${T.textMuted};}
.table-reserved-label{font-size:10px;color:${T.purple};margin-top:2px;}
.fab-row{position:fixed;bottom:20px;right:20px;display:flex;gap:8px;z-index:10;}

/* ─ ORDER SCREEN ─ */
.order-screen{flex:1;display:flex;overflow:hidden;animation:slideInRight .2s ease;}
.menu-panel{flex:0 0 60%;display:flex;flex-direction:column;border-right:1px solid ${T.border};overflow:hidden;}
.order-panel{flex:0 0 40%;display:flex;flex-direction:column;overflow:hidden;}
.menu-cats{display:flex;overflow-x:auto;padding:10px 12px;gap:6px;border-bottom:1px solid ${T.border};flex-shrink:0;background:${T.surface};}
.menu-cats::-webkit-scrollbar{height:2px;}
.cat-tab{white-space:nowrap;padding:8px 14px;border:1px solid ${T.border};border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;background:${T.card};color:${T.textSec};}
.cat-tab.active{background:${T.accentDim};border-color:${T.accent}44;color:${T.accent};}
.cat-tab:hover:not(.active){border-color:${T.borderBright};color:${T.text};}
.menu-items{flex:1;overflow-y:auto;padding:10px 12px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;align-content:start;}
.menu-item-card{background:${T.card};border:1px solid ${T.border};border-radius:10px;padding:12px 10px;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:6px;position:relative;}
.menu-item-card:hover{border-color:${T.borderBright};background:${T.elevated};}
.menu-item-card:active{transform:scale(.96);}
.menu-item-card.out-of-stock{opacity:.45;cursor:not-allowed;pointer-events:none;}
.item-emoji{font-size:22px;line-height:1;}
.item-name{font-size:12px;font-weight:600;color:${T.text};line-height:1.3;min-height:30px;}
.item-price{font-size:13px;font-weight:700;font-family:'DM Mono',monospace;color:${T.accent};}
.item-stock-badge{position:absolute;top:6px;right:6px;font-size:9px;font-weight:700;background:${T.dangerDim};color:${T.danger};border:1px solid ${T.danger}33;padding:2px 5px;border-radius:3px;}
.item-low-badge{position:absolute;top:6px;right:6px;font-size:9px;font-weight:700;background:${T.warningDim};color:${T.warning};border:1px solid ${T.warning}33;padding:2px 5px;border-radius:3px;}

/* ─ ORDER PANEL ─ */
.op-header{padding:12px 14px;border-bottom:1px solid ${T.border};background:${T.surface};flex-shrink:0;display:flex;align-items:center;gap:10px;}
.op-table-badge{background:${T.accentDim};border:1px solid ${T.accent}44;color:${T.accent};border-radius:6px;padding:4px 10px;font-size:13px;font-weight:800;}
.op-waiter{font-size:12px;color:${T.textSec};}
.op-actions-top{margin-left:auto;display:flex;gap:6px;}
.op-items{flex:1;overflow-y:auto;padding:10px 12px;min-height:0;}
.op-section-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${T.textMuted};padding:4px 2px 8px;display:flex;align-items:center;gap:6px;}
.op-section-label::after{content:'';flex:1;height:1px;background:${T.border};}
.order-line{display:flex;align-items:flex-start;gap:8px;padding:7px 8px;border-radius:8px;transition:background .12s;}
.order-line:hover{background:${T.elevated};}
.order-line.sent{opacity:.65;}
.order-line.delivered{opacity:1;}
.order-line.delivered .ol-name{color:${T.success};}
.ol-delivered-tag{font-size:10px;font-weight:700;letter-spacing:.5px;color:${T.success};background:${T.successDim};border:1px solid ${T.success}44;border-radius:5px;padding:3px 7px;white-space:nowrap;align-self:center;}
.order-line.cancelled{opacity:.25;text-decoration:line-through;}
.ol-qty{font-family:'DM Mono',monospace;font-size:14px;font-weight:500;color:${T.accent};min-width:20px;flex-shrink:0;padding-top:1px;}
.ol-info{flex:1;min-width:0;}
.ol-name{font-size:13px;font-weight:600;line-height:1.2;}
.ol-mods{font-size:11px;color:${T.textMuted};margin-top:2px;}
.ol-price{font-family:'DM Mono',monospace;font-size:12px;color:${T.textSec};white-space:nowrap;padding-top:2px;}
.ol-controls{display:flex;gap:3px;align-items:center;}
.qty-btn{width:24px;height:24px;border-radius:5px;border:1px solid ${T.border};background:${T.elevated};color:${T.text};font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .1s;flex-shrink:0;font-family:'DM Mono',monospace;}
.qty-btn:hover{border-color:${T.accent}55;color:${T.accent};}
.qty-btn:active{transform:scale(.9);}
.cancel-line-btn{background:none;border:none;color:${T.textMuted};cursor:pointer;font-size:11px;font-weight:700;padding:3px 6px;border-radius:4px;font-family:'Syne',sans-serif;transition:all .12s;opacity:0;}
.order-line:hover .cancel-line-btn{opacity:1;}
.cancel-line-btn:hover{background:${T.dangerDim};color:${T.danger};}
.op-notes{padding:8px 12px;border-top:1px solid ${T.border};flex-shrink:0;}
.notes-input{width:100%;background:${T.card};border:1px solid ${T.border};border-radius:7px;color:${T.text};font-family:'Syne',sans-serif;font-size:12px;padding:8px 10px;resize:none;height:50px;outline:none;transition:border-color .15s;}
.notes-input:focus{border-color:${T.borderBright};}
.op-totals{padding:10px 14px;border-top:1px solid ${T.border};background:${T.surface};flex-shrink:0;}
.total-row{display:flex;justify-content:space-between;align-items:center;padding:2px 0;}
.total-label{font-size:11px;color:${T.textSec};}
.total-val{font-family:'DM Mono',monospace;font-size:12px;color:${T.textSec};}
.total-row.grand .total-label{font-size:14px;font-weight:700;color:${T.text};}
.total-row.grand .total-val{font-size:16px;font-weight:700;color:${T.text};}
.vat-row{font-size:10px;color:${T.textMuted};display:flex;justify-content:space-between;padding:1px 0;}
.op-actions{padding:10px 12px;border-top:1px solid ${T.border};display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;}
.op-actions .btn{flex:1;min-width:calc(50% - 3px);font-size:12px;padding:10px 8px;}

/* ─ MODIFIER MODAL ─ */
.mod-modal{width:420px;}
.mod-group{margin-bottom:18px;}
.mod-group-title{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${T.textMuted};margin-bottom:10px;display:flex;align-items:center;gap:8px;}
.mod-required-tag{font-size:9px;background:${T.dangerDim};color:${T.danger};border:1px solid ${T.danger}33;padding:2px 5px;border-radius:3px;letter-spacing:.5px;}
.mod-options{display:flex;flex-direction:column;gap:4px;}
.mod-option{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid ${T.border};border-radius:8px;cursor:pointer;transition:all .12s;background:${T.card};}
.mod-option:hover{border-color:${T.borderBright};}
.mod-option.selected{border-color:${T.accent}55;background:${T.accentDim};}
.mod-option-label{flex:1;font-size:13px;font-weight:600;}
.mod-option-price{font-family:'DM Mono',monospace;font-size:12px;color:${T.textMuted};}
.mod-radio{width:16px;height:16px;border-radius:50%;border:2px solid ${T.border};transition:all .12s;flex-shrink:0;}
.mod-option.selected .mod-radio{border-color:${T.accent};background:${T.accent};}
.mod-check{width:16px;height:16px;border-radius:4px;border:2px solid ${T.border};transition:all .12s;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.mod-option.selected .mod-check{border-color:${T.accent};background:${T.accent};}

/* ─ INGREDIENT MODIFIER ROWS ─ */
.ingmod-list{display:flex;flex-direction:column;gap:6px;}
.ingmod-row{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border:1px solid ${T.border};border-radius:8px;background:${T.card};}
.ingmod-name{font-size:13px;font-weight:600;flex:1;}
.ingmod-removed{text-decoration:line-through;color:${T.danger};}
.ingmod-extra{color:${T.success};}
.ingmod-btns{display:flex;gap:6px;}

/* ─ TRANSFER MODAL ─ */
.transfer-modal{width:360px;}
.staff-list{display:flex;flex-direction:column;gap:6px;}
.staff-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid ${T.border};border-radius:8px;cursor:pointer;transition:all .12s;background:${T.card};}
.staff-item:hover{border-color:${T.borderBright};background:${T.elevated};}
.staff-item.selected{border-color:${T.accent}55;background:${T.accentDim};}
.staff-av-lg{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;background:${T.elevated};color:${T.text};}
.staff-name{font-size:14px;font-weight:600;}
.staff-role{font-size:11px;color:${T.textMuted};}
.staff-item.self{opacity:.35;cursor:not-allowed;pointer-events:none;}

/* ─ PAYMENT MODAL ─ */
.pay-modal{width:560px;max-height:92vh;overflow-y:auto;}
.pay-method-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px;}
.pay-method{padding:16px;border:1px solid ${T.border};border-radius:10px;cursor:pointer;transition:all .15s;background:${T.card};text-align:center;}
.pay-method:hover{border-color:${T.borderBright};background:${T.elevated};}
.pay-method.selected{border-color:${T.accent}55;background:${T.accentDim};}
.pay-method-icon{font-size:24px;margin-bottom:6px;}
.pay-method-name{font-size:13px;font-weight:700;}
.pay-section{margin-bottom:16px;}
.pay-label{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${T.textMuted};margin-bottom:8px;}
.pay-amount-input{width:100%;background:${T.card};border:1px solid ${T.border};border-radius:8px;color:${T.text};font-family:'DM Mono',monospace;font-size:28px;font-weight:500;padding:12px 14px;outline:none;transition:border-color .15s;text-align:right;}
.pay-amount-input:focus{border-color:${T.accent}55;}
.troco-display{background:${T.successDim};border:1px solid ${T.success}33;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;}
.troco-label{font-size:13px;color:${T.success};}
.troco-val{font-family:'DM Mono',monospace;font-size:22px;font-weight:700;color:${T.success};}
.pay-summary{background:${T.card};border:1px solid ${T.border};border-radius:10px;overflow:hidden;margin-bottom:16px;}
.pay-sum-row{display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid ${T.border};}
.pay-sum-row:last-child{border-bottom:none;}
.pay-sum-row.total{background:${T.elevated};}
.pay-sum-label{font-size:13px;color:${T.textSec};}
.pay-sum-val{font-family:'DM Mono',monospace;font-size:13px;}
.pay-sum-row.total .pay-sum-label{font-weight:700;font-size:14px;color:${T.text};}
.pay-sum-row.total .pay-sum-val{font-size:16px;font-weight:700;color:${T.text};}
.split-row{display:flex;align-items:center;gap:12px;margin-bottom:16px;}
.split-label{font-size:13px;color:${T.textSec};}
.split-btns{display:flex;gap:4px;}
.split-btn{width:36px;height:36px;border-radius:6px;border:1px solid ${T.border};background:${T.card};color:${T.textSec};font-size:13px;font-weight:700;cursor:pointer;transition:all .12s;font-family:'DM Mono',monospace;}
.split-btn.active{border-color:${T.accent}55;background:${T.accentDim};color:${T.accent};}
.split-per-person{font-family:'DM Mono',monospace;font-size:20px;font-weight:700;color:${T.text};padding:10px 14px;background:${T.elevated};border-radius:8px;text-align:center;margin-bottom:14px;}
.pay-mode-toggle{display:flex;gap:4px;background:${T.card};border:1px solid ${T.border};border-radius:8px;padding:3px;margin-bottom:16px;}
.pay-mode-btn{flex:1;border:none;background:transparent;color:${T.textSec};font-size:12px;font-weight:700;padding:9px 8px;border-radius:6px;cursor:pointer;transition:all .12s;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:5px;}
.pay-mode-btn.active{background:${T.accentDim};color:${T.accent};box-shadow:inset 0 0 0 1px ${T.accent}44;}
.pay-stepper{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.pay-step-btn{width:40px;height:40px;border-radius:8px;border:1px solid ${T.border};background:${T.card};color:${T.text};font-size:20px;font-weight:700;cursor:pointer;transition:all .12s;font-family:'DM Mono',monospace;display:flex;align-items:center;justify-content:center;}
.pay-step-btn:hover:not(:disabled){border-color:${T.accent}55;background:${T.accentDim};color:${T.accent};}
.pay-step-btn:disabled{opacity:.3;cursor:not-allowed;}
.pay-step-val{flex:1;text-align:center;font-family:'DM Mono',monospace;font-size:22px;font-weight:700;color:${T.text};}
.pay-items-list{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;max-height:240px;overflow-y:auto;}
.pay-item-row{display:flex;align-items:center;gap:10px;background:${T.card};border:1px solid ${T.border};border-radius:8px;padding:8px 10px;}
.pay-item-row.full{opacity:.45;}
.pay-item-info{flex:1;min-width:0;}
.pay-item-name{font-size:13px;font-weight:700;color:${T.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pay-item-sub{font-size:11px;color:${T.textMuted};font-family:'DM Mono',monospace;margin-top:2px;}
.pay-item-stepper{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.pay-item-step-btn{width:26px;height:26px;border-radius:6px;border:1px solid ${T.border};background:${T.elevated};color:${T.text};font-size:15px;font-weight:700;cursor:pointer;transition:all .12s;line-height:1;display:flex;align-items:center;justify-content:center;}
.pay-item-step-btn:hover:not(:disabled){border-color:${T.accent}55;color:${T.accent};}
.pay-item-step-btn:disabled{opacity:.25;cursor:not-allowed;}
.pay-item-qty{min-width:34px;text-align:center;font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:${T.accent};}
.pay-empty{padding:24px 12px;text-align:center;color:${T.textMuted};font-size:13px;}

/* ─ TOASTS ─ */
.toast-stack{position:fixed;bottom:16px;right:16px;z-index:200;display:flex;flex-direction:column;gap:6px;pointer-events:none;}
.toast{background:${T.elevated};border:1px solid ${T.borderBright};border-radius:10px;padding:10px 14px;font-size:13px;color:${T.text};box-shadow:0 8px 32px rgba(0,0,0,.5);animation:toastIn .25s ease;display:flex;align-items:center;gap:10px;min-width:240px;}
.toast-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}

/* ─ NOTIF BANNER ─ */
.notif-banner{position:fixed;top:52px;left:0;right:0;z-index:30;background:#1a1a0a;border-bottom:2px solid ${T.warning};padding:8px 20px;display:flex;align-items:center;gap:12px;animation:fadeIn .2s;font-size:13px;color:${T.warning};}
.notif-banner strong{font-weight:700;}
.notif-close{margin-left:auto;background:none;border:none;color:${T.warning};cursor:pointer;font-size:16px;opacity:.7;}
.notif-close:hover{opacity:1;}
`;

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Clock(){
  const [t,setT]=useState(new Date());
  useEffect(()=>{const i=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(i);},[]);
  return <div className="topbar-clock">{t.toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"})}</div>;
}
function Toasts({toasts}){
  return(
    <div className="toast-stack">
      {toasts.map(t=>(
        <div key={t.id} className="toast">
          <div className="toast-dot" style={{background:t.color||T.teal}}/>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── MODIFIER MODAL ───────────────────────────────────────────────────────────
function ModifierModal({item,onConfirm,onClose}){
  // extras: Record<modId, Record<optId, bool>> — all options are optional (multi-select)
  const [extras,setExtras]=useState({});
  // ingState: Record<id, 'removed'|'extra'> — absent means neutral
  const [ingState,setIngState]=useState({});

  const toggleOptional=(modId,optId)=>setExtras(p=>{
    const cur=p[modId]||{};
    return {...p,[modId]:{...cur,[optId]:!cur[optId]}};
  });
  const toggleIng=(ingId,action)=>setIngState(p=>{
    const next={...p};
    if(next[ingId]===action) delete next[ingId]; // click same = back to neutral
    else next[ingId]=action;
    return next;
  });

  const modsText=[];
  const modifierIngredients=[]; // [{ingredient_id, qty}] in the ingredient's stored unit
  const baseSel=[];  // ingredient-bearing selections: {ingredient_id, storedUnit}
  const extraSel=[]; // qty-only selections (extras): {qty, unit}
  let extraPrice=0;
  item.mods.forEach(m=>{
    const chosen=m.options.filter(o=>(extras[m.id]||{})[o.id]);
    chosen.forEach(o=>{
      modsText.push(`${o.label}${o.price?` (+€${o.price.toFixed(2)})`:""}`);
      if(o.price)extraPrice+=o.price;
      if(o.ingredientId&&o.ingredientQty){
        const stored=o.ingredientStoredUnit||o.ingredientUnit;
        modifierIngredients.push({ingredient_id:o.ingredientId,qty:convUnit(o.ingredientQty,o.ingredientUnit||stored,stored)});
        baseSel.push({ingredient_id:o.ingredientId,storedUnit:stored});
      }else if(o.ingredientQty>0){
        extraSel.push({qty:o.ingredientQty,unit:o.ingredientUnit||"g"});
      }
    });
  });
  // "Extra" options (qty without ingredient) apply to the single chosen base ingredient
  if(baseSel.length===1&&extraSel.length>0){
    extraSel.forEach(e=>modifierIngredients.push({ingredient_id:baseSel[0].ingredient_id,qty:convUnit(e.qty,e.unit,baseSel[0].storedUnit)}));
  }
  (item.ingredientMods||[]).forEach(ing=>{
    const st=ingState[ing.id];
    if(st==="removed") modsText.push(`sem ${ing.name}`);
    else if(st==="extra") modsText.push(`+${ing.name}`);
  });

  const ingMods=item.ingredientMods||[];

  return(
    <div className="overlay" onClick={onClose}>
      <div className="modal mod-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{item.emoji} {item.name}</div>
            <div className="modal-sub">{fmtEur(item.price+(extraPrice||0))}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {item.mods.map(mod=>(
            <div key={mod.id} className="mod-group">
              <div className="mod-group-title">{mod.name}</div>
              <div className="mod-options">
                {mod.options.map(opt=>{
                  const isSelected=!!(extras[mod.id]||{})[opt.id];
                  return(
                    <div
                      key={opt.id}
                      className={`mod-option${isSelected?" selected":""}`}
                      onClick={()=>toggleOptional(mod.id,opt.id)}
                    >
                      <div className="mod-check">{isSelected&&<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}</div>
                      <div className="mod-option-label">
                        {opt.label}
                        {opt.ingredientId&&opt.ingredientQty?<span style={{fontSize:10,color:T.textMuted,marginLeft:6}}>· {opt.ingredientQty}{opt.ingredientUnit||""} {opt.ingredientName||""}</span>:opt.ingredientQty>0?<span style={{fontSize:10,color:T.textMuted,marginLeft:6}}>· +{opt.ingredientQty}{opt.ingredientUnit||""}</span>:null}
                      </div>
                      {opt.price>0 && <div className="mod-option-price">+{fmtEur(opt.price)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {ingMods.length>0&&(
            <div className="mod-group">
              <div className="mod-group-title">Ingredientes</div>
              <div className="ingmod-list">
                {ingMods.map(ing=>{
                  const st=ingState[ing.id];
                  return(
                    <div key={ing.id} className="ingmod-row">
                      <span className={`ingmod-name${st==="removed"?" ingmod-removed":st==="extra"?" ingmod-extra":""}`}>{ing.name}</span>
                      <div className="ingmod-btns">
                        <button
                          className={`btn btn-sm${st==="removed"?" btn-danger":" btn-ghost"}`}
                          onClick={()=>toggleIng(ing.id,"removed")}
                        >− Retirar</button>
                        <button
                          className={`btn btn-sm${st==="extra"?" btn-success":" btn-ghost"}`}
                          onClick={()=>toggleIng(ing.id,"extra")}
                        >+ Extra</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-solid-accent"
            onClick={()=>onConfirm({modsText,extraPrice,modifierIngredients})}
          >
            Adicionar — {fmtEur(item.price+extraPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CANCEL LINE MODAL ────────────────────────────────────────────────────────
function CancelLineModal({line,onConfirm,onClose}){
  const [motivo,setMotivo]=useState("");
  return(
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{width:400}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Anular Item</div>
            <div className="modal-sub">{line.qty}× {line.name} — já enviado para cozinha</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:T.textMuted,marginBottom:8}}>Motivo (obrigatório)</div>
          <textarea
            className="notes-input"
            style={{height:70}}
            placeholder="Ex: cliente desistiu, erro de lançamento..."
            value={motivo}
            onChange={e=>setMotivo(e.target.value)}
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" disabled={!motivo.trim()} onClick={()=>onConfirm(motivo)}>
            Confirmar Anulação
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TRANSFER MODAL ───────────────────────────────────────────────────────────
function TransferModal({currentWaiterId,staffList,onConfirm,onClose}){
  const [sel,setSel]=useState(null);
  return(
    <div className="overlay" onClick={onClose}>
      <div className="modal transfer-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Transferir Mesa</div>
            <div className="modal-sub">Selecciona o funcionário de destino</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="staff-list">
            {staffList.map(s=>(
              <div
                key={s.id}
                className={`staff-item${s.id===currentWaiterId?" self":""}${sel===s.id?" selected":""}`}
                onClick={()=>s.id!==currentWaiterId&&setSel(s.id)}
              >
                <div className="staff-av-lg">{s.initials}</div>
                <div>
                  <div className="staff-name">{s.name}{s.id===currentWaiterId&&<span style={{fontSize:11,color:T.textMuted,marginLeft:6}}>(atual)</span>}</div>
                  <div className="staff-role">{s.role}</div>
                </div>
                {sel===s.id && <div style={{marginLeft:"auto",color:T.accent,fontSize:16}}>✓</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-solid-accent" disabled={!sel} onClick={()=>onConfirm(sel)}>
            Transferir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT MODAL ────────────────────────────────────────────────────────────
function PaymentModal({order,tableLabel,seats,onConfirm,onClose}){
  const METHODS=[
    {id:"numerario",label:"Numerário",icon:"💶"},
    {id:"cartao",label:"Cartão",icon:"💳"},
    {id:"mbway",label:"MB Way",icon:"📱"},
    {id:"multibanco",label:"Multibanco",icon:"🏧"},
  ];
  const [payMode,setPayMode]=useState("pessoas"); // "pessoas" | "itens"
  const [method,setMethod]=useState("numerario");
  const [received,setReceived]=useState("");
  const [split,setSplit]=useState(seats&&seats>1?seats:1);
  const [sel,setSel]=useState({}); // lineId -> units selected to pay now

  // Lines still owing money: sent (so they exist in the DB and were actually
  // ordered), not cancelled, and with units left to pay. Unsent draft items have
  // client-side IDs with no DB row, so paying them would fail server-side.
  const payableLines=order.items.filter(i=>i.sent&&!i.cancelled&&(i.qty-(i.paidQty||0))>0);
  const unitOf=i=>i.price+(i.extraPrice||0);

  // Summary reflects what's LEFT to pay (a previous partial payment lowers it).
  let remaining=0,subtotal=0;
  const vatMap={};
  payableLines.forEach(i=>{
    const remQty=i.qty-(i.paidQty||0);
    const gross=unitOf(i)*remQty;
    remaining+=gross;
    const net=gross/(1+i.vat/100);
    subtotal+=net;
    vatMap[i.vat]=(vatMap[i.vat]||0)+(gross-net);
  });

  const selectedUnits=Object.values(sel).reduce((s,n)=>s+(n||0),0);
  const selectedTotal=payableLines.reduce((s,i)=>s+(sel[i.lineId]||0)*unitOf(i),0);
  const perPerson=split>0?remaining/split:remaining;
  const amountDue=payMode==="itens"?selectedTotal:perPerson;

  const setQty=(lineId,n,max)=>setSel(p=>({...p,[lineId]:Math.max(0,Math.min(max,n))}));

  const rec=parseFloat(received.replace(",","."));
  const troco=isNaN(rec)?null:rec-amountDue;

  const handleNum=(d)=>{
    if(d==="⌫") setReceived(p=>p.slice(0,-1));
    else if(d===".") setReceived(p=>p.includes(".")?p:p+d);
    else setReceived(p=>(p+d).slice(0,8));
  };

  const [busy,setBusy]=useState(false);
  const cashOK = method!=="numerario" || (!isNaN(rec)&&rec>=amountDue);
  const canConfirm = !busy && (payMode==="itens"
    ? (selectedUnits>0 && cashOK)
    : (remaining>0 && cashOK));

  const submit=async()=>{
    if(busy) return;
    setBusy(true);
    try{
      if(payMode==="itens"){
        const items=payableLines
          .filter(i=>(sel[i.lineId]||0)>0)
          .map(i=>({line_id:i.lineId,qty:sel[i.lineId]}));
        await onConfirm({mode:"itens",method,amount:selectedTotal,items});
      }else{
        await onConfirm({mode:"pessoas",method,amount:remaining,split});
      }
    }finally{
      setBusy(false);
    }
  };

  const switchMode=(m)=>{setPayMode(m);setReceived("");setSel({});};

  return(
    <div className="overlay" onClick={onClose}>
      <div className="modal pay-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Pagamento — {tableLabel}</div>
            <div className="modal-sub">{payableLines.reduce((s,i)=>s+(i.qty-(i.paidQty||0)),0)} itens por pagar · {fmtEur(remaining)}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{display:"flex",gap:20}}>
          {/* Left: mode toggle + summary + split/items */}
          <div style={{flex:"0 0 260px"}}>
            <div className="pay-mode-toggle">
              <button className={`pay-mode-btn${payMode==="pessoas"?" active":""}`} onClick={()=>switchMode("pessoas")}>👥 Por Pessoas</button>
              <button className={`pay-mode-btn${payMode==="itens"?" active":""}`} onClick={()=>switchMode("itens")}>🍽️ Por Itens</button>
            </div>

            <div className="pay-label">{remaining<orderTotal(order.items)?"Em falta":"Resumo"}</div>
            <div className="pay-summary">
              <div className="pay-sum-row"><div className="pay-sum-label">Subtotal (s/IVA)</div><div className="pay-sum-val">{fmtEur(subtotal)}</div></div>
              {Object.entries(vatMap).map(([rate,val])=>(
                <div key={rate} className="pay-sum-row"><div className="pay-sum-label" style={{fontSize:11}}>IVA {rate}%</div><div className="pay-sum-val" style={{fontSize:11}}>{fmtEur(val)}</div></div>
              ))}
              <div className="pay-sum-row total"><div className="pay-sum-label">Total</div><div className="pay-sum-val">{fmtEur(remaining)}</div></div>
            </div>

            {payMode==="pessoas"?(
              <>
                <div className="pay-label" style={{marginBottom:8}}>Dividir por pessoas</div>
                <div className="pay-stepper">
                  <button className="pay-step-btn" disabled={split<=1} onClick={()=>setSplit(s=>Math.max(1,s-1))}>−</button>
                  <div className="pay-step-val">{split}</div>
                  <button className="pay-step-btn" disabled={split>=50} onClick={()=>setSplit(s=>Math.min(50,s+1))}>+</button>
                </div>
                {split>1&&<div className="split-per-person">{fmtEur(perPerson)} <span style={{fontSize:14,color:T.textMuted}}>/ pessoa</span></div>}
              </>
            ):(
              <>
                <div className="pay-label" style={{marginBottom:8}}>Itens a pagar</div>
                <div className="pay-items-list">
                  {payableLines.length===0&&<div className="pay-empty">Tudo pago ✓</div>}
                  {payableLines.map(i=>{
                    const remQty=i.qty-(i.paidQty||0);
                    const q=sel[i.lineId]||0;
                    return(
                      <div key={i.lineId} className="pay-item-row">
                        <div className="pay-item-info">
                          <div className="pay-item-name">{i.name}</div>
                          <div className="pay-item-sub">{fmtEur(unitOf(i))} · {remQty} por pagar{i.paidQty?` (${i.paidQty} pago${i.paidQty>1?"s":""})`:""}</div>
                        </div>
                        <div className="pay-item-stepper">
                          <button className="pay-item-step-btn" disabled={q<=0} onClick={()=>setQty(i.lineId,q-1,remQty)}>−</button>
                          <div className="pay-item-qty">{q}/{remQty}</div>
                          <button className="pay-item-step-btn" disabled={q>=remQty} onClick={()=>setQty(i.lineId,q+1,remQty)}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="split-per-person">A pagar: {fmtEur(selectedTotal)}</div>
              </>
            )}
          </div>

          {/* Right: method + numpad */}
          <div style={{flex:1}}>
            <div className="pay-label">Método</div>
            <div className="pay-method-grid">
              {METHODS.map(m=>(
                <div key={m.id} className={`pay-method${method===m.id?" selected":""}`} onClick={()=>setMethod(m.id)}>
                  <div className="pay-method-icon">{m.icon}</div>
                  <div className="pay-method-name">{m.label}</div>
                </div>
              ))}
            </div>

            {method==="numerario"&&(
              <>
                <div className="pay-label">Recebido</div>
                <input
                  className="pay-amount-input"
                  value={received}
                  placeholder={fmtEur(amountDue)}
                  readOnly
                  style={{marginBottom:10}}
                />
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,marginBottom:10}}>
                  {["1","2","3","4","5","6","7","8","9",".","0","⌫"].map(d=>(
                    <button key={d} onClick={()=>handleNum(d)} style={{
                      background:T.card,border:`1px solid ${T.border}`,color:d==="⌫"?T.textSec:T.text,
                      fontFamily:"'DM Mono',monospace",fontSize:18,padding:"12px",borderRadius:6,
                      cursor:"pointer",transition:"all .1s"
                    }}>{d}</button>
                  ))}
                </div>
                {troco!==null&&troco>=0&&(
                  <div className="troco-display">
                    <div className="troco-label">Troco</div>
                    <div className="troco-val">{fmtEur(troco)}</div>
                  </div>
                )}
                {troco!==null&&troco<0&&(
                  <div style={{background:T.dangerDim,border:`1px solid ${T.danger}33`,borderRadius:8,padding:"10px 14px",color:T.danger,fontSize:13}}>
                    Montante insuficiente — faltam {fmtEur(Math.abs(troco))}
                  </div>
                )}
              </>
            )}
            {method!=="numerario"&&(
              <div style={{background:T.successDim,border:`1px solid ${T.success}33`,borderRadius:10,padding:"24px 20px",textAlign:"center",marginTop:8}}>
                <div style={{fontSize:28,marginBottom:8}}>{METHODS.find(m2=>m2.id===method)?.icon}</div>
                <div style={{fontSize:13,color:T.success,fontWeight:600}}>Confirma o pagamento no terminal</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:700,color:T.text,marginTop:8}}>{fmtEur(amountDue)}</div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-solid-success btn-lg" disabled={!canConfirm} onClick={submit}>
            {payMode==="itens"?`✓ Pagar Selecionados — ${fmtEur(selectedTotal)}`:"✓ Confirmar Pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ORDER SCREEN ─────────────────────────────────────────────────────────────
function OrderScreen({table,order,menu,staffList,menuStock,onBack,onUpdateOrder,onSendKitchen,sending,kdsReady,onPayment,onCancelLine,onTransfer,addToast}){
  const [cat,setCat]=useState(0);
  const [modItem,setModItem]=useState(null);
  const [cancelTarget,setCancelTarget]=useState(null);
  const [showTransfer,setShowTransfer]=useState(false);
  const [showPayment,setShowPayment]=useState(false);
  const [payTick,setPayTick]=useState(0); // bumps to remount PaymentModal after a partial payment

  const tableLabel = table.id;
  const waiter = staffList.find(s=>s.id===order.waiterId)||{name:"?",initials:"?"};
  const curMenu=menu[cat]||{items:[]};

  const pendingItems=order.items.filter(i=>!i.sent&&!i.cancelled);
  const sentItems=order.items.filter(i=>i.sent&&!i.cancelled);
  const cancelledItems=order.items.filter(i=>i.cancelled);
  // An item is "delivered" only once the KDS marked it ready (per-line flag).
  // Set by the KDS route (DB) and by the bill-poll locally — so a later batch
  // stays "Enviado" while earlier ready batches remain "Entregue".
  const deliveredItems=sentItems.filter(i=>i.delivered===true);
  const awaitingItems=sentItems.filter(i=>i.delivered!==true);

  // Quantity of this item already in the order but not yet sent (pending lines).
  // Sent items already decremented DB stock, so only pending counts against it.
  const pendingQtyForItem=(itemId)=>order.items
    .filter(i=>i.itemId===itemId&&!i.cancelled&&!i.sent)
    .reduce((s,i)=>s+i.qty,0);
  const canAddMore=(itemId,addQty=1)=>{
    const st=stockForItem(menuStock,itemId);
    if(st===null) return true; // stock not tracked for this item
    return pendingQtyForItem(itemId)+addQty<=st;
  };

  const handleAddItem=(item)=>{
    const st=stockForItem(menuStock,item.id);
    if(st!==null&&st<=0){addToast("Item esgotado",T.danger);return;}
    if(st!==null&&!canAddMore(item.id)){
      addToast(`Stock insuficiente — só restam ${st}`,T.warning);return;
    }
    if(item.mods.length>0||(item.ingredientMods&&item.ingredientMods.length>0)){setModItem(item);return;}
    const existing=pendingItems.find(l=>l.itemId===item.id&&l.mods.length===0);
    if(existing){
      onUpdateOrder(prev=>({...prev,items:prev.items.map(l=>l.lineId===existing.lineId?{...l,qty:l.qty+1}:l)}));
    } else {
      const line={lineId:newLineId(),itemId:item.id,name:item.name,qty:1,price:item.price,vat:item.vat,mods:[],notes:"",sent:false,cancelled:false,extraPrice:0};
      onUpdateOrder(prev=>({...prev,items:[...prev.items,line]}));
    }
  };

  const handleModConfirm=({modsText,extraPrice,modifierIngredients})=>{
    const item=modItem;
    const line={lineId:newLineId(),itemId:item.id,name:item.name,qty:1,price:item.price,vat:item.vat,mods:modsText,modifierIngredients:modifierIngredients||[],notes:"",sent:false,cancelled:false,extraPrice};
    onUpdateOrder(prev=>({...prev,items:[...prev.items,line]}));
    setModItem(null);
  };

  const changeQty=(lineId,delta)=>{
    if(delta>0){
      const line=order.items.find(l=>l.lineId===lineId);
      if(line&&line.itemId&&!canAddMore(line.itemId)){
        const st=stockForItem(menuStock,line.itemId);
        addToast(`Stock insuficiente — só restam ${st}`,T.warning);return;
      }
    }
    onUpdateOrder(prev=>{
      const items=prev.items.map(l=>{
        if(l.lineId!==lineId) return l;
        const nq=l.qty+delta;
        return nq<=0?null:{...l,qty:nq};
      }).filter(Boolean);
      return {...prev,items};
    });
  };

  const total=orderTotal(order.items);
  const vatMap=orderVAT(order.items);

  return(
    <div className="order-screen">
      <style>{CSS}</style>

      {/* MENU PANEL */}
      <div className="menu-panel">
        <div style={{display:"flex",alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${T.border}`,gap:10,background:T.surface,flexShrink:0}}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Mesas
          </button>
          <div style={{fontSize:13,color:T.textMuted}}>
            <strong style={{color:T.text}}>{tableLabel}</strong> · {waiter.name}
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowTransfer(true)} title="Transferir mesa">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              Transferir
            </button>
          </div>
        </div>
        <div className="menu-cats">
          {menu.map((c,i)=>(
            <div key={c.id} className={`cat-tab${cat===i?" active":""}`} onClick={()=>setCat(i)}>
              {c.emoji} {c.name}
            </div>
          ))}
        </div>
        <div className="menu-items">
          {curMenu.items.map(item=>{
            const st=stockForItem(menuStock,item.id);
            const oos=st!==null&&st<=0;
            const low=st!==null&&st>0&&st<=3;
            return(
              <div key={item.id} className={`menu-item-card${oos?" out-of-stock":""}`} onClick={()=>handleAddItem(item)}>
                {oos && <div className="item-stock-badge">ESGOTADO</div>}
                {low && !oos && <div className="item-low-badge">Ult. {st}</div>}
                <div className="item-emoji">{item.emoji}</div>
                <div className="item-name">{item.name}</div>
                <div className="item-price">{fmtEur(item.price)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ORDER PANEL */}
      <div className="order-panel">
        <div className="op-header">
          <div className="op-table-badge">{tableLabel}</div>
          <div className="op-waiter">{waiter.name}</div>
        </div>

        <div className="op-items">
          {/* Pending */}
          {pendingItems.length>0&&(
            <>
              <div className="op-section-label">A enviar ({pendingItems.length})</div>
              {pendingItems.map(l=>(
                <div key={l.lineId}>
                  <div className="order-line">
                    <div className="ol-qty">{l.qty}×</div>
                    <div className="ol-info">
                      <div className="ol-name">{l.name}</div>
                      {l.mods.length>0&&<div className="ol-mods">{l.mods.join(" · ")}</div>}
                    </div>
                    <div className="ol-controls">
                      <button className="qty-btn" onClick={()=>changeQty(l.lineId,-1)}>−</button>
                      <button className="qty-btn" onClick={()=>changeQty(l.lineId,1)}>+</button>
                    </div>
                    <div className="ol-price">{fmtEur((l.price+(l.extraPrice||0))*l.qty)}</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Sent — current batch awaiting the kitchen */}
          {awaitingItems.length>0&&(
            <>
              <div className="op-section-label" style={{marginTop:8}}>Enviado ({awaitingItems.length})</div>
              {awaitingItems.map(l=>(
                <div key={l.lineId} className="order-line sent">
                  <div className="ol-qty">{l.qty}×</div>
                  <div className="ol-info">
                    <div className="ol-name">{l.name}</div>
                    {l.mods.length>0&&<div className="ol-mods">{l.mods.join(" · ")}</div>}
                  </div>
                  <button className="cancel-line-btn" onClick={()=>setCancelTarget(l)}>ANULAR</button>
                  <div className="ol-price">{fmtEur((l.price+(l.extraPrice||0))*l.qty)}</div>
                </div>
              ))}
            </>
          )}

          {/* Delivered — batches the kitchen already finished */}
          {deliveredItems.length>0&&(
            <>
              <div className="op-section-label" style={{marginTop:8,color:T.success}}>Entregue ({deliveredItems.length})</div>
              {deliveredItems.map(l=>(
                <div key={l.lineId} className="order-line sent delivered">
                  <div className="ol-qty">{l.qty}×</div>
                  <div className="ol-info">
                    <div className="ol-name">{l.name}</div>
                    {l.mods.length>0&&<div className="ol-mods">{l.mods.join(" · ")}</div>}
                  </div>
                  <span className="ol-delivered-tag">✓ Entregue</span>
                  <div className="ol-price">{fmtEur((l.price+(l.extraPrice||0))*l.qty)}</div>
                </div>
              ))}
            </>
          )}

          {/* Cancelled */}
          {cancelledItems.length>0&&(
            <>
              <div className="op-section-label" style={{marginTop:8,color:T.danger}}>Anulado ({cancelledItems.length})</div>
              {cancelledItems.map(l=>(
                <div key={l.lineId} className="order-line cancelled">
                  <div className="ol-qty">{l.qty}×</div>
                  <div className="ol-info"><div className="ol-name">{l.name}</div></div>
                  <div className="ol-price">{fmtEur((l.price+(l.extraPrice||0))*l.qty)}</div>
                </div>
              ))}
            </>
          )}

          {order.items.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:T.textMuted,fontSize:13}}>
              <div style={{fontSize:32,marginBottom:8}}>🍽️</div>
              Selecciona itens do menu
            </div>
          )}
        </div>

        <div className="op-notes">
          <textarea
            className="notes-input"
            placeholder="Notas gerais da mesa..."
            value={order.notes}
            onChange={e=>onUpdateOrder(p=>({...p,notes:e.target.value}))}
          />
        </div>

        <div className="op-totals">
          {Object.keys(vatMap).length>0&&Object.entries(vatMap).map(([rate,val])=>(
            <div key={rate} className="vat-row"><span>IVA {rate}%</span><span>{fmtEur(val)}</span></div>
          ))}
          <div className="total-row grand">
            <div className="total-label">Total</div>
            <div className="total-val">{fmtEur(total)}</div>
          </div>
        </div>

        <div className="op-actions">
          <button
            className="btn btn-accent"
            disabled={pendingItems.length===0||sending}
            onClick={onSendKitchen}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            {sending?"A enviar...":"Enviar Cozinha"}
          </button>
          <button
            className="btn btn-solid-success"
            disabled={sentItems.length===0||!kdsReady}
            style={{width:"100%"}}
            title={!kdsReady&&sentItems.length>0?"Aguarda confirmação do KDS":""}
            onClick={()=>setShowPayment(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            {kdsReady?`Pagamento — ${fmtEur(total)}`:"Aguarda KDS..."}
          </button>
        </div>
      </div>

      {/* MODALS */}
      {modItem&&(
        <ModifierModal item={modItem} onConfirm={handleModConfirm} onClose={()=>setModItem(null)}/>
      )}
      {cancelTarget&&(
        <CancelLineModal
          line={cancelTarget}
          onClose={()=>setCancelTarget(null)}
          onConfirm={(motivo)=>{onCancelLine(cancelTarget.lineId,motivo);setCancelTarget(null);}}
        />
      )}
      {showTransfer&&(
        <TransferModal
          currentWaiterId={order.waiterId}
          staffList={staffList}
          onClose={()=>setShowTransfer(false)}
          onConfirm={(staffId)=>{onTransfer(staffId);setShowTransfer(false);}}
        />
      )}
      {showPayment&&(
        <PaymentModal
          key={payTick}
          order={order}
          tableLabel={tableLabel}
          seats={table?.seats}
          onClose={()=>setShowPayment(false)}
          onConfirm={async(payData)=>{
            const res=await onPayment(payData);
            if(res?.error) return;
            // Full payment closes the modal; a partial one remounts it (key bump)
            // with a fresh selection so the rest of the bill can be settled.
            if(res?.fullyPaid) setShowPayment(false);
            else setPayTick(t=>t+1);
          }}
        />
      )}
    </div>
  );
}

// ─── FUNDO MANEIO SCREEN ──────────────────────────────────────────────────────
function FundoManeioScreen({staffName,onConfirm,appName="RestaurantOS"}){
  const [val,setVal]=useState("");
  const press=(d)=>{
    if(d==="⌫"){setVal(p=>p.slice(0,-1));return;}
    if(d==="."&&val.includes(".")) return;
    if(val.length>=7) return;
    setVal(p=>p+d);
  };
  const display=val||"0.00";
  const num=parseFloat(val)||0;

  return(
    <div className="fundo-screen">
      <style>{CSS}</style>
      <div style={{animation:"slideUp .3s ease"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"3px",textTransform:"uppercase",color:T.textMuted,marginBottom:8}}>{appName} · POS</div>
          <div style={{fontSize:13,color:T.textSec}}>{staffName} · {new Date().toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>
        <div className="fundo-card">
          <div className="fundo-card-head">
            <div className="fundo-card-title">💰 Fundo de Maneio</div>
            <div className="fundo-card-sub">Regista o valor inicial em caixa para iniciar o turno</div>
          </div>
          <div className={`fundo-display${!val?" empty":""}`}>{fmtEur(parseFloat(display)||0)}</div>
          <div className="fundo-numpad">
            {["1","2","3","4","5","6","7","8","9",".","0","⌫"].map(d=>(
              <button key={d} className={`numpad-btn${d==="⌫"?" del":""}${d==="0"?" zero":""}`} onClick={()=>press(d)}>{d}</button>
            ))}
          </div>
          <div style={{padding:"0 20px 20px",display:"flex",gap:8}}>
            <button className="btn btn-ghost btn-lg" style={{flex:1}} onClick={()=>onConfirm(0)}>
              Sem fundo
            </button>
            <button
              className="btn btn-solid-accent btn-lg"
              style={{flex:2}}
              onClick={()=>num>0&&onConfirm(num)}
              disabled={num<=0}
            >
              Iniciar Turno — {fmtEur(num)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FLOOR SCREEN ─────────────────────────────────────────────────────────────
function FloorScreen({tables,orders,zones,staffList,turnos,onTablePress,onQuickOrder,addToast}){
  const [zone,setZone]=useState(zones[0]||"Interior");
  const [showResv,setShowResv]=useState(false);
  const [resvForm,setResvForm]=useState({name:"",phone:"",date:new Date().toISOString().slice(0,10),time:"20:00",persons:2,tableId:"",notes:""});
  const [resvSaving,setResvSaving]=useState(false);
  const [showResvList,setShowResvList]=useState(false);
  const [resvList,setResvList]=useState([]);
  const [resvListLoading,setResvListLoading]=useState(false);
  const [resvArchiveOpen,setResvArchiveOpen]=useState(false);
  const [resvBlockedOpen,setResvBlockedOpen]=useState(false);
  const zoneTables=tables.filter(t=>t.zone===zone);
  const occupiedCount=tables.filter(t=>t.status==="occupied"||t.status==="bill").length;
  const turnoNow=currentTurno(turnos||[]);

  const inp={width:"100%",background:T.card,border:`1px solid ${T.border}`,borderRadius:7,color:T.text,fontFamily:"'Syne',sans-serif",fontSize:13,padding:"9px 11px",outline:"none"};
  const lbl={fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:T.textMuted,marginBottom:6,display:"block"};

  const saveReservation=async()=>{
    if(!resvForm.name) return;
    setResvSaving(true);
    const tableObj=tables.find(t=>t.id===resvForm.tableId);
    const body={name:resvForm.name,phone:resvForm.phone,date:resvForm.date,time:resvForm.time,persons:parseInt(resvForm.persons)||2,notes:resvForm.notes,table_id:tableObj?.dbId||null,status:"pending"};
    const r=await fetch("/api/reservations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).catch(()=>null);
    setResvSaving(false);
    if(r?.ok){
      setShowResv(false);
      setResvForm({name:"",phone:"",date:new Date().toISOString().slice(0,10),time:"20:00",persons:2,tableId:"",notes:""});
      if(addToast) addToast("Reserva criada",T.success);
    } else {
      if(addToast) addToast("Erro ao criar reserva",T.danger);
    }
  };

  const openResvList=async()=>{
    setShowResvList(true);
    setResvListLoading(true);
    const data=await fetch("/api/reservations").then(r=>r.json()).catch(()=>[]);
    setResvList(Array.isArray(data)?data:[]);
    setResvListLoading(false);
  };
  const cancelReservation=async(id)=>{
    const r=await fetch(`/api/reservations/${id}`,{method:"DELETE"}).catch(()=>null);
    if(r&&(r.ok||r.status===204)){
      setResvList(prev=>prev.map(x=>x.id===id?{...x,status:"cancelled"}:x));
      if(addToast) addToast("Reserva cancelada",T.warning);
    } else if(addToast) addToast("Erro ao cancelar reserva",T.danger);
  };
  const resvRow=(r,dim=false)=>{
    const sc=RESV_STATUS[r.status]||RESV_STATUS.pending;
    const closed=r.status==="cancelled"||r.status==="completed";
    return(
      <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px",opacity:(closed||dim)?.5:1}}>
        <div style={{textAlign:"center",minWidth:56}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:15,fontWeight:700,color:T.text}}>{(r.time||"").slice(0,5)}</div>
          <div style={{fontSize:10,color:T.textMuted,fontFamily:"'DM Mono',monospace"}}>{r.date}</div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</div>
          <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>
            👥 {r.persons}{r.table?.label?` · ${r.table.label}`:" · sem mesa"}{r.phone?` · ${r.phone}`:""}
          </div>
          {r.notes&&<div style={{fontSize:11,color:T.textSec,marginTop:2,fontStyle:"italic"}}>{r.notes}</div>}
        </div>
        <div style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,color:sc.color,background:sc.bg,whiteSpace:"nowrap"}}>{sc.label}</div>
        {!closed&&(
          <button className="btn btn-ghost" style={{padding:"6px 10px",fontSize:12}} onClick={()=>cancelReservation(r.id)}>Cancelar</button>
        )}
      </div>
    );
  };
  const activeOrders=Object.values(orders).filter(o=>o.items.length>0&&!o.paid).length;
  const turnoVendas=Object.values(orders).filter(o=>o.paid).reduce((s,o)=>s+orderTotal(o.items),0);

  return(
    <>
    <div className="floor-screen">
      <div className="floor-stats">
        <div className="stat-item">
          <div className="stat-label">Mesas Ocupadas</div>
          <div className="stat-value" style={{color:T.warning}}>{occupiedCount}<span style={{fontSize:11,color:T.textMuted,fontWeight:400,marginLeft:4}}>/{tables.length}</span></div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Pedidos Abertos</div>
          <div className="stat-value" style={{color:T.accent}}>{activeOrders}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Vendas Turno</div>
          <div className="stat-value" style={{color:T.success}}>{fmtEur(turnoVendas)}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Turno Desde</div>
          <div className="stat-value" style={{fontSize:14,color:T.textSec}}>{new Date().toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"})}</div>
        </div>
      </div>

      {turnos&&turnos.length>0&&(
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0,overflowX:"auto"}}>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:T.textMuted,flexShrink:0}}>Turnos</span>
          {turnos.map(t=>{
            const active=turnoNow&&turnoNow.start===t.start&&turnoNow.end===t.end;
            return(
              <div key={t.id||`${t.start}-${t.end}`} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,fontSize:12,whiteSpace:"nowrap",flexShrink:0,border:`1px solid ${active?T.success+"55":T.border}`,background:active?T.successDim:T.card,color:active?T.success:T.textSec,fontWeight:active?700:500}}>
                {active&&<span style={{width:6,height:6,borderRadius:"50%",background:T.success,boxShadow:`0 0 6px ${T.success}`}}/>}
                {t.name} · {(t.start||"").slice(0,5)}–{(t.end||"").slice(0,5)}
              </div>
            );
          })}
          <span style={{fontSize:11,color:turnoNow?T.success:T.textMuted,marginLeft:"auto",flexShrink:0,fontWeight:600}}>{turnoNow?`Em serviço — ${turnoNow.name}`:"Fora de serviço"}</span>
        </div>
      )}

      <div className="floor-zones">
        {zones.map(z=>(
          <div key={z} className={`zone-tab${zone===z?" active":""}`} onClick={()=>setZone(z)}>
            {z}
            <span style={{marginLeft:6,fontSize:11,opacity:.6}}>({tables.filter(t=>t.zone===z).length})</span>
          </div>
        ))}
      </div>

      <div className="floor-body">
        <div className="tables-grid">
          {zoneTables.map(table=>{
            const st=STATUS_MAP[table.status];
            const order=table.orderId?orders[table.orderId]:null;
            const waiter=table.waiter?staffList.find(s=>s.id===table.waiter):null;
            const itemCount=order?order.items.filter(i=>!i.cancelled).length:0;
            return(
              <div
                key={table.id}
                className={`table-card status-${table.status}`}
                onClick={()=>onTablePress(table)}
              >
                <div className="table-top">
                  <div className="table-id" style={{color:st.color}}>{table.id}</div>
                  <div className="table-badge" style={{color:st.color,background:st.bg,border:`1px solid ${st.border}`}}>
                    {st.label}
                  </div>
                </div>

                {table.status==="reserved"&&table.reservedFor&&(
                  <div className="table-reserved-label">📅 {table.reservedFor}</div>
                )}
                {table.status==="locked"&&(
                  <div style={{fontSize:11,color:T.blue,marginTop:2}}>
                    🔒 {staffList.find(s=>s.id===table.waiter)?.name||"outro"}
                  </div>
                )}
                {order&&itemCount>0&&(
                  <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>
                    {itemCount} {itemCount===1?"item":"itens"}
                    {order.items.some(i=>i.sent)&&<span style={{color:T.accent,marginLeft:4}}>· {fmtEur(orderTotal(order.items))}</span>}
                  </div>
                )}

                <div className="table-meta">
                  {table.seats>0&&(
                    <div className="table-seats">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
                      {table.seats}
                    </div>
                  )}
                  {table.since&&<div className="table-since">{fmtMins(Date.now()-table.since)}</div>}
                  {waiter&&<div className="table-waiter-av">{waiter.initials}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fab-row">
        <button className="btn btn-teal btn-lg" onClick={()=>onQuickOrder("take-away")}>
          🥡 Take-Away
        </button>
        <button className="btn btn-ghost btn-lg" onClick={openResvList}>
          📋 Ver Reservas
        </button>
        <button className="btn btn-ghost btn-lg" onClick={()=>setShowResv(true)}>
          📅 Nova Reserva
        </button>
      </div>
    </div>
    {showResv&&(
      <div className="overlay" onClick={()=>setShowResv(false)}>
        <div className="modal" style={{width:480}} onClick={e=>e.stopPropagation()}>
          <div className="modal-header">
            <div><div className="modal-title">Nova Reserva</div></div>
            <button className="modal-close" onClick={()=>setShowResv(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><span style={lbl}>Nome *</span><input style={inp} value={resvForm.name} onChange={e=>setResvForm(p=>({...p,name:e.target.value}))}/></div>
              <div><span style={lbl}>Telefone</span><input style={inp} value={resvForm.phone} onChange={e=>setResvForm(p=>({...p,phone:e.target.value}))}/></div>
              <div><span style={lbl}>Data</span><input type="date" style={inp} value={resvForm.date} onChange={e=>setResvForm(p=>({...p,date:e.target.value}))}/></div>
              <div><span style={lbl}>Hora</span><input type="time" style={inp} value={resvForm.time} onChange={e=>setResvForm(p=>({...p,time:e.target.value}))}/></div>
              <div><span style={lbl}>Pessoas</span><input type="number" min="1" style={inp} value={resvForm.persons} onChange={e=>setResvForm(p=>({...p,persons:e.target.value}))}/></div>
              <div><span style={lbl}>Mesa</span>
                <select style={{...inp,appearance:"none"}} value={resvForm.tableId} onChange={e=>setResvForm(p=>({...p,tableId:e.target.value}))}>
                  <option value="">— Sem mesa —</option>
                  {tables.filter(t=>t.dbId&&t.status==="free").map(t=><option key={t.id} value={t.id}>{t.id} · {t.zone}</option>)}
                </select>
              </div>
            </div>
            <div><span style={lbl}>Notas</span><input style={inp} value={resvForm.notes} onChange={e=>setResvForm(p=>({...p,notes:e.target.value}))} placeholder="Alergias, preferências..."/></div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={()=>setShowResv(false)}>Cancelar</button>
            <button className="btn btn-solid-accent" disabled={!resvForm.name||resvSaving} onClick={saveReservation}>{resvSaving?"A guardar...":"Criar Reserva"}</button>
          </div>
        </div>
      </div>
    )}
    {showResvList&&(
      <div className="overlay" onClick={()=>setShowResvList(false)}>
        <div className="modal" style={{width:560,maxHeight:"86vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
          <div className="modal-header">
            <div><div className="modal-title">Reservas</div><div className="modal-sub">{resvList.filter(r=>r.status!=="cancelled"&&r.status!=="completed"&&reservationActive(r,turnos)).length} ativa(s) · {resvList.length} total</div></div>
            <button className="modal-close" onClick={()=>setShowResvList(false)}>✕</button>
          </div>
          <div className="modal-body" style={{overflowY:"auto"}}>
            {resvListLoading?(
              <div style={{textAlign:"center",color:T.textMuted,padding:"32px 0"}}>A carregar…</div>
            ):resvList.length===0?(
              <div style={{textAlign:"center",color:T.textMuted,padding:"32px 0"}}>Sem reservas</div>
            ):(()=>{
              const notClosed=r=>r.status!=="cancelled"&&r.status!=="completed";
              const active=resvList.filter(r=>notClosed(r)&&reservationActive(r,turnos));
              const blocked=resvList.filter(r=>notClosed(r)&&!reservationActive(r,turnos));
              const closed=resvList.filter(r=>!notClosed(r));
              const sectionBtn=(label,open,toggle)=>(
                <button
                  onClick={toggle}
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginTop:6,background:T.elevated,border:`1px solid ${T.border}`,borderRadius:8,color:T.textSec,fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",padding:"10px 12px",cursor:"pointer"}}
                >
                  <span>{label}</span>
                  <span style={{fontSize:11}}>{open?"▾":"▸"}</span>
                </button>
              );
              return(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:T.textMuted}}>Ativas agora</div>
                  {active.length===0
                    ? <div style={{textAlign:"center",color:T.textMuted,padding:"16px 0",fontSize:13}}>Nenhuma reserva ativa no turno atual</div>
                    : active.map(r=>resvRow(r))}
                  {blocked.length>0&&(
                    <>
                      {sectionBtn(`Fora do turno (${blocked.length})`,resvBlockedOpen,()=>setResvBlockedOpen(o=>!o))}
                      {resvBlockedOpen&&blocked.map(r=>resvRow(r,true))}
                    </>
                  )}
                  {closed.length>0&&(
                    <>
                      {sectionBtn(`Histórico (${closed.length})`,resvArchiveOpen,()=>setResvArchiveOpen(o=>!o))}
                      {resvArchiveOpen&&closed.map(r=>resvRow(r))}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={()=>setShowResvList(false)}>Fechar</button>
            <button className="btn btn-solid-accent" onClick={()=>{setShowResvList(false);setShowResv(true);}}>📅 Nova Reserva</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ─── KDS NOTIFICATION BANNER ──────────────────────────────────────────────────
function KDSNotifBanner({notif,onClose}){
  if(!notif) return null;
  return(
    <div className="notif-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <span>KDS — <strong>{notif.label}</strong> pronto para servir!</span>
      <button className="notif-close" onClick={onClose}>✕</button>
    </div>
  );
}

// ─── TOAST ID ─────────────────────────────────────────────────────────────────
let _toastId=0;

// ─── MAIN POS ─────────────────────────────────────────────────────────────────
export default function POS({session,appName="RestaurantOS"}){
  const [screen,setScreen]=useState("fundo");
  const [fundoValue,setFundoValue]=useState(0);
  const [shiftId,setShiftId]=useState(null);
  const [tables,setTables]=useState([]);
  const [orders,setOrders]=useState({});
  const [menu,setMenu]=useState([]);
  const [staffList,setStaffList]=useState([]);
  const [menuStock,setMenuStock]=useState({});
  const [turnos,setTurnos]=useState([]);
  const [activeTableId,setActiveTableId]=useState(null);
  const [toasts,setToasts]=useState([]);
  const [kdsNotif,setKdsNotif]=useState(null);
  const [readyOrders,setReadyOrders]=useState(()=>new Set());
  const [loading,setLoading]=useState(true);
  const [showEndShift,setShowEndShift]=useState(false);
  const [endShiftTarget,setEndShiftTarget]=useState("");

  const currentStaff=session
    ?{id:session.id,name:session.name,initials:session.name.slice(0,2).toUpperCase()}
    :{id:"",name:"?",initials:"?"};

  const addToast=useCallback((msg,color=T.teal)=>{
    const id=++_toastId;
    setToasts(p=>[...p,{id,msg,color}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  },[]);

  const readyOrdersRef = useRef(new Set());
  const sendingRef = useRef(false); // re-entrancy guard for handleSendKitchen
  const seenOrderIdsRef = useRef(new Set()); // order IDs ever observed on the server
  const [sending,setSending]=useState(false);
  // Refs so the live-sync interval always sees the current editing context
  const activeTableIdRef = useRef(null);
  const screenRef = useRef("fundo");
  const tablesRef = useRef([]);
  useEffect(()=>{activeTableIdRef.current=activeTableId;},[activeTableId]);
  useEffect(()=>{screenRef.current=screen;},[screen]);
  useEffect(()=>{tablesRef.current=tables;},[tables]);

  // Load data on mount
  useEffect(()=>{
    async function load(){
      try{
        const [tablesRes,menuRes,openRes,sentRes,billRes,staffRes,ingsRes,settingsRes]=await Promise.all([
          fetch("/api/tables").then(r=>r.json()),
          fetch("/api/menu/items?include=modifiers").then(r=>r.json()),
          fetch("/api/orders?status=open").then(r=>r.json()),
          fetch("/api/orders?status=sent").then(r=>r.json()),
          fetch("/api/orders?status=bill").then(r=>r.json()),
          fetch("/api/auth/staff").then(r=>r.json()),
          fetch("/api/ingredients").then(r=>r.json()).catch(()=>[]),
          fetch("/api/settings").then(r=>r.json()).catch(()=>null),
        ]);

        if(settingsRes&&Array.isArray(settingsRes["horario.turnos"]))
          setTurnos(settingsRes["horario.turnos"]);

        // Build set of modifier ingredient IDs (gracefully empty if migration not run yet)
        const modifierIngIds=new Set(
          (Array.isArray(ingsRes)?ingsRes:[]).filter(i=>i.is_modifier).map(i=>i.id)
        );

        // Build grouped menu
        const mappedMenu=buildMenu(menuRes,modifierIngIds);

        // Build stock map
        const stock={};
        if(Array.isArray(menuRes)) menuRes.forEach(item=>{if(item.stock!==null)stock[item.id]=item.stock;});

        // Build orders map — ignore stale orders (>24h) so abandoned/unpaid
        // test orders stop occupying tables and blocking new orders.
        const staleCutoff=Date.now()-24*60*60*1000;
        const isRecent=o=>!o.created_at||new Date(o.created_at).getTime()>=staleCutoff;
        const allOrders={};
        [...(Array.isArray(openRes)?openRes:[]),...(Array.isArray(sentRes)?sentRes:[]),...(Array.isArray(billRes)?billRes:[])]
          .filter(isRecent)
          .forEach(o=>{
            allOrders[o.id]=mapOrder(o);
          });
        // Orders already confirmed ready by KDS
        if(Array.isArray(billRes)&&billRes.length>0){
          const initialReady=new Set(billRes.filter(isRecent).map(o=>o.id));
          setReadyOrders(initialReady);
          readyOrdersRef.current=initialReady;
        }

        // Build table → order map
        const orderByTableDbId={};
        Object.values(allOrders).forEach(o=>{if(o.tableDbId)orderByTableDbId[o.tableDbId]=o.id;});

        // Map tables
        const mappedTables=Array.isArray(tablesRes)?tablesRes.map(t=>({
          id:t.label,dbId:t.id,
          zone:t.zone?.name||"Interior",
          seats:t.seats,status:t.status,
          waiter:null,
          orderId:orderByTableDbId[t.id]||null,
          since:allOrders[orderByTableDbId[t.id]]?.sentAt||null,
        })):[];

        // Synthesize floor cards for take-away orders that exist in the DB so they
        // remain visible/accessible after a reload (no physical table backs them).
        const haveOrderId=new Set(mappedTables.map(t=>t.orderId).filter(Boolean));
        Object.values(allOrders).filter(o=>o.type==="takeaway"&&!o.paid).forEach(o=>{
          if(haveOrderId.has(o.id)) return;
          mappedTables.push({
            id:`TA${o.id.slice(0,3).toUpperCase()}`,dbId:null,zone:"Take-Away",seats:0,
            status:o.status==="bill"?"bill":"occupied",
            waiter:o.waiterId,orderId:o.id,since:o.sentAt||Date.now(),type:"take-away",
          });
        });

        // Map staff
        const mappedStaff=Array.isArray(staffRes)?staffRes.map(s=>({
          id:s.id,name:s.name,role:s.role,
          initials:s.name.slice(0,2).toUpperCase(),
        })):[];

        setMenu(mappedMenu);
        setMenuStock(stock);
        setOrders(allOrders);
        setTables(mappedTables);
        setStaffList(mappedStaff);
        if(session?.role!=="manager"){
          fetch("/api/shifts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fundo_value:0})}).then(r=>r.json()).then(d=>{if(!d.error)setShiftId(d.id);}).catch(()=>{});
          setScreen("floor");
        } else {
          // Manager: skip fundo if an open shift already exists
          try{
            const openShifts=await fetch("/api/shifts?open=true").then(r=>r.json());
            if(Array.isArray(openShifts)&&openShifts.length>0){
              setShiftId(openShifts[0].id);
              setFundoValue(openShifts[0].fundo_value||0);
              setScreen("floor");
            }
          }catch{}
        }
      }catch(e){
        addToast("Erro ao carregar dados",T.danger);
      }finally{
        setLoading(false);
      }
    }
    load();
  },[]);

  // Poll for KDS "Marcar Pronto" → orders that become "bill" unlock payment
  useEffect(()=>{readyOrdersRef.current=readyOrders;},[readyOrders]);

  useEffect(()=>{
    // Wait for the initial load to seed readyOrdersRef; otherwise the first tick
    // sees an empty set and treats every existing "bill" order as newly ready,
    // spamming a toast per order on login.
    if(loading) return;
    const tick=async()=>{
      try{
        const data=await fetch("/api/orders?status=bill").then(r=>r.json());
        if(!Array.isArray(data)) return;

        const newlyReady=data.filter(o=>!readyOrdersRef.current.has(o.id));
        if(newlyReady.length>0){
          const readyIds=new Set(newlyReady.map(o=>o.id));
          setReadyOrders(prev=>{
            const n=new Set(prev);
            newlyReady.forEach(o=>n.add(o.id));
            return n;
          });
          // Mark the currently-sent lines as delivered (durable per line, so a
          // later batch keeps these "Entregue" while the new one stays "Enviado").
          setOrders(prev=>{
            const next={...prev};let changed=false;
            for(const id of readyIds){
              const o=prev[id];if(!o)continue;
              next[id]={...o,items:o.items.map(i=>(i.sent&&!i.cancelled&&!i.delivered)?{...i,delivered:true}:i)};
              changed=true;
            }
            return changed?next:prev;
          });
          newlyReady.forEach(o=>{
            const label=o.table?.label;
            if(label){
              setKdsNotif({label});
              addToast(`KDS — Mesa ${label} pronta para servir`,T.success);
            }
          });
        }
      }catch{}
    };
    const id=setInterval(tick,4000);
    return()=>clearInterval(id);
  },[loading,addToast]);

  // Live sync: poll tables + orders every 5s so changes made by other
  // users (other waiters / manager) appear without re-entering a table.
  useEffect(()=>{
    if(loading) return;
    const sync=async()=>{
      try{
        const [tablesRes,openRes,sentRes,billRes,menuRes,ingsRes,settingsRes]=await Promise.all([
          fetch("/api/tables").then(r=>r.json()),
          fetch("/api/orders?status=open").then(r=>r.json()),
          fetch("/api/orders?status=sent").then(r=>r.json()),
          fetch("/api/orders?status=bill").then(r=>r.json()),
          fetch("/api/menu/items?include=modifiers").then(r=>r.json()).catch(()=>null),
          fetch("/api/ingredients").then(r=>r.json()).catch(()=>[]),
          fetch("/api/settings").then(r=>r.json()).catch(()=>null),
        ]);
        if(!Array.isArray(tablesRes)) return;

        if(settingsRes&&Array.isArray(settingsRes["horario.turnos"]))
          setTurnos(settingsRes["horario.turnos"]);

        // Rebuild menu (modifiers, linked library mods) + refresh stock,
        // so changes made in the Backoffice appear without restarting the POS.
        if(Array.isArray(menuRes)){
          const modifierIngIds=new Set((Array.isArray(ingsRes)?ingsRes:[]).filter(i=>i.is_modifier).map(i=>i.id));
          setMenu(buildMenu(menuRes,modifierIngIds));
          const freshStock={};
          menuRes.forEach(it=>{if(it.stock!==null)freshStock[it.id]=it.stock;});
          setMenuStock(freshStock);
        }

        const staleCutoff=Date.now()-24*60*60*1000;
        const isRecent=o=>!o.created_at||new Date(o.created_at).getTime()>=staleCutoff;
        const serverOrders=[...(Array.isArray(openRes)?openRes:[]),...(Array.isArray(sentRes)?sentRes:[]),...(Array.isArray(billRes)?billRes:[])].filter(isRecent);

        const editingId=activeTableIdRef.current&&screenRef.current==="order"
          ?(()=>{const at=tablesRef.current.find(t=>t.id===activeTableIdRef.current);return at?.orderId||null;})()
          :null;

        // Remember every order we've ever seen on the server. We use this to tell a
        // "just created" order (not in any server list yet) apart from one that was
        // there and is now gone (cancelled / paid). Only the first case warrants
        // local preservation; the second must drop so the POS reacts to the change.
        const wasSeen=new Set(seenOrderIdsRef.current);
        serverOrders.forEach(o=>seenOrderIdsRef.current.add(o.id));

        // Merge orders: keep local drafts + the order currently being edited
        setOrders(prev=>{
          const next={};
          Object.values(prev).forEach(o=>{if(o.draft)next[o.id]=o;}); // keep local drafts
          serverOrders.forEach(o=>{
            if(o.id===editingId&&prev[o.id]){
              next[o.id]=prev[o.id]; // don't clobber items the user is editing
            }else{
              next[o.id]=mapOrder(o);
            }
          });
          // Preserve the active order ONLY if the server has never listed it yet
          // (e.g. just created). If we've seen it before, treat its absence as a
          // server-side cancel/pay and let it drop so the UI reacts.
          if(editingId&&prev[editingId]&&!next[editingId]&&!wasSeen.has(editingId))
            next[editingId]=prev[editingId];
          return next;
        });

        // Map server orders to tables
        const orderByTableDbId={};
        serverOrders.forEach(o=>{if(o.table_id)orderByTableDbId[o.table_id]=o.id;});
        const serverById=new Map(serverOrders.map(o=>[o.id,o]));
        setTables(prev=>{
          const updated=prev.map(t=>{
            const f=tablesRes.find(ft=>ft.label===t.id);
            if(!f){
              // Dynamic take-away/counter row. Migrate legacy "—" zone and reflect
              // the order's current state (so KDS "Pronto" shows as "Servido").
              let row=t.zone==="—"?{...t,zone:"Take-Away"}:t;
              const so=row.orderId?serverById.get(row.orderId):null;
              // Drop the synthetic row when its order has been removed server-side
              // (cancelled or paid), but not when it's still freshly created.
              if(row.orderId&&!so&&wasSeen.has(row.orderId)) return null;
              if(so){
                const newStatus=so.status==="bill"?"bill":so.status==="paid"?"free":"occupied";
                if(newStatus!==row.status) row={...row,status:newStatus};
              }
              return row;
            }
            const hasLocalDraft=t.orderId&&String(t.orderId).startsWith("draft_");
            const serverOrderId=orderByTableDbId[t.dbId]||null;
            return {...t,status:f.status,orderId:hasLocalDraft?t.orderId:serverOrderId};
          }).filter(Boolean);
          // Add cards for take-away orders that appeared server-side without a row yet
          const haveOrder=new Set(updated.map(r=>r.orderId).filter(Boolean));
          for(const o of serverOrders){
            if((o.type||"table")!=="takeaway") continue;
            if(haveOrder.has(o.id)) continue;
            updated.push({
              id:`TA${o.id.slice(0,3).toUpperCase()}`,dbId:null,zone:"Take-Away",seats:0,
              status:o.status==="bill"?"bill":"occupied",
              waiter:o.waiter_id,orderId:o.id,
              since:o.created_at?new Date(o.created_at).getTime():Date.now(),
              type:"take-away",
            });
          }
          return updated;
        });

        // If the active editing order was cancelled/paid server-side (it was seen
        // before but is now missing from every status list), bail back to the floor
        // — otherwise OrderScreen renders against a null order and goes blank.
        if(editingId&&wasSeen.has(editingId)&&!serverById.has(editingId)){
          addToast("Pedido cancelado",T.warning);
          setActiveTableId(null);
          setScreen("floor");
        }
      }catch{}
    };
    const id=setInterval(sync,5000);
    return()=>clearInterval(id);
  },[loading]);

  const zones=[...new Set(tables.map(t=>t.zone))];
  const activeTable=activeTableId?tables.find(t=>t.id===activeTableId):null;
  const activeOrderId=activeTable?.orderId;
  const activeOrder=activeOrderId?orders[activeOrderId]:null;

  const handleTablePress=(table)=>{
    if(table.status==="locked"){
      addToast("Mesa em uso por outro funcionário",T.blue);
      return;
    }
    // Open the existing order only if one is actually loaded for this table
    if(table.orderId&&orders[table.orderId]){
      setActiveTableId(table.id);
      setScreen("order");
      return;
    }
    // No real order (free, reserved, or stuck "occupied" with no open order) → fresh draft
    const draftId=`draft_${table.id}`;
    const draftOrder={id:draftId,tableId:table.id,tableDbId:table.dbId,waiterId:currentStaff.id,items:[],notes:"",status:"open",paid:false,draft:true};
    setOrders(p=>({...p,[draftId]:draftOrder}));
    setTables(p=>p.map(t=>t.id===table.id?{...t,orderId:draftId,waiter:currentStaff.id,since:Date.now()}:t));
    setActiveTableId(table.id);
    setScreen("order");
  };

  const handleQuickOrder=async(type)=>{
    // The orders table only allows type in ('table','takeaway','counter').
    const dbType=type==="take-away"?"takeaway":type==="balcao"?"counter":type;
    const res=await fetch("/api/orders",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({type:dbType}),
    });
    if(!res.ok){addToast("Erro ao criar pedido",T.danger);return;}
    const order=await res.json();
    const fakeId=`${type==="take-away"?"TA":"BC"}${order.id.slice(0,3).toUpperCase()}`;
    const mapped=mapOrder({...order,lines:[],table:{label:fakeId},table_id:null});
    setOrders(p=>({...p,[order.id]:{...mapped,tableId:fakeId}}));
    setTables(p=>[...p,{id:fakeId,dbId:null,zone:"Take-Away",seats:0,status:"occupied",waiter:currentStaff.id,orderId:order.id,since:Date.now(),type}]);
    setActiveTableId(fakeId);
    setScreen("order");
  };

  const handleUpdateOrder=useCallback((updater)=>{
    if(!activeOrderId) return;
    setOrders(p=>({...p,[activeOrderId]:updater(p[activeOrderId])}));
  },[activeOrderId]);

  const handleSendKitchen=async()=>{
    // Re-entrancy guard. Without this, a rapid double-click fires two parallel
    // requests that each create lines + call /send — the same items end up in
    // the KDS twice. The ref blocks the second call before any state racing.
    if(sendingRef.current) return;
    if(!activeOrderId||!activeOrder) return;
    const pending=activeOrder.items.filter(i=>!i.sent&&!i.cancelled);
    if(pending.length===0) return;

    sendingRef.current=true;
    setSending(true);
    try{

    let realOrderId=activeOrderId;
    const draftSnapshot={...activeOrder};

    if(activeOrder.draft){
      const res=await fetch("/api/orders",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({table_id:activeTable?.dbId,type:"table"}),
      });
      if(!res.ok){addToast("Erro ao criar pedido",T.danger);return;}
      const newOrder=await res.json();
      realOrderId=newOrder.id;
      setOrders(p=>{const{[activeOrderId]:_,...rest}=p;return{...rest,[realOrderId]:{...draftSnapshot,id:realOrderId,draft:false}};});
      setTables(p=>p.map(t=>t.id===activeTableId?{...t,orderId:realOrderId,status:"occupied"}:t));
    }

    // Optimistic update — mark the pending items as sent and assign them the
    // next batch number, so previously-delivered batches keep their state.
    setOrders(p=>{
      const o=p[realOrderId];if(!o)return p;
      const nextBatch=(o.items||[]).reduce((m,i)=>Math.max(m,i.sentBatch??0),0)+1;
      const pendingIds=new Set(pending.map(pi=>pi.lineId));
      return{...p,[realOrderId]:{...o,items:(o.items||[]).map(i=>pendingIds.has(i.lineId)?{...i,sent:true,sentBatch:nextBatch}:i),sentAt:Date.now()}};
    });
    try{
      // Create each line; surface the real error instead of failing silently
      const lineResults=await Promise.all(pending.map(item=>
        fetch(`/api/orders/${realOrderId}/lines`,{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            item_id:item.itemId||null,
            name:item.name,qty:item.qty,
            unit_price:item.price,extra_price:item.extraPrice||0,
            vat_rate:item.vat,
            modifiers:item.mods,
            modifier_ingredients:item.modifierIngredients||[],
            notes:item.notes||null,
          }),
        })
      ));
      const failed=lineResults.find(r=>!r.ok);
      if(failed){
        const err=await failed.json().catch(()=>({}));
        throw new Error(err.error||"Erro ao gravar itens");
      }
      const res=await fetch(`/api/orders/${realOrderId}/send`,{method:"POST"});
      if(!res.ok){
        const err=await res.json().catch(()=>({}));
        throw new Error(err.error||"Erro ao enviar para cozinha");
      }
      // Replace the optimistic client line IDs with the real DB IDs returned by
      // the create calls. Done only after a successful send so the catch-block
      // rollback (which matches on the original IDs) still works on failure.
      // Without this, pay-by-item/cancel reference rows that don't exist in the DB.
      const createdRows=await Promise.all(lineResults.map(r=>r.json().catch(()=>null)));
      const idMap={};
      pending.forEach((it,k)=>{const row=createdRows[k];if(row&&row.id)idMap[it.lineId]=row.id;});
      if(Object.keys(idMap).length){
        setOrders(p=>{
          const o=p[realOrderId];if(!o)return p;
          return{...p,[realOrderId]:{...o,items:o.items.map(i=>idMap[i.lineId]?{...i,lineId:idMap[i.lineId]}:i)}};
        });
      }
      setMenuStock(ms=>{
        const u={...ms};
        pending.forEach(i=>{if(u[i.itemId]!==undefined)u[i.itemId]=Math.max(0,(u[i.itemId]||0)-i.qty);});
        return u;
      });
      const tl=activeTable?.id||"?";
      addToast(`Pedido enviado — ${tl}`,T.accent);
      setReadyOrders(prev=>{const n=new Set(prev);n.delete(realOrderId);return n;});
    }catch(e){
      setOrders(p=>({...p,[realOrderId]:{...p[realOrderId],items:(p[realOrderId]?.items||[]).map(i=>{
        const wasPending=pending.find(pi=>pi.lineId===i.lineId);
        return wasPending?{...i,sent:false}:i;
      })}}));
      addToast(e?.message?`Erro: ${e.message}`:"Erro ao enviar pedido",T.danger);
    }

    }finally{
      sendingRef.current=false;
      setSending(false);
    }
  };

  const handlePayment=async(payData)=>{
    if(!activeOrderId) return {fullyPaid:false};
    const isItems=Array.isArray(payData.items)&&payData.items.length>0;
    const body=isItems
      ? {method:payData.method,items:payData.items}
      : {method:payData.method,amount:payData.amount??orderTotal(activeOrder.items),split_n:payData.split};
    try{
      const res=await fetch(`/api/orders/${activeOrderId}/pay`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body),
      });
      if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error||"");}
      const data=await res.json().catch(()=>({}));
      const fullyPaid=data?.fullyPaid!==false;
      const paidAmount=isItems?(payData.amount||0):(payData.amount??orderTotal(activeOrder.items));

      if(fullyPaid){
        addToast(`Pagamento — ${activeTableId} — ${fmtEur(paidAmount)}`,T.success);
        setReadyOrders(prev=>{const n=new Set(prev);n.delete(activeOrderId);return n;});
        setOrders(p=>({...p,[activeOrderId]:{...p[activeOrderId],paid:true}}));
        setTables(p=>p.map(t=>{
          if(t.id!==activeTableId) return t;
          if(t.type==="take-away"||t.type==="balcao") return null;
          return {...t,status:"free",waiter:null,orderId:null,since:null};
        }).filter(Boolean));
        setActiveTableId(null);
        setScreen("floor");
      }else{
        // Partial payment: bump paidQty on the settled lines, keep the table open.
        const add={};
        payData.items.forEach(it=>{add[it.line_id]=(add[it.line_id]||0)+it.qty;});
        setOrders(p=>({...p,[activeOrderId]:{...p[activeOrderId],
          items:p[activeOrderId].items.map(l=>add[l.lineId]?{...l,paidQty:(l.paidQty||0)+add[l.lineId]}:l)}}));
        addToast(`Pagamento parcial — ${fmtEur(paidAmount)}`,T.success);
      }
      return {fullyPaid};
    }catch(e){
      addToast(e?.message?`Erro: ${e.message}`:"Erro ao processar pagamento",T.danger);
      return {fullyPaid:false,error:true};
    }
  };

  const handleCancelLine=async(lineId,motivo)=>{
    if(!activeOrderId) return;
    const line=activeOrder.items.find(l=>l.lineId===lineId);
    setOrders(p=>({...p,[activeOrderId]:{...p[activeOrderId],items:p[activeOrderId].items.map(l=>l.lineId===lineId?{...l,cancelled:true}:l)}}));
    try{
      await fetch(`/api/orders/${activeOrderId}/lines/${lineId}`,{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({cancelled:true,cancel_note:motivo}),
      });
      addToast(`Item anulado — ${line?.name}`,T.danger);
    }catch{
      setOrders(p=>({...p,[activeOrderId]:{...p[activeOrderId],items:p[activeOrderId].items.map(l=>l.lineId===lineId?{...l,cancelled:false}:l)}}));
      addToast("Erro ao anular item",T.danger);
    }
  };

  const handleEndShift=async()=>{
    if(endShiftTarget){
      const openOrders=Object.values(orders).filter(o=>!o.paid&&!o.draft&&o.id);
      await Promise.all(openOrders.map(o=>
        fetch(`/api/orders/${o.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({waiter_id:endShiftTarget})}).catch(()=>{})
      ));
    }
    if(shiftId) await fetch(`/api/shifts/${shiftId}/close`,{method:"POST"}).catch(()=>{});
    setShowEndShift(false);
    setShiftId(null);
    setActiveTableId(null);
    setEndShiftTarget("");
    if(session?.role!=="manager"){
      fetch("/api/shifts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fundo_value:0})}).then(r=>r.json()).then(d=>{if(!d.error)setShiftId(d.id);}).catch(()=>{});
      setScreen("floor");
    } else {
      setScreen("fundo");
    }
  };

  const handleTransfer=async(staffId)=>{
    if(!activeOrderId) return;
    const newStaff=staffList.find(s=>s.id===staffId);
    try{
      await fetch(`/api/orders/${activeOrderId}`,{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({waiter_id:staffId}),
      });
      setOrders(p=>({...p,[activeOrderId]:{...p[activeOrderId],waiterId:staffId}}));
      setTables(p=>p.map(t=>t.id===activeTableId?{...t,waiter:staffId}:t));
      addToast(`Mesa ${activeTableId} → ${newStaff?.name}`,T.teal);
      setActiveTableId(null);
      setScreen("floor");
    }catch{
      addToast("Erro ao transferir mesa",T.danger);
    }
  };

  if(loading) return(
    <>
      <style>{CSS}</style>
      <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg}}>
        <div style={{color:T.textMuted,fontSize:14,fontFamily:"'DM Mono',monospace"}}>A carregar...</div>
      </div>
    </>
  );

  return(
    <>
      <style>{CSS}</style>
      <div className="pos-root">
        {screen!=="fundo"&&(
          <header className="topbar">
            <div className="topbar-logo">
              <div className="topbar-dot"/>
              POS
            </div>
            <div className="topbar-sep"/>
            <div className="topbar-staff">
              <div className="staff-avatar">{currentStaff.initials}</div>
              {currentStaff.name}
              <span style={{fontSize:10,color:T.textMuted}}>· Fundo {fmtEur(fundoValue)}</span>
            </div>
            <div className="topbar-right">
              <button className="btn btn-ghost btn-sm" onClick={()=>{if(screen==="order"){if(activeOrder?.draft&&activeOrderId){setOrders(p=>{const{[activeOrderId]:_,...rest}=p;return rest;});setTables(p=>p.map(t=>t.id===activeTableId?{...t,orderId:null,waiter:null,since:null}:t));}setActiveTableId(null);setScreen("floor");}}} style={{display:screen==="order"?"flex":"none"}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                Mesas
              </button>
              <button className="btn btn-ghost btn-sm" style={{color:T.danger,borderColor:`${T.danger}33`,display:screen==="floor"?"flex":"none"}} onClick={()=>setShowEndShift(true)}>
                Fechar Turno
              </button>
              <Clock/>
            </div>
          </header>
        )}

        <KDSNotifBanner notif={kdsNotif} onClose={()=>setKdsNotif(null)}/>

        {screen==="fundo"&&(
          <FundoManeioScreen
            appName={appName}
            staffName={currentStaff.name}
            onConfirm={async(v)=>{
              setFundoValue(v);
              const r=await fetch("/api/shifts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fundo_value:v})});
              const d=await r.json();
              if(!d.error) setShiftId(d.id);
              setScreen("floor");
            }}
          />
        )}
        {screen==="floor"&&(
          <FloorScreen tables={tables} orders={orders} zones={zones} staffList={staffList} turnos={turnos} onTablePress={handleTablePress} onQuickOrder={handleQuickOrder} addToast={addToast}/>
        )}
        {screen==="order"&&activeTable&&activeOrder&&(
          <OrderScreen
            table={activeTable}
            order={activeOrder}
            menu={menu}
            staffList={staffList}
            menuStock={menuStock}
            onBack={()=>{setActiveTableId(null);setScreen("floor");}}
            onUpdateOrder={handleUpdateOrder}
            onSendKitchen={handleSendKitchen}
            sending={sending}
            kdsReady={readyOrders.has(activeOrderId)}
            onPayment={handlePayment}
            onCancelLine={handleCancelLine}
            onTransfer={handleTransfer}
            addToast={addToast}
          />
        )}
      </div>

      {showEndShift&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:28,width:"100%",maxWidth:400,display:"flex",flexDirection:"column",gap:18}}>
            <div style={{fontWeight:700,fontSize:18,color:T.text}}>Fechar Turno</div>
            <div style={{fontSize:14,color:T.textSec}}>
              {Object.values(orders).filter(o=>!o.paid&&!o.draft&&o.id).length>0
                ?"Tens mesas abertas. Passa-as para outro funcionário ou deixa-as sem atribuição."
                :"Tens a certeza que queres fechar o turno?"}
            </div>
            {Object.values(orders).filter(o=>!o.paid&&!o.draft&&o.id).length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <label style={{fontSize:12,fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:.5}}>Transferir para</label>
                <select
                  value={endShiftTarget}
                  onChange={e=>setEndShiftTarget(e.target.value)}
                  style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",color:T.text,fontSize:14,width:"100%"}}
                >
                  <option value="">— Deixar sem funcionário —</option>
                  {staffList.filter(s=>s.id!==currentStaff?.id&&s.active&&(s.role==="waiter"||s.role==="manager")).map(s=>(
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowEndShift(false)}>Cancelar</button>
              <button
                className="btn btn-sm"
                style={{background:T.danger,color:"#fff",borderColor:T.danger}}
                onClick={handleEndShift}
              >
                Confirmar Fecho
              </button>
            </div>
          </div>
        </div>
      )}

      <Toasts toasts={toasts}/>
    </>
  );
}
