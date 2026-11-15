// ── commander's CIC (지휘통제실): a small picture-in-picture room for joint support (air force, missile command) ─────────
// ` or a double-click swaps the CIC and the battle view; drag the header to move it, wheel on it to resize.
// Click the CIC map (or Ctrl+click the battle / map view) to set a strike point, pick a support asset, approve with Y.
import { THREE, PI, TAU, clamp, rnd, G, scene, landAt } from "./core.js";
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

const C = { mode: "pip", on: false, el: null, map: null, pend: null, talkT: 0, say: "", uses: {}, cd: {}, battery: null, zoom: 1, deps: null, sig: "", drag: null };
const $ = (s) => C.el.querySelector(s);

export function cicInit(deps) { // deps: { md, face, faceSkin, cmdrName, nat, theater, toast, log, radio, know }
  C.deps = deps; if (C.el) return;
  C.el = document.getElementById("cic"); C.map = $(".cic-map");
  C.el.addEventListener("dblclick", (e) => { if (e.target.closest(".cic-cards,.cic-ask,.cic-map,.cic-btn")) return; cicExpand(); });
  C.el.querySelector(".cic-h").insertAdjacentHTML("beforeend", `<span class="cic-btns"><button class="cic-btn" data-m="min" title="최소화 (\`)">─</button><button class="cic-btn" data-m="big" title="확대 (Shift+\`)">⤢</button></span>`);
  C.el.querySelector(".cic-btns").addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (!b) return; e.stopPropagation(); b.dataset.m === "min" ? setMode("min") : cicExpand(); });
  C.tab = document.createElement("button"); C.tab.id = "cicTab"; C.tab.type = "button"; C.tab.textContent = "지휘통제실 열기 (`)"; document.body.appendChild(C.tab);
  C.tab.addEventListener("mousedown", (e) => e.stopPropagation()); C.tab.addEventListener("click", (e) => { e.stopPropagation(); setMode("pip"); });
  $(".cic-h").addEventListener("mousedown", (e) => { if (C.mode !== "pip" || e.target.closest(".cic-btn")) return; const r = C.el.getBoundingClientRect(); C.drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; e.preventDefault(); e.stopPropagation(); });
  window.addEventListener("mousemove", (e) => { if (!C.drag) return; C.el.style.left = clamp(e.clientX - C.drag.dx, 0, innerWidth - 120) + "px"; C.el.style.top = clamp(e.clientY - C.drag.dy, 0, innerHeight - 60) + "px"; C.el.style.right = C.el.style.bottom = "auto"; });
  window.addEventListener("mouseup", () => { C.drag = null; });
  C.el.addEventListener("wheel", (e) => { e.preventDefault(); e.stopPropagation(); if (C.mode === "pip") { const s = ["s", "m", "l"], i = s.indexOf(C.el.dataset.size || "m"); C.el.dataset.size = s[clamp(i + (e.deltaY < 0 ? 1 : -1), 0, 2)]; } else C.zoom = clamp(C.zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2), 0.4, 4); }, { passive: false });
  C.el.addEventListener("mousedown", (e) => e.stopPropagation());
  C.map.addEventListener("mousedown", (e) => { e.preventDefault(); const p = mapPick(e); if (!p) return; C.deps.md.supPt = p; sfx.click(); say(`타격 지점 지정 — 좌표 확인. 지원 수단을 고르십시오.`); });
  $(".cic-cards").addEventListener("click", (e) => { const b = e.target.closest("[data-sup]"); if (b) request(b.dataset.sup); });
  $(".cic-ask").addEventListener("click", (e) => { const b = e.target.closest("[data-ok]"); if (b) resolve(b.dataset.ok === "1"); });
  // in the big CIC the battle view is the small window: a click on it swaps back
  window.addEventListener("mousedown", (e) => { if (C.mode === "big" && C.on && e.target.id === "gl") { e.stopImmediatePropagation(); e.preventDefault(); setMode("pip"); } }, true);
}
export function cicStart(deps) {
  cicInit(deps); Object.assign(C.deps, deps); C.on = true; C.mode = "min"; C.pend = null; C.used = 0; C.uses = { fighter: 2, heavy: 1, battery: 2 }; C.cd = {}; C.sig = ""; document.body.classList.remove("cicbig"); document.body.classList.add("cicmin");
  C.el.style.display = ""; C.el.className = "cic min"; $(".cic-fw").innerHTML = deps.face; const sk = deps.faceSkin || "#d8b08a";
  $(".cic-fw").insertAdjacentHTML("beforeend", `<svg class="cic-anim" viewBox="0 0 100 100"><g class="lids"><ellipse cx="42.5" cy="40.6" rx="5" ry="3.4" fill="${sk}"/><ellipse cx="57.5" cy="40.6" rx="5" ry="3.4" fill="${sk}"/></g><ellipse class="mouth" cx="50" cy="59.8" rx="3.6" ry="1.8" fill="#3a1d16"/></svg>`);
  C.battery = placeBattery(); say(`${deps.cmdrName} 사령관입니다. 공군·미사일사령부 지원 대기 중.`);
}
export function cicStop() { C.on = false; if (C.el) C.el.style.display = "none"; document.body.classList.remove("cicbig", "cicmin"); if (C.battery?.mesh) C.battery.mesh.parent?.remove(C.battery.mesh); C.battery = null; }
function setMode(m) { if (!C.on) return; C.tab?.classList.remove("ping"); C.mode = m; C.el.className = `cic ${m}`; document.body.classList.toggle("cicbig", m === "big"); document.body.classList.toggle("cicmin", m === "min"); C.el.style.left = C.el.style.top = C.el.style.right = C.el.style.bottom = ""; sfx.click(); C.sig = ""; }
/** ` : minimized ↔ small window (from the big view: back to the small window) */
export function cicToggle() { setMode(C.mode === "min" ? "pip" : C.mode === "big" ? "pip" : "min"); }
/** Shift+` or double-click: enlarge ↔ small window */
export function cicExpand() { setMode(C.mode === "big" ? "pip" : "big"); }
export const cicPending = () => !!C.pend;
export const cicUsed = () => C.used || 0;
export const cicBig = () => C.on && C.mode === "big";

