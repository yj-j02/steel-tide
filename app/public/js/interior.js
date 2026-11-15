/**
 * Steel Tide — first-person interiors, modelled in camera space and drawn
 * over the world: a battleship's navigating bridge (wheel, engine-order
 * telegraphs, gyro repeater, rudder and speed indicators) and the Wildcat's
 * cockpit (instrument panel, canopy frame, Mk 8 reflector sight).
 */
import { THREE, PI, TAU, DEG, KN, clamp, ovScene, G } from "./core.js";
import { TELE } from "./ships.js";

let _ovHemi = null, _ovDir = null;
function syncOvLight() {
  if (!_ovHemi) {
    for (const ch of ovScene.children) {
      if (ch.isHemisphereLight) _ovHemi = ch;
      else if (ch.isDirectionalLight) _ovDir = ch;
    }
  }
  const night = G.tod === "night", storm = G.wx === "storm";
  if (_ovHemi) _ovHemi.intensity = night ? 0.34 : storm ? 1.05 : 1.6;
  if (_ovDir) {
    _ovDir.intensity = night ? 0.28 : storm ? 0.72 : 1.6;
    _ovDir.color.setHex(night ? 0x6d84b8 : storm ? 0xc8d2da : 0xfff0dd);
  }
  return { night, storm };
}

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.15, ...o });
const paintG = M(0x8f9a8e), dark = M(0x2d3336), brass = M(0xb48d4f, { metalness: 0.85, roughness: 0.3 }), black = M(0x101214), wood = M(0x6b4a2e, { roughness: 0.55 });
function bx(g, w, h, d, m, x, y, z, rx = 0) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.x = rx; g.add(o); return o; }
function dialTex(draw) { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData = { x, draw }; draw(x, 0); t.needsUpdate = true; return t; }
function redraw(t, v) { t.userData.draw(t.userData.x, v); t.needsUpdate = true; }
function face(x, label) {
  const n = G.tod === "night";
  x.clearRect(0, 0, 256, 256); x.fillStyle = n ? "#1d1514" : "#e9e4d6"; x.beginPath(); x.arc(128, 128, 124, 0, TAU); x.fill();
  x.strokeStyle = n ? "#9e492e" : "#222"; x.lineWidth = 6; x.stroke(); x.fillStyle = n ? "#ff9c54" : "#222"; x.font = "bold 20px Arial"; x.textAlign = "center"; x.fillText(label, 128, 200);
}
function needle(x, a, len = 96, col = "#111", w = 6) {
  const c = G.tod === "night" && (col === "#111" || col === "#222") ? "#ffae66" : G.tod === "night" && col === "#8a1b14" ? "#ff5242" : col;
  x.save(); x.translate(128, 128); x.rotate(a); x.fillStyle = c; x.fillRect(-w / 2, -len, w, len + 14); x.restore(); x.fillStyle = G.tod === "night" ? "#c85b3a" : "#333"; x.beginPath(); x.arc(128, 128, 9, 0, TAU); x.fill();
}
function dialMesh(g, r, tex, x, y, z, rx = 0) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ map: tex })); m.position.set(x, y, z); m.rotation.x = rx; g.add(m);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.08, 8, 32), brass); rim.position.copy(m.position); rim.rotation.x = rx; g.add(rim); return m; }

