// 3D 모델 — 전부 단순한 도형 조합 + 만화 외곽선
import * as THREE from './vendor/three.module.min.js';
import { FURN } from './shared.js?v=23';

const OL = .011; // 외곽선 두께
const GEO = {};
const geo = (k, mk) => GEO[k] || (GEO[k] = mk());
const boxG = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
const sphG = () => geo('sph', () => new THREE.SphereGeometry(.5, 14, 10));
const cylG = (top = 1, seg = 14) => geo('cyl' + top + ':' + seg, () => new THREE.CylinderGeometry(.5 * top, .5, 1, seg));
const torG = (arc = 1) => geo('tor' + arc, () => new THREE.TorusGeometry(.5, .14, 6, 16, Math.PI * 2 * arc));

let grad = null;
function gradient() {
  if (grad) return grad;
  const d = new Uint8Array([90, 170, 255]);
  grad = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  return grad;
}
const MATS = {};
export function mat(c, opt) {
  const k = c + (opt ? JSON.stringify(opt) : '');
  return MATS[k] || (MATS[k] = new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: gradient() }, opt || {})));
}
export const outlineMat = new THREE.MeshBasicMaterial({ color: 0x3a2216, side: THREE.BackSide });

// 조립 도우미: 위치는 가운데 기준
class Mk {
  constructor() { this.parts = []; }
  add(g, col, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, ol = true) { this.parts.push({ g, col, x, y, z, sx, sy, sz, rx, ry, rz, ol }); return this; }
  b(w, h, d, col, x = 0, y = 0, z = 0, rx, ry, rz, ol) { return this.add(boxG(), col, x, y, z, w, h, d, rx, ry, rz, ol); }
  s(rx_, ry_, rz_, col, x = 0, y = 0, z = 0, ol) { return this.add(sphG(), col, x, y, z, rx_ * 2, ry_ * 2, rz_ * 2, 0, 0, 0, ol); }
  c(r, h, col, x = 0, y = 0, z = 0, top = 1, rx, ry, rz, seg, ol) { return this.add(cylG(top, seg), col, x, y, z, r * 2, h, r * 2, rx, ry, rz, ol); }
  t(r, col, x, y, z, rx, ry, rz) { return this.add(torG(), col, x, y, z, r * 2, r * 2, r * 2, rx, ry, rz, false); }
  build(outline = true, ol = OL) {
    const g = new THREE.Group();
    for (const p of this.parts) {
      const m = new THREE.Mesh(p.g, mat(p.col));
      m.position.set(p.x, p.y, p.z); m.rotation.set(p.rx, p.ry, p.rz); m.scale.set(p.sx, p.sy, p.sz);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
      if (outline && p.ol) {
        const o = new THREE.Mesh(p.g, outlineMat);
        o.position.copy(m.position); o.rotation.copy(m.rotation);
        o.scale.set(p.sx + ol * 2, p.sy + ol * 2, p.sz + ol * 2); o.userData.ol = 1;
        g.add(o);
      }
    }
    return g;
  }
}

const BR = 0x8a522c, SV = 0xbfc8d0, YL = 0xffd34d, DK = 0x3a2a22, PK = 0xff9ac4;

// 가구 (shared.js 의 부품표 그대로) — 충돌 상자와 모양이 똑같다
export function buildFurn(t, outline = true) {
  const F = FURN[t], m = new Mk();
  for (const p of F.parts) {
    if (p[0] === 'b') { const [, x, y, z, w, h, d, col] = p; m.b(w, h, d, col, x, y + h / 2, z, 0, 0, 0, h > .008); }
    else if (p[0] === 'c') { const [, x, y, z, r, h, col] = p; m.c(r, h, col, x, y + h / 2, z); }
    else { const [, x, y, z, rx, ry, rz, col] = p; m.s(rx, ry, rz, col, x, y + ry, z); }
  }
  if (t === 'cage') for (let i = 0; i < 11; i++) { const x = -.3 + i * .06; m.c(.006, .4, SV, x, .22, .232, 1, 0, 0, 0, 6, false).c(.006, .4, SV, x, .22, -.232, 1, 0, 0, 0, 6, false); }
  return m.build(outline);
}
// 숨는 곳 문짝 · 서랍 앞판 (움직이니까 따로)
export function buildPanel(s, col, outline = true, depth = .3) {
  const m = new Mk(), w = s.w, h = s.h;
  // 서랍 = 앞판 + 양옆 · 바닥 · 뒤판 (열면 상자째 빠져나온다)
  if (s.k === 'drawer') m.b(w, h, .03, col, 0, h / 2, .015).b(w * .3, .03, .02, SV, 0, h * .55, .04)
    .b(.02, h * .75, depth, col, -(w / 2 - .03), h * .4, -depth / 2).b(.02, h * .75, depth, col, w / 2 - .03, h * .4, -depth / 2)
    .b(w - .06, .02, depth, col, 0, .03, -depth / 2).b(w - .06, h * .75, .02, col, 0, h * .4, -depth + .01);
  else m.b(w, h, .03, col, w / 2, h / 2, .015).b(.03, Math.min(.16, h * .4), .02, SV, w - .08, h * .55, .04); // 문은 왼쪽 경첩
  return m.build(outline);
}

