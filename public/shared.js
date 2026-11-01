// 엄마의 대청소날~ — 서버·화면 공용 (집 지도, 충돌, 게임 규칙)
// 쥐 탈출 버전: 쥐는 열쇠 3개를 찾아 현관문에 꽂고 탈출, 엄마는 막는다.
export const PROTO = 6;
// 밸런스 버전: 규칙 숫자(시간·속도·쿨 등)를 바꾸면 +1 → 통계 페이지에서 버전별로 나눠 볼 수 있음
export const BAL = 13;

export const CFG = {
  MAX_PLAYERS: 10,
  PREP: 30,          // 준비 (엄마 단장 + 쥐 흩어지기)
  HUNT: 240,         // 4분
  GRAB_REACH: 1.9,   // 엄마 눈 → 쥐 거리 (3D)
  OPEN_REACH: 2.1,   // 엄마 눈 → 숨는 곳 문 거리
  STAMINA: 5,        // 헛손질 가능 횟수
  STAM_REGEN: 8,     // 몇 초마다 1 회복
  REST: 3,           // 기진맥진 쉬는 시간
  VAC_CD: 60,        // 청소기 쿨타임
  VAC_R: 3,          // 청소기 범위
  RESCUE: 3,         // 쥐장 구출 꾹 누르기
  RESCUE_R: .9,
  GRACE: 3,          // 구출 직후 무적
  HIDE_SQ: 15,       // 숨는 곳에 이만큼 있으면 찍찍!
  HIDE_SQ_EVERY: 5,  // 그 뒤로 몇 초마다
  HOLE_BLOCK: 20,    // 쥐구멍 한 번 쓰면 먼지로 막히는 시간
  HEAVE: 2,          // 무거운 서랍: 쥐 2마리가 같이 E 꾹 (초)
  HEAVE_SOLO: 4,     // 쥐가 1마리뿐인 판: 혼자 꾹 (초)
  KEYS: 3,
  SPEED: { mom: 3.4, mouse: 4.0, mouseKey: 3.0 },
  MOUSE: { r: .06, h: .11, step: .05, jump: .55 },
  MOM: { r: .25, h: 1.7, step: .26, eye: 1.45 },
  G: 14,
  MOM_OFF_SWAP: 30,  // 엄마가 이만큼 끊겨 있으면 쥐 하나가 엄마가 된다
  LOOK_W: 32, LOOK_H: 56
};
export const JUMP_V = Math.sqrt(2 * CFG.G * CFG.MOUSE.jump);
export const WALL_H = 2.2;      // 1층 천장
export const ATTIC_Y = 2.3;     // 다락방 바닥
export const ATTIC_TOP = 4.0;   // 다락방 지붕

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// ───────── 가구 (부품 = 상자·원기둥·공. 등 = -z, 앞 = +z, y0 = 바닥에서 높이) ─────────
// ['b', x, y0, z, w, h, d, 색, 단단함]  ['c', x, y0, z, 반지름, h, 색, 단단함]  ['s', x, y0, z, rx, ry, rz, 색, 단단함]
// spots: 숨는 곳 { x, y, z(앞면), w, h, k: 'door' 문 · 'drawer' 서랍 · 'lift' 통째로 들어 올림 }
const WH = 0xf4f7fa, WOOD = 0xc98a55, BR = 0x8a522c, DK = 0x3a2a22, SV = 0xbfc8d0, GY = 0x9aa6b2, GR = 0x3fbf6a, YL = 0xffd34d, PK = 0xff7fae, BL = 0x5fb8ff, RD = 0xe0503c;
const legs4 = (x, z, w, h, col, y0 = 0) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => ['b', a * x, y0, b * z, w, h, w, col, 1]);
export const FURN = {
  fridge: { n: '냉장고', parts: [['b', 0, 0, 0, .75, 1.8, .7, WH, 1], ['b', 0, 1.17, .352, .74, .012, .01, 0xb8c2cc, 0], ['b', .3, 1.28, .365, .04, .3, .03, SV, 0], ['b', .3, .62, .365, .04, .38, .03, SV, 0], ['b', -.18, .95, .356, .08, .08, .01, YL, 0], ['b', -.05, 1.45, .356, .07, .06, .01, PK, 0]] },
  counter: { n: '싱크대', parts: [['b', 0, 0, 0, 2.4, .86, .6, WH, 1], ['b', 0, .86, 0, 2.4, .05, .6, GY, 1], ['b', -.15, .906, .02, .56, .012, .36, 0x5a6670, 0], ['c', -.15, .91, -.2, .02, .26, SV, 0], ['b', -.15, 1.15, -.13, .03, .03, .16, SV, 0], ['b', .45, .91, .05, .26, .02, .18, WOOD, 0]],
    spots: [{ x: -.6, y: .06, z: .3, w: .92, h: .72, k: 'door' }, { x: .6, y: .06, z: .3, w: .92, h: .72, k: 'door' }] },
  upcab: { n: '찬장', parts: [['b', 0, 1.45, 0, 1.6, .55, .35, 0xd9b48a, 1]],
    spots: [{ x: -.4, y: 1.47, z: .175, w: .76, h: .5, k: 'door' }, { x: .4, y: 1.47, z: .175, w: .76, h: .5, k: 'door' }] },
  cooker: { n: '밥솥', parts: [['c', 0, 0, 0, .15, .26, WH, 1], ['b', 0, .1, .145, .1, .06, .02, 0x2a3a48, 0], ['c', 0, .02, 0, .152, .03, PK, 0]] },
  jars: { n: '양념통', parts: [['b', 0, 0, 0, .34, .02, .16, WOOD, 1], ['c', -.11, .02, 0, .05, .2, 0xff9a3c, 1], ['c', 0, .02, 0, .05, .2, 0xffe0b0, 1], ['c', .11, .02, 0, .05, .2, 0x9be15d, 1]] },
  chair: { n: '의자', parts: [['b', 0, .42, 0, .42, .04, .42, WOOD, 1], ...legs4(.18, .18, .04, .42, BR), ['b', 0, .46, -.19, .4, .45, .04, WOOD, 1]] },
  table: { n: '식탁', parts: [['b', 0, .7, 0, 1.2, .05, .8, WOOD, 1], ...legs4(.54, .34, .06, .7, BR), ['b', .2, .75, 0, .3, .01, .3, WH, 0], ['c', -.25, .75, .1, .06, .12, BL, 0]] },
  bed: { n: '침대', parts: [...legs4(.45, .9, .08, .28, BR), ['b', 0, .28, 0, 1, .12, 1.9, WOOD, 1], ['b', 0, .4, 0, .96, .12, 1.86, WH, 1], ['b', 0, .52, .3, .98, .03, 1.25, BL, 0], ['b', 0, .52, -.7, .6, .08, .3, WH, 0], ['b', 0, .28, -.93, 1, .62, .06, BR, 1]] },
  sofa: { n: '소파', parts: [...legs4(.8, .35, .06, .14, DK), ['b', 0, .14, 0, 1.8, .22, .85, 0x4a9a78, 1], ['b', 0, .36, .06, 1.46, .12, .7, 0x6cc8a0, 1], ['b', 0, .36, -.33, 1.8, .5, .2, 0x4a9a78, 1], ['b', -.82, .36, 0, .16, .2, .85, 0x4a9a78, 1], ['b', .82, .36, 0, .16, .2, .85, 0x4a9a78, 1], ['b', -.4, .48, -.15, .3, .25, .1, YL, 0]] },
  coffee: { n: '탁자', parts: [['b', 0, .36, 0, .9, .04, .5, WOOD, 1], ...legs4(.4, .2, .05, .36, BR), ['b', .15, .4, 0, .22, .02, .16, RD, 0]] },
  tvstand: { n: 'TV장', parts: [['b', 0, .06, 0, 1.6, .44, .45, 0xb07a4a, 1], ...legs4(.74, .18, .06, .06, DK), ['b', 0, .5, -.12, .3, .04, .16, DK, 1], ['b', 0, .54, -.12, .05, .14, .05, DK, 1], ['b', 0, .62, -.12, 1.3, .75, .06, 0x2a2a2a, 1], ['b', 0, .66, -.088, 1.22, .67, .005, 0x3a5a7a, 0]],
    spots: [{ x: -.4, y: .08, z: .225, w: .76, h: .38, k: 'door' }, { x: .4, y: .08, z: .225, w: .76, h: .38, k: 'door' }] },
  desk: { n: '컴퓨터 책상', parts: [['b', 0, .72, 0, 1.2, .04, .6, WOOD, 1], ['b', -.57, 0, -.27, .05, .72, .05, BR, 1], ['b', -.57, 0, .27, .05, .72, .05, BR, 1], ['b', .38, 0, 0, .42, .72, .58, 0xb07a4a, 1],
    ['b', -.15, .76, -.2, .64, .4, .04, DK, 1], ['b', -.15, .82, -.177, .58, .32, .005, 0x5fb8ff, 0], ['b', -.15, .76, -.15, .2, .02, .14, DK, 0], ['b', -.1, .76, .1, .44, .02, .14, 0xeeeeee, 0], ['b', -.3, 0, -.08, .2, .46, .4, 0x555555, 1]],
    spots: [{ x: .38, y: .04, z: .29, w: .38, h: .3, k: 'drawer' }, { x: .38, y: .38, z: .29, w: .38, h: .3, k: 'drawer' }] },
  ochair: { n: '회전의자', parts: [['b', 0, .02, 0, .5, .04, .08, DK, 0], ['b', 0, .02, 0, .08, .04, .5, DK, 0], ['c', 0, 0, 0, .035, .42, SV, 1], ['b', 0, .42, 0, .46, .06, .46, 0x444444, 1], ['b', 0, .48, -.21, .44, .5, .06, 0x444444, 1]] },
  chest: { n: '서랍장', parts: [['b', 0, .04, 0, .9, .92, .45, 0xe0b07a, 1], ...legs4(.4, .18, .05, .04, BR), ['c', 0, .96, 0, .08, .02, BR, 0], ['s', 0, .98, 0, .07, .12, .07, PK, 0]],
    spots: [{ x: 0, y: .07, z: .225, w: .82, h: .26, k: 'drawer' }, { x: 0, y: .37, z: .225, w: .82, h: .26, k: 'drawer' }, { x: 0, y: .67, z: .225, w: .82, h: .26, k: 'drawer' }] },
  ladder: { n: '사다리 선반', parts: [
    ['b', 0, .3, -.0, .9, .03, .44, WOOD, 1], ['b', 0, .62, -.05, .9, .03, .34, WOOD, 1], ['b', 0, .94, -.095, .9, .03, .25, WOOD, 1], ['b', 0, 1.26, -.14, .9, .03, .16, WOOD, 1],
    ['b', -.44, 0, -.2, .03, 1.42, .03, BR, 1], ['b', .44, 0, -.2, .03, 1.42, .03, BR, 1], ['b', -.44, 0, .2, .03, .33, .03, BR, 1], ['b', .44, 0, .2, .03, .33, .03, BR, 1],
    ['b', -.25, .33, -.1, .3, .2, .22, RD, 1], ['b', .3, .65, -.1, .2, .16, .16, BL, 1], ['s', -.3, .97, -.12, .08, .08, .08, GR, 1], ['b', .25, 1.29, -.15, .2, .12, .1, YL, 0]] },
  shoecab: { n: '신발장', parts: [['b', 0, .05, 0, 1, .85, .35, 0xd9b48a, 1], ...legs4(.45, .13, .05, .05, BR), ['b', -.2, .9, 0, .1, .07, .24, 0x3b8fd6, 0], ['b', .25, .9, 0, .1, .1, .22, RD, 0]],
    spots: [{ x: 0, y: .07, z: .175, w: .92, h: .78, k: 'door' }] },
  bin: { n: '휴지통', parts: [['c', 0, 0, 0, .17, .4, 0x5fb38f, 1], ['c', 0, .4, 0, .19, .03, 0x4a9a78, 1]], lift: 1,
    spots: [{ x: 0, y: .03, z: .17, w: .34, h: .36, k: 'lift' }] },
  cbox: { n: '상자', parts: [['b', 0, 0, 0, .44, .34, .38, 0xc9935a, 1], ['b', 0, .34, 0, .07, .005, .39, 0xe8d29a, 0], ['b', 0, 0, .191, .16, .1, .005, 0x3a2216, 0]], lift: 1,
    spots: [{ x: 0, y: 0, z: .19, w: .4, h: .3, k: 'lift' }] },
  basket: { n: '빨래바구니', parts: [['c', 0, 0, 0, .25, .36, 0xe0c27a, 1], ['s', -.08, .3, 0, .13, .08, .11, PK, 0], ['s', .09, .31, .05, .13, .07, .1, BL, 0]], lift: 1,
    spots: [{ x: 0, y: .02, z: .25, w: .44, h: .32, k: 'lift' }] },
  plant: { n: '화분', parts: [['c', 0, 0, 0, .18, .34, 0xd0703c, 1], ['s', 0, .3, 0, .24, .26, .24, GR, 1], ['s', .12, .55, .05, .14, .16, .14, 0x2fa65a, 0], ['s', -.1, .58, -.05, .14, .16, .14, 0x5fd77f, 0]] },
  lamp: { n: '스탠드', parts: [['c', 0, 0, 0, .15, .03, 0x4a4a4a, 0], ['c', 0, 0, 0, .025, 1.3, 0x6b6b6b, 1], ['c', 0, 1.22, 0, .22, .3, 0xfff3b0, 1]] },
  rug: { n: '러그', parts: [['b', 0, 0, 0, 2.2, .006, 1.5, 0xf2a7b8, 0], ['b', 0, .001, 0, 1.9, .006, 1.2, 0xfff0d8, 0]] },
  kmat: { n: '부엌 바닥', parts: [['b', 0, 0, 0, 6.2, .004, 3.4, 0xeaf3f6, 0]] },
  // 다락방
  trunk: { n: '트렁크', parts: [['b', 0, 0, 0, .8, .42, .45, 0x7a4a2a, 1], ['b', 0, .32, 0, .82, .1, .46, 0x8e5a34, 0], ['b', -.25, 0, 0, .05, .43, .46, 0xc9a24a, 0], ['b', .25, 0, 0, .05, .43, .46, 0xc9a24a, 0], ['b', 0, .28, .228, .08, .08, .02, YL, 0]], lift: 1,
    spots: [{ x: 0, y: .03, z: .225, w: .7, h: .36, k: 'lift' }] },
  boxpile: { n: '상자 더미', parts: [['b', -.22, 0, -.1, .5, .4, .45, 0xc9935a, 1], ['b', .26, 0, .1, .44, .36, .4, 0xd4a46a, 1], ['b', -.12, .4, -.1, .42, .34, .38, 0xc9935a, 1], ['b', -.15, .74, -.12, .3, .26, .28, 0xe0ad74, 1]] },
  rocker: { n: '흔들의자', parts: [['b', 0, .4, 0, .48, .05, .46, 0xa0703c, 1], ['b', 0, .45, -.21, .46, .6, .05, 0xa0703c, 1], ['b', -.22, 0, 0, .04, .4, .04, BR, 1], ['b', .22, 0, 0, .04, .4, .04, BR, 1], ['b', -.22, 0, 0, .05, .04, .7, BR, 0], ['b', .22, 0, 0, .05, .04, .7, BR, 0]] },
  oldshelf: { n: '낡은 선반', parts: [
    ['b', 0, .3, 0, .9, .03, .44, 0x8a6a4a, 1], ['b', 0, .62, -.05, .9, .03, .34, 0x8a6a4a, 1], ['b', 0, .94, -.095, .9, .03, .25, 0x8a6a4a, 1],
    ['b', -.44, 0, -.2, .03, 1.1, .03, 0x5e432c, 1], ['b', .44, 0, -.2, .03, 1.1, .03, 0x5e432c, 1], ['b', -.44, 0, .2, .03, .33, .03, 0x5e432c, 1], ['b', .44, 0, .2, .03, .33, .03, 0x5e432c, 1],
    ['c', -.2, .33, -.05, .07, .14, 0x9aa6b2, 1], ['b', .25, .65, -.1, .25, .12, .18, 0x7a5a3c, 1]] },
  blanket: { n: '이불 더미', parts: [['s', 0, 0, 0, .42, .14, .4, 0x7cc4ff, 1], ['s', .02, .14, .02, .38, .12, .36, 0xffb3d1, 1], ['s', -.03, .24, -.02, .3, .1, .28, 0xfff6d8, 0]], lift: 1,
    spots: [{ x: 0, y: 0, z: .38, w: .5, h: .2, k: 'lift' }] },
  oldlamp: { n: '낡은 램프', parts: [['c', 0, 0, 0, .12, .04, 0x5e432c, 0], ['c', 0, 0, 0, .02, .9, 0x5e432c, 1], ['c', 0, .82, 0, .18, .22, 0xe8c890, 1]] },
  hchest: { n: '무거운 서랍장', parts: [['b', 0, 0, 0, .8, .62, .48, 0x6b4a33, 1], ['b', 0, .62, 0, .84, .04, .5, 0x4a3424, 1], ['b', -.38, 0, .22, .05, .62, .05, 0x8a8a8a, 0], ['b', .38, 0, .22, .05, .62, .05, 0x8a8a8a, 0], ['b', 0, .45, .242, .5, .1, .005, 0x4a3424, 0]],
    heavy: { x: 0, y: .08, z: .24, w: .66, h: .3 } },
  cage: { n: '쥐장', parts: [['b', 0, 0, 0, .64, .03, .48, GY, 1], ['b', 0, .42, 0, .64, .03, .48, SV, 1], ['b', 0, 0, -.235, .64, .42, .01, SV, 1], ['b', 0, 0, .235, .64, .42, .01, SV, 1], ['b', -.315, 0, 0, .01, .42, .48, SV, 1], ['b', .315, 0, 0, .01, .42, .48, SV, 1], ['c', 0, .45, 0, .03, .1, SV, 0]] }
};

