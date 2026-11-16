/**
 * Steel Tide — modern mode (현대전) phase 1: guided missiles and layered air defence.
 * Anti-ship missiles fly from VLS cells (boost, cruise sea-skimming / high, terminal sprint or ballistic dive) and home
 * on a ship; defenders detect them (skimmers late, over the radar horizon), assign long / medium / short-range
 * interceptors, point defence and CIWS, and can spoof them with decoys. Game ranges ≈ 1/15 of the real ones with the
 * order between weapons kept; defensive ranges are stretched so the layers stay visible.
 */
import { THREE, PI, clamp, rnd, gauss, G, scene, camera, smoke, flash, spray, spark, rings, spawnSplash } from "./core.js";
import { sfx, at } from "./audio.js";
import { hullHit, hitFX, jetMesh } from "./ships.js";

/** speed class: sub / sup / hyp. alt: skim | high | ball. v m/s, range m, dmg in ship hp. */
export const WPN = {
  "SM-6": { role: "sam", range: 30000, v: 1150, tier: "L", pk: { sub: 0.8, sup: 0.62, hyp: 0.4 } },
  "SM-2": { role: "sam", range: 18000, v: 1000, tier: "M", pk: { sub: 0.75, sup: 0.5, hyp: 0.18 } },
  "ESSM": { role: "sam", range: 9000, v: 1150, tier: "S", pk: { sub: 0.75, sup: 0.55, hyp: 0.15 } },
  "K-SAAM": { role: "sam", range: 8000, v: 1050, tier: "S", pk: { sub: 0.72, sup: 0.5, hyp: 0.12 } },
  "HHQ-9": { role: "sam", range: 26000, v: 1150, tier: "L", pk: { sub: 0.78, sup: 0.58, hyp: 0.3 } },
  "HHQ-16": { role: "sam", range: 10000, v: 1000, tier: "S", pk: { sub: 0.72, sup: 0.5, hyp: 0.12 } },
  "함대공(추정)": { role: "sam", range: 12000, v: 950, tier: "M", pk: { sub: 0.62, sup: 0.4, hyp: 0.08 } },
  SeaRAM: { role: "pd", range: 3200, v: 750, pk: { sub: 0.7, sup: 0.55, hyp: 0.2 } },
  RAM: { role: "pd", range: 3200, v: 750, pk: { sub: 0.7, sup: 0.55, hyp: 0.2 } },
  "HQ-10": { role: "pd", range: 3000, v: 750, pk: { sub: 0.68, sup: 0.5, hyp: 0.18 } },
  "판치르-M": { role: "pd", range: 3500, v: 900, pk: { sub: 0.62, sup: 0.45, hyp: 0.12 } },
  MST: { role: "asm", name: "해상타격 토마호크", range: 40000, v: 250, cls: "sub", alt: "skim", dmg: 38 },
  NSM: { role: "asm", name: "NSM", range: 15000, v: 270, cls: "sub", alt: "skim", dmg: 30, stealth: 0.7 },
  "17식": { role: "asm", name: "17식 함대함", range: 27000, v: 300, cls: "sub", alt: "skim", dmg: 34 },
  "해성": { role: "asm", name: "해성", range: 24000, v: 290, cls: "sub", alt: "skim", dmg: 32 },
  LRASM: { role: "asm", name: "LRASM", range: 30000, v: 250, cls: "sub", alt: "skim", dmg: 40, stealth: 0.6 },
  JSM: { role: "asm", name: "JSM", range: 26000, v: 260, cls: "sub", alt: "skim", dmg: 32, stealth: 0.6 },
  "YJ-83K": { role: "asm", name: "YJ-83K", range: 20000, v: 290, cls: "sub", alt: "skim", dmg: 30 },
  "금성-3": { role: "asm", name: "금성-3", range: 16000, v: 270, cls: "sub", alt: "skim", dmg: 28 },
  "AIM-120": { role: "aam", range: 16000, v: 1200, pk: { jet: 0.62, sub: 0.3 } },
  "PL-12": { role: "aam", range: 15000, v: 1150, pk: { jet: 0.58, sub: 0.3 } },
  "R-27": { role: "aam", range: 12000, v: 1000, pk: { jet: 0.45, sub: 0.2 } },
  "YJ-18": { role: "asm", name: "YJ-18", range: 34000, v: 260, sprint: 850, cls: "sup", alt: "skim", dmg: 38 },
  "YJ-21": { role: "asm", name: "YJ-21", range: 40000, v: 1900, cls: "hyp", alt: "ball", dmg: 48 },
  "초음속 대함": { role: "asm", name: "초음속 대함(개발형)", range: 25000, v: 300, sprint: 880, cls: "sup", alt: "skim", dmg: 40 },
  "초음속 순항": { role: "asm", name: "초음속 순항미사일", range: 20000, v: 290, sprint: 800, cls: "sup", alt: "skim", dmg: 36 },
  "순항미사일": { role: "asm", name: "순항미사일", range: 16000, v: 260, cls: "sub", alt: "skim", dmg: 30 },
};
/** 1 up to 3 missiles arriving together; above that every extra missile cuts each intercept's odds (radars and launchers saturate). */
export const satK = (side) => 1 / (1 + 0.14 * Math.max(0, (M.sat?.[side] || 0) - 3));
export const M = { list: [], decoys: [], helos: [], jets: [], flares: [], cam: null };
// expendables per jet (flare + chaff cartridges, game counts). Public figures: ALE-47 buckets hold 30 cartridges each; an F-16 Block 50 can carry up to 60 flares,
// Hornet/Super Hornet dispensers about 60 cartridges. F-35, J-15 loads are not public — the numbers here are estimates.
export const FLARES = { "F/A-18E": 60, "F-35B": 48, "F-35B (가정)": 48, "J-15": 48, "MiG-29 (지상 발진)": 30 };
export const flaresOf = (type) => FLARES[type] ?? 40;
/** sensor ranges (game scale): ship radar vs surface ships, ESM intercept of a radiating ship, eyes, helicopter radar, EO/IR when not radiating, missile seeker */
export const SENS = { surf: 13000, esm: 28000, vis: 7000, helo: 12000, eo: 4000, seek: 9000 };
const TR_MAX = 1400, trGeo = new THREE.BufferGeometry();
trGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TR_MAX * 6), 3)); trGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(TR_MAX * 6), 3)); trGeo.setDrawRange(0, 0);
{ const l = new THREE.LineSegments(trGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false })); l.frustumCulled = false; scene.add(l); }
const BODY = new THREE.CylinderGeometry(0.22, 0.22, 4.6, 10); BODY.rotateZ(-PI / 2);
const NOSE = new THREE.ConeGeometry(0.22, 0.95, 10); NOSE.rotateZ(-PI / 2); NOSE.translate(2.76, 0, 0);
const SEEKER = new THREE.ConeGeometry(0.11, 0.34, 8); SEEKER.rotateZ(-PI / 2); SEEKER.translate(3.08, 0, 0);
const FIN = new THREE.BoxGeometry(0.64, 0.04, 1.15);
const CANARD = new THREE.BoxGeometry(0.75, 0.03, 0.68);
const NOZ = new THREE.CylinderGeometry(0.2, 0.16, 0.28, 8); NOZ.rotateZ(-PI / 2);
const MATS = { us: new THREE.MeshStandardMaterial({ color: 0xe9ecec, roughness: 0.45, metalness: 0.2 }), foe: new THREE.MeshStandardMaterial({ color: 0x9aa2a6, roughness: 0.45, metalness: 0.2 }),
  tip: new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.3, metalness: 0.6 }),
  fire: new THREE.MeshBasicMaterial({ color: 0xffa84c, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  core: new THREE.MeshBasicMaterial({ color: 0xfff8dc, transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending, depthWrite: false }) };
const FLAME = new THREE.ConeGeometry(0.32, 2.2, 10); FLAME.rotateZ(PI / 2); FLAME.translate(-1.1, 0, 0);
const FLAME_CORE = new THREE.ConeGeometry(0.16, 1.25, 8); FLAME_CORE.rotateZ(PI / 2); FLAME_CORE.translate(-0.62, 0, 0);
const SHOCK_RING = new THREE.TorusGeometry(0.14, 0.025, 6, 12); SHOCK_RING.rotateY(PI / 2);
const TAIL_GLOW = new THREE.SphereGeometry(0.24, 8, 6);
export const hooks = {}; // filled by ops.js (drone meshes) — avoids a circular import
function mesh(W, side, sc) {
  if (W.drone && hooks.droneMesh) { const d = hooks.droneMesh(W.drone); scene.add(d); return d; }
  const g = new THREE.Group(), m = MATS[side === "us" ? "us" : "foe"]; g.add(new THREE.Mesh(BODY, m)); g.add(new THREE.Mesh(NOSE, m)); g.add(new THREE.Mesh(SEEKER, MATS.tip));
  const noz = new THREE.Mesh(NOZ, MATS.tip); noz.position.x = -2.38; g.add(noz);
  for (const r of [0, PI / 2]) { const f = new THREE.Mesh(FIN, m); f.position.x = -1.9; f.rotation.x = r; g.add(f); const c = new THREE.Mesh(CANARD, m); c.position.x = 0.6; c.rotation.x = r + PI / 4; g.add(c); }
  const fl = new THREE.Mesh(FLAME, MATS.fire); fl.position.x = -2.48; fl.scale.set(1.3, 0.9, 0.9); g.add(fl); g.userData.fl = fl;
  const flCore = new THREE.Mesh(FLAME_CORE, MATS.core); flCore.position.x = -2.48; flCore.scale.set(1.2, 0.85, 0.85); g.add(flCore); g.userData.flCore = flCore;
  const tg = new THREE.Mesh(TAIL_GLOW, MATS.fire); tg.position.x = -2.52; g.add(tg);
  const sd1 = new THREE.Mesh(SHOCK_RING, MATS.core); sd1.position.x = -2.85; sd1.scale.setScalar(1.0); g.add(sd1);
  const sd2 = new THREE.Mesh(SHOCK_RING, MATS.core); sd2.position.x = -3.28; sd2.scale.setScalar(0.72); g.add(sd2);
  g.scale.setScalar(sc); scene.add(g); return g;
}
const X = new THREE.Vector3(1, 0, 0), tmp = new THREE.Vector3();
/** world position of a VLS hatch on the ship (picks an actual 3D cell when present, opens hatch & ignites well glow) */
function hatch(S, W, tgt) {
  S.tilt.updateWorldMatrix(true, false);
  const cells = S.vlsCells;
  if (cells && cells.length) {
    const preferFore = W?.role === "sam";
    let pool = cells.filter((c) => c.state === "loaded" && (preferFore ? c.fore : !c.fore));
    if (!pool.length) pool = cells.filter((c) => c.state === "loaded");
    const cell = pool.length ? pool[Math.floor(rnd() * pool.length)] : cells.slice().sort((a, b) => a.t - b.t)[0];
    cell.state = "firing"; cell.t = 7.5; cell.open = 1; cell.glowA = 1;
    cell.lid.rotation.z = 1.48; cell.glow.visible = true; cell.glowMat.opacity = 1; cell.msl.visible = false;
    return S.tilt.localToWorld(new THREE.Vector3(cell.cx, cell.cy + 0.15, cell.cz));
  }
  const xs = S.vlsX || [S.spec.L * 0.26, -S.spec.L * 0.32];
  return S.tilt.localToWorld(new THREE.Vector3(xs[rnd() < 0.5 ? 0 : 1] + gauss() * 1.5, S.spec.fb + 1.2, gauss() * 1.2));
}
function aimPdMount(S, pd, tPos) {
  S.tilt.updateWorldMatrix(true, false);
  const loc = S.tilt.worldToLocal(tPos.clone()), dx = loc.x - pd.x, dy = loc.y - pd.y, dz = loc.z - pd.z;
  pd.yawGrp.rotation.y = -Math.atan2(dz, dx);
  pd.elGrp.rotation.z = clamp(Math.atan2(dy, Math.hypot(dx, dz)), 0.04, 1.35);
}
export function syncJetPylons(j) {
  const pm = j.mesh?.userData?.pylonMsls; if (!pm) return;
  if (pm.aam[0]) pm.aam[0].visible = (j.aam || 0) >= 1;
  if (pm.aam[1]) pm.aam[1].visible = (j.aam || 0) >= 2;
  if (pm.asm[0]) pm.asm[0].visible = (j.asm || 0) >= 1;
  if (pm.asm[1]) pm.asm[1].visible = (j.asm || 0) >= 2;
}
export function launch(S, key, target) {
  const W = WPN[key]; if (!W) return null;
  let p, vel0, canLaunch = false, qInit = null;
  if (W.role === "pd") {
    const pd = S.pdMounts?.length ? S.pdMounts[rnd() < 0.5 || S.pdMounts.length === 1 ? 0 : 1] : null;
    if (pd) {
      if (target) aimPdMount(S, pd, target.pos);
      const tip = pd.tips.find((tp) => tp.cd <= 0); if (tip) { tip.m.visible = false; tip.cd = 8.0; }
      pd.elGrp.updateWorldMatrix(true, false);
      p = pd.elGrp.localToWorld(new THREE.Vector3(1.6, 0, 0));
    } else p = S.pos.clone().add(new THREE.Vector3(0, S.spec.fb + 10, 0));
    vel0 = target ? target.pos.clone().sub(p).normalize().multiplyScalar(300) : new THREE.Vector3(gauss() * 3, 80, gauss() * 3);
  } else if (S.isJet) {
    syncJetPylons(S);
    const sgn = ((S.aam || 0) + (S.asm || 0)) % 2 ? 1 : -1;
    S.mesh.updateWorldMatrix(true, false);
    p = S.mesh.localToWorld(new THREE.Vector3(W.role === "asm" ? -1.2 : -3.35, W.role === "asm" ? -0.55 : -0.1, sgn * (W.role === "asm" ? 2.8 : 6.95)));
    vel0 = S.vel.clone();
  } else if (W.role === "asm" && W.cls === "sub" && S.canRacks?.length && S.canRacks.some((r) => r.state === "loaded")) {
    let pool = S.canRacks.filter((r) => r.state === "loaded");
    if (target) {
      const f = S.fwd, sideTgt = (target.pos.x - S.pos.x) * (-f.z) + (target.pos.z - S.pos.z) * f.x >= 0 ? 1 : -1;
      const sided = pool.filter((r) => r.side === sideTgt); if (sided.length) pool = sided;
    }
    const can = pool[0];
    can.state = "reloading"; can.t = 8.0; can.msl.visible = false; can.cap.rotation.z = 1.35;
    can.rack.updateWorldMatrix(true, false);
    p = can.rack.localToWorld(new THREE.Vector3(2.8, 0, 0));
    const pRear = can.rack.localToWorld(new THREE.Vector3(-2.6, 0, 0));
    const dir = can.rack.localToWorld(new THREE.Vector3(3.8, 0, 0)).sub(p).normalize();
    vel0 = dir.clone().multiplyScalar(92); canLaunch = true; qInit = dir.clone();
    // Canister rear backblast flame, sparks & exhaust cloud
    flash.spawn({ x: pRear.x, y: pRear.y, z: pRear.z, life: 0.36, s0: 3.6, s1: 10.5, a: 0.96, c: 0xffb858 });
    for (let k = 0; k < 6; k++) spark.spawn({ x: pRear.x, y: pRear.y, z: pRear.z, vx: -dir.x * (24 + rnd() * 14) + gauss() * 4, vy: -dir.y * 24 + 4 + rnd() * 6, vz: -dir.z * (24 + rnd() * 14) + gauss() * 4, g: 9.8, life: 0.65, s0: 1.4, s1: 0.35, a: 0.95, c: k % 2 ? 0xffa040 : 0xffe49e });
    for (let k = 0; k < 6; k++) smoke.spawn({ x: pRear.x + gauss() * 0.6, y: pRear.y + gauss() * 0.6, z: pRear.z + gauss() * 0.6, vx: -dir.x * (9 + rnd() * 5) + gauss() * 1.5, vy: 2 + rnd() * 3, vz: -dir.z * (9 + rnd() * 5) + gauss() * 1.5, life: 3.6, s0: 2.2, s1: 10, a: 0.62, c: 0xdcd8cf });
  } else {
    p = hatch(S, W, target);
    vel0 = new THREE.Vector3(gauss() * 3, 70, gauss() * 3);
  }
  const mMesh = mesh(W, S.side, W.role === "asm" ? 1.25 : W.role === "pd" ? 0.7 : 1);
  mMesh.position.copy(p);
  if (qInit) mMesh.quaternion.setFromUnitVectors(X, qInit);
  else if (vel0.lengthSq() > 0.1) mMesh.quaternion.setFromUnitVectors(X, tmp.copy(vel0).normalize());
  const m = { key, W, side: S.side, owner: S, target, pos: p, air: !!S.isJet, canLaunch, vel: vel0, t: 0, dist: 0, alive: true, engaged: 0, trail: [p.clone()], trT: 0,
    mesh: mMesh, apex: W.alt === "ball" ? 9000 : 0 };
  M.list.push(m);
  flash.spawn({ x: p.x, y: p.y + (canLaunch ? 0.4 : 2), z: p.z, life: 0.45, s0: W.role === "pd" ? 4.5 : 8, s1: W.role === "pd" ? 10 : 18, a: 1, c: 0xffd078 });
  if (W.role !== "pd" && !S.isJet && !canLaunch) rings.spawn({ x: p.x, z: p.z, w0: 2.5, l0: 2.5, w1: 18, l1: 18, life: 0.9, a: 0.55 });
  if (W.role !== "pd") for (let i = 0; i < 8; i++) spark.spawn({ x: p.x + gauss(), y: p.y + 1, z: p.z + gauss(), vx: gauss() * 16, vy: 12 + rnd() * 26, vz: gauss() * 16, g: 12, life: 0.85, s0: 1.8, s1: 0.5, a: 1, c: i % 2 ? 0xffa644 : 0xffe49e });
  for (let i = 0; i < (W.role === "pd" ? 3 : 13); i++) smoke.spawn({ x: p.x + gauss() * 1.4, y: p.y + rnd() * 3.5, z: p.z + gauss() * 1.4, vx: gauss() * 2.8, vy: 4 + rnd() * 7, vz: gauss() * 2.8, life: 5.2, s0: 3.5, s1: 17, a: 0.74, c: i % 2 ? 0xeae6dc : 0xc8c4ba });
  const d = p.distanceTo(camera.position); at(d, () => (m.air || W.role === "asm" ? (d < 6000 ? sfx.mslLaunch(d) : sfx.flak(d)) : d < 2500 ? sfx.torpLaunch() : sfx.flak(d)));
  return m;
}
/** Can side `side` see this missile? sea-skimmers only inside the radar horizon of one of their ships. */
export function seen(m, side) {
  if (m.side === side) return true;
  const skim = m.W.alt === "skim", st = m.W.stealth || 1;
  for (const S of G.ships) if (S.alive && S.side === side && S.spec.modern) { const R = S.radarOn === false ? SENS.eo : skim ? 13000 * st : 48000; if (S.pos.distanceToSquared(m.pos) < R * R) return true; }
  for (const h of [...M.helos, ...M.jets]) if (h.alive && h.side === side) { const R = skim ? 16000 * st : 30000; if (h.pos.distanceToSquared(m.pos) < R * R) return true; } // an airborne radar sees over the horizon
  return false;
}
export function killMissile(m, how = "boom") { kill(m, how); }
function kill(m, how) {
  m.alive = false; scene.remove(m.mesh); if (M.cam === m) M.camEnd = 1.2;
  if (how === "air") { flash.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, life: 0.4, s0: 8, s1: 22, a: 1, c: 0xff9a3a }); for (let i = 0; i < 8; i++) spark.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, vx: gauss() * 30, vy: gauss() * 20, vz: gauss() * 30, g: 9.8, life: 1.6, s0: 1.6, s1: 0.6, a: 1, c: 0xffb050 });
    smoke.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, life: 5, s0: 6, s1: 22, a: 0.6, c: 0x333333 }); const d = m.pos.distanceTo(camera.position); at(d, () => sfx.flak(d)); }
  else if (how === "boom") { // an intercepted missile or a downed aircraft: fireball, burning debris, smoke trail, a bang you hear
    const p = m.pos, big = m.isJet ? 1.4 : 1;
    for (let i = 0; i < 4; i++) flash.spawn({ x: p.x + gauss() * 4, y: p.y + gauss() * 3, z: p.z + gauss() * 4, life: 0.5 + i * 0.12, s0: 10 * big, s1: (34 + i * 8) * big, a: 1, c: i ? 0xff7a20 : 0xfff0c0 });
    for (let i = 0; i < 22; i++) spark.spawn({ x: p.x, y: p.y, z: p.z, vx: gauss() * 45, vy: gauss() * 30 + 10, vz: gauss() * 45, g: 9.8, life: 1.6 + rnd() * 1.4, s0: 2.4, s1: 0.7, a: 1, c: rnd() < 0.5 ? 0xffb050 : 0xff6a20 });
    for (let i = 0; i < 5; i++) smoke.spawn({ x: p.x + gauss() * 5, y: p.y + gauss() * 4, z: p.z + gauss() * 5, vy: 2, life: 8, s0: 10 * big, s1: 36 * big, a: 0.7, c: 0x2a2a2a });
    if (p.y < 65) {
      rings.spawn({ x: p.x, z: p.z, w0: 8, l0: 8, w1: 68 * big, l1: 68 * big, life: 1.6, a: 0.62, c: 0xdff4ff, ease: 3 });
      if (p.y < 28) spawnSplash(p.x, p.z, 0.45 * big);
    }
    const d = p.distanceTo(camera.position); at(d, () => (d < 9000 ? sfx.explode(d) : sfx.flak(d))); G.onIntercept?.(m);
  }
  else if (how === "sea") spawnSplash(m.pos.x, m.pos.z, 0.5);
}
function lead(m, T, spd) { const d = m.pos.distanceTo(T.pos), tg = d / Math.max(spd, 1); return tmp.copy(T.vel || new THREE.Vector3()).multiplyScalar(Math.min(tg, 30)).add(T.pos); }
function steer(m, aim, dt, rate) { const want = aim.clone().sub(m.pos).normalize(), v = m.vel.length(), cur = m.vel.clone().normalize(); cur.lerp(want, clamp(rate * dt, 0, 1)).normalize(); m.vel.copy(cur.multiplyScalar(v)); }
const enemiesOf = (side) => G.ships.filter((s) => s.alive && s.side !== side && s.spec.modern);
/** onHit(ship, m) lets the game score and log. */
export function stepMissiles(dt, onHit) {
  const tp = trGeo.attributes.position.array, tc = trGeo.attributes.color.array; let n = 0;
  // saturation: how many anti-ship missiles each side has inside 9 km of their targets right now
  M.sat = { us: 0, foe: 0 }; for (const m of M.list) if (m.alive && m.W.role === "asm" && m.target && m.pos.distanceToSquared(m.target.pos) < 8.1e7) M.sat[m.side]++;
  for (let i = M.list.length - 1; i >= 0; i--) {
    const m = M.list[i];
    if (!m.alive) { M.list.splice(i, 1); continue; }
    const W = m.W; m.t += dt;
    const boost = W.role !== "pd" && !m.air && !m.canLaunch && m.t < 1.1;
    const canRail = m.canLaunch && m.t < 0.72;
    if (boost) {
      m.vel.y = Math.min(m.vel.y + 160 * dt, 160);
      if (rnd() < dt * 34) smoke.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, vx: gauss() * 2.5, vy: -5, vz: gauss() * 2.5, life: 2.6, s0: 2.4, s1: 9.5, a: 0.56, c: 0xdedad0 });
      if (rnd() < dt * 24) spark.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, vx: gauss() * 8, vy: -18 - rnd() * 14, vz: gauss() * 8, g: 9.8, life: 0.45, s0: 1.5, s1: 0.4, a: 1, c: 0xffc864 });
    } else if (canRail) {
      m.vel.addScaledVector(tmp.copy(m.vel).normalize(), 110 * dt);
      if (rnd() < dt * 30) smoke.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, vx: gauss() * 2, vy: 2, vz: gauss() * 2, life: 2.2, s0: 2.0, s1: 8, a: 0.5, c: 0xe6e2d8 });
    } else {
      if (W.role !== "pd" && !m.air && !m.boostDone) {
        m.boostDone = true;
        flash.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, life: 0.3, s0: 4.5, s1: 12, a: 0.98, c: 0xffc668 });
        for (let k = 0; k < 7; k++) spark.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, vx: gauss() * 24, vy: -10 - rnd() * 16, vz: gauss() * 24, g: 9.8, life: 0.95, s0: 1.6, s1: 0.45, a: 1, c: k % 2 ? 0xff9a3a : 0xffe49e });
        smoke.spawn({ x: m.pos.x, y: m.pos.y - 2, z: m.pos.z, vy: -8, life: 3.0, s0: 2.4, s1: 9, a: 0.45, c: 0xbcb8b0 });
        const bd = m.pos.distanceTo(camera.position); if (bd < 2500) at(bd, () => sfx.sonicFlyby?.(bd, false));
      }
      const want = W.role === "asm" ? (W.sprint && m.target && m.pos.distanceTo(m.target.pos) < 7000 ? W.sprint : W.v) : W.v;
      const v = m.vel.length(); m.vel.setLength(v + (want - v) * Math.min(1, dt * (W.role === "asm" ? 0.8 : 2.5)));
      if (W.role === "asm") {
        if (m.jamT > 0) m.jamT -= dt;
        let T = m.jamT > 0 ? null : m.decoy || m.target;
        if (!m.decoy && !m.est && !(m.jamT > 0) && (!T || !T.alive)) { const c = enemiesOf(m.side).sort((a, b) => a.pos.distanceToSquared(m.pos) - b.pos.distanceToSquared(m.pos))[0]; m.target = T = c && c.pos.distanceTo(m.pos) < 12000 ? c : null; }
        if (m.est && !m.decoy) { // fired at an estimated position: fly there, then switch the seeker on and take the nearest ship it finds
          if (m.pos.distanceTo(m.est) > SENS.seek * 0.7) T = { pos: m.est, vel: null };
          else { m.est = null; const c = enemiesOf(m.side).filter((s) => s.pos.distanceTo(m.pos) < SENS.seek).sort((a, b) => a.pos.distanceToSquared(m.pos) - b.pos.distanceToSquared(m.pos))[0]; m.target = T = c || null; m.seekMiss = !c; }
        }
        if (T) {
          const aim = lead(m, T, m.vel.length()).clone(), d = m.pos.distanceTo(T.pos);
          if (W.alt === "skim") aim.y = d > 2500 ? 9 : 4;
          else if (W.alt === "drone") aim.y = d > 1600 ? 120 : 3;
          else if (W.alt === "ball") { const frac = clamp(m.dist / Math.max(1, m.dist + d), 0, 1); aim.y = d > 6000 ? Math.max(200, m.apex * Math.sin(Math.PI * Math.min(frac + 0.15, 1))) : 0; }
          steer(m, aim, dt, W.alt === "ball" ? 0.9 : d < 3000 ? 2.4 : 1.1);
          if (W.alt === "skim" && m.pos.y < 3) m.vel.y = Math.max(m.vel.y, 2);
        }
        const h = m.pos.y < 40 ? hullHit(m.pos, null) : null;
        if (h && h.ship.side !== m.side && h.ship.alive) { impact(m, h.ship, h.lx, onHit); continue; }
        if (m.decoy && m.pos.distanceTo(m.decoy.pos) < 45) { kill(m, "sea"); continue; }
      } else {
        const T = m.target;
        if (!T || !T.alive) { m.lost = (m.lost || 0) + dt; if (m.lost > 1.2) { kill(m, "air"); continue; } }
        else {
          steer(m, lead(m, T, m.vel.length()).clone(), dt, 5);
          if (m.pos.distanceTo(T.pos) < 32) { const ok = rnd() < (W.pk[T.W.cls] ?? (T.isJet ? 0.3 : 0.55)) * (T.isJet ? 1 : satK(T.side)) * (T.isJet ? (T.pilot ? 0.55 * (T.flareT > 0 ? 0.4 : 1) * (T.gT > 0 ? 0.65 : 1) : 1) : 0.45); T.engaged = Math.max(0, T.engaged - 1); kill(m, "air");
            if (ok && T.pilot && !T.hit) { T.hit = true; G.onJetHit?.(T); } // the aircraft you fly survives the first hit, damaged
            else if (ok) { T.killedBy = m.owner; kill(T, "boom"); } continue; } // jets jink and jam; no layer is a sure kill
        }
      }
    }
    m.pos.addScaledVector(m.vel, dt); m.dist += m.vel.length() * dt;
    const mSpd = m.vel.length(), fast = W.cls === "hyp" || (W.sprint && mSpd > W.v * 1.15);
    if (!m.flybySfx && m.t > 0.35 && m.pos.distanceTo(camera.position) < 420) { m.flybySfx = true; sfx.sonicFlyby?.(m.pos.distanceTo(camera.position), mSpd > 340); }
    if (W.sprint && !m.sprintFX && mSpd > W.v * 1.15) {
      m.sprintFX = true;
      flash.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, life: 0.22, s0: 5, s1: 15, a: 0.72, c: 0xdff6ff });
      for (let k = 0; k < 5; k++) spray.spawn({ x: m.pos.x + gauss() * 2, y: m.pos.y + gauss() * 2, z: m.pos.z + gauss() * 2, vx: gauss() * 6, vy: gauss() * 6, vz: gauss() * 6, life: 0.5, s0: 3, s1: 11, a: 0.55, c: 0xf0f8ff });
    }
    if (W.cls === "hyp" && mSpd > 900 && rnd() < dt * 26) {
      flash.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, life: 0.14, s0: 3.2, s1: 7.5, a: 0.75, c: 0xffb868 });
      spark.spawn({ x: m.pos.x + gauss() * 0.8, y: m.pos.y + gauss() * 0.8, z: m.pos.z + gauss() * 0.8, vx: gauss() * 14, vy: gauss() * 14, vz: gauss() * 14, life: 0.35, s0: 1.5, s1: 0.4, a: 0.9, c: 0xffd27a });
    }
    if (!m.machFX && mSpd > 620) {
      m.machFX = true;
      for (let k = 0; k < 5; k++) smoke.spawn({ x: m.pos.x + gauss() * 2, y: m.pos.y + gauss() * 2, z: m.pos.z + gauss() * 2, vx: gauss() * 5, vy: gauss() * 5, vz: gauss() * 5, life: 0.65, s0: 4.5, s1: 16, a: 0.52, c: 0xf2f8ff });
    }
    if (W.alt === "ball" && m.vel.y < -80 && rnd() < dt * 24) {
      flash.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, life: 0.12, s0: 3.6, s1: 8.5, a: 0.8, c: 0xff9840 });
    }
    if (!boost && m.air && m.t < 2.2 && rnd() < dt * 24) {
      smoke.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, vx: gauss() * 1.5, vy: gauss() * 1.5, vz: gauss() * 1.5, life: 1.8, s0: 1.4, s1: 5.5, a: 0.42, c: 0xefefef });
    }
    if (W.role === "asm" && W.alt === "skim" && !boost && m.pos.y < 14) {
      if (rnd() < dt * 26) spray.spawn({ x: m.pos.x + gauss() * 1.5, y: 0.8, z: m.pos.z + gauss() * 1.5, vx: gauss() * 4, vy: 4 + rnd() * 7, vz: gauss() * 4, life: 0.75, s0: 2.2, s1: 8.5, a: 0.54, c: 0xeaf4f8 });
      if (mSpd > 240 && rnd() < dt * 16) smoke.spawn({ x: m.pos.x + gauss() * 1.4, y: 1.4, z: m.pos.z + gauss() * 1.4, vx: gauss() * 3, vy: 1.8, vz: gauss() * 3, life: 1.3, s0: 2.0, s1: 7.5, a: 0.34, c: 0xeaf4fa });
      if (rnd() < dt * 7) rings.spawn({ x: m.pos.x, z: m.pos.z, w0: 3, l0: 3, w1: 17, l1: 17, life: 1.4, a: 0.38 });
    }
    if (m.pos.y < 0.5 && !boost) { kill(m, "sea"); continue; }
    if (m.dist > W.range * (W.role === "asm" ? 1.15 : 1.3)) { if (W.role === "asm") { m.vel.y -= 30 * dt; } else { kill(m, "air"); continue; } }
    m.mesh.position.copy(m.pos); m.mesh.quaternion.setFromUnitVectors(X, tmp.copy(m.vel).normalize());
    if (m.mesh.userData.fl) {
      const fx = (fast ? 2.2 : 1.25) + Math.random() * 0.75, fy = fast ? 1.25 : 0.95;
      m.mesh.userData.fl.scale.set(fx, fy, fy);
      if (m.mesh.userData.flCore) m.mesh.userData.flCore.scale.set(fx * 0.92, fy * 0.9, fy * 0.9);
    }
    m.trT -= dt; if (m.trT <= 0 && !W.drone) { m.trT = 0.085; m.trail.push(m.pos.clone()); if (m.trail.length > (W.role === "asm" ? 44 : 20)) m.trail.shift(); }
    const c = m.side === "us" ? (W.role === "asm" ? [0.95, 0.95, 0.95] : [0.65, 0.85, 1]) : (W.cls === "hyp" ? [1, 0.72, 0.38] : [1, 0.55, 0.45]);
    for (let j = 0; j + 1 < m.trail.length && n < TR_MAX; j++) { const a = m.trail[j], b = m.trail[j + 1]; tp.set([a.x, a.y, a.z, b.x, b.y, b.z], n * 6); tc.set([...c, ...c], n * 6); n++; }
    if (n < TR_MAX && m.trail.length) { const a = m.trail[m.trail.length - 1]; tp.set([a.x, a.y, a.z, m.pos.x, m.pos.y, m.pos.z], n * 6); tc.set([...c, ...c], n * 6); n++; }
  }
  trGeo.setDrawRange(0, n * 2); trGeo.attributes.position.needsUpdate = true; trGeo.attributes.color.needsUpdate = true;
  for (let i = M.decoys.length - 1; i >= 0; i--) {
    const d = M.decoys[i]; d.t -= dt;
    if (d.t <= 0) { M.decoys.splice(i, 1); continue; }
    if (rnd() < dt * 3.5) flash.spawn({ x: d.pos.x + gauss() * 14, y: d.pos.y + rnd() * 24, z: d.pos.z + gauss() * 14, life: 0.28, s0: 2, s1: 5.5, a: 0.88, c: 0xfff0c0 });
    if (rnd() < dt * 14) spark.spawn({ x: d.pos.x + gauss() * 22, y: Math.max(4, d.pos.y + gauss() * 12), z: d.pos.z + gauss() * 22, vx: gauss() * 3, vy: -1.5 + rnd() * 3, vz: gauss() * 3, life: 0.48, s0: 1.4, s1: 0.3, a: 0.85, c: rnd() < 0.7 ? 0xe8f4ff : 0xffe096 });
    if (d.t > 8 && rnd() < dt * 2.5) smoke.spawn({ x: d.pos.x + gauss() * 18, y: 12 + rnd() * 22, z: d.pos.z + gauss() * 18, vx: gauss() * 1.4, vy: 0.6, vz: gauss() * 1.4, life: 4.5, s0: 8, s1: 22, a: 0.24, c: 0xd8e2ea });
  }
}
function impact(m, S, lx, onHit) {
  const W = m.W; kill(m, "hit"); const p = m.pos.clone(); hitFX(p, 1.1);
  rings.spawn({ x: p.x, z: p.z, w0: 8, l0: 8, w1: 72, l1: 72, life: 1.8, a: 0.52 });
  if (p.y < 22) for (let i = 0; i < 8; i++) spray.spawn({ x: p.x + gauss() * 4, y: 1.5, z: p.z + gauss() * 4, vx: gauss() * 10, vy: 12 + rnd() * 20, vz: gauss() * 10, life: 1.2, s0: 3.5, s1: 13, a: 0.58, c: 0xe8f2f8 });
  for (let i = 0; i < 30; i++) spark.spawn({ x: p.x, y: p.y + 2, z: p.z, vx: gauss() * 25, vy: 10 + rnd() * 30, vz: gauss() * 25, g: 9.8, life: 2.4, s0: 2.6, s1: 0.8, a: 1, c: 0xffa040 });
  for (let i = 0; i < 6; i++) smoke.spawn({ x: p.x + gauss() * 3, y: p.y + 3, z: p.z + gauss() * 3, vy: 6, life: 10, s0: 8, s1: 30, a: 0.75, c: 0x1e1e1e });
  const d = p.distanceTo(camera.position); at(d, () => sfx.explode(d)); if (S.isPlayer) G.shake = 2;
  const n = W.dmg * (0.85 + rnd() * 0.3) * (W.cls === "hyp" ? 1 : 1.5); S.fires.push(40); // x1.5: three or four hits sink a destroyer, so battles end
  if (rnd() < 0.5) { S.flooding += 1; S.listSide = S.listSide || (lx >= 0 ? 1 : -1); }
  onHit?.(S, m, n); S.damage(n);
}
// ── defence: each modern ship engages incoming missiles aimed at its side, inside its own envelope ──
const need = (m) => (m.W.cls === "sub" ? 1 : m.pos.distanceToSquared(G.player?.pos || m.pos) < 1.2e8 ? 2 : 1);
function threatsFor(S) {
  const out = [];
  for (const m of M.list) if (m.alive && m.W.role === "asm" && m.side !== S.side && !m.decoy && seen(m, S.side)) { const d = m.pos.distanceTo(S.pos); if (d < 34000) out.push({ m, d }); }
  for (const m of M.jets) if (m.alive && m.side !== S.side && seen(m, S.side)) { const d = m.pos.distanceTo(S.pos); if (d < (m.pos.y < 300 ? 9000 : 13000)) out.push({ m, d }); } // aircraft: SAMs fire at them only close in (they jink, jam and fly low)
  return out.sort((a, b) => a.d / (a.m.vel.length() + 1) - b.d / (b.m.vel.length() + 1));
}
/** mode: "auto" | "manual" | "hold" (player's ships only). */
export function defend(dt, mode = "auto") {
  for (const S of G.ships) {
    if (!S.alive || !S.spec.modern || !S.mag) continue;
    const D = S.def || (S.def = { cd: 0, pdCd: 0, ciT: 0, decoyCd: 8 + rnd() * 10 }); D.cd -= dt; D.pdCd -= dt; D.decoyCd -= dt;
    const th = threatsFor(S); if (!th.length) continue;
    const mine = S.side === "us" && mode !== "auto" && !G.auto;
    for (const { m, d } of th) {
      if (D.cd > 0 || mine) break;
      if (m.engaged >= need(m)) continue;
      if (m.W.drone && (d > 5000 || m.engaged >= 1)) continue; // small radar return: SAMs only take drones close in, one each
      const k = pickSam(S, d); if (!k) continue;
      if (launch(S, k, m)) { S.mag[k]--; m.engaged++; D.cd = 0.7; if (S.isPlayer) G.stats.sams = (G.stats.sams || 0) + 1; }
    }
    // point defence (always automatic)
    const pd = S.spec.pd;
    if (pd && S.mag[pd[0]] > 0 && D.pdCd <= 0) { const c = th.find((t) => t.d < WPN[pd[0]].range && t.m.engaged < need(t.m) + 1); if (c) { launch(S, pd[0], c.m); S.mag[pd[0]]--; c.m.engaged++; D.pdCd = 1.2; } }
    // CIWS: last 1.2 km
    if (!S.ciwsDead) for (const { m, d } of th) if (d < 1300) {
      D.ciT -= dt;
      if (D.ciT <= 0) {
        D.ciT = 0.05; S.tilt.updateWorldMatrix(true, false);
        const pd = S.pdMounts?.[0];
        let o;
        if (pd) { aimPdMount(S, pd, m.pos); pd.elGrp.updateWorldMatrix(true, false); o = pd.elGrp.localToWorld(new THREE.Vector3(2.1, -0.35, 0)); }
        else o = S.pos.clone().setY(S.spec.fb + 9);
        const dir = m.pos.clone().sub(o), dl = Math.max(dir.length(), 1); dir.divideScalar(dl);
        flash.spawn({ x: o.x, y: o.y, z: o.z, life: 0.06, s0: 2.2, s1: 0.9, a: 0.85, c: 0xffd478 });
        D.ciN = (D.ciN || 0) + 1;
        if (D.ciN % 3 === 0) smoke.spawn({ x: o.x, y: o.y, z: o.z, vx: dir.x * 8 + 1.5, vy: 2.2, vz: dir.z * 8 + 1, life: 0.8, s0: 1.4, s1: 4.5, a: 0.25, c: 0xd0d4d8 });
        if (D.ciN % 2 === 0) spark.spawn({ x: o.x, y: o.y - 0.5, z: o.z, vx: -dir.z * (4 + rnd() * 4) + gauss(), vy: 2.5 + rnd() * 3, vz: dir.x * (4 + rnd() * 4) + gauss(), g: 9.8, life: 0.55, s0: 0.55, s1: 0.2, a: 0.8, c: 0xffd272 });
        if (D.ciN % 5 === 0) {
          flash.spawn({ x: m.pos.x + gauss() * 16, y: Math.max(4, m.pos.y + gauss() * 10), z: m.pos.z + gauss() * 16, life: 0.09, s0: 3.2, s1: 9, a: 0.72, c: 0xffe4a0 });
          smoke.spawn({ x: m.pos.x + gauss() * 14, y: Math.max(4, m.pos.y + gauss() * 9), z: m.pos.z + gauss() * 14, vy: 1.5, life: 0.9, s0: 2.2, s1: 7.5, a: 0.34, c: 0x3a3e44 });
        }
        for (let t = 0; t < 3; t++) {
          const k = (t + rnd()) / 3, bx = o.x + dir.x * dl * k, by = o.y + dir.y * dl * k, bz = o.z + dir.z * dl * k;
          spark.spawn({ x: bx, y: by, z: bz, vx: dir.x * 420 + gauss() * 14, vy: dir.y * 420 + gauss() * 14, vz: dir.z * 420 + gauss() * 14, life: 0.2, s0: 1.4, s1: 0.6, a: 1, c: t === 0 ? 0xffef9e : 0xffb858 });
        }
        const dd = o.distanceTo(camera.position); if (dd < 2800 && rnd() < 0.55) at(dd, () => (sfx.ciws ? sfx.ciws(dd) : (dd < 450 && sfx.vulcan ? sfx.vulcan() : sfx.mgShot(dd))));
      }
      if (rnd() < dt * (m.W.drone ? 0.22 : m.W.cls === "sub" ? 0.4 : m.W.cls === "sup" ? 0.22 : 0.1) * satK(m.side)) {
        flash.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, life: 0.24, s0: 8, s1: 26, a: 0.95, c: 0xffd27a });
        for (let i = 0; i < 10; i++) spark.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, vx: gauss() * 28, vy: gauss() * 24, vz: gauss() * 28, g: 9.8, life: 0.85, s0: 1.8, s1: 0.4, a: 1, c: 0xffb858 });
        for (let i = 0; i < 3; i++) smoke.spawn({ x: m.pos.x + gauss() * 3, y: m.pos.y + gauss() * 3, z: m.pos.z + gauss() * 3, vy: 4, life: 3.2, s0: 5, s1: 18, a: 0.58, c: 0x26282c });
        const kd = m.pos.distanceTo(camera.position); at(kd, () => sfx.flak(kd * 0.45));
        m.killedBy = S; kill(m, "boom");
      } break;
    }
    // soft kill: AI ships throw a decoy when a missile is inside 5 km
    if (!mine && D.decoyCd <= 0 && th[0].d < 5000) { decoy(S); D.decoyCd = 35; }
  }
}
export function pickSam(S, d) {
  for (const t of ["S", "M", "L"]) { const e = S.spec.vls[t]; if (!e) continue; const k = e[0], W = WPN[k]; if (S.mag[k] > 0 && d < W.range * 0.95 && (t !== "L" || d > 9000 || !S.spec.vls.M)) return k; }
  for (const t of ["L", "M"]) { const e = S.spec.vls[t]; if (e && S.mag[e[0]] > 0 && d < WPN[e[0]].range * 0.95) return e[0]; }
  return null;
}
/** Nulka / chaff: spoofs some of the missiles heading for this ship. */
export function decoy(S) {
  const a = rnd() * PI * 2, p = S.pos.clone().add(new THREE.Vector3(Math.cos(a) * 420, 15, Math.sin(a) * 420)), D = { pos: p, t: 22, alive: true, vel: new THREE.Vector3() };
  M.decoys.push(D);
  const dy = (S.spec?.fb || 4) + 3, dx = Math.cos(a) * 42, dz = Math.sin(a) * 42;
  flash.spawn({ x: S.pos.x, y: dy, z: S.pos.z, life: 0.14, s0: 3.5, s1: 9, a: 0.9, c: 0xffd27a });
  smoke.spawn({ x: S.pos.x, y: dy + 1, z: S.pos.z, vx: dx * 0.35, vy: 8, vz: dz * 0.35, life: 1.6, s0: 2.5, s1: 9, a: 0.45, c: 0xd8dfe6 });
  for (let i = 0; i < 12; i++) spark.spawn({ x: p.x + gauss() * 18, y: 12 + rnd() * 24, z: p.z + gauss() * 18, vx: gauss() * 8, vy: rnd() * 6, vz: gauss() * 8, life: 1.1, s0: 1.8, s1: 0.4, a: 0.95, c: rnd() < 0.7 ? 0xf0f7ff : 0xffe29a });
  for (let i = 0; i < 6; i++) smoke.spawn({ x: p.x + gauss() * 16, y: 14 + rnd() * 20, z: p.z + gauss() * 16, vy: 1.2, life: 5.5, s0: 8, s1: 24, a: 0.35, c: 0xdbe6f0 });
  for (let i = 0; i < 8; i++) spray.spawn({ x: p.x + gauss() * 20, y: 10 + rnd() * 30, z: p.z + gauss() * 20, life: 6, s0: 6, s1: 18, a: 0.48, fade: 0.6, c: 0xdedede });
  const dd = S.pos.distanceTo(camera.position); if (dd < 4500) at(dd, () => sfx.chaff?.(dd));
  let n = 0; for (const m of M.list) if (m.alive && m.W.role === "asm" && m.side !== S.side && m.target === S && !m.decoy && m.pos.distanceTo(S.pos) < 9000 && rnd() < (m.W.cls === "hyp" ? 0.15 : 0.45)) { m.decoy = D; n++; }
  return n;
}
// ── shipborne helicopter / drone: flies out, orbits a station, its radar reports contacts; enemy SAM ships with radar on can shoot it down ──
// Seahawk-type airframe, metres, nose along +x: lathe fuselage, glazed nose, twin engine fairings, tapered boom, canted fin, 4-blade rotors
const HG = (() => {
  const P = [[0, -4.4], [0.85, -4.2], [1.15, -2.4], [1.22, 0.6], [1.12, 2.8], [0.88, 4.2], [0.5, 5.2], [0.12, 5.7], [0, 5.75]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.LatheGeometry(P, 18); body.rotateZ(-PI / 2); body.scale(1, 1.12, 0.92);
  const canopy = new THREE.SphereGeometry(1, 16, 10, 0, PI * 2, 0, PI * 0.55); canopy.scale(1.9, 0.75, 1.0);
  const boom = new THREE.CylinderGeometry(0.3, 0.62, 8.2, 12); boom.rotateZ(PI / 2);
  const eng = new THREE.CapsuleGeometry(0.42, 2.2, 4, 10); eng.rotateZ(PI / 2);
  const blade = new THREE.BoxGeometry(7.8, 0.06, 0.52); blade.translate(4.1, 0, 0);
  const tblade = new THREE.BoxGeometry(0.16, 1.5, 0.04); tblade.translate(0, 0.78, 0);
  return { body, canopy, boom, eng, blade, tblade, fin: new THREE.BoxGeometry(1.5, 2.7, 0.16), stab: new THREE.BoxGeometry(0.9, 0.08, 3.4), mast: new THREE.CylinderGeometry(0.18, 0.24, 0.9, 8), hub: new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), wheel: new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), disc: new THREE.CircleGeometry(8.1, 32) };
})();
const HM = { glass: new THREE.MeshStandardMaterial({ color: 0x16232c, roughness: 0.06, metalness: 0.9 }), dark: new THREE.MeshStandardMaterial({ color: 0x24282b, roughness: 0.45, metalness: 0.5 }),
  disc: new THREE.MeshBasicMaterial({ color: 0x1a1d20, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }) };
