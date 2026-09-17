import{useEffect as ve,useMemo as ye,useState as T}from"react";import{useAppApi as De}from"@kirocrew/app-sdk";import{Card as O,
CardTitle as R,Btn as X,StatCard as F,ContentSkeleton as Te,EmptyState as xe,PageHeader as Le}from"@kirocrew/app-sdk/ui";import{jsx as b,jsxs as L}from"react/jsx-runtime";var C={top:8,right:6,bottom:20,left:42};function Ce(t){if(t<=0)return 1;
let e=10**Math.floor(Math.log10(t)),n=t/e;return(n<=1?1:n<=2?2:n<=5?5:10)*e}var $e=t=>t>=1e3?`${Math.round(t/1e3)}k`:String(
Math.round(t*10)/10);function Me(t,e){return Math.max(1,Math.ceil(t/e))}function ne({width:t,height:e,max:n,labels:a,labelOf:c,
maxLabels:i=12,children:p}){let m={w:t-C.left-C.right,h:e-C.top-C.bottom},l=Ce(n),g=h=>m.h-h/l*m.h,f=[0,.25,.5,.75,1].map(
h=>l*h),u=Me(a.length,i);return b("svg",{className:"ul-svg",viewBox:`0 0 ${t} ${e}`,role:"img",preserveAspectRatio:"none",
children:L("g",{transform:`translate(${C.left},${C.top})`,children:[f.map(h=>L("g",{children:[b("line",{className:"ul-gr\
id",x1:0,x2:m.w,y1:g(h),y2:g(h)}),b("text",{className:"ul-axis",x:-6,y:g(h)+3,textAnchor:"end",children:$e(h)})]},h)),p(
g,m),a.map((h,y)=>y%u===0||y===a.length-1?b("text",{className:"ul-axis",x:(y+.5)/a.length*m.w,y:m.h+13,textAnchor:"middl\
e",children:c?c(h):h},h):null)]})})}function se({labels:t,series:e,labelOf:n,unit:a="",height:c=260}){let p=t.map((f,u)=>e.
reduce((h,y)=>h+(y.values[u]??0),0)),m=Math.max(...p,0),l=t.length?(720-C.left-C.right)/t.length:0,g=Math.max(1,Math.min(
l*.78,34));return b(ne,{width:720,height:c,max:m,labels:t,labelOf:n,children:(f,u)=>t.map((h,y)=>{let K=0,E=(y+.5)*l-g/2;
return L("g",{children:[b("title",{children:`${n?n(h):h} \xB7 ${Math.round(p[y]*10)/10}${a}`}),e.map(S=>{let o=S.values[y]??
0;if(o<=0)return null;let N=f(K+o),G=f(K);return K+=o,b("rect",{className:"ul-bar",x:E,y:N,width:g,height:Math.max(.6,G-
N),fill:S.color},S.name)}),b("rect",{x:y*l,y:0,width:l,height:u.h,fill:"transparent"})]},h)})})}function ae({labels:t,series:e,
height:n=210}){let c=Math.max(...e.flatMap(i=>i.values.map(p=>p??0)),0);return b(ne,{width:720,height:n,max:c,labels:t,children:(i,p)=>{
let m=l=>t.length>1?l/(t.length-1)*p.w:p.w/2;return e.map(l=>{let g=l.values.map((f,u)=>f===null?null:`${m(u)},${i(f)}`).
filter(f=>f!==null);return g.length?L("g",{children:[b("polyline",{points:g.join(" "),fill:"none",stroke:l.color,strokeWidth:2,
strokeLinejoin:"round",strokeLinecap:"round"}),l.values.map((f,u)=>f===null?null:b("circle",{cx:m(u),cy:i(f),r:2.2,fill:l.
color,children:b("title",{children:`${l.name} \xB7 ${t[u]} \xB7 ${Math.round(f*10)/10}`})},u))]},l.name):null})}})}function oe({
slices:t,size:e=200,thickness:n=26}){let a=t.reduce((l,g)=>l+g.value,0),c=e/2-n/2-1,i=e/2,p=2*Math.PI*c,m=0;return L("sv\
g",{className:"ul-svg",viewBox:`0 0 ${e} ${e}`,role:"img",style:{maxHeight:e},children:[a<=0?b("circle",{cx:i,cy:i,r:c,fill:"\
none",stroke:"var(--border)",strokeWidth:n}):t.map(l=>{let g=l.value/a*p,f=`${g} ${p-g}`,u=b("circle",{cx:i,cy:i,r:c,fill:"\
none",stroke:l.color,strokeWidth:n,strokeDasharray:f,strokeDashoffset:-m,transform:`rotate(-90 ${i} ${i})`,children:b("t\
itle",{children:`${l.name} \xB7 ${Math.round(l.value*10)/10} (${(l.value/a*100).toFixed(1)}%)`})},l.name);return m+=g,u}),
b("text",{x:i,y:i-2,textAnchor:"middle",style:{fill:"var(--text-strong)",fontSize:19,fontWeight:650},children:a>=1e3?`${Math.
round(a/1e3)}k`:Math.round(a)}),b("text",{x:i,y:i+15,textAnchor:"middle",style:{fill:"var(--muted)",fontSize:10},children:"\
credits"})]})}function le({items:t}){return b("div",{className:"ul-legend",children:t.map(e=>L("span",{className:"ul-leg\
end-item",title:e.sub||e.name,children:[b("span",{className:"ul-sw",style:{background:e.color}}),b("span",{className:"ul\
-legend-name",children:e.name})]},e.name))})}var ie=String.raw`
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
`;var k={hour:0,model:1,surface:2,agent:3,job:4,session:5,credits:6,turns:7},H=[{key:"model",label:"Model"},{key:"surface",
label:"Surface"},{key:"agent",label:"Agent"},{key:"job",label:"Scheduled job"},{key:"session",label:"Session"}],ue=[{key:"\
1",label:"24h"},{key:"3",label:"3d"},{key:"7",label:"7d"},{key:"14",label:"14d"},{key:"30",label:"30d"},{key:"cycle",label:"\
This cycle"},{key:"all",label:"All"}],V=[{key:"credits",label:"Credits"},{key:"turns",label:"Turns"},{key:"per_turn",label:"\
Credits / turn"}],Y=["#5b8dfb","#f2777a","#79c98a","#e0b252","#b48ce3","#4bc3d4","#ef8f57","#8fa1c7","#d76fa8","#6fbf73"],
de=()=>({credits:0,turns:0});function pe(t,e){return e==="credits"?t.credits:e==="turns"?t.turns:t.turns?t.credits/t.turns:
0}function v(t){return isFinite(t)?Math.abs(t)>=1e3?Math.round(t).toLocaleString():(Math.round(t*10)/10).toLocaleString():
"\u2014"}function ce(t,e){let n=t.dims.hours;if(!n.length)return"";let a=n[n.length-1],c=Date.parse(`${a.slice(0,10)}T${a.
slice(11,13)}:00:00Z`);return new Date(c-e*36e5).toISOString().slice(0,13)}function I(t,e,n){return t.rows.filter(a=>{let c=t.
dims.hours[a[k.hour]];return c>=e&&(n===""||c<n)})}function q(t,e){if(e==="all")return{current:t.rows,prior:[],lo:""};if(e===
"cycle"){let{start_hour:i,prev_start_hour:p}=t.cycle;return{current:I(t,i,""),prior:I(t,p,i),lo:i}}let n=Number(e),a=ce(
t,n*24),c=ce(t,n*48);return{current:I(t,a,""),prior:I(t,c,a),lo:a}}function me(t,e){return e==="cycle"?Math.max(1,Math.round(
(Date.now()-Date.parse(t.cycle.start_utc))/864e5)):e==="all"?0:Number(e)}function Z(t){let e=de();for(let n of t)e.credits+=
n[k.credits],e.turns+=n[k.turns];return e}function _(t,e){let n=new Map;for(let a of t){let c=e(a),i=n.get(c);i||n.set(c,
i=de()),i.credits+=a[k.credits],i.turns+=a[k.turns]}return n}var D=(t,e,n)=>t.dims[n][e[k[n]]],B=(t,e,n)=>{let a=t.dims.
hours[e[k.hour]];return n==="hour"?a:a.slice(0,10)},_e="Unscheduled \xB7 ",ge=t=>t.startsWith(_e);function P(t,e,n){if(e===
"session"){let a=t.labels.session?.[n];return a||n}return n||"(unlabelled)"}function he(t,e,n){return e==="session"&&t.labels.
session?.[n]?n:""}function fe(t,e,n,a){let c=_(e,p=>D(t,p,a)),i=_(n,p=>D(t,p,a));return[...c.entries()].sort((p,m)=>m[1].
credits-p[1].credits||p[0].localeCompare(m[0])).map(([p,m])=>{let l=i.get(p);return{key:p,cell:m,deltaPct:l&&l.credits>0?
(m.credits-l.credits)/l.credits*100:null}})}function U(t,e){return e>0?(t-e)/e*100:null}function be(t,e,n=1.5){let{current:a,
prior:c}=q(t,e==="all"?"30":e),i=_(a,l=>D(t,l,"model")),p=_(c,l=>D(t,l,"model")),m=[];for(let[l,g]of i){let f=p.get(l);if(!f||
!f.turns||!g.turns)continue;let u=g.credits/g.turns,h=f.credits/f.turns;h>0&&u/h>=n&&m.push({name:l,was:h,now:u,ratio:u/
h})}return m.sort((l,g)=>g.ratio-l.ratio)}import{Fragment as Be,jsx as r,jsxs as d}from"react/jsx-runtime";var we="usage-lens-styles",Pe=8,Ke=5;function Ee(){ve(()=>{
if(document.getElementById(we))return;let t=document.createElement("style");t.id=we,t.textContent=ie,document.head.appendChild(
t)},[])}function j({label:t,options:e,value:n,onChange:a}){return d("div",{className:"ul-group",children:[r("span",{className:"\
ul-group-label",children:t}),r("span",{className:"ul-seg",role:"group","aria-label":t,children:e.map(c=>r("button",{type:"\
button","aria-pressed":c.key===n,onClick:()=>a(c.key),children:c.label},String(c.key)))})]})}function Q({value:t,suffix:e="\
vs prior window"}){if(t===null)return r("span",{className:"ul-delta ul-flat",children:"no prior window"});let n=Math.round(
t);return n===0?d("span",{className:"ul-delta ul-flat",children:["flat ",e]}):d("span",{className:`ul-delta ${n>0?"ul-up":
"ul-down"}`,children:[n>0?"\u25B2":"\u25BC"," ",Math.abs(n),"% ",e]})}function ze(){Ee();let t=De(),[e,n]=T(null),[a,c]=T(
""),[i,p]=T(!0),[m,l]=T("cycle"),[g,f]=T("hour"),[u,h]=T("model"),[y,K]=T("credits"),E=ye(()=>{try{return Intl.DateTimeFormat().
resolvedOptions().timeZone||""}catch{return""}},[]),S=()=>{p(!0),t.get(`/api/apps/usage-lens/series?days=0${E?`&tz=${encodeURIComponent(
E)}`:""}`).then(s=>{n(s),c("")}).catch(s=>c(s instanceof Error?s.message:String(s))).finally(()=>p(!1))};ve(S,[E]);let o=ye(
()=>{if(!e)return null;let{current:s,prior:$}=q(e,m),W=Z(s),ke=Z($),ee=fe(e,s,$,u),A=ee.slice(0,Pe),J=new Map(A.map((x,z)=>[
x.key,Y[z%Y.length]])),te=[...new Set(s.map(x=>B(e,x,g)))].sort(),Se=A.map(x=>{let z=_(s.filter(w=>D(e,w,u)===x.key),w=>B(
e,w,g));return{name:P(e,u,x.key),color:J.get(x.key),values:te.map(w=>{let M=z.get(w);return M?pe(M,y):0})}}),re=[...new Set(
s.map(x=>B(e,x,"day")))].sort(),Ne=A.slice(0,Ke).map(x=>{let z=_(s.filter(w=>D(e,w,u)===x.key),w=>B(e,w,"day"));return{name:P(
e,u,x.key),color:J.get(x.key),values:re.map(w=>{let M=z.get(w);return M&&M.turns?M.credits/M.turns:null})}});return{now:W,
before:ke,rows:ee,top:A,colours:J,buckets:te,byBucket:Se,unitLabels:re,unit:Ne,jumps:be(e,m),distinct:new Set(s.map(x=>x[k[u]])).
size,reconcile:m==="cycle"&&typeof e.official.credits_used=="number"?{official:e.official.credits_used,local:W.credits,gap:e.
official.credits_used-W.credits,coveragePct:e.official.credits_used?W.credits/e.official.credits_used*100:null}:null}},[
e,m,g,u,y]),N=H.find(s=>s.key===u).label,G=V.find(s=>s.key===y).label;return d("div",{className:"ul-root",children:[r(Le,
{title:"Usage Lens",subtitle:"Credits by model, surface, agent, scheduled job, and session \u2014 from the gateway's own usag\
e shards",actions:r(X,{onClick:S,disabled:i,children:i?"Loading\u2026":"Refresh"})}),d("div",{className:"ul-body",children:[
d("div",{className:"ul-controls",children:[r(j,{label:"Window",options:ue.map(s=>({key:s.key,label:s.label})),value:m,onChange:l}),
r(j,{label:"Granularity",options:[{key:"hour",label:"Hourly"},{key:"day",label:"Daily"}],value:g,onChange:f}),r(j,{label:"\
Break down by",options:H,value:u,onChange:h}),r(j,{label:"Metric",options:V,value:y,onChange:K})]}),a?r(xe,{title:"Could\
 not read usage data",subtitle:a,action:r(X,{onClick:S,children:"Try again"})}):!e||!o?r(Te,{rows:6}):e.rows.length===0?
r(xe,{title:"No usage recorded yet",subtitle:"The gateway writes one row per agent turn to usage/tokens. Run a turn, the\
n refresh.",action:r(X,{onClick:S,children:"Refresh"})}):d(Be,{children:[o.jumps.length>0&&r("div",{className:"ul-flag",
children:d("div",{children:[r("div",{className:"ul-flag-title",children:"Unit cost jumped"}),d("p",{className:"ul-flag-b\
ody",children:["Against the preceding window of equal length,"," ",o.jumps.map((s,$)=>d("span",{children:[$>0?"; ":"",r(
"span",{className:"ul-mono",children:s.name})," went from ",v(s.was)," to"," ",v(s.now)," credits per turn (\xD7",s.ratio.
toFixed(1),")"]},s.name)),". Same work costing more looks like this; more work at the same price does not \u2014 check the cr\
edits-per-turn trend below to tell them apart."]})]})}),d("div",{className:"ul-kpis",children:[r(F,{label:"Credits",value:v(
o.now.credits),sub:r(Q,{value:U(o.now.credits,o.before.credits)}),accent:!0}),r(F,{label:"Turns",value:o.now.turns.toLocaleString(),
sub:r(Q,{value:U(o.now.turns,o.before.turns)})}),r(F,{label:"Credits / turn",value:v(o.now.turns?o.now.credits/o.now.turns:
0),sub:r(Q,{value:U(o.now.turns?o.now.credits/o.now.turns:0,o.before.turns?o.before.credits/o.before.turns:0)})}),r(F,{label:`\
Distinct ${N.toLowerCase()}`,value:String(o.distinct)})]}),o.reconcile&&d(O,{style:{marginBottom:14},children:[r(R,{children:"\
Against Kiro's own meter \u2014 this billing cycle"}),d("div",{className:"ul-recon",children:[d("div",{className:"ul-rec\
on-cell",children:[r("span",{className:"ul-recon-label",children:"Kiro reports"}),r("span",{className:"ul-recon-value",children:v(
o.reconcile.official)}),d("span",{className:"ul-recon-sub",children:[e.official.credits_plan?`of ${v(e.official.credits_plan)}\
 in ${e.official.plan||"plan"}`:"credits used",typeof e.official.cost_usd=="number"&&e.official.cost_usd>0?` \xB7 $${e.official.
cost_usd.toFixed(2)} overage`:""]})]}),d("div",{className:"ul-recon-cell",children:[r("span",{className:"ul-recon-label",
children:"This page can attribute"}),r("span",{className:"ul-recon-value",children:v(o.reconcile.local)}),r("span",{className:"\
ul-recon-sub",children:o.reconcile.coveragePct!==null?`${o.reconcile.coveragePct.toFixed(1)}% of Kiro's figure`:"from th\
e local usage shards"})]}),d("div",{className:"ul-recon-cell",children:[r("span",{className:"ul-recon-label",children:"U\
nattributed"}),r("span",{className:"ul-recon-value ul-up",children:v(o.reconcile.gap)}),r("span",{className:"ul-recon-su\
b",children:"Kiro usage that did not go through this gateway"})]})]}),d("p",{className:"ul-chart-note",children:["The tw\
o will not match, and the gap is the useful part. Kiro's meter counts every credit on the account \u2014 the Kiro IDE, and an\
y ",r("span",{className:"ul-mono",children:"kiro-cli"})," ","session you drive yourself. This page can only see turns th\
e gateway ran, so the difference is your usage from everywhere else. Cycle boundary:"," ",r("span",{className:"ul-mono",
children:e.cycle.start_utc.slice(0,10)})," to"," ",r("span",{className:"ul-mono",children:e.cycle.resets})," UTC",e.cycle.
source==="kiro-api"?", from Kiro's own reset date":" (assumed UTC calendar month \u2014 Kiro did not report a reset date)",
", shown on your clock from"," ",d("span",{className:"ul-mono",children:[e.cycle.start_hour.replace("T"," "),":00"]}),".",
" ","Day ",me(e,"cycle")," of the cycle."]})]}),d("div",{className:"ul-charts",children:[d(O,{children:[r(R,{children:`${G}\
 over time \u2014 ${g==="hour"?"hourly":"daily"}, stacked by ${N.toLowerCase()}`}),r(se,{labels:o.buckets,series:o.byBucket,
labelOf:s=>g==="hour"?`${s.slice(5,10)} ${s.slice(11,13)}h`:s.slice(5),unit:y==="turns"?" turns":" credits"}),r(le,{items:o.
top.map(s=>({name:P(e,u,s.key),color:o.colours.get(s.key)}))})]}),d(O,{children:[r(R,{children:`Share of credits by ${N.
toLowerCase()}`}),r(oe,{slices:o.top.map(s=>({name:P(e,u,s.key),value:s.cell.credits,color:o.colours.get(s.key)}))}),r("\
p",{className:"ul-chart-note",children:"Always credits, whichever metric is selected above: a share of a per-turn ratio \
has no meaning."})]})]}),d(O,{style:{marginBottom:14},children:[r(R,{children:"Credits per turn, by day"}),r("p",{className:"\
ul-chart-note",children:"The price signal. A line that steps up while its work stays the same size is a repricing or a c\
ontext blow-up, not more work."}),r(ae,{labels:o.unitLabels.map(s=>s.slice(5)),series:o.unit})]}),d(O,{children:[r(R,{children:`\
By ${N.toLowerCase()} \u2014 ${o.rows.length} ${o.rows.length===1?"entry":"entries"}`}),r("div",{className:"ul-table-wra\
p",children:d("table",{className:"ul-table",children:[r("thead",{children:d("tr",{children:[r("th",{children:N}),r("th",
{children:"Credits"}),r("th",{children:"Share"}),r("th",{children:"Turns"}),r("th",{children:"Credits / turn"}),r("th",{
children:"vs prior window"})]})}),r("tbody",{children:o.rows.map(s=>{let $=he(e,u,s.key);return d("tr",{children:[d("td",
{children:[d("span",{className:`ul-name${ge(s.key)?" ul-unscheduled":""}`,children:[r("span",{className:"ul-sw",style:{background:o.
colours.get(s.key)||"var(--border-strong, var(--border))"}}),r("span",{children:P(e,u,s.key)})]}),$?r("span",{className:"\
ul-sub ul-mono",children:$}):null]}),r("td",{children:v(s.cell.credits)}),r("td",{children:o.now.credits>0?`${(s.cell.credits/
o.now.credits*100).toFixed(1)}%`:"\u2014"}),r("td",{children:s.cell.turns.toLocaleString()}),r("td",{children:v(s.cell.turns?
s.cell.credits/s.cell.turns:0)}),r("td",{children:s.deltaPct===null?r("span",{className:"ul-flat",children:"new"}):d("sp\
an",{className:s.deltaPct>=0?"ul-up":"ul-down",children:[s.deltaPct>=0?"+":"",Math.round(s.deltaPct),"%"]})})]},s.key)})})]})}),
d("p",{className:"ul-foot",children:[`${e.shards} daily shard${e.shards===1?"":"s"} \xB7 times in ${e.tz} \xB7 generated ${e.
generated_at.replace("T"," ").slice(0,16)}`,r("br",{}),"Credits are the only cost figure the gateway records for every t\
urn: token counts and USD cost are written by the ",r("span",{className:"ul-mono",children:"claude_code"})," and"," ",r(
"span",{className:"ul-mono",children:"bedrock"})," providers only, and are zero on ACP turns. Subagent turns are attribu\
ted to the ",r("span",{className:"ul-mono",children:"subagent"})," surface \u2014 they carry no pointer back to the session t\
hat spawned them.",r("br",{}),"Under ",r("strong",{children:"Scheduled job"}),", a row prefixed"," ",r("span",{className:"\
ul-mono",children:"Unscheduled \xB7"})," is not a job: it is interactive chat, a subagent, the task runner, or backgroun\
d maintenance, named by which one."]})]})]})]})]})}export{ze as default};
