// 작전 지휘 (operation map): plan on a 2D chart of the West Sea, then run the operation in
// real time (pause, x1/x2/x4). Groups move along the paths you draw; when a group detects an
// enemy group within missile range the exchange is resolved on the chart (salvos, interceptions,
// hits). Staff and promotion perks feed the numbers. Geography is a stylised sketch, not a survey.

const KM = 1; /* map unit: kilometres; x east, y south */
const W = 150, H = 96;
const LAND = [
  /* north shore (stylised) */ [[52, 0], [150, 0], [150, 14], [128, 18], [112, 15], [96, 20], [84, 16], [70, 19], [60, 12]],
  /* west coast of the peninsula (stylised) */ [[150, 14], [150, 96], [124, 96], [120, 84], [126, 74], [118, 66], [124, 56], [118, 46], [126, 38], [122, 28], [132, 22]],
];
const ISLES = [["백령도", 30, 27, 2.6], ["대청도", 33, 33, 1.8], ["소청도", 35, 36, 1.1], ["연평도", 86, 30, 1.6], ["덕적도", 100, 66, 1.8], ["굴업도", 92, 72, 0.9]];
const LINE_Y = 25; /* boundary line (fictional) */
const GOAL = { x: 86, y: 38, r: 9, n: "연평 해역" };
const BATTERY = { x: 120, y: 44, range: 48 };

const SHIP_T = {
  aegis: { n: "이지스구축함", hp: 100, asm: 16, sam: 48 },
  ddh: { n: "구축함", hp: 85, asm: 8, sam: 24 },
  ffg: { n: "호위함", hp: 70, asm: 8, sam: 12 },
  pkg: { n: "유도탄고속함", hp: 40, asm: 4, sam: 2 },
  foeDD: { n: "적 구축함", hp: 80, asm: 8, sam: 14 },
  foeFF: { n: "적 호위함", hp: 60, asm: 6, sam: 8 },
  foeFAC: { n: "적 유도탄정", hp: 30, asm: 4, sam: 0 },
};
const MISS = { strike: "타격", hold: "방어", scout: "정찰" };
const SUP = { cap: { n: "공군 CAP", c: 2, d: "반경 15km 아군 요격률 +20%" }, battery: { n: "해안 지대함 포대", c: 2, d: "사거리 48km, 2분마다 2발" }, p3c: { n: "P-3C 초계 정찰", c: 1, d: "반경 30km 적 위치 공개" }, sub: { n: "잠수함 매복", c: 1, d: "반경 8km 첫 통과 적함에 어뢰" } };

/* 항공 작전 (항공 병과): 지도에서 항공 편대에 임무를 주고 출격·체공·귀환·재무장을 관리한다 */
const AIRBASE = { x: 131, y: 58, n: "서산 공군기지" };
const AIR_T = {
  fighter: { n: "전투기", sp: 0.5, det: 25, fuel: 700, asm: 4, jobs: ["cap", "strike", "escort"], re: 150 },
  mpa: { n: "해상초계기", sp: 0.3, det: 45, fuel: 1500, asm: 0, jobs: ["patrol"], re: 180 },
  helo: { n: "해상작전헬기", sp: 0.12, det: 22, fuel: 700, asm: 2, jobs: ["patrol", "strike"], re: 90 },
  tanker: { n: "공중급유기", sp: 0.35, det: 0, fuel: 1800, asm: 0, jobs: ["refuel"], re: 200 },
  transport: { n: "대형수송기", sp: 0.3, det: 0, fuel: 1200, asm: 0, jobs: ["airlift"], re: 240 },
};
const JOB = {
  cap: ["초계 요격(CAP)", "지정 지점 상공에서 적기를 요격하고, 반경 20km 아군 함정의 미사일 요격률 +25%"],
  strike: ["대함 타격", "탐지된 적 전단을 우클릭 — 접근해 공대함 미사일 발사 후 귀환 (적 대공망 위험)"],
  escort: ["호위", "아군 항공기를 우클릭 — 따라다니며 적기를 막고 타격 시 피격 위험을 줄임"],
  patrol: ["초계 정찰", "지정 지점 상공을 돌며 넓은 반경의 적을 탐지"],
  refuel: ["공중급유", "지정 지점 상공 반경 20km 안의 아군기 연료 보충"],
  airlift: ["연평도 긴급 공수", "연평도에 해병 지대함 유도탄 반을 공수 — 도착 40초 후 섬에서 미사일 사격 시작"],
};
const YEONPYEONG = { x: 86, y: 30 };
const air = (id, t, name) => ({ id, t, name, n: AIR_T[t].n, st: "ready", job: AIR_T[t].jobs[0], pt: null, tgt: null, follow: null, fuel: AIR_T[t].fuel, asm: AIR_T[t].asm, cd: 0, x: AIRBASE.x, y: AIRBASE.y, path: [] });
function airForces(grade) {
  const a = [air("a1", "fighter", "제1 전투비행대 (KF-21)"), air("a2", "fighter", "제2 전투비행대 (F-15K)"), air("a3", "mpa", "해상초계기 (P-8A)"), air("a4", "helo", "해상작전헬기 (MH-60R)")];
  if (grade >= 3) a.push(air("a5", "tanker", "공중급유기 (KC-330)"));
  if (grade >= 4) a.push(air("a6", "transport", "대형수송기 (C-390)"));
  if (grade >= 6) a.push(air("a7", "fighter", "제3 전투비행대 (KF-21)"));
  for (const u of a) u.job = u.t === "fighter" ? (u.id === "a2" ? "strike" : "cap") : u.job;
  return a;
}
const airborne = (u) => u.st === "out" || u.st === "station" || u.st === "rtb";

const S = { on: false };
const $ = (s) => document.querySelector(s);
const ship = (t, name) => ({ t, name, n: SHIP_T[t].n, hp: SHIP_T[t].hp, max: SHIP_T[t].hp, asm: SHIP_T[t].asm, sam: SHIP_T[t].sam });
const alive = (g) => g.ships.filter((s) => s.hp > 0);
const strength = (g) => alive(g).reduce((a, s) => a + s.hp, 0) / g.ships.reduce((a, s) => a + s.max, 0);
const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtT = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function forces(grade) {
  const us = [{ id: "u1", name: "제1전단", x: 116, y: 86, ships: [ship("aegis", "정조대왕함"), ship("ffg", "대구함")], mission: "strike", path: [] }];
  if (grade >= 3) us.push({ id: "u2", name: "제2전단", x: 106, y: 90, ships: [ship("ddh", "충무공이순신함"), ship("ffg", "경기함"), ship("pkg", "윤영하함")], mission: "hold", path: [] });
  if (grade >= 6) us.push({ id: "u3", name: "제3전단", x: 122, y: 76, ships: [ship("ddh", "왕건함"), ship("ffg", "서울함")], mission: "scout", path: [] });
  const foe = [
    { id: "f1", name: "적 제1전단", x: 46, y: 8, ships: [ship("foeDD", "최현"), ship("foeFF", "적 호위함 1")], path: [{ x: 60, y: 30 }, { x: GOAL.x, y: GOAL.y }], seen: false },
    { id: "f2", name: "적 제2전단", x: 96, y: 6, ships: [ship("foeFF", "적 호위함 2"), ship("foeFAC", "적 유도탄정 1"), ship("foeFAC", "적 유도탄정 2")], path: [{ x: 94, y: 24 }, { x: GOAL.x + 4, y: GOAL.y }], seen: false, delay: 150 },
  ];
  if (grade >= 4) foe.push({ id: "f3", name: "적 제3전단", x: 20, y: 18, ships: [ship("foeDD", "강건"), ship("foeFF", "적 호위함 3")], path: [{ x: 40, y: 44 }, { x: 70, y: 46 }, { x: GOAL.x, y: GOAL.y }], seen: false, delay: 300 });
  for (const g of [...us, ...foe]) { g.side = us.includes(g) ? "us" : "foe"; g.fireT = 30; g.home = { x: g.x, y: g.y }; }
  return { us, foe };
}

