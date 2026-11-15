// ── modern operations beyond the surface duel ──────────────────────────────────
// ASW (submarines, sonobuoys, torpedoes), ballistic-missile defence, drone swarms, shore bombardment,
// modern convoy escort and the EMCON night raid. Missiles and drones fly through modern.js's missile list,
// so the fleet's existing air defence (SAMs, CIWS, saturation) handles them without special cases.
import { THREE, PI, TAU, clamp, wrap, rnd, gauss, G, scene, camera, spray, smoke, flash, spawnSplash, landAt } from "./core.js";
import { sfx, at } from "./audio.js";
import { M, WPN, launch, hooks } from "./modern.js";

export const OPS = {
  modern: { n: "함대 결전 · 미사일 해전", d: "이지스함 대 적 수상함대. 대함미사일과 다층 방공" },
  "modern:asw": { n: "대잠전", d: "적 잠수함 3척. 헬기 소노부이로 찾고 대잠로켓·어뢰로 격침. 느리게 가야 소나가 잘 듣는다" },
  "modern:bmd": { n: "탄도미사일 방어", d: "4차례 탄도미사일 공격에서 군수지원함과 함대를 지켜라" },
  "modern:drone": { n: "드론 떼 방어", d: "자폭 드론 떼가 여러 방향에서 몰려온다. 자동 방공만으론 못 막는다 — G 대공 사격 · E 재밍 · 지원함 앞을 막아서라" },
  "modern:shore": { n: "상륙 지원 함포 사격", d: "해안포·미사일 진지를 함포로 부수고 상륙정 2척 이상을 해안에 올려라" },
  "modern:convoy": { n: "수송선단 호위", d: "수송선 3척을 14 km 앞까지. 잠수함·드론·미사일함이 노린다. 2척 도착이면 성공" },
  "modern:emcon": { n: "EMCON 야간 기습", d: "레이더를 끈 채 밤바다로 접근해 더 큰 적 함대를 먼저 친다. 레이더를 켜면 들킨다" },
};
export const OP_IDS = Object.keys(OPS);
hooks.droneMesh = (k) => droneMesh(k);
export const isModernOp = (m) => m === "modern" || (typeof m === "string" && m.startsWith("modern:"));

// weapons that only these operations use (game values; names are generic on purpose)
Object.assign(WPN, {
  "자폭 드론": { role: "asm", name: "자폭 드론", range: 40000, v: 62, cls: "sub", alt: "drone", dmg: 9, drone: 1 },
  "제트 드론": { role: "asm", name: "제트 자폭 드론", range: 40000, v: 165, cls: "sub", alt: "drone", dmg: 13, drone: 2 },
  "탄도미사일": { role: "asm", name: "단거리 탄도미사일", range: 210000, v: 1700, cls: "hyp", alt: "ball", dmg: 46 },
  "해안 대함": { role: "asm", name: "해안 대함미사일", range: 30000, v: 270, cls: "sub", alt: "skim", dmg: 30 },
});

const pend = [];
export const O = { op: null, t: 0, subs: [], torps: [], lw: [], buoys: [], rockets: [], targets: [], boats: [], waves: [], landed: 0, lostBoats: 0, asset: null, convoy: [], goal: null, msg: null };
const MAT = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.2, ...o });
const add = (m) => { scene.add(m); return m; };
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const usShips = () => G.ships.filter((s) => s.alive && s.side === "us");
const phantom = (side, pos, vel) => ({ isJet: true, side, pos: pos.clone(), vel: vel.clone(), alive: true, spec: { fb: 0 }, name: "launcher" });

// ── meshes ───────────────────────────────────────────────────────────────────
function subMesh() {
  const g = new THREE.Group(), m = MAT(0x1a1e21, { roughness: 0.5 });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(5, 64, 6, 16), m); hull.rotation.z = PI / 2; g.add(hull);
  const sail = new THREE.Mesh(new THREE.BoxGeometry(11, 8, 3), m); sail.position.set(14, 7, 0); g.add(sail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 14), m); fin.position.set(-34, 0, 0); g.add(fin);
  return g;
}
function buoyMesh() {
  const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3, 10), MAT(0xf2c230)));
  const l = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5a3a })); l.position.y = 2.2; g.add(l); g.userData.light = l; g.scale.setScalar(3); return g;
}
/** Loitering-munition drone (original design): delta wing with canted tip fins, pusher prop, nose sensor, blinking nav lights.
 *  kind 2 is the faster jet version: dorsal turbojet pod instead of the propeller. */
