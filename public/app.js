// 엄마의 대청소날~ — 화면 흐름 · 접속 · 대기실
import { PROTO, MAPS, CFG } from './shared.js?v=11';
import { audioInit, setVol, S, bgm } from './sfx.js?v=11';
import { Editor, loadLook, saveLook } from './editor.js?v=11';
import { Game } from './game.js?v=11';

const $ = id => document.getElementById(id);
const LS = {
  get(k, d) { try { const v = localStorage.getItem('mc_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mc_' + k, JSON.stringify(v)); } catch (e) {} }
};
const isPhone = matchMedia('(pointer:coarse)').matches;
const MAPN = { random: '무작위', room: '아이 방', kitchen: '부엌', attic: '다락방' };

// ───────── 내 정보 · 설정 ─────────
let myId = LS.get('id', null);
if (!myId) { myId = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); LS.set('id', myId); }
const DEF = { mouse: 1, touch: 1, bright: 1, sfx: .8, bgm: .45, noShake: false, low: false, full: true };
const ST = Object.assign({}, DEF, LS.get('set', {}));
setVol(ST.sfx, ST.bgm);
export const settings = ST;
const name = () => LS.get('name', '');

function toast(t, ms = 2400) { const el = $('toast'); el.textContent = t; el.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => el.style.display = 'none', ms); }

// ───────── 화면 전환 ─────────
let cur = 'sTitle';
function show(id) {
  for (const s of document.querySelectorAll('.scr')) s.classList.toggle('on', s.id === id);
  cur = id;
  if (id === 'sQuick') startQuick(); else stopQuick();
  if (id === 'sTitle' || id === 'sQuick') bgm('title');
}
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { S.click(); show('sTitle'); });
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('.modal').classList.remove('on'));
const modal = (id, on = true) => $(id).classList.toggle('on', on);

// 첫 소리는 사용자가 한 번 눌러야 나온다
let ambT = null;
window.addEventListener('pointerdown', () => {
  if (isPhone && ST.full) goFull();
  const first = !S.ok(); audioInit(); setVol(ST.sfx, ST.bgm);
  if (first) { if (cur === 'sTitle' || cur === 'sQuick') bgm('title'); ambient(); }
}, true);
// ───────── 모바일 전체화면 · 가로 고정 ─────────
// 전체화면은 화면을 한 번 눌러야 켜진다 (브라우저 규칙). 가로 고정은 게임 중에만.
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function goFull() {
  if (fsEl()) { lockLand(); return; }
  const d = document.documentElement, rq = d.requestFullscreen || d.webkitRequestFullscreen;
  if (!rq) return; // 아이폰 사파리는 지원 안 함 → 홈 화면에 추가하면 전체화면
  try { const p = rq.call(d, { navigationUI: 'hide' }); if (p && p.then) p.then(lockLand, () => {}); } catch (e) {}
}
function lockLand() {
  if (!game) return;
  try { const p = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}
function unlockLand() { try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) {} }
export function toggleFull() {
  if (fsEl()) { unlockLand(); (document.exitFullscreen || document.webkitExitFullscreen).call(document); ST.full = false; }
  else { ST.full = true; goFull(); }
  LS.set('set', ST); const c = $('oFull'); if (c) c.checked = ST.full;
}
window.__mcFull = toggleFull;

// 첫 화면에서 가끔 슬리퍼 소리 · 청소기 소리
function ambient() {
  clearTimeout(ambT);
  ambT = setTimeout(() => {
    if (cur === 'sTitle' && !game) { if (Math.random() < .6) { S.slipper(.5, Math.random() * 2 - 1); setTimeout(() => S.slipper(.6, 0), 420); } else S.vacuum(.25); }
    ambient();
  }, 5000 + Math.random() * 7000);
}

