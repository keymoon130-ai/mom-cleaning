// 엄마의 대청소날~ — 서버·화면 공용 (맵, 물건, 규칙 숫자)
export const PROTO = 3;

export const CFG = {
  MAX_PLAYERS: 10,
  PREP: 30,          // 준비 (엄마 단장 + 장난감 숨기)
  HUNT: 240,         // 청소 4분
  GRAB_RANGE: 2.4,   // 엄마 손 닿는 거리 (칸)
  STAMINA: 5,        // 헛손질 가능 횟수
  STAM_REGEN: 8,     // 몇 초마다 1 회복
  REST: 3,           // 기진맥진 쉬는 시간
  VAC_CD: 60,        // 청소기 쿨타임
  VAC_R: 4.5,        // 청소기 범위
  SQUEAK: 30,        // 삑! 주기
  RESCUE: 3,         // 상자 구출 꾹 누르기
  RESCUE_R: 1.4,
  FORM_CD: 2,        // 변신 쿨타임
  FORM_R: 2.2,       // 변신 가능한 거리
  GRACE: 3,          // 구출 직후 무적
  RADIUS: 0.22,
  SPEED: { mom: 3.2, toy: 3.6, s: 3.9, m: 3.2, l: 2.5 },
  MOM_OFF_SWAP: 30,  // 엄마가 이만큼 끊겨 있으면 장난감 하나가 엄마가 된다
  LOOK_W: 32, LOOK_H: 56
};

// 숨을 수 있는 물건. s 작은 거(빠름) · m 중간 · l 큰 거(느림). h = 세계 높이(벽 = 1)
export const OBJ = {
  sock:    { n: '양말', s: 's', h: .2 },
  cup:     { n: '컵', s: 's', h: .2 },
  book:    { n: '책', s: 's', h: .2 },
  ball:    { n: '공', s: 's', h: .22 },
  block:   { n: '블록', s: 's', h: .2 },
  apple:   { n: '사과', s: 's', h: .18 },
  milk:    { n: '우유팩', s: 's', h: .24 },
  slipper: { n: '슬리퍼', s: 's', h: .18 },
  roll:    { n: '휴지', s: 's', h: .2 },
  duck:    { n: '고무오리', s: 's', h: .2 },
  cushion: { n: '쿠션', s: 'm', h: .38 },
  bin:     { n: '휴지통', s: 'm', h: .42 },
  plant:   { n: '화분', s: 'm', h: .48 },
  pot:     { n: '냄비', s: 'm', h: .36 },
  kettle:  { n: '주전자', s: 'm', h: .4 },
  box:     { n: '상자', s: 'm', h: .42 },
  cooker:  { n: '밥솥', s: 'm', h: .4 },
  bucket:  { n: '양동이', s: 'm', h: .4 },
  radio:   { n: '라디오', s: 'm', h: .36 },
  basket:  { n: '빨래바구니', s: 'l', h: .62 },
  chair:   { n: '의자', s: 'l', h: .8 },
  lamp:    { n: '스탠드', s: 'l', h: .9 },
  rice:    { n: '쌀포대', s: 'l', h: .6 },
  trunk:   { n: '트렁크', s: 'l', h: .62 },
  fan:     { n: '선풍기', s: 'l', h: .85 },
  tv:      { n: '옛날TV', s: 'l', h: .6 }
};
// 숨을 수 없는 큰 가구 (부딪힘). w = 가로, d = 깊이 (칸), snap = 가까운 벽에 등을 붙인다
// under = 밑 공간 높이: 작은 물건(s)으로 변신한 장난감만 밑으로 들어갈 수 있다 (옆이 뚫려 있어서 다 보임)
export const DECOR = {
  bed:      { n: '침대', w: 1.0, d: 1.9, snap: 1, under: .3 },
  shelf:    { n: '책장', w: .9, d: .35, snap: 1 },
  fridge:   { n: '냉장고', w: .72, d: .7, snap: 1 },
  table:    { n: '식탁', w: 1.2, d: .8, under: .68 },
  cloth:    { n: '식탁보 식탁', w: 1.2, d: .8, under: .5 },
  sofa:     { n: '소파', w: 1.6, d: .8, snap: 1 },
  washer:   { n: '세탁기', w: .66, d: .66, snap: 1 },
  wardrobe: { n: '옷장', w: 1.1, d: .6, snap: 1 },
  tub:      { n: '욕조', w: 1.6, d: .8, snap: 1 },
  beam:     { n: '기둥', w: .3, d: .3 },
  desk:     { n: '책상', w: 1.1, d: .6, snap: 1, under: .65 },
  toyshelf: { n: '장난감 선반', w: 1.0, d: .4, snap: 1 },
  dryer:    { n: '빨래 건조대', w: 1.2, d: .5 },
  blanket:  { n: '이불 더미', w: .9, d: .9 },
  curtain:  { n: '커튼', w: 1.2, d: .15, snap: 1 },
  bear:     { n: '큰 곰인형', w: .6, d: .5, snap: 1 },
  sink:     { n: '싱크대', w: 1.6, d: .6, snap: 1 },
  shoes:    { n: '신발장', w: 1.0, d: .35, snap: 1 },
  bigplant: { n: '큰 화분', w: .5, d: .5 },
  boxpile:  { n: '상자 더미', w: 1.0, d: .8, snap: 1 },
  tarp:     { n: '천 덮인 짐', w: 1.2, d: 1.0 },
  chairs:   { n: '쌓인 의자', w: .6, d: .6 },
  oldsofa:  { n: '낡은 소파', w: 1.5, d: .75, snap: 1 },
  rack:     { n: '옷걸이 행거', w: 1.2, d: .5, snap: 1 },
  mirror:   { n: '큰 거울', w: .7, d: .2, snap: 1 }
};
export const WALL_H = 2.2;

