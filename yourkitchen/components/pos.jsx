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

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const STAFF = [
  {id:"s1",name:"Sofia",role:"waiter",initials:"SO"},
  {id:"s2",name:"João",role:"waiter",initials:"JO"},
  {id:"s3",name:"Mariana",role:"waiter",initials:"MA"},
  {id:"s4",name:"Rui",role:"waiter",initials:"RU"},
];
const CURRENT_STAFF = STAFF[0];

const ZONES = ["Interior","Esplanada","Bar"];

const INIT_TABLES = [
  // Interior
  {id:"M1",zone:"Interior",seats:4,status:"occupied",waiter:"s1",orderId:"ORD001",since:Date.now()-42*60000},
  {id:"M2",zone:"Interior",seats:2,status:"free",waiter:null,orderId:null,since:null},
  {id:"M3",zone:"Interior",seats:4,status:"bill",waiter:"s2",orderId:"ORD002",since:Date.now()-78*60000},
  {id:"M4",zone:"Interior",seats:6,status:"occupied",waiter:"s3",orderId:"ORD003",since:Date.now()-25*60000},
  {id:"M5",zone:"Interior",seats:2,status:"locked",waiter:"s2",orderId:"ORD004",since:Date.now()-8*60000},
  {id:"M6",zone:"Interior",seats:4,status:"free",waiter:null,orderId:null,since:null},
  {id:"M7",zone:"Interior",seats:8,status:"reserved",waiter:null,orderId:null,since:null,reservedFor:"Fam. Santos 20:30"},
  {id:"M8",zone:"Interior",seats:4,status:"free",waiter:null,orderId:null,since:null},
  // Esplanada
  {id:"E1",zone:"Esplanada",seats:4,status:"occupied",waiter:"s1",orderId:"ORD005",since:Date.now()-15*60000},
  {id:"E2",zone:"Esplanada",seats:4,status:"free",waiter:null,orderId:null,since:null},
  {id:"E3",zone:"Esplanada",seats:2,status:"free",waiter:null,orderId:null,since:null},
  {id:"E4",zone:"Esplanada",seats:6,status:"free",waiter:null,orderId:null,since:null},
  // Bar
  {id:"B1",zone:"Bar",seats:0,status:"occupied",waiter:"s4",orderId:"ORD006",since:Date.now()-5*60000},
  {id:"B2",zone:"Bar",seats:0,status:"free",waiter:null,orderId:null,since:null},
];