export function droneMesh(kind = 1) {
  const g = new THREE.Group(), body = MAT(0x5a5f55, { roughness: 0.8 }), belly = MAT(0x8a8f84), dark = MAT(0x1b1d1c, { metalness: 0.5, roughness: 0.3 }), stripe = MAT(0xb2392c);
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 2.6, 10), body); fus.rotation.z = PI / 2; g.add(fus);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 10), body); nose.rotation.z = -PI / 2; nose.position.x = 1.57; g.add(nose);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), dark); eye.position.set(1.55, -0.12, 0); g.add(eye);
  const wingShape = new THREE.Shape(); wingShape.moveTo(0.9, 0); wingShape.lineTo(-1.15, 1.35); wingShape.lineTo(-1.3, 1.35); wingShape.lineTo(-1.2, 0); wingShape.lineTo(-1.3, -1.35); wingShape.lineTo(-1.15, -1.35); wingShape.closePath();
  const wing = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape, { depth: 0.05, bevelEnabled: false }), body); wing.rotation.x = PI / 2; wing.position.y = 0.02; g.add(wing);
  const under = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape, { depth: 0.01, bevelEnabled: false }), belly); under.rotation.x = PI / 2; under.position.y = -0.04; under.scale.setScalar(0.96); g.add(under);
  for (const s of [1, -1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.04), body); fin.position.set(-1.12, 0.22, 1.33 * s); fin.rotation.x = -0.25 * s; g.add(fin);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.06), stripe); tip.position.set(-0.9, 0.04, 1.05 * s); g.add(tip);
  }
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.12, 10), stripe); band.rotation.z = PI / 2; band.position.x = 0.6; g.add(band);
  const lights = [];
  for (const [s, c] of [[1, 0x33ff66], [-1, 0xff3333]]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshBasicMaterial({ color: c })); l.position.set(-1.2, 0.05, 1.36 * s); g.add(l); lights.push(l); }
  let prop = null;
  if (kind === 1) {
    prop = new THREE.Group(); prop.position.x = -1.38; g.add(prop);
    const hub = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 8), dark); hub.rotation.z = PI / 2; prop.add(hub);
    for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.95, 0.09), dark); b.rotation.x = (i * PI) / 2 + 0.2; prop.add(b); }
    const blur = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); blur.rotation.y = PI / 2; prop.add(blur);
  } else {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 1.1, 10), dark); pod.rotation.z = PI / 2; pod.position.set(-0.75, 0.3, 0); g.add(pod);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.12, 10), new THREE.MeshBasicMaterial({ color: 0xffa040 })); glow.rotation.y = -PI / 2; glow.position.set(-1.31, 0.3, 0); g.add(glow);
  }
  g.userData = { fl: new THREE.Object3D(), prop, lights, drone: kind }; g.add(g.userData.fl);
  g.scale.setScalar(3.2); // game scale: a 3 m drone would vanish next to a 170 m destroyer
  return g;
}
function targetMesh(kind) {
  const g = new THREE.Group(), cam = MAT(0x5b6248), conc = MAT(0x8d8b84), dark = MAT(0x2a2c2a);
  if (kind === "gun") { g.add(new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 5, 12), conc)); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 16, 8), dark); b.rotation.z = PI / 2 - 0.25; b.position.set(8, 5, 0); g.add(b); }
  else if (kind === "ssm") { g.add(new THREE.Mesh(new THREE.BoxGeometry(14, 4, 5), cam)); const t = new THREE.Mesh(new THREE.BoxGeometry(9, 3, 4), cam); t.position.set(-1, 4, 0); t.rotation.z = 0.35; g.add(t); }
  else if (kind === "radar") { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1, 16, 6), dark); m.position.y = 8; g.add(m); const d = new THREE.Mesh(new THREE.BoxGeometry(2, 5, 10), conc); d.position.y = 17; g.add(d); g.userData.spin = d; }
  else { g.add(new THREE.Mesh(new THREE.BoxGeometry(16, 6, 12), conc)); const s = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 1), dark); s.position.set(0, 2, 6.1); g.add(s); }
  g.scale.setScalar(2.2); return g;
}
function boatMesh() { const g = new THREE.Group(); const h = new THREE.Mesh(new THREE.BoxGeometry(26, 4, 12), MAT(0x4d5a52)); h.position.y = 2; g.add(h); const r = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 4), MAT(0x3a443e)); r.position.set(-8, 6, 4); g.add(r); return g; }

