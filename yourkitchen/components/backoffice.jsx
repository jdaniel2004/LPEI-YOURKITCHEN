import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

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
const WEEK_DATA = [
  {day:"Seg",revenue:1240,orders:38},{day:"Ter",revenue:980,orders:31},
  {day:"Qua",revenue:1560,orders:47},{day:"Qui",revenue:1890,orders:54},
  {day:"Sex",revenue:2340,orders:68},{day:"Sáb",revenue:2870,orders:82},{day:"Dom",revenue:2100,orders:61},
];
const HOUR_DATA = [
  {h:"9h",v:80},{h:"10h",v:120},{h:"11h",v:200},{h:"12h",v:480},{h:"13h",v:620},
  {h:"14h",v:540},{h:"15h",v:290},{h:"16h",v:180},{h:"17h",v:310},{h:"18h",v:420},
  {h:"19h",v:680},{h:"20h",v:890},{h:"21h",v:960},{h:"22h",v:740},{h:"23h",v:380},
];
const PAY_DATA = [
  {method:"Cartão",pct:58,color:T.accent},{method:"Numerário",pct:25,color:T.teal},
  {method:"MB Way",pct:14,color:T.warning},{method:"Multibanco",pct:3,color:T.textSec},
];
const TOP_ITEMS = [
  {name:"Bacalhau à Brás",qty:127,revenue:1714.50},
  {name:"Bife do Lombo",qty:89,revenue:1646.50},
  {name:"Francesinha",qty:115,revenue:1380.00},
  {name:"Polvo Grelhado",qty:68,revenue:1088.00},
  {name:"Galão",qty:203,revenue:284.20},
];
const MENU_CATS = ["Entradas","Sopas","Principais","Grelhados","Bebidas","Sobremesas"];
const INIT_ITEMS = [
  {id:"it01",cat:"Entradas",name:"Pão + Manteiga",price:2.50,vat:6,emoji:"🍞",stock:null,active:true},
  {id:"it02",cat:"Entradas",name:"Chouriço Assado",price:6.50,vat:23,emoji:"🌭",stock:null,active:true},
  {id:"it03",cat:"Entradas",name:"Tabua de Queijos",price:9.50,vat:23,emoji:"🧀",stock:6,active:true},
  {id:"it04",cat:"Entradas",name:"Amêijoas à Bulhão Pato",price:13.50,vat:23,emoji:"🦪",stock:4,active:true},
  {id:"it10",cat:"Sopas",name:"Sopa do Dia",price:4.00,vat:6,emoji:"🥣",stock:null,active:true},
  {id:"it11",cat:"Sopas",name:"Caldo Verde",price:4.50,vat:6,emoji:"🥬",stock:null,active:true},
  {id:"it20",cat:"Principais",name:"Bacalhau à Brás",price:13.50,vat:23,emoji:"🐟",stock:8,active:true},
  {id:"it21",cat:"Principais",name:"Francesinha",price:12.00,vat:23,emoji:"🥪",stock:null,active:true},
  {id:"it22",cat:"Principais",name:"Risotto de Cogumelos",price:11.50,vat:23,emoji:"🍄",stock:5,active:true},
  {id:"it23",cat:"Principais",name:"Alheira com Ovos",price:10.50,vat:23,emoji:"🥚",stock:null,active:false},
  {id:"it30",cat:"Grelhados",name:"Bife do Lombo",price:18.50,vat:23,emoji:"🥩",stock:null,active:true},
  {id:"it31",cat:"Grelhados",name:"Polvo Grelhado",price:16.00,vat:23,emoji:"🐙",stock:4,active:true},
  {id:"it32",cat:"Grelhados",name:"Frango no Churrasco",price:11.00,vat:23,emoji:"🍗",stock:null,active:true},
  {id:"it40",cat:"Bebidas",name:"Água Natural 0.5L",price:1.20,vat:23,emoji:"💧",stock:null,active:true},
  {id:"it42",cat:"Bebidas",name:"Cerveja Imperial",price:2.20,vat:23,emoji:"🍺",stock:null,active:true},
  {id:"it43",cat:"Bebidas",name:"Vinho Tinto (copo)",price:3.50,vat:23,emoji:"🍷",stock:null,active:true},
  {id:"it44",cat:"Bebidas",name:"Galão",price:1.40,vat:6,emoji:"☕",stock:null,active:true},
  {id:"it50",cat:"Sobremesas",name:"Pastel de Nata",price:1.50,vat:6,emoji:"🥧",stock:null,active:true},
  {id:"it51",cat:"Sobremesas",name:"Arroz Doce",price:4.00,vat:6,emoji:"🍚",stock:null,active:true},
  {id:"it52",cat:"Sobremesas",name:"Tarte de Amêndoa",price:5.50,vat:6,emoji:"🎂",stock:3,active:true},
];
const INIT_STAFF = [
  {id:"s1",name:"Sofia",role:"waiter",pin:"1234",active:true,since:"Jan 2025"},
  {id:"s2",name:"João",role:"waiter",pin:"5678",active:true,since:"Mar 2025"},
  {id:"s3",name:"Mariana",role:"waiter",pin:"9012",active:true,since:"Set 2024"},
  {id:"s4",name:"Rui",role:"kitchen",pin:"3456",active:true,since:"Fev 2025"},
  {id:"s5",name:"Carlos",role:"waiter",pin:"7890",active:false,since:"Nov 2024"},
];
const INIT_TABLES = [
  {id:"M1",zone:"Interior",seats:4,status:"occupied"},{id:"M2",zone:"Interior",seats:2,status:"free"},
  {id:"M3",zone:"Interior",seats:4,status:"bill"},{id:"M4",zone:"Interior",seats:6,status:"occupied"},
  {id:"M5",zone:"Interior",seats:2,status:"locked"},{id:"M6",zone:"Interior",seats:4,status:"free"},
  {id:"M7",zone:"Interior",seats:8,status:"reserved"},{id:"M8",zone:"Interior",seats:4,status:"free"},
  {id:"E1",zone:"Esplanada",seats:4,status:"occupied"},{id:"E2",zone:"Esplanada",seats:4,status:"free"},
  {id:"E3",zone:"Esplanada",seats:2,status:"free"},{id:"E4",zone:"Esplanada",seats:6,status:"free"},
  {id:"B1",zone:"Bar",seats:0,status:"occupied"},{id:"B2",zone:"Bar",seats:0,status:"free"},
];
let _rid=10;
const INIT_RESERVATIONS = [
  {id:"R001",name:"Família Santos",phone:"912 345 678",date:"2026-05-18",time:"20:30",persons:6,tableId:"M7",notes:"Aniversário",status:"confirmed"},
  {id:"R002",name:"João Pereira",phone:"965 432 187",date:"2026-05-18",time:"21:00",persons:2,tableId:"M2",notes:"",status:"confirmed"},
  {id:"R003",name:"Ana Costa",phone:"934 567 890",date:"2026-05-19",time:"13:00",persons:4,tableId:"M4",notes:"Vegetariano",status:"pending"},
  {id:"R004",name:"Pedro Lopes",phone:"910 000 123",date:"2026-05-20",time:"20:00",persons:8,tableId:"M7",notes:"Mesa junto à janela",status:"pending"},
];
const INIT_CAMPAIGNS = [
  {id:"C001",name:"Happy Hour",type:"percent",value:20,target:"cat",targetLabel:"Bebidas",days:[1,2,3,4,5],start:"17:00",end:"19:00",active:true},
  {id:"C002",name:"Menu do Dia",type:"fixed",value:2.00,target:"cat",targetLabel:"Principais",days:[1,2,3,4,5],start:"12:00",end:"15:00",active:true},
  {id:"C003",name:"Desconto Fim de Semana",type:"percent",value:10,target:"all",targetLabel:"Tudo",days:[6,7],start:"00:00",end:"23:59",active:false},
];
const INIT_ORDER_HIST = [
  {id:"H001",table:"M4",waiter:"Sofia",items:5,total:65.50,method:"Cartão",time:"21:42",date:"Hoje",lines:["2× Bacalhau à Brás","2× Vinho Tinto","1× Arroz Doce"]},
  {id:"H002",table:"E1",waiter:"Mariana",items:3,total:38.20,method:"MB Way",time:"21:15",date:"Hoje",lines:["1× Polvo Grelhado","2× Cerveja Imperial","1× Sopa do Dia"]},
  {id:"H003",table:"M1",waiter:"Sofia",items:4,total:52.00,method:"Numerário",time:"20:58",date:"Hoje",lines:["1× Bife do Lombo","1× Francesinha","2× Água Natural"]},
  {id:"H004",table:"B1",waiter:"Rui",items:2,total:14.40,method:"Cartão",time:"20:30",date:"Hoje",lines:["4× Galão","4× Pastel de Nata"]},
  {id:"H005",table:"M7",waiter:"João",items:8,total:127.80,method:"Cartão",time:"22:10",date:"Ontem",lines:["3× Bife do Lombo","3× Vinho Tinto","2× Tarte de Amêndoa"]},
  {id:"H006",table:"E3",waiter:"Mariana",items:3,total:29.00,method:"Numerário",time:"13:45",date:"Ontem",lines:["2× Alheira com Ovos","1× Caldo Verde"]},
];
const INIT_LOGS = [
  {id:1,level:"INFO",module:"POS",time:"09:00:12",msg:"Turno iniciado — Sofia — Fundo €100.00"},
  {id:2,level:"INFO",module:"POS",time:"09:14:33",msg:"Novo pedido — Mesa M1 — Sofia"},
  {id:3,level:"ACTION",module:"POS",time:"09:15:01",msg:"Pedido enviado cozinha — Mesa M1"},
  {id:4,level:"INFO",module:"KDS",time:"09:22:18",msg:"Ticket #T001 → Em Preparação"},
  {id:5,level:"ACTION",module:"KDS",time:"09:35:44",msg:"Ticket #T001 → Pronto"},
  {id:6,level:"CANCEL",module:"KDS",time:"09:36:12",msg:"Item Sopa do Dia anulado — Mesa M1",comment:"Cliente desistiu"},
  {id:7,level:"ACTION",module:"POS",time:"10:02:55",msg:"Pagamento — Mesa M1 — €52.00 — Numerário"},
  {id:8,level:"WARN",module:"POS",time:"11:14:08",msg:"Stock baixo — Polvo Grelhado (2 restantes)"},
  {id:9,level:"INFO",module:"POS",time:"11:45:22",msg:"Mesa M3 — Conta pedida — João"},
  {id:10,level:"ACTION",module:"POS",time:"12:01:38",msg:"Mesa M4 transferida para Mariana por Sofia"},
  {id:11,level:"ERROR",module:"KDS",time:"14:22:05",msg:"Ligação Supabase perdida — reconectando..."},
  {id:12,level:"INFO",module:"KDS",time:"14:22:09",msg:"Ligação Supabase restabelecida"},
];
const INIT_SETTINGS = {
  geral:{name:"RestaurantOS",address:"Rua das Flores 42, Lisboa",phone:"213 456 789",email:"geral@restaurantos.pt"},
  fiscal:{nif:"512345678",regime:"normal",rates:[{id:"r1",label:"Reduzida",value:6,active:true},{id:"r2",label:"Intermédia",value:13,active:true},{id:"r3",label:"Normal",value:23,active:true}]},
  kds:{alertYellow:5,alertRed:12,autoRefresh:3},
  caixa:{defaultFundo:100,maxTurno:12,confirmAbertura:true},
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtEur(v){return `€${Number(v).toFixed(2)}`;}
const DAYS_PT=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const STATUS_C={
  free:{label:"Livre",c:T.success,bg:T.successDim},
  occupied:{label:"Ocupada",c:T.warning,bg:T.warningDim},
  bill:{label:"Conta",c:"#F7D44A",bg:"#F7D44A18"},
  reserved:{label:"Reserva",c:T.purple,bg:T.purpleDim},
  locked:{label:"Em Uso",c:T.blue,bg:T.blueDim},
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
.sb-collapse{width:100%;display:flex;align-items:center;justify-content:center;padding:8px;background:none;border:1px solid ${T.border};border-radius:6px;color:${T.textMuted};cursor:pointer;transition:all .15s;margin-top:6px;}
.sb-collapse:hover{border-color:${T.borderBright};color:${T.text};}

/* MAIN */
.bo-main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.bo-topbar{height:52px;border-bottom:1px solid ${T.border};display:flex;align-items:center;padding:0 20px;gap:12px;background:${T.surface};flex-shrink:0;}
.bo-section-title{font-size:16px;font-weight:700;}
.bo-topbar-right{margin-left:auto;display:flex;align-items:center;gap:8px;}
.bo-content{flex:1;overflow-y:auto;padding:20px;animation:fadeIn .2s;}

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
};

const TOOLTIP_STYLE={background:T.elevated,border:`1px solid ${T.border}`,borderRadius:8,fontFamily:"'DM Mono',monospace",fontSize:12,color:T.text};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard(){
  const kpis=[
    {label:"Vendas Hoje",value:fmtEur(2840.20),sub:"vs €2,100 ontem",trend:"+35%",up:true,color:T.success},
    {label:"Pedidos Hoje",value:"68",sub:"vs 61 ontem",trend:"+11%",up:true,color:T.accent},
    {label:"Ticket Médio",value:fmtEur(41.77),sub:"vs €34.43 ontem",trend:"+21%",up:true,color:T.teal},
    {label:"Mesas Ocupadas",value:"5/14",sub:"Interior + Esplanada",trend:"36%",up:null,color:T.warning},
  ];
  const recentOrders=INIT_ORDER_HIST.slice(0,4);
  const onShift=INIT_STAFF.filter(s=>s.active&&s.id!=="s5");
  return(
    <div>
      <div className="kpi-grid">
        {kpis.map(k=>(
          <div key={k.label} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{color:k.color}}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
            {k.up!==null&&<div className="kpi-trend"style={{color:k.up?T.success:T.danger,background:k.up?T.successDim:T.dangerDim}}>{k.up?"↑":"↓"} {k.trend}</div>}
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-head"><div className="card-title">Receita — últimos 7 dias</div></div>
          <div className="card-body">
            <ResponsiveContainer width="100%"height={180}>
              <BarChart data={WEEK_DATA} barSize={24}>
                <CartesianGrid strokeDasharray="3 3"stroke={T.border}vertical={false}/>
                <XAxis dataKey="day"tick={{fill:T.textMuted,fontSize:11,fontFamily:"'DM Mono',monospace"}}axisLine={false}tickLine={false}/>
                <YAxis tick={{fill:T.textMuted,fontSize:10,fontFamily:"'DM Mono',monospace"}}axisLine={false}tickLine={false}tickFormatter={v=>`€${v}`}width={45}/>
                <Tooltip contentStyle={TOOLTIP_STYLE}formatter={v=>[fmtEur(v),"Receita"]}/>
                <Bar dataKey="revenue"fill={T.accent}radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="card">
            <div className="card-head"><div className="card-title">Pedidos Recentes</div></div>
            <table className="data-table">
              <tbody>
                {recentOrders.map(o=>(
                  <tr key={o.id}>
                    <td><span style={{fontWeight:700}}>{o.table}</span></td>
                    <td style={{color:T.textSec,fontSize:12}}>{o.waiter}</td>
                    <td><span className="mono"style={{color:T.accent}}>{fmtEur(o.total)}</span></td>
                    <td><Badge color={T.textSec}bg={T.elevated}>{o.time}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">Equipa em Turno</div></div>
            <div className="card-body"style={{display:"flex",gap:10,flexWrap:"wrap",padding:"12px 16px"}}>
              {onShift.map(s=>(
                <div key={s.id}style={{display:"flex",alignItems:"center",gap:8,background:T.elevated,borderRadius:8,padding:"6px 12px",border:`1px solid ${T.border}`}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:T.accentDim,border:`1px solid ${T.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:T.accent}}>{s.name.slice(0,2).toUpperCase()}</div>
                  <div><div style={{fontSize:12,fontWeight:600}}>{s.name}</div><div style={{fontSize:10,color:T.textMuted}}>{s.role}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">Estado das Mesas — Live <span className="live-dot"style={{marginLeft:6}}/></div></div>
        <div className="card-body"style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))",gap:8}}>
          {INIT_TABLES.map(t=>{const st=STATUS_C[t.status];return(
            <div key={t.id}style={{background:st.bg,border:`1px solid ${st.c}33`,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:800,color:st.c}}>{t.id}</div>
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
  const periods=["hoje","7d","30d"];
  const periodLabel={"hoje":"Hoje","7d":"7 Dias","30d":"30 Dias"};
  const maxItem=Math.max(...TOP_ITEMS.map(i=>i.revenue));
  const exportCSV=()=>{
    const rows=[["Item","Qtd","Receita"],...TOP_ITEMS.map(i=>[i.name,i.qty,i.revenue])];
    const csv=rows.map(r=>r.join(",")).join("\n");
    const a=document.createElement("a");
    a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download="analytics.csv";a.click();
  };
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{display:"flex",gap:6}}>
          {periods.map(p=><button key={p}className={`filter-chip${period===p?" active":""}`}onClick={()=>setPeriod(p)}>{periodLabel[p]}</button>)}
        </div>
        <button className="btn btn-ghost"onClick={exportCSV}><Ic.Export/>Exportar CSV</button>
      </div>
      <div className="kpi-grid">
        {[
          {label:"Total Receita",value:fmtEur(period==="hoje"?2840:period==="7d"?12980:49200),color:T.success},
          {label:"Pedidos",value:period==="hoje"?"68":period==="7d"?"381":"1420",color:T.accent},
          {label:"Ticket Médio",value:fmtEur(period==="hoje"?41.77:period==="7d"?34.07:34.65),color:T.teal},
          {label:"Itens Vendidos",value:period==="hoje"?"284":period==="7d"?"1540":"5900",color:T.warning},
        ].map(k=>(
          <div key={k.label}className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value"style={{color:k.color,fontSize:22}}>{k.value}</div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-head"><div className="card-title">Receita por hora</div></div>
          <div className="card-body">
            <ResponsiveContainer width="100%"height={180}>
              <LineChart data={HOUR_DATA}>
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
            {PAY_DATA.map(p=>(
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
      <div className="card">
        <div className="card-head"><div className="card-title">Top 5 Itens</div></div>
        <div className="card-body"style={{display:"flex",flexDirection:"column",gap:12}}>
          {TOP_ITEMS.map((item,i)=>(
            <div key={item.name}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                <span><span style={{color:T.textMuted,marginRight:8,fontFamily:"'DM Mono',monospace"}}>#{i+1}</span><span style={{fontWeight:600}}>{item.name}</span></span>
                <span className="mono"style={{color:T.accent}}>{fmtEur(item.revenue)} <span style={{color:T.textMuted}}>({item.qty} un)</span></span>
              </div>
              <div style={{background:T.border,borderRadius:4,height:6}}>
                <div style={{background:T.accent,width:`${(item.revenue/maxItem)*100}%`,height:"100%",borderRadius:4}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MENU & STOCK ─────────────────────────────────────────────────────────────
function MenuStock(){
  const [items,setItems]=useState(INIT_ITEMS);
  const [activeCat,setActiveCat]=useState("Todas");
  const [editItem,setEditItem]=useState(null);
  const [form,setForm]=useState({});
  const cats=["Todas",...MENU_CATS];
  const filtered=activeCat==="Todas"?items:items.filter(i=>i.cat===activeCat);

  const openEdit=(item)=>{setForm({...item,stock:item.stock===null?"":item.stock});setEditItem(item.id);};
  const openNew=()=>{setForm({id:`it${Date.now()}`,cat:MENU_CATS[0],name:"",price:"",vat:23,emoji:"🍽️",stock:"",active:true});setEditItem("new");};
  const saveItem=()=>{
    const item={...form,price:parseFloat(form.price)||0,vat:parseInt(form.vat)||23,stock:form.stock===""?null:parseInt(form.stock)||0};
    if(editItem==="new")setItems(p=>[...p,item]);
    else setItems(p=>p.map(i=>i.id===editItem?item:i));
    setEditItem(null);
  };
  const toggleActive=(id)=>setItems(p=>p.map(i=>i.id===id?{...i,active:!i.active}:i));
  const updateStock=(id,delta)=>setItems(p=>p.map(i=>{
    if(i.id!==id||i.stock===null) return i;
    return {...i,stock:Math.max(0,i.stock+delta)};
  }));

  return(
    <div style={{display:"flex",gap:0,height:"100%",margin:"-20px"}}>
      {/* Category sidebar */}
      <div style={{width:160,background:T.surface,borderRight:`1px solid ${T.border}`,padding:"12px 8px",flexShrink:0}}>
        {cats.map(c=>(
          <div key={c}onClick={()=>setActiveCat(c)}style={{padding:"9px 12px",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:600,color:activeCat===c?T.accent:T.textSec,background:activeCat===c?T.accentDim:"transparent",marginBottom:2,transition:"all .12s"}}>
            {c}
            <span style={{marginLeft:6,fontSize:10,color:T.textMuted}}>({c==="Todas"?items.length:items.filter(i=>i.cat===c).length})</span>
          </div>
        ))}
      </div>
      {/* Items */}
      <div style={{flex:1,overflow:"auto",padding:20}}>
        <div className="section-head">
          <div className="section-h">{activeCat} — {filtered.length} itens</div>
          <button className="btn btn-solid"onClick={openNew}><Ic.Plus/>Novo Item</button>
        </div>
        <table className="data-table">
          <thead><tr>
            <th>Item</th><th>Categoria</th><th>Preço</th><th>IVA</th><th>Stock</th><th>Estado</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.map(item=>(
              <tr key={item.id}>
                <td><span style={{fontSize:18,marginRight:8}}>{item.emoji}</span><span style={{fontWeight:600}}>{item.name}</span></td>
                <td><Badge color={T.textSec}bg={T.elevated}>{item.cat}</Badge></td>
                <td><span className="mono"style={{color:T.accent}}>{fmtEur(item.price)}</span></td>
                <td><span className="mono"style={{color:T.textMuted}}>{item.vat}%</span></td>
                <td>
                  {item.stock===null?<span style={{color:T.textMuted,fontSize:11}}>—</span>:(
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
          <div className="modal"style={{width:480}}onClick={e=>e.stopPropagation()}>
            <div className="modal-hd"><div><div className="modal-title">{editItem==="new"?"Novo Item":"Editar Item"}</div></div><CloseBtn onClick={()=>setEditItem(null)}/></div>
            <div className="modal-body">
              <div className="form-row"><Inp label="Nome"value={form.name||""}onChange={e=>setForm(p=>({...p,name:e.target.value}))}/><Inp label="Emoji"value={form.emoji||""}onChange={e=>setForm(p=>({...p,emoji:e.target.value}))}/></div>
              <div className="form-row">
                <Sel label="Categoria"value={form.cat||""}onChange={e=>setForm(p=>({...p,cat:e.target.value}))}>{MENU_CATS.map(c=><option key={c}value={c}>{c}</option>)}</Sel>
                <Sel label="IVA"value={form.vat||23}onChange={e=>setForm(p=>({...p,vat:e.target.value}))}><option value={6}>6%</option><option value={13}>13%</option><option value={23}>23%</option></Sel>
              </div>
              <div className="form-row"><Inp label="Preço (€)"type="number"step="0.01"value={form.price||""}onChange={e=>setForm(p=>({...p,price:e.target.value}))}/><Inp label="Stock (vazio = sem tracking)"type="number"value={form.stock===undefined?"":form.stock}onChange={e=>setForm(p=>({...p,stock:e.target.value}))}/></div>
              <div style={{display:"flex",alignItems:"center",gap:10}}><Toggle on={!!form.active}onChange={v=>setForm(p=>({...p,active:v}))}/><span style={{fontSize:13,color:T.textSec}}>Item activo no POS</span></div>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost"onClick={()=>setEditItem(null)}>Cancelar</button><button className="btn btn-solid"onClick={saveItem}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TABLES MGMT ─────────────────────────────────────────────────────────────
function TablesMgmt(){
  const [tables,setTables]=useState(INIT_TABLES);
  const [zone,setZone]=useState("Interior");
  const [editTable,setEditTable]=useState(null);
  const [stateModal,setStateModal]=useState(null);
  const [newStatus,setNewStatus]=useState("");
  const [comment,setComment]=useState("");
  const zones=["Interior","Esplanada","Bar"];
  const filtered=tables.filter(t=>t.zone===zone);

  const saveStateChange=()=>{
    setTables(p=>p.map(t=>t.id===stateModal.id?{...t,status:newStatus}:t));
    setStateModal(null);setComment("");
  };

  return(
    <div>
      <div className="section-head">
        <div style={{display:"flex",gap:6}}>
          {zones.map(z=><button key={z}className={`filter-chip${zone===z?" active":""}`}onClick={()=>setZone(z)}>{z} ({tables.filter(t=>t.zone===z).length})</button>)}
        </div>
        <button className="btn btn-solid"onClick={()=>setEditTable({id:"",zone,seats:4,status:"free"})}><Ic.Plus/>Nova Mesa</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
        {filtered.map(t=>{const st=STATUS_C[t.status];return(
          <div key={t.id}className="card"style={{border:`1px solid ${st.c}33`}}>
            <div style={{padding:"14px 14px 10px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontSize:20,fontWeight:800,color:st.c}}>{t.id}</div>
                <Badge color={st.c}bg={st.bg}>{st.label}</Badge>
              </div>
              {t.seats>0&&<div style={{fontSize:11,color:T.textMuted,marginBottom:10}}>{t.seats} lugares · {t.zone}</div>}
              <div style={{display:"flex",gap:6}}>
                <button className="btn btn-ghost btn-sm"style={{flex:1}}onClick={()=>{setStateModal(t);setNewStatus(t.status);}}>Estado</button>
                <button className="btn btn-ghost btn-icon btn-sm"onClick={()=>setEditTable(t)}><Ic.Edit/></button>
                <button className="btn btn-danger btn-icon btn-sm"onClick={()=>setTables(p=>p.filter(x=>x.id!==t.id))}><Ic.Trash/></button>
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
            <div className="modal-hd"><div className="modal-title">{editTable.id?"Editar Mesa":"Nova Mesa"}</div><CloseBtn onClick={()=>setEditTable(null)}/></div>
            <div className="modal-body">
              <div className="form-row">
                <Inp label="ID da Mesa"value={editTable.id}onChange={e=>setEditTable(p=>({...p,id:e.target.value}))}placeholder="M9"/>
                <Inp label="Lugares"type="number"value={editTable.seats}onChange={e=>setEditTable(p=>({...p,seats:parseInt(e.target.value)||0}))}/>
              </div>
              <Sel label="Zona"value={editTable.zone}onChange={e=>setEditTable(p=>({...p,zone:e.target.value}))}>{["Interior","Esplanada","Bar"].map(z=><option key={z}>{z}</option>)}</Sel>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost"onClick={()=>setEditTable(null)}>Cancelar</button>
              <button className="btn btn-solid"onClick={()=>{if(!editTable.id)return;const exists=tables.find(t=>t.id===editTable.id);if(exists)setTables(p=>p.map(t=>t.id===editTable.id?editTable:t));else setTables(p=>[...p,editTable]);setEditTable(null);}}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STAFF ────────────────────────────────────────────────────────────────────
function StaffMgmt(){
  const [staff,setStaff]=useState(INIT_STAFF);
  const [editStaff,setEditStaff]=useState(null);
  const [form,setForm]=useState({});
  const openEdit=(s)=>{setForm({...s});setEditStaff(s.id);};
  const openNew=()=>{setForm({id:`s${Date.now()}`,name:"",role:"waiter",pin:"",active:true,since:"Mai 2026"});setEditStaff("new");};
  const save=()=>{if(editStaff==="new")setStaff(p=>[...p,form]);else setStaff(p=>p.map(s=>s.id===editStaff?form:s));setEditStaff(null);};
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
                <td><div style={{display:"flex",alignItems:"center",gap:8}}><Toggle on={s.active}onChange={v=>setStaff(p=>p.map(x=>x.id===s.id?{...x,active:v}:x))}/><span style={{fontSize:11,color:s.active?T.success:T.textMuted}}>{s.active?"Activo":"Inactivo"}</span></div></td>
                <td><div style={{display:"flex",gap:4}}><button className="btn btn-ghost btn-icon btn-sm"onClick={()=>openEdit(s)}><Ic.Edit/></button><button className="btn btn-danger btn-icon btn-sm"onClick={()=>setStaff(p=>p.filter(x=>x.id!==s.id))}><Ic.Trash/></button></div></td>
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
              <div className="form-row">
                <Sel label="Função"value={form.role||"waiter"}onChange={e=>setForm(p=>({...p,role:e.target.value}))}><option value="waiter">Waiter</option><option value="kitchen">Cozinha</option><option value="manager">Gestor</option></Sel>
                <Inp label="PIN (4 dígitos)"type="password"maxLength={4}value={form.pin||""}onChange={e=>setForm(p=>({...p,pin:e.target.value}))}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginTop:4}}><Toggle on={!!form.active}onChange={v=>setForm(p=>({...p,active:v}))}/><span style={{fontSize:13,color:T.textSec}}>Activo</span></div>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost"onClick={()=>setEditStaff(null)}>Cancelar</button><button className="btn btn-solid"onClick={save}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RESERVATIONS ─────────────────────────────────────────────────────────────
function Reservations(){
  const [reservas,setReservas]=useState(INIT_RESERVATIONS);
  const [editR,setEditR]=useState(null);
  const [form,setForm]=useState({});
  const openNew=()=>{setForm({id:`R${++_rid}`,name:"",phone:"",date:"2026-05-18",time:"20:00",persons:2,tableId:"",notes:"",status:"pending"});setEditR("new");};
  const save=()=>{if(editR==="new")setReservas(p=>[...p,form]);else setReservas(p=>p.map(r=>r.id===editR?form:r));setEditR(null);};
  const toggleStatus=(id)=>setReservas(p=>p.map(r=>r.id===id?{...r,status:r.status==="confirmed"?"pending":"confirmed"}:r));
  const sorted=[...reservas].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  return(
    <div>
      <div className="section-head"><div className="section-h">{reservas.length} reservas</div><button className="btn btn-solid"onClick={openNew}><Ic.Plus/>Nova Reserva</button></div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Data / Hora</th><th>Pessoas</th><th>Mesa</th><th>Notas</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {sorted.map(r=>(
              <tr key={r.id}>
                <td><div style={{fontWeight:600}}>{r.name}</div><div style={{fontSize:11,color:T.textMuted}}>{r.phone}</div></td>
                <td><span className="mono"style={{color:T.text}}>{r.date}</span><span style={{marginLeft:8,color:T.accent,fontWeight:700}}>{r.time}</span></td>
                <td><span className="mono">{r.persons}</span></td>
                <td><Badge color={T.accent}bg={T.accentDim}>{r.tableId||"—"}</Badge></td>
                <td style={{color:T.textSec,fontSize:12,maxWidth:140}}>{r.notes||"—"}</td>
                <td><div onClick={()=>toggleStatus(r.id)}style={{cursor:"pointer"}}><Badge color={r.status==="confirmed"?T.success:T.warning}bg={r.status==="confirmed"?T.successDim:T.warningDim}>{r.status==="confirmed"?"Confirmada":"Pendente"}</Badge></div></td>
                <td><div style={{display:"flex",gap:4}}><button className="btn btn-ghost btn-icon btn-sm"onClick={()=>{setForm({...r});setEditR(r.id);}}><Ic.Edit/></button><button className="btn btn-danger btn-icon btn-sm"onClick={()=>setReservas(p=>p.filter(x=>x.id!==r.id))}><Ic.Trash/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editR&&(
        <div className="overlay"onClick={()=>setEditR(null)}>
          <div className="modal"style={{width:460}}onClick={e=>e.stopPropagation()}>
            <div className="modal-hd"><div className="modal-title">{editR==="new"?"Nova Reserva":"Editar Reserva"}</div><CloseBtn onClick={()=>setEditR(null)}/></div>
            <div className="modal-body">
              <div className="form-row"><Inp label="Nome"value={form.name||""}onChange={e=>setForm(p=>({...p,name:e.target.value}))}/><Inp label="Telefone"value={form.phone||""}onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/></div>
              <div className="form-row"><Inp label="Data"type="date"value={form.date||""}onChange={e=>setForm(p=>({...p,date:e.target.value}))}/><Inp label="Hora"type="time"value={form.time||""}onChange={e=>setForm(p=>({...p,time:e.target.value}))}/></div>
              <div className="form-row"><Inp label="Nº Pessoas"type="number"value={form.persons||""}onChange={e=>setForm(p=>({...p,persons:e.target.value}))}/><Inp label="Mesa"value={form.tableId||""}onChange={e=>setForm(p=>({...p,tableId:e.target.value}))}placeholder="M7"/></div>
              <Inp label="Notas"value={form.notes||""}onChange={e=>setForm(p=>({...p,notes:e.target.value}))}placeholder="Alergias, preferências..."/>
              <Sel label="Estado"value={form.status||"pending"}onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option value="pending">Pendente</option><option value="confirmed">Confirmada</option></Sel>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost"onClick={()=>setEditR(null)}>Cancelar</button><button className="btn btn-solid"onClick={save}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CAMPAIGNS ───────────────────────────────────────────────────────────────
function Campaigns(){
  const [camps,setCamps]=useState(INIT_CAMPAIGNS);
  const [editC,setEditC]=useState(null);
  const [form,setForm]=useState({});
  const toggleDay=(d)=>setForm(p=>({...p,days:p.days.includes(d)?p.days.filter(x=>x!==d):[...p.days,d].sort()}));
  const save=()=>{if(editC==="new")setCamps(p=>[...p,form]);else setCamps(p=>p.map(c=>c.id===editC?form:c));setEditC(null);};
  return(
    <div>
      <div className="section-head"><div className="section-h">{camps.length} campanhas</div><button className="btn btn-solid"onClick={()=>{setForm({id:`C${Date.now()}`,name:"",type:"percent",value:0,target:"all",targetLabel:"Tudo",days:[],start:"00:00",end:"23:59",active:true});setEditC("new");}}><Ic.Plus/>Nova Campanha</button></div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Desconto</th><th>Alvo</th><th>Dias</th><th>Horário</th><th>Activa</th><th></th></tr></thead>
          <tbody>
            {camps.map(c=>(
              <tr key={c.id}>
                <td style={{fontWeight:600}}>{c.name}</td>
                <td><span style={{color:T.warning,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{c.type==="percent"?`${c.value}%`:`-€${c.value.toFixed(2)}`}</span></td>
                <td><Badge color={T.teal}bg={T.tealDim}>{c.targetLabel}</Badge></td>
                <td><span style={{fontSize:11,color:T.textSec}}>{c.days.map(d=>DAYS_PT[d%7]).join(", ")||"—"}</span></td>
                <td><span className="mono"style={{fontSize:11,color:T.textMuted}}>{c.start}–{c.end}</span></td>
                <td><div style={{display:"flex",alignItems:"center",gap:8}}><Toggle on={c.active}onChange={v=>setCamps(p=>p.map(x=>x.id===c.id?{...x,active:v}:x))}/></div></td>
                <td><div style={{display:"flex",gap:4}}><button className="btn btn-ghost btn-icon btn-sm"onClick={()=>{setForm({...c});setEditC(c.id);}}><Ic.Edit/></button><button className="btn btn-danger btn-icon btn-sm"onClick={()=>setCamps(p=>p.filter(x=>x.id!==c.id))}><Ic.Trash/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editC&&(
        <div className="overlay"onClick={()=>setEditC(null)}>
          <div className="modal"style={{width:460}}onClick={e=>e.stopPropagation()}>
            <div className="modal-hd"><div className="modal-title">{editC==="new"?"Nova Campanha":"Editar Campanha"}</div><CloseBtn onClick={()=>setEditC(null)}/></div>
            <div className="modal-body">
              <Inp label="Nome da Campanha"value={form.name||""}onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
              <div className="form-row">
                <Sel label="Tipo"value={form.type||"percent"}onChange={e=>setForm(p=>({...p,type:e.target.value}))}><option value="percent">Percentagem (%)</option><option value="fixed">Valor Fixo (€)</option></Sel>
                <Inp label={form.type==="fixed"?"Valor (€)":"Percentagem (%)"}type="number"value={form.value||""}onChange={e=>setForm(p=>({...p,value:parseFloat(e.target.value)||0}))}/>
              </div>
              <div className="form-row">
                <Sel label="Alvo"value={form.target||"all"}onChange={e=>setForm(p=>({...p,target:e.target.value,targetLabel:e.target.value==="all"?"Tudo":e.target.options[e.target.selectedIndex].text}))}><option value="all">Tudo</option>{MENU_CATS.map(c=><option key={c}value={c}>{c}</option>)}</Sel>
                <div><label className="form-label">Dias</label><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{DAYS_PT.slice(1).map((d,i)=><button key={i+1}onClick={()=>toggleDay(i+1)}style={{padding:"4px 8px",borderRadius:5,border:`1px solid ${(form.days||[]).includes(i+1)?T.accent:T.border}`,background:(form.days||[]).includes(i+1)?T.accentDim:T.card,color:(form.days||[]).includes(i+1)?T.accent:T.textSec,fontSize:11,fontWeight:600,cursor:"pointer"}}>{d}</button>)}</div></div>
              </div>
              <div className="form-row"><Inp label="Hora Início"type="time"value={form.start||"00:00"}onChange={e=>setForm(p=>({...p,start:e.target.value}))}/><Inp label="Hora Fim"type="time"value={form.end||"23:59"}onChange={e=>setForm(p=>({...p,end:e.target.value}))}/></div>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost"onClick={()=>setEditC(null)}>Cancelar</button><button className="btn btn-solid"onClick={save}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ORDER HISTORY ────────────────────────────────────────────────────────────
function OrderHistory(){
  const [search,setSearch]=useState("");
  const [dateFilter,setDateFilter]=useState("Todos");
  const [expanded,setExpanded]=useState(null);
  const dates=["Todos","Hoje","Ontem"];
  const filtered=INIT_ORDER_HIST.filter(o=>{
    if(dateFilter!=="Todos"&&o.date!==dateFilter)return false;
    if(search&&!o.table.toLowerCase().includes(search.toLowerCase())&&!o.waiter.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });
  return(
    <div>
      <div className="filters-row">
        <input className="filter-input"placeholder="Pesquisar mesa, funcionário..."value={search}onChange={e=>setSearch(e.target.value)}style={{width:240}}/>
        {dates.map(d=><button key={d}className={`filter-chip${dateFilter===d?" active":""}`}onClick={()=>setDateFilter(d)}>{d}</button>)}
        <button className="btn btn-ghost"style={{marginLeft:"auto"}}onClick={()=>{}}><Ic.Export/>Exportar</button>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th></th><th>ID</th><th>Mesa</th><th>Funcionário</th><th>Itens</th><th>Total</th><th>Método</th><th>Data/Hora</th><th></th></tr></thead>
          <tbody>
            {filtered.map(o=>(
              <>
                <tr key={o.id}>
                  <td style={{width:32}}><button className="btn btn-ghost btn-icon btn-sm"onClick={()=>setExpanded(expanded===o.id?null:o.id)}>{expanded===o.id?<Ic.Up/>:<Ic.Down/>}</button></td>
                  <td><span className="mono"style={{color:T.textMuted,fontSize:11}}>{o.id}</span></td>
                  <td style={{fontWeight:700}}>{o.table}</td>
                  <td style={{color:T.textSec}}>{o.waiter}</td>
                  <td><span className="mono">{o.items}</span></td>
                  <td><span className="mono"style={{color:T.accent,fontWeight:700}}>{fmtEur(o.total)}</span></td>
                  <td><Badge color={T.textSec}bg={T.elevated}>{o.method}</Badge></td>
                  <td><span style={{color:T.textMuted,fontSize:11}}>{o.date}</span><span className="mono"style={{color:T.textSec,marginLeft:6}}>{o.time}</span></td>
                  <td><button className="btn btn-ghost btn-sm"onClick={()=>alert("🖨️ Pré-visualização de recibo — funcionalidade visual")}>Recibo</button></td>
                </tr>
                {expanded===o.id&&(
                  <tr key={o.id+"_exp"}>
                    <td colSpan={9}style={{background:T.elevated,padding:"12px 20px"}}>
                      <div style={{fontSize:12,color:T.textSec,display:"flex",flexWrap:"wrap",gap:8}}>
                        {o.lines.map((l,i)=><span key={i}style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:5,padding:"3px 10px"}}>{l}</span>)}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&<div className="empty-state">Sem pedidos encontrados</div>}
      </div>
    </div>
  );
}

// ─── LOGS ─────────────────────────────────────────────────────────────────────
function LogsSection(){
  const [logs]=useState(INIT_LOGS);
  const [level,setLevel]=useState("Todos");
  const [module,setModule]=useState("Todos");
  const [search,setSearch]=useState("");
  const levels=["Todos","INFO","ACTION","WARN","ERROR","CANCEL"];
  const modules=["Todos","POS","KDS","BACKOFFICE"];
  const filtered=logs.filter(l=>{
    if(level!=="Todos"&&l.level!==level)return false;
    if(module!=="Todos"&&l.module!==module)return false;
    if(search&&!l.msg.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });
  const exportLogs=()=>{
    const csv=["ID,Level,Module,Time,Message",...filtered.map(l=>`${l.id},${l.level},${l.module},${l.time},"${l.msg}"`)].join("\n");
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
          <thead><tr><th>Nível</th><th>Módulo</th><th>Hora</th><th>Mensagem</th></tr></thead>
          <tbody>
            {filtered.map(l=>{const lc=LEVEL_C[l.level]||LEVEL_C.INFO;return(
              <tr key={l.id}>
                <td><Badge color={lc.c}bg={lc.bg}>{l.level}</Badge></td>
                <td><Badge color={T.textSec}bg={T.elevated}>{l.module}</Badge></td>
                <td style={{color:T.textMuted,fontFamily:"'DM Mono',monospace",fontSize:11}}>{l.time}</td>
                <td>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:T.textSec}}>{l.msg}</div>
                  {l.comment&&<div style={{fontSize:11,color:T.textMuted,fontStyle:"italic",marginTop:2}}>"{l.comment}"</div>}
                </td>
              </tr>
            );})}
          </tbody>
        </table>
        {filtered.length===0&&<div className="empty-state">Sem logs para os filtros seleccionados</div>}
      </div>
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function SettingsSection(){
  const [tab,setTab]=useState("geral");
  const [s,setS]=useState(INIT_SETTINGS);
  const setG=(k,v)=>setS(p=>({...p,geral:{...p.geral,[k]:v}}));
  const setF=(k,v)=>setS(p=>({...p,fiscal:{...p.fiscal,[k]:v}}));
  const setK=(k,v)=>setS(p=>({...p,kds:{...p.kds,[k]:v}}));
  const setC=(k,v)=>setS(p=>({...p,caixa:{...p.caixa,[k]:v}}));
  return(
    <div>
      <div className="stab-row">{["geral","fiscal","kds","caixa"].map(t=><div key={t}className={`stab${tab===t?" active":""}`}onClick={()=>setTab(t)}style={{textTransform:"capitalize"}}>{t==="fiscal"?"Fiscal & IVA":t==="kds"?"KDS":t==="caixa"?"Caixa":t.charAt(0).toUpperCase()+t.slice(1)}</div>)}</div>
      <div style={{maxWidth:520}}>
        {tab==="geral"&&<div className="card"><div className="card-body">
          <Inp label="Nome do Restaurante"value={s.geral.name}onChange={e=>setG("name",e.target.value)}/>
          <Inp label="Morada"value={s.geral.address}onChange={e=>setG("address",e.target.value)}/>
          <div className="form-row"><Inp label="Telefone"value={s.geral.phone}onChange={e=>setG("phone",e.target.value)}/><Inp label="Email"value={s.geral.email}onChange={e=>setG("email",e.target.value)}/></div>
          <button className="btn btn-solid"onClick={()=>alert("✓ Definições guardadas")}>Guardar</button>
        </div></div>}
        {tab==="fiscal"&&<div className="card"><div className="card-body">
          <Inp label="NIF do Restaurante"value={s.fiscal.nif}onChange={e=>setF("nif",e.target.value)}/>
          <Sel label="Regime de IVA"value={s.fiscal.regime}onChange={e=>setF("regime",e.target.value)}><option value="normal">Regime Normal</option><option value="simplificado">Regime Simplificado</option><option value="isento">Isento</option></Sel>
          <div className="form-group"><label className="form-label">Taxas de IVA Activas</label>
            {s.fiscal.rates.map(r=>(
              <div key={r.id}style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:T.card,border:`1px solid ${T.border}`,borderRadius:8,marginBottom:6}}>
                <Toggle on={r.active}onChange={v=>setS(p=>({...p,fiscal:{...p.fiscal,rates:p.fiscal.rates.map(x=>x.id===r.id?{...x,active:v}:x)}}))}/>
                <span style={{flex:1,fontSize:13,fontWeight:600}}>{r.label}</span>
                <span className="mono"style={{color:T.accent,fontWeight:700}}>{r.value}%</span>
              </div>
            ))}
          </div>
          <button className="btn btn-solid"onClick={()=>alert("✓ Definições fiscais guardadas")}>Guardar</button>
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
          <button className="btn btn-solid"style={{marginTop:14}}onClick={()=>alert("✓ Configurações KDS guardadas")}>Guardar</button>
        </div></div>}
        {tab==="caixa"&&<div className="card"><div className="card-body">
          <Inp label="Fundo de Maneio Padrão (€)"type="number"value={s.caixa.defaultFundo}onChange={e=>setC("defaultFundo",parseFloat(e.target.value)||0)}/>
          <Inp label="Duração Máxima de Turno (horas)"type="number"value={s.caixa.maxTurno}onChange={e=>setC("maxTurno",parseInt(e.target.value)||8)}/>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}><Toggle on={s.caixa.confirmAbertura}onChange={v=>setC("confirmAbertura",v)}/><span style={{fontSize:13,color:T.textSec}}>Exigir confirmação na abertura de turno</span></div>
          <button className="btn btn-solid"onClick={()=>alert("✓ Configurações de caixa guardadas")}>Guardar</button>
        </div></div>}
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV=[
  {id:"dashboard",label:"Dashboard",Icon:Ic.Dashboard},
  {id:"analytics",label:"Analytics",Icon:Ic.Analytics},
  {id:"menu",label:"Menu & Stock",Icon:Ic.Menu},
  {id:"tables",label:"Mesas",Icon:Ic.Tables},
  {id:"staff",label:"Equipa",Icon:Ic.Staff},
  {id:"reservations",label:"Reservas",Icon:Ic.Calendar},
  {id:"campaigns",label:"Campanhas",Icon:Ic.Tag},
  {id:"orders",label:"Pedidos",Icon:Ic.Orders},
  {id:"logs",label:"Logs",Icon:Ic.Logs},
  {id:"settings",label:"Definições",Icon:Ic.Settings},
];
const SECTION_TITLES={dashboard:"Dashboard",analytics:"Analytics",menu:"Menu & Stock",tables:"Gestão de Mesas",staff:"Gestão de Equipa",reservations:"Reservas",campaigns:"Campanhas & Descontos",orders:"Histórico de Pedidos",logs:"Logs do Sistema",settings:"Definições"};

function Sidebar({active,onSelect,collapsed,onCollapse}){
  return(
    <nav className={`sidebar ${collapsed?"collapsed":"expanded"}`}>
      <div className="sb-logo">
        <div className="sb-logo-dot"/>
        {!collapsed&&<><span className="sb-logo-text">RestaurantOS</span><span className="sb-logo-sub">v1</span></>}
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
        <div className="sb-ext"onClick={()=>alert("Abre o POS num novo separador")}>
          <Ic.POS/>{!collapsed&&<span>POS</span>}
        </div>
        <div className="sb-ext"onClick={()=>alert("Abre o KDS num novo separador")}>
          <Ic.KDS/>{!collapsed&&<span>KDS</span>}
        </div>
        <button className="sb-collapse"onClick={onCollapse}>
          {collapsed?<Ic.ChevRight/>:<Ic.ChevLeft/>}
        </button>
      </div>
    </nav>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Backoffice(){
  const [section,setSection]=useState("dashboard");
  const [collapsed,setCollapsed]=useState(false);

  const sections={
    dashboard:<Dashboard/>,analytics:<Analytics/>,menu:<MenuStock/>,
    tables:<TablesMgmt/>,staff:<StaffMgmt/>,reservations:<Reservations/>,
    campaigns:<Campaigns/>,orders:<OrderHistory/>,logs:<LogsSection/>,settings:<SettingsSection/>,
  };

  return(
    <>
      <style>{CSS}</style>
      <div className="bo-root">
        <Sidebar active={section}onSelect={setSection}collapsed={collapsed}onCollapse={()=>setCollapsed(v=>!v)}/>
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