// ── ship's bridge ───────────────────────────────────────────────────────────
export const bridge = new THREE.Group(); bridge.visible = false; ovScene.add(bridge);
const telTex = dialTex((x, v) => {
  face(x, "ENGINE ORDER"); x.font = "bold 15px Arial"; x.fillStyle = G.tod === "night" ? "#ff9c54" : "#222";
  const names = ["BACK", "STOP", "SLOW", "HALF", "STD", "FULL"];
  names.forEach((n, i) => { const a = -PI * 0.75 + (i / 5) * PI * 1.5; x.fillText(n, 128 + Math.sin(a) * 86, 134 - Math.cos(a) * 86); });
  needle(x, -PI * 0.75 + (v / 5) * PI * 1.5, 70, "#8a1b14");
});
const compTex = dialTex((x, v) => {
  face(x, "GYRO"); x.save(); x.translate(128, 128); x.rotate(-v);
  for (let d = 0; d < 360; d += 10) { x.save(); x.rotate(d * DEG); x.fillStyle = G.tod === "night" ? "#ff9c54" : "#222"; x.fillRect(-1.5, -118, 3, d % 30 ? 10 : 20); if (d % 30 === 0) { x.font = "bold 18px Arial"; x.textAlign = "center"; x.fillText(d === 0 ? "N" : d === 90 ? "E" : d === 180 ? "S" : d === 270 ? "W" : String(d / 10), 0, -84); } x.restore(); }
  x.restore(); x.fillStyle = G.tod === "night" ? "#ff5242" : "#b11"; x.beginPath(); x.moveTo(128, 6); x.lineTo(120, 26); x.lineTo(136, 26); x.fill();
});
const rudTex = dialTex((x, v) => { face(x, "RUDDER"); const ic = G.tod === "night" ? "#ff9c54" : "#222"; x.font = "bold 16px Arial"; x.fillStyle = ic; x.fillText("PORT", 60, 120); x.fillText("STBD", 196, 120); for (let a = -35; a <= 35; a += 5) { x.save(); x.translate(128, 128); x.rotate(a * DEG * 2.2); x.fillRect(-1.5, -118, 3, a % 15 ? 10 : 20); x.restore(); } needle(x, v * 35 * DEG * 2.2, 96, "#111"); });
const spdTex = dialTex((x, v) => { face(x, "KNOTS"); x.font = "bold 16px Arial"; x.fillStyle = G.tod === "night" ? "#ff9c54" : "#222"; for (let k = 0; k <= 35; k += 5) { const a = -PI * 0.75 + (k / 35) * PI * 1.5; x.fillText(String(k), 128 + Math.sin(a) * 84, 134 - Math.cos(a) * 84); } needle(x, -PI * 0.75 + (clamp(v, 0, 35) / 35) * PI * 1.5, 92); });
{
  const g = bridge, z0 = -2.3, brassBright = M(0xdcb464, { metalness: 0.85, roughness: 0.24 });
  const glassClr = new THREE.MeshBasicMaterial({ color: 0xbfe2ee, transparent: true, opacity: 0.10, depthWrite: false });
  bx(g, 7, 1.0, 0.12, paintG, 0, -1.15, z0); bx(g, 7, 0.6, 0.12, paintG, 0, 1.35, z0);
  for (const x of [-3.0, -1.5, 0, 1.5, 3.0]) bx(g, 0.05, 1.45, 0.1, dark, x, 0.33, z0);
  bx(g, 7, 0.06, 0.25, brass, 0, -0.62, z0 + 0.1);
  // Clear-view rotating rain screens on port/stbd forward windows
  bridge.userData.wipers = [];
  for (const wx of [-0.75, 0.75]) {
    const cg = new THREE.Group(); cg.position.set(wx, 0.34, z0 + 0.04); g.add(cg);
    cg.add(new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.012, 8, 28), brass));
    cg.add(new THREE.Mesh(new THREE.CircleGeometry(0.31, 24), glassClr));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.04, 12), brassBright); hub.rotation.x = PI / 2; cg.add(hub);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.56, 0.008), dark); blade.position.z = 0.012; cg.add(blade);
    bridge.userData.wipers.push(blade);
  }
  for (const s of [1, -1]) { bx(g, 0.12, 1.0, 3.6, paintG, s * 3.4, -1.15, -0.55); bx(g, 0.12, 0.6, 3.6, paintG, s * 3.4, 1.35, -0.55); bx(g, 0.14, 1.05, 0.1, dark, s * 3.4, 0.3, -1.2); bx(g, 0.14, 1.05, 0.1, dark, s * 3.4, 0.3, 0.2); }
  bx(g, 7, 0.1, 3.8, paintG, 0, 1.65, -0.5); bx(g, 7, 0.1, 3.8, wood, 0, -1.65, -0.5);
  bx(g, 5.5, 0.7, 0.55, dark, 0, -1.25, -1.95, 0.15);
  for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), black); d.rotation.x = PI / 2 - 0.4; d.position.set(-1.8 + i * 0.72, -0.86, -1.8); g.add(d); }
  // helm stand + brass spoked ship's wheel with protruding hand grips
  bx(g, 0.25, 0.95, 0.25, wood, 0, -1.2, -1.05); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), brassBright); hub.rotation.x = PI / 2; hub.position.set(0, -0.55, -0.98); g.add(hub);
  const wheel = new THREE.Group(); wheel.position.set(0, -0.55, -0.95); g.add(wheel); bridge.userData.wheel = wheel;
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 8, 32), wood));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * (PI * 2), sp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.48, 8), brassBright);
    sp.position.set(Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0); sp.rotation.z = a - PI / 2; wheel.add(sp);
    const grip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), wood);
    grip.position.set(Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0); wheel.add(grip);
  }
  // twin engine order telegraphs with animated brass lever arms
  bridge.userData.teleHandles = [];
  for (const s of [-1, 1]) {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.0, 12), brass); ped.position.set(s * 0.95, -1.15, -1.1); g.add(ped);
    dialMesh(g, 0.2, telTex, s * 0.95, -0.42, -1.08, -0.25);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.014, 8, 24), brassBright); rim.position.set(s * 0.95, -0.42, -1.075); rim.rotation.x = -0.25; g.add(rim);
    const hpiv = new THREE.Group(); hpiv.position.set(s * 1.13, -0.42, -1.08); g.add(hpiv);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.02), brassBright); arm.position.y = 0.14; hpiv.add(arm);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), black); knob.position.y = 0.29; hpiv.add(knob);
    bridge.userData.teleHandles.push(hpiv);
  }
  // magnetic binnacle with port/stbd Kelvin compensating spheres + hood
  dialMesh(g, 0.24, compTex, -1.75, -0.6, -1.25, -0.9); const binn = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.95, 16), brass); binn.position.set(-1.75, -1.15, -1.3); g.add(binn);
  bx(g, 0.68, 0.05, 0.06, brass, -1.75, -0.78, -1.3);
  for (const [ks, col] of [[-1, 0x992420], [1, 0x1f6e34]]) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), M(col, { roughness: 0.35, metalness: 0.2 }));
    ball.position.set(-1.75 + ks * 0.33, -0.70, -1.3); g.add(ball);
  }
  // starboard pelorus & armored bridge binoculars stand
  const pStand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.95, 12), dark); pStand.position.set(1.75, -1.15, -1.25); g.add(pStand);
  const pRing = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 16), brassBright); pRing.position.set(1.75, -0.66, -1.25); g.add(pRing);
  const binoc = new THREE.Group(); binoc.position.set(1.75, -0.57, -1.25); binoc.rotation.set(0.08, -0.2, 0); g.add(binoc);
  for (const bs of [-0.045, 0.045]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.022, 0.24, 10), black); tube.rotation.x = PI / 2; tube.position.set(bs, 0, -0.05); binoc.add(tube);
  }
  bx(binoc, 0.11, 0.025, 0.04, brass, 0, 0, 0.02);
  // starboard corner chart table + navigation chart & warm gooseneck lamp
  const chartCanv = document.createElement("canvas"); chartCanv.width = 256; chartCanv.height = 192;
  {
    const cc = chartCanv.getContext("2d"); cc.fillStyle = "#e8dec3"; cc.fillRect(0, 0, 256, 192);
    cc.strokeStyle = "rgba(70,95,110,0.32)"; cc.lineWidth = 1;
    for (let x = 24; x < 256; x += 32) { cc.beginPath(); cc.moveTo(x, 0); cc.lineTo(x, 192); cc.stroke(); }
    for (let y = 24; y < 192; y += 32) { cc.beginPath(); cc.moveTo(0, y); cc.lineTo(256, y); cc.stroke(); }
    cc.strokeStyle = "#5c4d35"; cc.lineWidth = 2; cc.beginPath(); cc.moveTo(20, 150); cc.quadraticCurveTo(95, 115, 175, 130); cc.lineTo(235, 92); cc.stroke();
    cc.strokeStyle = "#b5332a"; cc.lineWidth = 2.5; cc.setLineDash([7, 4]); cc.beginPath(); cc.moveTo(35, 42); cc.lineTo(130, 88); cc.lineTo(215, 48); cc.stroke();
  }
  bx(g, 1.1, 0.05, 0.78, wood, 2.45, -0.92, -1.78, 0.16);
  const chartSheet = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.62), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(chartCanv) }));
  chartSheet.position.set(2.45, -0.89, -1.78); chartSheet.rotation.x = -PI / 2 + 0.16; g.add(chartSheet);
  const cLampShade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.09, 10), brass); cLampShade.position.set(2.82, -0.66, -1.96); cLampShade.rotation.set(0.4, 0, 0.35); g.add(cLampShade);
  dialMesh(g, 0.2, rudTex, 0, 1.25, z0 + 0.08); dialMesh(g, 0.18, spdTex, -0.9, 1.25, z0 + 0.08);
  // overhead clinometer, damage control & battery status plaque, ship's brass bell
  bx(g, 0.42, 0.06, 0.04, dark, 0.9, 1.24, z0 + 0.08);
  const clino = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.12, 0.02), M(0xd64838)); clino.position.set(0.9, 1.18, z0 + 0.11); g.add(clino); bridge.userData.clino = clino;
  {
    const dc = document.createElement("canvas"); dc.width = 256; dc.height = 128;
    const dt = new THREE.CanvasTexture(dc); dt.colorSpace = THREE.SRGBColorSpace;
    bx(g, 0.60, 0.30, 0.024, brass, 1.85, 1.24, z0 + 0.068);
    const dp = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.26), new THREE.MeshBasicMaterial({ map: dt }));
    dp.position.set(1.85, 1.24, z0 + 0.082); g.add(dp);
    bridge.userData.dc = { c: dc, x: dc.getContext("2d"), t: dt };
  }
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.1, 0.14, 14), brassBright); bell.position.set(0.65, 1.46, -1.35); g.add(bell);
  const domeMat = new THREE.MeshBasicMaterial({ color: 0xffe2a0 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), domeMat); lamp.position.set(0, 1.5, -0.6); g.add(lamp);
  const nLight = new THREE.PointLight(0xff3824, 0, 7.5); nLight.position.set(0, 1.38, -0.75); g.add(nLight);
  bridge.userData.domeMat = domeMat; bridge.userData.nLight = nLight;
  for (const x of [-2.6, 2.6]) { const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), brass); pipe.position.set(x, 0.9, z0 + 0.2); g.add(pipe); }
}
let lastB = { tele: -1, hdg: -99, rud: -9, spd: -9, dcT: 0, night: null };
function drawBridgeDc(P) {
  const dc = bridge.userData.dc; if (!dc || !P) return;
  const x = dc.x, hpPct = Math.round(clamp((P.hp ?? 100) / Math.max(1, P.maxHp ?? 100), 0, 1) * 100);
  x.fillStyle = "#111718"; x.fillRect(0, 0, 256, 128);
  x.strokeStyle = "#8a6d38"; x.lineWidth = 3; x.strokeRect(2, 2, 252, 124);
  x.fillStyle = "#e8dfc6"; x.font = "bold 12px monospace"; x.textAlign = "left";
  x.fillText("DAMAGE CONTROL / BATT", 10, 18);
  x.fillStyle = "#9aa7a4"; x.font = "bold 11px monospace"; x.fillText(`HULL ${String(hpPct).padStart(3, " ")}%`, 10, 38);
  x.fillStyle = "#1d2729"; x.fillRect(80, 28, 164, 11);
  x.fillStyle = hpPct > 60 ? "#6eff82" : hpPct > 30 ? "#ffd04d" : "#ff5242";
  x.fillRect(80, 28, Math.round(164 * (hpPct / 100)), 11);
  const dmgLamp = (lx, label, on, col) => {
    x.fillStyle = on ? col : "#20282a"; x.fillRect(lx, 48, 72, 24);
    x.strokeStyle = on ? col : "#3c4b4e"; x.lineWidth = 1.5; x.strokeRect(lx, 48, 72, 24);
    x.fillStyle = on ? "#111" : "#6b787a"; x.font = "bold 12px monospace"; x.textAlign = "center";
    x.fillText(label, lx + 36, 64);
  };
  dmgLamp(10, "FIRE", (P.fires?.length || 0) > 0, "#ff683b");
  dmgLamp(92, "FLOOD", (P.flooding || 0) > 0, "#4db8ff");
  dmgLamp(174, "STEER", (P.rudderJam || 0) > 0, "#ffd04d");
  const turs = P.turrets || [];
  if (turs.length) {
    const bw = Math.min(54, Math.floor(236 / turs.length) - 4), gap = 4, sx = 128 - (turs.length * (bw + gap) - gap) / 2;
    turs.forEach((t, i) => {
      const tx = sx + i * (bw + gap), col = !t.alive ? "#ff4238" : t.reload <= 0 ? "#6eff82" : "#ffd04d";
      x.fillStyle = !t.alive ? "rgba(255,66,56,0.22)" : t.reload <= 0 ? "rgba(110,255,130,0.22)" : "rgba(255,208,77,0.18)";
      x.fillRect(tx, 84, bw, 32); x.strokeStyle = col; x.strokeRect(tx, 84, bw, 32);
      x.fillStyle = col; x.font = "bold 12px monospace"; x.textAlign = "center";
      x.fillText(`T${i + 1}`, tx + bw / 2, 104);
    });
  } else {
    x.fillStyle = "#6eff82"; x.font = "bold 12px monospace"; x.textAlign = "center";
    x.fillText("FLIGHT / VLS OPS NORMAL", 128, 105);
  }
  dc.t.needsUpdate = true;
}
export function updateBridge(P, look, pitch = 0) {
  const { night, storm } = syncOvLight();
  if (bridge.userData.nLight) {
    bridge.userData.nLight.intensity = night ? 1.55 : storm ? 0.5 : 0;
    bridge.userData.nLight.color.setHex(night ? 0xff3824 : 0xffe0a0);
  }
  if (bridge.userData.domeMat) bridge.userData.domeMat.color.setHex(night ? 0xff4228 : 0xffe2a0);
  const spdRatio = Math.min(1.5, Math.abs(P.speed || 0) / (30 * KN));
  const vib = spdRatio > 0.1 ? (Math.random() - 0.5) * 0.0022 * spdRatio : 0;
  bridge.position.set(vib, vib * 0.7, 0);
  bridge.rotation.set(-pitch, look, 0, "XYZ"); bridge.userData.wheel.rotation.z = -P.rudder * 1.8;
  const teleRot = clamp((P.tele ?? 0) * 0.24 - 0.36, -0.9, 1.0);
  if (bridge.userData.teleHandles) for (const h of bridge.userData.teleHandles) h.rotation.x += (teleRot - h.rotation.x) * 0.18;
  if (bridge.userData.wipers) { const spin = performance.now() * (storm ? 0.048 : 0.022); bridge.userData.wipers.forEach((w, i) => { w.rotation.z = spin + i * 1.1; }); }
  if (bridge.userData.clino) bridge.userData.clino.rotation.z = clamp(-(P.rudder || 0) * 0.45, -0.35, 0.35);
  const now = performance.now(); if (now - lastB.dcT >= 250) { lastB.dcT = now; drawBridgeDc(P); }
  const h = Math.round(((P.heading / DEG) % 360 + 360) % 360), r = Math.round(P.rudder * 50) / 50, sp = Math.round((P.speed / KN) * 2) / 2;
  const nightChg = lastB.night !== night;
  if (nightChg) lastB.night = night;
  if (nightChg || lastB.tele !== P.tele) { redraw(telTex, P.tele); lastB.tele = P.tele; }
  if (nightChg || lastB.hdg !== h) { redraw(compTex, h * DEG); lastB.hdg = h; }
  if (nightChg || lastB.rud !== r) { redraw(rudTex, r); lastB.rud = r; }
  if (nightChg || lastB.spd !== sp) { redraw(spdTex, sp); lastB.spd = sp; }
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
  const lamp = (cx, cy, on, col, label) => {
    if (on) { x.fillStyle = col + "44"; x.beginPath(); x.arc(cx, cy, 16, 0, TAU); x.fill(); }
    x.fillStyle = on ? col : "#2a2a2a"; x.beginPath(); x.arc(cx, cy, 10, 0, TAU); x.fill(); x.strokeStyle = "#555"; x.lineWidth = 2; x.stroke(); x.fillStyle = "#cfcabb"; x.font = "bold 11px Arial"; x.textAlign = "center"; x.fillText(label, cx, cy + 23);
  };
  x.fillStyle = "#0b0d0e"; x.fillRect(890, 300, 120, 200);
  x.strokeStyle = "#3c4246"; x.lineWidth = 2; x.strokeRect(890, 300, 120, 200);
  if (pl.hp < 50 && Math.floor(performance.now() * 0.006) % 2 === 0) {
    x.fillStyle = "rgba(255,59,48,0.22)"; x.fillRect(892, 302, 116, 18);
    x.fillStyle = "#ff5b4d"; x.font = "bold 10px monospace"; x.textAlign = "center"; x.fillText("OIL PRESS LOW", 950, 314);
  }
  lamp(925, 340, pl.ammo > 0, "#ffcf5a", "GUNS"); lamp(975, 340, pl.bombs > 0, "#ff8a3d", "BOMBS"); lamp(925, 398, pl.hp < 50, "#ff3b30", "DAMAGE"); lamp(975, 398, pl.flareT > 0, "#ffffff", "FLARE");
  const lowAmmo = pl.ammo > 0 && pl.ammo < 600 && Math.floor(performance.now() * 0.008) % 2 === 0;
  x.fillStyle = pl.ammo <= 0 || lowAmmo ? "#ff5242" : "#e8e4d4"; x.font = "bold 15px monospace"; x.textAlign = "center"; x.fillText(`RDS ${String(pl.ammo).padStart(4, "0")}`, 950, 456);
  const ratio = clamp((pl.ammo || 0) / 3600, 0, 1);
  for (let b = 0; b < 6; b++) {
    x.fillStyle = b / 6 < ratio ? (pl.ammo < 600 ? "#ff6a42" : "#ffcf5a") : "#222629";
    x.fillRect(903 + b * 16, 470, 13, 12);
  }
  panelTex.needsUpdate = true;
}
{
  const g = cockpit, frameM = M(0x56616d, { roughness: 0.5, metalness: 0.4 }), blackM = M(0x15181a), cowlM = M(0x5a6b7d, { roughness: 0.55 }), seat = M(0x2d3134);
  const gunBrass = M(0xc89f4e, { metalness: 0.85, roughness: 0.25 }), exhaustM = M(0x3f3028, { metalness: 0.72, roughness: 0.42 }), oliveM = M(0x4a5543, { roughness: 0.6 });
  // nose / cowling + cooling flaps + 3 stubby exhaust manifold stacks per side + cowl ring lip
  bx(g, 0.8, 0.1, 3.4, cowlM, 0, -0.45, -2.6); bx(g, 0.5, 0.04, 3.2, M(0x4a5866), 0, -0.36, -2.6);
  const cowlLip = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.034, 8, 24, PI), cowlM);
  cowlLip.position.set(0, -0.78, -3.6); cowlLip.rotation.z = 0; g.add(cowlLip);
  cockpit.userData.exFlames = [];
  const exFlameG = new THREE.ConeGeometry(0.016, 0.085, 7);
  const exFlameM = new THREE.MeshBasicMaterial({ color: 0xff9d42, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const s of [-1, 1]) {
    bx(g, 0.04, 0.14, 0.55, M(0x3a434c), s * 0.43, -0.44, -2.15);
    for (let e = 0; e < 3; e++) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.11, 8), exhaustM);
      pipe.rotation.z = s * -0.95; pipe.rotation.x = 0.28; pipe.position.set(s * 0.445, -0.46, -1.78 - e * 0.17); g.add(pipe);
      const ef = new THREE.Mesh(exFlameG, exFlameM.clone());
      ef.rotation.z = s * -1.15; ef.rotation.x = 0.35; ef.position.set(s * 0.47, -0.45, -1.76 - e * 0.17);
      g.add(ef); cockpit.userData.exFlames.push(ef);
    }
  }
  // soft radial bounce glow on top of cowl + instrument panel (no rectangular plane edges)
  const bCan = document.createElement("canvas"); bCan.width = 64; bCan.height = 64;
  {
    const bc = bCan.getContext("2d"), bg = bc.createRadialGradient(32, 32, 2, 32, 32, 31);
    bg.addColorStop(0, "rgba(255,195,105,0.9)"); bg.addColorStop(0.45, "rgba(255,135,55,0.38)"); bg.addColorStop(1, "rgba(255,95,20,0)");
    bc.fillStyle = bg; bc.fillRect(0, 0, 64, 64);
  }
  const bounceTex = new THREE.CanvasTexture(bCan);
  const cowlFlash = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.7), new THREE.MeshBasicMaterial({ map: bounceTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  cowlFlash.position.set(0, -0.32, -1.6); cowlFlash.rotation.x = -1.25; g.add(cowlFlash); cockpit.userData.cowlFlash = cowlFlash;

  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.06, depthWrite: false })); disc.position.set(0, -0.85, -4.5); g.add(disc); cockpit.userData.disc = disc;
  // glare shield + main instrument panel + warm gunfire bounce glow strip
  bx(g, 1.14, 0.035, 0.2, blackM, 0, -0.2, -0.72);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.55), new THREE.MeshBasicMaterial({ map: panelTex })); panel.position.set(0, -0.47, -0.74); panel.rotation.x = -0.1; g.add(panel);
  bx(g, 1.16, 0.6, 0.03, blackM, 0, -0.47, -0.76, -0.1);
  const panelGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.48), new THREE.MeshBasicMaterial({ map: bounceTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  panelGlow.position.set(0, -0.46, -0.732); panelGlow.rotation.x = -0.1; g.add(panelGlow); cockpit.userData.panelGlow = panelGlow;
  // Mk 8 optical reflector gunsight: cylindrical projector barrel, micrometer knob, sun-filter bracket & collimated reticle
  bx(g, 0.06, 0.045, 0.13, blackM, 0, -0.17, -0.66);
  const sightTube = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.12, 14), blackM); sightTube.rotation.x = PI / 2; sightTube.position.set(0, -0.13, -0.65); g.add(sightTube);
  const sightLens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 14), new THREE.MeshBasicMaterial({ color: 0x70c8e8, transparent: true, opacity: 0.35 })); sightLens.rotation.x = -PI / 2 + 0.35; sightLens.position.set(0, -0.11, -0.61); g.add(sightLens);
  const sightKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 10), gunBrass); sightKnob.rotation.z = PI / 2; sightKnob.position.set(0.038, -0.13, -0.65); g.add(sightKnob);
  for (const s of [-1, 1]) bx(g, 0.0045, 0.065, 0.008, frameM, s * 0.056, -0.095, -0.635, -0.35);
  const refl = new THREE.Mesh(new THREE.PlaneGeometry(0.105, 0.105), new THREE.MeshBasicMaterial({ map: sightTex, transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending, depthWrite: false })); refl.position.set(0, 0, -0.62); g.add(refl); cockpit.userData.refl = refl;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.125), new THREE.MeshBasicMaterial({ color: 0xa8c8d8, transparent: true, opacity: 0.1, depthWrite: false })); plate.position.set(0, -0.055, -0.63); plate.rotation.x = -0.35; g.add(plate);
  // windscreen: flat armoured centre pane + side panes, riveted internal frame brackets, mirror & standby compass
  const glassM = new THREE.MeshBasicMaterial({ map: glassTex, transparent: true, opacity: 1, depthWrite: false, color: 0xdfeef2 });
  const pane = (w, h, x, y, z, ry, rx) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassM); m.position.set(x, y, z); m.rotation.set(rx, ry, 0, "YXZ"); g.add(m); };
  pane(0.36, 0.42, 0, 0.05, -0.56, 0, -0.32); for (const s of [1, -1]) pane(0.3, 0.42, s * 0.31, 0.05, -0.44, -s * 0.85, -0.25);
  const dmgC = document.createElement("canvas"); dmgC.width = 256; dmgC.height = 256;
  {
    const dc = dmgC.getContext("2d");
    const og = dc.createRadialGradient(128, 128, 86, 128, 128, 152);
    og.addColorStop(0, "rgba(18,14,10,0)"); og.addColorStop(0.55, "rgba(22,16,10,0.48)"); og.addColorStop(1, "rgba(10,8,6,0.9)");
    dc.fillStyle = og; dc.fillRect(0, 0, 256, 256);
    dc.fillStyle = "rgba(14,11,8,0.78)";
    for (let i = 0; i < 24; i++) {
      const a = (i * 2.39996) % TAU, r = 92 + (i * 7) % 44;
      dc.beginPath(); dc.ellipse(128 + Math.cos(a) * r, 128 + Math.sin(a) * r * 0.72, 2 + (i % 4), 5 + (i % 7), a, 0, TAU); dc.fill();
    }
    dc.strokeStyle = "rgba(230,242,248,0.55)"; dc.lineWidth = 1.1;
    const cx = 196, cy = 54;
    for (let k = 0; k < 8; k++) { const a = k * 0.78 + 0.2; dc.beginPath(); dc.moveTo(cx, cy); dc.lineTo(cx + Math.cos(a) * 38, cy + Math.sin(a) * 28); dc.stroke(); }
  }
  const dmgTex = new THREE.CanvasTexture(dmgC);
  const dmgGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.36), new THREE.MeshBasicMaterial({ map: dmgTex, transparent: true, opacity: 0, depthWrite: false }));
  dmgGlass.position.set(0, 0.05, -0.53); dmgGlass.rotation.x = -0.32; g.add(dmgGlass); cockpit.userData.dmgGlass = dmgGlass;
  const bar = (len, x, y, z, rx, rz, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.012, len, 0.012), frameM); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); };
  for (const s of [1, -1]) {
    bar(0.46, s * 0.18, 0.05, -0.56, -0.32, 0); bar(0.46, s * 0.43, 0.05, -0.33, -0.25, s * 0.12);
    for (const by of [-0.08, 0.06, 0.20]) {
      const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 6, 5), frameM); bolt.position.set(s * 0.18, by, -0.55 - (by - 0.05) * 0.32); g.add(bolt);
    }
  }
  bx(g, 0.38, 0.012, 0.012, frameM, 0, 0.26, -0.49); bx(g, 0.4, 0.015, 0.015, frameM, 0, -0.16, -0.63);
  bx(g, 0.12, 0.045, 0.025, blackM, 0, 0.285, -0.47, 0.18);
  const cmir = new THREE.Mesh(new THREE.PlaneGeometry(0.105, 0.036), M(0x6e8598, { metalness: 0.9, roughness: 0.08 })); cmir.position.set(0, 0.285, -0.456); cmir.rotation.x = 0.18; g.add(cmir);
  // slim standby magnetic whiskey compass tucked neatly at upper-right corner
  const cmpPod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.015, 0.028, 10), blackM); cmpPod.position.set(0.145, 0.244, -0.49); g.add(cmpPod);
  const cmpWin = new THREE.Mesh(new THREE.PlaneGeometry(0.015, 0.008), new THREE.MeshBasicMaterial({ color: 0xe6e0c8 })); cmpWin.position.set(0.145, 0.244, -0.474); g.add(cmpWin);
  // canopy rails, sliding hood bows, emergency canopy release handle, throttle quadrant, gun chargers & stick
  for (const s of [1, -1]) { bx(g, 0.02, 0.02, 1.2, frameM, s * 0.49, -0.2, 0.1); const bow = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.008, 6, 24, PI), frameM); bow.position.set(0, -0.12, s > 0 ? -0.18 : 0.32); g.add(bow); }
  bx(g, 0.012, 0.012, 0.5, frameM, 0, 0.36, 0.07);
  for (const s of [1, -1]) bx(g, 0.14, 0.12, 0.7, seat, s * 0.4, -0.62, -0.2);
  bx(g, 0.06, 0.02, 0.02, M(0xb82c2c), 0.46, -0.18, -0.22); // emergency canopy release handle
  // notched left throttle quadrant + throttle/mixture/prop levers
  bx(g, 0.08, 0.06, 0.22, oliveM, -0.41, -0.57, -0.32);
  const thr = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.036, 10), blackM); thr.rotation.z = PI / 2; thr.position.set(-0.40, -0.49, -0.30); g.add(thr); cockpit.userData.thr = thr;
  const mix = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), M(0xb02a2a)); mix.position.set(-0.37, -0.50, -0.28); g.add(mix);
  const prp = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), M(0x3a6fa8)); prp.position.set(-0.43, -0.50, -0.29); g.add(prp);
  // twin steel .50-cal gun charger T-handles beneath instrument panel
  cockpit.userData.chargers = [];
  for (const cx of [-0.19, 0.19]) {
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.016, 0.018), frameM); ch.position.set(cx, -0.68, -0.67); g.add(ch);
    cockpit.userData.chargers.push(ch);
  }
  // pleated stick dust boot & contoured flight stick with brass/red trigger button
  const boot = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.11, 10), blackM); boot.position.set(0, -0.82, -0.40); g.add(boot);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.022, 0.42, 8), blackM); stick.position.set(0, -0.68, -0.36); stick.rotation.x = 0.3; g.add(stick); cockpit.userData.stick = stick;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.024, 0.105, 8), M(0x3a2a1e)); grip.position.set(0, 0.24, 0); stick.add(grip);
  const trig = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M(0xc83a2e)); trig.position.set(0, 0.285, -0.022); stick.add(trig); cockpit.userData.trig = trig;
  const nLight = new THREE.PointLight(0xff4228, 0, 1.9); nLight.position.set(0, -0.36, -0.46); g.add(nLight); cockpit.userData.nLight = nLight;
}
let panelT = 0, cHeadX = 0, cHeadY = 0, cRoll = 0;
export function updateCockpit(pl, dt) {
  const { night, storm } = syncOvLight();
  if (cockpit.userData.nLight) {
    cockpit.userData.nLight.intensity = night ? 0.85 : storm ? 0.35 : 0;
    cockpit.userData.nLight.color.setHex(night ? 0xff4228 : 0xffcc88);
  }
  panelT -= dt; if (panelT <= 0) { panelT = 0.066; drawPanel(pl, 0.066); }
  const fire = !!(pl.firing && pl.ammo > 0);
  const st = cockpit.userData.stick;
  st.rotation.x = 0.3 - (pl.pitchCmd || 0) * 0.25;
  st.rotation.z = clamp(-(pl.turnRate || 0) * 0.22, -0.26, 0.26);
  if (cockpit.userData.trig) cockpit.userData.trig.position.z = fire ? -0.012 : -0.022;
  cockpit.userData.thr.position.z = -0.24 - (pl.throttle || 0) * 0.13;
  cockpit.userData.disc.rotation.z += dt * (28 + 18 * (pl.throttle || 0));
  cHeadX += (clamp(-(pl.turnRate || 0) * 0.0045, -0.02, 0.02) - cHeadX) * Math.min(1, dt * 6);
  cHeadY += (clamp(-(pl.pitchCmd || 0) * 0.013, -0.018, 0.018) - cHeadY) * Math.min(1, dt * 6);
  cRoll += (clamp(-(pl.turnRate || 0) * 0.028, -0.04, 0.04) - cRoll) * Math.min(1, dt * 5);
  const vib = (fire ? 0.0048 : 0.00085) * (0.4 + (pl.throttle || 0));
  cockpit.position.set(cHeadX + (Math.random() - 0.5) * vib, cHeadY + (Math.random() - 0.5) * vib, fire ? (Math.random() - 0.5) * 0.0045 : 0);
  cockpit.rotation.z = cRoll;
  if (cockpit.userData.cowlFlash) cockpit.userData.cowlFlash.material.opacity = fire ? 0.18 + Math.random() * 0.26 : 0;
  if (cockpit.userData.panelGlow) cockpit.userData.panelGlow.material.opacity = fire ? 0.05 + Math.random() * 0.08 : 0;
  if (cockpit.userData.chargers) for (const ch of cockpit.userData.chargers) ch.position.z = fire ? -0.668 + (Math.random() - 0.5) * 0.016 : -0.67;
  if (cockpit.userData.exFlames) {
    const thr = pl.throttle || 0;
    for (let i = 0; i < cockpit.userData.exFlames.length; i++) {
      const ef = cockpit.userData.exFlames[i], on = thr > 0.55 && pl.alive;
      ef.material.opacity = on ? clamp((thr - 0.5) * 0.85, 0, 0.55) * (0.6 + Math.random() * 0.7) : 0;
      ef.material.color.setHex(thr > 0.85 && Math.random() < 0.45 ? 0x88c8ff : 0xff9a3c);
      const sc = 0.75 + Math.random() * 0.55; ef.scale.set(sc, 0.8 + thr * 0.6, sc);
    }
  }
  if (cockpit.userData.refl) {
    cockpit.userData.refl.position.x = clamp(-(pl.turnRate || 0) * 0.0022, -0.022, 0.022);
    cockpit.userData.refl.position.y = clamp(-(pl.pitchCmd || 0) * 0.0028, -0.022, 0.022);
  }
  if (cockpit.userData.dmgGlass) cockpit.userData.dmgGlass.material.opacity = pl.hp < 65 ? clamp((65 - pl.hp) / 65, 0, 0.78) : 0;
}

