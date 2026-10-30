// 엄마의 대청소날~ — 방 서버 (Cloudflare Workers + Durable Objects)
// Room: 방 하나. Lobby: 공개방 목록 (하나뿐)
import { CFG, OBJ, MAPS, MAP_IDS, genWorld, speedOf, lookValid, roomName, formReach, PROTO } from '../public/shared.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS } });
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const r2 = v => Math.round(v * 100) / 100;
const clean = (s, n = 10) => String(s || '').replace(/[<>\n\r\t]/g, '').trim().slice(0, n);
const lobbyStub = env => env.LOBBY.get(env.LOBBY.idFromName('main'));

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/api/rooms') return lobbyStub(env).fetch('https://lobby/list');
    if (url.pathname === '/api/create') {
      for (let i = 0; i < 10; i++) {
        let code = ''; for (let k = 0; k < 4; k++) code += CODE_CHARS[Math.random() * CODE_CHARS.length | 0];
        const j = await (await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch('https://room/exists')).json();
        if (!j.ok) return json({ code });
      }
      return json({ error: '방을 만들 수 없어요. 잠시 후 다시 해 주세요.' }, 503);
    }
    const m = url.pathname.match(/^\/ws\/([A-Z]{4})$/);
    if (m) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
    }
    if (env.ASSETS) return env.ASSETS.fetch(req);
    return new Response('not found', { status: 404 });
  }
};

// ───────── 공개방 목록 ─────────
export class Lobby {
  constructor(state) { this.state = state; this.rooms = new Map(); }
  async fetch(req) {
    const url = new URL(req.url), now = Date.now();
    for (const [k, r] of this.rooms) if (now - r.at > 50000) this.rooms.delete(k);
    if (url.pathname === '/put') {
      const r = await req.json();
      if (r.del) this.rooms.delete(r.code); else { r.at = now; this.rooms.set(r.code, r); }
      return json({ ok: true });
    }
    const list = [...this.rooms.values()].filter(r => r.phase === 'lobby' && r.n < r.max).map(({ at, phase, ...r }) => r);
    list.sort((a, b) => b.n - a.n);
    return json({ rooms: list.slice(0, 60) });
  }
}

