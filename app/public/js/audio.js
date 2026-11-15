/**
 * Steel Tide — sound. Gunfire, explosions, the .50 cal, the aero engine and
 * shell splashes are real recordings (see /sfx/CREDITS.txt). The open-sea
 * ambience (swell, wave-crest hiss, wind, water rushing past the hull) is
 * synthesised so it never sounds like a beach. Sound travels at 340 m/s.
 */
import { G, clamp } from "./core.js";

const FILES = ["gun_near", "gun_far", "hit", "explode", "flak", "mg1", "mg2", "engine", "splash"];
export const A = { ctx: null, master: null, buf: {}, muted: false, noise: null, brown: null, hum: null, eng: null, later: [], amb: {}, radio: {}, rBusy: 0, bgmOn: true, bgmWant: null, bgmEl: null };
A.vol = { sfx: 0.85, music: 0.5 };
try { A.bgmOn = localStorage.getItem("steeltide:bgm") !== "0"; const v = JSON.parse(localStorage.getItem("steeltide:vol")); if (v && v.sfx >= 0 && v.music >= 0) A.vol = { sfx: +v.sfx, music: +v.music }; } catch {}
export const RADIO_KEYS = ["battle", "sunk", "torp_warn", "ally_sunk", "launch", "return", "fire", "flood", "hull", "torp_launch", "fleet", "abandon"];

function loopNoise(buf, type, freq, q, gain) {
  const c = A.ctx, s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = Math.random(); s.start(0, Math.random() * 2);
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = gain; s.connect(f).connect(g).connect(A.master); return g;
}
function lfo(param, hz, depth) { const c = A.ctx, o = c.createOscillator(); o.frequency.value = hz; const g = c.createGain(); g.gain.value = depth; o.connect(g).connect(param); o.start(); }

export function initAudio() {
  if (A.ctx) { A.ctx.resume?.(); return; }
  try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  const c = A.ctx;
  A.master = c.createGain(); A.master.gain.value = A.muted ? 0 : A.vol.sfx;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
  A.master.connect(comp).connect(c.destination); A.music = c.createGain(); A.music.gain.value = A.muted ? 0 : A.vol.music; A.music.connect(comp);
  const n = c.sampleRate * 4; A.noise = c.createBuffer(1, n, c.sampleRate); A.brown = c.createBuffer(1, n, c.sampleRate);
  const w = A.noise.getChannelData(0), b = A.brown.getChannelData(0); let last = 0;
  for (let i = 0; i < n; i++) { w[i] = Math.random() * 2 - 1; last = (last + 0.02 * w[i]) / 1.02; b[i] = last * 3.5; }
  // open-sea bed: slow swell + crest hiss + wind, each breathing at its own slow rate
  const swell = loopNoise(A.brown, "lowpass", 320, 0.5, 0.16); lfo(swell.gain, 0.071, 0.06); lfo(swell.gain, 0.113, 0.04);
  const crest = loopNoise(A.noise, "bandpass", 700, 0.6, 0.018); lfo(crest.gain, 0.17, 0.012); lfo(crest.gain, 0.053, 0.008);
  const wind = loopNoise(A.noise, "bandpass", 1700, 1.1, 0.008); lfo(wind.gain, 0.04, 0.005);
  A.amb = { swell, crest, wind, hull: loopNoise(A.noise, "bandpass", 420, 0.8, 0), rush: loopNoise(A.noise, "bandpass", 900, 0.7, 0) };
  for (const f of FILES) fetch(`/sfx/${f}.mp3`).then((r) => r.arrayBuffer()).then((x) => c.decodeAudioData(x)).then((buf) => { A.buf[f] = buf; }).catch(() => {});
  for (const k of RADIO_KEYS) fetch(`/sfx/radio/${k}.mp3`).then((r) => r.arrayBuffer()).then((x) => c.decodeAudioData(x)).then((buf) => { A.radio[k] = buf; }).catch(() => {});
  // radio voice chain: 300–3000 Hz band-pass + soft clipping
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 300; hp.Q.value = 0.8;
  const lp2 = c.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 3000; lp2.Q.value = 0.8;
  const sh = c.createWaveShaper(), cv = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; cv[i] = (2.2 * x) / (1 + 1.2 * Math.abs(x)); } sh.curve = cv;
  A.rIn = c.createGain(); A.rIn.gain.value = 0.9; const rOut = c.createGain(); rOut.gain.value = 0.75;
  A.rIn.connect(hp).connect(lp2).connect(sh).connect(rOut).connect(A.master);
  A.bgmGain = c.createGain(); A.bgmGain.gain.value = 0.3; A.bgmGain.connect(A.music); syncBgm();
  A.hum = c.createGain(); A.hum.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 140;
  for (const f of [38, 57, 76]) { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(); }
  lp.connect(A.hum).connect(A.master);
}
export function setMuted(m) { A.muted = m; if (A.master) { A.master.gain.value = m ? 0 : A.vol.sfx; A.music.gain.value = m ? 0 : A.vol.music; } }
/** Effects / music volume (0–1), remembered per browser. */
export function setVolume(kind, v) { A.vol[kind] = v; try { localStorage.setItem("steeltide:vol", JSON.stringify(A.vol)); } catch {} setMuted(A.muted); }

