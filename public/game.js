// 엄마의 대청소날~ — 게임 화면 (레이캐스터 · 조작 · HUD)
import { CFG, OBJ, DECOR, MAPS, MAP_IDS, genWorld, collide, solid, speedOf, roomName } from './shared.js?v=1';
import { objSprite, decorSprite, boxSprite, toySprite, toyColor } from './sprites.js?v=1';
import { S, bgm, audioInit } from './sfx.js?v=1';
import { Editor, lookToCanvas, loadLook, defaultLook } from './editor.js?v=1';

const TAU = Math.PI * 2, FOV = 70 * Math.PI / 180, TANF = Math.tan(FOV / 2);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const isPhone = matchMedia('(pointer:coarse)').matches;
const MOM_H = .95, MOM_W = MOM_H * CFG.LOOK_W / CFG.LOOK_H, TOY_H = .34;

// ───────── 텍스처 ─────────
function texFrom(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h);
  return { w, h, d: new Uint32Array(g.getImageData(0, 0, w, h).data.buffer.slice(0)) };
}
function spriteTex(cv) {
  const d = new Uint32Array(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data.buffer.slice(0));
  return { w: cv.width, h: cv.height, d };
}
const THEMES = {
  room: {
    wall: texFrom(32, 32, (g) => { g.fillStyle = '#fde7ef'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#f9cfe0'; for (let x = 0; x < 32; x += 8) g.fillRect(x, 0, 3, 32); g.fillStyle = '#ffffff'; for (let y = 4; y < 26; y += 8) for (let x = 5; x < 32; x += 8) g.fillRect(x, y, 2, 2); g.fillStyle = '#c9935a'; g.fillRect(0, 27, 32, 5); g.fillStyle = '#a8693c'; g.fillRect(0, 27, 32, 1); }),
    floor: texFrom(32, 32, (g) => { g.fillStyle = '#e2b47c'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#cf9c63'; for (let y = 0; y < 32; y += 8) g.fillRect(0, y, 32, 1); g.fillRect(10, 0, 1, 8); g.fillRect(24, 8, 1, 8); g.fillRect(6, 16, 1, 8); g.fillRect(19, 24, 1, 8); }),
    ceil: '#fff8ee', fog: [255, 244, 230]
  },
  kitchen: {
    wall: texFrom(32, 32, (g) => { g.fillStyle = '#f4fbff'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#cfe6f2'; for (let i = 0; i < 32; i += 8) { g.fillRect(i, 0, 1, 20); g.fillRect(0, i, 32, 1); } g.fillStyle = '#9fd7c4'; g.fillRect(0, 20, 32, 3); g.fillStyle = '#e8f0f4'; g.fillRect(0, 23, 32, 9); g.fillStyle = '#b8c8d0'; g.fillRect(0, 31, 32, 1); }),
    floor: texFrom(32, 32, (g) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#ffffff' : '#f2c6c6'; g.fillRect(x * 16, y * 16, 16, 16); } g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 0, 32, 1); g.fillRect(0, 16, 32, 1); g.fillRect(0, 0, 1, 32); g.fillRect(16, 0, 1, 32); }),
    ceil: '#ffffff', fog: [245, 250, 255]
  },
  attic: {
    wall: texFrom(32, 32, (g) => { g.fillStyle = '#8e6a4a'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#7a5a3c'; for (let y = 0; y < 32; y += 6) g.fillRect(0, y, 32, 1); g.fillStyle = '#5e432c'; g.fillRect(12, 3, 2, 2); g.fillRect(25, 15, 2, 2); g.fillRect(4, 22, 2, 2); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 1, 32, 1); }),
    floor: texFrom(32, 32, (g) => { g.fillStyle = '#7d5a3e'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#6a4a31'; for (let x = 0; x < 32; x += 8) g.fillRect(x, 0, 1, 32); g.fillRect(3, 12, 1, 1); g.fillRect(20, 26, 1, 1); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(2, 0, 2, 32); }),
    ceil: '#4a3424', fog: [70, 52, 38], dim: 1
  }
};
const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export class Game {
  constructor({ root, net, start, settings, lobby, onQuit, practice }) {
    this.root = root; this.net = net; this.ST = settings; this.onQuit = onQuit; this.practice = !!practice;
    this.alive = true;
    this.build();
    if (practice) this.initPractice(); else this.init(start);
    this.bindInput();
    this.last = performance.now();
    this.raf = requestAnimationFrame(t => this.frame(t));
    this.sendT = setInterval(() => this.sendState(), 66);
  }

  // ───────── 준비 ─────────
  build() {
    const r = this.root; r.textContent = '';
    r.innerHTML = `<canvas data-c style="position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;touch-action:none"></canvas>
<div data-ui style="position:absolute;inset:0;pointer-events:none;font-family:Jua,sans-serif"></div>`;
    this.cv = r.querySelector('[data-c]'); this.g = this.cv.getContext('2d');
    this.ui = r.querySelector('[data-ui]');
    this.off = document.createElement('canvas'); this.og = this.off.getContext('2d');
    this.resize = () => this.onResize(); addEventListener('resize', this.resize); this.onResize();
    this.feed = []; this.banners = []; this.bubbles = []; this.pings = []; this.fx = []; this.chatLog = [];
    this.shake = 0; this.hand = 0; this.resP = 0; this.resShow = 0;
  }
  onResize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.cv.width = innerWidth * dpr; this.cv.height = innerHeight * dpr; this.dpr = dpr;
    const H = this.ST.low ? 180 : 288, W = Math.round(H * innerWidth / innerHeight);
    this.W = clamp(W, 240, 720); this.H = H;
    this.off.width = this.W; this.off.height = this.H;
    this.img = this.og.createImageData(this.W, this.H); this.u32 = new Uint32Array(this.img.data.buffer);
    this.zb = new Float32Array(this.W);
    this.f = (this.W / 2) / TANF;
  }

  setWorld(mapId, seed) {
    this.mapId = mapId; this.Wd = genWorld(mapId, seed); this.M = this.Wd.M;
    const th = THEMES[this.M.theme]; this.th = th; this.ceilRGB = hexRGB(th.ceil);
    this.objTex = {}; for (const k in OBJ) this.objTex[k] = spriteTex(objSprite(k));
    this.decTex = {}; for (const k in DECOR) this.decTex[k] = spriteTex(decorSprite(k));
    this.boxTex = [spriteTex(boxSprite(false)), spriteTex(boxSprite(true))];
  }

  init(st) {
    this.me = st.you; this.setWorld(st.map, st.seed);
    this.ph = st.ph; this.tLeft = st.t; this.tAt = performance.now();
    this.P = new Map(); let i = 0;
    for (const id of Object.keys(st.roles)) {
      this.P.set(id, { id, name: st.names[id], role: st.roles[id], x: 0, z: 0, a: 0, form: null, fl: 0, buf: [], col: toyColor(i++), look: null, lookCv: null, stepT: 0 });
    }
    for (const [id, v] of Object.entries(st.looks || {})) this.setLook(id, v);
    const me = this.P.get(this.me);
    this.role = me.role;
    if (st.me) { me.x = st.me.x; me.z = st.me.z; me.form = st.me.form; me.caught = st.me.caught; this.yaw = st.me.a; }
    else this.yaw = 0;
    this.pitch = this.role === 'mom' ? -.25 : -.18;
    this.frozen = false; this.stam = CFG.STAMINA; this.vacCd = 0; this.restT = 0; this.sqLeft = CFG.SQUEAK;
    this.spec = null;
    this.banner(this.role === 'mom' ? '🧹 너는 엄마야!' : '🧸 너는 장난감이야!', this.role === 'mom' ? '30초 동안 단장하고, 장난감을 전부 치워!' : '엄마가 단장하는 30초 동안 물건으로 변신해서 숨어! (E)', 4.5);
    if (this.ph === 'prep') this.enterPrep(); else this.enterHunt(true);
    bgm(this.ph === 'prep' ? 'title' : 'game');
  }
  initPractice() {
    this.me = 'me'; this.setWorld(MAP_IDS[0], Math.random() * 1e9 | 0);
    this.P = new Map([['me', { id: 'me', name: '나', role: 'toy', x: this.M.toy[0], z: this.M.toy[1], a: 0, form: null, fl: 0, buf: [], col: toyColor(0), look: null }]]);
    this.role = 'toy'; this.ph = 'hunt'; this.tLeft = 0; this.tAt = performance.now(); this.yaw = Math.PI; this.pitch = -.18;
    this.frozen = false; this.stam = CFG.STAMINA; this.vacCd = 0; this.restT = 0; this.sqLeft = 99;
    this.pracMom = false; this.pracBody = null;
    this.banner('🧸 혼자 연습하기', isPhone ? '변신해 보고, 👀 엄마 눈으로 어떻게 보이는지 확인해요' : 'E 변신 · Q 원래대로 · Shift 얼음 · R 엄마 눈으로 보기 · M 맵 바꾸기', 6);
    bgm('game');
  }
  setLook(id, v) {
    const p = this.P.get(id); if (!p) return;
    p.look = v; p.lookCv = lookToCanvas(v || defaultLook()); p.lookTex = spriteTex(p.lookCv);
    if (this.cornerCvs) this.drawCorner();
  }

  // ───────── 준비 시간 ─────────
  enterPrep() {
    const endsAt = performance.now() + Math.max(0, this.tLeft) * 1000;
    if (this.role === 'mom') {
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;inset:0;overflow:auto;z-index:5;pointer-events:auto';
      host.className = 'bgtile'; this.root.append(host); this.edHost = host;
      this.editor = new Editor(host, {
        mode: 'prep', endsAt,
        onLive: (v, fin) => { this.net.send({ type: 'look', v, fin }); this.setLook(this.me, v); },
        onClose: () => { this.closeEditor(); }
      });
      this.net.send({ type: 'look', v: loadLook() });
    } else {
      this.corner();
    }
  }
  closeEditor() {
    if (this.editor) { this.editor.destroy(); this.editor = null; }
    if (this.edHost) { this.edHost.remove(); this.edHost = null; }
  }
  corner() {
    const moms = [...this.P.values()].filter(p => p.role === 'mom');
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;right:12px;top:64px;background:#fffaf0;border:3px solid #4a2c1d;border-radius:14px;padding:6px 8px;text-align:center;color:#4a2c1d;box-shadow:0 5px 0 rgba(74,44,29,.3)';
    box.innerHTML = `<div style="font-size:15px">💄 엄마 단장 중…</div><div data-m style="display:flex;gap:6px;justify-content:center"></div>`;
    this.cornerCvs = [];
    for (const m of moms) {
      const c = document.createElement('canvas'); c.width = CFG.LOOK_W; c.height = CFG.LOOK_H;
      const sz = moms.length > 1 ? 2 : 3;
      c.style.cssText = `width:${CFG.LOOK_W * sz}px;height:${CFG.LOOK_H * sz}px;image-rendering:pixelated;background:#f3ead8;border-radius:8px`;
      const w = document.createElement('div'); w.append(c); const n = document.createElement('div'); n.style.fontSize = '12px'; n.textContent = m.name; w.append(n);
      box.querySelector('[data-m]').append(w); this.cornerCvs.push([m.id, c]);
    }
    this.ui.append(box); this.cornerEl = box; this.drawCorner();
  }
  drawCorner() {
    for (const [id, c] of this.cornerCvs || []) { const p = this.P.get(id); const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); if (p && p.lookCv) g.drawImage(p.lookCv, 0, 0); }
  }
  enterHunt(silent) {
    this.ph = 'hunt';
    this.closeEditor();
    if (this.cornerEl) { this.cornerEl.remove(); this.cornerEl = null; this.cornerCvs = null; }
    if (!silent) {
      S.bell(); S.mom();
      this.banner(this.role === 'mom' ? '청소 시작!!' : '엄마가 왔다!!', this.role === 'mom' ? '수상한 물건을 클릭해서 치워 버려요' : '움직이면 들켜요. 얼음(Shift)!', 3);
      this.doShake(.5);
    }
    bgm('game');
  }

  // ───────── 입력 ─────────
  bindInput() {
    this.keys = {};
    this.kd = e => this.onKey(e, true); this.ku = e => this.onKey(e, false);
    addEventListener('keydown', this.kd); addEventListener('keyup', this.ku);
    this.mm = e => { if (document.pointerLockElement !== this.cv) return; this.look(e.movementX * .0024 * this.ST.mouse, e.movementY * .0024 * this.ST.mouse); };
    addEventListener('mousemove', this.mm);
    this.md = e => {
      audioInit();
      if (isPhone || e.pointerType === 'touch') return;
      if (document.pointerLockElement !== this.cv) { this.lock(); return; }
      if (e.button === 0) this.primary();
    };
    this.cv.addEventListener('pointerdown', this.md);
    this.plc = () => { if (document.pointerLockElement !== this.cv && this.alive && !this.ended && !isPhone && !this.chatOpen && !this.menuEl && !(this.editor)) this.showMenu(); };
    document.addEventListener('pointerlockchange', this.plc);
    if (isPhone) this.touchUI();
    this.hudBuild();
  }
  lock() { if (isPhone || this.editor) return; try { const p = this.cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
  look(dx, dy) { this.yaw = (this.yaw + dx) % TAU; this.pitch = clamp(this.pitch - dy, -1, .55); }
  onKey(e, down) {
    if (this.editor) return;
    if (this.chatOpen) return;
    const k = e.code;
    if (down && k === 'Enter' && !this.practice) { e.preventDefault(); this.openChat(); return; }
    if (k === 'Tab') { e.preventDefault(); this.cardOn = down; this.drawCard(); return; }
    this.keys[k] = down;
    if (!down) { if (k === 'KeyE') this.resHold = false; return; }
    if (e.repeat) return;
    if (k === 'KeyE') this.act();
    if (k === 'KeyQ') this.revert();
    if (k === 'ShiftLeft' || k === 'ShiftRight') this.toggleFreeze();
    if (k === 'KeyG') this.sign();
    if (k === 'Space') { e.preventDefault(); this.vacuum(); }
    if (k === 'KeyR' && this.practice) this.pracSwap();
    if (k === 'KeyM' && this.practice) this.pracMap();
    if ((k === 'ArrowRight' || k === 'ArrowLeft') && this.isSpec()) this.nextSpec(k === 'ArrowRight' ? 1 : -1);
  }
  touchUI() {
    const pad = document.createElement('div'); pad.style.cssText = 'position:absolute;inset:0;z-index:2;touch-action:none';
    this.root.append(pad); this.pad = pad;
    let mv = null, lk = null;
    const stick = document.createElement('div'); stick.style.cssText = 'position:absolute;width:110px;height:110px;border-radius:50%;border:3px solid rgba(255,255,255,.6);background:rgba(0,0,0,.15);display:none;pointer-events:none';
    const nub = document.createElement('div'); nub.style.cssText = 'position:absolute;left:35px;top:35px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.75)'; stick.append(nub); pad.append(stick);
    pad.addEventListener('pointerdown', e => {
      audioInit();
      if (e.clientX < innerWidth * .42 && !mv) { mv = { id: e.pointerId, x: e.clientX, y: e.clientY }; stick.style.display = 'block'; stick.style.left = e.clientX - 55 + 'px'; stick.style.top = e.clientY - 55 + 'px'; this.tmove = [0, 0]; }
      else if (!lk) lk = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() };
    });
    pad.addEventListener('pointermove', e => {
      if (mv && e.pointerId === mv.id) { let dx = e.clientX - mv.x, dy = e.clientY - mv.y; const d = Math.hypot(dx, dy), m = 50; if (d > m) { dx *= m / d; dy *= m / d; } nub.style.left = 35 + dx + 'px'; nub.style.top = 35 + dy + 'px'; this.tmove = [dx / m, dy / m]; }
      if (lk && e.pointerId === lk.id) { this.look((e.clientX - lk.x) * .006 * this.ST.touch, (e.clientY - lk.y) * .006 * this.ST.touch); lk.x = e.clientX; lk.y = e.clientY; }
    });
    const up = e => {
      if (mv && e.pointerId === mv.id) { mv = null; stick.style.display = 'none'; this.tmove = null; nub.style.left = nub.style.top = '35px'; }
      if (lk && e.pointerId === lk.id) { if (performance.now() - lk.t < 250 && Math.hypot(e.clientX - lk.sx, e.clientY - lk.sy) < 12) this.tap(); lk = null; }
    };
    pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
    const bar = document.createElement('div'); bar.style.cssText = 'position:absolute;right:10px;bottom:12px;display:grid;grid-template-columns:auto auto;gap:7px;z-index:3;direction:rtl';
    this.root.append(bar); this.tbar = bar;
    const mkb = (t, fn, hold) => {
      const b = document.createElement('button'); b.textContent = t;
      b.style.cssText = 'font:16px Jua,sans-serif;border:3px solid #4a2c1d;border-radius:14px;background:#fffaf0;color:#4a2c1d;padding:9px 10px;box-shadow:0 4px 0 #4a2c1d;touch-action:none;min-width:80px;direction:ltr';
      b.addEventListener('pointerdown', e => { e.stopPropagation(); audioInit(); fn(true); });
      if (hold) { b.addEventListener('pointerup', () => fn(false)); b.addEventListener('pointercancel', () => fn(false)); b.addEventListener('pointerleave', () => fn(false)); }
      bar.append(b); return b;
    };
    this.tb = {
      act: mkb('🎭 변신', d => { if (d) this.act(); else this.resHold = false; }, true),
      rev: mkb('🧸 원래대로', () => this.revert()),
      fz: mkb('🧊 얼음', () => this.toggleFreeze()),
      sign: mkb('👋 손짓', () => this.sign()),
      vac: mkb('🌀 청소기', () => this.vacuum()),
      menu: mkb('☰', () => this.showMenu())
    };
    if (this.practice) { this.tb.eye = mkb('👀 엄마 눈', () => this.pracSwap()); this.tb.map = mkb('🗺️ 맵', () => this.pracMap()); }
    const help = document.createElement('button'); help.textContent = '? 설명';
    help.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);top:58px;z-index:3;font:15px Jua;padding:4px 12px;border-radius:12px;border:3px solid #4a2c1d;background:#fffaf0;color:#4a2c1d';
    help.onclick = () => { this.cardOn = !this.cardOn; this.drawCard(); }; this.root.append(help);
    this.hCardTap = true;
  }
  syncTouch() {
    if (!this.tb) return;
    const toy = this.role === 'toy' && !this.isSpec(), mom = this.role === 'mom';
    this.tb.act.style.display = toy ? '' : 'none'; this.tb.rev.style.display = toy ? '' : 'none'; this.tb.fz.style.display = toy ? '' : 'none'; this.tb.sign.style.display = toy ? '' : 'none';
    this.tb.vac.style.display = mom ? '' : 'none';
    this.tb.act.textContent = this.nearBox() ? '🆘 꾹: 구출' : '🎭 변신';
    this.tb.fz.style.background = this.frozen ? '#7cc4ff' : '#fffaf0';
  }
  tap() { if (this.isSpec()) { this.nextSpec(1); return; } if (this.role === 'mom') this.primary(); }

  // ───────── 행동 ─────────
  myP() { return this.P.get(this.me); }
  isSpec() { const me = this.myP(); return this.role === 'toy' && me && me.caught; }
  nearBox() {
    const me = this.myP(); if (this.role !== 'toy' || !me || me.caught || this.ph !== 'hunt' || this.practice) return false;
    return Math.hypot(me.x - this.M.box[0], me.z - this.M.box[1]) < CFG.RESCUE_R && [...this.P.values()].some(p => p.caught);
  }
  formTarget() {
    const me = this.myP(); if (!me) return -1;
    // 화면 가운데 물건이 가까우면 그거
    if (this.pick && this.pick.k === 'o') { const o = this.Wd.objs[this.pick.i]; if (o && Math.hypot(o.x - me.x, o.z - me.z) < CFG.FORM_R) return this.pick.i; }
    let best = -1, bs = 1e9;
    this.Wd.objs.forEach((o, i) => {
      const d = Math.hypot(o.x - me.x, o.z - me.z); if (d > CFG.FORM_R) return;
      const ad = Math.abs(angDiff(Math.atan2(o.z - me.z, o.x - me.x), this.yaw)); if (ad > .95) return;
      const s = ad * 1.6 + d; if (s < bs) { bs = s; best = i; }
    });
    return best;
  }
  act() {
    if (this.role !== 'toy' || this.isSpec()) return;
    if (this.nearBox()) { this.resHold = true; return; }
    const i = this.formTarget();
    if (i < 0) { this.say('주변에 변신할 물건이 없어요'); return; }
    const now = performance.now(); if (now < (this.formCd || 0)) return;
    this.formCd = now + CFG.FORM_CD * 1000;
    const t = this.Wd.objs[i].t;
    if (this.practice) { this.myP().form = t; }
    else this.net.send({ type: 'form', o: i });
    S.poof(); this.fx.push({ k: 'poof', t: 0 });
    this.say(`${OBJ[t].n}(으)로 변신! ${OBJ[t].s === 's' ? '작아서 빨라요' : OBJ[t].s === 'l' ? '커서 느려요' : ''}`);
  }
  revert() {
    if (this.role !== 'toy' || this.isSpec() || !this.myP().form) return;
    const now = performance.now(); if (now < (this.formCd || 0)) return; this.formCd = now + CFG.FORM_CD * 1000;
    if (this.practice) this.myP().form = null; else this.net.send({ type: 'form', o: -1 });
    S.poof();
  }
  toggleFreeze() { if (this.role !== 'toy' || this.isSpec()) return; this.frozen = !this.frozen; S.tick(); this.say(this.frozen ? '🧊 얼음! (안 흔들려요, 둘러보기만 돼요)' : '땡! 움직일 수 있어요'); }
  sign() {
    if (this.role !== 'toy' || this.practice) return;
    const now = performance.now(); if (now < (this.signCd || 0)) return; this.signCd = now + 2500;
    // 보고 있는 곳 (3칸 앞 또는 벽까지)
    const me = this.myP(), c = this.camPos(); let d = .3;
    while (d < 6 && !solid(this.M, c.x + Math.cos(this.yaw) * d, c.z + Math.sin(this.yaw) * d)) d += .1;
    const tx = c.x + Math.cos(this.yaw) * (d - .3), tz = c.z + Math.sin(this.yaw) * (d - .3);
    this.net.send({ type: 'sign', x: tx, z: tz }); if (!me) return;
  }
  vacuum() {
    if (this.role !== 'mom' || this.ph !== 'hunt' || this.restT > 0) return;
    if (this.practice) return;
    if (this.vacCd > 0) { this.say(`청소기는 ${this.vacCd}초 뒤에 써요`); return; }
    this.net.send({ type: 'vac' });
  }
  primary() {
    if (this.isSpec()) { this.nextSpec(1); return; }
    if (this.role !== 'mom') return;
    if (this.practice) { this.hand = 1; S.grab(); const pk = this.pick; if (pk && pk.k === 'p' && pk.d < CFG.GRAB_RANGE) { this.banner('찾았다!', '엄마 눈에는 이렇게 보여요', 2); S.caught(); } else if (pk && pk.k === 'o' && pk.d < CFG.GRAB_RANGE) { this.say('그건 진짜 ' + OBJ[this.Wd.objs[pk.i].t].n + '이에요'); S.miss(); } return; }
    if (this.ph !== 'hunt') return;
    if (this.restT > 0) { this.say('헉헉… 쉬는 중'); return; }
    const pk = this.pick; this.hand = 1; S.grab();
    if (!pk || pk.d > CFG.GRAB_RANGE) { if (pk && (pk.k === 'o' || pk.k === 'p')) this.say('손이 안 닿아요. 더 가까이!'); return; }
    if (pk.k === 'p') this.net.send({ type: 'grab', k: 'p', id: pk.id });
    else if (pk.k === 'o') this.net.send({ type: 'grab', k: 'o', i: pk.i });
  }

  // ───────── 연습 모드 ─────────
  pracSwap() {
    const me = this.myP();
    if (!this.pracMom) { this.pracBody = { x: me.x, z: me.z, form: me.form, fz: this.frozen }; this.pracMom = true; this.role = 'mom'; me.x -= Math.cos(this.yaw) * 1.6; me.z -= Math.sin(this.yaw) * 1.6; const [x, z] = collide(this.Wd, this.pracBody.x, this.pracBody.z, me.x, me.z); me.x = x; me.z = z; this.yaw = Math.atan2(this.pracBody.z - me.z, this.pracBody.x - me.x); this.pitch = -.4; this.say('엄마 눈으로 보는 중 (R로 돌아가기, 클릭해 보기)'); }
    else { me.x = this.pracBody.x; me.z = this.pracBody.z; this.pracMom = false; this.role = 'toy'; this.pracBody = null; this.pitch = -.18; this.say('다시 장난감으로'); }
  }
  pracMap() { const i = (MAP_IDS.indexOf(this.mapId) + 1) % MAP_IDS.length; this.setWorld(MAP_IDS[i], Math.random() * 1e9 | 0); const me = this.myP(); me.x = this.M.toy[0]; me.z = this.M.toy[1]; me.form = null; this.pracMom = false; this.role = 'toy'; this.say(this.M.name + '(으)로 바꿨어요'); }

  // ───────── 서버 메시지 ─────────
  onMsg(m) {
    const now = performance.now();
    switch (m.type) {
      case 'snap': {
        if (m.ph === 'hunt' && this.ph === 'prep') this.enterHunt();
        this.ph = m.ph; this.tLeft = m.t; this.tAt = now;
        for (const [id, x, z, a, form, fl] of m.P) {
          const p = this.P.get(id); if (!p) continue;
          const wasCaught = p.caught;
          p.form = form; p.fl = fl; p.caught = !!(fl & 4);
          if (id === this.me) { if (p.caught && !wasCaught) { p.x = x; p.z = z; } continue; }
          p.buf.push([now, x, z, a]); if (p.buf.length > 12) p.buf.shift();
          if (!p.buf.length || p.caught) { p.x = x; p.z = z; p.a = a; }
        }
        if (m.st !== undefined) { this.stam = m.st; this.vacCd = m.vac; this.restT = m.rest; }
        if (m.sq !== undefined) this.sqLeft = m.sq;
        break;
      }
      case 'fix': { const me = this.myP(); if (me) { me.x = m.x; me.z = m.z; } break; }
      case 'pull': { // 청소기에 빨려 간다
        const me = this.myP(); if (!me) break;
        const dx = m.x - me.x, dz = m.z - me.z, d = Math.hypot(dx, dz) || 1;
        const [x, z] = collide(this.Wd, me.x, me.z, me.x + dx / d * m.k, me.z + dz / d * m.k); me.x = x; me.z = z;
        this.doShake(.6); this.say('으아아 빨려 간다!!');
        break;
      }
      case 'look': this.setLook(m.id, m.v); break;
      case 'sign': {
        this.pings.push({ x: m.x, z: m.z, t: 0, who: (this.P.get(m.a) || {}).name || '' }); S.ping();
        break;
      }
      case 'ev': this.onEv(m); break;
      case 'end': this.onEnd(m); break;
    }
  }
  onEv(m) {
    const me = this.myP(), p = this.P.get(m.id), nm = p ? p.name : '?';
    switch (m.e) {
      case 'hunt': this.enterHunt(); break;
      case 'form': if (p && m.id !== this.me) p.form = m.f; break;
      case 'miss': {
        const o = this.Wd.objs[m.i];
        if (m.id === this.me) { S.miss(); this.say(`헛손질! ${o ? '진짜 ' + OBJ[o.t].n + '이었어요' : ''}`); this.doShake(.25); }
        else this.posSound(p, 'miss');
        if (o) this.fx.push({ k: 'miss', x: o.x, z: o.z, t: 0 });
        if (m.rest) { this.addFeed(`😵 ${nm} 엄마 기진맥진! 3초 쉬는 중`); if (m.id === this.me) { S.tired(); this.banner('헉… 헉…', '헛손질을 너무 많이 했어요. 3초 쉬어요', 2.6); } }
        break;
      }
      case 'up': if (m.id === this.me) this.say('다시 힘이 났어요!'); break;
      case 'caught': {
        const t = this.P.get(m.id), by = this.P.get(m.by);
        if (t) { t.caught = true; t.form = null; }
        this.addFeed(`🧹 ${by ? by.name : '엄마'}가 ${t ? t.name : '?'}${m.f ? `(${OBJ[m.f].n})` : ''}를 치웠어요!`);
        this.fx.push({ k: 'grab', x: m.x, z: m.z, t: 0 });
        if (m.id === this.me) { S.caught(); this.banner('치워졌다…', '장난감 상자 안에서 구경해요. 친구가 상자 앞에서 E를 꾹 누르면 탈출!', 3.5); this.frozen = false; this.spec = null; this.doShake(.6); }
        else if (m.by === this.me) { S.caught(); S.win(); this.banner('찾았다!', `${t ? t.name : ''} 치웠어요`, 1.6); }
        else this.posSoundAt(m.x, m.z, 'boing');
        break;
      }
      case 'rescue': {
        S.rescue(); this.addFeed(`🆘 ${nm}가 친구 ${m.freed.length}명을 구출했어요!`);
        for (const id of m.freed) { const t = this.P.get(id); if (t) { t.caught = false; t.buf = []; } }
        if (m.freed.includes(this.me)) { this.banner('탈출!!', '3초 동안 안 잡혀요. 얼른 다시 숨어!', 2.5); this.spec = null; }
        this.resP = 0;
        break;
      }
      case 'resp': this.resP = m.v; this.resShow = 1; this.resWho = nm; break;
      case 'sq': {
        if (p) { this.bubbles.push({ id: m.id, x: m.x, z: m.z, t: 0, v: m.v }); this.posSoundAt(m.x, m.z, 'squeak'); }
        if (m.id === this.me) this.say(m.v ? '청소기 때문에 삑!' : '삑! (30초마다 저절로 나요)');
        break;
      }
      case 'vac': {
        this.fx.push({ k: 'vac', x: m.x, z: m.z, t: 0 });
        const c = this.camPos(), d = Math.hypot(m.x - c.x, m.z - c.z);
        S.vacuum(clamp(1.2 - d / 10, .15, 1)); this.doShake(m.id === this.me ? .4 : clamp(.5 - d / 12, 0, .4));
        if (m.id === this.me) this.say(m.hit.length ? `청소기로 ${m.hit.length}개 들썩!` : '청소기… 아무것도 없네');
        break;
      }
      case 'newmom': {
        const o = this.P.get(m.old); if (o) o.gone = true;
        if (p) { p.role = 'mom'; p.caught = false; p.form = null; this.setLook(m.id, m.look); }
        this.addFeed(`👩 엄마가 나가서 ${nm}가 새 엄마가 됐어요!`);
        if (m.id === this.me) { this.role = 'mom'; this.frozen = false; this.pitch = -.25; this.spec = null; this.banner('네가 이제 엄마야!', '장난감을 전부 치워요!', 3); }
        break;
      }
    }
  }
  onChat(m) { if (!this.chatBox) return; this.chatLog.push({ t: performance.now(), m }); this.drawChat(); }
  onLobby() {}

  // ───────── 소리 위치 ─────────
  posSoundAt(x, z, kind) {
    const c = this.camPos(), dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz);
    const v = clamp(1.15 - d / 14, 0, 1), pan = clamp(Math.sin(angDiff(Math.atan2(dz, dx), this.yaw)), -1, 1) * .8;
    if (kind === 'squeak') S.squeak(v, pan); else if (kind === 'boing') S.boing(v, pan); else if (kind === 'slip') S.slipper(v * .8, pan); else if (kind === 'miss') S.miss();
  }
  posSound(p, kind) { if (p) this.posSoundAt(p.x, p.z, kind); }

  // ───────── 상태 보내기 ─────────
  sendState() {
    if (this.practice || !this.net || this.ended) return;
    const me = this.myP(); if (!me || me.caught) return;
    const s = [Math.round(me.x * 100), Math.round(me.z * 100), Math.round(this.yaw * 100), this.frozen ? 1 : 0, this.moving ? 1 : 0].join();
    const now = performance.now();
    if (s === this.lastSent && now - (this.lastSentT || 0) < 500) return;
    this.lastSent = s; this.lastSentT = now;
    this.net.send({ type: 'st', x: me.x, z: me.z, a: this.yaw, fz: this.frozen ? 1 : 0, mv: this.moving ? 1 : 0 });
    if (this.resHold && this.nearBox()) this.net.send({ type: 'res' });
  }

  // ───────── 프레임 ─────────
  frame(t) {
    if (!this.alive) return;
    const dt = Math.min(.05, (t - this.last) / 1000); this.last = t;
    this.update(dt, t);
    this.draw(t);
    this.raf = requestAnimationFrame(tt => this.frame(tt));
  }
  update(dt, t) {
    const me = this.myP(); if (!me) return;
    // 내 이동
    this.moving = false;
    const canMove = !this.ended && !this.editor && !this.chatOpen && !me.caught && !(this.role === 'mom' && (this.ph === 'prep' || this.restT > 0)) && !(this.role === 'toy' && this.frozen);
    if (canMove) {
      let f = 0, s = 0;
      if (this.keys.KeyW || this.keys.ArrowUp) f++; if (this.keys.KeyS || this.keys.ArrowDown) f--;
      if (this.keys.KeyD) s++; if (this.keys.KeyA) s--;
      if (this.keys.ArrowLeft && !this.isSpec()) this.yaw -= 2.4 * dt; if (this.keys.ArrowRight && !this.isSpec()) this.yaw += 2.4 * dt;
      if (this.tmove) { f = -this.tmove[1]; s = this.tmove[0]; }
      const l = Math.hypot(f, s);
      if (l > .1) {
        if (l > 1) { f /= l; s /= l; }
        const sp = speedOf(this.role, me.form) * dt, c = Math.cos(this.yaw), sn = Math.sin(this.yaw);
        const nx = me.x + (c * f - sn * s) * sp, nz = me.z + (sn * f + c * s) * sp;
        const [x, z] = collide(this.Wd, me.x, me.z, nx, nz); me.x = x; me.z = z; this.moving = true;
        if (this.role === 'mom') { me.stepT = (me.stepT || 0) - dt; if (me.stepT <= 0) { me.stepT = .36; S.slipper(.35, 0); } }
      }
    }
    // 다른 사람 보간 + 엄마 발소리
    const rt = t - 120;
    for (const p of this.P.values()) {
      if (p.id === this.me || p.buf.length === 0) continue;
      const b = p.buf; let i = b.length - 1; while (i > 0 && b[i - 1][0] > rt) i--;
      const B = b[i], A = b[Math.max(0, i - 1)];
      let k = B[0] === A[0] ? 1 : clamp((rt - A[0]) / (B[0] - A[0]), 0, 1);
      const ox = p.x, oz = p.z;
      p.x = A[1] + (B[1] - A[1]) * k; p.z = A[2] + (B[2] - A[2]) * k; p.a = A[3] + angDiff(B[3], A[3]) * k;
      if (p.role === 'mom' && !p.gone && Math.hypot(p.x - ox, p.z - oz) > .01) { p.stepT = (p.stepT || 0) - dt; if (p.stepT <= 0) { p.stepT = .36; this.posSound(p, 'slip'); } }
    }
    for (const a of [this.bubbles, this.pings, this.fx]) for (const b of a) b.t += dt;
    this.bubbles = this.bubbles.filter(b => b.t < 1.4); this.pings = this.pings.filter(b => b.t < 4); this.fx = this.fx.filter(b => b.t < 1.2);
    this.shake = Math.max(0, this.shake - dt * 1.6); this.hand = Math.max(0, this.hand - dt * 4);
    this.resShow = Math.max(0, this.resShow - dt * 1.5);
    if (this.isSpec()) this.pickSpec();
    // 막판 30초
    const left = this.timeLeft();
    if (this.ph === 'hunt' && !this.practice && !this.ended) { if (left <= 30 && !this.hurry) { this.hurry = true; bgm('hurry'); this.banner('30초 남았다!', '', 1.6); } if (left <= 10 && Math.ceil(left) !== this.lastTick) { this.lastTick = Math.ceil(left); S.tick(); } }
    this.syncTouch();
  }
  timeLeft() { return Math.max(0, this.tLeft - (performance.now() - this.tAt) / 1000); }
  doShake(v) { if (!this.ST.noShake) this.shake = Math.max(this.shake, v); }

  // 관전 대상
  pickSpec() {
    const free = [...this.P.values()].filter(p => p.role === 'toy' && !p.caught && !p.gone);
    const pool = free.length ? free : [...this.P.values()].filter(p => p.role === 'mom' && !p.gone);
    if (!pool.find(p => p.id === this.spec)) this.spec = pool.length ? pool[0].id : null;
  }
  nextSpec(d) {
    const free = [...this.P.values()].filter(p => p.role === 'toy' && !p.caught && !p.gone);
    const pool = free.length ? free : [...this.P.values()].filter(p => p.role === 'mom');
    if (!pool.length) return; const i = pool.findIndex(p => p.id === this.spec);
    this.spec = pool[(i + d + pool.length) % pool.length].id;
  }

  // 카메라: 엄마 = 1인칭, 장난감 = 등 뒤 3인칭
  camPos() {
    const me = this.myP(); if (!me) return { x: 1.5, z: 1.5, eye: .5 };
    let tgt = me, yaw = this.yaw;
    if (this.isSpec()) { const s = this.P.get(this.spec); if (s) tgt = s; }
    if (this.role === 'mom' && !this.isSpec()) return { x: me.x, z: me.z, eye: .62 };
    // 등 뒤로 벽에 안 박히게
    const back = tgt.role === 'mom' ? 1.8 : 1.5 + (tgt.form ? OBJ[tgt.form].h : TOY_H) * 1.4;
    let d = .05; const c = Math.cos(yaw), s = Math.sin(yaw);
    while (d < back && !solid(this.M, tgt.x - c * (d + .18), tgt.z - s * (d + .18)) && !solid(this.M, tgt.x - c * d + s * .12, tgt.z - s * d - c * .12) && !solid(this.M, tgt.x - c * d - s * .12, tgt.z - s * d + c * .12)) d += .05;
    const eye = tgt.role === 'mom' ? .8 : clamp((tgt.form ? OBJ[tgt.form].h : TOY_H) + .32, .45, .85);
    return { x: tgt.x - c * d, z: tgt.z - s * d, eye };
  }

  // ───────── 그리기 ─────────
  draw(t) {
    const W = this.W, H = this.H, u = this.u32, zb = this.zb, M = this.M, f = this.f;
    const cam = this.camPos();
    const sh = this.shake > 0 ? this.shake : 0;
    const yaw = this.yaw + (sh ? (Math.random() - .5) * .03 * sh : 0);
    const hor = Math.round(H / 2 + this.pitch * H + (sh ? (Math.random() - .5) * 8 * sh : 0));
    const dX = Math.cos(yaw), dZ = Math.sin(yaw), pX = -dZ * TANF, pZ = dX * TANF;
    const th = this.th, bright = this.ST.bright * (th.dim ? .92 : 1), fog = th.fog;
    const eye = cam.eye;
    const shade = (col, k) => { // k: 밝기
      k *= bright; if (k > 1.2) k = 1.2;
      const R = Math.min(255, (col & 255) * k), G = Math.min(255, (col >> 8 & 255) * k), B = Math.min(255, (col >> 16 & 255) * k);
      return 0xff000000 | (B << 16) | (G << 8) | R;
    };
    const fogK = d => { const k = th.dim ? 1 - d / 11 : 1 - d / 22; return k < .25 ? .25 : k; };
    // 바닥 · 천장
    const ft = th.floor, ftd = ft.d, ceil = this.ceilRGB;
    for (let y = 0; y < H; y++) {
      const row = y * W;
      if (y > hor) {
        const rd = f * eye / (y - hor + .5);
        const k = fogK(rd) * (th.dim ? .85 : .95);
        let fx = cam.x + (dX - pX) * rd, fz = cam.z + (dZ - pZ) * rd;
        const sx = (pX * 2 * rd) / W, sz = (pZ * 2 * rd) / W;
        for (let x = 0; x < W; x++) {
          const tx = ((fx - Math.floor(fx)) * ft.w) | 0, ty = ((fz - Math.floor(fz)) * ft.h) | 0;
          u[row + x] = shade(ftd[ty * ft.w + tx], k); fx += sx; fz += sz;
        }
      } else {
        const rd = f * (1 - eye) / (hor - y + .5), k = fogK(rd) * (th.dim ? .7 : 1) * bright;
        const R = Math.min(255, ceil[0] * k) | 0, G = Math.min(255, ceil[1] * k) | 0, B = Math.min(255, ceil[2] * k) | 0, c = 0xff000000 | (B << 16) | (G << 8) | R;
        u.fill(c, row, row + W);
      }
    }
    // 벽
    const wt = th.wall, wtd = wt.d;
    for (let x = 0; x < W; x++) {
      const cx = 2 * x / W - 1, rx = dX + pX * cx, rz = dZ + pZ * cx;
      let mx = Math.floor(cam.x), mz = Math.floor(cam.z);
      const ddx = Math.abs(1 / rx), ddz = Math.abs(1 / rz);
      let stx, stz, sdx, sdz, side = 0;
      if (rx < 0) { stx = -1; sdx = (cam.x - mx) * ddx; } else { stx = 1; sdx = (mx + 1 - cam.x) * ddx; }
      if (rz < 0) { stz = -1; sdz = (cam.z - mz) * ddz; } else { stz = 1; sdz = (mz + 1 - cam.z) * ddz; }
      let hit = false, n = 0;
      while (!hit && n++ < 64) { if (sdx < sdz) { sdx += ddx; mx += stx; side = 0; } else { sdz += ddz; mz += stz; side = 1; } if (solid(M, mx + .5, mz + .5)) hit = true; }
      const pd = side === 0 ? sdx - ddx : sdz - ddz, d = Math.max(.05, pd);
      zb[x] = d;
      let wx = side === 0 ? cam.z + d * rz : cam.x + d * rx; wx -= Math.floor(wx);
      let tx = (wx * wt.w) | 0; if ((side === 0 && rx > 0) || (side === 1 && rz < 0)) tx = wt.w - 1 - tx;
      const top = hor - f * (1 - eye) / d, bot = hor + f * eye / d, hh = bot - top;
      const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(H - 1, Math.floor(bot));
      const k = fogK(d) * (side ? .82 : 1);
      for (let y = y0; y <= y1; y++) { const ty = (((y - top) / hh) * wt.h) | 0; u[y * W + x] = shade(wtd[(ty < 0 ? 0 : ty >= wt.h ? wt.h - 1 : ty) * wt.w + tx], k); }
    }
    // 스프라이트
    const spr = [];
    const add = (x, z, h, w, tex, ref, lift = 0, tint = 0) => { const sx = x - cam.x, sz = z - cam.z, dep = sx * dX + sz * dZ; if (dep < .12) return; spr.push({ x, z, h, w, tex, ref, dep, lift, tint, lat: (sx * pX + sz * pZ) / (TANF * TANF) }); };
    this.Wd.objs.forEach((o, i) => { const h = OBJ[o.t].h; add(o.x, o.z, h, h, this.objTex[o.t], { k: 'o', i }); });
    for (const d of this.Wd.decor) { const tx = this.decTex[d.t], h = DECOR[d.t].h; add(d.x, d.z, h, h * tx.w / tx.h, tx, { k: 'd' }); }
    const anyCaught = [...this.P.values()].some(p => p.caught && !p.gone);
    add(M.box[0], M.box[1], .55, .55 * 40 / 32, this.boxTex[anyCaught ? 1 : 0], { k: 'b' });
    const tt = t / 1000;
    for (const p of this.P.values()) {
      if (p.caught || p.gone) continue;
      if (this.practice && p.id === this.me && this.pracMom) { const b = this.pracBody; if (b && b.form) { const h = OBJ[b.form].h; add(b.x, b.z, h, h, this.objTex[b.form], { k: 'p', id: 'me' }); } else if (b) add(b.x, b.z, TOY_H, TOY_H, spriteTex(toySprite(p.col)), { k: 'p', id: 'me' }); continue; }
      if (p.id === this.me && this.role === 'mom') continue; // 1인칭
      const fz = p.id === this.me ? this.frozen : !!(p.fl & 1), mv = p.id === this.me ? this.moving : !!(p.fl & 2);
      if (p.role === 'mom') { if (!p.lookTex) this.setLook(p.id, p.look); const bob = mv ? Math.abs(Math.sin(tt * 9)) * .03 : 0; add(p.x, p.z, MOM_H, MOM_W, p.lookTex, { k: 'm', id: p.id }, bob, (p.fl & 16) ? 1 : 0); continue; }
      const grace = (p.fl & 8) && Math.sin(tt * 20) > 0;
      if (p.form) {
        const h = OBJ[p.form].h;
        // 얼음 아니면 살짝 흔들흔들, 움직이면 통통
        const wob = fz ? 0 : Math.sin(tt * 5 + p.x * 3) * .022 * (1 + h);
        const lift = mv ? Math.abs(Math.sin(tt * 12)) * .05 : 0;
        add(p.x + wob * -dZ, p.z + wob * dX, h, h, this.objTex[p.form], { k: 'p', id: p.id }, lift, grace ? 2 : 0);
      } else {
        if (!p.toyTex) p.toyTex = spriteTex(toySprite(p.col));
        add(p.x, p.z, TOY_H, TOY_H, p.toyTex, { k: 'p', id: p.id }, mv ? Math.abs(Math.sin(tt * 12)) * .05 : 0, grace ? 2 : 0);
      }
    }
    spr.sort((a, b) => b.dep - a.dep);
    const cxs = W >> 1, cys = H >> 1, hits = [];
    for (const s of spr) {
      const sxc = (W / 2) * (1 + s.lat / s.dep), sh2 = f * s.h / s.dep, sw = f * s.w / s.dep;
      const bot = hor + f * (eye - s.lift) / s.dep, top = bot - sh2;
      const x0 = Math.max(0, Math.ceil(sxc - sw / 2)), x1 = Math.min(W - 1, Math.floor(sxc + sw / 2));
      const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(H - 1, Math.floor(bot));
      if (x0 > x1 || y0 > y1) continue;
      const T = s.tex, td = T.d, k = fogK(s.dep);
      for (let x = x0; x <= x1; x++) {
        if (s.dep >= zb[x]) continue;
        const tx = (((x - (sxc - sw / 2)) / sw) * T.w) | 0; if (tx < 0 || tx >= T.w) continue;
        for (let y = y0; y <= y1; y++) {
          const ty = (((y - top) / sh2) * T.h) | 0; if (ty < 0 || ty >= T.h) continue;
          const c = td[ty * T.w + tx]; if ((c >>> 24) < 128) continue;
          let o = shade(c, k);
          if (s.tint === 1) o = (o & 0xff00ffff) | 0x00200000; // 쉬는 엄마 살짝 파랗게 (지친 표시)
          if (s.tint === 2) o = 0xffffffff;
          u[y * W + x] = o;
          if (x === cxs && y === cys) hits.push({ ...s.ref, d: Math.hypot(s.x - this.myP().x, s.z - this.myP().z), dep: s.dep });
        }
      }
      s.sx = sxc; s.sy = top; s.sb = bot;
    }
    // 가장 가까운 것. 단, 장난감이 물건과 거의 겹쳐 있으면 장난감 쪽 (물건 속에 파묻혀 못 잡는 일 방지)
    let pick = hits.length ? hits[hits.length - 1] : null;
    if (pick && pick.k !== 'p') { const ph = hits.filter(h => h.k === 'p' && h.dep - pick.dep < .35).pop(); if (ph) pick = ph; }
    this.pick = pick; this.sprs = spr;
    this.og.putImageData(this.img, 0, 0);
    // 화면에 크게
    const g = this.g, CW = this.cv.width, CH = this.cv.height;
    g.imageSmoothingEnabled = false; g.drawImage(this.off, 0, 0, CW, CH);
    this.drawHUD(cam, hor, dX, dZ, pX, pZ, t);
  }

  // 월드 좌표 → 화면 (큰 캔버스 좌표)
  proj(cam, x, z, y, hor, dX, dZ, pX, pZ) {
    const sx = x - cam.x, sz = z - cam.z, dep = sx * dX + sz * dZ; if (dep < .15) return null;
    const lat = (sx * pX + sz * pZ) / (TANF * TANF);
    const X = (this.W / 2) * (1 + lat / dep), Y = hor + this.f * (cam.eye - y) / dep;
    const k = this.cv.width / this.W;
    return [X * k, Y * k, dep];
  }

  // ───────── HUD ─────────
  hudBuild() {
    const ui = this.ui;
    ui.insertAdjacentHTML('beforeend', `
<div data-top style="position:absolute;left:50%;top:10px;transform:translateX(-50%);display:flex;gap:8px;align-items:center"></div>
<div data-role style="position:absolute;left:12px;top:10px;background:#fffaf0;border:3px solid #4a2c1d;border-radius:14px;padding:6px 10px;color:#4a2c1d;font-size:16px;min-width:150px"></div>
<div data-cnt style="position:absolute;right:12px;top:10px;background:#fffaf0;border:3px solid #4a2c1d;border-radius:14px;padding:6px 10px;color:#4a2c1d;font-size:15px"></div>
<div data-say style="position:absolute;left:50%;bottom:${isPhone ? 150 : 70}px;transform:translateX(-50%);background:rgba(74,44,29,.85);color:#fff;border-radius:12px;padding:7px 14px;font-size:18px;display:none;white-space:nowrap;max-width:94vw;overflow:hidden;text-overflow:ellipsis"></div>
<div data-prompt style="position:absolute;left:50%;bottom:${isPhone ? 196 : 118}px;transform:translateX(-50%);color:#fff;font-size:19px;text-shadow:0 2px 0 #4a2c1d,0 0 6px #4a2c1d;white-space:nowrap"></div>
<div data-feed style="position:absolute;left:12px;bottom:${isPhone ? 140 : 46}px;display:flex;flex-direction:column;gap:4px;align-items:flex-start;max-width:60vw"></div>
<div data-ban style="position:absolute;left:50%;top:28%;transform:translate(-50%,-50%);text-align:center;color:#fff;text-shadow:0 3px 0 #4a2c1d,0 0 10px #4a2c1d;display:none"></div>
<div data-card style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#fffaf0;border:3px solid #4a2c1d;border-radius:18px;padding:16px 20px;color:#4a2c1d;max-width:92vw;width:440px;display:none;font-size:16px;line-height:1.6;pointer-events:auto"></div>
<div data-chat style="position:absolute;left:12px;bottom:${isPhone ? 230 : 140}px;display:flex;flex-direction:column;gap:3px;max-width:50vw;font-size:15px"></div>`);
    const q = s => ui.querySelector(`[data-${s}]`);
    this.hTop = q('top'); this.hRole = q('role'); this.hCnt = q('cnt'); this.hSay = q('say'); this.hPrompt = q('prompt'); this.hFeed = q('feed'); this.hBan = q('ban'); this.hCard = q('card'); this.chatBox = q('chat');
    if (this.practice) this.hCnt.style.display = 'none';
    if (isPhone) this.hCard.onclick = () => { this.cardOn = false; this.drawCard(); };
  }
  say(t) { this.hSay.textContent = t; this.hSay.style.display = 'block'; clearTimeout(this.sayT); this.sayT = setTimeout(() => this.hSay.style.display = 'none', 2200); }
  banner(a, b, s = 2.5) {
    if (!this.hBan) { setTimeout(() => this.banner(a, b, s), 0); return; }
    this.hBan.innerHTML = ''; const h = document.createElement('div'); h.style.cssText = 'font-size:clamp(34px,7vw,64px)'; h.textContent = a; this.hBan.append(h);
    if (b) { const p = document.createElement('div'); p.style.cssText = 'font-size:clamp(15px,2.6vw,22px);margin-top:6px'; p.textContent = b; this.hBan.append(p); }
    this.hBan.style.display = 'block'; this.hBan.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.08)', opacity: 1, offset: .25 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 500 });
    clearTimeout(this.banT); this.banT = setTimeout(() => this.hBan.style.display = 'none', s * 1000);
  }
  addFeed(t) {
    const d = document.createElement('div'); d.textContent = t;
    d.style.cssText = 'background:rgba(255,250,240,.92);border:2px solid #4a2c1d;border-radius:10px;padding:3px 9px;color:#4a2c1d;font-size:15px';
    this.hFeed.append(d); while (this.hFeed.children.length > 5) this.hFeed.firstChild.remove();
    setTimeout(() => d.remove(), 7000);
  }
  drawCard() {
    const c = this.hCard; c.style.display = this.cardOn ? 'block' : 'none'; if (!this.cardOn) return;
    const mom = this.role === 'mom';
    c.innerHTML = mom
      ? `<div style="font-size:26px">🧹 너는 <b style="color:#ff6fa5">엄마</b></div>
<div>· 수상한 물건을 <b>클릭</b>해서 치워요 (가까이 가야 손이 닿아요)</div>
<div>· 진짜 물건을 짚으면 <b>헛손질</b> → 스펀지가 줄어요. 다 떨어지면 3초 쉬어요</div>
<div>· <b>Space 청소기</b>: 1분에 한 번, 주변 장난감이 삑! 하고 끌려와요</div>
<div>· 장난감은 <b>30초마다 삑!</b> 소리를 내요. 귀를 기울여요</div>
<div>· 흔들흔들하는 물건은 수상해요</div>
<div>· 잡힌 장난감은 <b>장난감 상자</b>로 가요. 상자를 지키면 좋아요</div>
<div style="margin-top:6px">🏆 4분 안에 장난감을 <b>전부</b> 치우면 엄마 승리!</div>`
      : `<div style="font-size:26px">🧸 너는 <b style="color:#3b8fd6">장난감</b></div>
<div>· <b>E</b>: 보고 있는 물건으로 변신 · <b>Q</b>: 원래 모습</div>
<div>· 작은 물건은 빠르고, 큰 물건은 느려요</div>
<div>· <b>Shift 얼음</b>: 흔들거림이 멈춰요 (못 움직여요)</div>
<div>· 30초마다 저절로 <b>삑!</b> 소리가 나요</div>
<div>· 잡힌 친구는 <b>장난감 상자</b> 앞에서 <b>E를 3초 꾹</b> 누르면 전부 구출!</div>
<div>· <b>G</b>: 여기 봐! 손짓 (장난감끼리만 보여요) · <b>Enter</b>: 장난감끼리 채팅</div>
<div style="margin-top:6px">🏆 4분 동안 한 명이라도 안 잡히면 장난감 승리!</div>`;
  }
  openChat() {
    if (this.chatOpen) return; this.chatOpen = true; this.keys = {};
    if (document.pointerLockElement) document.exitPointerLock();
    const f = document.createElement('form'); f.style.cssText = 'position:absolute;left:12px;bottom:12px;pointer-events:auto;display:flex;gap:6px;z-index:6';
    f.innerHTML = `<input maxlength="120" placeholder="${this.role === 'mom' ? '엄마끼리' : '장난감끼리'} 채팅 (Enter)" style="font:16px Jua;border:3px solid #4a2c1d;border-radius:10px;padding:6px 10px;width:min(360px,70vw)">`;
    this.root.append(f); const inp = f.querySelector('input'); setTimeout(() => inp.focus(), 0);
    const close = () => { if (!this.chatOpen) return; this.chatOpen = false; f.remove(); setTimeout(() => this.lock(), 50); };
    f.onsubmit = e => { e.preventDefault(); const v = inp.value.trim(); if (v) this.net.send({ type: 'chat', text: v }); close(); };
    inp.addEventListener('keydown', e => { if (e.key === 'Escape') close(); e.stopPropagation(); });
    inp.addEventListener('blur', () => setTimeout(close, 100));
  }
  drawChat() {
    const now = performance.now(); this.chatLog = this.chatLog.filter(c => now - c.t < 10000).slice(-6);
    this.chatBox.textContent = '';
    for (const { m } of this.chatLog) {
      const d = document.createElement('div'); d.style.cssText = 'background:rgba(0,0,0,.45);color:#fff;border-radius:8px;padding:2px 8px';
      if (m.sys) d.textContent = '· ' + m.text; else { const b = document.createElement('b'); b.style.color = '#ffd34d'; b.textContent = m.name + ': '; d.append(b, document.createTextNode(m.text)); }
      this.chatBox.append(d);
    }
    clearTimeout(this.chatT); this.chatT = setTimeout(() => this.drawChat(), 2000);
  }
  showMenu() {
    if (this.menuEl || this.ended) return;
    const m = document.createElement('div'); m.style.cssText = 'position:absolute;inset:0;background:rgba(74,44,29,.5);display:flex;align-items:center;justify-content:center;z-index:8;pointer-events:auto';
    m.innerHTML = `<div style="background:#fffaf0;border:3px solid #4a2c1d;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:10px;min-width:240px;color:#4a2c1d;font-family:Jua">
<div style="font-size:24px;text-align:center">잠깐!</div>
<button class="btn pk" data-a="go">계속하기</button><button class="btn" data-a="set">⚙️ 설정</button><button class="btn" data-a="quit">${this.practice ? '그만하기' : '나가기'}</button></div>`;
    this.root.append(m); this.menuEl = m;
    const close = () => { m.remove(); this.menuEl = null; };
    m.querySelector('[data-a=go]').onclick = () => { close(); this.lock(); };
    m.querySelector('[data-a=set]').onclick = () => { window.__mcOpenSettings && window.__mcOpenSettings(); };
    m.querySelector('[data-a=quit]').onclick = () => { if (this.practice || confirm('정말 나갈까요? 게임 중에 나가면 다시 못 들어와요.')) { close(); this.onQuit(); } };
  }

  drawHUD(cam, hor, dX, dZ, pX, pZ, t) {
    const g = this.g, CW = this.cv.width, CH = this.cv.height, k = this.cv.width / this.W, sc = Math.min(CW, CH) / 600;
    const me = this.myP();
    // 이름표 (장난감끼리만 서로 보임) · 삑 말풍선 · 손짓 · 효과
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (this.role === 'toy' || this.ended) for (const p of this.P.values()) {
      if (p.id === this.me || p.caught || p.gone || p.role !== 'toy') continue;
      const h = p.form ? OBJ[p.form].h : TOY_H, s = this.proj(cam, p.x, p.z, h + .12, hor, dX, dZ, pX, pZ); if (!s || s[2] > 9 || !this.visible(cam, p.x, p.z)) continue;
      g.font = `${Math.round(13 * sc * this.dpr)}px Jua`; g.fillStyle = 'rgba(0,0,0,.5)'; const w = g.measureText(p.name).width + 10 * sc;
      g.fillRect(s[0] - w / 2, s[1] - 10 * sc, w, 20 * sc); g.fillStyle = '#fff'; g.fillText(p.name, s[0], s[1]);
    }
    for (const b of this.bubbles) {
      const p = this.P.get(b.id); const x = p && !p.caught ? p.x : b.x, z = p && !p.caught ? p.z : b.z, h = p && p.form ? OBJ[p.form].h : TOY_H;
      if (!this.visible(cam, x, z)) continue;
      const s = this.proj(cam, x, z, h + .2 + b.t * .25, hor, dX, dZ, pX, pZ); if (!s) continue;
      const a = 1 - b.t / 1.4, sz = clamp(26 / s[2], 12, 40) * sc * this.dpr;
      g.globalAlpha = a; g.font = `${Math.round(sz)}px Jua`; g.lineWidth = sz / 5; g.strokeStyle = '#4a2c1d'; g.strokeText('삑!', s[0], s[1]); g.fillStyle = '#ffd34d'; g.fillText('삑!', s[0], s[1]); g.globalAlpha = 1;
    }
    for (const p of this.pings) {
      const s = this.proj(cam, p.x, p.z, .3, hor, dX, dZ, pX, pZ); const a = p.t < 3 ? 1 : 4 - p.t;
      g.globalAlpha = a;
      if (s) { const r = (10 + Math.sin(p.t * 8) * 3) * sc * this.dpr; g.fillStyle = '#5fd0b5'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(s[0], s[1], r, 0, TAU); g.fill(); g.stroke(); g.font = `${Math.round(13 * sc * this.dpr)}px Jua`; g.fillStyle = '#fff'; g.fillText(`👋 ${p.who} ${s[2].toFixed(0)}m`, s[0], s[1] - r - 10 * sc); }
      else { // 화면 밖 → 가장자리 화살표
        const ang = angDiff(Math.atan2(p.z - cam.z, p.x - cam.x), this.yaw); const x = CW / 2 + Math.sign(ang) * CW * .44; g.fillStyle = '#5fd0b5'; g.font = `${Math.round(22 * sc * this.dpr)}px Jua`; g.fillText(ang > 0 ? '👉' : '👈', x, CH * .5);
      }
      g.globalAlpha = 1;
    }
    for (const e of this.fx) {
      if (e.k === 'poof') { g.globalAlpha = 1 - e.t / 1.2; g.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = (40 + e.t * 140) * sc * this.dpr; g.beginPath(); g.arc(CW / 2 + Math.cos(a) * r, CH * .62 + Math.sin(a) * r * .5, Math.max(.1, 14 * sc * this.dpr * (1 - e.t)), 0, TAU); g.fill(); } g.globalAlpha = 1; }
      else if (e.k === 'vac' || e.k === 'grab' || e.k === 'miss') {
        const s = this.proj(cam, e.x, e.z, .3, hor, dX, dZ, pX, pZ); if (!s) continue;
        g.globalAlpha = 1 - e.t / 1.2;
        if (e.k === 'vac') { g.strokeStyle = '#7cc4ff'; g.lineWidth = 4 * sc; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(s[0], s[1], ((e.t * 3 + i * .35) % 1.2) * 260 / s[2] * sc, 0, TAU); g.stroke(); } }
        else { g.font = `${Math.round(30 * sc * this.dpr)}px Jua`; g.fillStyle = e.k === 'grab' ? '#ff6fa5' : '#fff'; g.strokeStyle = '#4a2c1d'; g.lineWidth = 5; const tx = e.k === 'grab' ? '쏙!' : '휙~'; g.strokeText(tx, s[0], s[1] - e.t * 40); g.fillText(tx, s[0], s[1] - e.t * 40); }
        g.globalAlpha = 1;
      }
    }
    // 장난감 상자 위 숫자
    const nC = [...this.P.values()].filter(p => p.caught && !p.gone).length;
    if (nC && this.visible(cam, this.M.box[0], this.M.box[1])) { const s = this.proj(cam, this.M.box[0], this.M.box[1], .8, hor, dX, dZ, pX, pZ); if (s) { g.font = `${Math.round(16 * sc * this.dpr)}px Jua`; g.fillStyle = '#fff'; g.strokeStyle = '#4a2c1d'; g.lineWidth = 4; const tx = `🧸 ×${nC} 갇힘`; g.strokeText(tx, s[0], s[1]); g.fillText(tx, s[0], s[1]); } }
    // 변신 대상 표시
    let prompt = '';
    if (this.role === 'toy' && !this.isSpec() && !this.ended) {
      if (this.nearBox()) prompt = isPhone ? '🆘 버튼 꾹: 친구 구출' : '🆘 E 꾹: 친구들 구출';
      else {
        const i = this.formTarget();
        if (i >= 0) { const o = this.Wd.objs[i]; const s = this.proj(cam, o.x, o.z, OBJ[o.t].h + .15, hor, dX, dZ, pX, pZ); if (s) { g.font = `${Math.round(20 * sc * this.dpr)}px Jua`; g.fillStyle = '#ff6fa5'; g.strokeStyle = '#fff'; g.lineWidth = 4; const yy = s[1] - Math.abs(Math.sin(t / 200)) * 8 * sc; g.strokeText('▼', s[0], yy); g.fillText('▼', s[0], yy); } prompt = `${isPhone ? '🎭' : 'E'}: ${OBJ[o.t].n}(으)로 변신`; }
      }
    }
    // 구출 진행
    if (this.resShow > 0 && this.resP > 0) {
      const w = 260 * sc * this.dpr, x = CW / 2 - w / 2, y = CH * .66;
      g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x, y, w, 16 * sc * this.dpr); g.fillStyle = '#5fd0b5'; g.fillRect(x, y, w * clamp(this.resP, 0, 1), 16 * sc * this.dpr);
      g.font = `${Math.round(14 * sc * this.dpr)}px Jua`; g.fillStyle = '#fff'; g.fillText(`${this.resWho || ''} 구출 중…`, CW / 2, y - 12 * sc);
    }
    // 엄마 조준점 + 손
    if (this.role === 'mom' && !this.ended && this.ph === 'hunt') {
      const pk = this.pick, near = pk && (pk.k === 'o' || pk.k === 'p') && pk.d < CFG.GRAB_RANGE;
      const r = 7 * sc * this.dpr; g.strokeStyle = near ? '#ff6fa5' : '#fff'; g.lineWidth = 3 * this.dpr;
      g.beginPath(); g.arc(CW / 2, CH / 2, near ? r * 1.6 : r, 0, TAU); g.stroke();
      g.fillStyle = '#4a2c1d'; g.fillRect(CW / 2 - 1.5 * this.dpr, CH / 2 - 1.5 * this.dpr, 3 * this.dpr, 3 * this.dpr);
      // 고무장갑 손
      const hy = CH - (90 + this.hand * 120) * sc * this.dpr, hx = CW * .68 - this.hand * 80 * sc;
      g.fillStyle = '#ffd34d'; g.strokeStyle = '#4a2c1d'; g.lineWidth = 4 * this.dpr;
      g.beginPath(); g.ellipse(hx, hy + 60 * sc * this.dpr, 52 * sc * this.dpr, 70 * sc * this.dpr, -.3, 0, TAU); g.fill(); g.stroke();
      for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(hx - 36 * sc * this.dpr + i * 22 * sc * this.dpr, hy - 4 * sc * this.dpr, 10 * sc * this.dpr, 24 * sc * this.dpr, -.2, 0, TAU); g.fill(); g.stroke(); }
      if (this.restT > 0) { g.fillStyle = 'rgba(80,120,200,.25)'; g.fillRect(0, 0, CW, CH); }
    }
    if (this.role === 'mom' && this.ph === 'prep' && !this.editor && !this.practice) {
      g.fillStyle = '#000'; g.fillRect(0, 0, CW, CH); g.fillStyle = '#fff'; g.font = `${Math.round(28 * sc * this.dpr)}px Jua`;
      g.fillText(`눈 감고 숫자 세는 중… ${Math.ceil(this.timeLeft())}`, CW / 2, CH / 2);
    }
    if (this.isSpec()) {
      const s = this.P.get(this.spec);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, CH - 44 * sc * this.dpr, CW, 44 * sc * this.dpr);
      g.font = `${Math.round(17 * sc * this.dpr)}px Jua`; g.fillStyle = '#fff';
      g.fillText(`📦 상자 안에서 구경 중: ${s ? s.name : '-'}  (${isPhone ? '화면 탭' : '클릭 / ← →'}: 다른 사람)`, CW / 2, CH - 22 * sc * this.dpr);
    }
    // DOM HUD
    if (this.hPrompt.textContent !== prompt) this.hPrompt.textContent = prompt;
    this.hudText();
  }
  // 대충 가리는 벽이 있는지 (이름표·말풍선용)
  visible(cam, x, z) {
    const dx = x - cam.x, dz = z - cam.z, d = Math.hypot(dx, dz), n = Math.ceil(d / .25);
    for (let i = 1; i < n; i++) if (solid(this.M, cam.x + dx * i / n, cam.z + dz * i / n)) return false;
    return true;
  }
  hudText() {
    const now = performance.now(); if (now - (this.hudT || 0) < 120) return; this.hudT = now;
    const left = this.timeLeft(), mm = Math.floor(left / 60), ss = Math.floor(left % 60);
    const me = this.myP();
    let top = '';
    if (!this.practice) {
      const lbl = this.ph === 'prep' ? '💄 엄마 단장 중' : '🧹 청소 중';
      top = `<span style="background:${left <= 30 && this.ph === 'hunt' ? '#ff5a5a' : '#fffaf0'};color:${left <= 30 && this.ph === 'hunt' ? '#fff' : '#4a2c1d'};border:3px solid #4a2c1d;border-radius:14px;padding:4px 14px;font-size:24px">${lbl} ${mm}:${String(ss).padStart(2, '0')}</span>`;
    } else top = `<span style="background:#fffaf0;color:#4a2c1d;border:3px solid #4a2c1d;border-radius:14px;padding:4px 14px;font-size:18px">🧸 연습 · ${this.M.name} · ${this.pracMom ? '엄마 눈' : '장난감'}</span>`;
    if (this._top !== top) { this._top = top; this.hTop.innerHTML = top; }
    let role;
    if (this.role === 'mom') {
      const sp = '🧽'.repeat(this.stam) + '<span style="opacity:.25">' + '🧽'.repeat(Math.max(0, CFG.STAMINA - this.stam)) + '</span>';
      role = `<div style="font-size:19px">🧹 엄마</div><div>${sp}</div><div style="font-size:14px">${this.restT > 0 ? '😵 쉬는 중…' : ''}🌀 청소기 ${this.vacCd > 0 ? this.vacCd + '초' : '<b style="color:#3fbf6a">준비됨</b> (Space)'}</div>`;
    } else if (me && me.caught) role = `<div style="font-size:19px">📦 잡혔어요</div><div style="font-size:14px">친구가 구해 주길 기다려요</div>`;
    else role = `<div style="font-size:19px">🧸 ${me && me.form ? OBJ[me.form].n + ' <span style="font-size:13px">(' + ({ s: '빠름', m: '보통', l: '느림' })[OBJ[me.form].s] + ')</span>' : '장난감 그대로'}</div>
<div style="font-size:14px">${this.frozen ? '🧊 <b style="color:#3b8fd6">얼음 중</b>' : '흔들흔들 (Shift = 얼음)'}</div>${this.practice ? '' : `<div style="font-size:14px">📢 삑!까지 ${this.ph === 'hunt' ? this.sqLeft + '초' : '-'}</div>`}`;
    if (this._role !== role) { this._role = role; this.hRole.innerHTML = role; }
    if (!this.practice) {
      const toys = [...this.P.values()].filter(p => p.role === 'toy' && !p.gone), free = toys.filter(p => !p.caught);
      const cnt = `🧸 남은 장난감 <b>${free.length}</b> / ${toys.length}<div style="font-size:13px;margin-top:2px">${toys.map(p => `<span style="opacity:${p.caught ? .35 : 1}">${p.caught ? '📦' : '🧸'}${esc(p.name)}</span>`).join(' ')}</div>`;
      if (this._cnt !== cnt) { this._cnt = cnt; this.hCnt.innerHTML = cnt; }
    }
  }

  // ───────── 결과 ─────────
  onEnd(m) {
    this.ended = true; this.closeEditor();
    if (document.pointerLockElement) document.exitPointerLock();
    if (this.menuEl) { this.menuEl.remove(); this.menuEl = null; }
    const meWin = (m.win === 'mom') === (this.role === 'mom');
    meWin ? S.win() : S.lose(); bgm(null);
    const surv = m.toys.slice().sort((a, b) => b.surv - a.surv)[0];
    const best = m.moms.slice().sort((a, b) => b.catches - a.catches || a.miss - b.miss)[0];
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;inset:0;background:rgba(255,243,196,.97);z-index:9;overflow:auto;pointer-events:auto;color:#4a2c1d;font-family:Jua';
    el.innerHTML = `<div style="max-width:980px;margin:0 auto;padding:16px">
<div style="text-align:center;font-size:clamp(30px,6vw,52px);color:${m.win === 'mom' ? '#ff6fa5' : '#3b8fd6'};text-shadow:3px 3px 0 #4a2c1d">${m.win === 'mom' ? '엄마 승리! 집이 반짝반짝 ✨' : '장난감 승리! 엄마 포기~ 🧸'}</div>
<div style="text-align:center;font-size:18px;margin:4px 0 12px">${m.why ? esc(m.why) + ' · ' : ''}${meWin ? '이겼어요!' : '졌어요…'}</div>
<div style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:12px" data-g>
 <div style="background:#fffaf0;border:3px solid #4a2c1d;border-radius:16px;padding:10px"><div style="font-size:18px;margin-bottom:6px">🗺️ 다들 여기 숨어 있었어요</div><canvas data-map style="width:100%;image-rendering:pixelated;border-radius:8px"></canvas><div data-list style="font-size:15px;margin-top:6px"></div></div>
 <div style="display:flex;flex-direction:column;gap:12px">
  <div style="background:#fffaf0;border:3px solid #4a2c1d;border-radius:16px;padding:10px"><div style="font-size:18px">🏅 제일 오래 버틴 장난감</div><div style="font-size:24px;margin-top:4px">${surv ? esc(surv.name) + ` <span style="font-size:16px">${fmtT(surv.surv)} 버팀${surv.spot && surv.spot.f ? ` · ${OBJ[surv.spot.f].n}` : ''}</span>` : '-'}</div></div>
  <div style="background:#fffaf0;border:3px solid #4a2c1d;border-radius:16px;padding:10px"><div style="font-size:18px">👑 최고의 엄마</div><div data-moms style="display:flex;gap:12px;margin-top:6px;flex-wrap:wrap"></div></div>
  <div style="text-align:center;font-size:17px" data-cd></div>
 </div>
</div></div>`;
    this.root.append(el); this.endEl = el;
    if (innerWidth < 700) el.querySelector('[data-g]').style.gridTemplateColumns = '1fr';
    // 엄마들
    const mb = el.querySelector('[data-moms]');
    for (const mo of m.moms) {
      const w = document.createElement('div'); w.style.cssText = 'text-align:center';
      const c = lookToCanvas(mo.look || defaultLook()); c.style.cssText = 'width:64px;height:112px;image-rendering:pixelated;background:#f3ead8;border-radius:8px';
      const n = document.createElement('div'); n.innerHTML = `${mo === best && mo.catches ? '👑 ' : ''}${esc(mo.name)}<div style="font-size:13px">치움 ${mo.catches} · 헛손질 ${mo.miss}</div>`;
      w.append(c, n); mb.append(w);
    }
    // 지도
    const M = this.M, cv = el.querySelector('[data-map]'), S2 = 18; cv.width = M.grid[0].length * S2; cv.height = M.grid.length * S2;
    const g = cv.getContext('2d');
    M.grid.forEach((row, z) => [...row].forEach((ch, x) => { g.fillStyle = ch === '#' ? '#4a2c1d' : (x + z) % 2 ? '#fff6d8' : '#fdeec4'; g.fillRect(x * S2, z * S2, S2, S2); }));
    g.font = '10px Jua'; g.textAlign = 'center'; g.fillStyle = 'rgba(74,44,29,.45)';
    for (const [x0, z0, x1, z1, n] of M.rooms) g.fillText(n, (x0 + x1 + 1) / 2 * S2, (z0 + z1 + 1) / 2 * S2);
    g.fillStyle = '#ff7fae'; g.fillRect(M.box[0] * S2 - 7, M.box[1] * S2 - 5, 14, 10);
    const list = el.querySelector('[data-list]');
    m.toys.forEach(t => {
      const p = this.P.get(t.id), col = p ? p.col : '#888', sp = t.spot; if (!sp) return;
      g.fillStyle = col; g.strokeStyle = '#4a2c1d'; g.lineWidth = 2; g.beginPath(); g.arc(sp.x * S2, sp.z * S2, 7, 0, TAU); g.fill(); g.stroke();
      if (t.caught) { g.strokeStyle = '#ff5a5a'; g.lineWidth = 3; g.beginPath(); g.moveTo(sp.x * S2 - 5, sp.z * S2 - 5); g.lineTo(sp.x * S2 + 5, sp.z * S2 + 5); g.moveTo(sp.x * S2 + 5, sp.z * S2 - 5); g.lineTo(sp.x * S2 - 5, sp.z * S2 + 5); g.stroke(); }
      g.fillStyle = '#4a2c1d'; g.font = '11px Jua'; g.fillText(t.name, sp.x * S2, sp.z * S2 - 11);
      const d = document.createElement('div');
      d.innerHTML = `<span style="color:${col}">●</span> <b>${esc(t.name)}</b> — ${esc(sp.room)}에서 ${sp.f ? OBJ[sp.f].n + '(으)로' : '변신 없이'} ${t.caught ? '<span style="color:#ff5a5a">잡힘</span>' : '<span style="color:#3fbf6a">끝까지 생존!</span>'} · ${fmtT(t.surv)}${t.rescues ? ` · 구출 ${t.rescues}번` : ''}`;
      list.append(d);
    });
    let cd = 14; const cdEl = el.querySelector('[data-cd]');
    const tick = () => { cdEl.textContent = `${cd}초 뒤 대기실로 돌아가요`; cd--; };
    tick(); this.cdT = setInterval(tick, 1000);
  }

  destroy() {
    this.alive = false; cancelAnimationFrame(this.raf); clearInterval(this.sendT); clearInterval(this.cdT); clearTimeout(this.chatT);
    removeEventListener('keydown', this.kd); removeEventListener('keyup', this.ku); removeEventListener('mousemove', this.mm); removeEventListener('resize', this.resize);
    document.removeEventListener('pointerlockchange', this.plc);
    if (document.pointerLockElement) document.exitPointerLock();
    this.closeEditor();
    this.root.textContent = '';
  }
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
function fmtT(s) { s = Math.round(s); return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`; }