// ───────── 우리 집 (1층 원룸 + 2층 다락방) ─────────
// 1층: x 1~17, z 1~12. 현관문은 남쪽 벽 x 11~12. 다락방: x 9~17, z 1~5 위 (y 2.3)
export const HOUSE = {
  name: '우리 집',
  grid: [
    '##################',
    ...Array(11).fill('#................#'),
    '###########+######'
  ],
  // 1층 칸막이 벽 [x0, z0, x1, z1] (두께 .25) + 문틀 3곳 (문틀 위 상인방)
  iwalls: [[7.5, 1, 7.5, 3.0], [7.5, 4.2, 7.5, 8.8], [7.5, 10.0, 7.5, 12], [1, 6, 5.0, 6], [6.2, 6, 7.5, 6]],
  lintels: [[7.5, 3.0, 7.5, 4.2], [7.5, 8.8, 7.5, 10.0], [5.0, 6, 6.2, 6]],
  // [가구, x, z, 방향(0 = 등이 북쪽, 1 = 동쪽, 2 = 남쪽, 3 = 서쪽), 바닥 높이]
  furn: [
    // 부엌·식당 (x 1~7.5, z 1~6)
    ['kmat', 4.2, 2.7, 0],
    ['fridge', 1.4, 1.37, 0], ['counter', 3.05, 1.32, 0], ['upcab', 3.05, 1.195, 0], ['cooker', 3.5, 1.2, 0, .91], ['jars', 2.62, 1.12, 0, .91],
    ['chair', 4.0, 2.06, 2], ['bin', 5.0, 1.3, 0],
    ['table', 4.5, 4.0, 0], ['chair', 4.5, 3.15, 0], ['chair', 4.5, 4.85, 2],
    ['plant', 1.5, 5.3, 0], ['hchest', 6.6, 1.27, 0],
    // 침실·공부방 (x 1~7.5, z 6~12)
    ['rug', 4.4, 8.9, 0],
    ['bed', 1.97, 7.3, 3], ['desk', 4.3, 11.68, 2], ['ochair', 4.3, 10.95, 0],
    ['chest', 1.25, 10.0, 3], ['ladder', 6.4, 11.78, 2], ['cbox', 6.3, 7.6, 0],
    ['hchest', 3.6, 6.39, 0], ['hchest', 7.1, 7.4, 1],
    // 거실 (x 7.5~17) — 계단 · 소파 · TV · 현관
    ['rug', 14.5, 7.0, 1],
    ['tvstand', 16.77, 7.0, 1], ['sofa', 13.4, 7.0, 3], ['coffee', 14.9, 7.0, 3], ['lamp', 16.5, 9.2, 0],
    ['shoecab', 13.6, 11.8, 2], ['basket', 16.3, 10.6, 0], ['plant', 8.2, 6.4, 0],
    ['cage', 15.5, 3.8, 0], ['hchest', 8.4, 11.74, 2],
    // 다락방
    ['trunk', 14.5, 1.24, 0, ATTIC_Y], ['boxpile', 16.5, 2.6, 1, ATTIC_Y], ['rocker', 12.0, 3.6, 0, ATTIC_Y], ['oldshelf', 9.25, 3.6, 3, ATTIC_Y],
    ['blanket', 14.0, 4.4, 2, ATTIC_Y], ['oldlamp', 16.5, 4.5, 0, ATTIC_Y],
    ['hchest', 16.3, 1.27, 0, ATTIC_Y], ['hchest', 9.27, 2.5, 3, ATTIC_Y]
  ],
  cage: [15.5, 3.8],
  momSpawn: [11.0, 6.5],
  mouseSpawn: [4.5, 9.0],
  door: { x0: 11, x1: 12, z: 12, plate: [11.5, 11.93] },
  stairs: { x0: 9.0, z0: 1.0, z1: 1.9, n: 12, run: .3 },
  attic: { x0: 9, x1: 17, z0: 1, z1: 5 },
  // 쥐구멍 2쌍 [x, y, z, 벽 방향 → 나오는 방향 (dx, dz)]
  holes: [
    [[1.0, 0, 5.0, 1, 0], [17.0, 0, 10.4, -1, 0]],
    [[2.6, 0, 12.0, 0, -1], [17.0, ATTIC_Y, 3.8, -1, 0]]
  ],
  // 열쇠 놓일 수 있는 곳 [x, z, 층(0/1)] — 다락방은 높은 곳만
  keys: {
    attic: [[14.5, 1.22, 1], [16.6, 2.6, 1], [9.3, 3.7, 1], [12.0, 3.55, 1]],
    high: [[4.2, 3.8, 0], [2.2, 1.5, 0], [2.3, 7.5, 0], [4.7, 11.5, 0], [6.4, 11.93, 0], [16.7, 7.7, 0]],
    low: [[4.5, 4.0, 0], [2.0, 7.3, 0], [5.0, 11.5, 0], [13.5, 6.8, 0], [16.3, 4.8, 0], [8.5, 5.0, 0]]
  }
};
export const HOUSE_W = HOUSE.grid[0].length, HOUSE_D = HOUSE.grid.length;