// 제목 글자 하나하나 통통
(function title() {
  const t = '엄마의 대청소날~', el = $('ttl');
  [...t].forEach((ch, i) => {
    const s = document.createElement('span'); s.textContent = ch === ' ' ? ' ' : ch;
    if (ch === '~') s.className = 'sq'; else s.style.animationDelay = (i * .09) + 's';
    if (i === 3) el.append(document.createElement('br'));
    el.append(s);
  });
  for (let i = 0; i < 14; i++) {
    const b = document.createElement('div'); b.className = 'bub'; const sz = 14 + Math.random() * 46;
    Object.assign(b.style, { width: sz + 'px', height: sz + 'px', left: Math.random() * 100 + 'vw', top: 100 + Math.random() * 30 + 'vh', animationDuration: 9 + Math.random() * 12 + 's', animationDelay: -Math.random() * 20 + 's' });
    $('sTitle').append(b);
  }
})();
function meTag() { $('meTag').textContent = '🧸 ' + (name() || '이름 없음'); }

// ───────── 닉네임 (처음 한 번) ─────────
const okName = s => s.replace(/[<>\n\r\t]/g, '').trim().slice(0, 10);
$('nickF').onsubmit = e => {
  e.preventDefault(); const v = okName($('nickIn').value);
  if (!v) { $('nickErr').textContent = '이름을 적어 주세요.'; return; }
  LS.set('name', v); modal('mdNick', false); meTag(); S.click();
};
function needName() { if (!name()) { modal('mdNick'); setTimeout(() => $('nickIn').focus(), 50); return true; } return false; }

// ───────── 메뉴 ─────────
$('mQuick').onclick = () => { S.click(); if (needName()) return; show('sQuick'); };
$('mCreate').onclick = async () => { S.click(); if (needName()) return; createRoom(); };
$('mCode').onclick = () => { S.click(); if (needName()) return; $('codeErr').textContent = ''; $('codeIn').value = ''; modal('mdCode'); setTimeout(() => $('codeIn').focus(), 50); };
$('mEdit').onclick = () => { S.click(); openEditor(); };
$('mPrac').onclick = () => { S.click(); openPrac(); };
$('mSet').onclick = () => { S.click(); openSettings(); };
$('codeIn').oninput = () => { $('codeIn').value = $('codeIn').value.toUpperCase().replace(/[^A-Z]/g, ''); };
$('codeF').onsubmit = e => {
  e.preventDefault(); const c = $('codeIn').value.toUpperCase();
  if (!/^[A-Z]{4}$/.test(c)) { $('codeErr').textContent = '코드는 알파벳 4글자예요.'; return; }
  join(c, false, { onErr: m => { $('codeErr').textContent = m; } });
};

async function createRoom(pub = false) {
  try {
    const r = await fetch('/api/create', { method: 'POST' }); const j = await r.json();
    if (!j.code) throw new Error(j.error || '방을 못 만들었어요.');
    join(j.code, true, { pub });
  } catch (e) { toast(e.message || '방을 못 만들었어요.'); }
}

// ───────── 빠른 참가 (공개방 목록) ─────────
let qTimer = null;
const F = Object.assign({ map: '', moms: '', max: '' }, LS.get('filter', {}));
$('fMap').value = F.map; $('fMoms').value = F.moms; $('fMax').value = F.max;
for (const k of ['Map', 'Moms', 'Max']) $('f' + k).onchange = () => { F[k.toLowerCase()] = $('f' + k).value; LS.set('filter', F); loadRooms(); };
$('qRefresh').onclick = () => { S.click(); loadRooms(); };
function startQuick() { loadRooms(); clearInterval(qTimer); qTimer = setInterval(loadRooms, 3000); }
function stopQuick() { clearInterval(qTimer); qTimer = null; }
async function loadRooms() {
  let rooms;
  try { rooms = (await (await fetch('/api/rooms', { cache: 'no-store' })).json()).rooms || []; }
  catch (e) { $('qInfo').textContent = '목록을 못 불러왔어요. 잠시 후 다시 해 볼게요.'; return; }
  rooms = rooms.filter(r => (!F.map || r.map === F.map) && (!F.moms || String(r.moms) === F.moms) &&
    (!F.max || (F.max === '10' ? r.max >= 9 : r.max <= +F.max)));
  const L = $('qList'); L.textContent = '';
  if (!rooms.length) {
    L.innerHTML = `<div class="empty"><div class="big">🧺</div>지금 열린 공개방이 없어요.<br><br></div>`;
    const b = document.createElement('button'); b.className = 'btn pk'; b.textContent = '🏠 공개방 만들기';
    b.onclick = () => { S.click(); createRoom(true); }; L.firstChild.append(b);
  }
  for (const r of rooms) {
    const d = document.createElement('div'); d.className = 'room';
    d.innerHTML = `<div class="grow"><div class="nm"></div><div class="inf"></div></div><div class="cnt"></div>`;
    d.querySelector('.nm').textContent = r.name;
    d.querySelector('.inf').textContent = `방장 ${r.host} · ${MAPN[r.map] || r.map} · 엄마 ${r.moms}명${(r.modes || []).length ? ' · ' + r.modes.map(k => (MODES.find(m => m[1] === k) || [])[2] || '').join('') : ''}`;
    d.querySelector('.cnt').textContent = `${r.n} / ${r.max}`;
    d.onclick = () => { S.click(); join(r.code, false, { onErr: (m, k) => { toast(k === 'full' ? '방이 꽉 찼어요.' : m); loadRooms(); } }); };
    L.append(d);
  }
  $('qInfo').textContent = `${rooms.length}개 방 · 3초마다 새로고침`;
}

