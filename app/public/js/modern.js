/**
 * Steel Tide — modern mode (현대전) phase 1: guided missiles and layered air defence.
 * Anti-ship missiles fly from VLS cells (boost, cruise sea-skimming / high, terminal sprint or ballistic dive) and home
 * on a ship; defenders detect them (skimmers late, over the radar horizon), assign long / medium / short-range
 * interceptors, point defence and CIWS, and can spoof them with decoys. Game ranges ≈ 1/15 of the real ones with the
 * order between weapons kept; defensive ranges are stretched so the layers stay visible.
 */
import { THREE, PI, clamp, rnd, gauss, G, scene, camera, smoke, flash, spray, spark, spawnSplash } from "./core.js";
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
  "순항미사일": { role: "asm", name: "순항미사일", range: 16000, v: 260, cls: "sub", alt: "skim", dmg: 30 },
};
export const M = { list: [], decoys: [], helos: [], jets: [], cam: null };
/** sensor ranges (game scale): ship radar vs surface ships, ESM intercept of a radiating ship, eyes, helicopter radar, EO/IR when not radiating, missile seeker */
export const SENS = { surf: 13000, esm: 28000, vis: 7000, helo: 12000, eo: 4000, seek: 9000 };
const TR_MAX = 1400, trGeo = new THREE.BufferGeometry();
trGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TR_MAX * 6), 3)); trGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(TR_MAX * 6), 3)); trGeo.setDrawRange(0, 0);
{ const l = new THREE.LineSegments(trGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false })); l.frustumCulled = false; scene.add(l); }
const BODY = new THREE.CylinderGeometry(0.22, 0.22, 4.6, 8); BODY.rotateZ(-PI / 2);
const NOSE = new THREE.ConeGeometry(0.22, 0.9, 8); NOSE.rotateZ(-PI / 2); NOSE.translate(2.75, 0, 0);
const FIN = new THREE.BoxGeometry(0.6, 0.04, 1.1);
const MATS = { us: new THREE.MeshStandardMaterial({ color: 0xe9ecec, roughness: 0.5 }), foe: new THREE.MeshStandardMaterial({ color: 0x9aa2a6, roughness: 0.5 }),
  fire: new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }) };