// ───────── 방 ─────────
export class Room {
  constructor(state, env) {
    this.state = state; this.env = env;
    this.inited = false; this.code = '';
    this.players = new Map(); this.order = [];
    this.host = null; this.banned = new Set();
    this.settings = { map: 'random', moms: 1, max: 8, pub: false, name: '' };
    this.phase = 'lobby'; this.g = null; this.loop = null; this.backT = null;
    this.listed = false; this.postT = null; this.beat = null;
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/exists') return Response.json({ ok: this.inited });
    const pair = new WebSocketPair(); const client = pair[0], ws = pair[1];
    ws.accept();
    const done = () => new Response(null, { status: 101, webSocket: client });
    const err = (msg, k) => { try { ws.send(JSON.stringify({ type: 'err', msg, k })); ws.close(4000, 'err'); } catch (e) {} return done(); };
    const q = url.searchParams, code = url.pathname.split('/').pop();
    if (!this.inited) {
      if (q.get('create') !== '1') return err('그런 방이 없어요. 코드를 다시 확인해 주세요.', 'none');
      this.inited = true; this.code = code;
      this.settings.pub = q.get('pub') === '1';
    }
    const id = String(q.get('id') || '').slice(0, 64);
    if (!id) return err('접속 정보가 잘못됐어요.');
    if (this.banned.has(id)) return err('방장이 이 방에서 내보냈어요.', 'ban');
    let p = this.players.get(id);
    if (p) {
      if (p.ws) { try { p.ws.close(4001, 'replaced'); } catch (e) {} }
      const back = !p.on; p.ws = ws; p.on = true; p.offAt = 0;
      if (back) this.sys(`${p.name} 님이 다시 연결됐어요.`);
      if (!this.host || !this.players.has(this.host)) this.host = id;
    } else {
      if (this.phase !== 'lobby') return err('이미 청소가 시작됐어요. 끝나면 다시 들어와 주세요.', 'busy');
      if (this.players.size >= this.settings.max) return err('방이 꽉 찼어요.', 'full');
      p = { id, name: clean(q.get('name')) || '이름 없는 장난감', dev: q.get('dev') === 'phone' ? 'phone' : 'pc', ready: false, want: false, ws, on: true, chatT: [], look: null };
      this.players.set(id, p); this.order.push(id);
      if (!this.host) { this.host = id; if (!this.settings.name) this.settings.name = `${p.name}네 집`; }
      this.sys(`${p.name} 님이 들어왔어요.`);
    }
    ws.addEventListener('message', e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } try { this.onMsg(p, m); } catch (ex) { console.log('msg error', ex && ex.stack); } });
    ws.addEventListener('close', () => { try { ws.close(1000, 'bye'); } catch (e) {} this.onClose(p, ws); });
    ws.addEventListener('error', () => this.onClose(p, ws));
    this.send(p, { type: 'hello', id, code: this.code, pv: PROTO });
    if (this.phase === 'game' && this.g && this.g.P.has(id)) this.send(p, this.startMsg(p));
    this.pushLobby();
    if (!this.beat) this.beat = setInterval(() => this.post(), 20000);
    return done();
  }

  send(p, o) { if (p.ws) try { p.ws.send(typeof o === 'string' ? o : JSON.stringify(o)); } catch (e) {} }
  all(o) { const s = JSON.stringify(o); for (const p of this.players.values()) this.send(p, s); }
  sys(text) { this.all({ type: 'chat', sys: 1, text }); }

  lobbyMsg() {
    return {
      type: 'lobby', code: this.code, host: this.host, phase: this.phase, settings: this.settings,
      players: this.order.map(id => this.players.get(id)).filter(Boolean).map(p => ({ id: p.id, name: p.name, ready: p.ready, want: p.want, dev: p.dev, on: p.on }))
    };
  }
  pushLobby() { this.all(this.lobbyMsg()); this.postSoon(); }

  // 공개방 목록에 알리기
  postSoon() { clearTimeout(this.postT); this.postT = setTimeout(() => this.post(), 300); }
  post() {
    const s = this.settings, hostP = this.players.get(this.host);
    const live = s.pub && this.players.size > 0 && [...this.players.values()].some(p => p.on);
    if (!live && !this.listed) return;
    const body = live
      ? { code: this.code, name: s.name || '이름 없는 집', host: hostP ? hostP.name : '?', n: this.players.size, max: s.max, map: s.map, moms: s.moms, phase: this.phase }
      : { code: this.code, del: 1 };
    this.listed = !!live;
    lobbyStub(this.env).fetch('https://lobby/put', { method: 'POST', body: JSON.stringify(body) }).catch(() => {});
  }

  removePlayer(p) {
    this.players.delete(p.id); this.order = this.order.filter(i => i !== p.id);
    if (this.host === p.id) this.pickHost();
  }

  onClose(p, ws) {
    if (p.ws !== ws) return;
    p.ws = null; p.on = false; p.offAt = Date.now();
    if (p.left) { // 스스로 나감
      if (this.phase === 'lobby' || !this.g || !this.g.P.has(p.id)) this.removePlayer(p);
      else { const gp = this.g.P.get(p.id); if (gp.role === 'mom') this.momGone(p); else { gp.gone = true; this.checkEnd(); } }
      this.sys(`${p.name} 님이 나갔어요.`);
    } else if (this.phase === 'lobby') {
      this.sys(`${p.name} 님의 연결이 끊겼어요. 15초 안에 돌아오면 그대로예요.`);
      setTimeout(() => {
        if (p.on || this.players.get(p.id) !== p || this.phase !== 'lobby') return;
        this.removePlayer(p); this.sys(`${p.name} 님이 나갔어요.`);
        this.afterLeave();
      }, 15000);
    } else {
      this.sys(`${p.name} 님의 연결이 끊겼어요.`);
    }
    if (this.host === p.id) this.pickHost();
    this.afterLeave();
  }
  afterLeave() {
    if (![...this.players.values()].some(x => x.on)) {
      setTimeout(() => { if (![...this.players.values()].some(x => x.on)) this.reset(); }, this.phase === 'lobby' ? 16000 : 60000);
    }
    this.pushLobby();
  }
  pickHost() {
    const next = this.order.map(i => this.players.get(i)).find(x => x && x.on && !x.left);
    this.host = next ? next.id : null;
    if (next) this.sys(`이제 ${next.name} 님이 방장이에요.`);
  }
  reset() {
    clearInterval(this.loop); clearInterval(this.beat); clearTimeout(this.backT);
    this.loop = this.beat = null;
    const wasListed = this.listed; this.settings.pub = false;
    if (wasListed) this.post();
    this.players.clear(); this.order = []; this.host = null; this.g = null; this.phase = 'lobby'; this.inited = false; this.banned.clear();
    this.settings = { map: 'random', moms: 1, max: 8, pub: false, name: '' };
  }

  cantStart() {
    const ps = [...this.players.values()];
    if (ps.length < 2) return '두 명 이상 있어야 시작할 수 있어요.';
    if (ps.some(p => !p.on)) return '연결이 끊긴 사람이 있어요. 잠깐만 기다려 주세요.';
    if (ps.length <= this.settings.moms) return '엄마 수보다 장난감이 많아야 해요.';
    const notReady = ps.filter(p => p.id !== this.host && !p.ready);
    if (notReady.length) return `아직 준비 안 한 사람: ${notReady.map(p => p.name).join(', ')}`;
    return '';
  }

  onMsg(p, m) {
    const g = this.g, gp = g && g.P.get(p.id);
    switch (m.type) {
      case 'chat': {
        const text = String(m.text || '').replace(/[\n\r]/g, ' ').trim().slice(0, 120);
        if (!text) return;
        const now = Date.now(); p.chatT = p.chatT.filter(t => t > now - 5000);
        if (p.chatT.length >= 5) return; p.chatT.push(now);
        // 게임 중에는 같은 편끼리만 (잡힌 장난감도 장난감끼리)
        const o = JSON.stringify({ type: 'chat', id: p.id, name: p.name, role: gp ? gp.role : null, text });
        for (const q of this.players.values()) { const qq = g && g.P.get(q.id); if (!gp || !qq || qq.role === gp.role) this.send(q, o); }
        break;
      }
      case 'kick': {
        if (p.id !== this.host || m.id === p.id || this.phase !== 'lobby') return;
        const t = this.players.get(String(m.id || '')); if (!t) return;
        this.banned.add(t.id);
        this.send(t, { type: 'err', msg: '방장이 이 방에서 내보냈어요.', k: 'ban' });
        const tw = t.ws; t.ws = null; t.on = false;
        this.removePlayer(t);
        try { tw && tw.close(4002, 'kicked'); } catch (e) {}
        this.sys(`${t.name} 님을 방장이 내보냈어요.`);
        this.pushLobby();
        break;
      }
      case 'host': {
        if (p.id !== this.host) return;
        const t = this.players.get(String(m.id || '')); if (!t || !t.on || t.id === p.id) return;
        this.host = t.id; this.sys(`${p.name} 님이 ${t.name} 님에게 방장을 넘겼어요.`); this.pushLobby();
        break;
      }
      case 'ready': if (this.phase === 'lobby') { p.ready = !!m.v; this.pushLobby(); } break;
      case 'want': if (this.phase === 'lobby') { p.want = !!m.v; this.pushLobby(); } break;
      case 'set': {
        if (this.phase !== 'lobby' || p.id !== this.host) return;
        const s = this.settings;
        if (m.map === 'random' || MAP_IDS.includes(m.map)) s.map = m.map;
        if (m.max) s.max = clamp(m.max | 0, Math.max(3, this.players.size), CFG.MAX_PLAYERS);
        if (m.moms) s.moms = clamp(m.moms | 0, 1, 2);
        if (typeof m.pub === 'boolean') s.pub = m.pub;
        if (typeof m.name === 'string') s.name = clean(m.name, 16) || s.name;
        this.pushLobby();
        break;
      }
      case 'start':
        if (this.phase !== 'lobby' || p.id !== this.host) return;
        { const why = this.cantStart(); if (why) { this.send(p, { type: 'chat', sys: 1, text: why }); return; } }
        this.startGame();
        break;
      case 'leave': p.left = true; try { p.ws && p.ws.close(1000, 'leave'); } catch (e) {} break;
      case 'look': if (m.v === null || lookValid(m.v)) { p.look = m.v; if (gp && gp.role === 'mom') this.all({ type: 'look', id: p.id, v: m.v, fin: m.fin ? 1 : 0 }); } break;
      case 'ping': this.send(p, { type: 'pong', t: m.t }); break;
      default: if (g && gp) this.gameMsg(p, gp, m);
    }
  }

  // ───────── 게임 ─────────
  startGame() {
    const ps = this.order.map(i => this.players.get(i)).filter(Boolean);
    const mapId = this.settings.map === 'random' ? MAP_IDS[Math.random() * MAP_IDS.length | 0] : this.settings.map;
    const seed = Math.random() * 1e9 | 0;
    const W = genWorld(mapId, seed), M = W.M;
    // 엄마: 지원한 사람 중에서 먼저
    const pool = ps.slice().sort(() => Math.random() - .5);
    pool.sort((a, b) => (b.want ? 1 : 0) - (a.want ? 1 : 0));
    const moms = new Set(pool.slice(0, this.settings.moms).map(p => p.id));
    const P = new Map(); let ti = 0;
    for (const p of ps) {
      const mom = moms.has(p.id);
      const ang = ti * 2.4, rr = .35 + (ti % 3) * .2;
      const [x, z] = mom ? [M.mom[0] + (P.size % 2) * .5, M.mom[1]] : [M.toy[0] + Math.cos(ang) * rr, M.toy[1] + Math.sin(ang) * rr];
      if (!mom) ti++;
      P.set(p.id, {
        id: p.id, name: p.name, role: mom ? 'mom' : 'toy', x, z, a: mom ? 0 : Math.PI, form: null, fz: 0, mv: 0,
        caught: false, caughtAt: 0, stam: CFG.STAMINA, rest: 0, regen: 0, vac: 0, formT: 0, grace: 0,
        sqT: CFG.SQUEAK * (.5 + Math.random() * .5), lastT: Date.now(), res: 0, resT: 0,
        stat: { catches: 0, miss: 0, survived: 0, rescues: 0, caughtN: 0, forms: 0 }, spot: null
      });
    }
    this.phase = 'game';
    this.g = { mapId, seed, W, P, ph: 'prep', t: CFG.PREP, startAt: Date.now(), ended: false, log: [] };
    for (const p of ps) { p.ready = false; }
    for (const p of ps) this.send(p, this.startMsg(p));
    const last = Date.now(); this.g.prev = last;
    clearInterval(this.loop);
    this.loop = setInterval(() => { try { this.tick(); } catch (e) { console.log('tick', e && e.stack); } }, 1000 / 15);
    this.pushLobby();
  }

  startMsg(p) {
    const g = this.g;
    const roles = {}, names = {}, looks = {};
    for (const q of g.P.values()) { roles[q.id] = q.role; names[q.id] = q.name; if (q.role === 'mom') { const pl = this.players.get(q.id); looks[q.id] = pl ? pl.look : null; } }
    const me = g.P.get(p.id);
    return { type: 'start', map: g.mapId, seed: g.seed, ph: g.ph, t: g.t, roles, names, looks, you: p.id, me: me && { x: me.x, z: me.z, a: me.a, form: me.form, caught: me.caught } };
  }

  gameMsg(p, gp, m) {
    const g = this.g, now = Date.now();
    switch (m.type) {
      case 'st': {
        if (gp.caught || gp.rest > 0) return;
        if (g.ph === 'prep' && gp.role === 'mom') return;
        let x = +m.x, z = +m.z; if (!Number.isFinite(x) || !Number.isFinite(z)) return;
        const dt = Math.min(1, (now - gp.lastT) / 1000); gp.lastT = now;
        const max = speedOf(gp.role, gp.form) * dt * 1.6 + .35, d = Math.hypot(x - gp.x, z - gp.z);
        if (d > max) { const k = max / d; x = gp.x + (x - gp.x) * k; z = gp.z + (z - gp.z) * k; this.send(p, { type: 'fix', x: r2(x), z: r2(z) }); }
        gp.x = clamp(x, 1, g.W.W - 1); gp.z = clamp(z, 1, g.W.H - 1);
        if (Number.isFinite(+m.a)) gp.a = +m.a;
        gp.fz = m.fz ? 1 : 0; gp.mv = m.mv ? 1 : 0;
        break;
      }
      case 'form': {
        if (gp.role !== 'toy' || gp.caught || now < gp.formT) return;
        if (m.o === -1) { gp.form = null; }
        else if (m.d !== undefined) { // 가구로 변신 (가장자리까지 거리)
          const d = g.W.decor[m.d | 0]; if (!d) return;
          const ex = Math.max(0, Math.abs(gp.x - d.x) - d.hw), ez = Math.max(0, Math.abs(gp.z - d.z) - d.hd);
          if (Math.hypot(ex, ez) > CFG.FORM_R + .6) return;
          gp.form = d.t; gp.stat.forms++;
        } else {
          const o = g.W.objs[m.o | 0]; if (!o || Math.hypot(o.x - gp.x, o.z - gp.z) > CFG.FORM_R + .6) return;
          gp.form = o.t; gp.stat.forms++;
        }
        gp.formT = now + CFG.FORM_CD * 1000;
        this.all({ type: 'ev', e: 'form', id: gp.id, f: gp.form });
        break;
      }
      case 'grab': {
        if (gp.role !== 'mom' || g.ph !== 'hunt' || gp.rest > 0) return;
        if (now - (gp.grabT || 0) < 350) return; gp.grabT = now;
        if (m.k === 'p') {
          const t = g.P.get(String(m.id || ''));
          if (t && t.role === 'toy' && !t.caught && now > t.grace && Math.hypot(t.x - gp.x, t.z - gp.z) < CFG.GRAB_RANGE + 1 + formReach(t.form)) { this.catchToy(gp, t); return; }
        } else if (m.k !== 'o' && m.k !== 'd') return;
        // 진짜 물건(또는 헛짚음) = 헛손질
        gp.stat.miss++; gp.stam--; gp.regen = 0;
        const ev = { type: 'ev', e: 'miss', id: gp.id }; if (m.k === 'd') ev.d = m.i | 0; else if (m.k === 'o') ev.i = m.i | 0;
        if (gp.stam <= 0) { gp.rest = CFG.REST; gp.stam = 0; ev.rest = 1; }
        this.all(ev);
        break;
      }
      case 'vac': {
        if (gp.role !== 'mom' || g.ph !== 'hunt' || gp.rest > 0 || now < gp.vac) return;
        gp.vac = now + CFG.VAC_CD * 1000;
        const hit = [];
        for (const t of g.P.values()) {
          if (t.role !== 'toy' || t.caught) continue;
          const d = Math.hypot(t.x - gp.x, t.z - gp.z);
          if (d < CFG.VAC_R) { hit.push(t.id); t.sqT = CFG.SQUEAK; const pl = this.players.get(t.id); if (pl) this.send(pl, { type: 'pull', x: r2(gp.x), z: r2(gp.z), k: r2(Math.min(.9, d - .6)) }); }
        }
        this.all({ type: 'ev', e: 'vac', id: gp.id, x: r2(gp.x), z: r2(gp.z), hit });
        for (const id of hit) { const t = g.P.get(id); this.all({ type: 'ev', e: 'sq', id, x: r2(t.x), z: r2(t.z), v: 1 }); }
        break;
      }
      case 'res': { // 상자 구출 (누르고 있는 동안 계속 온다)
        if (gp.role !== 'toy' || gp.caught || g.ph !== 'hunt') return;
        const M = g.W.M;
        if (Math.hypot(gp.x - M.box[0], gp.z - M.box[1]) > CFG.RESCUE_R + .5) return;
        if (![...g.P.values()].some(t => t.caught)) return;
        if (now - gp.resT > 600) gp.res = 0;
        gp.res += Math.min(.4, (now - (gp.resT || now)) / 1000); gp.resT = now;
        this.all({ type: 'ev', e: 'resp', id: gp.id, v: r2(gp.res / CFG.RESCUE) });
        if (gp.res >= CFG.RESCUE) { gp.res = 0; this.rescue(gp); }
        break;
      }
      case 'sign': {
        if (gp.role !== 'toy') return;
        const x = +m.x, z = +m.z;
        if (!Number.isFinite(x) || !Number.isFinite(z) || now - (gp.pingT || 0) < 2500) return;
        gp.pingT = now;
        const o = JSON.stringify({ type: 'sign', a: p.id, x: r2(x), z: r2(z) });
        for (const q of g.P.values()) if (q.role === 'toy') { const pl = this.players.get(q.id); if (pl) this.send(pl, o); }
        break;
      }
    }
  }

  catchToy(mom, t) {
    const g = this.g, M = g.W.M;
    t.caught = true; t.caughtAt = Date.now(); t.stat.caughtN++;
    t.spot = t.spot || { x: r2(t.x), z: r2(t.z), f: t.form, room: roomName(M, t.x, t.z) };
    t.lastSpot = { x: r2(t.x), z: r2(t.z), f: t.form, room: roomName(M, t.x, t.z) };
    t.form = null; t.x = M.box[0]; t.z = M.box[1];
    mom.stat.catches++;
    this.all({ type: 'ev', e: 'caught', id: t.id, by: mom.id, x: t.lastSpot.x, z: t.lastSpot.z, f: t.lastSpot.f });
    this.checkEnd();
  }

  rescue(by) {
    const g = this.g, M = g.W.M, now = Date.now();
    const freed = [];
    let k = 0;
    for (const t of g.P.values()) if (t.caught) {
      t.caught = false; t.grace = now + CFG.GRACE * 1000; t.form = null;
      const a = k++ * 1.9; t.x = M.box[0] + Math.cos(a) * .9; t.z = M.box[1] + Math.sin(a) * .9; t.lastT = now;
      freed.push(t.id);
      const pl = this.players.get(t.id); if (pl) this.send(pl, { type: 'fix', x: r2(t.x), z: r2(t.z) });
    }
    by.stat.rescues++;
    this.all({ type: 'ev', e: 'rescue', id: by.id, freed });
  }

  // 엄마가 나가면 장난감 하나가 엄마가 된다
  momGone(pl) {
    const g = this.g; if (!g || g.ended) return;
    const gp = g.P.get(pl.id); if (!gp || gp.role !== 'mom' || gp.gone) return;
    gp.gone = true;
    const momsLeft = [...g.P.values()].filter(q => q.role === 'mom' && !q.gone);
    if (momsLeft.length) return;
    const cands = [...g.P.values()].filter(q => q.role === 'toy' && !q.gone && this.players.get(q.id) && this.players.get(q.id).on);
    if (cands.length < 2) { this.checkEnd(true); return; }
    const free = cands.filter(q => !q.caught);
    const nm = (free.length ? free : cands)[Math.random() * (free.length || cands.length) | 0];
    nm.role = 'mom'; nm.caught = false; nm.form = null; nm.x = g.W.M.mom[0]; nm.z = g.W.M.mom[1]; nm.stam = CFG.STAMINA; nm.rest = 0;
    const npl = this.players.get(nm.id);
    this.all({ type: 'ev', e: 'newmom', id: nm.id, old: gp.id, look: npl ? npl.look : null });
    if (npl) this.send(npl, { type: 'fix', x: nm.x, z: nm.z });
    this.checkEnd();
  }

  tick() {
    const g = this.g; if (!g || g.ended) return;
    const now = Date.now(), dt = Math.min(.5, (now - g.prev) / 1000); g.prev = now;
    g.t -= dt;
    if (g.ph === 'prep' && g.t <= 0) {
      g.ph = 'hunt'; g.t = CFG.HUNT;
      for (const q of g.P.values()) { q.lastT = now; if (q.role === 'toy') q.sqT = CFG.SQUEAK * (.4 + Math.random() * .6); }
      this.all({ type: 'ev', e: 'hunt' });
    }
    // 엄마 오래 끊김 → 교대
    for (const q of g.P.values()) {
      const pl = this.players.get(q.id);
      if (q.role === 'mom' && !q.gone && (!pl || (!pl.on && now - pl.offAt > CFG.MOM_OFF_SWAP * 1000))) this.momGone(pl || { id: q.id });
    }
    if (g.ended) return;
    if (g.ph === 'hunt') {
      for (const q of g.P.values()) {
        if (q.role === 'mom') {
          if (q.rest > 0) { q.rest -= dt; if (q.rest <= 0) { q.rest = 0; q.stam = CFG.STAMINA; this.all({ type: 'ev', e: 'up', id: q.id }); } }
          else if (q.stam < CFG.STAMINA) { q.regen += dt; if (q.regen >= CFG.STAM_REGEN) { q.regen = 0; q.stam++; } }
        } else if (!q.caught) {
          q.stat.survived += dt;
          q.sqT -= dt;
          if (q.sqT <= 0) { q.sqT = CFG.SQUEAK; this.all({ type: 'ev', e: 'sq', id: q.id, x: r2(q.x), z: r2(q.z) }); }
        }
      }
      if (g.t <= 0) { this.endGame('toy'); return; }
    }
    // 스냅샷: [id, x, z, a, form, flags(1 얼음, 2 움직임, 4 잡힘, 8 무적, 16 쉼)]
    const P = [];
    for (const q of g.P.values()) if (!q.gone) P.push([q.id, r2(q.x), r2(q.z), r2(q.a), q.form, (q.fz ? 1 : 0) | (q.mv ? 2 : 0) | (q.caught ? 4 : 0) | (now < q.grace ? 8 : 0) | (q.rest > 0 ? 16 : 0)]);
    for (const q of g.P.values()) {
      const pl = this.players.get(q.id); if (!pl || !pl.ws) continue;
      const o = { type: 'snap', ph: g.ph, t: Math.max(0, Math.round(g.t * 10) / 10), P };
      if (q.role === 'mom') { o.st = q.stam; o.vac = Math.max(0, Math.ceil((q.vac - now) / 1000)); o.rest = r2(q.rest); }
      else o.sq = Math.max(0, Math.round(q.sqT));
      this.send(pl, o);
    }
    // 게임 중 들어온 적 없는 관전자(로비에 남은 사람)는 없음
  }

  checkEnd(noMom) {
    const g = this.g; if (!g || g.ended) return;
    const toys = [...g.P.values()].filter(q => q.role === 'toy' && !q.gone);
    const moms = [...g.P.values()].filter(q => q.role === 'mom' && !q.gone);
    if (noMom || !moms.length) { this.endGame('toy', '엄마가 다 나갔어요'); return; }
    if (!toys.length) { this.endGame('mom', '장난감이 다 나갔어요'); return; }
    if (toys.every(q => q.caught)) this.endGame('mom');
  }

  endGame(win, why) {
    const g = this.g; if (!g || g.ended) return;
    g.ended = true; clearInterval(this.loop); this.loop = null;
    const M = g.W.M;
    const toys = [...g.P.values()].filter(q => q.role === 'toy');
    const moms = [...g.P.values()].filter(q => q.role === 'mom');
    const res = {
      type: 'end', win, why: why || '', map: g.mapId,
      toys: toys.map(t => ({ id: t.id, name: t.name, caught: t.caught, surv: Math.round(t.stat.survived), rescues: t.stat.rescues, caughtN: t.stat.caughtN,
        spot: t.caught ? t.lastSpot : { x: r2(t.x), z: r2(t.z), f: t.form, room: roomName(M, t.x, t.z) } })),
      moms: moms.map(m => ({ id: m.id, name: m.name, catches: m.stat.catches, miss: m.stat.miss, look: (this.players.get(m.id) || {}).look || null }))
    };
    this.all(res);
    clearTimeout(this.backT);
    this.backT = setTimeout(() => {
      this.phase = 'lobby'; this.g = null;
      for (const p of [...this.players.values()]) { if (!p.on || p.left) this.removePlayer(p); }
      if (!this.players.has(this.host)) this.pickHost();
      this.all({ type: 'back' });
      this.pushLobby();
    }, 14000);
  }
}
