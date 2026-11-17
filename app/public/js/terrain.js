/**
 * Steel Tide — procedural realistic South Pacific terrain testbed:
 * eroded volcanic islands, smooth sloped beaches & sunken caldera coves,
 * per-island rainforest canopy & coastal coconut palms, and a seaside airfield + jetty.
 */
import * as THREE from "../vendor/three.module.min.js";

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Organic peninsula/cove polygon around (cx, cz). Optionally carves a horseshoe bay at `notchA`. */
function archPoly(cx, cz, rx, rz, nPts, rot, rand, notchA = null, notchDepth = 0.52) {
  const pts = [], ph1 = rand() * 6.28, ph2 = rand() * 6.28, ph3 = rand() * 6.28;
  const ca = Math.cos(rot), sa = Math.sin(rot);
  for (let i = 0; i < nPts; i++) {
    const a = (i / nPts) * Math.PI * 2;
    let r = 0.88 + 0.14 * Math.sin(a * 2 + ph1) + 0.09 * Math.cos(a * 3 + ph2) + 0.05 * Math.sin(a * 6 + ph3) + (rand() - 0.5) * 0.035;
    if (notchA != null) {
      let da = Math.abs(((a - notchA + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (da < 0.72) r *= 1 - notchDepth * Math.pow(Math.cos((da / 0.72) * (Math.PI * 0.5)), 1.5);
    }
    const lx = Math.cos(a) * rx * r, lz = Math.sin(a) * rz * r;
    pts.push([cx + lx * ca - lz * sa, cz + lx * sa + lz * ca]);
  }
  return pts;
}

function mergeParts(parts) {
  const pos = [], norm = [], col = [], idx = [];
  let off = 0;
  for (const { geo, col: c } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      norm.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(c[0], c[1], c[2]);
      idx.push(off + i);
    }
    off += p.count;
    if (g !== geo) g.dispose();
    geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(norm, 3));
  out.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  out.setIndex(idx);
  return out;
}

/** Organic asymmetric 3-tuft rainforest canopy silhouette. */
function makeCanopyGeo() {
  const parts = [];
  const specs = [
    [0, 0.52, 0, 0.95, 0.72, [0.92, 0.97, 0.92]],
    [0.54, 0.4, 0.34, 0.68, 0.56, [0.82, 0.89, 0.82]],
    [-0.46, 0.44, -0.34, 0.72, 0.6, [1.0, 1.04, 0.95]],
  ];
  for (const [x, y, z, sr, sy, c] of specs) {
    const g = new THREE.IcosahedronGeometry(sr, 1);
    g.scale(1.1, sy / sr, 1.05);
    g.translate(x, y, z);
    parts.push({ geo: g, col: c });
  }
  return mergeParts(parts);
}

/** Tall slender leaning coconut palm with 6 arched feathered fronds. */
function makePalmGeo() {
  const geoms = [];
  const segs = 5;
  for (let s = 0; s < segs; s++) {
    const cyl = new THREE.CylinderGeometry(0.11 - s * 0.01, 0.14 - s * 0.01, 0.28, 5, 1);
    cyl.translate(Math.sin(s * 0.36) * 0.14, 0.14 + s * 0.26, 0);
    geoms.push({ geo: cyl, col: [0.46, 0.35, 0.22] });
  }
  for (let f = 0; f < 6; f++) {
    const a = (f / 6) * Math.PI * 2 + 0.2;
    const fr = new THREE.ConeGeometry(0.28, 1.35, 3, 1);
    fr.rotateX(Math.PI * 0.65);
    fr.scale(1.25, 0.28, 1);
    fr.translate(0, 0, 0.62);
    fr.rotateY(a);
    fr.translate(0.32, 1.32, 0);
    geoms.push({ geo: fr, col: f % 2 ? [0.16, 0.42, 0.14] : [0.22, 0.5, 0.17] });
  }
  return mergeParts(geoms);
}

/** Forward South Pacific coastal airfield, hangars, tower, fuel farm, lighthouse & jetty extending over water. */
function buildPacificOutpost(pad) {
  const grp = new THREE.Group();
  const [fx, fz, yaw, len, wid, elev] = pad;
  grp.position.set(fx, elev + 0.35, fz);
  grp.rotation.y = yaw;

  const matStrip = new THREE.MeshStandardMaterial({ color: 0xbcb092, roughness: 0.9, metalness: 0.04 });
  const matApron = new THREE.MeshStandardMaterial({ color: 0x8d8370, roughness: 0.9, metalness: 0.08 });
  const matMark = new THREE.MeshBasicMaterial({ color: 0xf6f3e6 });
  const matRoof = new THREE.MeshStandardMaterial({ color: 0x5c6862, roughness: 0.55, metalness: 0.35 });
  const matWall = new THREE.MeshStandardMaterial({ color: 0x76806c, roughness: 0.65, metalness: 0.2 });
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xdedbd0, roughness: 0.55, metalness: 0.25 });
  const matWood = new THREE.MeshStandardMaterial({ color: 0x5e4934, roughness: 0.88 });

  const strip = new THREE.Mesh(new THREE.BoxGeometry(len, 2.2, wid), matStrip);
  strip.position.y = -0.8;
  grp.add(strip);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(len * 0.34, 2.0, wid * 1.15), matApron);
  apron.position.set(-len * 0.14, -0.78, -wid * 1.05);
  grp.add(apron);

  const dashGeo = new THREE.BoxGeometry(16, 0.25, 2.4);
  for (let x = -len * 0.42; x <= len * 0.42; x += 38) {
    const d = new THREE.Mesh(dashGeo, matMark);
    d.position.set(x, 0.38, 0);
    grp.add(d);
  }
  for (const side of [-1, 1]) {
    for (let z = -wid * 0.36; z <= wid * 0.36; z += 7) {
      const th = new THREE.Mesh(new THREE.BoxGeometry(14, 0.25, 2.8), matMark);
      th.position.set(side * (len * 0.46), 0.38, z);
      grp.add(th);
    }
  }

  const hGeo = new THREE.CylinderGeometry(16, 16, 46, 14, 1, false, 0, Math.PI);
  hGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 2; i++) {
    const hg = new THREE.Mesh(hGeo, matRoof);
    hg.position.set(-len * 0.22 + i * 74, 0.2, -wid * 1.55);
    hg.rotation.y = Math.PI / 2;
    grp.add(hg);
  }

  const twBase = new THREE.Mesh(new THREE.BoxGeometry(11, 22, 11), matWall);
  twBase.position.set(-len * 0.03, 11, -wid * 1.58);
  grp.add(twBase);
  const twCab = new THREE.Mesh(new THREE.BoxGeometry(14, 5.5, 14), new THREE.MeshStandardMaterial({ color: 0x1b343c, roughness: 0.15, metalness: 0.75 }));
  twCab.position.set(-len * 0.03, 24.5, -wid * 1.58);
  grp.add(twCab);
  const twRoof = new THREE.Mesh(new THREE.BoxGeometry(16, 1.4, 16), matRoof);
  twRoof.position.set(-len * 0.03, 27.8, -wid * 1.58);
  grp.add(twRoof);

  const tankGeo = new THREE.CylinderGeometry(7.5, 7.5, 11, 14);
  for (let i = 0; i < 4; i++) {
    const tk = new THREE.Mesh(tankGeo, matWhite);
    tk.position.set(len * 0.08 + (i % 2) * 22, 5.5, -wid * 1.45 - ((i >> 1) * 22));
    grp.add(tk);
  }

  // Harbor wooden jetty & coastal headland lighthouse extending seaward (+z local)
  const pier = new THREE.Mesh(new THREE.BoxGeometry(11, 2.2, 360), matWood);
  pier.position.set(len * 0.24, -elev + 2.1, wid * 7.8);
  grp.add(pier);
  const pileGeo = new THREE.BoxGeometry(1.6, 10, 1.6);
  for (let p = 0; p < 8; p++) for (const sx of [-4.2, 4.2]) {
    const pl = new THREE.Mesh(pileGeo, matWood);
    pl.position.set(len * 0.24 + sx, -elev - 2.5, wid * 4.4 + p * 44);
    grp.add(pl);
  }
  const lh = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 4.4, 24, 12), matWhite);
  lh.position.set(len * 0.35, -elev * 0.45 + 12, wid * 2.1);
  grp.add(lh);
  const lhCap = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 4, 12), new THREE.MeshBasicMaterial({ color: 0xffe49c }));
  lhCap.position.set(len * 0.35, -elev * 0.45 + 25.5, wid * 2.1);
  grp.add(lhCap);

  return grp;
}