// ── setup ────────────────────────────────────────────────────────────────────
/** ctx: { P, Ship, TRANSPORT, mkBrain, log, toast } — called at the end of newBattle for a modern operation. */
export function opsInit(op, ctx) {
  opsClear(); O.op = op; O.t = 0; const P = ctx.P;
  if (op === "modern:asw" || op === "modern:convoy") {
    const n = op === "modern:asw" ? 3 : 2;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rnd() * 0.8, r = 6500 + rnd() * 3000; spawnSub(P.pos.x + Math.cos(a) * r, P.pos.z + Math.sin(a) * r, `적 잠수함 ${i + 1}`); }
    for (const s of usShips()) s.asw = s.isPlayer ? 8 : 4;
  }
  if (op === "modern:bmd" || op === "modern:convoy") {
    const st = op === "modern:bmd" ? [[-1400, 600]] : [[-600, -900], [-1400, -900], [-2200, -900]];
    st.forEach(([fx, sz], i) => { const c = P.pos.clone(), f = P.fwd, sd = new THREE.Vector3(-f.z, 0, f.x);
      const s = new ctx.Ship(ctx.TRANSPORT, c.x + f.x * fx + sd.x * sz, c.z + f.z * fx + sd.z * sz, P.heading, "us"); s.br = ctx.mkBrain(20);
      s.name = op === "modern:bmd" ? "군수지원함 (방호 대상)" : `수송선 ${i + 1}`; if (op === "modern:bmd") { s.speed = 0; s.anchored = true; O.asset = s; } else { s.speed = s.vmax * 0.6; O.convoy.push(s); }
      G.ships.push(s); G.allies.push(s); });
    if (op === "modern:convoy") { const f = P.fwd; O.goal = { x: P.pos.x + f.x * 14000, z: P.pos.z + f.z * 14000 }; }
  }
  if (op === "modern:bmd") O.waves = [{ t: 25, n: 2, k: "bm" }, { t: 85, n: 3, k: "bm" }, { t: 150, n: 4, k: "bm" }, { t: 215, n: 5, k: "bm" }];
  if (op === "modern:drone") O.waves = [{ t: 12, n: 8, k: "dr", dirs: 1 }, { t: 70, n: 12, k: "dr", dirs: 2 }, { t: 135, n: 14, k: "dr", dirs: 2, jets: 3 }, { t: 205, n: 18, k: "dr", dirs: 3, jets: 4 }];
  if (op === "modern:convoy") O.waves = [{ t: 75, n: 10, k: "dr", dirs: 2 }, { t: 170, n: 8, k: "dr", dirs: 1, jets: 3 }];
  if (op === "modern:drone") { const f = P.fwd, sd = new THREE.Vector3(-f.z, 0, f.x); const s = new ctx.Ship(ctx.TRANSPORT, P.pos.x - f.x * 1200 + sd.x * 500, P.pos.z - f.z * 1200 + sd.z * 500, P.heading, "us"); s.name = "군수지원함 (방호 대상)"; s.speed = 0; s.anchored = true; s.br = ctx.mkBrain(20); O.asset = s; G.ships.push(s); G.allies.push(s); }
  if (op === "modern:shore") shoreInit(ctx);
  if (op === "modern:emcon") for (const s of usShips()) if (s.spec.modern) s.radarOn = false;
  if (ctx.hard) { for (const w of O.waves) { w.n = Math.ceil(w.n * 1.3); if (w.jets) w.jets++; } if (O.subs.length) { const a = rnd() * TAU; spawnSub(P.pos.x + Math.cos(a) * 8000, P.pos.z + Math.sin(a) * 8000, `적 잠수함 ${O.subs.length + 1}`); } } // the stage before was lost: harder
  for (const w of O.waves) w.dir = rnd() * TAU;
}
function spawnSub(x, z, name) {
  const mesh = add(subMesh()); const s = { name, pos: new THREE.Vector3(x, -28, z), heading: rnd() * TAU, speed: 4, hp: 100, alive: true, mesh, torpCd: 20 + rnd() * 20, torps: 6, evadeT: 0, det: 0, firm: false, ep: null, er: 0, revealT: 0 };
  O.subs.push(s); return s;
}
const ray = new THREE.Raycaster();
function groundY(x, z) { ray.set(new THREE.Vector3(x, 4000, z), new THREE.Vector3(0, -1, 0)); ray.camera = camera; const hits = []; for (const o of scene.children) if (o.isMesh || o.isGroup) { try { hits.push(...ray.intersectObject(o, true)); } catch {} } hits.sort((a, b) => a.distance - b.distance); for (const h of hits) { const o = h.object; if (o.geometry?.type === "PlaneGeometry" || o.geometry?.type === "SphereGeometry" || h.point.y < 1) continue; if (o.isMesh && h.distance > 10) return h.point.y; } return 20; }
function shoreInit(ctx) {
  const P = ctx.P; let beach = null; scene.updateMatrixWorld(true);
  for (let r = 4000; r <= 22000 && !beach; r += 1500) for (let k = 0; k < 48 && !beach; k++) { const a = (k / 48) * TAU, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r; if (landAt(x, z) && !landAt(x - Math.cos(a) * 700, z - Math.sin(a) * 700)) beach = { x, z, a }; }
  if (!beach) { const a = P.heading; beach = { x: P.pos.x + Math.cos(a) * 9000, z: P.pos.z + Math.sin(a) * 9000, a, fake: true }; }
  O.beach = beach; const inland = (d, side) => ({ x: beach.x + Math.cos(beach.a) * d + Math.cos(beach.a + PI / 2) * side, z: beach.z + Math.sin(beach.a) * d + Math.sin(beach.a + PI / 2) * side });
  const plan = [["gun", "해안포 1", 500, -1300], ["gun", "해안포 2", 500, 1300], ["ssm", "대함미사일 진지", 1800, 400], ["radar", "감시 레이더", 1300, -500], ["bunker", "지휘 벙커", 900, 200], ["bunker", "탄약고", 2200, -900]];
  for (const [kind, name, d, sd] of plan) { const p = inland(d, sd); const mesh = add(targetMesh(kind)); const y = beach.fake ? 8 : groundY(p.x, p.z); mesh.position.set(p.x, y, p.z); mesh.rotation.y = -beach.a + PI; O.targets.push({ kind, name, pos: new THREE.Vector3(p.x, y, p.z), hp: kind === "bunker" ? 140 : 100, alive: true, mesh, cd: 8 + rnd() * 8 }); }
  if (beach.fake) G.islands.push({ x: inland(1500, 0).x, z: inland(1500, 0).z, r: 2600 });
}

