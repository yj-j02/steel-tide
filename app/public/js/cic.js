// ── commander's CIC (지휘통제실): tactical KNTDS C4I room for joint support & ESM/ISR coordination ─────────
// ` toggles minimized ↔ PiP window; Shift+` or double-click toggles fullscreen CIC; drag header to move, wheel to resize/zoom.
// Click the CIC map (or a tracked target row, or Ctrl+click battle sea) to designate a strike/recon point, pick asset, approve with Y.
import { THREE, PI, TAU, clamp, rnd, gauss, brg, G, scene, camera, landAt, flash, rings, smoke, spark } from "./core.js";
import { M, WPN, launch, launchJet } from "./modern.js";
import { sfx } from "./audio.js";

Object.assign(WPN, {
  "하푼": { role: "asm", name: "하푼 (공중발사)", range: 26000, v: 240, cls: "sub", alt: "skim", dmg: 30 },
  "91식": { role: "asm", name: "91식 공대함", range: 26000, v: 260, cls: "sub", alt: "skim", dmg: 30 },
  "해성 지상": { role: "asm", name: "해성 지대함 (지상형, 가정)", range: 42000, v: 290, cls: "sub", alt: "skim", dmg: 34 },
  "12식": { role: "asm", name: "12식 지대함", range: 42000, v: 290, cls: "sub", alt: "skim", dmg: 34 },
  "NSM 지상": { role: "asm", name: "NMESIS · NSM", range: 40000, v: 270, cls: "sub", alt: "skim", dmg: 32, stealth: 0.7 },
});
// game assumptions per nation (names are real equipment; ranges, counts and timings are game balance)
const AIR = {
  us: { fighter: { type: "F/A-18E (공군 지원 편대)", asm: "LRASM", aam: "AIM-120" }, heavy: { type: "MC-130J 수송작전기 (래피드 드래곤)", asm: "LRASM", n: 8 } },
  kr: { fighter: { type: "KF-21 (가정)", asm: "해성", aam: "AIM-120" }, heavy: { type: "C-130H 대형수송기 (래피드 드래곤)", asm: "하푼", n: 8 } },
  jp: { fighter: { type: "F-2", asm: "17식", aam: "AIM-120" }, heavy: { type: "C-130H 대형수송기", asm: "91식", n: 8 } },
};
const BATTERY = { "west:kr": { name: "해안 지대함 포대 (미사일사령부)", key: "해성 지상" }, "east:kr": { name: "해안 지대함 포대 (미사일사령부)", key: "해성 지상" }, "strait:kr": { name: "해안 지대함 포대 (미사일사령부)", key: "해성 지상" }, "jeju:kr": { name: "해안 지대함 포대 (미사일사령부)", key: "해성 지상" }, "okinawa:jp": { name: "육상자위대 12식 지대함 포대", key: "12식" }, "uswest:us": { name: "미 해병대 NMESIS 포대", key: "NSM 지상" } };
const MAX_USES = { fighter: 2, heavy: 1, battery: 2, recon: 2, tot: 3 };
const CD_SEC = { fighter: 60, heavy: 60, battery: 90, recon: 75, tot: 65 };

const C = { mode: "pip", on: false, el: null, map: null, pend: null, talkT: 0, say: "", uses: {}, cd: {}, battery: null, zoom: 1, deps: null, sig: "", tSig: "", lSig: "", drag: null, hover: null, pulses: [], warnT: 0, trkList: [], lastMarks: [], wcs: "auto", isr3d: null, tots: [], capZones: [], feed: null, feedCam: null, feedSig: "" };
const $ = (s) => C.el.querySelector(s);
export function cicWcs() { return C.on ? C.wcs : "auto"; }
export function cicSetWcs(m) {
  if (!["auto", "tight", "hold"].includes(m)) return;
  C.wcs = m; C.tSig = ""; sfx.click();
  say(m === "auto" ? "방공 교전수칙 [FREE] — 탐지된 모든 대함위협 자동 요격." : m === "tight" ? "방공 교전수칙 [TIGHT] — 초음속·우선표적 위주 SM 요격 (탄약 절약)." : "방공 교전수칙 [HOLD] — 장거리 SAM 발사 통제, CIWS 근접방어만 가동.");
}
/** Big view (option B): two live EO/IR monitors under the battle view. CAM 1 follows our asset, CAM 2 watches the target. */
export function cicBigFeeds() {
  if (!C.on || C.mode !== "big" || !C.fdA) return null;
  return [C.fdA, C.fdB];
}
function bigFeedTargets() {
  const P = G.player, f = C.feed && G.battleT <= C.feed.endT ? C.feed : null;
  const asset = (f && f.target && (f.target.alive !== false) ? f.target : null) || M.list.find((m) => m.alive && m.side === "us" && m.W.role === "asm") || M.jets.find((j) => j.alive && j.side === "us" && (j.support || j.pilot)) || M.jets.find((j) => j.alive && j.side === "us") || P;
  const sup = C.deps.md.supPt, tgt = (G.enemy && G.enemy.alive ? G.enemy : null) || (sup ? G.enemies.filter((e) => e.alive).sort((a, b) => a.pos.distanceToSquared(sup) - b.pos.distanceToSquared(sup))[0] : null) || G.enemies.filter((e) => e.alive).sort((a, b) => a.pos.distanceToSquared(P.pos) - b.pos.distanceToSquared(P.pos))[0] || null;
  return [asset === tgt ? (M.list.find((m) => m.alive && m.side === "us" && m.W.role === "asm") || M.jets.find((j) => j.alive && j.side === "us") || P) : asset, tgt]; /* never the same picture twice */
}
function aimFeedCam(cam, t, dt, age, snap) { /* chase a moving asset, orbit a ship or a point; returns [left, right] caption */
  if (t && t.pos && t.vel && (t.isJet || t.W)) {
    const dir = t.vel.lengthSq() > 1 ? t.vel.clone().normalize() : new THREE.Vector3(1, 0, 0), side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    const back = t.heavy ? 64 : t.isJet ? 34 : 20, up = t.heavy ? 18 : t.isJet ? 10 : 5, lat = t.heavy ? 22 : t.isJet ? 11 : 7;
    const want = t.pos.clone().addScaledVector(dir, -back).addScaledVector(side, lat).add(new THREE.Vector3(0, up, 0)); want.y = Math.max(want.y, 12);
    if (snap) cam.position.copy(want); else cam.position.lerp(want, Math.min(1, dt * 8));
    cam.lookAt(t.pos.clone().addScaledVector(dir, t.isJet ? 45 : 70));
    return [`${t.name || t.W?.name || ""} · ${Math.round(t.pos.y)}m`, `${Math.round(t.vel.length() * 3.6)}km/h`];
  }
  const base = t?.pos ? t.pos : t; if (!base) return ["NO TARGET", ""];
  const R = t?.spec ? Math.max(380, t.spec.L * 3.2) : 360, a = age * 0.35;
  cam.position.set(base.x + Math.cos(a) * R, Math.max(60, R * 0.32), base.z + Math.sin(a) * R); cam.lookAt(base.x, 8, base.z);
  return [t?.name || "TARGET SECTOR", t?.hp != null && t.maxHp ? `선체 ${Math.round(100 * t.hp / t.maxHp)}%` : ""];
}
function updateBigFeeds(dt) {
  if (C.mode !== "big" || !C.fdA) return;
  if (C.viewEl && ((C.vfr = (C.vfr || 0) + 1) % 20 === 1)) { const r = C.viewEl.getBoundingClientRect(), st = document.body.style; st.setProperty("--cvx", `${Math.round(r.left)}px`); st.setProperty("--cvy", `${Math.round(r.top)}px`); st.setProperty("--cvw", `${Math.round(r.width)}px`); st.setProperty("--car", `${innerWidth} / ${innerHeight}`); } /* the battle view sits in the slot */
  const [a, b] = bigFeedTargets(), age = G.battleT;
  for (const [fd, t] of [[C.fdA, a], [C.fdB, b]]) {
    const changed = fd.target !== t; fd.target = t;
    const [l, r] = aimFeedCam(fd.cam, t, dt, age, changed);
    const sig = `${l}|${r}`; if (sig !== fd.sig) { fd.sig = sig; fd.cap.innerHTML = `<span>${l}</span><span>${r}</span>`; }
  }
}
export function cicFeedInfo() {
  if (!C.on || C.mode === "big" || !C.feed || G.battleT > C.feed.endT || document.body.classList.contains("jetfly")) return null;
  const view = document.getElementById("cicFeedView"); if (!view) return null;
  return { cam: C.feedCam, rect: view.getBoundingClientRect(), feed: C.feed };
}

