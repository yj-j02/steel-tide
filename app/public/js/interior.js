/**
 * Steel Tide — first-person interiors, modelled in camera space and drawn
 * over the world: a battleship's navigating bridge (wheel, engine-order
 * telegraphs, gyro repeater, rudder and speed indicators) and the Wildcat's
 * cockpit (instrument panel, canopy frame, Mk 8 reflector sight).
 */
import { THREE, PI, TAU, DEG, KN, clamp, ovScene } from "./core.js";
import { TELE } from "./ships.js";

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.15, ...o });
const paintG = M(0x8f9a8e), dark = M(0x2d3336), brass = M(0xb48d4f, { metalness: 0.85, roughness: 0.3 }), black = M(0x101214), wood = M(0x6b4a2e, { roughness: 0.55 });
function bx(g, w, h, d, m, x, y, z, rx = 0) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.x = rx; g.add(o); return o; }
function dialTex(draw) { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData = { x, draw }; draw(x, 0); t.needsUpdate = true; return t; }
function redraw(t, v) { t.userData.draw(t.userData.x, v); t.needsUpdate = true; }
function face(x, label) {
  x.clearRect(0, 0, 256, 256); x.fillStyle = "#e9e4d6"; x.beginPath(); x.arc(128, 128, 124, 0, TAU); x.fill();
  x.strokeStyle = "#222"; x.lineWidth = 6; x.stroke(); x.fillStyle = "#222"; x.font = "bold 20px Arial"; x.textAlign = "center"; x.fillText(label, 128, 200);
}
function needle(x, a, len = 96, col = "#111", w = 6) { x.save(); x.translate(128, 128); x.rotate(a); x.fillStyle = col; x.fillRect(-w / 2, -len, w, len + 14); x.restore(); x.fillStyle = "#333"; x.beginPath(); x.arc(128, 128, 9, 0, TAU); x.fill(); }
function dialMesh(g, r, tex, x, y, z, rx = 0) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ map: tex })); m.position.set(x, y, z); m.rotation.x = rx; g.add(m);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.08, 8, 32), brass); rim.position.copy(m.position); rim.rotation.x = rx; g.add(rim); return m; }