/** ctx: { grade, branch, ops (작전 병과: +2 support points, specific staff advice), mods: {outK, inK, icptK}, onDone(res) } */
export function openOpMap(ctx) {
  const F = forces(ctx.grade), isAir = !!ctx.air;
  if (isAir) { /* 항공 작전: 함정은 소규모 초계전단 하나만 자동 방어 — 항공 지원 없이는 버티기 어렵다 */
    const g = { id: "u1", name: "초계전단", x: 116, y: 86, ships: [ship("ffg", "대구함"), ship("pkg", "윤영하함")], mission: "hold", path: [{ x: 82, y: 46 }], side: "us", fireT: 30 }; g.home = { x: g.x, y: g.y }; F.us = [g]; }
  const A = isAir ? airForces(ctx.grade) : [];
  Object.assign(S, { on: true, ctx, air: A, isAir, raids: [], isleBat: null, airLost: 0, sorties: 0, us: F.us, foe: F.foe, t: 0, run: false, speed: 1, paused: false, sel: isAir ? A[0] : F.us[0], phase: "plan",
    pts: isAir ? 0 : 6 + (ctx.ops ? 2 : 0), sup: [], place: null, msl: [], fx: [], log: [], evt: null, evtDone: {}, evade: 0, preempt: 0, decoy: { x: 58, y: 40, gone: false },
    shots: 0, hits: 0, inside: {}, result: null });
  build(); S.brief = true; say(`작전 개시 전입니다. 왼쪽 '작전 순서'를 따라 계획을 세우십시오.`);
  let last = performance.now();
  const loop = (now) => { if (!S.on) return; const dt = Math.min(0.1, (now - last) / 1000); last = now; if (S.phase === "run" && !S.paused && !S.evt) for (let k = 0; k < S.speed; k++) step(dt * 30); draw(); panel(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
export const opMapOn = () => S.on;
/** test hook: the live operation state */
export const opMapState = () => S;
export const opMapAir = { setAirPoint: (p) => setAirPoint(p), launch: (u) => launch(u) };
/** test hook: run the operation forward by game seconds without waiting for frames */
export function opMapAdvance(sec) { if (S.phase !== "run") return; for (let t = 0; t < sec && S.phase === "run"; t += 1) { if (S.evt) resolveEvent(S.evt.a[0]); step(1); } S.dirty = true; }

function say(t, cls = "") { S.log.unshift({ t, cls, at: S.t }); if (S.log.length > 7) S.log.pop(); S.logDirty = true; }

function build() {
  let el = $("#opMap"); if (!el) { el = document.createElement("div"); el.id = "opMap"; document.body.append(el); }
  el.innerHTML = `<div class="om-top"><b>STEEL TIDE</b><span class="om-t">${S.isAir ? "항공 작전 · 서해 항공 지원" : "작전 지휘 · 서해 해상 차단 작전"}</span><span id="omClock"></span><div class="om-spd"><button data-om="pause">⏸</button><button data-om="s1" class="on">x1</button><button data-om="s2">x2</button><button data-om="s4">x4</button></div><button data-om="quit" class="om-quit">작전 중단</button></div>`
    + `<div class="om-b"><div class="om-side" id="omSide"></div><div class="om-mapw"><canvas id="omCv"></canvas><div class="om-hint">${S.isAir ? "좌클릭: 편대 선택 · 우클릭: 임무 지점 / 타격 목표 / 호위 대상 지정 · Space: 일시정지" : "좌클릭: 전단 선택 · 우클릭: 경로점 추가 (Shift 없이 누르면 경로 새로 그림, Shift: 이어 그림) · Space: 일시정지"}</div><div id="omEvt"></div><div id="omRes"></div><div id="omBrief"></div></div></div>`;
  el.style.display = "flex";
  const cv = $("#omCv"); const fit = () => { const r = cv.parentElement.getBoundingClientRect(); cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio; cv.style.width = r.width + "px"; cv.style.height = r.height + "px"; };
  fit(); S.fit = fit; addEventListener("resize", fit);
  cv.oncontextmenu = (e) => e.preventDefault();
  cv.onmousedown = (e) => { const p = toMap(e);
    if (S.isAir) { if (e.button === 2) { setAirPoint(p); return; } if (e.button !== 0) return; const u = S.air.filter((a) => a.st !== "lost").sort((a, b) => d2(a, p) - d2(b, p))[0]; if (u && d2(u, p) < 5) S.sel = u; S.dirty = true; return; }
    if (e.button === 2) { addWaypoint(p, e.shiftKey); return; } if (e.button !== 0) return; if (S.place) { placeSupport(p); return; } const g = S.us.find((u) => alive(u).length && d2(u, p) < 4.5); if (g) S.sel = g; };
  el.onclick = onClick;
  S.key = (e) => { if (!S.on) return; if (e.code === "Space") { e.preventDefault(); e.stopImmediatePropagation(); if (S.phase === "run") S.paused = !S.paused; } if (e.code === "Escape" && S.place) S.place = null; };
  addEventListener("keydown", S.key, true);
}
function close() { S.on = false; removeEventListener("keydown", S.key, true); removeEventListener("resize", S.fit); const el = $("#opMap"); if (el) el.style.display = "none"; }

function view() { const cv = $("#omCv"), k = Math.min(cv.width / W, cv.height / H), ox = (cv.width - W * k) / 2, oy = (cv.height - H * k) / 2; return { k, ox, oy }; }
function toMap(e) { const cv = $("#omCv"), r = cv.getBoundingClientRect(), { k, ox, oy } = view(); return { x: ((e.clientX - r.left) * devicePixelRatio - ox) / k, y: ((e.clientY - r.top) * devicePixelRatio - oy) / k }; }
function inLand(p) { if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) return true; return LAND.some((poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) c = !c; } return c; }) || ISLES.some(([, x, y, r]) => Math.hypot(p.x - x, p.y - y) < r + 0.6); }

function addWaypoint(p, append) {
  const g = S.sel; if (!g || !alive(g).length) return; if (inLand(p)) { say("육지에는 경로점을 둘 수 없습니다.", "bad"); return; }
  if (!append) g.path = []; if (g.path.length < 6) g.path.push(p);
}
function placeSupport(p) {
  const k = S.place; S.place = null; if (!k) return;
  if (inLand(p) && k !== "battery") { say("해상에만 배치할 수 있습니다.", "bad"); return; }
  if (S.pts < SUP[k].c) { say("지원 포인트가 부족합니다.", "bad"); return; }
  S.pts -= SUP[k].c; S.sup.push({ k, x: p.x, y: p.y, used: false }); say(`${SUP[k].n} 배치 완료.`);
}

function onClick(e) {
  const b = e.target.closest("[data-om]"); if (!b) return; const a = b.dataset.om;
  if (a === "pause") S.paused = !S.paused;
  else if (a[0] === "s" && a.length === 2) { S.speed = +a[1]; for (const x of document.querySelectorAll(".om-spd button")) x.classList.toggle("on", x.dataset.om === a); }
  else if (a === "quit") { if (S.phase === "end") return; finish(false, "작전 중단 — 철수"); }
  else if (a.startsWith("mis:")) { if (S.sel) S.sel.mission = a.slice(4); }
  else if (a.startsWith("job:")) { const u = S.sel; if (u && u.t) { u.job = a.slice(4); u.pt = null; u.tgt = null; u.follow = null; if (u.job === "airlift") u.pt = { ...YEONPYEONG }; } }
  else if (a.startsWith("asel:")) S.sel = S.air.find((u) => u.id === a.slice(5)) || S.sel;
  else if (a === "rtb") { const u = S.sel; if (u && u.t && airborne(u)) { u.st = "rtb"; say(`${u.name} 귀환 지시.`); } }
  else if (a === "aclr") { const u = S.sel; if (u && u.t) { u.pt = null; u.tgt = null; u.follow = null; } }
  else if (a === "clr") { if (S.sel) S.sel.path = []; }
  else if (a.startsWith("sel:")) S.sel = S.us.find((g) => g.id === a.slice(4)) || S.sel;
  else if (a.startsWith("sup:")) { const k = a.slice(4); if (k === "battery") { if (S.sup.some((s) => s.k === "battery")) return; if (S.pts < SUP.battery.c) { say("지원 포인트가 부족합니다.", "bad"); return; } S.pts -= SUP.battery.c; S.sup.push({ k, x: BATTERY.x, y: BATTERY.y, cd: 60 }); say("해안 지대함 포대 대기."); } else S.place = k; }
  else if (a.startsWith("unsup:")) { const i = +a.slice(6), s = S.sup[i]; if (s && S.phase === "plan") { S.pts += SUP[s.k].c; S.sup.splice(i, 1); } }
  else if (a === "go") { if (S.isAir) { S.phase = "run"; say(`작전 개시! 임무가 지정된 편대 출격 (${S.air.filter(hasOrder).length}개).`, "hit"); } else { if (!S.us.some((g) => g.path.length) && !confirmNoPath()) return; S.phase = "run"; say("작전 개시! 전 전단 기동.", "hit"); } }
  else if (a.startsWith("evt:")) resolveEvent(a.slice(4));
  else if (a === "done") { const r = S.result; close(); S.ctx.onDone?.(r); }
  else if (a === "brief") S.brief = false;
  else if (a === "rebrief") S.brief = true;
  S.dirty = true;
}
const confirmNoPath = () => { say("경로가 없는 전단은 제자리에서 임무를 수행합니다."); return true; };