// '#' 벽 · '.' 바닥 · '+' 문(바닥, 물건 안 놓임)
export const MAPS = {
  room: {
    name: '아이 방', theme: 'room',
    grid: [
      '############################',
      '#..........#.......#.......#',
      '#..........#.......#.......#',
      '#..........+.......#.......#',
      '#..........#.......+.......#',
      '#..........#.......#.......#',
      '#####+######.......#####+###',
      '#..........#####+###.......#',
      '#..........................#',
      '#..........................#',
      '#####+#######+#######+######',
      '#.......#..........#.......#',
      '#.......#..........#.......#',
      '#.......+..........#.......#',
      '#.......#..........+.......#',
      '#.......#..........#.......#',
      '#.......#..........#.......#',
      '############################'
    ],
    rooms: [[1, 1, 10, 5, '아이 방'], [12, 1, 18, 6, '놀이방'], [20, 1, 26, 5, '욕실'], [1, 7, 26, 9, '거실'], [1, 11, 7, 16, '안방'], [9, 11, 18, 16, '공부방'], [20, 11, 26, 16, '옷방']],
    box: [13.5, 8.5], mom: [3.5, 8.5], toy: [22.5, 8.5],
    decor: [['bed', 2, 2], ['shelf', 9.6, 1.6], ['tub', 25.4, 1.7], ['sofa', 9, 7.5], ['bed', 2.2, 15.2], ['wardrobe', 6.5, 11.6], ['table', 13.5, 13.5], ['shelf', 17.5, 11.5], ['wardrobe', 25.5, 15.4], ['washer', 21, 1.6],
      ['desk', 7, 1.4], ['toyshelf', 1.4, 4.5], ['blanket', 4.6, 4.1], ['bear', 9.6, 4.6], ['curtain', 4.5, 1.1],
      ['toyshelf', 15, 1.3], ['dryer', 14.5, 4.2], ['boxpile', 12.6, 5.5], ['dryer', 23, 4],
      ['bigplant', 1.5, 9.3], ['shoes', 26.4, 8.5], ['curtain', 21.5, 7.1],
      ['mirror', 1.1, 11.8], ['curtain', 4.2, 16.9], ['blanket', 5.6, 14.6],
      ['desk', 10.6, 16.5], ['desk', 15.6, 16.5], ['bigplant', 9.5, 11.5], ['boxpile', 17.5, 15.8],
      ['rack', 24.5, 11.3], ['rack', 20.6, 15.9], ['mirror', 26.4, 12.5], ['shoes', 23.5, 16.6]],
    objs: { block: 5, ball: 4, sock: 6, book: 4, duck: 3, roll: 3, cushion: 4, bin: 2, box: 4, plant: 2, basket: 3, chair: 3, lamp: 2, radio: 2, bucket: 2, slipper: 3, cup: 3 }
  },
  kitchen: {
    name: '부엌', theme: 'kitchen',
    grid: [
      '##########################',
      '#.........#..............#',
      '#.........#..............#',
      '#.........+..............#',
      '#.........#..............#',
      '#####+#####..............#',
      '#.........######+#########',
      '#........................#',
      '#........................#',
      '#..........#####+######+##',
      '######+#####......#......#',
      '#..........#......#......#',
      '#..........+......+......#',
      '#..........#......#......#',
      '##########################'
    ],
    rooms: [[1, 1, 9, 4, '다용도실'], [11, 1, 24, 5, '부엌'], [1, 6, 24, 8, '거실'], [1, 11, 10, 13, '식료품 창고'], [12, 10, 17, 13, '식당'], [19, 10, 24, 13, '베란다']],
    box: [12.5, 7.5], mom: [3.5, 7.5], toy: [21.5, 7.5],
    decor: [['washer', 1.6, 1.6], ['washer', 2.8, 1.6], ['fridge', 23.5, 1.6], ['cloth', 17, 3.2], ['sofa', 6, 6.7], ['shelf', 1.6, 11.5], ['shelf', 9.5, 11.5], ['table', 14.5, 11.8],
      ['dryer', 6, 2.6], ['boxpile', 8.6, 1.5], ['shoes', 1.3, 3.9],
      ['sink', 13, 1.3], ['sink', 20.3, 1.3], ['bigplant', 24.4, 4.6], ['table', 13.5, 4.3],
      ['bigplant', 1.4, 8.5], ['shoes', 24.4, 7.6], ['bear', 9.5, 9.5], ['curtain', 12.5, 8.9],
      ['bigplant', 17.4, 10.5], ['boxpile', 5.5, 13.4], ['blanket', 3.2, 12.3],
      ['dryer', 21.5, 11.5], ['bigplant', 24.4, 13.4], ['boxpile', 20, 13.4]],
    objs: { cup: 6, apple: 4, milk: 4, pot: 4, kettle: 3, cooker: 2, rice: 3, chair: 4, bin: 2, bucket: 2, roll: 3, box: 4, basket: 2, plant: 2, cushion: 2, sock: 3, slipper: 3 }
  },
  attic: {
    name: '다락방', theme: 'attic',
    grid: [
      '##########################',
      '#............#...........#',
      '#............#...........#',
      '#............+...........#',
      '#............#...........#',
      '#....#####+###...........#',
      '#....#.........#####+#####',
      '#....+.........#.........#',
      '#....#.........+.........#',
      '######.........#.........#',
      '#......................#.#',
      '#......................+.#',
      '##########################'
    ],
    rooms: [[1, 1, 12, 4, '먼지 구석'], [14, 1, 24, 5, '창고'], [6, 6, 14, 11, '다락 한가운데'], [1, 6, 4, 8, '좁은 틈'], [16, 7, 24, 9, '옛날 짐'], [1, 10, 22, 11, '복도']],
    box: [10, 8.5], mom: [3, 10.5], toy: [20, 3],
    decor: [['beam', 4, 3], ['beam', 9, 2.5], ['beam', 18, 3], ['beam', 8.5, 7.5], ['beam', 12.5, 9.8], ['wardrobe', 1.6, 1.6], ['shelf', 24.4, 1.6], ['shelf', 23.6, 7.6],
      ['tarp', 6.5, 2], ['chairs', 11.5, 1.5], ['mirror', 12.6, 4.4], ['oldsofa', 8, 4.4],
      ['rack', 16, 1.3], ['tarp', 22, 1.6], ['boxpile', 24.3, 4.5],
      ['chairs', 1.5, 8.4],
      ['tarp', 11.6, 7.2], ['oldsofa', 6.6, 9.1],
      ['tarp', 19.2, 8.1], ['boxpile', 22.6, 7.3],
      ['rack', 1.3, 10.9], ['chairs', 18, 11.4], ['blanket', 13.5, 11.3]],
    objs: { trunk: 4, box: 8, fan: 2, lamp: 2, tv: 2, radio: 3, book: 5, basket: 2, chair: 3, bucket: 2, roll: 2, ball: 3, block: 3, sock: 3, plant: 1, cushion: 3 }
  }
};
export const MAP_IDS = Object.keys(MAPS);

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function solid(M, x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const row = M.grid[zi]; if (!row) return true;
  const c = row[xi]; return c === undefined || c === '#';
}

