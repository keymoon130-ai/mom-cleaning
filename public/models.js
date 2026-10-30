// 3D 모델 — 전부 단순한 도형 조합 + 만화 외곽선
import * as THREE from './vendor/three.module.min.js';

const OL = .011; // 외곽선 두께
const GEO = {};
const geo = (k, mk) => GEO[k] || (GEO[k] = mk());
const boxG = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
const sphG = () => geo('sph', () => new THREE.SphereGeometry(.5, 14, 10));
const cylG = (top = 1, seg = 14) => geo('cyl' + top + ':' + seg, () => new THREE.CylinderGeometry(.5 * top, .5, 1, seg));
const torG = (arc = 1) => geo('tor' + arc, () => new THREE.TorusGeometry(.5, .08, 6, 16, Math.PI * 2 * arc));

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
  t(r, col, x, y, z, arc, rx, ry, rz, th = 1) { return this.add(torG(arc), col, x, y, z, r * 2, r * 2, r * 2 * th, rx, ry, rz, false); }
  build(outline = true) {
    const g = new THREE.Group();
    for (const p of this.parts) {
      const m = new THREE.Mesh(p.g, mat(p.col));
      m.position.set(p.x, p.y, p.z); m.rotation.set(p.rx, p.ry, p.rz); m.scale.set(p.sx, p.sy, p.sz);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
      if (outline && p.ol) {
        const o = new THREE.Mesh(p.g, outlineMat);
        o.position.copy(m.position); o.rotation.copy(m.rotation);
        o.scale.set(p.sx + OL * 2, p.sy + OL * 2, p.sz + OL * 2); o.userData.ol = 1;
        g.add(o);
      }
    }
    return g;
  }
}

