/**
 * The video frame as one HTML page (1080×1920) with a `render(t)` function: Playwright calls it
 * for every frame and screenshots the result (render.ts), so the animation is exact and the same
 * every time. The look is the site's hook card: dark paper, the yellow signal frame and numbers,
 * Inter Display headlines, JetBrains Mono figures. Text comes only from the spec (our own data and
 * wording); the JSON is escaped so nothing in it can close the script tag.
 */
import type { VideoSpec } from "./price-video";

export interface SceneAssets {
  /** Absolute directory holding inter-var.woff2, inter-display-var.woff2, jetbrains-mono-500.woff2. */
  fontsDir: string;
  /** Absolute path of the square logo PNG. */
  logo: string;
}

export const FRAME = { width: 1080, height: 1920 };

export function sceneHtml(spec: VideoSpec, starts: number[], assets: SceneAssets): string {
  const data = JSON.stringify({
    months: spec.months,
    series: spec.series,
    from: spec.from,
    to: spec.to,
    starts,
    sentences: spec.sentences.map((s) => ({ caption: s.caption, panel: s.panel ?? null, sweep: !!s.sweep })),
  }).replace(/</g, "\\u003c");
  const f = (name: string) => `file://${assets.fontsDir.replace(/\/$/, "")}/${name}`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const tiles = spec.tiles
    .map((t) => `<div class="tile"><div class="l">${esc(t.label)}</div><div class="v">${esc(t.value)}</div><div class="p">${esc(t.pct)}</div></div>`)
    .join("");
  return `<!doctype html><html lang="mn"><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url(${f("inter-var.woff2")}) format("woff2");font-weight:100 900}
@font-face{font-family:Disp;src:url(${f("inter-display-var.woff2")}) format("woff2");font-weight:650 850}
@font-face{font-family:Mono;src:url(${f("jetbrains-mono-500.woff2")}) format("woff2")}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${FRAME.width}px;height:${FRAME.height}px;background:#0f1012;color:#f4f4f2;font-family:Inter;overflow:hidden}
.abs{position:absolute;left:80px;right:80px}
.mono{font-family:Mono;text-transform:uppercase;letter-spacing:.06em}
#frame{position:absolute;inset:36px;border:3px solid #ffd400;border-radius:12px}
#brand{top:96px;display:flex;align-items:center;gap:20px}
#brand img{width:72px;height:72px;border-radius:14px}
#brand b{font-family:Disp;font-weight:800;font-size:40px;letter-spacing:-.02em}
#brand span{margin-left:auto;font-size:26px;color:#9a9c9f}
#kicker{top:228px;right:auto;font-size:30px;color:#0f1012;background:#ffd400;padding:10px 18px;border-radius:6px}
#title{top:300px;font-family:Disp;font-weight:800;font-size:92px;line-height:1.02;letter-spacing:-.035em;white-space:nowrap}
#sub{top:420px;font-size:32px;color:#9a9c9f}
#big{top:500px;display:flex;align-items:baseline;gap:22px}
#num{font-family:Mono;font-size:168px;letter-spacing:-.04em;color:#fff}
#cur{font-family:Mono;font-size:80px;color:#ffd400}
#when{top:700px;font-size:30px;color:#9a9c9f}
#chart{position:absolute;left:80px;top:770px;width:920px;height:400px}
#panel{top:1210px;height:250px}
.panel{position:absolute;inset:0;opacity:0}
.chip{display:inline-block;background:#ffd400;color:#0f1012;font-family:Mono;font-size:64px;padding:14px 28px;border-radius:10px}
.note{font-size:28px;color:#9a9c9f;margin-top:18px}
.tiles{display:grid;grid-template-columns:repeat(${Math.max(1, spec.tiles.length)},1fr);border-top:2px solid #2a2c30}
.tile{padding:18px 10px 0 14px;border-right:2px solid #2a2c30}
.tile:first-child{padding-left:0}.tile:last-child{border-right:0}
.tile .l{font-family:Mono;font-size:22px;color:#9a9c9f;text-transform:uppercase}
.tile .v{font-family:Mono;font-size:40px;margin-top:8px}
.tile .p{font-family:Mono;font-size:28px;color:#ffd400;margin-top:6px}
.url{font-family:Disp;font-weight:800;font-size:60px;letter-spacing:-.03em}
#cap{top:1490px;font-family:Disp;font-weight:750;font-size:50px;line-height:1.18;letter-spacing:-.02em;text-wrap:balance}
#cap em{font-style:normal;color:#ffd400}
.nw{white-space:nowrap}
#src{top:1716px;font-size:24px;color:#9a9c9f}
</style></head><body>
<div id="frame"></div>
<div id="brand" class="abs"><img src="file://${assets.logo}" alt=""><b>ИЛ ТОД МЭДЭЭ</b><span class="mono">iltodmedee.mn</span></div>
<div id="kicker" class="abs mono">${esc(spec.kicker)}</div>
<div id="title" class="abs">${esc(spec.title)}</div>
<div id="sub" class="abs">${esc(spec.sub)}</div>
<div id="big" class="abs"><span id="num"></span><span id="cur">₮</span></div>
<div id="when" class="abs mono"></div>
<svg id="chart" viewBox="0 0 920 400"><g id="grid"></g><path id="area" fill="rgba(255,212,0,.10)"/><path id="line" fill="none" stroke="#ffd400" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><circle id="dot" r="14" fill="#ffd400"/><circle id="dot0" r="11" fill="#0f1012" stroke="#ffd400" stroke-width="5"/></svg>
<div id="panel" class="abs">
 <div id="p-ratio" class="panel"><span class="chip">${esc(spec.ratioChip)}</span><div class="note mono">${esc(spec.ratioNote)}</div></div>
 <div id="p-tiles" class="panel"><div class="tiles">${tiles}</div></div>
 <div id="p-link" class="panel"><div class="url">${esc(spec.link.replace(/#.*$/, ""))}</div><div class="note mono">13 бараа · 21 аймаг · 2010 оноос</div></div>
</div>
<div id="cap" class="abs"></div>
<div id="src" class="abs mono">${esc(spec.source)}</div>
<script>
const D=${data};
const M=D.months,V=D.series,W=920,H=400,PAD=16;
const max=Math.max(...V.filter(v=>v!=null))*1.05;
const x=i=>PAD+(W-2*PAD)*i/(M.length-1),y=v=>H-PAD-(H-2*PAD)*v/max;
const last=+M[D.to].slice(0,4);
const g=document.getElementById('grid');
for(const yr of [last-15,last-10,last-5,last]){let i=M.findIndex(m=>m.startsWith(yr+'-'));if(i<0)continue;const end=yr===last;
 g.insertAdjacentHTML('beforeend','<line x1="'+x(i)+'" x2="'+x(i)+'" y1="0" y2="'+H+'" stroke="#2a2c30" stroke-width="2"/><text x="'+(end?x(i)-8:x(i)+8)+'" text-anchor="'+(end?'end':'start')+'" y="34" fill="#6d6f73" font-family="Mono" font-size="24">'+yr+'</text>')}
const ease=t=>t<=0?0:t>=1?1:1-Math.pow(1-t,3);
const fmt=n=>Math.round(n).toLocaleString('en-US').replace(/,/g,'<span style="display:inline-block;width:.28em"></span>');
function path(k){let p='';for(let i=0;i<=k;i++){if(V[i]==null)continue;p+=(p?'L':'M')+x(i).toFixed(1)+','+y(V[i]).toFixed(1)}return [p,p?p+'L'+x(k)+','+H+'L'+x(0)+','+H+'Z':'']}
function current(t){let s=0;for(let i=0;i<D.starts.length;i++)if(t>=D.starts[i]-0.15)s=i;return s}
const sweepAt=(()=>{const i=D.sentences.findIndex(s=>s.sweep);return i<0?null:D.starts[i]+0.35})();
window.render=function(t){
 const s=current(t);
 let k=D.from;
 if(sweepAt!==null&&t>=sweepAt)k=D.from+Math.round((D.to-D.from)*ease((t-sweepAt)/2.6));
 const [p,a]=path(k);
 document.getElementById('line').setAttribute('d',p);document.getElementById('area').setAttribute('d',a);
 const dot=document.getElementById('dot');dot.setAttribute('cx',x(k));dot.setAttribute('cy',y(V[k]??0));
 const d0=document.getElementById('dot0');d0.setAttribute('cx',x(D.from));d0.setAttribute('cy',y(V[D.from]));
 document.getElementById('num').innerHTML=fmt(V[k]??0);
 document.getElementById('when').textContent=M[k].replace('-','.')+(k===D.from?' · '+${JSON.stringify(spec.kicker.replace(/^.*· /, "").toLowerCase())}:k===D.to?' · одоо':'');
 const panel=D.sentences[s].panel;
 for(const id of ['ratio','tiles','link']){const e=document.getElementById('p-'+id);let from=D.starts[s];for(let j=s;j>=0&&D.sentences[j].panel===id;j--)from=D.starts[j];
  const v=panel===id?ease((t-from)/0.35):0;e.style.opacity=v;e.style.transform='translateY('+((1-v)*30)+'px)'}
 const cap=document.getElementById('cap');cap.innerHTML=D.sentences[s].caption;cap.style.opacity=s===0?1:ease((t-D.starts[s]+0.15)/0.25);
};
window.fit=function(){const T=document.getElementById('title');let fs=92;while(T.scrollWidth>T.clientWidth&&fs>52){fs-=4;T.style.fontSize=fs+'px'}};
window.render(0);
</script></body></html>`;
}