// 같은 시드면 모두에게 같은 물건 배치
export function genWorld(mapId, seed) {
  const M = MAPS[mapId];
  const R = rng(seed);
  const W = M.grid[0].length, H = M.grid.length;
  const types = []; for (const [k, n] of Object.entries(M.objs)) for (let i = 0; i < n; i++) types.push(k);
  const objs = [];
  const far = (x, z, d) => Math.hypot(x - M.box[0], z - M.box[1]) > d && Math.hypot(x - M.mom[0], z - M.mom[1]) > 1.2 && Math.hypot(x - M.toy[0], z - M.toy[1]) > 1.2;
  const dec = M.decor.map(([t, x, z]) => placeDecor(M, t, x, z));
  const ok = (x, z, r, small) => {
    for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (solid(M, x + dx, z + dz)) return false;
    if (M.grid[Math.floor(z)][Math.floor(x)] === '+') return false;
    for (const d of dec) {
      const inX = Math.abs(x - d.x) < d.hw + .3, inZ = Math.abs(z - d.z) < d.hd + .3;
      if (!inX || !inZ) continue;
      // 작은 물건은 침대·식탁·책상 밑에도 놓인다 (다리 피해서 안쪽에)
      if (small && DECOR[d.t].under && Math.abs(x - d.x) < d.hw - .15 && Math.abs(z - d.z) < d.hd - .15) continue;
      return false;
    }
    for (const o of objs) if (Math.hypot(x - o.x, z - o.z) < .75) return false;
    return far(x, z, 1.6);
  };
  // 벽 쪽에 붙는 걸 좋아한다
  const wallish = (x, z) => solid(M, x + .6, z) || solid(M, x - .6, z) || solid(M, x, z + .6) || solid(M, x, z - .6);
  for (const t of types) {
    const small = OBJ[t].s === 's';
    for (let tries = 0; tries < 120; tries++) {
      let x, z;
      // 3분의 1은 가구 근처(또는 밑)에 모인다
      if (tries < 40 && R() < .35) { const d = dec[R() * dec.length | 0]; x = d.x + (R() - .5) * (d.hw * 2 + 1.2); z = d.z + (R() - .5) * (d.hd * 2 + 1.2); }
      else { x = 1 + R() * (W - 2); z = 1 + R() * (H - 2); }
      if (x < 1 || z < 1 || x > W - 1 || z > H - 1 || !ok(x, z, .3, small)) continue;
      if (!wallish(x, z) && R() < .45) continue;
      objs.push({ t, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 });
      break;
    }
  }
  // 침대·식탁·책상 밑에도 작은 물건 하나씩 (밑에 숨은 장난감이 너무 튀지 않게)
  const smalls = Object.keys(M.objs).filter(k => OBJ[k].s === 's');
  for (const d of dec) {
    if (!DECOR[d.t].under || !smalls.length || R() < .25) continue;
    const t = smalls[R() * smalls.length | 0];
    const x = d.x + (R() - .5) * Math.max(0, d.hw * 2 - .5), z = d.z + (R() - .5) * Math.max(0, d.hd * 2 - .5);
    if (objs.some(o => Math.hypot(x - o.x, z - o.z) < .4)) continue;
    objs.push({ t, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 });
  }
  return { M, W, H, objs, decor: dec };
}