// ───────── 숨을 수 있는 물건 ─────────
const BR = 0x8a522c, WOOD = 0xc98a55, WH = 0xf7f4ee, PK = 0xff7fae, BL = 0x5fb8ff, YL = 0xffd34d, GR = 0x3fbf6a, DK = 0x3a2a22, SV = 0xbfc8d0;
const OBJS = {
  sock: m => m.b(.09, .2, .09, WH, 0, .12, 0).b(.091, .03, .091, PK, 0, .2, 0).b(.091, .03, .091, PK, 0, .13, 0).b(.09, .07, .17, WH, 0, .035, .05).b(.092, .04, .05, PK, 0, .035, .12),
  cup: m => m.c(.08, .16, BL, 0, .08, 0).c(.066, .006, 0x6b3f22, 0, .158, 0, 1, 0, 0, 0, 14, false).b(.03, .1, .025, BL, .095, .085, 0).b(.08, .06, .002, WH, 0, .09, .08, 0, 0, 0, false),
  book: m => m.b(.17, .24, .05, 0xe0503c, 0, .12, 0, 0, 0, .12).b(.155, .225, .052, 0xfff6d8, .006, .12, 0, 0, 0, .12, false).b(.1, .03, .053, YL, -.01, .17, 0, 0, 0, .12, false),
  ball: m => m.s(.12, .12, .12, 0xff5a5a, 0, .12, 0).s(.122, .028, .122, WH, 0, .12, 0, false).s(.03, .03, .01, 0xffffff, -.05, .17, .1, false),
  block: m => m.b(.2, .2, .2, YL, 0, .1, 0).b(.14, .14, .01, BL, 0, .1, .1, 0, 0, 0, false).b(.01, .14, .14, 0xff5a5a, .1, .1, 0, 0, 0, 0, false).b(.14, .01, .14, GR, 0, .2, 0, 0, 0, 0, false),
  apple: m => m.s(.085, .075, .085, 0xe8332a, 0, .075, 0).c(.008, .05, 0x6b3f22, 0, .17, 0).s(.035, .01, .018, GR, .03, .17, 0, false),
  milk: m => m.b(.11, .18, .11, WH, 0, .09, 0).b(.112, .06, .112, BL, 0, .1, 0, 0, 0, 0, false).b(.11, .06, .08, WH, 0, .2, .02, -.6).b(.11, .06, .08, WH, 0, .2, -.02, .6).b(.11, .03, .01, WH, 0, .245, 0),
  slipper: m => m.b(.11, .03, .26, 0xff9ac4, 0, .015, 0).b(.12, .06, .09, PK, 0, .05, .06).s(.03, .02, .01, WH, 0, .07, .11, false),
  roll: m => m.c(.075, .13, WH, 0, .065, 0).c(.028, .132, 0xc9a679, 0, .065, 0, 1, 0, 0, 0, 10, false).b(.05, .002, .08, WH, .06, .005, .07, 0, 0, 0, false),
  duck: m => m.s(.11, .07, .09, YL, 0, .07, 0).s(.055, .055, .055, YL, .07, .16, 0).b(.05, .02, .04, 0xff9a3c, .13, .15, 0).s(.01, .01, .01, DK, .1, .18, .035, false).s(.01, .01, .01, DK, .1, .18, -.035, false).b(.06, .03, .06, YL, -.1, .1, 0, 0, 0, .5),
  cushion: m => m.s(.22, .21, .08, 0xc27be8, 0, .21, 0).s(.03, .03, .015, YL, 0, .21, .075, false),
  bin: m => m.c(.16, .36, 0x5fb38f, 0, .18, 0, 1.2).c(.2, .03, 0x4a9a78, 0, .36, 0).c(.17, .005, 0x2f5a4a, 0, .376, 0, 1, 0, 0, 0, 14, false),
  plant: m => m.c(.13, .2, 0xd0703c, 0, .1, 0, 1.35).c(.18, .03, 0xe07f48, 0, .2, 0).s(.13, .14, .13, GR, 0, .32, 0).s(.08, .1, .08, 0x2fa65a, .09, .4, .03).s(.08, .1, .08, 0x2fa65a, -.08, .42, -.03).s(.06, .08, .06, 0x5fd77f, 0, .5, 0),
  pot: m => m.c(.16, .15, SV, 0, .075, 0).c(.165, .02, 0xd4dce4, 0, .16, 0).s(.025, .02, .025, DK, 0, .18, 0).b(.06, .02, .03, DK, .19, .12, 0).b(.06, .02, .03, DK, -.19, .12, 0),
  kettle: m => m.s(.13, .12, .13, 0xff9a3c, 0, .12, 0).c(.02, .14, 0xff9a3c, .14, .15, 0, .6, 0, 0, -.9).t(.07, DK, 0, .25, 0, .5, 0, 0, 0).c(.04, .03, 0xe07f2c, 0, .24, 0),
  box: m => m.b(.38, .32, .32, 0xc9935a, 0, .16, 0).b(.07, .005, .33, 0xe8d29a, 0, .322, 0, 0, 0, 0, false).b(.38, .01, .14, 0xe0ad74, 0, .37, -.19, .9).b(.38, .01, .14, 0xe0ad74, 0, .37, .19, -.9).b(.1, .07, .005, WH, -.1, .12, .162, 0, 0, 0, false),
  cooker: m => m.c(.15, .2, WH, 0, .1, 0).s(.155, .05, .155, 0xeeeeee, 0, .2, 0).b(.1, .06, .02, 0x2a3a48, 0, .1, .145).c(.152, .03, PK, 0, .03, 0),
  bucket: m => m.c(.14, .26, 0x3b8fd6, 0, .13, 0, 1.3).c(.18, .02, BL, 0, .26, 0).t(.17, DK, 0, .27, 0, .5, 0, 0, 0),
  radio: m => m.b(.34, .22, .12, 0xc9935a, 0, .13, 0).b(.15, .15, .01, 0x4a2c1d, -.07, .13, .06, 0, 0, 0, false).c(.03, .02, YL, .1, .17, .065, 1, Math.PI / 2).c(.02, .02, DK, .1, .1, .065, 1, Math.PI / 2).c(.006, .25, SV, .12, .35, 0, 1, 0, 0, -.3).b(.04, .02, .1, DK, -.13, .01, 0).b(.04, .02, .1, DK, .13, .01, 0),
  basket: m => m.c(.24, .34, 0xe0c27a, 0, .17, 0, 1.25, 0, 0, 0, 10).c(.31, .03, 0xb8964a, 0, .34, 0, 1, 0, 0, 0, 10).s(.12, .07, .1, PK, -.08, .36, 0).s(.12, .07, .1, BL, .08, .37, .05).s(.08, .05, .08, WH, .02, .4, -.1).b(.04, .14, .04, 0x9be15d, .1, .44, -.06, .3),
  chair: m => { m.b(.42, .05, .42, WOOD, 0, .45, 0); for (const [x, z] of [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]]) m.b(.04, .45, .04, BR, x, .225, z); return m.b(.04, .45, .04, BR, -.18, .7, -.19).b(.04, .45, .04, BR, .18, .7, -.19).b(.36, .07, .03, WOOD, 0, .85, -.19).b(.36, .05, .03, WOOD, 0, .66, -.19); },
  lamp: m => m.c(.14, .03, 0x4a4a4a, 0, .015, 0).c(.015, 1.15, 0x6b6b6b, 0, .6, 0).c(.21, .27, 0xfff3b0, 0, 1.3, 0, .55).c(.05, .05, 0xffffff, 0, 1.17, 0, 1, 0, 0, 0, 10, false),
  rice: m => m.s(.21, .29, .15, 0xf2ead8, 0, .28, 0).c(.06, .08, 0xe4d8bc, 0, .58, 0, .6).b(.18, .14, .01, WH, 0, .3, .145, 0, 0, 0, false).b(.18, .03, .012, 0x2b4fa8, 0, .3, .147, 0, 0, 0, false),
  trunk: m => m.b(.62, .34, .38, 0x7a4a2a, 0, .17, 0).b(.63, .1, .39, 0x8e5a34, 0, .38, 0).b(.05, .45, .395, 0xc9a24a, -.2, .22, 0, 0, 0, 0, false).b(.05, .45, .395, 0xc9a24a, .2, .22, 0, 0, 0, 0, false).b(.08, .08, .02, YL, 0, .32, .2),
  fan: m => m.c(.15, .04, WH, 0, .02, 0).c(.02, .72, WH, 0, .4, 0).c(.21, .07, 0xd8eef9, 0, .85, 0, 1, Math.PI / 2, 0, 0, 16).s(.05, .05, .05, BL, 0, .85, .05).b(.32, .04, .01, WH, 0, .85, .04, 0, 0, .5, false).b(.32, .04, .01, WH, 0, .85, .04, 0, 0, -1.07, false),
  tv: m => m.b(.56, .4, .42, 0x8a6a4a, 0, .3, 0).b(.38, .29, .01, 0x3a4a4a, -.06, .3, .21).c(.025, .02, DK, .21, .37, .215, 1, Math.PI / 2).c(.025, .02, DK, .21, .27, .215, 1, Math.PI / 2).b(.04, .1, .04, DK, -.22, .05, .15).b(.04, .1, .04, DK, .22, .05, .15).b(.04, .1, .04, DK, -.22, .05, -.15).b(.04, .1, .04, DK, .22, .05, -.15).c(.006, .3, DK, -.08, .62, 0, 1, 0, 0, .4).c(.006, .3, DK, .08, .62, 0, 1, 0, 0, -.4)
};