// ───────── 접속 ─────────
let ws = null, room = null, lobby = null, game = null, wantClose = false, retryT = null, dropAt = 0, onErrCb = null;
const send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
export const net = { send, get id() { return myId; } };

function join(code, create, opt = {}) {
  room = code; onErrCb = opt.onErr || null;
  connect(create, opt.pub);
}
function connect(create, pub) {
  wantClose = false;
  if (ws) { try { ws.onclose = null; ws.close(); } catch (e) {} }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const q = new URLSearchParams({ id: myId, name: name(), dev: isPhone ? 'phone' : 'pc' });
  if (create) q.set('create', '1'); if (pub) q.set('pub', '1');
  const sock = new WebSocket(`${proto}://${location.host}/ws/${room}?${q}`); ws = sock;
  let helloed = false;
  sock.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } if (m.type === 'hello') helloed = true; onMsg(m); };
  sock.onclose = ev => {
    if (sock !== ws) return;
    ws = null;
    if (wantClose || ev.code === 4000 || ev.code === 4002 || ev.code === 4001) return;
    if (!helloed && !dropAt) { toast('방에 들어가지 못했어요.'); leaveRoom(true); return; }
    // 끊김: 1분 동안 다시 붙어 본다
    if (!dropAt) dropAt = Date.now();
    const left = 60 - (Date.now() - dropAt) / 1000;
    if (left <= 0) { modal('reconn', false); $('reconn').classList.remove('on'); toast('다시 연결하지 못했어요.'); leaveRoom(true); return; }
    $('reconn').classList.add('on'); $('reconnMsg').textContent = `다시 연결하는 중… (${Math.ceil(left)}초)`;
    clearTimeout(retryT); retryT = setTimeout(() => connect(false), 1500);
  };
  // 새로고침으로 돌아올 수 있게 기억
  LS.set('rejoin', { code: room, at: Date.now() });
}
addEventListener('visibilitychange', () => { if (!document.hidden && room && !ws && !wantClose) { clearTimeout(retryT); connect(false); } });
setInterval(() => { if (room && !wantClose) { LS.set('rejoin', { code: room, at: Date.now() }); send({ type: 'ping', t: Date.now() }); } }, 5000);
$('reconnQuit').onclick = () => { $('reconn').classList.remove('on'); leaveRoom(); };

function leaveRoom(silent) {
  wantClose = true; clearTimeout(retryT); dropAt = 0;
  if (!silent) send({ type: 'leave' });
  setTimeout(() => { if (ws) { try { ws.close(); } catch (e) {} ws = null; } }, silent ? 0 : 150);
  room = null; lobby = null; LS.set('rejoin', null);
  endGame();
  $('reconn').classList.remove('on');
  show('sTitle');
}

