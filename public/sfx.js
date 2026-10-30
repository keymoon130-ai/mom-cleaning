// 효과음·배경음 (전부 합성, 파일 없음)
let ac = null, master = null, sfxG = null, bgmG = null, noiseBuf = null;
const vol = { sfx: .8, bgm: .45 };

export function audioInit() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = ac.createGain(); master.connect(ac.destination);
  sfxG = ac.createGain(); sfxG.gain.value = vol.sfx; sfxG.connect(master);
  bgmG = ac.createGain(); bgmG.gain.value = vol.bgm * .35; bgmG.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
export function setVol(s, b) { vol.sfx = s; vol.bgm = b; if (sfxG) { sfxG.gain.value = s; bgmG.gain.value = b * .35; } }

function out(v = 1, pan = 0) {
  const g = ac.createGain(); g.gain.value = v;
  if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(sfxG); }
  else g.connect(sfxG);
  return g;
}
function tone(type, f0, f1, dur, v = .3, at = 0, dst) {
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g); g.connect(dst || out()); o.start(t); o.stop(t + dur + .05);
}
function noise(dur, f, q, v = .3, at = 0, dst, type = 'bandpass', f1) {
  const t = ac.currentTime + at, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f, t); if (f1) fl.frequency.linearRampToValueAtTime(f1, t + dur); fl.Q.value = q;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .02); g.gain.setValueAtTime(v, t + Math.max(.02, dur - .1)); g.gain.linearRampToValueAtTime(0, t + dur);
  s.connect(fl); fl.connect(g); g.connect(dst || out()); s.start(t); s.stop(t + dur + .05);
}

export const S = {
  ok: () => !!ac,
  click() { if (!ac) return; tone('square', 660, 880, .06, .12); },
  // 삑! (v 거리 감쇠, pan 좌우)
  squeak(v = 1, pan = 0) { if (!ac || v < .02) return; const d = out(v, pan); tone('sine', 1500, 2300, .09, .5, 0, d); tone('sine', 2300, 1300, .13, .45, .09, d); tone('square', 1900, 2600, .07, .08, 0, d); },
  slipper(v = 1, pan = 0) { if (!ac || v < .02) return; const d = out(v, pan); noise(.06, 900, 1.2, .45, 0, d); noise(.07, 700, 1.2, .38, .17, d); },
  vacuum(v = 1) { if (!ac) return; const d = out(v); noise(1.6, 300, .8, .5, 0, d, 'lowpass', 2400); tone('sawtooth', 90, 140, 1.6, .12, 0, d); },
  grab() { if (!ac) return; noise(.12, 1500, 1, .35); tone('triangle', 300, 900, .12, .25); },
  miss() { if (!ac) return; tone('square', 220, 110, .18, .22); tone('sine', 160, 90, .22, .3, .02); },
  caught() { if (!ac) return; tone('square', 880, 220, .35, .2); tone('sine', 300, 1200, .2, .2, .25); },
  boing(v = 1, pan = 0) { if (!ac) return; const d = out(v, pan); tone('sine', 140, 520, .25, .5, 0, d); tone('sine', 520, 260, .2, .3, .2, d); },
  poof() { if (!ac) return; noise(.25, 2500, .6, .3, 0, null, 'bandpass', 600); tone('sine', 900, 300, .2, .12); },
  rescue() { if (!ac) return; [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, .14, .15, i * .09)); },
  tick() { if (!ac) return; tone('square', 1200, 1200, .03, .08); },
  bell() { if (!ac) return; [784, 988, 1175].forEach((f, i) => tone('triangle', f, f, .5, .25, i * .12)); },
  tired() { if (!ac) return; tone('sawtooth', 300, 120, .6, .15); },
  win() { if (!ac) return; [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone('square', f, f, .16, .15, i * .12)); },
  lose() { if (!ac) return; [392, 370, 349, 262].forEach((f, i) => tone('triangle', f, f * .98, .3, .2, i * .22)); },
  ping() { if (!ac) return; tone('sine', 1320, 1320, .08, .2); tone('sine', 1760, 1760, .1, .2, .08); },
  // 엄마 잔소리 효과 (점수 없는 짧은 웅얼)
  mom() { if (!ac) return; for (let i = 0; i < 5; i++) tone('sawtooth', 260 + Math.random() * 120, 220 + Math.random() * 90, .1, .08, i * .11); }
};

// 배경음: 경쾌하고 살짝 열받는 루프
let bgmOn = null, bgmTimer = null;
const SONGS = {
  title: { bpm: 132, mel: [72, 76, 79, 76, 77, 74, 71, 74, 72, 76, 79, 84, 83, 79, 77, 74], bass: [48, 48, 55, 55, 53, 53, 55, 55] },
  game: { bpm: 150, mel: [67, 0, 67, 69, 71, 0, 67, 64, 65, 0, 65, 67, 69, 67, 65, 64, 62, 0, 62, 64, 65, 67, 69, 71, 72, 0, 71, 0, 69, 0, 67, 0], bass: [43, 43, 48, 48, 41, 41, 43, 43] },
  hurry: { bpm: 186, mel: [79, 78, 79, 0, 76, 75, 76, 0, 72, 74, 76, 77, 79, 0, 84, 0], bass: [48, 55, 48, 55, 53, 57, 55, 59] }
};
const mf = n => 440 * Math.pow(2, (n - 69) / 12);
export function bgm(name) {
  if (bgmOn === name) return;
  bgmOn = name; clearInterval(bgmTimer); bgmTimer = null;
  if (!ac || !name) return;
  const s = SONGS[name], step = 60 / s.bpm / 2;
  let i = 0, next = ac.currentTime + .05;
  const sched = () => {
    while (next < ac.currentTime + .3) {
      const n = s.mel[i % s.mel.length];
      if (n) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = mf(n); g.gain.setValueAtTime(.0001, next); g.gain.linearRampToValueAtTime(.16, next + .01); g.gain.exponentialRampToValueAtTime(.001, next + step * .9); o.connect(g); g.connect(bgmG); o.start(next); o.stop(next + step); }
      if (i % 2 === 0) { const b = s.bass[(i / 2 | 0) % s.bass.length], o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = mf(b); g.gain.setValueAtTime(.3, next); g.gain.exponentialRampToValueAtTime(.001, next + step * 1.8); o.connect(g); g.connect(bgmG); o.start(next); o.stop(next + step * 2); }
      next += step; i++;
    }
  };
  sched(); bgmTimer = setInterval(sched, 100);
}
