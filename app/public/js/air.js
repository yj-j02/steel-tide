/**
 * Steel Tide — gun-type anti-aircraft rounds and flak bursts (the player's G mount). Missiles,
 * jets and their guns live in modern.js; this file only flies the shells and draws the tracers.
 */
import { THREE, GRAV, rnd, gauss, G, scene, camera, smoke, flash, spray, spark } from "./core.js";
import { sfx, at } from "./audio.js";

export const air = { aa: [], flak: [], hits: 0, hitMark: 0, hitText: 0, nearMark: 0, killMark: 0 };
export const dirFrom = (yaw, pitch) => new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw));

function lineLayer(color, max) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(max * 6), 3)); geo.setDrawRange(0, 0);
  const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  l.frustumCulled = false; scene.add(l); return { l, geo, max };
}
const aaLines = lineLayer(0xff6a3a, 900);
function drawLines(layer, list, len) {
  const a = layer.geo.attributes.position.array; let n = 0;
  for (const b of list) { if (n >= layer.max) break; const k = n * 6, s = len / b.v.length();
    a[k] = b.p.x; a[k + 1] = b.p.y; a[k + 2] = b.p.z; a[k + 3] = b.p.x - b.v.x * s; a[k + 4] = b.p.y - b.v.y * s; a[k + 5] = b.p.z - b.v.z * s; n++; }
  layer.geo.attributes.position.needsUpdate = true; layer.geo.setDrawRange(0, n * 2);
}

function stepShells(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i]; b.t += dt; b.v.y -= GRAV * dt; b.v.multiplyScalar(1 - 0.12 * dt); b.p.addScaledVector(b.v, dt);
    if (b.p.y <= 0) { if (rnd() < 0.5) spray.spawn({ x: b.p.x, y: 0.5, z: b.p.z, vy: 6 + rnd() * 5, g: GRAV, life: 0.9, s0: 0.8, s1: 2.4, a: 0.8, fade: 0.6, c: 0xffffff }); list.splice(i, 1); continue; }
    if (b.t > 4) { if (b.own && !b.hit && b.minD !== undefined && b.minD < 900) air.nearMark = 0.45; list.splice(i, 1); }
  }
}
/** Anti-aircraft fire from every armed ship at the nearest hostile aircraft: time-fused heavy flak and light AA tracers. */
function stepAA(dt) {
  for (let i = air.flak.length - 1; i >= 0; i--) {
    const f = air.flak[i]; f.t -= dt; if (f.t > 0) continue; air.flak.splice(i, 1);
    flash.spawn({ x: f.p.x, y: f.p.y, z: f.p.z, life: 0.12, s0: 6, s1: 10, a: 1, c: 0xffb060 });
    for (let s = 0; s < 6; s++) spark.spawn({ x: f.p.x, y: f.p.y, z: f.p.z, vx: gauss() * 28, vy: gauss() * 22, vz: gauss() * 28, life: 0.32 + rnd() * 0.25, s0: 0.65, s1: 0.15, a: 0.95, c: 0xffa845, g: 14, drag: 1.5 });
    for (let k = 0; k < 3; k++) smoke.spawn({ x: f.p.x + gauss() * 2, y: f.p.y + gauss() * 2, z: f.p.z + gauss() * 2, vx: 0.6, vy: 0.2, life: 7, s0: 4, s1: 17, a: 0.9, c: 0x161616 });
    const d = camera.position.distanceTo(f.p); if (d < 3500) at(d, () => sfx.flak(d));
    const R = f.own ? 55 : 30; let hit = false;
    for (const P of []) if (P.alive && P.side !== f.side) { const dd = P.pos.distanceTo(f.p); if (dd < R) { hit = true; P.damage(f.own ? (R - dd) * 2.2 + 18 : (30 - dd) * 0.6, f.own ? f.by : null); } }
    if (f.own) { flash.spawn({ x: f.p.x, y: f.p.y, z: f.p.z, life: 0.25, s0: 10, s1: 20, a: 1, c: 0xffa040 }); if (hit) { air.hits++; air.hitMark = 0.35; air.hitText = 0.7; sfx.hitThunk?.(); } else air.nearMark = 0.3; }
  }
}
export function clearAir() { air.aa.length = 0; air.flak.length = 0; }
export function updateAir(dt) {
  stepShells(air.aa, dt); stepAA(dt); drawLines(aaLines, air.aa, 22);
  air.hitMark = Math.max(0, air.hitMark - dt); air.hitText = Math.max(0, air.hitText - dt); air.nearMark = Math.max(0, air.nearMark - dt); air.killMark = Math.max(0, air.killMark - dt);
}