// 봇 길찾기 지점 [x, y, z] + 이어진 길
export const NAV = {
  n: [[2.6, 0, 2.6], [6.3, 0, 2.6], [2.6, 0, 5.3], [6.3, 0, 5.3], [7.5, 0, 3.6], [5.6, 0, 6.0],
    [4.4, 0, 8.8], [6.2, 0, 10.2], [3.0, 0, 9.0], [7.5, 0, 9.4],
    [8.8, 0, 3.6], [8.8, 0, 9.4], [11.0, 0, 6.5], [11.3, 0, 10.6], [14.8, 0, 10.0], [13.5, 0, 4.8], [11.0, 0, 3.0],
    [8.6, 0, 1.45], [12.95, ATTIC_Y, 1.45], [13.5, ATTIC_Y, 3.0], [10.5, ATTIC_Y, 4.4], [15.6, ATTIC_Y, 3.6],
    [11.5, 0, 12.9]],
  e: [[0, 1], [2, 3], [0, 2], [1, 3], [1, 4], [3, 4], [3, 5], [2, 5], [4, 10], [5, 6], [6, 7], [6, 8], [7, 8], [7, 9], [6, 9], [9, 11],
    [10, 11], [10, 16], [16, 12], [10, 12], [11, 12], [11, 13], [12, 13], [13, 14], [12, 15], [15, 16], [14, 15], [12, 14], [10, 17], [17, 18], [18, 19], [19, 20], [19, 21], [13, 22]]
};
export const CAT = { r: .14, h: .3, step: .22 };

// 방향 → Y 회전 (three.js rotation.y)
export const ROT = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
// 가구 좌표 → 세계 좌표 (방향 0~3)
function rotXZ(x, z, r) { return r === 0 ? [x, z] : r === 1 ? [-z, x] : r === 2 ? [-x, -z] : [z, -x]; }

// ───────── 집 만들기 (충돌 상자 · 숨는 곳 · 쥐구멍 등) ─────────
let _house = null;
export function house() { return _house || (_house = buildHouse()); }

function buildHouse() {
  const H = HOUSE, boxes = [], spots = [], placed = [], heavies = [];
  const add = (x0, x1, y0, y1, z0, z1, k, fi = -1) => { boxes.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1, z0: Math.min(z0, z1), z1: Math.max(z0, z1), k, fi }); };
  // 1층 벽 (격자)
  const g = H.grid, GW = g[0].length, GD = g.length;
  for (let z = 0; z < GD; z++) {
    let run = -1;
    for (let x = 0; x <= GW; x++) {
      const w = x < GW && g[z][x] === '#';
      if (w && run < 0) run = x;
      if (!w && run >= 0) { add(run, x, 0, WALL_H, z, z + 1, 'wall'); run = -1; }
    }
  }
  // 칸막이 벽 · 문틀 위
  const T2 = .125;
  for (const [x0, z0, x1, z1] of H.iwalls) add(x0 - (x0 === x1 ? T2 : 0), x1 + (x0 === x1 ? T2 : 0), 0, WALL_H, z0 - (z0 === z1 ? T2 : 0), z1 + (z0 === z1 ? T2 : 0), 'iwall');
  for (const [x0, z0, x1, z1] of H.lintels) add(x0 - (x0 === x1 ? T2 : 0), x1 + (x0 === x1 ? T2 : 0), 2.0, WALL_H, z0 - (z0 === z1 ? T2 : 0), z1 + (z0 === z1 ? T2 : 0), 'iwall');
  // 문 (닫혀 있을 때만 막힘)
  add(H.door.x0, H.door.x1, 0, 2.1, H.door.z, H.door.z + .14, 'door');
  add(H.door.x0, H.door.x1, 2.1, WALL_H, H.door.z, H.door.z + 1, 'wall');
  // 현관 밖 (탈출 구역 벽)
  const dz = H.door.z; add(H.door.x0 - .2, H.door.x0, 0, WALL_H, dz + 1, dz + 2.5, 'wall'); add(H.door.x1, H.door.x1 + .2, 0, WALL_H, dz + 1, dz + 2.5, 'wall'); add(H.door.x0 - .2, H.door.x1 + .2, 0, WALL_H, dz + 2.5, dz + 2.7, 'wall');
  // 계단 (동쪽으로 올라감)
  const S = H.stairs, rise = ATTIC_Y / S.n;
  for (let i = 0; i < S.n; i++) add(S.x0 + i * S.run, S.x0 + (i + 1) * S.run, 0, (i + 1) * rise, S.z0, S.z1, 'stair');
  const sx1 = S.x0 + S.n * S.run;
  // 1층 천장 = 다락방 바닥 (계단 구멍 빼고)
  const IX = GW - 1, IZ = GD - 1;
  add(1, IX, WALL_H, ATTIC_Y, S.z1, IZ, 'slab');
  add(1, S.x0, WALL_H, ATTIC_Y, 1, S.z1, 'slab');
  add(sx1, IX, WALL_H, ATTIC_Y, 1, S.z1, 'slab');
  // 다락방 벽 · 난간 · 지붕
  const A = H.attic;
  add(A.x0 - .2, A.x0, ATTIC_Y, ATTIC_TOP, A.z0, A.z1 + .2, 'awall');
  add(A.x1, A.x1 + .2, ATTIC_Y, ATTIC_TOP, A.z0 - .2, A.z1 + .2, 'awall');
  add(A.x0 - .2, A.x1 + .2, ATTIC_Y, ATTIC_TOP, A.z0 - .2, A.z0, 'awall');
  add(A.x0 - .2, A.x1 + .2, ATTIC_Y, ATTIC_TOP, A.z1, A.z1 + .2, 'awall');
  add(A.x0, sx1, ATTIC_Y, ATTIC_Y + .85, S.z1, S.z1 + .05, 'rail');
  add(A.x0, A.x1, ATTIC_TOP, ATTIC_TOP + .1, A.z0, A.z1, 'roof');
  // 가구
  H.furn.forEach(([t, x, z, r, y = 0], fi) => {
    const F = FURN[t]; placed.push({ t, x, z, r, y, fi });
    for (const p of F.parts) {
      const solid = p[0] === 's' ? p[8] : p[0] === 'c' ? p[7] : p[8];
      if (!solid) continue;
      let lx, ly, lz, w, h, d;
      if (p[0] === 'b') [, lx, ly, lz, w, h, d] = p;
      else if (p[0] === 'c') { [, lx, ly, lz] = p; w = d = p[4] * 2; h = p[5]; }
      else { [, lx, ly, lz] = p; w = p[4] * 2; h = p[5] * 2; d = p[6] * 2; }
      const [cx, cz] = rotXZ(lx, lz, r), sw = r % 2 ? d : w, sd = r % 2 ? w : d;
      add(x + cx - sw / 2, x + cx + sw / 2, y + ly, y + ly + h, z + cz - sd / 2, z + cz + sd / 2, 'f', fi);
    }
    for (const s of F.spots || []) {
      const [fx, fz] = rotXZ(s.x, s.z, r), [nx, nz] = rotXZ(0, 1, r);
      const ix = x + fx - nx * .12, iz = z + fz - nz * .12;
      spots.push({ fi, t, k: s.k, x: x + fx, y: y + s.y, z: z + fz, w: s.w, h: s.h, nx, nz, r, ix, iz, ox: x + fx + nx * .14, oz: z + fz + nz * .14 });
    }
    if (F.heavy) {
      const s = F.heavy, [fx, fz] = rotXZ(s.x, s.z, r), [nx, nz] = rotXZ(0, 1, r);
      heavies.push({ fi, x: x + fx, y: y + s.y, base: y, z: z + fz, w: s.w, h: s.h, nx, nz, r, ox: x + fx + nx * .2, oz: z + fz + nz * .2 });
    }
  });
  // 쥐구멍
  const holes = H.holes.map(pair => pair.map(([x, y, z, dx, dz]) => ({ x, y, z, dx, dz, mx: x + dx * .1, mz: z + dz * .1 })));
  // 열쇠 후보: 그 자리 바닥 높이
  const W = { boxes, spots, heavies, placed, holes, GW, GD, doorOpen: false };
  indexBoxes(W);
  const kc = {};
  for (const [k, list] of Object.entries(H.keys)) kc[k] = list.map(([x, z, lv]) => [x, topAt(W, x, z, k === 'low' ? .05 : lv ? ATTIC_TOP - .1 : WALL_H - .1) + .001, z]);
  W.keyCands = kc;
  return W;
}