// ── simulation (game seconds) ────────────────────────────────────────────
function moveTo(g, p, dt, v) { const dx = p.x - g.x, dy = p.y - g.y, L = Math.hypot(dx, dy); if (L < 0.3) return true; const s = Math.min(L, v * dt); const nx = g.x + (dx / L) * s, ny = g.y + (dy / L) * s; if (!inLand({ x: nx, y: ny })) { g.x = nx; g.y = ny; } else { g.x += (-dy / L) * s; g.y += (dx / L) * s; } return L < 0.6; }
const SPD = 0.035; /* km per game second on the compressed chart: an unopposed enemy reaches the goal in about 20 minutes */
const LIMIT = 1800; /* 30:00 */
function detR(g) { return g.side === "us" ? (g.mission === "scout" ? 52 : 36) : 30; }
function seenFoe(f) { if (S.us.some((u) => alive(u).length && d2(u, f) < detR(u))) return true; if (S.air?.some((u) => airborne(u) && AIR_T[u.t].det && d2(u, f) < AIR_T[u.t].det)) return true; return S.sup.some((s) => s.k === "p3c" && d2(s, f) < 30); }

// ── air (항공 작전) ──
const hasOrder = (u) => u.st !== "lost" && (u.job === "strike" ? !!u.tgt : u.job === "escort" ? !!u.follow : !!u.pt);
const airHome = (u) => (u.t === "helo" && S.us[0] && alive(S.us[0]).length ? S.us[0] : AIRBASE);
function setAirPoint(p) {
  const u = S.sel; if (!u || !u.t || u.st === "lost") return;
  if (u.job === "strike") { const f = S.foe.filter((g) => g.seen && alive(g).length && !g.gone).sort((a, b) => d2(a, p) - d2(b, p))[0]; if (!f || d2(f, p) > 8) { say("타격 목표는 탐지된 적 전단(빨간 삼각형)을 우클릭하세요.", "bad"); return; } u.tgt = f; say(`${u.name} — 타격 목표 ${f.name}`); }
  else if (u.job === "escort") { const o = S.air.filter((a) => a !== u && a.st !== "lost").sort((a, b) => d2(a, p) - d2(b, p))[0]; if (!o || d2(o, p) > 8) { say("호위할 아군 항공기를 우클릭하세요.", "bad"); return; } u.follow = o; say(`${u.name} — ${o.name} 호위`); }
  else if (u.job === "airlift") { u.pt = { ...YEONPYEONG }; }
  else u.pt = { x: clamp(p.x, 0, W), y: clamp(p.y, 0, H) };
  if (S.phase === "run" && u.st === "ready") launch(u); S.dirty = true;
}
function launch(u) { const h = airHome(u); u.x = h.x; u.y = h.y; u.st = "out"; S.sorties++; say(`${u.name} 출격.`, "hit"); }
function moveAir(u, p, dt) { const dx = p.x - u.x, dy = p.y - u.y, L = Math.hypot(dx, dy), s = Math.min(L, AIR_T[u.t].sp * dt); if (L > 0.01) { u.x += (dx / L) * s; u.y += (dy / L) * s; } return L < 1; }
function loseAir(u, why) { u.st = "lost"; S.airLost++; S.fx.push({ x: u.x, y: u.y, t: 0, c: "#ff6b5e", big: true }); say(`${u.name} ${why}`, "bad"); }
function airStep(dt) {
  for (const u of S.air) {
    const T = AIR_T[u.t];
    if (u.st === "lost") continue;
    if (u.st === "rearm") { u.cd -= dt; if (u.cd <= 0) { u.st = "ready"; u.fuel = T.fuel; u.asm = T.asm; say(`${u.name} 재무장·급유 완료.`); } continue; }
    if (u.st === "ready") { if (hasOrder(u) && (u.job !== "strike" || (u.tgt && alive(u.tgt).length && !u.tgt.gone))) launch(u); else { const h = airHome(u); u.x = h.x; u.y = h.y; } continue; }
    u.fuel -= dt;
    if (u.t !== "tanker" && S.air.some((k) => k.t === "tanker" && k.st === "station" && d2(k, u) < 20)) u.fuel = Math.min(T.fuel, u.fuel + dt * 3);
    const home = airHome(u);
    if (u.st !== "rtb" && u.fuel < d2(u, home) / T.sp + 40) { u.st = "rtb"; say(`${u.name} 연료 부족 — 귀환.`); }
    if (u.st === "rtb") { if (moveAir(u, home, dt)) { u.st = "rearm"; u.cd = T.re; u.pt = u.job === "strike" ? null : u.pt; if (u.job === "strike") u.tgt = null; say(`${u.name} 착륙 — 재무장 ${Math.round(T.re / 60 * 10) / 10}분.`); } continue; }
    if (u.job === "strike") {
      const f = u.tgt; if (!f || !alive(f).length || f.gone) { u.st = "rtb"; continue; }
      const rng = u.t === "helo" ? 10 : 15;
      if (d2(u, f) > rng) { moveAir(u, f, dt); continue; }
      if (u.asm > 0) {
        for (let i = 0; i < u.asm; i++) S.msl.push({ x: u.x, y: u.y, to: f, from: u, side: "us", t: 0, T: 25 + Math.random() * 10 }); S.shots += u.asm; say(`${u.name} 공대함 미사일 ${u.asm}발 발사 → ${f.name}`, "hit"); u.asm = 0;
        const sam = alive(f).reduce((a, s) => a + s.sam, 0), esc = S.air.some((e) => e.job === "escort" && e.follow === u && airborne(e) && d2(e, u) < 15);
        if (sam > 0 && Math.random() < (u.t === "helo" ? 0.2 : 0.1) * (esc ? 0.4 : 1)) { loseAir(u, "적 대공미사일에 피격 — 격추"); continue; }
      }
      u.st = "rtb"; continue;
    }
    if (u.job === "escort") { const o = u.follow; if (!o || !airborne(o)) { u.st = "rtb"; continue; } moveAir(u, { x: o.x + 2, y: o.y + 2 }, dt); u.st = "out"; continue; }
    if (!u.pt) { u.st = "rtb"; continue; }
    if (u.st === "out") { if (moveAir(u, u.pt, dt)) { u.st = "station"; say(`${u.name} ${u.job === "airlift" ? "연평도 도착 — 하역 개시" : "임무 지점 도착"}.`); u.drop = 0; } continue; }
    if (u.job === "airlift") { u.drop += dt; if (u.drop >= 40) { S.isleBat = { x: YEONPYEONG.x, y: YEONPYEONG.y, cd: 10 }; say("연평도 해병 지대함 유도탄 반 전개 완료 — 사거리 28km.", "hit"); u.pt = null; u.st = "rtb"; } continue; }
    const a = (S.t * 0.05 + u.id.charCodeAt(1)) % (Math.PI * 2); u.x = u.pt.x + Math.cos(a) * 2.5; u.y = u.pt.y + Math.sin(a) * 2.5;
  }
  if (S.isleBat) { const b = S.isleBat; b.cd -= dt; if (b.cd <= 0) { const t = nearest(b, S.foe.filter((f) => f.seen && !f.gone)); if (t && t.d < 28) { for (let i = 0; i < 2; i++) S.msl.push({ x: b.x, y: b.y, to: t.g, from: b, side: "us", t: 0, T: 40 }); S.shots += 2; b.cd = 90; say("연평도 지대함 유도탄 2발 발사.", "hit"); } else b.cd = 10; } }
  raidStep(dt);
}
const RAIDS = [480, 1080];
function raidStep(dt) {
  for (const at of RAIDS) if (S.t >= at && !S.raids.some((r) => r.at === at)) { S.raids.push({ at, x: 50 + Math.random() * 50, y: -3, alive: true, tried: new Set(), n: "적 전투기 편대 (MiG-29)" }); say("적 전투기 편대 남하 — 방공 레이더 포착!", "bad"); }
  for (const r of S.raids) {
    if (!r.alive) continue;
    const prey = S.air.filter((u) => airborne(u) && u.t !== "fighter").sort((a, b) => d2(a, r) - d2(b, r))[0];
    const tgt = prey && d2(prey, r) < 80 ? prey : nearest(r, S.us)?.g;
    if (!tgt) { r.y -= 0.45 * dt; if (r.y < -8) r.alive = false; continue; }
    for (const f of S.air) if (f.t === "fighter" && airborne(f) && f.st !== "rtb" && !r.tried.has(f.id) && d2(f, r) < 25) {
      r.tried.add(f.id); const p = 0.7 + (S.air.filter((o) => o.t === "fighter" && airborne(o) && d2(o, r) < 25).length > 1 ? 0.1 : 0);
      if (Math.random() < p) { r.alive = false; S.fx.push({ x: r.x, y: r.y, t: 0, c: "#7cc4ff", big: true }); say(`${f.name} — 적 전투기 편대 요격 성공!`, "hit"); break; }
      if (Math.random() < 0.3) loseAir(f, "공중전에서 피격 — 격추"); else say(`${f.name} 요격 실패 — 적기 계속 남하`, "bad");
    }
    if (!r.alive) continue;
    const dx = tgt.x - r.x, dy = tgt.y - r.y, L = Math.hypot(dx, dy), s = Math.min(L, 0.45 * dt); r.x += (dx / (L || 1)) * s; r.y += (dy / (L || 1)) * s;
    if (tgt.t && L < 3) { loseAir(tgt, "적 전투기에 격추"); r.alive = false; }
    else if (!tgt.t && L < 20) { for (let i = 0; i < 4; i++) S.msl.push({ x: r.x, y: r.y, to: tgt, from: r, side: "foe", t: 0, T: 35 }); say(`적 전투기 편대 대함미사일 4발 발사 → ${tgt.name}`, "bad"); r.alive = false; }
  }
}