const MENU = [
  {id:"cat0",name:"Entradas",emoji:"🧆",items:[
    {id:"it01",name:"Pão + Manteiga",price:2.50,vat:6,emoji:"🍞",stock:null,mods:[]},
    {id:"it02",name:"Chouriço Assado",price:6.50,vat:23,emoji:"🌭",stock:null,mods:[]},
    {id:"it03",name:"Tabua de Queijos",price:9.50,vat:23,emoji:"🧀",stock:6,mods:[]},
    {id:"it04",name:"Amêijoas à Bulhão Pato",price:13.50,vat:23,emoji:"🦪",stock:4,mods:[]},
  ]},
  {id:"cat1",name:"Sopas",emoji:"🍲",items:[
    {id:"it10",name:"Sopa do Dia",price:4.00,vat:6,emoji:"🥣",stock:null,mods:[]},
    {id:"it11",name:"Caldo Verde",price:4.50,vat:6,emoji:"🥬",stock:null,mods:[]},
  ]},
  {id:"cat2",name:"Principais",emoji:"🍽️",items:[
    {id:"it20",name:"Bacalhau à Brás",price:13.50,vat:23,emoji:"🐟",stock:8,mods:[]},
    {id:"it21",name:"Francesinha",price:12.00,vat:23,emoji:"🥪",stock:null,mods:[
      {id:"m1",name:"Extras",required:false,options:[
        {id:"o1",label:"Com Ovo",price:1.50},
        {id:"o2",label:"Extra Molho",price:0.00},
      ]},
    ]},
    {id:"it22",name:"Risotto de Cogumelos",price:11.50,vat:23,emoji:"🍄",stock:5,mods:[]},
    {id:"it23",name:"Alheira com Ovos",price:10.50,vat:23,emoji:"🥚",stock:null,mods:[]},
  ]},
  {id:"cat3",name:"Grelhados",emoji:"🔥",items:[
    {id:"it30",name:"Bife do Lombo",price:18.50,vat:23,emoji:"🥩",stock:null,mods:[
      {id:"m2",name:"Ponto",required:true,options:[
        {id:"o3",label:"Mal Passado",price:0},
        {id:"o4",label:"Médio",price:0},
        {id:"o5",label:"Bem Passado",price:0},
      ]},
      {id:"m3",name:"Extras",required:false,options:[
        {id:"o6",label:"Ovo a Cavalo",price:1.50},
        {id:"o7",label:"Queijo Fundido",price:1.00},
        {id:"o8",label:"Pimenta Extra",price:0},
      ]},
    ]},
    {id:"it31",name:"Polvo Grelhado",price:16.00,vat:23,emoji:"🐙",stock:4,mods:[]},
    {id:"it32",name:"Frango no Churrasco",price:11.00,vat:23,emoji:"🍗",stock:null,mods:[
      {id:"m4",name:"Tamanho",required:true,options:[
        {id:"o9",label:"Meia Dose",price:0},
        {id:"o10",label:"Dose Completa",price:4.00},
      ]},
    ]},
  ]},
  {id:"cat4",name:"Bebidas",emoji:"🥂",items:[
    {id:"it40",name:"Água Natural 0.5L",price:1.20,vat:23,emoji:"💧",stock:null,mods:[]},
    {id:"it41",name:"Água Com Gás 0.5L",price:1.30,vat:23,emoji:"🫧",stock:null,mods:[]},
    {id:"it42",name:"Cerveja Imperial",price:2.20,vat:23,emoji:"🍺",stock:null,mods:[]},
    {id:"it43",name:"Vinho Tinto (copo)",price:3.50,vat:23,emoji:"🍷",stock:null,mods:[]},
    {id:"it44",name:"Galão",price:1.40,vat:6,emoji:"☕",stock:null,mods:[]},
    {id:"it45",name:"Sumo Natural",price:3.00,vat:23,emoji:"🍊",stock:null,mods:[]},
  ]},
  {id:"cat5",name:"Sobremesas",emoji:"🍮",items:[
    {id:"it50",name:"Pastel de Nata",price:1.50,vat:6,emoji:"🥧",stock:null,mods:[]},
    {id:"it51",name:"Arroz Doce",price:4.00,vat:6,emoji:"🍚",stock:null,mods:[]},
    {id:"it52",name:"Tarte de Amêndoa",price:5.50,vat:6,emoji:"🎂",stock:3,mods:[]},
  ]},
];