function say(t) { if (C.tab && C.mode === "min") C.tab.classList.add("ping"); C.say = t; C.talkT = Math.min(5, 0.9 + t.length * 0.06); $(".cic-say").textContent = t; C.el.classList.add("talk"); }
function placeBattery() {
  const key = `${C.deps.theater}:${C.deps.nat}`, b = BATTERY[key]; if (!b) return null; const P = G.player; let best = null, bd = Infinity;
  for (let r = 3000; r <= 30000; r += 1500) for (let k = 0; k < 40; k++) { const a = (k / 40) * TAU, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r; if (landAt(x, z) && landAt(x + 400, z) && landAt(x - 400, z) && r < bd) { bd = r; best = { x, z }; } }
  if (!best) return null; const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x55604a, roughness: 0.8 });
  const truck = new THREE.Mesh(new THREE.BoxGeometry(12, 3.5, 3.4), m); truck.position.y = 2; g.add(truck); const tube = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, 3), m); tube.position.set(-1, 5, 0); tube.rotation.z = 0.5; g.add(tube);
  g.scale.setScalar(2.5); g.position.set(best.x, 30, best.z); scene.add(g);
  return { ...b, pos: new THREE.Vector3(best.x, 30, best.z), mesh: g };
}
function assets() {
  const n = C.deps.nat, A = AIR[n] || AIR.us, out = [];
  out.push({ id: "fighter", t: `공군 전투기 편대 · ${A.fighter.type}`, d: `2기 · ${WPN[A.fighter.asm]?.name || A.fighter.asm} 공격 · 도착 약 40초`, ok: true });
  out.push({ id: "heavy", t: `공군 대형기 · ${A.heavy.type}`, d: `${A.heavy.n}발 · ${WPN[A.heavy.asm]?.name || A.heavy.asm} · 도착 약 60초`, ok: true });
  out.push(C.battery ? { id: "battery", t: C.battery.name, d: `4발 일제 · 사거리 ${(WPN[C.battery.key].range / 1000) | 0} km · 재요청 90초`, ok: true } : { id: "battery", t: "지대함 포대", d: "이 전장·국가에선 지원 불가 (제주=한국 · 오키나와=일본 · 미국 서해안=미국)", ok: false });
  return out;
}
function request(id) {
  const a = assets().find((x) => x.id === id); if (!a || !a.ok) { sfx.deny(); say("해당 지원은 이 전장에서 쓸 수 없습니다."); return; }
  if (!(C.uses[id] > 0)) { sfx.deny(); say("해당 지원은 이번 전투에서 모두 썼습니다."); return; }
  if ((C.cd[id] || 0) > G.battleT) { sfx.deny(); say(`재요청까지 ${Math.ceil(C.cd[id] - G.battleT)}초.`); return; }
  const pt = C.deps.md.supPt; if (!pt) { sfx.deny(); say("먼저 타격 지점을 지정하십시오 — 상황판·지도 클릭 또는 전장 Ctrl+클릭."); return; }
  if (id === "battery" && Math.hypot(pt.x - C.battery.pos.x, pt.z - C.battery.pos.z) > WPN[C.battery.key].range) { sfx.deny(); say("지정 지점이 포대 사거리 밖입니다."); return; }
  C.pend = { id, a, pt: { ...pt } }; sfx.ready?.(); say(`${a.t} — 지정 지점으로 공격, 승인 바랍니다. (Y 승인 · N 보류)`);
}
export function cicResolve(ok) { resolve(ok); }
function resolve(ok) {
  const p = C.pend; if (!p) return; C.pend = null; C.sig = "";
  if (!ok) { sfx.click(); say("보류합니다. 다른 지시를 기다리겠습니다."); return; }
  C.uses[p.id]--; C.used = (C.used || 0) + 1; C.cd[p.id] = G.battleT + (p.id === "battery" ? 90 : 60); C.deps.radio?.("launch");
  const pt = new THREE.Vector3(p.pt.x, 0, p.pt.z), P = G.player, A = AIR[C.deps.nat] || AIR.us;
  if (p.id === "fighter" || p.id === "heavy") {
    const back = P.pos.clone().sub(pt).setY(0).normalize(), base = P.pos.clone().addScaledVector(back, p.id === "heavy" ? 26000 : 18000).setY(p.id === "heavy" ? 6000 : 2000);
    const n = p.id === "heavy" ? 1 : 2;
    for (let i = 0; i < n; i++) { const cv = p.id === "heavy" ? { type: A.heavy.type, asm: A.heavy.asm, aam: "AIM-120" } : { type: A.fighter.type, asm: A.fighter.asm, aam: A.fighter.aam };
      const src = { side: "us", pos: base.clone().add(new THREE.Vector3(i * 300, 0, i * 300)), heading: Math.atan2(pt.z - base.z, pt.x - base.x), spec: { fb: 0 }, alive: true, cv, fwd: back.clone().negate(), name: "공군" };
      const j = launchJet(src, "strike", cv, src.pos); j.pos.copy(src.pos); j.aimPt = pt.clone(); j.support = true; j.endur = 400; if (p.id === "heavy") { j.asm = A.heavy.n; j.aam = 0; j.mesh.scale.setScalar(4.2); j.heavy = true; } }
    say(p.id === "heavy" ? `${A.heavy.type} 출격 — 약 1분 후 미사일 발사.` : `${A.fighter.type} 편대 출격 — 약 40초 후 공격.`); C.deps.log(`합동 지원 승인 — ${p.a.t}`, "hit");
  } else if (p.id === "battery") {
    const b = C.battery, T = C.deps.know("us").sort((x, y) => x.pos.distanceToSquared(pt) - y.pos.distanceToSquared(pt))[0];
    for (let i = 0; i < 4; i++) setTimeout(() => { if (G.state !== "playing") return; const src = { isJet: true, side: "us", pos: b.pos.clone().setY(b.pos.y + 25), vel: pt.clone().sub(b.pos).setY(0).normalize().multiplyScalar(150).setY(90), alive: true, spec: { fb: 0 }, name: b.name };
      const m = launch(src, b.key, T && T.pos.distanceTo(pt) < 5000 ? T.ship : null); if (m && !(T && T.pos.distanceTo(pt) < 5000)) m.est = pt.clone(); }, 400 + i * 900);
    say("포대 발사! 4발 지정 지점으로 비행 중."); C.deps.log(`${b.name} 4발 발사 승인`, "hit");
  }
}
function mapPick(e) {
  const r = C.map.getBoundingClientRect(), u = ((e.clientX - r.left) / r.width) * C.map.width, v = ((e.clientY - r.top) / r.height) * C.map.height;
  const P = G.player; if (!P) return null; const R = 30000 / C.zoom, sc = Math.min(C.map.width, C.map.height) / 2 / R;
  return { x: P.pos.x - (v - C.map.height / 2) / sc, z: P.pos.z + (u - C.map.width / 2) / sc };
}
export function cicStep(dt, marks) {
  if (!C.on || !C.el) return; const P = G.player; if (!P) return;
  C.talkT -= dt; if (C.talkT <= 0) C.el.classList.remove("talk");
  C.el.classList.toggle("alert", M.list.some((m) => m.alive && m.side === "foe" && m.W.role === "asm" && m.target?.side === "us" && m.pos.distanceTo(m.target.pos) < 9000));
  const cards = assets().map((a) => { const cd = Math.max(0, Math.ceil((C.cd[a.id] || 0) - G.battleT)), u = C.uses[a.id] ?? 0; const st = !a.ok ? "불가" : u <= 0 ? "소진" : cd ? `${cd}s` : `${u}회`;
    return `<button class="sup${a.ok && u > 0 && !cd ? "" : " off"}${C.pend?.id === a.id ? " pend" : ""}" data-sup="${a.id}"><b>${a.t}</b><small>${a.d}</small><i>${st}</i></button>`; }).join("");
  const ask = C.pend ? `<div class="q">승인 대기: ${C.pend.a.t}</div><button data-ok="1">Y 승인</button><button data-ok="0">N 보류</button>` : `<div class="q m">${C.deps.md.supPt ? "타격 지점 지정됨 — 지원 수단을 고르세요" : "타격 지점: 상황판 클릭 · 전장 Ctrl+클릭"}</div>`;
  const sig = cards + ask; if (sig !== C.sig) { C.sig = sig; $(".cic-cards").innerHTML = cards; $(".cic-ask").innerHTML = ask; }
  if (C.mode === "big") drawMap(marks);
}
function drawMap(marks) {
  const cv = C.map, W = cv.clientWidth | 0, H = cv.clientHeight | 0; if (!W || !H) return; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const x = cv.getContext("2d"), P = G.player, R = 30000 / C.zoom, sc = Math.min(W, H) / 2 / R, cx = W / 2, cy = H / 2;
  const S = (p) => [cx + (p.z - P.pos.z) * sc, cy - (p.x - P.pos.x) * sc];
  x.fillStyle = "#0b1f22"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#24382a"; for (const s of G.islands) { if (s.poly) { x.beginPath(); s.poly.forEach(([px, pz], i) => { const [u, v] = S({ x: px, z: pz }); i ? x.lineTo(u, v) : x.moveTo(u, v); }); x.closePath(); x.fill(); } else if (s.r) { const [u, v] = S(s); x.beginPath(); x.arc(u, v, s.r * sc, 0, TAU); x.fill(); } }
  x.strokeStyle = "#1f4e48"; x.lineWidth = 1; for (const k of [10000, 20000, 40000]) { x.beginPath(); x.arc(cx, cy, k * sc, 0, TAU); x.stroke(); x.fillStyle = "#3d7a70"; x.font = "12px 'Noto Sans KR'"; x.fillText(`${k / 1000} km`, cx + 4, cy - k * sc - 4); }
  x.font = "bold 12px 'Noto Sans KR'";
  for (const s of G.ships) { if (!s.alive) continue; const known = s.side === "us" || (G.cts && G.cts.get(s)); if (!known) continue; const p = s.side === "us" ? s.pos : (G.cts.get(s) || s.pos); const [u, v] = S(p);
    x.fillStyle = s.side === "us" ? "#3fc7b5" : "#ff6b5e"; x.beginPath(); s.side === "us" ? x.arc(u, v, s.isPlayer ? 6 : 4.5, 0, TAU) : (x.moveTo(u, v - 6), x.lineTo(u + 6, v), x.lineTo(u, v + 6), x.lineTo(u - 6, v), x.closePath()); x.fill(); if (s.isPlayer || s.side === "foe") x.fillText(s.name || "", u + 8, v + 4); }
  for (const j of M.jets) { if (!j.alive) continue; const [u, v] = S(j.pos); x.strokeStyle = j.side === "us" ? "#9fe1d6" : "#ff8a7a"; x.beginPath(); x.moveTo(u - 5, v + 4); x.lineTo(u, v - 5); x.lineTo(u + 5, v + 4); x.stroke(); if (j.support) { x.fillStyle = "#9fe1d6"; x.fillText(j.name, u + 7, v); } }
  for (const m of M.list) { if (!m.alive) continue; const [u, v] = S(m.pos); x.fillStyle = m.side === "us" ? "#e6ecef" : "#ff6b5e"; x.fillRect(u - 1.5, v - 1.5, 3, 3); }
  for (const k of marks || []) { const [u, v] = S(k.pos); x.strokeStyle = x.fillStyle = k.c; if (k.r) { x.setLineDash([4, 4]); x.beginPath(); x.arc(u, v, Math.max(5, k.r * sc), 0, TAU); x.stroke(); x.setLineDash([]); } else x.fillRect(u - 4, v - 4, 8, 8); x.fillText(k.label, u + 8, v - 6); }
  if (C.battery) { const [u, v] = S(C.battery.pos); x.fillStyle = "#f2b544"; x.fillRect(u - 6, v - 6, 12, 12); x.fillText(C.battery.name, u + 9, v + 4); x.strokeStyle = "rgba(242,181,68,.35)"; x.beginPath(); x.arc(u, v, WPN[C.battery.key].range * sc, 0, TAU); x.stroke(); }
  const pt = C.deps.md.supPt; if (pt) { const [u, v] = S(pt); x.strokeStyle = "#f2b544"; x.lineWidth = 2; x.beginPath(); x.arc(u, v, 14, 0, TAU); x.moveTo(u - 22, v); x.lineTo(u + 22, v); x.moveTo(u, v - 22); x.lineTo(u, v + 22); x.stroke(); x.fillStyle = "#f2b544"; x.fillText("타격 지점", u + 18, v - 16); }
  x.fillStyle = "#9fb0ba"; x.font = "12px 'Noto Sans KR'"; x.fillText("클릭: 타격 지점 · 휠: 축척 · 위 = 북쪽 · 기함 중심", 12, H - 12);
}