// ── twin 40 mm Bofors mount, gunner's view (camera space) ──────────────────
export const aaGun = new THREE.Group(); aaGun.visible = false; ovScene.add(aaGun);
{
  const g = aaGun, gun = M(0x5a656e, { metalness: 0.65, roughness: 0.36 }), blk = M(0x16191b, { metalness: 0.4, roughness: 0.55 });
  const olive = M(0x636d5b, { metalness: 0.28, roughness: 0.65 }), brassS = M(0xc79e49, { metalness: 0.85, roughness: 0.25 });
  const copper = M(0xb86d3b, { metalness: 0.75, roughness: 0.3 }), steelBr = M(0x88949e, { metalness: 0.8, roughness: 0.28 });
  // soft radial feathered muzzle flash texture (no sharp quad edges)
  const fCan = document.createElement("canvas"); fCan.width = 128; fCan.height = 128;
  {
    const fc = fCan.getContext("2d"), rg = fc.createRadialGradient(64, 64, 2, 64, 64, 62);
    rg.addColorStop(0, "rgba(255,252,225,1)"); rg.addColorStop(0.22, "rgba(255,205,105,0.88)");
    rg.addColorStop(0.55, "rgba(255,115,35,0.32)"); rg.addColorStop(1, "rgba(255,60,10,0)");
    fc.fillStyle = rg; fc.fillRect(0, 0, 128, 128);
    for (let k = 0; k < 6; k++) {
      fc.save(); fc.translate(64, 64); fc.rotate((k / 6) * PI);
      const lg = fc.createRadialGradient(0, 0, 2, 0, 0, 58);
      lg.addColorStop(0, "rgba(255,240,180,0.65)"); lg.addColorStop(1, "rgba(255,120,30,0)");
      fc.fillStyle = lg; fc.scale(1, 0.14); fc.beginPath(); fc.arc(0, 0, 58, 0, PI * 2); fc.fill();
      fc.restore();
    }
  }
  const flashTex = new THREE.CanvasTexture(fCan);
  const barrels = new THREE.Group(); g.add(barrels);
  aaGun.userData.barrels = []; aaGun.userData.muzzles = []; aaGun.userData.clips = []; aaGun.userData.casings = [];
  for (const s of [1, -1]) {
    // stationary twin recoil cradle & hydraulic recuperator cylinder under each barrel
    const cradle = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.088, 0.72, 12), olive);
    cradle.rotation.x = PI / 2; cradle.position.set(s * 0.36, -0.60, -1.06); g.add(cradle);
    const recup = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.036, 0.62, 10), steelBr);
    recup.rotation.x = PI / 2; recup.position.set(s * 0.36, -0.715, -1.02); g.add(recup);
    bx(g, 0.14, 0.04, 0.18, olive, s * 0.36, -0.76, -0.82);
    // recoiling barrel & breech assembly
    const b = new THREE.Group(); b.position.set(s * 0.36, -0.6, -0.75); barrels.add(b); aaGun.userData.barrels.push(b);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.046, 2.25, 12), gun); tube.rotation.x = PI / 2; tube.position.z = -1.12; b.add(tube);
    // stepped Bofors conical flash hider + dark bore aperture
    const hider = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.044, 0.28, 12), blk); hider.rotation.x = PI / 2; hider.position.z = -2.32; b.add(hider);
    const hiderLip = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.008, 6, 16), blk); hiderLip.position.z = -2.45; b.add(hiderLip);
    // cooling sleeve + machined spring/cooling ribs along barrel base
    const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.075, 0.68, 12), olive); jacket.rotation.x = PI / 2; jacket.position.z = -0.22; b.add(jacket);
    for (let f = 0; f < 5; f++) {
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.022, 12), blk);
      fin.rotation.x = PI / 2; fin.position.z = -0.62 - f * 0.11; b.add(fin);
    }
    // slim breech casing & top feed chute with visible 4-round 40mm brass clip near peripheral view
    bx(b, 0.13, 0.1, 0.32, olive, 0, -0.09, -0.02);
    const hopper = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.046, 0.16), blk); hopper.position.set(0, 0.045, -0.28); b.add(hopper);
    const clipG = new THREE.Group(); b.add(clipG); aaGun.userData.clips.push(clipG);
    for (let r = 0; r < 4; r++) {
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.068, 8), brassS);
      sh.rotation.z = PI / 2; sh.position.set(-s * (0.012 + r * 0.014), 0.078 + r * 0.01, -0.26); clipG.add(sh);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.010, 0.030, 8), copper);
      tip.rotation.x = -PI / 2; tip.position.set(-s * (0.012 + r * 0.014), 0.078 + r * 0.01, -0.30); clipG.add(tip);
    }
    const cas = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.013, 0.075, 8), brassS); cas.visible = false; g.add(cas); aaGun.userData.casings.push({ m: cas, s });
    // soft feathered additive muzzle flash sprite + forward gas jet cone
    const mf = new THREE.Group(); mf.position.set(0, 0, -2.50); mf.visible = false; b.add(mf);
    const mfMat = new THREE.MeshBasicMaterial({ map: flashTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), mfMat); disc.position.z = -0.04; mf.add(disc);
    const mfCore = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.34, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd278, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    mfCore.rotation.x = -PI / 2; mfCore.position.z = -0.17; mf.add(mfCore);
    aaGun.userData.muzzles.push({ g: mf, m: mfMat, cm: mfCore.material });
    // dual gunner handwheels, shoulder rests & subtle outer tub wing shield gussets
    const hw = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 6, 18), brassS);
    hw.position.set(s * 0.56, -0.78, -0.56); hw.rotation.y = s * PI / 2; g.add(hw);
    bx(g, 0.045, 0.08, 0.24, blk, s * 0.24, -0.78, -0.34);
    bx(g, 0.025, 0.36, 0.42, olive, s * 0.56, -0.68, -0.96, -0.12);
    bx(g, 0.032, 0.026, 0.44, gun, s * 0.56, -0.50, -0.96, -0.12);
  }
  // traverse tray & lower armored gunner apron shield (leaves sky & horizon wide open)
  bx(g, 0.74, 0.08, 0.38, olive, 0, -0.79, -0.46);
  bx(g, 1.08, 0.34, 0.032, olive, 0, -1.04, -0.94, -0.22);
  bx(g, 1.1, 0.028, 0.042, gun, 0, -0.87, -0.98, -0.22);
  // centered spider-web AA ring sight on slim vertical cradle post below outer ring
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.44, 8), blk);
  stalk.position.set(0, -0.395, -1.1); g.add(stalk);
  const ringM = new THREE.MeshBasicMaterial({ color: 0x15181a, transparent: true, opacity: 0.38 });
  const innerM = new THREE.MeshBasicMaterial({ color: 0x15181a, transparent: true, opacity: 0.24 });
  aaGun.userData.ringM = ringM; aaGun.userData.innerM = innerM;
  const aaLight = new THREE.PointLight(0xff4228, 0, 3.2); aaLight.position.set(0, -0.15, -0.4); g.add(aaLight); aaGun.userData.nLight = aaLight;
  {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.0012, 6, 64), ringM); t.position.set(0, 0, -1.1); g.add(t);
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.0009, 6, 48), innerM); t2.position.set(0, 0, -1.1); g.add(t2);
    for (let k = 0; k < 4; k++) {
      const a = k * PI / 2, strut = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.0012, 0.0012), innerM);
      strut.position.set(Math.cos(a) * 0.132, Math.sin(a) * 0.132, -1.1); strut.rotation.z = a; g.add(strut);
    }
  }
}
export function updateAAGun(recoil) {
  const { night, storm } = syncOvLight();
  if (aaGun.userData.ringM) {
    aaGun.userData.ringM.color.setHex(night ? 0xffa83c : 0x15181a);
    aaGun.userData.ringM.opacity = night ? 0.65 : storm ? 0.48 : 0.38;
    aaGun.userData.innerM.color.setHex(night ? 0xffa83c : 0x15181a);
    aaGun.userData.innerM.opacity = night ? 0.42 : storm ? 0.3 : 0.24;
  }
  if (aaGun.userData.nLight) aaGun.userData.nLight.intensity = night ? 0.95 : storm ? 0.35 : 0;
  let active = 0;
  aaGun.userData.barrels.forEach((b, i) => {
    const r = recoil[i] || 0;
    b.position.z = -0.75 + r * 0.14;
    b.position.y = -0.60 - r * 0.006;
    if (aaGun.userData.clips?.[i]) aaGun.userData.clips[i].position.y = -r * 0.018;
    const cs = aaGun.userData.casings?.[i];
    if (cs) {
      cs.m.visible = r > 0.12;
      if (cs.m.visible) {
        const t = 1 - r;
        cs.m.position.set(cs.s * (0.36 + t * 0.08), -0.58 - t * t * 0.42, -0.88 - t * 0.45);
        cs.m.rotation.set(t * 11, t * 5, cs.s * 0.8);
      }
    }
    if (r > 0.5) active += r;
    const mz = aaGun.userData.muzzles?.[i];
    if (mz) {
      const flash = r > 0.58;
      mz.g.visible = flash;
      if (flash) {
        const k = (r - 0.58) / 0.42;
        mz.m.opacity = 0.45 + k * 0.45;
        mz.cm.opacity = 0.55 + k * 0.4;
        mz.g.rotation.z = Math.random() * PI;
        const sc = 0.8 + Math.random() * 0.45;
        mz.g.scale.set(sc, sc, 0.9 + k * 0.5);
      }
    }
  });
  aaGun.position.set(active ? (Math.random() - 0.5) * 0.004 : 0, active ? (Math.random() - 0.5) * 0.003 : 0, 0);
}