// 상자들을 1칸짜리 격자에 넣어 둔다
function indexBoxes(W) {
  W.cells = new Map();
  W.boxes.forEach((b, i) => {
    for (let cx = Math.floor(b.x0); cx <= Math.floor(b.x1 - 1e-6); cx++) for (let cz = Math.floor(b.z0); cz <= Math.floor(b.z1 - 1e-6); cz++) {
      const k = cx + cz * 64; let a = W.cells.get(k); if (!a) W.cells.set(k, a = []); a.push(i);
    }
  });
}
const _seen = new Set();
function near(W, x0, x1, z0, z1) {
  _seen.clear(); const out = [];
  for (let cx = Math.floor(x0); cx <= Math.floor(x1); cx++) for (let cz = Math.floor(z0); cz <= Math.floor(z1); cz++) {
    const a = W.cells.get(cx + cz * 64); if (!a) continue;
    for (const i of a) if (!_seen.has(i)) { _seen.add(i); const b = W.boxes[i]; if (b.k === 'door' && W.doorOpen) continue; out.push(b); }
  }
  return out;
}
// (x, z) 자리에서 yMax 아래 가장 높은 윗면
export function topAt(W, x, z, yMax, r = .02) {
  let best = 0;
  for (const b of near(W, x - r, x + r, z - r, z + r)) {
    if (x + r <= b.x0 || x - r >= b.x1 || z + r <= b.z0 || z - r >= b.z1) continue;
    if (b.y1 <= yMax + 1e-4 && b.y1 > best) best = b.y1;
  }
  return best;
}

// ───────── 몸 움직이기 (벽·가구 충돌 + 중력) ─────────
// b = { x, y, z, vy, ground }, P = CFG.MOUSE 또는 CFG.MOM
export function moveBody(W, b, dx, dz, dt, P) {
  const r = P.r, h = P.h;
  const axis = (ax) => {
    const nx = ax ? b.x + dx : b.x, nz = ax ? b.z : b.z + dz;
    if (nx === b.x && nz === b.z) return;
    let up = b.y;
    for (const o of near(W, nx - r, nx + r, nz - r, nz + r)) {
      if (nx + r <= o.x0 || nx - r >= o.x1 || nz + r <= o.z0 || nz - r >= o.z1) continue;
      if (b.y + h <= o.y0 + 1e-4 || b.y >= o.y1 - 1e-4) continue;
      // 이미 겹쳐 있던 상자는 빠져나가게 둔다
      if (b.x + r > o.x0 && b.x - r < o.x1 && b.z + r > o.z0 && b.z - r < o.z1) continue;
      if (o.y1 - b.y <= P.step && b.ground) { if (o.y1 > up) up = o.y1; }
      else return;
    }
    if (up > b.y) { // 올라선 자리에 머리 공간이 있는지
      for (const o of near(W, nx - r, nx + r, nz - r, nz + r)) {
        if (nx + r <= o.x0 || nx - r >= o.x1 || nz + r <= o.z0 || nz - r >= o.z1) continue;
        if (o.y0 < up + h - 1e-4 && o.y1 > up + 1e-4) return;
      }
    }
    b.x = nx; b.z = nz; b.y = up;
  };
  axis(1); axis(0);
  // 위아래
  b.vy -= CFG.G * dt;
  let ny = b.y + b.vy * dt;
  const fp = near(W, b.x - r, b.x + r, b.z - r, b.z + r).filter(o => b.x + r > o.x0 && b.x - r < o.x1 && b.z + r > o.z0 && b.z - r < o.z1);
  if (b.vy <= 0) {
    let gr = 0; for (const o of fp) if (o.y1 <= b.y + 1e-3 && o.y1 > gr) gr = o.y1;
    if (b.ground && b.vy * dt > -P.step && gr >= b.y - P.step) ny = Math.min(ny, b.y) <= gr ? gr : ny; // 계단 내려갈 때 붙어서
    if (ny <= gr + 1e-4) { ny = gr; b.vy = 0; b.ground = true; } else b.ground = false;
  } else {
    let ce = 1e9; for (const o of fp) if (o.y0 >= b.y + h - 1e-3 && o.y0 < ce) ce = o.y0;
    if (ny + h > ce) { ny = ce - h; b.vy = 0; }
    b.ground = false;
  }
  b.y = ny;
}

// 그 자리가 벽 속인지 (r = 몸 반지름. 가구 · 계단은 안 봄)
const WALLK = { wall: 1, iwall: 1, awall: 1, door: 1, rail: 1 };
export function insideWall(W, x, y, z, r = .05) {
  for (const b of near(W, x - r, x + r, z - r, z + r)) {
    if (!WALLK[b.k]) continue;
    if (x + r > b.x0 && x - r < b.x1 && z + r > b.z0 && z - r < b.z1 && y + .05 > b.y0 && y + .02 < b.y1) return true;
  }
  return false;
}
// 광선이 상자에 닿는 거리 (안 닿으면 Infinity)
export function rayBox(ox, oy, oz, dx, dy, dz, b, max = 1e9) {
  let t0 = 0, t1 = max;
  for (const [o, d, lo, hi] of [[ox, dx, b.x0, b.x1], [oy, dy, b.y0, b.y1], [oz, dz, b.z0, b.z1]]) {
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return Infinity; continue; }
    let a = (lo - o) / d, c = (hi - o) / d; if (a > c) { const t = a; a = c; c = t; }
    if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) return Infinity;
  }
  return t0;
}
// 광선이 처음 부딪히는 벽·가구까지 거리
export function rayWorld(W, ox, oy, oz, dx, dy, dz, max) {
  let best = max;
  const ex = ox + dx * max, ez = oz + dz * max;
  for (const b of near(W, Math.min(ox, ex), Math.max(ox, ex), Math.min(oz, ez), Math.max(oz, ez))) {
    const t = rayBox(ox, oy, oz, dx, dy, dz, b, best); if (t < best) best = t;
  }
  return best;
}
// 두 점 사이가 막혔는지
export function blocked(W, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz) || 1;
  return rayWorld(W, ax, ay, az, dx / d, dy / d, dz / d, d) < d - .05;
}

export function inAttic(x, y, z) { const A = HOUSE.attic; return y > WALL_H - .05 && x > A.x0 - .5 && x < A.x1 + .5 && z > A.z0 - .5 && z < A.z1 + .5; }
export function placeName(x, y, z) {
  if (inAttic(x, y, z)) return '다락방';
  if (z > HOUSE.door.z + .1) return '현관 밖';
  if (x < 7.5) return z < 6 ? '부엌' : '침실';
  if (x > 8.5 && x < 13 && z < 2.2) return '계단';
  if (z > 9.5 && x > 9.5 && x < 14) return '현관 쪽';
  return '거실';
}

// 받침에 맞는 조사: josa('상자', '이었어요') → '상자였어요', josa('컵', '을') → '컵을'
const JOSA = { '이었어요': ['이었어요', '였어요'], '였어요': ['이었어요', '였어요'], '이에요': ['이에요', '예요'], '예요': ['이에요', '예요'],
  '이': ['이', '가'], '가': ['이', '가'], '을': ['을', '를'], '를': ['을', '를'], '은': ['은', '는'], '는': ['은', '는'], '과': ['과', '와'], '와': ['과', '와'], '으로': ['으로', '로'], '로': ['으로', '로'] };
export function josa(word, j) {
  const w = String(word), pair = JOSA[j] || [j, j];
  const c = w.replace(/[\s)\]}'"!?.~]+$/, '').slice(-1), code = c.charCodeAt(0);
  let fin; // 받침 번호 (0 = 없음)
  if (code >= 0xac00 && code <= 0xd7a3) fin = (code - 0xac00) % 28;
  else if (/[0-9]/.test(c)) fin = '178'.includes(c) ? 8 : '036'.includes(c) ? 1 : 0; // 일·칠·팔 = ㄹ, 영·삼·육 = 받침
  else if (/[a-z]/i.test(c)) fin = /[lmnrk]/i.test(c) ? (/l/i.test(c) ? 8 : 1) : 0;
  else fin = 0;
  if (pair[0] === '으로') return w + (fin && fin !== 8 ? '으로' : '로');
  return w + (fin ? pair[0] : pair[1]);
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

// 예전 화면(통계 등)과 맞추기용
export const MAPS = { house: { name: HOUSE.name } };
export const MAP_IDS = ['house'];


