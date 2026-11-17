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
  const g = c.createGain(); g.gain.value = gain; s.connect(f).connect(g).connect(A.master); g.filter = f; return g;
}
function lfo(param, hz, depth) { const c = A.ctx, o = c.createOscillator(); o.frequency.value = hz; const g = c.createGain(); g.gain.value = depth; o.connect(g).connect(param); o.start(); }

export function initAudio() {
  if (A.ctx) { if (A.ctx.state !== "running") { A.ctx.resume?.(); syncBgm(); } return; }
  try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  const c = A.ctx;
  A.master = c.createGain(); A.master.gain.value = A.muted ? 0 : A.vol.sfx;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3.5; comp.attack.value = 0.003; comp.release.value = 0.24;
  A.master.connect(comp).connect(c.destination); A.music = c.createGain(); A.music.gain.value = A.muted ? 0 : A.vol.music; A.music.connect(comp);
  // Marine acoustic horizon + cockpit reflection impulse (routed into A.master so mute/volume stays unified)
  const rLen = Math.floor(c.sampleRate * 1.45), ir = c.createBuffer(2, rLen, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch); let lp = 0;
    for (let i = 0; i < rLen; i++) {
      const k = 1 - i / rLen, early = i < c.sampleRate * 0.08 && i % 430 < 6 ? 1.4 : 1;
      lp = lp * 0.62 + (Math.random() * 2 - 1) * 0.38;
      d[i] = lp * Math.pow(k, 2.3) * 0.55 * early;
    }
  }
  A.rev = c.createConvolver(); A.rev.buffer = ir;
  A.revSend = c.createGain(); A.revSend.gain.value = 0.24;
  A.revSend.connect(A.rev).connect(A.master);
  const n = c.sampleRate * 4; A.noise = c.createBuffer(1, n, c.sampleRate); A.brown = c.createBuffer(1, n, c.sampleRate);
  const w = A.noise.getChannelData(0), b = A.brown.getChannelData(0); let last = 0;
  for (let i = 0; i < n; i++) { w[i] = Math.random() * 2 - 1; last = (last + 0.02 * w[i]) / 1.02; b[i] = last * 3.5; }
  // open-sea bed: slow swell + crest hiss + wind, each breathing at its own slow rate
  const swell = loopNoise(A.brown, "lowpass", 320, 0.5, 0.16); lfo(swell.gain, 0.071, 0.06); lfo(swell.gain, 0.113, 0.04);
  const crest = loopNoise(A.noise, "bandpass", 700, 0.6, 0.018); lfo(crest.gain, 0.17, 0.012); lfo(crest.gain, 0.053, 0.008);
  const wind = loopNoise(A.noise, "bandpass", 1700, 1.1, 0.008); lfo(wind.gain, 0.04, 0.005);
  A.amb = { swell, crest, wind, hull: loopNoise(A.noise, "bandpass", 420, 0.8, 0), rush: loopNoise(A.noise, "bandpass", 900, 0.7, 0) };
  for (const f of FILES) fetch(`sfx/${f}.mp3`).then((r) => r.arrayBuffer()).then((x) => c.decodeAudioData(x)).then((buf) => { A.buf[f] = buf; }).catch(() => {});
  for (const k of RADIO_KEYS) fetch(`sfx/radio/${k}.mp3`).then((r) => r.arrayBuffer()).then((x) => c.decodeAudioData(x)).then((buf) => { A.radio[k] = buf; }).catch(() => {});
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
  if (!JET) {
    if (level <= 0) return;
    const roar = loopNoise(A.brown, "lowpass", 440, 0.7, 0);
    const ab = loopNoise(A.brown, "bandpass", 118, 0.9, 0);
    const rush = loopNoise(A.noise, "bandpass", 2200, 0.85, 0);
    const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    o.type = "sawtooth"; o2.type = "sine"; g.gain.value = 0;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2800; f.Q.value = 2.6;
    o.connect(f); o2.connect(f); f.connect(g).connect(A.master); o.start(); o2.start();
    JET = { roar, ab, rush, whine: g, o, o2, wasAb: false };
  }
  const t = c.currentTime, k = 0.12, mil = Math.max(0, (thr - 0.65) / 0.35);
  JET.roar.filter?.frequency.setTargetAtTime(440 + 480 * thr, t, k);
  JET.rush.filter?.frequency.setTargetAtTime(1800 + 1600 * thr, t, k);
  const abOn = level > 0.05 && thr >= 0.78;
  if (abOn && !JET.wasAb) {
    JET.wasAb = true;
    subBoom(0.18 * level, 125, 42, 0.22, 0, 0.3);
    noiseShape(0.14 * level, 0.32, 1400, 340, "bandpass", 0.9, 0.01, 0.35);
  } else if (level <= 0.02 || thr < 0.70) JET.wasAb = false;
  JET.roar.gain.setTargetAtTime(level * (0.34 + 0.52 * thr), t, k);
  JET.ab.gain.setTargetAtTime(level * mil * mil * 0.48, t, 0.08);
  JET.rush.gain.setTargetAtTime(level * (0.025 + 0.075 * thr), t, k);
  JET.whine.gain.setTargetAtTime(level * (0.008 + 0.015 * thr), t, k);
  JET.o.frequency.setTargetAtTime(2050 + 1650 * thr, t, k);
  JET.o2.frequency.setTargetAtTime(3075 + 2450 * thr, t, k);
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
// Cached white/warm noise buffer + soft saturation curve for heavy combat acoustics
let _wbuf = null, _wsCurve = null;
function wbuf(c) {
  if (_wbuf && _wbuf.sampleRate === c.sampleRate) return _wbuf;
  const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), ch = b.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  return (_wbuf = b);
}
function wsCurve() {
  if (_wsCurve) return _wsCurve;
  const n = 256, k = 2.8; _wsCurve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; _wsCurve[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
  return _wsCurve;
}
function subBoom(vol, f0, f1, dur, delay = 0, rev = 0.35) {
  const c = A.ctx; if (!c || A.muted || vol <= 0.002) return;
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(), ws = c.createWaveShaper();
  o.type = "triangle"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(18, f1), t + dur);
  ws.curve = wsCurve();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(ws).connect(g).connect(A.master);
  if (A.revSend && rev > 0) { const rg = c.createGain(); rg.gain.value = rev; g.connect(rg).connect(A.revSend); }
  o.start(t); o.stop(t + dur + 0.03);
}
function noiseShape(vol, dur, f0, f1, type = "bandpass", Q = 1.0, delay = 0, rev = 0.2, rate = 1) {
  const c = A.ctx; if (!c || A.muted || vol <= 0.002) return;
  const t = c.currentTime + delay, s = c.createBufferSource();
  s.buffer = wbuf(c); s.playbackRate.value = rate; s.loop = dur > 1.8;
  const f = c.createBiquadFilter(), g = c.createGain();
  f.type = type; f.Q.value = Q; f.frequency.setValueAtTime(Math.max(40, f0), t);
  f.frequency.exponentialRampToValueAtTime(Math.max(35, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(A.master);
  if (A.revSend && rev > 0) { const rg = c.createGain(); rg.gain.value = rev; g.connect(rg).connect(A.revSend); }
  s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.03);
}
function metalClank(vol, f0, f1, dur, delay = 0, bright = true) {
  const c = A.ctx; if (!c || A.muted || vol <= 0.002) return;
  const t = c.currentTime + delay;
  for (const [m, w] of bright ? [[1, 0.55], [1.47, 0.3], [2.31, 0.15]] : [[1, 0.7], [1.58, 0.3]]) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = m === 1 ? "triangle" : "sine";
    o.frequency.setValueAtTime(f0 * m, t); o.frequency.exponentialRampToValueAtTime(Math.max(40, f1 * m), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * w, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(A.master); o.start(t); o.stop(t + dur + 0.02);
  }
}
function voiceTone(vol, dur, f0, f1, type = "sine", delay = 0, lp = 0) {
  const c = A.ctx; if (!c || A.muted || vol <= 0.002) return;
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.008, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (lp > 0) { const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; o.connect(f).connect(g).connect(A.master); }
  else o.connect(g).connect(A.master);
  o.start(t); o.stop(t + dur + 0.02);
}
function klaxon(vol, dur, freq, delay = 0) {
  const c = A.ctx; if (!c || A.muted) return;
  const t = c.currentTime + delay, g = c.createGain(), f = c.createBiquadFilter();
  f.type = "bandpass"; f.frequency.value = freq * 1.4; f.Q.value = 1.6;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.025); g.gain.setValueAtTime(vol * 0.9, t + dur - 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const df of [0, 7]) { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(freq + df, t); o.connect(f); o.start(t); o.stop(t + dur + 0.02); }
  f.connect(g).connect(A.master);
}