function step(dt) {
  S.t += dt; S.evade = Math.max(0, S.evade - dt);
  for (const f of S.foe) { const v = alive(f).length > 0; const was = f.seen; f.seen = v && seenFoe(f); if (f.seen && !was) say(`${f.name} 탐지 — ${alive(f).map((s) => s.n).join(", ")}`, "bad"); }
  if (!S.decoy.gone && S.us.some((u) => d2(u, S.decoy) < detR(u) * 0.8)) { S.decoy.gone = true; say("미확인 접촉 확인 결과 — 기만체(허위 표적)로 판명.", "hit"); }
  for (const g of S.us) { if (!alive(g).length) continue; usMove(g, dt); }
  for (const f of S.foe) { if (!alive(f).length || (f.delay && S.t < f.delay)) continue; foeMove(f, dt); }
  if (S.isAir) airStep(dt);
  combat(dt); support(dt); missiles(dt); events(); judge();
}
function nearest(g, list) { let b = null, d = Infinity; for (const o of list) { if (!alive(o).length) continue; const dd = d2(g, o); if (dd < d) { d = dd; b = o; } } return b ? { g: b, d } : null; }
function usMove(g, dt) {
  const v = SPD * (S.evade > 0 ? 0.7 : 1), t = nearest(g, S.foe.filter((f) => f.seen && !f.gone));
  if (g.mission === "scout" && t && t.d < 26) { moveTo(g, g.home, dt, v); return; }
  if (g.mission === "strike" && t && t.d < 48) { if (t.d > 24) moveTo(g, t.g, dt, v); return; }
  if (g.path.length) { if (moveTo(g, g.path[0], dt, v)) g.path.shift(); }
}
function foeMove(f, dt) {
  if (f.gone) return; const t = nearest(f, S.us);
  if (strength(f) < 0.3) { if (!f.retreat) { f.retreat = true; say(`${f.name} 퇴각 개시`, "hit"); } if (moveTo(f, { x: f.home.x, y: -6 }, dt, SPD)) f.gone = true; return; }
  if (t && t.d < 24) return; /* hold and shoot */
  if (f.path.length) { if (moveTo(f, f.path[0], dt, SPD * 0.9)) f.path.shift(); }
}
function salvo(from, to) {
  const n = Math.min(alive(from).reduce((a, s) => a + (s.asm > 0 ? 1 : 0), 0) * 2 + (from.side === "us" && S.preempt > 0 ? 2 : 0), 8); let shot = 0;
  for (const s of alive(from)) for (let k = 0; k < 2 && shot < n; k++) if (s.asm > 0) { s.asm--; shot++; }
  if (from.side === "us" && S.preempt > 0 && shot) { S.preempt--; shot += 2; }
  if (!shot) return;
  if (from.side === "us") S.shots += shot;
  for (let i = 0; i < shot; i++) S.msl.push({ x: from.x + (Math.random() - 0.5) * 2, y: from.y + (Math.random() - 0.5) * 2, to, from, side: from.side, t: 0, T: 40 + Math.random() * 20 });
}
function combat(dt) {
  for (const a of [...S.us, ...S.foe]) {
    if (!alive(a).length || a.gone || (a.delay && S.t < a.delay)) continue;
    a.fireT -= dt; if (a.fireT > 0) continue;
    const pool = a.side === "us" ? S.foe.filter((f) => f.seen && !f.gone) : S.us; const t = nearest(a, pool);
    if (t && t.d < 30) { salvo(a, t.g); a.fireT = 75; } else a.fireT = 10;
  }
}
function missiles(dt) {
  for (let i = S.msl.length - 1; i >= 0; i--) {
    const m = S.msl[i]; m.t += dt; const k = Math.min(1, dt / Math.max(1, m.T - m.t + dt)); m.x += (m.to.x - m.x) * k; m.y += (m.to.y - m.y) * k;
    if (m.t < m.T) continue; S.msl.splice(i, 1);
    const tgt = m.to, live = alive(tgt); if (!live.length) continue;
    const sam = live.reduce((a, s) => a + s.sam, 0), capOn = tgt.side === "us" && (S.sup.some((s) => s.k === "cap" && d2(s, tgt) < 15) || S.air.some((u) => u.job === "cap" && u.st === "station" && d2(u, tgt) < 20));
    let p = clamp(0.25 + sam / (live.length * 60), 0.15, 0.78) * (tgt.side === "us" ? (S.ctx.mods.icptK || 1) * (capOn ? 1.2 : 1) : 1);
    if (sam > 0) { const sh = live.find((s) => s.sam > 0); sh.sam = Math.max(0, sh.sam - 2); } else p = 0;
    if (Math.random() < clamp(p, 0, 0.9)) { S.fx.push({ x: tgt.x, y: tgt.y, t: 0, c: "#7cc4ff" }); continue; }
    const s = live[(Math.random() * live.length) | 0], dmg = 34 * (m.side === "us" ? S.ctx.mods.outK || 1 : (S.ctx.mods.inK || 1) * (S.evade > 0 ? 0.7 : 1));
    s.hp = Math.max(0, s.hp - dmg); if (m.side === "us") S.hits++;
    S.fx.push({ x: tgt.x, y: tgt.y, t: 0, c: "#ff6b5e", big: true });
    if (s.hp <= 0) say(`${s.name}${m.side === "us" ? " 격침!" : " 피격 침몰"}`, m.side === "us" ? "hit" : "bad");
  }
  for (let i = S.fx.length - 1; i >= 0; i--) { S.fx[i].t += dt; if (S.fx[i].t > 25) S.fx.splice(i, 1); }
}
function support(dt) {
  for (const s of S.sup) {
    if (s.k === "battery") { s.cd -= dt; if (s.cd > 0) continue; const t = nearest(s, S.foe.filter((f) => f.seen && !f.gone)); if (t && t.d < BATTERY.range) { for (let i = 0; i < 2; i++) S.msl.push({ x: s.x, y: s.y, to: t.g, from: s, side: "us", t: 0, T: 60 }); S.shots += 2; s.cd = 120; say("해안 포대 2발 발사.", "hit"); } else s.cd = 15; }
    if (s.k === "sub" && !s.used) { const t = S.foe.find((f) => alive(f).length && !(f.delay && S.t < f.delay) && d2(f, s) < 8); if (t) { s.used = true; const v = alive(t)[0]; v.hp = Math.max(0, v.hp - 60); S.hits++; S.fx.push({ x: t.x, y: t.y, t: 0, c: "#ff6b5e", big: true }); say(`잠수함 매복 성공 — ${v.name} 어뢰 명중${v.hp <= 0 ? ", 격침" : ""}`, "hit"); } }
  }
}
const EVENTS = [
  { at: 360, id: "reinf", t: "적 증원 전단 접근 징후 (정보처 보고)", a: ["reserve", "예비 고속정 편대 투입", "지원 포인트 1 사용 · 고속함 2척 합류"], b: ["hold", "현 전력 유지", "포인트 보존"] },
  { at: 840, id: "salvo", t: "적 대함미사일 일제 사격 징후", a: ["evade", "회피 기동", "5분간 받는 피해 −30%, 속도 −30%"], b: ["preempt", "선제 타격", "다음 사격 2발 추가"] },
];
const AIR_EVENTS = [
  { at: 420, id: "scramble", t: "적 전투기 출격 징후 (정보처 보고)", a: ["scramble", "비상대기 전투기 긴급 출격", "예비 전투기 편대(FA-50) 1개 합류"], b: ["hold", "현 편성 유지", "—"] },
  EVENTS[1],
];
function events() { for (const e of S.isAir ? AIR_EVENTS : EVENTS) if (!S.evtDone[e.id] && S.t >= e.at) { S.evtDone[e.id] = true; S.evt = e; S.dirty = true; return; } }
function resolveEvent(k) {
  const e = S.evt; if (!e) return; S.evt = null;
  if (k === "reserve") { if (S.pts >= 1) { S.pts--; const g = { id: "u9", name: "예비 고속정 편대", x: 120, y: 86, ships: [ship("pkg", "고속함 1"), ship("pkg", "고속함 2")], mission: "strike", path: [], side: "us", fireT: 30 }; g.home = { x: g.x, y: g.y }; S.us.push(g); say("예비 고속정 편대 합류.", "hit"); } else say("지원 포인트가 없어 투입하지 못했습니다.", "bad"); }
  if (k === "scramble") { const u = air("a9", "fighter", "비상대기 편대 (FA-50)"); u.asm = 2; u.job = "cap"; u.pt = { x: 84, y: 40 }; S.air.push(u); launch(u); }
  if (k === "evade") { S.evade = 300; say("전 전단 회피 기동.", "hit"); }
  if (k === "preempt") { S.preempt = 2; say("선제 타격 준비 — 다음 사격 증강.", "hit"); }
}
function judge() {
  if (S.phase !== "run") return;
  for (const f of S.foe) { if (!alive(f).length || f.gone) continue; const inG = d2(f, GOAL) < GOAL.r; S.inside[f.id] = inG ? (S.inside[f.id] || 0) + 1 : 0; if (S.inside[f.id] > 4) return finish(false, `${f.name} ${GOAL.n} 돌파 — 차단 실패`); }
  if (!S.us.some((g) => alive(g).length)) return finish(false, "아군 전단 전멸");
  if (S.foe.every((f) => !alive(f).length || f.gone)) return finish(true, "적 전단 격멸·퇴각 — 해상 차단 성공");
  if (S.t >= LIMIT) return finish(true, "작전 시간 종료 — 연평 해역 방어 성공");
}
function finish(won, why) {
  S.phase = "end"; S.paused = false;
  const all = S.us.flatMap((g) => g.ships), foes = S.foe.flatMap((f) => f.ships);
  const r = { won, why, secs: Math.max(1, Math.round(S.t)), shots: Math.min(5000, S.shots), hits: Math.min(S.hits, S.shots, 5000), hp: all.reduce((a, s) => a + s.hp, 0) / all.reduce((a, s) => a + s.max, 0), sunk: foes.filter((s) => s.hp <= 0).length, foes: foes.length, lost: all.filter((s) => s.hp <= 0).length + (S.airLost || 0), allies: all.length + (S.air?.length || 0), jetsOut: S.isAir ? S.sorties : S.sup.some((s) => s.k === "cap") ? 2 : 0, airLost: S.airLost || 0, sorties: S.sorties || 0 };
  r.stars = won ? 1 + (r.lost === 0 ? 1 : 0) + (S.foe.every((f) => !alive(f).length || f.gone) ? 1 : 0) : 0; S.result = r;
  $("#omRes").innerHTML = `<div class="om-res"><div class="om-rt ${won ? "w" : "l"}">${won ? "작전 성공" : "작전 실패"}</div><div class="om-st">${"★".repeat(r.stars)}${"☆".repeat(3 - r.stars)}</div><div class="om-rw">${why}</div><div class="om-sx"><span class="${won ? "ok" : ""}">★ 연평 해역 방어</span><span class="${r.lost === 0 && won ? "ok" : ""}">★ 아군 손실 0</span><span class="${won && S.foe.every((f) => !alive(f).length || f.gone) ? "ok" : ""}">★ 적 전단 전부 격퇴</span></div><div class="om-rg"><span>작전 시간</span><b>${fmtT(r.secs)}</b><span>적함 격침</span><b>${r.sunk} / ${r.foes}척</b><span>아군 손실</span><b>${S.isAir ? `함정 ${r.lost - r.airLost} · 항공기 ${r.airLost}` : `${r.lost} / ${r.allies}척`}</b>${S.isAir ? `<span>출격 횟수</span><b>${r.sorties}회</b>` : ""}<span>미사일 발사 / 명중</span><b>${r.shots} / ${r.hits}</b><span>아군 잔존 전력</span><b>${Math.round(r.hp * 100)}%</b></div><button data-om="done">결과 보고 ›</button></div>`;
}