export function play(name, o = {}) {
  const c = A.ctx, b = A.buf[name]; if (!c || !b) return null;
  const t = c.currentTime + (o.delay || 0), src = c.createBufferSource(); src.buffer = b; src.playbackRate.value = o.rate || 1;
  let node = src;
  if (o.lp) { const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp; node.connect(f); node = f; }
  const g = c.createGain(); g.gain.value = o.vol ?? 1; node.connect(g).connect(A.master);
  if (o.loop) { src.loop = true; if (o.ls != null) { src.loopStart = o.ls; src.loopEnd = o.le; } }
  src.start(t, o.offset || 0); return { src, g };
}
function tone(vol, dur, f0, f1, type = "sine", delay = 0) {
  const c = A.ctx; if (!c) return; const t = c.currentTime + delay, o = c.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g).connect(A.master); o.start(t); o.stop(t + dur + 0.05);
}
function hiss(vol, dur, f0, f1, delay = 0) {
  const c = A.ctx; if (!c || !A.noise) return; const t = c.currentTime + delay, s = c.createBufferSource(); s.buffer = A.noise; s.loop = true;
  const f = c.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 2.5; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0008, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f).connect(g).connect(A.master); s.start(t); s.stop(t + dur + 0.05);
}

export const atten = (d) => clamp(1 - d / 26000, 0.05, 1);
export function at(dist, fn) { A.later.push({ t: dist / 340, fn }); }