// ───────── 가구 (w = x, d = z, 등 = -z) ─────────
const DECS = {
  bed: m => { for (const [x, z] of [[-.45, -.9], [.45, -.9], [-.45, .9], [.45, .9]]) m.b(.08, .32, .08, BR, x, .16, z); return m.b(1, .1, 1.9, WOOD, 0, .35, 0).b(.96, .18, 1.86, WH, 0, .49, 0).b(.98, .06, 1.25, BL, 0, .6, .3).b(.6, .1, .3, WH, 0, .64, -.7).b(1, .65, .08, BR, 0, .62, -.93).b(1, .3, .06, BR, 0, .5, .93); },
  shelf: m => { m.b(.04, 1.6, .35, BR, -.43, .8, 0).b(.04, 1.6, .35, BR, .43, .8, 0).b(.9, 1.6, .02, 0x6b3f22, 0, .8, -.165); const cols = [0xe0503c, 0x3b8fd6, YL, GR, 0xc27be8, 0xff9a3c]; for (let i = 0; i < 4; i++) { const y = .04 + i * .4; m.b(.86, .03, .33, WOOD, 0, y, 0); if (i < 3) for (let k = 0; k < 7; k++) { const h = .22 + ((k * 7 + i * 3) % 4) * .03; m.b(.07, h, .24, cols[(k + i) % 6], -.33 + k * .1, y + .015 + h / 2, 0, 0, 0, 0, false); } } return m.b(.9, .03, .35, WOOD, 0, 1.6, 0); },
  fridge: m => m.b(.72, 1.8, .7, 0xf4f7fa, 0, .9, 0).b(.73, .02, .71, 0xb8c2cc, 0, 1.2, 0, 0, 0, 0, false).b(.04, .25, .04, SV, .28, 1.4, .37).b(.04, .4, .04, SV, .28, .85, .37).b(.08, .08, .01, YL, -.15, .9, .355, 0, 0, 0, false).b(.07, .06, .01, PK, -.05, 1.45, .355, 0, 0, 0, false),
  table: m => { m.b(1.2, .05, .8, WOOD, 0, .73, 0); for (const [x, z] of [[-.54, -.34], [.54, -.34], [-.54, .34], [.54, .34]]) m.b(.06, .7, .06, BR, x, .35, z); return m; },
  sofa: m => m.b(1.6, .38, .8, 0x5fb38f, 0, .19, 0).b(1.6, .5, .2, 0x4a9a78, 0, .58, -.3).b(.18, .55, .8, 0x4a9a78, -.71, .3, 0).b(.18, .55, .8, 0x4a9a78, .71, .3, 0).b(.6, .12, .55, 0x6cc8a0, -.31, .43, .08).b(.6, .12, .55, 0x6cc8a0, .31, .43, .08).b(.3, .25, .1, YL, -.3, .6, -.15, -.2),
  washer: m => m.b(.66, .85, .66, 0xf4f7fa, 0, .425, 0).b(.66, .14, .02, 0xdfe6ec, 0, .78, .33, 0, 0, 0, false).c(.22, .03, 0x9aa6b2, 0, .4, .33, 1, Math.PI / 2).c(.17, .035, 0xa8d8ff, 0, .4, .335, 1, Math.PI / 2, 0, 0, 14, false).b(.06, .03, .01, 0x5fd0b5, .15, .78, .335, 0, 0, 0, false),
  wardrobe: m => m.b(1.1, 1.9, .6, 0xb07a4a, 0, .95, 0).b(.02, 1.8, .61, BR, 0, .95, 0, 0, 0, 0, false).b(.03, .2, .03, YL, -.06, 1, .31).b(.03, .2, .03, YL, .06, 1, .31).b(1.12, .06, .62, BR, 0, 1.9, 0),
  tub: m => m.b(1.6, .5, .8, WH, 0, .27, 0).b(1.44, .02, .64, 0xa8d8ff, 0, .48, 0, 0, 0, 0, false).s(.08, .05, .08, WH, -.3, .5, .1, false).s(.1, .06, .1, WH, .2, .5, -.1, false).s(.06, .05, .05, YL, .5, .52, .1),
  cloth: m => { for (const [x, z] of [[-.54, -.34], [.54, -.34], [-.54, .34], [.54, .34]]) m.b(.06, .7, .06, BR, x, .35, z); m.b(1.2, .05, .8, WOOD, 0, .73, 0).b(1.32, .02, .92, 0xff9a9a, 0, .765, 0).b(1.32, .2, .02, 0xff9a9a, 0, .67, .46).b(1.32, .2, .02, 0xff9a9a, 0, .67, -.46).b(.02, .2, .92, 0xff9a9a, .66, .67, 0).b(.02, .2, .92, 0xff9a9a, -.66, .67, 0); for (let i = -2; i <= 2; i++) m.b(.08, .005, .93, WH, i * .26, .777, 0, 0, 0, 0, false); return m.c(.06, .14, 0x7cc4ff, .2, .85, 0).s(.07, .07, .07, 0xe8332a, -.25, .84, .1); },
  desk: m => { for (const [x, z] of [[-.5, -.25], [.5, -.25], [-.5, .25], [.5, .25]]) m.b(.05, .7, .05, BR, x, .35, z); return m.b(1.1, .05, .6, WOOD, 0, .73, 0).b(.35, .08, .5, 0xb07a4a, .3, .67, 0).b(.08, .02, .01, YL, .3, .67, .255, 0, 0, 0, false).c(.08, .02, DK, -.35, .76, -.15).c(.012, .3, DK, -.35, .9, -.15, 1, 0, 0, .3).c(.1, .1, YL, -.3, 1.05, -.1, .5).b(.2, .03, .28, 0xe0503c, .1, .77, .05); },
  toyshelf: m => { m.b(.04, 1, .4, WOOD, -.48, .5, 0).b(.04, 1, .4, WOOD, .48, .5, 0).b(1, 1, .02, 0xffe0b0, 0, .5, -.19); for (const y of [.03, .5, .98]) m.b(.96, .04, .4, WOOD, 0, y, 0); return m.b(.18, .18, .18, 0xff5a5a, -.3, .14, 0).s(.1, .1, .1, BL, 0, .15, 0).b(.15, .2, .15, GR, .3, .15, 0).b(.2, .14, .2, YL, -.25, .59, 0).s(.11, .11, .11, PK, .1, .62, 0).b(.12, .25, .12, 0xc27be8, .32, .64, 0).s(.12, .1, .1, 0xb07a4a, 0, 1.08, 0); },
  dryer: m => { for (const sx of [-.55, .55]) m.b(.03, 1.15, .03, SV, sx, .55, -.2, .2).b(.03, 1.15, .03, SV, sx, .55, .2, -.2); for (const z of [-.12, .12]) m.c(.012, 1.12, SV, 0, 1.0, z, 1, 0, 0, Math.PI / 2, 8, false); m.c(.012, 1.12, SV, 0, .75, -.2, 1, 0, 0, Math.PI / 2, 8, false).c(.012, 1.12, SV, 0, .75, .2, 1, 0, 0, Math.PI / 2, 8, false); return m.b(.32, .45, .02, PK, -.3, .8, .12).b(.28, .5, .02, BL, .15, .78, .12).b(.3, .4, .02, 0x9be15d, -.1, .82, -.12).b(.12, .25, .02, WH, .4, .88, -.12); },
  blanket: m => m.s(.45, .12, .45, 0x7cc4ff, 0, .1, 0).s(.42, .11, .4, 0xffb3d1, .02, .26, .02).s(.35, .1, .33, 0xfff6d8, -.03, .38, -.02).s(.12, .07, .2, WH, .15, .46, .05),
  curtain: m => { m.c(.02, 1.3, SV, 0, 2.05, 0, 1, 0, 0, Math.PI / 2, 8); for (let i = 0; i < 8; i++) m.b(.16, 1.95, .05, i % 2 ? 0x9fd3ff : 0x8cc6f5, -.53 + i * .152, 1.02, (i % 2 ? .04 : -.02)); return m.b(1.2, .04, .1, 0xffd34d, 0, 1.05, .07, 0, 0, 0, false); },
  bear: m => m.s(.25, .27, .2, 0xb07a4a, 0, .32, 0).s(.18, .17, .16, 0xb07a4a, 0, .68, 0).s(.06, .06, .04, 0xb07a4a, -.13, .82, 0).s(.06, .06, .04, 0xb07a4a, .13, .82, 0).s(.07, .05, .05, 0xe9c9a0, 0, .64, .14).s(.016, .016, .01, DK, -.06, .72, .15, false).s(.016, .016, .01, DK, .06, .72, .15, false).s(.08, .14, .08, 0xb07a4a, -.24, .38, .05).s(.08, .14, .08, 0xb07a4a, .24, .38, .05).s(.09, .07, .13, 0xb07a4a, -.12, .07, .12).s(.09, .07, .13, 0xb07a4a, .12, .07, .12).b(.22, .06, .02, 0xff5a5a, 0, .52, .17),
  sink: m => m.b(1.6, .86, .58, WH, 0, .43, 0).b(1.64, .05, .62, 0x9aa6b2, 0, .885, 0).b(.5, .03, .36, 0x5a6670, -.3, .9, .02, 0, 0, 0, false).c(.02, .25, SV, -.3, 1.0, -.2).c(.015, .15, SV, -.3, 1.1, -.12, 1, Math.PI / 2).b(.01, .7, .01, 0xc8d0d6, 0, .42, .295, 0, 0, 0, false).b(.01, .7, .01, 0xc8d0d6, .53, .42, .295, 0, 0, 0, false).b(.01, .7, .01, 0xc8d0d6, -.53, .42, .295, 0, 0, 0, false).c(.1, .12, 0xff9a3c, .45, .97, 0).b(.2, .02, .14, 0xc98a55, .1, .92, 0),
  shoes: m => m.b(1, .95, .35, 0xd9b48a, 0, .475, 0).b(.01, .85, .36, BR, 0, .47, 0, 0, 0, 0, false).b(.04, .1, .02, YL, -.06, .6, .18).b(.04, .1, .02, YL, .06, .6, .18).b(.1, .07, .24, 0x3b8fd6, -.2, .99, 0).b(.1, .07, .24, 0x3b8fd6, -.07, .99, 0).b(.1, .1, .22, 0xff5a5a, .25, 1.0, 0),
  bigplant: m => m.c(.22, .36, 0xd0703c, 0, .18, 0, 1.25).c(.03, .7, 0x6b3f22, 0, .7, 0).s(.24, .22, .24, GR, 0, 1.05, 0).s(.18, .2, .18, 0x2fa65a, .16, 1.2, .05).s(.18, .2, .18, 0x2fa65a, -.15, 1.18, -.06).s(.15, .16, .15, 0x5fd77f, 0, 1.36, 0),
  boxpile: m => m.b(.5, .42, .45, 0xc9935a, -.22, .21, -.15).b(.45, .38, .4, 0xd4a46a, .25, .19, .1, 0, .2).b(.42, .36, .38, 0xc9935a, -.1, .6, -.1, 0, -.15).b(.32, .3, .3, 0xe0ad74, .05, .93, -.1, 0, .3).b(.06, .005, .46, 0xe8d29a, -.22, .421, -.15, 0, 0, 0, false),
  tarp: m => m.b(1.1, .3, .9, 0x6b4a33, 0, .15, 0).s(.6, .38, .5, 0x8a9a7a, 0, .45, 0).s(.32, .3, .3, 0x8a9a7a, -.28, .65, -.1).s(.28, .28, .26, 0x7a8a6a, .3, .6, .12).s(.12, .08, .12, 0x6a7a5a, .45, .3, .4),
  chairs: m => { for (let k = 0; k < 3; k++) { const y = k * .32, r = k * .15; m.b(.42, .04, .42, WOOD, 0, .45 + y, 0, 0, r).b(.04, .45, .04, BR, -.18, .225 + y, -.18, 0, r).b(.04, .45, .04, BR, .18, .225 + y, .18, 0, r).b(.36, .3, .03, WOOD, 0, .68 + y, -.19, 0, r); } return m; },
  oldsofa: m => m.b(1.5, .36, .75, 0x9a7a5a, 0, .18, 0).b(1.5, .48, .2, 0x86684a, 0, .55, -.28).b(.16, .5, .75, 0x86684a, -.67, .27, 0).b(.16, .5, .75, 0x86684a, .67, .27, 0).b(.58, .1, .52, 0xae8e6c, -.29, .41, .08).b(.58, .1, .52, 0xae8e6c, .29, .41, .08).b(.2, .16, .01, 0x7cc4ff, .3, .6, -.17, 0, 0, .3, false),
  rack: m => { m.c(.02, 1.5, SV, -.55, .75, 0).c(.02, 1.5, SV, .55, .75, 0).c(.018, 1.14, SV, 0, 1.48, 0, 1, 0, 0, Math.PI / 2, 8).b(.06, .03, .45, SV, -.55, .02, 0).b(.06, .03, .45, SV, .55, .02, 0); const cols = [0xff7fae, 0x7cc4ff, YL, 0x9be15d, 0xc27be8, WH]; for (let i = 0; i < 6; i++) m.b(.06, .8 - (i % 3) * .12, .38, cols[i], -.4 + i * .16, 1.05 - (.4 - (i % 3) * .06), 0); return m; },
  mirror: m => m.b(.7, 1.6, .06, 0xb07a4a, 0, .8, -.06, -.06).b(.58, 1.46, .01, 0xd6ecf7, 0, .81, -.025, -.06, 0, 0, false).b(.12, .5, .005, 0xffffff, -.12, 1.0, -.018, -.06, 0, .3, false),
  beam: m => m.b(.3, 2.2, .3, 0x6b4a33, 0, 1.1, 0).b(.32, .04, .32, 0x4a2c1d, 0, .6, 0, 0, 0, 0, false).b(.32, .04, .32, 0x4a2c1d, 0, 1.4, 0, 0, 0, 0, false)
};