// ── modern jet cockpit (F/A-18E / F-35 style): nose/LERX exterior cues, mirrors, live HUD combiner, UFC, 3 MFDs, HOTAS ──
export const jetPit = new THREE.Group(); jetPit.visible = false; ovScene.add(jetPit);
const jmfd = [];
let jhud = null;
const JV_F = new THREE.Vector3(), JV_U = new THREE.Vector3(), JV_R = new THREE.Vector3();
{
  const g = jetPit, body = M(0x161a1e, { roughness: 0.85 }), trim = M(0x282f36, { roughness: 0.55 }), pad = M(0x101316, { roughness: 0.92 });
  const skin = M(0x525c65, { roughness: 0.52, metalness: 0.3 }), skinDark = M(0x363d44, { roughness: 0.55, metalness: 0.35 }), pitotM = M(0x202428, { metalness: 0.8, roughness: 0.35 });
  const glassM = new THREE.MeshBasicMaterial({ color: 0x051d0e, transparent: true, opacity: 0.28, depthWrite: false });
  // visible exterior fighter nose cone, radome tip, Vulcan gun slot, and LERX / swept wing roots over the sill
  const radome = new THREE.Mesh(new THREE.ConeGeometry(0.46, 3.8, 16), skin); radome.rotation.x = -PI / 2; radome.scale.set(1.18, 1, 0.72); radome.position.set(0, -0.45, -3.15); g.add(radome);
  const noseTip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.35, 14), skinDark); noseTip.rotation.x = -PI / 2; noseTip.scale.set(1.1, 1, 0.75); noseTip.position.set(0, -0.52, -4.95); g.add(noseTip);
  bx(g, 0.14, 0.04, 0.42, pad, 0.14, -0.345, -1.65, 0.08);
  for (const s of [-1, 1]) {
    const lerx = bx(g, 0.46, 0.055, 1.8, skinDark, s * 0.74, -0.42, -1.85, 0.06); lerx.rotation.y = -s * 0.24; lerx.rotation.z = -s * 0.08;
    const wroot = bx(g, 1.65, 0.06, 1.25, skin, s * 1.95, -0.48, -2.35, 0.03); wroot.rotation.y = -s * 0.48;
  }
  // instrument panel + sculpted matte anti-glare shroud + brow lip
  bx(g, 1.54, 0.3, 0.04, body, 0, -0.45, -0.74, -0.35);
  bx(g, 1.24, 0.036, 0.24, pad, 0, -0.29, -0.87, -0.08);
  bx(g, 0.32, 0.055, 0.18, trim, 0, -0.26, -0.86, -0.06); // HUD collimator lens bezel
  // collimated green HUD combiner + live holographic canvas (512x512)
  const hc = document.createElement("canvas"); hc.width = 512; hc.height = 512;
  const ht = new THREE.CanvasTexture(hc); ht.colorSpace = THREE.SRGBColorSpace;
  jhud = { c: hc, x: hc.getContext("2d"), t: ht };
  const hudGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.22), glassM); hudGlass.position.set(0, -0.095, -0.88); hudGlass.rotation.x = -0.22; g.add(hudGlass);
  const hudSymMat = new THREE.MeshBasicMaterial({ map: ht, transparent: true, depthWrite: false });
  const hudSym = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.22), hudSymMat);
  hudSym.position.set(0, -0.095, -0.878); hudSym.rotation.x = -0.22; g.add(hudSym);
  jetPit.userData.hudSymMat = hudSymMat; jetPit.userData.hudGlassM = glassM;
  for (const s of [-1, 1]) {
    bx(g, 0.011, 0.21, 0.014, trim, s * 0.122, -0.105, -0.88, -0.22);
    bx(g, 0.014, 0.03, 0.045, M(0x3a434c, { metalness: 0.4 }), s * 0.122, -0.205, -0.86);
  }
  // Up-Front Controller (UFC) keypad & backlit amber/red Master Caution / RWR annunciators
  const uc = document.createElement("canvas"); uc.width = 256; uc.height = 128;
  const ut = new THREE.CanvasTexture(uc); ut.colorSpace = THREE.SRGBColorSpace;
  const ufcM = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshBasicMaterial({ map: ut }));
  ufcM.position.set(0, -0.295, -0.735); ufcM.rotation.x = -0.28; g.add(ufcM);
  bx(g, 0.175, 0.095, 0.025, body, 0, -0.295, -0.75, -0.28);
  const lampM = (col) => new THREE.MeshBasicMaterial({ color: col });
  const mcLamp = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 0.018), lampM(0x2a1408)); mcLamp.position.set(-0.22, -0.285, -0.755); mcLamp.rotation.x = -0.22; g.add(mcLamp);
  const rwrLamp = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 0.018), lampM(0x2a0808)); rwrLamp.position.set(0.22, -0.285, -0.755); rwrLamp.rotation.x = -0.22; g.add(rwrLamp);
  // Vulcan muzzle glare across lower windscreen & canopy rails (feathered radial gradient)
  const jgCan = document.createElement("canvas"); jgCan.width = 64; jgCan.height = 64;
  {
    const jc = jgCan.getContext("2d"), jg = jc.createRadialGradient(32, 32, 2, 32, 32, 31);
    jg.addColorStop(0, "rgba(255,200,110,0.92)"); jg.addColorStop(0.5, "rgba(255,145,55,0.38)"); jg.addColorStop(1, "rgba(255,110,30,0)");
    jc.fillStyle = jg; jc.fillRect(0, 0, 64, 64);
  }
  const gunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.42), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(jgCan), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  gunGlow.position.set(0, -0.24, -1.06); gunGlow.rotation.x = -1.1; g.add(gunGlow);
  jetPit.userData.ufc = { c: uc, x: uc.getContext("2d"), t: ut };
  jetPit.userData.mcLamp = mcLamp; jetPit.userData.rwrLamp = rwrLamp; jetPit.userData.gunGlow = gunGlow;
  // three glass MFDs (ENG/FCS left, HSD radar center, SMS+RWR right)
  const mk = (x, y, w, h, rx) => {
    const c = document.createElement("canvas"); c.width = 256; c.height = Math.round(256 * h / w);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
    m.position.set(x, y, -0.715); m.rotation.x = rx; g.add(m);
    bx(g, w + 0.028, h + 0.028, 0.01, trim, x, y - 0.004, -0.722, rx);
    jmfd.push({ c, x: c.getContext("2d"), t });
  };
  mk(-0.33, -0.41, 0.21, 0.17, -0.35); mk(0, -0.435, 0.23, 0.175, -0.35); mk(0.33, -0.41, 0.21, 0.17, -0.35);
  // stealth canopy glass reflection, arch frame, grab rails & triple rear-view mirrors
  const frame = M(0x13171a, { roughness: 0.7 });
  const canopyGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.72), new THREE.MeshBasicMaterial({ map: glassTex, transparent: true, opacity: 0.55, depthWrite: false, color: 0xd6e8cc }));
  canopyGlass.position.set(0, 0.06, -0.98); canopyGlass.rotation.x = -0.45; g.add(canopyGlass);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.015, 8, 48, PI), frame); bow.position.set(0, -0.62, -1.08); bow.rotation.x = 0.12; g.add(bow);
  const rearBow = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.016, 8, 48, PI), frame); rearBow.position.set(0, -0.5, 0.18); g.add(rearBow);
  bx(g, 0.024, 0.024, 1.32, frame, 0, 0.54, -0.44);
  for (const [mx, my, ry] of [[-0.22, 0.42, 0.28], [0, 0.48, 0], [0.22, 0.42, -0.28]]) {
    const mh = bx(g, 0.11, 0.042, 0.022, body, mx, my, -0.72, 0.22); mh.rotation.y = ry;
    const mg = new THREE.Mesh(new THREE.PlaneGeometry(0.095, 0.032), M(0x7c93a6, { metalness: 0.92, roughness: 0.06 })); mg.position.set(0, 0, 0.012); mh.add(mg);
  }
  bx(g, 0.028, 0.028, 1.5, frame, -0.96, -0.32, -0.4); bx(g, 0.028, 0.028, 1.5, frame, 0.96, -0.32, -0.4);
  // HOTAS stick, throttle levers with AB detent, side consoles, ejection seat handle
  const stick = new THREE.Group(); stick.position.set(0.28, -0.62, -0.48); g.add(stick); bx(stick, 0.035, 0.18, 0.035, trim, 0, 0.09, 0); bx(stick, 0.052, 0.085, 0.065, body, 0, 0.2, 0); bx(stick, 0.026, 0.02, 0.03, pitotM, 0, 0.25, -0.01); g.userData.stick = stick;
  const thr = new THREE.Group(); thr.position.set(-0.42, -0.58, -0.48); g.add(thr); bx(thr, 0.075, 0.068, 0.095, body, 0, 0.05, 0); bx(thr, 0.02, 0.018, 0.04, M(0xb82820), 0.028, 0.09, -0.01); g.userData.thr = thr;
  bx(g, 0.22, 0.03, 0.56, trim, -0.54, -0.6, -0.45); bx(g, 0.22, 0.03, 0.56, trim, 0.54, -0.6, -0.45);
  const ejectLoop = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 16), M(0xe6b822)); ejectLoop.position.set(0, -0.66, -0.54); ejectLoop.rotation.x = 0.7; g.add(ejectLoop);
  // Peripheral G-LOC dark vignette (center 100% clear) + high-AoA / transonic LERX condensation ribbons
  const gvCan = document.createElement("canvas"); gvCan.width = 128; gvCan.height = 128;
  {
    const gc = gvCan.getContext("2d"), gg = gc.createRadialGradient(64, 64, 34, 64, 64, 66);
    gg.addColorStop(0, "rgba(0,0,0,0)"); gg.addColorStop(0.65, "rgba(0,0,0,0.35)"); gg.addColorStop(1, "rgba(0,0,0,0.95)");
    gc.fillStyle = gg; gc.fillRect(0, 0, 128, 128);
  }
  const gVig = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gvCan), transparent: true, opacity: 0, depthWrite: false }));
  gVig.position.set(0, 0, -0.45); g.add(gVig); jetPit.userData.gVig = gVig;
  const vCan = document.createElement("canvas"); vCan.width = 64; vCan.height = 128;
  {
    const vc = vCan.getContext("2d"), vg = vc.createRadialGradient(32, 64, 3, 32, 64, 32);
    vg.addColorStop(0, "rgba(235,245,255,0.75)"); vg.addColorStop(1, "rgba(235,245,255,0)");
    vc.fillStyle = vg; vc.save(); vc.scale(0.55, 1.8); vc.beginPath(); vc.arc(58, 36, 30, 0, PI * 2); vc.fill(); vc.restore();
  }
  const vMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(vCan), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  jetPit.userData.wingVapor = [];
  for (const s of [-1, 1]) {
    const vp = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 1.65), vMat);
    vp.position.set(s * 0.88, -0.35, -2.05); vp.rotation.set(-PI / 2 + 0.08, 0, -s * 0.22);
    g.add(vp); jetPit.userData.wingVapor.push(vp);
  }
  // Peripheral Prandtl-Glauert transonic condensation collar over the wing shoulders (boresight clear)
  const mcCan = document.createElement("canvas"); mcCan.width = 128; mcCan.height = 64;
  {
    const mc = mcCan.getContext("2d"), mg = mc.createLinearGradient(0, 0, 0, 64);
    mg.addColorStop(0, "rgba(235,244,252,0)"); mg.addColorStop(0.35, "rgba(238,246,255,0.68)");
    mg.addColorStop(0.65, "rgba(235,245,255,0.42)"); mg.addColorStop(1, "rgba(235,244,252,0)");
    mc.fillStyle = mg; mc.fillRect(0, 0, 128, 64);
  }
  const machMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(mcCan), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const machCone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.75, 1.1, 24, 1, true), machMat);
  machCone.rotation.x = PI / 2; machCone.position.set(0, -0.44, -2.55); g.add(machCone); jetPit.userData.machCone = machCone;
  const nvLight = new THREE.PointLight(0x4dff88, 0, 2.2); nvLight.position.set(0, -0.1, -0.58); g.add(nvLight); jetPit.userData.nvLight = nvLight;
}
let jpT = 0, jhT = 0, jHeadX = 0, jHeadY = 0, jHeadZ = 0;
function drawJetHud(j, info, spdKmh, altM, thrPct, roll, pitch, hdg, gLoad, aoaDeg, abK) {
  if (!jhud) return;
  const { c, x, t } = jhud, W = c.width, H = c.height, cx = W / 2, cy = H / 2;
  x.clearRect(0, 0, W, H);
  const green = "#6eff82", amber = "#ffd04d", red = "#ff5a48", abOn = abK > 0.35 || thrPct >= 88;
  x.strokeStyle = green; x.fillStyle = green; x.lineWidth = 2; x.lineCap = "round";
  x.shadowColor = "rgba(0, 22, 8, 0.92)"; x.shadowBlur = 4;
  // Rotating artificial horizon & pitch ladder (-30..+30 deg) using true fighter attitude
  x.save(); x.beginPath(); x.rect(92, 56, W - 184, H - 134); x.clip();
  x.translate(cx, cy + pitch * 260); x.rotate(-roll);
  x.font = "bold 14px monospace"; x.textAlign = "right";
  for (let deg = -30; deg <= 30; deg += 10) {
    const py = -deg * 5.2;
    if (deg === 0) {
      x.lineWidth = 2.4;
      x.beginPath(); x.moveTo(-140, py); x.lineTo(-26, py); x.moveTo(26, py); x.lineTo(140, py); x.stroke();
    } else {
      x.lineWidth = 1.8;
      if (deg < 0) x.setLineDash([6, 4]);
      const tick = deg > 0 ? 10 : -10;
      x.beginPath();
      x.moveTo(-88, py + tick); x.lineTo(-88, py); x.lineTo(-30, py);
      x.moveTo(30, py); x.lineTo(88, py); x.lineTo(88, py + tick);
      x.stroke();
      x.setLineDash([]);
      x.fillText(String(Math.abs(deg)), -94, py + 4);
    }
  }
  x.restore();
  // Fixed bore-sight & Flight Path Vector (velocity vector)
  x.strokeStyle = green; x.lineWidth = 2.2;
  x.beginPath(); x.moveTo(cx - 16, cy); x.lineTo(cx - 6, cy); x.lineTo(cx, cy + 7); x.lineTo(cx + 6, cy); x.lineTo(cx + 16, cy); x.stroke();
  const fpvY = clamp(cy - (j.vel.y / Math.max(40, j.vel.length())) * 170 + pitch * 110, 74, H - 96);
  x.beginPath(); x.arc(cx, fpvY, 10, 0, TAU);
  x.moveTo(cx - 22, fpvY); x.lineTo(cx - 10, fpvY); x.moveTo(cx + 10, fpvY); x.lineTo(cx + 22, fpvY);
  x.moveTo(cx, fpvY - 10); x.lineTo(cx, fpvY - 19); x.stroke();
  // Bottom bank scale arc (-45..+45 deg)
  const br = 128, by = cy + 68;
  x.strokeStyle = green; x.lineWidth = 1.6; x.beginPath(); x.arc(cx, by, br, PI * 0.25, PI * 0.75); x.stroke();
  for (const aDeg of [-45, -30, -15, 0, 15, 30, 45]) {
    const a = PI * 0.5 + aDeg * DEG;
    x.beginPath(); x.moveTo(cx + Math.cos(a) * br, by + Math.sin(a) * br); x.lineTo(cx + Math.cos(a) * (br + (aDeg % 30 === 0 ? 9 : 5)), by + Math.sin(a) * (br + (aDeg % 30 === 0 ? 9 : 5))); x.stroke();
  }
  const ba = PI * 0.5 + clamp(roll, -45 * DEG, 45 * DEG);
  x.fillStyle = amber; x.beginPath();
  x.moveTo(cx + Math.cos(ba) * (br - 2), by + Math.sin(ba) * (br - 2));
  x.lineTo(cx + Math.cos(ba - 0.04) * (br - 11), by + Math.sin(ba - 0.04) * (br - 11));
  x.lineTo(cx + Math.cos(ba + 0.04) * (br - 11), by + Math.sin(ba + 0.04) * (br - 11)); x.closePath(); x.fill();
  // Left airspeed box + G-load + AOA + Mach + AB Gate
  const mach = j.vel.length() / 340;
  x.fillStyle = gLoad >= 7.2 ? red : gLoad >= 4.8 ? amber : green; x.font = "bold 14px monospace"; x.textAlign = "right";
  x.fillText(`${gLoad.toFixed(1)}G${gLoad >= 7.0 ? " !" : ""}`, 82, cy - 46);
  x.fillStyle = aoaDeg >= 16 ? amber : green; x.fillText(`α ${aoaDeg.toFixed(1)}°`, 82, cy - 28);
  x.font = "bold 20px monospace";
  x.strokeRect(14, cy - 18, 72, 32); x.fillText(String(Math.round(spdKmh)), 80, cy + 5);
  x.font = "bold 14px monospace";
  x.fillStyle = mach >= 0.92 ? amber : green;
  x.fillText(`M ${mach.toFixed(2)}`, 82, cy + 32);
  x.fillStyle = abOn ? amber : green;
  x.fillText(abOn ? `AB ${thrPct}%` : `THR ${thrPct}%`, 82, cy + 50);
  if (abOn) { x.strokeStyle = amber; x.strokeRect(24, cy + 56, 60, 18); x.font = "bold 12px monospace"; x.fillText("AB GATE", 80, cy + 69); }
  if (mach >= 0.92) { x.fillStyle = amber; x.font = "bold 11px monospace"; x.fillText(mach >= 0.98 ? "SUPERSONIC" : "TRANSONIC", 82, cy + (abOn ? 84 : 66)); }
  // Right altitude box + vertical speed cue
  x.fillStyle = green; x.strokeStyle = green; x.textAlign = "left";
  x.font = "bold 20px monospace"; x.strokeRect(W - 86, cy - 18, 72, 32);
  x.fillText(String(Math.round(altM)), W - 80, cy + 5);
  x.font = "bold 14px monospace";
  const vv = Math.round(j.vel.y);
  x.fillText(`${vv >= 0 ? "+" : ""}${vv}m/s`, W - 84, cy + 32);
  let dBrg = null;
  if (j.owner && j.owner.alive) {
    const dx = j.owner.pos.x - j.pos.x, dz = j.owner.pos.z - j.pos.z, tcnKm = Math.hypot(dx, dz) / 1000;
    const tcnBrg = (Math.atan2(dx, -dz) * 180 / PI + 360) % 360;
    dBrg = ((tcnBrg - hdg + 540) % 360) - 180;
    x.font = "bold 12px monospace";
    x.fillStyle = tcnKm < 2.2 && altM < 220 ? amber : green;
    x.fillText(tcnKm < 2.2 && altM < 220 ? `ILS ${tcnKm.toFixed(1)}km` : `TCN ${tcnKm.toFixed(1)}km`, W - 84, cy + 50);
  }
  if (altM < 180) {
    x.font = "bold 12px monospace";
    x.fillStyle = altM < 65 ? red : amber;
    x.fillText(`RALT ${Math.round(altM)}m`, W - 84, cy + 66);
  }
  // Top sliding compass heading tape
  x.fillStyle = green; x.strokeStyle = green; x.lineWidth = 1.8; x.textAlign = "center";
  x.font = "bold 15px monospace";
  x.strokeRect(cx - 28, 6, 56, 22); x.fillText(String(Math.round(hdg)).padStart(3, "0"), cx, 22);
  x.beginPath(); x.moveTo(cx - 108, 37); x.lineTo(cx + 108, 37); x.moveTo(cx - 5, 30); x.lineTo(cx, 36); x.lineTo(cx + 5, 30); x.stroke();
  x.save(); x.beginPath(); x.rect(cx - 108, 36, 216, 24); x.clip();
  x.font = "bold 11px monospace";
  const baseDeg = Math.floor((hdg - 35) / 5) * 5;
  for (let d = baseDeg; d <= hdg + 35; d += 5) {
    const tx = cx + (d - hdg) * 3.2, deg = ((d % 360) + 360) % 360, major = deg % 10 === 0;
    x.beginPath(); x.moveTo(tx, 37); x.lineTo(tx, major ? 45 : 41); x.stroke();
    if (major) {
      const lbl = deg === 0 ? "N" : deg === 90 ? "E" : deg === 180 ? "S" : deg === 270 ? "W" : String(deg / 10).padStart(2, "0");
      x.fillText(lbl, tx, 55);
    }
  }
  x.restore();
  if (dBrg !== null) {
    const bx = cx + clamp(dBrg, -34, 34) * 3.2;
    x.fillStyle = Math.abs(dBrg) < 8 ? amber : green;
    x.beginPath(); x.moveTo(bx, 36); x.lineTo(bx - 5, 29); x.lineTo(bx + 5, 29); x.closePath(); x.fill();
  }
  // Dynamic gun pipper + AAM lock / RWR / pull-up / OVER-G alerts
  const fire = !!(info.firing && j.gun > 0);
  if (fire || info.gunHit > 0) {
    const r = fire ? 22 + Math.sin(performance.now() * 0.04) * 3 : 20;
    x.strokeStyle = info.gunHit > 0 ? amber : green; x.lineWidth = 2;
    x.beginPath(); x.arc(cx, cy + 28, r, 0, TAU);
    x.moveTo(cx - 6, cy + 28); x.lineTo(cx + 6, cy + 28); x.moveTo(cx, cy + 22); x.lineTo(cx, cy + 34); x.stroke();
  }
  if (info.lock) {
    x.strokeStyle = amber; x.fillStyle = amber; x.lineWidth = 2.4;
    x.beginPath(); x.moveTo(cx, cy - 34); x.lineTo(cx + 28, cy); x.lineTo(cx, cy + 34); x.lineTo(cx - 28, cy); x.closePath(); x.stroke();
    x.font = "bold 15px monospace"; x.fillText(`FOX-2 SHOOT`, cx, H - 52);
  } else if ((info.lockPct || 0) > 0) {
    const lr = 48 - 22 * clamp(info.lockPct, 0, 1);
    x.strokeStyle = green; x.setLineDash([7, 5]); x.beginPath(); x.arc(cx, cy, lr, 0, TAU); x.stroke(); x.setLineDash([]);
  }
  if (altM < 65 && j.vel.y < -8 && Math.floor(performance.now() / 160) % 2 === 0) {
    x.fillStyle = red; x.strokeStyle = red; x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx - 56, cy - 72); x.lineTo(cx + 56, cy + 56); x.moveTo(cx + 56, cy - 72); x.lineTo(cx - 56, cy + 56); x.stroke();
    x.font = "bold 20px monospace"; x.fillText("PULL UP", cx, cy - 82);
  } else if (gLoad >= 7.2 && Math.floor(performance.now() / 220) % 2 === 0) {
    x.fillStyle = amber; x.font = "bold 15px monospace"; x.fillText("OVER G", cx, cy - 78);
  }
  if (info.rwr) {
    x.fillStyle = red; x.strokeStyle = red; x.lineWidth = 2;
    x.strokeRect(cx - 72, H - 82, 144, 24);
    x.font = "bold 15px monospace"; x.fillText(`RWR MISSILE x${info.rwr}`, cx, H - 65);
  }
  // Bottom stores status + BINGO FUEL cue
  const fuelRem = Math.max(0, Math.ceil((j.endur || 260) + 120 - (j.t || 0)));
  if (fuelRem < 45 && Math.floor(performance.now() / 320) % 2 === 0) {
    x.fillStyle = amber; x.font = "bold 14px monospace"; x.textAlign = "left";
    x.fillText(`BINGO ${fuelRem}s`, 18, H - 38);
  }
  x.fillStyle = green; x.font = "bold 14px monospace";
  x.textAlign = "left"; x.fillText(`GUN ${Math.max(0, j.gun)}  FLR ${j.flares}`, 18, H - 20);
  x.textAlign = "right"; x.fillText(`AAM ${j.aam}  ASM ${j.asm}`, W - 18, H - 20);
  x.shadowBlur = 0;
  t.needsUpdate = true;
}
/** j = the jet, info = { rwr, lock, blips, ab, roll, pitch, firing, lockPct, gunHit } */
export function updateJetPit(j, dt, info = {}) {
  const { night, storm } = syncOvLight();
  if (jetPit.userData.nvLight) {
    jetPit.userData.nvLight.intensity = night ? 1.15 : storm ? 0.35 : 0;
  }
  if (jetPit.userData.hudSymMat) jetPit.userData.hudSymMat.opacity = night ? 0.86 : 1;
  if (jetPit.userData.hudGlassM) jetPit.userData.hudGlassM.opacity = night ? 0.16 : 0.28;
  JV_F.set(1, 0, 0).applyQuaternion(j.q);
  JV_U.set(0, 1, 0).applyQuaternion(j.q);
  JV_R.set(0, 0, 1).applyQuaternion(j.q);
  const spdMs = j.vel.length(), spdKmh = spdMs * 3.6, altM = j.pos.y, thrPct = clamp(Math.round(((j.thr - 110) / 220) * 100), 0, 100);
  const mach = spdMs / 340;
  const truePitch = Math.asin(clamp(JV_F.y, -1, 1)), trueRoll = Math.atan2(-JV_R.y, JV_U.y);
  const hdg = info.hdg ?? ((Math.atan2(JV_F.x, -JV_F.z) * 180 / PI + 360) % 360);
  const angRate = j._prevF ? JV_F.angleTo(j._prevF) / Math.max(dt, 1e-3) : 0;
  (j._prevF ||= new THREE.Vector3()).copy(JV_F);
  const rawG = clamp(Math.cos(truePitch) * Math.cos(trueRoll) + (spdMs * angRate) / 9.81, -2.5, 9.2);
  j._g = (j._g ?? 1) + (rawG - (j._g ?? 1)) * Math.min(1, dt * 8);
  const aoaDeg = clamp(Math.asin(clamp(JV_F.y - j.vel.y / Math.max(spdMs, 1), -0.45, 0.45)) * 180 / PI + Math.max(0, j._g - 1) * 1.15, -4, 24);
  const abK = info.ab ?? (thrPct >= 88 ? 1 : 0), ab = abK > 0.35 || thrPct >= 88;
  const stickRoll = info.roll || clamp(angRate * Math.sign(trueRoll || 1) * 0.4, -1, 1);
  const stickPitch = info.pitch || clamp(angRate * 0.5, -1, 1);
  jetPit.userData.stick.rotation.set(-stickPitch * 0.28, 0, -stickRoll * 0.28);
  jetPit.userData.thr.position.z = -0.48 - (thrPct / 100) * 0.13;
  // G-force inertial head lag + transonic compressibility & high-AoA buffet + Vulcan muzzle recoil
  const firing = !!(info.firing && j.gun > 0), gBuf = Math.max(0, (j._g - 2.2) * 0.22);
  const transBuf = mach >= 0.90 && mach <= 1.06 ? 1 - Math.abs(mach - 0.96) / 0.08 : 0;
  const aoaBuf = clamp((aoaDeg - 11) / 10, 0, 1);
  const vib = (firing ? 0.0042 : 0) + (ab ? 0.0014 : 0.0004) + gBuf * 0.0018 + transBuf * 0.0016 + aoaBuf * 0.0016;
  jHeadX += (clamp(-trueRoll * 0.014, -0.018, 0.018) - jHeadX) * Math.min(1, dt * 6);
  jHeadY += (clamp(-(j._g - 1) * 0.0045, -0.022, 0.012) - jHeadY) * Math.min(1, dt * 6);
  jHeadZ += (clamp(-abK * 0.014, -0.016, 0.006) - jHeadZ) * Math.min(1, dt * 5);
  jetPit.position.set(jHeadX + (Math.random() - 0.5) * vib, jHeadY + (Math.random() - 0.5) * vib, jHeadZ + (firing ? (Math.random() - 0.5) * 0.003 : 0));
  if (jetPit.userData.gunGlow) jetPit.userData.gunGlow.material.opacity = firing ? 0.18 + Math.random() * 0.25 : 0;
  if (jetPit.userData.gVig) jetPit.userData.gVig.material.opacity = clamp((j._g - 5.2) / 4.2, 0, 0.72);
  if (jetPit.userData.wingVapor?.length) {
    const vOp = clamp(Math.max(aoaBuf * 0.42, transBuf * 0.52), 0, 0.55);
    for (const vp of jetPit.userData.wingVapor) vp.material.opacity = vOp > 0.02 ? vOp * (0.85 + Math.random() * 0.3) : 0;
  }
  if (jetPit.userData.machCone) {
    const mOp = clamp(transBuf * 0.44, 0, 0.44);
    jetPit.userData.machCone.material.opacity = mOp > 0.02 ? mOp * (0.78 + Math.random() * 0.35) : 0;
    if (mOp > 0.02) jetPit.userData.machCone.rotation.y += dt * 4.5;
  }
  const blink = Math.floor(performance.now() / 180) % 2 === 0;
  if (jetPit.userData.mcLamp) jetPit.userData.mcLamp.material.color.setHex((j.hit || (altM < 65 && j.vel.y < -8)) && blink ? 0xffb326 : 0x2a1408);
  if (jetPit.userData.rwrLamp) jetPit.userData.rwrLamp.material.color.setHex(info.rwr && blink ? 0xff3b2f : 0x2a0808);
  // 30 Hz collimated HUD combiner update
  jhT -= dt;
  if (jhT <= 0) { jhT = 0.033; drawJetHud(j, info, spdKmh, altM, thrPct, trueRoll, truePitch, hdg, j._g, aoaDeg, abK); }
  // 10 Hz three-MFD glass cockpit + UFC update
  jpT -= dt; if (jpT > 0) return; jpT = 0.1;
  const [L, C, R] = jmfd, bg = (m, title) => {
    m.x.fillStyle = "#041109"; m.x.fillRect(0, 0, m.c.width, m.c.height);
    m.x.strokeStyle = "#1f6132"; m.x.lineWidth = 2; m.x.strokeRect(4, 4, m.c.width - 8, m.c.height - 8);
    m.x.fillStyle = "#0b2414"; m.x.fillRect(6, 6, m.c.width - 12, 24);
    m.x.fillStyle = "#88ff88"; m.x.font = "bold 13px monospace"; m.x.textAlign = "left"; m.x.fillText(title, 12, 22);
  };
  // Left MFD: Engine N1/EGT + Flight Envelope + Fuel
  bg(L, "ENG / FCS");
  const drawArc = (cx, cy, r, pct, lbl, val) => {
    L.x.strokeStyle = "#194826"; L.x.lineWidth = 7; L.x.beginPath(); L.x.arc(cx, cy, r, PI * 0.75, PI * 2.25); L.x.stroke();
    L.x.strokeStyle = pct >= 0.88 ? "#ffd04d" : "#6eff82"; L.x.beginPath(); L.x.arc(cx, cy, r, PI * 0.75, PI * (0.75 + 1.5 * clamp(pct, 0, 1))); L.x.stroke();
    L.x.fillStyle = "#d9ffe0"; L.x.font = "bold 13px monospace"; L.x.textAlign = "center"; L.x.fillText(val, cx, cy + 5);
    L.x.fillStyle = "#79c888"; L.x.font = "11px monospace"; L.x.fillText(lbl, cx, cy + 26);
  };
  drawArc(64, 72, 30, thrPct / 100, "RPM N1", `${thrPct}%`);
  const fuelSec = Math.max(0, Math.ceil((j.endur || 260) + 120 - (j.t || 0)));
  const fuelPct = clamp(fuelSec / Math.max(1, (j.endur || 260) + 120), 0, 1);
  drawArc(188, 72, 30, fuelPct, "FUEL", `${fuelSec}s`);
  const egt = Math.round(540 + thrPct * 4.2 + (ab ? 110 : 0)), noz = Math.round(25 + thrPct * 0.75);
  L.x.textAlign = "left"; L.x.fillStyle = "#7ef07a"; L.x.font = "bold 14px monospace";
  L.x.fillText(`IAS ${Math.round(spdKmh)} km/h`, 14, 134);
  L.x.fillText(`ALT ${Math.round(altM)} m`, 14, 156);
  L.x.font = "bold 12px monospace"; L.x.fillStyle = ab ? "#ffd04d" : "#7ef07a";
  L.x.fillText(`EGT ${egt}° NZ ${noz}%`, 130, 132);
  L.x.fillStyle = "#163b21"; L.x.fillRect(130, 139, 108, 7);
  L.x.fillStyle = egt > 960 ? "#ff6854" : ab ? "#ffd04d" : "#6eff82";
  L.x.fillRect(130, 139, Math.round(108 * clamp((egt - 500) / 580, 0.08, 1)), 7);
  L.x.fillStyle = "#9ae69f"; L.x.fillText(`G ${j._g.toFixed(1)}   M ${mach.toFixed(2)}`, 130, 160);
  L.x.font = "bold 14px monospace";
  L.x.fillStyle = j.hit ? "#ff5a4e" : (fuelSec < 45 ? "#ffd04d" : (ab ? "#ffd04d" : "#7ef07a"));
  L.x.fillText(j.hit ? "WARN: AIRFRAME DMG" : (fuelSec < 45 ? "WARN: BINGO FUEL" : (ab ? "AFTERBURNER ON" : "FCS NORMAL")), 14, 186);
  // Center MFD: HSD B-Scope Tactical Radar with sweep sector, range labels & lock cue
  bg(C, info.lock ? `HSD LOCK ${info.lock}` : "HSD SEARCH");
  const cw = C.c.width, ch = C.c.height, cx = cw / 2, cy = ch - 18, maxR = ch - 52;
  C.x.strokeStyle = "#226836"; C.x.lineWidth = 1.5;
  for (const r of [maxR * 0.33, maxR * 0.66, maxR]) { C.x.beginPath(); C.x.arc(cx, cy, r, PI, 0); C.x.stroke(); }
  C.x.beginPath(); C.x.moveTo(cx, cy); C.x.lineTo(cx - maxR * 0.72, cy - maxR * 0.72); C.x.moveTo(cx, cy); C.x.lineTo(cx + maxR * 0.72, cy - maxR * 0.72); C.x.stroke();
  C.x.fillStyle = "#52b86a"; C.x.font = "10px monospace"; C.x.textAlign = "left";
  C.x.fillText("10", cx - maxR * 0.56, cy - maxR * 0.45);
  C.x.fillText("20", cx - maxR * 0.80, cy - maxR * 0.66);
  const sw = -PI / 2 + Math.sin(performance.now() * 0.0028) * 0.88;
  C.x.fillStyle = "rgba(110,255,130,0.09)"; C.x.beginPath(); C.x.moveTo(cx, cy);
  C.x.arc(cx, cy, maxR, sw - PI / 2 - 0.16, sw - PI / 2 + 0.16); C.x.closePath(); C.x.fill();
  C.x.strokeStyle = "rgba(126,240,122,0.75)"; C.x.lineWidth = 2; C.x.beginPath(); C.x.moveTo(cx, cy); C.x.lineTo(cx + Math.sin(sw) * maxR, cy - Math.cos(sw) * maxR); C.x.stroke();
  for (const o of info.blips || []) {
    const bx = cx + o.x * maxR, by = cy - o.y * maxR;
    C.x.fillStyle = o.foe ? "#ff5a4e" : "#7cc4ff"; C.x.fillRect(bx - 3, by - 3, 6, 6);
    C.x.strokeStyle = o.foe ? "#ff8a7a" : "#9ad6ff"; C.x.lineWidth = 1.2; C.x.beginPath(); C.x.moveTo(bx, by); C.x.lineTo(bx, by + 7); C.x.stroke();
    if (o.foe && info.lock) { C.x.strokeStyle = "#ffd04d"; C.x.strokeRect(bx - 6, by - 6, 12, 12); }
  }
  // Right MFD: SMS Weapons Planform + Active RWR Threat Scope
  bg(R, info.lock ? "SMS ARMED" : "SMS / RWR");
  R.x.strokeStyle = "#2b7a42"; R.x.lineWidth = 1.6;
  R.x.beginPath(); R.x.moveTo(74, 48); R.x.lineTo(132, 92); R.x.lineTo(132, 108); R.x.lineTo(74, 86); R.x.lineTo(16, 108); R.x.lineTo(16, 92); R.x.closePath(); R.x.stroke();
  // wingtip / internal bay stores pips on planform
  for (const [px, has, col] of [[24, j.aam > 0, "#88ff88"], [124, j.aam > 1, "#88ff88"], [48, j.asm > 0, "#ffd04d"], [100, j.asm > 1, "#ffd04d"]]) {
    R.x.fillStyle = has ? col : "#2a3c2f"; R.x.fillRect(px - 2, 96, 4, 12);
  }
  const store = (sx, sy, lbl, n, col) => {
    R.x.fillStyle = n > 0 ? "rgba(30,90,46,0.45)" : "rgba(40,20,20,0.5)"; R.x.fillRect(sx, sy, 68, 28);
    R.x.strokeStyle = n > 0 ? col : "#5a3232"; R.x.strokeRect(sx, sy, 68, 28);
    R.x.fillStyle = n > 0 ? col : "#8e5858"; R.x.font = "bold 12px monospace"; R.x.fillText(`${lbl}:${n}`, sx + 6, sy + 18);
  };
  store(16, 118, "AAM", j.aam, info.lock ? "#ffd04d" : "#88ff88"); store(92, 118, "ASM", j.asm, "#ffd04d");
  store(16, 152, "GUN", Math.max(0, j.gun), "#88ff88"); store(92, 152, "FLR", j.flares, "#7cc4ff");
  const rx = 204, ry = 112, rr = 38;
  R.x.strokeStyle = info.rwr ? "#ff5a4e" : "#256d3a"; R.x.lineWidth = 2; R.x.beginPath(); R.x.arc(rx, ry, rr, 0, TAU); R.x.stroke();
  R.x.beginPath(); R.x.arc(rx, ry, rr * 0.45, 0, TAU); R.x.stroke();
  R.x.strokeStyle = "#256d3a"; R.x.lineWidth = 1.2;
  for (let k = 0; k < 4; k++) {
    const a = (k * PI) / 2;
    R.x.beginPath(); R.x.moveTo(rx + Math.cos(a) * (rr - 6), ry + Math.sin(a) * (rr - 6)); R.x.lineTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr); R.x.stroke();
  }
  R.x.beginPath(); R.x.moveTo(rx - 5, ry); R.x.lineTo(rx + 5, ry); R.x.moveTo(rx, ry - 5); R.x.lineTo(rx, ry + 5); R.x.stroke();
  if (info.rwr > 0) {
    const cnt = Math.min(4, info.rwr), pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.015);
    R.x.strokeStyle = `rgba(255,90,78,${pulse.toFixed(2)})`; R.x.fillStyle = "#ff5a4e";
    for (let i = 0; i < cnt; i++) {
      const thA = -PI / 2 + (i - (cnt - 1) / 2) * 0.72, tx = rx + Math.cos(thA) * (rr * 0.76), ty = ry + Math.sin(thA) * (rr * 0.76);
      R.x.beginPath(); R.x.moveTo(rx + Math.cos(thA) * 8, ry + Math.sin(thA) * 8); R.x.lineTo(tx, ty); R.x.stroke();
      R.x.beginPath(); R.x.moveTo(tx, ty - 5); R.x.lineTo(tx + 5, ty); R.x.lineTo(tx, ty + 5); R.x.lineTo(tx - 5, ty); R.x.closePath(); R.x.fill();
    }
  }
  R.x.fillStyle = info.rwr ? "#ff5a4e" : "#7ef07a"; R.x.font = "bold 12px monospace"; R.x.textAlign = "center";
  R.x.fillText(info.rwr ? `MSL ${info.rwr}` : "RWR CLR", rx, ry + 56);
  // Up-Front Controller scratchpad + tactile option keys
  const U = jetPit.userData.ufc;
  if (U) {
    U.x.fillStyle = "#061109"; U.x.fillRect(0, 0, U.c.width, U.c.height);
    U.x.strokeStyle = "#225a32"; U.x.lineWidth = 3; U.x.strokeRect(2, 2, U.c.width - 4, U.c.height - 4);
    U.x.fillStyle = info.rwr ? "#ff6854" : (fuelSec < 45 ? "#ffd04d" : "#7cff8a"); U.x.font = "bold 22px monospace"; U.x.textAlign = "center";
    U.x.fillText(info.rwr ? "!! MSL WARN !!" : (fuelSec < 45 ? "!! BINGO FUEL !!" : (info.lock ? "FOX-2 LOCKED" : "MASTER ARM ON")), U.c.width / 2, 36);
    U.x.fillStyle = "#9ae69f"; U.x.font = "bold 17px monospace";
    U.x.fillText(`HDG ${String(Math.round(hdg)).padStart(3, "0")}  AAM ${j.aam}  ASM ${j.asm}`, U.c.width / 2, 68);
    const tcnNear = !!(j.owner && j.owner.alive && Math.hypot(j.owner.pos.x - j.pos.x, j.owner.pos.z - j.pos.z) < 3500);
    const keys = [["IFF", true], ["TCN", tcnNear], ["DLNK", (info.blips?.length || 0) > 0], ["AP", !!(j.landT > 0 || j.home)]];
    for (let k = 0; k < keys.length; k++) {
      const kx = 11 + k * 60, [lbl, on] = keys[k];
      U.x.fillStyle = on ? "rgba(46,135,68,0.68)" : "rgba(25,75,40,0.35)"; U.x.fillRect(kx, 86, 54, 30);
      U.x.strokeStyle = on ? "#7cff8a" : "#286b3d"; U.x.lineWidth = on ? 2 : 1.5; U.x.strokeRect(kx, 86, 54, 30);
      U.x.fillStyle = on ? "#d9ffe0" : "#68b878"; U.x.font = "bold 12px monospace";
      U.x.fillText(lbl, kx + 27, 105);
    }
    U.t.needsUpdate = true;
  }
  for (const m of jmfd) m.t.needsUpdate = true;
}