function onMsg(m) {
  switch (m.type) {
    case 'hello':
      if (m.pv !== PROTO) { LS.set('rejoin', { code: room, at: Date.now() }); location.reload(); return; }
      dropAt = 0; $('reconn').classList.remove('on');
      modal('mdCode', false);
      // 내가 저장해 둔 엄마 모습을 미리 알려 둔다 (엄마가 되면 바로 쓰임)
      send({ type: 'look', v: loadLook() });
      if (!game) { $('lChat').textContent = ''; show('sLobby'); bgm('title'); }
      break;
    case 'err':
      wantClose = true; LS.set('rejoin', null);
      if (onErrCb) { onErrCb(m.msg, m.k); onErrCb = null; }
      else toast(m.msg, 3500);
      if (cur === 'sLobby' || game) { room = null; endGame(); show('sTitle'); }
      break;
    case 'lobby': lobby = m; drawLobby(); if (game) game.onLobby(m); break;
    case 'chat': addChat(m); if (game) game.onChat(m); break;
    case 'start':
      endGame();
      $('gameRoot').classList.add('on');
      game = new Game({ root: $('gameRoot'), net, start: m, settings: ST, lobby, onQuit: () => leaveRoom() });
      if (isPhone && ST.full && fsEl()) lockLand(); // 이미 전체화면이면 바로 가로로
      break;
    case 'back': endGame(); show('sLobby'); bgm('title'); break;
    case 'pong': break;
    default: if (game) game.onMsg(m);
  }
}
function endGame() { unlockLand(); if (game) { game.destroy(); game = null; } $('gameRoot').classList.remove('on'); $('gameRoot').textContent = ''; }

// ───────── 대기실 ─────────
for (let i = 3; i <= CFG.MAX_PLAYERS; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i + '명'; $('sMax').append(o); }
$('lLeave').onclick = () => { S.click(); leaveRoom(); };
$('lCode').onclick = () => { if (!lobby) return; navigator.clipboard && navigator.clipboard.writeText(lobby.code).then(() => toast('방 코드를 복사했어요.'), () => {}); };
$('lReady').onclick = () => { S.click(); const me = lobby && lobby.players.find(p => p.id === myId); send({ type: 'ready', v: !(me && me.ready) }); };
$('lWant').onclick = () => { S.click(); const me = lobby && lobby.players.find(p => p.id === myId); send({ type: 'want', v: !(me && me.want) }); };
$('lStart').onclick = () => { S.click(); send({ type: 'start' }); };
$('sMap').onchange = () => send({ type: 'set', map: $('sMap').value });
$('sMoms').onchange = () => send({ type: 'set', moms: +$('sMoms').value });
$('sMax').onchange = () => send({ type: 'set', max: +$('sMax').value });
$('sPub').onchange = () => send({ type: 'set', pub: $('sPub').checked });
const MODES = [['mBlink', 'blink', '👀'], ['mBreath', 'breath', '😮‍💨'], ['mSqFast', 'sqFast', '📢'], ['mFzLimit', 'fzLimit', '🧊']];
for (const [id, k] of MODES) $(id).onchange = () => send({ type: 'set', [k]: $(id).checked });
$('sName').onchange = () => send({ type: 'set', name: $('sName').value });
$('lChatF').onsubmit = e => { e.preventDefault(); const t = $('lChatIn').value.trim(); if (!t) return; send({ type: 'chat', text: t }); $('lChatIn').value = ''; };