// ── per frame ────────────────────────────────────────────────────────────────
/** ctx: { P, log, toast, radio, onSubKill } */
export function opsStep(dt, ctx) {
  if (!O.op) return; O.t += dt;
  for (const w of O.waves) if (!w.done && O.t >= w.t) { w.done = true; w.k === "bm" ? ballisticWave(w, ctx) : droneWave(w, ctx); }
  stepSubs(dt, ctx); stepTorps(dt, ctx); stepLightweights(dt, ctx); stepRockets(dt, ctx); stepBuoys(dt); stepDrones(dt);
  if (O.op === "modern:shore") stepShore(dt, ctx);
  if (O.op === "modern:convoy") for (const c of O.convoy) { if (!c.alive || c.arrived) { if (c.arrived) { c.tele = 1; c.rudderCmd = 0; } continue; } const d = dist2(c.pos, O.goal); if (d < 700) { c.arrived = true; ctx.log(`${c.name} 집결지 도착`, "hit"); continue; } c.rudderCmd = clamp(wrap(Math.atan2(O.goal.z - c.pos.z, O.goal.x - c.pos.x) - c.heading) * 2, -1, 1); c.tele = 3; }
  // helicopters: drop sonobuoys along their path, and lightweight torpedoes on a firm contact
  for (const h of M.helos) { if (!h.alive || h.side !== "us" || !O.subs.length) continue; h.torps ??= 2;
    if (!h.lastB || dist2(h.pos, h.lastB) > 1300) { h.lastB = h.pos.clone(); dropBuoy(h.pos.x, h.pos.z); }
    const s = O.subs.find((x) => x.alive && x.firm && dist2(x.ep, h.pos) < 1800); if (s && h.torps > 0 && (h.tCd || 0) <= O.t) { h.torps--; h.tCd = O.t + 8; lightweight(h.pos.clone().setY(0), "us", 0.75); ctx.log(`${h.name} 경어뢰 투하 → ${s.name} 추정 위치`, "hit"); } }
  // allies fire their ASW rockets at firm contacts by themselves
  for (const a of usShips()) if (!a.isPlayer && a.asw > 0 && (a.aswCd || 0) <= O.t) { const s = O.subs.find((x) => x.alive && x.firm && dist2(x.ep, a.pos) < 9000); if (s) { a.aswCd = O.t + 35; aswRocket(a, s.ep.clone(), ctx); } }
}
export function opsClear() {
  for (const k of ["subs", "buoys", "targets", "boats", "rockets"]) for (const o of O[k]) if (o.mesh) scene.remove(o.mesh);
  pend.length = 0;
  Object.assign(O, { op: null, t: 0, subs: [], torps: [], lw: [], buoys: [], rockets: [], targets: [], boats: [], waves: [], landed: 0, lostBoats: 0, asset: null, convoy: [], goal: null, beach: null });
}

