/**
 * Steel Tide — air groups: USS Lexington's F4F-4 Wildcats (pilots: 대위) and the enemy
 * carrier's fighters. Computer pilots dogfight enemy fighters (lead pursuit, a defensive
 * break when someone sits on their tail) and otherwise dive on enemy ships: strafe, bomb
 * on the impact cue, extend, repeat, and fly home to their own carrier. One of ours can be
 * flown by the player (mouse aim). Six .50 cal guns converged at 260 m, two bombs.
 * Every ship with anti-aircraft guns fires flak and light AA at the nearest hostile plane.
 */
import { THREE, PI, DEG, GRAV, clamp, wrap, rnd, gauss, G, scene, camera, planeMesh, smoke, flash, spray, spark, spawnSplash } from "./core.js";
import { sfx, at } from "./audio.js";
import { hullHit, bombHit, bulletHit, hitFX } from "./ships.js";

export const air = { planes: [], bullets: [], aa: [], bombs: [], flak: [], flares: [], bombTrails: [], hits: 0, hitMark: 0, hitText: 0, nearMark: 0, killMark: 0, aimYaw: 0, aimPitch: 0, firing: false, cockpit: false };
const opp = (side) => (side === "us" ? "foe" : "us");
const shipsOf = (side) => G.ships.filter((s) => s.alive && s.side === side);
const nearest = (p, list, max = Infinity) => { let b = null, d = max * max; for (const o of list) { const dd = o.pos.distanceToSquared(p); if (dd < d) { d = dd; b = o; } } return b; };
const flying = (side) => air.planes.filter((q) => q.alive && !q.crashed && (!side || q.side === side));

function lineLayer(color, max) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(max * 6), 3)); geo.setDrawRange(0, 0);
  const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  l.frustumCulled = false; scene.add(l); return { l, geo, max };
}
const usLines = lineLayer(0xffd27a, 1600), foeLines = lineLayer(0xff9b5a, 1200), aaLines = lineLayer(0xff6a3a, 900);
function drawLines(layer, list, len) {
  const a = layer.geo.attributes.position.array; let n = 0;
  for (const b of list) { if (n >= layer.max) break; const k = n * 6, s = len / b.v.length();
    a[k] = b.p.x; a[k + 1] = b.p.y; a[k + 2] = b.p.z; a[k + 3] = b.p.x - b.v.x * s; a[k + 4] = b.p.y - b.v.y * s; a[k + 5] = b.p.z - b.v.z * s; n++; }
  layer.geo.attributes.position.needsUpdate = true; layer.geo.setDrawRange(0, n * 2);
}

const GUNS6 = [[2.1, -0.28, 1.3], [-2.1, -0.28, 1.3], [2.6, -0.3, 1.2], [-2.6, -0.3, 1.2], [3.1, -0.32, 1.1], [-3.1, -0.32, 1.1]];
const bombGeo = new THREE.CylinderGeometry(0.17, 0.17, 1.4, 10); bombGeo.rotateX(PI / 2);
const bombMat = new THREE.MeshStandardMaterial({ color: 0x4a4f3e, roughness: 0.6, metalness: 0.4 });
export const dirFrom = (yaw, pitch) => new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw));
export const aimDir = () => dirFrom(air.aimYaw, air.aimPitch);
let planeNo = 0, foeNo = 0;
const PILOTS = ["위트필드", "모로", "하퍼", "캘러웨이", "던컨", "브릭스", "엘리엇", "노블", "프레스턴", "애시퍼드", "콜먼", "랜싱"];
export const MODE_NAMES = { climb: "상승 · 접근", dive: "급강하 폭격", extend: "이탈", home: "귀환", dogfight: "공중전", break: "회피 기동", cap: "상공 초계" };
export const ROLE_NAMES = { auto: "자동", fighter: "요격", strike: "공격" };