export function cicInit(deps) { // deps: { md, face, faceSkin, cmdrName, nat, theater, toast, log, radio, know }
  C.deps = deps; if (C.el) return;
  C.el = document.getElementById("cic"); C.map = $(".cic-map");
  C.el.addEventListener("dblclick", (e) => { if (e.target.closest(".cic-cards,.cic-ask,.cic-map,.cic-mapw,.cic-tracks,.cic-tools,.cic-btn,.cic-tele")) return; cicExpand(); });
  { /* option B big view: a slot for the battle view and two EO/IR monitors (CAM 1 asset, CAM 2 target) */
    const b = C.el.querySelector(".cic-b"), v = document.createElement("div"); v.className = "cic-view"; v.innerHTML = '<span class="cv-l">LIVE BATTLE CAMERA</span>'; b.appendChild(v);
    const fw = document.createElement("div"); fw.className = "cic-feeds";
    fw.innerHTML = [["A", "CAM 1 · 아군 자산"], ["B", "CAM 2 · 표적"]].map(([k, t]) => `<div class="cic-fd" id="cicFeed${k}"><div class="fd-h"><span class="cf-dot"></span><b>${t}</b><i>FLIR</i></div><div class="fd-v"><canvas width="384" height="216"></canvas><div class="cf-ret"></div><div class="fd-s"></div></div></div>`).join("");
    b.appendChild(fw);
    const mk = (k) => { const el = fw.querySelector(`#cicFeed${k}`), cv = el.querySelector("canvas"); return { cam: new THREE.PerspectiveCamera(40, 16 / 9, 4, 90000), canvas: cv, ctx: cv.getContext("2d"), cap: el.querySelector(".fd-s"), w: 384, h: 216, target: null, sig: "" }; };
    C.fdA = mk("A"); C.fdB = mk("B"); C.viewEl = v; }
  { const h = document.querySelector("#cicFeed .cf-h"), x = document.getElementById("cicFeedClose"); /* small feed: channel switch */
    if (h && x && !document.getElementById("cicFeedCh")) { const bt = document.createElement("button"); bt.id = "cicFeedCh"; bt.type = "button"; bt.title = "채널 전환 (자산 ↔ 표적)"; bt.textContent = "CAM 1 · 자산"; h.insertBefore(bt, x);
      bt.addEventListener("click", (e) => { e.stopPropagation(); C.feedCh = C.feedCh === 2 ? 1 : 2; bt.textContent = C.feedCh === 2 ? "CAM 2 · 표적" : "CAM 1 · 자산"; C.feedSig = ""; }); } }
  C.el.querySelector(".cic-h").insertAdjacentHTML("beforeend", `<span class="cic-btns"><button class="cic-btn" data-m="min" title="최소화 (\`)">─</button><button class="cic-btn" data-m="big" title="확대 (Shift+\`)">⤢</button></span>`);
  C.el.querySelector(".cic-btns").addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (!b) return; e.stopPropagation(); b.dataset.m === "min" ? setMode("min") : cicExpand(); });
  C.tab = document.createElement("button"); C.tab.id = "cicTab"; C.tab.type = "button"; C.tab.textContent = "지휘통제실 열기 (`)"; document.body.appendChild(C.tab);
  C.tab.addEventListener("mousedown", (e) => e.stopPropagation()); C.tab.addEventListener("click", (e) => { e.stopPropagation(); setMode("pip"); });
  document.getElementById("cicFeedClose")?.addEventListener("click", (e) => { e.stopPropagation(); C.feed = null; document.body.classList.remove("cicfeed-on"); sfx.click(); });
  document.getElementById("cicFeedView")?.addEventListener("click", (e) => {
    e.stopPropagation(); if (!C.feed) return;
    const t = C.feed.target;
    if (t?.isJet && t.alive) C.deps.watchJet?.(t);
    else if (t?.W && t.alive) C.deps.watchMsl?.(t);
    else if (C.feed.kind === "tot" || C.feed.kind === "recon") { const am = M.list.find((m) => m.alive && m.side === "us" && m.W.role === "asm"); if (am) C.deps.watchMsl?.(am); else sfx.click(); }
  });
  $(".cic-tele")?.addEventListener("click", (e) => { const b = e.target.closest("[data-wcs]"); if (!b) return; e.stopPropagation(); cicSetWcs(b.dataset.wcs); });
  $(".cic-h").addEventListener("mousedown", (e) => { if (C.mode !== "pip" || e.target.closest(".cic-btn")) return; const r = C.el.getBoundingClientRect(); C.drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; e.preventDefault(); e.stopPropagation(); });
  window.addEventListener("mousemove", (e) => { if (!C.drag) return; C.el.style.left = clamp(e.clientX - C.drag.dx, 0, innerWidth - 120) + "px"; C.el.style.top = clamp(e.clientY - C.drag.dy, 0, innerHeight - 60) + "px"; C.el.style.right = C.el.style.bottom = "auto"; });
  window.addEventListener("mouseup", () => { C.drag = null; });
  C.el.addEventListener("wheel", (e) => {
    e.stopPropagation();
    if (e.target.closest(".cic-mapw")) {
      e.preventDefault();
      C.zoom = clamp(C.zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2), 0.4, 4);
    }
  }, { passive: false });
  C.el.addEventListener("mousedown", (e) => e.stopPropagation());
  C.map.addEventListener("mousemove", (e) => {
    const p = mapWorld(e), P = G.player;
    if (!p || !P) { C.hover = null; return; }
    const d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z), a = Math.atan2(p.z - P.pos.z, p.x - P.pos.x);
    C.hover = { x: p.x, z: p.z, km: (d / 1000).toFixed(1), brg: brg(a) };
    const tip = $(".cic-hudtip"); if (tip) tip.textContent = `BRG ${C.hover.brg} · RNG ${C.hover.km} km · ×${C.zoom.toFixed(1)}`;
  });
  C.map.addEventListener("mouseleave", () => { C.hover = null; const tip = $(".cic-hudtip"); if (tip) tip.textContent = ""; });
  C.map.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const w = mapWorld(e);
    if (w) {
      const mHit = M.list.find((m) => m.alive && m.side === "foe" && m.W.role === "asm" && Math.hypot(m.pos.x - w.x, m.pos.z - w.z) < 1500 / C.zoom);
      if (mHit) { mHit.pri = !mHit.pri; sfx.click(); say(mHit.pri ? `요격 우선표적 지정 (${mHit.W.name}) — 방공체계가 최우선 요격합니다.` : "우선 요격 표적 지정을 해제했습니다."); return; }
    }
    const pick = mapPick(e); if (!pick) return;
    C.deps.md.supPt = { x: pick.x, z: pick.z }; sfx.click();
    say(pick.snap ? `표적 고정 [${pick.snap}] (${pick.km} km · ${pick.brg}) — 지원 수단을 선택하십시오.` : `타격 지점 지정 (${pick.km} km · 방위 ${pick.brg}) — 지원 수단을 고르십시오.`);
  });
  $(".cic-tools")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cz]"); if (!b) return; e.stopPropagation(); sfx.click();
    const k = b.dataset.cz;
    if (k === "in") C.zoom = clamp(C.zoom * 1.35, 0.4, 4);
    else if (k === "out") C.zoom = clamp(C.zoom / 1.35, 0.4, 4);
    else if (k === "home") C.zoom = 1;
    else if (k === "wide") C.zoom = 0.5;
    else if (k === "clr") { C.deps.md.supPt = null; C.pend = null; C.sig = ""; say("타격 지점 지정을 해제했습니다."); }
  });
  $(".cic-tracks")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-trk]"); if (!b) return; e.stopPropagation();
    const t = C.trkList[+b.dataset.trk]; if (!t) return;
    C.deps.md.supPt = { x: t.x, z: t.z }; sfx.click();
    say(`표적 지정 [${t.name}] (${t.km} km · ${t.brg}) — 지원 수단 선택 후 승인 바랍니다.`);
  });
  $(".cic-cards").addEventListener("click", (e) => {
    const w = e.target.closest("[data-watch]");
    if (w) { e.stopPropagation(); watchSupport(w.dataset.watch); return; }
    const b = e.target.closest("[data-sup]"); if (b) request(b.dataset.sup);
  });
  $(".cic-ask").addEventListener("click", (e) => { const b = e.target.closest("[data-ok]"); if (b) resolve(b.dataset.ok === "1"); });
  // in the big CIC the battle view is the small window: a click on it swaps back
  window.addEventListener("mousedown", (e) => { if (C.mode === "big" && C.on && e.target.id === "gl") { e.stopImmediatePropagation(); e.preventDefault(); setMode("pip"); } }, true);
}
export function cicStart(deps) {
  cicInit(deps); Object.assign(C.deps, deps); C.on = true; C.mode = "min"; C.pend = null; C.used = 0; C.uses = { ...MAX_USES }; C.cd = {}; C.sig = ""; C.tSig = ""; C.lSig = ""; C.pulses = []; C.warnT = 0; C.trkList = []; C.lastMarks = []; C.wcs = "auto"; C.tots = []; C.capZones = []; C.feed = null; clearIsr3d(); document.body.classList.remove("cicfeed-on");
  document.body.classList.remove("cicbig"); document.body.classList.add("cicmin");
  C.el.style.display = ""; C.el.className = "cic min"; $(".cic-fw").innerHTML = deps.face; const sk = deps.faceSkin || "#d8b08a";
  $(".cic-fw").insertAdjacentHTML("beforeend", `<svg class="cic-anim" viewBox="0 0 100 100"><g class="lids"><ellipse cx="42.5" cy="40.6" rx="5" ry="3.4" fill="${sk}"/><ellipse cx="57.5" cy="40.6" rx="5" ry="3.4" fill="${sk}"/></g><ellipse class="mouth" cx="50" cy="59.8" rx="3.6" ry="1.8" fill="#3a1d16"/></svg>`);
  C.battery = placeBattery(); say(`${deps.cmdrName} 사령관, KNTDS 합동지휘망 연결 완료. 공군·해안포대·위성정찰·TOT 동시탄착 대기 중.`);
  C.tab?.classList.add("ping"); setTimeout(() => { if (C.on && C.mode === "min") C.deps.toast?.("` 지휘통제실 열기 — 위성 ISR 스캔 · TOT 동시탄착 · WCS 방공통제(FREE/TIGHT/HOLD) · 공군·해안포대 지원", 5); }, 3000); /* point new players at the CIC */
}
export function cicStop() { C.on = false; C.pulses = []; C.tots = []; C.capZones = []; C.feed = null; clearIsr3d(); document.body.classList.remove("cicfeed-on"); if (C.el) C.el.style.display = "none"; document.body.classList.remove("cicbig", "cicmin"); if (C.battery?.mesh) C.battery.mesh.parent?.remove(C.battery.mesh); C.battery = null; }
function setMode(m) { if (!C.on) return; C.tab?.classList.remove("ping"); C.mode = m; C.el.className = `cic ${m}`; document.body.classList.toggle("cicbig", m === "big"); document.body.classList.toggle("cicmin", m === "min"); C.el.style.left = C.el.style.top = C.el.style.right = C.el.style.bottom = ""; sfx.click(); C.sig = ""; C.lSig = ""; C.tSig = ""; }
/** ` : minimized ↔ small window (from the big view: back to the small window) */
export function cicToggle() { setMode(C.mode === "min" ? "pip" : C.mode === "big" ? "pip" : "min"); }
/** Shift+` or double-click: enlarge ↔ small window */
export function cicExpand() { setMode(C.mode === "big" ? "pip" : "big"); }
export const cicPending = () => !!C.pend;
export const cicUsed = () => C.used || 0;
export const cicBig = () => C.on && C.mode === "big";