// submarines: close in slowly and quietly, fire a heavyweight torpedo inside 7 km, then turn away and hide
function stepSubs(dt, ctx) {
  for (const s of O.subs) {
    if (!s.alive) { if (s.mesh.position.y > -80) s.mesh.position.y -= dt * 3; continue; }
    const us = usShips(); const T = us.sort((a, b) => dist2(a.pos, s.pos) - dist2(b.pos, s.pos))[0]; if (!T) continue;
    const d = dist2(T.pos, s.pos); s.torpCd -= dt; s.evadeT -= dt; s.revealT -= dt;
    let want = Math.atan2(T.pos.z - s.pos.z, T.pos.x - s.pos.x); s.speed = d > 8000 ? 7 : 4.5;
    if (s.evadeT > 0) { want += PI * 0.7; s.speed = 8; } else if (d < 4500) { want += PI / 2; s.speed = 3; }
    s.heading = wrap(s.heading + clamp(wrap(want - s.heading), -0.08 * dt, 0.08 * dt)); s.pos.x += Math.cos(s.heading) * s.speed * G.SPD * dt; s.pos.z += Math.sin(s.heading) * s.speed * G.SPD * dt; // G.SPD: same game pace as the ships
    if (landAt(s.pos.x, s.pos.z, 300)) { s.heading = wrap(s.heading + PI * 0.6); s.pos.x -= Math.cos(s.heading) * 40; }
    if (s.torpCd <= 0 && s.torps > 0 && d < 7000 && s.evadeT <= 0) { s.torps--; s.torpCd = 70 + rnd() * 30; s.evadeT = 45; s.revealT = 15; heavyTorp(s, T, ctx); }
    s.mesh.position.set(s.pos.x, -28, s.pos.z); s.mesh.rotation.y = -s.heading;
    // detection: hull sonar (a quiet ship hears farther), sonobuoys, helicopters, and the noise of its own torpedo launch
    let q = 0, er = 0;
    for (const a of us) if (a.spec.modern) { const R = a.speed < 7 ? 5200 : a.speed < 11 ? 3600 : 2200; if (dist2(a.pos, s.pos) < R) { q = Math.max(q, 2); er = 250; } }
    for (const b of O.buoys) if (b.alive && dist2(b.pos, s.pos) < 3500) { q = Math.max(q, 1); er = er || 650; }
    for (const h of M.helos) if (h.alive && h.side === "us" && dist2(h.pos, s.pos) < 3000) { q = Math.max(q, 2); er = 200; }
    if (s.revealT > 0) { q = 2; er = Math.min(er || 400, 400); }
    if (q) { const fresh = s.det <= 0; s.det = 10; s.firm = q >= 2; s.er = er; s.ep = new THREE.Vector3(s.pos.x + gauss() * er * 0.4, 0, s.pos.z + gauss() * er * 0.4); if (fresh) ctx.log(`잠수함 접촉 — ${s.firm ? "확실" : "추정"} (오차 ${er} m)`, "bad"); }
    else { s.det = Math.max(0, s.det - dt); s.firm = s.det > 0 && s.firm; }
  }
}
function heavyTorp(s, T, ctx) {
  const p = s.pos.clone().setY(-6), v = new THREE.Vector3(Math.cos(s.heading), 0, Math.sin(s.heading)).multiplyScalar(22);
  O.torps.push({ pos: p, vel: v, target: T, t: 0, run: 0, alive: true, lured: false, checked: false });
  if (T.side === "us") { sfx.torpWarn?.(); ctx.toast(`어뢰 접근! ${T.name} 노림 — 속력 올려 회피, 기만체 자동 투하`, 4); ctx.radio?.("torp_warn"); }
}
function stepTorps(dt, ctx) {
  for (let i = O.torps.length - 1; i >= 0; i--) { const t = O.torps[i]; t.t += dt; const T = t.target;
    if (!t.alive || t.run > 12000 || !T || !T.alive) { O.torps.splice(i, 1); continue; }
    const d = dist2(t.pos, T.pos);
    if (!t.checked && d < 1800) { t.checked = true; if (rnd() < 0.45) { t.lured = true; t.decoy = T.pos.clone().addScaledVector(T.fwd, -400); ctx.log(`어뢰 기만체에 유인됨 — ${T.name}`, "hit"); } }
    const aim = t.lured ? t.decoy : T.pos.clone().addScaledVector(T.vel || new THREE.Vector3(), d / 56);
    const want = Math.atan2(aim.z - t.pos.z, aim.x - t.pos.x), cur = Math.atan2(t.vel.z, t.vel.x), nh = cur + clamp(wrap(want - cur), -0.35 * dt, 0.35 * dt);
    t.vel.set(Math.cos(nh) * 22, 0, Math.sin(nh) * 22); t.pos.addScaledVector(t.vel, dt * G.SPD); t.run += 22 * G.SPD * dt;
    if (rnd() < dt * 12) spray.spawn({ x: t.pos.x, y: 0.5, z: t.pos.z, vy: 1, life: 2.5, s0: 2, s1: 5, a: 0.5, c: 0xeaf4f6 });
    if (t.lured && dist2(t.pos, t.decoy) < 40) { spawnSplash(t.pos.x, t.pos.z, 0.6); O.torps.splice(i, 1); continue; }
    if (!t.lured && d < 30 + T.spec.L * 0.35) { O.torps.splice(i, 1); spawnSplash(t.pos.x, t.pos.z, 1.6); for (let k = 0; k < 10; k++) spray.spawn({ x: t.pos.x + gauss() * 8, y: 2, z: t.pos.z + gauss() * 8, vy: 30 + rnd() * 25, g: 9, life: 3, s0: 8, s1: 22, a: 0.8, c: 0xffffff });
      const dd = t.pos.distanceTo(camera.position); at(dd, () => sfx.explode(dd)); T.flooding = (T.flooding || 0) + 2; T.listSide = T.listSide || 1; T.damage(T.maxHp * 0.32); ctx.log(`어뢰 명중 — ${T.name} 침수!`, "bad"); }
  }
}
function dropBuoy(x, z) { const live = O.buoys.filter((b) => b.alive); if (live.length > 14) { live[0].alive = false; scene.remove(live[0].mesh); } const mesh = add(buoyMesh()); mesh.position.set(x, 1, z); O.buoys.push({ pos: new THREE.Vector3(x, 0, z), alive: true, t: 0, mesh }); spawnSplash(x, z, 0.15); }
function stepBuoys(dt) { for (const b of O.buoys) { if (!b.alive) continue; b.t += dt; b.mesh.userData.light.visible = Math.floor(b.t * 1.5) % 2 === 0; b.mesh.position.y = 0.6 + Math.sin(b.t * 1.7) * 0.4; if (b.t > 300) { b.alive = false; scene.remove(b.mesh); } } }
/** ASW rocket (ASROC / Red Shark class): flies to the point, drops a lightweight torpedo that searches there. */
export function aswRocket(S, pt, ctx) {
  if (!(S.asw > 0)) return false; S.asw--; const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 8), MAT(0xdedede)); b.rotation.z = PI / 2; g.add(b); g.scale.setScalar(2); add(g);
  const p0 = S.pos.clone().setY(S.spec.fb + 6), T = 7 + dist2(S.pos, pt) / 1400;
  O.rockets.push({ p0, p1: pt.clone().setY(0), T, t: 0, mesh: g }); smoke.spawn({ x: p0.x, y: p0.y, z: p0.z, vy: 6, life: 3, s0: 6, s1: 18, a: 0.6, c: 0xe8e8e8 }); sfx.mslLaunch?.(p0.distanceTo(camera.position));
  ctx?.log?.(`${S.name} 대잠로켓 발사 → 추정 위치 (남은 ${S.asw})`, "hit"); return true;
}
function stepRockets(dt) {
  for (let i = O.rockets.length - 1; i >= 0; i--) { const r = O.rockets[i]; r.t += dt; const u = Math.min(1, r.t / r.T); const arc = (k) => { const p = r.p0.clone().lerp(r.p1, k); p.y = r.p0.y * (1 - k) + Math.sin(PI * k) * 900; return p; };
    const p = arc(u); r.mesh.position.copy(p); r.mesh.lookAt(arc(Math.min(1, u + 0.01))); r.mesh.rotateY(PI / 2);
    if (rnd() < dt * 20) smoke.spawn({ x: p.x, y: p.y, z: p.z, life: 2, s0: 3, s1: 10, a: 0.4, c: 0xdddddd });
    if (u >= 1) { scene.remove(r.mesh); O.rockets.splice(i, 1); spawnSplash(r.p1.x, r.p1.z, 0.3); lightweight(r.p1, "us", 0.65); } }
}
function lightweight(pos, side, pk) { O.lw.push({ pos: pos.clone(), t: 0, side, pk, sub: null }); }
function stepLightweights(dt, ctx) {
  for (let i = O.lw.length - 1; i >= 0; i--) { const w = O.lw[i]; w.t += dt;
    if (!w.sub) { const s = O.subs.filter((x) => x.alive && dist2(x.pos, w.pos) < 1400).sort((a, b) => dist2(a.pos, w.pos) - dist2(b.pos, w.pos))[0]; if (s) w.sub = s; else { w.pos.x += Math.cos(w.t) * 14 * dt; w.pos.z += Math.sin(w.t) * 14 * dt; } }
    if (w.sub) { const s = w.sub, d = dist2(s.pos, w.pos); const k = Math.min(1, (20 * G.SPD * dt) / Math.max(d, 1)); w.pos.lerp(s.pos, k);
      if (d < 25) { O.lw.splice(i, 1); const hit = rnd() < w.pk * (s.evadeT > 0 ? 0.7 : 1); spawnSplash(s.pos.x, s.pos.z, hit ? 1.2 : 0.4);
        if (hit) { s.hp -= 60; s.revealT = 20; const dd = s.pos.distanceTo(camera.position); at(dd, () => sfx.explode(dd)); ctx.log(`경어뢰 명중 — ${s.name}${s.hp <= 0 ? " 격침!" : " 손상"}`, "hit");
          if (s.hp <= 0) { s.alive = false; for (let k = 0; k < 14; k++) spray.spawn({ x: s.pos.x + gauss() * 20, y: 1, z: s.pos.z + gauss() * 20, vy: 4 + rnd() * 6, life: 6, s0: 6, s1: 20, a: 0.7, c: 0xd7e6ea }); smoke.spawn({ x: s.pos.x, y: 1, z: s.pos.z, life: 40, s0: 30, s1: 120, a: 0.35, c: 0x1c1c18 }); ctx.onSubKill?.(s); } }
        else ctx.log(`경어뢰 빗나감 — ${s.name} 회피`); continue; } }
    if (w.t > 70) O.lw.splice(i, 1); }
}

