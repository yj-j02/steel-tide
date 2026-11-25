/* 화면 효과음 (K): 도장, 서류 넘김, 비상 경보, 알림 차임, 업적.
   녹음 파일 없이 WebAudio로 합성한다. audio.js의 마스터 볼륨·음소거를 그대로 따른다.
   설정 키 steeltide:uisfx 가 "0"이면 끈다. */
import { A, initAudio } from "./audio.js";
import { careerStorage } from "./characters.js";

let on = true;
try { on = careerStorage.getItem("steeltide:uisfx") !== "0"; } catch { on = true; }
export const uiSfxOn = () => on;
export function setUiSfx(v) { on = !!v; try { careerStorage.setItem("steeltide:uisfx", on ? "1" : "0"); } catch { /* 저장 불가 */ } }

function ctx() {
  if (!on) return null;
  try { initAudio(); } catch { return null; }
  const c = A.ctx;
  if (!c || !A.master || A.muted) return null;
  if (c.state !== "running") c.resume?.();
  return c;
}
function noiseBuf(c) {
  if (A.noise) return A.noise;
  const n = c.sampleRate, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function burst(c, { t = 0, dur = 0.1, type = "bandpass", f0 = 800, f1 = 800, q = 1, vol = 0.3, attack = 0.004 }) {
  const s = c.createBufferSource(); s.buffer = noiseBuf(c);
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
  const at = c.currentTime + t;
  f.frequency.setValueAtTime(f0, at); f.frequency.exponentialRampToValueAtTime(Math.max(f1, 30), at + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(f).connect(g).connect(A.master); s.start(at); s.stop(at + dur + 0.05);
}
function osc(c, { t = 0, dur = 0.2, f0 = 440, f1 = 440, type = "sine", vol = 0.2 }) {
  const at = c.currentTime + t, o = c.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, at); o.frequency.linearRampToValueAtTime(f1, at + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(A.master); o.start(at); o.stop(at + dur + 0.05);
}

/** 결재 도장: 낮은 쿵 + 종이 마찰 */
export function sfxStamp() {
  const c = ctx(); if (!c) return;
  osc(c, { dur: 0.16, f0: 130, f1: 55, type: "sine", vol: 0.55 });
  burst(c, { dur: 0.07, type: "lowpass", f0: 1400, f1: 300, vol: 0.35 });
  burst(c, { t: 0.02, dur: 0.12, type: "bandpass", f0: 2600, f1: 1800, q: 0.8, vol: 0.08 });
}
/** 서류 넘김: 짧은 고역 쓸림 두 번 */
export function sfxFlip() {
  const c = ctx(); if (!c) return;
  burst(c, { dur: 0.16, type: "bandpass", f0: 1800, f1: 5200, q: 0.7, vol: 0.13, attack: 0.03 });
  burst(c, { t: 0.11, dur: 0.12, type: "highpass", f0: 3500, f1: 6500, q: 0.5, vol: 0.06, attack: 0.02 });
}
/** 비상 경보: 오르내리는 사이렌 2회 + 경고 비프 */
export function sfxSiren() {
  const c = ctx(); if (!c) return;
  for (let i = 0; i < 2; i++) {
    osc(c, { t: i * 1.1, dur: 0.55, f0: 520, f1: 980, type: "sawtooth", vol: 0.12 });
    osc(c, { t: i * 1.1 + 0.55, dur: 0.55, f0: 980, f1: 520, type: "sawtooth", vol: 0.12 });
  }
  for (let i = 0; i < 3; i++) osc(c, { t: 2.3 + i * 0.22, dur: 0.12, f0: 1320, f1: 1320, type: "square", vol: 0.07 });
}
/** 알림 차임 (진급·합의 성사 등) */
export function sfxChime() {
  const c = ctx(); if (!c) return;
  [784, 988, 1175].forEach((f, i) => osc(c, { t: i * 0.09, dur: 0.5, f0: f, f1: f, type: "triangle", vol: 0.12 }));
}
/** 업적 달성 */
export function sfxAchieve() {
  const c = ctx(); if (!c) return;
  [523, 659, 784, 1047].forEach((f, i) => osc(c, { t: i * 0.08, dur: 0.38, f0: f, f1: f, type: "triangle", vol: 0.11 }));
  burst(c, { t: 0.3, dur: 0.4, type: "highpass", f0: 6000, f1: 9000, q: 0.4, vol: 0.04, attack: 0.05 });
}
/** 실패·결렬 */
export function sfxFail() {
  const c = ctx(); if (!c) return;
  osc(c, { dur: 0.35, f0: 300, f1: 180, type: "triangle", vol: 0.14 });
  osc(c, { t: 0.18, dur: 0.45, f0: 220, f1: 130, type: "triangle", vol: 0.12 });
}