function say(t) { if (C.tab && C.mode === "min") C.tab.classList.add("ping"); C.say = t; C.talkT = Math.min(5.5, 1.1 + t.length * 0.055); $(".cic-say").textContent = t; C.el.classList.add("talk"); }
const batRay = new THREE.Raycaster(), BAT_DOWN = new THREE.Vector3(0, -1, 0);
function groundAt(x, z) {
  batRay.set(new THREE.Vector3(x, 3500, z), BAT_DOWN); batRay.camera = camera;
  const hits = []; for (const o of scene.children) if (o.isMesh || o.isGroup) { try { hits.push(...batRay.intersectObject(o, true)); } catch {} }
  hits.sort((a, b) => a.distance - b.distance);
  for (const h of hits) { const o = h.object; if (o.geometry?.type === "PlaneGeometry" || o.geometry?.type === "SphereGeometry" || h.point.y < 2) continue; if (o.isMesh && h.distance > 10) return h.point.y; }
  return 22;
}
function placeBattery() {
  const key = `${C.deps.theater}:${C.deps.nat}`, b = BATTERY[key]; if (!b) return null; const P = G.player; let best = null, bd = Infinity;
  for (let r = 3000; r <= 30000; r += 1500) for (let k = 0; k < 40; k++) { const a = (k / 40) * TAU, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r; if (landAt(x, z) && landAt(x + 400, z) && landAt(x - 400, z) && r < bd) { bd = r; best = { x, z }; } }
  if (!best) return null;
  const y0 = groundAt(best.x, best.z);
  const g = new THREE.Group();
  const olive = new THREE.MeshStandardMaterial({ color: 0x4e5943, roughness: 0.78, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d201c, roughness: 0.85, metalness: 0.25 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x6f7770, roughness: 0.5, metalness: 0.55 });
  const podMat = new THREE.MeshStandardMaterial({ color: 0x5c6650, roughness: 0.65, metalness: 0.25 });
  // 8x8 TEL vehicle chassis + armored cab + dual stabilizing outriggers
  const frame = new THREE.Mesh(new THREE.BoxGeometry(13.2, 1.1, 3.3), dark); frame.position.set(0, 1.45, 0); g.add(frame);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.5, 3.1), olive); cab.position.set(4.8, 3.0, 0); g.add(cab);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 2.6), new THREE.MeshStandardMaterial({ color: 0x192a34, roughness: 0.15, metalness: 0.65 })); glass.position.set(6.42, 3.45, 0); g.add(glass);
  const wheelGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.55, 12); wheelGeo.rotateX(PI / 2);
  for (const wx of [-4.8, -2.0, 1.4, 4.6]) for (const wz of [-1.65, 1.65]) {
    const w = new THREE.Mesh(wheelGeo, dark); w.position.set(wx, 0.95, wz); g.add(w);
  }
  for (const ox of [-4.2, 2.2]) for (const oz of [-2.3, 2.3]) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.6, 0.8), steel); pad.position.set(ox, 0.8, oz); g.add(pad);
  }
  // 4-cell angled coastal anti-ship missile canister rack
  const rack = new THREE.Group(); rack.position.set(-1.6, 2.45, 0); rack.rotation.z = 0.52;
  const cradle = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.6, 2.9), steel); rack.add(cradle);
  const tubeGeo = new THREE.CylinderGeometry(0.42, 0.44, 7.6, 10); tubeGeo.rotateZ(PI / 2);
  const capGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.18, 10); capGeo.rotateZ(PI / 2);
  for (const [ty, tz] of [[0.7, -0.58], [0.7, 0.58], [1.65, -0.58], [1.65, 0.58]]) {
    const tube = new THREE.Mesh(tubeGeo, podMat); tube.position.set(0.2, ty, tz); rack.add(tube);
    const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: 0xb88635, roughness: 0.45 })); cap.position.set(4.02, ty, tz); rack.add(cap);
  }
  g.add(rack);
  // companion mobile fire-control radar vehicle
  const rVeh = new THREE.Group(); rVeh.position.set(-2.5, 0, 7.2);
  const rBody = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.4, 2.8), olive); rBody.position.set(0, 1.8, 0); rVeh.add(rBody);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3.6, 8), steel); mast.position.set(0, 4.6, 0); rVeh.add(mast);
  const dish = new THREE.Group(); dish.position.set(0, 6.6, 0);
  const pan = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.45, 3.2), steel); dish.add(pan);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 3.4), dark); bar.position.set(0.28, 0, 0); dish.add(bar);
  rVeh.add(dish);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4a38 })); beacon.position.set(-2.9, 3.3, 0); rVeh.add(beacon);
  g.add(rVeh);
  g.scale.setScalar(2.3); g.position.set(best.x, y0, best.z); g.rotation.y = Math.atan2(best.z - P.pos.z, P.pos.x - best.x);
  scene.add(g);
  g.userData = { dish, beacon };
  return { ...b, pos: new THREE.Vector3(best.x, y0, best.z), mesh: g };
}
function clearIsr3d() {
  const g = C.isr3d; if (!g) return;
  scene.remove(g.grp);
  for (const d of g.disposables || []) d.dispose?.();
  C.isr3d = null;
}
function spawnIsr3d(pt, ships) { /* satellite ISR scan: satellite point, wireframe scan pyramid, three pulsing rings with a turning tick ring, sweep curtain, two-layer Link-16 beams; fog off so it reads at 15-30 km */
  clearIsr3d();
  const R = 11000, SAT_Y = 6500, grp = new THREE.Group(), disposables = [];
  const mk = (color, opacity, extra = {}) => { const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, ...extra }); disposables.push(m); return m; };
  const rings = [0.35, 0.7, 1].map((f, i) => { const g = new THREE.RingGeometry(R * f - 70 - i * 30, R * f + 70 + i * 30, 96); g.rotateX(-PI / 2); disposables.push(g); const m = mk(0x4de8d4, 0.5); const r = new THREE.Mesh(g, m); r.position.set(pt.x, 4 + i, pt.z); grp.add(r); return { mesh: r, mat: m, f }; });
  const gTick = new THREE.RingGeometry(R * 1.04, R * 1.1, 180, 1, 0, PI * 1.5); gTick.rotateX(-PI / 2); disposables.push(gTick);
  const matTick = mk(0xaffff1, 0.55, { wireframe: true }), tick = new THREE.Mesh(gTick, matTick); tick.position.set(pt.x, 6, pt.z); grp.add(tick);
  const gCone = new THREE.ConeGeometry(R, SAT_Y, 4, 6, true); gCone.rotateY(PI / 4); disposables.push(gCone);
  const matCone = mk(0x4de8d4, 0.28, { wireframe: true }), cone = new THREE.Mesh(gCone, matCone); cone.position.set(pt.x, SAT_Y / 2, pt.z); cone.rotation.x = PI; grp.add(cone);
  const matConeFill = mk(0x1fb5a6, 0.06), coneFill = new THREE.Mesh(gCone, matConeFill); coneFill.position.copy(cone.position); coneFill.rotation.x = PI; grp.add(coneFill);
  const gSat = new THREE.OctahedronGeometry(90); disposables.push(gSat); const matSat = mk(0xe6fffb, 0.95); const sat = new THREE.Mesh(gSat, matSat); sat.position.set(pt.x, SAT_Y, pt.z); grp.add(sat);
  const matCurt = mk(0x4de8d4, 0.22), gCurt = new THREE.PlaneGeometry(R * 2, 1100); disposables.push(gCurt);
  const curtain = new THREE.Mesh(gCurt, matCurt); curtain.position.set(pt.x, 550, pt.z - R); grp.add(curtain);
  const gLine = new THREE.PlaneGeometry(R * 2, 110); gLine.rotateX(-PI / 2); disposables.push(gLine);
  const matLine = mk(0xaffff1, 0.65), line = new THREE.Mesh(gLine, matLine); line.position.set(pt.x, 5, pt.z - R); grp.add(line);
  const gCore = new THREE.CylinderGeometry(16, 16, SAT_Y, 10, 1, true), gHalo = new THREE.CylinderGeometry(60, 110, SAT_Y, 16, 1, true), gTr = new THREE.RingGeometry(150, 200, 40); gTr.rotateX(-PI / 2); disposables.push(gCore, gHalo, gTr);
  const matCore = mk(0xe6fffb, 0.7), matBeam = mk(0x4de8d4, 0.22);
  const beams = (ships || []).map((ship) => { const core = new THREE.Mesh(gCore, matCore), beam = new THREE.Mesh(gHalo, matBeam), tr = new THREE.Mesh(gTr, matLine); grp.add(core, beam, tr); return { ship, core, beam, tr }; });
  scene.add(grp);
  C.isr3d = { grp, center: pt.clone(), scanT: 0, dur: 5.5, life: 30, rings, tick, matTick, cone, coneFill, matCone, matConeFill, sat, matSat, curtain, line, beams, matCurt, matLine, matBeam, matCore, disposables, R, SAT_Y };
}
function updateIsr3d(dt) {
  for (const e of G.enemies) if (e.isrBoostT > 0) e.isrBoostT = Math.max(0, e.isrBoostT - dt);
  const g = C.isr3d; if (!g) return;
  g.scanT += dt; g.life -= dt;
  const u = clamp(g.scanT / g.dur, 0, 1), sweepZ = g.center.z - g.R + 2 * g.R * u, cf = g.scanT < g.dur ? Math.sin(u * PI) : 0;
  g.curtain.position.z = sweepZ; g.line.position.z = sweepZ;
  g.matCurt.opacity = 0.24 * cf; g.matLine.opacity = 0.72 * cf + 0.25;
  g.curtain.visible = g.line.visible = g.scanT < g.dur;
  const fade = clamp(g.life / 4, 0, 1), grow = clamp(g.scanT / 1.6, 0, 1);
  for (const r of g.rings) { const ph = (G.time * 0.6 + r.f) % 1; r.mesh.scale.setScalar(grow * (0.96 + 0.04 * Math.sin(G.time * 2 + r.f * 6))); r.mat.opacity = fade * (0.32 + 0.3 * (1 - ph)); }
  g.tick.rotation.y += dt * 0.25; g.tick.scale.setScalar(grow); g.matTick.opacity = 0.5 * fade;
  const coneOn = clamp(1 - Math.max(0, g.scanT - 8) / 6, 0.25, 1) * fade; g.matCone.opacity = 0.3 * coneOn; g.matConeFill.opacity = 0.06 * coneOn * (0.7 + 0.3 * Math.sin(G.time * 3));
  g.sat.rotation.y += dt * 1.4; g.matSat.opacity = 0.95 * fade;
  g.matBeam.opacity = 0.24 * fade * (0.8 + 0.2 * Math.sin(G.time * 6)); g.matCore.opacity = 0.75 * fade * (0.85 + 0.15 * Math.sin(G.time * 9));
  for (const b of g.beams) {
    const on = b.ship.alive && (b.ship.isrBoostT || 0) > 0 && g.life > 0;
    b.core.visible = b.beam.visible = b.tr.visible = on;
    if (on) { const h = g.SAT_Y / 2; b.core.position.set(b.ship.pos.x, h, b.ship.pos.z); b.beam.position.set(b.ship.pos.x, h, b.ship.pos.z); b.tr.position.set(b.ship.pos.x, 4, b.ship.pos.z); b.tr.rotation.y += dt; }
  }
  if (g.life <= 0) clearIsr3d();
}
function triggerFeed(kind, target, dur, title) {
  if (!C.feedCam) C.feedCam = new THREE.PerspectiveCamera(40, 236 / 128, 4, 90000);
  C.feed = { kind, target, endT: G.battleT + Math.max(dur, 12), t0: G.battleT, title }; /* at least 12 s so the hit or the ramp drop is not missed */
  const tEl = document.getElementById("cicFeedTitle"); if (tEl) tEl.textContent = title;
  if (C.on && C.mode !== "big" && !document.body.classList.contains("jetfly")) document.body.classList.add("cicfeed-on");
}
function updateFeed(dt) {
  if (C.on && C.mode !== "big" && (C.feed || C.tots.length)) { /* terminal cut-in: a friendly anti-ship missile within 3 km of its target */
    const m = M.list.find((x) => x.alive && x.side === "us" && x.W.role === "asm" && !x.cutDone && x.target?.pos && x.pos.distanceTo(x.target.pos) < 3000);
    if (m && !(C.feed?.kind === "msl" && C.feed.term && C.feed.target?.alive)) { m.cutDone = true; triggerFeed("msl", m, 7, `종말 돌입 · ${m.W.name} → ${m.target.name || "표적"}`); C.feed.term = true; } }
  const f = C.feed;
  if (!f || !C.on || C.mode === "big" || G.battleT > f.endT || document.body.classList.contains("jetfly")) {
    document.body.classList.remove("cicfeed-on"); return;
  }
  document.body.classList.add("cicfeed-on");
  if ((f.kind === "jet" || f.kind === "msl") && f.target && !f.target.alive) {
    const repl = f.kind === "jet" ? M.jets.find((x) => x.alive && x.side === "us" && x.support) : M.list.find((m) => m.alive && m.side === "us" && m.W.role === "asm");
    if (repl) f.target = repl;
  }
  if (f.target?.heavy && f.target.alive && f.target.asm > 0) f.endT = Math.max(f.endT, G.battleT + 3); /* keep the C-130 on screen until its ramp drop is done */
  else if (f.target?.heavy && !f.heavyDone) { f.heavyDone = true; const m = M.list.find((x) => x.alive && x.owner === f.target); if (m) { triggerFeed("msl", m, 14, `램프 투하탄 추적 · ${m.W.name}`); return; } } /* after the drop, ride one of its missiles in */
  const chT = C.feedCh === 2 ? bigFeedTargets()[1] : null; /* CAM 2: the target instead of the asset */
  const cam = C.feedCam, t = chT || f.target, age = G.battleT - f.t0, rem = Math.max(0, Math.ceil(f.endT - G.battleT));
  let subL = "EO/IR FLIR", subR = `T-${rem}s`;
  if (t && t.pos && t.vel && (t.isJet || t.W)) {
    const dir = t.vel.lengthSq() > 1 ? t.vel.clone().normalize() : new THREE.Vector3(1, 0, 0);
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    const back = t.heavy ? 64 : t.isJet ? 34 : 20, up = t.heavy ? 18 : t.isJet ? 10 : 5, lat = t.heavy ? 22 : t.isJet ? 11 : 7;
    const desired = t.pos.clone().addScaledVector(dir, -back).addScaledVector(side, lat).add(new THREE.Vector3(0, up, 0));
    desired.y = Math.max(desired.y, 12);
    cam.position.lerp(desired, Math.min(1, dt * 8));
    cam.lookAt(t.pos.clone().addScaledVector(dir, t.isJet ? 45 : 70));
    const spd = Math.round(t.vel.length() * 3.6);
    subL = `${Math.round(t.pos.y)}m · ${spd}km/h`; subR = `TRACKING · ${rem}s`;
  } else {
    const base = t?.pos ? t.pos : t;
    if (base) {
      const a = age * 0.45, R = 360;
      cam.position.set(base.x + Math.cos(a) * R, 128, base.z + Math.sin(a) * R);
      cam.lookAt(base.x, 10, base.z);
      subL = t?.name ? t.name : "TARGET SECTOR";
    }
  }
  const sEl = document.getElementById("cicFeedSub");
  const sig = `${subL}|${subR}`;
  if (sEl && sig !== C.feedSig) { C.feedSig = sig; sEl.innerHTML = `<span>${subL}</span><span>${subR}</span>`; }
}
function assets() {
  const n = C.deps.nat, A = AIR[n] || AIR.us, out = [];
  out.push({ id: "fighter", t: `공군 전투기 편대 (CAP+타격) · ${A.fighter.type}`, d: `지정 해역 반경 11km 90초 방공우산(적기·미사일 요격) 및 ${WPN[A.fighter.asm]?.name || A.fighter.asm} 공대함 타격`, ok: true });
  out.push({ id: "heavy", t: `공군 대형수송기 · ${A.heavy.type}`, d: `안전 공역 진입 후 후방 램프에서 ${WPN[A.heavy.asm]?.name || A.heavy.asm} ${A.heavy.n}발 원거리 포화 투하`, ok: true });
  out.push(C.battery ? { id: "battery", t: `${C.battery.name} · 우회 기습`, d: `해안 발사 후 측후방 우회 경로로 ${WPN[C.battery.key]?.name || C.battery.key} 4발 기습 침투 · 사거리 ${(WPN[C.battery.key].range / 1000) | 0}km`, ok: true } : { id: "battery", t: "지대함 포대", d: "이 전장·국가에선 지원 불가 (한반도=해성 · 오키나와=12식 · 미 서부=NMESIS)", ok: false });
  out.push({ id: "recon", t: "위성 · 합동 ISR 레이저 스캔", d: "11km 해역 3D 정찰 스캔 + Link-16 표적 빔 30초 연동 (적 함정 실시간 미사일 유도)", ok: true });
  out.push({ id: "tot", t: "TOT · 함대 합동 동시탄착 사격", d: "기함·아군 구축함 대함미사일 발사 시차를 자동 계산해 모든 미사일이 같은 시각 표적에 동시 포화 돌입", ok: true });
  return out;
}
function watchSupport(id) {
  if (id === "heavy" || id === "fighter") {
    const j = M.jets.find((x) => x.alive && x.side === "us" && (id === "heavy" ? x.heavy : (x.support && !x.heavy)));
    if (!j) { sfx.deny(); return; }
    if (C.mode === "big") setMode("pip");
    C.deps.watchJet?.(j);
  } else if (id === "battery" && C.battery) {
    const m = M.list.find((x) => x.alive && x.side === "us" && x.owner?.name === C.battery.name);
    if (!m) { sfx.deny(); return; }
    if (C.mode === "big") setMode("pip");
    C.deps.watchMsl?.(m);
  }
}
function request(id) {
  const a = assets().find((x) => x.id === id); if (!a || !a.ok) { sfx.deny(); say("해당 지원은 이 전장에서 쓸 수 없습니다."); return; }
  if (!(C.uses[id] > 0)) { sfx.deny(); say("해당 지원은 이번 전투에서 모두 썼습니다."); return; }
  if ((C.cd[id] || 0) > G.battleT) { sfx.deny(); say(`재요청까지 ${Math.ceil(C.cd[id] - G.battleT)}초 대기.`); return; }
  const pt = C.deps.md.supPt; if (!pt) { sfx.deny(); say("먼저 상황판이나 표적 목록에서 지점을 지정하십시오."); return; }
  if (id === "battery" && Math.hypot(pt.x - C.battery.pos.x, pt.z - C.battery.pos.z) > WPN[C.battery.key].range) { sfx.deny(); say("지정 지점이 해안 포대 최대 사거리 밖입니다."); return; }
  if (id === "tot") {
    const shooters = G.ships.filter((s) => s.alive && s.side === "us" && s.spec?.modern && s.spec.vls?.A?.[0] && (s.mag[s.spec.vls.A[0]] || 0) > 0 && Math.hypot(pt.x - s.pos.x, pt.z - s.pos.z) <= WPN[s.spec.vls.A[0]].range * 0.98);
    if (!shooters.length) { sfx.deny(); say("TOT 사거리 내에 대함미사일 잔탄이 남은 아군 함정이 없습니다."); return; }
  }
  C.pend = { id, a, pt: { ...pt } }; sfx.ready?.();
  const snap = nearestSnap(pt.x, pt.z, 2600);
  say(`${a.t} → ${snap ? `[${snap.name}] 부근` : "지정 해역"} 투입 준비 완료. 승인 바랍니다. (Y 승인 · N 보류)`);
}
export function cicResolve(ok) { resolve(ok); }
function resolve(ok) {
  const p = C.pend; if (!p) return; C.pend = null; C.sig = "";
  if (!ok) { sfx.click(); say("작전 보류. 다른 좌표를 지정하거나 지원 수단을 선택하십시오."); return; }
  C.uses[p.id]--; C.used = (C.used || 0) + 1; C.cd[p.id] = G.battleT + CD_SEC[p.id]; C.deps.radio?.("launch");
  const pt = new THREE.Vector3(p.pt.x, 0, p.pt.z), P = G.player, A = AIR[C.deps.nat] || AIR.us;
  if (p.id === "fighter" || p.id === "heavy") {
    const back = P.pos.clone().sub(pt).setY(0).normalize(), base = P.pos.clone().addScaledVector(back, p.id === "heavy" ? 7500 : 11000).setY(p.id === "heavy" ? 750 : 450);
    const n = p.id === "heavy" ? 1 : 2; let leadJet = null;
    for (let i = 0; i < n; i++) { const cv = p.id === "heavy" ? { type: A.heavy.type, asm: A.heavy.asm, aam: "AIM-120" } : { type: A.fighter.type, asm: A.fighter.asm, aam: A.fighter.aam };
      const src = { side: "us", pos: base.clone().add(new THREE.Vector3(i * 300, 0, i * 300)), heading: Math.atan2(pt.z - base.z, pt.x - base.x), spec: { fb: 0 }, alive: true, cv, fwd: back.clone().negate(), name: "공군" };
      const j = launchJet(src, "strike", cv, src.pos, p.id === "heavy"); j.pos.copy(src.pos); j.aimPt = pt.clone(); j.support = true;
      if (p.id === "heavy") { j.asm = A.heavy.n; j.aam = 0; j.heavy = true; j.endur = 400; }
      else { j.asm = 2; j.aam = 10; j.capZone = pt.clone(); j.capDur = 90; j.endur = 420; }
      if (!leadJet) leadJet = j;
    }
    if (p.id === "fighter") C.capZones.push({ x: pt.x, z: pt.z, endT: G.battleT + 90, label: A.fighter.type });
    if (leadJet) triggerFeed("jet", leadJet, 6.5, p.id === "heavy" ? "EO/IR · C-130H 수송작전기" : "EO/IR · 공군 CAP 편대");
    C.pulses.push({ x: pt.x, z: pt.z, t: 0, dur: 4, maxR: 6000, col: p.id === "heavy" ? "#f2b544" : "#4de8d4" });
    say(p.id === "heavy" ? `${A.heavy.type} 출격 확인 — 램프 투하 ${WPN[A.heavy.asm]?.name || A.heavy.asm} ${A.heavy.n}발 발사 예정. 우상단 LIVE EO/IR 영상 송출 중.` : `${A.fighter.type} 2기 출격 — 90초간 11km 방공우산(CAP) 및 공대함 타격 개시!`);
    C.deps.log(`합동 지원 승인 — ${p.a.t}`, "hit");
  } else if (p.id === "battery") {
    const b = C.battery, T = C.deps.know("us").sort((x, y) => x.pos.distanceToSquared(pt) - y.pos.distanceToSquared(pt))[0];
    const dirToTgt = pt.clone().sub(b.pos).setY(0).normalize(), perp = new THREE.Vector3(-dirToTgt.z, 0, dirToTgt.x);
    const mid = b.pos.clone().lerp(pt, 0.52), flankSign = rnd() < 0.5 ? 1 : -1, flankPt = mid.addScaledVector(perp, flankSign * 5800);
    for (let i = 0; i < 4; i++) setTimeout(() => { if (G.state !== "playing") return; const src = { isJet: true, side: "us", pos: b.pos.clone().setY(b.pos.y + 25), vel: flankPt.clone().sub(b.pos).setY(0).normalize().multiplyScalar(150).setY(90), alive: true, spec: { fb: 0 }, name: b.name };
      const m = launch(src, b.key, T && T.pos.distanceTo(pt) < 5000 ? T.ship : null);
      if (m) { m.flankPt = flankPt.clone(); if (!(T && T.pos.distanceTo(pt) < 5000)) m.est = pt.clone(); if (i === 0) triggerFeed("msl", m, 6.5, "EO/IR · 지대함 측후방 우회"); }
      flash.spawn({ x: b.pos.x, y: b.pos.y + 18, z: b.pos.z, life: 0.45, s0: 14, s1: 38, a: 0.95, c: 0xffb858 });
      rings.spawn({ x: b.pos.x, z: b.pos.z, w0: 8, l0: 8, w1: 95, l1: 95, life: 1.5, a: 0.55, c: 0xffb858 });
      for (let k = 0; k < 6; k++) smoke.spawn({ x: b.pos.x + gauss() * 8, y: b.pos.y + 12 + rnd() * 14, z: b.pos.z + gauss() * 8, vx: gauss() * 10, vy: 8 + rnd() * 14, vz: gauss() * 10, life: 4.2, s0: 9, s1: 28, a: 0.55, c: 0xdcdcdc });
      for (let k = 0; k < 12; k++) spark.spawn({ x: b.pos.x + gauss() * 4, y: b.pos.y + 16, z: b.pos.z + gauss() * 4, vx: gauss() * 24, vy: 12 + rnd() * 26, vz: gauss() * 24, g: 9.8, life: 0.9, s0: 2.2, s1: 0.6, a: 1, c: 0xffc060 });
      const bd = Math.hypot(b.pos.x - camera.position.x, b.pos.z - camera.position.z);
      sfx.mslLaunch?.(Math.max(120, bd), false);
      C.pulses.push({ x: b.pos.x, z: b.pos.z, t: 0, dur: 1.8, maxR: 2600, col: "#ff8c52" });
    }, 400 + i * 900);
    C.pulses.push({ x: flankPt.x, z: flankPt.z, t: 0, dur: 4.5, maxR: 3500, col: "#ff8c52" });
    C.pulses.push({ x: pt.x, z: pt.z, t: 0, dur: 4.5, maxR: 5000, col: "#ff8c52" });
    say(`${b.name} 4발 측후방 우회 기습 발사! 본함·교란과 반대 방위로 돌입합니다.`); C.deps.log(`${b.name} 4발 우회 발사`, "hit");
  } else if (p.id === "recon") {
    const revealed = [];
    for (const e of G.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.pos.x - pt.x, e.pos.z - pt.z) <= 11000) {
        e.revealT = Math.max(e.revealT || 0, 30); e.isrBoostT = Math.max(e.isrBoostT || 0, 30); e.root.visible = true;
        G.cts?.set(e, { q: 1, x: e.pos.x, z: e.pos.z, err: 25, src: "위성·ISR", h: e.heading });
        revealed.push(e);
      }
    }
    if (!revealed.length) {
      const near = G.enemies.filter((e) => e.alive).map((e) => ({ e, d: Math.hypot(e.pos.x - pt.x, e.pos.z - pt.z) })).sort((a, b) => a.d - b.d)[0];
      if (near && near.d <= 20000) {
        const e = near.e; e.revealT = Math.max(e.revealT || 0, 28); e.isrBoostT = Math.max(e.isrBoostT || 0, 28); e.root.visible = true;
        G.cts?.set(e, { q: 1, x: e.pos.x, z: e.pos.z, err: 35, src: "위성·ISR", h: e.heading });
        revealed.push(e);
      }
    }
    spawnIsr3d(pt, revealed);
    triggerFeed("recon", revealed[0] || { pos: pt }, 6.0, "SAT-ISR · 레이저 스캔 연동");
    C.pulses.push({ x: pt.x, z: pt.z, t: 0, dur: 5.5, maxR: 11000, col: "#4de8d4" });
    rings.spawn({ x: pt.x, z: pt.z, w0: 30, l0: 30, w1: 900, l1: 900, life: 2.5, a: 0.65, c: 0x4de8d4 });
    flash.spawn({ x: pt.x, y: 80, z: pt.z, life: 0.7, s0: 35, s1: 120, a: 0.55, c: 0x4de8d4 });
    sfx.ready?.();
    say(revealed.length ? `위성 레이저 스캔 완료 — 적함 ${revealed.length}척 3D Link-16 표적 빔 30초 연동!` : "위성 ISR 스캔 완료 — 반경 11 km 내 적 수상함 미탐지.");
    C.deps.log(`합동 위성·ISR 3D 스캔 (${revealed.length}척 식별)`, "hit");
  } else if (p.id === "tot") {
    const knows = C.deps.know("us").sort((x, y) => x.pos.distanceToSquared(pt) - y.pos.distanceToSquared(pt));
    const snapKnow = knows.find((c) => c.pos.distanceTo(pt) < 4200);
    const tgtShip = snapKnow ? snapKnow.ship : null;
    const shooters = G.ships.filter((s) => s.alive && s.side === "us" && s.spec?.modern && s.spec.vls?.A?.[0] && (s.mag[s.spec.vls.A[0]] || 0) > 0 && Math.hypot(pt.x - s.pos.x, pt.z - s.pos.z) <= WPN[s.spec.vls.A[0]].range * 0.98).slice(0, 3);
    if (!shooters.length) { say("TOT 사격 가용 함정 없음."); return; }
    const plan = shooters.map((S) => {
      const k = S.spec.vls.A[0], v = WPN[k].v || 260, d = Math.hypot(pt.x - S.pos.x, pt.z - S.pos.z);
      return { S, k, v, d, ft: d / v, n: Math.min(2, S.mag[k]) };
    });
    const maxT = Math.max(...plan.map((x) => x.ft)) + 0.8;
    let totalMsl = 0; const rays = [];
    for (const item of plan) {
      const delay = Math.max(0, maxT - item.ft);
      for (let i = 0; i < item.n; i++) {
        C.deps.md.q.push({ t: delay + i * 0.45, S: item.S, k: item.k, T: tgtShip, est: tgtShip ? null : pt.clone() });
        totalMsl++;
      }
      item.S.mag[item.k] -= item.n;
      rays.push({ S: item.S, fireAt: G.battleT + delay });
    }
    C.tots.push({ pt: pt.clone(), name: tgtShip?.name || "지정 해역", target: tgtShip, endAt: G.battleT + maxT, rays, n: totalMsl });
    triggerFeed("tot", tgtShip || { pos: pt }, Math.min(7.5, maxT), `TOT · ${totalMsl}발 동시탄착`);
    C.pulses.push({ x: pt.x, z: pt.z, t: 0, dur: 5, maxR: 4800, col: "#4de8d4" });
    sfx.ready?.();
    say(`TOT 동시탄착 명령 — ${shooters.length}척(${totalMsl}발) 발사 시차 연동, T-${Math.ceil(maxT)}초 후 동시 포화 돌입!`);
    C.deps.log(`TOT 동시탄착 (${shooters.length}척 · ${totalMsl}발 · ETA ${Math.ceil(maxT)}s)`, "hit");
  }
}
function mapWorld(e) {
  const r = C.map.getBoundingClientRect(), u = ((e.clientX - r.left) / r.width) * C.map.width, v = ((e.clientY - r.top) / r.height) * C.map.height;
  const P = G.player; if (!P || !C.map.width || !C.map.height) return null;
  const R = 30000 / C.zoom, sc = Math.min(C.map.width, C.map.height) / 2 / R;
  return { x: P.pos.x - (v - C.map.height / 2) / sc, z: P.pos.z + (u - C.map.width / 2) / sc };
}
function nearestSnap(x, z, maxD) {
  let best = null, bd = maxD;
  for (const s of G.enemies) {
    if (!s.alive) continue;
    const c = G.cts?.get(s); if (!c) continue;
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < bd) { bd = d; best = { name: s.name, x: c.x, z: c.z }; }
  }
  for (const k of C.lastMarks || []) {
    if (k.kind !== "ground" && k.kind !== "sub") continue;
    const d = Math.hypot(k.pos.x - x, k.pos.z - z);
    if (d < bd) { bd = d; best = { name: k.label, x: k.pos.x, z: k.pos.z }; }
  }
  return best;
}
function mapPick(e) {
  const p = mapWorld(e), P = G.player; if (!p || !P) return null;
  const snap = nearestSnap(p.x, p.z, 2200 / C.zoom);
  const tx = snap ? snap.x : p.x, tz = snap ? snap.z : p.z;
  return { x: tx, z: tz, snap: snap?.name, km: (Math.hypot(tx - P.pos.x, tz - P.pos.z) / 1000).toFixed(1), brg: brg(Math.atan2(tz - P.pos.z, tx - P.pos.x)) };
}
function updateTele(P, incoming, airborneJets, etaSec = 0) {
  const tSec = Math.max(0, G.battleT | 0), mm = String((tSec / 60) | 0).padStart(2, "0"), ss = String(tSec % 60).padStart(2, "0");
  const cts = G.cts ? G.cts.size : 0, emcon = P.radarOn === false;
  const pt = C.deps.md.supPt, ptTxt = pt ? `${(Math.hypot(pt.x - P.pos.x, pt.z - P.pos.z) / 1000).toFixed(1)}km` : "미지정";
  const sig = `${mm}:${ss}|${emcon}|${cts}|${incoming}|${etaSec}|${airborneJets}|${ptTxt}|${C.zoom.toFixed(1)}|${C.wcs}`;
  if (sig === C.tSig) return; C.tSig = sig;
  const el = $(".cic-tele"); if (!el) return;
  const thTxt = incoming ? `<i>▲${incoming}${etaSec > 0 ? ` (${etaSec}s)` : ""}</i>` : "0";
  const wBtn = (k, lbl) => `<button type="button" class="wcs-b${C.wcs === k ? " on" : ""}" data-wcs="${k}">${lbl}</button>`;
  el.innerHTML = `<span>T+<b>${mm}:${ss}</b></span><span>표적 <b>${cts}</b></span><span>위협 ${thTxt}</span><span>편대 <b>${airborneJets}</b></span><span>방공 <span class="wcs-grp">${wBtn("auto", "FREE")}${wBtn("tight", "TIGHT")}${wBtn("hold", "HOLD")}</span></span>`;
}
function updateTracks(P, marks) {
  const rows = []; let tn = 1;
  if (G.cts) {
    const entries = [...G.cts.entries()].filter(([e]) => e.alive).sort((a, b) => (b[1].q - a[1].q) || (Math.hypot(a[1].x - P.pos.x, a[1].z - P.pos.z) - Math.hypot(b[1].x - P.pos.x, b[1].z - P.pos.z)));
    for (const [e, ct] of entries) {
      const d = Math.hypot(ct.x - P.pos.x, ct.z - P.pos.z), b = brg(Math.atan2(ct.z - P.pos.z, ct.x - P.pos.x));
      const hp = ct.q >= 0.6 ? `${Math.round((e.hp / e.maxHp) * 100)}%` : `±${(ct.err / 1000).toFixed(1)}k`;
      rows.push({ tn: `T${String(tn++).padStart(2, "0")}`, name: e.name, src: `${ct.src || "레이더"} · ${hp}`, km: (d / 1000).toFixed(1), brg: b, x: ct.x, z: ct.z, esm: ct.q < 0.6 });
    }
  }
  for (const k of marks || []) {
    if (k.kind !== "ground" && k.kind !== "sub") continue;
    const d = Math.hypot(k.pos.x - P.pos.x, k.pos.z - P.pos.z), b = brg(Math.atan2(k.pos.z - P.pos.z, k.pos.x - P.pos.x));
    const isSub = k.kind === "sub";
    rows.push({ tn: `${isSub ? "S" : "G"}${String(tn++).padStart(2, "0")}`, name: k.label, src: isSub ? `대잠 ±${((k.r || 300) / 1000).toFixed(1)}k` : (k.hp > 0 ? `지상 ${Math.round(k.hp * 100)}%` : "지상 목표"), km: (d / 1000).toFixed(1), brg: b, x: k.pos.x, z: k.pos.z, esm: isSub });
  }
  C.trkList = rows;
  const pt = C.deps.md.supPt;
  const sig = JSON.stringify(rows.map((r) => [r.tn, r.name, r.src, r.km, r.brg])) + (pt ? `${pt.x | 0},${pt.z | 0}` : "");
  if (sig === C.lSig) return; C.lSig = sig;
  const box = $(".cic-tracks"); if (!box) return;
  if (!rows.length) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="trk-h"><span>KNTDS 접촉 표적 (${rows.length})</span><span>클릭 시 타격 지점 지정</span></div>`
    + rows.map((r, i) => {
      const sel = pt && Math.hypot(pt.x - r.x, pt.z - r.z) < 600;
      return `<button type="button" class="trk${r.esm ? " esm" : ""}${sel ? " on" : ""}" data-trk="${i}"><span class="tn">${r.tn}</span><span class="nm">${r.name}</span><span class="src">${r.src} · ${r.km}km ${r.brg}</span><span class="des">${sel ? "지정됨" : "지정"}</span></button>`;
    }).join("");
}
export function cicStep(dt, marks) {
  if (!C.on || !C.el) return; const P = G.player; if (!P) return;
  C.lastMarks = marks || [];
  updateIsr3d(dt);
  updateFeed(dt);
  updateBigFeeds(dt);
  for (let i = C.capZones.length - 1; i >= 0; i--) if (G.battleT > C.capZones[i].endT) C.capZones.splice(i, 1);
  for (let i = C.tots.length - 1; i >= 0; i--) if (G.battleT > C.tots[i].endAt + 2) C.tots.splice(i, 1);
  if (C.battery?.mesh?.userData?.dish) {
    C.battery.mesh.userData.dish.rotation.y += dt * 1.9;
    if (C.battery.mesh.userData.beacon) C.battery.mesh.userData.beacon.visible = Math.floor(G.time * 2) % 2 === 0;
  }
  for (let i = C.pulses.length - 1; i >= 0; i--) { C.pulses[i].t += dt; if (C.pulses[i].t >= C.pulses[i].dur) C.pulses.splice(i, 1); }
  C.talkT -= dt; if (C.talkT <= 0) C.el.classList.remove("talk");
  const incList = M.list.filter((m) => m.alive && m.side === "foe" && m.W.role === "asm" && m.target?.side === "us" && m.pos.distanceTo(m.target.pos) < 9500);
  const incoming = incList.length;
  const etaSec = incoming ? Math.max(1, Math.round(Math.min(...incList.map((m) => m.pos.distanceTo(m.target.pos) / Math.max(1, m.vel.length()))))) : 0;
  C.el.classList.toggle("alert", incoming > 0);
  C.warnT = Math.max(0, C.warnT - dt);
  if (incoming > 0 && C.warnT <= 0 && !C.pend && C.talkT <= 0) { C.warnT = 15; say(`경보 — 적 대함·유도탄 ${incoming}발 근접 중 (${Math.min(...incList.map((m) => m.pos.distanceTo(m.target.pos) / 1000)).toFixed(1)} km · ${etaSec}초)! 상황판 적색 미사일 클릭 시 우선 요격.`); }
  const airborneJets = M.jets.filter((j) => j.alive && j.side === "us").length;
  updateTele(P, incoming, airborneJets, etaSec);
  updateTracks(P, marks);
  const pt = C.deps.md.supPt;
  const actHeavy = M.jets.find((j) => j.alive && j.side === "us" && j.heavy);
  const actFighter = M.jets.find((j) => j.alive && j.side === "us" && j.support && !j.heavy);
  const actBatMsl = C.battery ? M.list.filter((m) => m.alive && m.side === "us" && m.owner?.name === C.battery.name) : [];
  const actTot = C.tots[0];
  const cards = assets().filter((a) => a.ok).map((a) => { /* supports this theatre can't use stay off the list */
    const cd = Math.max(0, Math.ceil((C.cd[a.id] || 0) - G.battleT)), maxCd = CD_SEC[a.id] || 60, u = C.uses[a.id] ?? 0, maxU = MAX_USES[a.id] || 1;
    const pips = a.ok ? `<span class="pips">${"●".repeat(u)}${"○".repeat(Math.max(0, maxU - u))}</span>` : "";
    let eta = "";
    if (pt && a.ok && u > 0) {
      if (a.id === "battery" && C.battery) {
        const bd = Math.hypot(pt.x - C.battery.pos.x, pt.z - C.battery.pos.z), br = WPN[C.battery.key].range;
        eta = bd <= br ? ` · <span class="eta">포대 ${(bd / 1000).toFixed(1)}km · 우회 돌입</span>` : ` · <span style="color:#ff8a7a">사거리 밖(${(bd / 1000).toFixed(1)}km)</span>`;
      } else if (a.id === "recon") {
        eta = ` · <span class="eta">기함 ${(Math.hypot(pt.x - P.pos.x, pt.z - P.pos.z) / 1000).toFixed(1)}km · 레이저 스캔</span>`;
      } else if (a.id === "tot") {
        const readyShips = G.ships.filter((s) => s.alive && s.side === "us" && s.spec?.modern && s.spec.vls?.A?.[0] && (s.mag[s.spec.vls.A[0]] || 0) > 0 && Math.hypot(pt.x - s.pos.x, pt.z - s.pos.z) <= WPN[s.spec.vls.A[0]].range * 0.98).length;
        eta = readyShips ? ` · <span class="eta">${readyShips}척 동시타격 가용</span>` : ` · <span style="color:#ff8a7a">사거리 내 가용 함정 없음</span>`;
      } else {
        const A = AIR[C.deps.nat] || AIR.us;
        eta = ` · <span class="eta">지정점 ${(Math.hypot(pt.x - P.pos.x, pt.z - P.pos.z) / 1000).toFixed(1)}km · ${a.id === "heavy" ? `${A.heavy.n}발 포화` : `CAP 90s`}</span>`;
      }
    }
    let liveHtml = "";
    if ((a.id === "heavy" && actHeavy) || (a.id === "fighter" && actFighter)) {
      const j = a.id === "heavy" ? actHeavy : actFighter, ref = j.capZone || j.aimPt || P.pos, dKm = (Math.hypot(ref.x - j.pos.x, ref.z - j.pos.z) / 1000).toFixed(1);
      const capRem = j.capZone ? Math.max(0, Math.ceil((j.capDur || 90) - j.t)) : 0;
      const actTxt = a.id === "fighter" && !j.home && j.capZone ? `▶ CAP 방공우산 (${capRem}s · AAM ${j.aam} · ASM ${j.asm})` : j.asm > 0 && !j.home ? `▶ 작전 중: 목표 접근 (${dKm}km · ${j.asm}발 대기)` : `▶ 발사 완료 · 기지 복귀 중`;
      const watching = C.deps.isWatching?.(j);
      liveHtml = `<div class="sup-act"><span>${actTxt}</span><span class="sup-watch" data-watch="${a.id}">${watching ? "🎥 본함 복귀" : "🎥 시점 보기"}</span></div>`;
    } else if (a.id === "battery" && actBatMsl.length) {
      liveHtml = `<div class="sup-act"><span>▶ 작전 중: 지대함 ${actBatMsl.length}발 측후방 우회 침투</span><span class="sup-watch" data-watch="battery">🎥 미사일 시점</span></div>`;
    } else if (a.id === "tot" && actTot) {
      liveHtml = `<div class="sup-act"><span>▶ TOT [${actTot.name}] · 동시 탄착 T-${Math.max(0, Math.ceil(actTot.endAt - G.battleT))}s (${actTot.n}발)</span></div>`;
    }
    const st = !a.ok ? "불가" : u <= 0 ? "소진" : cd ? `${cd}s` : `${u}회`;
    const pct = cd > 0 ? clamp(1 - cd / maxCd, 0, 1) * 100 : 0;
    return `<button class="sup${a.id === "tot" ? " tot" : ""}${a.ok && u > 0 && !cd ? "" : " off"}${C.pend?.id === a.id ? " pend" : ""}" data-sup="${a.id}"><b>${a.t}${pips}</b><small>${a.d}${eta}</small>${liveHtml}<i>${st}</i>${cd > 0 ? `<span class="cdbar"><span style="width:${pct.toFixed(1)}%"></span></span>` : ""}</button>`;
  }).join("");
  const snap = pt ? nearestSnap(pt.x, pt.z, 2600) : null;
  const ptDesc = pt ? `${snap ? snap.name : "해역"} (${(Math.hypot(pt.x - P.pos.x, pt.z - P.pos.z) / 1000).toFixed(1)} km · ${brg(Math.atan2(pt.z - P.pos.z, pt.x - P.pos.x))})` : "";
  const ask = C.pend ? `<div class="q">승인 대기: ${C.pend.a.t} → ${ptDesc}</div><button data-ok="1">Y 승인</button><button data-ok="0">N 보류</button>` : pt ? `<div class="q m">지점: ${ptDesc} — 지원 수단 선택</div>` : "";
  const sig = cards + ask; if (sig !== C.sig) { C.sig = sig; $(".cic-cards").innerHTML = cards; $(".cic-ask").innerHTML = ask; }
  if (C.mode === "pip" || C.mode === "big") drawMap(marks);
}
function drawMap(marks) {
  const cv = C.map, W = cv.clientWidth | 0, H = cv.clientHeight | 0; if (!W || !H) return; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const x = cv.getContext("2d"), P = G.player, R = 30000 / C.zoom, sc = Math.min(W, H) / 2 / R, cx = W / 2, cy = H / 2, big = C.mode === "big";
  const S = (p) => [cx + (p.z - P.pos.z) * sc, cy - (p.x - P.pos.x) * sc];
  // dark phosphor KNTDS backdrop
  x.fillStyle = "#061418"; x.fillRect(0, 0, W, H);
  // world-anchored 10km tactical grid
  x.strokeStyle = "rgba(52,135,124,.15)"; x.lineWidth = 1;
  const step = 10000, gx0 = Math.floor((P.pos.x - R * 2) / step) * step, gx1 = P.pos.x + R * 2, gz0 = Math.floor((P.pos.z - R * 2) / step) * step, gz1 = P.pos.z + R * 2;
  x.beginPath();
  for (let gx = gx0; gx <= gx1; gx += step) { const [, v] = S({ x: gx, z: P.pos.z }); x.moveTo(0, v); x.lineTo(W, v); }
  for (let gz = gz0; gz <= gz1; gz += step) { const [u] = S({ x: P.pos.x, z: gz }); x.moveTo(u, 0); x.lineTo(u, H); }
  x.stroke();
  // landmasses / islands
  x.fillStyle = "#193129"; x.strokeStyle = "#3a6e5b"; x.lineWidth = 1.2;
  for (const s of G.islands) {
    if (s.poly) { x.beginPath(); s.poly.forEach(([px, pz], i) => { const [u, v] = S({ x: px, z: pz }); i ? x.lineTo(u, v) : x.moveTo(u, v); }); x.closePath(); x.fill(); x.stroke(); }
    else if (s.r) { const [u, v] = S(s); x.beginPath(); x.arc(u, v, s.r * sc, 0, TAU); x.fill(); x.stroke(); }
  }
  // rotating radar sweep wedge centered on flagship
  const sw = (G.time * 1.15) % TAU, swR = Math.max(W, H) * 0.72;
  const gr = x.createRadialGradient(cx, cy, 4, cx, cy, swR);
  gr.addColorStop(0, "rgba(77,232,212,.16)"); gr.addColorStop(1, "rgba(77,232,212,.01)");
  x.fillStyle = gr; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, swR, sw - 0.34, sw); x.closePath(); x.fill();
  // range rings + compass ticks
  x.strokeStyle = "#1c4a46"; x.lineWidth = 1;
  for (const k of [10000, 20000, 40000]) { x.beginPath(); x.arc(cx, cy, k * sc, 0, TAU); x.stroke(); x.fillStyle = "#3d8279"; x.font = "10.5px 'Noto Sans KR', monospace"; x.fillText(`${k / 1000} km`, cx + 14, cy - k * sc - 3); }
  const outerR = 20000 * sc;
  if (big) {
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * PI) / 180, ix = cx + Math.sin(rad) * outerR, iy = cy - Math.cos(rad) * outerR;
      const ox = cx + Math.sin(rad) * (outerR + 6), oy = cy - Math.cos(rad) * (outerR + 6);
      x.strokeStyle = deg % 90 === 0 ? "#4ba397" : "#225a54"; x.beginPath(); x.moveTo(ix, iy); x.lineTo(ox, oy); x.stroke();
      if (deg % 90 === 0) { x.fillStyle = "#69bcae"; x.font = "bold 10.5px 'Special Elite', monospace"; x.fillText(["N", "E", "S", "W"][deg / 90], ox + (deg === 90 ? 5 : deg === 270 ? -12 : -4), oy + (deg === 180 ? 11 : -4)); }
    }
  }
  const labels = [];
  const placeLbl = (txt, lx, ly, col) => {
    let py = ly;
    for (let pass = 0; pass < 4; pass++) {
      const hit = labels.find((p) => Math.abs(p.x - lx) < 58 && Math.abs(p.y - py) < 12);
      if (!hit) break;
      py = hit.y + 12;
    }
    labels.push({ x: lx, y: py });
    x.fillStyle = "rgba(6,20,24,.72)"; x.fillRect(lx - 2, py - 9, x.measureText(txt).width + 4, 12);
    x.fillStyle = col; x.fillText(txt, lx, py);
  };
  // flagship ASM engagement ring
  const asmK = P.spec?.vls?.A?.[0];
  if (asmK && WPN[asmK]) {
    x.save(); x.strokeStyle = "rgba(77,232,212,.26)"; x.setLineDash([5, 5]); x.beginPath(); x.arc(cx, cy, WPN[asmK].range * sc, 0, TAU); x.stroke(); x.restore();
  }
  // expanding ISR / strike pulses
  for (const p of C.pulses) {
    const [u, v] = S(p), k = clamp(p.t / p.dur, 0, 1);
    x.save(); x.strokeStyle = p.col; x.globalAlpha = (1 - k) * 0.75; x.lineWidth = 2;
    x.beginPath(); x.arc(u, v, Math.max(8, p.maxR * k * sc), 0, TAU); x.stroke(); x.restore();
  }
  // ESM bearing lines & uncertainty ellipses
  if (G.cts) {
    for (const [s, ct] of G.cts.entries()) {
      if (!s.alive || ct.q >= 0.6) continue;
      const [u, v] = S(ct), [ou, ov] = S({ x: ct.ox ?? P.pos.x, z: ct.oz ?? P.pos.z });
      x.save(); x.strokeStyle = "rgba(242,181,68,.48)"; x.setLineDash([4, 4]); x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(ou, ov); x.lineTo(u, v); x.stroke();
      x.beginPath(); x.arc(u, v, Math.max(8, (ct.err || 2000) * sc), 0, TAU); x.stroke(); x.restore();
    }
  }
  x.font = big ? "bold 11.5px 'Noto Sans KR'" : "bold 10px 'Noto Sans KR'";
  for (const s of G.ships) {
    if (!s.alive) continue; const known = s.side === "us" || (G.cts && G.cts.get(s)); if (!known) continue;
    const ct = s.side === "us" ? null : G.cts.get(s), p = s.side === "us" ? s.pos : ct;
    const [u, v] = S(p), hd = s.side === "us" ? s.heading : (ct?.h ?? s.heading), vlen = Math.max(10, Math.min(24, (s.speed || 8) * 0.9));
    // velocity vector leader
    x.strokeStyle = s.side === "us" ? "rgba(77,232,212,.68)" : ct?.q < 0.6 ? "rgba(242,181,68,.55)" : "rgba(255,107,94,.72)";
    x.lineWidth = 1.4; x.beginPath(); x.moveTo(u, v); x.lineTo(u + Math.sin(hd) * vlen, v - Math.cos(hd) * vlen); x.stroke();
    x.fillStyle = s.side === "us" ? "#4de8d4" : ct?.q < 0.6 ? "#f2b544" : "#ff6b5e";
    x.beginPath();
    if (s.side === "us") {
      x.arc(u, v, s.isPlayer ? 5.5 : 4, 0, TAU); x.fill();
      if (s.isPlayer) { x.strokeStyle = "#b8fff4"; x.lineWidth = 1.4; x.beginPath(); x.arc(u, v, 9.5, 0, TAU); x.stroke(); }
    } else {
      x.moveTo(u, v - 6); x.lineTo(u + 6, v); x.lineTo(u, v + 6); x.lineTo(u - 6, v); x.closePath();
      if (ct?.q < 0.6) { x.strokeStyle = "#f2b544"; x.lineWidth = 1.6; x.stroke(); } else x.fill();
      if (s.hp < s.maxHp && ct?.q >= 0.6) {
        const w = 22; x.fillStyle = "rgba(0,0,0,.65)"; x.fillRect(u - w / 2, v + 8, w, 3);
        x.fillStyle = "#ff6b5e"; x.fillRect(u - w / 2, v + 8, w * clamp(s.hp / s.maxHp, 0, 1), 3);
      }
    }
    if (s.isPlayer || s.side === "foe") placeLbl(s.name || "", u + 9, v + 4, s.side === "us" ? "#b8fff4" : ct?.q < 0.6 ? "#ffd982" : "#ffaaa0");
  }
  for (const j of M.jets) {
    if (!j.alive) continue; const [u, v] = S(j.pos);
    if (j.support && j.aimPt && !j.rtb) {
      const [au, av] = S(j.aimPt); x.save(); x.strokeStyle = "rgba(242,181,68,.42)"; x.setLineDash([4, 4]); x.lineWidth = 1.1;
      x.beginPath(); x.moveTo(u, v); x.lineTo(au, av); x.stroke(); x.restore();
    }
    x.strokeStyle = j.side === "us" ? "#9ff3e5" : "#ff8a7a"; x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(u - 5, v + 4); x.lineTo(u, v - 5); x.lineTo(u + 5, v + 4); x.stroke();
    if (j.support || big) placeLbl(j.name.replace(" (가정)", ""), u + 7, v + 1, j.side === "us" ? "#a6f5e8" : "#ff9b8d");
  }
  for (const h of M.helos || []) {
    if (!h.alive) continue; const [u, v] = S(h.pos), col = h.side === "us" ? "#7cf5d4" : "#ff8a7a", ra = G.time * 8;
    x.strokeStyle = col; x.lineWidth = 1.4;
    x.beginPath(); x.arc(u, v, 4.5, 0, TAU);
    x.moveTo(u + Math.cos(ra) * 7, v + Math.sin(ra) * 7); x.lineTo(u - Math.cos(ra) * 7, v - Math.sin(ra) * 7);
    x.moveTo(u - Math.sin(ra) * 7, v + Math.cos(ra) * 7); x.lineTo(u + Math.sin(ra) * 7, v - Math.cos(ra) * 7); x.stroke();
    if (big) {
      x.save(); x.strokeStyle = h.side === "us" ? "rgba(124,245,212,.16)" : "rgba(255,138,122,.16)"; x.setLineDash([4, 4]);
      x.beginPath(); x.arc(u, v, 8000 * sc, 0, TAU); x.stroke(); x.restore();
      placeLbl(h.name || "초계헬기", u + 8, v + 3, col);
    }
  }
  // CAP 11km air-defence patrol rings
  for (const cz of C.capZones) {
    const [u, v] = S(cz), r = 11000 * sc;
    x.save(); x.strokeStyle = "rgba(110,220,255,.55)"; x.fillStyle = "rgba(77,232,212,.06)"; x.setLineDash([6, 4]); x.lineWidth = 1.4;
    x.beginPath(); x.arc(u, v, r, 0, TAU); x.fill(); x.stroke(); x.restore();
    placeLbl(`CAP ${Math.max(0, Math.ceil(cz.endT - G.battleT))}s`, u + 8, v - r + 12, "#9be8ff");
  }
  // TOT simultaneous strike convergence arcs & countdowns
  for (const tot of C.tots) {
    const tPos = tot.target?.alive ? tot.target.pos : tot.pt, [tu, tv] = S(tPos), rem = Math.max(0, Math.ceil(tot.endAt - G.battleT));
    x.save(); x.strokeStyle = "rgba(77,232,212,.68)"; x.setLineDash([5, 4]); x.lineWidth = 1.3;
    let k = 0; for (const r of tot.rays) { /* curved firing arcs like the tactical plot, alternating sides so they fan out */
      if (!r.S.alive) continue;
      const [su, sv] = S(r.S.pos), dx = tu - su, dy = tv - sv, sg = k++ % 2 ? -1 : 1, cu = (su + tu) / 2 - dy * 0.28 * sg, cv = (sv + tv) / 2 + dx * 0.28 * sg;
      x.beginPath(); x.moveTo(su, sv); x.quadraticCurveTo(cu, cv, tu, tv); x.stroke();
      x.save(); x.setLineDash([]); x.fillStyle = "#affff1"; x.font = "bold 9px monospace"; x.fillText(`${(r.S.name || "").slice(0, 6)} ${r.n ? r.n + "발" : ""}`, cu + 3, cv); x.restore();
    }
    x.restore();
    x.strokeStyle = "#4de8d4"; x.lineWidth = 1.6; x.beginPath(); x.arc(tu, tv, 11 + Math.sin(G.time * 6) * 2, 0, TAU); x.stroke();
    placeLbl(`TOT T-${rem}s (${tot.n})`, tu + 12, tv - 8, "#affff1");
    { const tot0 = tot.t0 ?? (tot.t0 = G.battleT), fr = clamp((G.battleT - tot0) / Math.max(1, tot.endAt - tot0), 0, 1), bw = 54; /* time-on-target progress: launch -> flight -> impact */
      x.fillStyle = "rgba(7,20,22,.85)"; x.fillRect(tu + 12, tv + 2, bw, 5); x.fillStyle = fr > 0.85 ? "#ffd166" : "#4de8d4"; x.fillRect(tu + 12, tv + 2, bw * fr, 5); x.strokeStyle = "rgba(175,255,241,.6)"; x.lineWidth = 1; x.strokeRect(tu + 12.5, tv + 2.5, bw - 1, 4); }
  }
  const warnShips = new Set();
  for (const m of M.list) {
    if (!m.alive) continue; const [u, v] = S(m.pos), mv = Math.hypot(m.vel.x, m.vel.z);
    x.fillStyle = m.side === "us" ? "#e6f4f6" : m.pri ? "#ffe066" : "#ff5f52"; x.fillRect(u - 2, v - 2, 4, 4);
    if (m.pri && m.side === "foe") {
      x.strokeStyle = "#ffe066"; x.lineWidth = 1.5; x.strokeRect(u - 6, v - 6, 12, 12);
      placeLbl("PRI", u + 8, v - 5, "#ffe066");
    }
    if (m.side === "us" && m.flankPt) {
      const [fu, fv] = S(m.flankPt), [eu, ev] = S(m.target?.pos || m.est || m.pos);
      x.save(); x.strokeStyle = "rgba(255,140,82,.42)"; x.setLineDash([3, 3]); x.lineWidth = 1.1;
      x.beginPath(); x.moveTo(u, v); x.lineTo(fu, fv); x.lineTo(eu, ev); x.stroke(); x.restore();
    }
    if (mv > 1) {
      const du = (m.vel.z / mv) * 10, dv = (-m.vel.x / mv) * 10;
      x.strokeStyle = m.side === "us" ? "rgba(230,244,246,.7)" : m.pri ? "#ffe066" : "rgba(255,95,82,.85)"; x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(u, v); x.lineTo(u + du, v + dv); x.stroke();
    }
    if (m.side === "foe" && m.target?.side === "us" && (big || m.pos.distanceTo(m.target.pos) < 12000)) {
      warnShips.add(m.target);
      const md = m.pos.distanceTo(m.target.pos), [tu, tv] = S(m.target.pos); x.save(); x.strokeStyle = m.pri ? "rgba(255,224,102,.65)" : "rgba(255,95,82,.38)"; x.setLineDash([2, 3]); x.beginPath(); x.moveTo(u, v); x.quadraticCurveTo((u + tu) / 2 - (tv - v) * 0.18, (v + tv) / 2 + (tu - u) * 0.18, tu, tv); x.stroke(); x.restore(); /* curved track to its target with time to impact */
      if (m.side === "us" || m.pri) { x.save(); x.fillStyle = m.pri ? "#ffe066" : "#ffd0c8"; x.font = "bold 9px monospace"; x.fillText(`${m.W.name.slice(0, 6)} T-${Math.max(0, Math.round(md / Math.max(50, m.vel?.length() || m.W.v)))}s`, u + 6, v - 6); x.restore(); }
      if (big && mv > 1 && md < 16000) placeLbl(`${Math.max(1, Math.round(md / mv))}s`, u + 6, v - 5, "#ff9b8d");
    }
  }
  for (const ws of warnShips) if (ws.alive) {
    const [wu, wv] = S(ws.pos), pr = 12 + Math.sin(G.time * 7) * 3;
    x.strokeStyle = "rgba(255,84,72,.82)"; x.lineWidth = 1.6; x.beginPath(); x.arc(wu, wv, pr, 0, TAU); x.stroke();
  }
  for (const k of marks || []) {
    const [u, v] = S(k.pos); x.strokeStyle = x.fillStyle = k.c; x.lineWidth = 1.6;
    if (k.r) { x.save(); x.setLineDash([4, 4]); x.beginPath(); x.arc(u, v, Math.max(5, k.r * sc), 0, TAU); x.stroke(); x.restore(); }
    if (k.kind === "sub") {
      x.beginPath(); x.moveTo(u - 6, v - 2); x.lineTo(u - 6, v + 2); x.lineTo(u, v + 7); x.lineTo(u + 6, v + 2); x.lineTo(u + 6, v - 2); x.stroke();
    } else if (k.kind === "boat") {
      x.beginPath(); x.moveTo(u - 4, v - 3); x.lineTo(u + 5, v); x.lineTo(u - 4, v + 3); x.closePath(); x.fill();
    } else if (!k.r) {
      x.fillRect(u - 4, v - 4, 8, 8);
      if (k.hp > 0) { x.fillStyle = "rgba(0,0,0,.65)"; x.fillRect(u - 9, v + 6, 18, 3); x.fillStyle = k.c; x.fillRect(u - 9, v + 6, 18 * clamp(k.hp, 0, 1), 3); }
    }
    placeLbl(k.label, u + 8, v - 4, k.c);
  }
  if (C.battery) {
    const [u, v] = S(C.battery.pos); x.fillStyle = "#f2b544"; x.fillRect(u - 5, v - 5, 10, 10);
    x.strokeStyle = "#ffe296"; x.strokeRect(u - 7, v - 7, 14, 14);
    x.fillText(big ? C.battery.name : "해안 포대", u + 10, v + 4);
    x.strokeStyle = "rgba(242,181,68,.3)"; x.beginPath(); x.arc(u, v, WPN[C.battery.key].range * sc, 0, TAU); x.stroke();
  }
  const pt = C.deps.md.supPt;
  if (pt) {
    const [u, v] = S(pt), pulseR = 13 + Math.sin(G.time * 4.5) * 2.5;
    const ptKm = (Math.hypot(pt.x - P.pos.x, pt.z - P.pos.z) / 1000).toFixed(1), ptBrg = brg(Math.atan2(pt.z - P.pos.z, pt.x - P.pos.x));
    x.save();
    if (C.pend?.id === "recon") { x.strokeStyle = "rgba(77,232,212,.34)"; x.setLineDash([4, 4]); x.lineWidth = 1.4; x.beginPath(); x.arc(u, v, 11000 * sc, 0, TAU); x.stroke(); }
    x.strokeStyle = "rgba(242,181,68,.5)"; x.setLineDash([5, 4]); x.lineWidth = 1.3;
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(u, v); x.stroke();
    if (C.battery && Math.hypot(pt.x - C.battery.pos.x, pt.z - C.battery.pos.z) <= WPN[C.battery.key].range) {
      const [bu, bv] = S(C.battery.pos); x.strokeStyle = "rgba(255,140,82,.45)"; x.beginPath(); x.moveTo(bu, bv); x.lineTo(u, v); x.stroke();
    }
    x.restore();
    x.strokeStyle = "#f2b544"; x.lineWidth = 2; x.beginPath(); x.arc(u, v, pulseR, 0, TAU);
    x.moveTo(u - 21, v); x.lineTo(u - 7, v); x.moveTo(u + 7, v); x.lineTo(u + 21, v);
    x.moveTo(u, v - 21); x.lineTo(u, v - 7); x.moveTo(u, v + 7); x.lineTo(u, v + 21); x.stroke();
    x.fillStyle = "#ffe08a"; x.fillText(`타격 지점 ${ptKm}km · ${ptBrg}`, u + 16, v - 14);
  }
  if (big) { x.fillStyle = "#8cb4af"; x.font = "11px 'Noto Sans KR'"; x.fillText("상황판 클릭: 타격·정찰 지정 · 휠: 축척 · 위=북(N) · 기함 중심 KNTDS", 12, H - 10); }
}