/** Promotion fanfare, synthesized: timpani roll, brass chords (detuned saws through a swelling low-pass) and a hall reverb. */
let HALL = null;
function hall() {
  const c = A.ctx; if (HALL && HALL.context === c) return HALL;
  const len = c.sampleRate * 3.2, b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  const cv = c.createConvolver(); cv.buffer = b; const g = c.createGain(); g.gain.value = 0.55; cv.connect(g).connect(A.master); HALL = cv; return cv;
}
function brass(freqs, t, dur, vol) {
  const c = A.ctx, rv = hall();
  for (const f of freqs) {
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(3200, t + 0.09); lp.frequency.exponentialRampToValueAtTime(1500, t + Math.min(dur, 0.6));
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.05); g.gain.setValueAtTime(vol * 0.8, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
    for (const det of [-7, 0, 7]) { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det; const v = c.createOscillator(); v.frequency.value = 5.2; const vg = c.createGain(); vg.gain.value = 6; v.connect(vg).connect(o.detune); o.connect(lp); o.start(t); o.stop(t + dur + 0.4); v.start(t); v.stop(t + dur + 0.4); }
    lp.connect(g); g.connect(A.master); g.connect(rv);
  }
}
function timp(t, f, vol) {
  const c = A.ctx, o = c.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.4); o.connect(g); g.connect(A.master); g.connect(hall()); o.start(t); o.stop(t + 1.5);
  if (A.noise) { const s = c.createBufferSource(); s.buffer = A.noise; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420; const ng = c.createGain(); ng.gain.setValueAtTime(vol * 0.7, t); ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.25); s.connect(lp).connect(ng).connect(A.master); s.start(t); s.stop(t + 0.3); }
}
function cymbal(t, swell, vol) {
  const c = A.ctx; if (!A.noise) return; const s = c.createBufferSource(); s.buffer = A.noise; s.loop = true; const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 5200;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t - swell); g.gain.exponentialRampToValueAtTime(vol * 0.5, t); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 3); s.connect(hp).connect(g); g.connect(A.master); g.connect(hall()); s.start(t - swell); s.stop(t + 3.1);
}
const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
export function fanfare(grand = false) {
  const c = A.ctx; if (!c || A.muted) return; const t0 = c.currentTime + 0.05, v = 0.032;
  if (A.bgmEl) { const el = A.bgmEl, v0 = el.volume; el.volume = v0 * 0.25; setTimeout(() => { el.volume = v0; }, grand ? 7500 : 6000); } /* duck the music under the fanfare */
  for (let i = 0; i < 16; i++) timp(t0 + i * (0.09 - i * 0.003), 49, 0.07 + i * 0.016); /* roll, building */
  const C = [48, 55, 60, 64, 67], F = [53, 60, 65, 69], G7 = [55, 62, 67, 71], CC = [36, 48, 55, 60, 64, 67, 72];
  const seq = grand ? [[1.25, C, 0.28], [1.6, C, 0.16], [1.8, C, 0.5], [2.4, F, 0.5], [3.0, G7, 0.6], [3.7, CC.concat([76, 79]), 2.8]] : [[1.25, C, 0.28], [1.6, C, 0.16], [1.8, F, 0.45], [2.35, G7, 0.5], [2.95, CC, 2.2]];
  for (const [dt, ch, dur] of seq) brass(ch.map(N), t0 + dt, dur, v);
  const end = seq[seq.length - 1][0];
  timp(t0 + end, 33, 0.55); timp(t0 + end + 0.01, 49, 0.35); cymbal(t0 + end, 1.1, 0.14);
  if (grand) { for (const k of [0.6, 1.2, 1.8]) timp(t0 + end + k, 33, 0.22); }
}

