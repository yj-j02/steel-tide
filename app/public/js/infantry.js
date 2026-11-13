/**
 * Steel Tide — boarding party models: articulated low-poly riflemen (USMC / IJN landing force) with walk, aim
 * and recoil, plus first-person view models drawn over the world: the M1 Garand (hip / aimed down the sights,
 * reload dip, muzzle flash) and the LCVP's .30 cal Browning M1919 on its pintle.
 */
import { THREE, PI, ovScene } from "./core.js";

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0.05, ...o });
const MAT = {
  us: M(0x5d6748), usDark: M(0x48513a), jp: M(0x9a8c5f), jpDark: M(0x7a704d), skin: M(0xc69d7a), skinD: M(0xa9805f),
  helmUS: M(0x4b5434, { roughness: 0.9 }), helmJP: M(0x6c6744, { roughness: 0.9 }), web: M(0x8c8257), wood: M(0x6e4628, { roughness: 0.55 }),
  steel: M(0x4a4f54, { metalness: 0.55, roughness: 0.4 }), boot: M(0x3a2a1d), cloth: M(0x2f3a2a), flash: new THREE.MeshBasicMaterial({ color: 0xffc45a, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
};
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
const cyl = (r0, r1, h, m, seg = 8) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m);
/** a limb hanging from its top pivot (rotate the returned group) */
function limb(len, r, m) { const g = new THREE.Group(), c = cyl(r, r * 0.82, len, m); c.position.y = -len / 2; g.add(c); return g; }
function rifle(jp) {
  const g = new THREE.Group(), L = jp ? 1.28 : 1.1;
  const stock = box(L * 0.62, 0.075, 0.05, MAT.wood, -L * 0.12, 0, 0); g.add(stock);
  const butt = box(0.16, 0.13, 0.05, MAT.wood, -L * 0.43, -0.03, 0); g.add(butt);
  const rec = box(0.2, 0.06, 0.045, MAT.steel, 0.05, 0.045, 0); g.add(rec);
  const bar = cyl(0.012, 0.012, L * 0.55, MAT.steel, 6); bar.rotation.z = PI / 2; bar.position.set(L * 0.3, 0.035, 0); g.add(bar);
  if (jp) { const bay = box(0.32, 0.012, 0.012, MAT.steel, L * 0.68, 0.03, 0); g.add(bay); }
  const muzzle = new THREE.Object3D(); muzzle.position.set(L * 0.58 + (jp ? 0.3 : 0), 0.035, 0); g.add(muzzle); g.userData.muzzle = muzzle;
  return g;
}
/** A rifleman. Forward = +x (ship-local convention used by the deck fight). */
export function soldier(side) {
  const us = side === "us", body = us ? MAT.us : MAT.jp, dark = us ? MAT.usDark : MAT.jpDark, root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.94; root.add(hips);
  const legs = [0.1, -0.1].map((z) => { const up = limb(0.46, 0.078, body); up.position.z = z; const sh = limb(0.44, 0.064, us ? dark : MAT.web); sh.position.y = -0.46; up.add(sh);
    const bt = box(0.24, 0.09, 0.11, MAT.boot, 0.05, -0.44, 0); sh.add(bt); hips.add(up); return { up, sh }; });
  const torso = new THREE.Group(); hips.add(torso);
  torso.add(box(0.25, 0.56, 0.4, body, 0, 0.3, 0));
  torso.add(box(0.27, 0.07, 0.42, MAT.web, 0, 0.04, 0));
  if (us) { torso.add(box(0.14, 0.3, 0.3, MAT.web, -0.19, 0.36, 0)); for (const z of [-0.12, 0.12]) torso.add(box(0.06, 0.06, 0.07, MAT.web, 0.14, 0.06, z)); }
  else torso.add(box(0.05, 0.4, 0.06, MAT.web, 0.13, 0.32, 0.08));
  const neck = cyl(0.05, 0.055, 0.08, MAT.skinD); neck.position.y = 0.62; torso.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), MAT.skin); head.position.y = 0.74; head.scale.set(1, 1.12, 0.92); torso.add(head);
  if (us) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 8, 0, PI * 2, 0, PI / 2), MAT.helmUS); h.position.y = 0.77; h.scale.set(1.05, 0.85, 1); torso.add(h);
    const brim = cyl(0.165, 0.17, 0.018, MAT.helmUS, 16); brim.position.y = 0.77; torso.add(brim); }
  else { const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 8, 0, PI * 2, 0, PI / 2), MAT.helmJP); h.position.y = 0.79; torso.add(h);
    const rim = cyl(0.14, 0.145, 0.016, MAT.helmJP, 16); rim.position.y = 0.79; torso.add(rim); torso.add(box(0.012, 0.03, 0.03, M(0xd8b13a), 0.135, 0.84, 0));
    const flap = box(0.02, 0.12, 0.24, MAT.cloth, -0.12, 0.7, 0); torso.add(flap); }
  const arms = [0.24, -0.24].map((z) => { const up = limb(0.29, 0.062, body); up.position.set(0.02, 0.54, z); const fo = limb(0.27, 0.052, body); fo.position.y = -0.29; up.add(fo);
    const hand = box(0.08, 0.08, 0.06, MAT.skin, 0, -0.29, 0); fo.add(hand); torso.add(up); return { up, fo }; });
  const gun = rifle(!us); gun.position.set(0.24, 0.42, -0.02); torso.add(gun);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.22), MAT.flash); fl.visible = false; gun.userData.muzzle.add(fl); fl.rotation.y = PI / 2;
  const s = { root, hips, torso, legs, arms, gun, flash: fl, t: Math.random() * 10, kick: 0, fl: 0 };
  root.userData.sol = s; pose(s, 0); return s;
}
function pose(s, sw) {
  s.legs[0].up.rotation.z = sw; s.legs[1].up.rotation.z = -sw;
  s.legs[0].sh.rotation.z = -Math.max(0, sw) * 0.9; s.legs[1].sh.rotation.z = -Math.max(0, -sw) * 0.9;
  // rifle shouldered: right hand on the grip, left hand forward under the handguard
  s.arms[0].up.rotation.set(-0.35, 0, 0.55); s.arms[0].fo.rotation.set(0.2, 0, 1.25);
  s.arms[1].up.rotation.set(0.55, 0, 0.95); s.arms[1].fo.rotation.set(0.35, 0, 0.7);
}
/** walk cycle + recoil + muzzle flash */
export function animSoldier(s, dt, moving) {
  if (moving) s.t += dt * 9; const sw = moving ? Math.sin(s.t) * 0.55 : 0; pose(s, sw);
  s.hips.position.y = 0.94 + (moving ? Math.abs(Math.cos(s.t)) * 0.03 : 0);
  s.kick = Math.max(0, s.kick - dt * 8); s.gun.position.x = 0.24 - s.kick * 0.06; s.torso.rotation.z = -s.kick * 0.05;
  s.fl = Math.max(0, s.fl - dt); s.flash.visible = s.fl > 0; s.flash.rotation.x = Math.random() * PI;
}
export function fireSoldier(s) { s.kick = 1; s.fl = 0.06; }