function drawLobby() {
  const L = lobby; if (!L) return;
  const isHost = L.host === myId, s = L.settings;
  $('lName').textContent = '🏠 ' + (s.name || '이름 없는 집');
  $('lCode').textContent = L.code;
  $('lCount').textContent = `${L.players.length} / ${s.max}`;
  $('lMapInfo').textContent = `${MAPN[s.map]} · 엄마 ${s.moms}명 · ${s.pub ? '공개방' : '비공개방'}${MODES.some(m => s[m[1]]) ? ' · ' + MODES.filter(m => s[m[1]]).map(m => m[2]).join('') : ''}`;
  const box = $('lPlayers'); box.textContent = '';
  for (const p of L.players) {
    const d = document.createElement('div'); d.className = 'pl';
    const n = document.createElement('span'); n.className = 'n'; n.textContent = (p.dev === 'phone' ? '📱 ' : '') + p.name + (p.id === myId ? ' (나)' : ''); d.append(n);
    const tag = (c, t) => { const s = document.createElement('span'); s.className = 'tag ' + c; s.textContent = t; d.append(s); };
    if (p.id === L.host) tag('h', '방장');
    if (!p.on) tag('o', '끊김');
    if (p.want) tag('w', '엄마 지원');
    if (p.ready && p.id !== L.host) tag('r', '준비');
    if (isHost && p.id !== myId) {
      const ops = document.createElement('span'); ops.className = 'ops';
      const b1 = document.createElement('button'); b1.textContent = '방장 넘기기'; b1.onclick = () => { if (confirm(`${p.name} 님에게 방장을 넘길까요?`)) send({ type: 'host', id: p.id }); };
      const b2 = document.createElement('button'); b2.textContent = '내보내기'; b2.onclick = () => { if (confirm(`${p.name} 님을 내보낼까요?`)) send({ type: 'kick', id: p.id }); };
      ops.append(b1, b2); d.append(ops);
    }
    box.append(d);
  }
  const me = L.players.find(p => p.id === myId) || {};
  $('lReady').hidden = isHost;
  $('lReady').textContent = me.ready ? '준비 취소' : '준비!';
  $('lReady').classList.toggle('mt', !me.ready);
  $('lWant').textContent = me.want ? '🧹 엄마 지원 중' : '🧹 엄마 지원';
  $('lWant').classList.toggle('pk', !!me.want);
  $('lStart').hidden = !isHost;
  // 시작 못 하는 이유
  let why = '';
  if (L.players.length < 2) why = '두 명 이상 있어야 시작할 수 있어요.';
  else if (L.players.length <= s.moms) why = '엄마 수보다 장난감이 많아야 해요.';
  else if (L.players.some(p => !p.on)) why = '연결이 끊긴 사람이 있어요.';
  else { const nr = L.players.filter(p => p.id !== L.host && !p.ready); if (nr.length) why = `준비 기다리는 중: ${nr.map(p => p.name).join(', ')}`; }
  $('lStart').disabled = !!why;
  $('lWhy').textContent = isHost ? why : (me.ready ? '방장이 시작하길 기다리는 중…' : '준비를 눌러 주세요!');
  // 설정 (방장만 바꿈)
  for (const id of ['sMap', 'sMoms', 'sMax', 'sName', 'sPub', 'mBlink', 'mBreath', 'mSqFast', 'mFzLimit']) $(id).disabled = !isHost;
  for (const [id, k] of MODES) $(id).checked = !!s[k];
  $('sMap').value = s.map; $('sMoms').value = s.moms; $('sMax').value = s.max; $('sPub').checked = !!s.pub;
  if (document.activeElement !== $('sName')) $('sName').value = s.name || '';
  $('lSetHint').textContent = isHost ? '' : '(방장만 바꿀 수 있어요)';
}
function addChat(m) {
  const box = $('lChat'), d = document.createElement('div');
  if (m.sys) { d.className = 's'; d.textContent = '· ' + m.text; }
  else { const b = document.createElement('b'); b.textContent = m.name + ': '; d.append(b, document.createTextNode(m.text)); }
  box.append(d); while (box.children.length > 120) box.firstChild.remove();
  box.scrollTop = box.scrollHeight;
}

// ───────── 엄마 꾸미기 ─────────
let editor = null;
function openEditor() {
  show('sEdit');
  editor = new Editor($('sEdit'), { mode: 'menu', onClose: () => { editor.destroy(); editor = null; $('sEdit').textContent = ''; show('sTitle'); if (room) send({ type: 'look', v: loadLook() }); } });
}

