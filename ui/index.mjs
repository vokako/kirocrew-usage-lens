import{useEffect as Se,useMemo as xe,useState as N}from"react";import{useAppApi as Ke}from"@kirocrew/app-sdk";import{Card as A,
CardTitle as W,Btn as J,StatCard as G,ContentSkeleton as Ie,EmptyState as we,PageHeader as Ae}from"@kirocrew/app-sdk/ui";import{jsx as y,jsxs as L}from"react/jsx-runtime";var S={top:8,right:6,bottom:20,left:42};function Me(t){if(t<=0)return 1;
let e=10**Math.floor(Math.log10(t)),r=t/e;return(r<=1?1:r<=2?2:r<=5?5:10)*e}var De=t=>t>=1e4?`${Math.round(t/1e3)}k`:t>=
1e3?`${(t/1e3).toFixed(1).replace(/\.0$/,"")}k`:String(Math.round(t*10)/10);function Te(t,e){return Math.max(1,Math.ceil(
t/e))}function ne({width:t,height:e,max:r,labels:s,labelOf:u,maxLabels:l=12,children:d}){let c={w:t-S.left-S.right,h:e-S.
top-S.bottom},i=Me(r),g=h=>c.h-h/i*c.h,f=[0,.25,.5,.75,1].map(h=>i*h),b=Te(s.length,l);return y("svg",{className:"ul-svg",
viewBox:`0 0 ${t} ${e}`,role:"img",preserveAspectRatio:"none",children:L("g",{transform:`translate(${S.left},${S.top})`,
children:[f.map(h=>L("g",{children:[y("line",{className:"ul-grid",x1:0,x2:c.w,y1:g(h),y2:g(h)}),y("text",{className:"ul-\
axis",x:-6,y:g(h)+3,textAnchor:"end",children:De(h)})]},h)),d(g,c),s.map((h,m)=>m%b===0||m===s.length-1?y("text",{className:"\
ul-axis",x:(m+.5)/s.length*c.w,y:c.h+13,textAnchor:"middle",children:u?u(h):h},h):null)]})})}function se({labels:t,series:e,
labelOf:r,unit:s="",height:u=260}){let d=t.map((f,b)=>e.reduce((h,m)=>h+(m.values[b]??0),0)),c=Math.max(...d,0),i=t.length?
(720-S.left-S.right)/t.length:0,g=Math.max(1,Math.min(i*.78,34));return y(ne,{width:720,height:u,max:c,labels:t,labelOf:r,
children:(f,b)=>t.map((h,m)=>{let E=0,C=(m+.5)*i-g/2;return L("g",{children:[y("title",{children:`${r?r(h):h} \xB7 ${Math.
round(d[m]*10)/10}${s}`}),e.map(P=>{let $=P.values[m]??0;if($<=0)return null;let _=f(E+$),o=f(E);return E+=$,y("rect",{className:"\
ul-bar",x:C,y:_,width:g,height:Math.max(.6,o-_),fill:P.color},P.name)}),y("rect",{x:m*i,y:0,width:i,height:b.h,fill:"tra\
nsparent"})]},h)})})}function ae({labels:t,series:e,height:r=210}){let u=Math.max(...e.flatMap(l=>l.values.map(d=>d??0)),
0);return y(ne,{width:720,height:r,max:u,labels:t,children:(l,d)=>{let c=i=>t.length>1?i/(t.length-1)*d.w:d.w/2;return e.
map(i=>{let g=i.values.map((f,b)=>f===null?null:`${c(b)},${l(f)}`).filter(f=>f!==null);return g.length?L("g",{children:[
y("polyline",{points:g.join(" "),fill:"none",stroke:i.color,strokeWidth:2,strokeLinejoin:"round",strokeLinecap:"round"}),
i.values.map((f,b)=>f===null?null:y("circle",{cx:c(b),cy:l(f),r:2.2,fill:i.color,children:y("title",{children:`${i.name}\
 \xB7 ${t[b]} \xB7 ${Math.round(f*10)/10}`})},b))]},i.name):null})}})}function oe({slices:t,size:e=200,thickness:r=26}){
let s=t.reduce((i,g)=>i+g.value,0),u=e/2-r/2-1,l=e/2,d=2*Math.PI*u,c=0;return L("svg",{className:"ul-svg",viewBox:`0 0 ${e}\
 ${e}`,role:"img",style:{maxHeight:e},children:[s<=0?y("circle",{cx:l,cy:l,r:u,fill:"none",stroke:"var(--border)",strokeWidth:r}):
t.map(i=>{let g=i.value/s*d,f=`${g} ${d-g}`,b=y("circle",{cx:l,cy:l,r:u,fill:"none",stroke:i.color,strokeWidth:r,strokeDasharray:f,
strokeDashoffset:-c,transform:`rotate(-90 ${l} ${l})`,children:y("title",{children:`${i.name} \xB7 ${Math.round(i.value*
10)/10} (${(i.value/s*100).toFixed(1)}%)`})},i.name);return c+=g,b}),y("text",{x:l,y:l-2,textAnchor:"middle",style:{fill:"\
var(--text-strong)",fontSize:19,fontWeight:650},children:s>=1e3?`${Math.round(s/1e3)}k`:Math.round(s)}),y("text",{x:l,y:l+
15,textAnchor:"middle",style:{fill:"var(--muted)",fontSize:10},children:"credits"})]})}function le({items:t}){return y("\
div",{className:"ul-legend",children:t.map(e=>L("span",{className:"ul-legend-item",title:e.sub||e.name,children:[y("span",
{className:"ul-sw",style:{background:e.color}}),y("span",{className:"ul-legend-name",children:e.name})]},e.name))})}var ie=String.raw`
  .ul-root { display:flex; flex:1; min-height:0; flex-direction:column; color:var(--text); background:var(--bg); }
  .ul-body { flex:1; min-height:0; overflow-y:auto; padding:0 24px 32px; }

  /* Control bar. Wraps rather than scrolls: four groups on a narrow window
     should stack, not hide the dimension picker off the right edge. */
  .ul-controls { display:flex; flex-wrap:wrap; align-items:center; gap:14px; margin:0 0 16px; }
  .ul-group { display:flex; align-items:center; gap:7px; }
  .ul-group-label { color:var(--muted); font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; }
  .ul-seg { display:inline-flex; border:1px solid var(--border); border-radius:8px; overflow:hidden; }
  .ul-seg button {
    padding:4px 11px; border:0; background:var(--bg); color:var(--muted);
    font:inherit; font-size:12px; cursor:pointer; transition:background 120ms ease, color 120ms ease;
  }
  .ul-seg button + button { border-left:1px solid var(--border); }
  .ul-seg button:hover { background:var(--bg-hover); color:var(--text); }
  .ul-seg button[aria-pressed='true'] { background:var(--accent); color:var(--bg); font-weight:650; }

  .ul-kpis { display:grid; gap:14px; grid-template-columns:repeat(auto-fit,minmax(158px,1fr)); margin:0 0 16px; }
  .ul-delta { font-size:11px; }
  .ul-up { color:var(--danger); }
  .ul-down { color:var(--ok); }
  .ul-flat { color:var(--muted); }

  .ul-charts { display:grid; gap:14px; grid-template-columns:minmax(0,2fr) minmax(0,1fr); margin:0 0 14px; }
  @media (max-width:1000px) { .ul-charts { grid-template-columns:minmax(0,1fr); } }
  .ul-chart-note { margin:2px 0 10px; color:var(--muted); font-size:12px; line-height:1.45; }

  /* Charts are inline SVG with a fixed viewBox: no canvas, so no
     container/canvas sizing feedback loop, and no charting dependency to bundle. */
  .ul-svg { display:block; width:100%; height:auto; overflow:visible; }
  .ul-axis { fill:var(--muted); font-size:9px; }
  .ul-grid { stroke:var(--border); stroke-width:1; }
  .ul-bar:hover { opacity:.82; }

  .ul-legend { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:10px; }
  .ul-legend-item { display:inline-flex; align-items:center; gap:6px; min-width:0; color:var(--text); font-size:11.5px; }
  .ul-sw { flex:none; width:9px; height:9px; border-radius:2px; }
  .ul-legend-name { min-width:0; max-width:30ch; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  .ul-table-wrap { overflow-x:auto; }
  .ul-table { width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums; }
  .ul-table th, .ul-table td { padding:6px 10px; border-bottom:1px solid var(--border); text-align:right; white-space:nowrap; }
  .ul-table th:first-child, .ul-table td:first-child { text-align:left; white-space:normal; min-width:16ch; }
  .ul-table th {
    position:sticky; top:0; z-index:1; background:var(--card);
    color:var(--muted); font-size:11px; font-weight:600; letter-spacing:.03em; text-transform:uppercase;
  }
  .ul-table tbody tr:hover { background:var(--bg-hover); }
  .ul-table tbody tr:last-child td { border-bottom:0; }
  .ul-name { display:inline-flex; align-items:center; gap:7px; min-width:0; }
  .ul-sub { display:block; color:var(--muted); font-size:11px; }
  .ul-mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11.5px; }

  /* Reconciliation against Kiro's own meter: three figures that must be read
     together — what Kiro says, what this page can account for, and the remainder. */
  .ul-recon { display:grid; gap:14px; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); margin:4px 0 2px; }
  .ul-recon-cell { display:flex; flex-direction:column; gap:2px; min-width:0; }
  .ul-recon-label { color:var(--muted); font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; }
  .ul-recon-value { color:var(--text-strong); font-size:21px; font-weight:650; letter-spacing:-.01em; font-variant-numeric:tabular-nums; }
  .ul-recon-sub { color:var(--muted); font-size:11.5px; line-height:1.4; }

  /* An unscheduled row under the job dimension is not a job — quieter, so the
     scheduled rows it sits beside stay the ones the eye lands on. */
  .ul-unscheduled { color:var(--muted); }

  /* The one interpretive element on the page: a repricing or a context blow-up
     shows as a credits-per-turn jump the totals alone do not explain. */
  .ul-flag {
    display:flex; gap:10px; align-items:flex-start; margin:0 0 14px; padding:10px 13px;
    border:1px solid color-mix(in srgb, var(--warn) 40%, var(--border));
    border-left:3px solid var(--warn); border-radius:var(--radius-lg,8px);
    background:color-mix(in srgb, var(--warn) 8%, var(--card));
  }
  /* The same shell in an informational key: a pending restart is a state to act on,
     not a warning about the numbers being wrong. */
  .ul-flag-info {
    border-color:color-mix(in srgb, var(--info) 40%, var(--border));
    border-left-color:var(--info);
    background:color-mix(in srgb, var(--info) 8%, var(--card));
  }
  .ul-flag-title { color:var(--text-strong); font-size:13px; font-weight:650; }
  .ul-flag-body { margin:3px 0 0; color:var(--text); font-size:12.5px; line-height:1.5; }
  .ul-foot { margin-top:14px; color:var(--muted); font-size:11px; line-height:1.6; }
`;var v={hour:0,model:1,surface:2,agent:3,job:4,session:5,credits:6,turns:7},Y=[{key:"model",label:"Model"},{key:"surface",
label:"Surface"},{key:"agent",label:"Agent"},{key:"job",label:"Scheduled job"},{key:"session",label:"Session"}],ue=[{key:"\
1",label:"24h"},{key:"3",label:"3d"},{key:"7",label:"7d"},{key:"14",label:"14d"},{key:"30",label:"30d"},{key:"cycle",label:"\
This cycle"},{key:"all",label:"All"}],V=[{key:"credits",label:"Credits"},{key:"turns",label:"Turns"},{key:"per_turn",label:"\
Credits / turn"}],q=["#5b8dfb","#f2777a","#79c98a","#e0b252","#b48ce3","#4bc3d4","#ef8f57","#8fa1c7","#d76fa8","#6fbf73"],
Le=t=>`${t.slice(0,7)}-01T00`;function ze(t){let e=Number(t.slice(0,4)),r=Number(t.slice(5,7)),[s,u]=r===1?[e-1,12]:[e,r-
1];return`${String(s).padStart(4,"0")}-${String(u).padStart(2,"0")}-01T00`}function Ee(t){let e=t.length?t[t.length-1]:new Date().
toISOString().slice(0,13),r=Le(e);return{source:"assumed-local-month",resets:"",start_utc:"",start_hour:r,prev_start_hour:ze(
r),end_hour:""}}var Pe=["hours","model","surface","agent","job","session"];function de(t){let e=t&&typeof t=="object"?t:
{},r=e.dims&&typeof e.dims=="object"?e.dims:{},s={};for(let c of Pe)s[c]=Array.isArray(r[c])?r[c]:[];let u=Array.isArray(
e.rows)?e.rows.filter(c=>Array.isArray(c)&&c.length>=8):[],l=e.totals&&typeof e.totals=="object"?e.totals:{},d=!(e.cycle&&
typeof e.cycle=="object");return{stale:d,series:{generated_at:typeof e.generated_at=="string"?e.generated_at:"",tz:typeof e.
tz=="string"?e.tz:"",window_days:Number(e.window_days)||0,shards:Number(e.shards)||0,cycle:d?Ee(s.hours):e.cycle,official:e.
official&&typeof e.official=="object"?e.official:{},dims:s,rows:u,labels:{session:e.labels&&typeof e.labels=="object"&&e.
labels.session?e.labels.session:{}},totals:{credits:Number(l.credits)||0,turns:Number(l.turns)||0}}}}var pe=()=>({credits:0,
turns:0});function me(t,e){return e==="credits"?t.credits:e==="turns"?t.turns:t.turns?t.credits/t.turns:0}function k(t){
return isFinite(t)?Math.abs(t)>=1e3?Math.round(t).toLocaleString():(Math.round(t*10)/10).toLocaleString():"\u2014"}function ce(t,e){
let r=t.dims.hours;if(!r.length)return"";let s=r[r.length-1],u=Date.parse(`${s.slice(0,10)}T${s.slice(11,13)}:00:00Z`);return new Date(
u-e*36e5).toISOString().slice(0,13)}function F(t,e,r){return t.rows.filter(s=>{let u=t.dims.hours[s[v.hour]];return u>=e&&
(r===""||u<r)})}function Oe(t,e){if(!t)return"";let r=Date.parse(`${t.slice(0,10)}T${t.slice(11,13)}:00:00Z`);return new Date(
r+e*36e5).toISOString().slice(0,13)}function Re(t,e){if(!t||!e)return 0;let r=Date.parse(`${t.slice(0,10)}T${t.slice(11,
13)}:00:00Z`),s=Date.parse(`${e.slice(0,10)}T${e.slice(11,13)}:00:00Z`);return Math.round((s-r)/36e5)}function ge(t,e){if(e===
"all")return{current:t.rows,prior:[],lo:""};if(e==="cycle"){let{start_hour:l,prev_start_hour:d}=t.cycle,c=t.dims.hours,i=c.
length?c[c.length-1]:l,g=Math.max(1,Re(l,i)+1),f=Oe(d,g);return f>l&&(f=l),{current:F(t,l,""),prior:F(t,d,f),lo:l}}let r=Number(
e),s=ce(t,r*24),u=ce(t,r*48);return{current:F(t,s,""),prior:F(t,u,s),lo:s}}function fe(t,e){return e==="cycle"?Math.max(
1,Math.round((Date.now()-Date.parse(t.cycle.start_utc))/864e5)):e==="all"?0:Number(e)}function X(t){let e=pe();for(let r of t)
e.credits+=r[v.credits],e.turns+=r[v.turns];return e}function B(t,e){let r=new Map;for(let s of t){let u=e(s),l=r.get(u);
l||r.set(u,l=pe()),l.credits+=s[v.credits],l.turns+=s[v.turns]}return r}var K=(t,e,r)=>t.dims[r][e[v[r]]],I=(t,e,r)=>{let s=t.
dims.hours[e[v.hour]];return r==="hour"?s:s.slice(0,10)},Be="Unscheduled \xB7 ",he=t=>t.startsWith(Be);function z(t,e,r){
if(e==="session"){let s=t.labels.session?.[r];return s||r}return r||"(unlabelled)"}function be(t,e,r){return e==="sessio\
n"&&t.labels.session?.[r]?r:""}function ye(t,e,r,s){let u=B(e,d=>K(t,d,s)),l=B(r,d=>K(t,d,s));return[...u.entries()].sort(
(d,c)=>c[1].credits-d[1].credits||d[0].localeCompare(c[0])).map(([d,c])=>{let i=l.get(d);return{key:d,cell:c,deltaPct:i&&
i.credits>0?(c.credits-i.credits)/i.credits*100:null}})}function U(t,e){return e>0?(t-e)/e*100:null}import{Fragment as ke,jsx as n,jsxs as p}from"react/jsx-runtime";var ve="usage-lens-styles",We=8,je=5;function Fe(){Se(()=>{
if(document.getElementById(ve))return;let t=document.createElement("style");t.id=ve,t.textContent=ie,document.head.appendChild(
t)},[])}function H({label:t,options:e,value:r,onChange:s}){return p("div",{className:"ul-group",children:[n("span",{className:"\
ul-group-label",children:t}),n("span",{className:"ul-seg",role:"group","aria-label":t,children:e.map(u=>n("button",{type:"\
button","aria-pressed":u.key===r,onClick:()=>s(u.key),children:u.label},String(u.key)))})]})}function Q({value:t,suffix:e="\
vs prior window"}){if(t===null)return n("span",{className:"ul-delta ul-flat",children:"no prior window"});let r=Math.round(
t);return r===0?p("span",{className:"ul-delta ul-flat",children:["flat ",e]}):p("span",{className:`ul-delta ${r>0?"ul-up":
"ul-down"}`,children:[r>0?"\u25B2":"\u25BC"," ",Math.abs(r),"% ",e]})}function Ue(){Fe();let t=Ke(),[e,r]=N(null),[s,u]=N(
!1),[l,d]=N(""),[c,i]=N(!0),[g,f]=N("cycle"),[b,h]=N("hour"),[m,E]=N("model"),[C,P]=N("credits"),$=xe(()=>{try{return Intl.
DateTimeFormat().resolvedOptions().timeZone||""}catch{return""}},[]),_=()=>{i(!0),t.get(`/api/apps/usage-lens/series?day\
s=0${$?`&tz=${encodeURIComponent($)}`:""}`).then(a=>{let{series:M,stale:T}=de(a);r(M),u(T),d("")}).catch(a=>d(a instanceof
Error?a.message:String(a))).finally(()=>i(!1))};Se(_,[$]);let o=xe(()=>{if(!e)return null;let{current:a,prior:M}=ge(e,g),
T=X(a),Ce=X(M),ee=ye(e,a,M,m),j=ee.slice(0,We),Z=new Map(j.map((x,R)=>[x.key,q[R%q.length]])),te=[...new Set(a.map(x=>I(
e,x,b)))].sort(),$e=j.map(x=>{let R=B(a.filter(w=>K(e,w,m)===x.key),w=>I(e,w,b));return{name:z(e,m,x.key),color:Z.get(x.
key),values:te.map(w=>{let D=R.get(w);return D?me(D,C):0})}}),re=[...new Set(a.map(x=>I(e,x,"day")))].sort(),_e=j.slice(
0,je).map(x=>{let R=B(a.filter(w=>K(e,w,m)===x.key),w=>I(e,w,"day"));return{name:z(e,m,x.key),color:Z.get(x.key),values:re.
map(w=>{let D=R.get(w);return D&&D.turns?D.credits/D.turns:null})}});return{now:T,before:Ce,rows:ee,top:j,colours:Z,buckets:te,
byBucket:$e,unitLabels:re,unit:_e,distinct:new Set(a.map(x=>x[v[m]])).size,reconcile:g==="cycle"&&typeof e.official.credits_used==
"number"?{official:e.official.credits_used,local:T.credits,gap:e.official.credits_used-T.credits,coveragePct:e.official.
credits_used?T.credits/e.official.credits_used*100:null}:null}},[e,g,b,m,C]),O=Y.find(a=>a.key===m).label,Ne=V.find(a=>a.
key===C).label;return p("div",{className:"ul-root",children:[n(Ae,{title:"Usage Lens",subtitle:"Credits by model, surfac\
e, agent, scheduled job, and session \u2014 from the gateway's own usage shards",actions:n(J,{onClick:_,disabled:c,children:c?
"Loading\u2026":"Refresh"})}),p("div",{className:"ul-body",children:[p("div",{className:"ul-controls",children:[n(H,{label:"\
Window",options:ue.map(a=>({key:a.key,label:a.label})),value:g,onChange:f}),n(H,{label:"Granularity",options:[{key:"hour",
label:"Hourly"},{key:"day",label:"Daily"}],value:b,onChange:h}),n(H,{label:"Break down by",options:Y,value:m,onChange:E}),
n(H,{label:"Metric",options:V,value:C,onChange:P})]}),l?n(we,{title:"Could not read usage data",subtitle:l,action:n(J,{onClick:_,
children:"Try again"})}):!e||!o?n(Ie,{rows:6}):e.rows.length===0?n(we,{title:"No usage recorded yet",subtitle:"The gatew\
ay writes one row per agent turn to usage/tokens. Run a turn, then refresh.",action:n(J,{onClick:_,children:"Refresh"})}):
p(ke,{children:[s&&n("div",{className:"ul-flag ul-flag-info",children:p("div",{children:[n("div",{className:"ul-flag-tit\
le",children:"The gateway is still running an older copy of this app"}),p("p",{className:"ul-flag-body",children:["Insta\
lling an app copies its files and re-registers its routes, but the backend module is already loaded in the gateway proce\
ss \u2014 so this page is newer than the code answering it. Run ",n("span",{className:"ul-mono",children:"kirocrew resta\
rt"})," to get the billing-cycle window aligned to Kiro's own reset date, the reconciliation against Kiro's meter, and t\
he named ",n("span",{className:"ul-mono",children:"Unscheduled \xB7"})," ","rows under Scheduled job. Until then the cyc\
le is assumed to start on the 1st of the month on your clock, which is not the same instant as Kiro's UTC reset."]})]})}),
p("div",{className:"ul-kpis",children:[n(G,{label:"Credits",value:k(o.now.credits),sub:n(Q,{value:U(o.now.credits,o.before.
credits)}),accent:!0}),n(G,{label:"Turns",value:o.now.turns.toLocaleString(),sub:n(Q,{value:U(o.now.turns,o.before.turns)})}),
n(G,{label:"Credits / turn",value:k(o.now.turns?o.now.credits/o.now.turns:0),sub:n(Q,{value:U(o.now.turns?o.now.credits/
o.now.turns:0,o.before.turns?o.before.credits/o.before.turns:0)})}),n(G,{label:`Distinct ${O.toLowerCase()}`,value:String(
o.distinct)})]}),o.reconcile&&p(A,{style:{marginBottom:14},children:[n(W,{children:"Against Kiro's own meter \u2014 this bill\
ing cycle"}),p("div",{className:"ul-recon",children:[p("div",{className:"ul-recon-cell",children:[n("span",{className:"u\
l-recon-label",children:"Kiro reports"}),n("span",{className:"ul-recon-value",children:k(o.reconcile.official)}),p("span",
{className:"ul-recon-sub",children:[e.official.credits_plan?`of ${k(e.official.credits_plan)} in ${e.official.plan||"pla\
n"}`:"credits used",typeof e.official.cost_usd=="number"&&e.official.cost_usd>0?` \xB7 $${e.official.cost_usd.toFixed(2)}\
 overage`:""]})]}),p("div",{className:"ul-recon-cell",children:[n("span",{className:"ul-recon-label",children:"This page\
 can attribute"}),n("span",{className:"ul-recon-value",children:k(o.reconcile.local)}),n("span",{className:"ul-recon-sub",
children:o.reconcile.coveragePct!==null?`${o.reconcile.coveragePct.toFixed(1)}% of Kiro's figure`:"from the local usage \
shards"})]}),p("div",{className:"ul-recon-cell",children:[n("span",{className:"ul-recon-label",children:"Unattributed"}),
n("span",{className:"ul-recon-value ul-up",children:k(o.reconcile.gap)}),n("span",{className:"ul-recon-sub",children:"Ki\
ro usage that did not go through this gateway"})]})]}),p("p",{className:"ul-chart-note",children:["Cycle ",p("span",{className:"\
ul-mono",children:[e.cycle.start_hour.replace("T"," "),":00"]}),e.cycle.resets?p(ke,{children:[" ","to ",n("span",{className:"\
ul-mono",children:e.cycle.resets})," UTC"]}):null," \xB7 ","day ",fe(e,"cycle"),e.cycle.source==="kiro-api"?"":" \xB7 bound\
ary assumed"]})]}),p("div",{className:"ul-charts",children:[p(A,{children:[n(W,{children:`${Ne} over time \u2014 ${b==="\
hour"?"hourly":"daily"}, stacked by ${O.toLowerCase()}`}),n(se,{labels:o.buckets,series:o.byBucket,labelOf:a=>b==="hour"?
`${a.slice(5,10)} ${a.slice(11,13)}h`:a.slice(5),unit:C==="turns"?" turns":" credits"}),n(le,{items:o.top.map(a=>({name:z(
e,m,a.key),color:o.colours.get(a.key)}))})]}),p(A,{children:[n(W,{children:`Share of credits by ${O.toLowerCase()}`}),n(
oe,{slices:o.top.map(a=>({name:z(e,m,a.key),value:a.cell.credits,color:o.colours.get(a.key)}))})]})]}),p(A,{style:{marginBottom:14},
children:[n(W,{children:"Credits per turn, by day"}),n(ae,{labels:o.unitLabels.map(a=>a.slice(5)),series:o.unit})]}),p(A,
{children:[n(W,{children:`By ${O.toLowerCase()} \u2014 ${o.rows.length} ${o.rows.length===1?"entry":"entries"}`}),n("div",
{className:"ul-table-wrap",children:p("table",{className:"ul-table",children:[n("thead",{children:p("tr",{children:[n("t\
h",{children:O}),n("th",{children:"Credits"}),n("th",{children:"Share"}),n("th",{children:"Turns"}),n("th",{children:"Cr\
edits / turn"}),n("th",{children:"vs prior window"})]})}),n("tbody",{children:o.rows.map(a=>{let M=be(e,m,a.key);return p(
"tr",{children:[p("td",{children:[p("span",{className:`ul-name${he(a.key)?" ul-unscheduled":""}`,children:[n("span",{className:"\
ul-sw",style:{background:o.colours.get(a.key)||"var(--border-strong, var(--border))"}}),n("span",{children:z(e,m,a.key)})]}),
M?n("span",{className:"ul-sub ul-mono",children:M}):null]}),n("td",{children:k(a.cell.credits)}),n("td",{children:o.now.
credits>0?`${(a.cell.credits/o.now.credits*100).toFixed(1)}%`:"\u2014"}),n("td",{children:a.cell.turns.toLocaleString()}),
n("td",{children:k(a.cell.turns?a.cell.credits/a.cell.turns:0)}),n("td",{children:a.deltaPct===null?n("span",{className:"\
ul-flat",children:"new"}):p("span",{className:a.deltaPct>=0?"ul-up":"ul-down",children:[a.deltaPct>=0?"+":"",Math.round(
a.deltaPct),"%"]})})]},a.key)})})]})}),n("p",{className:"ul-foot",children:`${e.shards} daily shard${e.shards===1?"":"s"}\
 \xB7 times in ${e.tz} \xB7 generated ${e.generated_at.replace("T"," ").slice(0,16)}`})]})]})]})]})}export{Ue as default};
