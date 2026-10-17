// Charts and the statistics table for The Count of the Market.
// Expects a global D written by build_site.py, one row per week, oldest first:
// [date, spx, spx_chg, adv, dec, net_ad, cum_ad, pct_adv, nh, nl, net_hl, hll, pct_adv_ma10, net_hl_ma4, tone]
// Scales and annotations are derived from D, so the same file draws every week's page.
(function () {
const N = D.length;
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ABBR = ["Jan.","Feb.","Mar.","Apr.","May","June","July","Aug.","Sept.","Oct.","Nov.","Dec."];
const DAY = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const parse = s => { const [y,m,d] = s.split("-").map(Number); return { y, m: m-1, d, wd: new Date(Date.UTC(y, m-1, d)).getUTCDay() }; };
const fmtDate = s => { const t = parse(s); return ABBR[t.m] + " " + t.d; };
const fmtInt = v => (v < 0 ? "−" : "") + Math.abs(Math.round(v)).toLocaleString("en-US");
const fmtSigned = v => (v > 0 ? "+" : "") + fmtInt(v);
const fmtIdx = v => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = v => v === 0 ? "0" : (v / 1000) + "k";
const NS = "http://www.w3.org/2000/svg";
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

function el(tag, attrs, parent, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
function ticks(lo, hi, step) { const out = []; for (let v = lo; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
function niceStep(raw) {
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => raw <= s);
}
// Range padded by one minor division and widened to whole major steps; optional floor/ceiling and zero.
function range(vals, majors, opts = {}) {
  let mn = Math.min(...vals), mx = Math.max(...vals);
  if (opts.zero) { mn = Math.min(mn, 0); mx = Math.max(mx, 0); }
  if (opts.lo != null) mn = Math.min(mn, opts.lo);
  if (opts.hi != null) mx = Math.max(mx, opts.hi);
  const major = niceStep((mx - mn || 1) / majors), minor = major / 5;
  return { lo: Math.floor((mn - minor) / major) * major, hi: Math.ceil((mx + minor) / major) * major, major, minor };
}
function monthStarts() {
  const idx = []; let last = -1;
  D.forEach((r, i) => { const t = parse(r[0]), key = t.y * 12 + t.m; if (key !== last) { idx.push(i); last = key; } });
  return idx;
}

// A plate: weekly cells across, a month band on top, pen filter, hatch and stipple fills.
function plate(host, height, ml, mr, bandH) {
  host.innerHTML = "";
  const W = Math.max(300, host.clientWidth);
  const svg = el("svg", { viewBox: `0 0 ${W} ${height}`, height, role: "img" }, host);
  const cw = (W - ml - mr) / N;
  const x = i => ml + (i + .5) * cw, edge = i => ml + i * cw;
  const ink = css("--ink"), plateC = css("--plate");
  const defs = el("defs", {}, svg), id = host.id;
  const flt = el("filter", { id: "r-" + id, filterUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height }, defs);
  el("feTurbulence", { type: "fractalNoise", baseFrequency: "0.045", numOctaves: 2, seed: 4, result: "n" }, flt);
  el("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: 1.8 }, flt);
  const hp = el("pattern", { id: "h-" + id, width: 4.5, height: 4.5, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  el("line", { x1: 0, y1: 0, x2: 0, y2: 4.5, stroke: ink, "stroke-width": 1.2 }, hp);
  // stipple: a fixed scatter of dots, seeded so it never shimmers between redraws
  const sp = el("pattern", { id: "s-" + id, width: 26, height: 26, patternUnits: "userSpaceOnUse" }, defs);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 34; k++) el("circle", { cx: (rnd() * 26).toFixed(1), cy: (rnd() * 26).toFixed(1), r: (.45 + rnd() * .55).toFixed(2), fill: ink }, sp);
  const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
  const f = { svg, W, x, edge, cw, tip, ink, plateC, ml, mr, rough: `url(#r-${id})`, hatch: `url(#h-${id})`, stipple: `url(#s-${id})` };

  // month band, ruled into cells like the year band on the 1925 averages chart
  const ms = monthStarts();
  el("rect", { x: ml, y: 0, width: W - ml - mr, height: bandH, fill: plateC, stroke: ink, "stroke-width": 1.2 }, svg);
  ms.forEach((s, k) => {
    const e = k + 1 < ms.length ? ms[k + 1] : N, t = parse(D[s][0]);
    if (k) el("line", { x1: edge(s), x2: edge(s), y1: 0, y2: bandH, stroke: ink, "stroke-width": 1 }, svg);
    const label = MON[t.m].toUpperCase() + (t.m === 0 && k ? " ’" + String(t.y).slice(2) : "");
    // full month where it fits, its initial where the cell is narrow (phones), nothing in a sliver
    const cell = edge(e) - edge(s), text = cell > 34 ? label : cell > 12 ? label[0] : "";
    if (text) el("text", { x: (edge(s) + edge(e)) / 2, y: bandH - 5, "text-anchor": "middle", class: "band" }, svg, text);
  });
  return f;
}
// One gridded panel; returns its y scale.
function panel(f, y0, h, r) {
  const { svg, W, edge, ml, mr, ink } = f;
  const y = v => y0 + h - (v - r.lo) / (r.hi - r.lo) * h;
  const minC = css("--minor"), majC = css("--major");
  for (let i = 0; i <= N; i++) el("line", { x1: edge(i), x2: edge(i), y1: y0, y2: y0 + h, stroke: minC, "stroke-width": .8 }, svg);
  monthStarts().forEach(s => el("line", { x1: edge(s), x2: edge(s), y1: y0, y2: y0 + h, stroke: majC, "stroke-width": 1 }, svg));
  ticks(r.lo, r.hi, r.minor).forEach(v => {
    const isMaj = Math.abs(v / r.major - Math.round(v / r.major)) < 1e-6;
    el("line", { x1: ml, x2: W - mr, y1: y(v), y2: y(v), stroke: isMaj ? majC : minC, "stroke-width": isMaj ? 1 : .8 }, svg);
  });
  el("rect", { x: ml, y: y0, width: W - ml - mr, height: h, fill: "none", stroke: ink, "stroke-width": 1.4 }, svg);
  return y;
}
// Axis figures on both sides, at every major division except the frame edges.
function axes(f, y, r, fmt) {
  ticks(r.lo + r.major, r.hi - r.major, r.major).forEach(v => {
    el("text", { x: f.ml - 6, y: y(v) + 4, "text-anchor": "end" }, f.svg, fmt(v));
    el("text", { x: f.W - f.mr + 6, y: y(v) + 4 }, f.svg, fmt(v));
  });
}
// A label lettered inside a small ruled box over the grid, nudged to stay inside the plot.
function box(f, x, y, text, anchor = "start") {
  const g = el("g", {}, f.svg);
  const t = el("text", { x, y, "text-anchor": anchor, class: "box" }, g, text);
  const b = t.getBBox();
  g.insertBefore(el("rect", { x: b.x - 5, y: b.y - 2, width: b.width + 10, height: b.height + 4, fill: f.plateC, stroke: f.ink, "stroke-width": 1.1 }), t);
  const over = (b.x + b.width + 9) - (f.W - f.mr), under = (f.ml + 4) - (b.x - 5);
  const dx = over > 0 ? -over : under > 0 ? under : 0;
  if (dx) g.setAttribute("transform", `translate(${dx.toFixed(1)} 0)`);
  return g;
}
function dot(g, cx, cy, f) { el("circle", { cx, cy, r: 4.5, fill: f.ink, stroke: f.plateC, "stroke-width": 2 }, g); }
function hover(f, top, bottom, onWeek) {
  const { svg, x, tip, W } = f;
  const line = el("line", { y1: top, y2: bottom, stroke: f.ink, "stroke-width": 1, "stroke-dasharray": "3 3", visibility: "hidden" }, svg);
  const marks = el("g", {}, svg);
  const hit = el("rect", { x: f.edge(0), y: top, width: f.edge(N) - f.edge(0), height: bottom - top, fill: "transparent" }, svg);
  const move = ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (W / r.width);
    const i = Math.max(0, Math.min(N - 1, Math.floor((px - f.edge(0)) / f.cw)));
    line.setAttribute("x1", x(i)); line.setAttribute("x2", x(i)); line.setAttribute("visibility", "visible");
    marks.innerHTML = "";
    tip.innerHTML = onWeek(i, marks);
    tip.hidden = false;
    const hostW = svg.parentNode.clientWidth, left = (x(i) / W) * r.width;
    tip.style.left = (left + 16 + tip.offsetWidth > hostW ? left - tip.offsetWidth - 16 : left + 16) + "px";
    tip.style.top = "30px";
  };
  hit.addEventListener("pointermove", move);
  hit.addEventListener("pointerdown", move);
  hit.addEventListener("pointerleave", () => { line.setAttribute("visibility", "hidden"); marks.innerHTML = ""; tip.hidden = true; });
}
const pathOf = (pts, x, y) => pts.map(([i, v], k) => (k ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join("");
// Put a point's label above it in the lower half of a panel, below it in the upper half.
const labelY = (py, y0, h) => py > y0 + h / 2 ? py - 14 : py + 26;

// Fig. 1: two panels on one weekly ruling, each with its own scale (no dual axis).
function drawHero() {
  const host = document.getElementById("hero");
  const narrow = host.clientWidth < 560;
  const ml = narrow ? 40 : 50, mr = narrow ? 40 : 50, band = 20, pH = narrow ? 160 : 200, gap = 18;
  const y1 = band, y2 = band + pH + gap, H = y2 + pH + 2;
  const f = plate(host, H, ml, mr, band), { svg, x } = f;
  const spx = D.map((r, i) => [i, r[1]]).filter(p => p[1] != null), cum = D.map((r, i) => [i, r[6]]);

  const rS = range(spx.map(p => p[1]), 4);
  const yS = panel(f, y1, pH, rS);
  axes(f, yS, rS, v => v.toLocaleString("en-US"));
  const dS = pathOf(spx, x, yS);
  // the open ribbon line of the 1925 "combined averages"
  el("path", { d: dS, fill: "none", stroke: f.ink, "stroke-width": 7, "stroke-linejoin": "round", "stroke-linecap": "round", filter: f.rough }, svg);
  el("path", { d: dS, fill: "none", stroke: f.plateC, "stroke-width": 2.6, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
  box(f, f.edge(0) + 10, y1 + 22, "S. & P. 500 CLOSE");

  const rC = range(cum.map(p => p[1]), 5, { zero: true });
  const yC = panel(f, y2, pH, rC);
  axes(f, yC, rC, fmtK);
  el("rect", { x: f.edge(0), y: yC(0), width: f.edge(N) - f.edge(0), height: y2 + pH - yC(0), fill: f.stipple }, svg);
  el("line", { x1: f.edge(0), x2: f.edge(N), y1: yC(0), y2: yC(0), stroke: f.ink, "stroke-width": 1.8 }, svg);
  el("path", { d: pathOf(cum, x, yC), fill: "none", stroke: f.ink, "stroke-width": 3.4, "stroke-linejoin": "round", "stroke-linecap": "round", filter: f.rough }, svg);
  box(f, f.edge(0) + 10, y2 + 22, "CUMULATIVE ADVANCE-DECLINE LINE");

  const L = N - 1;
  let P = 0; cum.forEach(([i, v]) => { if (v >= cum[P][1]) P = i; });
  if (P < L - 1) {
    dot(svg, x(P), yC(cum[P][1]), f);
    box(f, x(P), labelY(yC(cum[P][1]), y2, pH), `PEAK, ${fmtDate(D[P][0]).toUpperCase()}: ${fmtInt(cum[P][1])}`, "middle");
    if (!narrow && D[P][1] != null && D[L][1] != null) {
      const pc = 100 * (D[L][1] / D[P][1] - 1), dl = cum[L][1] - cum[P][1];
      // anchored inside the plot's right edge so it never runs into the axis figures
      box(f, f.edge(N) - 10, yS(rS.lo + (rS.hi - rS.lo) * .12),
        `SINCE ${fmtDate(D[P][0]).toUpperCase()}: INDEX ${pc >= 0 ? "+" : "−"}${Math.abs(pc).toFixed(1)}%, LINE ${fmtSigned(dl)}`, "end");
    }
  }
  dot(svg, x(L), yC(cum[L][1]), f);
  box(f, x(L) - 10, labelY(yC(cum[L][1]), y2, pH), fmtInt(cum[L][1]), "end");
  if (D[L][1] != null) {
    dot(svg, x(L), yS(D[L][1]), f);
    box(f, x(L) - 10, labelY(yS(D[L][1]), y1, pH), narrow ? Math.round(D[L][1]).toLocaleString("en-US") : fmtIdx(D[L][1]), "end");
  }

  hover(f, y1, y2 + pH, (i, g) => {
    const r = D[i];
    if (r[1] != null) dot(g, x(i), yS(r[1]), f);
    dot(g, x(i), yC(r[6]), f);
    return `<b>Week of ${fmtDate(r[0])}</b><br>S.&amp;P. ${r[1] == null ? "—" : fmtIdx(r[1])}${r[2] == null ? "" : " (" + (r[2] > 0 ? "+" : "−") + Math.abs(r[2]).toFixed(2) + "%)"}<br>Cum. A-D ${fmtInt(r[6])}<br>Net for week ${fmtSigned(r[5])}`;
  });
}

// Figs. 2 and 3: hatched bars above the base, open bars on stippled ground below, heavy average line.
function drawBars(id, col, maCol, base, r, fmt, tipFn) {
  const host = document.getElementById(id);
  const ml = 38, mr = 38, band = 20, pH = 190, H = band + pH + 2;
  const f = plate(host, H, ml, mr, band), { svg, x } = f;
  const y = panel(f, band, pH, r);
  axes(f, y, r, fmt);
  el("rect", { x: f.edge(0), y: y(base), width: f.edge(N) - f.edge(0), height: band + pH - y(base), fill: f.stipple }, svg);
  const bw = Math.max(2, f.cw * .62);
  const g = el("g", { filter: f.rough }, svg);
  D.forEach((row, i) => {
    const v = row[col], up = v >= base, y0 = y(base), yv = y(v);
    el("rect", { x: x(i) - bw / 2, y: up ? yv : y0, width: bw, height: Math.max(1, Math.abs(yv - y0)), fill: up ? f.hatch : f.plateC, stroke: f.ink, "stroke-width": 1.2 }, g);
  });
  el("line", { x1: f.edge(0), x2: f.edge(N), y1: y(base), y2: y(base), stroke: f.ink, "stroke-width": 1.8 }, svg);
  const d = pathOf(D.map((row, i) => [i, row[maCol]]).filter(p => p[1] != null), x, y);
  if (d) {
    el("path", { d, fill: "none", stroke: f.plateC, "stroke-width": 7, "stroke-linejoin": "round" }, svg);
    el("path", { d, fill: "none", stroke: f.ink, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round", filter: f.rough }, svg);
  }
  hover(f, band, band + pH, (i, gg) => {
    if (D[i][maCol] != null) dot(gg, x(i), y(D[i][maCol]), f);
    return tipFn(D[i]);
  });
}

function drawAll() {
  drawHero();
  const pct = D.map(r => r[7]);
  drawBars("pct", 7, 12, 50, { lo: Math.min(20, Math.floor(Math.min(...pct) / 10) * 10), hi: Math.max(90, Math.ceil(Math.max(...pct) / 10) * 10), major: 10, minor: 2 }, v => v,
    r => `<b>Week of ${fmtDate(r[0])}</b><br>${r[7].toFixed(1)} per cent advancing<br>Ten-week average ${r[12] == null ? "—" : r[12].toFixed(1)}`);
  const rH = range(D.map(r => r[10]), 4, { zero: true });
  drawBars("nhnl", 10, 13, 0, rH, fmtK,
    r => `<b>Week of ${fmtDate(r[0])}</b><br>${r[8].toLocaleString()} highs, ${r[9].toLocaleString()} lows<br>Net ${fmtSigned(r[10])}<br>Four-week average ${r[13] == null ? "—" : fmtSigned(r[13])}`);
}

// MARKET STATISTICS, newest first, with dot leaders after the date as in the 1925 table
(function table() {
  const tb = document.querySelector("#weeks tbody");
  if (!tb) return;
  D.slice(-8).reverse().forEach((r, k) => {
    const t = parse(r[0]), tr = document.createElement("tr");
    if (k === 0) tr.className = "now";
    const chg = r[2] == null ? "" : (r[2] > 0 ? "+" : "−") + Math.abs(r[2]).toFixed(2) + "%";
    const tone = r[14] == null ? "" : r[14] === "diverging" ? "Diverging" : "Confirming";
    tr.innerHTML = `<td><div class="ld"><span>${DAY[t.wd]}, ${ABBR[t.m]} ${t.d}</span><i></i></div></td>` +
      `<td>${r[1] == null ? "—" : fmtIdx(r[1])}</td><td>${chg}</td><td>${fmtSigned(r[5])}</td><td>${fmtInt(r[6])}</td><td>${r[7].toFixed(1)}</td>` +
      `<td>${r[8].toLocaleString()}</td><td>${r[9].toLocaleString()}</td><td><span class="tone">${tone}</span></td>`;
    tb.appendChild(tr);
  });
})();

drawAll();
if (document.fonts) document.fonts.ready.then(drawAll);
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(drawAll, 120); });
})();
