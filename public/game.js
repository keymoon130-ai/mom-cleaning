// 엄마의 대청소날~ — 게임 화면 (쥐 탈출 버전)
import { CFG, FURN, HOUSE, HOUSE_W, HOUSE_D, ROT, WALL_H, ATTIC_Y, ATTIC_TOP, JUMP_V, house, moveBody, rayWorld, rayBox, blocked, placeName, josa, Sim } from './shared.js?v=22';
import { THREE, buildFurn, buildPanel, buildMouse, buildKey, buildDoor, buildHole, mergeStatic, texBox } from './models.js?v=22';
import { S, bgm, audioInit } from './sfx.js?v=22';
import { Editor, lookToCanvas, loadLook, defaultLook } from './editor.js?v=22';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const isPhone = matchMedia('(pointer:coarse)').matches;
const MOM_H = 1.75, MOM_W = MOM_H * CFG.LOOK_W / CFG.LOOK_H, EYE = CFG.MOM.eye;
const MOUSE_COLS = [0x9a9aa4, 0xb08a6a, 0xf2efe8, 0x6a6570, 0xd9b48a, 0x9a8aaa, 0xc79a7a, 0x7a8a8a, 0xe8d0b0, 0x7a5a48];
const hex = c => '#' + c.toString(16).padStart(6, '0');
const CAGE = HOUSE.cage;