// 쥐 (앞 = +z), 키 약 .1
export function buildMouse(col, outline = true) {
  const m = new Mk(), ear = 0xffb3c8;
  m.s(.046, .04, .075, col, 0, .045, -.01).s(.036, .034, .042, col, 0, .062, .065)
    .s(.009, .009, .009, PK, 0, .062, .108).s(.004, .004, .002, 0xffffff, -.004, .066, .114, false)
    .s(.024, .024, .007, col, -.026, .1, .055).s(.024, .024, .007, col, .026, .1, .055)
    .s(.016, .016, .005, ear, -.026, .1, .059, false).s(.016, .016, .005, ear, .026, .1, .059, false)
    .s(.007, .008, .005, 0x111111, -.017, .072, .098, false).s(.007, .008, .005, 0x111111, .017, .072, .098, false)
    .s(.012, .008, .016, PK, -.025, .008, .04, false).s(.012, .008, .016, PK, .025, .008, .04, false)
    .s(.012, .008, .016, PK, -.028, .008, -.05, false).s(.012, .008, .016, PK, .028, .008, -.05, false);
  const g = m.build(outline, .004);
  // 꼬리 (흔들리게 따로)
  const tail = new THREE.Group(); tail.position.set(0, .03, -.08);
  const tm = mat(PK);
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(cylG(1, 6), tm); c.scale.set(.008, .03, .008); c.rotation.x = Math.PI / 2 + .25; c.position.set(0, .006 * i, -.026 * i); tail.add(c); }
  g.add(tail); g.userData.tail = tail;
  // 입에 문 열쇠
  const key = buildKey(); key.scale.setScalar(.75); key.rotation.set(0, Math.PI / 2, 0); key.position.set(0, .05, .13); key.visible = false;
  g.add(key); g.userData.key = key;
  return g;
}
// 열쇠 (길이 약 .15)
export function buildKey() {
  const m = new Mk(), K = 0xf2c230;
  m.t(.035, K, -.06, 0, 0, 0, 0, 0).b(.11, .018, .012, K, .01, 0, 0).b(.012, .03, .012, K, .045, -.02, 0).b(.012, .022, .012, K, .065, -.016, 0);
  return m.build(false);
}
// 현관문 (경첩 = 왼쪽, 문 너비 1)
export function buildDoor() {
  const g = new THREE.Group(), m = new Mk();
  m.b(1, 2.1, .08, 0x9a6a3c, .5, 1.05, 0).b(.86, .8, .02, 0xb07a4a, .5, 1.55, .045, 0, 0, 0, false).b(.86, .7, .02, 0xb07a4a, .5, .62, .045, 0, 0, 0, false)
    .s(.04, .04, .04, YL, .88, 1.0, .07)
    .b(.5, .22, .02, 0x6b4a33, .5, .17, .05); // 열쇠 판 (쥐 높이)
  const panel = m.build(true);
  const slots = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(boxG(), new THREE.MeshBasicMaterial({ color: 0x1a1210 })); s.scale.set(.08, .1, .01); s.position.set(.34 + i * .16, .17, .062); panel.add(s); slots.push(s);
    const k = buildKey(); k.rotation.set(0, Math.PI / 2, -Math.PI / 2); k.position.set(.34 + i * .16, .2, .1); k.visible = false; panel.add(k); slots.push(k);
  }
  panel.userData.slots = slots;
  g.add(panel); g.userData.panel = panel;
  return g;
}
// 쥐구멍 (벽 바닥의 어두운 반원) + 먼지 뭉치
export function buildHole() {
  const g = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.CircleGeometry(.085, 16, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x120a06 }));
  g.add(hole);
  const rim = new THREE.Mesh(new THREE.RingGeometry(.085, .1, 16, 1, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x5e432c })); rim.position.z = .001; g.add(rim);
  const dust = new Mk().s(.06, .05, .04, 0xb8b2a8, 0, .03, .02).s(.045, .04, .035, 0xa8a298, -.05, .025, .03).s(.04, .035, .03, 0xc8c2b8, .05, .02, .03).s(.03, .03, .025, 0x989288, .01, .07, .025).build(true, .004);
  dust.visible = false; g.add(dust); g.userData.dust = dust;
  return g;
}

