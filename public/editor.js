// 엄마 꾸미기 — 32x56 픽셀 에디터
import { CFG, LOOK_CH } from './shared.js?v=1';
import { S } from './sfx.js?v=1';

const W = CFG.LOOK_W, H = CFG.LOOK_H, N = W * H;
const LSget = (k, d) => { try { const v = localStorage.getItem('mc_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
const LSset = (k, v) => { try { localStorage.setItem('mc_' + k, JSON.stringify(v)); } catch (e) {} };

// ───────── 인코딩 ─────────
const hex2 = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
export function encode(px) {
  const pal = [], idx = new Map(); let d = '';
  for (let i = 0; i < N; i++) {
    const c = px[i]; if (!c) { d += '.'; continue; }
    let k = idx.get(c);
    if (k === undefined) {
      if (pal.length < 64) { k = pal.length; pal.push(c); idx.set(c, k); }
      else { // 64색 넘으면 가장 가까운 색으로
        const [r, g, b] = hex2(c); let best = 0, bd = 1e9;
        pal.forEach((p, j) => { const [R, G, B] = hex2(p); const dd = (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2; if (dd < bd) { bd = dd; best = j; } });
        k = best;
      }
    }
    d += LOOK_CH[k];
  }
  return { p: pal, d };
}
export function decode(v) {
  const px = new Array(N).fill(null);
  if (!v || !v.d) return px;
  for (let i = 0; i < N; i++) { const ch = v.d[i]; if (ch && ch !== '.') px[i] = v.p[LOOK_CH.indexOf(ch)] || null; }
  return px;
}
export function lookToCanvas(v, cv) {
  cv = cv || document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), im = g.createImageData(W, H), px = decode(v || defaultLook());
  for (let i = 0; i < N; i++) if (px[i]) { const [r, gg, b] = hex2(px[i]); im.data[i * 4] = r; im.data[i * 4 + 1] = gg; im.data[i * 4 + 2] = b; im.data[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0);
  return cv;
}

// ───────── 기본 엄마 (뽀글머리 · 앞치마 · 슬리퍼) ─────────
let DEF = null;
export function defaultPx() {
  const px = new Array(N).fill(null);
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) px[y * W + x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
  const ell = (cx, cy, rx, ry, c) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) put(x, y, c); };
  const HAIR = '#3b2418', HAIR2 = '#5a3826', SKIN = '#f6c9a4', SKIN2 = '#e9a983', SHIRT = '#ff7fae', SHIRT2 = '#e45d91', AP = '#fff6d8', AP2 = '#f2d98a', PANT = '#7b62c9', PANT2 = '#5d48a6', SLIP = '#5fb8ff', SLIP2 = '#3b8fd6', INK = '#2a1a12';
  // 뽀글머리
  for (const [x, y, r] of [[16, 9, 9], [9, 8, 4], [23, 8, 4], [12, 4, 4], [20, 4, 4], [16, 3, 4], [8, 13, 3.5], [24, 13, 3.5], [7, 17, 3], [25, 17, 3]]) ell(x, y, r, r, HAIR);
  for (const [x, y] of [[11, 3], [15, 2], [19, 3], [22, 6], [9, 6], [13, 7], [18, 6], [7, 11], [24, 11], [8, 16], [24, 16]]) { put(x, y, HAIR2); put(x + 1, y, HAIR2); }
  // 얼굴
  ell(16, 14, 6.5, 7, SKIN);
  rect(10, 7, 12, 3, HAIR); put(10, 10, HAIR); put(21, 10, HAIR);
  rect(12, 13, 2, 2, INK); rect(19, 13, 2, 2, INK);
  put(12, 13, '#ffffff'); put(19, 13, '#ffffff');
  rect(10, 16, 2, 1, '#ff9ab0'); rect(21, 16, 2, 1, '#ff9ab0');
  rect(14, 18, 4, 1, '#c0392b'); put(13, 17, '#c0392b'); put(18, 17, '#c0392b');
  put(16, 15, SKIN2);
  rect(14, 21, 4, 2, SKIN);
  // 몸통 + 팔
  rect(9, 23, 14, 16, SHIRT); rect(9, 23, 14, 1, SHIRT2);
  rect(6, 24, 3, 12, SHIRT); rect(23, 24, 3, 12, SHIRT); rect(6, 24, 1, 12, SHIRT2); rect(25, 24, 1, 12, SHIRT2);
  rect(6, 36, 3, 3, SKIN); rect(23, 36, 3, 3, SKIN);
  // 앞치마
  rect(11, 25, 10, 18, AP); rect(13, 23, 6, 2, AP); rect(9, 29, 14, 1, AP2);
  rect(13, 33, 6, 4, AP2); rect(14, 34, 4, 2, AP);
  for (let y = 25; y < 43; y += 3) { put(11, y, AP2); put(20, y, AP2); }
  rect(11, 42, 10, 1, '#ff9ab0');
  // 바지
  rect(10, 39, 12, 11, PANT); rect(15, 44, 2, 6, PANT2); rect(10, 39, 1, 11, PANT2);
  // 발목
  rect(11, 50, 4, 2, SKIN); rect(17, 50, 4, 2, SKIN);
  // 슬리퍼
  rect(9, 52, 7, 3, SLIP); rect(16, 52, 7, 3, SLIP); rect(9, 55, 7, 1, SLIP2); rect(16, 55, 7, 1, SLIP2);
  rect(10, 52, 5, 1, SLIP2); rect(17, 52, 5, 1, SLIP2);
  return px;
}
export function defaultLook() { return DEF || (DEF = encode(defaultPx())); }
export function loadLook() { const v = LSget('look', null); return v && v.d && v.d.length === N ? v : defaultLook(); }
export function saveLook(v) { LSset('look', v); }

// ───────── 에디터 ─────────
const SWATCH = ['#2a1a12', '#5a3826', '#8a5a3a', '#f6c9a4', '#e9a983', '#ffffff', '#c8c8c8', '#6b6b6b', '#000000',
  '#ff5a5a', '#ff7fae', '#ffb3d1', '#ff9a3c', '#ffd34d', '#fff6d8', '#9be15d', '#3fbf6a', '#1e7a4c',
  '#5fd0b5', '#7cc4ff', '#3b8fd6', '#2b4fa8', '#7b62c9', '#c27be8'];
const SIZES = [1, 2, 3, 4, 6, 8];
const CSS = `
.ed{max-width:1100px;margin:0 auto;padding:12px 12px 30px;display:grid;grid-template-columns:76px 1fr 270px;gap:12px;align-items:start}
@media (max-width:820px){.ed{grid-template-columns:1fr}.ed .tools{flex-direction:row!important;flex-wrap:wrap}}
.ed .tools{display:flex;flex-direction:column;gap:6px}
.ed .tb{border:3px solid #4a2c1d;border-radius:12px;background:#fff;padding:6px 4px;font-size:13px;text-align:center;line-height:1.1;min-width:64px}
.ed .tb .i{font-size:22px;display:block}
.ed .tb.on{background:#ff6fa5;color:#fff}
.ed .stage{background:#fff;border:3px solid #4a2c1d;border-radius:16px;overflow:auto;height:min(72vh,720px);position:relative;touch-action:none;
  background-image:linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%),linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%);background-size:16px 16px;background-position:0 0,8px 8px}
.ed .stage canvas{display:block;margin:20px auto;image-rendering:pixelated;cursor:crosshair}
.ed .side{display:flex;flex-direction:column;gap:10px}
.ed .box{background:#fffaf0;border:3px solid #4a2c1d;border-radius:14px;padding:9px}
.ed .sw{display:grid;grid-template-columns:repeat(9,1fr);gap:3px}
.ed .sw i{aspect-ratio:1;border:2px solid #4a2c1d;border-radius:5px;cursor:pointer}
.ed .sw i.on{outline:3px solid #ff6fa5;outline-offset:1px}
.ed .cur{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.ed .cur input{width:46px;height:36px;border:3px solid #4a2c1d;border-radius:8px;padding:0;background:#fff}
.ed .ps{display:flex;flex-direction:column;gap:5px}
.ed .p{display:flex;align-items:center;gap:6px;background:#fff;border:2px solid #4a2c1d;border-radius:10px;padding:4px 6px}
.ed .p canvas{width:16px;height:28px;image-rendering:pixelated;background:#f3ead8;border-radius:3px}
.ed .p .nm{flex:1;font-size:14px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.ed .p button{font-size:12px;border:2px solid #4a2c1d;border-radius:7px;background:#fff;padding:2px 6px}
.ed .pv{display:flex;gap:10px;align-items:flex-end;justify-content:center}
.ed .pv canvas{image-rendering:pixelated;background:#f3ead8;border-radius:6px}
.ed .top{grid-column:1/-1;display:flex;align-items:center;gap:10px}
.ed .top h2{margin:0;flex:1;font-size:26px}
.ed .timer{font-size:30px;color:#ff5a5a}
.ed .sz{display:flex;align-items:center;gap:8px;font-size:14px}
.ed .sz input{flex:1;accent-color:#ff6fa5}
`;

export class Editor {
  // mode: 'menu' (메뉴에서) | 'prep' (게임 준비 30초)
  constructor(root, { mode = 'menu', onClose, onLive, endsAt } = {}) {
    this.root = root; this.mode = mode; this.onClose = onClose; this.onLive = onLive; this.endsAt = endsAt;
    this.px = decode(loadLook());
    this.undo = []; this.redo = [];
    this.tool = 'pen'; this.size = 1; this.color = '#ff7fae'; this.sym = false; this.zoom = 0;
    this.recent = LSget('recent', []);
    if (!document.getElementById('edCss')) { const s = document.createElement('style'); s.id = 'edCss'; s.textContent = CSS; document.head.append(s); }
    this.build();
    this.keys = e => this.onKey(e); addEventListener('keydown', this.keys);
    this.lastLive = 0;
    if (mode === 'prep') this.tm = setInterval(() => this.tickTimer(), 200);
  }

  build() {
    const r = this.root; r.textContent = '';
    const ed = document.createElement('div'); ed.className = 'ed'; r.append(ed); this.ed = ed;
    const top = document.createElement('div'); top.className = 'top';
    top.innerHTML = this.mode === 'prep'
      ? `<h2>💄 엄마 단장 중… <span class="hint" style="font-size:15px">장난감들이 숨는 동안 꾸며요!</span></h2><span class="timer" data-t></span><button class="btn pk sm" data-done>다 꾸몄어!</button>`
      : `<button class="btn sm" data-done>← 저장하고 나가기</button><h2>💄 엄마 꾸미기</h2><span class="hint">자동 저장돼요 · 다음 게임에서 엄마가 되면 이 모습!</span>`;
    ed.append(top);
    top.querySelector('[data-done]').onclick = () => { S.click(); this.finish(); };
    this.timerEl = top.querySelector('[data-t]');

    // 도구
    const tools = document.createElement('div'); tools.className = 'tools'; ed.append(tools);
    const T = [['pen', '✏️', '연필'], ['line', '📏', '직선'], ['fill', '🪣', '채우기'], ['pick', '💧', '스포이드'], ['erase', '🧽', '지우개'], ['hand', '✋', '옮기기']];
    this.tb = {};
    for (const [k, i, n] of T) { const b = this.btn(tools, i, n, () => { this.tool = k; this.syncTools(); }); this.tb[k] = b; }
    this.symB = this.btn(tools, '🪞', '좌우 대칭', () => { this.sym = !this.sym; this.syncTools(); });
    this.btn(tools, '↩️', '되돌리기', () => this.doUndo());
    this.btn(tools, '↪️', '다시', () => this.doRedo());
    this.btn(tools, '🔍', '크게', () => this.setZoom(this.zoom + 2));
    this.btn(tools, '🔎', '작게', () => this.setZoom(this.zoom - 2));
    this.btn(tools, '🗑️', '전부 지우기', () => { if (confirm('전부 지울까요?')) { this.push(); this.px.fill(null); this.changed(); } });
    this.btn(tools, '👩', '기본 엄마', () => { if (confirm('기본 엄마로 되돌릴까요?')) { this.push(); this.px = defaultPx(); this.changed(); } });

    // 캔버스
    const stage = document.createElement('div'); stage.className = 'stage'; ed.append(stage); this.stage = stage;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; stage.append(cv); this.cv = cv; this.g = cv.getContext('2d');
    const ov = document.createElement('canvas'); this.ov = ov; // 격자/미리보기
    ov.style.cssText = 'position:absolute;pointer-events:none;image-rendering:auto'; stage.append(ov);
    this.bindDraw();

    // 오른쪽
    const side = document.createElement('div'); side.className = 'side'; ed.append(side);
    const cbox = document.createElement('div'); cbox.className = 'box'; side.append(cbox);
    cbox.innerHTML = `<div class="cur"><input type="color" data-c><b style="flex:1">색깔</b></div><div class="sw" data-sw></div><div style="font-size:13px;margin:7px 0 3px;color:#9a7b66">최근 쓴 색</div><div class="sw" data-rc></div>
      <div class="sz" style="margin-top:9px">굵기 <input type="range" min="0" max="${SIZES.length - 1}" step="1" data-sz><b data-szv></b></div>`;
    this.cIn = cbox.querySelector('[data-c]'); this.cIn.value = this.color;
    this.cIn.oninput = () => { this.setColor(this.cIn.value); };
    this.swEl = cbox.querySelector('[data-sw]'); this.rcEl = cbox.querySelector('[data-rc]');
    const sz = cbox.querySelector('[data-sz]'), szv = cbox.querySelector('[data-szv]');
    sz.value = SIZES.indexOf(this.size); szv.textContent = this.size + 'px';
    sz.oninput = () => { this.size = SIZES[+sz.value]; szv.textContent = this.size + 'px'; };
    this.szIn = sz; this.szV = szv;
    this.drawSwatches();

    const pv = document.createElement('div'); pv.className = 'box'; side.append(pv);
    pv.innerHTML = `<div style="font-size:13px;color:#9a7b66;margin-bottom:5px">게임에서 이렇게 보여요</div><div class="pv"></div>`;
    this.pv1 = document.createElement('canvas'); this.pv1.width = W; this.pv1.height = H; this.pv1.style.width = '64px'; this.pv1.style.height = '112px';
    this.pv2 = document.createElement('canvas'); this.pv2.width = W; this.pv2.height = H; this.pv2.style.width = '32px'; this.pv2.style.height = '56px';
    pv.querySelector('.pv').append(this.pv1, this.pv2);

    const pb = document.createElement('div'); pb.className = 'box'; side.append(pb);
    pb.innerHTML = `<div style="font-size:15px;margin-bottom:6px">💾 내 엄마 모음 (5개)</div><div class="ps"></div>`;
    this.psEl = pb.querySelector('.ps');
    this.drawPresets();

    this.syncTools();
    requestAnimationFrame(() => { this.fitZoom(); this.render(); });
    this.onResize = () => this.layoutOv(); addEventListener('resize', this.onResize);
  }
  btn(par, i, n, fn) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tb'; b.innerHTML = `<span class="i">${i}</span>${n}`;
    b.onclick = () => { S.click(); fn(); }; par.append(b); return b;
  }
  syncTools() { for (const k in this.tb) this.tb[k].classList.toggle('on', this.tool === k); this.symB.classList.toggle('on', this.sym); this.cv.style.cursor = this.tool === 'hand' ? 'grab' : 'crosshair'; }
  setColor(c) { this.color = c.toLowerCase(); this.cIn.value = this.color; this.drawSwatches(); }
  useColor() {
    const c = this.color; this.recent = [c, ...this.recent.filter(x => x !== c)].slice(0, 9); LSset('recent', this.recent); this.drawSwatches();
  }
  drawSwatches() {
    const mk = (el, list) => { el.textContent = ''; for (const c of list) { const i = document.createElement('i'); i.style.background = c; if (c === this.color) i.className = 'on'; i.title = c; i.onclick = () => this.setColor(c); el.append(i); } };
    mk(this.swEl, SWATCH); mk(this.rcEl, this.recent);
  }
  drawPresets() {
    const ps = LSget('presets', []); this.psEl.textContent = '';
    for (let k = 0; k < 5; k++) {
      const P = ps[k];
      const d = document.createElement('div'); d.className = 'p';
      const c = document.createElement('canvas'); if (P) lookToCanvas(P.look, c); else { c.width = W; c.height = H; }
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = P ? P.name : `${k + 1}번 칸 (비어 있음)`; if (!P) nm.style.color = '#9a7b66';
      d.append(c, nm);
      const b = (t, fn) => { const x = document.createElement('button'); x.type = 'button'; x.textContent = t; x.onclick = () => { S.click(); fn(); }; d.append(x); };
      if (P) b('불러오기', () => { this.push(); this.px = decode(P.look); this.changed(); });
      b('저장', () => {
        const n = prompt('이 엄마 이름은?', P ? P.name : `${k + 1}번 엄마`); if (n === null) return;
        ps[k] = { name: n.trim().slice(0, 12) || `${k + 1}번 엄마`, look: encode(this.px) }; LSset('presets', ps); this.drawPresets();
      });
      if (P) b('✎', () => { const n = prompt('새 이름', P.name); if (n === null) return; P.name = n.trim().slice(0, 12) || P.name; LSset('presets', ps); this.drawPresets(); });
      this.psEl.append(d);
    }
  }

  fitZoom() { const r = this.stage.getBoundingClientRect(); this.setZoom(Math.max(4, Math.floor(Math.min((r.width - 40) / W, (r.height - 40) / H)))); }
  setZoom(z) {
    this.zoom = Math.max(3, Math.min(28, z | 0));
    this.cv.style.width = W * this.zoom + 'px'; this.cv.style.height = H * this.zoom + 'px';
    this.layoutOv();
  }
  layoutOv() {
    const ov = this.ov, z = this.zoom; if (!z) return;
    ov.width = W * z; ov.height = H * z;
    ov.style.left = this.cv.offsetLeft + 'px'; ov.style.top = this.cv.offsetTop + 'px';
    ov.style.width = W * z + 'px'; ov.style.height = H * z + 'px';
    this.render();
  }

  // ───── 그리기 ─────
  cellAt(e) {
    const r = this.cv.getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)];
  }
  stamp(px, x, y, c) {
    const s = this.size, o = Math.floor((s - 1) / 2);
    const one = (xx, yy) => {
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
        if (s >= 4) { const dx = i - (s - 1) / 2, dy = j - (s - 1) / 2; if (dx * dx + dy * dy > (s / 2) ** 2 + .3) continue; }
        const X = xx - o + i, Y = yy - o + j; if (X >= 0 && Y >= 0 && X < W && Y < H) px[Y * W + X] = c;
      }
    };
    one(x, y); if (this.sym) one(W - 1 - x, y);
  }
  lineTo(px, x0, y0, x1, y1, c) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (;;) { this.stamp(px, x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  flood(x, y, c) {
    const t = this.px[y * W + x]; if (t === c) return;
    const st = [[x, y]];
    while (st.length) {
      const [a, b] = st.pop(); if (a < 0 || b < 0 || a >= W || b >= H) continue;
      const i = b * W + a; if (this.px[i] !== t) continue; this.px[i] = c;
      st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
    }
  }
  bindDraw() {
    let down = false, last = null, start = null, base = null, pan = null;
    const pts = new Map();
    const begin = e => {
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { down = false; if (base) { this.px = base; base = null; this.undo.pop(); this.render(); } pan = { d: this.pdist(pts), z: this.zoom, sx: this.stage.scrollLeft, sy: this.stage.scrollTop, c: this.pmid(pts) }; return; }
      if (e.button === 1 || this.tool === 'hand') { pan = { sx: this.stage.scrollLeft, sy: this.stage.scrollTop, c: [e.clientX, e.clientY] }; return; }
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const [x, y] = this.cellAt(e); if (x < 0 || y < 0 || x >= W || y >= H) return;
      this.cv.setPointerCapture(e.pointerId);
      if (this.tool === 'pick') { const c = this.px[y * W + x]; if (c) this.setColor(c); this.tool = 'pen'; this.syncTools(); return; }
      this.push();
      if (this.tool === 'fill') { this.flood(x, y, this.color); if (this.sym) this.flood(W - 1 - x, y, this.color); this.useColor(); this.changed(); return; }
      down = true; last = [x, y]; start = [x, y]; base = this.px.slice();
      const c = this.tool === 'erase' ? null : this.color;
      if (this.tool !== 'line') { this.stamp(this.px, x, y, c); this.render(); }
    };
    const move = e => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pan) {
        if (pts.size === 2 && pan.d) { const d = this.pdist(pts); this.setZoom(Math.round(pan.z * d / pan.d)); const m = this.pmid(pts); this.stage.scrollLeft = pan.sx - (m[0] - pan.c[0]); this.stage.scrollTop = pan.sy - (m[1] - pan.c[1]); }
        else { this.stage.scrollLeft = pan.sx - (e.clientX - pan.c[0]); this.stage.scrollTop = pan.sy - (e.clientY - pan.c[1]); }
        return;
      }
      const [x, y] = this.cellAt(e); this.hover = [x, y];
      if (!down) { this.render(); return; }
      const c = this.tool === 'erase' ? null : this.color;
      if (this.tool === 'line') { this.px = base.slice(); this.lineTo(this.px, start[0], start[1], x, y, c); }
      else this.lineTo(this.px, last[0], last[1], x, y, c);
      last = [x, y]; this.render();
    };
    const end = e => {
      pts.delete(e.pointerId);
      if (pan && pts.size < 2) { pan = null; return; }
      if (!down) return; down = false; base = null;
      if (this.tool !== 'erase') this.useColor();
      this.changed();
    };
    this.cv.addEventListener('pointerdown', begin); this.stage.addEventListener('pointerdown', e => { if (e.target === this.stage && (this.tool === 'hand' || e.button === 1)) begin(e); });
    addEventListener('pointermove', this._mv = move); addEventListener('pointerup', this._up = end); addEventListener('pointercancel', this._up);
    this.cv.addEventListener('pointerleave', () => { this.hover = null; this.render(); });
    this.stage.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey || e.altKey) { e.preventDefault(); this.setZoom(this.zoom + (e.deltaY < 0 ? 1 : -1)); } }, { passive: false });
    this.cv.addEventListener('contextmenu', e => e.preventDefault());
  }
  pdist(m) { const [a, b] = [...m.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; }
  pmid(m) { const [a, b] = [...m.values()]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }

  push() { this.undo.push(this.px.slice()); if (this.undo.length > 80) this.undo.shift(); this.redo = []; }
  doUndo() { if (!this.undo.length) return; this.redo.push(this.px); this.px = this.undo.pop(); this.changed(); }
  doRedo() { if (!this.redo.length) return; this.undo.push(this.px); this.px = this.redo.pop(); this.changed(); }
  onKey(e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName) && e.target.type !== 'range') return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? this.doRedo() : this.doUndo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); this.doRedo(); return; }
    const map = { b: 'pen', p: 'pen', l: 'line', f: 'fill', g: 'fill', i: 'pick', e: 'erase', h: 'hand' };
    if (map[k]) { this.tool = map[k]; this.syncTools(); }
    if (k === 'm') { this.sym = !this.sym; this.syncTools(); }
    if (k === '[' || k === ']') { const i = Math.max(0, Math.min(SIZES.length - 1, SIZES.indexOf(this.size) + (k === ']' ? 1 : -1))); this.size = SIZES[i]; this.szIn.value = i; this.szV.textContent = this.size + 'px'; }
  }

  changed() {
    const v = encode(this.px);
    saveLook(v);
    this.render();
    if (this.onLive) { const now = Date.now(); if (now - this.lastLive > 600) { this.lastLive = now; this.onLive(v, false); } else { clearTimeout(this.liveT); this.liveT = setTimeout(() => { this.lastLive = Date.now(); this.onLive(encode(this.px), false); }, 650); } }
  }
  render() {
    const g = this.g, im = g.createImageData(W, H);
    for (let i = 0; i < N; i++) { const c = this.px[i]; if (c) { const [r, gg, b] = hex2(c); im.data[i * 4] = r; im.data[i * 4 + 1] = gg; im.data[i * 4 + 2] = b; im.data[i * 4 + 3] = 255; } }
    g.putImageData(im, 0, 0);
    for (const p of [this.pv1, this.pv2]) { const x = p.getContext('2d'); x.clearRect(0, 0, W, H); x.putImageData(im, 0, 0); }
    // 격자 + 커서 + 대칭선
    const o = this.ov.getContext('2d'), z = this.zoom; if (!z) return;
    o.clearRect(0, 0, this.ov.width, this.ov.height);
    if (z >= 6) { o.strokeStyle = 'rgba(74,44,29,.12)'; o.lineWidth = 1; o.beginPath(); for (let x = 0; x <= W; x++) { o.moveTo(x * z + .5, 0); o.lineTo(x * z + .5, H * z); } for (let y = 0; y <= H; y++) { o.moveTo(0, y * z + .5); o.lineTo(W * z, y * z + .5); } o.stroke(); }
    if (this.sym) { o.strokeStyle = 'rgba(255,111,165,.8)'; o.setLineDash([6, 4]); o.beginPath(); o.moveTo(W / 2 * z, 0); o.lineTo(W / 2 * z, H * z); o.stroke(); o.setLineDash([]); }
    if (this.hover && this.tool !== 'hand' && this.tool !== 'fill' && this.tool !== 'pick') {
      const s = this.size, off = Math.floor((s - 1) / 2), [x, y] = this.hover;
      o.strokeStyle = '#ff6fa5'; o.lineWidth = 2; o.strokeRect((x - off) * z, (y - off) * z, s * z, s * z);
      if (this.sym) o.strokeRect((W - 1 - x - off) * z, (y - off) * z, s * z, s * z);
    }
  }

  tickTimer() {
    if (!this.endsAt) return;
    const left = Math.max(0, (this.endsAt - performance.now()) / 1000);
    if (this.timerEl) this.timerEl.textContent = '⏰ ' + Math.ceil(left);
    if (left <= 0) this.finish();
  }
  finish() {
    if (this.done) return; this.done = true;
    const v = encode(this.px); saveLook(v);
    if (this.onLive) this.onLive(v, true);
    this.onClose && this.onClose(v);
  }
  destroy() {
    clearInterval(this.tm); clearTimeout(this.liveT);
    removeEventListener('keydown', this.keys); removeEventListener('pointermove', this._mv); removeEventListener('pointerup', this._up); removeEventListener('pointercancel', this._up); removeEventListener('resize', this.onResize);
    this.root.textContent = '';
  }
}