export const sfx = {
  rwr() {
    for (const d of [0, 0.075, 0.15]) { voiceTone(0.085, 0.055, 2240, 2060, "triangle", d, 3200); voiceTone(0.04, 0.055, 1120, 1030, "sine", d); }
  },
  cockpitWarn(kind = "pullup") {
    if (A.muted) return;
    if (kind === "pullup") {
      for (const d of [0, 0.26]) {
        voiceTone(0.085, 0.21, 920, 1480, "sawtooth", d, 2400);
        voiceTone(0.055, 0.21, 1840, 2200, "triangle", d, 3200);
      }
    } else if (kind === "overg") {
      for (const d of [0, 0.085, 0.17]) voiceTone(0.075, 0.055, 980, 980, "square", d, 1900);
    } else {
      voiceTone(0.08, 0.14, 784, 780, "triangle", 0, 2000);
      voiceTone(0.08, 0.18, 587, 580, "triangle", 0.15, 2000);
    }
  },
  storeDrop() {
    metalClank(0.13, 380, 120, 0.08, 0, false);
    subBoom(0.17, 135, 42, 0.14, 0.01, 0.22);
  },
  flare() {
    metalClank(0.11, 520, 190, 0.05, 0, false); subBoom(0.14, 175, 70, 0.06, 0, 0.15);
    noiseShape(0.16, 0.48, 3800, 880, "bandpass", 0.95, 0.015, 0.3);
  },
  vulcan() {
    // M61A1 20mm rotary cannon brrrt: 100Hz rotary buzz + mechanical drum clatter + supersonic crack
    voiceTone(0.14, 0.06, 198, 128, "sawtooth", 0, 920);
    voiceTone(0.08, 0.055, 98, 92, "sawtooth", 0, 380);
    subBoom(0.12, 168, 58, 0.06, 0, 0.2);
    noiseShape(0.14, 0.068, 3900, 1050, "bandpass", 0.95, 0, 0.25);
    metalClank(0.024, 1680 + Math.random() * 240, 760, 0.02, 0.01, false);
  },
  ciws(d = 0) {
    // Phalanx 20mm CIWS: high-RPM 4,500rpm rotary drone, supersonic muzzle snap & brass cascade
    const a = atten(d * 2.2); if (A.muted || a <= 0.03) return;
    const lp = d < 550 ? 1350 : 520 + 1800 * a;
    voiceTone(a * 0.14, 0.058, 242, 188, "sawtooth", 0, lp);
    voiceTone(a * 0.085, 0.052, 121, 108, "sawtooth", 0, lp * 0.45);
    noiseShape(a * 0.15, 0.062, d < 550 ? 4400 : 1200 + 2800 * a, 920, "bandpass", 1.1, 0, 0.24);
    if (d < 550) {
      subBoom(a * 0.11, 175, 58, 0.055, 0, 0.18);
      metalClank(a * 0.024, 1920 + Math.random() * 280, 820, 0.018, 0.008, false);
    }
  },
  chaff(d = 0) {
    // Mk 36 SRBOC / Nulka soft-kill rocket mortar + overhead metallic dipole cloud burst
    const a = atten(d * 2); if (A.muted || a <= 0.02) return;
    subBoom(a * 0.24, 152, 46, 0.13, 0, 0.28);
    metalClank(a * 0.095, 460, 165, 0.06, 0, false);
    noiseShape(a * 0.16, 0.28, 2800, 740, "bandpass", 0.9, 0.018, 0.35);
    noiseShape(a * 0.14, 0.38, 5200, 1850, "highpass", 0.85, 0.21, 0.32);
    metalClank(a * 0.05, 2950, 1380, 0.045, 0.21, true);
  },
  gun(cal) {
    const k = Math.min(1.15, cal / 406);
    play("gun_near", { vol: 0.45 + 0.55 * k, rate: 1 + (1 - k) * 0.72 });
    subBoom(0.28 * (0.35 + 0.65 * k), 118 - 36 * k, 26, 0.26 + 0.32 * k, 0, 0.56);
    noiseShape(0.18 * (0.4 + 0.6 * k), 0.15 + 0.16 * k, 2200, 260, "lowpass", 0.75, 0.003, 0.48);
    if (cal >= 305) subBoom(0.2 * k, 72, 22, 0.38, 0.055, 0.65);
    if (cal >= 127) metalClank(0.065 * k, cal >= 254 ? 175 : 220, 95, 0.13, 0.085, false);
  },
  farGun(d, cal) {
    const k = Math.min(1.15, cal / 406), a = atten(d);
    play("gun_far", { vol: a * (0.35 + 0.65 * k), rate: 1 + (1 - k) * 0.55, lp: 550 + 2800 * a });
    subBoom(a * 0.24 * (0.3 + 0.7 * k), 72, 24, 0.5, 0.02, 0.7);
    if (a > 0.08) noiseShape(a * 0.14 * k, 0.55, 680, 140, "lowpass", 0.7, 0.08, 0.8);
  },
  splash(d, sc) {
    const a = atten(d), s = Math.min(sc, 1.15);
    play("splash", { vol: a * (0.25 + 0.6 * Math.min(sc, 1)), rate: 0.7 + (1 - Math.min(sc, 1)) * 0.5, lp: 800 + 7000 * a });
    subBoom(a * 0.22 * s, 88, 32, 0.34, 0, 0.45);
    if (a > 0.08) noiseShape(a * 0.22 * s, 0.38, 1850, 320, "lowpass", 0.8, 0.015, 0.5);
  },
  hit(d, big = 1) {
    const a = atten(d);
    play("hit", { vol: a * (0.5 + 0.5 * big), rate: 1.25 - 0.4 * big, lp: 900 + 7000 * a });
    metalClank(a * (0.14 + 0.16 * big), 330 - 95 * big, 105, 0.15, 0);
    if (big >= 1) metalClank(a * 0.12 * big, 210, 68, 0.22, 0.035);
    subBoom(a * (0.28 + 0.26 * big), 108, 28, 0.28, 0.008, 0.45);
  },
  ricochet(d = 0, k = 1) {
    const c = A.ctx, a = atten(d) * clamp(0.45 + 0.55 * k, 0.4, 1.15); if (!c || A.muted || a <= 0.02) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = "triangle"; f.type = "bandpass"; f.Q.value = 3.6;
    o.frequency.setValueAtTime(1650, t);
    o.frequency.exponentialRampToValueAtTime(2900, t + 0.045);
    o.frequency.exponentialRampToValueAtTime(940, t + 0.24);
    f.frequency.setValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(1100, t + 0.24);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(a * 0.24, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(f).connect(g).connect(A.master);
    if (A.revSend) { const rg = c.createGain(); rg.gain.value = 0.4; g.connect(rg).connect(A.revSend); }
    o.start(t); o.stop(t + 0.27);
    metalClank(a * 0.12, 3150, 2100, 0.14, 0.005, true);
  },
  citadel(d = 0, k = 1) {
    const a = atten(d) * clamp(0.5 + 0.5 * k, 0.45, 1.2); if (A.muted || a <= 0.02) return;
    subBoom(a * 0.44, 54, 18, 0.42, 0, 0.6);
    metalClank(a * 0.22, 240, 74, 0.26, 0.015, false);
    subBoom(a * 0.36, 78, 22, 0.52, 0.13, 0.72);
    noiseShape(a * 0.2, 0.32, 620, 140, "lowpass", 0.9, 0.13, 0.65);
  },
  explode(d) {
    const a = atten(d);
    play("explode", { vol: a, lp: 700 + 7000 * a });
    subBoom(a * 0.65, 92, 20, 0.88, 0, 0.8);
    subBoom(a * 0.52, 58, 16, 1.15, 0.04, 0.85);
    metalClank(a * 0.16, 480, 110, 0.28, 0.02);
    noiseShape(a * 0.26, 0.55, 2200, 250, "bandpass", 0.9, 0.09, 0.7);
    noiseShape(a * 0.14, 0.36, 3500, 480, "bandpass", 1.2, 0.26, 0.55);
  },
  flak(d) {
    const a = atten(d * 3);
    play("flak", { vol: a * 0.85, rate: 0.85 + Math.random() * 0.3 });
    noiseShape(a * 0.24, 0.055, 3400, 1100, "bandpass", 1.35, 0, 0.3);
    noiseShape(a * 0.18, 0.14, 2400, 420, "bandpass", 1.0, 0.008, 0.45);
    if (a > 0.12) subBoom(a * 0.14, 155, 48, 0.09, 0.01, 0.35);
  },
  /** One .50 cal report — the guns call this at their firing rate. */
  mgShot(d = 0) {
    const name = Math.random() < 0.5 ? "mg1" : "mg2", rate = 0.9 + Math.random() * 0.2;
    if (d < 30) {
      play(name, { vol: 0.5, rate });
      metalClank(0.022, 1850 + Math.random() * 260, 720, 0.018, 0.015, false);
    } else { const a = atten(d * 4); if (a > 0.06) play(name, { vol: a * 0.35, rate: rate * 0.9, lp: 900 + 4000 * a }); }
  },
  incoming() { noiseShape(0.14, 2.3, 1850, 320, "bandpass", 1.8, 0, 0.35); subBoom(0.08, 220, 85, 0.6, 0.6, 0.25); },
  bell() {
    for (const d of [0, 0.22]) {
      voiceTone(0.16, 0.68, 1568, 1560, "sine", d);
      voiceTone(0.08, 0.5, 3168, 3150, "sine", d);
      voiceTone(0.05, 0.38, 4328, 4310, "sine", d);
    }
  },
  ready() {
    metalClank(0.028, 1950, 920, 0.014, 0, false);
    voiceTone(0.065, 0.045, 960, 960, "triangle", 0.006, 2200);
    voiceTone(0.075, 0.075, 1280, 1280, "sine", 0.048);
  },
  deny() { voiceTone(0.11, 0.14, 185, 110, "triangle", 0, 420); subBoom(0.1, 120, 65, 0.11); },
  alarm() { for (let i = 0; i < 3; i++) klaxon(0.12, 0.27, 440, i * 0.4); },
  torpWarn() { for (let i = 0; i < 3; i++) { klaxon(0.10, 0.15, 920, i * 0.34); klaxon(0.095, 0.15, 640, i * 0.34 + 0.16); } },
  hitTick() { metalClank(0.11, 1850, 640, 0.05, 0); noiseShape(0.07, 0.04, 3400, 1200, "bandpass", 1.4, 0, 0.1); },
  hitThunk() { subBoom(0.24, 138, 36, 0.14, 0, 0.25); metalClank(0.13, 460, 135, 0.09); noiseShape(0.08, 0.06, 1800, 420, "bandpass", 1.0, 0, 0.15); },
  aaThump() {
    subBoom(0.18, 148, 42, 0.105, 0, 0.24);
    noiseShape(0.10, 0.055, 1650, 380, "lowpass", 0.9, 0.002, 0.18);
    metalClank(0.042, 420 + Math.random() * 60, 195, 0.055, 0.016, false);
    metalClank(0.016, 2250 + Math.random() * 300, 1420, 0.032, 0.065, false);
  },
  bombDrop() {
    metalClank(0.14, 620, 210, 0.06, 0, false);
    subBoom(0.16, 155, 58, 0.12, 0, 0.22);
    voiceTone(0.065, 1.35, 1480, 520, "sine", 0.06, 2200);
    noiseShape(0.08, 0.95, 2200, 620, "bandpass", 1.8, 0.05, 0.25);
  },
  torpLaunch() { subBoom(0.26, 150, 52, 0.22, 0, 0.25); noiseShape(0.16, 0.55, 1600, 280, "bandpass", 1.3, 0.02, 0.35); noiseShape(0.12, 0.4, 520, 140, "lowpass", 0.8, 0.22, 0.25); },
  lockTone() { voiceTone(0.055, 0.06, 1760, 1760, "triangle", 0, 3200); voiceTone(0.035, 0.06, 2640, 2640, "sine", 0.02); },
  lockSeek() {
    // AIM-9 IR seeker search growl
    voiceTone(0.04, 0.075, 820, 790, "sawtooth", 0, 1250);
    voiceTone(0.025, 0.075, 122, 118, "sawtooth", 0, 420);
  },
  lockSolid() {
    // High steady AIM-9 good-tone lock growl
    voiceTone(0.05, 0.14, 1520, 1520, "triangle", 0, 2600);
    voiceTone(0.03, 0.14, 2280, 2280, "sine", 0);
  },
  mslLaunch(d = 0) {
    const k = Math.max(0.15, 1 - d / 4000);
    // Stage 1: VLS hatch snap & ejection punch; Stage 2: booster ignition roar & plume crackle
    metalClank(0.11 * k, 460, 160, 0.075, 0, false);
    subBoom(0.38 * k, 132, 36, 0.24, 0, 0.52);
    noiseShape(0.22 * k, 0.18, 950, 230, "lowpass", 0.8, 0, 0.4);
    noiseShape(0.28 * k, 1.65, 2500, 300, "bandpass", 0.65, 0.045, 0.65);
    noiseShape(0.16 * k, 0.85, 4200, 1050, "highpass", 0.7, 0.055, 0.35);
    noiseShape(0.12 * k, 1.35, 3200, 520, "bandpass", 1.1, 0.18, 0.55);
  },
  sonicFlyby(d = 0, sup = true) {
    const a = atten(d * 2.2); if (a < 0.05) return;
    if (sup) {
      subBoom(a * 0.28, 165, 42, 0.12, 0, 0.45);
      subBoom(a * 0.22, 135, 34, 0.14, 0.045, 0.4);
      noiseShape(a * 0.26, 0.08, 4200, 1100, "bandpass", 1.4, 0, 0.35);
      voiceTone(a * 0.09, 0.34, 580, 145, "sawtooth", 0.015, 1400);
      noiseShape(a * 0.24, 0.42, 2600, 320, "bandpass", 0.95, 0.01, 0.5);
    } else {
      noiseShape(a * 0.2, 0.38, 1850, 280, "bandpass", 1.1, 0, 0.4);
      voiceTone(a * 0.06, 0.32, 380, 130, "triangle", 0, 900);
    }
  },
  click() { metalClank(0.055, 1620, 520, 0.018, 0, false); noiseShape(0.038, 0.014, 2600, 950, "bandpass", 1.25, 0, 0); },
  coin() { voiceTone(0.08, 0.12, 988, 988, "triangle", 0, 2600); voiceTone(0.09, 0.26, 1319, 1319, "sine", 0.075); },
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
  const el = new Audio(`sfx/bgm_${want}.mp3`); el.loop = true; el.dataset.k = want;
  A.ctx.createMediaElementSource(el).connect(A.bgmGain); el.play().catch(() => {}); A.bgmEl = el;
}
