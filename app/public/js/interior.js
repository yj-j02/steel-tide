/**
 * Steel Tide — first-person interiors, modelled in camera space and drawn
 * over the world: a battleship's navigating bridge (wheel, engine-order
 * telegraphs, gyro repeater, rudder and speed indicators) and the Wildcat's
 * cockpit (instrument panel, canopy frame, Mk 8 reflector sight).
 */
import { THREE, PI, TAU, DEG, KN, clamp, ovScene, G } from "./core.js";
import { TELE } from "./ships.js";
import { sfx } from "./audio.js";

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

// canopy glass streaks (shared by the jet cockpit)
const glassTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); x.clearRect(0, 0, 256, 256);
  const g = x.createLinearGradient(0, 0, 256, 256); g.addColorStop(0, "rgba(255,255,255,.10)"); g.addColorStop(0.45, "rgba(255,255,255,0)"); g.addColorStop(0.55, "rgba(255,255,255,.05)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(200,210,200,${Math.random() * 0.06})`; x.beginPath(); x.arc(Math.random() * 256, 180 + Math.random() * 76, Math.random() * 2.2, 0, TAU); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
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
  const aaHeatM = M(0x16191b, { metalness: 0.48, roughness: 0.48 }); aaGun.userData.heatM = aaHeatM;
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
    const hider = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.044, 0.28, 12), aaHeatM); hider.rotation.x = PI / 2; hider.position.z = -2.32; b.add(hider);
    const hiderLip = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.008, 6, 16), aaHeatM); hiderLip.position.z = -2.45; b.add(hiderLip);
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
  const aaMzLight = new THREE.PointLight(0xffb450, 0, 4.4); aaMzLight.position.set(0, -0.42, -2.55); g.add(aaMzLight); aaGun.userData.mzLight = aaMzLight;
  {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.0012, 6, 64), ringM); t.position.set(0, 0, -1.1); g.add(t);
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.0009, 6, 48), innerM); t2.position.set(0, 0, -1.1); g.add(t2);
    for (let k = 0; k < 4; k++) {
      const a = k * PI / 2, strut = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.0012, 0.0012), innerM);
      strut.position.set(Math.cos(a) * 0.132, Math.sin(a) * 0.132, -1.1); strut.rotation.z = a; g.add(strut);
    }
  }
}
let aaHeat = 0;
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
        cs.m.position.set(cs.s * (0.36 + t * 0.12), -0.58 - t * t * 0.42, -0.88 - t * 0.45);
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
  aaHeat = active > 0 ? clamp(aaHeat + 0.045, 0, 1) : Math.max(0, aaHeat - 0.012);
  if (aaGun.userData.heatM) aaGun.userData.heatM.emissive.setRGB(aaHeat * 0.38, aaHeat * 0.09, 0);
  if (aaGun.userData.mzLight) aaGun.userData.mzLight.intensity = active > 0 ? 1.15 + active * 0.95 + Math.random() * 0.8 : 0;
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
  bx(g, 1.54, 0.34, 0.04, body, 0, -0.46, -0.74, -0.35);
  bx(g, 1.24, 0.036, 0.26, pad, 0, -0.285, -0.87, -0.08);
  bx(g, 0.32, 0.055, 0.18, trim, 0, -0.26, -0.86, -0.06); // HUD collimator lens bezel
  // twin curved glare-shield grab handles ("towel racks") flanking HUD collimator
  for (const s of [-1, 1]) {
    const rack = new THREE.Group(); rack.position.set(s * 0.25, -0.245, -0.78);
    const barM = trim;
    const hRod = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.15, 10), barM);
    hRod.rotation.z = PI / 2; hRod.rotation.y = s * -0.22; rack.add(hRod);
    for (const end of [-0.068, 0.068]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 8), barM);
      leg.position.set(end, -0.022, 0); rack.add(leg);
    }
    g.add(rack);
  }
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
  // Up-Front Controller (UFC) / ICP 4x4 keypad with sun-hood & left-side rotary knobs
  const uc = document.createElement("canvas"); uc.width = 384; uc.height = 240;
  const ut = new THREE.CanvasTexture(uc); ut.colorSpace = THREE.SRGBColorSpace;
  const ufcM = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.13), new THREE.MeshBasicMaterial({ map: ut }));
  ufcM.position.set(0, -0.275, -0.725); ufcM.rotation.x = -0.24; g.add(ufcM);
  bx(g, 0.23, 0.146, 0.028, body, 0, -0.275, -0.74, -0.24);
  bx(g, 0.236, 0.012, 0.05, pad, 0, -0.198, -0.725, -0.18); // UFC top glare hood
  for (const s of [-1, 1]) bx(g, 0.012, 0.14, 0.045, pad, s * 0.116, -0.275, -0.728, -0.24);
  for (let rk = 0; rk < 4; rk++) {
    const kn = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0095, 0.016, 10), trim);
    kn.rotation.x = PI / 2 - 0.24; kn.position.set(-0.122, -0.22 - rk * 0.034, -0.712); g.add(kn);
  }
  // Analog-digital hybrid standby instrument cluster flanking the 3 MFDs
  const instCan = document.createElement("canvas"); instCan.width = 512; instCan.height = 256;
  const instTex = new THREE.CanvasTexture(instCan); instTex.colorSpace = THREE.SRGBColorSpace;
  const instMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.27), new THREE.MeshBasicMaterial({ map: instTex }));
  instMesh.position.set(0, -0.415, -0.722); instMesh.rotation.x = -0.35; g.add(instMesh);
  jetPit.userData.inst = { c: instCan, x: instCan.getContext("2d"), t: instTex };
  // Canopy strut pods: left AoA 3-lamp indexer + right threat/lock circular lamp stack
  jetPit.userData.aoaLamps = []; jetPit.userData.strutLamps = [];
  {
    const lPod = bx(g, 0.044, 0.11, 0.042, body, -0.44, -0.04, -0.88, -0.08);
    lPod.rotation.z = -0.22;
    for (const [ly, col] of [[0.032, 0x1e3818], [0, 0x3b2c0a], [-0.032, 0x3b1210]]) {
      const m = new THREE.MeshBasicMaterial({ color: col });
      const lp = new THREE.Mesh(new THREE.CircleGeometry(0.011, 12), m);
      lp.position.set(0, ly, 0.022); lPod.add(lp); jetPit.userData.aoaLamps.push(m);
    }
    const rPod = bx(g, 0.046, 0.135, 0.044, body, 0.44, -0.04, -0.88, -0.08);
    rPod.rotation.z = 0.22;
    for (const [ly, col] of [[0.04, 0x3b280a], [0, 0x16381c], [-0.04, 0x421010]]) {
      const m = new THREE.MeshBasicMaterial({ color: col });
      const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.003, 6, 16), trim);
      bezel.position.set(0, ly, 0.022); rPod.add(bezel);
      const lp = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), m);
      lp.position.set(0, ly, 0.023); rPod.add(lp); jetPit.userData.strutLamps.push(m);
    }
  }
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
  // three glass MFDs (ENG/FCS left, HSD radar center, SMS+RWR right) with 20 physical 3D OSB keys
  const osbM = M(0x2a3138, { roughness: 0.5, metalness: 0.35 });
  const mk = (x, y, w, h, rx) => {
    const c = document.createElement("canvas"); c.width = 256; c.height = Math.round(256 * h / w);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const grp = new THREE.Group(); grp.position.set(x, y, -0.706); grp.rotation.x = rx;
    grp.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })));
    bx(grp, w + 0.032, h + 0.032, 0.012, trim, 0, 0, -0.007);
    for (let i = -2; i <= 2; i++) {
      bx(grp, 0.012, 0.008, 0.009, osbM, i * (w * 0.21), h / 2 + 0.009, 0.002);
      bx(grp, 0.012, 0.008, 0.009, osbM, i * (w * 0.21), -h / 2 - 0.009, 0.002);
      bx(grp, 0.008, 0.012, 0.009, osbM, -w / 2 - 0.009, i * (h * 0.2), 0.002);
      bx(grp, 0.008, 0.012, 0.009, osbM, w / 2 + 0.009, i * (h * 0.2), 0.002);
    }
    for (const [cx, cy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const ck = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.009, 8), pad);
      ck.rotation.x = PI / 2; ck.position.set(cx * (w / 2 + 0.01), cy * (h / 2 + 0.01), 0.002); grp.add(ck);
    }
    g.add(grp);
    jmfd.push({ c, x: c.getContext("2d"), t });
  };
  mk(-0.34, -0.415, 0.21, 0.165, -0.35); mk(0, -0.448, 0.225, 0.165, -0.35); mk(0.34, -0.415, 0.21, 0.165, -0.35);
  // stealth canopy glass reflection, sculpted arch frame + locking lugs, grab rails & triple rear-view mirrors
  const frame = M(0x13171a, { roughness: 0.7 });
  const canopyGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.72), new THREE.MeshBasicMaterial({ map: glassTex, transparent: true, opacity: 0.55, depthWrite: false, color: 0xd6e8cc }));
  canopyGlass.position.set(0, 0.06, -0.98); canopyGlass.rotation.x = -0.45; g.add(canopyGlass);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.024, 10, 48, PI), trim); bow.position.set(0, -0.58, -1.04); bow.rotation.x = 0.12; g.add(bow);
  for (let l = 0; l < 8; l++) {
    const la = 0.28 + (l / 7) * (PI - 0.56);
    const lug = bx(bow, 0.032, 0.024, 0.042, frame, Math.cos(la) * 1.105, Math.sin(la) * 1.105, 0.015);
    lug.rotation.z = la - PI / 2;
  }
  const rearBow = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.016, 8, 48, PI), frame); rearBow.position.set(0, -0.5, 0.18); g.add(rearBow);
  bx(g, 0.024, 0.024, 1.32, frame, 0, 0.54, -0.44);
  for (const [mx, my, ry] of [[-0.22, 0.42, 0.28], [0, 0.48, 0], [0.22, 0.42, -0.28]]) {
    const mh = bx(g, 0.11, 0.042, 0.022, body, mx, my, -0.72, 0.22); mh.rotation.y = ry;
    const mg = new THREE.Mesh(new THREE.PlaneGeometry(0.095, 0.032), M(0x7c93a6, { metalness: 0.92, roughness: 0.06 })); mg.position.set(0, 0, 0.012); mh.add(mg);
  }
  bx(g, 0.028, 0.028, 1.5, frame, -0.96, -0.32, -0.4); bx(g, 0.028, 0.028, 1.5, frame, 0.96, -0.32, -0.4);
  // Center-mounted fighter control stick, throttle with AB detent, left yellow-black handle, right sill clock & switch-rich side consoles
  const stick = new THREE.Group(); stick.position.set(0, -0.535, -0.53); stick.rotation.x = 0.14; g.add(stick);
  const sBoot = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.065, 10), pad); sBoot.position.set(0, 0.02, 0); stick.add(sBoot);
  bx(stick, 0.026, 0.13, 0.026, trim, 0, 0.075, 0);
  bx(stick, 0.042, 0.068, 0.052, body, 0, 0.145, 0.008);
  bx(stick, 0.018, 0.015, 0.022, M(0xc83228), 0, 0.178, -0.008); // red pickle/weapon button
  bx(stick, 0.016, 0.016, 0.016, osbM, 0.014, 0.176, 0.006); // trim hat
  g.userData.stick = stick;
  const thr = new THREE.Group(); thr.position.set(-0.42, -0.58, -0.48); g.add(thr); bx(thr, 0.075, 0.068, 0.095, body, 0, 0.05, 0); bx(thr, 0.02, 0.018, 0.04, M(0xb82820), 0.028, 0.09, -0.01); g.userData.thr = thr;
  bx(g, 0.24, 0.03, 0.62, trim, -0.54, -0.6, -0.45); bx(g, 0.24, 0.03, 0.62, trim, 0.54, -0.6, -0.45);
  // Left & right side console toggle switches, rotary rheostats & indicator strips
  for (const s of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      bx(g, 0.007, 0.018, 0.007, pitotM, s * 0.49, -0.575, -0.62 + k * 0.065, 0.22);
      const rDial = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.015, 0.012, 10), body);
      rDial.position.set(s * 0.56, -0.58, -0.60 + k * 0.075); g.add(rDial);
    }
    bx(g, 0.036, 0.006, 0.18, M(0x3a2a0a, { emissive: 0x553b08 }), s * 0.52, -0.582, -0.26);
  }
  // Left-sill yellow/black striped emergency jettison handle
  {
    const jGrp = new THREE.Group(); jGrp.position.set(-0.43, -0.25, -0.64); jGrp.rotation.set(0.25, 0.2, 0.35);
    for (let st = 0; st < 5; st++) bx(jGrp, 0.022, 0.024, 0.022, M(st % 2 === 0 ? 0xe6b822 : 0x141618), 0, -0.048 + st * 0.024, 0);
    g.add(jGrp);
  }
  // Right-sill analog chronograph / stopwatch pod
  {
    const clk = new THREE.Group(); clk.position.set(0.44, -0.26, -0.66); clk.rotation.set(-0.28, -0.35, 0);
    const cBody = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.04, 0.03, 18), body); cBody.rotation.x = PI / 2; clk.add(cBody);
    const cDial = new THREE.Mesh(new THREE.CircleGeometry(0.033, 18), M(0x101416)); cDial.position.z = 0.016; clk.add(cDial);
    const cBez = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.002, 6, 18), M(0xd8e2ec)); cBez.position.z = 0.017; clk.add(cBez);
    bx(clk, 0.003, 0.022, 0.002, M(0xf0f4f8), 0, 0.008, 0.018);
    bx(clk, 0.018, 0.003, 0.002, M(0xe6b822), 0.008, 0, 0.018);
    g.add(clk);
  }
  const ejectLoop = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 6, 16), M(0xe6b822)); ejectLoop.position.set(0, -0.49, -0.51); ejectLoop.rotation.x = 0.7; g.add(ejectLoop);
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
  if (j.vel.y < -10 && altM < 900) {
    const ccY = clamp(fpvY + 46, 90, H - 72);
    x.save(); x.strokeStyle = amber; x.fillStyle = amber; x.lineWidth = 1.6;
    x.setLineDash([4, 4]); x.beginPath(); x.moveTo(cx, fpvY + 10); x.lineTo(cx, ccY - 8); x.stroke();
    x.setLineDash([]); x.beginPath(); x.arc(cx, ccY, 8, 0, TAU); x.stroke();
    x.beginPath(); x.arc(cx, ccY, 2, 0, TAU); x.fill();
    x.restore();
  }
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
    if ((tcnKm < 4.5 && altM < 340) || j.landT > 0 || j.home) {
      x.save();
      const locX = cx + clamp(dBrg * 2.2, -36, 36);
      const gsY = fpvY + clamp((altM - (tcnKm * 62 + 18)) * 0.45, -26, 26);
      x.strokeStyle = Math.abs(dBrg) < 6 && Math.abs(gsY - fpvY) < 8 ? green : amber;
      x.lineWidth = 1.6;
      x.beginPath();
      x.moveTo(locX, fpvY - 26); x.lineTo(locX, fpvY + 26);
      x.moveTo(cx - 26, gsY); x.lineTo(cx + 26, gsY);
      x.stroke();
      x.strokeStyle = Math.abs(aoaDeg - 8) < 2.5 ? green : amber;
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(cx - 26, fpvY - 10); x.lineTo(cx - 32, fpvY - 10);
      x.lineTo(cx - 32, fpvY + 10); x.lineTo(cx - 26, fpvY + 10);
      x.moveTo(cx - 32, fpvY); x.lineTo(cx - 27, fpvY);
      x.stroke();
      x.restore();
    }
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
  if (j.aamCd > 3.2 && Math.floor(performance.now() / 130) % 2 === 0) {
    x.fillStyle = amber; x.font = "bold 14px monospace"; x.textAlign = "center";
    x.fillText("FOX-2 AWAY", cx, cy + 44);
  }
  if (j._asmFlash > 0 && Math.floor(performance.now() / 130) % 2 === 0) {
    x.fillStyle = amber; x.font = "bold 14px monospace"; x.textAlign = "center";
    x.fillText("ASM AWAY", cx, cy + 58);
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
let jWarnCd = 0;
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
  if (j._prevAsm !== undefined && j.asm < j._prevAsm) { j._asmFlash = 2.0; sfx.storeDrop?.(); }
  j._prevAsm = j.asm;
  if (j._asmFlash > 0) j._asmFlash = Math.max(0, j._asmFlash - dt);
  jWarnCd = Math.max(0, jWarnCd - dt);
  const fuelRemS = Math.ceil((j.endur || 260) + 120 - (j.t || 0));
  if (altM < 65 && j.vel.y < -8 && jWarnCd <= 0) { jWarnCd = 1.65; sfx.cockpitWarn?.("pullup"); }
  else if (j._g >= 7.2 && jWarnCd <= 0) { jWarnCd = 2.0; sfx.cockpitWarn?.("overg"); }
  else if (fuelRemS < 45 && !j._bingoPlayed && jWarnCd <= 0) { j._bingoPlayed = true; jWarnCd = 1.5; sfx.cockpitWarn?.("bingo"); }
  const abK = info.ab ?? (thrPct >= 88 ? 1 : 0), ab = abK > 0.35 || thrPct >= 88;
  const stickRoll = info.roll || clamp(angRate * Math.sign(trueRoll || 1) * 0.4, -1, 1);
  const stickPitch = info.pitch || clamp(angRate * 0.5, -1, 1);
  jetPit.userData.stick.rotation.set(0.14 - stickPitch * 0.28, 0, -stickRoll * 0.28);
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
  if (jetPit.userData.aoaLamps?.length === 3) {
    const [hiL, onL, loL] = jetPit.userData.aoaLamps;
    hiL.color.setHex(aoaDeg > 10.5 ? 0x6eff82 : 0x1e3818);
    onL.color.setHex(aoaDeg >= 6.5 && aoaDeg <= 10.5 ? 0xffc840 : 0x3b2c0a);
    loL.color.setHex(aoaDeg < 6.5 ? 0xff4a3c : 0x3b1210);
  }
  if (jetPit.userData.strutLamps?.length === 3) {
    const [lkL, flL, rwL] = jetPit.userData.strutLamps;
    lkL.color.setHex(info.lock ? 0xffc840 : (info.lockPct || 0) > 0.25 && blink ? 0xd99b26 : 0x3b280a);
    flL.color.setHex(j.flares > 0 ? 0x5be38c : 0x16381c);
    rwL.color.setHex(info.rwr && blink ? 0xff4032 : 0x421010);
  }
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
  // Up-Front Controller (UFC/ICP) 4x4 green backlit matrix + top scratchpad
  const U = jetPit.userData.ufc;
  if (U) {
    const ux = U.x, uw = U.c.width, uh = U.c.height;
    ux.fillStyle = "#08120c"; ux.fillRect(0, 0, uw, uh);
    ux.strokeStyle = "#225a32"; ux.lineWidth = 3; ux.strokeRect(2, 2, uw - 4, uh - 4);
    ux.fillStyle = "#040d07"; ux.fillRect(10, 8, uw - 20, 56);
    ux.strokeStyle = "#27693a"; ux.lineWidth = 1.5; ux.strokeRect(10, 8, uw - 20, 56);
    ux.fillStyle = info.rwr ? "#ff6854" : (fuelSec < 45 ? "#ffd04d" : "#7cff8a"); ux.font = "bold 20px monospace"; ux.textAlign = "center";
    ux.fillText(info.rwr ? "!! MSL WARN !!" : (fuelSec < 45 ? "!! BINGO FUEL !!" : (info.lock ? "FOX-2 LOCKED" : "MASTER ARM ON")), uw / 2, 32);
    ux.fillStyle = "#9ae69f"; ux.font = "bold 14px monospace";
    ux.fillText(`HDG ${String(Math.round(hdg)).padStart(3, "0")}   AAM ${j.aam}   ASM ${j.asm}`, uw / 2, 54);
    const tcnNear = !!(j.owner && j.owner.alive && Math.hypot(j.owner.pos.x - j.pos.x, j.owner.pos.z - j.pos.z) < 3500);
    const grid = [
      [["1", "T-ILS"], ["2", "ALOW"], ["3", ""], ["RCL", ""]],
      [["4", "STPT"], ["5", "CRUS"], ["6", "TIME"], ["ENTR", ""]],
      [["7", "MARK"], ["8", "FIX"], ["9", "A-CAL"], ["0", "M-SEL"]],
      [["IFF", "", true], ["TCN", "", tcnNear], ["DLNK", "", (info.blips?.length || 0) > 0], ["AP", "", !!(j.landT > 0 || j.home)]],
    ];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const kx = 14 + c * 90, ky = 72 + r * 40, [k1, k2, on] = grid[r][c];
      ux.fillStyle = on ? "rgba(52,155,78,0.68)" : "rgba(18,52,28,0.45)"; ux.fillRect(kx, ky, 82, 34);
      ux.strokeStyle = on ? "#8cff9c" : "#2f8a48"; ux.lineWidth = on ? 2 : 1.5; ux.strokeRect(kx, ky, 82, 34);
      ux.fillStyle = on ? "#e6ffe8" : "#7cff8a"; ux.font = "bold 13px monospace";
      ux.fillText(k1, kx + 41, ky + (k2 ? 15 : 22));
      if (k2) { ux.fillStyle = "#5ad46c"; ux.font = "bold 10px monospace"; ux.fillText(k2, kx + 41, ky + 28); }
    }
    U.t.needsUpdate = true;
  }
  // Analog-digital hybrid standby gauges flanking Center MFD + yellow/black caution strips
  const IP = jetPit.userData.inst;
  if (IP) {
    const ix = IP.x, iw = IP.c.width, ih = IP.c.height;
    ix.fillStyle = "#171c20"; ix.fillRect(0, 0, iw, ih);
    ix.strokeStyle = "#2b333a"; ix.lineWidth = 2;
    for (const gx of [140, 322]) { ix.fillStyle = "#11161a"; ix.fillRect(gx, 10, 50, ih - 20); ix.strokeRect(gx, 10, 50, ih - 20); }
    const dial = (dx, dy, r, frac, lbl, val) => {
      ix.fillStyle = "#0a0e10"; ix.beginPath(); ix.arc(dx, dy, r, 0, TAU); ix.fill();
      ix.strokeStyle = "#48545e"; ix.lineWidth = 1.6; ix.stroke();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU; ix.beginPath(); ix.moveTo(dx + Math.cos(a) * (r - 4), dy + Math.sin(a) * (r - 4)); ix.lineTo(dx + Math.cos(a) * (r - 1), dy + Math.sin(a) * (r - 1)); ix.stroke();
      }
      const na = -PI * 0.75 + clamp(frac, 0, 1) * PI * 1.5;
      ix.strokeStyle = "#f2f6f8"; ix.lineWidth = 2; ix.beginPath(); ix.moveTo(dx, dy); ix.lineTo(dx + Math.cos(na) * (r - 5), dy + Math.sin(na) * (r - 5)); ix.stroke();
      ix.fillStyle = "#8ca2b0"; ix.font = "bold 7.5px monospace"; ix.textAlign = "center"; ix.fillText(lbl, dx, dy + 8);
      ix.fillStyle = "#d8e6ee"; ix.fillText(val, dx, dy + 16);
    };
    // Left flank: Standby Attitude Ball + Standby Airspeed Dial
    {
      const dx = 165, dy = 66, r = 20;
      ix.save(); ix.beginPath(); ix.arc(dx, dy, r, 0, TAU); ix.clip();
      ix.translate(dx, dy + clamp(truePitch * 20, -15, 15)); ix.rotate(-trueRoll);
      ix.fillStyle = "#246696"; ix.fillRect(-30, -35, 60, 35);
      ix.fillStyle = "#5c3b1e"; ix.fillRect(-30, 0, 60, 35);
      ix.strokeStyle = "#f4f8ff"; ix.lineWidth = 1.5; ix.beginPath(); ix.moveTo(-24, 0); ix.lineTo(24, 0); ix.stroke();
      ix.restore();
      ix.strokeStyle = "#48545e"; ix.lineWidth = 1.8; ix.beginPath(); ix.arc(dx, dy, r, 0, TAU); ix.stroke();
      ix.strokeStyle = "#ffd04d"; ix.lineWidth = 1.6; ix.beginPath(); ix.moveTo(dx - 8, dy); ix.lineTo(dx + 8, dy); ix.stroke();
      dial(165, 134, 20, spdKmh / 1400, "IAS", String(Math.round(spdKmh)));
    }
    // Right flank: Standby Altimeter + Engine/Fuel Gauges
    dial(347, 66, 20, (altM % 1000) / 1000, "ALT", String(Math.round(altM)));
    dial(347, 134, 20, thrPct / 100, "N1", `${thrPct}%`);
    // Yellow/black hazard striping + caution bars positioned cleanly above bottom viewport frame
    for (const bx0 of [143, 325]) {
      ix.save(); ix.beginPath(); ix.rect(bx0, 174, 44, 12); ix.clip();
      for (let s = -20; s < 64; s += 10) {
        ix.fillStyle = "#e6b822"; ix.beginPath(); ix.moveTo(bx0 + s, 186); ix.lineTo(bx0 + s + 5, 186); ix.lineTo(bx0 + s + 13, 174); ix.lineTo(bx0 + s + 8, 174); ix.closePath(); ix.fill();
      }
      ix.restore();
      ix.fillStyle = info.rwr ? "#ff5244" : (j.hit ? "#ffd04d" : "#1c3624"); ix.fillRect(bx0, 190, 44, 14);
      ix.strokeStyle = "#3a454d"; ix.strokeRect(bx0, 190, 44, 14);
      ix.fillStyle = info.rwr || j.hit ? "#fff4e0" : "#5ac474"; ix.font = "bold 8px monospace"; ix.textAlign = "center";
      ix.fillText(bx0 < 200 ? (j.hit ? "DMG" : "SYS") : (info.rwr ? "RWR" : "RDY"), bx0 + 22, 200);
    }
    IP.t.needsUpdate = true;
  }
  for (const m of jmfd) m.t.needsUpdate = true;
}