const INIT_ORDERS = {
  ORD001:{id:"ORD001",tableId:"M1",waiterId:"s1",items:[
    {lineId:"l1",itemId:"it20",name:"Bacalhau à Brás",qty:2,price:13.50,vat:23,mods:[],notes:"",sent:true,cancelled:false},
    {lineId:"l2",itemId:"it10",name:"Sopa do Dia",qty:2,price:4.00,vat:6,mods:[],notes:"",sent:true,cancelled:false},
  ],notes:"",sentAt:Date.now()-20*60000},
  ORD002:{id:"ORD002",tableId:"M3",waiterId:"s2",items:[
    {lineId:"l3",itemId:"it30",name:"Bife do Lombo",qty:1,price:18.50,vat:23,mods:["Mal Passado","Ovo a Cavalo (+€1.50)"],notes:"",sent:true,cancelled:false,extraPrice:1.50},
    {lineId:"l4",itemId:"it42",name:"Cerveja Imperial",qty:2,price:2.20,vat:23,mods:[],notes:"",sent:true,cancelled:false},
  ],notes:"Mesa de aniversário",sentAt:Date.now()-60*60000},
  ORD003:{id:"ORD003",tableId:"M4",waiterId:"s3",items:[
    {lineId:"l5",itemId:"it21",name:"Francesinha",qty:2,price:12.00,vat:23,mods:[],notes:"",sent:true,cancelled:false},
    {lineId:"l6",itemId:"it43",name:"Vinho Tinto (copo)",qty:2,price:3.50,vat:23,mods:[],notes:"",sent:true,cancelled:false},
  ],notes:"",sentAt:Date.now()-10*60000},
  ORD004:{id:"ORD004",tableId:"M5",waiterId:"s2",items:[],notes:"",sentAt:null},
  ORD005:{id:"ORD005",tableId:"E1",waiterId:"s1",items:[
    {lineId:"l7",itemId:"it31",name:"Polvo Grelhado",qty:1,price:16.00,vat:23,mods:[],notes:"",sent:true,cancelled:false},
  ],notes:"",sentAt:Date.now()-8*60000},
  ORD006:{id:"ORD006",tableId:"B1",waiterId:"s4",items:[
    {lineId:"l8",itemId:"it44",name:"Galão",qty:1,price:1.40,vat:6,mods:[],notes:"",sent:true,cancelled:false},
  ],notes:"",sentAt:Date.now()-3*60000},
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
let _lineId = 1000;
const newLineId = () => `l${++_lineId}`;
let _orderId = 10;
const newOrderId = () => `ORD0${++_orderId}`;
let _logId = 200;
const newLogId = () => ++_logId;

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
  bill:   {label:"Conta",   color:"#F7D44A", bg:"#F7D44A18",  border:"#F7D44A44"},
  reserved:{label:"Reserva",color:T.purple,  bg:T.purpleDim,  border:`${T.purple}44`},
  locked: {label:"Em uso",  color:T.blue,    bg:T.blueDim,    border:`${T.blue}44`},
};

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
.pos-root{width:100vw;height:100vh;display:flex;flex-direction:column;overflow:hidden;}

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
.table-card.status-bill{border-color:#F7D44A33;animation:pulse 2s infinite;}
.table-card.status-reserved{border-color:${T.purple}33;}
.table-card.status-locked{border-color:${T.blue}33;opacity:.75;cursor:not-allowed;}
.table-top{display:flex;align-items:center;justify-content:space-between;}
.table-id{font-size:18px;font-weight:800;letter-spacing:-.5px;}
.table-status-dot{width:8px;height:8px;border-radius:50%;}
.table-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;letter-spacing:.3px;}
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
.op-items{flex:1;overflow-y:auto;padding:10px 12px;}
.op-section-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${T.textMuted};padding:4px 2px 8px;display:flex;align-items:center;gap:6px;}
.op-section-label::after{content:'';flex:1;height:1px;background:${T.border};}
.order-line{display:flex;align-items:flex-start;gap:8px;padding:7px 8px;border-radius:8px;transition:background .12s;}
.order-line:hover{background:${T.elevated};}
.order-line.sent{opacity:.65;}
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
  const [sel,setSel]=useState({});
  const [extras,setExtras]=useState({});

  const toggleRequired=(modId,optId)=>setSel(p=>({...p,[modId]:optId}));
  const toggleOptional=(modId,optId)=>setExtras(p=>{
    const cur=p[modId]||{};
    return {...p,[modId]:{...cur,[optId]:!cur[optId]}};
  });

  const allRequired=item.mods.filter(m=>m.required).every(m=>sel[m.id]);
  const modsText=[];
  let extraPrice=0;
  item.mods.forEach(m=>{
    if(m.required){
      const o=m.options.find(o=>o.id===sel[m.id]);
      if(o){modsText.push(o.label);if(o.price)extraPrice+=o.price;}
    } else {
      const chosen=m.options.filter(o=>(extras[m.id]||{})[o.id]);
      chosen.forEach(o=>{modsText.push(`${o.label}${o.price?` (+€${o.price.toFixed(2)})`:""}`);if(o.price)extraPrice+=o.price;});
    }
  });

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
              <div className="mod-group-title">
                {mod.name}
                {mod.required && <span className="mod-required-tag">OBRIGATÓRIO</span>}
              </div>
              <div className="mod-options">
                {mod.options.map(opt=>{
                  const isSelected=mod.required ? sel[mod.id]===opt.id : !!(extras[mod.id]||{})[opt.id];
                  return(
                    <div
                      key={opt.id}
                      className={`mod-option${isSelected?" selected":""}`}
                      onClick={()=>mod.required?toggleRequired(mod.id,opt.id):toggleOptional(mod.id,opt.id)}
                    >
                      {mod.required
                        ? <div className="mod-radio"/>
                        : <div className="mod-check">{isSelected&&<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                          </div>
                      }
                      <div className="mod-option-label">{opt.label}</div>
                      {opt.price>0 && <div className="mod-option-price">+{fmtEur(opt.price)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-solid-accent"
            disabled={!allRequired}
            onClick={()=>onConfirm({modsText,extraPrice})}
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
function TransferModal({currentWaiterId,onConfirm,onClose}){
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
            {STAFF.map(s=>(
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
function PaymentModal({order,tableLabel,onConfirm,onClose}){
  const METHODS=[
    {id:"numerario",label:"Numerário",icon:"💶"},
    {id:"cartao",label:"Cartão",icon:"💳"},
    {id:"mbway",label:"MB Way",icon:"📱"},
    {id:"multibanco",label:"Multibanco",icon:"🏧"},
  ];
  const [method,setMethod]=useState("numerario");
  const [received,setReceived]=useState("");
  const [split,setSplit]=useState(1);

  const total=orderTotal(order.items);
  const vatMap=orderVAT(order.items);
  const subtotal=order.items.filter(i=>!i.cancelled).reduce((s,i)=>{
    const gross=(i.price+(i.extraPrice||0))*i.qty;
    return s+gross/(1+i.vat/100);
  },0);

  const rec=parseFloat(received.replace(",","."));
  const troco=isNaN(rec)?null:rec-total/split;
  const perPerson=total/split;

  const handleNum=(d)=>{
    if(d==="⌫") setReceived(p=>p.slice(0,-1));
    else if(d===".") setReceived(p=>p.includes(".")?p:p+d);
    else setReceived(p=>(p+d).slice(0,8));
  };

  const canConfirm = method!=="numerario" || (rec>=perPerson && !isNaN(rec));

  return(
    <div className="overlay" onClick={onClose}>
      <div className="modal pay-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Pagamento — {tableLabel}</div>
            <div className="modal-sub">{order.items.filter(i=>!i.cancelled).length} itens</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{display:"flex",gap:20}}>
          {/* Left: summary + split */}
          <div style={{flex:"0 0 220px"}}>
            <div className="pay-label">Resumo</div>
            <div className="pay-summary">
              <div className="pay-sum-row"><div className="pay-sum-label">Subtotal (s/IVA)</div><div className="pay-sum-val">{fmtEur(subtotal)}</div></div>
              {Object.entries(vatMap).map(([rate,val])=>(
                <div key={rate} className="pay-sum-row"><div className="pay-sum-label" style={{fontSize:11}}>IVA {rate}%</div><div className="pay-sum-val" style={{fontSize:11}}>{fmtEur(val)}</div></div>
              ))}
              <div className="pay-sum-row total"><div className="pay-sum-label">Total</div><div className="pay-sum-val">{fmtEur(total)}</div></div>
            </div>
            <div className="pay-label" style={{marginBottom:8}}>Dividir por pessoas</div>
            <div className="split-row" style={{marginBottom:10}}>
              <div className="split-btns">
                {[1,2,3,4].map(n=>(
                  <button key={n} className={`split-btn${split===n?" active":""}`} onClick={()=>setSplit(n)}>{n}</button>
                ))}
              </div>
            </div>
            {split>1&&<div className="split-per-person">{fmtEur(perPerson)} <span style={{fontSize:14,color:T.textMuted}}>/ pessoa</span></div>}
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
                  placeholder={fmtEur(perPerson)}
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
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:700,color:T.text,marginTop:8}}>{fmtEur(perPerson)}</div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-solid-success btn-lg" disabled={!canConfirm} onClick={()=>onConfirm({method,received:method==="numerario"?rec:perPerson,split})}>
            ✓ Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ORDER SCREEN ─────────────────────────────────────────────────────────────
function OrderScreen({table,order,menuStock,onBack,onUpdateOrder,onSendKitchen,onRequestBill,onPayment,onCancelLine,onTransfer,addToast,addLog}){
  const [cat,setCat]=useState(0);
  const [modItem,setModItem]=useState(null);
  const [cancelTarget,setCancelTarget]=useState(null);
  const [showTransfer,setShowTransfer]=useState(false);
  const [showPayment,setShowPayment]=useState(false);

  const tableLabel = table.id;
  const waiter = STAFF.find(s=>s.id===order.waiterId)||CURRENT_STAFF;
  const curMenu=MENU[cat];

  const pendingItems=order.items.filter(i=>!i.sent&&!i.cancelled);
  const sentItems=order.items.filter(i=>i.sent&&!i.cancelled);
  const cancelledItems=order.items.filter(i=>i.cancelled);

  const handleAddItem=(item)=>{
    const st=stockForItem(menuStock,item.id);
    if(st!==null&&st<=0){addToast("Item esgotado",T.danger);return;}
    if(item.mods.length>0){setModItem(item);return;}
    const existing=pendingItems.find(l=>l.itemId===item.id&&l.mods.length===0);
    if(existing){
      onUpdateOrder(prev=>({...prev,items:prev.items.map(l=>l.lineId===existing.lineId?{...l,qty:l.qty+1}:l)}));
    } else {
      const line={lineId:newLineId(),itemId:item.id,name:item.name,qty:1,price:item.price,vat:item.vat,mods:[],notes:"",sent:false,cancelled:false,extraPrice:0};
      onUpdateOrder(prev=>({...prev,items:[...prev.items,line]}));
    }
  };

  const handleModConfirm=({modsText,extraPrice})=>{
    const item=modItem;
    const line={lineId:newLineId(),itemId:item.id,name:item.name,qty:1,price:item.price,vat:item.vat,mods:modsText,notes:"",sent:false,cancelled:false,extraPrice};
    onUpdateOrder(prev=>({...prev,items:[...prev.items,line]}));
    setModItem(null);
  };

  const changeQty=(lineId,delta)=>{
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
          {MENU.map((c,i)=>(
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
          {table.status==="bill"&&(
            <span style={{fontSize:11,background:"#F7D44A18",color:"#F7D44A",border:"1px solid #F7D44A33",borderRadius:4,padding:"2px 7px",fontWeight:700,marginLeft:4}}>
              CONTA PEDIDA
            </span>
          )}
        </div>

        <div className="op-items">
          {/* Pending */}
          {pendingItems.length>0&&(
            <>
              <div className="op-section-label">A enviar ({pendingItems.length})</div>
              {pendingItems.map(l=>(
                <div key={l.lineId} className="order-line">
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
              ))}
            </>
          )}

          {/* Sent */}
          {sentItems.length>0&&(
            <>
              <div className="op-section-label" style={{marginTop:8}}>Enviado ({sentItems.length})</div>
              {sentItems.map(l=>(
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
            disabled={pendingItems.length===0}
            onClick={onSendKitchen}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            Enviar Cozinha
          </button>
          <button
            className="btn btn-warning"
            disabled={sentItems.length===0||table.status==="bill"}
            onClick={onRequestBill}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/></svg>
            Pedir Conta
          </button>
          <button
            className="btn btn-solid-success"
            disabled={total===0}
            style={{gridColumn:"span 2"}}
            onClick={()=>setShowPayment(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Pagar — {fmtEur(total)}
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
          onClose={()=>setShowTransfer(false)}
          onConfirm={(staffId)=>{onTransfer(staffId);setShowTransfer(false);}}
        />
      )}
      {showPayment&&(
        <PaymentModal
          order={order}
          tableLabel={tableLabel}
          onClose={()=>setShowPayment(false)}
          onConfirm={(payData)=>{onPayment(payData);setShowPayment(false);}}
        />
      )}
    </div>
  );
}

// ─── FUNDO MANEIO SCREEN ──────────────────────────────────────────────────────
function FundoManeioScreen({onConfirm}){
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
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"3px",textTransform:"uppercase",color:T.textMuted,marginBottom:8}}>RestaurantOS · POS</div>
          <div style={{fontSize:13,color:T.textSec}}>Sofia · {new Date().toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"})}</div>
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
function FloorScreen({tables,orders,onTablePress,onQuickOrder}){
  const [zone,setZone]=useState("Interior");
  const zoneTables=tables.filter(t=>t.zone===zone);
  const occupiedCount=tables.filter(t=>t.status==="occupied"||t.status==="bill").length;
  const activeOrders=Object.values(orders).filter(o=>o.items.length>0&&!o.paid).length;
  const turnoVendas=Object.values(orders).filter(o=>o.paid).reduce((s,o)=>s+orderTotal(o.items),0);

  return(
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

      <div className="floor-zones">
        {ZONES.map(z=>(
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
            const waiter=table.waiter?STAFF.find(s=>s.id===table.waiter):null;
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
                    🔒 {STAFF.find(s=>s.id===table.waiter)?.name||"outro"}
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Take-Away
        </button>
        <button className="btn btn-accent btn-lg" onClick={()=>onQuickOrder("balcao")}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          Balcão
        </button>
      </div>
    </div>
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
export default function POS(){
  const [screen,setScreen]=useState("fundo"); // fundo | floor | order
  const [fundoValue,setFundoValue]=useState(0);
  const [tables,setTables]=useState(INIT_TABLES);
  const [orders,setOrders]=useState(INIT_ORDERS);
  const [menuStock,setMenuStock]=useState({
    "it03":6,"it04":4,"it20":8,"it22":5,"it31":4,"it52":3,
  });
  const [activeTableId,setActiveTableId]=useState(null);
  const [toasts,setToasts]=useState([]);
  const [logs,setLogs]=useState([]);
  const [kdsNotif,setKdsNotif]=useState(null);
  const kdsTimerRef=useRef(null);

  const addToast=useCallback((msg,color=T.teal)=>{
    const id=++_toastId;
    setToasts(p=>[...p,{id,msg,color}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  },[]);

  const addLog=useCallback((level,msg,comment=null)=>{
    const time=nowTime();
    setLogs(p=>[...p.slice(-299),{id:newLogId(),level,time,msg,comment}]);
  },[]);

  const activeTable=activeTableId?tables.find(t=>t.id===activeTableId):null;
  const activeOrderId=activeTable?.orderId;
  const activeOrder=activeOrderId?orders[activeOrderId]:null;

  // Handle table press
  const handleTablePress=(table)=>{
    if(table.status==="locked"){
      const who=STAFF.find(s=>s.id===table.waiter)?.name||"outro";
      addToast(`Mesa em uso por ${who}`,T.blue);
      return;
    }
    if(table.status==="reserved"){
      // Open new order for reserved table
      const oid=newOrderId();
      setOrders(p=>({...p,[oid]:{id:oid,tableId:table.id,waiterId:CURRENT_STAFF.id,items:[],notes:"",sentAt:null,paid:false}}));
      setTables(p=>p.map(t=>t.id===table.id?{...t,status:"occupied",waiter:CURRENT_STAFF.id,orderId:oid,since:Date.now()}:t));
      setActiveTableId(table.id);
      setScreen("order");
      addLog("INFO",`Mesa <strong>${table.id}</strong> aberta por <strong>${CURRENT_STAFF.name}</strong> (era reserva).`);
      return;
    }
    if(table.status==="free"){
      // Create new order
      const oid=newOrderId();
      setOrders(p=>({...p,[oid]:{id:oid,tableId:table.id,waiterId:CURRENT_STAFF.id,items:[],notes:"",sentAt:null,paid:false}}));
      setTables(p=>p.map(t=>t.id===table.id?{...t,status:"occupied",waiter:CURRENT_STAFF.id,orderId:oid,since:Date.now()}:t));
      setActiveTableId(table.id);
      setScreen("order");
      addLog("INFO",`Novo pedido — Mesa <strong>${table.id}</strong> — <strong>${CURRENT_STAFF.name}</strong>.`);
      return;
    }
    // occupied / bill — open existing order
    setActiveTableId(table.id);
    setScreen("order");
  };

  // Quick order (take-away / balcao)
  const handleQuickOrder=(type)=>{
    const fakeId=`${type==="take-away"?"TA":"BC"}${Date.now()%10000}`;
    const oid=newOrderId();
    const fakeTable={id:fakeId,zone:"—",seats:0,status:"occupied",waiter:CURRENT_STAFF.id,orderId:oid,since:Date.now(),type};
    setOrders(p=>({...p,[oid]:{id:oid,tableId:fakeId,waiterId:CURRENT_STAFF.id,items:[],notes:"",sentAt:null,paid:false,type}}));
    setTables(p=>[...p,fakeTable]);
    setActiveTableId(fakeId);
    setScreen("order");
    addLog("INFO",`Novo pedido ${type} — <strong>${CURRENT_STAFF.name}</strong>.`);
  };

  // Update order
  const handleUpdateOrder=useCallback((updater)=>{
    if(!activeOrderId) return;
    setOrders(p=>({...p,[activeOrderId]:updater(p[activeOrderId])}));
  },[activeOrderId]);

  // Send to kitchen
  const handleSendKitchen=()=>{
    if(!activeOrderId) return;
    setOrders(p=>{
      const o=p[activeOrderId];
      const newItems=o.items.map(i=>i.sent?i:{...i,sent:true});
      // Decrease stock
      newItems.filter(i=>!i.cancelled&&!orders[activeOrderId].items.find(oi=>oi.lineId===i.lineId&&oi.sent)).forEach(i=>{
        setMenuStock(ms=>{
          if(ms[i.itemId]===undefined) return ms;
          const ns=Math.max(0,(ms[i.itemId]||0)-i.qty);
          return {...ms,[i.itemId]:ns};
        });
      });
      return {...p,[activeOrderId]:{...o,items:newItems,sentAt:Date.now()}};
    });
    const tl=activeTable?.id||"?";
    addLog("ACTION",`Pedido enviado para cozinha — Mesa <strong>${tl}</strong>.`);
    addToast(`Pedido enviado — ${tl}`,T.accent);
    // Simulate KDS ready after 8s
    if(kdsTimerRef.current) clearTimeout(kdsTimerRef.current);
    kdsTimerRef.current=setTimeout(()=>{
      setKdsNotif({label:tl});
      addToast(`KDS — ${tl} pronto para servir! 🔔`,T.success);
    },8000);
  };

  // Request bill
  const handleRequestBill=()=>{
    setTables(p=>p.map(t=>t.id===activeTableId?{...t,status:"bill"}:t));
    addLog("INFO",`Conta pedida — Mesa <strong>${activeTableId}</strong>.`);
    addToast(`Conta pedida — ${activeTableId}`,"#F7D44A");
  };

  // Payment confirmed
  const handlePayment=(payData)=>{
    if(!activeOrderId) return;
    const total=orderTotal(orders[activeOrderId].items);
    addLog("ACTION",`Pagamento — Mesa <strong>${activeTableId}</strong> — ${fmtEur(total)} — ${payData.method}${payData.split>1?` (dividido por ${payData.split})`:""}. Turno encerrado.`);
    addToast(`Pagamento — ${activeTableId} — ${fmtEur(total)}`,T.success);
    setOrders(p=>({...p,[activeOrderId]:{...p[activeOrderId],paid:true,paidAt:Date.now(),payMethod:payData.method}}));
    setTables(p=>p.map(t=>{
      if(t.id!==activeTableId) return t;
      // Remove temp tables (take-away/balcao), reset real tables
      return {id:t.id,zone:t.zone,seats:t.seats,status:"free",waiter:null,orderId:null,since:null};
    }).filter(t=>!t.id.startsWith("TA")&&!t.id.startsWith("BC")));
    setActiveTableId(null);
    setScreen("floor");
  };

  // Cancel line
  const handleCancelLine=(lineId,motivo)=>{
    if(!activeOrderId) return;
    const line=orders[activeOrderId].items.find(l=>l.lineId===lineId);
    setOrders(p=>({...p,[activeOrderId]:{...p[activeOrderId],items:p[activeOrderId].items.map(l=>l.lineId===lineId?{...l,cancelled:true}:l)}}));
    addLog("CANCEL",`Item <strong>${line?.name}</strong> anulado — Mesa <strong>${activeTableId}</strong>.`,motivo);
    addToast(`Item anulado — ${line?.name}`,T.danger);
  };

  // Transfer
  const handleTransfer=(staffId)=>{
    if(!activeOrderId) return;
    const newStaff=STAFF.find(s=>s.id===staffId);
    setOrders(p=>({...p,[activeOrderId]:{...p[activeOrderId],waiterId:staffId}}));
    setTables(p=>p.map(t=>t.id===activeTableId?{...t,waiter:staffId}:t));
    addLog("ACTION",`Mesa <strong>${activeTableId}</strong> transferida para <strong>${newStaff?.name}</strong> por ${CURRENT_STAFF.name}.`);
    addToast(`Mesa ${activeTableId} → ${newStaff?.name}`,T.teal);
    setActiveTableId(null);
    setScreen("floor");
  };

  return(
    <>
      <style>{CSS}</style>
      <div className="pos-root">
        {/* TOPBAR (not on fundo screen) */}
        {screen!=="fundo"&&(
          <header className="topbar">
            <div className="topbar-logo">
              <div className="topbar-dot"/>
              POS
            </div>
            <div className="topbar-sep"/>
            <div className="topbar-staff">
              <div className="staff-avatar">{CURRENT_STAFF.initials}</div>
              {CURRENT_STAFF.name}
              <span style={{fontSize:10,color:T.textMuted}}>· Fundo {fmtEur(fundoValue)}</span>
            </div>
            <div className="topbar-right">
              <button className="btn btn-ghost btn-sm" onClick={()=>{if(screen==="order"){setActiveTableId(null);setScreen("floor");}}} style={{display:screen==="order"?"flex":"none"}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                Mesas
              </button>
              <Clock/>
            </div>
          </header>
        )}

        {/* KDS NOTIF */}
        <KDSNotifBanner notif={kdsNotif} onClose={()=>setKdsNotif(null)}/>

        {/* SCREEN */}
        {screen==="fundo"&&(
          <FundoManeioScreen onConfirm={(v)=>{setFundoValue(v);addLog("INFO",`Turno iniciado — Fundo ${fmtEur(v)} — ${CURRENT_STAFF.name}.`);setScreen("floor");}}/>
        )}
        {screen==="floor"&&(
          <FloorScreen tables={tables} orders={orders} onTablePress={handleTablePress} onQuickOrder={handleQuickOrder}/>
        )}
        {screen==="order"&&activeTable&&activeOrder&&(
          <OrderScreen
            table={activeTable}
            order={activeOrder}
            menuStock={menuStock}
            onBack={()=>{setActiveTableId(null);setScreen("floor");}}
            onUpdateOrder={handleUpdateOrder}
            onSendKitchen={handleSendKitchen}
            onRequestBill={handleRequestBill}
            onPayment={handlePayment}
            onCancelLine={handleCancelLine}
            onTransfer={handleTransfer}
            addToast={addToast}
            addLog={addLog}
          />
        )}
      </div>

      <Toasts toasts={toasts}/>
    </>
  );
}
