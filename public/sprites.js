// 물건·가구 그림 (전부 코드로 그린 작은 픽셀 그림)
const cache = {};
function mk(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const R = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  const E = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const P = (pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
  const T = (t, x, y, sz, col) => { g.fillStyle = col; g.font = `bold ${sz}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y); };
  fn(R, E, P, T, g);
  // 테두리 한 겹 (만화 느낌)
  outline(c);
  return c;
}
function outline(c) {
  const g = c.getContext('2d'), W = c.width, H = c.height, d = g.getImageData(0, 0, W, H), a = d.data, o = new Uint8ClampedArray(a);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (a[i + 3] > 40) { if (a[i + 3] < 255) o[i + 3] = 255; continue; }
    let n = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && a[(Y * W + X) * 4 + 3] > 40) n = true; }
    if (n) { o[i] = 58; o[i + 1] = 34; o[i + 2] = 22; o[i + 3] = 255; }
  }
  d.data.set(o); g.putImageData(d, 0, 0);
}

const OBJ_DRAW = {
  sock: (R, E, P) => { R(12, 4, 9, 18, '#fff'); for (let y = 6; y < 20; y += 4) R(12, y, 9, 2, '#ff6fa5'); P([12, 22, 21, 22, 21, 26, 26, 27, 27, 30, 12, 30], '#fff'); R(22, 27, 5, 3, '#ff6fa5'); R(12, 3, 9, 2, '#ff6fa5'); },
  cup: (R, E) => { R(7, 9, 15, 20, '#7cc4ff'); E(14.5, 9, 7.5, 2, '#bfe3ff'); E(14.5, 9, 6, 1.2, '#6b3f22'); R(22, 13, 5, 2, '#7cc4ff'); R(25, 13, 2, 10, '#7cc4ff'); R(22, 21, 5, 2, '#7cc4ff'); R(10, 15, 9, 6, '#fff'); E(14.5, 18, 2, 2, '#ff6fa5'); },
  book: (R) => { R(8, 6, 16, 23, '#e0503c'); R(21, 6, 3, 23, '#b8392a'); R(9, 27, 14, 2, '#fff6d8'); R(11, 10, 9, 3, '#ffd34d'); R(11, 15, 9, 1, '#fff'); R(11, 17, 7, 1, '#fff'); },
  ball: (R, E) => { E(16, 18, 12, 12, '#ff5a5a'); E(16, 18, 12, 4, '#fff'); E(16, 18, 12, 1.5, '#3b8fd6'); E(11, 12, 3, 2, 'rgba(255,255,255,.6)'); },
  block: (R, E, P, T) => { R(5, 6, 22, 23, '#ffd34d'); R(5, 6, 22, 3, '#ffe68a'); R(24, 6, 3, 23, '#e0b52c'); R(9, 11, 13, 14, '#fff'); T('A', 15.5, 18.5, 13, '#3b8fd6'); },
  apple: (R, E, P) => { E(16, 19, 11, 10, '#e8332a'); E(12, 15, 3, 2, 'rgba(255,255,255,.5)'); R(15, 5, 2, 6, '#6b3f22'); E(20, 7, 4, 2, '#3fbf6a'); },
  milk: (R, E, P, T) => { R(9, 9, 14, 21, '#fff'); P([9, 9, 16, 2, 23, 9], '#fff'); R(9, 9, 14, 2, '#7cc4ff'); R(9, 18, 14, 6, '#7cc4ff'); R(14, 1, 4, 3, '#fff'); },
  slipper: (R, E) => { E(16, 24, 13, 6, '#ff9ac4'); R(4, 24, 25, 5, '#ff9ac4'); E(10, 20, 7, 5, '#ff6fa5'); R(3, 28, 26, 2, '#c94f84'); E(10, 18, 3, 2, '#fff'); },
  roll: (R, E) => { R(6, 8, 20, 21, '#fafafa'); E(16, 8, 10, 3, '#fff'); E(16, 8, 4, 1.5, '#c9a679'); R(6, 18, 20, 1, '#e5e5e5'); },
  duck: (R, E, P) => { E(15, 22, 11, 7, '#ffd34d'); E(10, 12, 7, 7, '#ffd34d'); P([2, 12, 6, 10, 6, 15], '#ff9a3c'); E(9, 10, 1.5, 1.5, '#2a1a12'); P([22, 18, 29, 14, 27, 21], '#ffd34d'); },
  cushion: (R, E) => { R(3, 7, 26, 22, '#c27be8'); E(16, 7, 13, 2, '#c27be8'); E(16, 29, 13, 2, '#9b55c4'); E(16, 18, 4, 4, '#ffd34d'); R(3, 7, 2, 2, '#9b55c4'); R(27, 7, 2, 2, '#9b55c4'); },
  bin: (R, E) => { R(7, 6, 18, 24, '#5fb38f'); R(6, 4, 20, 4, '#4a9a78'); for (let x = 10; x < 23; x += 4) R(x, 10, 2, 17, '#4a9a78'); R(12, 2, 8, 2, '#4a9a78'); },
  plant: (R, E, P) => { P([9, 20, 23, 20, 21, 30, 11, 30], '#d0703c'); R(8, 19, 16, 3, '#e07f48'); E(16, 13, 6, 7, '#3fbf6a'); E(10, 11, 4, 6, '#2fa65a'); E(22, 10, 4, 6, '#2fa65a'); E(16, 5, 3, 4, '#5fd77f'); },
  pot: (R, E) => { R(4, 12, 24, 16, '#b8c2cc'); E(16, 28, 12, 2, '#8a96a2'); E(16, 11, 13, 3, '#d4dce4'); R(14, 6, 4, 3, '#2a1a12'); R(1, 15, 4, 3, '#2a1a12'); R(27, 15, 4, 3, '#2a1a12'); R(4, 18, 24, 1, '#9aa6b2'); },
  kettle: (R, E, P) => { E(15, 20, 11, 10, '#ff9a3c'); R(4, 21, 22, 9, '#ff9a3c'); P([25, 18, 31, 11, 31, 14, 26, 23], '#ff9a3c'); R(11, 6, 9, 3, '#2a1a12'); R(10, 6, 2, 8, '#2a1a12'); R(19, 6, 2, 8, '#2a1a12'); E(15, 10, 6, 2, '#e07f2c'); },
  box: (R, E, P) => { R(3, 9, 26, 21, '#c9935a'); R(3, 9, 26, 3, '#e0ad74'); R(14, 9, 4, 21, '#e8d29a'); P([3, 9, 8, 3, 14, 9], '#e0ad74'); P([18, 9, 24, 3, 29, 9], '#e0ad74'); R(6, 20, 6, 4, '#fff'); },
  cooker: (R, E) => { E(16, 18, 13, 11, '#fafafa'); R(3, 18, 26, 11, '#fafafa'); E(16, 8, 9, 3, '#e4e4e4'); R(11, 16, 10, 5, '#2a3a48'); R(13, 17, 2, 2, '#5fd0b5'); R(3, 26, 26, 3, '#ff7fae'); },
  bucket: (R, E, P, T, g) => { P([5, 10, 27, 10, 24, 30, 8, 30], '#3b8fd6'); R(5, 9, 22, 3, '#5fb8ff'); g.strokeStyle = '#2a1a12'; g.lineWidth = 1.5; g.beginPath(); g.arc(16, 11, 10, Math.PI, 0); g.stroke(); },
  radio: (R, E) => { R(3, 9, 26, 19, '#c9935a'); R(5, 12, 12, 13, '#4a2c1d'); for (let y = 13; y < 25; y += 2) R(5, y, 12, 1, '#6b4a33'); E(23, 15, 3, 3, '#ffd34d'); E(23, 23, 2, 2, '#2a1a12'); R(22, 2, 1, 8, '#9aa6b2'); R(5, 28, 3, 2, '#2a1a12'); R(24, 28, 3, 2, '#2a1a12'); },
  basket: (R, E, P) => { P([2, 12, 30, 12, 27, 31, 5, 31], '#e0c27a'); for (let y = 14; y < 31; y += 4) R(3, y, 26, 1, '#b8964a'); for (let x = 6; x < 28; x += 5) R(x, 13, 1, 18, '#b8964a'); E(10, 11, 6, 4, '#ff7fae'); E(19, 10, 6, 4, '#7cc4ff'); E(25, 12, 4, 3, '#fff'); R(13, 4, 4, 8, '#9be15d'); },
  chair: (R) => { R(7, 1, 18, 3, '#a8693c'); R(7, 1, 3, 16, '#a8693c'); R(22, 1, 3, 16, '#a8693c'); R(10, 6, 12, 2, '#c98a55'); R(10, 10, 12, 2, '#c98a55'); R(5, 16, 22, 4, '#c98a55'); R(6, 20, 3, 12, '#a8693c'); R(23, 20, 3, 12, '#a8693c'); R(10, 20, 2, 10, '#8a522c'); R(20, 20, 2, 10, '#8a522c'); },
  lamp: (R, E, P) => { P([8, 11, 24, 11, 21, 1, 11, 1], '#fff3b0'); R(8, 10, 16, 2, '#ffd34d'); R(15, 12, 2, 17, '#6b6b6b'); R(9, 29, 14, 3, '#4a4a4a'); },
  rice: (R, E, P, T) => { P([5, 6, 27, 6, 29, 30, 3, 30], '#f2ead8'); E(16, 6, 11, 3, '#e4d8bc'); R(13, 2, 6, 4, '#e4d8bc'); R(8, 13, 16, 12, '#fff'); T('쌀', 16, 19.5, 10, '#2b4fa8'); R(3, 28, 26, 2, '#d8c8a4'); },
  trunk: (R) => { R(2, 10, 28, 20, '#7a4a2a'); R(2, 6, 28, 6, '#8e5a34'); R(2, 12, 28, 2, '#c9a24a'); R(7, 6, 3, 24, '#c9a24a'); R(22, 6, 3, 24, '#c9a24a'); R(14, 12, 4, 5, '#ffd34d'); },
  fan: (R, E, P, T, g) => { E(16, 10, 10, 10, '#d8eef9'); g.strokeStyle = '#6b8aa0'; g.lineWidth = 1; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(16, 10); g.lineTo(16 + Math.cos(i * .785) * 10, 10 + Math.sin(i * .785) * 10); g.stroke(); } E(16, 10, 2.5, 2.5, '#7cc4ff'); R(15, 20, 3, 9, '#fafafa'); E(16, 30, 8, 2, '#fafafa'); R(13, 25, 6, 2, '#7cc4ff'); },
  tv: (R, E) => { R(2, 7, 28, 21, '#8a6a4a'); R(5, 10, 18, 15, '#3a4a4a'); R(6, 11, 6, 4, '#5a7070'); E(26, 13, 2, 2, '#2a1a12'); E(26, 19, 2, 2, '#2a1a12'); R(10, 1, 1, 7, '#2a1a12'); R(21, 1, 1, 7, '#2a1a12'); R(5, 28, 3, 3, '#2a1a12'); R(24, 28, 3, 3, '#2a1a12'); }
};

const DECOR_DRAW = {
  bed: [48, 32, (R, E) => { R(2, 6, 6, 26, '#a8693c'); R(2, 16, 44, 9, '#fff6d8'); R(8, 12, 40, 8, '#7cc4ff'); for (let x = 12; x < 46; x += 6) R(x, 12, 3, 8, '#a8d8ff'); E(14, 13, 6, 4, '#fff'); R(2, 25, 46, 3, '#a8693c'); R(3, 28, 3, 4, '#8a522c'); R(42, 28, 3, 4, '#8a522c'); R(42, 10, 6, 22, '#a8693c'); }],
  shelf: [28, 40, (R) => { R(1, 0, 26, 40, '#a8693c'); for (const y of [2, 14, 26]) { R(3, y, 22, 10, '#6b3f22'); const cols = ['#e0503c', '#3b8fd6', '#ffd34d', '#3fbf6a', '#c27be8', '#ff9a3c']; for (let x = 4, i = y; x < 23; x += 3, i++) R(x, y + 2 + (i % 3), 2, 8 - (i % 3), cols[i % 6]); } R(3, 38, 22, 2, '#6b3f22'); }],
  fridge: [26, 44, (R) => { R(1, 0, 24, 44, '#f4f7fa'); R(1, 16, 24, 1, '#b8c2cc'); R(19, 5, 2, 8, '#b8c2cc'); R(19, 20, 2, 12, '#b8c2cc'); R(5, 22, 6, 6, '#ffd34d'); R(6, 6, 5, 4, '#ff7fae'); }],
  table: [40, 30, (R) => { R(0, 6, 40, 5, '#c98a55'); R(0, 10, 40, 2, '#a8693c'); R(3, 12, 3, 18, '#a8693c'); R(34, 12, 3, 18, '#a8693c'); R(10, 2, 6, 4, '#7cc4ff'); R(24, 1, 8, 5, '#fff'); }],
  sofa: [48, 30, (R) => { R(2, 6, 44, 14, '#5fb38f'); R(0, 12, 8, 16, '#4a9a78'); R(40, 12, 8, 16, '#4a9a78'); R(6, 16, 36, 10, '#6cc8a0'); R(23, 16, 1, 10, '#4a9a78'); R(2, 26, 44, 2, '#3a7a60'); R(10, 9, 9, 7, '#ffd34d'); }],
  washer: [28, 30, (R, E) => { R(1, 1, 26, 29, '#f4f7fa'); R(1, 1, 26, 6, '#dfe6ec'); E(14, 18, 9, 9, '#9aa6b2'); E(14, 18, 7, 7, '#a8d8ff'); E(11, 15, 2, 2, '#fff'); R(18, 3, 3, 2, '#5fd0b5'); R(22, 3, 3, 2, '#ff7fae'); }],
  wardrobe: [30, 44, (R) => { R(1, 0, 28, 44, '#b07a4a'); R(14, 2, 2, 40, '#8a522c'); R(11, 18, 2, 7, '#ffd34d'); R(17, 18, 2, 7, '#ffd34d'); R(1, 0, 28, 3, '#8a522c'); }],
  tub: [44, 24, (R, E) => { R(2, 6, 40, 16, '#fafafa'); E(22, 6, 20, 4, '#a8d8ff'); E(16, 4, 4, 3, '#fff'); E(26, 3, 5, 3, '#fff'); R(4, 21, 4, 3, '#b8c2cc'); R(36, 21, 4, 3, '#b8c2cc'); }],
  beam: [12, 48, (R) => { R(1, 0, 10, 48, '#6b4a33'); R(3, 0, 2, 48, '#7d5a40'); for (let y = 6; y < 48; y += 11) R(1, y, 10, 1, '#4a2c1d'); }]
};

export function objSprite(t) { const k = 'o:' + t; return cache[k] || (cache[k] = mk(32, 32, OBJ_DRAW[t] || OBJ_DRAW.box)); }
export function decorSprite(t) { const k = 'd:' + t; if (cache[k]) return cache[k]; const [w, h, fn] = DECOR_DRAW[t]; return cache[k] = mk(w, h, fn); }

// 장난감 상자
export function boxSprite(open) {
  const k = 'box' + (open ? 1 : 0); if (cache[k]) return cache[k];
  return cache[k] = mk(40, 32, (R, E, P, T) => {
    R(2, 12, 36, 19, '#ff7fae'); R(2, 12, 36, 3, '#ff9ac4');
    for (const [x, c] of [[6, '#ffd34d'], [16, '#7cc4ff'], [26, '#9be15d']]) { R(x, 18, 8, 8, c); }
    T('★', 10, 22, 7, '#fff'); T('●', 20, 22, 6, '#fff'); T('♥', 30, 22, 7, '#fff');
    if (open) { P([2, 12, 6, 2, 34, 2, 38, 12], '#e45d91'); } else R(1, 7, 38, 6, '#e45d91');
  });
}
// 변신 안 한 장난감 = 태엽 로봇 (색은 사람마다)
const TOYCOL = ['#ff5a5a', '#3b8fd6', '#3fbf6a', '#ffd34d', '#c27be8', '#ff9a3c', '#5fd0b5', '#ff7fae', '#8a8a8a', '#6b3f22'];
export function toyColor(i) { return TOYCOL[i % TOYCOL.length]; }
export function toySprite(col) {
  const k = 't:' + col; if (cache[k]) return cache[k];
  return cache[k] = mk(32, 32, (R, E) => {
    R(9, 6, 14, 11, col); R(11, 9, 3, 3, '#fff'); R(18, 9, 3, 3, '#fff'); R(12, 10, 1, 1, '#2a1a12'); R(19, 10, 1, 1, '#2a1a12'); R(13, 14, 6, 1, '#2a1a12');
    R(15, 2, 2, 4, '#9aa6b2'); E(16, 2, 2, 2, '#ff5a5a');
    R(8, 17, 16, 9, col); R(12, 19, 8, 4, '#fff6d8'); R(4, 18, 4, 7, col); R(24, 18, 4, 7, col);
    R(10, 26, 4, 5, '#4a4a4a'); R(18, 26, 4, 5, '#4a4a4a');
    R(24, 21, 6, 2, '#ffd34d'); R(28, 18, 2, 8, '#ffd34d');
  });
}