// ── ship's bridge ───────────────────────────────────────────────────────────
export const bridge = new THREE.Group(); bridge.visible = false; ovScene.add(bridge);
const telTex = dialTex((x, v) => {
  face(x, "ENGINE ORDER"); x.font = "bold 15px Arial"; x.fillStyle = "#222";
  const names = ["BACK", "STOP", "SLOW", "HALF", "STD", "FULL"];
  names.forEach((n, i) => { const a = -PI * 0.75 + (i / 5) * PI * 1.5; x.fillText(n, 128 + Math.sin(a) * 86, 134 - Math.cos(a) * 86); });
  needle(x, -PI * 0.75 + (v / 5) * PI * 1.5, 70, "#8a1b14");
});
const compTex = dialTex((x, v) => {
  face(x, "GYRO"); x.save(); x.translate(128, 128); x.rotate(-v);
  for (let d = 0; d < 360; d += 10) { x.save(); x.rotate(d * DEG); x.fillStyle = "#222"; x.fillRect(-1.5, -118, 3, d % 30 ? 10 : 20); if (d % 30 === 0) { x.font = "bold 18px Arial"; x.textAlign = "center"; x.fillText(d === 0 ? "N" : d === 90 ? "E" : d === 180 ? "S" : d === 270 ? "W" : String(d / 10), 0, -84); } x.restore(); }
  x.restore(); x.fillStyle = "#b11"; x.beginPath(); x.moveTo(128, 6); x.lineTo(120, 26); x.lineTo(136, 26); x.fill();
});
const rudTex = dialTex((x, v) => { face(x, "RUDDER"); x.font = "bold 16px Arial"; x.fillStyle = "#222"; x.fillText("PORT", 60, 120); x.fillText("STBD", 196, 120); for (let a = -35; a <= 35; a += 5) { x.save(); x.translate(128, 128); x.rotate(a * DEG * 2.2); x.fillRect(-1.5, -118, 3, a % 15 ? 10 : 20); x.restore(); } needle(x, v * 35 * DEG * 2.2, 96, "#111"); });
const spdTex = dialTex((x, v) => { face(x, "KNOTS"); x.font = "bold 16px Arial"; x.fillStyle = "#222"; for (let k = 0; k <= 35; k += 5) { const a = -PI * 0.75 + (k / 35) * PI * 1.5; x.fillText(String(k), 128 + Math.sin(a) * 84, 134 - Math.cos(a) * 84); } needle(x, -PI * 0.75 + (clamp(v, 0, 35) / 35) * PI * 1.5, 92); });
{
  const g = bridge, z0 = -2.3;
  bx(g, 7, 1.0, 0.12, paintG, 0, -1.15, z0); bx(g, 7, 0.6, 0.12, paintG, 0, 1.35, z0);
  for (const x of [-3.0, -1.5, 0, 1.5, 3.0]) bx(g, 0.05, 1.45, 0.1, dark, x, 0.33, z0);
  bx(g, 7, 0.06, 0.25, brass, 0, -0.62, z0 + 0.1);
  for (const s of [1, -1]) { bx(g, 0.12, 1.0, 3.6, paintG, s * 3.4, -1.15, -0.55); bx(g, 0.12, 0.6, 3.6, paintG, s * 3.4, 1.35, -0.55); bx(g, 0.14, 1.05, 0.1, dark, s * 3.4, 0.3, -1.2); bx(g, 0.14, 1.05, 0.1, dark, s * 3.4, 0.3, 0.2); }
  bx(g, 7, 0.1, 3.8, paintG, 0, 1.65, -0.5); bx(g, 7, 0.1, 3.8, wood, 0, -1.65, -0.5);
  bx(g, 5.5, 0.7, 0.55, dark, 0, -1.25, -1.95, 0.15);
  for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), black); d.rotation.x = PI / 2 - 0.4; d.position.set(-1.8 + i * 0.72, -0.86, -1.8); g.add(d); }
  // wheel
  bx(g, 0.25, 0.95, 0.25, wood, 0, -1.2, -1.05); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), brass); hub.rotation.x = PI / 2; hub.position.set(0, -0.55, -0.98); g.add(hub);
  const wheel = new THREE.Group(); wheel.position.set(0, -0.55, -0.95); g.add(wheel); bridge.userData.wheel = wheel;
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 8, 32), wood));
  for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.56, 0.025), brass); sp.rotation.z = (i / 8) * PI; wheel.add(sp); }
  // engine telegraphs
  for (const s of [-1, 1]) { const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.0, 12), brass); ped.position.set(s * 0.95, -1.15, -1.1); g.add(ped); dialMesh(g, 0.2, telTex, s * 0.95, -0.42, -1.08, -0.25); }
  dialMesh(g, 0.24, compTex, -1.75, -0.6, -1.25, -0.9); const binn = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.95, 16), brass); binn.position.set(-1.75, -1.15, -1.3); g.add(binn);
  dialMesh(g, 0.2, rudTex, 0, 1.25, z0 + 0.08); dialMesh(g, 0.18, spdTex, -0.9, 1.25, z0 + 0.08);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a0 })); lamp.position.set(0, 1.5, -0.6); g.add(lamp);
  for (const x of [-2.6, 2.6]) { const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), brass); pipe.position.set(x, 0.9, z0 + 0.2); g.add(pipe); }
}
let lastB = { tele: -1, hdg: -99, rud: -9, spd: -9 };
export function updateBridge(P, look, pitch = 0) {
  bridge.rotation.set(-pitch, look, 0, "XYZ"); bridge.userData.wheel.rotation.z = -P.rudder * 1.8;
  const h = Math.round(((P.heading / DEG) % 360 + 360) % 360), r = Math.round(P.rudder * 50) / 50, sp = Math.round((P.speed / KN) * 2) / 2;
  if (lastB.tele !== P.tele) { redraw(telTex, P.tele); lastB.tele = P.tele; }
  if (lastB.hdg !== h) { redraw(compTex, h * DEG); lastB.hdg = h; }
  if (lastB.rud !== r) { redraw(rudTex, r); lastB.rud = r; }
  if (lastB.spd !== sp) { redraw(spdTex, sp); lastB.spd = sp; }
}