function heloMesh(side) {
  const skin = new THREE.MeshStandardMaterial({ color: side === "us" ? 0x7b848a : 0x6c7568, roughness: 0.55, metalness: 0.3 }), g = new THREE.Group();
  const put = (geo, m, x, y, z, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.z = rz; g.add(o); return o; };
  put(HG.body, skin, 0, 0, 0); put(HG.canopy, HM.glass, 3.7, 0.35, 0); put(HG.boom, skin, -8.3, 0.55, 0);
  for (const z of [-0.6, 0.6]) put(HG.eng, skin, -0.6, 1.45, z);
  put(HG.fin, skin, -12.3, 1.75, 0, 0.32); put(HG.stab, skin, -11.6, 0.55, 0); put(HG.mast, HM.dark, 0.4, 2.0, 0);
  for (const [x, z] of [[2.6, -1.1], [2.6, 1.1], [-5.2, 0]]) put(HG.wheel, HM.dark, x, -1.3, z).rotation.x = PI / 2;
  const rotor = new THREE.Group(); rotor.position.set(0.4, 2.5, 0); g.add(rotor); rotor.add(new THREE.Mesh(HG.hub, HM.dark));
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(HG.blade, HM.dark); b.rotation.y = (i * PI) / 2; b.rotation.x = 0.04; rotor.add(b); }
  const disc = new THREE.Mesh(HG.disc, HM.disc); disc.rotation.x = -PI / 2; disc.position.set(0.4, 2.55, 0); g.add(disc);
  const tail = new THREE.Group(); tail.position.set(-12.6, 2.4, 0.22); g.add(tail);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(HG.tblade, HM.dark); b.rotation.z = (i * PI) / 2; tail.add(b); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { g, rotor, tail };
}
export function launchHelo(S, dest, name) {
  const { g, rotor: r, tail } = heloMesh(S.side); g.scale.setScalar(1.5); scene.add(g);
  const h = { side: S.side, owner: S, name, pos: S.pos.clone().setY(S.spec.fb + 6), vel: new THREE.Vector3(), dest: dest.clone().setY(300), t: 0, endur: 180, home: false, alive: true, mesh: g, rotor: r, tail };
  M.helos.push(h); return h;
}
/** onEvent(h, "land" | "lost", shooter) */
export function stepHelos(dt, onEvent) {
  for (let i = M.helos.length - 1; i >= 0; i--) {
    const h = M.helos[i]; if (!h.alive) { M.helos.splice(i, 1); continue; }
    h.t += dt; if (h.t > h.endur || !h.owner.alive) h.home = true;
    const goal = h.home ? h.owner.pos.clone().setY(h.owner.spec.fb + 6) : h.dest, d = Math.hypot(goal.x - h.pos.x, goal.z - h.pos.z);
    if (h.home && (d < 150 || !h.owner.alive)) { h.alive = false; scene.remove(h.mesh); h.owner.heloCd = 40; onEvent?.(h, h.owner.alive ? "land" : "lost"); continue; }
    let aim = goal; if (!h.home && d < 1800) { const a = h.t * 0.08; aim = goal.clone().add(new THREE.Vector3(Math.cos(a) * 1500, 0, Math.sin(a) * 1500)); } // orbit the station
    const dir = aim.clone().sub(h.pos); dir.y = 0; if (dir.lengthSq() > 1) dir.setLength(h.home && d < 600 ? Math.max(20, d * 0.2) : 160); // game-scaled speed, like the ranges
    h.vel.lerp(dir, Math.min(1, dt * 0.8)); h.pos.x += h.vel.x * dt; h.pos.z += h.vel.z * dt; h.pos.y += ((h.home && d < 900 ? goal.y : 300) - h.pos.y) * Math.min(1, dt * 0.5);
    h.mesh.position.copy(h.pos); h.mesh.rotation.y = -Math.atan2(h.vel.z, h.vel.x); h.mesh.rotation.z = -clamp(h.vel.length() / 160, 0, 1) * 0.12; h.rotor.rotation.y += dt * 27; h.tail.rotation.z += dt * 120; // nose-down in cruise
    for (const S of G.ships) if (S.alive && S.side !== h.side && S.spec.modern && S.radarOn !== false && S.pos.distanceTo(h.pos) < 8000) {
      if (rnd() < dt * 0.035) { h.alive = false; scene.remove(h.mesh); kill({ pos: h.pos, mesh: h.mesh }, "air"); onEvent?.(h, "lost", S); }
      break;
    }
  }
}
// ── jets: CAP fighters hunt enemy aircraft with AAMs; strike pairs fly at a known (or estimated) ship, fire their two anti-ship missiles and go home ──
export const JET_US = { aam: 5, asm: 15 }; // friendly jet loadout (enemy jets keep 10 AAM and 2 ASM)
export function launchJet(S, role, cv, pos) {
  const mesh = jetMesh(S.side === "foe"); mesh.scale.setScalar(1.4); scene.add(mesh);
  const p = pos ? pos.clone() : S.pos.clone().setY((S.spec?.fb || 0) + 14), h = S.heading ?? 0;
  const j = { isJet: true, side: S.side, owner: S, role, name: cv.type, W: { cls: "jet", alt: "high", name: cv.type }, pos: p, vel: new THREE.Vector3(Math.cos(h) * 120, 25, Math.sin(h) * 120), t: 0, endur: 260, home: false, alive: true, engaged: 0, mesh,
    asm: S.side === "us" ? JET_US.asm : role !== "cap" ? 2 : 0, asmKey: cv.asm, aam: S.side === "us" ? JET_US.aam : 10, aamKey: cv.aam, aamCd: 2, trail: [], flares: flaresOf(cv.type) };
  M.jets.push(j); return j;
}
const V_NOZ = new THREE.Vector3(), V_TIP = new THREE.Vector3(), V_FW = new THREE.Vector3();
function updateJetFX(j, dt, spd) {
  const thr = j.pilot ? (j.thr ?? spd) : (!j.home && j.aam > 0 ? Math.max(spd, 265) : spd);
  const dThr = thr - (j.prevThr ?? thr); j.prevThr = thr;
  j.boostPulse = clamp((j.boostPulse || 0) - dt * 1.5 + (dThr > 15 * dt ? dt * 4.8 : 0), 0, 1);
  const milK = clamp((thr - 110) / 140, 0.25, 1);
  const abK = j.hit ? clamp((thr - 235) / 60, 0, 0.45) : clamp(Math.max((thr - 246) / 84, j.boostPulse * 0.78), 0, 1);
  j.mesh.updateWorldMatrix(true, false);
  V_FW.set(1, 0, 0).applyQuaternion(j.mesh.quaternion);
  if (j.pilot && abK > 0.42 && !j.abLit) {
    V_NOZ.set(-8.6, -0.06, 0).applyMatrix4(j.mesh.matrixWorld);
    flash.spawn({ x: V_NOZ.x, y: V_NOZ.y, z: V_NOZ.z, life: 0.16, s0: 3.5, s1: 7.5, a: 0.9, c: 0xffc668 });
  }
  j.abLit = abK > 0.32;
  const ab = j.mesh.userData.ab;
  if (ab) {
    const lit = milK > 0.3 || abK > 0.03;
    const len = abK > 0.04 ? (0.55 + abK * 1.55 + (Math.random() - 0.5) * 0.22) : 0.26 + milK * 0.2;
    const rad = abK > 0.04 ? (0.72 + abK * 0.52 + (Math.random() - 0.5) * 0.08) : 0.55;
    ab.glowMat.opacity = 0.28 + milK * 0.38 + abK * 0.34;
    ab.outerMat.opacity = abK > 0.04 ? 0.42 + abK * 0.48 : 0.22;
    ab.outerMat.color.setHex(abK > 0.42 ? (j.side === "foe" ? 0xff8c42 : 0x70baff) : 0xff9440);
    ab.coreMat.opacity = abK > 0.04 ? 0.8 + abK * 0.2 : 0.55;
    ab.diaMat.opacity = clamp(abK * 1.15, 0, 0.92);
    for (const br of ab.burners) {
      br.glow.visible = lit; br.plume.visible = lit;
      if (lit) br.plume.scale.set(len, rad, rad);
      for (let i = 0; i < br.rings.length; i++) {
        const rg = br.rings[i]; rg.visible = abK > 0.08;
        if (rg.visible) { const sc = (1 - i * 0.22) * (0.75 + abK * 0.45 + (Math.random() - 0.5) * 0.12); rg.scale.setScalar(sc); }
      }
    }
    if (ab.strobe) ab.strobe.visible = ((G.time + (j.t || 0)) % 1.15) < 0.08;
    const mach = spd / 340;
    const vcK = spd >= 304 && abK > 0.45 ? clamp((spd - 304) / 22, 0, 1) * (1 - clamp((mach - 1.03) / 0.06, 0, 1)) : 0;
    if (ab.vCone) {
      ab.vCone.visible = vcK > 0.04;
      if (ab.vCone.visible) {
        ab.vcMat.opacity = vcK * (0.16 + rnd() * 0.09);
        ab.vCone.rotation.x += dt * 3.2;
        ab.vCone.scale.set(0.95 + vcK * 0.18, 0.92 + rnd() * 0.12, 0.92 + rnd() * 0.12);
      }
    }
    if (j.pilot && spd >= 312 && !j.machBoom) {
      j.machBoom = true; sfx.sonicFlyby?.(0, true);
      smoke.spawn({ x: j.pos.x, y: j.pos.y, z: j.pos.z, life: 0.75, s0: 3.5, s1: 12, a: 0.26, c: 0xeaf4fc });
    } else if (spd < 292) j.machBoom = false;
  }
  if (abK > 0.25 && rnd() < dt * (18 + abK * 30)) {
    const s = rnd() < 0.5 ? 1 : -1;
    V_NOZ.set(-9.1 - abK * 2.4, -0.06, s * 0.52).applyMatrix4(j.mesh.matrixWorld);
    flash.spawn({ x: V_NOZ.x, y: V_NOZ.y, z: V_NOZ.z, vx: j.vel.x * 0.25 - V_FW.x * 55, vy: j.vel.y * 0.25 - V_FW.y * 55, vz: j.vel.z * 0.25 - V_FW.z * 55,
      life: 0.09 + abK * 0.06, s0: 1.5 + abK * 1.6, s1: 0.4, a: 0.7 + abK * 0.25, c: abK > 0.65 && rnd() < 0.45 ? 0x9ed4ff : 0xffaa44 });
    if (abK > 0.5 && rnd() < 0.55) spark.spawn({ x: V_NOZ.x, y: V_NOZ.y, z: V_NOZ.z, vx: j.vel.x * 0.2 - V_FW.x * 80 + gauss() * 6, vy: j.vel.y * 0.2 - V_FW.y * 80 + gauss() * 6, vz: j.vel.z * 0.2 - V_FW.z * 80 + gauss() * 6,
      life: 0.22, s0: 1.1, s1: 0.3, a: 0.9, c: 0xffdca0 });
  }
  if ((abK > 0.18 || !j.pilot) && rnd() < dt * (j.pilot ? 12 + abK * 14 : 6)) {
    V_NOZ.set(-9.4, -0.06, 0).applyMatrix4(j.mesh.matrixWorld);
    smoke.spawn({ x: V_NOZ.x, y: V_NOZ.y, z: V_NOZ.z, life: abK > 0.4 ? 1.5 : 1.1, s0: 1.2, s1: 4.5 + abK * 2.5, a: 0.14 + abK * 0.1, c: abK > 0.5 ? 0xe4eaef : 0xcfcfcf });
  }
  if ((j.gT > 0 || (j.pilot && abK > 0.65 && spd > 250)) && rnd() < dt * 26) {
    for (const s of [-1, 1]) {
      V_TIP.set(-4.1, -0.04, s * 6.8).applyMatrix4(j.mesh.matrixWorld);
      spray.spawn({ x: V_TIP.x, y: V_TIP.y, z: V_TIP.z, vx: -V_FW.x * 12, vy: -V_FW.y * 12, vz: -V_FW.z * 12, life: 0.42, s0: 0.55, s1: 1.6, a: 0.24, c: 0xf4f9ff });
    }
  }
  if (j.pos.y < 32 && spd > 140) {
    if (rnd() < dt * 24) spray.spawn({ x: j.pos.x + gauss() * 2.5, y: 0.9, z: j.pos.z + gauss() * 2.5, vx: -V_FW.x * 16 + gauss() * 5, vy: 5 + rnd() * 8, vz: -V_FW.z * 16 + gauss() * 5, life: 0.85, s0: 2.4, s1: 9.5, a: 0.48, c: 0xeaf4f8 });
    if (rnd() < dt * 8) rings.spawn({ x: j.pos.x, z: j.pos.z, w0: 4, l0: 4, w1: 22, l1: 22, life: 1.3, a: 0.36, c: 0xdff2fc, ease: 3 });
  }
}
/** know(side) → [{ ship, pos, firm }] enemy surface contacts that side can target. onEvent(j, kind, extra). */
export function stepJets(dt, know, onEvent) {
  for (let i = M.jets.length - 1; i >= 0; i--) {
    const j = M.jets[i];
    if (!j.alive) { if (!j.gone) onEvent?.(j, "lost", j.killedBy); M.jets.splice(i, 1); continue; }
    j.t += dt; j.aamCd -= dt;
    if (j.pilot && j.landT > 0) { const o = j.owner; j.landT -= dt; j.pos.copy(o.pos).add(new THREE.Vector3(0, o.spec.fb + 10, 0)); j.vel.copy(o.vel || new THREE.Vector3()); j.mesh.position.copy(j.pos);
      for (const br of j.mesh.userData.ab?.burners || []) { br.glow.visible = false; br.plume.visible = false; }
      if (j.landT <= 0) { j.gun = 480; j.aam = JET_US.aam; j.asm = j.asmKey ? JET_US.asm : 0; j.flares = flaresOf(j.name); j.hit = false; j.gh = 0; j.t = 0; j.thr = 240; j.vel.copy(o.fwd).multiplyScalar(200); j.pos.addScaledVector(o.fwd, o.spec.L * 0.4); j.pos.y = 70; j.q.setFromUnitVectors(X, o.fwd); onEvent?.(j, "relaunch"); } continue; }
    if (j.pilot) { // flown by the player: fly where the stick points
      const want = new THREE.Vector3(1, 0, 0).applyQuaternion(j.q).multiplyScalar(Math.min(j.thr, j.hit ? 250 : 999));
      j.vel.lerp(want, Math.min(1, dt * 2.6)); j.pos.addScaledVector(j.vel, dt); j.W.alt = j.pos.y < 300 ? "skim" : "high"; j.flareT = Math.max(0, (j.flareT || 0) - dt);
      if (j.pos.y < 8) { j.killedBy = null; kill(j, "boom"); continue; }
      if (j.hit && rnd() < dt * 20) smoke.spawn({ x: j.pos.x, y: j.pos.y, z: j.pos.z, life: 3, s0: 2, s1: 10, a: 0.6, c: 0x222222 });
      j.mesh.position.copy(j.pos); j.mesh.quaternion.copy(j.q); syncJetPylons(j); updateJetFX(j, dt, j.vel.length()); continue;
    }
    if (j.flares > 0 && (j.aiFlCd || 0) <= G.time && M.list.some((m) => m.alive && m.target === j && m.pos.distanceTo(j.pos) < 4500)) { const n = Math.min(j.flares, 6); j.flares -= n; j.aiFlCd = G.time + 1.6; jetFlare(j, n); } // AI: a 6-cartridge program, again while the threat stays
    if (j.t > j.endur || !j.owner.alive || (j.role === "multi" && !j.asm && !j.aam)) j.home = true; j.W.alt = j.pos.y < 300 ? "skim" : "high"; // low flyers stay under the radar horizon longer
    let goal = null, alt = j.heavy ? 950 : j.role === "strike" ? 160 : 1800, spd = j.support ? 285 : 240;
    const foes = M.jets.filter((o) => o.alive && o.side !== j.side), near = foes.sort((a, b) => a.pos.distanceToSquared(j.pos) - b.pos.distanceToSquared(j.pos))[0];
    if (!j.home && j.aam > 0 && near && near.pos.distanceTo(j.pos) < (j.role !== "strike" ? 25000 : 9000)) { // engage aircraft (strike jets only in self-defence)
      goal = near.pos.clone().addScaledVector(near.vel, 2); alt = near.pos.y;
      { const dd = near.pos.distanceTo(j.pos), fw = j.vel.clone().normalize(), ang = Math.acos(clamp(near.pos.clone().sub(j.pos).dot(fw) / Math.max(dd, 1), -1, 1));
        j.gunT = (j.gunT || 0) - dt; if (dd < 1500 && ang < 0.12 && j.gunT <= 0) { j.gunT = 0.09; jetGun(j); if (camera.position.distanceTo(j.pos) < 1500 && rnd() < 0.3) sfx.vulcan?.(); } }
      if (j.aamCd <= 0 && near.pos.distanceTo(j.pos) < WPN[j.aamKey].range * 0.8 && near.engaged < 1) { const m = launch(j, j.aamKey, near); if (m) { j.aam--; near.engaged++; j.aamCd = 6; onEvent?.(j, "aam", near); } }
    } else if (!j.home && j.role !== "strike" && j.aam > 0 && (() => { const m = M.list.filter((x) => x.alive && x.W.role === "asm" && x.side !== j.side && !x.engaged && x.pos.distanceTo(j.pos) < 9000).sort((a, b) => a.pos.distanceToSquared(j.pos) - b.pos.distanceToSquared(j.pos))[0]; j.msl = m; return !!m; })()) {
      const m = j.msl; goal = m.pos.clone().addScaledVector(m.vel, 3); alt = Math.max(200, m.pos.y + 150); // CAP also shoots down incoming anti-ship missiles
      if (j.aamCd <= 0 && m.pos.distanceTo(j.pos) < 7000) { const a = launch(j, j.aamKey, m); if (a) { j.aam--; m.engaged++; j.aamCd = 4; onEvent?.(j, "aam", m); } }
    } else if (!j.home && j.role !== "cap" && j.asm > 0) {
      const ref = j.aimPt || j.pos, c = know(j.side).sort((a, b) => a.pos.distanceToSquared(ref) - b.pos.distanceToSquared(ref))[0]; // support strikes go for the contact nearest the commander's strike point
      if (c) {
        goal = c.pos.clone(); const d = Math.hypot(c.pos.x - j.pos.x, c.pos.z - j.pos.z);
        j.asmCd = (j.asmCd || 0) - dt; const pair = j.side === "us" && !j.support; /* friendly jets fire two at a time and stay on the attack until empty; enemy and support jets fire everything at once */
        if (d < WPN[j.asmKey].range * 0.75 && j.asmCd <= 0) { const n = pair ? Math.min(2, j.asm) : j.asm; for (let k = 0; k < n; k++) { const m = launch(j, j.asmKey, c.ship); if (m && !c.firm) m.est = c.pos.clone(); } onEvent?.(j, "strike", c.ship, n); j.asm -= n; j.asmCd = 5; if (j.asm <= 0) { j.asm = 0; j.home = j.role === "strike" || !j.aam; } }
      } else if (j.support && j.aimPt) {
        goal = j.aimPt.clone(); const d = Math.hypot(j.aimPt.x - j.pos.x, j.aimPt.z - j.pos.z);
        if (d < WPN[j.asmKey].range * 0.65) { for (let k = 0; k < j.asm; k++) { const m = launch(j, j.asmKey, null); if (m) m.est = j.aimPt.clone(); } onEvent?.(j, "strike", { name: "지정 해역" }); j.asm = 0; j.home = true; }
      }
    }
    if (!goal && !j.home) { const o = j.owner, a = j.t * 0.14; goal = o.pos.clone().add(new THREE.Vector3(Math.cos(a) * 4000, 0, Math.sin(a) * 4000)); } // orbit over the fleet (strike jets wait here for a contact)
    if (j.home) { goal = j.owner.pos.clone(); alt = 60; const d = Math.hypot(goal.x - j.pos.x, goal.z - j.pos.z); spd = d < 3000 ? 90 : 240;
      if (d < 400) { j.alive = false; j.gone = true; scene.remove(j.mesh); if (j.owner.alive) { (j.owner.rearm ||= []).push(60); onEvent?.(j, "land"); } continue; } }
    goal.y = alt; const want = goal.sub(j.pos).normalize().multiplyScalar(spd);
    j.vel.lerp(want, Math.min(1, dt * 0.9)); j.pos.addScaledVector(j.vel, dt); if (j.pos.y < 40) j.pos.y = 40;
    j.mesh.position.copy(j.pos); j.mesh.quaternion.setFromUnitVectors(X, tmp.copy(j.vel).normalize());
    syncJetPylons(j); updateJetFX(j, dt, spd);
  }
}
/** Flares / chaff from a jet: missiles homing on it may lose it (they self-destruct shortly after). Returns how many were fooled. */
export function jetFlare(j, k = 4) { // a dispense program: k cartridges in pairs, each burning and falling away on its own
  j.flareT = 2.5; let n = 0; const b = j.vel.clone().normalize(), side = new THREE.Vector3(-b.z, 0, b.x);
  for (let i = 0; i < k; i++) { const s = i % 2 ? 1 : -1; M.flares.push({ p: j.pos.clone().addScaledVector(b, -7), v: j.vel.clone().multiplyScalar(0.5).addScaledVector(side, s * (22 + rnd() * 18)).add(new THREE.Vector3(gauss() * 4, -14 - rnd() * 10, gauss() * 4)), t: 0, d: Math.floor(i / 2) * 0.18, src: j }); }
  const pk = 1 - Math.pow(0.5, k / 2); // 2 → 50 %, 4 → 75 %, 6 → 88 % per missile (radar missiles: chaff, simplified)
  for (const m of M.list) if (m.alive && m.target === j && m.pos.distanceTo(j.pos) < 9000 && rnd() < pk) { m.target = null; j.engaged = Math.max(0, (j.engaged || 0) - 1); n++; }
  return n;
}
export function stepFlares(dt) {
  for (let i = M.flares.length - 1; i >= 0; i--) { const f = M.flares[i]; if (f.d > 0) { f.d -= dt; if (f.d <= 0 && f.src) f.p.copy(f.src.pos); continue; }
    f.t += dt; f.v.multiplyScalar(Math.exp(-dt * 0.9)); f.v.y -= 9.8 * dt; f.p.addScaledVector(f.v, dt); const a = Math.max(0, 1 - f.t / 4.5);
    if (rnd() < 0.7) flash.spawn({ x: f.p.x, y: f.p.y, z: f.p.z, life: 0.35, s0: 4.5 * a + 1, s1: 1.5, a: a, c: 0xfff4c8 });
    if (rnd() < dt * 22) spark.spawn({ x: f.p.x, y: f.p.y, z: f.p.z, vx: gauss() * 8, vy: -4 - rnd() * 6, vz: gauss() * 8, g: 9.8, life: 0.45, s0: 0.9 * a + 0.3, s1: 0.2, a: 0.95 * a, c: 0xfff8dc });
    if (rnd() < dt * 14) smoke.spawn({ x: f.p.x, y: f.p.y, z: f.p.z, life: 2.4, s0: 1.5, s1: 7, a: 0.35 * a, c: 0xdadada });
    if (f.t > 4.5 || f.p.y < 2) M.flares.splice(i, 1); }
}
/** 20 mm cannon burst from jet j along its nose: hits enemy aircraft and missiles inside a narrow cone out to 1.7 km. */
export function jetGun(j) {
  const f = j.q ? new THREE.Vector3(1, 0, 0).applyQuaternion(j.q) : j.vel.clone().normalize(), o = j.pos.clone().addScaledVector(f, 9);
  const v = f.clone().multiplyScalar(1050).add(j.vel); v.x += gauss() * 5; v.y += gauss() * 5; v.z += gauss() * 5;
  spark.spawn({ x: o.x, y: o.y - 0.6, z: o.z, vx: v.x, vy: v.y, vz: v.z, g: 9.8, life: 1.5, s0: 1.4, s1: 0.9, a: 1, c: 0xffe48e });
  if (j.gun % 4 === 0) {
    flash.spawn({ x: o.x, y: o.y - 0.5, z: o.z, life: 0.055, s0: 2.2, s1: 0.8, a: 0.85, c: 0xffcc66 });
    smoke.spawn({ x: o.x, y: o.y - 0.5, z: o.z, vx: j.vel.x * 0.25 + gauss() * 2, vy: j.vel.y * 0.25 + 1, vz: j.vel.z * 0.25 + gauss() * 2, life: 0.45, s0: 1.1, s1: 3.4, a: 0.28, c: 0xd0d0cc });
    if (j.pilot || camera.position.distanceTo(j.pos) < 120) {
      const ej = j.pos.clone().addScaledVector(f, 3.2); ej.y -= 0.7;
      spark.spawn({ x: ej.x, y: ej.y, z: ej.z, vx: j.vel.x * 0.35 - f.x * 24 + gauss() * 4, vy: j.vel.y * 0.35 - 7 + gauss() * 2, vz: j.vel.z * 0.35 - f.z * 24 + gauss() * 4, g: 20, drag: 1.2, life: 0.36, s0: 0.2, s1: 0.08, a: 0.95, c: 0xffcf68 });
    }
  }
  let res = null;
  for (const t of [...M.jets, ...M.list]) { if (!t.alive || t.side === j.side || (!t.isJet && t.W.role !== "asm")) continue;
    const d = t.pos.clone().sub(j.pos), L = d.length(); if (L > 1700 || L < 30) continue;
    if (j.pilot) { /* player: test the round's real path (1050 m/s + own speed) against the target's motion, closest approach within 14 m (missiles 9 m); no dice roll, so lead the target */
      const r0 = o.clone().sub(t.pos), rv = v.clone().sub(t.vel || r0.clone().set(0, 0, 0)), s = clamp(-r0.dot(rv) / Math.max(rv.lengthSq(), 1e-6), 0, 1.7); if (r0.addScaledVector(rv, s).length() > (t.isJet ? 14 : 9)) continue; }
    else { const ang = Math.acos(clamp(d.dot(f) / L, -1, 1)); if (ang > 0.02 + 14 / L) continue; if (rnd() > 0.32) continue; } /* AI pilots keep the old cone and odds */
    t.gh = (t.gh || 0) + 1; res = res || "hit";
    flash.spawn({ x: t.pos.x, y: t.pos.y, z: t.pos.z, life: 0.16, s0: 3.5, s1: 8, a: 1, c: 0xffba55 });
    for (let k = 0; k < 3; k++) spark.spawn({ x: t.pos.x, y: t.pos.y, z: t.pos.z, vx: gauss() * 22, vy: gauss() * 16, vz: gauss() * 22, g: 9.8, life: 0.65, s0: 1.4, s1: 0.5, a: 1, c: 0xffd068 });
    if (j.pilot) sfx.hitTick();
    if (t.gh >= (t.isJet ? 5 : 1)) { if (t.pilot && !t.hit) { t.hit = true; t.gh = 0; G.onJetHit?.(t); continue; } t.killedBy = j; kill(t, "boom"); res = "kill"; } }
  // strafing a warship: 20 mm rounds knock out its search radar, then its CIWS (not the hull)
  if (j.pilot) for (const S of G.ships) { if (!S.alive || S.side === j.side || !S.spec.modern) continue;
    const d = S.pos.clone().setY(S.spec.fb + 6).sub(j.pos), L = d.length(); if (L > 1700 || L < 40) continue; const ang = Math.acos(clamp(d.dot(f) / L, -1, 1)); if (ang > 0.03 + S.spec.L * 0.35 / L) continue;
    if (rnd() > 0.4) continue; S.strafe = (S.strafe || 0) + 1; res = res || "hit";
    const hx = S.pos.x + gauss() * 8, hy = S.spec.fb + 6 + rnd() * 8, hz = S.pos.z + gauss() * 8;
    flash.spawn({ x: hx, y: hy, z: hz, life: 0.16, s0: 2.5, s1: 6, a: 1, c: 0xffc070 });
    spark.spawn({ x: hx, y: hy, z: hz, vx: gauss() * 14, vy: 8 + rnd() * 12, vz: gauss() * 14, g: 9.8, life: 0.6, s0: 1.2, s1: 0.4, a: 1, c: 0xffd27a });
    if (S.strafe % 3 === 0) smoke.spawn({ x: hx, y: hy, z: hz, vy: 3, life: 2.5, s0: 2, s1: 6, a: 0.4, c: 0x353535 });
    sfx.hitThunk();
    if (S.strafe === 25 && !S.radarDead) { S.radarDead = true; S.radarOn = false; G.onStrafe?.(S, "radar"); }
    if (S.strafe === 50 && !S.ciwsDead) { S.ciwsDead = true; G.onStrafe?.(S, "ciws"); } }
  if (!res && f.y < -0.04) {
    const tSea = -o.y / f.y;
    if (tSea > 20 && tSea < 1500 && rnd() < 0.65) {
      const sx = o.x + f.x * tSea + gauss() * 3, sz = o.z + f.z * tSea + gauss() * 3;
      spray.spawn({ x: sx, y: 0.8, z: sz, vx: gauss() * 4, vy: 10 + rnd() * 12, vz: gauss() * 4, g: 9.8, life: 0.9, s0: 1.6, s1: 5.5, a: 0.85, c: 0xf0f8ff });
      rings.spawn({ x: sx, z: sz, w0: 1.5, l0: 1.5, w1: 11, l1: 11, life: 1.1, a: 0.45, c: 0xdcf0fa, ease: 3 });
    }
  }
  return res;
}
export function clearMissiles() { M.flares.length = 0; for (const j of M.jets) scene.remove(j.mesh); M.jets.length = 0; for (const h of M.helos) scene.remove(h.mesh); M.helos.length = 0; for (const m of M.list) scene.remove(m.mesh); M.list.length = 0; M.decoys.length = 0; M.cam = null; trGeo.setDrawRange(0, 0); }
/** fill a ship's magazine from its spec */
export function arm(S) { S.mag = {}; for (const e of Object.values(S.spec.vls || {})) S.mag[e[0]] = (S.mag[e[0]] || 0) + e[1]; if (S.spec.pd) S.mag[S.spec.pd[0]] = S.spec.pd[1]; S.vlsX = S.tilt?.userData?.vls || null; }