// ───────── 게임 규칙 (서버와 혼자 연습이 같이 쓴다) ─────────
// emit(받는 사람 id 또는 null = 전원, 메시지)
const r2 = v => Math.round(v * 100) / 100;
const clampN = (v, a, b) => v < a ? a : v > b ? b : v;
export class Sim {
  constructor({ seed = 1, players, modes = {}, practice = false, emit, now = () => Date.now(), isOnline = () => true }) {
    this.W = house(); this.emit = emit; this.now = now; this.isOnline = isOnline;
    this.practice = practice; this.modes = modes;
    this.R = rng(seed);
    const R = this.R, H = HOUSE;
    this.P = new Map(); let mi = 0, oi = 0;
    for (const p of players) {
      const mom = p.role === 'mom';
      let x, z;
      if (mom) { x = H.momSpawn[0] + (oi++ % 2) * .6; z = H.momSpawn[1]; }
      else { const a = mi * 2.4, rr = .3 + (mi % 3) * .18; x = H.mouseSpawn[0] + Math.cos(a) * rr; z = H.mouseSpawn[1] + Math.sin(a) * rr; mi++; }
      this.P.set(p.id, {
        id: p.id, name: p.name, role: mom ? 'mom' : 'mouse', bot: !!p.bot, diff: p.diff || 'easy', vy: 0, ground: true, stuck: 0, x, y: 0, z, a: mom ? Math.PI / 2 : -Math.PI / 2, mv: 0,
        caught: false, caughtAt: 0, grace: 0, hide: -1, hideT: 0, sqNext: 0, key: -1, esc: false, gone: false,
        stam: CFG.STAMINA, rest: 0, regen: 0, vac: 0, lastT: this.now(), res: 0, resT: 0, grabT: 0,
        stat: { catches: 0, miss: 0, opens: 0, keysIn: 0, keysGot: 0, rescues: 0, caughtN: 0, surv: 0, escAt: 0, holes: 0, hides: 0 }
      });
    }
    // 열쇠: 다락방 높은 곳 1 + (쥐 2마리 이상) 무거운 서랍 속 2 / (쥐 1마리) 1층 높은 곳 1 + 아무 데나 1
    const pick = list => list.splice(R() * list.length | 0, 1)[0];
    const kc = this.W.keyCands, hi = kc.high.slice(), lo = kc.low.slice(), at = kc.attic.slice();
    this.solo = mi <= 1;
    this.hd = this.W.heavies.map(() => ({ open: false, key: -1, prog: 0, t: 0, who: {} }));
    const a0 = pick(at); this.keys = [{ x: a0[0], y: a0[1], z: a0[2], by: null, in: false, hid: false }];
    if (this.solo) {
      for (const c of [pick(hi), pick(hi.concat(lo))]) this.keys.push({ x: c[0], y: c[1], z: c[2], by: null, in: false, hid: false });
    } else {
      const ds = this.W.heavies.map((h, i) => i);
      for (let n = 0; n < 2; n++) { const d = pick(ds), h = this.W.heavies[d]; this.hd[d].key = this.keys.length; this.keys.push({ x: h.ox, y: h.base + .001, z: h.oz, by: null, in: false, hid: true }); }
    }
    this.holeT = [0, 0]; this.doorOpen = false;
    this.ph = practice ? 'hunt' : 'prep'; this.t = practice ? CFG.HUNT : CFG.PREP;
    this.prev = this.now(); this.ended = false; this.startAt = this.now();
    // 봇 · 고양이 · 쥐덫
    for (const p of this.P.values()) if (p.bot) p.ai = { path: [], goal: null, stuck: 0, think: 0, wig: 0, wa: 0, climb: 0, react: 0, tgt: null };
    this.traps = []; this.heard = null;
    this.cat = modes.cat ? { x: 14.8, y: 0, z: 10.0, a: 0, vy: 0, ground: true, mv: 0, ai: { path: [], goal: null, stuck: 0, think: 0, wig: 0, wa: 0 }, chase: null, chaseT: 0, meowT: 0 } : null;
    this.adj = NAV.n.map(() => []); for (const [a, b] of NAV.e) { this.adj[a].push(b); this.adj[b].push(a); }
  }
  get mice() { return [...this.P.values()].filter(q => q.role === 'mouse'); }
  get moms() { return [...this.P.values()].filter(q => q.role === 'mom'); }
  needed() { return Math.max(1, Math.ceil(this.mice.filter(q => !q.gone).length / 2)); }
  keysIn() { return this.keys.filter(k => k.in).length; }
  active(q) { return q && q.role === 'mouse' && !q.caught && !q.esc && !q.gone; }
  out(m) { this.emit(null, m); if (m.type === 'ev') this.hear(m); }
  to(id, m) { this.emit(id, m); }
  toRole(role, m) { for (const q of this.P.values()) if (q.role === role && !q.gone) this.emit(q.id, m); }

  startMsg(id) {
    const roles = {}, names = {}, bots = {};
    for (const q of this.P.values()) { roles[q.id] = q.role; names[q.id] = q.name; if (q.bot) bots[q.id] = 1; }
    const me = this.P.get(id);
    return { type: 'start', HO: this.hd.map(h => h.open ? 1 : 0), solo: this.solo, ph: this.ph, t: this.t, modes: this.modes, roles, names, bots, needed: this.needed(), K: this.keyRows(), you: id, practice: this.practice,
      me: me && { x: me.x, y: me.y, z: me.z, a: me.a, caught: me.caught, hide: me.hide, esc: me.esc } };
  }
  keyRows(forMom) {
    return this.keys.map(k => {
      if (k.in) return [0, 0, 0, 0, 1];
      if (k.hid) return [0, 0, 0, 0, 2];
      if (k.by) { const h = this.P.get(k.by); return [0, 0, 0, forMom && h && h.hide >= 0 ? 0 : k.by, 0]; }
      return [r2(k.x), r2(k.y), r2(k.z), 0, 0];
    });
  }

