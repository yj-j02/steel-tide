// ── commander's CIC (지휘통제실): tactical KNTDS C4I room for joint support & ESM/ISR coordination ─────────
// ` toggles minimized ↔ PiP window; Shift+` or double-click toggles fullscreen CIC; drag header to move, wheel to resize/zoom.
// Click the CIC map (or a tracked target row, or Ctrl+click battle sea) to designate a strike/recon point, pick asset, approve with Y.
import { THREE, PI, TAU, clamp, rnd, brg, G, scene, camera, landAt, flash, rings } from "./core.js";
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
  us: { fighter: { type: "F/A-18E (공군 지원 편대)", asm: "LRASM", aam: "AIM-120" }, heavy: { type: "B-1B", asm: "LRASM", n: 4 } },
  kr: { fighter: { type: "KF-21 (가정)", asm: "해성", aam: "AIM-120" }, heavy: { type: "P-8A 해상초계기", asm: "하푼", n: 4 } },
  jp: { fighter: { type: "F-2", asm: "17식", aam: "AIM-120" }, heavy: { type: "P-1 초계기", asm: "91식", n: 4 } },
};
const BATTERY = { "west:kr": { name: "해안 지대함 포대 (미사일사령부)", key: "해성 지상" }, "east:kr": { name: "해안 지대함 포대 (미사일사령부)", key: "해성 지상" }, "strait:kr": { name: "해안 지대함 포대 (미사일사령부)", key: "해성 지상" }, "jeju:kr": { name: "해안 지대함 포대 (미사일사령부)", key: "해성 지상" }, "okinawa:jp": { name: "육상자위대 12식 지대함 포대", key: "12식" }, "uswest:us": { name: "미 해병대 NMESIS 포대", key: "NSM 지상" } };
const MAX_USES = { fighter: 2, heavy: 1, battery: 2, recon: 2 };
const CD_SEC = { fighter: 60, heavy: 60, battery: 90, recon: 75 };

const C = { mode: "pip", on: false, el: null, map: null, pend: null, talkT: 0, say: "", uses: {}, cd: {}, battery: null, zoom: 1, deps: null, sig: "", tSig: "", lSig: "", drag: null, hover: null, pulses: [], warnT: 0, trkList: [], lastMarks: [] };
const $ = (s) => C.el.querySelector(s);