// ballistic missiles: launched far beyond the horizon, warned by early-warning satellites, fall steeply on the fleet
function ballisticWave(w, ctx) {
  const P = ctx.P, tg = [O.asset, ...usShips().filter((s) => s.spec.modern)].filter((s) => s && s.alive);
  for (let i = 0; i < w.n; i++) { const a = w.dir + (rnd() - 0.5) * 0.4, r = 150000; const pos = new THREE.Vector3(P.pos.x + Math.cos(a) * r, 400, P.pos.z + Math.sin(a) * r);
    const T = tg[i % 2 === 0 && O.asset?.alive ? 0 : (1 + i) % tg.length] || tg[0]; if (!T) return; const dir = T.pos.clone().sub(pos).setY(0).normalize();
    setTimeoutQ(i * 1.8, () => { const m = launch(phantom("foe", pos, dir.clone().multiplyScalar(900).setY(400)), "탄도미사일", T); if (m) { m.apex = 26000; m.bm = true; } }); }
  ctx.toast(`조기경보: 탄도미사일 ${w.n}발 발사 탐지 — 약 90초 후 낙하 (Space: 수동 요격)`, 5); ctx.log(`탄도미사일 ${w.n}발 발사 탐지 (조기경보 위성)`, "bad"); sfx.alarm?.();
}
function setTimeoutQ(t, fn) { pend.push({ t: O.t + t, fn }); }
function stepPend() { for (let i = pend.length - 1; i >= 0; i--) if (O.t >= pend[i].t) { const f = pend[i].fn; pend.splice(i, 1); f(); } }
// drone swarm: launched just past radar range, fans out, cruises at 120 m and dives on its target
function droneWave(w, ctx) {
  const P = ctx.P, dirs = w.dirs || 1, us = [O.asset, ...usShips()].filter((s) => s && s.alive); let k = 0;
  for (let d = 0; d < dirs; d++) { const a0 = w.dir + (d * TAU) / dirs + (rnd() - 0.5) * 0.5, n = Math.ceil(w.n / dirs);
    for (let i = 0; i < n; i++) { const a = a0 + (rnd() - 0.5) * 0.35, r = 11500 + rnd() * 2500, pos = new THREE.Vector3(P.pos.x + Math.cos(a) * r, 120, P.pos.z + Math.sin(a) * r);
      const T = us[(k++) % us.length], dir = T.pos.clone().sub(pos).setY(0).normalize(); setTimeoutQ(i * 0.7 + d * 2, () => launch(phantom("foe", pos, dir.multiplyScalar(60)), "자폭 드론", T)); } }
  for (let j = 0; j < (w.jets || 0); j++) { const a = w.dir + rnd() * TAU, pos = new THREE.Vector3(P.pos.x + Math.cos(a) * 16000, 200, P.pos.z + Math.sin(a) * 16000), T = us[j % us.length], dir = T.pos.clone().sub(pos).setY(0).normalize(); setTimeoutQ(4 + j * 1.5, () => launch(phantom("foe", pos, dir.multiplyScalar(160)), "제트 드론", T)); }
  ctx.toast(`드론 떼 ${w.n + (w.jets || 0)}기 접근 — ${dirs}개 방향${w.jets ? ` · 제트 드론 ${w.jets}기 포함` : ""}`, 4); ctx.log(`자폭 드론 ${w.n + (w.jets || 0)}기 탐지`, "bad"); sfx.alarm?.();
}
function stepDrones(dt) {
  stepPend();
  for (const m of M.list) { if (!m.alive || !m.W.drone) continue; const u = m.mesh.userData; if (u.prop) u.prop.rotation.x += dt * 90; const on = Math.floor((O.t + m.t) * 2) % 2 === 0; for (const l of u.lights || []) l.visible = on; }
}