/** Jet engine for the aircraft you fly: turbine roar (filtered noise) + compressor whine, both following the throttle. level 0 = off. */
let JET = null;
export function jetSound(level, thr = 0.5) {
  const c = A.ctx; if (!c) return;
  if (!JET) { if (level <= 0) return; const roar = loopNoise(A.brown, "lowpass", 500, 0.7, 0), rush = loopNoise(A.noise, "bandpass", 2400, 0.9, 0);
    const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(); o.type = "sawtooth"; o2.type = "sine"; g.gain.value = 0; const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3000; f.Q.value = 3;
    o.connect(f); o2.connect(f); f.connect(g).connect(A.master); o.start(); o2.start(); JET = { roar, rush, whine: g, o, o2 }; }
  const t = c.currentTime, k = 0.12;
  JET.roar.gain.setTargetAtTime(level * (0.35 + 0.5 * thr), t, k); JET.rush.gain.setTargetAtTime(level * (0.03 + 0.07 * thr), t, k); JET.whine.gain.setTargetAtTime(level * (0.012 + 0.02 * thr), t, k);
  JET.o.frequency.setTargetAtTime(2100 + 1700 * thr, t, k); JET.o2.frequency.setTargetAtTime(3150 + 2500 * thr, t, k);
}
let DRONE = null;
/** moped-like buzz of loitering drones near the camera (0 = silent) */
export function droneSound(level) {
  const c = A.ctx; if (!c) return;
  if (!DRONE) { if (level <= 0) return; const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = "sawtooth"; o.frequency.value = 118; lfo.frequency.value = 23; lg.gain.value = 0.5; f.type = "lowpass"; f.frequency.value = 900; g.gain.value = 0;
    const am = c.createGain(); am.gain.value = 0.5; lfo.connect(lg).connect(am.gain); o.connect(f).connect(am).connect(g).connect(A.master); o.start(); lfo.start(); DRONE = { g, o }; }
  DRONE.g.gain.setTargetAtTime(level * 0.09, c.currentTime, 0.15); DRONE.o.frequency.setTargetAtTime(110 + level * 30, c.currentTime, 0.3);
}
export const sfx = {
  rwr() { tone(0.12, 0.09, 1900, 1900, "square"); tone(0.12, 0.09, 1900, 1900, "square", 0.14); },
  flare() { hiss(0.1, 0.5, 2600, 700); },
  vulcan() { tone(0.16, 0.07, 240, 150, "sawtooth"); hiss(0.07, 0.07, 3200, 1400); },
  gun(cal) { const k = cal / 406; play("gun_near", { vol: 0.4 + 0.6 * k, rate: 1 + (1 - k) * 0.8 }); },
  farGun(d, cal) { const k = cal / 406, a = atten(d); play("gun_far", { vol: a * (0.35 + 0.65 * k), rate: 1 + (1 - k) * 0.6, lp: 600 + 3000 * a }); },
  splash(d, sc) { const a = atten(d); play("splash", { vol: a * (0.25 + 0.6 * Math.min(sc, 1)), rate: 0.7 + (1 - Math.min(sc, 1)) * 0.5, lp: 800 + 7000 * a }); },
  hit(d, big = 1) { const a = atten(d); play("hit", { vol: a * (0.5 + 0.5 * big), rate: 1.25 - 0.4 * big, lp: 900 + 7000 * a }); },
  explode(d) { const a = atten(d); play("explode", { vol: a, lp: 700 + 7000 * a }); },
  flak(d) { const a = atten(d * 3); play("flak", { vol: a * 0.8, rate: 0.85 + Math.random() * 0.3 }); },
  /** One .50 cal report — the guns call this at their firing rate. */
  mgShot(d = 0) {
    const name = Math.random() < 0.5 ? "mg1" : "mg2", rate = 0.9 + Math.random() * 0.2;
    if (d < 30) play(name, { vol: 0.5, rate });
    else { const a = atten(d * 4); if (a > 0.06) play(name, { vol: a * 0.35, rate: rate * 0.9, lp: 900 + 4000 * a }); }
  },
  incoming() { hiss(0.12, 2.4, 1400, 380); },
  bell() { for (const d of [0, 0.22]) { tone(0.18, 0.6, 1568, 1560, "sine", d); tone(0.08, 0.5, 2349, 2340, "sine", d); } },
  ready() { tone(0.08, 0.07, 950, 700, "square"); },
  deny() { tone(0.1, 0.16, 150, 110, "square"); },
  alarm() { for (let i = 0; i < 3; i++) tone(0.12, 0.28, 620, 610, "square", i * 0.4); },
  torpWarn() { for (let i = 0; i < 4; i++) { tone(0.12, 0.16, 880, 870, "square", i * 0.3); tone(0.09, 0.14, 660, 655, "square", i * 0.3 + 0.15); } },
  hitTick() { tone(0.05, 0.035, 2600, 2200, "square"); },
  hitThunk() { tone(0.14, 0.09, 180, 70, "triangle"); tone(0.06, 0.05, 900, 500, "square"); },
  aaThump() { tone(0.05, 0.06, 110, 55, "sine"); },
  torpLaunch() { hiss(0.09, 0.7, 900, 240); },
  lockTone() { tone(0.05, 0.08, 1760, 1760, "sine"); },
  lockSeek() { tone(0.035, 0.06, 1100, 1100, "sine"); }, // acquiring: slow low beeps
  lockSolid() { tone(0.03, 0.13, 2100, 2100, "sine"); }, // locked: fast high tone
  mslLaunch(d = 0) { const k = Math.max(0.15, 1 - d / 4000); hiss(0.24 * k, 1.7, 2800, 260); tone(0.14 * k, 0.3, 95, 45, "sine"); hiss(0.08 * k, 0.25, 600, 200); }, // motor ignition: bang + roar fading away
  click() { tone(0.06, 0.05, 1200, 900, "square"); },
  coin() { tone(0.1, 0.12, 988, 980, "square"); tone(0.1, 0.25, 1319, 1310, "square", 0.08); },
};