export class Plane {
  constructor(pos, heading, ai, side = "us") {
    this.side = side; this.obj = planeMesh(1, side === "foe"); scene.add(this.obj); this.obj.position.copy(pos);
    this.obj.rotation.set(0, PI / 2 - heading, 0); this.obj.rotateX(-8 * DEG);
    this.speed = 62; this.throttle = 1; this.hp = 100; this.ammo = 3600; this.bombs = 2; this.flares = 6; this.flareT = 0; this.flareCD = 0; this.flareP = null; this.alive = true; this.crashed = false;
    this.fireT = 0; this.gunI = 0; this.smokeT = 0; this.bombCD = 0; this.pitchCmd = 0; this.firing = false; this.kills = 0;
    this.ai = ai; this.role = "auto"; this.capPhase = rnd() * 6.283; this.spread = new THREE.Vector3(gauss() * 160, gauss() * 70, gauss() * 160); this.thrK = 0.9 + rnd() * 0.1; this.mode = "climb"; this.modeT = 0; this.endT = 0; this.bandit = null; this.breakT = 0; this.breakS = 1;
    this.callsign = side === "us" ? `와일드캣 ${++planeNo}` : `적기 ${++foeNo}`; this.rank = side === "us" ? "대위" : "";
    this.pilot = side === "us" ? `${PILOTS[(planeNo - 1) % PILOTS.length]} 대위` : ""; // fictional pilots
    this.aimYaw = heading; this.aimPitch = 7 * DEG;
  }
  get pos() { return this.obj.position; }
  get label() { return this.pilot ? `${this.pilot} (${this.callsign.replace("와일드캣 ", "WC-")})` : this.callsign; }
  axis(x, y, z) { return new THREE.Vector3(x, y, z).applyQuaternion(this.obj.quaternion); }
  get fwd() { return this.axis(0, 0, 1); }
  get up() { return this.axis(0, 1, 0); }
  get right() { return this.axis(-1, 0, 0); }
  get vel() { return this.fwd.multiplyScalar(this.speed); }
  get home() { return this.side === "us" ? G.carrier : G.foeCarrier; }
  /** Flight model: the aircraft rolls and pulls toward the aim direction (mouse aim). */
  fly(dt, aim) {
    const o = this.obj, eff = clamp((this.speed - 32) / 55, 0.12, 1);
    if (this.alive) {
      const lt = aim.clone().applyQuaternion(o.quaternion.clone().invert());
      const off = Math.acos(clamp(lt.z, -1, 1)), yawOff = Math.atan2(-lt.x, lt.z), bank = Math.asin(clamp(-this.right.y, -1, 1));
      const w = clamp((off - 15 * DEG) / (20 * DEG), 0, 1), rollErr = Math.atan2(-lt.x, lt.y) * w + (clamp(yawOff * 3, -60 * DEG, 60 * DEG) - bank) * (1 - w);
      const pitch = lt.z > 0 ? clamp(Math.atan2(lt.y, lt.z) * 4, -1, 1) : 1; this.pitchCmd = pitch;
      o.rotateZ(clamp(rollErr * 3, -1, 1) * 160 * DEG * eff * dt);
      o.rotateX(-pitch * (pitch > 0 ? 72 : 45) * DEG * eff * dt);
      o.rotateY(-clamp(yawOff * 3, -1, 1) * 8 * DEG * eff * dt);
    } else { o.rotateZ(1.6 * dt); o.rotateX(0.35 * dt); this.throttle = 0; }
    const f = this.fwd;
    this.speed = clamp(this.speed + (this.throttle * 11 - 0.00055 * this.speed * this.speed - GRAV * f.y - Math.abs(this.pitchCmd) * 3 * (this.speed / 120)) * dt, 0, 215);
    if (this.speed < 40) o.rotateX((40 - this.speed) * 0.012 * dt);
    o.position.addScaledVector(f, this.speed * dt); o.position.y -= Math.max(0, 42 - this.speed) * 0.4 * dt;
    o.userData.prop.rotation.z += dt * (18 + 70 * this.throttle);
  }
  /** A hostile fighter close behind with its nose on us. */
  tailThreat() {
    const P = this.pos, f = this.fwd;
    for (const b of flying(opp(this.side))) {
      const r = P.clone().sub(b.pos), d = r.length(); if (d > 750) continue;
      if (r.dot(f) > 0 && b.fwd.angleTo(r) < 18 * DEG) return b;
    }
    return null;
  }
  /** Computer pilot. */
  think(dt) {
    const P = this.pos, H = this.home; this.modeT += dt; this.firing = false; this.breakT = Math.max(0, this.breakT - dt);
    const E = this.side === "us" && this.role === "strike" && G.enemy && G.enemy.alive && G.enemy.root.visible ? G.enemy : nearest(P, shipsOf(opp(this.side)));
    const empty = this.ammo <= 0 && this.bombs <= 0;
    if ((empty || this.hp < 30 || (!E && !flying(opp(this.side)).length)) && this.mode !== "home") { this.mode = "home"; if (this.side === "us") G.log(`${this.label} 귀환 중`); }
    const role = this.role || "auto";
    if (role === "fighter" && (this.mode === "climb" || this.mode === "dive" || this.mode === "extend")) this.mode = "cap";
    if (role === "strike" && this.mode === "cap") this.mode = "climb";
    if (this.mode !== "home" && this.mode !== "dogfight" && this.ammo > 0 && role !== "strike") { // interceptors engage enemy fighters first
      const b = nearest(P, flying(opp(this.side)), role === "fighter" ? 6500 : this.side === "us" ? 3200 : 2600);
      if (b) { this.mode = "dogfight"; this.modeT = 0; this.bandit = b; if (this.side === "us" && G.plane !== this) G.log(`${this.label} — 적기 발견, 요격!`); }
    }
    let tgt;
    if (this.mode === "home") {
      if (!H || !H.alive) tgt = P.clone().add(this.fwd.multiplyScalar(500)).setY(Math.max(P.y, 400));
      else { tgt = H.pos.clone().setY(180); if (P.distanceTo(tgt) < 500) { this.landed = true; return dirFrom(this.aimYaw, 0); } }
    } else if (this.mode === "dogfight") {
      const B = this.bandit, threat = this.tailThreat();
      if (!B || !B.alive || B.crashed || P.distanceTo(B.pos) > (role === "fighter" ? 7000 : 4500) || this.modeT > 70 || this.ammo <= 0) { this.mode = role === "fighter" ? "cap" : "climb"; this.bandit = null; this.modeT = 0; tgt = P.clone().add(this.fwd.multiplyScalar(600)).setY(P.y + 150); }
      else {
        if (threat && this.breakT <= 0 && rnd() < dt * 1.4) { this.breakT = 2 + rnd() * 1.5; this.breakS = rnd() < 0.5 ? -1 : 1; if (this.ai && rnd() < 0.4) this.dropFlare(); }
        if (this.breakT > 0) tgt = P.clone().addScaledVector(this.right, 420 * this.breakS).addScaledVector(this.fwd, 140).add(new THREE.Vector3(0, P.y > 300 ? -90 : 60, 0));
        else {
          const d = P.distanceTo(B.pos), tof = d / 900; tgt = B.pos.clone().addScaledVector(B.vel, tof); tgt.y += 0.5 * GRAV * tof * tof;
          const ang = this.fwd.angleTo(tgt.clone().sub(P)); this.firing = d < 750 && ang < 4.5 * DEG;
        }
      }
    } else if (this.mode === "cap") { // combat air patrol over the fleet
      const F = this.side === "us" ? (G.player && G.player.alive ? G.player : G.carrier) : H;
      if (!F || !F.alive) { this.mode = "home"; return this.fwd; }
      const a = G.time * 0.11 + this.capPhase; tgt = new THREE.Vector3(F.pos.x + Math.cos(a) * 1500, 1100, F.pos.z + Math.sin(a) * 1500);
    } else {
      if (!E) { this.mode = "home"; return this.fwd; }
      const lead = E.pos.clone().addScaledVector(E.vel, 4), dxz = Math.hypot(lead.x - P.x, lead.z - P.z);
      if (this.mode === "climb") { tgt = lead.clone().setY(900); if (dxz < 2300 && P.y > 500) { this.mode = "dive"; this.modeT = 0; } }
      else if (this.mode === "dive") {
        tgt = lead.clone().setY(E.spec.fb + 4);
        const d = P.distanceTo(tgt), ang = this.fwd.angleTo(tgt.clone().sub(P));
        this.firing = this.ammo > 0 && d < 1100 && ang < 4 * DEG;
        if (this.bombs > 0 && P.y < 480) { const imp = predictBomb(this); if (imp) { // where the ship will be when the bomb lands, in its own frame
          const V = E.vel, fx = E.pos.x + V.x * imp.t, fz = E.pos.z + V.z * imp.t, c = Math.cos(E.heading), sn = Math.sin(E.heading), dx = imp.x - fx, dz = imp.z - fz;
          if (Math.abs(dx * c + dz * sn) < E.spec.L * 0.4 && Math.abs(-dx * sn + dz * c) < E.spec.B * 0.32 + 1) { this.dropBomb(); if (this.bombs > 0) this.bombCD = 0.15; } } }
        if (P.y < 130 || d < 260 || this.modeT > 40) { this.mode = "extend"; this.modeT = 0; this.extYaw = Math.atan2(P.z - E.pos.z, P.x - E.pos.x) + (rnd() - 0.5); }
      } else { tgt = P.clone().add(dirFrom(this.extYaw ?? 0, 25 * DEG).multiplyScalar(800)); if (this.modeT > 9) { this.mode = "climb"; this.modeT = 0; } }
    }
    // keep apart: each pilot flies his own offset on approach/patrol/return, and sheers off from a wingman that gets too close
    if (this.mode === "climb" || this.mode === "cap" || this.mode === "home" || this.mode === "extend") tgt.add(this.spread);
    for (const q of air.planes) { if (q === this || !q.alive || q.crashed || q.side !== this.side) continue; const r = P.clone().sub(q.pos), dd = r.length(); if (dd < 90 && dd > 0.1) tgt.addScaledVector(r.normalize(), (90 - dd) * 6); }
    if (this.ai) this.throttle = this.thrK;
    const d = tgt.sub(P).normalize(); this.aimYaw = Math.atan2(d.z, d.x); this.aimPitch = Math.asin(clamp(d.y, -1, 1));
    if (P.y < 70) this.aimPitch = Math.max(this.aimPitch, 12 * DEG);
    return dirFrom(this.aimYaw, this.aimPitch);
  }
  get activity() { return this.breakT > 0 ? MODE_NAMES.break : MODE_NAMES[this.mode] || this.mode; }
  update(dt) {
    const o = this.obj;
    const aim = this.ai ? this.think(dt) : aimDir();
    if (!this.ai) this.firing = air.firing;
    this.fly(dt, aim);
    this.bombCD = Math.max(0, this.bombCD - dt); this.flareCD = Math.max(0, this.flareCD - dt); this.flareT = Math.max(0, this.flareT - dt);
    if (this.alive && this.firing && this.ammo > 0) {
      this.fireT -= dt; const f = this.fwd;
      while (this.fireT <= 0) {
        this.fireT += 1 / 45; this.ammo = Math.max(0, this.ammo - 2);
        const g = GUNS6[this.gunI++ % 6], m = o.localToWorld(new THREE.Vector3(...g)), conv = o.position.clone().addScaledVector(f, 260);
        const dir = conv.sub(m).normalize(); dir.x += gauss() * 0.004; dir.y += gauss() * 0.004; dir.z += gauss() * 0.004;
        air.bullets.push({ p: m, v: f.clone().multiplyScalar(this.speed).addScaledVector(dir, 870), t: 0, side: this.side, by: this, own: this === G.plane });
        if (this.gunI % 3 === 0) flash.spawn({ x: m.x, y: m.y, z: m.z, life: 0.05, s0: 1.1, s1: 0.7, a: 0.9, c: 0xffd890 });
        if (this.gunI % 2 === 0) { const d = this === G.plane ? 0 : camera.position.distanceTo(o.position); if (d < 30) sfx.mgShot(0); else if (this.gunI % 6 === 0) at(d, () => sfx.mgShot(d)); }
      }
    } else this.fireT = 0;
    this.smokeT -= dt;
    if (this.smokeT <= 0 && this.hp < 50) { this.smokeT = 0.06; const t = o.localToWorld(new THREE.Vector3(0, 0, -1)); smoke.spawn({ x: t.x, y: t.y, z: t.z, life: 4, s0: 1.5, s1: 9, a: this.alive ? 0.5 : 0.85, c: this.alive ? 0x555555 : 0x151515 });
      if (!this.alive) flash.spawn({ x: t.x, y: t.y, z: t.z, life: 0.25, s0: 3, s1: 1.5, a: 1, c: 0xff7020 }); }
    const hit = o.position.y < 14 ? hullHit(o.position, null) : null;
    if (o.position.y < 1 || hit) {
      const p = o.position.clone(); if (hit) { hitFX(p, 0.3); hit.ship.damage(1.5); } else spawnSplash(p.x, p.z, 0.32);
      const d = p.distanceTo(camera.position); at(d, () => sfx.explode(d));
      if (this.alive) { this.alive = false; if (this.side === "us") G.log(`${this.label} 추락`, "bad"); }
      this.crashed = true; scene.remove(o); this.endT = 3;
    }
  }
  dropBomb() {
    if (!this.alive || this.bombs <= 0 || this.bombCD > 0) return false;
    this.bombs--; this.bombCD = 0.6; if (this.side === "us" && G.stats) G.stats.bombsDropped = (G.stats.bombsDropped || 0) + 1; const o = this.obj, m = new THREE.Mesh(bombGeo, bombMat);
    const p = o.localToWorld(new THREE.Vector3(this.bombs ? 1.2 : -1.2, -0.7, 0.6)); m.position.copy(p); scene.add(m);
    air.bombs.push({ p, v: this.vel, m, side: this.side, trail: [p.clone()], tt: 0, from: this }); if (this === G.plane) sfx.click(); return true;
  }
  /** Decoy flares (game feature, not WWII equipment): AA lays on the flare for a few seconds. */
  dropFlare() {
    if (!this.alive || this.flares <= 0 || this.flareCD > 0) return false;
    this.flares--; this.flareCD = 1.2; this.flareT = 4;
    for (const s of [-1, 1]) { const p = this.obj.localToWorld(new THREE.Vector3(s * 0.8, -0.6, -2)), v = this.vel.multiplyScalar(0.55).add(new THREE.Vector3(gauss() * 6, -4, gauss() * 6)); const f = { p, v, t: 5 }; air.flares.push(f); this.flareP = f; }
    if (this === G.plane) sfx.click(); return true;
  }
  damage(n, by = null) {
    if (!this.alive) return; this.hp -= n; if (this.ai && this.hp < 80 && rnd() < 0.08) this.dropFlare();
    if (this.ai && by && by.alive && this.mode !== "home" && this.ammo > 0 && this.mode !== "dogfight" && this.role !== "strike") { this.mode = "dogfight"; this.bandit = by; this.modeT = 0; }
    if (this.hp <= 0) {
      this.hp = 0; this.alive = false; hitFX(this.pos, 0.15); if (by && (by.own || by === G.plane)) { air.killMark = 2; G.shake = Math.max(G.shake || 0, 0.45); flash.spawn({ x: this.pos.x, y: this.pos.y, z: this.pos.z, life: 0.45, s0: 10, s1: 26, a: 1, c: 0xff8a30 }); for (let k = 0; k < 14; k++) spark.spawn({ x: this.pos.x, y: this.pos.y, z: this.pos.z, vx: gauss() * 30, vy: gauss() * 20 + 8, vz: gauss() * 30, g: GRAV, life: 2.2, s0: 2.2, s1: 0.8, a: 1, c: k % 3 ? 0xffb050 : 0x555548 }); const d = camera.position.distanceTo(this.pos); at(d * 0.5, () => sfx.explode(d * 0.5)); }
      if (this.side === "us") G.log(`${this.label} 피격 — 격추당함!`, "bad");
      else {
        const who = by ? (by === G.plane ? "직접 조종" : by.label) : "대공포";
        G.stats.planes = (G.stats.planes || 0) + 1; G.ribbon?.("적기 격추"); G.log(`${this.callsign} 격추! (${who})`, "hit");
        if (by) { by.kills++; if (by.kills === 5) G.log(`${by.label} — 5기 격추, 에이스 달성!`, "hit"); }
      }
    }
  }
}