// shore: guns shell the fleet and the landing craft; the anti-ship site fires every 80 s; landing craft go in from 50 s
function stepShore(dt, ctx) {
  const P = ctx.P;
  for (const t of O.targets) { if (!t.alive) continue; if (t.mesh.userData.spin) t.mesh.userData.spin.rotation.y += dt * 1.2; t.cd -= dt;
    if (t.kind === "gun" && t.cd <= 0) { t.cd = 7 + rnd() * 4; const tgt = [...O.boats.filter((b) => b.alive && !b.landed && dist2(b.pos, t.pos) < 7000), ...usShips().filter((s) => dist2(s.pos, t.pos) < 14000)][0];
      if (tgt) { const hit = rnd() < (tgt.boat ? 0.28 : 0.22); const p = tgt.pos.clone().add(new THREE.Vector3(gauss() * (hit ? 10 : 90), 0, gauss() * (hit ? 10 : 90)));
        flash.spawn({ x: t.pos.x, y: t.pos.y + 10, z: t.pos.z, life: 0.3, s0: 12, s1: 30, a: 1, c: 0xffc070 }); setTimeoutQ(dist2(p, t.pos) / 700, () => { spawnSplash(p.x, p.z, 0.45); if (hit) { if (tgt.boat) { tgt.hp -= 55; if (tgt.hp <= 0 && tgt.alive) { tgt.alive = false; O.lostBoats++; ctx.log("상륙정 피격 침몰!", "bad"); } } else tgt.damage(tgt.maxHp * 0.025); } }); } }
    if (t.kind === "ssm" && t.cd <= 0 && O.t > 30) { t.cd = 80; const T = usShips().filter((s) => s.spec.modern).sort((a, b) => dist2(a.pos, t.pos) - dist2(b.pos, t.pos))[0]; if (T && dist2(T.pos, t.pos) < 28000) { for (let k = 0; k < 2; k++) setTimeoutQ(k * 1.5, () => launch(phantom("foe", t.pos.clone().setY(t.pos.y + 20), T.pos.clone().sub(t.pos).setY(0).normalize().multiplyScalar(200).setY(60)), "해안 대함", T)); ctx.log("해안 대함미사일 발사!", "bad"); sfx.alarm?.(); } } }
  if (O.t > 50 && !O.boats.length) { for (let i = 0; i < 3; i++) { const toB = new THREE.Vector3(O.beach.x - P.pos.x, 0, O.beach.z - P.pos.z), L = toB.length(); toB.normalize(); const p = new THREE.Vector3(O.beach.x, 0, O.beach.z).addScaledVector(toB, -Math.min(L, 6500)).add(new THREE.Vector3(-toB.z * (i - 1) * 300, 0, toB.x * (i - 1) * 300)); const mesh = add(boatMesh()); O.boats.push({ boat: true, name: `상륙정 ${i + 1}`, pos: p, hp: 100, alive: true, mesh, landed: false }); } ctx.toast("상륙정 3척 발진 — 해안포를 먼저 침묵시켜라", 4); ctx.log("상륙정 3척 해안으로 발진", "hit"); }
  for (const b of O.boats) { if (!b.alive) { if (b.mesh.position.y > -10) b.mesh.position.y -= dt * 2; continue; } if (b.landed) continue; const d = dist2(b.pos, O.beach);
    if (d < 260) { b.landed = true; O.landed++; ctx.log(`${b.name} 해안 도착 — 상륙 성공`, "hit"); continue; }
    const k = Math.min(1, (11 * G.SPD * dt) / d); b.pos.x += (O.beach.x - b.pos.x) * k; b.pos.z += (O.beach.z - b.pos.z) * k; b.mesh.position.set(b.pos.x, 0.5, b.pos.z); b.mesh.rotation.y = -Math.atan2(O.beach.z - b.pos.z, O.beach.x - b.pos.x);
    if (rnd() < dt * 6) spray.spawn({ x: b.pos.x, y: 1, z: b.pos.z, life: 1.6, s0: 3, s1: 9, a: 0.5, c: 0xffffff }); }
}
/** a shell coming down near a shore target: damage by distance. Returns true if it hit land (no water splash then). */
export function opsShellLand(p, gun) {
  if (O.op !== "modern:shore") return false; let hit = false;
  for (const t of O.targets) { if (!t.alive) continue; const d = dist2(p, t.pos); if (d < 70) { hit = true; t.hp -= (d < 25 ? 34 : 18) * (gun?.cal ? Math.max(0.6, gun.cal / 127) : 1); if (t.hp <= 0) { t.alive = false; t.mesh.rotation.z = 0.5; t.mesh.position.y -= 6; for (let k = 0; k < 8; k++) smoke.spawn({ x: t.pos.x + gauss() * 10, y: t.pos.y, z: t.pos.z + gauss() * 10, vy: 8, life: 30, s0: 20, s1: 70, a: 0.5, c: 0x2a2826 }); O.msg = `${t.name} 파괴`; } } }
  if (landAt(p.x, p.z) || hit) { flash.spawn({ x: p.x, y: 20, z: p.z, life: 0.4, s0: 14, s1: 40, a: 1, c: 0xffb060 }); smoke.spawn({ x: p.x, y: 20, z: p.z, vy: 6, life: 6, s0: 14, s1: 46, a: 0.6, c: 0x6b5a48 }); return true; }
  return false;
}

