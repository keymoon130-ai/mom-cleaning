// 엄마의 대청소날~ — 방 서버 (Cloudflare Workers + Durable Objects)
// Room: 방 하나. Lobby: 공개방 목록 (하나뿐)
import { CFG, lookValid, PROTO, BAL, Sim } from '../public/shared.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS } });
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const r2 = v => Math.round(v * 100) / 100;
const clean = (s, n = 10) => String(s || '').replace(/[<>\n\r\t]/g, '').trim().slice(0, n);
const lobbyStub = env => env.LOBBY.get(env.LOBBY.idFromName('main'));
const statsStub = env => env.STATS.get(env.STATS.idFromName('main'));

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/api/rooms') return lobbyStub(env).fetch('https://lobby/list');
    if (url.pathname === '/api/stats') return statsStub(env).fetch('https://stats/list');
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

// ───────── 판 기록 (밸런스용) ─────────
export class Stats {
  constructor(state) {
    this.sql = state.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS games (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER, data TEXT)');
  }
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/add') {
      const d = await req.json();
      this.sql.exec('INSERT INTO games (at, data) VALUES (?, ?)', Date.now(), JSON.stringify(d));
      return json({ ok: true });
    }
    const rows = this.sql.exec('SELECT id, at, data FROM games ORDER BY id DESC LIMIT 5000').toArray();
    return json({ games: rows.map(r => ({ id: r.id, at: r.at, ...JSON.parse(r.data) })) });
  }
}

// ───────── 방 ─────────
export class Room {
  constructor(state, env) {
    this.state = state; this.env = env;
    this.inited = false; this.code = '';
    this.players = new Map(); this.order = [];
    this.host = null; this.banned = new Set();
    this.settings = { map: 'house', moms: 1, max: 8, pub: false, name: '', trap: false, cat: false };
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
      ? { code: this.code, name: s.name || '이름 없는 집', host: hostP ? hostP.name : '?', n: this.players.size, max: s.max, map: s.map, moms: s.moms, phase: this.phase, modes: ['trap', 'cat'].filter(k => s[k]) }
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
      else { const gp = this.g.P.get(p.id); if (gp.role === 'mom') this.g.momGone(p.id); else this.g.mouseGone(p.id); }
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
    this.settings = { map: 'house', moms: 1, max: 8, pub: false, name: '', trap: false, cat: false };
  }

  cantStart() {
    const ps = [...this.players.values()];
    if (ps.length < 2) return '두 명 이상 있어야 시작할 수 있어요.';
    if (ps.some(p => !p.on)) return '연결이 끊긴 사람이 있어요. 잠깐만 기다려 주세요.';
    if (ps.length <= this.settings.moms) return '엄마 수보다 쥐가 많아야 해요.';
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
        if (m.max) s.max = clamp(m.max | 0, Math.max(3, this.players.size), CFG.MAX_PLAYERS);
        if (m.moms) s.moms = clamp(m.moms | 0, 1, 2);
        if (typeof m.pub === 'boolean') s.pub = m.pub;
        if (typeof m.name === 'string') s.name = clean(m.name, 16) || s.name;
        for (const k of ['trap', 'cat']) if (typeof m[k] === 'boolean') s[k] = m[k];
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

  // ───────── 게임 (규칙은 shared.js 의 Sim) ─────────
  startGame() {
    const ps = this.order.map(i => this.players.get(i)).filter(Boolean);
    const pool = ps.slice().sort(() => Math.random() - .5);
    pool.sort((a, b) => (b.want ? 1 : 0) - (a.want ? 1 : 0));
    const moms = new Set(pool.slice(0, this.settings.moms).map(p => p.id));
    this.phase = 'game';
    const sim = new Sim({
      seed: Math.random() * 1e9 | 0, modes: { trap: !!this.settings.trap, cat: !!this.settings.cat },
      players: ps.map(p => ({ id: p.id, name: p.name, role: moms.has(p.id) ? 'mom' : 'mouse' })),
      emit: (to, m) => {
        if (to === null) this.all(m); else { const pl = this.players.get(to); if (pl) this.send(pl, m); }
        if (m.e === 'newmom') { const pl = this.players.get(m.id); this.all({ type: 'look', id: m.id, v: pl ? pl.look : null }); }
      },
      isOnline: id => { const pl = this.players.get(id); return !!(pl && pl.on); }
    });
    sim.onEnd = res => this.afterGame(res);
    this.g = sim;
    for (const p of ps) { p.ready = false; }
    for (const p of ps) this.send(p, this.startMsg(p));
    clearInterval(this.loop);
    this.loop = setInterval(() => { try { this.tick(); } catch (e) { console.log('tick', e && e.stack); } }, 1000 / 15);
    this.pushLobby();
  }
  startMsg(p) {
    const m = this.g.startMsg(p.id), looks = {};
    for (const q of this.g.P.values()) if (q.role === 'mom') { const pl = this.players.get(q.id); looks[q.id] = pl ? pl.look : null; }
    m.looks = looks;
    return m;
  }
  gameMsg(p, gp, m) { this.g.msg(p.id, m); }
  momGone(pl) { if (this.g) this.g.momGone(pl.id); }
  tick() {
    const g = this.g; if (!g || g.ended) return;
    const now = Date.now();
    // 엄마 오래 끊김 → 교대
    for (const q of g.P.values()) {
      const pl = this.players.get(q.id);
      if (q.role === 'mom' && !q.gone && (!pl || (!pl.on && now - pl.offAt > CFG.MOM_OFF_SWAP * 1000))) g.momGone(q.id);
    }
    if (!g.ended) g.tick();
  }
  checkEnd() { if (this.g) this.g.checkEnd(); }
  afterGame(res) {
    clearInterval(this.loop); this.loop = null;
    // 결과 화면용 엄마 모습
    for (const m of res.moms) m.look = (this.players.get(m.id) || {}).look || null;
    this.record(res);
    clearTimeout(this.backT);
    this.backT = setTimeout(() => {
      this.phase = 'lobby'; this.g = null;
      for (const p of [...this.players.values()]) { if (!p.on || p.left) this.removePlayer(p); }
      if (!this.players.has(this.host)) this.pickHost();
      this.all({ type: 'back' });
      this.pushLobby();
    }, 14000);
  }
  // 판 결과를 기록 (이름은 저장하지 않음)
  record(res) {
    try {
      const g = this.g; if (!g || g.ph !== 'hunt') return;
      const mice = g.mice, moms = g.moms, sum = (a, f) => a.reduce((s, q) => s + f(q), 0);
      const d = {
        bal: BAL, pv: PROTO, map: 'house', moms: moms.length, toys: mice.length, modes: Object.keys(g.modes).filter(k => g.modes[k]),
        win: res.win === 'mouse' ? 'toy' : 'mom', why: res.why || '', ph: g.ph, left: Math.max(0, Math.round(g.t)),
        alive: mice.filter(q => q.esc).length, esc: mice.filter(q => q.esc).length, need: res.needed, keysIn: res.keysIn,
        surv: mice.map(t => Math.round(t.stat.surv)),
        catches: sum(mice, t => t.stat.caughtN), rescues: sum(mice, t => t.stat.rescues),
        miss: sum(moms, m => m.stat.miss), opens: sum(moms, m => m.stat.opens), hides: sum(mice, t => t.stat.hides), holes: sum(mice, t => t.stat.holes)
      };
      statsStub(this.env).fetch('https://stats/add', { method: 'POST', body: JSON.stringify(d) }).catch(() => {});
    } catch (e) { console.log('record', e && e.stack); }
  }
}