// ── first-person view models (camera space: looking down -z) ──
export const garandVM = new THREE.Group(); garandVM.visible = false; ovScene.add(garandVM);
{
  const g = new THREE.Group(); garandVM.add(g); garandVM.userData.gun = g;
  g.add(box(0.06, 0.075, 0.62, MAT.wood, 0, -0.02, -0.12));
  g.add(box(0.055, 0.12, 0.16, MAT.wood, 0, -0.06, 0.25));
  g.add(box(0.05, 0.05, 0.2, MAT.steel, 0, 0.03, -0.05));
  const bar = cyl(0.011, 0.011, 0.55, MAT.steel, 10); bar.rotation.x = PI / 2; bar.position.set(0, 0.035, -0.6); g.add(bar);
  g.add(box(0.05, 0.025, 0.3, MAT.wood, 0, 0.035, -0.38));
  const fs = box(0.006, 0.03, 0.006, MAT.steel, 0, 0.065, -0.86); g.add(fs);
  const rr = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.005, 6, 16), MAT.steel); rr.position.set(0, 0.07, 0.03); g.add(rr);
  g.add(box(0.014, 0.03, 0.02, MAT.steel, 0, 0.05, 0.03));
  const sleeve = M(0x56603f);
  const rh = new THREE.Group(); rh.add(box(0.07, 0.06, 0.11, MAT.skin, 0, -0.06, 0.12)); const ra = cyl(0.05, 0.055, 0.35, sleeve, 8); ra.rotation.x = PI / 2.4; ra.position.set(0.03, -0.14, 0.3); rh.add(ra); g.add(rh);
  const lh = new THREE.Group(); lh.add(box(0.075, 0.05, 0.12, MAT.skin, -0.005, -0.04, -0.38)); const la = cyl(0.05, 0.055, 0.45, sleeve, 8); la.rotation.set(PI / 2.6, 0, -0.5); la.position.set(-0.12, -0.18, -0.2); lh.add(la); g.add(lh);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), MAT.flash); fl.position.set(0, 0.035, -0.9); g.add(fl); garandVM.userData.flash = fl;
  const fl2 = fl.clone(); fl2.rotation.y = PI / 2; fl.add(fl2);
}
/** ads 0..1, kick 0..1, reload 0..1 (dip), flash seconds left */
export function updateGarand(ads, kick, reload, flash) {
  const g = garandVM.userData.gun;
  g.scale.setScalar(0.8); const hip = [0.2, -0.19, -0.52], aim = [0, -0.056, -0.36];
  g.position.set(hip[0] + (aim[0] - hip[0]) * ads, hip[1] + (aim[1] - hip[1]) * ads - reload * 0.25, hip[2] + (aim[2] - hip[2]) * ads + kick * 0.05);
  g.rotation.set(kick * 0.12 + reload * 0.7, (1 - ads) * 0.06, reload * 0.4);
  const f = garandVM.userData.flash; f.visible = flash > 0; f.rotation.z = Math.random() * PI;
}
export const mgVM = new THREE.Group(); mgVM.visible = false; ovScene.add(mgVM);
{
  const g = new THREE.Group(); mgVM.add(g); mgVM.userData.gun = g;
  g.add(box(0.11, 0.12, 0.32, MAT.steel, 0, 0, 0.02));
  const jk = cyl(0.035, 0.035, 0.42, M(0x3a3e42, { metalness: 0.5, roughness: 0.5 }), 12); jk.rotation.x = PI / 2; jk.position.set(0, 0.01, -0.36); g.add(jk);
  for (let i = 0; i < 6; i++) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.004, 4, 12), MAT.steel); h.position.set(0, 0.01, -0.2 - i * 0.06); g.add(h); }
  const bar = cyl(0.012, 0.012, 0.16, MAT.steel, 8); bar.rotation.x = PI / 2; bar.position.set(0, 0.01, -0.64); g.add(bar);
  g.add(box(0.16, 0.1, 0.13, M(0x4d5536), -0.15, -0.02, 0.02));
  for (const x of [-0.05, 0.05]) { const grip = cyl(0.016, 0.016, 0.1, MAT.wood, 8); grip.position.set(x, -0.06, 0.2); g.add(grip); }
  g.add(box(0.13, 0.02, 0.03, MAT.steel, 0, -0.01, 0.2));
  g.add(box(0.006, 0.035, 0.006, MAT.steel, 0, 0.07, -0.5)); g.add(box(0.02, 0.03, 0.006, MAT.steel, 0, 0.075, -0.06));
  const sleeve = M(0x56603f);
  for (const x of [-0.07, 0.07]) { g.add(box(0.06, 0.06, 0.08, MAT.skin, x, -0.08, 0.22)); const a = cyl(0.045, 0.05, 0.3, sleeve, 8); a.rotation.x = PI / 2.3; a.position.set(x * 1.6, -0.17, 0.38); g.add(a); }
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), MAT.flash); fl.position.set(0, 0.01, -0.74); g.add(fl); mgVM.userData.flash = fl;
  const fl2 = fl.clone(); fl2.rotation.y = PI / 2; fl.add(fl2);
}
export function updateMG(kick, flash) {
  const g = mgVM.userData.gun; g.scale.setScalar(0.75); g.position.set(0.03 + (Math.random() - 0.5) * kick * 0.006, -0.26 + (Math.random() - 0.5) * kick * 0.006, -0.95 + kick * 0.025); g.rotation.set(kick * 0.02, 0, 0);
  const f = mgVM.userData.flash; f.visible = flash > 0; f.rotation.z = Math.random() * PI;
}