export function buildObj(t, outline = true) { const m = new Mk(); (OBJS[t] || OBJS.box)(m); const g = m.build(outline); g.userData.t = t; return g; }
export function buildDecor(t, outline = true) { const m = new Mk(); DECS[t](m); return m.build(outline); }
export function buildRobot(col, outline = true) {
  const m = new Mk();
  m.b(.17, .13, .11, col, 0, .13, 0).b(.15, .11, .11, col, 0, .25, 0)
    .b(.035, .035, .01, 0xffffff, -.035, .26, .056, 0, 0, 0, false).b(.035, .035, .01, 0xffffff, .035, .26, .056, 0, 0, 0, false)
    .b(.015, .015, .012, DK, -.035, .26, .058, 0, 0, 0, false).b(.015, .015, .012, DK, .035, .26, .058, 0, 0, 0, false)
    .b(.06, .01, .01, DK, 0, .225, .056, 0, 0, 0, false)
    .c(.006, .05, SV, 0, .33, 0).s(.018, .018, .018, 0xff5a5a, 0, .36, 0)
    .b(.05, .06, .06, 0x4a4a4a, -.045, .035, 0).b(.05, .06, .06, 0x4a4a4a, .045, .035, 0)
    .b(.04, .1, .05, col, -.11, .14, 0).b(.04, .1, .05, col, .11, .14, 0)
    .b(.012, .06, .012, YL, 0, .14, -.075, Math.PI / 2).b(.07, .02, .012, YL, 0, .14, -.1);
  return m.build(outline);
}
export function buildToyBox(outline = true) {
  const m = new Mk();
  m.b(.72, .36, .46, 0xff7fae, 0, .18, 0).b(.73, .05, .47, 0xe45d91, 0, .02, 0)
    .b(.12, .12, .01, YL, -.22, .2, .232, 0, 0, 0, false).b(.12, .12, .01, BL, 0, .2, .232, 0, 0, 0, false).b(.12, .12, .01, 0x9be15d, .22, .2, .232, 0, 0, 0, false);
  const g = m.build(outline);
  const lid = new Mk().b(.74, .07, .48, 0xe45d91, 0, .035, .24).build(outline);
  const hinge = new THREE.Group(); hinge.position.set(0, .36, -.24); hinge.add(lid); g.add(hinge);
  g.userData.lid = hinge;
  return g;
}

// 모델 높이 (이름표·말풍선 위치용)
const HT = {};
export function objHeight(t) {
  if (HT[t] !== undefined) return HT[t];
  const b = new THREE.Box3().setFromObject(buildObj(t, false));
  return HT[t] = b.max.y;
}
export const ROBOT_H = .38;

// 안 움직이는 것들을 색깔별로 한 덩어리로 (그리는 횟수 줄이기)
export function mergeStatic(groups) {
  const byMat = new Map();
  const v = new THREE.Vector3();
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
  void v;
  return out;
}
export { THREE };