export function cicInit(deps) { // deps: { md, face, faceSkin, cmdrName, nat, theater, toast, log, radio, know }
  C.deps = deps; if (C.el) return;
  C.el = document.getElementById("cic"); C.map = $(".cic-map");
  C.el.addEventListener("dblclick", (e) => { if (e.target.closest(".cic-cards,.cic-ask,.cic-map,.cic-mapw,.cic-tracks,.cic-tools,.cic-btn")) return; cicExpand(); });
  C.el.querySelector(".cic-h").insertAdjacentHTML("beforeend", `<span class="cic-btns"><button class="cic-btn" data-m="min" title="최소화 (\`)">─</button><button class="cic-btn" data-m="big" title="확대 (Shift+\`)">⤢</button></span>`);
  C.el.querySelector(".cic-btns").addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (!b) return; e.stopPropagation(); b.dataset.m === "min" ? setMode("min") : cicExpand(); });
  C.tab = document.createElement("button"); C.tab.id = "cicTab"; C.tab.type = "button"; C.tab.textContent = "지휘통제실 열기 (`)"; document.body.appendChild(C.tab);
  C.tab.addEventListener("mousedown", (e) => e.stopPropagation()); C.tab.addEventListener("click", (e) => { e.stopPropagation(); setMode("pip"); });
  $(".cic-h").addEventListener("mousedown", (e) => { if (C.mode !== "pip" || e.target.closest(".cic-btn")) return; const r = C.el.getBoundingClientRect(); C.drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; e.preventDefault(); e.stopPropagation(); });
  window.addEventListener("mousemove", (e) => { if (!C.drag) return; C.el.style.left = clamp(e.clientX - C.drag.dx, 0, innerWidth - 120) + "px"; C.el.style.top = clamp(e.clientY - C.drag.dy, 0, innerHeight - 60) + "px"; C.el.style.right = C.el.style.bottom = "auto"; });
  window.addEventListener("mouseup", () => { C.drag = null; });
  C.el.addEventListener("wheel", (e) => {
    e.preventDefault(); e.stopPropagation();
    if (C.mode === "pip" && !e.target.closest(".cic-mapw")) { const s = ["s", "m", "l"], i = s.indexOf(C.el.dataset.size || "m"); C.el.dataset.size = s[clamp(i + (e.deltaY < 0 ? 1 : -1), 0, 2)]; }
    else C.zoom = clamp(C.zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2), 0.4, 4);
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
  $(".cic-cards").addEventListener("click", (e) => { const b = e.target.closest("[data-sup]"); if (b) request(b.dataset.sup); });
  $(".cic-ask").addEventListener("click", (e) => { const b = e.target.closest("[data-ok]"); if (b) resolve(b.dataset.ok === "1"); });
  // in the big CIC the battle view is the small window: a click on it swaps back
  window.addEventListener("mousedown", (e) => { if (C.mode === "big" && C.on && e.target.id === "gl") { e.stopImmediatePropagation(); e.preventDefault(); setMode("pip"); } }, true);
}
export function cicStart(deps) {
  cicInit(deps); Object.assign(C.deps, deps); C.on = true; C.mode = "min"; C.pend = null; C.used = 0; C.uses = { ...MAX_USES }; C.cd = {}; C.sig = ""; C.tSig = ""; C.lSig = ""; C.pulses = []; C.warnT = 0; C.trkList = []; C.lastMarks = [];
  document.body.classList.remove("cicbig"); document.body.classList.add("cicmin");
  C.el.style.display = ""; C.el.className = "cic min"; $(".cic-fw").innerHTML = deps.face; const sk = deps.faceSkin || "#d8b08a";
  $(".cic-fw").insertAdjacentHTML("beforeend", `<svg class="cic-anim" viewBox="0 0 100 100"><g class="lids"><ellipse cx="42.5" cy="40.6" rx="5" ry="3.4" fill="${sk}"/><ellipse cx="57.5" cy="40.6" rx="5" ry="3.4" fill="${sk}"/></g><ellipse class="mouth" cx="50" cy="59.8" rx="3.6" ry="1.8" fill="#3a1d16"/></svg>`);
  C.battery = placeBattery(); say(`${deps.cmdrName} 사령관, KNTDS 합동지휘망 연결 완료. 공군·해안포대·위성정찰 대기 중.`);
}
export function cicStop() { C.on = false; C.pulses = []; if (C.el) C.el.style.display = "none"; document.body.classList.remove("cicbig", "cicmin"); if (C.battery?.mesh) C.battery.mesh.parent?.remove(C.battery.mesh); C.battery = null; }
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
function assets() {
  const n = C.deps.nat, A = AIR[n] || AIR.us, out = [];
  out.push({ id: "fighter", t: `공군 전투기 편대 · ${A.fighter.type}`, d: `2기 · ${WPN[A.fighter.asm]?.name || A.fighter.asm} 공격 · 도착 약 40초`, ok: true });
  out.push({ id: "heavy", t: `공군 대형기 · ${A.heavy.type}`, d: `${A.heavy.n}발 · ${WPN[A.heavy.asm]?.name || A.heavy.asm} · 도착 약 60초`, ok: true });
  out.push(C.battery ? { id: "battery", t: C.battery.name, d: `4발 일제 · 사거리 ${(WPN[C.battery.key].range / 1000) | 0} km · 재요청 90초`, ok: true } : { id: "battery", t: "지대함 포대", d: "이 전장·국가에선 지원 불가 (한반도=해성 · 오키나와=12식 · 미 서부=NMESIS)", ok: false });
  out.push({ id: "recon", t: "위성 · 합동 ISR 정찰", d: "반경 11 km 은폐·ESM 적함 정밀 식별 (30초) · 쿨타임 75초", ok: true });
  return out;
}
function request(id) {
  const a = assets().find((x) => x.id === id); if (!a || !a.ok) { sfx.deny(); say("해당 지원은 이 전장에서 쓸 수 없습니다."); return; }
  if (!(C.uses[id] > 0)) { sfx.deny(); say("해당 지원은 이번 전투에서 모두 썼습니다."); return; }
  if ((C.cd[id] || 0) > G.battleT) { sfx.deny(); say(`재요청까지 ${Math.ceil(C.cd[id] - G.battleT)}초 대기.`); return; }
  const pt = C.deps.md.supPt; if (!pt) { sfx.deny(); say("먼저 상황판이나 표적 목록에서 지점을 지정하십시오."); return; }
  if (id === "battery" && Math.hypot(pt.x - C.battery.pos.x, pt.z - C.battery.pos.z) > WPN[C.battery.key].range) { sfx.deny(); say("지정 지점이 해안 포대 최대 사거리 밖입니다."); return; }
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
    const back = P.pos.clone().sub(pt).setY(0).normalize(), base = P.pos.clone().addScaledVector(back, p.id === "heavy" ? 26000 : 18000).setY(p.id === "heavy" ? 6000 : 2000);
    const n = p.id === "heavy" ? 1 : 2;
    for (let i = 0; i < n; i++) { const cv = p.id === "heavy" ? { type: A.heavy.type, asm: A.heavy.asm, aam: "AIM-120" } : { type: A.fighter.type, asm: A.fighter.asm, aam: A.fighter.aam };
      const src = { side: "us", pos: base.clone().add(new THREE.Vector3(i * 300, 0, i * 300)), heading: Math.atan2(pt.z - base.z, pt.x - base.x), spec: { fb: 0 }, alive: true, cv, fwd: back.clone().negate(), name: "공군" };
      const j = launchJet(src, "strike", cv, src.pos); j.pos.copy(src.pos); j.aimPt = pt.clone(); j.support = true; j.endur = 400; if (p.id === "heavy") { j.asm = A.heavy.n; j.aam = 0; j.mesh.scale.setScalar(4.2); j.heavy = true; } }
    C.pulses.push({ x: pt.x, z: pt.z, t: 0, dur: 4, maxR: 6000, col: "#f2b544" });
    say(p.id === "heavy" ? `${A.heavy.type} 출격 확인 — 약 60초 후 다연장 공대함 발사 예정.` : `${A.fighter.type} 2기 출격 확인 — 약 40초 후 목표 해역 진입.`);
    C.deps.log(`합동 지원 승인 — ${p.a.t}`, "hit");
  } else if (p.id === "battery") {
    const b = C.battery, T = C.deps.know("us").sort((x, y) => x.pos.distanceToSquared(pt) - y.pos.distanceToSquared(pt))[0];
    for (let i = 0; i < 4; i++) setTimeout(() => { if (G.state !== "playing") return; const src = { isJet: true, side: "us", pos: b.pos.clone().setY(b.pos.y + 25), vel: pt.clone().sub(b.pos).setY(0).normalize().multiplyScalar(150).setY(90), alive: true, spec: { fb: 0 }, name: b.name };
      const m = launch(src, b.key, T && T.pos.distanceTo(pt) < 5000 ? T.ship : null); if (m && !(T && T.pos.distanceTo(pt) < 5000)) m.est = pt.clone();
      flash.spawn({ x: b.pos.x, y: b.pos.y + 18, z: b.pos.z, life: 0.45, s0: 14, s1: 38, a: 0.95, c: 0xffb858 });
      rings.spawn({ x: b.pos.x, z: b.pos.z, w0: 8, l0: 8, w1: 95, l1: 95, life: 1.5, a: 0.55, c: 0xffb858 });
    }, 400 + i * 900);
    C.pulses.push({ x: pt.x, z: pt.z, t: 0, dur: 4.5, maxR: 5000, col: "#ff8c52" });
    say(`${b.name} 4발 일제 발사 승인! 지정 해역으로 저공 스키밍 비행 중.`); C.deps.log(`${b.name} 4발 발사 승인`, "hit");
  } else if (p.id === "recon") {
    let found = 0;
    for (const e of G.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.pos.x - pt.x, e.pos.z - pt.z) <= 11000) {
        e.revealT = Math.max(e.revealT || 0, 30); e.root.visible = true;
        G.cts?.set(e, { q: 1, x: e.pos.x, z: e.pos.z, err: 35, src: "위성·정찰", h: e.heading });
        found++;
      }
    }
    if (!found) {
      const near = G.enemies.filter((e) => e.alive).map((e) => ({ e, d: Math.hypot(e.pos.x - pt.x, e.pos.z - pt.z) })).sort((a, b) => a.d - b.d)[0];
      if (near && near.d <= 20000) {
        const e = near.e; e.revealT = Math.max(e.revealT || 0, 26); e.root.visible = true;
        G.cts?.set(e, { q: 1, x: e.pos.x, z: e.pos.z, err: 45, src: "위성·정찰", h: e.heading });
        found = 1;
      }
    }
    C.pulses.push({ x: pt.x, z: pt.z, t: 0, dur: 5, maxR: 11000, col: "#4de8d4" });
    rings.spawn({ x: pt.x, z: pt.z, w0: 30, l0: 30, w1: 900, l1: 900, life: 2.5, a: 0.65, c: 0x4de8d4 });
    flash.spawn({ x: pt.x, y: 80, z: pt.z, life: 0.7, s0: 35, s1: 120, a: 0.55, c: 0x4de8d4 });
    sfx.ready?.();
    say(found ? `합동 정찰 완료 — 적함 ${found}척 30초간 정밀 식별. 사격통제 연동 완료!` : "정찰 스캔 완료 — 반경 11 km 내 적 수상함 미탐지.");
    C.deps.log(`합동 위성·ISR 정찰 (${found}척 식별)`, "hit");
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
    if (k.kind !== "ground") continue;
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
  const sig = `${mm}:${ss}|${emcon}|${cts}|${incoming}|${etaSec}|${airborneJets}|${ptTxt}|${C.zoom.toFixed(1)}`;
  if (sig === C.tSig) return; C.tSig = sig;
  const el = $(".cic-tele"); if (!el) return;
  const thTxt = incoming ? `<i>▲${incoming}${etaSec > 0 ? ` (${etaSec}s)` : ""}</i>` : "0";
  el.innerHTML = `<span>T+<b>${mm}:${ss}</b></span><span>${emcon ? "<i>EMCON</i>" : "<b>RADAR</b>"}</span><span>표적 <b>${cts}</b></span><span>위협 ${thTxt}</span><span>편대 <b>${airborneJets}</b></span><span>목표 <b>${ptTxt}</b></span>`;
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
    if (k.kind !== "ground") continue;
    const d = Math.hypot(k.pos.x - P.pos.x, k.pos.z - P.pos.z), b = brg(Math.atan2(k.pos.z - P.pos.z, k.pos.x - P.pos.x));
    rows.push({ tn: `G${String(tn++).padStart(2, "0")}`, name: k.label, src: k.hp > 0 ? `지상 ${Math.round(k.hp * 100)}%` : "지상 목표", km: (d / 1000).toFixed(1), brg: b, x: k.pos.x, z: k.pos.z, esm: false });
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
  if (incoming > 0 && C.warnT <= 0 && !C.pend && C.talkT <= 0) { C.warnT = 15; say(`경보 — 적 대함·유도탄 ${incoming}발 근접 중 (${Math.min(...incList.map((m) => m.pos.distanceTo(m.target.pos) / 1000)).toFixed(1)} km · ${etaSec}초)! 요격 대기.`); }
  const airborneJets = M.jets.filter((j) => j.alive && j.side === "us").length;
  updateTele(P, incoming, airborneJets, etaSec);
  updateTracks(P, marks);
  const pt = C.deps.md.supPt;
  const cards = assets().map((a) => {
    const cd = Math.max(0, Math.ceil((C.cd[a.id] || 0) - G.battleT)), maxCd = CD_SEC[a.id] || 60, u = C.uses[a.id] ?? 0, maxU = MAX_USES[a.id] || 1;
    const pips = a.ok ? `<span class="pips">${"●".repeat(u)}${"○".repeat(Math.max(0, maxU - u))}</span>` : "";
    let eta = "";
    if (pt && a.ok && u > 0) {
      if (a.id === "battery" && C.battery) {
        const bd = Math.hypot(pt.x - C.battery.pos.x, pt.z - C.battery.pos.z), br = WPN[C.battery.key].range;
        eta = bd <= br ? ` · <span class="eta">포대 ${(bd / 1000).toFixed(1)}km · 탄착 ${(bd / (WPN[C.battery.key].v * 2.55)).toFixed(0)}s</span>` : ` · <span style="color:#ff8a7a">사거리 밖(${(bd / 1000).toFixed(1)}km)</span>`;
      } else if (a.id === "recon") {
        eta = ` · <span class="eta">기함 ${(Math.hypot(pt.x - P.pos.x, pt.z - P.pos.z) / 1000).toFixed(1)}km · 즉시 스캔</span>`;
      } else {
        eta = ` · <span class="eta">지정점 ${(Math.hypot(pt.x - P.pos.x, pt.z - P.pos.z) / 1000).toFixed(1)}km</span>`;
      }
    }
    const st = !a.ok ? "불가" : u <= 0 ? "소진" : cd ? `${cd}s` : `${u}회`;
    const pct = cd > 0 ? clamp(1 - cd / maxCd, 0, 1) * 100 : 0;
    return `<button class="sup${a.ok && u > 0 && !cd ? "" : " off"}${C.pend?.id === a.id ? " pend" : ""}" data-sup="${a.id}"><b>${a.t}${pips}</b><small>${a.d}${eta}</small><i>${st}</i>${cd > 0 ? `<span class="cdbar"><span style="width:${pct.toFixed(1)}%"></span></span>` : ""}</button>`;
  }).join("");
  const snap = pt ? nearestSnap(pt.x, pt.z, 2600) : null;
  const ptDesc = pt ? `${snap ? snap.name : "해역"} (${(Math.hypot(pt.x - P.pos.x, pt.z - P.pos.z) / 1000).toFixed(1)} km · ${brg(Math.atan2(pt.z - P.pos.z, pt.x - P.pos.x))})` : "";
  const ask = C.pend ? `<div class="q">승인 대기: ${C.pend.a.t} → ${ptDesc}</div><button data-ok="1">Y 승인</button><button data-ok="0">N 보류</button>` : `<div class="q m">${pt ? `지점: ${ptDesc} — 지원 수단 선택` : "상황판·표적 클릭 또는 전장 Ctrl+클릭으로 지점 지정"}</div>`;
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
  const warnShips = new Set();
  for (const m of M.list) {
    if (!m.alive) continue; const [u, v] = S(m.pos), mv = Math.hypot(m.vel.x, m.vel.z);
    x.fillStyle = m.side === "us" ? "#e6f4f6" : "#ff5f52"; x.fillRect(u - 2, v - 2, 4, 4);
    if (mv > 1) {
      const du = (m.vel.z / mv) * 10, dv = (-m.vel.x / mv) * 10;
      x.strokeStyle = m.side === "us" ? "rgba(230,244,246,.7)" : "rgba(255,95,82,.85)"; x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(u, v); x.lineTo(u + du, v + dv); x.stroke();
    }
    if (m.side === "foe" && m.target?.side === "us" && (big || m.pos.distanceTo(m.target.pos) < 12000)) {
      warnShips.add(m.target);
      const [tu, tv] = S(m.target.pos); x.save(); x.strokeStyle = "rgba(255,95,82,.38)"; x.setLineDash([2, 3]); x.beginPath(); x.moveTo(u, v); x.lineTo(tu, tv); x.stroke(); x.restore();
    }
  }
  for (const ws of warnShips) if (ws.alive) {
    const [wu, wv] = S(ws.pos), pr = 12 + Math.sin(G.time * 7) * 3;
    x.strokeStyle = "rgba(255,84,72,.82)"; x.lineWidth = 1.6; x.beginPath(); x.arc(wu, wv, pr, 0, TAU); x.stroke();
  }
  for (const k of marks || []) {
    const [u, v] = S(k.pos); x.strokeStyle = x.fillStyle = k.c;
    if (k.r) { x.setLineDash([4, 4]); x.beginPath(); x.arc(u, v, Math.max(5, k.r * sc), 0, TAU); x.stroke(); x.setLineDash([]); } else x.fillRect(u - 4, v - 4, 8, 8);
    x.fillText(k.label, u + 8, v - 5);
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
    x.save(); x.strokeStyle = "rgba(242,181,68,.5)"; x.setLineDash([5, 4]); x.lineWidth = 1.3;
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(u, v); x.stroke();
    if (C.battery && Math.hypot(pt.x - C.battery.pos.x, pt.z - C.battery.pos.z) <= WPN[C.battery.key].range) {
      const [bu, bv] = S(C.battery.pos); x.strokeStyle = "rgba(255,140,82,.45)"; x.beginPath(); x.moveTo(bu, bv); x.lineTo(u, v); x.stroke();
    }
    x.restore();
    x.strokeStyle = "#f2b544"; x.lineWidth = 2; x.beginPath(); x.arc(u, v, pulseR, 0, TAU);
    x.moveTo(u - 21, v); x.lineTo(u - 7, v); x.moveTo(u + 7, v); x.lineTo(u + 21, v);
    x.moveTo(u, v - 21); x.lineTo(u, v - 7); x.moveTo(u, v + 7); x.lineTo(u, v + 21); x.stroke();
    x.fillStyle = "#ffe08a"; x.fillText("타격 지점", u + 16, v - 14);
  }
  if (big) { x.fillStyle = "#8cb4af"; x.font = "11px 'Noto Sans KR'"; x.fillText("상황판 클릭: 타격·정찰 지정 · 휠: 축척 · 위=북(N) · 기함 중심 KNTDS", 12, H - 10); }
}