// ───────── 벽지 · 바닥 ─────────
function cvs(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
function tex(c, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const WALL1 = g => { g.fillStyle = '#fdf0e2'; g.fillRect(0, 0, 32, 72); g.fillStyle = '#f6dfc8'; for (let x = 0; x < 32; x += 8) g.fillRect(x, 0, 2, 72); g.fillStyle = '#fff'; for (let y = 4; y < 62; y += 8) for (let x = 5; x < 32; x += 8) g.fillRect(x, y, 2, 2); g.fillStyle = '#c9935a'; g.fillRect(0, 66, 32, 6); g.fillStyle = '#a8693c'; g.fillRect(0, 66, 32, 1); };
const FLOOR1 = g => { g.fillStyle = '#e2b47c'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#cf9c63'; for (let y = 0; y < 32; y += 8) g.fillRect(0, y, 32, 1); g.fillRect(10, 0, 1, 8); g.fillRect(24, 8, 1, 8); g.fillRect(6, 16, 1, 8); g.fillRect(19, 24, 1, 8); };
const WALL2 = g => { g.fillStyle = '#8e6a4a'; g.fillRect(0, 0, 32, 72); g.fillStyle = '#7a5a3c'; for (let y = 0; y < 72; y += 6) g.fillRect(0, y, 32, 1); g.fillStyle = '#5e432c'; g.fillRect(12, 9, 2, 2); g.fillRect(25, 33, 2, 2); g.fillRect(4, 51, 2, 2); g.fillRect(0, 66, 32, 6); };
const FLOOR2 = g => { g.fillStyle = '#7d5a3e'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#6a4a31'; for (let x = 0; x < 32; x += 8) g.fillRect(x, 0, 1, 32); g.fillRect(3, 12, 1, 1); g.fillRect(20, 26, 1, 1); };

export class Game {
  constructor({ root, net, start, settings, onQuit, onRetry, practice }) {
    this.root = root; this.net = net; this.ST = settings; this.onQuit = onQuit; this.onRetry = onRetry; this.practice = !!practice;
    this.popt = practice && typeof practice === 'object' ? practice : { role: 'mouse' };
    this.alive = true; this.inbox = [];
    this.W = house(); this.W.doorOpen = false;
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
    r.innerHTML = `<canvas data-c style="position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block"></canvas>
<canvas data-h style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></canvas>
<div data-ui style="position:absolute;inset:0;pointer-events:none;font-family:Jua,sans-serif"></div>`;
    this.cv = r.querySelector('[data-c]'); this.hc = r.querySelector('[data-h]'); this.g = this.hc.getContext('2d');
    this.ui = r.querySelector('[data-ui]');
    const low = this.ST.low;
    this.R = new THREE.WebGLRenderer({ canvas: this.cv, antialias: !low && !isPhone, powerPreference: 'high-performance' });
    this.R.outputColorSpace = THREE.SRGBColorSpace;
    this.shadows = !low && !isPhone;
    this.R.shadowMap.enabled = this.shadows; this.R.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(74, 1, .01, 60); this.cam.rotation.order = 'YXZ';
    this.camDist = .6; this.dt = .016; this.bodyYaw = 0;
    this.momGeo = new THREE.PlaneGeometry(MOM_W, MOM_H); this.momGeo.translate(0, MOM_H / 2, 0);
    this.resize = () => this.onResize(); addEventListener('resize', this.resize); this.onResize();
    this.feed = []; this.bubbles = []; this.pings = []; this.fx = []; this.chatLog = [];
    this.shake = 0; this.hand = 0; this.resP = 0; this.resShow = 0; this.spotAnim = new Map();
    this.buildWorld();
  }
  onResize() {
    const dpr = devicePixelRatio || 1;
    const pr = this.ST.low ? .6 : isPhone ? Math.min(dpr, 1.3) : Math.min(dpr, 1.5);
    this.R.setPixelRatio(pr); this.R.setSize(innerWidth, innerHeight, false);
    this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix();
    this.dpr = Math.min(2, dpr); this.hc.width = innerWidth * this.dpr; this.hc.height = innerHeight * this.dpr;
    this.layoutHud();
  }
  // 폰 가로/세로에 따라 글자 위치 조정 (가로는 화면이 낮아서 아래로 붙임)
  layoutHud() {
    if (!isPhone || !this.hSay) return;
    const land = innerWidth > innerHeight;
    const b = land ? { say: 14, prompt: 56, feed: 96, chat: 170 } : { say: 150, prompt: 196, feed: 140, chat: 230 };
    this.hSay.style.bottom = b.say + 'px'; this.hPrompt.style.bottom = b.prompt + 'px'; this.hFeed.style.bottom = b.feed + 'px';
    const ch = this.root.querySelector('[data-chat]'); if (ch) ch.style.bottom = b.chat + 'px';
    if (this.tbar) this.tbar.style.gridTemplateColumns = land ? 'auto auto auto' : 'auto auto';
    if (this.helpBtn) this.helpBtn.style.top = land ? '50px' : '58px';
  }

  buildWorld() {
    const S_ = this.scene, W = this.W, ol = !this.ST.low, b = this.ST.bright || 1;
    const root = new THREE.Group(); this.world = root; S_.add(root);
    S_.background = new THREE.Color(0xfff4e6); S_.fog = new THREE.Fog(0xfff4e6, 14, 34);
    root.add(new THREE.HemisphereLight(0xffffff, 0xe2b47c, 1.2 * b));
    root.add(new THREE.AmbientLight(0xffffff, .25 * b));
    const sun = new THREE.DirectionalLight(0xfff2dd, .85 * b);
    sun.position.set(6, 12, 4); sun.target.position.set(12, 0, 8); root.add(sun, sun.target);
    if (this.shadows) {
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 30; sun.shadow.bias = -.0015;
    }
    const att = new THREE.PointLight(0xffd9a0, 1.6 * b, 9, 1.2); att.position.set(13, 3.6, 3); root.add(att);
    // 바닥
    const FW = HOUSE_W, FD = HOUSE_D + 3;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), new THREE.MeshLambertMaterial({ map: tex(cvs(32, 32, FLOOR1), FW, FD) }));
    fl.rotation.x = -Math.PI / 2; fl.position.set(FW / 2, 0, FD / 2); fl.receiveShadow = true; root.add(fl);
    const mat_ = new THREE.Mesh(new THREE.PlaneGeometry(.9, .6), new THREE.MeshLambertMaterial({ color: 0x7a9a5a })); mat_.rotation.x = -Math.PI / 2; mat_.position.set(11.5, .003, HOUSE.door.z + 1); root.add(mat_);
    // 벽 · 천장 · 다락방
    const w1 = new THREE.MeshLambertMaterial({ map: tex(cvs(32, 72, WALL1)) }), w2 = new THREE.MeshLambertMaterial({ map: tex(cvs(32, 72, WALL2)) });
    const woodM = new THREE.MeshLambertMaterial({ color: 0xb07a4a }), ceilM = new THREE.MeshLambertMaterial({ color: 0xfff8ee }), atFl = new THREE.MeshLambertMaterial({ map: tex(cvs(32, 32, FLOOR2)) });
    const roofM = new THREE.MeshLambertMaterial({ color: 0x4a3424 }), stepM = new THREE.MeshLambertMaterial({ color: 0xc98a55 });
    for (const bx of W.boxes) {
      if (bx.k === 'f' || bx.k === 'door') continue;
      const w = bx.x1 - bx.x0, h = bx.y1 - bx.y0, d = bx.z1 - bx.z0;
      let m;
      if (bx.k === 'wall' || bx.k === 'iwall') m = texBox(w, h, d, w1);
      else if (bx.k === 'awall') m = texBox(w, h, d, w2);
      else if (bx.k === 'slab') { m = texBox(w, h, d, [woodM, woodM, atFl, ceilM, woodM, woodM]); atFl.map.repeat.set(1, 1); }
      else if (bx.k === 'roof') m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), roofM);
      else if (bx.k === 'stair') m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stepM);
      else m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodM);
      m.position.set((bx.x0 + bx.x1) / 2, (bx.y0 + bx.y1) / 2, (bx.z0 + bx.z1) / 2);
      m.receiveShadow = true; m.castShadow = this.shadows && (bx.k === 'wall' || bx.k === 'stair');
      root.add(m);
    }
    // 다락방 들보 · 창문 · 천장 등
    const beamM = new THREE.MeshLambertMaterial({ color: 0x5e432c });
    const AT = HOUSE.attic;
    for (let x = AT.x0 + 1; x < AT.x1; x += 2) { const bm = new THREE.Mesh(new THREE.BoxGeometry(.18, .18, AT.z1 - AT.z0), beamM); bm.position.set(x, ATTIC_TOP - .1, (AT.z0 + AT.z1) / 2); root.add(bm); }
    const win = new THREE.Mesh(new THREE.PlaneGeometry(.9, .6), new THREE.MeshBasicMaterial({ color: 0xbfe6ff })); win.position.set(13.5, 3.3, 1.005); root.add(win);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a0 })); bulb.position.set(13, 3.7, 3); root.add(bulb);
    const lampM = new THREE.MeshBasicMaterial({ color: 0xfffbe8 }), lampG = new THREE.CylinderGeometry(.3, .34, .05, 16);
    for (const [x, z] of [[4, 3.5], [4, 9], [10.5, 5], [13, 8.5]]) { const l = new THREE.Mesh(lampG, lampM); l.position.set(x, WALL_H - .03, z); root.add(l); }
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), new THREE.MeshBasicMaterial({ color: 0xfffbe0 })); outside.position.set(11.5, 1.1, HOUSE.door.z + 2.45); outside.rotation.y = Math.PI; root.add(outside);
    // 가구
    const statics = []; this.liftObj = new Map();
    for (const P of W.placed) {
      const gr = buildFurn(P.t, ol); gr.position.set(P.x, P.y, P.z); gr.rotation.y = ROT[P.r];
      if (FURN[P.t].lift) { root.add(gr); this.liftObj.set(P.fi, gr); gr.userData.y0 = P.y; } else statics.push(gr);
    }
    root.add(mergeStatic(statics));
    // 숨는 곳 문짝 · 서랍
    this.spotObj = W.spots.map(s => {
      if (s.k === 'lift') return { k: 'lift', g: this.liftObj.get(s.fi) };
      const col = (FURN[s.t].parts.find(p => p[0] === 'b' && p[8]) || [])[7] || 0xd9b48a;
      const pn = buildPanel(s, col === 0xf4f7fa ? 0xe8eef4 : col, ol);
      // 문은 왼쪽 경첩: 앞면 가운데에서 가구의 +x 쪽 반대로 반 폭
      const ax = s.k === 'door' ? s.x - Math.cos(ROT[s.r]) * s.w / 2 : s.x, az = s.k === 'door' ? s.z + Math.sin(ROT[s.r]) * s.w / 2 : s.z;
      pn.position.set(ax, s.y, az); pn.rotation.y = ROT[s.r]; root.add(pn);
      return { k: s.k, g: pn, x: ax, z: az };
    });
    // 무거운 서랍 앞판 (열리면 열린 채로)
    this.heavyObj = W.heavies.map(h => {
      const pn = buildPanel({ k: 'drawer', w: h.w, h: h.h }, 0x5e432c, ol, .4); pn.position.set(h.x, h.y, h.z); pn.rotation.y = ROT[h.r]; root.add(pn); return pn;
    });
    // 문 · 쥐구멍 · 열쇠
    this.door = buildDoor(); this.door.position.set(12, 0, HOUSE.door.z + .06); this.door.rotation.y = Math.PI; root.add(this.door);
    this.holeObj = W.holes.map(pair => pair.map(h => { const o = buildHole(); o.position.set(h.x + h.dx * .006, h.y, h.z + h.dz * .006); o.rotation.y = Math.atan2(h.dx, h.dz); root.add(o); return o; }));
    this.keyObj = [0, 1, 2].map(() => { const k = buildKey(); k.scale.setScalar(1.3); root.add(k); return k; });
  }

  // 사람마다 3D 몸 (엄마 = 바닥에 수직으로 선 그림판, 쥐 = 작은 쥐)
  playerObj(p) {
    const key = p.role;
    if (p.obj && p.objKey === key) return p.obj;
    if (p.obj) this.world.remove(p.obj);
    let o;
    if (key === 'mom') {
      if (!p.lookCv) p.lookCv = lookToCanvas(p.look || defaultLook());
      const tx = new THREE.CanvasTexture(p.lookCv); tx.magFilter = THREE.NearestFilter; tx.minFilter = THREE.NearestFilter; tx.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(this.momGeo, new THREE.MeshLambertMaterial({ map: tx, alphaTest: .5, side: THREE.DoubleSide }));
      m.castShadow = true; o = new THREE.Group(); o.add(m); o.userData.plane = m; o.userData.tex = tx;
    } else o = buildMouse(p.colN, !this.ST.low);
    this.world.add(o); p.obj = o; p.objKey = key;
    return o;
  }

  init(st) {
    this.me = st.you; this.modes = st.modes || {};
    this.ph = st.ph; this.tLeft = st.t; this.tAt = performance.now(); this.need = st.needed || 1;
    this.P = new Map(); let i = 0;
    for (const id of Object.keys(st.roles)) {
      const col = MOUSE_COLS[i++ % MOUSE_COLS.length];
      this.P.set(id, { id, name: st.names[id], role: st.roles[id], bot: !!(st.bots || {})[id], x: 0, y: 0, z: 0, a: 0, fl: 0, buf: [], colN: col, col: hex(col), look: null, lookCv: null, hide: -1 });
    }
    for (const [id, v] of Object.entries(st.looks || {})) this.setLook(id, v);
    const me = this.P.get(this.me);
    this.role = me.role;
    const sm = st.me || {};
    this.body = { x: sm.x || 0, y: sm.y || 0, z: sm.z || 0, vy: 0, ground: true };
    Object.assign(me, { x: this.body.x, y: this.body.y, z: this.body.z });
    this.yaw = sm.a || 0; this.pitch = this.role === 'mom' ? -.12 : -.22; this.bodyYaw = this.yaw;
    this.myHide = sm.hide >= 0 ? sm.hide : -1;
    this.K = st.K || []; this.HO = st.HO || []; this.solo = !!st.solo; this.holeLeft = [0, 0]; this.occ = new Set(); this.hs = 0;
    this.stam = CFG.STAMINA; this.vacCd = 0; this.restT = 0; this.spec = null;
    if (this.role === 'mom') this.banner('🧹 엄마 역할이에요!', this.practice ? '집 구경하며 연습해요' : '쥐들이 열쇠 3개로 문을 열고 도망치려 해요. 막아요!', 4.5);
    else this.banner('🐭 쥐 역할이에요!', this.practice ? '열쇠 3개를 찾아 문에 꽂고 탈출해 봐요!' : '엄마가 단장하는 30초 동안 흩어져요! 열쇠 3개 → 현관문 → 탈출', 4.5);
    if (this.ph === 'prep') this.enterPrep(); else this.enterHunt(true);
    bgm(this.ph === 'prep' ? 'title' : 'game');
  }
  initPractice() {
    const role = this.popt.role === 'mom' ? 'mom' : 'mouse';
    this.sim = new Sim({ seed: Math.random() * 1e9 | 0, players: [{ id: 'me', name: '나', role }], practice: true, emit: (to, m) => { if (to === null || to === 'me') this.inbox.push(m); } });
    this.net = { send: m => this.sim && this.sim.msg('me', m) };
    this.simT = setInterval(() => this.sim.tick(), 66);
    const st = this.sim.startMsg('me'); this.inbox = [];
    this.init(st);
    if (role === 'mom') this.setLook('me', loadLook());
  }

  setLook(id, v) {
    const p = this.P.get(id); if (!p) return;
    p.look = v; p.lookCv = lookToCanvas(v || defaultLook());
    if (p.obj && p.objKey === 'mom') { const t = p.obj.userData.tex; t.image = p.lookCv; t.needsUpdate = true; }
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
    } else this.corner();
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
      this.banner(this.role === 'mom' ? '청소 시작!!' : '엄마가 왔다!!', this.role === 'mom' ? '쥐를 클릭해서 잡고, 수상한 서랍·문은 열어 봐요' : '숨거나 도망쳐요! 열쇠를 찾아 현관문으로!', 3);
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
      if (e.button === 2) this.vacuum();
    };
    this.cv.addEventListener('pointerdown', this.md);
    this.cv.addEventListener('contextmenu', e => e.preventDefault());
    this.plc = () => { if (document.pointerLockElement !== this.cv && this.alive && !this.ended && !isPhone && !this.chatOpen && !this.menuEl && !(this.editor)) this.showMenu(); };
    document.addEventListener('pointerlockchange', this.plc);
    if (isPhone) this.touchUI();
    this.hudBuild(); this.layoutHud();
  }
  lock() { if (isPhone || this.editor) return; try { const p = this.cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
  look(dx, dy) { this.yaw = (this.yaw + dx) % TAU; const fp = this.role === 'mom' && !this.isSpec(); this.pitch = clamp(this.pitch - dy, fp ? -1.45 : -1.2, fp ? 1.35 : .9); }
  onKey(e, down) {
    if (this.editor) return;
    if (this.chatOpen) return;
    const k = e.code;
    if (down && k === 'Enter' && !this.practice) { e.preventDefault(); this.openChat(); return; }
    if (k === 'Tab') { e.preventDefault(); this.cardOn = down; this.drawCard(); return; }
    this.keys[k] = down;
    if (!down) { if (k === 'KeyE') this.resHold = false; return; }
    if (k === 'Space') e.preventDefault();
    if (e.repeat) return;
    if (k === 'KeyE') this.act();
    if (k === 'KeyG') this.sign();
    if (k === 'KeyF' || k === 'KeyQ') this.vacuum();
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
      jump: mkb('🦘 점프', d => { this.tJump = d; }, true),
      act: mkb('✋ 행동', d => { if (d) this.act(); else this.resHold = false; }, true),
      sign: mkb('👋 손짓', () => this.sign()),
      vac: mkb('🌀 청소기', () => this.vacuum()),
      menu: mkb('☰', () => this.showMenu())
    };
    const help = document.createElement('button'); help.textContent = '? 설명';
    help.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);top:58px;z-index:3;font:15px Jua;padding:4px 12px;border-radius:12px;border:3px solid #4a2c1d;background:#fffaf0;color:#4a2c1d';
    help.onclick = () => { this.cardOn = !this.cardOn; this.drawCard(); }; this.root.append(help); this.helpBtn = help;
    this.layoutHud();
  }
  syncTouch() {
    if (!this.tb) return;
    const mouse = this.role === 'mouse' && !this.isSpec(), mom = this.role === 'mom';
    for (const k of ['jump', 'act', 'sign']) this.tb[k].style.display = mouse ? '' : 'none';
    this.tb.vac.style.display = mom ? '' : 'none';
    const a = this.actTarget();
    this.tb.act.textContent = a ? a.btn : '✋ 행동';
  }
  tap() { if (this.isSpec()) { this.nextSpec(1); return; } if (this.role === 'mom') this.primary(); }

  // ───────── 상태 ─────────
  myP() { return this.P.get(this.me); }
  isSpec() { const me = this.myP(); return this.role === 'mouse' && me && (me.caught || me.esc); }
  hasKey() { return this.K.some(k => k[3] === this.me); }
  keysIn() { return this.K.filter(k => k[4] === 1).length; }

  // 쥐가 E로 할 수 있는 것 (가까운 순서)
  actTarget() {
    if (this.role !== 'mouse' || this.isSpec() || this.ended) return null;
    const b = this.body;
    if (this.myHide >= 0) return { k: 'out', txt: 'E: 밖으로 나가기', btn: '🚪 나가기' };
    if (this.ph === 'hunt' && Math.hypot(b.x - CAGE[0], b.z - CAGE[1]) < CFG.RESCUE_R && b.y < .5 && [...this.P.values()].some(p => p.caught && !p.gone))
      return { k: 'res', txt: 'E 꾹: 쥐장 열어 친구 구출', btn: '🆘 꾹: 구출' };
    for (let pi = 0; pi < this.W.holes.length; pi++) for (let ei = 0; ei < 2; ei++) {
      const h = this.W.holes[pi][ei];
      if (Math.hypot(b.x - h.mx, b.z - h.mz) < .4 && Math.abs(b.y - h.y) < .3) {
        const left = this.holeLeft[pi] || 0;
        return left > 0 ? { k: 'holeX', txt: `🕸️ 먼지로 막혔어요 (${left}초)`, btn: `🕸️ ${left}초` } : { k: 'hole', p: pi, e: ei, txt: 'E: 쥐구멍으로 들어가기', btn: '🕳️ 쥐구멍' };
      }
    }
    for (let i = 0; i < this.W.heavies.length; i++) {
      const h = this.W.heavies[i];
      if (this.HO[i] || Math.hypot(b.x - h.x, b.z - h.z) > .55 || Math.abs(b.y - h.base) > .4) continue;
      return { k: 'heave', d: i, txt: this.solo ? 'E 꾹: 무거운 서랍 열기 (혼자 4초)' : 'E 꾹: 무거운 서랍 같이 열기 (쥐 2마리 필요!)', btn: '💪 꾹: 서랍' };
    }
    let best = null, bd = 1e9;
    this.W.spots.forEach((s, i) => {
      const d = Math.hypot(b.x - s.x, b.z - s.z); if (d > .48 || b.y < s.y - .4 || b.y > s.y + .22) return;
      if (d < bd) { bd = d; best = i; }
    });
    if (best !== null) {
      const s = this.W.spots[best], n = FURN[s.t].n;
      if (this.occ.has(best)) return { k: 'full', txt: `${n}: 누가 벌써 숨어 있어요`, btn: '🙅 꽉 참' };
      return { k: 'hide', s: best, txt: `E: ${n}에 숨기`, btn: '📦 숨기' };
    }
    return null;
  }
  act() {
    const a = this.actTarget(); if (!a) return;
    if (a.k === 'out') this.net.send({ type: 'hide', s: -1 });
    else if (a.k === 'res' || a.k === 'heave') this.resHold = true;
    else if (a.k === 'hole') this.net.send({ type: 'hole', p: a.p, e: a.e });
    else if (a.k === 'hide') { this.net.send({ type: 'hide', s: a.s }); S.poof(); }
    else if (a.k === 'full') this.say('거긴 누가 벌써 숨어 있어요');
    else if (a.k === 'holeX') this.say(a.txt);
  }
  sign() {
    if (this.role !== 'mouse' || this.practice || this.isSpec()) return;
    const now = performance.now(); if (now < (this.signCd || 0)) return; this.signCd = now + 2500;
    const c = this.cam.position, d = this.camDir(), t = rayWorld(this.W, c.x, c.y, c.z, d.x, d.y, d.z, 12);
    this.net.send({ type: 'sign', x: c.x + d.x * (t - .05), y: c.y + d.y * (t - .05), z: c.z + d.z * (t - .05) });
  }
  vacuum() {
    if (this.role !== 'mom' || this.ph !== 'hunt' || this.restT > 0) return;
    if (this.vacCd > 0) { this.say(`청소기는 ${this.vacCd}초 뒤에 써요`); return; }
    this.net.send({ type: 'vac' });
  }
  primary() {
    if (this.isSpec()) { this.nextSpec(1); return; }
    if (this.role !== 'mom' || this.ph !== 'hunt' || this.ended) return;
    if (this.restT > 0) { this.say('헉헉… 쉬는 중'); return; }
    const pk = this.pick; this.hand = 1; S.grab();
    if (!pk) return;
    if (!pk.near) { this.say('손이 안 닿아요. 더 가까이!'); return; }
    if (pk.k === 'p') this.net.send({ type: 'grab', id: pk.id });
    else if (pk.k === 's') this.net.send({ type: 'open', s: pk.i });
  }

  // ───────── 서버 메시지 ─────────
  onMsg(m) {
    const now = performance.now();
    switch (m.type) {
      case 'snap': {
        if (m.ph === 'hunt' && this.ph === 'prep') this.enterHunt();
        this.ph = m.ph; this.tLeft = m.t; this.tAt = now; this.need = m.need || this.need;
        for (const [id, x, y, z, a, fl] of m.P) {
          const p = this.P.get(id); if (!p) continue;
          p.fl = fl; p.hidden = !!(fl & 1); p.caught = !!(fl & 4); p.esc = !!(fl & 64);
          if (id === this.me) continue;
          if (p.hidden && this.role === 'mom') continue;
          p.buf.push([now, x, y, z, a]); if (p.buf.length > 12) p.buf.shift();
          if (p.caught || p.buf.length === 1) { p.x = x; p.y = y; p.z = z; p.a = a; }
        }
        if (m.K) this.K = m.K;
        if (m.HO) this.HO = m.HO;
        if (m.H) this.holeLeft = m.H;
        this.W.doorOpen = !!m.D;
        if (m.O) this.occ = new Set(m.O);
        this.hs = m.hs || 0;
        if (m.st !== undefined) { this.stam = m.st; this.vacCd = m.vac; this.restT = m.rest; }
        break;
      }
      case 'fix': {
        const b = this.body; b.x = m.x; b.y = m.y; b.z = m.z; b.vy = 0;
        if (m.a !== undefined) { this.yaw = m.a; this.bodyYaw = m.a; }
        if (m.out) this.myHide = -1;
        break;
      }
      case 'pull': { // 청소기에 빨려 간다
        const b = this.body, dx = m.x - b.x, dz = m.z - b.z, d = Math.hypot(dx, dz) || 1;
        for (let i = 0; i < 8; i++) moveBody(this.W, b, dx / d * m.k / 8, dz / d * m.k / 8, 0, CFG.MOUSE);
        b.vy = 2.5; this.doShake(.6); this.say('으아아 빨려 간다!!');
        break;
      }
      case 'look': this.setLook(m.id, m.v); break;
      case 'sign': this.pings.push({ x: m.x, y: m.y, z: m.z, t: 0, who: (this.P.get(m.a) || {}).name || '' }); S.ping(); break;
      case 'ev': this.onEv(m); break;
      case 'end': this.onEnd(m); break;
    }
  }
  onEv(m) {
    const p = this.P.get(m.id), nm = p ? p.name : '?', mine = m.id === this.me;
    switch (m.e) {
      case 'hunt': this.enterHunt(); break;
      case 'hide': {
        if (p) p.hide = m.s;
        if (mine) {
          this.myHide = m.s;
          if (m.s >= 0) { const s = this.W.spots[m.s]; this.yaw = Math.atan2(s.nz, s.nx); this.pitch = -.05; this.say(`쉿… ${CFG.HIDE_SQ}초 넘게 있으면 찍찍! 소리가 나요`); }
        }
        break;
      }
      case 'full': this.say('거긴 누가 벌써 숨어 있어요'); break;
      case 'hole': {
        const pair = this.W.holes[m.p], ex = pair[1 - m.from], en = pair[m.from];
        this.posSoundAt(ex.x, ex.y, ex.z, 'rustle'); this.posSoundAt(en.x, en.y, en.z, 'rustle');
        this.fx.push({ k: 'dust', x: ex.x + ex.dx * .2, y: ex.y + .1, z: ex.z + ex.dz * .2, t: 0 });
        if (mine) { S.poof(); this.say(`쥐구멍 통과! 이 구멍은 ${CFG.HOLE_BLOCK}초 동안 먼지로 막혀요`); }
        break;
      }
      case 'open': {
        this.spotAnim.set(m.s, performance.now());
        const s = this.W.spots[m.s]; this.posSoundAt(s.x, s.y, s.z, 'open');
        if (m.id === this.me && !m.hit.length) this.fx.push({ k: 'miss', x: s.x, y: s.y + s.h / 2, z: s.z, t: 0 });
        break;
      }
      case 'miss': {
        if (mine) { S.miss(); this.say('헛손질! 아무도 없었어요'); this.doShake(.25); }
        if (m.rest) { this.addFeed(`😵 ${nm} 엄마 기진맥진! 3초 쉬는 중`); if (mine) { S.tired(); this.banner('헉… 헉…', '헛손질을 너무 많이 했어요. 3초 쉬어요', 2.6); } }
        break;
      }
      case 'up': if (mine) this.say('다시 힘이 났어요!'); break;
      case 'caught': {
        const t = this.P.get(m.id), by = this.P.get(m.by);
        if (t) { t.caught = true; t.hide = -1; }
        this.addFeed(`🧹 ${josa(by ? by.name : '엄마', '가')} ${josa(t ? t.name : '?', '를')} 잡았어요! (${m.place})`);
        this.fx.push({ k: 'grab', x: m.x, y: m.y + .1, z: m.z, t: 0 });
        if (mine) { this.myHide = -1; S.caught(); this.banner('잡혔다…', '쥐장에 갇혔어요. 친구가 쥐장 앞에서 E를 꾹 누르면 탈출!', 3.5); this.spec = null; this.doShake(.6); }
        else if (m.by === this.me) { S.caught(); S.win(); this.banner('잡았다!', `${t ? t.name : ''} 쥐장으로~`, 1.6); }
        else this.posSoundAt(m.x, m.y, m.z, 'squeak');
        break;
      }
      case 'rescue': {
        S.rescue(); this.addFeed(`🆘 ${josa(nm, '가')} 친구 ${m.freed.length}마리를 구출했어요!`);
        for (const id of m.freed) { const t = this.P.get(id); if (t) { t.caught = false; t.buf = []; } }
        if (m.freed.includes(this.me)) { this.banner('탈출!!', '3초 동안 안 잡혀요. 얼른 도망쳐!', 2.5); this.spec = null; this.body.vy = 0; }
        this.resP = 0;
        break;
      }
      case 'resp': this.resP = m.v; this.resShow = 1; this.resWho = nm + ' 구출 중…'; break;
      case 'hprog': this.resP = m.v; this.resShow = 1; this.resWho = m.n < m.need ? `💪 ${m.n} / ${m.need}마리 — 친구가 같이 눌러야 열려요!` : '💪 끄응… 서랍 여는 중'; break;
      case 'hopen': {
        this.HO[m.d] = 1; const h = this.W.heavies[m.d]; S.tired(); this.posSoundAt(h.x, h.y, h.z, 'open');
        if (this.role === 'mouse') { this.addFeed(m.key ? '🗄️ 끼이익! 서랍에서 열쇠가 나왔어요!' : '🗄️ 끼이익… 서랍은 텅 비어 있었어요'); if (m.id === this.me || Math.hypot(this.body.x - h.x, this.body.z - h.z) < 1.5) this.banner(m.key ? '🔑 열쇠 발견!' : '꽝…', m.key ? '얼른 주워서 현관문으로!' : '다른 무거운 서랍을 찾아봐요', 2); }
        else this.addFeed(`🗄️ 끼이익… ${placeName(h.x, h.y, h.z)}에서 서랍 여는 소리!`);
        this.resP = 0; this.resShow = 0;
        break;
      }
      case 'sq': {
        this.bubbles.push({ x: m.x, y: m.y, z: m.z, t: 0 }); this.posSoundAt(m.x, m.y, m.z, 'squeak');
        if (mine) this.say(`찍찍! (숨은 지 ${CFG.HIDE_SQ}초가 넘어서 소리가 나요)`);
        break;
      }
      case 'vac': {
        this.fx.push({ k: 'vac', x: m.x, y: m.y + .3, z: m.z, t: 0 });
        const c = this.cam.position, d = Math.hypot(m.x - c.x, m.z - c.z);
        S.vacuum(clamp(1.2 - d / 10, .15, 1)); this.doShake(mine ? .4 : clamp(.6 - d / 10, 0, .5));
        if (mine) this.say(m.hit.length ? `청소기로 ${m.hit.length}마리 휘청!` : '청소기… 아무도 없네');
        break;
      }
      case 'key': {
        if (m.act === 'get') { if (mine) { S.ping(); this.banner('🔑 열쇠 획득!', '현관문으로 가져가요 (들고 있으면 조금 느려요)', 2.2); } else if (this.role === 'mouse') this.addFeed(`🔑 ${josa(nm, '가')} 열쇠를 주웠어요!`); else this.addFeed('🔑 어딘가에서 열쇠가 사라졌어요…'); }
        else if (m.act === 'in') { S.bell(); this.addFeed(`🔑 철컥! 현관문 열쇠 ${m.n} / ${CFG.KEYS}`); this.posSoundAt(HOUSE.door.plate[0], .2, HOUSE.door.plate[1], 'open'); if (mine) this.banner(`철컥! ${m.n} / ${CFG.KEYS}`, m.n < CFG.KEYS ? '남은 열쇠도 찾아요!' : '', 1.8); }
        else if (m.act === 'drop') { if (mine) this.say('열쇠를 떨어뜨렸어요!'); }
        break;
      }
      case 'door': S.win(); this.banner('🚪 문이 열렸다!!', this.role === 'mom' ? '쥐들이 나가기 전에 잡아요!' : '얼른 밖으로 탈출!', 3); this.doShake(.4); break;
      case 'esc': {
        if (p) p.esc = true;
        this.addFeed(`🚪 ${josa(nm, '가')} 탈출했어요! (${m.n} / ${m.need})`);
        if (mine) { S.rescue(); this.banner('탈출 성공!!', `친구들을 응원해요 (${m.n} / ${m.need})`, 3); this.spec = null; }
        break;
      }
      case 'newmom': {
        const o = this.P.get(m.old); if (o) o.gone = true;
        if (p) { p.role = 'mom'; p.caught = false; p.hide = -1; this.setLook(m.id, p.look); }
        this.addFeed(`👩 엄마 역할이 나가서 ${josa(nm, '가')} 엄마 역할을 이어받았어요!`);
        if (mine) { this.role = 'mom'; this.myHide = -1; this.pitch = -.12; this.spec = null; this.banner('엄마 역할을 이어받았어요!', '쥐들이 못 나가게 막아요!', 3); }
        break;
      }
    }
  }
  onChat(m) { if (!this.chatBox) return; this.chatLog.push({ t: performance.now(), m }); this.drawChat(); }
  onLobby() {}

  // ───────── 소리 위치 ─────────
  posSoundAt(x, y, z, kind) {
    const c = this.cam.position, dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, (y - c.y) * 1.5, dz);
    const v = clamp(1.15 - d / 12, 0, 1), pan = clamp(Math.sin(angDiff(Math.atan2(dz, dx), this.yaw)), -1, 1) * .8;
    if (kind === 'squeak') S.squeak(v, pan); else if (kind === 'step') S.slipper(v * .8, pan); else if (kind === 'open') S.boing(v * .5, pan); else if (kind === 'rustle') S.slipper(v * .5, pan);
  }

  // ───────── 상태 보내기 ─────────
  sendState() {
    if (!this.net || this.ended || !this.body) return;
    const me = this.myP(); if (!me || me.caught || me.esc || this.myHide >= 0) return;
    const b = this.body;
    const s = [Math.round(b.x * 100), Math.round(b.y * 100), Math.round(b.z * 100), Math.round(this.bodyYaw * 100), this.moving ? 1 : 0].join();
    const now = performance.now();
    if (s !== this.lastSent || now - (this.lastSentT || 0) > 500) {
      this.lastSent = s; this.lastSentT = now;
      this.net.send({ type: 'st', x: b.x, y: b.y, z: b.z, a: this.bodyYaw, mv: this.moving ? 1 : 0 });
    }
    if (this.resHold) { const a = this.actTarget(); if (a && a.k === 'res') this.net.send({ type: 'res' }); else if (a && a.k === 'heave') this.net.send({ type: 'heave', d: a.d }); }
  }

  // ───────── 프레임 ─────────
  frame(t) {
    if (!this.alive) return;
    const dt = Math.min(.05, (t - this.last) / 1000); this.last = t;
    while (this.inbox.length) this.onMsg(this.inbox.shift());
    this.update(dt, t);
    this.draw(t);
    this.raf = requestAnimationFrame(tt => this.frame(tt));
  }
  update(dt, t) {
    this.dt = dt;
    this.bodyYaw = this.yaw;
    const me = this.myP(); if (!me) return;
    const b = this.body, P = this.role === 'mom' ? CFG.MOM : CFG.MOUSE;
    this.moving = false;
    const frozen = me.caught || me.esc || this.myHide >= 0;
    if (!frozen && !this.ended) {
      const canMove = !this.editor && !this.chatOpen && !(this.role === 'mom' && (this.ph === 'prep' || this.restT > 0));
      let dx = 0, dz = 0;
      if (canMove) {
        let f = 0, s = 0;
        if (this.keys.KeyW || this.keys.ArrowUp) f++; if (this.keys.KeyS || this.keys.ArrowDown) f--;
        if (this.keys.KeyD) s++; if (this.keys.KeyA) s--;
        if (this.keys.ArrowLeft) this.yaw -= 2.4 * dt; if (this.keys.ArrowRight) this.yaw += 2.4 * dt;
        if (this.tmove) { f = -this.tmove[1]; s = this.tmove[0]; }
        const l = Math.hypot(f, s);
        if (l > .1) {
          if (l > 1) { f /= l; s /= l; }
          const sp = (this.role === 'mom' ? CFG.SPEED.mom : this.hasKey() ? CFG.SPEED.mouseKey : CFG.SPEED.mouse) * dt, c = Math.cos(this.yaw), sn = Math.sin(this.yaw);
          dx = (c * f - sn * s) * sp; dz = (sn * f + c * s) * sp; this.moving = true;
        }
        if (this.role === 'mouse' && (this.keys.Space || this.tJump) && b.ground) { b.vy = JUMP_V; b.ground = false; S.tick(); }
      }
      const ox = b.x, oz = b.z;
      moveBody(this.W, b, dx, dz, dt, P);
      if (Math.hypot(b.x - ox, b.z - oz) < 1e-4) this.moving = this.moving && !b.ground ? true : false;
      if (b.y < -2) { b.x = HOUSE.mouseSpawn[0]; b.z = HOUSE.mouseSpawn[1]; b.y = 0; b.vy = 0; }
      if (this.role === 'mom' && this.moving) { me.stepT = (me.stepT || 0) - dt; if (me.stepT <= 0) { me.stepT = .42; S.slipper(.3, 0); } }
      me.x = b.x; me.y = b.y; me.z = b.z; me.a = this.bodyYaw;
    }
    // 다른 사람 보간 + 엄마 발소리
    const rt = t - 120;
    for (const p of this.P.values()) {
      if (p.id === this.me || p.buf.length === 0 || p.caught) continue;
      const B_ = p.buf; let i = B_.length - 1; while (i > 0 && B_[i - 1][0] > rt) i--;
      const B = B_[i], A = B_[Math.max(0, i - 1)];
      const k = B[0] === A[0] ? 1 : clamp((rt - A[0]) / (B[0] - A[0]), 0, 1);
      const ox = p.x, oz = p.z;
      p.x = A[1] + (B[1] - A[1]) * k; p.y = A[2] + (B[2] - A[2]) * k; p.z = A[3] + (B[3] - A[3]) * k; p.a = A[4] + angDiff(B[4], A[4]) * k;
      if (p.role === 'mom' && !p.gone && Math.hypot(p.x - ox, p.z - oz) > .01) { p.stepT = (p.stepT || 0) - dt; if (p.stepT <= 0) { p.stepT = .42; this.posSoundAt(p.x, p.y, p.z, 'step'); } }
    }
    for (const a of [this.bubbles, this.pings, this.fx]) for (const x of a) x.t += dt;
    this.bubbles = this.bubbles.filter(x => x.t < 1.4); this.pings = this.pings.filter(x => x.t < 4); this.fx = this.fx.filter(x => x.t < 1.2);
    this.shake = Math.max(0, this.shake - dt * 1.6); this.hand = Math.max(0, this.hand - dt * 4);
    this.resShow = Math.max(0, this.resShow - dt * 1.5);
    if (this.isSpec()) this.pickSpec();
    const left = this.timeLeft();
    if (this.ph === 'hunt' && !this.ended) { if (left <= 30 && !this.hurry) { this.hurry = true; bgm('hurry'); this.banner('30초 남았다!', '', 1.6); } if (left <= 10 && Math.ceil(left) !== this.lastTick) { this.lastTick = Math.ceil(left); S.tick(); } }
    this.syncTouch();
  }
  timeLeft() { return Math.max(0, this.tLeft - (performance.now() - this.tAt) / 1000); }
  doShake(v) { if (!this.ST.noShake) this.shake = Math.max(this.shake, v); }

  // 관전 대상 (잡히거나 탈출한 쥐)
  specPool() {
    const free = [...this.P.values()].filter(p => p.role === 'mouse' && !p.caught && !p.esc && !p.gone && !p.hidden);
    return free.length ? free : [...this.P.values()].filter(p => p.role === 'mom' && !p.gone);
  }
  pickSpec() { const pool = this.specPool(); if (!pool.find(p => p.id === this.spec)) this.spec = pool.length ? pool[0].id : null; }
  nextSpec(d) { const pool = this.specPool(); if (!pool.length) return; const i = pool.findIndex(p => p.id === this.spec); this.spec = pool[(i + d + pool.length) % pool.length].id; }

  // 카메라: 엄마 = 1인칭, 쥐 = 바닥에 붙은 낮은 3인칭
  camDir() { const cp = Math.cos(this.pitch); return { x: cp * Math.cos(this.yaw), y: Math.sin(this.pitch), z: cp * Math.sin(this.yaw) }; }
  placeCamera() {
    const cam = this.cam, f = this.camDir();
    let tgt = null;
    if (this.isSpec()) tgt = this.P.get(this.spec);
    if (!tgt && this.role === 'mom') { cam.position.set(this.body.x, this.body.y + EYE, this.body.z); cam.near = .04; }
    else if (!tgt && this.myHide >= 0) { // 숨는 곳 안: 문틈으로 밖을 본다
      const s = this.W.spots[this.myHide]; cam.position.set(s.x + s.nx * .07, s.y + .07, s.z + s.nz * .07); cam.near = .01;
    } else {
      const T = tgt || { x: this.body.x, y: this.body.y, z: this.body.z, role: 'mouse' };
      if (T.role === 'mom') cam.position.set(T.x - f.x * 1.2, T.y + EYE + .2, T.z - f.z * 1.2);
      else {
        const ty = T.y + .07, want = .62;
        const hit = rayWorld(this.W, T.x, ty, T.z, -f.x, -f.y, -f.z, want + .05);
        const d = clamp(hit - .05, .1, want);
        this.camDist = d < this.camDist ? d : this.camDist + (d - this.camDist) * Math.min(1, this.dt * 4);
        const D = this.camDist;
        // 올려다볼 때는 바닥을 따라 미끄러지게 (바닥 밑으로 안 내려감)
        cam.position.set(T.x - f.x * D, Math.max(T.y + .025, ty - f.y * D), T.z - f.z * D);
      }
      cam.near = .008;
    }
    cam.updateProjectionMatrix();
    cam.rotation.set(this.pitch, -this.yaw - Math.PI / 2, 0);
    if (this.shake > 0) { const k = this.shake * (this.role === 'mom' ? .025 : .012); cam.position.x += (Math.random() - .5) * k; cam.position.y += (Math.random() - .5) * k; }
  }

  // ───────── 그리기 ─────────
  draw(t) {
    if (!this.world || !this.P) return;
    const tt = t / 1000, now = performance.now();
    this.placeCamera();
    const cx = this.cam.position.x, cz = this.cam.position.z;
    // 사람들
    const caught = [...this.P.values()].filter(p => p.caught && !p.gone && p.role === 'mouse');
    for (const p of this.P.values()) {
      const o = this.playerObj(p), self = p.id === this.me;
      let vis = !p.gone && !p.esc && !(p.hidden || (self && this.myHide >= 0));
      if (self && this.role === 'mom' && !this.isSpec()) vis = false;
      if (self && this.role === 'mouse' && this.camDist < .12) vis = false;
      if (vis && (p.fl & 8) && Math.sin(tt * 20) < 0) vis = false;
      o.visible = vis; if (!vis) continue;
      if (p.role === 'mom') {
        const mv = self ? this.moving : !!(p.fl & 2);
        o.position.set(p.x, p.y + (mv ? Math.abs(Math.sin(tt * 8)) * .05 : 0), p.z);
        o.rotation.set(0, Math.atan2(cx - p.x, cz - p.z), 0); // 좌우로만 돌아 나를 본다 (항상 바닥에 수직)
        o.userData.plane.material.color.setHex((p.fl & 16) ? 0x9fb4ff : 0xffffff);
      } else {
        if (p.caught) { const i = caught.indexOf(p); o.position.set(CAGE[0] - .18 + (i % 4) * .12, .03, CAGE[1] - .08 + (i >> 2) * .14); o.rotation.set(0, i * 1.3, 0); }
        else {
          const mv = self ? this.moving : !!(p.fl & 2), a = self ? this.bodyYaw : p.a;
          o.position.set(p.x, p.y + (mv ? Math.abs(Math.sin(tt * 18)) * .012 : 0), p.z);
          o.rotation.set(0, Math.PI / 2 - a, 0);
        }
        o.userData.tail.rotation.y = Math.sin(tt * 6 + p.x * 3) * .5;
        o.userData.key.visible = !p.caught && this.K.some(k => k[3] === p.id);
      }
    }
    // 열쇠
    this.K.forEach((k, i) => {
      const o = this.keyObj[i]; if (!o) return;
      o.visible = k[4] === 0 && !k[3];
      if (o.visible) { o.position.set(k[0], k[1] + .06 + Math.sin(tt * 3 + i) * .015, k[2]); o.rotation.set(0, tt * 1.5 + i, .3); }
    });
    // 문
    const n = this.keysIn(), slots = this.door.userData.panel.userData.slots;
    for (let i = 0; i < 3; i++) slots[i * 2 + 1].visible = i < n;
    const dp = this.door.userData.panel; dp.rotation.y += ((this.W.doorOpen ? -1.75 : 0) - dp.rotation.y) * Math.min(1, this.dt * 3);
    // 무거운 서랍 (열렸으면 쭉 빠져 있음)
    this.heavyObj.forEach((o, i) => { const h = this.W.heavies[i], k = this.HO[i] ? .34 : 0; o.position.set(h.x + h.nx * k, h.y, h.z + h.nz * k); });
    // 쥐구멍 먼지
    this.holeObj.forEach((pair, pi) => pair.forEach(o => { o.userData.dust.visible = (this.holeLeft[pi] || 0) > 0; }));
    // 숨는 곳 열기 애니메이션
    for (const [si, t0] of this.spotAnim) {
      const e = (now - t0) / 1000, so = this.spotObj[si]; if (!so || !so.g) { this.spotAnim.delete(si); continue; }
      const k = e < .2 ? e / .2 : e < 1.1 ? 1 : e < 1.4 ? 1 - (e - 1.1) / .3 : 0;
      const s = this.W.spots[si];
      if (so.k === 'lift') { so.g.position.y = so.g.userData.y0 + k * .5; so.g.rotation.z = k * .25; }
      else if (so.k === 'drawer') so.g.position.set(so.x + s.nx * k * .26, s.y, so.z + s.nz * k * .26);
      else so.g.rotation.y = ROT[s.r] - k * 1.5;
      if (e >= 1.4) this.spotAnim.delete(si);
    }
    this.R.render(this.scene, this.cam);
    this.doPick();
    this.drawHUD(t);
  }
  // 엄마가 화면 가운데로 보고 있는 것 (쥐 또는 숨는 곳)
  doPick() {
    this.pick = null;
    if (this.role !== 'mom' || this.isSpec()) return;
    const c = this.cam.position, d = this.camDir(), max = 4;
    const wall = rayWorld(this.W, c.x, c.y, c.z, d.x, d.y, d.z, max);
    let best = null;
    for (const p of this.P.values()) {
      if (p.role !== 'mouse' || p.caught || p.esc || p.gone || p.hidden || !p.obj || !p.obj.visible) continue;
      const ox = p.x - c.x, oy = p.y + .05 - c.y, oz = p.z - c.z, tc = ox * d.x + oy * d.y + oz * d.z; if (tc < 0) continue;
      const dd = Math.hypot(ox - d.x * tc, oy - d.y * tc, oz - d.z * tc), R = .16;
      if (dd > R) continue;
      const tt = tc - Math.sqrt(R * R - dd * dd);
      if (tt < wall + .1 && (!best || tt < best.t)) best = { k: 'p', id: p.id, t: tt, near: Math.hypot(ox, oy, oz) <= CFG.GRAB_REACH };
    }
    if (!best) this.W.spots.forEach((s, i) => {
      const tx = Math.abs(s.nx) > .5 ? .08 : s.w / 2, tz = Math.abs(s.nz) > .5 ? .08 : s.w / 2;
      const deep = s.k === 'lift' ? .25 : 0;
      const bx = { x0: s.x - tx - Math.abs(s.nx) * deep, x1: s.x + tx, y0: s.y, y1: s.y + s.h, z0: s.z - tz - Math.abs(s.nz) * deep, z1: s.z + tz };
      if (s.nx < 0) { bx.x1 = s.x + tx + deep; bx.x0 = s.x - tx; } if (s.nz < 0) { bx.z1 = s.z + tz + deep; bx.z0 = s.z - tz; }
      const tt = rayBox(c.x, c.y, c.z, d.x, d.y, d.z, bx, max); if (tt === Infinity || tt > wall + .12) return;
      if (!best || tt < best.t) best = { k: 's', i, t: tt, near: Math.hypot(s.x - c.x, s.y + s.h / 2 - c.y, s.z - c.z) <= CFG.OPEN_REACH };
    });
    this.pick = best;
  }

  // 월드 좌표 → HUD 캔버스 좌표
  proj(x, y, z) {
    const v = this.v3 || (this.v3 = new THREE.Vector3());
    v.set(x, y, z);
    const d = v.distanceTo(this.cam.position);
    v.project(this.cam); if (v.z > 1 || v.z < -1) return null;
    return [(v.x + 1) / 2 * this.hc.width, (1 - v.y) / 2 * this.hc.height, d];
  }
  seen(x, y, z) { const c = this.cam.position; return !blocked(this.W, c.x, c.y, c.z, x, y, z); }

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
<div data-card style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#fffaf0;border:3px solid #4a2c1d;border-radius:18px;padding:16px 20px;color:#4a2c1d;max-width:92vw;width:460px;display:none;font-size:16px;line-height:1.6;pointer-events:auto"></div>
<div data-chat style="position:absolute;left:12px;bottom:${isPhone ? 230 : 140}px;display:flex;flex-direction:column;gap:3px;max-width:50vw;font-size:15px"></div>`);
    const q = s => ui.querySelector(`[data-${s}]`);
    this.hTop = q('top'); this.hRole = q('role'); this.hCnt = q('cnt'); this.hSay = q('say'); this.hPrompt = q('prompt'); this.hFeed = q('feed'); this.hBan = q('ban'); this.hCard = q('card'); this.chatBox = q('chat');
    if (isPhone) this.hCard.onclick = () => { this.cardOn = false; this.drawCard(); };
  }
  say(t) { if (!this.hSay) return; this.hSay.textContent = t; this.hSay.style.display = 'block'; clearTimeout(this.sayT); this.sayT = setTimeout(() => this.hSay.style.display = 'none', 2400); }
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
    const mom = this.role === 'mom', nd = this.need || 1;
    c.innerHTML = mom
      ? `<div style="font-size:26px">🧹 내 역할: <b style="color:#ff6fa5">엄마</b></div>