/** Where a bomb released now would hit the water (continuously computed impact point). */
export function predictBomb(p) {
  const pos = p.pos.clone().add(new THREE.Vector3(0, -0.7, 0)), v = p.vel; const dt = 0.05;
  let t = 0; for (; t < 40 && pos.y > 0; t += dt) { v.y -= GRAV * dt; v.multiplyScalar(1 - 0.03 * dt); pos.addScaledVector(v, dt); }
  if (pos.y > 0) return null; pos.t = t; return pos;
}
/** Gun solution: where to put the nose so the bullets meet the target (time of flight + target motion + drop). */
export function gunLead(p, tgtPos, tgtVel) {
  const d = p.pos.distanceTo(tgtPos), tof = d / (870 + p.speed * 0.9);
  const lead = tgtPos.clone().addScaledVector(tgtVel, tof); lead.y += 0.5 * GRAV * tof * tof; return { lead, d, tof };
}

/** Catapult a fighter from a carrier. side "us": Lexington (G.squad); "foe": the enemy carrier (G.foeSquad). */
export function launchPlane(ai, side = "us", role = "auto") {
  const C = side === "us" ? G.carrier : G.foeCarrier;
  if (!C || !C.alive) return "항모가 없어 출격할 수 없습니다";
  if (side === "us") {
    if (!ai && G.plane) return null;
    if (G.squad <= 0) return "대기 중인 전투기가 없습니다";
    if (G.planeCD > 0) return `갑판 정리 중 — ${Math.ceil(G.planeCD)}초 후 사출 가능`;
  } else if (G.foeSquad <= 0 || G.foePlaneCD > 0) return "no";
  const f = C.fwd, pos = new THREE.Vector3(C.pos.x + f.x * C.spec.L * 0.32, C.spec.fb + 8.6 + 3.5, C.pos.z + f.z * C.spec.L * 0.32);
  const p = new Plane(pos, C.heading, ai, side); p.role = side === "foe" ? (rnd() < 0.5 ? "strike" : "auto") : role; p.speed = C.speed + 52; air.planes.push(p);
  if (side === "foe") { G.foeSquad--; G.foePlaneCD = 5; return null; }
  G.squad--; G.planeCD = 6;
  if (!ai) { G.plane = p; air.aimYaw = C.heading; air.aimPitch = 7 * DEG; air.firing = false; }
  G.log(`렉싱턴에서 ${p.label} 사출 — ${ai ? `임무: ${ROLE_NAMES[role]}` : "직접 조종"} (대기 ${G.squad}기)`);
  return null;
}
/** Enemy raid arriving from off the map (air-raid mission). */
export function spawnRaid(x, z, heading, n, alt = 1200) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Vector3(-Math.sin(heading), 0, Math.cos(heading)), b = new THREE.Vector3(Math.cos(heading), 0, Math.sin(heading));
    const p = new Plane(new THREE.Vector3(x, alt + rnd() * 200, z).addScaledVector(s, (i - (n - 1) / 2) * 60).addScaledVector(b, -Math.abs(i - (n - 1) / 2) * 50), heading, true, "foe");
    p.speed = 90; p.mode = "climb"; p.role = rnd() < 0.5 ? "strike" : "auto"; air.planes.push(p);
  }
}
/** Manual plane → computer pilot; the camera goes back to the ship. */
export function autopilot() { const P = G.plane; if (!P) return; P.ai = true; P.mode = "climb"; G.plane = null; air.firing = false; G.log(`${P.label} 자동 조종 전환`); }
/** Computer pilot → player (the plane must be ours and flying). */
export function takeControl(p) { if (!p || !p.alive || p.crashed || p.side !== "us" || G.plane) return false; p.ai = false; G.plane = p; air.aimYaw = Math.atan2(p.fwd.z, p.fwd.x); air.aimPitch = Math.asin(clamp(p.fwd.y, -1, 1)); air.firing = false; return true; }
export function recallPlane() {
  const P = G.plane; if (!P) return;
  if (P.alive) { P.ai = true; P.mode = "home"; G.log(`${P.label} 귀환 명령`); } G.plane = null; air.firing = false;
}
function removePlane(p, returned) {
  scene.remove(p.obj); const i = air.planes.indexOf(p); if (i >= 0) air.planes.splice(i, 1); if (G.plane === p) { G.plane = null; air.firing = false; }
  if (returned && p.side === "us") { const t = Math.round(18 + (100 - p.hp) * 0.3); (G.refit ||= []).push({ t, label: p.label }); G.log(`${p.label} 착함 — 수리·재급탄·폭탄 탑재 중 (${t}초)`); G.radio?.("return"); }
  if (returned && p.side === "foe") G.foeSquad++;
}
export function clearAir() { for (const p of [...air.planes]) removePlane(p, false); G.plane = null; for (const b of air.bombs) scene.remove(b.m); air.bullets.length = 0; air.aa.length = 0; air.bombs.length = 0; air.flak.length = 0; air.flares.length = 0; air.bombTrails.length = 0; air.hits = 0; planeNo = 0; foeNo = 0; drawLines(usLines, [], 0); drawLines(foeLines, [], 0); drawLines(aaLines, [], 0); }

