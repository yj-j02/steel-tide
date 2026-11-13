/**
 * Steel Tide — shared core: math, shared game state, renderer, sky, sea,
 * islands, particle/decal systems and small mesh helpers.
 */
import * as THREE from "/vendor/three.module.min.js";
export { THREE };

export const $ = (s) => document.querySelector(s);
export const PI = Math.PI, TAU = PI * 2, DEG = PI / 180, KN = 0.5144, GRAV = 9.81;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const wrap = (a) => { while (a > PI) a -= TAU; while (a < -PI) a += TAU; return a; };
export const brg = (rad) => { const d = ((rad / DEG) % 360 + 360) % 360; return d.toFixed(0).padStart(3, "0") + "°"; };
export const fmt = (n) => Math.round(n).toLocaleString("en-US");
export const params = new URLSearchParams(location.search);

let seed = params.get("seed") ? +params.get("seed") >>> 0 : (Date.now() & 0xffffffff) >>> 0;
export function rnd() { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
export function gauss() { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rnd()); }

/** Mutable game state shared by every module. */
export const G = {
  state: "menu", time: 0, battleT: 0, islands: [], ships: [], player: null, enemy: null, enemies: [], allies: [], carrier: null, plane: null, shells: [], torps: [],
  stats: { shots: 0, hits: 0, bullets: 0, bombs: 0 }, shake: 0, SPD: 2.55, SHELL: 2.2, auto: false, squad: 4, planeCD: 0,
  log: () => {}, onSunk: () => {},
};

// ── renderer ────────────────────────────────────────────────────────────────
export const canvas = $("#gl");
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xc4cfd4, 0.00005);
export const camera = new THREE.PerspectiveCamera(50, 1, 4, 90000);
export const SUN = new THREE.Vector3(0.55, 0.34, -0.76).normalize();
/** Interiors (ship's bridge, cockpit) live in camera space in their own scene, drawn over the world. */
export const ovScene = new THREE.Scene(), ovCam = new THREE.PerspectiveCamera(60, 1, 0.02, 60);
ovScene.add(new THREE.HemisphereLight(0xdfe9f0, 0x2a2622, 1.6)); { const d = new THREE.DirectionalLight(0xfff0dd, 1.6); d.position.set(0.4, 1, -0.6); ovScene.add(d); }
export const hemi = new THREE.HemisphereLight(0xcfe2ee, 0x3a4852, 1.55); scene.add(hemi); // strong sky fill so backlit ships keep their shape
export const sunLight = new THREE.DirectionalLight(0xffecd0, 3.0); scene.add(sunLight, sunLight.target);
sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048);
Object.assign(sunLight.shadow.camera, { left: -190, right: 190, top: 190, bottom: -190, near: 100, far: 1000 });
sunLight.shadow.bias = -0.0005; sunLight.shadow.normalBias = 0.7;

const v4 = () => Array.from({ length: 8 }, () => new THREE.Vector4());
export const U = { time: { value: 0 }, sunDir: { value: SUN }, skyTint: { value: new THREE.Vector3(1, 1, 1) }, seaTint: { value: new THREE.Vector3(1, 1, 1) }, fogK: { value: 0.00004 }, cloud: { value: 0 }, uLin: { value: 0 }, shipA: { value: v4() }, shipB: { value: v4() } };

const NOISE_GLSL = `
  float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<5;i++){ s += a*noise(p); p = p*2.03 + vec2(17.0,9.0); a *= 0.5; } return s; }`;
const SKY_GLSL = `
  uniform float time; uniform vec3 sunDir; uniform vec3 skyTint; uniform vec3 seaTint; uniform float fogK; uniform float cloud; uniform float uLin;
  ${NOISE_GLSL}
  vec3 skyBase(vec3 d){
    float h = max(d.y, 0.0);
    vec3 c = mix(vec3(0.80,0.84,0.86), vec3(0.15,0.32,0.62), pow(h, 0.5));
    float s = max(dot(d, sunDir), 0.0);
    return (c + vec3(1.0,0.78,0.5) * pow(s, 6.0) * 0.24) * skyTint;
  }
  vec3 skyColor(vec3 d){
    vec3 c = skyBase(d);
    if (d.y > 0.012) {
      float s = max(dot(d, sunDir), 0.0);
      vec2 uv = d.xz / (d.y + 0.09) * 1.25 + time * 0.004;
      float n = fbm(uv);
      float cov = smoothstep(0.46 - cloud, 0.76 - cloud, n);
      vec3 cl = mix(vec3(0.58,0.63,0.70), vec3(1.0,0.97,0.92), smoothstep(0.48, 0.95, n + s*0.3)) * (1.0 - max(cloud, 0.0) * 1.2);
      c = mix(c, cl, cov * smoothstep(0.012, 0.17, d.y) * 0.92);
    }
    return c;
  }`;
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: U,
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `varying vec3 vDir; ${SKY_GLSL}
    void main(){ vec3 d = normalize(vDir); vec3 c = skyColor(d);
      c += vec3(1.0,0.92,0.75) * pow(max(dot(d,sunDir),0.0), 900.0) * 2.0;
      gl_FragColor = vec4(uLin > 0.5 ? pow(c, vec3(2.2)) : c, 1.0); }`, // linear when post-processing tone-maps the frame
});
export const sky = new THREE.Mesh(new THREE.SphereGeometry(70000, 32, 16), skyMat);
sky.frustumCulled = false; sky.renderOrder = -3; scene.add(sky);

// Ships leave foam around the hull, a turbulent stern wake and Kelvin arms; the
// swell is flattened inside the hull so water never shows through the deck.
const SHIP_GLSL = `
  uniform vec4 shipA[8]; uniform vec4 shipB[8];
  vec3 shipLocal(vec2 p, int i){ vec2 d = p - shipA[i].xy; float c = cos(shipA[i].z), s = sin(shipA[i].z); return vec3(d.x*c + d.y*s, -d.x*s + d.y*c, 0.0); }
  float hullMask(vec2 p){ float m = 0.0;
    for (int i = 0; i < 8; i++) { if (shipB[i].z < 0.5) continue; vec3 l = shipLocal(p, i);
      float e = length(vec2(l.x/(shipB[i].x*1.05), l.y/(shipB[i].y*1.1))); m = max(m, smoothstep(1.8, 1.0, e)); }
    return m; }`;