// 고양이 (앞 = +z), 키 약 .3
export function buildCat(outline = true) {
  const m = new Mk(), O = 0xf2a04a, W = 0xfff2e0, DK2 = 0x2a2a2a;
  m.s(.1, .09, .2, O, 0, .17, 0).s(.09, .085, .085, O, 0, .26, .19).s(.05, .035, .03, W, 0, .23, .27)
    .b(.05, .06, .02, O, -.05, .35, .19, 0, 0, .3).b(.05, .06, .02, O, .05, .35, .19, 0, 0, -.3)
    .s(.012, .02, .006, 0x7ad04a, -.035, .28, .265, false).s(.012, .02, .006, 0x7ad04a, .035, .28, .265, false)
    .s(.012, .009, .008, PK, 0, .245, .3, false)
    .b(.035, .12, .035, O, -.06, .06, .12).b(.035, .12, .035, O, .06, .06, .12).b(.035, .12, .035, O, -.06, .06, -.12).b(.035, .12, .035, O, .06, .06, -.12)
    .b(.02, .02, .1, DK2, -.08, .245, .29, 0, .4, 0, false).b(.02, .02, .1, DK2, .08, .245, .29, 0, -.4, 0, false);
  const g = m.build(outline, .006);
  const tail = new THREE.Group(); tail.position.set(0, .2, -.19);
  for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(cylG(1, 6), mat(O)); c.scale.set(.03, .06, .03); c.position.set(0, .05 * i, -.015 * i); tail.add(c); }
  g.add(tail); g.userData.tail = tail;
  return g;
}
// 쥐덫
export function buildTrap() {
  const m = new Mk();
  m.b(.16, .015, .09, 0xc98a55, 0, .0075, 0).b(.14, .006, .006, SV, 0, .02, .03).b(.006, .006, .07, SV, -.06, .02, 0).b(.006, .006, .07, SV, .06, .02, 0).b(.03, .008, .025, YL, .02, .019, -.01);
  return m.build(true, .004);
}

// 가구 높이 · 크기
export function furnBox(t) { return new THREE.Box3().setFromObject(buildFurn(t, false)); }

// 안 움직이는 것들을 색깔별로 한 덩어리로 (그리는 횟수 줄이기)
export function mergeStatic(groups) {
  const byMat = new Map();
  for (const g of groups) {
    g.updateMatrixWorld(true);
    g.traverse(o => {
      if (!o.isMesh) return;
      let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      const k = o.material; if (!byMat.has(k)) byMat.set(k, []);
      byMat.get(k).push(geo);
    });
  }
  const out = new THREE.Group();
  for (const [m, list] of byMat) {
    let n = 0; for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    bg.computeBoundingSphere();
    const mesh = new THREE.Mesh(bg, m);
    if (m !== outlineMat) { mesh.castShadow = true; mesh.receiveShadow = true; }
    out.add(mesh);
  }
  return out;
}
// 상자인데 무늬가 늘어나지 않게 (가로 길이만큼 반복)
export function texBox(w, h, d, material) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const fs = [[d, 1], [d, 1], [w, d], [w, d], [w, 1], [w, 1]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * fs[f][0], uv.getY(k) * fs[f][1]); }
  return new THREE.Mesh(g, material);
}
export { THREE };