<div>· 쥐를 <b>클릭</b>해서 잡아요 (몸을 숙여야 하니 가까이!)</div>
<div>· 서랍·찬장·상자를 <b>클릭</b>하면 열어 봐요. 비어 있으면 <b>헛손질</b> → 스펀지가 줄어요</div>
<div>· <b>${isPhone ? '🌀 버튼' : '우클릭 (또는 F)'} 청소기</b>: 1분에 한 번, 주변 쥐가 휘청 + 숨은 쥐가 튀어나와요</div>
<div>· 숨은 쥐는 ${CFG.HIDE_SQ}초가 지나면 <b>찍찍!</b> 소리를 내요. 귀를 기울여요</div>
<div>· <b>끼이익</b> 소리 = 쥐들이 무거운 서랍을 열었다는 뜻! 열쇠가 나왔을지도</div>
<div>· 잡힌 쥐는 <b>쥐장</b>에 갇혀요. 다른 쥐가 풀어 줄 수 있으니 지켜요</div>
<div style="margin-top:6px">🏆 쥐가 열쇠 ${CFG.KEYS}개로 현관문을 열고 <b>${nd}마리 이상</b> 나가면 쥐 승리, 아니면 엄마 승리!</div>`
      : `<div style="font-size:26px">🐭 내 역할: <b style="color:#3b8fd6">쥐</b></div>
