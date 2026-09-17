import{useEffect as xe,useMemo as be,useState as T}from"react";import{useAppApi as Me}from"@kirocrew/app-sdk";import{Card as W,
CardTitle as G,Btn as q,StatCard as K,ContentSkeleton as $e,EmptyState as he,PageHeader as Le}from"@kirocrew/app-sdk/ui";import{jsx as x,jsxs as P}from"react/jsx-runtime";var C={top:8,right:6,bottom:20,left:42};function Se(t){if(t<=0)return 1;
let e=10**Math.floor(Math.log10(t)),r=t/e;return(r<=1?1:r<=2?2:r<=5?5:10)*e}var Ce=t=>t>=1e3?`${Math.round(t/1e3)}k`:String(
Math.round(t*10)/10);function Ne(t,e){return Math.max(1,Math.ceil(t/e))}function re({width:t,height:e,max:r,labels:o,labelOf:c,
maxLabels:d=12,children:p}){let m={w:t-C.left-C.right,h:e-C.top-C.bottom},l=Se(r),i=g=>m.h-g/l*m.h,b=[0,.25,.5,.75,1].map(
g=>l*g),u=Ne(o.length,d);return x("svg",{className:"ul-svg",viewBox:`0 0 ${t} ${e}`,role:"img",preserveAspectRatio:"none",
children:P("g",{transform:`translate(${C.left},${C.top})`,children:[b.map(g=>P("g",{children:[x("line",{className:"ul-gr\
id",x1:0,x2:m.w,y1:i(g),y2:i(g)}),x("text",{className:"ul-axis",x:-6,y:i(g)+3,textAnchor:"end",children:Ce(g)})]},g)),p(
i,m),o.map((g,f)=>f%u===0||f===o.length-1?x("text",{className:"ul-axis",x:(f+.5)/o.length*m.w,y:m.h+13,textAnchor:"middl\
e",children:c?c(g):g},g):null)]})})}function ne({labels:t,series:e,labelOf:r,unit:o="",height:c=260}){let p=t.map((b,u)=>e.
reduce((g,f)=>g+(f.values[u]??0),0)),m=Math.max(...p,0),l=t.length?(720-C.left-C.right)/t.length:0,i=Math.max(1,Math.min(
l*.78,34));return x(re,{width:720,height:c,max:m,labels:t,labelOf:r,children:(b,u)=>t.map((g,f)=>{let B=0,E=(f+.5)*l-i/2;
return P("g",{children:[x("title",{children:`${r?r(g):g} \xB7 ${Math.round(p[f]*10)/10}${o}`}),e.map(v=>{let a=v.values[f]??
0;if(a<=0)return null;let S=b(B+a),j=b(B);return B+=a,x("rect",{className:"ul-bar",x:E,y:S,width:i,height:Math.max(.6,j-
S),fill:v.color},v.name)}),x("rect",{x:f*l,y:0,width:l,height:u.h,fill:"transparent"})]},g)})})}function se({labels:t,series:e,
height:r=210}){let c=Math.max(...e.flatMap(d=>d.values.map(p=>p??0)),0);return x(re,{width:720,height:r,max:c,labels:t,children:(d,p)=>{
let m=l=>t.length>1?l/(t.length-1)*p.w:p.w/2;return e.map(l=>{let i=l.values.map((b,u)=>b===null?null:`${m(u)},${d(b)}`).
filter(b=>b!==null);return i.length?P("g",{children:[x("polyline",{points:i.join(" "),fill:"none",stroke:l.color,strokeWidth:2,
strokeLinejoin:"round",strokeLinecap:"round"}),l.values.map((b,u)=>b===null?null:x("circle",{cx:m(u),cy:d(b),r:2.2,fill:l.
color,children:x("title",{children:`${l.name} \xB7 ${t[u]} \xB7 ${Math.round(b*10)/10}`})},u))]},l.name):null})}})}function oe({
slices:t,size:e=200,thickness:r=26}){let o=t.reduce((l,i)=>l+i.value,0),c=e/2-r/2-1,d=e/2,p=2*Math.PI*c,m=0;return P("sv\
g",{className:"ul-svg",viewBox:`0 0 ${e} ${e}`,role:"img",style:{maxHeight:e},children:[o<=0?x("circle",{cx:d,cy:d,r:c,fill:"\
none",stroke:"var(--border)",strokeWidth:r}):t.map(l=>{let i=l.value/o*p,b=`${i} ${p-i}`,u=x("circle",{cx:d,cy:d,r:c,fill:"\
none",stroke:l.color,strokeWidth:r,strokeDasharray:b,strokeDashoffset:-m,transform:`rotate(-90 ${d} ${d})`,children:x("t\
itle",{children:`${l.name} \xB7 ${Math.round(l.value*10)/10} (${(l.value/o*100).toFixed(1)}%)`})},l.name);return m+=i,u}),
x("text",{x:d,y:d-2,textAnchor:"middle",style:{fill:"var(--text-strong)",fontSize:19,fontWeight:650},children:o>=1e3?`${Math.
round(o/1e3)}k`:Math.round(o)}),x("text",{x:d,y:d+15,textAnchor:"middle",style:{fill:"var(--muted)",fontSize:10},children:"\
credits"})]})}function ae({items:t}){return x("div",{className:"ul-legend",children:t.map(e=>P("span",{className:"ul-leg\
end-item",title:e.sub||e.name,children:[x("span",{className:"ul-sw",style:{background:e.color}}),x("span",{className:"ul\
-legend-name",children:e.name})]},e.name))})}var le=String.raw`
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
label:"Surface"},{key:"agent",label:"Agent"},{key:"job",label:"Scheduled job"},{key:"session",label:"Session"}],ie=[{days:1,
label:"24h"},{days:3,label:"3d"},{days:7,label:"7d"},{days:14,label:"14d"},{days:30,label:"30d"},{days:0,label:"All"}],V=[
{key:"credits",label:"Credits"},{key:"turns",label:"Turns"},{key:"per_turn",label:"Credits / turn"}],Y=["#5b8dfb","#f277\
7a","#79c98a","#e0b252","#b48ce3","#4bc3d4","#ef8f57","#8fa1c7","#d76fa8","#6fbf73"],ue=()=>({credits:0,turns:0});function ce(t,e){
return e==="credits"?t.credits:e==="turns"?t.turns:t.turns?t.credits/t.turns:0}function D(t){return isFinite(t)?Math.abs(
t)>=1e3?Math.round(t).toLocaleString():(Math.round(t*10)/10).toLocaleString():"\u2014"}function I(t,e){let r=t.dims.hours;
if(!r.length)return"";let o=r[r.length-1],c=Date.parse(`${o.slice(0,10)}T${o.slice(11,13)}:00:00Z`);return new Date(c-e*
36e5).toISOString().slice(0,13)}function _(t,e,r){return t.rows.filter(o=>{let c=t.dims.hours[o[k.hour]];return c>=e&&(r===
""||c<r)})}function de(t,e){if(!e)return{current:t.rows,prior:[],lo:""};let r=I(t,e*24),o=I(t,e*48);return{current:_(t,r,
""),prior:_(t,o,r),lo:r}}function Z(t){let e=ue();for(let r of t)e.credits+=r[k.credits],e.turns+=r[k.turns];return e}function $(t,e){
let r=new Map;for(let o of t){let c=e(o),d=r.get(c);d||r.set(c,d=ue()),d.credits+=o[k.credits],d.turns+=o[k.turns]}return r}
var L=(t,e,r)=>t.dims[r][e[k[r]]],R=(t,e,r)=>{let o=t.dims.hours[e[k.hour]];return r==="hour"?o:o.slice(0,10)};function z(t,e,r){
if(e==="session"){let o=t.labels.session?.[r];return o||r}return e==="job"?r||"(not scheduled)":r||"(unlabelled)"}function pe(t,e,r){
return e==="session"&&t.labels.session?.[r]?r:""}function me(t,e,r,o){let c=$(e,p=>L(t,p,o)),d=$(r,p=>L(t,p,o));return[...c.
entries()].sort((p,m)=>m[1].credits-p[1].credits||p[0].localeCompare(m[0])).map(([p,m])=>{let l=d.get(p);return{key:p,cell:m,
deltaPct:l&&l.credits>0?(m.credits-l.credits)/l.credits*100:null}})}function F(t,e){return e>0?(t-e)/e*100:null}function ge(t,e,r=1.5){
let o=e||3,c=I(t,o*24),d=I(t,o*48),p=$(_(t,c,""),i=>L(t,i,"model")),m=$(_(t,d,c),i=>L(t,i,"model")),l=[];for(let[i,b]of p){
let u=m.get(i);if(!u||!u.turns||!b.turns)continue;let g=b.credits/b.turns,f=u.credits/u.turns;f>0&&g/f>=r&&l.push({name:i,
was:f,now:g,ratio:g/f})}return l.sort((i,b)=>b.ratio-i.ratio)}import{Fragment as Be,jsx as n,jsxs as h}from"react/jsx-runtime";var fe="usage-lens-styles",De=8,Te=5;function Pe(){xe(()=>{
if(document.getElementById(fe))return;let t=document.createElement("style");t.id=fe,t.textContent=le,document.head.appendChild(
t)},[])}function U({label:t,options:e,value:r,onChange:o}){return h("div",{className:"ul-group",children:[n("span",{className:"\
ul-group-label",children:t}),n("span",{className:"ul-seg",role:"group","aria-label":t,children:e.map(c=>n("button",{type:"\
button","aria-pressed":c.key===r,onClick:()=>o(c.key),children:c.label},String(c.key)))})]})}function Q({value:t,suffix:e="\
vs prior window"}){if(t===null)return n("span",{className:"ul-delta ul-flat",children:"no prior window"});let r=Math.round(
t);return r===0?h("span",{className:"ul-delta ul-flat",children:["flat ",e]}):h("span",{className:`ul-delta ${r>0?"ul-up":
"ul-down"}`,children:[r>0?"\u25B2":"\u25BC"," ",Math.abs(r),"% ",e]})}function ze(){Pe();let t=Me(),[e,r]=T(null),[o,c]=T(
""),[d,p]=T(!0),[m,l]=T(3),[i,b]=T("hour"),[u,g]=T("model"),[f,B]=T("credits"),E=be(()=>{try{return Intl.DateTimeFormat().
resolvedOptions().timeZone||""}catch{return""}},[]),v=()=>{p(!0),t.get(`/api/apps/usage-lens/series?days=0${E?`&tz=${encodeURIComponent(
E)}`:""}`).then(s=>{r(s),c("")}).catch(s=>c(s instanceof Error?s.message:String(s))).finally(()=>p(!1))};xe(v,[E]);let a=be(
()=>{if(!e)return null;let{current:s,prior:N}=de(e,m),ye=Z(s),we=Z(N),X=me(e,s,N,u),A=X.slice(0,De),J=new Map(A.map((y,O)=>[
y.key,Y[O%Y.length]])),ee=[...new Set(s.map(y=>R(e,y,i)))].sort(),ke=A.map(y=>{let O=$(s.filter(w=>L(e,w,u)===y.key),w=>R(
e,w,i));return{name:z(e,u,y.key),color:J.get(y.key),values:ee.map(w=>{let M=O.get(w);return M?ce(M,f):0})}}),te=[...new Set(
s.map(y=>R(e,y,"day")))].sort(),ve=A.slice(0,Te).map(y=>{let O=$(s.filter(w=>L(e,w,u)===y.key),w=>R(e,w,"day"));return{name:z(
e,u,y.key),color:J.get(y.key),values:te.map(w=>{let M=O.get(w);return M&&M.turns?M.credits/M.turns:null})}});return{now:ye,
before:we,rows:X,top:A,colours:J,buckets:ee,byBucket:ke,unitLabels:te,unit:ve,jumps:ge(e,m),distinct:new Set(s.map(y=>y[k[u]])).
size}},[e,m,i,u,f]),S=H.find(s=>s.key===u).label,j=V.find(s=>s.key===f).label;return h("div",{className:"ul-root",children:[
n(Le,{title:"Usage Lens",subtitle:"Credits by model, surface, agent, scheduled job, and session \u2014 from the gateway's own\
 usage shards",actions:n(q,{onClick:v,disabled:d,children:d?"Loading\u2026":"Refresh"})}),h("div",{className:"ul-body",children:[
h("div",{className:"ul-controls",children:[n(U,{label:"Window",options:ie.map(s=>({key:s.days,label:s.label})),value:m,onChange:l}),
n(U,{label:"Granularity",options:[{key:"hour",label:"Hourly"},{key:"day",label:"Daily"}],value:i,onChange:b}),n(U,{label:"\
Break down by",options:H,value:u,onChange:g}),n(U,{label:"Metric",options:V,value:f,onChange:B})]}),o?n(he,{title:"Could\
 not read usage data",subtitle:o,action:n(q,{onClick:v,children:"Try again"})}):!e||!a?n($e,{rows:6}):e.rows.length===0?
n(he,{title:"No usage recorded yet",subtitle:"The gateway writes one row per agent turn to usage/tokens. Run a turn, the\
n refresh.",action:n(q,{onClick:v,children:"Refresh"})}):h(Be,{children:[a.jumps.length>0&&n("div",{className:"ul-flag",
children:h("div",{children:[n("div",{className:"ul-flag-title",children:"Unit cost jumped"}),h("p",{className:"ul-flag-b\
ody",children:["Against the preceding window of equal length,"," ",a.jumps.map((s,N)=>h("span",{children:[N>0?"; ":"",n(
"span",{className:"ul-mono",children:s.name})," went from ",D(s.was)," to"," ",D(s.now)," credits per turn (\xD7",s.ratio.
toFixed(1),")"]},s.name)),". Same work costing more looks like this; more work at the same price does not \u2014 check the cr\
edits-per-turn trend below to tell them apart."]})]})}),h("div",{className:"ul-kpis",children:[n(K,{label:"Credits",value:D(
a.now.credits),sub:n(Q,{value:F(a.now.credits,a.before.credits)}),accent:!0}),n(K,{label:"Turns",value:a.now.turns.toLocaleString(),
sub:n(Q,{value:F(a.now.turns,a.before.turns)})}),n(K,{label:"Credits / turn",value:D(a.now.turns?a.now.credits/a.now.turns:
0),sub:n(Q,{value:F(a.now.turns?a.now.credits/a.now.turns:0,a.before.turns?a.before.credits/a.before.turns:0)})}),n(K,{label:`\
Distinct ${S.toLowerCase()}`,value:String(a.distinct)})]}),h("div",{className:"ul-charts",children:[h(W,{children:[n(G,{
children:`${j} over time \u2014 ${i==="hour"?"hourly":"daily"}, stacked by ${S.toLowerCase()}`}),n(ne,{labels:a.buckets,
series:a.byBucket,labelOf:s=>i==="hour"?`${s.slice(5,10)} ${s.slice(11,13)}h`:s.slice(5),unit:f==="turns"?" turns":" cre\
dits"}),n(ae,{items:a.top.map(s=>({name:z(e,u,s.key),color:a.colours.get(s.key)}))})]}),h(W,{children:[n(G,{children:`Sh\
are of credits by ${S.toLowerCase()}`}),n(oe,{slices:a.top.map(s=>({name:z(e,u,s.key),value:s.cell.credits,color:a.colours.
get(s.key)}))}),n("p",{className:"ul-chart-note",children:"Always credits, whichever metric is selected above: a share o\
f a per-turn ratio has no meaning."})]})]}),h(W,{style:{marginBottom:14},children:[n(G,{children:"Credits per turn, by d\
ay"}),n("p",{className:"ul-chart-note",children:"The price signal. A line that steps up while its work stays the same si\
ze is a repricing or a context blow-up, not more work."}),n(se,{labels:a.unitLabels.map(s=>s.slice(5)),series:a.unit})]}),
h(W,{children:[n(G,{children:`By ${S.toLowerCase()} \u2014 ${a.rows.length} ${a.rows.length===1?"entry":"entries"}`}),n(
"div",{className:"ul-table-wrap",children:h("table",{className:"ul-table",children:[n("thead",{children:h("tr",{children:[
n("th",{children:S}),n("th",{children:"Credits"}),n("th",{children:"Share"}),n("th",{children:"Turns"}),n("th",{children:"\
Credits / turn"}),n("th",{children:"vs prior window"})]})}),n("tbody",{children:a.rows.map(s=>{let N=pe(e,u,s.key);return h(
"tr",{children:[h("td",{children:[h("span",{className:"ul-name",children:[n("span",{className:"ul-sw",style:{background:a.
colours.get(s.key)||"var(--border-strong, var(--border))"}}),n("span",{children:z(e,u,s.key)})]}),N?n("span",{className:"\
ul-sub ul-mono",children:N}):null]}),n("td",{children:D(s.cell.credits)}),n("td",{children:a.now.credits>0?`${(s.cell.credits/
a.now.credits*100).toFixed(1)}%`:"\u2014"}),n("td",{children:s.cell.turns.toLocaleString()}),n("td",{children:D(s.cell.turns?
s.cell.credits/s.cell.turns:0)}),n("td",{children:s.deltaPct===null?n("span",{className:"ul-flat",children:"new"}):h("sp\
an",{className:s.deltaPct>=0?"ul-up":"ul-down",children:[s.deltaPct>=0?"+":"",Math.round(s.deltaPct),"%"]})})]},s.key)})})]})}),
h("p",{className:"ul-foot",children:[`${e.shards} daily shard${e.shards===1?"":"s"} \xB7 times in ${e.tz} \xB7 generated ${e.
generated_at.replace("T"," ").slice(0,16)}`,n("br",{}),"Credits are the only cost figure the gateway records for every t\
urn: token counts and USD cost are written by the ",n("span",{className:"ul-mono",children:"claude_code"})," and"," ",n(
"span",{className:"ul-mono",children:"bedrock"})," providers only, and are zero on ACP turns. Subagent turns are attribu\
ted to the ",n("span",{className:"ul-mono",children:"subagent"})," surface \u2014 they carry no pointer back to the session t\
hat spawned them."]})]})]})]})]})}export{ze as default};