// 가장 가까운 벽(1.2칸 안)에 등을 붙인다. rot: 모델의 등(-z)이 벽을 보게 하는 Y 회전
export function placeDecor(M, t, x, z) {
  const D = DECOR[t];
  const out = { t, x, z, rot: 0, hw: D.w / 2, hd: D.d / 2 };
  if (!D.snap) return out;
  let best = null;
  for (const [dx, dz, rot] of [[0, -1, 0], [0, 1, Math.PI], [-1, 0, Math.PI / 2], [1, 0, -Math.PI / 2]]) {
    let t2 = 0; while (t2 < 1.4 && !solid(M, x + dx * t2, z + dz * t2)) t2 += .02;
    if (t2 < 1.4 && (!best || t2 < best.t)) best = { t: t2, dx, dz, rot };
  }
  if (!best) return out;
  const side = best.dx ? D.w : D.d; // 회전 후 벽 쪽 두께 = 깊이
  const half = D.d / 2;
  out.rot = best.rot;
  if (best.dx) { out.hw = D.d / 2; out.hd = D.w / 2; out.x = Math.round((x + best.dx * best.t - best.dx * (half + .02)) * 100) / 100; }
  else { out.z = Math.round((z + best.dz * best.t - best.dz * (half + .02)) * 100) / 100; }
  void side;
  return out;
}