// ───────── 혼자 연습 ─────────
const PR = Object.assign({ map: 'room', role: 'toy', bots: 4, diff: 'easy', modes: {} }, LS.get('prac', {}));
const PMODES = [['pBlink', 'blink'], ['pBreath', 'breath'], ['pSqFast', 'sqFast'], ['pFzLimit', 'fzLimit']];
function pracSync() {
  const role = (document.querySelector('input[name=pRole]:checked') || {}).value || 'toy';
  $('pMomOpt').style.display = role === 'mom' ? '' : 'none';
  $('pRoleHint').textContent = role === 'mom' ? '봇 장난감들이 숨어 있어요. 4분 안에 다 찾아 봐요!' : '자유롭게 변신해 보고, R(👀 엄마 시점)로 찾는 쪽에서 어떻게 보이는지 확인해요.';
}
function openPrac() {
  $('pMap').value = PR.map; $('pBots').value = String(PR.bots); $('pDiff').value = PR.diff;
  for (const r of document.querySelectorAll('input[name=pRole]')) { r.checked = r.value === PR.role; r.onchange = pracSync; }
  for (const [id, k] of PMODES) $(id).checked = !!PR.modes[k];
  pracSync(); modal('mdPrac');
}
$('pGo').onclick = () => {
  PR.map = $('pMap').value; PR.role = (document.querySelector('input[name=pRole]:checked') || {}).value || 'toy';
  PR.bots = +$('pBots').value; PR.diff = $('pDiff').value;
  PR.modes = {}; for (const [id, k] of PMODES) PR.modes[k] = $(id).checked;
  LS.set('prac', PR); modal('mdPrac', false); S.click(); startPractice(PR);
};
function startPractice(o) {
  endGame(); $('gameRoot').classList.add('on'); bgm(null);
  const opt = JSON.parse(JSON.stringify(o));
  game = new Game({ root: $('gameRoot'), practice: opt, settings: ST, start: null, net: null, onQuit: () => { endGame(); show('sTitle'); }, onRetry: () => startPractice(opt) });
  if (isPhone && ST.full && fsEl()) lockLand(); // 이미 전체화면이면 바로 가로로
}

// ───────── 설정 ─────────
const KEYS_PC = [['WASD', '움직이기'], ['마우스', '둘러보기'], ['E', '장난감: 보고 있는 물건으로 변신 / 상자 앞에서 꾹 = 구출'], ['Q', '장난감: 원래 모습으로'], ['Shift', '장난감: 얼음 (안 흔들려요)'], ['G', '장난감: 여기 봐! 손짓 (장난감끼리만)'], ['클릭', '엄마: 치우기'], ['Space', '엄마: 청소기 (1분에 한 번)'], ['Tab', '내 역할 설명'], ['Enter', '채팅 (같은 편끼리)'], ['Esc', '마우스 풀기 / 메뉴']];
$('keysBox').innerHTML = KEYS_PC.map(([k, v]) => `<div><b>${k}</b>${v}</div>`).join('') + '<div style="margin-top:6px">📱 폰: 왼쪽 드래그 = 이동, 오른쪽 드래그 = 둘러보기, 버튼으로 나머지</div>';
function openSettings() {
  $('oName').value = name();
  const sl = (id, k, fmt) => { const el = $(id); el.value = ST[k]; const v = $(id + 'V'); const up = () => { ST[k] = +el.value; v.textContent = fmt(ST[k]); setVol(ST.sfx, ST.bgm); LS.set('set', ST); }; el.oninput = up; up(); };
  sl('oMouse', 'mouse', v => v.toFixed(2)); sl('oTouch', 'touch', v => v.toFixed(2)); sl('oBright', 'bright', v => Math.round(v * 100) + '%');
  sl('oSfx', 'sfx', v => Math.round(v * 100) + '%'); sl('oBgm', 'bgm', v => Math.round(v * 100) + '%');
  $('oShake').checked = ST.noShake; $('oShake').onchange = () => { ST.noShake = $('oShake').checked; LS.set('set', ST); };
  $('oLow').checked = ST.low; $('oLow').onchange = () => { ST.low = $('oLow').checked; LS.set('set', ST); };
  if (isPhone) { $('oFullW').style.display = ''; $('oFull').checked = ST.full; $('oFull').onchange = () => { if ($('oFull').checked !== !!fsEl()) toggleFull(); else { ST.full = $('oFull').checked; LS.set('set', ST); } }; }
  modal('mdSet');
}
$('oDone').onclick = () => {
  const v = okName($('oName').value);
  if (v && v !== name()) { LS.set('name', v); meTag(); if (room) toast('이름은 다음 방부터 바뀌어요.'); }
  modal('mdSet', false); S.click();
};
// 게임 안에서도 설정 열기
export function openSettingsFromGame() { openSettings(); }
window.__mcOpenSettings = openSettings;

// 테스트·디버그용
window.__mc = { get game() { return game; }, get lobby() { return lobby; }, send };

// ───────── 시작 ─────────
meTag();
if (!name()) needName();
// 새로고침/업데이트 직후 1분 안이면 그 방으로 바로
const rj = LS.get('rejoin', null);
if (rj && rj.code && Date.now() - rj.at < 60000 && name()) { join(rj.code, false, { onErr: m => toast(m) }); }