// ── fighter cockpit (F4F-4) ─────────────────────────────────────────────────
// Camera space: eye at the origin looking down -Z. The view ahead is kept clear: the windscreen
// is a thin frame with near-transparent glass, the panel sits low under a glare shield, and the
// engine cowling shows the nose line. The aircraft's own exterior model is hidden in this view.
export const cockpit = new THREE.Group(); cockpit.visible = false; ovScene.add(cockpit);
const PW = 1024, PH = 520;
const panelTex = (() => { const c = document.createElement("canvas"); c.width = PW; c.height = PH; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.x = c.getContext("2d"); return t; })();
const sightTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
  x.strokeStyle = "rgba(255,160,60,.95)"; x.fillStyle = "rgba(255,160,60,.95)"; x.lineWidth = 4; x.beginPath(); x.arc(128, 128, 92, 0, TAU); x.stroke();
  x.lineWidth = 3; for (const a of [0, PI / 2, PI, PI * 1.5]) { x.beginPath(); x.moveTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); x.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); x.stroke(); }
  x.beginPath(); x.arc(128, 128, 5, 0, TAU); x.fill(); for (const r of [30, 60]) { x.beginPath(); x.moveTo(128 - 6, 128 + r); x.lineTo(128 + 6, 128 + r); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const glassTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); x.clearRect(0, 0, 256, 256);
  const g = x.createLinearGradient(0, 0, 256, 256); g.addColorStop(0, "rgba(255,255,255,.10)"); g.addColorStop(0.45, "rgba(255,255,255,0)"); g.addColorStop(0.55, "rgba(255,255,255,.05)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(200,210,200,${Math.random() * 0.06})`; x.beginPath(); x.arc(Math.random() * 256, 180 + Math.random() * 76, Math.random() * 2.2, 0, TAU); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
// ── instruments ──
function bezel(x, cx, cy, r) {
  const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r * 1.12); g.addColorStop(0, "#3a3f42"); g.addColorStop(1, "#111"); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r * 1.12, 0, TAU); x.fill();
  x.fillStyle = "#0b0d0e"; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
  for (const a of [PI * 0.25, PI * 0.75, PI * 1.25, PI * 1.75]) { x.fillStyle = "#555"; x.beginPath(); x.arc(cx + Math.cos(a) * r * 1.06, cy + Math.sin(a) * r * 1.06, 3, 0, TAU); x.fill(); }
}
function scaleDial(x, cx, cy, r, label, frac, marks, from = -PI * 0.75, span = PI * 1.5, unit = "") {
  bezel(x, cx, cy, r); x.strokeStyle = "#e8e4d4"; x.fillStyle = "#e8e4d4"; x.textAlign = "center"; x.textBaseline = "middle";
  const n = marks.length - 1;
  for (let i = 0; i <= n * 5; i++) { const a = from + (i / (n * 5)) * span, big = i % 5 === 0; x.lineWidth = big ? 3 : 1.5; x.beginPath(); x.moveTo(cx + Math.sin(a) * r * (big ? 0.76 : 0.84), cy - Math.cos(a) * r * (big ? 0.76 : 0.84)); x.lineTo(cx + Math.sin(a) * r * 0.93, cy - Math.cos(a) * r * 0.93); x.stroke(); }
  x.font = `bold ${Math.round(r * 0.2)}px Arial`; marks.forEach((m, i) => { if (m === "") return; const a = from + (i / n) * span; x.fillText(m, cx + Math.sin(a) * r * 0.6, cy - Math.cos(a) * r * 0.6); });
  x.font = `bold ${Math.round(r * 0.14)}px Arial`; x.fillStyle = "#b9b5a6"; x.fillText(label, cx, cy + r * 0.38); if (unit) x.fillText(unit, cx, cy - r * 0.3);
  hand(x, cx, cy, from + clamp(frac, 0, 1) * span, r * 0.82, 5);
}
function hand(x, cx, cy, a, len, w, col = "#f4f1e6") { x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = col; x.beginPath(); x.moveTo(-w / 2, len * 0.15); x.lineTo(-w * 0.3, -len); x.lineTo(w * 0.3, -len); x.lineTo(w / 2, len * 0.15); x.closePath(); x.fill(); x.restore(); x.fillStyle = "#222"; x.beginPath(); x.arc(cx, cy, w * 1.2, 0, TAU); x.fill(); }
function attitude(x, cx, cy, r, pitch, bank) {
  bezel(x, cx, cy, r); x.save(); x.beginPath(); x.arc(cx, cy, r * 0.97, 0, TAU); x.clip();
  x.translate(cx, cy); x.rotate(-bank); const off = clamp(pitch / DEG, -40, 40) * r * 0.022;
  x.fillStyle = "#3d7bb5"; x.fillRect(-r * 2, -r * 2 + off, r * 4, r * 2); x.fillStyle = "#6b4a2e"; x.fillRect(-r * 2, off, r * 4, r * 2);
  x.strokeStyle = "#fff"; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-r, off); x.lineTo(r, off); x.stroke();
  x.lineWidth = 1.5; for (const p of [-20, -10, 10, 20]) { const y = off - p * r * 0.022; x.beginPath(); x.moveTo(-r * (Math.abs(p) > 10 ? 0.25 : 0.4), y); x.lineTo(r * (Math.abs(p) > 10 ? 0.25 : 0.4), y); x.stroke(); }
  x.restore(); x.save(); x.translate(cx, cy);
  x.strokeStyle = "#ffb04a"; x.lineWidth = 4; x.beginPath(); x.moveTo(-r * 0.55, 0); x.lineTo(-r * 0.18, 0); x.lineTo(-r * 0.08, r * 0.1); x.moveTo(r * 0.55, 0); x.lineTo(r * 0.18, 0); x.lineTo(r * 0.08, r * 0.1); x.stroke();
  x.fillStyle = "#ffb04a"; x.beginPath(); x.arc(0, 0, 4, 0, TAU); x.fill(); x.restore();
  x.fillStyle = "#b9b5a6"; x.font = `bold ${Math.round(r * 0.13)}px Arial`; x.textAlign = "center"; x.fillText("GYRO HORIZON", cx, cy + r * 0.82);
}
function compassStrip(x, cx, cy, w, h, hdg) {
  x.fillStyle = "#0b0d0e"; x.fillRect(cx - w / 2 - 6, cy - h / 2 - 6, w + 12, h + 12); x.save(); x.beginPath(); x.rect(cx - w / 2, cy - h / 2, w, h); x.clip();
  x.fillStyle = "#1a1c1d"; x.fillRect(cx - w / 2, cy - h / 2, w, h); x.strokeStyle = x.fillStyle = "#e8e4d4"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = "bold 22px Arial";
  const ppd = w / 60;
  for (let d = Math.floor(hdg) - 35; d <= hdg + 35; d++) { if (d % 5) continue; const X = cx + (d - hdg) * ppd, dd = ((d % 360) + 360) % 360; x.lineWidth = dd % 10 ? 1.5 : 3; x.beginPath(); x.moveTo(X, cy + h / 2); x.lineTo(X, cy + h / 2 - (dd % 10 ? 10 : 18)); x.stroke(); if (dd % 30 === 0) x.fillText({ 0: "E", 90: "S", 180: "W", 270: "N" }[dd] ?? String(dd / 10), X, cy - 6); }
  x.restore(); x.fillStyle = "#ffb04a"; x.fillRect(cx - 1.5, cy - h / 2 - 6, 3, h + 12);
}
let lastHdg = null, turnRate = 0;
function drawPanel(pl, dt) {
  const x = panelTex.userData.x, f = pl.fwd, up = pl.up, hdg = ((Math.atan2(f.z, f.x) / DEG) % 360 + 360) % 360;
  if (lastHdg !== null) { let d = hdg - lastHdg; if (d > 180) d -= 360; if (d < -180) d += 360; turnRate += (d / Math.max(dt, 1e-3) - turnRate) * 0.3; } lastHdg = hdg;
  const pitch = Math.asin(clamp(f.y, -1, 1)), right = new THREE.Vector3().crossVectors(f, up), bank = Math.atan2(-right.y, up.y);
  // panel face: matt black with a worn edge
  const g = x.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, "#1d2124"); g.addColorStop(1, "#121517"); x.fillStyle = g; x.fillRect(0, 0, PW, PH);
  x.fillStyle = "rgba(255,255,255,.04)"; for (let i = 0; i < 30; i++) x.fillRect((i * 97) % PW, (i * 53) % PH, 40, 1.5);
  const mph = pl.speed * 2.237, ft = pl.pos.y * 3.281, fpm = pl.speed * f.y * 196.85;
  scaleDial(x, 170, 150, 108, "AIRSPEED", mph / 450, ["0", "", "100", "", "200", "", "300", "", "400", ""], -PI * 0.92, PI * 1.84, "MPH");
  attitude(x, 420, 150, 112, pitch, bank);
  { const cx = 670, cy = 150, r = 108; bezel(x, cx, cy, r); x.fillStyle = "#e8e4d4"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = "bold 24px Arial";
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; x.fillText(String(i), cx + Math.sin(a) * r * 0.66, cy - Math.cos(a) * r * 0.66); for (let k = 0; k < 5; k++) { const b = a + (k / 50) * TAU; x.lineWidth = k ? 1.5 : 3; x.strokeStyle = "#e8e4d4"; x.beginPath(); x.moveTo(cx + Math.sin(b) * r * (k ? 0.86 : 0.8), cy - Math.cos(b) * r * (k ? 0.86 : 0.8)); x.lineTo(cx + Math.sin(b) * r * 0.94, cy - Math.cos(b) * r * 0.94); x.stroke(); } }
    x.font = "bold 15px Arial"; x.fillStyle = "#b9b5a6"; x.fillText("ALTITUDE", cx, cy + r * 0.36); x.fillText("FEET", cx, cy - r * 0.3);
    hand(x, cx, cy, ((ft / 10000) % 1) * TAU, r * 0.5, 9); hand(x, cx, cy, ((ft / 1000) % 1) * TAU, r * 0.84, 5); }
  scaleDial(x, 880, 150, 98, "RATE OF CLIMB", (clamp(fpm, -6000, 6000) + 6000) / 12000, ["6", "4", "2", "0", "2", "4", "6"], -PI * 0.85 - PI / 2 + PI / 2, PI * 1.7, "×1000 FPM");
  // second row
  scaleDial(x, 110, 395, 78, "MANIFOLD", 0.2 + 0.72 * pl.throttle, ["10", "20", "30", "40", "50", "60"]);
  scaleDial(x, 285, 395, 78, "TACHOMETER", 0.25 + 0.7 * pl.throttle + Math.sin(performance.now() / 70) * 0.004, ["0", "5", "10", "15", "20", "25", "30"], -PI * 0.75, PI * 1.5, "RPM×100");
  { const cx = 512, cy = 395, r = 78; bezel(x, cx, cy, r); x.fillStyle = "#e8e4d4"; x.textAlign = "center"; x.font = "bold 13px Arial"; x.fillText("TURN & BANK", cx, cy + r * 0.62);
    hand(x, cx, cy - r * 0.05, clamp(turnRate / 9, -1, 1) * 0.6, r * 0.7, 6); for (const s of [-1, 1]) { x.fillStyle = "#e8e4d4"; x.fillRect(cx + s * r * 0.42 - 3, cy - r * 0.68, 6, 14); }
    x.strokeStyle = "#777"; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy - r * 0.9, r * 1.15, PI * 0.36, PI * 0.64); x.stroke();
    const slip = clamp(-bank * 0.5 + turnRate * 0.03, -0.5, 0.5); x.fillStyle = "#111"; x.strokeStyle = "#ccc"; x.beginPath(); x.arc(cx + Math.sin(slip) * r * 1.15, cy - r * 0.9 + Math.cos(slip) * r * 1.15, 8, 0, TAU); x.fill(); x.stroke(); }
  compassStrip(x, 740, 380, 220, 56, hdg);
  { x.fillStyle = "#e8e4d4"; x.font = "bold 14px Arial"; x.textAlign = "center"; x.fillText("COMPASS", 740, 425); }
  // armament panel
  const lamp = (cx, cy, on, col, label) => { x.fillStyle = on ? col : "#2a2a2a"; x.beginPath(); x.arc(cx, cy, 11, 0, TAU); x.fill(); x.strokeStyle = "#555"; x.lineWidth = 2; x.stroke(); x.fillStyle = "#cfcabb"; x.font = "bold 12px Arial"; x.textAlign = "center"; x.fillText(label, cx, cy + 24); };
  x.fillStyle = "#0b0d0e"; x.fillRect(890, 300, 120, 200);
  lamp(925, 330, pl.ammo > 0, "#ffcf5a", "GUNS"); lamp(975, 330, pl.bombs > 0, "#ff8a3d", "BOMBS"); lamp(925, 395, pl.hp < 50, "#ff3b30", "DAMAGE"); lamp(975, 395, pl.flareT > 0, "#ffffff", "FLARE");
  x.fillStyle = "#e8e4d4"; x.font = "bold 16px monospace"; x.fillText(`RDS ${String(pl.ammo).padStart(4, "0")}`, 950, 470);
  panelTex.needsUpdate = true;
}
{
  const g = cockpit, frameM = M(0x56616d, { roughness: 0.5, metalness: 0.4 }), blackM = M(0x15181a), cowlM = M(0x5a6b7d, { roughness: 0.55 }), seat = M(0x2d3134);
  // nose / cowling seen over the glare shield
  bx(g, 0.8, 0.1, 3.4, cowlM, 0, -0.45, -2.6); bx(g, 0.5, 0.04, 3.2, M(0x4a5866), 0, -0.36, -2.6);

  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.06, depthWrite: false })); disc.position.set(0, -0.85, -4.5); g.add(disc); cockpit.userData.disc = disc;
  // glare shield + instrument panel (low, keeps the view ahead clear)
  bx(g, 1.14, 0.035, 0.2, blackM, 0, -0.2, -0.72);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.55), new THREE.MeshBasicMaterial({ map: panelTex })); panel.position.set(0, -0.47, -0.74); panel.rotation.x = -0.1; g.add(panel);
  bx(g, 1.16, 0.6, 0.03, blackM, 0, -0.47, -0.76, -0.1);
  // Mk 8 reflector sight on the glare shield, its reticle on the bore line
  bx(g, 0.05, 0.05, 0.12, blackM, 0, -0.16, -0.66);
  const refl = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({ map: sightTex, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })); refl.position.set(0, 0, -0.62); g.add(refl);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.12), new THREE.MeshBasicMaterial({ color: 0xa8c8d8, transparent: true, opacity: 0.08, depthWrite: false })); plate.position.set(0, -0.06, -0.63); plate.rotation.x = -0.35; g.add(plate);
  // windscreen: flat armoured centre pane + two side panes, slim frame, nearly clear glass
  const glassM = new THREE.MeshBasicMaterial({ map: glassTex, transparent: true, opacity: 1, depthWrite: false, color: 0xdfeef2 });
  const pane = (w, h, x, y, z, ry, rx) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassM); m.position.set(x, y, z); m.rotation.set(rx, ry, 0, "YXZ"); g.add(m); };
  pane(0.36, 0.42, 0, 0.05, -0.56, 0, -0.32); for (const s of [1, -1]) pane(0.3, 0.42, s * 0.31, 0.05, -0.44, -s * 0.85, -0.25);
  const bar = (len, x, y, z, rx, rz, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.011, len, 0.011), frameM); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); };
  for (const s of [1, -1]) { bar(0.46, s * 0.18, 0.05, -0.56, -0.32, 0); bar(0.46, s * 0.43, 0.05, -0.33, -0.25, s * 0.12); }
  bx(g, 0.38, 0.011, 0.011, frameM, 0, 0.26, -0.49); bx(g, 0.4, 0.014, 0.014, frameM, 0, -0.16, -0.63);
  // canopy rails, sliding hood bows, rear-view mirror
  for (const s of [1, -1]) { bx(g, 0.02, 0.02, 1.2, frameM, s * 0.49, -0.2, 0.1); const bow = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.008, 6, 24, PI), frameM); bow.position.set(0, -0.12, s > 0 ? -0.18 : 0.32); g.add(bow); }
  bx(g, 0.012, 0.012, 0.5, frameM, 0, 0.36, 0.07); 
  // side consoles, throttle quadrant, stick
  for (const s of [1, -1]) bx(g, 0.14, 0.12, 0.7, seat, s * 0.4, -0.62, -0.2);
  const thr = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), M(0xb02a2a)); thr.position.set(-0.4, -0.5, -0.3); g.add(thr); cockpit.userData.thr = thr;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.42, 8), blackM); stick.position.set(0, -0.68, -0.36); stick.rotation.x = 0.3; g.add(stick); cockpit.userData.stick = stick;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.1, 8), M(0x3a2a1e)); grip.position.set(0, 0.24, 0); stick.add(grip);
}
let panelT = 0;
export function updateCockpit(pl, dt) {
  panelT -= dt; if (panelT <= 0) { panelT = 0.066; drawPanel(pl, 0.066); }
  cockpit.userData.stick.rotation.x = 0.3 - pl.pitchCmd * 0.25; cockpit.userData.thr.position.z = -0.24 - pl.throttle * 0.12;
  cockpit.userData.disc.rotation.z += dt * 40;
}