function stepBullets(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i]; let dead = false;
    for (let s = 0; s < 2 && !dead; s++) {
      const h = dt / 2; b.t += h; b.v.y -= GRAV * h; b.v.multiplyScalar(1 - 0.12 * h); b.p.addScaledVector(b.v, h);
      if (b.p.y <= 0) { if (rnd() < 0.5) spray.spawn({ x: b.p.x, y: 0.5, z: b.p.z, vy: 6 + rnd() * 5, g: GRAV, life: 0.9, s0: 0.8, s1: 2.4, a: 0.8, fade: 0.6, c: 0xffffff }); dead = true; break; }
      for (const P of air.planes) {
        if (!P.alive || P.side === b.side) continue; const d2 = b.p.distanceToSquared(P.pos);
        if (b.own && d2 < (b.minD ?? 1e9)) b.minD = d2;
        if (d2 >= 30) continue;
        P.damage(b.dmg ?? (b.aa ? 0.9 + rnd() * 0.6 : (2.2 + rnd() * 1.5) * (b.side === "foe" ? 0.6 : 1)), b.by || null); dead = true; b.hit = true;
        if (b.own) { air.hits++; air.hitMark = 0.35; air.hitText = 0.7; sfx.hitTick(); sfx.hitThunk?.(); G.shake = Math.max(G.shake || 0, 0.12); smoke.spawn({ x: b.p.x, y: b.p.y, z: b.p.z, life: 1.2, s0: 1.5, s1: 5, a: 0.4, c: 0x2a2a2a }); for (let k = 0; k < 3; k++) spark.spawn({ x: P.pos.x, y: P.pos.y, z: P.pos.z, vx: gauss() * 18, vy: gauss() * 10 + 4, vz: gauss() * 18, g: GRAV, life: 1.4, s0: 1.2, s1: 1.0, a: 1, c: 0x6b6b60 }); flash.spawn({ x: P.pos.x, y: P.pos.y, z: P.pos.z, life: 0.18, s0: 4, s1: 9, a: 1, c: 0xffc070 }); for (let k = 0; k < 4; k++) spark.spawn({ x: P.pos.x, y: P.pos.y, z: P.pos.z, vx: gauss() * 12, vy: gauss() * 8, vz: gauss() * 12, g: GRAV, life: 0.7, s0: 1.6, s1: 0.5, a: 1, c: 0xffe0a0 }); smoke.spawn({ x: P.pos.x, y: P.pos.y, z: P.pos.z, life: 2.5, s0: 2, s1: 8, a: 0.6, c: 0x333333 }); }
        if (rnd() < 0.4) spark.spawn({ x: b.p.x, y: b.p.y, z: b.p.z, vx: gauss() * 6, vy: 3 + rnd() * 5, vz: gauss() * 6, g: GRAV, life: 0.5, s0: 1.4, s1: 0.4, a: 1, c: 0xffd080 }); break;
      }
      if (!dead && !b.aa && b.p.y < 40) {
        const hit = hullHit(b.p, null);
        if (hit && hit.ship.side !== b.side) {
          if (b.side === "us") { bulletHit(hit.ship, b.p); if (b.own) { air.hits++; air.hitMark = 0.25; sfx.hitTick(); } }
          else hit.ship.damage(0.015 * clamp(40 / hit.ship.spec.belt, 0.04, 1) * hit.ship.armorK);
          dead = true;
        } else if (hit) dead = true;
      }
    }
    if (dead || b.t > (b.aa ? 4 : 3)) { if (b.own && !b.hit && b.minD !== undefined && b.minD < 900) air.nearMark = 0.45; list.splice(i, 1); }
  }
}
function stepBombs(dt) {
  for (let i = air.bombs.length - 1; i >= 0; i--) {
    const b = air.bombs[i]; b.v.y -= GRAV * dt; b.v.multiplyScalar(1 - 0.03 * dt); b.p.addScaledVector(b.v, dt);
    b.m.position.copy(b.p); b.m.lookAt(b.p.clone().add(b.v));
    b.tt += dt; if (b.tt > 0.15) { b.tt = 0; b.trail.push(b.p.clone()); }
    const end = (hitShip) => { b.trail.push(b.p.clone()); if (b.side === "us") { air.bombTrails.push({ pts: b.trail, t: 8 }); if (air.bombTrails.length > 12) air.bombTrails.shift();
        let miss = 0; if (!hitShip) { let best = Infinity; for (const S of G.ships) if (S.alive && S.side !== b.side) best = Math.min(best, Math.hypot(S.pos.x - b.p.x, S.pos.z - b.p.z) - S.spec.B / 2); miss = Math.max(0, Math.round(best)); }
        G.onBombImpact?.(b.p.clone(), !!hitShip, miss, b.from); } scene.remove(b.m); air.bombs.splice(i, 1); };
    const hit = b.p.y < 40 ? hullHit(b.p, null) : null;
    if (hit && hit.ship.side !== b.side) { bombHit(hit.ship, b.p.clone(), hit.lx, b.side === "us"); end(hit.ship); continue; }
    if (b.p.y <= 0) { spawnSplash(b.p.x, b.p.z, 0.55); hitFX(new THREE.Vector3(b.p.x, 0, b.p.z), 0.25); const d = b.p.distanceTo(camera.position); at(d, () => sfx.explode(d));
      if (b.side === "us") G.log("폭탄 근탄 — 빗나감"); end(null); }
  }
}
/** Anti-aircraft fire from every armed ship at the nearest hostile aircraft: time-fused heavy flak and light AA tracers. */
function stepAA(dt) {
  for (let i = air.flak.length - 1; i >= 0; i--) {
    const f = air.flak[i]; f.t -= dt; if (f.t > 0) continue; air.flak.splice(i, 1);
    flash.spawn({ x: f.p.x, y: f.p.y, z: f.p.z, life: 0.12, s0: 6, s1: 10, a: 1, c: 0xffb060 });
    for (let k = 0; k < 3; k++) smoke.spawn({ x: f.p.x + gauss() * 2, y: f.p.y + gauss() * 2, z: f.p.z + gauss() * 2, vx: 0.6, vy: 0.2, life: 7, s0: 4, s1: 17, a: 0.9, c: 0x161616 });
    const d = camera.position.distanceTo(f.p); if (d < 3500) at(d, () => sfx.flak(d));
    const R = f.own ? 55 : 30; let hit = false;
    for (const P of air.planes) if (P.alive && P.side !== f.side) { const dd = P.pos.distanceTo(f.p); if (dd < R) { hit = true; P.damage(f.own ? (R - dd) * 2.2 + 18 : (30 - dd) * 0.6, f.own ? f.by : null); } }
    if (f.own) { flash.spawn({ x: f.p.x, y: f.p.y, z: f.p.z, life: 0.25, s0: 10, s1: 20, a: 1, c: 0xffa040 }); if (hit) { air.hits++; air.hitMark = 0.35; air.hitText = 0.7; sfx.hitThunk?.(); } else air.nearMark = 0.3; }
  }
  for (const S of G.ships) if (S.alive && S.spec.aa && !S.sinking) aaFrom(S, dt);
}
function aaFrom(E, dt) {
  E.flakT ??= rnd(); E.lightT ??= 0;
  let P = null, d = Infinity; for (const p of air.planes) if (p.alive && !p.crashed && p.side !== E.side) { const dd = p.pos.distanceTo(E.pos); if (dd < d) { d = dd; P = p; } }
  if (!P) return; const k = E.spec.aa;
  if (d < 6500) {
    E.flakT -= dt;
    if (E.flakT <= 0) { E.flakT = (0.8 + rnd() * 0.7) / k; const fl = P.flareT > 0 && P.flareP, AP = fl ? fl.p : P.pos, AV = fl ? fl.v : P.vel, tof = d / 760, pred = AP.clone().addScaledVector(AV, tof), err = 16 + d * 0.015;
      air.flak.push({ t: tof, side: E.side, p: pred.add(new THREE.Vector3(gauss() * err, gauss() * err * 0.7, gauss() * err)) }); }
  }
  if (d < 2600 && P.pos.y < 2200) {
    E.lightT -= dt;
    while (E.lightT <= 0) {
      E.lightT += 0.09 / k;
      const s = E.spec, src = new THREE.Vector3(E.pos.x + Math.cos(E.heading) * (rnd() - 0.5) * s.L * 0.6, s.fb + 6 + rnd() * 6, E.pos.z + Math.sin(E.heading) * (rnd() - 0.5) * s.L * 0.6);
      const fl = P.flareT > 0 && P.flareP, AP = fl ? fl.p : P.pos, AV = fl ? fl.v : P.vel, tof = src.distanceTo(AP) / 880, pred = AP.clone().addScaledVector(AV, tof * 0.85);
      const dir = pred.sub(src).normalize(); dir.x += gauss() * 0.028; dir.y += gauss() * 0.028; dir.z += gauss() * 0.028;
      air.aa.push({ p: src, v: dir.normalize().multiplyScalar(880), t: 0, side: E.side, aa: true });
    }
  }
}
export function updateAir(dt) {
  if (G.refit) for (let i = G.refit.length - 1; i >= 0; i--) { const r = G.refit[i]; r.t -= dt; if (r.t <= 0) { G.refit.splice(i, 1); if (G.carrier?.alive) { G.squad++; G.log(`${r.label} 정비 완료 — 재출격 가능 (대기 ${G.squad}기)`, "hit"); } } }
  for (const p of [...air.planes]) {
    if (!p.crashed) { p.update(dt); if (p.pos.y > 5000) p.pos.y = 5000; }
    if (p.side === "foe" && p.mode === "home" && !(G.foeCarrier && G.foeCarrier.alive) && Math.hypot(p.pos.x, p.pos.z) > 26000) { removePlane(p, false); continue; } // raiders that turned for home leave the map
    if (p.landed) { removePlane(p, true); continue; }
    if (p.crashed) { p.endT -= dt; if (p.endT <= 0) removePlane(p, false); }
  }
  stepBullets(air.bullets, dt); stepBullets(air.aa, dt); stepBombs(dt); stepAA(dt);
  drawLines(usLines, air.bullets.filter((b) => b.side === "us"), 16); drawLines(foeLines, air.bullets.filter((b) => b.side === "foe"), 16); drawLines(aaLines, air.aa, 22);
  G.planeCD = Math.max(0, G.planeCD - dt); G.foePlaneCD = Math.max(0, (G.foePlaneCD || 0) - dt);
  air.hitMark = Math.max(0, air.hitMark - dt); air.hitText = Math.max(0, air.hitText - dt); air.nearMark = Math.max(0, air.nearMark - dt); air.killMark = Math.max(0, air.killMark - dt);
  for (let i = air.bombTrails.length - 1; i >= 0; i--) { air.bombTrails[i].t -= dt; if (air.bombTrails[i].t <= 0) air.bombTrails.splice(i, 1); }
  for (let i = air.flares.length - 1; i >= 0; i--) { const f = air.flares[i]; f.t -= dt; f.v.y -= 6 * dt; f.v.multiplyScalar(1 - 0.8 * dt); f.p.addScaledVector(f.v, dt);
    flash.spawn({ x: f.p.x, y: f.p.y, z: f.p.z, life: 0.12, s0: 4, s1: 2, a: 1, c: 0xfff2c0 }); if (rnd() < 0.5) smoke.spawn({ x: f.p.x, y: f.p.y, z: f.p.z, vy: 0.5, life: 3, s0: 1.2, s1: 6, a: 0.35, c: 0xdedede });
    if (f.t <= 0 || f.p.y < 0) air.flares.splice(i, 1); }
}
G.onPlaneSwap = (o, n) => { for (const p of air.planes) if (p.obj === o) p.obj = n; };
void wrap; void spark;