const SEA_VERT = `uniform float time; uniform float uPatch; varying vec3 vW; ${SHIP_GLSL}
  float wh(vec2 p, vec2 d, float len, float amp, float spd){ d = normalize(d); float k = 6.2831853/len; return amp*sin(dot(p,d)*k + time*spd*k); }
  void main(){ vec4 w = modelMatrix * vec4(position,1.0);
    if (uPatch > 0.5) { float fade = (1.0 - smoothstep(850.0, 1330.0, distance(w.xz, cameraPosition.xz))) * (1.0 - hullMask(w.xz));
      w.y += fade * (wh(w.xz,vec2(0.6,0.8),53.0,0.55,9.0) + wh(w.xz,vec2(-0.9,0.35),89.0,0.80,11.0) + wh(w.xz,vec2(0.2,-1.0),160.0,1.20,15.0) + wh(w.xz,vec2(1.0,0.15),290.0,1.70,20.0)); }
    vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SEA_FRAG = `uniform float uPatch; varying vec3 vW; ${SKY_GLSL} ${SHIP_GLSL}
  vec2 wv(vec2 p, vec2 d, float len, float amp, float spd){ d = normalize(d); float k = 6.2831853/len; return d * (amp*k*cos(dot(p,d)*k + time*spd*k)); }
  float shipFoam(vec2 p){
    float f = 0.0;
    for (int i = 0; i < 8; i++) {
      if (shipB[i].z < 0.5) continue;
      vec3 l = shipLocal(p, i); float lx = l.x, lz = l.y, hl = shipB[i].x, hb = shipB[i].y, sp = shipA[i].w;
      float e = length(vec2(lx/(hl*1.02), lz/(hb*1.05)));
      float band = smoothstep(1.55, 1.0, e) * step(0.96, e);
      float bow = clamp(lx/hl, 0.0, 1.0);
      f += band * (0.3 + 1.3*bow*bow) * (0.2 + 0.8*sp);
      float bx = -lx - hl*0.85;
      if (bx > 0.0) { float fade = clamp(1.0 - bx/(520.0*sp + 1.0), 0.0, 1.0); float w = hb*0.75 + bx*0.06;
        f += smoothstep(w, w*0.3, abs(lz)) * fade * fade * sp * 1.1; }
      float ax = hl*0.75 - lx;
      if (ax > 0.0) { float arm = abs(abs(lz) - hb*0.5 - ax*0.354); float aw = 2.5 + ax*0.012;
        f += smoothstep(aw, 0.0, arm) * clamp(1.0 - ax/(800.0*sp + 1.0), 0.0, 1.0) * sp * 0.7; }
    }
    return f;
  }
  void main(){
    if (uPatch < 0.5 && distance(vW.xz, cameraPosition.xz) < 1320.0) discard;
    vec3 V = cameraPosition - vW; float dist = length(V); V /= dist;
    vec2 p0 = vW.xz, p = p0 + (vec2(noise(p0*0.0035), noise(p0*0.0035 + 7.3)) - 0.5) * 70.0; vec2 g = vec2(0.0); // domain warp: no endless parallel crests
    vec2 pL = p + (vec2(noise(p0*0.0006 + 2.0), noise(p0*0.0006 + 9.1)) - 0.5) * 420.0; // swells get a much larger warp
    float f2 = 1.0 - smoothstep(1500.0, 9000.0, dist);
    float f3 = 1.0 - smoothstep(7000.0, 45000.0, dist);
    // anti-aliasing: fade every wave whose wavelength gets close to the pixel footprint (this caused the striped moire far off)
    float fp = max(length(dFdx(p0)), length(dFdy(p0))) + 1e-3;
    #define AA(len) (1.0 - smoothstep(len*0.12, len*0.45, fp))
    g += wv(p, vec2(1.0,0.3), 6.0, 0.07, 3.0) * AA(6.0);
    g += wv(p, vec2(-0.4,1.0), 9.5, 0.10, 3.8) * AA(9.5);
    g += wv(p, vec2(0.8,-0.6), 17.0, 0.20, 5.0) * AA(17.0);
    g += wv(p, vec2(-0.9,-0.2), 29.0, 0.32, 6.5) * AA(29.0);
    g += wv(p, vec2(0.6,0.8), 53.0, 0.55, 9.0) * AA(53.0);
    g += wv(pL, vec2(-0.9,0.35), 89.0, 0.80, 11.0) * AA(89.0);
    g += wv(pL, vec2(0.2,-1.0), 160.0, 1.20, 15.0) * AA(160.0);
    g += wv(pL, vec2(1.0,0.15), 290.0, 1.70, 20.0) * AA(290.0);
    g += wv(p, vec2(0.35,0.94), 41.0, 0.30, 8.0) * AA(41.0);
    g += wv(p, vec2(-0.7,-0.7), 23.0, 0.18, 6.0) * AA(23.0);
    g += wv(p, vec2(0.95,-0.3), 71.0, 0.42, 10.0) * AA(71.0);
    g += wv(pL, vec2(-0.2,0.98), 120.0, 0.6, 13.0) * AA(120.0);
    float n1 = noise(p*0.9 + time*vec2(0.3,0.2)), n2 = noise(p*0.9 + vec2(5.2,1.3) - time*vec2(0.2,0.35));
    g += (vec2(n1,n2) - 0.5) * 0.34 * AA(2.0);
    // the finest ripples alias first: keep distant water a little rough so the sky reflection stays soft, not mirror-flat
    g += (vec2(noise(p*0.012 + time*0.02), noise(p*0.012 + 3.1)) - 0.5) * 0.18 * (1.0 - AA(60.0));
    vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
    float fres = 0.025 + 0.975 * pow(1.0 - max(dot(N,V),0.0), 5.0);
    vec3 R = reflect(-V, N); R.y = abs(R.y);
    vec3 deep = vec3(0.010,0.052,0.095) * seaTint, lit = vec3(0.030,0.180,0.215) * seaTint; // a deeper, less candy-coloured ocean
    float sss = clamp(0.5 + dot(N.xz, sunDir.xz)*2.2, 0.0, 1.0) * (0.55 + 0.45*clamp(vW.y*0.3 + 0.5, 0.0, 1.0));
    vec3 col = mix(mix(deep, lit, sss), skyBase(R), fres);
    float rs = max(dot(R,sunDir),0.0);
    col += vec3(1.0,0.9,0.72) * pow(rs, 260.0) * (0.3 + 1.0*f3) + vec3(1.0,0.85,0.6) * pow(rs, 24.0) * 0.07;
    float cap = fbm(p*0.06 + time*0.03);
    float foam = smoothstep(0.70, 0.84, cap + clamp(vW.y, 0.0, 3.0)*0.04) * f2 * (0.25 + 0.75*noise(p*0.8 - time*0.1)) * 0.6;
    float sf = shipFoam(p) * (0.45 + 1.1*noise(p*0.45 + time*vec2(0.4,0.1)) * noise(p*0.13 - time*0.05) * 1.6);
    col = mix(col, vec3(0.90,0.94,0.95), clamp(foam*0.55 + sf, 0.0, 0.93));
    float fog = 1.0 - exp(-dist*fogK);
    col = mix(col, vec3(0.80,0.84,0.86) * skyTint, fog);
    gl_FragColor = vec4(uLin > 0.5 ? pow(col, vec3(2.2)) : col, 1.0);
  }`;
const seaMaterial = (patch) => new THREE.ShaderMaterial({ fog: false, uniforms: { ...U, uPatch: { value: patch } }, vertexShader: SEA_VERT, fragmentShader: SEA_FRAG });
export const sea = new THREE.Mesh(new THREE.PlaneGeometry(170000, 170000), seaMaterial(0));
sea.rotation.x = -PI / 2; sea.frustumCulled = false; sea.renderOrder = -2; scene.add(sea);
const PATCH_SEG = 256, PATCH_STEP = 2800 / PATCH_SEG;
export const seaPatch = new THREE.Mesh(new THREE.PlaneGeometry(2800, 2800, PATCH_SEG, PATCH_SEG), seaMaterial(1));
seaPatch.rotation.x = -PI / 2; seaPatch.frustumCulled = false; seaPatch.renderOrder = -1; scene.add(seaPatch);

// sky reflections for every PBR material
const pmrem = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat));
let envRT = null; function bakeEnv() { const old = envRT; envRT = pmrem.fromScene(envScene, 0, 0.1, 200); scene.environment = envRT.texture; old?.dispose(); }
bakeEnv(); scene.environmentIntensity = 0.7;

function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); ovCam.aspect = w / h; ovCam.updateProjectionMatrix(); }
window.addEventListener("resize", resize); resize();

// ── distant islands (scale + horizon interest) ──────────────────────────────
const islands = []; let PAL = [0xb8a986, 0x46603c, 0x6e6a5c]; // sand, vegetation, rock — set per theatre
const vnoise = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
function islandMesh(r, h) {
  const g = new THREE.ConeGeometry(r, h, 40, 12), p = g.attributes.position, col = [];
  const sand = new THREE.Color(PAL[0]), grass = new THREE.Color(PAL[1]), rock = new THREE.Color(PAL[2]), c = new THREE.Color();
  const ph = rnd() * 10;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = (y + h / 2) / h;
    const n = 0.62 + 0.38 * (Math.sin(a * 3 + ph) * 0.5 + Math.sin(a * 7 + ph * 2) * 0.3 + vnoise(a * 4, k * 5) * 0.4);
    const s = (k < 0.999 ? n : 1) * (1 - 0.12 * Math.sin(k * 9 + a * 5));
    p.setXYZ(i, x * s, y * (0.75 + 0.35 * n), z * s);
    c.copy(k < 0.05 ? sand : k < 0.6 ? grass : rock).lerp(rock, vnoise(i, 3) * 0.25); col.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
}
/** One island at a fixed spot (the harbour in the air-raid mission); cleared with the others. */
export function addIsland(x, z, r, h) { const m = islandMesh(r, h); m.position.set(x, h * 0.33, z); scene.add(m); islands.push(m); G.islands.push({ x, z, r: r * 0.85 }); return m; }
/** The battle area is open water; beyond it an archipelago rings the horizon, with two large
 *  landmasses further out, so the sea never looks empty. Shown on the minimap and map view. */
/** Theatres: island layout + sea/sky tint. Landmarks are stylised, not survey-accurate. */
/** Each theatre has its own weather and light so they read differently at a glance (stylised, not a weather record). */
export const MAPS = {
  arch: { n: "남태평양 군도", d: "섬이 흩어진 기본 전장 · 한낮", sky: [1, 1, 1], sea: [1, 1, 1], fog: 0xc4cfd4, sun: [0.55, 0.34, -0.76], light: [0xffecd0, 3.0], hemi: 0xcfe2ee, fogK: 0.00004, cloud: 0, pal: [0xb8a986, 0x46603c, 0x6e6a5c] },
  pearl: { n: "진주만 · 하와이", d: "오아후 섬 남쪽 앞바다 · 맑은 아침, 청록빛 바다", sky: [1.0, 1.05, 1.12], sea: [0.72, 1.32, 1.22], fog: 0xd4e6ee, sun: [-0.78, 0.24, -0.42], light: [0xffdcb0, 3.1], hemi: 0xd8f0fa, fogK: 0.000026, cloud: -0.1, pal: [0xe6dab4, 0x2c6e34, 0x5a6a4e] },
  okinawa: { n: "오키나와", d: "오키나와 본섬 서쪽 앞바다 · 잔뜩 흐린 장마 하늘", sky: [0.7, 0.75, 0.8], sea: [0.62, 0.95, 0.9], fog: 0x939fa4, sun: [0.3, 0.6, -0.45], light: [0xd6dde2, 1.5], hemi: 0xa9b6be, fogK: 0.00006, cloud: 0.26, pal: [0xcfc7a8, 0x37573a, 0x585e58] },
  uswest: { n: "미국 서해안", d: "샌디에이고 앞바다 · 짙은 해무, 마른 황금빛 언덕", sky: [0.9, 0.94, 0.99], sea: [0.74, 0.86, 0.98], fog: 0xb2bcc4, sun: [0.2, 0.45, 0.86], light: [0xf0eee8, 1.9], hemi: 0xc4ced8, fogK: 0.00007, cloud: 0.12, pal: [0xcdb88c, 0x9a8448, 0x7c6a54] },
  jeju: { n: "제주도 근해", d: "한라산과 우도·마라도 · 해 질 녘 노을, 검은 현무암", sky: [1.2, 0.9, 0.74], sea: [0.82, 0.86, 1.08], fog: 0xd9b49a, sun: [-0.84, 0.11, 0.53], light: [0xffa860, 2.7], hemi: 0xe4c0a4, fogK: 0.000045, cloud: 0.05, pal: [0x5c5856, 0x3c5a34, 0x34322f] },
};
export function setMapLook(id) {
  const m = MAPS[id] || MAPS.arch; U.skyTint.value.set(...m.sky); U.seaTint.value.set(...m.sea); scene.fog.color.setHex(m.fog); scene.fog.density = m.fogK * 1.25;
  SUN.set(...m.sun).normalize(); sunLight.color.setHex(m.light[0]); sunLight.intensity = m.light[1]; hemi.color.setHex(m.hemi); U.fogK.value = m.fogK; U.cloud.value = m.cloud; PAL = m.pal; bakeEnv();
}
// ── real coastlines: outlines hand-traced from lon/lat of capes, bays and ports (simplified, not survey data) ──
// peaks: [lon, lat, height m, radius m]. Game frame: +x north, +z east; S shrinks the geography to the game's scale.
const GEO = {
  pearl: { lat0: 21.05, lon0: -157.95, S: 0.75, land: [
    { o: [[-158.282, 21.575], [-158.2, 21.582], [-158.12, 21.585], [-158.06, 21.62], [-158.03, 21.68], [-157.99, 21.71], [-157.93, 21.66], [-157.87, 21.56], [-157.83, 21.5], [-157.79, 21.46], [-157.73, 21.465], [-157.72, 21.4], [-157.68, 21.35], [-157.65, 21.31], [-157.69, 21.265], [-157.76, 21.27], [-157.81, 21.255], [-157.84, 21.27], [-157.87, 21.295], [-157.92, 21.315], [-157.965, 21.315], [-157.97, 21.345], [-157.95, 21.365], [-157.99, 21.39], [-158.02, 21.37], [-158.01, 21.33], [-157.98, 21.318], [-158.05, 21.3], [-158.11, 21.295], [-158.13, 21.34], [-158.18, 21.4], [-158.22, 21.46], [-158.25, 21.53]],
      p: [[-158.14, 21.51, 1220, 6000], [-158.17, 21.44, 800, 5000], [-157.92, 21.53, 850, 5000], [-157.83, 21.41, 900, 5000], [-157.74, 21.33, 650, 4000], [-157.805, 21.262, 230, 800], [-157.69, 21.272, 370, 900]] }] },
  okinawa: { lat0: 26.35, lon0: 127.55, S: 1, land: [
    { o: [[128.26, 26.875], [128.32, 26.8], [128.3, 26.72], [128.23, 26.65], [128.18, 26.58], [128.1, 26.52], [128.05, 26.46], [127.98, 26.43], [127.95, 26.38], [127.98, 26.33], [127.93, 26.3], [127.86, 26.27], [127.82, 26.18], [127.76, 26.14], [127.72, 26.08], [127.66, 26.1], [127.66, 26.17], [127.68, 26.22], [127.71, 26.29], [127.73, 26.36], [127.71, 26.43], [127.78, 26.47], [127.85, 26.52], [127.92, 26.56], [127.88, 26.6], [127.86, 26.66], [127.89, 26.71], [127.96, 26.7], [128.03, 26.69], [128.12, 26.74], [128.18, 26.8], [128.22, 26.85]],
      p: [[128.22, 26.72, 500, 5000], [128.14, 26.65, 420, 5000], [127.94, 26.66, 450, 3000], [127.8, 26.2, 120, 5000]] },
    { o: [[127.75, 26.725], [127.78, 26.735], [127.82, 26.725], [127.83, 26.71], [127.79, 26.7], [127.75, 26.71]], p: [[127.81, 26.715, 170, 600]] }] },
  jeju: { lat0: 33.05, lon0: 126.55, S: 0.7, land: [
    { o: [[126.53, 33.52], [126.6, 33.53], [126.67, 33.55], [126.76, 33.56], [126.86, 33.53], [126.92, 33.5], [126.94, 33.47], [126.945, 33.445], [126.88, 33.39], [126.85, 33.32], [126.75, 33.29], [126.62, 33.24], [126.56, 33.235], [126.47, 33.23], [126.38, 33.22], [126.29, 33.2], [126.25, 33.23], [126.17, 33.29], [126.19, 33.35], [126.24, 33.4], [126.31, 33.45], [126.41, 33.49], [126.47, 33.51]],
      p: [[126.533, 33.362, 1950, 14000], [126.94, 33.458, 180, 600], [126.31, 33.235, 395, 800], [126.29, 33.205, 100, 500]] },
    { o: [[126.93, 33.52], [126.96, 33.53], [126.97, 33.51], [126.95, 33.49], [126.93, 33.5]], p: [[126.965, 33.5, 130, 600]] },
    { o: [[126.262, 33.122], [126.272, 33.126], [126.278, 33.115], [126.268, 33.108]], p: [] },
    { o: [[126.265, 33.176], [126.282, 33.172], [126.278, 33.158], [126.262, 33.162]], p: [] }] },
  uswest: { lat0: 32.7, lon0: -117.45, S: 0.8, land: [
    { o: [[-117.28, 32.95], [-117.27, 32.87], [-117.255, 32.85], [-117.25, 32.8], [-117.255, 32.765], [-117.255, 32.745], [-117.25, 32.7], [-117.24, 32.665], [-117.225, 32.69], [-117.21, 32.72], [-117.17, 32.725], [-117.15, 32.69], [-117.11, 32.65], [-117.11, 32.58], [-117.12, 32.535], [-116.6, 32.535], [-116.6, 32.95]],
      p: [[-117.24, 32.7, 120, 1500], [-117.25, 32.84, 250, 1500], [-116.95, 32.75, 500, 15000], [-116.8, 32.85, 800, 12000], [-116.85, 32.6, 1000, 7000]], base: 90 },
    { o: [[-117.2, 32.695], [-117.17, 32.705], [-117.15, 32.685], [-117.16, 32.66], [-117.135, 32.62], [-117.12, 32.578], [-117.135, 32.575], [-117.16, 32.62], [-117.185, 32.67]], p: [] },
    { o: [[-117.255, 32.43], [-117.24, 32.425], [-117.245, 32.41], [-117.26, 32.415]], p: [[-117.25, 32.42, 200, 700]] }] },
};
function inPoly(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; }
function edgeDist(P, x, z) { let d = Infinity; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, az] = P[j], [bx, bz] = P[i], vx = bx - ax, vz = bz - az, t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1), 0, 1); d = Math.min(d, Math.hypot(x - ax - vx * t, z - az - vz * t)); } return d; }
/** Is (x, z) on land (or within `pad` metres of it)? Islands are circles or real-coastline polygons. */
export function landAt(x, z, pad = 0) {
  for (const s of G.islands) {
    if (s.poly) { const b = s.bb; if (x < b[0] - pad || x > b[1] + pad || z < b[2] - pad || z > b[3] + pad) continue; if (inPoly(s.poly, x, z) || (pad && edgeDist(s.poly, x, z) < pad)) return true; }
    else if (Math.hypot(x - s.x, z - s.z) < s.r + pad) return true;
  }
  return false;
}
/** smooth value noise and fbm for terrain relief */
function vn2(x, z) { const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = vnoise(xi, zi), b = vnoise(xi + 1, zi), c = vnoise(xi, zi + 1), d = vnoise(xi + 1, zi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm2(x, z) { let s = 0, a = 0.5; for (let i = 0; i < 5; i++) { s += a * vn2(x, z); x = x * 2.03 + 17; z = z * 2.03 + 9; a *= 0.5; } return s; }
/** tiling ground detail (multiplied over vertex colours) */
const GROUND = canvasTex(256, (x) => { const R = seeded(77); x.fillStyle = "#c8c8c8"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const v = (150 + R() * 105) | 0; x.fillStyle = `rgba(${v},${v},${v},0.5)`; const r = 1 + R() * 3.5; x.beginPath(); x.arc(R() * 256, R() * 256, r, 0, 6.283); x.fill(); } }, true);
function geoLand(g, L) {
  const k = Math.cos(g.lat0 * DEG), to = ([lo, la]) => [(la - g.lat0) * 110540 * g.S, (lo - g.lon0) * 111320 * k * g.S];
  const P = L.o.map(to), pk = L.p.map((q) => [...to(q), q[2] * Math.sqrt(g.S), q[3] * g.S]); // heights shrink less than distances so the skyline still reads
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const cell = Math.max(60, Math.max(x1 - x0, z1 - z0) / 240); x0 -= cell * 2; z0 -= cell * 2; const nx = Math.ceil((x1 - x0) / cell) + 2, nz = Math.ceil((z1 - z0) / cell) + 2;
  const pos = [], col = [], idx = [], hs = [], sand = new THREE.Color(PAL[0]), grass = new THREE.Color(PAL[1]), rock = new THREE.Color(PAL[2]), c = new THREE.Color(), ramp = 900 * g.S, base = (L.base ?? 25) * g.S;
  let top = 1;
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const x = x0 + i * cell, z = z0 + j * cell, inside = inPoly(P, x, z); let h = -25;
    if (inside) { const e = Math.min(1, edgeDist(P, x, z) / ramp); let pkh = 0; for (const [px, pz, H, R] of pk) pkh += H * Math.exp(-((x - px) ** 2 + (z - pz) ** 2) / (2 * R * R));
      const relief = (fbm2(x / (1800 * g.S + 400), z / (1800 * g.S + 400)) - 0.42) * (130 * g.S + pkh * 0.45); // ridges and valleys, stronger on the high ground
      h = 2 + base * e + Math.max(-base * 0.6, relief) * e + pkh * Math.min(1, e * 2.5); }
    hs.push(h); top = Math.max(top, h); pos.push(x, h, z);
  }
  const dirt = new THREE.Color(PAL[0]).lerp(new THREE.Color(PAL[2]), 0.5), forest = new THREE.Color(PAL[1]).multiplyScalar(0.72);
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) { // colour by height, slope and patchy noise: beach, forest, meadow, scrub, bare rock
    const a = i * (nz + 1) + j, h = hs[a], hx = hs[Math.min(nx, i + 1) * (nz + 1) + j] - hs[Math.max(0, i - 1) * (nz + 1) + j], hz = hs[a + (j < nz ? 1 : 0)] - hs[a - (j > 0 ? 1 : 0)];
    const slope = Math.hypot(hx, hz) / (2 * cell), k2 = h / top, patch = fbm2(pos[a * 3] / 900, pos[a * 3 + 2] / 900);
    if (h < 0) c.copy(sand).multiplyScalar(0.55); else if (h < 6) c.copy(sand);
    else { c.copy(patch > 0.52 ? forest : grass).lerp(dirt, Math.max(0, (patch - 0.62) * 2.5)); c.lerp(rock, Math.min(1, Math.max(0, (slope - 0.35) * 2.2) + Math.max(0, (k2 - 0.7) * 2.5))); }
    col.push(c.r, c.g, c.b); }
  const uv = []; for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] / 160, pos[i + 2] / 160);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const a = i * (nz + 1) + j, b = a + nz + 1; if (hs[a] < 0 && hs[a + 1] < 0 && hs[b] < 0 && hs[b + 1] < 0) continue; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: GROUND, roughness: 1, envMapIntensity: 0.25 })); m.receiveShadow = false; scene.add(m); islands.push(m);
  let cx = 0, cz = 0; for (const [x, z] of P) { cx += x; cz += z; } G.islands.push({ x: cx / P.length, z: cz / P.length, r: 0, poly: P, bb: [x0, x1, z0, z1] });
}
export function makeIslands(id = "arch") {
  for (const m of islands) { scene.remove(m); m.geometry.dispose(); } islands.length = 0; G.islands = []; setMapLook(id);
  const I = addIsland;
  if (GEO[id]) { for (const L of GEO[id].land) geoLand(GEO[id], L); return; }
  if (id === "pearl") { I(0, -30000, 15000, 1000); I(-15000, -26000, 7000, 750); I(13000, -25000, 6000, 500); I(-34000, 6000, 5000, 600); I(36000, -4000, 4000, 400); I(24000, 30000, 2500, 260); I(-22000, 34000, 1800, 200); return; }
  if (id === "okinawa") { const ux = 0.8, uz = 0.6, nx = -0.6, nz = 0.8;
    for (let t = -60000; t <= 60000; t += 6500) { const big = Math.abs(t) < 15000, r = big ? 5200 : 1500 + rnd() * 2500; I(ux * t + nx * -24000, uz * t + nz * -24000, r, big ? 480 : 120 + rnd() * 250); }
    for (let i = 0; i < 6; i++) I(-26000 + gauss() * 4000, 22000 + gauss() * 4000, 600 + rnd() * 1200, 80 + rnd() * 150); return; }
  if (id === "uswest") { for (let z = -70000; z <= 70000; z += 11000) I(42000 + gauss() * 2500, z, 15000 + rnd() * 3000, 700 + rnd() * 600);
    I(22000, 6000, 2600, 60); I(-30000, 12000, 5500, 550); I(-24000, -26000, 3500, 400); return; }
  if (id === "jeju") { I(-13000, -34000, 14000, 600); I(0, -36000, 16000, 1700); I(13000, -34000, 14000, 600); I(25000, -27000, 1500, 120); I(-4000, -19500, 700, 40); I(-6500, -21000, 1000, 40);
    I(0, -85000, 32000, 900); I(-40000, -70000, 9000, 500); I(-20000, -60000, 1500, 200); I(38000, 22000, 2500, 200); return; }
  const n = 22, a0 = rnd() * TAU;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU + (rnd() - 0.5) * 0.22, d = 19000 + rnd() * 13000, r = 1200 + rnd() * 3600, h = 180 + rnd() * 650;
    addIsland(Math.cos(a) * d, Math.sin(a) * d, r, h);
    if (rnd() < 0.6) { const b = a + (rnd() - 0.5) * 0.12, e = d + (rnd() - 0.5) * 3000; addIsland(Math.cos(b) * e, Math.sin(b) * e, 400 + rnd() * 900, 80 + rnd() * 220); } // islets
  }
  for (const k of [0, 1]) { const a = a0 + PI * k + 0.9, d = 44000 + rnd() * 6000; addIsland(Math.cos(a) * d, Math.sin(a) * d, 11000 + rnd() * 5000, 900 + rnd() * 700); }
}

// ── textures + mesh helpers ─────────────────────────────────────────────────
function canvasTex(size, draw, repeat) { const c = document.createElement("canvas"); c.width = c.height = size; const ctx = c.getContext("2d"); draw(ctx, size); const t = new THREE.CanvasTexture(c); if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; }
export const WEAR = canvasTex(256, (x) => {
  x.fillStyle = "#f2f2f2"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2800; i++) { const v = (195 + Math.random() * 60) | 0; x.fillStyle = `rgba(${v},${v},${v},0.5)`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  for (let i = 0; i < 80; i++) { const px = Math.random() * 256, len = 30 + Math.random() * 130, y0 = Math.random() * 256, g = x.createLinearGradient(0, y0, 0, y0 + len);
    g.addColorStop(0, Math.random() < 0.3 ? "rgba(125,72,40,.38)" : "rgba(40,45,50,.3)"); g.addColorStop(1, "rgba(60,60,60,0)"); x.fillStyle = g; x.fillRect(px, y0, 1 + Math.random() * 2.5, len); }
  x.strokeStyle = "rgba(30,35,40,.2)"; x.lineWidth = 1;
  for (let y = 0; y < 256; y += 64) { x.beginPath(); x.moveTo(0, y + 0.5); x.lineTo(256, y + 0.5); x.stroke(); }
  for (let v = 0; v < 256; v += 32) { x.beginPath(); x.moveTo(v + 0.5, 0); x.lineTo(v + 0.5, 256); x.stroke(); }
}, true);
WEAR.anisotropy = 4;
export const SOFT = canvasTex(64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.5, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
/** Billowing cloud puff (several lumps) for smoke and spray. */
export const PUFF = canvasTex(128, (x) => { for (let i = 0; i < 9; i++) { const cx = 64 + (Math.random() - 0.5) * 50, cy = 64 + (Math.random() - 0.5) * 50, r = 22 + Math.random() * 22, g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(0.6, "rgba(255,255,255,.25)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); } });
export const FOAM = canvasTex(256, (x) => { x.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { const px = Math.random() * 256, py = Math.random() * 256, d = Math.hypot(px - 128, py - 128) / 128; if (d > 1) continue; const r = 2 + Math.random() * 9 * (1 - d);
    x.fillStyle = `rgba(255,255,255,${(0.25 + Math.random() * 0.45) * (1 - d * d)})`; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); } });
export const RING = canvasTex(128, (x) => { const g = x.createRadialGradient(64, 64, 30, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.6, "rgba(255,255,255,.7)"); g.addColorStop(0.8, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });

const mats = new Map();
/** While a ship is being built, its paint colour maps to its camouflage texture. */
export const paint = { color: null, map: null };
export const mat = (c) => {
  const tex = paint.map && c === paint.color ? paint.map : WEAR, key = c + "|" + tex.uuid;
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color: tex === WEAR ? c : 0xffffff, map: tex, roughness: 0.78, metalness: 0.22 }));
  return mats.get(key);
};

// ── camouflage (US Navy 1941-45 measures) and fictional enemy schemes ───────
export const SCHEMES = {
  ms21: { name: "Measure 21 (전면 네이비 블루)", hull: ["#3c4a5c"], upper: "#3f4d5f" },
  ms22: { name: "Measure 22 (그러데이션)", hull: ["#3c4a5c"], upper: "#8d969d" },
  ms32a: { name: "Measure 32/6D (다즐 위장)", hull: ["#2a2e32", "#6c767e", "#aab2b7"], upper: "#aab2b7", dazzle: true },
  ms32b: { name: "Measure 32/18D (다즐 위장)", hull: ["#3c4a5c", "#8d969d", "#c3c9cc"], upper: "#c3c9cc", dazzle: true },
  ms32c: { name: "Measure 32/16D (다즐 위장)", hull: ["#25292c", "#5a6670", "#9aa4aa", "#c6cbce"], upper: "#9aa4aa", dazzle: true },
  ms33: { name: "Measure 33 (밝은 다즐)", hull: ["#71808b", "#a5b1b8", "#cfd5d8"], upper: "#cfd5d8", dazzle: true },
  ms1: { name: "Measure 1 (다크 그레이)", hull: ["#4f585f"], upper: "#9aa3a9" },
  f1: { name: "", hull: ["#3e4549"], upper: "#4a5257" },
  haze: { name: "헤이즈 그레이", hull: ["#7b848a"], upper: "#8c959b" }, kgray: { name: "", hull: ["#717a80"], upper: "#848d93" }, plagray: { name: "", hull: ["#8e979a"], upper: "#a0a8ab" }, kpn: { name: "", hull: ["#5c6467"], upper: "#6c7477" },
  f2: { name: "", hull: ["#6f7a80", "#8f999e"], upper: "#8f999e", dazzle: true },
  f3: { name: "", hull: ["#4b5654", "#2e3634"], upper: "#59625f", dazzle: true },
  f4: { name: "", hull: ["#5a615c"], upper: "#6a716b" },
  f5: { name: "", hull: ["#2f363d", "#454e56"], upper: "#4c555d", dazzle: true },
};
function seeded(n) { let a = n >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const strSeed = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
/** Faint plate seams and a few soft streaks: modern paint, not WWII rust. */
function panels(x, W, H, R, a) {
  x.fillStyle = `rgba(0,0,0,${a})`; for (let i = 0; i < W; i += 64) x.fillRect(i, 0, 1, H); for (let j = 0; j < H; j += 48) x.fillRect(0, j, W, 1);
  for (let i = 0; i < W / 40; i++) { const px = R() * W, y0 = R() * H * 0.5, len = 10 + R() * H * 0.4, g = x.createLinearGradient(0, y0, 0, y0 + len); g.addColorStop(0, `rgba(30,32,34,${a * 1.4})`); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(px, y0, 1 + R() * 2, len); }
}
function grime(x, W, H, R) {
  for (let i = 0; i < W * H / 90; i++) { const v = (180 + R() * 75) | 0; x.fillStyle = `rgba(${v},${v},${v},0.06)`; x.fillRect(R() * W, R() * H, 2, 2); }
  for (let i = 0; i < W / 9; i++) { const px = R() * W, len = 14 + R() * H * 0.6, y0 = R() * H * 0.6, g = x.createLinearGradient(0, y0, 0, y0 + len);
    g.addColorStop(0, R() < 0.35 ? "rgba(120,66,34,.32)" : "rgba(25,28,30,.22)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(px, y0, 1 + R() * 2, len); }
}
function dazzle(x, W, H, cols, R, big) {
  x.fillStyle = cols[cols.length - 1]; x.fillRect(0, 0, W, H);
  for (let i = 0; i < (big ? 22 : 26); i++) {
    x.fillStyle = cols[(R() * (cols.length - 1)) | 0]; x.beginPath();
    const cx = R() * W, cy = R() * H, n = 3 + ((R() * 3) | 0), r = (big ? 0.16 : 0.1) * W * (0.6 + R());
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU + R() * 0.8; x[k ? "lineTo" : "moveTo"](cx + Math.cos(a) * r * (1.5 + R()), cy + Math.sin(a) * r * 0.5 * (0.6 + R())); }
    x.closePath(); x.fill();
  }
}
/** Hull side texture: antifouling red, black boot-topping, then the scheme above the waterline. */
export function hullTexture(spec) {
  const S = SCHEMES[spec.paint] || SCHEMES.ms21, W = 1024, H = 256, R = seeded(strSeed(spec.id));
  const Ht = spec.fb + spec.sheer + spec.D, vy = (y) => (1 - (y + spec.D) / Ht) * H;
  return canvasTex(W, (x) => {
    x.canvas.height = H;
    if (S.dazzle) dazzle(x, W, H, S.hull, R, true); else { x.fillStyle = S.hull[0]; x.fillRect(0, 0, W, H); }
    if (spec.paint === "ms22") { x.fillStyle = S.upper; x.fillRect(0, 0, W, vy(spec.fb)); }
    if (spec.modern) panels(x, W, H, R, 0.05); else grime(x, W, H, R); // modern haze grey stays clean: faint plating seams only
    x.fillStyle = "#18191a"; x.fillRect(0, vy(1.0), W, vy(-0.4) - vy(1.0));
    x.fillStyle = "#6b2420"; x.fillRect(0, vy(-0.4), W, H - vy(-0.4));
  });
}
/** Repeating camouflage for superstructure and turrets (dazzle schemes only). */
export function upperTexture(spec) {
  if (spec.modern) { const c = "#" + new THREE.Color(spec.upper).getHexString(), R = seeded(strSeed(spec.id + ":m")); return canvasTex(256, (x) => { x.fillStyle = c; x.fillRect(0, 0, 256, 256); panels(x, 256, 256, R, 0.06); }, true); }
  const S = SCHEMES[spec.paint]; if (!S || !S.dazzle) return null;
  const R = seeded(strSeed(spec.id + ":u"));
  const t = canvasTex(256, (x) => { dazzle(x, 256, 256, S.hull, R, false); grime(x, 256, 256, R); }, true); return t;
}
/** Deck planking (or painted steel) tinted to the deck colour. */
export function deckTexture(hex, planks = true) {
  return canvasTex(512, (x) => {
    x.fillStyle = hex; x.fillRect(0, 0, 512, 512);
    if (planks) for (let i = 0; i < 32; i++) { const l = Math.random() * 0.16 - 0.08; x.fillStyle = l > 0 ? `rgba(255,255,255,${l})` : `rgba(0,0,0,${-l})`; x.fillRect(i * 16, 0, 16, 512);
      x.fillStyle = "rgba(0,0,0,.28)"; x.fillRect(i * 16, 0, 1, 512); for (let k = 0; k < 3; k++) x.fillRect(i * 16, Math.random() * 512, 16, 1); }
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; x.fillRect(Math.random() * 512, Math.random() * 512, 4, 4); }
  }, true);
}
/** Painted hull number decal. */
export function textTex(text, color = "#e9ecec") {
  return canvasTex(256, (x) => { x.canvas.height = 128; x.clearRect(0, 0, 256, 128); x.font = "bold 96px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = "rgba(0,0,0,.35)"; x.fillText(text, 131, 69); x.fillStyle = color; x.fillText(text, 128, 66); });
}
export const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
export function box(p, w, h, d, c, x, y, z) { const m = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c))); m.position.set(x, y + h / 2, z); p.add(m); return m; }
export function cyl(p, rt, rb, h, c, x, y, z, seg = 14) { const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c))); m.position.set(x, y + h / 2, z); p.add(m); return m; }
const lineMat = new THREE.LineBasicMaterial({ color: 0x353b3f });
export function lines(g, pts) { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); g.add(new THREE.LineSegments(geo, lineMat)); }

/** Grumman F4F-4 Wildcat style fighter. Nose points +Z, up +Y. */
export function planeMesh(scale = 1, foe = false) {
  if (PLANE_HQ && !foe) return hqPlane(scale);
  const g = new THREE.Group(), top = foe ? 0x55603f : 0x5d6f82, under = foe ? 0x9c9d8a : 0xb9c0c6, dark = 0x24282b;
  const fus = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.28, 7.6, 14), mat(top))); fus.rotation.x = PI / 2; fus.position.z = 0.1; g.add(fus);
  const belly = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.3, 6.6, 14, 1, false, PI * 0.5, PI), mat(under))); belly.rotation.x = PI / 2; belly.position.set(0, -0.08, 0.4); g.add(belly);
  const cowl = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.72, 1.3, 16), mat(top))); cowl.rotation.x = PI / 2; cowl.position.z = 3.9; g.add(cowl);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), mat(dark)); face.position.z = 4.56; g.add(face);
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 10), mat(0x30353a)); hub.rotation.x = PI / 2; hub.position.z = 4.8; g.add(hub);
  const prop = new THREE.Group(); prop.position.z = 4.7; g.add(prop);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 0.05), mat(0x1c1e20)); b.position.y = 0.75; const a = new THREE.Group(); a.rotation.z = (i * TAU) / 3; a.add(b); prop.add(a); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.55, 24), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.18, depthWrite: false })); disc.position.z = 4.72; g.add(disc);
  const wing = new THREE.Shape(); wing.moveTo(-5.8, -0.45); wing.lineTo(-5.6, 0.35); wing.lineTo(-1, 1.05); wing.lineTo(1, 1.05); wing.lineTo(5.6, 0.35); wing.lineTo(5.8, -0.45); wing.lineTo(1, -0.95); wing.lineTo(-1, -0.95); wing.closePath();
  const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.2, bevelEnabled: false }); wg.rotateX(PI / 2);
  const w = shadowed(new THREE.Mesh(wg, mat(top))); w.position.set(0, -0.25, 0.7); g.add(w);
  const st = new THREE.Shape(); st.moveTo(-2.1, -0.3); st.lineTo(-1.9, 0.25); st.lineTo(1.9, 0.25); st.lineTo(2.1, -0.3); st.lineTo(0, -0.55); st.closePath();
  const sg = new THREE.ExtrudeGeometry(st, { depth: 0.1, bevelEnabled: false }); sg.rotateX(PI / 2);
  const s = shadowed(new THREE.Mesh(sg, mat(top))); s.position.set(0, 0.05, -3.3); g.add(s);
  const fin = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.55, 1.25), mat(top))); fin.position.set(0, 0.85, -3.55); fin.rotation.x = -0.18; g.add(fin);
  const can = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), new THREE.MeshStandardMaterial({ color: 0x223040, metalness: 0.9, roughness: 0.1 })); can.scale.set(0.85, 0.75, 1.7); can.position.set(0, 0.55, 0.3); g.add(can);
  const ins = new THREE.MeshBasicMaterial({ color: foe ? 0xb8382c : 0x1d2f66 }), star = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  if (foe) for (const sx of [-3.6, 3.6]) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16), ins); c.rotation.x = -PI / 2; c.position.set(sx, -0.03, 0.55); g.add(c);
    const r = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.74, 20), new THREE.MeshBasicMaterial({ color: 0xe9d27a })); r.rotation.x = -PI / 2; r.position.set(sx, -0.025, 0.55); g.add(r); }
  else for (const sx of [-3.6, 3.6]) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), ins); c.rotation.x = -PI / 2; c.position.set(sx, -0.03, 0.55); g.add(c);
    const st5 = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.2 : 0.48, a = PI / 2 + (i * PI) / 5; st5[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); }
    const sm = new THREE.Mesh(new THREE.ShapeGeometry(st5), star); sm.rotation.x = -PI / 2; sm.position.set(sx, -0.02, 0.55); g.add(sm); }
  g.userData = { prop, isPlane: true, sc: scale, foe }; g.scale.setScalar(scale);
  return g;
}
// high-detail F4F (GLB, metres, nose +Z): built once by loadModels(), then every fighter uses it
let PLANE_HQ = null, BLADE = null, PDISC = null;
const F4F_K = 11.9;
function hqPlane(scale) {
  const g = new THREE.Group(); g.add(PLANE_HQ.clone());
  if (!BLADE) { BLADE = new THREE.BoxGeometry(0.17, 0.165 * F4F_K, 0.05); BLADE.translate(0, 0.165 * F4F_K / 2, 0); PDISC = new THREE.CircleGeometry(0.165 * F4F_K, 28); }
  const prop = new THREE.Group(); prop.position.set(0, 0.02 * F4F_K, 0.327 * F4F_K); g.add(prop);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(BLADE, mat(0x1c1e20)); b.rotation.z = (i * TAU) / 3; prop.add(b); }
  const disc = new THREE.Mesh(PDISC, new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })); disc.position.copy(prop.position).z += 0.04; g.add(disc);
  g.userData = { prop, isPlane: true, hq: true, sc: scale }; g.scale.setScalar(scale);
  return g;
}
/** Swap the GLB fighter in for every procedural one already built (flying or parked on deck). */
export function setPlaneModel(group) {
  PLANE_HQ = group; const old = [];
  scene.traverse((o) => { if (o.userData.isPlane && !o.userData.hq && !o.userData.foe) old.push(o); });
  for (const o of old) { const n = planeMesh(o.userData.sc); n.position.copy(o.position); n.quaternion.copy(o.quaternion); n.userData.prop.rotation.z = o.userData.prop.rotation.z; o.parent.add(n); o.parent.remove(o); G.onPlaneSwap?.(o, n); }
}

// ── particles ───────────────────────────────────────────────────────────────
export class Pool {
  constructor(n, { additive = false, map = SOFT } = {}) {
    this.items = []; this.next = 0;
    for (let i = 0; i < n; i++) {
      const m = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, opacity: 0, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
      const s = new THREE.Sprite(m); s.visible = false; scene.add(s); this.items.push({ s, life: 0 });
    }
  }
  spawn(o) {
    const p = this.items[this.next]; this.next = (this.next + 1) % this.items.length;
    Object.assign(p, { vx: 0, vy: 0, vz: 0, g: 0, drag: 0, s0: 5, s1: 10, a: 1, fade: 1 }, o, { max: o.life });
    p.s.position.set(o.x, o.y, o.z); p.s.material.color.setHex(o.c ?? 0xffffff); p.s.material.rotation = rnd() * TAU; p.s.visible = true;
  }
  update(dt) {
    for (const p of this.items) {
      if (p.life <= 0) continue;
      p.life -= dt; if (p.life <= 0) { p.s.visible = false; continue; }
      const k = 1 - p.life / p.max;
      p.vy -= p.g * dt; if (p.drag) { const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy *= f; p.vz *= f; }
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
      if (p.g && p.s.position.y < 0) { p.life = Math.min(p.life, 0.3); p.s.position.y = 0; }
      const sz = p.s0 + (p.s1 - p.s0) * Math.sqrt(k); p.s.scale.set(sz, sz, 1);
      // fade out puffs that envelop the camera (avoids full-screen overdraw and grey-outs in first person)
      const dc = p.s.position.distanceTo(camera.position), frac = sz / (Math.max(dc, 0.1) * camera.fov * DEG), nk = clamp((dc - sz * 0.2) / (sz * 0.7), 0, 1) * clamp((2.2 - frac) / 1.2, 0, 1);
      p.s.visible = nk > 0.02;
      p.s.material.opacity = p.a * Math.pow(1 - k, p.fade) * Math.min(1, k * 14) * nk;
    }
  }
  clear() { for (const p of this.items) { p.life = 0; p.s.visible = false; } }
}
export const smoke = new Pool(560, { map: PUFF }), flash = new Pool(110, { additive: true }), spray = new Pool(520, { map: PUFF }), spark = new Pool(320, { additive: true });

/** Flat decals on the water: foam rings, foam patches, pressure rings, wake. */
class Decals {
  constructor(n, map) {
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-PI / 2);
    this.items = []; this.next = 0;
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: 0 })); m.visible = false; m.renderOrder = 1; scene.add(m); this.items.push({ m, life: 0 }); }
  }
  spawn(o) {
    const d = this.items[this.next]; this.next = (this.next + 1) % this.items.length;
    Object.assign(d, { w0: 10, l0: 10, w1: 20, l1: 20, a: 0.6, rot: rnd() * TAU, y: 0.5, ease: 2 }, o, { max: o.life });
    d.m.position.set(o.x, d.y, o.z); d.m.rotation.y = d.rot; d.m.material.color.setHex(o.c ?? 0xffffff); d.m.visible = true;
  }
  update(dt) {
    for (const d of this.items) {
      if (d.life <= 0) continue; d.life -= dt; if (d.life <= 0) { d.m.visible = false; continue; }
      const k = 1 - d.life / d.max, e = 1 - Math.pow(1 - k, d.ease);
      d.m.scale.set(d.w0 + (d.w1 - d.w0) * e, 1, d.l0 + (d.l1 - d.l0) * e); d.m.material.opacity = d.a * Math.pow(1 - k, 1.3);
    }
  }
  clear() { for (const d of this.items) { d.life = 0; d.m.visible = false; } }
}
export const rings = new Decals(60, RING), patches = new Decals(60, FOAM), wakes = new Decals(170, FOAM);

/** Shell splash: a column of falling spray, a mist cap, a foam ring and a lingering foam patch. */
export function spawnSplash(x, z, sc = 1) {
  const k = Math.sqrt(sc), n = Math.round(8 + 16 * sc);
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU, r = rnd() * 3.5 * sc, out = (0.5 + rnd() * 3.5) * k;
    spray.spawn({ x: x + Math.cos(a) * r, y: 1 + rnd() * 3, z: z + Math.sin(a) * r, vx: Math.cos(a) * out, vy: (15 + rnd() * 22) * k, vz: Math.sin(a) * out, g: GRAV, drag: 0.3,
      life: 3.2 + rnd() * 1.8, s0: 2 + 3 * sc, s1: 5 + (11 + rnd() * 10) * sc, a: 0.92, fade: 0.55, c: 0xf4f7f8 });
  }
  for (let i = 0; i < 3; i++) smoke.spawn({ x: x + gauss() * 4 * sc, y: (18 + rnd() * 26) * sc, z: z + gauss() * 4 * sc, vx: 2.2, vy: 0.8, vz: 0.7, life: 6 + rnd() * 3, s0: 10 * sc, s1: 42 * sc, a: 0.42, c: 0xeef2f3 });
  rings.spawn({ x, z, w0: 4 * sc, l0: 4 * sc, w1: 34 * sc, l1: 34 * sc, life: 3.6, a: 0.65 });
  patches.spawn({ x, z, w0: 10 * sc, l0: 10 * sc, w1: 42 * sc, l1: 42 * sc, life: 14, a: 0.5 });
}
export function spawnWake(x, z, heading, beam) { wakes.spawn({ x, z, rot: -heading + PI / 2, w0: beam * 0.9, l0: 16, w1: beam * 3.6, l1: 34, life: 70, a: 0.34, y: 0.35 }); }

export function clearFx() { smoke.clear(); flash.clear(); spray.clear(); spark.clear(); rings.clear(); patches.clear(); wakes.clear(); }

/** Per-frame world upkeep. Call after the camera has been placed. */
export function updateWorld(dt, focus) {
  U.time.value = G.time;
  for (let i = 0; i < 8; i++) {
    const s = G.ships[i], A = U.shipA.value[i], B = U.shipB.value[i];
    if (s && s.sinking < 10 && s.root.visible) { A.set(s.pos.x, s.pos.z, s.heading, clamp(Math.abs(s.speed) / s.vmax, 0, 1)); B.set(s.spec.L / 2, s.spec.B / 2, 1, 0); } else B.z = 0;
  }
  smoke.update(dt); flash.update(dt); spray.update(dt); spark.update(dt); rings.update(dt); patches.update(dt); wakes.update(dt);
  sky.position.copy(camera.position); sea.position.set(camera.position.x, 0, camera.position.z);
  seaPatch.position.set(Math.round(camera.position.x / PATCH_STEP) * PATCH_STEP, 0, Math.round(camera.position.z / PATCH_STEP) * PATCH_STEP);
  if (focus) { sunLight.target.position.copy(focus); sunLight.position.copy(focus).addScaledVector(SUN, 520); }
}