/**
 * Generates realistic South Pacific archipelago islands (`arch`):
 * - Sloped coral beaches meeting ocean smoothly (zero jagged cliff aliasing)
 * - Natural volcanic ridge caps (~620–820 m) with wide coastal alluvial plains around the airfield
 * - Per-island dense tropical rainforest canopy & coastal coconut palms
 */
export function buildSouthPacific(ctx) {
  const { GROUND, fbm2, vnoise, inPoly, edgeDist, PAL, G, islands, scene, rnd, clamp } = ctx;
  const rand = mulberry32(417921);

  const sand = new THREE.Color(PAL[0] || 0xeadcb6);
  const grass = new THREE.Color(PAL[1] || 0x2a612d);
  const rock = new THREE.Color(PAL[2] || 0x524e47);
  const jungle = grass.clone().multiplyScalar(0.58);
  const ridgeMoss = grass.clone().lerp(new THREE.Color(0x47792f), 0.42);
  const humus = sand.clone().lerp(rock, 0.52);

  const a0 = rnd() * Math.PI * 2;
  const specs = [];

  // 1) Main Henderson-style Volcanic Island w/ broad seaward coastal airfield plateau (~16.8 km from center)
  {
    const a = a0 + 0.35, d = 16800, cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    const rot = a + Math.PI * 0.46;
    const poly = archPoly(cx, cz, 5600, 3600, 64, rot, rand, null, 0);
    const ux = Math.cos(rot), uz = Math.sin(rot);
    const px = -uz, pz = ux;
    // Place runway ~240 m inland from the +P beach shoreline while peaks sit behind on -P side!
    let padX = cx + px * 2150 + ux * 200, padZ = cz + pz * 2150 + uz * 200;
    for (let step = 0; step < 30; step++) {
      if (inPoly(poly, padX, padZ) && edgeDist(poly, padX, padZ) >= 240 && edgeDist(poly, padX, padZ) <= 460) break;
      if (!inPoly(poly, padX, padZ) || edgeDist(poly, padX, padZ) < 240) { padX -= px * 110; padZ -= pz * 110; }
      else { padX += px * 110; padZ += pz * 110; }
    }
    specs.push({
      poly,
      peaks: [
        [cx - ux * 1500 - px * 1150, cz - uz * 1500 - pz * 1150, 680, 2200],
        [cx + ux * 1500 - px * 1050, cz + uz * 1500 - pz * 1050, 520, 1900],
        [cx - px * 950, cz - pz * 950, 440, 1750],
      ],
      base: 18, ramp: 780,
      flatPad: [padX, padZ, -rot, 780, 46, 15, px, pz],
      res: 148,
    });
  }

  // 2) Horseshoe Volcanic Caldera Island (~18.6 km opposite side)
  {
    const a = a0 + 2.15, d = 18600, cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    const bayA = a + Math.PI;
    const poly = archPoly(cx, cz, 4100, 3700, 56, a, rand, bayA, 0.56);
    specs.push({
      poly,
      peaks: [
        [cx + Math.cos(a + 0.4) * 1650, cz + Math.sin(a + 0.4) * 1650, 480, 1650],
        [cx + Math.cos(a - 0.5) * 1750, cz + Math.sin(a - 0.5) * 1750, 420, 1500],
        [cx + Math.cos(a + 1.4) * 1850, cz + Math.sin(a + 1.4) * 1850, 320, 1300],
      ],
      caldera: [cx - Math.cos(a) * 650, cz - Math.sin(a) * 650, 1250],
      base: 16, ramp: 740, res: 120,
    });
  }

  // 3) Coral Barrier Atoll Crescent & Lagoon Cay
  for (let k = 0; k < 2; k++) {
    const a = a0 + 3.6 + k * 0.95, d = 15200 + k * 5200, cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    const poly = archPoly(cx, cz, 3100 - k * 550, 1750 - k * 250, 46, a + 1.2, rand, a + Math.PI * (k ? 0.2 : 0.8), 0.35);
    specs.push({
      poly,
      peaks: [
        [cx + Math.cos(a) * 700, cz + Math.sin(a) * 700, 195 - k * 60, 1100],
        [cx - Math.cos(a) * 850, cz - Math.sin(a) * 850, 135 - k * 40, 920],
      ],
      base: 11, ramp: 520, res: 96,
    });
  }

  // 4) Tactile Offshore Isles
  for (let i = 0; i < 8; i++) {
    const a = a0 + 0.85 + (i / 8) * Math.PI * 1.7 + (rand() - 0.5) * 0.22;
    if (Math.abs(((a - (a0 + 0.35) + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.32) continue;
    const d = 15800 + rand() * 12200, rx = 1200 + rand() * 1900, rz = 900 + rand() * 1400;
    const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    const poly = archPoly(cx, cz, rx, rz, 36, rand() * Math.PI, rand, null, 0);
    specs.push({
      poly,
      peaks: [
        [cx + (rand() - 0.5) * rx * 0.45, cz + (rand() - 0.5) * rz * 0.45, 180 + rand() * 310, Math.min(rx, rz) * 0.72],
        [cx - (rand() - 0.5) * rx * 0.45, cz - (rand() - 0.5) * rz * 0.45, 105 + rand() * 180, Math.min(rx, rz) * 0.55],
      ],
      base: 12, ramp: 500, res: 76,
    });
  }

  // 5) Distant Horizon Massifs (~43–46 km out)
  for (let k = 0; k < 2; k++) {
    const a = a0 + Math.PI * k + 1.05, d = 43500 + k * 2500, cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    const poly = archPoly(cx, cz, 12500, 6800, 50, a + 1.5, rand, null, 0);
    specs.push({
      poly,
      peaks: [
        [cx - Math.sin(a) * 3500, cz + Math.cos(a) * 3500, 1050, 5200],
        [cx + Math.sin(a) * 3800, cz - Math.cos(a) * 3800, 840, 4600],
        [cx, cz, 680, 4200],
      ],
      base: 26, ramp: 1500, res: 96, far: true,
    });
  }

  const canopyMats = [], palmMats = [];
  const treeColors = [0x16421d, 0x1c4f21, 0x245d27, 0x1a471f, 0x2a662b].map((h) => new THREE.Color(h));

  for (const sp of specs) {
    const P = sp.poly;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const span = Math.max(x1 - x0, z1 - z0);
    const cell = span / (sp.res || 90);
    x0 -= cell * 3; x1 += cell * 3; z0 -= cell * 3; z1 += cell * 3;
    const nx = Math.ceil((x1 - x0) / cell) + 2, nz = Math.ceil((z1 - z0) / cell) + 2;
    const pos = [], col = [], idx = [], hs = [], uv = [];
    const c = new THREE.Color(), m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3();
    let top = 1;

    const fp = sp.flatPad;
    const fCos = fp ? Math.cos(-fp[2]) : 1, fSin = fp ? Math.sin(-fp[2]) : 0;

    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const x = x0 + i * cell, z = z0 + j * cell, inside = inPoly(P, x, z);
      const ed = edgeDist(P, x, z);
      let h = -16;
      if (inside) {
        const e = Math.min(1, ed / sp.ramp);
        const beachEase = Math.pow(e, 0.85);
        // Smooth-max across volcanic peaks avoids unrealistic >1.5 km spires while preserving ridgelines
        let pkMax = 0, pkSum = 0;
        for (const [px, pz, H, R] of sp.peaks) {
          const dx = x - px, dz = z - pz, dist2 = dx * dx + dz * dz;
          const ang = Math.atan2(dz, dx);
          const radial = 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(ang * 5 + fbm2(x / 1100, z / 1100) * 5.2));
          const val = H * Math.exp(-dist2 / (2 * R * R)) * radial;
          pkMax = Math.max(pkMax, val);
          pkSum += val;
        }
        const pkh = pkMax * 0.84 + pkSum * 0.16;
        const ridge = (1 - Math.abs(fbm2(x / 880, z / 880) - 0.5) * 2.0) * (42 + pkh * 0.22);
        const detail = (fbm2(x / 320 + 11, z / 320 + 5) - 0.45) * (28 + pkh * 0.12);
        let relief = (pkh + ridge + detail) * Math.min(1, e * 1.9);
        if (fp) {
          // Broad coastal alluvial plain smoothing out foothills gently toward the airstrip
          const dPad = Math.hypot(x - fp[0], z - fp[1]);
          const plainAtten = clamp((dPad - 450) / 1400, 0, 1);
          relief *= plainAtten * plainAtten;
        }
        h = 0.25 + sp.base * beachEase + relief;
        if (sp.caldera) {
          const [kx, kz, kr] = sp.caldera;
          const cd = Math.hypot(x - kx, z - kz) / kr;
          if (cd < 1) h -= (1 - cd * cd) * (135 + 0.35 * h);
        }
        if (fp) {
          const dx = x - fp[0], dz = z - fp[1];
          const lx = dx * fCos + dz * fSin, lz = -dx * fSin + dz * fCos;
          const kx = Math.max(0, Math.abs(lx) - fp[3] * 0.56), kz = Math.max(0, Math.abs(lz) - fp[4] * 2.0);
          const pd = Math.hypot(kx, kz);
          if (pd < 280) {
            const w = Math.pow(1 - pd / 280, 1.4);
            h = h * (1 - w) + fp[5] * w;
          }
        }
      } else if (ed < 160) {
        h = 0.25 - (ed / 160) * 12.2;
      }
      hs.push(h); top = Math.max(top, h); pos.push(x, h, z);
      uv.push(x / 58, z / 58);
    }

    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const a = i * (nz + 1) + j, h = hs[a];
      const hx = hs[Math.min(nx, i + 1) * (nz + 1) + j] - hs[Math.max(0, i - 1) * (nz + 1) + j];
      const hz = hs[a + (j < nz ? 1 : 0)] - hs[a - (j > 0 ? 1 : 0)];
      const slope = Math.hypot(hx, hz) / (2 * cell), k2 = h / top, patch = fbm2(pos[a * 3] / 460, pos[a * 3 + 2] / 460);
      const vegBlend = clamp((h - (2.8 + patch * 3.8)) / 5.2, 0, 1);
      c.copy(patch > 0.54 ? jungle : patch < 0.36 ? ridgeMoss : grass);
      c.lerp(humus, Math.max(0, (patch - 0.66) * 1.5));
      c.lerp(rock, clamp(Math.max(0, (slope - 0.40) * 2.4) + Math.max(0, (k2 - 0.70) * 2.1), 0, 0.96));
      if (h < -0.2) c.copy(sand).multiplyScalar(0.66);
      else if (vegBlend < 1) { const sc = sand.clone().lerp(humus, clamp(h / 10, 0, 0.25)); c.copy(sc.lerp(c, vegBlend)); }
      col.push(c.r, c.g, c.b);
    }

    // Per-island uniform reservoir-sampled coastal palms and hillside rainforest canopy
    if (!sp.far) {
      const candPalms = [], candCanopy = [];
      for (let i = 1; i < nx - 1; i++) for (let j = 1; j < nz - 1; j++) {
        const a = i * (nz + 1) + j, h = hs[a];
        if (h < 2.2) continue;
        const hx = hs[(i + 1) * (nz + 1) + j] - hs[(i - 1) * (nz + 1) + j];
        const hz = hs[a + 1] - hs[a - 1];
        const slope = Math.hypot(hx, hz) / (2 * cell);
        if (slope > 0.48) continue;
        const px = pos[a * 3] + (rand() - 0.5) * cell * 0.95;
        const pz = pos[a * 3 + 2] + (rand() - 0.5) * cell * 0.95;
        let onPad = false;
        if (fp) {
          const dx = px - fp[0], dz = pz - fp[1];
          const lx = dx * fCos + dz * fSin, lz = -dx * fSin + dz * fCos;
          if (Math.abs(lx) < fp[3] * 0.62 && lz > -fp[4] * 2.5 && lz < fp[4] * 11.0) onPad = true;
        }
        if (onPad) continue;
        if (h < 22 && slope < 0.34) candPalms.push([px, h, pz]);
        else if (h >= 7 && h < 420) candCanopy.push([px, h, pz]);
      }
      const pickUniform = (arr, limit) => {
        for (let k = arr.length - 1; k > 0; k--) { const r = (rand() * (k + 1)) | 0; const tmp = arr[k]; arr[k] = arr[r]; arr[r] = tmp; }
        return arr.slice(0, limit);
      };
      for (const [px, h, pz] of pickUniform(candPalms, fp ? 340 : 140)) {
        const sc = 10 + rand() * 8;
        p4.set(px, h - 0.4, pz);
        q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
        s4.set(sc, sc * (0.9 + rand() * 0.3), sc);
        m4.compose(p4, q4, s4);
        palmMats.push(m4.clone());
      }
      for (const [px, h, pz] of pickUniform(candCanopy, fp ? 780 : 320)) {
        const sc = 15 + rand() * 16;
        p4.set(px, h - 1.4, pz);
        q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
        s4.set(sc, sc * (0.85 + rand() * 0.45), sc);
        m4.compose(p4, q4, s4);
        canopyMats.push({ mat: m4.clone(), col: treeColors[(rand() * treeColors.length) | 0] });
      }
    }

    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const a = i * (nz + 1) + j, b = a + nz + 1;
      if (hs[a] < -9.5 && hs[a + 1] < -9.5 && hs[b] < -9.5 && hs[b + 1] < -9.5) continue;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: GROUND, roughness: 0.94, metalness: 0.02, envMapIntensity: 0.28 }));
    mesh.receiveShadow = false;
    scene.add(mesh);
    islands.push(mesh);

    if (fp) {
      const outpost = buildPacificOutpost(fp);
      scene.add(outpost);
      islands.push(outpost);
      // Camera look-from direction: hover over seaward bay (+P) looking inland toward airfield + mountain range!
      const lookYaw = Math.atan2(-fp[7], -fp[6]);
      G.outpost = { x: fp[0], z: fp[1], y: fp[5], yaw: lookYaw };
    }

    let cx = 0, cz = 0;
    for (const [x, z] of P) { cx += x; cz += z; }
    G.islands.push({ x: cx / P.length, z: cz / P.length, r: 0, poly: P, bb: [x0, x1, z0, z1] });
  }

  if (canopyMats.length) {
    const cg = makeCanopyGeo();
    const cm = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.92, metalness: 0.02 });
    const inst = new THREE.InstancedMesh(cg, cm, canopyMats.length);
    for (let i = 0; i < canopyMats.length; i++) {
      inst.setMatrixAt(i, canopyMats[i].mat);
      inst.setColorAt(i, canopyMats[i].col);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.raycast = () => {};
    scene.add(inst);
    islands.push(inst);
  }

  if (palmMats.length) {
    const pg = makePalmGeo();
    const pm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.02 });
    const instP = new THREE.InstancedMesh(pg, pm, palmMats.length);
    for (let i = 0; i < palmMats.length; i++) instP.setMatrixAt(i, palmMats[i]);
    instP.instanceMatrix.needsUpdate = true;
    instP.raycast = () => {};
    scene.add(instP);
    islands.push(instP);
  }
  void vnoise;
}