// ── win / lose ───────────────────────────────────────────────────────────────
export function opsCheck() {
  const op = O.op; if (!op || op === "modern" || op === "modern:emcon") return undefined;
  const wavesDone = O.waves.every((w) => w.done) && !pend.length && !M.list.some((m) => m.alive && m.side === "foe");
  if (op === "modern:asw") return O.subs.every((s) => !s.alive) ? { won: true, why: `적 잠수함 ${O.subs.length}척 전부 격침` } : null;
  if (op === "modern:bmd" || op === "modern:drone") { if (O.asset && !O.asset.alive) return { won: false, why: "군수지원함 피격 침몰 — 방호 실패" }; return wavesDone ? { won: true, why: `${op === "modern:bmd" ? "탄도미사일" : "드론 떼"} 공격 ${O.waves.length}차례 모두 막아냄` } : null; }
  if (op === "modern:shore") { if (O.lostBoats >= 2) return { won: false, why: "상륙정 2척 상실 — 상륙 실패" }; const guns = O.targets.filter((t) => (t.kind === "gun" || t.kind === "ssm") && t.alive).length; return O.landed >= 2 && !guns ? { won: true, why: `해안 화력 침묵 · 상륙정 ${O.landed}척 상륙 성공` } : null; }
  if (op === "modern:convoy") { const alive = O.convoy.filter((c) => c.alive); if (alive.length < 2) return { won: false, why: "수송선단 괴멸" }; return alive.length && alive.every((c) => c.arrived) ? { won: true, why: `수송선 ${alive.length}척 집결지 도착` } : null; }
  return null;
}
/** markers for the HUD and the CIC map: submarine contacts, shore targets, landing craft, convoy goal */
/** one status line for the HUD: what to do and how it is going */
export function opsStatus(P) {
  const op = O.op; if (!op || op === "modern" || op === "modern:emcon") return null;
  const next = O.waves.find((w) => !w.done), done = O.waves.filter((w) => w.done).length, live = (f) => M.list.filter((m) => m.alive && m.side === "foe" && f(m)).length;
  const asset = O.asset ? ` · 지원함 ${O.asset.alive ? Math.round((O.asset.hp / O.asset.maxHp) * 100) : 0}%` : "";
  if (op === "modern:drone") return `드론 공격 ${done}/${O.waves.length} · 공중 드론 ${live((m) => m.W.drone)}${next ? ` · 다음 공격 ${Math.max(0, Math.ceil(next.t - O.t))}초` : ""}${asset}`;
  if (op === "modern:bmd") return `탄도미사일 공격 ${done}/${O.waves.length} · 비행 중 ${live((m) => m.W.alt === "ball")}${next ? ` · 다음 발사 ${Math.max(0, Math.ceil(next.t - O.t))}초` : ""}${asset}`;
  if (op === "modern:asw") return `적 잠수함 ${O.subs.filter((s) => s.alive).length}/${O.subs.length} · 접촉 ${O.subs.filter((s) => s.alive && s.det > 0).length} · 어뢰 접근 ${O.torps.filter((t) => t.target?.side === "us").length} · 대잠로켓 ${P.asw ?? 0}`;
  if (op === "modern:shore") { const g = O.targets.filter((t) => (t.kind === "gun" || t.kind === "ssm") && t.alive).length; return `해안포·미사일 진지 남음 ${g} · 상륙 ${O.landed}/3 · 상륙정 상실 ${O.lostBoats}`; }
  if (op === "modern:convoy") { const a = O.convoy.filter((c) => c.alive), lead = a.find((c) => !c.arrived); return `수송선 ${a.length}/3 · 도착 ${a.filter((c) => c.arrived).length}${lead ? ` · 집결지까지 ${(dist2(lead.pos, O.goal) / 1000).toFixed(1)} km` : ""} · 공중 드론 ${live((m) => m.W.drone)}`; }
  return null;
}
/** E: electronic jamming — drones within 7 km lose their link for a while; some crash. Returns how many were hit. */
export function jamDrones(P) { let n = 0; for (const m of M.list) if (m.alive && m.side === "foe" && m.W.drone && m.pos.distanceTo(P.pos) < 7000) { n++; m.jamT = 7 + rnd() * 4; if (rnd() < 0.25) { m.vel.y -= 25; m.crash = true; } } return n; }
export const opsDebug = () => ({ subs: O.subs.map((s) => ({ hp: s.hp, det: +s.det.toFixed(1), d: Math.round(Math.min(...usShips().map((u) => dist2(u.pos, s.pos)))), torps: s.torps })), torps: O.torps.length, lw: O.lw.length, buoys: O.buoys.length, targets: O.targets.map((t) => [t.name, Math.round(t.hp), Math.round(t.pos.y)]), boats: O.boats.map((b) => [b.alive, b.landed]), beach: O.beach });
export function opsMarks() {
  const out = [];
  for (const s of O.subs) if (s.alive && s.det > 0 && s.ep) out.push({ pos: s.ep, r: s.er, label: `${s.firm ? "◆" : "◇"} ${s.name}`, c: s.firm ? "#ff8a5c" : "#ffd166", kind: "sub" });
  for (const t of O.targets) out.push({ pos: t.pos, r: 0, label: t.alive ? t.name : `${t.name} (파괴)`, c: t.alive ? "#ff6b5e" : "#7d8a90", kind: "ground", hp: t.alive ? t.hp / (t.kind === "bunker" ? 140 : 100) : 0 });
  for (const b of O.boats) if (b.alive && !b.landed) out.push({ pos: b.pos, r: 0, label: b.name, c: "#8fd3ff", kind: "boat" });
  if (O.goal) out.push({ pos: new THREE.Vector3(O.goal.x, 0, O.goal.z), r: 700, label: "집결지", c: "#8ef07a", kind: "goal" });
  if (O.beach) out.push({ pos: new THREE.Vector3(O.beach.x, 0, O.beach.z), r: 260, label: "상륙 해안", c: "#8ef07a", kind: "goal" });
  return out;
}
export const nearestSubContact = (pos) => O.subs.filter((s) => s.alive && s.det > 0).sort((a, b) => dist2(a.ep, pos) - dist2(b.ep, pos))[0] || null;