export function roomName(M, x, z) {
  for (const [x0, z0, x1, z1, n] of M.rooms) if (x >= x0 && x < x1 + 1 && z >= z0 && z < z1 + 1) return n;
  return '어딘가';
}

// 벽·가구에 막히는 이동 (축 따로)
// small = 작은 물건으로 변신한 장난감 (침대·식탁·책상 밑을 지나갈 수 있다)
export function collide(W, x, z, nx, nz, r = CFG.RADIUS, small = false) {
  const M = W.M;
  const free = (px, pz) => {
    if (solid(M, px - r, pz - r) || solid(M, px + r, pz - r) || solid(M, px - r, pz + r) || solid(M, px + r, pz + r)) return false;
    for (const d of W.decor) { if (small && DECOR[d.t].under) continue; if (Math.abs(px - d.x) < d.hw + r && Math.abs(pz - d.z) < d.hd + r) return false; }
    return true;
  };
  let rx = x, rz = z;
  if (free(nx, rz)) rx = nx;
  if (free(rx, nz)) rz = nz;
  return [rx, rz];
}

export function speedOf(role, form) {
  if (role === 'mom') return CFG.SPEED.mom;
  if (!form) return CFG.SPEED.toy;
  return CFG.SPEED[OBJ[form] ? OBJ[form].s : 'm'];
}

// 엄마 모습: 팔레트(최대 64색) + 32x56 글자 (팔레트 번호, '.' = 투명)
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const LOOK_CH = B64;
export function lookValid(v) {
  if (!v || typeof v !== 'object' || !Array.isArray(v.p) || typeof v.d !== 'string') return false;
  if (v.p.length > 64 || v.d.length !== CFG.LOOK_W * CFG.LOOK_H) return false;
  for (const c of v.p) if (typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)) return false;
  for (let i = 0; i < v.d.length; i++) { const ch = v.d[i]; if (ch !== '.' && (B64.indexOf(ch) < 0 || B64.indexOf(ch) >= v.p.length)) return false; }
  return true;
}