<div>· 집 안의 <b>열쇠 ${CFG.KEYS}개</b>를 찾아 <b>현관문 아래 열쇠판</b>에 가져가요 (하나는 늘 <b>다락방</b> 높은 곳에!)</div>
${this.solo ? '' : '<div>· 나머지 열쇠는 <b>💪 무거운 서랍</b> 속! 쥐 <b>2마리가 같이 E 꾹</b> 2초면 열려요 (6개 중 2개만 열쇠)</div>'}
<div>· <b>Space</b>: 점프 — 의자·식탁·선반을 밟고 높은 데로 올라가요</div>
<div>· <b>E</b>: 서랍·찬장·상자에 숨기 / 나가기. 숨은 지 ${CFG.HIDE_SQ}초가 지나면 찍찍!</div>
<div>· <b>E</b>: 쥐구멍 (한 번 쓰면 ${CFG.HOLE_BLOCK}초 동안 먼지로 막혀요)</div>
<div>· 잡힌 친구는 <b>쥐장</b> 앞에서 <b>E를 3초 꾹</b> 누르면 전부 구출!</div>
<div>· <b>G</b>: 여기 봐! 손짓 · <b>Enter</b>: 쥐끼리 채팅</div>
<div style="margin-top:6px">🏆 문이 열린 뒤 <b>${nd}마리 이상</b> 밖으로 나가면 쥐 승리!</div>`;
  }
  openChat() {
    if (this.chatOpen) return; this.chatOpen = true; this.keys = {};
    if (document.pointerLockElement) document.exitPointerLock();
    const f = document.createElement('form'); f.style.cssText = 'position:absolute;left:12px;bottom:12px;pointer-events:auto;display:flex;gap:6px;z-index:6';
    f.innerHTML = `<input maxlength="120" placeholder="${this.role === 'mom' ? '엄마끼리' : '쥐끼리'} 채팅 (Enter)" style="font:16px Jua;border:3px solid #4a2c1d;border-radius:10px;padding:6px 10px;width:min(360px,70vw)">`;
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
<button class="btn pk" data-a="go">계속하기</button>${isPhone && (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen) ? '<button class="btn" data-a="full">⛶ 전체화면 켜기/끄기</button>' : ''}<button class="btn" data-a="set">⚙️ 설정</button><button class="btn" data-a="quit">${this.practice ? '그만하기' : '나가기'}</button></div>`;
    this.root.append(m); this.menuEl = m;
    const close = () => { m.remove(); this.menuEl = null; };
    m.querySelector('[data-a=go]').onclick = () => { close(); this.lock(); };
    const fb = m.querySelector('[data-a=full]'); if (fb) fb.onclick = () => { window.__mcFull && window.__mcFull(); close(); };
    m.querySelector('[data-a=set]').onclick = () => { window.__mcOpenSettings && window.__mcOpenSettings(); };
    m.querySelector('[data-a=quit]').onclick = () => { if (this.practice || confirm('정말 나갈까요? 게임 중에 나가면 다시 못 들어와요.')) { close(); this.onQuit(); } };
  }

  drawHUD(t) {
    const g = this.g, CW = this.hc.width, CH = this.hc.height, sc = Math.min(CW, CH) / 600 / this.dpr, D = this.dpr;
    g.clearRect(0, 0, CW, CH);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const txt = (s, x, y, size, fill, stroke = '#4a2c1d') => { g.font = `${Math.round(size * sc * D)}px Jua`; g.lineWidth = size * sc * D / 5; g.strokeStyle = stroke; g.strokeText(s, x, y); g.fillStyle = fill; g.fillText(s, x, y); };
    // 이름표 (쥐끼리만)
    if (this.role === 'mouse' || this.ended) for (const p of this.P.values()) {
      if (p.id === this.me || p.caught || p.gone || p.esc || p.hidden || p.role !== 'mouse') continue;
      const s = this.proj(p.x, p.y + .2, p.z); if (!s || s[2] > 8 || !this.seen(p.x, p.y + .1, p.z)) continue;
      g.font = `${Math.round(13 * sc * D)}px Jua`; g.fillStyle = 'rgba(0,0,0,.5)'; const w = g.measureText(p.name).width + 10 * sc;
      g.fillRect(s[0] - w / 2, s[1] - 10 * sc, w, 20 * sc); g.fillStyle = '#fff'; g.fillText(p.name, s[0], s[1]);
    }
    // 열쇠 반짝 (보이는 것만)
    if (!this.ended) this.K.forEach(k => {
      if (k[4] || k[3]) return;
      const s = this.proj(k[0], k[1] + .2, k[2]); if (!s || s[2] > (this.role === 'mouse' ? 7 : 5) || !this.seen(k[0], k[1] + .1, k[2])) return;
      g.globalAlpha = .6 + Math.sin(t / 150) * .4; txt('✨', s[0], s[1] - Math.abs(Math.sin(t / 300)) * 6 * sc * D, clamp(22 / s[2], 12, 28), '#ffd34d', 'rgba(0,0,0,0)'); g.globalAlpha = 1;
    });
    // 무거운 서랍 표시 (쥐에게만)
    if (this.role === 'mouse' && !this.ended) this.W.heavies.forEach((h, i) => {
      if (this.HO[i]) return;
      const s = this.proj(h.x, h.y + .75, h.z); if (!s || s[2] > 9 || !this.seen(h.x + h.nx * .1, h.y + .4, h.z + h.nz * .1)) return;
      txt('💪', s[0], s[1], clamp(26 / s[2], 12, 30), '#fff', 'rgba(0,0,0,0)');
    });
    // 찍찍 말풍선
    for (const b of this.bubbles) {
      if (!this.seen(b.x, b.y + .2, b.z) && Math.hypot(b.x - this.cam.position.x, b.z - this.cam.position.z) > 3) continue;
      const s = this.proj(b.x, b.y + .3 + b.t * .25, b.z); if (!s) continue;
      g.globalAlpha = 1 - b.t / 1.4; txt('찍찍!', s[0], s[1], clamp(30 / s[2], 13, 42), '#ffd34d'); g.globalAlpha = 1;
    }
    for (const p of this.pings) {
      const s = this.proj(p.x, p.y + .15, p.z); g.globalAlpha = p.t < 3 ? 1 : 4 - p.t;
      if (s) { const r = (10 + Math.sin(p.t * 8) * 3) * sc * D; g.fillStyle = '#5fd0b5'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(s[0], s[1], r, 0, TAU); g.fill(); g.stroke(); g.font = `${Math.round(13 * sc * D)}px Jua`; g.fillStyle = '#fff'; g.fillText(`👋 ${p.who} ${s[2].toFixed(0)}m`, s[0], s[1] - r - 10 * sc); }
      else { const ang = angDiff(Math.atan2(p.z - this.cam.position.z, p.x - this.cam.position.x), this.yaw); g.font = `${Math.round(22 * sc * D)}px Jua`; g.fillText(ang > 0 ? '👉' : '👈', CW / 2 + Math.sign(ang) * CW * .44, CH * .5); }
      g.globalAlpha = 1;
    }
    for (const e of this.fx) {
      const s = this.proj(e.x, e.y, e.z); if (!s) continue;
      g.globalAlpha = 1 - e.t / 1.2;
      if (e.k === 'vac') { g.strokeStyle = '#7cc4ff'; g.lineWidth = 4 * sc; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(s[0], s[1], ((e.t * 3 + i * .35) % 1.2) * 260 / s[2] * sc, 0, TAU); g.stroke(); } }
      else txt(e.k === 'grab' ? '잡았다!' : e.k === 'dust' ? '💨' : '텅~', s[0], s[1] - e.t * 40, 28, e.k === 'grab' ? '#ff6fa5' : '#fff');
      g.globalAlpha = 1;
    }
    // 쥐장 위 숫자
    const nC = [...this.P.values()].filter(p => p.caught && !p.gone).length;
    if (nC && this.seen(CAGE[0], .6, CAGE[1])) { const s = this.proj(CAGE[0], .7, CAGE[1]); if (s) txt(`🐭 ×${nC} 갇힘`, s[0], s[1], 16, '#fff'); }
    // 할 수 있는 것
    let prompt = '';
    if (this.role === 'mouse' && !this.isSpec() && !this.ended) { const a = this.actTarget(); if (a) prompt = isPhone ? a.txt.replace(/^E( 꾹)?:/, a.btn.split(' ')[0]) : a.txt; }
    if (this.resShow > 0 && this.resP > 0) {
      const w = 260 * sc * D, x = CW / 2 - w / 2, y = CH * .66;
      g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x, y, w, 16 * sc * D); g.fillStyle = '#5fd0b5'; g.fillRect(x, y, w * clamp(this.resP, 0, 1), 16 * sc * D);
      g.font = `${Math.round(14 * sc * D)}px Jua`; g.fillStyle = '#fff'; g.fillText(this.resWho || '', CW / 2, y - 12 * sc);
    }
    // 숨는 곳 안: 문틈 느낌
    if (this.myHide >= 0 && !this.isSpec()) {
      g.fillStyle = 'rgba(20,12,6,.88)'; g.fillRect(0, 0, CW, CH * .3); g.fillRect(0, CH * .7, CW, CH * .3);
      g.fillStyle = 'rgba(20,12,6,.5)'; g.fillRect(0, CH * .3, CW * .12, CH * .4); g.fillRect(CW * .88, CH * .3, CW * .12, CH * .4);
      const left = CFG.HIDE_SQ - this.hs;
      txt(left > 0 ? `🤫 숨는 중… ${left}초 뒤 찍찍!` : '🐭 찍찍! 들켰을지도…', CW / 2, CH * .2, 22, left > 0 ? '#fff' : '#ffd34d');
    }
    // 엄마 조준점 + 손
    if (this.role === 'mom' && !this.ended && this.ph === 'hunt') {
      const pk = this.pick, near = pk && pk.near;
      const r = 7 * sc * D; g.strokeStyle = near ? '#ff6fa5' : '#fff'; g.lineWidth = 3 * D;
      g.beginPath(); g.arc(CW / 2, CH / 2, near ? r * 1.6 : r, 0, TAU); g.stroke();
      g.fillStyle = '#4a2c1d'; g.fillRect(CW / 2 - 1.5 * D, CH / 2 - 1.5 * D, 3 * D, 3 * D);
      if (pk) prompt = pk.k === 'p' ? (near ? '🐭 클릭: 잡기!' : '🐭 손이 안 닿아요') : (near ? `🖐 클릭: ${FURN[this.W.spots[pk.i].t].n} 열어 보기` : '');
      const hy = CH - (90 + this.hand * 120) * sc * D, hx = CW * .68 - this.hand * 80 * sc;
      g.fillStyle = '#ffd34d'; g.strokeStyle = '#4a2c1d'; g.lineWidth = 4 * D;
      g.beginPath(); g.ellipse(hx, hy + 60 * sc * D, 52 * sc * D, 70 * sc * D, -.3, 0, TAU); g.fill(); g.stroke();
      for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(hx - 36 * sc * D + i * 22 * sc * D, hy - 4 * sc * D, 10 * sc * D, 24 * sc * D, -.2, 0, TAU); g.fill(); g.stroke(); }
      if (this.restT > 0) { g.fillStyle = 'rgba(80,120,200,.25)'; g.fillRect(0, 0, CW, CH); }
    }
    if (this.role === 'mom' && this.ph === 'prep' && !this.editor && !this.practice) {
      g.fillStyle = '#000'; g.fillRect(0, 0, CW, CH); g.fillStyle = '#fff'; g.font = `${Math.round(28 * sc * D)}px Jua`;
      g.fillText(`눈 감고 숫자 세는 중… ${Math.ceil(this.timeLeft())}`, CW / 2, CH / 2);
    }
    if (this.isSpec()) {
      const s = this.P.get(this.spec), me = this.myP();
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, CH - 44 * sc * D, CW, 44 * sc * D);
      g.font = `${Math.round(17 * sc * D)}px Jua`; g.fillStyle = '#fff';
      g.fillText(`${me.esc ? '🚪 탈출함' : '🔒 쥐장 안'} · 구경 중: ${s ? s.name : '-'}  (${isPhone ? '화면 탭' : '클릭 / ← →'}: 다른 쥐)`, CW / 2, CH - 22 * sc * D);
    }
    if (this.hPrompt.textContent !== prompt) this.hPrompt.textContent = prompt;
    this.hudText();
  }
  hudText() {
    const now = performance.now(); if (now - (this.hudT || 0) < 120) return; this.hudT = now;
    const left = this.timeLeft(), mm = Math.floor(left / 60), ss = Math.floor(left % 60), n = this.keysIn();
    const lbl = this.practice ? (this.role === 'mom' ? '🧹 엄마 연습' : '🐭 쥐 연습') : this.ph === 'prep' ? '💄 엄마 단장 중' : '🧹 대청소 중';
    const red = left <= 30 && this.ph === 'hunt';
    const top = `<span style="background:${red ? '#ff5a5a' : '#fffaf0'};color:${red ? '#fff' : '#4a2c1d'};border:3px solid #4a2c1d;border-radius:14px;padding:4px 14px;font-size:24px">${lbl} ${mm}:${String(ss).padStart(2, '0')}</span>
<span style="background:#fffaf0;color:#4a2c1d;border:3px solid #4a2c1d;border-radius:14px;padding:4px 10px;font-size:18px">🚪 ${'🔑'.repeat(n)}${'<span style="opacity:.3">🔑</span>'.repeat(CFG.KEYS - n)}${this.W.doorOpen ? ' 열림!' : ''}</span>`;
    if (this._top !== top) { this._top = top; this.hTop.innerHTML = top; }
    const me = this.myP(); let role;
    if (this.role === 'mom') {
      const sp = '🧽'.repeat(this.stam) + '<span style="opacity:.25">' + '🧽'.repeat(Math.max(0, CFG.STAMINA - this.stam)) + '</span>';
      role = `<div style="font-size:19px">🧹 엄마</div><div>${sp}</div><div style="font-size:14px">${this.restT > 0 ? '😵 쉬는 중…' : ''}🌀 청소기 ${this.vacCd > 0 ? this.vacCd + '초' : `<b style="color:#3fbf6a">준비됨</b> (${isPhone ? '버튼' : '우클릭'})`}</div>`;
    } else if (me && me.esc) role = `<div style="font-size:19px">🚪 탈출 성공!</div><div style="font-size:14px">친구들을 응원해요</div>`;
    else if (me && me.caught) role = `<div style="font-size:19px">🔒 잡혔어요</div><div style="font-size:14px">친구가 쥐장을 열어 주길 기다려요</div>`;
    else role = `<div style="font-size:19px">🐭 쥐 ${this.hasKey() ? '· 🔑 들고 있음' : ''}</div><div style="font-size:14px">${this.myHide >= 0 ? `📦 숨는 중 ${this.hs}초` : this.hasKey() ? '현관문 열쇠판으로!' : '열쇠를 찾아요 (하나는 다락방!)'}</div><div style="font-size:14px">📍 ${placeName(this.body.x, this.body.y, this.body.z)}</div>`;
    if (this._role !== role) { this._role = role; this.hRole.innerHTML = role; }
    const mice = [...this.P.values()].filter(p => p.role === 'mouse' && !p.gone), esc = mice.filter(p => p.esc).length;
    const cnt = mice.length ? `🐭 탈출 <b>${esc}</b> / ${this.need} 필요<div style="font-size:13px;margin-top:2px">${mice.map(p => `<span style="opacity:${p.caught ? .45 : 1}">${p.esc ? '🚪' : p.caught ? '🔒' : '🐭'}${esc_(p.name)}</span>`).join(' ')}</div>` : '🐭 쥐 없음 (집 구경)';
    if (this._cnt !== cnt) { this._cnt = cnt; this.hCnt.innerHTML = cnt; }
  }

  // ───────── 결과 ─────────
  onEnd(m) {
    if (this.ended) return;
    this.ended = true; this.closeEditor();
    if (document.pointerLockElement) document.exitPointerLock();
    if (this.menuEl) { this.menuEl.remove(); this.menuEl = null; }
    const meWin = (m.win === 'mom') === (this.role === 'mom');
    meWin ? S.win() : S.lose(); bgm(null);
    const best = m.moms.slice().sort((a, b) => b.catches - a.catches || a.miss - b.miss)[0];
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;inset:0;background:rgba(255,243,196,.97);z-index:9;overflow:auto;pointer-events:auto;color:#4a2c1d;font-family:Jua';
    el.innerHTML = `<div style="max-width:860px;margin:0 auto;padding:16px">
<div style="text-align:center;font-size:clamp(30px,6vw,52px);color:${m.win === 'mom' ? '#ff6fa5' : '#3b8fd6'};text-shadow:3px 3px 0 #4a2c1d">${m.win === 'mom' ? '엄마 승리! 쥐 소탕 완료 🧹' : '쥐 승리! 탈출 성공 🐭🚪'}</div>
<div style="text-align:center;font-size:18px;margin:4px 0 12px">${m.why ? esc_(m.why) + ' · ' : ''}열쇠 ${m.keysIn} / ${CFG.KEYS} · ${this.practice ? '' : meWin ? '이겼어요!' : '졌어요…'}</div>
<div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:12px" data-g>
 <div style="background:#fffaf0;border:3px solid #4a2c1d;border-radius:16px;padding:10px"><div style="font-size:18px;margin-bottom:6px">🐭 쥐들</div><div data-list style="font-size:16px;line-height:1.7"></div></div>
 <div style="display:flex;flex-direction:column;gap:12px">
  <div style="background:#fffaf0;border:3px solid #4a2c1d;border-radius:16px;padding:10px"><div style="font-size:18px">👑 오늘의 청소왕</div><div data-moms style="display:flex;gap:12px;margin-top:6px;flex-wrap:wrap"></div></div>
  <div style="text-align:center;font-size:17px" data-cd></div>
 </div>
</div></div>`;
    this.root.append(el); this.endEl = el;
    if (innerWidth < 700) el.querySelector('[data-g]').style.gridTemplateColumns = '1fr';
    const mb = el.querySelector('[data-moms]');
    for (const mo of m.moms) {
      const p = this.P.get(mo.id), w = document.createElement('div'); w.style.cssText = 'text-align:center';
      const c = lookToCanvas((p && p.look) || mo.look || defaultLook()); c.style.cssText = 'width:64px;height:112px;image-rendering:pixelated;background:#f3ead8;border-radius:8px';
      const n = document.createElement('div'); n.innerHTML = `${mo === best && mo.catches ? '👑 ' : ''}${esc_(mo.name)}<div style="font-size:13px">잡음 ${mo.catches} · 헛손질 ${mo.miss}</div>`;
      w.append(c, n); mb.append(w);
    }
    if (!m.moms.length) mb.textContent = '-';
    const list = el.querySelector('[data-list]');
    for (const t of m.mice) {
      const p = this.P.get(t.id), d = document.createElement('div');
      d.innerHTML = `<span style="color:${p ? p.col : '#888'}">●</span> <b>${esc_(t.name)}</b> — ${t.esc ? '<span style="color:#3fbf6a">🚪 탈출!</span>' : t.caught ? `<span style="color:#ff5a5a">🔒 잡힘</span> (${esc_(t.place || '')})` : t.gone ? '나감' : `끝까지 숨음 (${esc_(t.place || '')})`} · ${fmtT(t.surv)}${t.keysIn ? ` · 🔑${t.keysIn}` : ''}${t.rescues ? ` · 구출 ${t.rescues}번` : ''}`;
      list.append(d);
    }
    if (!m.mice.length) list.textContent = '-';
    const cdEl = el.querySelector('[data-cd]');
    if (this.practice) {
      cdEl.innerHTML = '<div style="display:flex;gap:8px;justify-content:center"><button class="btn pk" data-r>🔁 다시 하기</button><button class="btn" data-q>나가기</button></div>';
      cdEl.querySelector('[data-r]').onclick = () => this.onRetry ? this.onRetry() : this.onQuit();
      cdEl.querySelector('[data-q]').onclick = () => this.onQuit();
      return;
    }
    let cd = 14;
    const tick = () => { cdEl.textContent = `${cd}초 뒤 대기실로 돌아가요`; cd--; };
    tick(); this.cdT = setInterval(tick, 1000);
  }

  destroy() {
    this.alive = false; cancelAnimationFrame(this.raf); clearInterval(this.sendT); clearInterval(this.cdT); clearInterval(this.simT); clearTimeout(this.chatT);
    this.sim = null;
    removeEventListener('keydown', this.kd); removeEventListener('keyup', this.ku); removeEventListener('mousemove', this.mm); removeEventListener('resize', this.resize);
    document.removeEventListener('pointerlockchange', this.plc);
    if (document.pointerLockElement) document.exitPointerLock();
    this.closeEditor();
    this.W.doorOpen = false;
    try { this.R.dispose(); this.R.forceContextLoss(); } catch (e) {}
    this.root.textContent = '';
  }
}
function esc_(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
function fmtT(s) { s = Math.round(s); return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`; }