/** Per-frame: delayed sounds, ambience levels, the flown aircraft's engine. */
export function updateAudio(dt, ctx = {}) {
  for (let i = A.later.length - 1; i >= 0; i--) { A.later[i].t -= dt; if (A.later[i].t <= 0) { const f = A.later[i].fn; A.later.splice(i, 1); f(); } }
  if (!A.ctx) return;
  const p = G.player, pl = G.plane, flying = !!(pl && !pl.crashed && G.state !== "menu");
  const onDeck = !flying && p && G.state !== "menu", near = ctx.nearShip ?? 1;
  const set = (g, v) => g && g.gain.setTargetAtTime(v, A.ctx.currentTime, 0.25);
  set(A.hum, onDeck ? (0.03 + 0.07 * Math.abs(p.speed) / p.vmax) * near : 0);
  set(A.amb.hull, onDeck ? 0.06 * clamp(Math.abs(p.speed) / p.vmax, 0, 1) * near : 0);
  set(A.amb.swell, flying ? 0.05 : 0.16); set(A.amb.crest, flying ? 0.004 : 0.018);
  set(A.amb.rush, flying ? clamp((pl.speed - 30) / 120, 0, 1) * (ctx.cockpit ? 0.05 : 0.09) : 0);
  if (flying && !A.eng && A.buf.engine) A.eng = play("engine", { loop: true, vol: 0 });
  if (A.eng) {
    if (!flying) { A.eng.src.stop(); A.eng = null; }
    else { A.eng.src.playbackRate.value = 0.72 + 0.42 * pl.throttle + 0.1 * clamp((pl.speed - 60) / 90, 0, 1); A.eng.g.gain.value = (0.25 + 0.3 * pl.throttle) * (ctx.cockpit ? 1.25 : 1); }
  }
}

/** Radio message: squelch noise + click, the voice through the radio chain, tail noise + click. Queued so calls never overlap. */
export function radio(key) {
  const c = A.ctx, b = A.radio[key]; if (!c || !b || !A.rIn) return false;
  const now = c.currentTime, t0 = Math.max(now + 0.02, A.rBusy), te = t0 + 0.12 + b.duration;
  A.rBusy = te + 0.4;
  const burst = (t, d, v) => { const s = c.createBufferSource(); s.buffer = A.noise; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.012); g.gain.linearRampToValueAtTime(0.0001, t + d); s.connect(g).connect(A.rIn); s.start(t, Math.random() * 3); s.stop(t + d + 0.03); };
  const click = (t) => { const o = c.createOscillator(); o.type = "square"; o.frequency.value = 1900; const g = c.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.025); o.connect(g).connect(A.rIn); o.start(t); o.stop(t + 0.04); };
  click(t0); burst(t0, 0.15, 0.3); burst(t0 + 0.1, b.duration + 0.08, 0.055);
  // crackle: short random static pops over the voice
  for (let t = t0 + 0.12; t < te; t += 0.03 + Math.random() * 0.09) burst(t, 0.006 + Math.random() * 0.018, 0.08 + Math.random() * 0.22);
  const s = c.createBufferSource(); s.buffer = b; s.connect(A.rIn); s.start(t0 + 0.12);
  burst(te, 0.22, 0.28); click(te + 0.22);
  return true;
}
/** Background music: "menu" | "battle" | null. Routed through the master gain, so M mutes it too. */
export function bgm(which) { A.bgmWant = which; syncBgm(); }
export function setBgmOn(on) { A.bgmOn = on; try { localStorage.setItem("steeltide:bgm", on ? "1" : "0"); } catch {} syncBgm(); }
function syncBgm() {
  if (!A.ctx || !A.bgmGain) return;
  const want = A.bgmOn ? A.bgmWant : null;
  if (A.bgmEl && A.bgmEl.dataset.k === want) { A.bgmEl.play().catch(() => {}); return; }
  if (A.bgmEl) { A.bgmEl.pause(); A.bgmEl = null; }
  if (!want) return;
  const el = new Audio(`/sfx/bgm_${want}.mp3`); el.loop = true; el.dataset.k = want;
  A.ctx.createMediaElementSource(el).connect(A.bgmGain); el.play().catch(() => {}); A.bgmEl = el;
}