// ── drawing ───────────────────────────────────────────────────────────────
function draw() {
  const cv = $("#omCv"); if (!cv) return; const x = cv.getContext("2d"), { k, ox, oy } = view(), P = (px, py) => [ox + px * k, oy + py * k], dpr = devicePixelRatio;
  x.fillStyle = "#0a1822"; x.fillRect(0, 0, cv.width, cv.height);
  const sea = x.createRadialGradient(ox + W * k * 0.5, oy + H * k * 0.5, 10, ox + W * k * 0.5, oy + H * k * 0.5, W * k * 0.7); sea.addColorStop(0, "#173246"); sea.addColorStop(1, "#0c1d29"); x.fillStyle = sea; x.fillRect(ox, oy, W * k, H * k);
  x.strokeStyle = "rgba(120,180,200,.1)"; x.lineWidth = 1; for (let gx = 0; gx <= W; gx += 10) { x.beginPath(); x.moveTo(...P(gx, 0)); x.lineTo(...P(gx, H)); x.stroke(); } for (let gy = 0; gy <= H; gy += 10) { x.beginPath(); x.moveTo(...P(0, gy)); x.lineTo(...P(W, gy)); x.stroke(); }
  x.fillStyle = "#2c3b2f"; x.strokeStyle = "#5d7a5f"; x.lineWidth = 1.5 * dpr;
  for (const poly of LAND) { x.beginPath(); poly.forEach(([a, b], i) => (i ? x.lineTo(...P(a, b)) : x.moveTo(...P(a, b)))); x.closePath(); x.fill(); x.stroke(); }
  x.font = `${12 * dpr}px 'Noto Sans KR', sans-serif`;
  for (const [n, a, b, r] of ISLES) { x.beginPath(); x.arc(...P(a, b), r * k, 0, Math.PI * 2); x.fill(); x.stroke(); x.fillStyle = "#cfe7ea"; x.fillText(n, ...P(a + r + 1, b + 0.6)); x.fillStyle = "#2c3b2f"; }
  x.fillStyle = "rgba(200,230,240,.18)"; x.font = `bold ${44 * dpr}px 'Noto Sans KR', sans-serif`; x.fillText("서 해", ...P(14, 70));
  x.setLineDash([10 * dpr, 8 * dpr]); x.strokeStyle = "#ff6b5e"; x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(...P(18, LINE_Y)); x.lineTo(...P(122, LINE_Y)); x.stroke(); x.setLineDash([]);
  x.fillStyle = "#ff8a7a"; x.font = `${11 * dpr}px 'Noto Sans KR', sans-serif`; x.fillText("경계선 (가상)", ...P(100, LINE_Y - 1.4));
  x.strokeStyle = "#f2ca5c"; x.fillStyle = "rgba(242,202,92,.1)"; x.lineWidth = 2 * dpr; x.beginPath(); x.arc(...P(GOAL.x, GOAL.y), GOAL.r * k, 0, Math.PI * 2); x.fill(); x.stroke(); x.fillStyle = "#ffe7a0"; x.fillText(`방어 목표: ${GOAL.n}`, ...P(GOAL.x - 7, GOAL.y + GOAL.r + 3));
  for (const s of S.sup) {
    const c = { cap: "#4de8d4", battery: "#ff8c52", p3c: "#9be06a", sub: "#7cc4ff" }[s.k], r = { cap: 15, battery: BATTERY.range, p3c: 30, sub: 8 }[s.k];
    x.strokeStyle = c; x.setLineDash([4 * dpr, 5 * dpr]); x.lineWidth = 1.4 * dpr; x.beginPath(); x.arc(...P(s.x, s.y), r * k, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
    x.fillStyle = c; x.beginPath(); x.arc(...P(s.x, s.y), 4 * dpr, 0, Math.PI * 2); x.fill(); x.fillText(SUP[s.k].n + (s.k === "sub" && s.used ? " (사용)" : ""), ...P(s.x + 1.5, s.y - 1.5));
  }
  if (!S.decoy.gone) { x.strokeStyle = "#ff6b5e"; x.setLineDash([4 * dpr, 4 * dpr]); x.beginPath(); x.arc(...P(S.decoy.x, S.decoy.y), 4 * k, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); x.fillStyle = "#ff8a7a"; x.fillText("미확인 접촉 ?", ...P(S.decoy.x - 4, S.decoy.y + 0.5)); }
  for (const g of S.us) {
    if (!alive(g).length) continue; const sel = g === S.sel;
    if (g.path.length) { x.strokeStyle = sel ? "#4de8d4" : "rgba(124,196,255,.7)"; x.setLineDash([8 * dpr, 6 * dpr]); x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(...P(g.x, g.y)); for (const p of g.path) x.lineTo(...P(p.x, p.y)); x.stroke(); x.setLineDash([]); for (const p of g.path) { x.fillStyle = sel ? "#4de8d4" : "#7cc4ff"; x.beginPath(); x.arc(...P(p.x, p.y), 4 * dpr, 0, Math.PI * 2); x.fill(); } }
    x.strokeStyle = "rgba(77,232,212,.12)"; x.beginPath(); x.arc(...P(g.x, g.y), detR(g) * k, 0, Math.PI * 2); x.stroke();
    token(x, P(g.x, g.y), g.name.replace("제", "").replace("전단", "전단"), sel ? "#4de8d4" : "#7cc4ff", strength(g), dpr);
  }
  for (const f of S.foe) {
    if (!alive(f).length || f.gone || !f.seen || (f.delay && S.t < f.delay)) continue;
    const [a, b] = P(f.x, f.y); x.fillStyle = "#ff6b5e"; x.beginPath(); x.moveTo(a, b + 9 * dpr); x.lineTo(a - 10 * dpr, b - 7 * dpr); x.lineTo(a + 10 * dpr, b - 7 * dpr); x.closePath(); x.fill();
    x.fillStyle = "#ff8a7a"; x.fillText(`${f.name} ${Math.round(strength(f) * 100)}%`, a + 12 * dpr, b);
  }
  if (S.phase === "plan") for (const f of S.foe) { const pts = [f, ...f.path]; x.strokeStyle = "rgba(255,107,94,.55)"; x.setLineDash([3 * dpr, 6 * dpr]); x.lineWidth = 2 * dpr; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(...P(p.x, p.y)) : x.moveTo(...P(p.x, p.y)))); x.stroke(); x.setLineDash([]); const a = pts[pts.length - 2], b2 = pts[pts.length - 1], ang = Math.atan2(b2.y - a.y, b2.x - a.x), [ex, ey] = P(b2.x, b2.y); x.fillStyle = "rgba(255,107,94,.7)"; x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex - Math.cos(ang - 0.4) * 12 * dpr, ey - Math.sin(ang - 0.4) * 12 * dpr); x.lineTo(ex - Math.cos(ang + 0.4) * 12 * dpr, ey - Math.sin(ang + 0.4) * 12 * dpr); x.closePath(); x.fill(); const [sx, sy] = P(f.x, f.y); x.fillText(`${f.name} 예상 진로${f.delay ? ` (${Math.round(f.delay / 60)}분 후)` : ""}`, sx + 8 * dpr, sy - 4 * dpr); }
  if (S.isAir) drawAir(x, P, k, dpr);
  for (const m of S.msl) { x.fillStyle = m.side === "us" ? "#ffe066" : "#ff5a4e"; x.beginPath(); x.arc(...P(m.x, m.y), 2.2 * dpr, 0, Math.PI * 2); x.fill(); }
  for (const f of S.fx) { const u = f.t / 25; x.strokeStyle = f.c; x.globalAlpha = 1 - u; x.lineWidth = 2 * dpr; x.beginPath(); x.arc(...P(f.x, f.y), (f.big ? 3 : 1.6) * k * (0.3 + u), 0, Math.PI * 2); x.stroke(); x.globalAlpha = 1; }
  if (S.place) { x.fillStyle = "rgba(242,202,92,.9)"; x.font = `bold ${14 * dpr}px 'Noto Sans KR', sans-serif`; x.fillText(`${SUP[S.place].n} — 지도에서 배치할 곳을 클릭 (Esc 취소)`, ox + 16 * dpr, oy + 26 * dpr); }
  if (S.phase === "run" && S.paused) { x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = "#fff"; x.font = `bold ${28 * dpr}px 'Noto Sans KR', sans-serif`; x.fillText("일시정지", cv.width / 2 - 56 * dpr, cv.height / 2); }
}
function plane(x, [a, b], ang, c, dpr, sz = 1) {
  x.save(); x.translate(a, b); x.rotate(ang); x.scale(dpr * sz, dpr * sz); x.fillStyle = c; x.beginPath();
  x.moveTo(9, 0); x.lineTo(-2, -2); x.lineTo(-3, -9); x.lineTo(-6, -9); x.lineTo(-5, -2); x.lineTo(-8, -1.5); x.lineTo(-10, -5); x.lineTo(-11, -5); x.lineTo(-10, 0); x.lineTo(-11, 5); x.lineTo(-10, 5); x.lineTo(-8, 1.5); x.lineTo(-5, 2); x.lineTo(-6, 9); x.lineTo(-3, 9); x.lineTo(-2, 2); x.closePath(); x.fill(); x.restore();
}
function drawAir(x, P, k, dpr) {
  const [bx, by] = P(AIRBASE.x, AIRBASE.y); x.fillStyle = "#7cc4ff"; x.fillRect(bx - 7 * dpr, by - 2 * dpr, 14 * dpr, 4 * dpr); x.fillText(AIRBASE.n, bx - 30 * dpr, by + 16 * dpr);
  if (S.isleBat) { x.strokeStyle = "#ff8c52"; x.setLineDash([4 * dpr, 5 * dpr]); x.beginPath(); x.arc(...P(S.isleBat.x, S.isleBat.y), 28 * k, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); x.fillStyle = "#ff8c52"; x.fillText("연평도 지대함 유도탄", ...P(S.isleBat.x + 2, S.isleBat.y - 2.5)); }
  for (const u of S.air) {
    if (u.st === "lost") continue; const sel = u === S.sel, c = sel ? "#4de8d4" : u.t === "fighter" ? "#9fd8ff" : "#c9f59a";
    const dest = u.job === "strike" ? u.tgt : u.job === "escort" ? u.follow : u.pt;
    if (dest && (sel || airborne(u) || S.phase === "plan")) { x.strokeStyle = u.job === "strike" ? "rgba(255,200,90,.75)" : sel ? "rgba(77,232,212,.8)" : "rgba(160,210,255,.45)"; x.setLineDash([6 * dpr, 5 * dpr]); x.lineWidth = 1.6 * dpr; x.beginPath(); x.moveTo(...P(u.x, u.y)); x.lineTo(...P(dest.x, dest.y)); x.stroke(); x.setLineDash([]); if (u.pt) { x.strokeStyle = c; x.beginPath(); x.arc(...P(u.pt.x, u.pt.y), 2.5 * k, 0, Math.PI * 2); x.stroke(); } }
    if (!airborne(u)) continue;
    const T = AIR_T[u.t]; if (T.det && u.st === "station") { x.strokeStyle = "rgba(155,224,106,.25)"; x.beginPath(); x.arc(...P(u.x, u.y), T.det * k, 0, Math.PI * 2); x.stroke(); }
    if (u.t === "tanker" && u.st === "station") { x.strokeStyle = "rgba(255,224,102,.35)"; x.beginPath(); x.arc(...P(u.x, u.y), 20 * k, 0, Math.PI * 2); x.stroke(); }
    const d = dest && u.st !== "rtb" ? dest : airHome(u), ang = Math.atan2(d.y - u.y, d.x - u.x);
    plane(x, P(u.x, u.y), ang, c, dpr, u.t === "fighter" ? 0.9 : 1.2); x.fillStyle = c; x.fillText(`${u.name.split(" (")[0]} ${Math.round((u.fuel / T.fuel) * 100)}%`, ...P(u.x + 2, u.y - 2));
  }
  for (const r of S.raids) { if (!r.alive) continue; plane(x, P(r.x, r.y), Math.PI / 2, "#ff5a4e", dpr, 1); x.fillStyle = "#ff8a7a"; x.fillText(r.n, ...P(r.x + 2, r.y)); }
}
function token(x, [a, b], label, c, st, dpr) {
  const w = 54 * dpr, h = 24 * dpr; x.fillStyle = "#13324a"; x.strokeStyle = c; x.lineWidth = 2 * dpr; x.fillRect(a - w / 2, b - h / 2, w, h); x.strokeRect(a - w / 2, b - h / 2, w, h);
  x.fillStyle = "#e6fbff"; x.font = `bold ${11 * dpr}px 'Noto Sans KR', sans-serif`; x.textAlign = "center"; x.fillText(label, a, b + 4 * dpr); x.textAlign = "left";
  x.fillStyle = "#223"; x.fillRect(a - w / 2, b + h / 2 + 2 * dpr, w, 4 * dpr); x.fillStyle = st > 0.5 ? "#4de8d4" : st > 0.25 ? "#ffc857" : "#ff6b5e"; x.fillRect(a - w / 2, b + h / 2 + 2 * dpr, w * st, 4 * dpr);
}
function airAdvice() {
  const by = (t) => S.air.filter((u) => u.t === t && u.st !== "lost");
  if (S.phase === "plan" && !by("mpa").some(hasOrder)) return "항공작전과장: \"초계기를 경계선 남쪽(지도 가운데 위)에 띄우면 적 전단을 먼저 찾을 수 있습니다.\"";
  if (S.phase === "plan" && !by("fighter").some((u) => u.job === "cap" && u.pt)) return "항공작전과장: \"적 전투기가 내려올 겁니다. 전투기 1개 편대는 아군 전단 위에 CAP을 거십시오.\"";
  const raid = S.raids.find((r) => r.alive); if (raid) return "방공 통제관: \"적 전투기 편대 남하 중! CAP 편대가 없으면 초계기·급유기를 물리십시오(귀환 버튼).\"";
  const seen = S.foe.find((f) => f.seen && alive(f).length && !f.gone); const strikers = by("fighter").filter((u) => u.job === "strike");
  if (seen && !strikers.some((u) => u.tgt)) return `항공작전과장: "${seen.name} 위치가 확인됐습니다. 전투기 편대에 대함 타격을 지정해 목표를 우클릭하십시오."`;
  if (S.phase !== "plan" && by("tanker").length && !by("tanker").some((u) => u.pt)) return "항공작전과장: \"급유기를 전투기 초계 지점 근처에 두면 교대 없이 오래 버팁니다.\"";
  return "항공작전과장: \"현 편성 유지. 귀환한 편대는 재무장 후 자동 재출격합니다.\"";
}
function airPanel(side, g) {
  const ST = { ready: "대기", out: "이동", station: "임무 중", rtb: "귀환", rearm: "재무장", lost: "손실" };
  const out = S.foe.filter((f) => !alive(f).length || f.gone).length;
  const steps = [["편대 선택 (목록이나 지도에서 클릭)", !!S.sel], ["임무 고르고 지도에 우클릭 (지점·목표 지정)", S.air.some(hasOrder)], ["초계기로 적 탐지 · 전투기 CAP 배치", S.air.some((u) => u.t === "mpa" && hasOrder(u)) && S.air.some((u) => u.job === "cap" && u.pt)], ["작전 개시 → 적 발견 시 대함 타격 지정", S.phase !== "plan"]];
  const u = g && g.t ? g : null;
  side.innerHTML = `<div class="om-obj"><b>목표</b> 항공 지원으로 적 전단의 <em>연평 해역(노란 원)</em> 진입 저지<small>적 격퇴 ${out}/${S.foe.length} · 남은 시간 ${fmtT(Math.max(0, LIMIT - S.t))} · <a data-om="rebrief">브리핑 다시 보기</a></small></div>`
    + (S.phase === "plan" ? `<div class="om-h">작전 순서</div><ol class="om-steps">${steps.map(([t, ok]) => `<li class="${ok ? "ok" : ""}">${ok ? "✓" : ""} ${t}</li>`).join("")}</ol>` : "")
    + `<div class="om-h">항공 편대</div>${S.air.map((a) => `<button class="om-g${a === u ? " on" : ""}${a.st === "lost" ? " dead" : ""}" data-om="asel:${a.id}"><b>${a.name}</b> · ${JOB[a.job]?.[0] || "—"}<small>${ST[a.st]}${a.st === "rearm" ? ` ${Math.ceil(a.cd)}초` : ""} · 연료 ${Math.round((a.fuel / AIR_T[a.t].fuel) * 100)}%${AIR_T[a.t].asm ? ` · 공대함 ${a.asm}` : ""}${hasOrder(a) ? "" : " · 임무 지점 미지정"}</small><i><em style="width:${Math.round((a.fuel / AIR_T[a.t].fuel) * 100)}%"></em></i></button>`).join("")}`
    + (u ? `<div class="om-h">${u.name} 임무</div><div class="om-row">${AIR_T[u.t].jobs.map((j) => `<button data-om="job:${j}" class="${u.job === j ? "on" : ""}">${JOB[j][0]}</button>`).join("")}<button data-om="aclr">지정 해제</button>${airborne(u) ? `<button data-om="rtb">귀환</button>` : ""}</div><div class="om-note">${JOB[u.job]?.[1] || ""}</div>` : "")
    + `<div class="om-h">함정 전단 (자동 방어)</div>${S.us.map((s) => `<div class="om-note">${s.name} — ${s.ships.map((x) => `${x.name}${x.hp <= 0 ? "(침몰)" : ""}`).join(", ")} · 전력 ${Math.round(strength(s) * 100)}%</div>`).join("")}`
    + `<div class="om-h">참모 의견</div><div class="om-adv">${airAdvice()}</div>`
    + `<div class="om-h">상황 일지</div><div class="om-log">${S.log.map((l) => `<div class="${l.cls}"><span>${fmtT(l.at)}</span> ${l.t}</div>`).join("")}</div>`
    + (S.phase === "plan" ? `<button class="om-go" data-om="go">작전 개시 ›</button>` : "");
}
function staffAdvice() {
  if (!S.ctx.ops) return S.phase === "plan" ? "참모: \"작전 계획은 사령관 판단에 맡기겠습니다.\" (작전 병과 지휘관에게는 구체적인 참모 의견이 올라옵니다)" : "참모: \"현 상황 보고 — 교전 지속 중.\"";
  const hidden = S.foe.some((f) => alive(f).length && !f.seen && !(f.delay && S.t < f.delay)), noP3 = !S.sup.some((s) => s.k === "p3c");
  if (S.phase === "plan" && noP3) return "정보처장: \"적 전단 위치가 일부만 확인됩니다. P-3C 초계를 경계선 남쪽에 두면 조기 탐지가 가능합니다.\"";
  if (S.phase === "plan" && !S.us.some((g) => g.path.length)) return "작전처장: \"제1전단을 연평 해역 서쪽으로 전개해 적의 접근로를 막으십시오.\"";
  if (!S.decoy.gone) return "정보처장: \"서방 미확인 접촉은 기만일 가능성이 있습니다. 정찰 전단으로 확인을 권고합니다.\"";
  if (hidden) return "작전처장: \"미탐지 적 전력이 남아 있습니다. 방어 전단은 목표 해역을 유지하십시오.\"";
  const weak = S.us.find((g) => alive(g).length && strength(g) < 0.4); if (weak) return `작전처장: "${weak.name} 전력 저하. 후방으로 물려 재정비를 권고합니다."`;
  return "작전처장: \"현 기동 유지. 적 전단이 사거리에 들어오면 즉시 타격합니다.\"";
}
function panel() {
  const clock = $("#omClock"); if (clock) clock.textContent = `${S.phase === "plan" ? "계획 단계" : S.phase === "run" ? (S.paused ? "일시정지" : `진행 x${S.speed}`) : "종료"} · 작전 시간 ${fmtT(S.t)} / 30:00`;
  const sig = JSON.stringify([S.isAir && S.air.map((a) => [a.st, a.job, !!a.pt, !!a.tgt, !!a.follow, Math.round(a.fuel / 60), a.asm, Math.ceil(a.cd / 10)]), S.phase, S.sel?.id, S.us.map((g) => [g.mission, g.path.length, Math.round(strength(g) * 20), alive(g).length]), S.pts, S.sup.length, S.log.length && S.log[0].t, S.evt?.id, S.place, Math.floor(S.t / 30)]);
  if (sig === S.psig && !S.dirty) return; S.psig = sig; S.dirty = false;
  const side = $("#omSide"); if (!side) return; const g = S.sel;
  if (S.isAir) { airPanel(side, g); briefCards(); return; }
  const out = S.foe.filter((f) => !alive(f).length || f.gone).length, steps = [["전단 선택 (왼쪽 목록이나 지도에서 클릭)", !!S.sel], ["우클릭으로 기동 경로 지정 (적 예상 진로를 가로막게)", S.us.some((u) => u.path.length)], ["임무 고르기 · 지원 배치 (P-3C로 적 조기 탐지)", S.sup.length > 0], ["작전 개시 → 배속 조절하며 지켜보기", S.phase !== "plan"]];
  side.innerHTML = `<div class="om-obj"><b>목표</b> 적 전단이 <em>연평 해역(노란 원)</em>에 들어오지 못하게 막기<small>적 격퇴 ${out}/${S.foe.length} · 남은 시간 ${fmtT(Math.max(0, LIMIT - S.t))} · <a data-om="rebrief">브리핑 다시 보기</a></small></div>`
    + (S.phase === "plan" ? `<div class="om-h">작전 순서</div><ol class="om-steps">${steps.map(([t, ok]) => `<li class="${ok ? "ok" : ""}">${ok ? "✓" : ""} ${t}</li>`).join("")}</ol>` : "")
    + `<div class="om-h">아군 전력</div>${S.us.map((u) => `<button class="om-g${u === g ? " on" : ""}${alive(u).length ? "" : " dead"}" data-om="sel:${u.id}"><b>${u.name}</b> · ${MISS[u.mission]}<small>${u.ships.map((s) => `${s.name}${s.hp <= 0 ? "(침몰)" : ""}`).join(", ")}</small><i><em style="width:${Math.round(strength(u) * 100)}%"></em></i></button>`).join("")}`
    + (g ? `<div class="om-h">${g.name} 임무</div><div class="om-row">${Object.entries(MISS).map(([k, n]) => `<button data-om="mis:${k}" class="${g.mission === k ? "on" : ""}">${n}</button>`).join("")}<button data-om="clr">경로 지우기</button></div><div class="om-note">${{ strike: "탐지된 적 전단이 48km 안에 오면 접근해 타격", hold: "경로 끝 지점을 지키며 사거리 안의 적만 교전", scout: "탐지 반경 52km, 교전을 피하고 물러남" }[g.mission]}</div>` : "")
    + `<div class="om-h">지원 배정 · 남은 포인트 ${S.pts}</div>${Object.entries(SUP).map(([k, s]) => `<div class="om-sup"><button data-om="sup:${k}" ${S.phase !== "plan" ? "disabled" : ""}>${s.n} <b>${s.c}P</b></button><small>${s.d}</small></div>`).join("")}`
    + (S.sup.length ? `<div class="om-tags">${S.sup.map((s, i) => `<span>${SUP[s.k].n}${S.phase === "plan" ? ` <a data-om="unsup:${i}">×</a>` : ""}</span>`).join("")}</div>` : "")
    + `<div class="om-h">참모 의견</div><div class="om-adv">${staffAdvice()}</div>`
    + `<div class="om-h">상황 일지</div><div class="om-log">${S.log.map((l) => `<div class="${l.cls}"><span>${fmtT(l.at)}</span> ${l.t}</div>`).join("")}</div>`
    + (S.phase === "plan" ? `<button class="om-go" data-om="go">작전 개시 ›</button>` : "");
  briefCards();
}
function briefCards() {
  const ev = $("#omEvt"); if (ev) ev.innerHTML = S.evt ? `<div class="om-evt"><div class="om-et">${S.evt.t}</div>${[S.evt.a, S.evt.b].map(([k, n, d]) => `<button data-om="evt:${k}"><b>${n}</b><small>${d}</small></button>`).join("")}</div>` : "";
  const bf = $("#omBrief"); if (bf && S.isAir) { bf.innerHTML = S.brief ? `<div class="om-brief"><div class="om-bh">항공 작전 브리핑 · 서해 항공 지원</div><p><b>상황</b> 적 수상전단 ${S.foe.length}개가 연평 해역으로 남하합니다. 아군 함정 전단은 연평 해역 남쪽에서 방어선을 지킵니다(자동). 귀관은 <b>항공 전력</b>을 지휘합니다.</p><p><b>목표</b> 30분 동안 적이 연평 해역(노란 원)에 들어오지 못하게 막으십시오. 적 전투기 편대가 두 차례 내려옵니다.</p><p><b>편대 운용</b> 편대를 고르고 임무를 정한 뒤 지도에 <b>우클릭</b>으로 지점·목표를 찍으면 작전 개시와 함께 출격합니다. 연료가 떨어지면 스스로 귀환하고, 재무장 후 같은 임무로 다시 나갑니다.</p><p><b>권장 계획</b> ① 초계기를 경계선 남쪽에 띄워 적을 찾기 ② 전투기 1개는 아군 전단 위 CAP ③ 적이 보이면 다른 전투기로 대함 타격 (호위를 붙이면 피격 위험 감소)${S.air.some((u) => u.t === "tanker") ? " ④ 급유기를 중간 지점에 두면 체공시간 연장" : ""}${S.air.some((u) => u.t === "transport") ? " ⑤ 수송기로 연평도에 지대함 유도탄 반 공수" : ""}</p><button data-om="brief">계획 시작 ›</button></div>` : ""; return; }
  if (bf) bf.innerHTML = S.brief ? `<div class="om-brief"><div class="om-bh">작전 브리핑 · 서해 해상 차단</div><p><b>상황</b> 적 수상전단 ${S.foe.length}개가 북쪽 경계선을 넘어 <b>연평 해역</b>으로 남하하고 있습니다. 일부는 아직 위치가 확인되지 않았습니다.</p><p><b>목표</b> 30분 동안 적이 연평 해역(노란 원)에 들어오지 못하게 막으십시오. 적 전단을 격멸하거나 퇴각시키면 바로 성공입니다.</p><p><b>실패</b> 적 전단이 연평 해역에 진입하거나, 아군 전단이 전멸하면 실패.</p><p><b>권장 계획</b> ① 제1전단을 연평 해역 서쪽(지도 가운데)으로 이동 ② P-3C를 경계선 아래에 배치해 적을 먼저 발견 ③ 해안 포대로 접근하는 적을 깎기 ④ 작전 개시 후 x2~x4로 지켜보다 상황 카드에 대응</p><p class="om-tip">빨간 점선 화살표 = 정보처가 예상한 적 진로. 아군 전단은 적이 보이면(탐지 원 안) 30km에서 미사일을 주고받습니다.</p><button data-om="brief">계획 시작 ›</button></div>` : "";
}