  // ───── 받은 메시지 ─────
  msg(id, m) {
    const p = this.P.get(id); if (!p || p.gone || this.ended) return;
    const now = this.now();
    switch (m.type) {
      case 'st': {
        if (p.caught || p.esc || p.hide >= 0 || p.rest > 0) return;
        if (now < p.stuck) { this.to(id, { type: 'fix', x: r2(p.x), y: r2(p.y), z: r2(p.z) }); return; }
        if (this.ph === 'prep' && p.role === 'mom') return;
        let x = +m.x, y = +m.y, z = +m.z; if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(y)) return;
        const dt = Math.min(1, (now - p.lastT) / 1000); p.lastT = now;
        const sp = p.role === 'mom' ? CFG.SPEED.mom : CFG.SPEED.mouse;
        const max = sp * dt * 1.6 + .35, d = Math.hypot(x - p.x, z - p.z);
        if (d > max) {
          const k = max / d; x = p.x + (x - p.x) * k; z = p.z + (z - p.z) * k;
          const was = this.W.doorOpen; this.W.doorOpen = this.doorOpen;
          if (insideWall(this.W, x, y, z, p.role === 'mom' ? .2 : .04)) { x = p.x; z = p.z; y = p.y; }
          this.W.doorOpen = was;
          this.to(id, { type: 'fix', x: r2(x), y: r2(y), z: r2(z) });
        }
        p.x = clampN(x, .9, HOUSE_W - .9); p.z = clampN(z, .9, HOUSE.door.z + (this.doorOpen ? 2.6 : .2)); p.y = clampN(y, 0, ATTIC_TOP);
        if (Number.isFinite(+m.a)) p.a = +m.a;
        p.mv = m.mv ? 1 : 0;
        break;
      }
      case 'hide': {
        if (p.role !== 'mouse' || p.caught || p.esc) return;
        const S = this.W.spots;
        if (m.s === -1 || m.s === undefined) { if (p.hide >= 0) this.unhide(p, true); return; }
        const s = S[m.s | 0]; if (!s || p.hide >= 0) return;
        if (Math.hypot(p.x - s.x, p.z - s.z) > .55 || p.y < s.y - .6 || p.y > s.y + .3) return;
        if ([...this.P.values()].some(q => q.hide === (m.s | 0))) { this.to(id, { type: 'ev', e: 'full' }); return; }
        p.hide = m.s | 0; p.hideT = 0; p.sqNext = CFG.HIDE_SQ; p.stat.hides++;
        p.x = s.ix; p.y = s.y; p.z = s.iz; p.mv = 0;
        for (const q of this.P.values()) if (q.role === 'mouse') this.to(q.id, { type: 'ev', e: 'hide', id, s: p.hide });
        break;
      }
      case 'hole': {
        if (!this.active(p) || p.hide >= 0) return;
        const pi = m.p | 0, ei = m.e | 0, pair = HOUSE.holes[pi] && this.W.holes[pi]; if (!pair) return;
        const a = pair[ei], b = pair[1 - ei]; if (!a) return;
        if (now < this.holeT[pi]) return;
        if (Math.hypot(p.x - a.mx, p.z - a.mz) > .45 || Math.abs(p.y - a.y) > .3) return;
        this.holeT[pi] = now + CFG.HOLE_BLOCK * 1000; p.stat.holes++;
        p.x = b.x + b.dx * .25; p.z = b.z + b.dz * .25; p.y = b.y; p.lastT = now;
        this.to(id, { type: 'fix', x: r2(p.x), y: r2(p.y), z: r2(p.z), a: Math.atan2(b.dz, b.dx) });
        this.out({ type: 'ev', e: 'hole', id, p: pi, from: ei });
        break;
      }
      case 'grab': {
        if (p.role !== 'mom' || this.ph !== 'hunt' || p.rest > 0) return;
        if (now - p.grabT < 300) return; p.grabT = now;
        const t = this.P.get(String(m.id || ''));
        if (!this.active(t) || t.hide >= 0 || now < t.grace) return;
        if (Math.hypot(t.x - p.x, t.y + .06 - (p.y + CFG.MOM.eye), t.z - p.z) > CFG.GRAB_REACH + .3) return;
        this.catchMouse(p, t);
        break;
      }
      case 'open': {
        if (p.role !== 'mom' || this.ph !== 'hunt' || p.rest > 0) return;
        if (now - p.grabT < 300) return; p.grabT = now;
        const si = m.s | 0, s = this.W.spots[si]; if (!s) return;
        if (Math.hypot(s.x - p.x, s.y + s.h / 2 - (p.y + CFG.MOM.eye), s.z - p.z) > CFG.OPEN_REACH + .35) return;
        p.stat.opens++;
        const hit = [...this.P.values()].filter(q => this.active(q) && q.hide === si && now >= q.grace);
        this.out({ type: 'ev', e: 'open', id, s: si, hit: hit.map(q => q.id) });
        if (hit.length) { for (const q of hit) this.catchMouse(p, q, si); return; }
        p.stat.miss++; p.stam--; p.regen = 0;
        const ev = { type: 'ev', e: 'miss', id, s: si };
        if (p.stam <= 0) { p.rest = CFG.REST; p.stam = 0; ev.rest = 1; }
        this.out(ev);
        break;
      }
      case 'vac': {
        if (p.role !== 'mom' || this.ph !== 'hunt' || p.rest > 0 || now < p.vac) return;
        p.vac = now + CFG.VAC_CD * 1000;
        const hit = [];
        for (const t of this.P.values()) {
          if (!this.active(t)) continue;
          const d = Math.hypot(t.x - p.x, t.z - p.z);
          if (d >= CFG.VAC_R || Math.abs(t.y - p.y) > 1.6) continue;
          hit.push(t.id);
          if (t.hide >= 0) this.unhide(t, true);
          const pk = Math.min(.8, Math.max(0, d - .45));
          if (t.bot) { const dx = p.x - t.x, dz = p.z - t.z, dd = Math.hypot(dx, dz) || 1; for (let i = 0; i < 8; i++) moveBody(this.W, t, dx / dd * pk / 8, dz / dd * pk / 8, 0, CFG.MOUSE); }
          else this.to(t.id, { type: 'pull', x: r2(p.x), z: r2(p.z), k: r2(pk) });
        }
        this.out({ type: 'ev', e: 'vac', id, x: r2(p.x), y: r2(p.y), z: r2(p.z), hit });
        break;
      }
      case 'res': { // 쥐장 구출 (누르고 있는 동안 계속 온다)
        if (!this.active(p) || p.hide >= 0 || this.ph !== 'hunt') return;
        const c = HOUSE.cage;
        if (Math.hypot(p.x - c[0], p.z - c[1]) > CFG.RESCUE_R + .4 || p.y > .5) return;
        if (!this.mice.some(t => t.caught && !t.gone)) return;
        if (now - p.resT > 600) p.res = 0;
        p.res += Math.min(.4, (now - (p.resT || now)) / 1000); p.resT = now;
        this.out({ type: 'ev', e: 'resp', id, v: r2(p.res / CFG.RESCUE) });
        if (p.res >= CFG.RESCUE) { p.res = 0; this.rescue(p); }
        break;
      }
      case 'heave': { // 무거운 서랍 같이 열기 (누르고 있는 동안 계속 온다)
        if (!this.active(p) || p.hide >= 0 || this.ph !== 'hunt') return;
        const di = m.d | 0, h = this.W.heavies[di], st = this.hd[di]; if (!h || st.open) return;
        if (Math.hypot(p.x - h.x, p.z - h.z) > .6 || Math.abs(p.y - h.base) > .45) return;
        st.who[id] = now;
        const n = Object.entries(st.who).filter(([q, t]) => now - t < 400 && this.active(this.P.get(q))).length;
        const need = this.solo ? 1 : 2, T = this.solo ? CFG.HEAVE_SOLO : CFG.HEAVE;
        if (now - st.t > 800) st.prog = 0;
        if (n >= need) st.prog += Math.min(.4, (now - (st.t || now)) / 1000);
        st.t = now;
        if (now - (st.evT || 0) > 180 || st.prog >= T) { st.evT = now; this.toRole('mouse', { type: 'ev', e: 'hprog', d: di, v: r2(st.prog / T), n, need }); }
        if (st.prog >= T) {
          st.open = true;
          if (st.key >= 0) this.keys[st.key].hid = false;
          this.out({ type: 'ev', e: 'hopen', d: di, id, key: st.key >= 0 ? 1 : 0 });
        }
        break;
      }
      case 'trap': { // 엄마: 쥐덫 놓기 (최대 3개, 넘으면 제일 오래된 것 회수)
        if (p.role !== 'mom' || !this.modes.trap || this.ph !== 'hunt' || p.rest > 0) return;
        const x = +m.x, z = +m.z; if (!Number.isFinite(x) || !Number.isFinite(z) || Math.hypot(x - p.x, z - p.z) > 3) return;
        if (now - (p.trapT || 0) < 800) return; p.trapT = now;
        const y = topAt(this.W, x, z, p.y + .15, .06);
        this.traps.push({ x: r2(x), y: r2(y), z: r2(z), arm: 0, by: id }); if (this.traps.length > 3) this.traps.shift();
        this.to(id, { type: 'ev', e: 'trapset', n: this.traps.length });
        break;
      }
      case 'sign': {
        if (p.role !== 'mouse' || now - (p.pingT || 0) < 2500) return;
        const x = +m.x, y = +m.y, z = +m.z; if (![x, y, z].every(Number.isFinite)) return;
        p.pingT = now;
        this.toRole('mouse', { type: 'sign', a: id, x: r2(x), y: r2(y), z: r2(z) });
        break;
      }
    }
  }

  unhide(p, tell) {
    const s = this.W.spots[p.hide]; if (!s) { p.hide = -1; return; }
    p.hide = -1; p.x = s.ox; p.z = s.oz; p.y = s.y; p.lastT = this.now();
    if (tell) this.to(p.id, { type: 'fix', x: r2(p.x), y: r2(p.y), z: r2(p.z), out: 1 });
    for (const q of this.P.values()) if (q.role === 'mouse') this.to(q.id, { type: 'ev', e: 'hide', id: p.id, s: -1 });
  }
  dropKey(p) {
    if (p.key < 0) return;
    const k = this.keys[p.key], s = p.hide >= 0 ? this.W.spots[p.hide] : null;
    k.by = null; k.x = s ? s.ox : p.x; k.z = s ? s.oz : p.z; k.y = s ? s.y : p.y;
    if (k.z > HOUSE.door.z + .1) k.z = HOUSE.door.z - .2;
    this.out({ type: 'ev', e: 'key', k: p.key, id: p.id, act: 'drop' });
    p.key = -1;
  }
  catchMouse(mom, t, si) {
    const now = this.now(), c = HOUSE.cage;
    const place = placeName(t.x, t.y, t.z), at = { x: r2(t.x), y: r2(t.y), z: r2(t.z) };
    this.dropKey(t);
    if (t.hide >= 0) { t.hide = -1; for (const q of this.P.values()) if (q.role === 'mouse') this.to(q.id, { type: 'ev', e: 'hide', id: t.id, s: -1 }); }
    t.caught = true; t.caughtAt = now; t.stat.caughtN++; t.lastPlace = place;
    t.x = c[0]; t.z = c[1]; t.y = .03;
    mom.stat.catches++;
    this.out({ type: 'ev', e: 'caught', id: t.id, by: mom.id, ...at, place, s: si === undefined ? -1 : si });
    this.checkEnd();
  }
  rescue(by) {
    const now = this.now(), c = HOUSE.cage, freed = [];
    let k = 0;
    for (const t of this.mice) if (t.caught && !t.gone) {
      t.caught = false; t.grace = now + CFG.GRACE * 1000;
      const a = k++ * 1.9 + .5; t.x = c[0] + Math.cos(a) * .55; t.z = c[1] + Math.sin(a) * .55; t.y = 0; t.lastT = now;
      freed.push(t.id);
      this.to(t.id, { type: 'fix', x: r2(t.x), y: 0, z: r2(t.z) });
    }
    by.stat.rescues++;
    this.out({ type: 'ev', e: 'rescue', id: by.id, freed });
  }
  // 엄마가 나가면 쥐 하나가 엄마가 된다
  momGone(id) {
    const gp = this.P.get(id); if (!gp || gp.role !== 'mom' || gp.gone || this.ended) return;
    gp.gone = true;
    if (this.moms.some(q => !q.gone)) return;
    const cands = this.mice.filter(q => !q.gone && !q.esc && !q.bot && this.isOnline(q.id));
    if (cands.length < 2) { this.checkEnd(); return; }
    const free = cands.filter(q => !q.caught), pool = free.length ? free : cands;
    const nm = pool[this.R() * pool.length | 0];
    this.dropKey(nm); if (nm.hide >= 0) this.unhide(nm, false);
    nm.role = 'mom'; nm.caught = false; nm.x = HOUSE.momSpawn[0]; nm.z = HOUSE.momSpawn[1]; nm.y = 0; nm.stam = CFG.STAMINA; nm.rest = 0;
    this.out({ type: 'ev', e: 'newmom', id: nm.id, old: id });
    this.to(nm.id, { type: 'fix', x: nm.x, y: 0, z: nm.z });
    this.checkEnd();
  }
  mouseGone(id) {
    const p = this.P.get(id); if (!p || p.gone || this.ended) return;
    this.dropKey(p); if (p.hide >= 0) this.unhide(p, false);
    p.gone = true; this.checkEnd();
  }

  tick() {
    if (this.ended) return;
    const now = this.now(), dt = Math.min(.5, (now - this.prev) / 1000); this.prev = now;
    this.t -= dt;
    if (this.ph === 'prep' && this.t <= 0) {
      this.ph = 'hunt'; this.t = CFG.HUNT;
      for (const q of this.P.values()) q.lastT = now;
      this.out({ type: 'ev', e: 'hunt' });
    }
    if (this.ph === 'hunt') {
      const plate = HOUSE.door.plate;
      for (const q of this.P.values()) {
        if (q.gone) continue;
        if (q.role === 'mom') {
          if (q.rest > 0) { q.rest -= dt; if (q.rest <= 0) { q.rest = 0; q.stam = CFG.STAMINA; this.out({ type: 'ev', e: 'up', id: q.id }); } }
          else if (q.stam < CFG.STAMINA) { q.regen += dt; if (q.regen >= CFG.STAM_REGEN) { q.regen = 0; q.stam++; } }
          continue;
        }
        if (!this.active(q)) continue;
        q.stat.surv += dt;
        if (q.hide >= 0) {
          q.hideT += dt;
          if (q.hideT >= q.sqNext) { q.sqNext += CFG.HIDE_SQ_EVERY; this.out({ type: 'ev', e: 'sq', id: q.id, s: q.hide, x: r2(q.x), y: r2(q.y), z: r2(q.z) }); }
          continue;
        }
        if (q.key < 0) {
          for (let i = 0; i < this.keys.length; i++) {
            const k = this.keys[i]; if (k.in || k.by || k.hid) continue;
            if (Math.hypot(k.x - q.x, (k.y - q.y) * .7, k.z - q.z) < .28) { k.by = q.id; q.key = i; q.stat.keysGot++; this.out({ type: 'ev', e: 'key', k: i, id: q.id, act: 'get' }); break; }
          }
        } else if (Math.hypot(q.x - plate[0], q.z - plate[1]) < .5 && q.y < .35) {
          const k = this.keys[q.key]; k.in = true; k.by = null; q.stat.keysIn++;
          const n = this.keysIn();
          this.out({ type: 'ev', e: 'key', k: q.key, id: q.id, act: 'in', n });
          q.key = -1;
          if (n >= this.keys.length && !this.doorOpen) { this.doorOpen = true; this.out({ type: 'ev', e: 'door' }); }
        }
        if (this.doorOpen && q.z > HOUSE.door.z + .35) {
          q.esc = true; q.stat.escAt = CFG.HUNT - this.t;
          this.out({ type: 'ev', e: 'esc', id: q.id, n: this.mice.filter(m => m.esc && !m.gone).length, need: this.needed() });
          this.checkEnd(); if (this.ended) return;
        }
      }
      if (this.t <= 0) { this.end('mom', '시간이 다 됐어요'); return; }
      // 쥐덫
      for (const tr of this.traps) {
        if (now < tr.arm) continue;
        for (const q of this.P.values()) {
          if (!this.active(q) || q.hide >= 0 || now < q.stuck || now < q.grace) continue;
          if (Math.hypot(q.x - tr.x, q.z - tr.z) < .14 && Math.abs(q.y - tr.y) < .08) {
            q.stuck = now + 3000; tr.arm = now + 5000;
            this.out({ type: 'ev', e: 'trap', id: q.id, x: tr.x, y: tr.y, z: tr.z, place: placeName(tr.x, tr.y, tr.z) });
            break;
          }
        }
      }
    }
    this.botTick(dt, now);
    if (this.ended) return;
    this.snap(now);
  }
  snap(now) {
    const rows = (forMom) => {
      const P = [];
      for (const q of this.P.values()) {
        if (q.gone) continue;
        const fl = (q.hide >= 0 ? 1 : 0) | (q.mv ? 2 : 0) | (q.caught ? 4 : 0) | (now < q.grace ? 8 : 0) | (q.rest > 0 ? 16 : 0) | (q.key >= 0 ? 32 : 0) | (q.esc ? 64 : 0);
        if (forMom && q.hide >= 0) P.push([q.id, 0, 0, 0, 0, 1]);
        else P.push([q.id, r2(q.x), r2(q.y), r2(q.z), r2(q.a), fl]);
      }
      return P;
    };
    const base = { type: 'snap', C: this.cat ? [r2(this.cat.x), r2(this.cat.y), r2(this.cat.z), r2(this.cat.a), (this.cat.chase ? 1 : 0) | (this.cat.mv ? 2 : 0)] : 0, T: this.traps.map(t => [t.x, t.y, t.z, now < t.arm ? 0 : 1]), HO: this.hd.map(h => h.open ? 1 : 0), ph: this.ph, t: Math.max(0, Math.round(this.t * 10) / 10), H: this.holeT.map(t => Math.max(0, Math.ceil((t - now) / 1000))), D: this.doorOpen ? 1 : 0, need: this.needed() };
    const momRows = rows(true), mouseRows = rows(false), Km = this.keyRows(true), Kq = this.keyRows(false);
    const occ = []; for (const q of this.P.values()) if (q.hide >= 0 && !q.gone) occ.push(q.hide);
    for (const q of this.P.values()) {
      if (q.gone || q.bot) continue;
      const mom = q.role === 'mom';
      const o = Object.assign({}, base, { P: mom ? momRows : mouseRows, K: mom ? Km : Kq });
      if (mom) { o.st = q.stam; o.vac = Math.max(0, Math.ceil((q.vac - now) / 1000)); o.rest = r2(q.rest); }
      else { o.O = occ; if (q.hide >= 0) o.hs = Math.floor(q.hideT); }
      this.to(q.id, o);
    }
  }
  checkEnd() {
    if (this.ended) return;
    const mice = this.mice.filter(q => !q.gone), moms = this.moms.filter(q => !q.gone);
    if (!this.practice && !moms.length) { this.end('mouse', '엄마가 다 나갔어요'); return; }
    if (!mice.length) { if (!this.practice) this.end('mom', '쥐가 다 나갔어요'); return; }
    const esc = mice.filter(q => q.esc).length, need = this.needed();
    if (esc >= need) { this.end('mouse'); return; }
    const left = mice.filter(q => !q.esc);
    if (left.length && left.every(q => q.caught)) this.end('mom', esc ? `${esc}마리만 탈출했어요` : '');
    else if (esc + left.length < need) this.end('mom');
  }
  // ───────── 봇 · 고양이 ─────────
  hear(m) { // 엄마 봇이 듣는 소리
    const now = this.now();
    if (m.e === 'sq') this.heard = { x: m.x, y: m.y, z: m.z, s: m.s, t: now, k: 'sq' };
    else if (m.e === 'hopen' || m.e === 'hprog') { const h = this.W.heavies[m.d]; if (h) this.heard = { x: h.ox, y: h.base, z: h.oz, t: now, k: 'heave' }; }
    else if (m.e === 'meow' || m.e === 'trap') this.heard = { x: m.x, y: m.y, z: m.z, t: now, k: m.e };
    else if (m.e === 'hole') { const h = this.W.holes[m.p][1 - m.from]; this.heard = { x: h.x + h.dx * .5, y: h.y, z: h.z + h.dz * .5, t: now, k: 'hole' }; }
  }
  nearNode(x, y, z) {
    let best = -1, bd = 1e9;
    NAV.n.forEach(([nx, ny, nz], i) => {
      if (i === 22 && !this.doorOpen) return;
      const d = Math.hypot(nx - x, (ny - y) * 4, nz - z) + (blocked(this.W, x, y + .08, z, nx, ny + .08, nz) ? 6 : 0);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  route(p, g) {
    const a = this.nearNode(p.x, p.y, p.z), b = this.nearNode(g.x, g.y, g.z);
    if (a < 0 || b < 0 || a === b) return [];
    const prev = new Map([[a, -1]]), q = [a];
    while (q.length) { const c = q.shift(); if (c === b) break; for (const n of this.adj[c]) if (!prev.has(n) && (n !== 22 || this.doorOpen)) { prev.set(n, c); q.push(n); } }
    if (!prev.has(b)) return [];
    const path = []; for (let c = b; c !== -1; c = prev.get(c)) path.unshift(NAV.n[c]);
    // 첫 지점이 바로 앞이면 건너뛴다
    if (path.length > 1 && Math.hypot(path[0][0] - p.x, path[0][2] - p.z) < .6) path.shift();
    return path;
  }
  // 목표 쪽으로 한 걸음 (길찾기 + 막히면 점프·옆걸음)
  goTo(p, tx, ty, tz, sp, dt, P) {
    const ai = p.ai;
    if (!ai.goal || Math.hypot(ai.goal.x - tx, ai.goal.z - tz) > .3 || Math.abs(ai.goal.y - ty) > .5) { ai.goal = { x: tx, y: ty, z: tz }; ai.path = this.route(p, ai.goal); }
    let wp = ai.path[0];
    if (wp && Math.hypot(wp[0] - p.x, wp[2] - p.z) < .35 && Math.abs(wp[1] - p.y) < .6) { ai.path.shift(); wp = ai.path[0]; }
    let gx = wp ? wp[0] : tx, gz = wp ? wp[2] : tz;
    if (ai.wig > 0) { ai.wig -= dt; gx = p.x + Math.cos(ai.wa); gz = p.z + Math.sin(ai.wa); }
    const dx = gx - p.x, dz = gz - p.z, d = Math.hypot(dx, dz);
    if (d < .04) { moveBody(this.W, p, 0, 0, dt, P); p.mv = 0; return wp ? 9 : 0; }
    const k = Math.min(d, sp * dt) / d, ox = p.x, oz = p.z;
    moveBody(this.W, p, dx * k, dz * k, dt, P);
    p.a = Math.atan2(dz, dx); p.mv = 1;
    if (Math.hypot(p.x - ox, p.z - oz) < sp * dt * .3) {
      ai.stuck += dt;
      if (P !== CFG.MOM && p.ground) p.vy = P === CFG.MOUSE ? JUMP_V : Math.sqrt(2 * CFG.G * .3);
      if (ai.stuck > .7) { ai.stuck = 0; ai.wig = .45; ai.wa = Math.random() * Math.PI * 2; ai.path = this.route(p, ai.goal); }
    } else ai.stuck = 0;
    return wp ? 9 : Math.hypot(tx - p.x, tz - p.z);
  }
  sees(ax, ay, az, b, r) { return Math.hypot(b.x - ax, b.z - az) < r && !blocked(this.W, ax, ay, az, b.x, b.y + .06, b.z); }
  botTick(dt, now) {
    const was = this.W.doorOpen; this.W.doorOpen = this.doorOpen; // 집 모양은 방끼리 같이 쓰니까 잠깐만
    try { this.botTick2(dt, now); } finally { this.W.doorOpen = was; }
  }
  botTick2(dt, now) {
    for (const p of this.P.values()) {
      if (!p.bot || p.gone || this.ended) continue;
      if (p.role === 'mom') this.momBot(p, dt, now); else this.mouseBot(p, dt, now);
    }
    if (this.cat && this.ph === 'hunt') this.catTick(dt, now);
  }
  mouseBot(p, dt, now) {
    if (!this.active(p)) return;
    const ai = p.ai, hard = p.diff === 'hard';
    const moms = this.moms.filter(m => !m.gone);
    const threat = moms.map(m => ({ m, d: Math.hypot(m.x - p.x, m.z - p.z) + Math.abs(m.y - p.y) * 2 })).sort((a, b) => a.d - b.d)[0];
    if (p.hide >= 0) {
      if (this.ph === 'hunt' && (!threat || threat.d > (hard ? 5 : 4)) && p.hideT > (hard ? 6 : 9) + Math.random() * 4) this.unhide(p, false);
      return;
    }
    if (now < p.stuck) { p.mv = 0; return; }
    ai.think -= dt;
    if (ai.think <= 0) {
      ai.think = hard ? .3 : .6;
      // 엄마가 아주 가깝거나, 다가오는 중이면 위험 (가만히 서 있는 엄마 옆은 슬쩍 지나간다)
      const danger = threat && this.ph === 'hunt' && (threat.d < 1.6 || (threat.d < (hard ? 3.2 : 2.4) && threat.m.mv)) && this.sees(threat.m.x, threat.m.y + CFG.MOM.eye, threat.m.z, p, 9);
      if (!danger && ai.tgt && ai.tgt.flee && now < ai.tgt.until) { /* 도망 중이면 조금 더 */ } else {
      let t = null;
      if (danger) {
        // 가까운 숨는 곳 (바닥 높이, 엄마 반대쪽) 아니면 도망
        let best = null, bs = 1e9;
        this.W.spots.forEach((s, i) => {
          if (Math.abs(s.y - p.y) > .15 || [...this.P.values()].some(q => q.hide === i)) return;
          const d = Math.hypot(s.ox - p.x, s.oz - p.z), dm = Math.hypot(s.ox - threat.m.x, s.oz - threat.m.z);
          if (d > 3 || dm < 1.5) return; const sc = d - dm * .5; if (sc < bs) { bs = sc; best = i; }
        });
        if (best !== null && Math.random() < (hard ? .7 : .5)) t = { k: 'hide', s: best, x: this.W.spots[best].ox, y: this.W.spots[best].y, z: this.W.spots[best].oz };
        else { const ax = p.x - threat.m.x, az = p.z - threat.m.z, al = Math.hypot(ax, az) || 1; const n = this.nearNode(p.x + ax / al * 3, p.y, p.z + az / al * 3); const N = NAV.n[n]; t = { k: 'go', x: N[0], y: N[1], z: N[2], flee: 1, until: now + 2000 }; }
      } else if (this.doorOpen) t = { k: 'go', x: 11.5, y: 0, z: HOUSE.door.z + 1 };
      else if (p.key >= 0) t = { k: 'go', x: HOUSE.door.plate[0], y: 0, z: HOUSE.door.plate[1] - .05 };
      else if (this.ph === 'hunt') {
        const keys = this.keys.map((k, i) => ({ k, i })).filter(({ k }) => !k.in && !k.by && !k.hid);
        if (keys.length) { const { k } = keys.sort((a, b) => Math.hypot(a.k.x - p.x, a.k.z - p.z) - Math.hypot(b.k.x - p.x, b.k.z - p.z))[0]; t = { k: 'key', x: k.x, y: k.y, z: k.z }; }
        else if (this.mice.some(q => q.caught && !q.gone) && Math.random() < .7) t = { k: 'res', x: HOUSE.cage[0] + .5, y: 0, z: HOUSE.cage[1] };
        else if (!this.solo && this.hd.some(h => !h.open && h.key >= 0)) {
          // 다 같이 같은 서랍으로 (제일 낮은 번호부터)
          if (this.botDrawer === undefined || this.hd[this.botDrawer].open) this.botDrawer = this.hd.findIndex(h => !h.open);
          const h = this.W.heavies[this.botDrawer]; t = { k: 'heave', d: this.botDrawer, x: h.ox, y: h.base, z: h.oz };
        }
      }
      if (!t) { if (!ai.tgt || ai.tgt.k !== 'wander' || Math.hypot(ai.tgt.x - p.x, ai.tgt.z - p.z) < .5) { const N = NAV.n[Math.random() * 22 | 0]; t = { k: 'wander', x: N[0], y: N[1], z: N[2] }; } else t = ai.tgt; }
      ai.tgt = t;
      }
    }
    const t = ai.tgt; if (!t) return;
    const sp = p.key >= 0 ? CFG.SPEED.mouseKey : CFG.SPEED.mouse;
    const d = this.goTo(p, t.x, t.y, t.z, sp * (hard ? 1 : .85), dt, CFG.MOUSE);
    if (d < .5 && d !== 9) {
      if (t.k === 'hide') this.msg(p.id, { type: 'hide', s: t.s });
      else if (t.k === 'res') this.msg(p.id, { type: 'res' });
      else if (t.k === 'heave') this.msg(p.id, { type: 'heave', d: t.d });
      else if (t.k === 'key' && t.y > p.y + .08) { // 높은 데 열쇠: 뛰고, 안 되면 기어오르기
        if (p.ground) p.vy = JUMP_V; ai.climb += dt;
        if (ai.climb > 1.2) { p.x = t.x; p.z = t.z; p.y = t.y; p.vy = 0; ai.climb = 0; }
      }
    } else ai.climb = 0;
  }
  momBot(p, dt, now) {
    if (this.ph !== 'hunt' || p.rest > 0) { p.mv = 0; return; }
    const ai = p.ai, hard = p.diff === 'hard', ey = p.y + CFG.MOM.eye;
    ai.think -= dt;
    if (ai.think <= 0) {
      ai.think = hard ? .3 : .7;
      const vis = this.mice.filter(q => this.active(q) && q.hide < 0 && this.sees(p.x, ey, p.z, q, hard ? 9 : 6.5))
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
      let t = null;
      if (vis.length) t = { k: 'chase', id: vis[0].id };
      else if (this.heard && now - this.heard.t < 12000) {
        const h = this.heard;
        t = h.s !== undefined && h.s >= 0 ? { k: 'open', s: h.s, x: this.W.spots[h.s].ox, y: this.W.spots[h.s].y, z: this.W.spots[h.s].oz } : { k: 'go', x: h.x, y: h.y, z: h.z, heard: 1 };
      } else if (this.keysIn() >= 2) t = { k: 'go', x: 11.5, y: 0, z: HOUSE.door.z - 1.4 };
      else if (!ai.tgt || ai.tgt.k !== 'patrol' || Math.hypot(ai.tgt.x - p.x, ai.tgt.z - p.z) < .6) { const N = NAV.n[Math.random() * 22 | 0]; t = { k: 'patrol', x: N[0], y: N[1], z: N[2] }; }
      else t = ai.tgt;
      if (t.k !== (ai.tgt && ai.tgt.k)) ai.react = hard ? .25 : .7;
      ai.tgt = t;
      // 쥐덫: 열쇠판 · 무거운 서랍 앞에 하나씩
      if (this.modes.trap && this.traps.length < 3 && Math.random() < (hard ? .25 : .08)) {
        const spots = [HOUSE.door.plate, ...this.W.heavies.filter((h, i) => !this.hd[i].open && h.base < 1).map(h => [h.ox, h.oz])];
        const c = spots[Math.random() * spots.length | 0];
        if (Math.hypot(c[0] - p.x, c[1] - p.z) < 2.8 && !this.traps.some(tr => Math.hypot(tr.x - c[0], tr.z - c[1]) < .5)) this.msg(p.id, { type: 'trap', x: c[0] + (Math.random() - .5) * .3, z: c[1] + (Math.random() - .5) * .3 });
      }
    }
    const t = ai.tgt; if (!t) return;
    ai.react -= dt;
    if (t.k === 'chase') {
      const q = this.P.get(t.id);
      if (this.active(q) && q.hide >= 0) { const sp = this.W.spots[q.hide]; this.heard = { x: sp.ox, y: sp.y, z: sp.oz, s: q.hide, t: now, k: 'saw' }; }
      if (!this.active(q) || q.hide >= 0) { ai.tgt = null; ai.think = 0; return; }
      const d3 = Math.hypot(q.x - p.x, q.y + .06 - ey, q.z - p.z);
      if (d3 > CFG.GRAB_REACH - .25) this.goTo(p, q.x, q.y, q.z, CFG.SPEED.mom * (hard ? 1 : .85), dt, CFG.MOM);
      else { p.mv = 0; moveBody(this.W, p, 0, 0, dt, CFG.MOM); p.a = Math.atan2(q.z - p.z, q.x - p.x); }
      if (d3 <= CFG.GRAB_REACH && ai.react <= 0 && now - p.grabT > (hard ? 450 : 900)) {
        if (Math.random() < (hard ? .85 : .55)) this.msg(p.id, { type: 'grab', id: q.id }); else p.grabT = now;
      }
      if (this.modes && p.vac <= now && Math.hypot(q.x - p.x, q.z - p.z) < 2.2 && Math.random() < (hard ? .05 : .01)) this.msg(p.id, { type: 'vac' });
      return;
    }
    const d = this.goTo(p, t.x, t.y, t.z, CFG.SPEED.mom * (hard ? .95 : .8), dt, CFG.MOM);
    if (t.k === 'open' && d < 1.2 && d !== 9 && ai.react <= 0) { this.msg(p.id, { type: 'open', s: t.s }); this.heard = null; ai.tgt = null; ai.think = .5; }
    else if (t.heard && d < .8 && d !== 9) { this.heard = null; ai.tgt = null; }
  }
  catTick(dt, now) {
    const c = this.cat, ai = c.ai;
    c.chaseT -= dt; if (c.chaseT <= 0) c.chase = null;
    ai.think -= dt;
    if (ai.think <= 0) {
      ai.think = .4;
      if (!c.chase) {
        const v = this.mice.filter(q => this.active(q) && q.hide < 0 && this.sees(c.x, c.y + .25, c.z, q, 4.5));
        if (v.length && now > c.meowT) {
          const q = v[0]; c.chase = q.id; c.chaseT = 3.5; c.meowT = now + 6000;
          this.out({ type: 'ev', e: 'meow', id: q.id, x: r2(c.x), y: r2(c.y), z: r2(c.z), place: placeName(q.x, q.y, q.z) });
        }
      }
      if (!c.chase && (!c.wt || Math.hypot(c.wt[0] - c.x, c.wt[2] - c.z) < .5)) c.wt = NAV.n[Math.random() * 22 | 0];
    }
    const q = c.chase && this.P.get(c.chase);
    if (q && this.active(q) && q.hide < 0) {
      if (Math.hypot(q.x - c.x, q.z - c.z) > .3) this.goTo(c, q.x, q.y, q.z, 3.4, dt, CAT); else { c.mv = 0; moveBody(this.W, c, 0, 0, dt, CAT); }
    } else if (c.wt) this.goTo(c, c.wt[0], c.wt[1], c.wt[2], 1.6, dt, CAT);
  }

  end(win, why) {
    if (this.ended) return;
    this.ended = true;
    const res = {
      type: 'end', win, why: why || '', needed: this.needed(), keysIn: this.keysIn(), practice: this.practice,
      mice: this.mice.map(t => ({ id: t.id, name: t.name, bot: t.bot, caught: t.caught, esc: t.esc, gone: t.gone, surv: Math.round(t.stat.surv), keysIn: t.stat.keysIn, rescues: t.stat.rescues, caughtN: t.stat.caughtN, place: t.caught ? t.lastPlace : placeName(t.x, t.y, t.z) })),
      moms: this.moms.map(m => ({ id: m.id, name: m.name, catches: m.stat.catches, miss: m.stat.miss, opens: m.stat.opens }))
    };
    this.result = res;
    this.out(res);
    if (this.onEnd) this.onEnd(res);
  }
}
