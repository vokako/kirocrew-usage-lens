import{useEffect as Se,useMemo as we,useState as C}from"react";import{useAppApi as Re}from"@kirocrew/app-sdk";import{Card as I,
CardTitle as U,Btn as Q,StatCard as G,ContentSkeleton as Be,EmptyState as ve,PageHeader as Ie}from"@kirocrew/app-sdk/ui";import{jsx as y,jsxs as P}from"react/jsx-runtime";var N={top:8,right:6,bottom:20,left:42};function Me(t){if(t<=0)return 1;
let e=10**Math.floor(Math.log10(t)),n=t/e;return(n<=1?1:n<=2?2:n<=5?5:10)*e}var De=t=>t>=1e4?`${Math.round(t/1e3)}k`:t>=
1e3?`${(t/1e3).toFixed(1).replace(/\.0$/,"")}k`:String(Math.round(t*10)/10);function Te(t,e){return Math.max(1,Math.ceil(
t/e))}function se({width:t,height:e,max:n,labels:a,labelOf:u,maxLabels:i=12,children:d}){let c={w:t-N.left-N.right,h:e-N.
top-N.bottom},o=Me(n),m=h=>c.h-h/o*c.h,g=[0,.25,.5,.75,1].map(h=>o*h),f=Te(a.length,i);return y("svg",{className:"ul-svg",
viewBox:`0 0 ${t} ${e}`,role:"img",preserveAspectRatio:"none",children:P("g",{transform:`translate(${N.left},${N.top})`,
children:[g.map(h=>P("g",{children:[y("line",{className:"ul-grid",x1:0,x2:c.w,y1:m(h),y2:m(h)}),y("text",{className:"ul-\
axis",x:-6,y:m(h)+3,textAnchor:"end",children:De(h)})]},h)),d(m,c),a.map((h,b)=>b%f===0||b===a.length-1?y("text",{className:"\
ul-axis",x:(b+.5)/a.length*c.w,y:c.h+13,textAnchor:"middle",children:u?u(h):h},h):null)]})})}function ae({labels:t,series:e,
labelOf:n,unit:a="",height:u=260}){let d=t.map((g,f)=>e.reduce((h,b)=>h+(b.values[f]??0),0)),c=Math.max(...d,0),o=t.length?
(720-N.left-N.right)/t.length:0,m=Math.max(1,Math.min(o*.78,34));return y(se,{width:720,height:u,max:c,labels:t,labelOf:n,
children:(g,f)=>t.map((h,b)=>{let E=0,$=(b+.5)*o-m/2;return P("g",{children:[y("title",{children:`${n?n(h):h} \xB7 ${Math.
round(d[b]*10)/10}${a}`}),e.map(A=>{let _=A.values[b]??0;if(_<=0)return null;let M=g(E+_),l=g(E);return E+=_,y("rect",{className:"\
ul-bar",x:$,y:M,width:m,height:Math.max(.6,l-M),fill:A.color},A.name)}),y("rect",{x:b*o,y:0,width:o,height:f.h,fill:"tra\
nsparent"})]},h)})})}function oe({labels:t,series:e,height:n=210}){let u=Math.max(...e.flatMap(i=>i.values.map(d=>d??0)),
0);return y(se,{width:720,height:n,max:u,labels:t,children:(i,d)=>{let c=o=>t.length>1?o/(t.length-1)*d.w:d.w/2;return e.
map(o=>{let m=o.values.map((g,f)=>g===null?null:`${c(f)},${i(g)}`).filter(g=>g!==null);return m.length?P("g",{children:[
y("polyline",{points:m.join(" "),fill:"none",stroke:o.color,strokeWidth:2,strokeLinejoin:"round",strokeLinecap:"round"}),
o.values.map((g,f)=>g===null?null:y("circle",{cx:c(f),cy:i(g),r:2.2,fill:o.color,children:y("title",{children:`${o.name}\
 \xB7 ${t[f]} \xB7 ${Math.round(g*10)/10}`})},f))]},o.name):null})}})}function le({slices:t,size:e=200,thickness:n=26}){
let a=t.reduce((o,m)=>o+m.value,0),u=e/2-n/2-1,i=e/2,d=2*Math.PI*u,c=0;return P("svg",{className:"ul-svg",viewBox:`0 0 ${e}\
 ${e}`,role:"img",style:{maxHeight:e},children:[a<=0?y("circle",{cx:i,cy:i,r:u,fill:"none",stroke:"var(--border)",strokeWidth:n}):
t.map(o=>{let m=o.value/a*d,g=`${m} ${d-m}`,f=y("circle",{cx:i,cy:i,r:u,fill:"none",stroke:o.color,strokeWidth:n,strokeDasharray:g,
strokeDashoffset:-c,transform:`rotate(-90 ${i} ${i})`,children:y("title",{children:`${o.name} \xB7 ${Math.round(o.value*
10)/10} (${(o.value/a*100).toFixed(1)}%)`})},o.name);return c+=m,f}),y("text",{x:i,y:i-2,textAnchor:"middle",style:{fill:"\
var(--text-strong)",fontSize:19,fontWeight:650},children:a>=1e3?`${Math.round(a/1e3)}k`:Math.round(a)}),y("text",{x:i,y:i+
15,textAnchor:"middle",style:{fill:"var(--muted)",fontSize:10},children:"credits"})]})}function ie({items:t}){return y("\
div",{className:"ul-legend",children:t.map(e=>P("span",{className:"ul-legend-item",title:e.sub||e.name,children:[y("span",
{className:"ul-sw",style:{background:e.color}}),y("span",{className:"ul-legend-name",children:e.name})]},e.name))})}var ce=String.raw`
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
`;var S={hour:0,model:1,surface:2,agent:3,job:4,session:5,credits:6,turns:7},Z=[{key:"model",label:"Model"},{key:"surface",
label:"Surface"},{key:"agent",label:"Agent"},{key:"job",label:"Scheduled job"},{key:"session",label:"Session"}],de=[{key:"\
1",label:"24h"},{key:"3",label:"3d"},{key:"7",label:"7d"},{key:"14",label:"14d"},{key:"30",label:"30d"},{key:"cycle",label:"\
This cycle"},{key:"all",label:"All"}],Y=[{key:"credits",label:"Credits"},{key:"turns",label:"Turns"},{key:"per_turn",label:"\
Credits / turn"}],V=["#5b8dfb","#f2777a","#79c98a","#e0b252","#b48ce3","#4bc3d4","#ef8f57","#8fa1c7","#d76fa8","#6fbf73"],
Le=t=>`${t.slice(0,7)}-01T00`;function ze(t){let e=Number(t.slice(0,4)),n=Number(t.slice(5,7)),[a,u]=n===1?[e-1,12]:[e,n-
1];return`${String(a).padStart(4,"0")}-${String(u).padStart(2,"0")}-01T00`}function Pe(t){let e=t.length?t[t.length-1]:new Date().
toISOString().slice(0,13),n=Le(e);return{source:"assumed-local-month",resets:"",start_utc:"",start_hour:n,prev_start_hour:ze(
n),end_hour:""}}var Ke=["hours","model","surface","agent","job","session"];function pe(t){let e=t&&typeof t=="object"?t:
{},n=e.dims&&typeof e.dims=="object"?e.dims:{},a={};for(let c of Ke)a[c]=Array.isArray(n[c])?n[c]:[];let u=Array.isArray(
e.rows)?e.rows.filter(c=>Array.isArray(c)&&c.length>=8):[],i=e.totals&&typeof e.totals=="object"?e.totals:{},d=!(e.cycle&&
typeof e.cycle=="object");return{stale:d,series:{generated_at:typeof e.generated_at=="string"?e.generated_at:"",tz:typeof e.
tz=="string"?e.tz:"",window_days:Number(e.window_days)||0,shards:Number(e.shards)||0,cycle:d?Pe(a.hours):e.cycle,official:e.
official&&typeof e.official=="object"?e.official:{},dims:a,rows:u,labels:{session:e.labels&&typeof e.labels=="object"&&e.
labels.session?e.labels.session:{}},totals:{credits:Number(i.credits)||0,turns:Number(i.turns)||0}}}}var me=()=>({credits:0,
turns:0});function ge(t,e){return e==="credits"?t.credits:e==="turns"?t.turns:t.turns?t.credits/t.turns:0}function v(t){
return isFinite(t)?Math.abs(t)>=1e3?Math.round(t).toLocaleString():(Math.round(t*10)/10).toLocaleString():"\u2014"}function ue(t,e){
let n=t.dims.hours;if(!n.length)return"";let a=n[n.length-1],u=Date.parse(`${a.slice(0,10)}T${a.slice(11,13)}:00:00Z`);return new Date(
u-e*36e5).toISOString().slice(0,13)}function j(t,e,n){return t.rows.filter(a=>{let u=t.dims.hours[a[S.hour]];return u>=e&&
(n===""||u<n)})}function Ee(t,e){if(!t)return"";let n=Date.parse(`${t.slice(0,10)}T${t.slice(11,13)}:00:00Z`);return new Date(
n+e*36e5).toISOString().slice(0,13)}function Ae(t,e){if(!t||!e)return 0;let n=Date.parse(`${t.slice(0,10)}T${t.slice(11,
13)}:00:00Z`),a=Date.parse(`${e.slice(0,10)}T${e.slice(11,13)}:00:00Z`);return Math.round((a-n)/36e5)}function q(t,e){if(e===
"all")return{current:t.rows,prior:[],lo:""};if(e==="cycle"){let{start_hour:i,prev_start_hour:d}=t.cycle,c=t.dims.hours,o=c.
length?c[c.length-1]:i,m=Math.max(1,Ae(i,o)+1),g=Ee(d,m);return g>i&&(g=i),{current:j(t,i,""),prior:j(t,d,g),lo:i}}let n=Number(
e),a=ue(t,n*24),u=ue(t,n*48);return{current:j(t,a,""),prior:j(t,u,a),lo:a}}function he(t,e){return e==="cycle"?Math.max(
1,Math.round((Date.now()-Date.parse(t.cycle.start_utc))/864e5)):e==="all"?0:Number(e)}function X(t){let e=me();for(let n of t)
e.credits+=n[S.credits],e.turns+=n[S.turns];return e}function T(t,e){let n=new Map;for(let a of t){let u=e(a),i=n.get(u);
i||n.set(u,i=me()),i.credits+=a[S.credits],i.turns+=a[S.turns]}return n}var L=(t,e,n)=>t.dims[n][e[S[n]]],B=(t,e,n)=>{let a=t.
dims.hours[e[S.hour]];return n==="hour"?a:a.slice(0,10)},Oe="Unscheduled \xB7 ",fe=t=>t.startsWith(Oe);function K(t,e,n){
if(e==="session"){let a=t.labels.session?.[n];return a||n}return n||"(unlabelled)"}function be(t,e,n){return e==="sessio\
n"&&t.labels.session?.[n]?n:""}function ye(t,e,n,a){let u=T(e,d=>L(t,d,a)),i=T(n,d=>L(t,d,a));return[...u.entries()].sort(
(d,c)=>c[1].credits-d[1].credits||d[0].localeCompare(c[0])).map(([d,c])=>{let o=i.get(d);return{key:d,cell:c,deltaPct:o&&
o.credits>0?(c.credits-o.credits)/o.credits*100:null}})}function F(t,e){return e>0?(t-e)/e*100:null}function xe(t,e,n=1.5){
let{current:a,prior:u}=q(t,e==="all"?"30":e),i=T(a,o=>L(t,o,"model")),d=T(u,o=>L(t,o,"model")),c=[];for(let[o,m]of i){let g=d.
get(o);if(!g||!g.turns||!m.turns)continue;let f=m.credits/m.turns,h=g.credits/g.turns;h>0&&f/h>=n&&c.push({name:o,was:h,
now:f,ratio:f/h})}return c.sort((o,m)=>m.ratio-o.ratio)}import{Fragment as Ge,jsx as r,jsxs as p}from"react/jsx-runtime";var ke="usage-lens-styles",Ue=8,We=5;function je(){Se(()=>{
if(document.getElementById(ke))return;let t=document.createElement("style");t.id=ke,t.textContent=ce,document.head.appendChild(
t)},[])}function H({label:t,options:e,value:n,onChange:a}){return p("div",{className:"ul-group",children:[r("span",{className:"\
ul-group-label",children:t}),r("span",{className:"ul-seg",role:"group","aria-label":t,children:e.map(u=>r("button",{type:"\
button","aria-pressed":u.key===n,onClick:()=>a(u.key),children:u.label},String(u.key)))})]})}function ee({value:t,suffix:e="\
vs prior window"}){if(t===null)return r("span",{className:"ul-delta ul-flat",children:"no prior window"});let n=Math.round(
t);return n===0?p("span",{className:"ul-delta ul-flat",children:["flat ",e]}):p("span",{className:`ul-delta ${n>0?"ul-up":
"ul-down"}`,children:[n>0?"\u25B2":"\u25BC"," ",Math.abs(n),"% ",e]})}function Fe(){je();let t=Re(),[e,n]=C(null),[a,u]=C(
!1),[i,d]=C(""),[c,o]=C(!0),[m,g]=C("cycle"),[f,h]=C("hour"),[b,E]=C("model"),[$,A]=C("credits"),_=we(()=>{try{return Intl.
DateTimeFormat().resolvedOptions().timeZone||""}catch{return""}},[]),M=()=>{o(!0),t.get(`/api/apps/usage-lens/series?day\
s=0${_?`&tz=${encodeURIComponent(_)}`:""}`).then(s=>{let{series:k,stale:z}=pe(s);n(k),u(z),d("")}).catch(s=>d(s instanceof
Error?s.message:String(s))).finally(()=>o(!1))};Se(M,[_]);let l=we(()=>{if(!e)return null;let{current:s,prior:k}=q(e,m),
z=X(s),Ce=X(k),te=ye(e,s,k,b),W=te.slice(0,Ue),J=new Map(W.map((x,R)=>[x.key,V[R%V.length]])),re=[...new Set(s.map(x=>B(
e,x,f)))].sort(),$e=W.map(x=>{let R=T(s.filter(w=>L(e,w,b)===x.key),w=>B(e,w,f));return{name:K(e,b,x.key),color:J.get(x.
key),values:re.map(w=>{let D=R.get(w);return D?ge(D,$):0})}}),ne=[...new Set(s.map(x=>B(e,x,"day")))].sort(),_e=W.slice(
0,We).map(x=>{let R=T(s.filter(w=>L(e,w,b)===x.key),w=>B(e,w,"day"));return{name:K(e,b,x.key),color:J.get(x.key),values:ne.
map(w=>{let D=R.get(w);return D&&D.turns?D.credits/D.turns:null})}});return{now:z,before:Ce,rows:te,top:W,colours:J,buckets:re,
byBucket:$e,unitLabels:ne,unit:_e,jumps:xe(e,m),distinct:new Set(s.map(x=>x[S[b]])).size,reconcile:m==="cycle"&&typeof e.
official.credits_used=="number"?{official:e.official.credits_used,local:z.credits,gap:e.official.credits_used-z.credits,
coveragePct:e.official.credits_used?z.credits/e.official.credits_used*100:null}:null}},[e,m,f,b,$]),O=Z.find(s=>s.key===
b).label,Ne=Y.find(s=>s.key===$).label;return p("div",{className:"ul-root",children:[r(Ie,{title:"Usage Lens",subtitle:"\
Credits by model, surface, agent, scheduled job, and session \u2014 from the gateway's own usage shards",actions:r(Q,{onClick:M,
disabled:c,children:c?"Loading\u2026":"Refresh"})}),p("div",{className:"ul-body",children:[p("div",{className:"ul-contro\
ls",children:[r(H,{label:"Window",options:de.map(s=>({key:s.key,label:s.label})),value:m,onChange:g}),r(H,{label:"Granul\
arity",options:[{key:"hour",label:"Hourly"},{key:"day",label:"Daily"}],value:f,onChange:h}),r(H,{label:"Break down by",options:Z,
value:b,onChange:E}),r(H,{label:"Metric",options:Y,value:$,onChange:A})]}),i?r(ve,{title:"Could not read usage data",subtitle:i,
action:r(Q,{onClick:M,children:"Try again"})}):!e||!l?r(Be,{rows:6}):e.rows.length===0?r(ve,{title:"No usage recorded ye\
t",subtitle:"The gateway writes one row per agent turn to usage/tokens. Run a turn, then refresh.",action:r(Q,{onClick:M,
children:"Refresh"})}):p(Ge,{children:[a&&r("div",{className:"ul-flag ul-flag-info",children:p("div",{children:[r("div",
{className:"ul-flag-title",children:"The gateway is still running an older copy of this app"}),p("p",{className:"ul-flag\
-body",children:["Installing an app copies its files and re-registers its routes, but the backend module is already load\
ed in the gateway process \u2014 so this page is newer than the code answering it. Run ",r("span",{className:"ul-mono",children:"\
kirocrew restart"})," to get the billing-cycle window aligned to Kiro's own reset date, the reconciliation against Kiro'\
s meter, and the named ",r("span",{className:"ul-mono",children:"Unscheduled \xB7"})," ","rows under Scheduled job. Unti\
l then the cycle is assumed to start on the 1st of the month on your clock, which is not the same instant as Kiro's UTC \
reset."]})]})}),l.jumps.length>0&&r("div",{className:"ul-flag",children:p("div",{children:[r("div",{className:"ul-flag-t\
itle",children:"Unit cost jumped"}),p("p",{className:"ul-flag-body",children:["Against the preceding window of equal len\
gth,"," ",l.jumps.map((s,k)=>p("span",{children:[k>0?"; ":"",r("span",{className:"ul-mono",children:s.name})," went from\
 ",v(s.was)," to"," ",v(s.now)," credits per turn (\xD7",s.ratio.toFixed(1),")"]},s.name)),". Same work costing more loo\
ks like this; more work at the same price does not \u2014 check the credits-per-turn trend below to tell them apart."]})]})}),
p("div",{className:"ul-kpis",children:[r(G,{label:"Credits",value:v(l.now.credits),sub:r(ee,{value:F(l.now.credits,l.before.
credits)}),accent:!0}),r(G,{label:"Turns",value:l.now.turns.toLocaleString(),sub:r(ee,{value:F(l.now.turns,l.before.turns)})}),
r(G,{label:"Credits / turn",value:v(l.now.turns?l.now.credits/l.now.turns:0),sub:r(ee,{value:F(l.now.turns?l.now.credits/
l.now.turns:0,l.before.turns?l.before.credits/l.before.turns:0)})}),r(G,{label:`Distinct ${O.toLowerCase()}`,value:String(
l.distinct)})]}),l.reconcile&&p(I,{style:{marginBottom:14},children:[r(U,{children:"Against Kiro's own meter \u2014 this bill\
ing cycle"}),p("div",{className:"ul-recon",children:[p("div",{className:"ul-recon-cell",children:[r("span",{className:"u\
l-recon-label",children:"Kiro reports"}),r("span",{className:"ul-recon-value",children:v(l.reconcile.official)}),p("span",
{className:"ul-recon-sub",children:[e.official.credits_plan?`of ${v(e.official.credits_plan)} in ${e.official.plan||"pla\
n"}`:"credits used",typeof e.official.cost_usd=="number"&&e.official.cost_usd>0?` \xB7 $${e.official.cost_usd.toFixed(2)}\
 overage`:""]})]}),p("div",{className:"ul-recon-cell",children:[r("span",{className:"ul-recon-label",children:"This page\
 can attribute"}),r("span",{className:"ul-recon-value",children:v(l.reconcile.local)}),r("span",{className:"ul-recon-sub",
children:l.reconcile.coveragePct!==null?`${l.reconcile.coveragePct.toFixed(1)}% of Kiro's figure`:"from the local usage \
shards"})]}),p("div",{className:"ul-recon-cell",children:[r("span",{className:"ul-recon-label",children:"Unattributed"}),
r("span",{className:"ul-recon-value ul-up",children:v(l.reconcile.gap)}),r("span",{className:"ul-recon-sub",children:"Ki\
ro usage that did not go through this gateway"})]})]}),p("p",{className:"ul-chart-note",children:["The two will not matc\
h, and the gap is the useful part. Kiro's meter counts every credit on the account \u2014 the Kiro IDE, and any ",r("spa\
n",{className:"ul-mono",children:"kiro-cli"})," ","session you drive yourself. This page can only see turns the gateway \
ran, so the difference is your usage from everywhere else. Cycle boundary:"," ",r("span",{className:"ul-mono",children:e.
cycle.start_utc.slice(0,10)})," to"," ",r("span",{className:"ul-mono",children:e.cycle.resets})," UTC",e.cycle.source===
"kiro-api"?", from Kiro's own reset date":" (assumed UTC calendar month \u2014 Kiro did not report a reset date)",", sho\
wn on your clock from"," ",p("span",{className:"ul-mono",children:[e.cycle.start_hour.replace("T"," "),":00"]}),"."," ",
"Day ",he(e,"cycle")," of the cycle."]})]}),p("div",{className:"ul-charts",children:[p(I,{children:[r(U,{children:`${Ne}\
 over time \u2014 ${f==="hour"?"hourly":"daily"}, stacked by ${O.toLowerCase()}`}),r(ae,{labels:l.buckets,series:l.byBucket,
labelOf:s=>f==="hour"?`${s.slice(5,10)} ${s.slice(11,13)}h`:s.slice(5),unit:$==="turns"?" turns":" credits"}),r(ie,{items:l.
top.map(s=>({name:K(e,b,s.key),color:l.colours.get(s.key)}))})]}),p(I,{children:[r(U,{children:`Share of credits by ${O.
toLowerCase()}`}),r(le,{slices:l.top.map(s=>({name:K(e,b,s.key),value:s.cell.credits,color:l.colours.get(s.key)}))}),r("\
p",{className:"ul-chart-note",children:"Always credits, whichever metric is selected above: a share of a per-turn ratio \
has no meaning."})]})]}),p(I,{style:{marginBottom:14},children:[r(U,{children:"Credits per turn, by day"}),r("p",{className:"\
ul-chart-note",children:"The price signal. A line that steps up while its work stays the same size is a repricing or a c\
ontext blow-up, not more work."}),r(oe,{labels:l.unitLabels.map(s=>s.slice(5)),series:l.unit})]}),p(I,{children:[r(U,{children:`\
By ${O.toLowerCase()} \u2014 ${l.rows.length} ${l.rows.length===1?"entry":"entries"}`}),r("div",{className:"ul-table-wra\
p",children:p("table",{className:"ul-table",children:[r("thead",{children:p("tr",{children:[r("th",{children:O}),r("th",
{children:"Credits"}),r("th",{children:"Share"}),r("th",{children:"Turns"}),r("th",{children:"Credits / turn"}),r("th",{
children:"vs prior window"})]})}),r("tbody",{children:l.rows.map(s=>{let k=be(e,b,s.key);return p("tr",{children:[p("td",
{children:[p("span",{className:`ul-name${fe(s.key)?" ul-unscheduled":""}`,children:[r("span",{className:"ul-sw",style:{background:l.
colours.get(s.key)||"var(--border-strong, var(--border))"}}),r("span",{children:K(e,b,s.key)})]}),k?r("span",{className:"\
ul-sub ul-mono",children:k}):null]}),r("td",{children:v(s.cell.credits)}),r("td",{children:l.now.credits>0?`${(s.cell.credits/
l.now.credits*100).toFixed(1)}%`:"\u2014"}),r("td",{children:s.cell.turns.toLocaleString()}),r("td",{children:v(s.cell.turns?
s.cell.credits/s.cell.turns:0)}),r("td",{children:s.deltaPct===null?r("span",{className:"ul-flat",children:"new"}):p("sp\
an",{className:s.deltaPct>=0?"ul-up":"ul-down",children:[s.deltaPct>=0?"+":"",Math.round(s.deltaPct),"%"]})})]},s.key)})})]})}),
p("p",{className:"ul-foot",children:[`${e.shards} daily shard${e.shards===1?"":"s"} \xB7 times in ${e.tz} \xB7 generated ${e.
generated_at.replace("T"," ").slice(0,16)}`,r("br",{}),"Credits are the only cost figure the gateway records for every t\
urn: token counts and USD cost are written by the ",r("span",{className:"ul-mono",children:"claude_code"})," and"," ",r(
"span",{className:"ul-mono",children:"bedrock"})," providers only, and are zero on ACP turns. Subagent turns are attribu\
ted to the ",r("span",{className:"ul-mono",children:"subagent"})," surface \u2014 they carry no pointer back to the session t\
hat spawned them.",r("br",{}),"Under ",r("strong",{children:"Scheduled job"}),", a row prefixed"," ",r("span",{className:"\
ul-mono",children:"Unscheduled \xB7"})," is not a job: it is interactive chat, a subagent, the task runner, or backgroun\
d maintenance, named by which one."]})]})]})]})]})}export{Fe as default};