// ── twin 40 mm Bofors mount, gunner's view (camera space) ──────────────────
export const aaGun = new THREE.Group(); aaGun.visible = false; ovScene.add(aaGun);
{
  const g = aaGun, gun = M(0x59636b, { metalness: 0.5, roughness: 0.45 }), blk = M(0x16191b), olive = M(0x6b7461);
  const barrels = new THREE.Group(); g.add(barrels); aaGun.userData.barrels = [];
  for (const s of [1, -1]) {
    const b = new THREE.Group(); b.position.set(s * 0.36, -0.6, -0.75); // wider and lower so the breeches sit below the line of sight barrels.add(b); aaGun.userData.barrels.push(b);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.2, 12), gun); tube.rotation.x = PI / 2; tube.position.z = -1.1; b.add(tube);
    const hider = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.28, 12), blk); hider.rotation.x = PI / 2; hider.position.z = -2.3; b.add(hider);
    const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.7, 12), olive); jacket.rotation.x = PI / 2; jacket.position.z = -0.2; b.add(jacket);
    bx(b, 0.12, 0.08, 0.24, olive, 0, -0.1, -0.05); const hopper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.1), blk); hopper.position.set(0, -0.01, -0.05); b.add(hopper); // slim receiver, low feed
  }
  bx(g, 0.7, 0.08, 0.34, olive, 0, -0.78, -0.45); bx(g, 1.0, 0.3, 0.03, olive, 0, -1.15, -0.9, -0.2);
  // open ring (cartwheel) sight on the bore line
  const ringM = new THREE.MeshBasicMaterial({ color: 0x15181a });
  for (const r of [0.07, 0.14]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0016, 6, 48), ringM); t.position.set(0, 0, -1.1); g.add(t); }
  for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.14, 0.002), ringM); sp.position.set(0, 0, -1.1); sp.rotation.z = (i * PI) / 4; g.add(sp); const sp2 = sp.clone(); sp2.rotation.z = (i * PI) / 4 + PI / 2; g.add(sp2); }
  bx(g, 0.012, 0.13, 0.012, blk, 0, -0.08, -1.1);
}
export function updateAAGun(recoil) { aaGun.userData.barrels.forEach((b, i) => { b.position.z = -0.75 + recoil[i] * 0.12; }); }