const FLAME = new THREE.SphereGeometry(0.5, 8, 6);
function mesh(W, side, sc) {
  const g = new THREE.Group(), m = MATS[side === "us" ? "us" : "foe"]; g.add(new THREE.Mesh(BODY, m)); g.add(new THREE.Mesh(NOSE, m));
  for (const r of [0, PI / 2]) { const f = new THREE.Mesh(FIN, m); f.position.x = -1.9; f.rotation.x = r; g.add(f); }
  const fl = new THREE.Mesh(FLAME, MATS.fire); fl.position.x = -2.7; fl.scale.set(1.8, 0.8, 0.8); g.add(fl); g.userData.fl = fl;
  g.scale.setScalar(sc); scene.add(g); return g;
}
const X = new THREE.Vector3(1, 0, 0), tmp = new THREE.Vector3();
/** world position of a VLS hatch on the ship (fore or aft grid) */
function hatch(S) { const v = S.funnels && S.root.userData; void v; S.tilt.updateWorldMatrix(true, false); const xs = S.vlsX || [S.spec.L * 0.26, -S.spec.L * 0.32]; return S.tilt.localToWorld(new THREE.Vector3(xs[rnd() < 0.5 ? 0 : 1] + gauss() * 1.5, S.spec.fb + 1.2, gauss() * 1.2)); }
export function launch(S, key, target) {
  const W = WPN[key]; if (!W) return null;
  const p = W.role === "pd" ? S.pos.clone().add(new THREE.Vector3(0, S.spec.fb + 10, 0)) : S.isJet ? S.pos.clone().add(new THREE.Vector3(0, -2, 0)) : hatch(S);
  const m = { key, W, side: S.side, owner: S, target, pos: p, air: !!S.isJet, vel: S.isJet ? S.vel.clone() : new THREE.Vector3(gauss() * 3, W.role === "pd" ? 0 : 70, gauss() * 3), t: 0, dist: 0, alive: true, engaged: 0, trail: [p.clone()], trT: 0,
    mesh: mesh(W, S.side, W.role === "asm" ? 1.25 : W.role === "pd" ? 0.7 : 1), apex: W.alt === "ball" ? 9000 : 0 };
  if (W.role === "pd" && target) m.vel.copy(target.pos).sub(p).normalize().multiplyScalar(300);
  M.list.push(m);
  flash.spawn({ x: p.x, y: p.y + 2, z: p.z, life: 0.35, s0: 5, s1: 12, a: 1, c: 0xffd27a });
  for (let i = 0; i < (W.role === "pd" ? 2 : 6); i++) smoke.spawn({ x: p.x + gauss(), y: p.y + rnd() * 3, z: p.z + gauss(), vx: gauss(), vy: 3 + rnd() * 4, vz: gauss(), life: 3.5, s0: 3, s1: 12, a: 0.65, c: 0xe8e8e8 });
  const d = p.distanceTo(camera.position); at(d, () => (d < 2500 ? sfx.torpLaunch() : sfx.flak(d)));
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
function kill(m, how) {
  m.alive = false; scene.remove(m.mesh); if (M.cam === m) M.camEnd = 1.2;
  if (how === "air") { flash.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, life: 0.4, s0: 8, s1: 22, a: 1, c: 0xff9a3a }); for (let i = 0; i < 8; i++) spark.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, vx: gauss() * 30, vy: gauss() * 20, vz: gauss() * 30, g: 9.8, life: 1.6, s0: 1.6, s1: 0.6, a: 1, c: 0xffb050 });
    smoke.spawn({ x: m.pos.x, y: m.pos.y, z: m.pos.z, life: 5, s0: 6, s1: 22, a: 0.6, c: 0x333333 }); const d = m.pos.distanceTo(camera.position); at(d, () => sfx.flak(d)); }
  else if (how === "boom") { // an intercepted missile or a downed aircraft: fireball, burning debris, smoke trail, a bang you hear
    const p = m.pos, big = m.isJet ? 1.4 : 1;
    for (let i = 0; i < 4; i++) flash.spawn({ x: p.x + gauss() * 4, y: p.y + gauss() * 3, z: p.z + gauss() * 4, life: 0.5 + i * 0.12, s0: 10 * big, s1: (34 + i * 8) * big, a: 1, c: i ? 0xff7a20 : 0xfff0c0 });
    for (let i = 0; i < 22; i++) spark.spawn({ x: p.x, y: p.y, z: p.z, vx: gauss() * 45, vy: gauss() * 30 + 10, vz: gauss() * 45, g: 9.8, life: 1.6 + rnd() * 1.4, s0: 2.4, s1: 0.7, a: 1, c: rnd() < 0.5 ? 0xffb050 : 0xff6a20 });
    for (let i = 0; i < 5; i++) smoke.spawn({ x: p.x + gauss() * 5, y: p.y + gauss() * 4, z: p.z + gauss() * 5, vy: 2, life: 8, s0: 10 * big, s1: 36 * big, a: 0.7, c: 0x2a2a2a });
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
  for (let i = M.list.length - 1; i >= 0; i--) {
    const m = M.list[i];
    if (!m.alive) { M.list.splice(i, 1); continue; }
    const W = m.W; m.t += dt;
    const boost = W.role !== "pd" && !m.air && m.t < 1.1;
    if (boost) { m.vel.y = Math.min(m.vel.y + 160 * dt, 160); }
    else {
      const want = W.role === "asm" ? (W.sprint && m.target && m.pos.distanceTo(m.target.pos) < 7000 ? W.sprint : W.v) : W.v;
      const v = m.vel.length(); m.vel.setLength(v + (want - v) * Math.min(1, dt * (W.role === "asm" ? 0.8 : 2.5)));
      if (W.role === "asm") {
        let T = m.decoy || m.target;
        if (!m.decoy && !m.est && (!T || !T.alive)) { const c = enemiesOf(m.side).sort((a, b) => a.pos.distanceToSquared(m.pos) - b.pos.distanceToSquared(m.pos))[0]; m.target = T = c && c.pos.distanceTo(m.pos) < 12000 ? c : null; }
        if (m.est && !m.decoy) { // fired at an estimated position: fly there, then switch the seeker on and take the nearest ship it finds
          if (m.pos.distanceTo(m.est) > SENS.seek * 0.7) T = { pos: m.est, vel: null };
          else { m.est = null; const c = enemiesOf(m.side).filter((s) => s.pos.distanceTo(m.pos) < SENS.seek).sort((a, b) => a.pos.distanceToSquared(m.pos) - b.pos.distanceToSquared(m.pos))[0]; m.target = T = c || null; m.seekMiss = !c; }
        }
        if (T) {
          const aim = lead(m, T, m.vel.length()).clone(), d = m.pos.distanceTo(T.pos);
          if (W.alt === "skim") aim.y = d > 2500 ? 9 : 4;
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
          if (m.pos.distanceTo(T.pos) < 32) { const ok = rnd() < (W.pk[T.W.cls] ?? (T.isJet ? 0.35 : 0.55)) * (T.isJet ? 1 : 0.45); T.engaged = Math.max(0, T.engaged - 1); kill(m, "air"); if (ok) { T.killedBy = m.owner; kill(T, "boom"); } continue; } // jets jink and jam; no layer is a sure kill
        }
      }
    }
    m.pos.addScaledVector(m.vel, dt); m.dist += m.vel.length() * dt;
    if (m.pos.y < 0.5 && !boost) { kill(m, "sea"); continue; }
    if (m.dist > W.range * (W.role === "asm" ? 1.15 : 1.3)) { if (W.role === "asm") { m.vel.y -= 30 * dt; } else { kill(m, "air"); continue; } }
    m.mesh.position.copy(m.pos); m.mesh.quaternion.setFromUnitVectors(X, tmp.copy(m.vel).normalize()); m.mesh.userData.fl.scale.x = 1.4 + Math.random() * 0.8;
    m.trT -= dt; if (m.trT <= 0) { m.trT = 0.1; m.trail.push(m.pos.clone()); if (m.trail.length > (W.role === "asm" ? 40 : 18)) m.trail.shift(); }
    const c = m.side === "us" ? (W.role === "asm" ? [0.95, 0.95, 0.95] : [0.65, 0.85, 1]) : [1, 0.55, 0.45];
    for (let j = 0; j + 1 < m.trail.length && n < TR_MAX; j++) { const a = m.trail[j], b = m.trail[j + 1]; tp.set([a.x, a.y, a.z, b.x, b.y, b.z], n * 6); tc.set([...c, ...c], n * 6); n++; }
    if (n < TR_MAX && m.trail.length) { const a = m.trail[m.trail.length - 1]; tp.set([a.x, a.y, a.z, m.pos.x, m.pos.y, m.pos.z], n * 6); tc.set([...c, ...c], n * 6); n++; }
  }
  trGeo.setDrawRange(0, n * 2); trGeo.attributes.position.needsUpdate = true; trGeo.attributes.color.needsUpdate = true;
  for (let i = M.decoys.length - 1; i >= 0; i--) { const d = M.decoys[i]; d.t -= dt; if (d.t <= 0) M.decoys.splice(i, 1); else if (rnd() < dt * 3) flash.spawn({ x: d.pos.x, y: d.pos.y + rnd() * 20, z: d.pos.z, life: 0.3, s0: 2, s1: 5, a: 0.9, c: 0xfff0c0 }); }
}
function impact(m, S, lx, onHit) {
  const W = m.W; kill(m, "hit"); const p = m.pos.clone(); hitFX(p, 1.1);
  for (let i = 0; i < 30; i++) spark.spawn({ x: p.x, y: p.y + 2, z: p.z, vx: gauss() * 25, vy: 10 + rnd() * 30, vz: gauss() * 25, g: 9.8, life: 2.4, s0: 2.6, s1: 0.8, a: 1, c: 0xffa040 });
  for (let i = 0; i < 6; i++) smoke.spawn({ x: p.x + gauss() * 3, y: p.y + 3, z: p.z + gauss() * 3, vy: 6, life: 10, s0: 8, s1: 30, a: 0.75, c: 0x1e1e1e });
  const d = p.distanceTo(camera.position); at(d, () => sfx.explode(d)); if (S.isPlayer) G.shake = 2;
  const n = W.dmg * (0.85 + rnd() * 0.3) * (W.cls === "hyp" ? 1 : 1.5); // x1.5: three or four hits sink a destroyer, so battles end S.fires.push(40); if (rnd() < 0.5) { S.flooding += 1; S.listSide = S.listSide || (lx >= 0 ? 1 : -1); }
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
      const k = pickSam(S, d); if (!k) continue;
      if (launch(S, k, m)) { S.mag[k]--; m.engaged++; D.cd = 0.7; if (S.isPlayer) G.stats.sams = (G.stats.sams || 0) + 1; }
    }
    // point defence (always automatic)
    const pd = S.spec.pd;
    if (pd && S.mag[pd[0]] > 0 && D.pdCd <= 0) { const c = th.find((t) => t.d < WPN[pd[0]].range && t.m.engaged < need(t.m) + 1); if (c) { launch(S, pd[0], c.m); S.mag[pd[0]]--; c.m.engaged++; D.pdCd = 1.2; } }
    // CIWS: last 1.2 km
    for (const { m, d } of th) if (d < 1300) { D.ciT -= dt; if (D.ciT <= 0) { D.ciT = 0.05; S.tilt.updateWorldMatrix(true, false); const o = S.pos.clone().setY(S.spec.fb + 9); spark.spawn({ x: o.x + (m.pos.x - o.x) * rnd(), y: o.y + (m.pos.y - o.y) * rnd(), z: o.z + (m.pos.z - o.z) * rnd(), life: 0.25, s0: 1.2, s1: 0.6, a: 1, c: 0xffe0a0 }); const dd = o.distanceTo(camera.position); if (dd < 3000 && rnd() < 0.5) at(dd, () => sfx.mgShot(dd)); }
      if (rnd() < dt * (m.W.cls === "sub" ? 0.4 : m.W.cls === "sup" ? 0.22 : 0.1)) { m.killedBy = S; kill(m, "boom"); } break; }
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
  M.decoys.push(D); for (let i = 0; i < 10; i++) spray.spawn({ x: p.x + gauss() * 20, y: 10 + rnd() * 30, z: p.z + gauss() * 20, life: 6, s0: 6, s1: 18, a: 0.5, fade: 0.6, c: 0xdedede });
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
export function launchJet(S, role, cv, pos) {
  const mesh = jetMesh(S.side === "foe"); mesh.scale.setScalar(1.4); scene.add(mesh);
  const p = pos ? pos.clone() : S.pos.clone().setY((S.spec?.fb || 0) + 14), h = S.heading ?? 0;
  const j = { isJet: true, side: S.side, owner: S, role, name: cv.type, W: { cls: "jet", alt: "high", name: cv.type }, pos: p, vel: new THREE.Vector3(Math.cos(h) * 120, 25, Math.sin(h) * 120), t: 0, endur: 260, home: false, alive: true, engaged: 0, mesh,
    asm: role !== "cap" ? 2 : 0, asmKey: cv.asm, aam: 4, aamKey: cv.aam, aamCd: 2, trail: [] };
  M.jets.push(j); return j;
}
/** know(side) → [{ ship, pos, firm }] enemy surface contacts that side can target. onEvent(j, kind, extra). */
export function stepJets(dt, know, onEvent) {
  for (let i = M.jets.length - 1; i >= 0; i--) {
    const j = M.jets[i];
    if (!j.alive) { if (!j.gone) onEvent?.(j, "lost", j.killedBy); M.jets.splice(i, 1); continue; }
    j.t += dt; j.aamCd -= dt;
    if (j.pilot) { // flown by the player: fly where the stick points
      const p = j.ppitch, want = new THREE.Vector3(Math.cos(j.pyaw) * Math.cos(p), Math.sin(p), Math.sin(j.pyaw) * Math.cos(p)).multiplyScalar(j.thr);
      j.vel.lerp(want, Math.min(1, dt * 2.2)); j.pos.addScaledVector(j.vel, dt); j.W.alt = j.pos.y < 300 ? "skim" : "high";
      if (j.pos.y < 8) { j.killedBy = null; kill(j, "boom"); continue; }
      j.mesh.position.copy(j.pos); j.mesh.quaternion.setFromUnitVectors(X, tmp.copy(j.vel).normalize()); continue;
    }
    if (j.t > j.endur || !j.owner.alive || (j.role === "multi" && !j.asm && !j.aam)) j.home = true; j.W.alt = j.pos.y < 300 ? "skim" : "high"; // low flyers stay under the radar horizon longer
    let goal = null, alt = j.role === "strike" ? 160 : 1800, spd = 240;
    const foes = M.jets.filter((o) => o.alive && o.side !== j.side), near = foes.sort((a, b) => a.pos.distanceToSquared(j.pos) - b.pos.distanceToSquared(j.pos))[0];
    if (!j.home && j.aam > 0 && near && near.pos.distanceTo(j.pos) < (j.role !== "strike" ? 25000 : 9000)) { // engage aircraft (strike jets only in self-defence)
      goal = near.pos.clone().addScaledVector(near.vel, 2); alt = near.pos.y;
      if (j.aamCd <= 0 && near.pos.distanceTo(j.pos) < WPN[j.aamKey].range * 0.8 && near.engaged < 1) { const m = launch(j, j.aamKey, near); if (m) { j.aam--; near.engaged++; j.aamCd = 6; onEvent?.(j, "aam", near); } }
    } else if (!j.home && j.role !== "strike" && j.aam > 0 && (() => { const m = M.list.filter((x) => x.alive && x.W.role === "asm" && x.side !== j.side && !x.engaged && x.pos.distanceTo(j.pos) < 9000).sort((a, b) => a.pos.distanceToSquared(j.pos) - b.pos.distanceToSquared(j.pos))[0]; j.msl = m; return !!m; })()) {
      const m = j.msl; goal = m.pos.clone().addScaledVector(m.vel, 3); alt = Math.max(200, m.pos.y + 150); // CAP also shoots down incoming anti-ship missiles
      if (j.aamCd <= 0 && m.pos.distanceTo(j.pos) < 7000) { const a = launch(j, j.aamKey, m); if (a) { j.aam--; m.engaged++; j.aamCd = 4; onEvent?.(j, "aam", m); } }
    } else if (!j.home && j.role !== "cap" && j.asm > 0) {
      const c = know(j.side).sort((a, b) => a.pos.distanceToSquared(j.pos) - b.pos.distanceToSquared(j.pos))[0];
      if (c) { goal = c.pos.clone(); const d = Math.hypot(c.pos.x - j.pos.x, c.pos.z - j.pos.z);
        if (d < WPN[j.asmKey].range * 0.75) { for (let k = 0; k < j.asm; k++) { const m = launch(j, j.asmKey, c.ship); if (m && !c.firm) m.est = c.pos.clone(); } onEvent?.(j, "strike", c.ship); j.asm = 0; j.home = j.role === "strike" || !j.aam; } }
    }
    if (!goal && !j.home) { const o = j.owner, a = j.t * 0.14; goal = o.pos.clone().add(new THREE.Vector3(Math.cos(a) * 4000, 0, Math.sin(a) * 4000)); } // orbit over the fleet (strike jets wait here for a contact)
    if (j.home) { goal = j.owner.pos.clone(); alt = 60; const d = Math.hypot(goal.x - j.pos.x, goal.z - j.pos.z); spd = d < 3000 ? 90 : 240;
      if (d < 400) { j.alive = false; j.gone = true; scene.remove(j.mesh); if (j.owner.alive) { (j.owner.rearm ||= []).push(60); onEvent?.(j, "land"); } continue; } }
    goal.y = alt; const want = goal.sub(j.pos).normalize().multiplyScalar(spd);
    j.vel.lerp(want, Math.min(1, dt * 0.9)); j.pos.addScaledVector(j.vel, dt); if (j.pos.y < 40) j.pos.y = 40;
    j.mesh.position.copy(j.pos); j.mesh.quaternion.setFromUnitVectors(X, tmp.copy(j.vel).normalize());
    if (rnd() < dt * 6) smoke.spawn({ x: j.pos.x, y: j.pos.y, z: j.pos.z, life: 1.2, s0: 1.5, s1: 5, a: 0.18, c: 0xcfcfcf });
  }
}
export function clearMissiles() { for (const j of M.jets) scene.remove(j.mesh); M.jets.length = 0; for (const h of M.helos) scene.remove(h.mesh); M.helos.length = 0; for (const m of M.list) scene.remove(m.mesh); M.list.length = 0; M.decoys.length = 0; M.cam = null; trGeo.setDrawRange(0, 0); }
/** fill a ship's magazine from its spec */
export function arm(S) { S.mag = {}; for (const e of Object.values(S.spec.vls || {})) S.mag[e[0]] = (S.mag[e[0]] || 0) + e[1]; if (S.spec.pd) S.mag[S.spec.pd[0]] = S.spec.pd[1]; S.vlsX = S.tilt?.userData?.vls || null; }
