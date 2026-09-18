import{useEffect as ve,useMemo as ye,useState as T}from"react";import{useAppApi as Le}from"@kirocrew/app-sdk";import{Card as O,
CardTitle as I,Btn as X,StatCard as F,ContentSkeleton as Pe,EmptyState as xe,PageHeader as Ee}from"@kirocrew/app-sdk/ui";import{jsx as b,jsxs as L}from"react/jsx-runtime";var C={top:8,right:6,bottom:20,left:42};function Ce(t){if(t<=0)return 1;
let e=10**Math.floor(Math.log10(t)),n=t/e;return(n<=1?1:n<=2?2:n<=5?5:10)*e}var $e=t=>t>=1e4?`${Math.round(t/1e3)}k`:t>=
1e3?`${(t/1e3).toFixed(1).replace(/\.0$/,"")}k`:String(Math.round(t*10)/10);function _e(t,e){return Math.max(1,Math.ceil(
t/e))}function ne({width:t,height:e,max:n,labels:a,labelOf:u,maxLabels:i=12,children:g}){let c={w:t-C.left-C.right,h:e-C.
top-C.bottom},o=Ce(n),d=f=>c.h-f/o*c.h,h=[0,.25,.5,.75,1].map(f=>o*f),p=_e(a.length,i);return b("svg",{className:"ul-svg",
viewBox:`0 0 ${t} ${e}`,role:"img",preserveAspectRatio:"none",children:L("g",{transform:`translate(${C.left},${C.top})`,
children:[h.map(f=>L("g",{children:[b("line",{className:"ul-grid",x1:0,x2:c.w,y1:d(f),y2:d(f)}),b("text",{className:"ul-\
axis",x:-6,y:d(f)+3,textAnchor:"end",children:$e(f)})]},f)),g(d,c),a.map((f,y)=>y%p===0||y===a.length-1?b("text",{className:"\
ul-axis",x:(y+.5)/a.length*c.w,y:c.h+13,textAnchor:"middle",children:u?u(f):f},f):null)]})})}function se({labels:t,series:e,
labelOf:n,unit:a="",height:u=260}){let g=t.map((h,p)=>e.reduce((f,y)=>f+(y.values[p]??0),0)),c=Math.max(...g,0),o=t.length?
(720-C.left-C.right)/t.length:0,d=Math.max(1,Math.min(o*.78,34));return b(ne,{width:720,height:u,max:c,labels:t,labelOf:n,
children:(h,p)=>t.map((f,y)=>{let E=0,K=(y+.5)*o-d/2;return L("g",{children:[b("title",{children:`${n?n(f):f} \xB7 ${Math.
round(g[y]*10)/10}${a}`}),e.map(S=>{let l=S.values[y]??0;if(l<=0)return null;let N=h(E+l),G=h(E);return E+=l,b("rect",{className:"\
ul-bar",x:K,y:N,width:d,height:Math.max(.6,G-N),fill:S.color},S.name)}),b("rect",{x:y*o,y:0,width:o,height:p.h,fill:"tra\
nsparent"})]},f)})})}function ae({labels:t,series:e,height:n=210}){let u=Math.max(...e.flatMap(i=>i.values.map(g=>g??0)),
0);return b(ne,{width:720,height:n,max:u,labels:t,children:(i,g)=>{let c=o=>t.length>1?o/(t.length-1)*g.w:g.w/2;return e.
map(o=>{let d=o.values.map((h,p)=>h===null?null:`${c(p)},${i(h)}`).filter(h=>h!==null);return d.length?L("g",{children:[
b("polyline",{points:d.join(" "),fill:"none",stroke:o.color,strokeWidth:2,strokeLinejoin:"round",strokeLinecap:"round"}),
o.values.map((h,p)=>h===null?null:b("circle",{cx:c(p),cy:i(h),r:2.2,fill:o.color,children:b("title",{children:`${o.name}\
 \xB7 ${t[p]} \xB7 ${Math.round(h*10)/10}`})},p))]},o.name):null})}})}function oe({slices:t,size:e=200,thickness:n=26}){
let a=t.reduce((o,d)=>o+d.value,0),u=e/2-n/2-1,i=e/2,g=2*Math.PI*u,c=0;return L("svg",{className:"ul-svg",viewBox:`0 0 ${e}\
 ${e}`,role:"img",style:{maxHeight:e},children:[a<=0?b("circle",{cx:i,cy:i,r:u,fill:"none",stroke:"var(--border)",strokeWidth:n}):
t.map(o=>{let d=o.value/a*g,h=`${d} ${g-d}`,p=b("circle",{cx:i,cy:i,r:u,fill:"none",stroke:o.color,strokeWidth:n,strokeDasharray:h,
strokeDashoffset:-c,transform:`rotate(-90 ${i} ${i})`,children:b("title",{children:`${o.name} \xB7 ${Math.round(o.value*
10)/10} (${(o.value/a*100).toFixed(1)}%)`})},o.name);return c+=d,p}),b("text",{x:i,y:i-2,textAnchor:"middle",style:{fill:"\
var(--text-strong)",fontSize:19,fontWeight:650},children:a>=1e3?`${Math.round(a/1e3)}k`:Math.round(a)}),b("text",{x:i,y:i+
15,textAnchor:"middle",style:{fill:"var(--muted)",fontSize:10},children:"credits"})]})}function le({items:t}){return b("\
div",{className:"ul-legend",children:t.map(e=>L("span",{className:"ul-legend-item",title:e.sub||e.name,children:[b("span",
{className:"ul-sw",style:{background:e.color}}),b("span",{className:"ul-legend-name",children:e.name})]},e.name))})}var ie=String.raw`
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
  .ul-flag-title { color:var(--text-strong); font-size:13px; font-weight:650; }
  .ul-flag-body { margin:3px 0 0; color:var(--text); font-size:12.5px; line-height:1.5; }
  .ul-foot { margin-top:14px; color:var(--muted); font-size:11px; line-height:1.6; }
`;var k={hour:0,model:1,surface:2,agent:3,job:4,session:5,credits:6,turns:7},J=[{key:"model",label:"Model"},{key:"surface",
label:"Surface"},{key:"agent",label:"Agent"},{key:"job",label:"Scheduled job"},{key:"session",label:"Session"}],ue=[{key:"\
1",label:"24h"},{key:"3",label:"3d"},{key:"7",label:"7d"},{key:"14",label:"14d"},{key:"30",label:"30d"},{key:"cycle",label:"\
This cycle"},{key:"all",label:"All"}],Z=[{key:"credits",label:"Credits"},{key:"turns",label:"Turns"},{key:"per_turn",label:"\
Credits / turn"}],V=["#5b8dfb","#f2777a","#79c98a","#e0b252","#b48ce3","#4bc3d4","#ef8f57","#8fa1c7","#d76fa8","#6fbf73"],
de=()=>({credits:0,turns:0});function pe(t,e){return e==="credits"?t.credits:e==="turns"?t.turns:t.turns?t.credits/t.turns:
0}function v(t){return isFinite(t)?Math.abs(t)>=1e3?Math.round(t).toLocaleString():(Math.round(t*10)/10).toLocaleString():
"\u2014"}function ce(t,e){let n=t.dims.hours;if(!n.length)return"";let a=n[n.length-1],u=Date.parse(`${a.slice(0,10)}T${a.
slice(11,13)}:00:00Z`);return new Date(u-e*36e5).toISOString().slice(0,13)}function A(t,e,n){return t.rows.filter(a=>{let u=t.
dims.hours[a[k.hour]];return u>=e&&(n===""||u<n)})}function Me(t,e){if(!t)return"";let n=Date.parse(`${t.slice(0,10)}T${t.
slice(11,13)}:00:00Z`);return new Date(n+e*36e5).toISOString().slice(0,13)}function De(t,e){if(!t||!e)return 0;let n=Date.
parse(`${t.slice(0,10)}T${t.slice(11,13)}:00:00Z`),a=Date.parse(`${e.slice(0,10)}T${e.slice(11,13)}:00:00Z`);return Math.
round((a-n)/36e5)}function Y(t,e){if(e==="all")return{current:t.rows,prior:[],lo:""};if(e==="cycle"){let{start_hour:i,prev_start_hour:g}=t.
cycle,c=t.dims.hours,o=c.length?c[c.length-1]:i,d=Math.max(1,De(i,o)+1),h=Me(g,d);return h>i&&(h=i),{current:A(t,i,""),prior:A(
t,g,h),lo:i}}let n=Number(e),a=ce(t,n*24),u=ce(t,n*48);return{current:A(t,a,""),prior:A(t,u,a),lo:a}}function me(t,e){return e===
"cycle"?Math.max(1,Math.round((Date.now()-Date.parse(t.cycle.start_utc))/864e5)):e==="all"?0:Number(e)}function q(t){let e=de();
for(let n of t)e.credits+=n[k.credits],e.turns+=n[k.turns];return e}function M(t,e){let n=new Map;for(let a of t){let u=e(
a),i=n.get(u);i||n.set(u,i=de()),i.credits+=a[k.credits],i.turns+=a[k.turns]}return n}var D=(t,e,n)=>t.dims[n][e[k[n]]],
B=(t,e,n)=>{let a=t.dims.hours[e[k.hour]];return n==="hour"?a:a.slice(0,10)},Te="Unscheduled \xB7 ",ge=t=>t.startsWith(Te);
function P(t,e,n){if(e==="session"){let a=t.labels.session?.[n];return a||n}return n||"(unlabelled)"}function he(t,e,n){
return e==="session"&&t.labels.session?.[n]?n:""}function fe(t,e,n,a){let u=M(e,g=>D(t,g,a)),i=M(n,g=>D(t,g,a));return[...u.
entries()].sort((g,c)=>c[1].credits-g[1].credits||g[0].localeCompare(c[0])).map(([g,c])=>{let o=i.get(g);return{key:g,cell:c,
deltaPct:o&&o.credits>0?(c.credits-o.credits)/o.credits*100:null}})}function U(t,e){return e>0?(t-e)/e*100:null}function be(t,e,n=1.5){
let{current:a,prior:u}=Y(t,e==="all"?"30":e),i=M(a,o=>D(t,o,"model")),g=M(u,o=>D(t,o,"model")),c=[];for(let[o,d]of i){let h=g.
get(o);if(!h||!h.turns||!d.turns)continue;let p=d.credits/d.turns,f=h.credits/h.turns;f>0&&p/f>=n&&c.push({name:o,was:f,
now:p,ratio:p/f})}return c.sort((o,d)=>d.ratio-o.ratio)}import{Fragment as Ie,jsx as r,jsxs as m}from"react/jsx-runtime";var we="usage-lens-styles",Ke=8,ze=5;function Be(){ve(()=>{
if(document.getElementById(we))return;let t=document.createElement("style");t.id=we,t.textContent=ie,document.head.appendChild(
t)},[])}function j({label:t,options:e,value:n,onChange:a}){return m("div",{className:"ul-group",children:[r("span",{className:"\
ul-group-label",children:t}),r("span",{className:"ul-seg",role:"group","aria-label":t,children:e.map(u=>r("button",{type:"\
button","aria-pressed":u.key===n,onClick:()=>a(u.key),children:u.label},String(u.key)))})]})}function Q({value:t,suffix:e="\
vs prior window"}){if(t===null)return r("span",{className:"ul-delta ul-flat",children:"no prior window"});let n=Math.round(
t);return n===0?m("span",{className:"ul-delta ul-flat",children:["flat ",e]}):m("span",{className:`ul-delta ${n>0?"ul-up":
"ul-down"}`,children:[n>0?"\u25B2":"\u25BC"," ",Math.abs(n),"% ",e]})}function Oe(){Be();let t=Le(),[e,n]=T(null),[a,u]=T(
""),[i,g]=T(!0),[c,o]=T("cycle"),[d,h]=T("hour"),[p,f]=T("model"),[y,E]=T("credits"),K=ye(()=>{try{return Intl.DateTimeFormat().
resolvedOptions().timeZone||""}catch{return""}},[]),S=()=>{g(!0),t.get(`/api/apps/usage-lens/series?days=0${K?`&tz=${encodeURIComponent(
K)}`:""}`).then(s=>{n(s),u("")}).catch(s=>u(s instanceof Error?s.message:String(s))).finally(()=>g(!1))};ve(S,[K]);let l=ye(
()=>{if(!e)return null;let{current:s,prior:$}=Y(e,c),R=q(s),ke=q($),ee=fe(e,s,$,p),W=ee.slice(0,Ke),H=new Map(W.map((x,z)=>[
x.key,V[z%V.length]])),te=[...new Set(s.map(x=>B(e,x,d)))].sort(),Se=W.map(x=>{let z=M(s.filter(w=>D(e,w,p)===x.key),w=>B(
e,w,d));return{name:P(e,p,x.key),color:H.get(x.key),values:te.map(w=>{let _=z.get(w);return _?pe(_,y):0})}}),re=[...new Set(
s.map(x=>B(e,x,"day")))].sort(),Ne=W.slice(0,ze).map(x=>{let z=M(s.filter(w=>D(e,w,p)===x.key),w=>B(e,w,"day"));return{name:P(
e,p,x.key),color:H.get(x.key),values:re.map(w=>{let _=z.get(w);return _&&_.turns?_.credits/_.turns:null})}});return{now:R,
before:ke,rows:ee,top:W,colours:H,buckets:te,byBucket:Se,unitLabels:re,unit:Ne,jumps:be(e,c),distinct:new Set(s.map(x=>x[k[p]])).
size,reconcile:c==="cycle"&&typeof e.official.credits_used=="number"?{official:e.official.credits_used,local:R.credits,gap:e.
official.credits_used-R.credits,coveragePct:e.official.credits_used?R.credits/e.official.credits_used*100:null}:null}},[
e,c,d,p,y]),N=J.find(s=>s.key===p).label,G=Z.find(s=>s.key===y).label;return m("div",{className:"ul-root",children:[r(Ee,
{title:"Usage Lens",subtitle:"Credits by model, surface, agent, scheduled job, and session \u2014 from the gateway's own usag\
e shards",actions:r(X,{onClick:S,disabled:i,children:i?"Loading\u2026":"Refresh"})}),m("div",{className:"ul-body",children:[
m("div",{className:"ul-controls",children:[r(j,{label:"Window",options:ue.map(s=>({key:s.key,label:s.label})),value:c,onChange:o}),
r(j,{label:"Granularity",options:[{key:"hour",label:"Hourly"},{key:"day",label:"Daily"}],value:d,onChange:h}),r(j,{label:"\
Break down by",options:J,value:p,onChange:f}),r(j,{label:"Metric",options:Z,value:y,onChange:E})]}),a?r(xe,{title:"Could\
 not read usage data",subtitle:a,action:r(X,{onClick:S,children:"Try again"})}):!e||!l?r(Pe,{rows:6}):e.rows.length===0?
r(xe,{title:"No usage recorded yet",subtitle:"The gateway writes one row per agent turn to usage/tokens. Run a turn, the\
n refresh.",action:r(X,{onClick:S,children:"Refresh"})}):m(Ie,{children:[l.jumps.length>0&&r("div",{className:"ul-flag",
children:m("div",{children:[r("div",{className:"ul-flag-title",children:"Unit cost jumped"}),m("p",{className:"ul-flag-b\
ody",children:["Against the preceding window of equal length,"," ",l.jumps.map((s,$)=>m("span",{children:[$>0?"; ":"",r(
"span",{className:"ul-mono",children:s.name})," went from ",v(s.was)," to"," ",v(s.now)," credits per turn (\xD7",s.ratio.
toFixed(1),")"]},s.name)),". Same work costing more looks like this; more work at the same price does not \u2014 check the cr\
edits-per-turn trend below to tell them apart."]})]})}),m("div",{className:"ul-kpis",children:[r(F,{label:"Credits",value:v(
l.now.credits),sub:r(Q,{value:U(l.now.credits,l.before.credits)}),accent:!0}),r(F,{label:"Turns",value:l.now.turns.toLocaleString(),
sub:r(Q,{value:U(l.now.turns,l.before.turns)})}),r(F,{label:"Credits / turn",value:v(l.now.turns?l.now.credits/l.now.turns:
0),sub:r(Q,{value:U(l.now.turns?l.now.credits/l.now.turns:0,l.before.turns?l.before.credits/l.before.turns:0)})}),r(F,{label:`\
Distinct ${N.toLowerCase()}`,value:String(l.distinct)})]}),l.reconcile&&m(O,{style:{marginBottom:14},children:[r(I,{children:"\
Against Kiro's own meter \u2014 this billing cycle"}),m("div",{className:"ul-recon",children:[m("div",{className:"ul-rec\
on-cell",children:[r("span",{className:"ul-recon-label",children:"Kiro reports"}),r("span",{className:"ul-recon-value",children:v(
l.reconcile.official)}),m("span",{className:"ul-recon-sub",children:[e.official.credits_plan?`of ${v(e.official.credits_plan)}\
 in ${e.official.plan||"plan"}`:"credits used",typeof e.official.cost_usd=="number"&&e.official.cost_usd>0?` \xB7 $${e.official.
cost_usd.toFixed(2)} overage`:""]})]}),m("div",{className:"ul-recon-cell",children:[r("span",{className:"ul-recon-label",
children:"This page can attribute"}),r("span",{className:"ul-recon-value",children:v(l.reconcile.local)}),r("span",{className:"\
ul-recon-sub",children:l.reconcile.coveragePct!==null?`${l.reconcile.coveragePct.toFixed(1)}% of Kiro's figure`:"from th\
e local usage shards"})]}),m("div",{className:"ul-recon-cell",children:[r("span",{className:"ul-recon-label",children:"U\
nattributed"}),r("span",{className:"ul-recon-value ul-up",children:v(l.reconcile.gap)}),r("span",{className:"ul-recon-su\
b",children:"Kiro usage that did not go through this gateway"})]})]}),m("p",{className:"ul-chart-note",children:["The tw\
o will not match, and the gap is the useful part. Kiro's meter counts every credit on the account \u2014 the Kiro IDE, and an\
y ",r("span",{className:"ul-mono",children:"kiro-cli"})," ","session you drive yourself. This page can only see turns th\
e gateway ran, so the difference is your usage from everywhere else. Cycle boundary:"," ",r("span",{className:"ul-mono",
children:e.cycle.start_utc.slice(0,10)})," to"," ",r("span",{className:"ul-mono",children:e.cycle.resets})," UTC",e.cycle.
source==="kiro-api"?", from Kiro's own reset date":" (assumed UTC calendar month \u2014 Kiro did not report a reset date)",
", shown on your clock from"," ",m("span",{className:"ul-mono",children:[e.cycle.start_hour.replace("T"," "),":00"]}),".",
" ","Day ",me(e,"cycle")," of the cycle."]})]}),m("div",{className:"ul-charts",children:[m(O,{children:[r(I,{children:`${G}\
 over time \u2014 ${d==="hour"?"hourly":"daily"}, stacked by ${N.toLowerCase()}`}),r(se,{labels:l.buckets,series:l.byBucket,
labelOf:s=>d==="hour"?`${s.slice(5,10)} ${s.slice(11,13)}h`:s.slice(5),unit:y==="turns"?" turns":" credits"}),r(le,{items:l.
top.map(s=>({name:P(e,p,s.key),color:l.colours.get(s.key)}))})]}),m(O,{children:[r(I,{children:`Share of credits by ${N.
toLowerCase()}`}),r(oe,{slices:l.top.map(s=>({name:P(e,p,s.key),value:s.cell.credits,color:l.colours.get(s.key)}))}),r("\
p",{className:"ul-chart-note",children:"Always credits, whichever metric is selected above: a share of a per-turn ratio \
has no meaning."})]})]}),m(O,{style:{marginBottom:14},children:[r(I,{children:"Credits per turn, by day"}),r("p",{className:"\
ul-chart-note",children:"The price signal. A line that steps up while its work stays the same size is a repricing or a c\
ontext blow-up, not more work."}),r(ae,{labels:l.unitLabels.map(s=>s.slice(5)),series:l.unit})]}),m(O,{children:[r(I,{children:`\
By ${N.toLowerCase()} \u2014 ${l.rows.length} ${l.rows.length===1?"entry":"entries"}`}),r("div",{className:"ul-table-wra\
p",children:m("table",{className:"ul-table",children:[r("thead",{children:m("tr",{children:[r("th",{children:N}),r("th",
{children:"Credits"}),r("th",{children:"Share"}),r("th",{children:"Turns"}),r("th",{children:"Credits / turn"}),r("th",{
children:"vs prior window"})]})}),r("tbody",{children:l.rows.map(s=>{let $=he(e,p,s.key);return m("tr",{children:[m("td",
{children:[m("span",{className:`ul-name${ge(s.key)?" ul-unscheduled":""}`,children:[r("span",{className:"ul-sw",style:{background:l.
colours.get(s.key)||"var(--border-strong, var(--border))"}}),r("span",{children:P(e,p,s.key)})]}),$?r("span",{className:"\
ul-sub ul-mono",children:$}):null]}),r("td",{children:v(s.cell.credits)}),r("td",{children:l.now.credits>0?`${(s.cell.credits/
l.now.credits*100).toFixed(1)}%`:"\u2014"}),r("td",{children:s.cell.turns.toLocaleString()}),r("td",{children:v(s.cell.turns?
s.cell.credits/s.cell.turns:0)}),r("td",{children:s.deltaPct===null?r("span",{className:"ul-flat",children:"new"}):m("sp\
an",{className:s.deltaPct>=0?"ul-up":"ul-down",children:[s.deltaPct>=0?"+":"",Math.round(s.deltaPct),"%"]})})]},s.key)})})]})}),
m("p",{className:"ul-foot",children:[`${e.shards} daily shard${e.shards===1?"":"s"} \xB7 times in ${e.tz} \xB7 generated ${e.
generated_at.replace("T"," ").slice(0,16)}`,r("br",{}),"Credits are the only cost figure the gateway records for every t\
urn: token counts and USD cost are written by the ",r("span",{className:"ul-mono",children:"claude_code"})," and"," ",r(
"span",{className:"ul-mono",children:"bedrock"})," providers only, and are zero on ACP turns. Subagent turns are attribu\
ted to the ",r("span",{className:"ul-mono",children:"subagent"})," surface \u2014 they carry no pointer back to the session t\
hat spawned them.",r("br",{}),"Under ",r("strong",{children:"Scheduled job"}),", a row prefixed"," ",r("span",{className:"\
ul-mono",children:"Unscheduled \xB7"})," is not a job: it is interactive chat, a subagent, the task runner, or backgroun\
d maintenance, named by which one."]})]})]})]})]})}export{Oe as default};
