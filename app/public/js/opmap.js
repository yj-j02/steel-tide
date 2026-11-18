// 작전 지휘 (operation map): plan on a 2D chart of the West Sea, then run the operation in
// real time (pause, x1/x2/x4). Groups move along the paths you draw; when a group detects an
// enemy group within missile range the exchange is resolved on the chart (salvos, interceptions,
// hits). Staff and promotion perks feed the numbers. Coastline: Natural Earth 1:10m (west of Incheon, 1 unit ≈ 1.4 km).

const KM = 1; /* map unit: kilometres; x east, y south */
const W = 150, H = 96;
import { COAST, ISLES, PLACES, NLL, GEO } from "./westsea.js";
const LAND = COAST; /* real coastline (Natural Earth), see westsea.js */
const GOAL = { x: 75, y: 47, r: 9, n: "연평 해역" };
const BATTERY = { x: 126, y: 38, range: 48 };

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
const AIRBASE = { x: 132, y: 94, n: "서산 공군기지" };
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
const YEONPYEONG = { x: 78.1, y: 42.1 };
/* 구역(섹터): 편대·전단을 구역 단위로 배정한다 (지점을 일일이 찍지 않음) */
const SECTORS = [
  { id: "s1", n: "백령·대청", x0: 0, y0: 8, x1: 45, y1: 48, c: { x: 30, y: 40 } },
  { id: "s2", n: "연평", x0: 45, y0: 8, x1: 90, y1: 48, c: { x: 70, y: 46 }, goal: true, ly: 36 },
  { id: "s3", n: "강화 앞바다", x0: 90, y0: 8, x1: 130, y1: 48, c: { x: 100, y: 42 }, ly: 31 },
  { id: "s4", n: "서해 남서", x0: 0, y0: 48, x1: 45, y1: 90, c: { x: 25, y: 68 } },
  { id: "s5", n: "덕적 북방", x0: 45, y0: 48, x1: 90, y1: 90, c: { x: 70, y: 70 } },
  { id: "s6", n: "인천 근해", x0: 90, y0: 48, x1: 130, y1: 90, c: { x: 105, y: 66 } },
];
const secOf = (p) => SECTORS.find((q) => p.x >= q.x0 && p.x < q.x1 && p.y >= q.y0 && p.y < q.y1) || null;
const secById = (id) => SECTORS.find((q) => q.id === id);
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
const ship = (t, name) => ({ t, name, n: SHIP_T[t].n, hp: SHIP_T[t].hp, max: SHIP_T[t].hp, asm: SHIP_T[t].asm, sam: SHIP_T[t].sam, asm0: SHIP_T[t].asm, sam0: SHIP_T[t].sam });
/** group orders: 교전규칙 · 레이더 · 속력 · 일제사격 발수 */
const ORD0 = { roe: "free", radar: true, spd: "eco", salvoN: 4, fuel: 100 };
const ROE = { hold: ["사격 금지", "쏘지 않음 — 적에게 먼저 맞을 수 있음"], tight: ["근접 사격", `${Math.round(18 * 1.41)}km 안에서만 사격 — 명중률 ↑, 적이 먼저 쏠 수 있음`], free: ["자유 사격", `최대 사거리 ${Math.round(30 * 1.41)}km에서 사격 — 적 요격률 ↑`] };
const SPDS = { slow: ["저속", 0.6, 0.02], eco: ["경제", 1, 0.04], full: ["전속", 1.5, 0.11] };
const KMU = (u) => Math.round(u * 1.41);
const alive = (g) => g.ships.filter((s) => s.hp > 0);
const strength = (g) => alive(g).reduce((a, s) => a + s.hp, 0) / g.ships.reduce((a, s) => a + s.max, 0);
const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtT = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function forces(grade) {
  const us = [{ id: "u1", name: "제1전단", x: 104, y: 66, ships: [ship("aegis", "정조대왕함"), ship("ffg", "대구함")], mission: "strike", path: [] }];
  if (grade >= 3) us.push({ id: "u2", name: "제2전단", x: 98, y: 80, ships: [ship("ddh", "충무공이순신함"), ship("ffg", "경기함"), ship("pkg", "윤영하함")], mission: "hold", path: [] });
  if (grade >= 6) us.push({ id: "u3", name: "제3전단", x: 116, y: 62, ships: [ship("ddh", "왕건함"), ship("ffg", "서울함")], mission: "scout", path: [] });
  const foe = [
    { id: "f1", name: "적 제1전단", x: 22, y: 12, ships: [ship("foeDD", "최현"), ship("foeFF", "적 호위함 1")], path: [{ x: 30, y: 30 }, { x: 55, y: 44 }, { x: GOAL.x, y: GOAL.y }], seen: false },
    { id: "f2", name: "적 제2전단", x: 88, y: 26, ships: [ship("foeFF", "적 호위함 2"), ship("foeFAC", "적 유도탄정 1"), ship("foeFAC", "적 유도탄정 2")], path: [{ x: 90, y: 36 }, { x: GOAL.x + 5, y: GOAL.y - 1 }], seen: false, delay: 480 },
  ];
  if (grade >= 4) foe.push({ id: "f3", name: "적 제3전단", x: 5, y: 40, ships: [ship("foeDD", "강건"), ship("foeFF", "적 호위함 3")], path: [{ x: 30, y: 50 }, { x: 55, y: 50 }, { x: GOAL.x, y: GOAL.y }], seen: false, delay: 300 });
  for (const g of [...us, ...foe]) { g.side = us.includes(g) ? "us" : "foe"; g.fireT = 30; g.home = { x: g.x, y: g.y }; if (g.side === "us") Object.assign(g, ORD0); }
  return { us, foe };
}

/** ctx: { grade, branch, ops (작전 병과: +2 support points, specific staff advice), mods: {outK, inK, icptK}, onDone(res) } */
export function openOpMap(ctx) {
  const F = forces(ctx.grade), isAir = !!ctx.air;
  if (isAir) { /* 항공 작전: 함정은 소규모 초계전단 하나만 자동 방어 — 항공 지원 없이는 버티기 어렵다 */
    const g = { id: "u1", name: "초계전단", x: 104, y: 66, ships: [ship("ddh", "문무대왕함"), ship("ffg", "대구함"), ship("pkg", "윤영하함")], mission: "hold", path: [{ x: 95, y: 62 }, { x: 70, y: 50 }], side: "us", fireT: 30, ...ORD0 }; g.home = { x: g.x, y: g.y }; F.us = [g]; }
  const A = isAir ? airForces(ctx.grade) : [];
  Object.assign(S, { on: true, ctx, air: A, isAir, layers: { det: false, rng: false, path: false }, hist: {}, drag: null, hover: null, raids: [], isleBat: null, airLost: 0, sorties: 0, us: F.us, foe: F.foe, t: 0, run: false, speed: 1, paused: false, sel: isAir ? A[0] : F.us[0], phase: "plan",
    pts: isAir ? 0 : 6 + (ctx.ops ? 2 : 0), sup: [], place: null, msl: [], fx: [], log: [], evt: null, evtDone: {}, evade: 0, preempt: 0, decoy: { x: 40, y: 50, gone: false },
    shots: 0, hits: 0, inside: {}, result: null });
  fmInit(); fmBuild(); S.brief = false; say(`작전 전술을 정하십시오 — 작전 개념, 역할 배치, 부대 지시. 준비되면 '작전 개시'.`);
  let last = performance.now();
  const loop = (now) => { if (!S.on) return; const dt = Math.min(0.1, (now - last) / 1000); last = now; if (S.phase === "run" && !S.paused && !S.evt && !S.fm.hl && !S.fm.half) for (let k = 0; k < (S.fm.ff ? 24 : S.speed); k++) { step(dt * 30); if (S.fm.hl || S.fm.half || S.evt || S.phase !== "run") break; } draw(); fmPanel(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
export const opMapOn = () => S.on;
/** test hook: the live operation state */
export const opMapState = () => S;
export const opMapAir = { setAirPoint: (p) => setAirPoint(p), launch: (u) => launch(u), assign: (id, sid) => assignSector(id, secById(sid)), secOf: (p) => secOf(p) };
/** test hook: run the operation forward by game seconds without waiting for frames */
export function opMapAdvance(sec) { if (S.phase !== "run") return; for (let t = 0; t < sec && S.phase === "run"; t += 1) { if (S.evt) resolveEvent(S.evt.a[0]); if (S.fm.hl) S.fm.hl = null; if (S.fm.half) S.fm.half = null; step(1); } S.dirty = true; }

function say(t, cls = "") { S.log.unshift({ t, cls, at: S.t }); if (S.log.length > 80) S.log.pop(); S.logDirty = true; }

function build() {
  let el = $("#opMap"); if (!el) { el = document.createElement("div"); el.id = "opMap"; document.body.append(el); }
  el.innerHTML = `<div class="om-top"><b>STEEL TIDE</b><span class="om-t">${S.isAir ? "항공 작전 · 서해 항공 지원" : "작전 지휘 · 서해 해상 차단 작전"}</span><div class="om-ph" id="omPhase"></div><span id="omClock"></span><div class="om-spd"><button data-om="pause">⏸</button><button data-om="s1" class="on">x1</button><button data-om="s2">x2</button><button data-om="s4">x4</button></div><button data-om="quit" class="om-quit">작전 중단</button></div>`
    + `<div class="om-todo" id="omTodo"></div><div class="om-b"><div class="om-side" id="omSide"></div><div class="om-mapw"><div class="om-cvw"><canvas id="omCv"></canvas><div class="om-lay"><span>지도 표시</span>${[["det", "탐지 범위"], ["rng", "사거리"], ["path", "경로"]].map(([k, n]) => `<button data-om="layer:${k}">${n}</button>`).join("")}</div><div class="om-hint">${S.isAir ? "<b>구역 클릭</b>: 그 구역에 정찰·방공·급유 보내기 · <b>적 클릭</b>: 타격 편대 출격 · Space: 일시정지" : "왼쪽 전단 카드를 지도의 <b>구역</b>으로 끌어다 놓기 (또는 우클릭으로 세부 경로) · Space: 일시정지"}</div><div id="omRep"></div><div id="omPop"></div><div id="omEvt"></div><div id="omRes"></div><div id="omBrief"></div></div>${S.isAir ? `<div class="om-tl" id="omTl"></div>` : ""}</div><div class="om-right" id="omRight"></div></div>`;
  el.style.display = "flex";
  const cv = $("#omCv"); const fit = () => { const r = cv.parentElement.getBoundingClientRect(); cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio; cv.style.width = r.width + "px"; cv.style.height = r.height + "px"; };
  fit(); S.fit = fit; addEventListener("resize", fit);
  cv.oncontextmenu = (e) => e.preventDefault();
  cv.ondragover = (e) => { e.preventDefault(); S.hover = secOf(toMap(e)); };
  cv.ondragleave = () => { S.hover = null; };
  cv.ondrop = (e) => { e.preventDefault(); S.hover = null; const id = e.dataTransfer.getData("text/plain") || S.drag; const q = secOf(toMap(e)); if (id && q) assignSector(id, q); S.drag = null; };
  el.ondragstart = (e) => { const c = e.target.closest?.("[data-drag]"); if (!c) return; S.drag = c.dataset.drag; e.dataTransfer.setData("text/plain", S.drag); e.dataTransfer.effectAllowed = "move"; };
  cv.onmousedown = (e) => { const p = toMap(e);
    if (S.isAir) { if (e.button !== 0 && e.button !== 2) return; const u = S.air.filter((a) => airborne(a)).sort((a, b) => d2(a, p) - d2(b, p))[0]; if (e.button === 0 && u && d2(u, p) < 3) { S.sel = u; S.pop = null; S.dirty = true; return; } openPop(p, e); return; }
    if (e.button === 2) { addWaypoint(p, e.shiftKey); return; } if (e.button !== 0) return; if (S.place) { placeSupport(p); return; } const g = S.us.find((u) => alive(u).length && d2(u, p) < 4.5); if (g) S.sel = g; };
  el.onclick = onClick;
  S.key = (e) => { if (!S.on) return; if (e.code === "Space") { e.preventDefault(); e.stopImmediatePropagation(); if (S.phase === "run") S.paused = !S.paused; } if (e.code === "Escape" && S.place) S.place = null; };
  addEventListener("keydown", S.key, true);
}
function close() { S.on = false; removeEventListener("keydown", S.key, true); removeEventListener("resize", S.fit); const el = $("#opMap"); if (el) el.style.display = "none"; }

function view() { const cv = $("#omCv"), k = Math.min(cv.width / W, cv.height / H), ox = (cv.width - W * k) / 2, oy = (cv.height - H * k) / 2; return { k, ox, oy }; }
function toMap(e) { const cv = $("#omCv"), r = cv.getBoundingClientRect(), { k, ox, oy } = view(); return { x: ((e.clientX - r.left) * devicePixelRatio - ox) / k, y: ((e.clientY - r.top) * devicePixelRatio - oy) / k }; }
function inLand(p) { if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) return true; return LAND.some((poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) c = !c; } return c; }); }

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
  if (S.fm && fmClick(a)) return;
  if (a === "pause") S.paused = !S.paused;
  else if (a[0] === "s" && a.length === 2) { S.speed = +a[1]; for (const x of document.querySelectorAll(".om-spd button")) x.classList.toggle("on", x.dataset.om === a); }
  else if (a === "quit") { if (S.phase === "end") return; finish(false, "작전 중단 — 철수"); }
  else if (a.startsWith("layer:")) { const k = a.slice(6); S.layers[k] = !S.layers[k]; b.classList.toggle("on", S.layers[k]); }
  else if (a === "todo") { S.todoFn?.(); }
  else if (a.startsWith("ppick:")) { const id = a.slice(6), P = S.pop; if (P) P.pick = P.pick.includes(id) ? P.pick.filter((x) => x !== id) : [...P.pick, id]; }
  else if (a === "pesc") { if (S.pop) S.pop.esc = !S.pop.esc; }
  else if (a === "pgo") { const P = S.pop; if (P) { const escC = P.esc && S.air.find((u) => u.t === "fighter" && u.st === "ready" && !P.pick.includes(u.id)); strikeMission(P.f, P.pick, escC?.id); } }
  else if (a.startsWith("psec:")) { const P = S.pop; if (P) { assignSector(a.slice(5), P.q); S.pop = null; } }
  else if (a === "pclose") S.pop = null;
  else if (a === "airrec") recommendAir();
  else if (a.startsWith("act:")) { const f = S.acts?.[+a.slice(4)]; if (f) f(); }
  else if (a === "unsec") { const u = S.sel; if (u) { u.sec = null; if (u.t) { u.pt = null; u.tgt = null; } } }
  else if (a.startsWith("ord:")) { const [, k, v] = a.split(":"), g = S.sel; if (g && !g.t) { g[k] = k === "radar" ? v === "on" : k === "salvoN" ? +v : v; say(`${g.name} — ${{ roe: "교전규칙", radar: "레이더", spd: "속력", salvoN: "일제사격" }[k]} ${k === "roe" ? ROE[v][0] : k === "radar" ? (v === "on" ? "켜기 (탐지 ↑ · 노출)" : "전파 차단 (은밀 · 탐지 ↓)") : k === "spd" ? SPDS[v][0] : `${v}발`}`); } }
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
const SPD = 0.05; /* chart units per game second (1 unit ≈ 1.4 km): an unopposed enemy reaches the goal in about 25 minutes */
const LIMIT = 1800; /* 30:00 */
function detR(g) { return g.side === "us" ? (g.radar === false ? (g.mission === "scout" ? 16 : 12) : g.mission === "scout" ? 52 : 36) : 30; }
/** 적이 아군 전단을 볼 수 있나: 레이더를 켜면 전파가 멀리서 잡힌다 (EMCON) */
function foeSees(f, u) { const d = d2(f, u); return u.radar === false ? d < 15 || (u.firedAt != null && S.t - u.firedAt < 60 && d < 34) : d < 46; }
function seenFoe(f) { if (S.us.some((u) => alive(u).length && d2(u, f) < detR(u))) return true; if (S.air?.some((u) => airborne(u) && AIR_T[u.t].det && d2(u, f) < AIR_T[u.t].det)) return true; return S.sup.some((s) => s.k === "p3c" && d2(s, f) < 30); }

// ── air (항공 작전) ──
const hasOrder = (u) => u.st !== "lost" && (u.sec ? true : u.job === "strike" ? !!u.tgt : u.job === "escort" ? !!u.follow : !!u.pt);
const foeIn = (q) => S.foe.filter((f) => f.seen && alive(f).length && !f.gone && !(f.delay && S.t < f.delay) && f.x >= q.x0 - 4 && f.x < q.x1 + 4 && f.y >= q.y0 - 4 && f.y < q.y1 + 4).sort((a, b) => d2(a, q.c) - d2(b, q.c))[0];
/** 구역 배정: 편대 종류와 구역 상황으로 임무를 정한다 (전투기: 적이 있으면 대함 타격, 없으면 CAP). */
function assignSector(id, q) {
  const u = S.air.find((a) => a.id === id), g = S.us.find((x) => x.id === id);
  if (u) {
    if (u.st === "lost") return;
    if (u.t === "transport" && !q.goal) { say("대형수송기는 연평 구역(연평도)에만 공수할 수 있습니다.", "bad"); return; }
    if (u.t === "transport" && S.isleBat) { say("연평도 지대함 유도탄 반은 이미 전개됐습니다.", "bad"); return; }
    u.sec = q.id; secJob(u); S.sel = u; say(`${u.name} → ${q.n} · ${JOB[u.job][0]}`);
    if (S.phase === "run" && u.st === "ready") launch(u);
  } else if (g && alive(g).length) {
    const c = { ...q.c }; for (let k = 0; k < 20 && inLand(c); k++) c.x -= 2;
    g.sec = q.id; g.path = route(g, c); S.sel = g; say(`${g.name} → ${q.n} 구역으로 기동`);
  }
  S.dirty = true;
}
/** sea lane: straight if clear of land, otherwise through the best of a few open-water hubs */
const HUBS = [{ x: 95, y: 62 }, { x: 70, y: 60 }, { x: 50, y: 55 }, { x: 85, y: 50 }, { x: 40, y: 45 }, { x: 105, y: 55 }];
const clear = (a, b) => { const n = Math.ceil(d2(a, b) / 0.6); for (let i = 1; i < n; i++) if (inLand({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n })) return false; return true; };
function route(a, b) {
  if (clear(a, b)) return [b];
  let best = null; for (const h of HUBS) if (clear(a, h) && clear(h, b)) { const L = d2(a, h) + d2(h, b); if (!best || L < best.L) best = { L, p: [h, b] }; }
  if (best) return best.p;
  for (const h of HUBS) for (const h2 of HUBS) if (h !== h2 && clear(a, h) && clear(h, h2) && clear(h2, b)) return [h, h2, b];
  return [b];
}
function secJob(u) {
  const q = secById(u.sec); if (!q) return;
  if (u.t === "transport") { u.job = "airlift"; u.pt = { ...YEONPYEONG }; return; }
  if (u.t === "tanker") { u.job = "refuel"; u.pt = { ...q.c }; return; }
  u.tgt = null; u.job = u.t === "fighter" ? "cap" : "patrol"; u.pt = { ...q.c };
}
/** 타격 임무: 고른 편대가 목표로 날아가 공대함 미사일을 쏘고 귀환 (호위 1개를 붙이면 피격 위험 ↓) */
function strikeMission(f, ids, escId) {
  const ws = ids.map((id) => S.air.find((a) => a.id === id)).filter((u) => u && u.st === "ready" && u.asm > 0);
  if (!ws.length || !f) return;
  for (const u of ws) { u.sec = null; u.pt = null; u.job = "strike"; u.tgt = f; if (S.phase === "run") launch(u); }
  const e = escId && S.air.find((a) => a.id === escId && a.st === "ready"); if (e) { e.sec = null; e.pt = null; e.job = "escort"; e.follow = ws[0]; if (S.phase === "run") launch(e); }
  say(`타격 임무 → ${f.name}: ${ws.map((u) => short(u.name)).join(", ")}${e ? ` (호위 ${short(e.name)})` : ""}`, "hit"); S.pop = null; S.dirty = true;
}
function airStatus(u) {
  const q = secById(u.sec), J = { cap: "방공(CAP)", patrol: "정찰", refuel: "급유 궤도", airlift: "연평도 공수", escort: "호위" }[u.job];
  if (u.st === "lost") return "손실";
  if (u.st === "rearm") return `재무장·급유 ${fmtT(u.cd)} 남음`;
  if (u.st === "rtb") return "귀환 중";
  if (u.job === "strike" && u.tgt) return u.st === "ready" ? `출격 대기 → ${u.tgt.name} 타격` : `${u.tgt.name} 타격 비행 · ${fmtT(d2(u, u.tgt) / AIR_T[u.t].sp)} 후 발사`;
  if (u.job === "escort" && u.follow) return `${short(u.follow.name)} 호위 중`;
  if (u.st === "ready") return q ? `출격 대기 → ${q.n} ${J}` : u.t === "fighter" ? "대기 — 적을 클릭해 타격 / 구역 클릭해 CAP" : "대기 — 구역을 클릭해 배치";
  return `${q ? q.n + " " : ""}${J}${u.st === "out" ? " · 이동 중" : " 중"}`;
}
function strikeEst(f, ws, esc) {
  const n = ws.reduce((a, u) => a + u.asm, 0), live = alive(f), sam = live.reduce((a, x) => a + x.sam, 0);
  const p = clamp(clamp(0.25 + sam / (live.length * 60 || 1), 0.15, 0.78) * clamp(1.15 - 0.06 * n, 0.6, 1.1) * 0.8, 0, 0.9) * (sam > 0 ? 1 : 0);
  const hits = n * (1 - p), hp = live.reduce((a, x) => a + x.hp, 0), risk = sam > 0 ? ws.map((u) => (u.t === "helo" ? 0.15 : 0.07) * (esc ? 0.3 : 1)) : [];
  const eta = ws.length ? Math.max(...ws.map((u) => d2(airHome(u), f) / AIR_T[u.t].sp)) : 0;
  return { n, hits, kill: Math.min(1, (hits * 34) / Math.max(1, hp)), risk: risk.length ? 1 - risk.reduce((a, r) => a * (1 - r), 1) : 0, eta, sam };
}
function openPop(p, e) {
  if (S.phase === "end") return;
  const f = S.foe.filter((g) => g.seen && alive(g).length && !g.gone && !(g.delay && S.t < g.delay)).sort((a, b) => d2(a, p) - d2(b, p))[0];
  const q = secOf(p); const r = $("#omCv").getBoundingClientRect();
  S.pop = f && d2(f, p) < 7 ? { k: "strike", f, x: e.clientX - r.left, y: e.clientY - r.top, pick: null, esc: false } : q ? { k: "sec", q, x: e.clientX - r.left, y: e.clientY - r.top } : null;
  if (S.pop?.k === "strike") S.pop.pick = S.air.filter((u) => u.st === "ready" && u.asm > 0 && (u.t === "fighter" || u.t === "helo")).map((u) => u.id);
  S.dirty = true;
}
function popHTML() {
  const P = S.pop; if (!P) return "";
  const pos = `left:${Math.min(P.x + 12, ($("#omCv")?.clientWidth || 900) - 330)}px;top:${Math.min(P.y + 8, ($("#omCv")?.clientHeight || 600) - 300)}px`;
  if (P.k === "strike") {
    const f = P.f, cand = S.air.filter((u) => (u.t === "fighter" || u.t === "helo") && u.st !== "lost"), ws = cand.filter((u) => P.pick.includes(u.id) && u.st === "ready" && u.asm > 0);
    const escC = S.air.find((u) => u.t === "fighter" && u.st === "ready" && !P.pick.includes(u.id)), E = strikeEst(f, ws, P.esc && escC);
    return `<div class="om-pop" style="${pos}"><div class="h">✈ 타격 임무 — ${f.name}</div><small>${alive(f).map((x) => x.n).join("·")} · 적 대공 ${E.sam > 20 ? "강" : E.sam > 0 ? "약" : "없음"}</small>
      <div class="pk">${cand.map((u) => { const ok = u.st === "ready" && u.asm > 0; return `<label class="${ok ? "" : "dis"}"><input type="checkbox" data-om="ppick:${u.id}" ${P.pick.includes(u.id) && ok ? "checked" : ""} ${ok ? "" : "disabled"}> ${AIR_IC[u.t]} ${short(u.name)} <em>${ok ? `미사일 ${u.asm}` : u.st === "rearm" ? `재무장 ${fmtT(u.cd)}` : "임무 중"}</em></label>`; }).join("")}</div>
      ${escC ? `<label class="esc"><input type="checkbox" data-om="pesc" ${P.esc ? "checked" : ""}> 호위 붙이기 (${short(escC.name)}) — 피격 위험 −70%</label>` : `<div class="note">호위로 보낼 대기 전투기가 없습니다</div>`}
      ${ws.length ? "" : `<div class="note" style="color:#f2ca5c">지금 보낼 수 있는 편대가 없습니다 — 임무 중이거나 재무장 중입니다.</div>`}<div class="est"><span>발사</span><b>${E.n}발</b><span>예상 명중</span><b>${E.hits.toFixed(1)}발</b><span>격침 가능성</span><b class="${E.kill > 0.7 ? "g" : E.kill > 0.35 ? "y" : "r"}">${Math.round(E.kill * 100)}%</b><span>아군 격추 위험</span><b class="${E.risk > 0.15 ? "r" : "g"}">${Math.round(E.risk * 100)}%</b><span>도착</span><b>${fmtT(E.eta)} 후</b></div>
      <div class="row"><button class="go" data-om="pgo" ${ws.length ? "" : "disabled"}>출격 ›</button><button data-om="pclose">취소</button></div></div>`;
  }
  const q = P.q, avail = (t) => S.air.filter((u) => u.t === t && u.st !== "lost"), opt = [];
  for (const u of avail("fighter")) opt.push([u, "방공(CAP)", "이 구역 상공에서 적기를 막고 아군 함정 요격률 +25%"]);
  for (const u of [...avail("mpa"), ...avail("helo")]) opt.push([u, "정찰", `반경 ${KMU(AIR_T[u.t].det)}km의 적을 찾아 지도에 표시`]);
  for (const u of avail("tanker")) opt.push([u, "급유 궤도", "반경 28km 안 아군기 연료 보충"]);
  if (q.goal && !S.isleBat) for (const u of avail("transport")) opt.push([u, "연평도 공수", "해병 지대함 유도탄 반 전개 — 섬이 직접 사격"]);
  return `<div class="om-pop" style="${pos}"><div class="h">${q.n} 구역 — 보낼 편대</div><small>CAP·정찰·급유는 구역 상공을 돌다가 연료가 떨어지면 교대합니다</small><div class="sl">${opt.map(([u, j, d]) => `<button data-om="psec:${u.id}" class="${u.sec === q.id ? "on" : ""}"><b>${AIR_IC[u.t]} ${short(u.name)} · ${j}</b><small>${d}${u.sec && u.sec !== q.id ? ` · 지금: ${secById(u.sec).n}` : u.job === "strike" && airborne(u) ? " · 지금: 타격 중" : ""}</small></button>`).join("")}</div><div class="row"><button data-om="pclose">닫기</button></div></div>`;
}
/** 추천 계획: 초계기 정찰, 전투기 1개 CAP, 급유기·수송기 배치 — 나머지 전투기는 타격용 대기 */
function recommendAir() {
  const by = (t) => S.air.filter((u) => u.t === t && u.st !== "lost");
  const m = by("mpa")[0]; if (m) assignSector(m.id, secById("s1"));
  const f = by("fighter")[0]; if (f) assignSector(f.id, secById("s2"));
  const h = by("helo")[0]; if (h) assignSector(h.id, secById("s4"));
  const k = by("tanker")[0]; if (k) assignSector(k.id, secById("s5"));
  const c = by("transport")[0]; if (c && !S.isleBat) assignSector(c.id, secById("s2"));
  say("추천 계획 적용 — 나머지 전투기는 타격용으로 대기합니다. 적이 보이면 적을 클릭해 타격을 보내십시오.", "hit"); S.dirty = true;
}
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
function histLab(u) { return u.st === "lost" ? "lost" : u.st === "ready" ? "" : u.st === "rearm" ? "rearm" : u.st === "rtb" ? "rtb" : u.job === "strike" ? "strike" : u.st === "out" ? "out" : u.job; }
function airStep(dt) {
  for (const u of S.air) {
    const T = AIR_T[u.t];
    { const H = (S.hist[u.id] ??= []), lab = histLab(u), L = H[H.length - 1]; if (!L || L.l !== lab) { if (L) L.t1 = S.t; H.push({ l: lab, t0: S.t, t1: null }); } }
    if (u.st === "lost") continue;
    if (u.sec && u.st !== "rtb" && u.st !== "rearm" && !(u.job === "strike" && u.tgt && alive(u.tgt).length && !u.tgt.gone)) secJob(u);
    if (u.st === "rearm") { u.cd -= dt; if (u.cd <= 0) { u.st = "ready"; u.fuel = T.fuel; u.asm = T.asm; say(`${u.name} 재무장·급유 완료.`); } continue; }
    if (u.st === "ready") { if (hasOrder(u) && (u.job !== "strike" || (u.tgt && alive(u.tgt).length && !u.tgt.gone))) launch(u); else { const h = airHome(u); u.x = h.x; u.y = h.y; } continue; }
    u.fuel -= dt;
    if (u.t !== "tanker" && S.air.some((k) => k.t === "tanker" && k.st === "station" && d2(k, u) < 20)) u.fuel = Math.min(T.fuel, u.fuel + dt * 3);
    const home = airHome(u);
    if (u.st !== "rtb" && u.fuel < d2(u, home) / T.sp + 40) { u.st = "rtb"; say(`${u.name} 연료 부족 — 귀환.`); }
    if (u.st === "rtb") { if (moveAir(u, home, dt)) { u.st = "rearm"; u.cd = T.re; if (u.job === "strike") { u.tgt = null; if (!u.sec) u.pt = null; } if (u.job === "escort") { u.follow = null; u.job = "cap"; } say(`${u.name} 착륙 — 재무장 ${Math.round(T.re / 60 * 10) / 10}분.`); } continue; }
    if (u.job === "strike") {
      const f = u.tgt; if (!f || !alive(f).length || f.gone) { u.st = "rtb"; continue; }
      const rng = u.t === "helo" ? 10 : 15;
      if (d2(u, f) > rng) { moveAir(u, f, dt); continue; }
      if (u.asm > 0) {
        launch2({ x: u.x, y: u.y, name: u.name.split(" (")[0], side: "us", id: u.id }, f, u.asm, "공대함", 25, 12); S.shots += u.asm; say(`${u.name} 공대함 미사일 ${u.asm}발 발사 → ${f.name}`, "hit"); u.asm = 0;
        const sam = alive(f).reduce((a, s) => a + s.sam, 0), esc = S.air.some((e) => e.job === "escort" && e.follow === u && airborne(e) && d2(e, u) < 15);
        if (sam > 0 && Math.random() < (u.t === "helo" ? 0.15 : 0.07) * (esc ? 0.3 : 1)) { loseAir(u, "적 대공미사일에 피격 — 격추"); continue; }
      }
      u.st = "rtb"; continue;
    }
    if (u.job === "escort") { const o = u.follow; if (!o || !airborne(o)) { u.st = "rtb"; continue; } moveAir(u, { x: o.x + 2, y: o.y + 2 }, dt); u.st = "out"; continue; }
    if (!u.pt) { u.st = "rtb"; continue; }
    if (u.st === "out") { if (moveAir(u, u.pt, dt)) { u.st = "station"; say(`${u.name} ${u.job === "airlift" ? "연평도 도착 — 하역 개시" : "임무 지점 도착"}.`); u.drop = 0; } continue; }
    if (u.job === "airlift") { u.drop += dt; if (u.drop >= 40) { S.isleBat = { x: YEONPYEONG.x, y: YEONPYEONG.y, cd: 10 }; say("연평도 해병 지대함 유도탄 반 전개 완료 — 사거리 28km.", "hit"); u.pt = null; u.sec = null; u.st = "rtb"; } continue; }
    const a = (S.t * 0.05 + u.id.charCodeAt(1)) % (Math.PI * 2); u.x = u.pt.x + Math.cos(a) * 2.5; u.y = u.pt.y + Math.sin(a) * 2.5;
  }
  if (S.isleBat) { const b = S.isleBat; b.cd -= dt; if (b.cd <= 0) { const t = nearest(b, S.foe.filter((f) => f.seen && !f.gone)); if (t && t.d < 28) { launch2({ x: b.x, y: b.y, name: "연평도 지대함", side: "us", id: "isle" }, t.g, 2, "지대함", 40); S.shots += 2; b.cd = 90; say("연평도 지대함 유도탄 2발 발사.", "hit"); } else b.cd = 10; } }
  raidStep(dt);
}
const RAIDS = [480, 1080];
function raidStep(dt) {
  for (const at of RAIDS) if (S.t >= at && !S.raids.some((r) => r.at === at)) { S.raids.push({ at, x: 50 + Math.random() * 50, y: -3, alive: true, tried: new Set(), n: "적 전투기 편대 (MiG-29)" }); say("적 전투기 편대 남하 — 방공 레이더 포착!", "bad"); hl("적 전투기 편대 출현", `MiG-29 편대가 남하합니다. ${S.air.some((u) => u.job === "cap" && airborne(u)) ? "CAP 편대가 요격에 나섭니다." : "<b>CAP이 없습니다</b> — 초계기·급유기가 위험합니다."}`, [["약한 기체 후퇴", () => shout("safe")], ["방공 강화", () => shout("capall")]], "y", true); }
  for (const r of S.raids) {
    if (!r.alive) continue;
    const prey = S.air.filter((u) => airborne(u) && u.t !== "fighter").sort((a, b) => d2(a, r) - d2(b, r))[0];
    const tgt = prey && d2(prey, r) < 80 ? prey : nearest(r, S.us)?.g;
    if (!tgt) { r.y -= 0.45 * dt; if (r.y < -8) r.alive = false; continue; }
    for (const f of S.air) if (f.t === "fighter" && airborne(f) && f.st !== "rtb" && !r.tried.has(f.id) && d2(f, r) < 25) {
      r.tried.add(f.id); const p = 0.85 + (S.air.filter((o) => o.t === "fighter" && airborne(o) && d2(o, r) < 25).length > 1 ? 0.1 : 0);
      if (Math.random() < p) { r.alive = false; if (S.fm) stOf(f.id).air++; S.fx.push({ x: r.x, y: r.y, t: 0, c: "#7cc4ff", big: true }); say(`${f.name} — 적 전투기 편대 요격 성공!`, "hit"); break; }
      if (Math.random() < 0.15) loseAir(f, "공중전에서 피격 — 격추"); else say(`${f.name} 요격 실패 — 적기 계속 남하`, "bad");
    }
    if (!r.alive) continue;
    const dx = tgt.x - r.x, dy = tgt.y - r.y, L = Math.hypot(dx, dy), s = Math.min(L, 0.45 * dt); r.x += (dx / (L || 1)) * s; r.y += (dy / (L || 1)) * s;
    if (tgt.t && L < 3) { loseAir(tgt, "적 전투기에 격추"); r.alive = false; }
    else if (!tgt.t && L < 20) { launch2({ x: r.x, y: r.y, name: "적 전투기", side: "foe" }, tgt, 4, "적기 대함미사일", 35); say(`적 전투기 편대 대함미사일 4발 발사 → ${tgt.name}`, "bad"); r.alive = false; }
  }
}

function fmDetected(f) {
  if (!S.fm) return;
  const obs = [...S.us.filter((u) => alive(u).length && d2(u, f) < detR(u)).map((u) => u.id), ...S.air.filter((u) => airborne(u) && AIR_T[u.t].det && d2(u, f) < AIR_T[u.t].det).map((u) => u.id), ...S.sup.filter((x) => x.k === "p3c" && d2(x, f) < 30).map((x) => x.id || "p3c")];
  for (const k of obs) stOf(k).det++;
  const who = obs[0] && (S.us.find((u) => u.id === obs[0])?.name || short(S.air.find((u) => u.id === obs[0])?.name || "") || "P-3C");
  const acts = []; if (S.isAir) { const rd = S.air.filter((u) => u.t === "fighter" && u.st === "ready" && u.asm > 0); if (rd.length) acts.push([`대기 전투기 즉시 타격 (${rd.length})`, () => strikeMission(f, rd.map((u) => u.id))]); }
  else { const g = S.us.find((u) => u.fmRole === "strike" && alive(u).length); if (g) acts.push([`${g.name} 요격 기동`, () => { g.mission = "strike"; g.path = route(g, f.path[0] || f); g.seek = 70; }]); }
  hl(`${f.name} 탐지!`, `${who || "정찰 수단"}이(가) ${f.name}을(를) 찾았습니다 — <b>${alive(f).map((x) => x.n).join(" · ")}</b>. ${GOAL.n}까지 약 ${fmtT(etaGoal(f))}.`, acts, "", !S.foe.some((x) => x !== f && x.everSeen));
}
function step(dt) {
  S.t += dt; S.evade = Math.max(0, S.evade - dt);
  for (const f of S.foe) { const v = alive(f).length > 0 && !(f.delay && S.t < f.delay); const was = f.seen; /* not yet sailed: cannot be seen */ f.seen = v && seenFoe(f); if (f.seen && !was) { say(`${f.name} 탐지 — ${alive(f).map((s) => s.n).join(", ")}`, "bad"); if (!f.everSeen) fmDetected(f); } if (f.seen) f.everSeen = true; }
  if (!S.decoy.gone && S.us.some((u) => d2(u, S.decoy) < detR(u) * 0.8)) { S.decoy.gone = true; say("미확인 접촉 확인 결과 — 기만체(허위 표적)로 판명.", "hit"); }
  for (const g of S.us) { if (!alive(g).length) continue; usMove(g, dt); }
  for (const f of S.foe) { if (!alive(f).length || (f.delay && S.t < f.delay)) continue; foeMove(f, dt); }
  if (S.isAir) airStep(dt);
  fmStep(dt);
  combat(dt); support(dt); missiles(dt); events(); judge();
}
function nearest(g, list) { let b = null, d = Infinity; for (const o of list) { if (!alive(o).length) continue; const dd = d2(g, o); if (dd < d) { d = dd; b = o; } } return b ? { g: b, d } : null; }
function usMove(g, dt) {
  const sp = SPDS[g.fuel > 0 ? g.spd || "eco" : "slow"], moving = g.path.length || g.mission !== "hold";
  if (g.fuel != null && moving) { g.fuel = Math.max(0, g.fuel - sp[2] * dt * (S.fm?.concept === "forward" ? 1.3 : 1)); if (g.fuel <= 0 && !g.dry) { g.dry = true; say(`${g.name} 연료 고갈 — 저속으로만 기동`, "bad"); } }
  const v = SPD * sp[1] * (S.evade > 0 ? 0.7 : 1), t = nearest(g, S.foe.filter((f) => f.seen && !f.gone));
  if (g.mission === "scout" && t && t.d < 26) { moveTo(g, g.home, dt, v); return; }
  if (g.mission === "strike" && t && t.d < (g.seek || 48)) { if (t.d > (g.close || 24)) moveTo(g, t.g, dt, v); return; }
  if (g.path.length) { if (moveTo(g, g.path[0], dt, v)) g.path.shift(); }
}
function foeMove(f, dt) {
  if (f.gone) return; const t = nearest(f, S.us.filter((u) => foeSees(f, u)));
  if (strength(f) < 0.3) { if (!f.retreat) { f.retreat = true; say(`${f.name} 퇴각 개시`, "hit"); hl(`${f.name} 퇴각!`, `전력이 30% 아래로 떨어진 ${f.name}이(가) 북쪽으로 물러납니다. 남은 적 ${S.foe.filter((x) => alive(x).length && !x.gone && !x.retreat).length}개 전단.`, [], "g"); } if (moveTo(f, f.home, dt, SPD)) f.gone = true; return; }
  if (t && t.d < 24) return; /* hold and shoot */
  if (f.path.length) { if (moveTo(f, f.path[0], dt, SPD * 0.9)) f.path.shift(); }
}
/** one engagement report per salvo: launched → intercepted → hits → damage */
function mkRep(w, fromName, side, to, n, key) { const r = { w, from: fromName, key, side, to: to.name, toG: to, n, icpt: 0, hit: 0, dmg: [], left: n, t: S.t }; (S.reps ??= []).push(r); return r; }
function launch2(from, to, n, w, T = 40, rng = null) {
  const r = mkRep(w, from.name, from.side, to, n, from.id || from.ref?.id || from.key), d = rng ?? d2(from, to); if (S.fm) S.fm.fs[from.side].n += n;
  for (let i = 0; i < n; i++) S.msl.push({ x: from.x + (Math.random() - 0.5) * 2, y: from.y + (Math.random() - 0.5) * 2, to, from, side: from.side, t: 0, T: T + Math.random() * 15, rep: r, sz: n, rng: d });
  return r;
}
function salvo(from, to) {
  const want = from.side === "us" ? (S.fm?.rules.sat && alive(to).reduce((a, x) => a + x.sam, 0) > 20 ? 8 : from.salvoN || 4) : Math.min(alive(from).reduce((a, s) => a + (s.asm > 0 ? 1 : 0), 0) * 2, 8); let shot = 0;
  for (let k = 0; k < 8 && shot < want; k++) for (const s of alive(from)) if (s.asm > 0 && shot < want) { s.asm--; shot++; }
  if (from.side === "us" && S.preempt > 0 && shot) { S.preempt--; shot += 2; }
  if (!shot) { if (from.side === "us" && !from.dryW) { from.dryW = true; say(`${from.name} 대함미사일 소진`, "bad"); } return; }
  if (from.side === "us") { S.shots += shot; from.firedAt = S.t; }
  launch2(from, to, shot, from.side === "us" ? "해성" : "적 대함미사일");
}
function combat(dt) {
  for (const a of [...S.us, ...S.foe]) {
    if (!alive(a).length || a.gone || (a.delay && S.t < a.delay)) continue;
    a.fireT -= dt; if (a.fireT > 0) continue;
    if (a.side === "us" && (a.roe === "hold" || S.fm?.shout.aaw || a.fmRes)) { a.fireT = 5; continue; }
    const pool0 = a.side === "us" ? S.foe.filter((f) => f.seen && !f.gone) : S.us.filter((u) => foeSees(a, u)), bait = a.side === "foe" && pool0.find((u) => u.bait && alive(u).length && d2(a, u) < 30), pool = bait ? [bait] : pool0, t = nearest(a, pool), rng = a.side === "us" && a.roe === "tight" ? 18 : 30;
    if (t && t.d < rng) { salvo(a, t.g); a.fireT = 75; } else a.fireT = 5;
  }
}
function missiles(dt) {
  for (let i = S.msl.length - 1; i >= 0; i--) {
    const m = S.msl[i]; m.t += dt; const k = Math.min(1, dt / Math.max(1, m.T - m.t + dt)); m.x += (m.to.x - m.x) * k; m.y += (m.to.y - m.y) * k;
    if (m.t < m.T) continue; S.msl.splice(i, 1);
    const tgt = m.to, live = alive(tgt), R = m.rep; if (R) R.left--; if (!live.length) { repDone(R); continue; }
    const sam = live.reduce((a, s) => a + s.sam, 0), capOn = tgt.side === "us" && (S.sup.some((s) => s.k === "cap" && d2(s, tgt) < 15) || S.air.some((u) => u.job === "cap" && u.st === "station" && d2(u, tgt) < 20));
    let p = clamp(0.25 + sam / (live.length * 60), 0.15, 0.78) * (tgt.side === "us" ? (S.ctx.mods.icptK || 1) * (capOn ? 1.2 : 1) : 1)
      * (m.sz ? clamp(1.15 - 0.06 * m.sz, 0.6, 1.1) : 1) /* saturation: big salvos overwhelm the defence */ * (m.rng == null ? 1 : m.rng > 22 ? 1.15 : m.rng < 18 ? 0.8 : 1) /* long shots give time to react */
      * (S.fm ? (tgt.side === "us" ? (S.fm.concept === "deep" ? 1.15 : 1) * (S.fm.shout.aaw ? 1.2 : 1) : (S.fm.concept === "forward" ? 0.85 : 1) * (S.fm.concept === "decoy" && S.us.find((g) => g.id === R?.key)?.fmRole === "strike" ? 0.75 : 1)) : 1);
    if (sam > 0) { const sh = live.find((s) => s.sam > 0); sh.sam = Math.max(0, sh.sam - 2); } else p = 0;
    if (Math.random() < clamp(p, 0, 0.9)) { S.fx.push({ x: tgt.x, y: tgt.y, t: 0, c: "#7cc4ff" }); if (R) { R.icpt++; repDone(R); } if (S.fm) { S.fm.fs[m.side].icpt++; if (tgt.side === "us") stOf(tgt.id).icpt++; } continue; }
    const s = live[(Math.random() * live.length) | 0], dmg = 34 * (m.side === "us" ? S.ctx.mods.outK || 1 : (S.ctx.mods.inK || 1) * (S.evade > 0 ? 0.7 : 1));
    s.hp = Math.max(0, s.hp - dmg); if (m.side === "us") S.hits++;
    S.fx.push({ x: tgt.x, y: tgt.y, t: 0, c: "#ff6b5e", big: true });
    if (s.hp <= 0) say(`${s.name}${m.side === "us" ? " 격침!" : " 피격 침몰"}`, m.side === "us" ? "hit" : "bad");
    if (S.fm) { S.fm.fs[m.side].hit++; if (tgt.side === "us") stOf(tgt.id).dmg += dmg; if (R?.key) { stOf(R.key).hits++; if (s.hp <= 0) stOf(R.key).kills++; } if (s.hp <= 0 && m.side === "us" && S.fm.firstKill == null) S.fm.firstKill = S.t; if (s.hp <= 0 && tgt.side === "us") hl(`${s.name} 침몰`, `${tgt.name}의 ${s.name}이(가) 적 미사일에 침몰했습니다. 남은 전력 ${Math.round(strength(tgt) * 100)}%.`, [["대공 집중 (요격 +20%)", () => shout("aaw")], ["전면 후퇴", () => shout("retreat")]], "r", true); }
    if (R) { R.hit++; R.dmg.push([s.name, s.hp <= 0 ? "격침" : s.hp / s.max < 0.4 ? "대파" : "손상"]); repDone(R); }
  }
  for (let i = S.fx.length - 1; i >= 0; i--) { S.fx[i].t += dt; if (S.fx[i].t > 25) S.fx.splice(i, 1); }
}
function repDone(R) {
  if (!R || R.left > 0 || R.done != null) return; R.done = S.t; S.repShow = R;
  const dm = [...new Map(R.dmg.map(([n, k]) => [n, k])).entries()].map(([n, k]) => `${n} ${k}`).join(", ");
  say(`[교전] ${R.w} ${R.n}발 → 요격 ${R.icpt} · 명중 ${R.hit}${dm ? ` · ${dm}` : ""}`, R.side === "us" ? (R.hit ? "hit" : "") : R.hit ? "bad" : "hit");
  if (S.fm && (R.side === "us" ? R.hit > 0 && R.n >= 2 : R.n >= 4)) { const big = R.dmg.some(([, k]) => k === "격침");
    hl(R.side === "us" ? `${R.from} 일제사격${R.hit >= R.n / 2 ? " 명중!" : ""}` : `적 미사일 공격 — ${R.to}`, `<div class="fl"><span>${R.w}</span><b class="a">${R.n}</b><i>발사 →</i><span>${R.side === "us" ? "적 요격" : "아군 요격"}</span><b class="b">${R.icpt}</b><i>→</i><span>${R.side === "us" ? "명중" : "피격"}</span><b class="c">${R.hit}</b></div><div>${dm || (R.side === "us" ? "피해 없음" : "아군 방공 성공 — 피해 없음")}</div>${R.side === "us" && R.icpt / R.n > 0.5 ? `<small>참모: 적 대공이 강합니다 — 포화 사격으로 발수를 늘리십시오.</small>` : ""}`,
      R.side === "us" && R.icpt / R.n > 0.5 ? [["포화 사격 (8발)", () => shout("sat")]] : R.side === "foe" && R.hit ? [["대공 집중", () => shout("aaw")]] : [], R.side === "us" ? "" : "r", big); }
}
function support(dt) {
  for (const s of S.sup) {
    if (s.k === "battery") { s.cd -= dt; if (s.cd > 0) continue; const t = nearest(s, S.foe.filter((f) => f.seen && !f.gone)); if (t && t.d < BATTERY.range) { launch2({ x: s.x, y: s.y, name: "해안 지대함 포대", side: "us", id: s.id || "battery" }, t.g, 2, "지대함", 60); S.shots += 2; s.cd = 120; say("해안 포대 2발 발사.", "hit"); } else s.cd = 15; }
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
  if (k === "reserve") { if (S.pts >= 1) { S.pts--; const g = { id: "u9", name: "예비 고속정 편대", ...ORD0, x: 110, y: 72, ships: [ship("pkg", "고속함 1"), ship("pkg", "고속함 2")], mission: "strike", path: [], side: "us", fireT: 30 }; g.home = { x: g.x, y: g.y }; S.us.push(g); say("예비 고속정 편대 합류.", "hit"); } else say("지원 포인트가 없어 투입하지 못했습니다.", "bad"); }
  if (k === "scramble") { const u = air("a9", "fighter", "비상대기 편대 (FA-50)"); u.asm = 2; u.sec = "s2"; S.air.push(u); secJob(u); launch(u); }
  if (k === "evade") { S.evade = 300; say("전 전단 회피 기동.", "hit"); }
  if (k === "preempt") { S.preempt = 2; say("선제 타격 준비 — 다음 사격 증강.", "hit"); }
}
function judge() {
  if (S.phase !== "run") return;
  for (const f of S.foe) { if (!alive(f).length || f.gone) continue; const inG = d2(f, GOAL) < GOAL.r; S.inside[f.id] = inG ? (S.inside[f.id] || 0) + 1 : 0; if (S.inside[f.id] > 4) return finish(false, `${f.name} ${GOAL.n} 돌파 — 차단 실패`); }
  if (!S.isAir && !S.us.some((g) => alive(g).length)) return finish(false, "아군 전단 전멸"); /* 항공 작전: 함정이 전멸해도 항공으로 막으면 계속 */
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

// ── FM식 작전: 작전 전술판 → 자동 진행(하이라이트·중계·지시·예비) → 결과·평점 ──
const CONCEPTS = {
  deep: { n: "⛨ 종심 방어", d: "연평 해역 앞에 주력을 두고 들어오는 적을 받아칩니다. 처음이라면 추천.", pro: ["안정적", "아군 요격 +15%"], con: ["적 선제 사격 허용"] },
  forward: { n: "➤ 전진 차단", d: "경계선 가까이 나가 적이 내려오자마자 칩니다.", pro: ["선제 타격 — 적 요격 −15%"], con: ["연료 소모 ×1.3", "적과 빨리 맞닥뜨림"] },
  decoy: { n: "◈ 기만 유인", d: "전위가 미끼로 적을 끌고, 전파를 끈 타격대가 옆에서 칩니다.", pro: ["타격대 명중 ↑ (적 요격 −25%)"], con: ["미끼(전위)가 집중 사격받음", "정찰 필수"] },
};
const SLOTP = {
  deep: { front: { x: 30, y: 38 }, main: { x: 72, y: 48 }, strike: { x: 44, y: 60 }, cap: { x: 76, y: 41 }, reserve: { x: 90, y: 62 }, recon: "s1", recon2: "s4" },
  forward: { front: { x: 20, y: 28 }, main: { x: 58, y: 44 }, strike: { x: 36, y: 44 }, cap: { x: 62, y: 39 }, reserve: { x: 80, y: 56 }, recon: "s1", recon2: "s1" },
  decoy: { front: { x: 48, y: 46 }, main: { x: 74, y: 50 }, strike: { x: 30, y: 56 }, cap: { x: 76, y: 43 }, reserve: { x: 90, y: 62 }, recon: "s4", recon2: "s1" },
};
const AIRSLOT = { strike: { x: 118, y: 86 }, tanker: { x: 84, y: 64 }, airlift: { x: 86, y: 36 }, reserve: { x: 108, y: 90 } };
const SLOTS = {
  sea: [["front", "전위 초계", "정찰 전단 또는 P-3C — 적을 먼저 찾습니다"], ["main", "주력 방어", "연평 해역을 지킵니다"], ["strike", "타격대", "탐지된 적을 측면에서 칩니다"], ["cap", "방공(CAP)", "공군 CAP — 주력 위 적기·미사일 요격"], ["reserve", "예비", "작전 중 '예비 투입'으로 출동"]],
  air: [["recon", "정찰", "초계기·헬기 — 적을 찾습니다"], ["cap", "방공(CAP)", "전투기 — 연평 상공에서 적기 요격"], ["strike", "타격대", "전투기·헬기 — 탐지된 적을 자동으로 타격"], ["tanker", "급유", "급유기 — 체공시간 연장"], ["airlift", "공수", "수송기 — 연평도에 지대함 유도탄 반"], ["reserve", "예비", "작전 중 '예비 투입'으로 출격"]],
};
const SHOUTS = {
  sea: [["attack", "➤ 공세 전환", "모든 전단 전진 · 먼저 다가가 사격"], ["defend", "⛨ 방어 유지", "연평 해역으로 집결"], ["retreat", "↩ 전면 후퇴", "손실 최소화 · 해역 일부 포기"], ["emcon", "📡 전파 차단", "은밀 · 탐지 ↓ (다시 누르면 해제)"], ["sat", "🎯 포화 사격", "일제사격 8발 · 탄 소모 ↑"], ["aaw", "🛡 대공 집중", "요격 +20% · 대함 사격 중지 (토글)"]],
  air: [["attack", "➤ 총공격", "대기 중인 전투기 전부 즉시 타격"], ["capall", "🛡 방공 강화", "대기 전투기 전부 연평 CAP"], ["safe", "↩ 약한 기체 후퇴", "초계기·급유기·수송기 귀환"], ["sat", "🎯 포화 사격", "함정 일제사격 8발"], ["aaw", "🛡 대공 집중", "함정 요격 +20% · 대함 사격 중지 (토글)"]],
};
const RESERVES = {
  sea: [["resgrp", "예비 전단", "예비 칸의 전단이 연평으로 출동"], ["pkg", "예비 고속정 편대", "고속함 2척 합류"], ["fa50", "비상대기 FA-50", "연평 상공 CAP"], ["battery", "해안 지대함 포대", "강화도 포대 사격 개시"]],
  air: [["resair", "예비 편대", "예비 칸의 편대가 출격"], ["fa50", "비상대기 FA-50", "연평 상공 CAP"], ["pkg", "예비 고속정 편대", "고속함 2척 합류"], ["battery", "해안 지대함 포대", "강화도 포대 사격 개시"]],
};
const INS = [["roe", "교전규칙", [["tight", "근접 사격"], ["free", "자유 사격"]], { tight: `${KMU(18)}km 안에서만 — 명중 ↑, 적이 먼저 쏠 수 있음`, free: `최대 ${KMU(30)}km — 먼저 쏘지만 요격당하기 쉬움` }],
  ["radar", "레이더", [["on", "켜기"], ["off", "전파 차단"], ["strike", "타격 직전만"]], { on: "멀리 보지만 적도 아군을 멀리서 봄", off: "숨지만 근시 — 정찰 수단 필요", strike: "평소엔 끄고 적이 가까우면 켬" }],
  ["salvo", "일제사격", [[2, "절약 2"], [4, "균형 4"], [8, "포화 8"]], { 2: "아껴 쏨 — 대부분 요격될 수 있음", 4: "균형", 8: "적 대공 포화 — 명중 ↑ · 탄 빨리 소진" }],
  ["tempo", "템포", [["slow", "신중"], ["norm", "보통"], ["aggr", "공세"]], { slow: "타격대가 멀리서만 교전, 추격 안 함", norm: "보통", aggr: "타격대가 바짝 다가가 사격 — 피격 ↑" }],
  ["loss", "손실 허용", [["low", "낮음"], ["norm", "보통"], ["high", "높음"]], { low: "전력 40% 아래 전단은 스스로 물러남", norm: "전력 25% 아래면 물러남", high: "끝까지 싸움" }]];
const RULES = [["sat", "적 대공 '강' 표적이면", "포화 8발"], ["weak", "적 전투기 출현 시", "약한 기체 자동 후퇴"], ["ammo", "미사일 30% 이하", "방어로 전환"]];

function fmInit() {
  S.fm = { concept: "deep", roles: {}, ins: { roe: "free", radar: "on", salvo: 4, tempo: "norm", loss: "norm" }, rules: { sat: true, weak: true, ammo: true }, tab: "tac", pick: null, res: 3, resUsed: [], hl: null, hlQ: [], lastHl: -999, half: false, halfDone: false, ff: false, st: {}, fs: { us: { n: 0, icpt: 0, hit: 0 }, foe: { n: 0, icpt: 0, hit: 0 } }, firstKill: null, shout: {}, view: "" };
  fmDefault();
}
const fmCards = () => S.isAir ? S.air.map((u) => ({ id: u.id, n: short(u.name), sub: u.name.match(/\((.*)\)/)?.[1] || u.n, ic: AIR_IC[u.t], ok: { fighter: ["cap", "strike", "reserve"], mpa: ["recon"], helo: ["recon", "strike"], tanker: ["tanker"], transport: ["airlift"] }[u.t] }))
  : [...S.us.map((g) => ({ id: g.id, n: g.name, sub: g.ships.map((x) => x.name).join(" · "), ic: "■", ok: ["front", "main", "strike", "reserve"] })), { id: "p3c", n: "P-3C 해상초계기", sub: `정찰 ${KMU(30)}km`, ic: "◎", ok: ["front"] }, { id: "cap", n: "공군 CAP", sub: "KF-16 편대 · 요격 +20%", ic: "✈", ok: ["cap"] }];
function fmDefault() {
  const R = (S.fm.roles = {}), put = (slot, id) => { if (id) (R[slot] ??= []).push(id); };
  if (S.isAir) { for (const u of S.air) put(u.t === "mpa" ? "recon" : u.t === "helo" ? "recon" : u.t === "tanker" ? "tanker" : u.t === "transport" ? "airlift" : u.id === "a1" ? "cap" : u.id === "a7" ? "reserve" : "strike", u.id); return; }
  put("main", "u1"); if (S.us[1]) put("strike", "u2"); if (S.us[2]) put("front", "u3"); else put("front", "p3c"); if (S.us[2]) put("front", "p3c"); put("cap", "cap");
}
const roleOf = (id) => Object.keys(S.fm.roles).find((k) => S.fm.roles[k].includes(id));
function fmAssign(id, slot) {
  const c = fmCards().find((x) => x.id === id); if (!c) return;
  if (!c.ok.includes(slot)) { say(`${c.n}은(는) '${(SLOTS[S.isAir ? "air" : "sea"].find((s) => s[0] === slot) || [])[1]}' 역할을 맡을 수 없습니다.`, "bad"); S.fm.flash = `${c.n} → 이 역할 불가`; return; }
  for (const k of Object.keys(S.fm.roles)) S.fm.roles[k] = S.fm.roles[k].filter((x) => x !== id);
  (S.fm.roles[slot] ??= []).push(id); S.fm.pick = null; S.fm.flash = null; S.dirty = true;
}
function slotPos(slot) {
  const P = SLOTP[S.fm.concept];
  if (!S.isAir) return P[slot];
  if (slot === "recon") return secById(P.recon).c; if (slot === "cap") return { x: P.cap.x, y: P.cap.y }; return AIRSLOT[slot] || P[slot] || P.main;
}
/** 작전 개시: 역할·부대 지시를 실제 명령으로 바꾼다 */
function fmApply() {
  const F = S.fm, I = F.ins, R = F.roles;
  for (const g of S.us) {
    const role = roleOf(g.id) || "main"; g.fmRole = role; g.roe = I.roe; g.radarMode = I.radar; g.radar = I.radar === "on"; g.salvoN = I.salvo;
    g.seek = I.tempo === "slow" ? 30 : I.tempo === "aggr" ? 60 : 48; g.close = I.tempo === "slow" ? 28 : I.tempo === "aggr" ? 15 : 24;
    if (role === "reserve") { g.mission = "hold"; g.path = []; g.fmRes = true; continue; }
    g.mission = role === "front" ? (F.concept === "decoy" ? "hold" : "scout") : role === "strike" ? "strike" : "hold";
    if (role === "front" && F.concept === "decoy") { g.radar = true; g.radarMode = "on"; g.bait = true; }
    if (role === "strike" && F.concept === "decoy") { g.radar = false; g.radarMode = "strike"; }
    g.path = route(g, slotPos(role));
  }
  if (!S.isAir) {
    if ((R.front || []).includes("p3c")) S.sup.push({ k: "p3c", x: slotPos("front").x + 6, y: slotPos("front").y - 4, used: false, id: "p3c" });
    if ((R.cap || []).includes("cap")) S.sup.push({ k: "cap", x: slotPos("main").x, y: slotPos("main").y - 3, used: false, id: "cap" });
  } else {
    const P = SLOTP[F.concept]; let rc = 0;
    for (const u of S.air) {
      const role = roleOf(u.id); u.fmRole = role;
      if (role === "recon") { assignSector(u.id, secById(rc++ ? P.recon2 : P.recon)); }
      else if (role === "cap") assignSector(u.id, secById("s2"));
      else if (role === "tanker") assignSector(u.id, secById("s5"));
      else if (role === "airlift") assignSector(u.id, secById("s2"));
    }
  }
  say(`작전 개시 — ${CONCEPTS[F.concept].n.slice(2)}. 교전규칙 ${I.roe === "free" ? "자유 사격" : "근접 사격"}, 일제사격 ${I.salvo}발.`, "hit");
}
function fmStep(dt) {
  const F = S.fm; if (!F) return; const I = F.ins;
  const thr = { low: 0.4, norm: 0.25, high: -1 }[I.loss];
  for (const g of S.us) {
    if (!alive(g).length) continue;
    if (g.radarMode === "strike") { const t = nearest(g, S.foe.filter((f) => f.seen && !f.gone)); g.radar = !!(t && t.d < 34) || F.shout.emcon === false; }
    if (F.shout.emcon) g.radar = false;
    if (!g.fmRet && strength(g) < thr) { g.fmRet = true; g.mission = "hold"; g.path = route(g, slotPos("reserve") || { x: 90, y: 62 }); hl("손실 허용 한계 — 전단 후퇴", `${g.name} 전력 ${Math.round(strength(g) * 100)}% — 부대 지시(손실 허용 '${{ low: "낮음", norm: "보통" }[I.loss]}')에 따라 스스로 물러납니다.`, [], "y"); }
    if (F.rules.ammo && !g.ammoRet && g.mission === "strike") { const a = alive(g).reduce((s, x) => s + x.asm, 0), m = alive(g).reduce((s, x) => s + x.asm0, 0); if (m && a / m < 0.3) { g.ammoRet = true; g.mission = "hold"; g.path = route(g, slotPos("main")); say(`${g.name} 미사일 30% 이하 — 조건부 지시로 방어 전환`); } }
  }
  if (S.isAir) {
    for (const u of S.air) if (u.fmRole === "strike" && u.st === "ready" && u.asm > 0 && !u.tgt) { const f = S.foe.filter((x) => x.seen && alive(x).length && !x.gone && !x.retreat && !(x.delay && S.t < x.delay)).sort((a, b) => etaGoal(a) - etaGoal(b))[0]; if (f) strikeMission(f, [u.id]); }
  }
  if (F.rules.weak && S.isAir) for (const r of S.raids) if (r.alive && !r.fmWarned) { r.fmWarned = true; if (!S.air.some((u) => u.job === "cap" && airborne(u))) for (const u of S.air) if (airborne(u) && ["mpa", "tanker", "transport"].includes(u.t)) { u.st = "rtb"; say(`${short(u.name)} — 조건부 지시로 위협 회피 귀환`); } }
  if (!F.halfDone && S.t >= 900) { F.halfDone = true; F.half = halfOpts(); }
}
function halfOpts() {
  const ours = S.us.reduce((a, g) => a + strength(g), 0), theirs = S.foe.filter((f) => !f.gone).reduce((a, f) => a + strength(f), 0), ammo = S.us.reduce((a, g) => a + alive(g).reduce((s, x) => s + x.asm, 0), 0);
  const seen = S.foe.filter((f) => f.seen && alive(f).length && !f.gone).length, hidden = S.foe.filter((f) => alive(f).length && !f.gone && !f.seen).length;
  const L = [];
  L.push(ours > theirs ? ["attack", "공세로 전환", "아군 전력이 앞섭니다. 남은 적을 쫓아가 끝냅니다.", "작전처장"] : ["defend", "연평 해역으로 집결", "전력이 대등하거나 불리합니다. 해역 방어에 집중합니다.", "작전처장"]);
  L.push(hidden ? ["scout", "정찰 강화", `미탐지 적 전단 ${hidden}개 — 전위·정찰 수단을 북쪽으로 더 밀어 올립니다.`, "정보처장"] : ["sat", "포화 사격으로 마무리", "적 대공이 남아 있습니다. 일제사격을 8발로 올립니다.", "정보처장"]);
  L.push(ammo < 16 ? ["save", "탄약 절약", `남은 대함미사일 ${ammo}발 — 일제사격을 2발로 줄여 끝까지 버팁니다.`, "군수참모"] : ["aaw", "대공 방어 강화", "적 미사일 반격에 대비해 요격을 강화합니다(대함 사격 일시 중지).", "작전참모"]);
  return { ours: Math.round((ours / Math.max(0.01, ours + theirs)) * 100), seen, hidden, ammo, opts: L };
}
function shout(k) {
  const F = S.fm, gs = S.us.filter((g) => alive(g).length && !g.fmRes);
  if (k === "attack" && !S.isAir) { for (const g of gs) { g.mission = "strike"; g.seek = 70; g.close = 15; g.fmRet = false; } say("[지휘] 공세 전환 — 전 전단 전진", "hit"); }
  if (k === "defend") { for (const g of gs) { g.mission = "hold"; g.path = route(g, slotPos("main")); } say("[지휘] 방어 유지 — 연평 해역으로 집결", "hit"); }
  if (k === "retreat") { for (const g of gs) { g.mission = "hold"; g.roe = "tight"; g.path = route(g, slotPos("reserve")); } say("[지휘] 전면 후퇴 — 손실 최소화", "bad"); }
  if (k === "emcon") { F.shout.emcon = !F.shout.emcon; for (const g of gs) g.radar = !F.shout.emcon; say(`[지휘] ${F.shout.emcon ? "전 전단 전파 차단" : "전파 차단 해제 — 레이더 켜기"}`, "hit"); }
  if (k === "sat") { for (const g of S.us) g.salvoN = 8; F.ins.salvo = 8; say("[지휘] 포화 사격 — 일제사격 8발", "hit"); }
  if (k === "save") { for (const g of S.us) g.salvoN = 2; F.ins.salvo = 2; say("[지휘] 탄약 절약 — 일제사격 2발"); }
  if (k === "aaw") { F.shout.aaw = !F.shout.aaw; say(`[지휘] ${F.shout.aaw ? "대공 집중 — 대함 사격 중지" : "대공 집중 해제"}`, "hit"); }
  if (k === "scout") { for (const g of gs) if (g.fmRole === "front") { g.mission = "scout"; g.path = route(g, { x: 34, y: 30 }); } for (const s of S.sup) if (s.k === "p3c") { s.y = Math.max(20, s.y - 8); } for (const u of S.air) if (u.t === "mpa" && u.st !== "lost") assignSector(u.id, secById("s1")); say("[지휘] 정찰 강화 — 전위·초계기 북쪽으로", "hit"); }
  if (S.isAir && k === "attack") { const rd = S.air.filter((u) => u.t === "fighter" && u.st === "ready" && u.asm > 0), f = S.foe.filter((x) => x.seen && alive(x).length && !x.gone && !(x.delay && S.t < x.delay)).sort((a, b) => etaGoal(a) - etaGoal(b))[0]; if (f && rd.length) strikeMission(f, rd.map((u) => u.id)); else say("[지휘] 총공격 — 보낼 전투기나 탐지된 적이 없습니다", "bad"); }
  if (k === "capall") { for (const u of S.air) if (u.t === "fighter" && u.st !== "lost" && u.job !== "strike") assignSector(u.id, secById("s2")); say("[지휘] 방공 강화 — 전투기 연평 CAP 집중", "hit"); }
  if (k === "safe") { for (const u of S.air) if (airborne(u) && ["mpa", "tanker", "transport"].includes(u.t)) u.st = "rtb"; say("[지휘] 약한 기체 후퇴"); }
  F.lastShout = k; S.dirty = true;
}
function useReserve(k) {
  const F = S.fm; if (F.res <= 0 || F.resUsed.includes(k)) return; F.res--; F.resUsed.push(k);
  if (k === "resgrp") { const g = S.us.find((x) => x.fmRes && alive(x).length); if (g) { g.fmRes = false; g.mission = "strike"; g.path = route(g, slotPos("main")); say(`[예비] ${g.name} 출동 — 연평으로`, "hit"); } else { F.res++; F.resUsed.pop(); say("예비 칸에 전단이 없습니다.", "bad"); } }
  if (k === "resair") { const u = S.air.find((x) => x.fmRole === "reserve" && x.st === "ready"); if (u) { u.fmRole = "strike"; say(`[예비] ${u.name} 투입 — 타격대 합류`, "hit"); } else { F.res++; F.resUsed.pop(); say("예비 칸에 대기 편대가 없습니다.", "bad"); } }
  if (k === "pkg") { const g = { id: "u9", name: "예비 고속정 편대", ...ORD0, x: 110, y: 72, ships: [ship("pkg", "고속함 1"), ship("pkg", "고속함 2")], mission: "strike", path: [], side: "us", fireT: 30, salvoN: F.ins.salvo, seek: 48, close: 24 }; g.home = { x: g.x, y: g.y }; g.path = route(g, slotPos("main")); S.us.push(g); say("[예비] 고속정 편대 합류 — 연평으로", "hit"); }
  if (k === "fa50") { if (S.isAir) { const u = air("a9", "fighter", "비상대기 편대 (FA-50)"); u.asm = 2; S.air.push(u); assignSector(u.id, secById("s2")); launch(u); } else S.sup.push({ k: "cap", x: GOAL.x, y: GOAL.y - 4, used: false, id: "fa50" }); say("[예비] 비상대기 FA-50 출격 — 연평 상공 CAP", "hit"); }
  if (k === "battery") { if (!S.sup.some((s) => s.k === "battery")) S.sup.push({ k: "battery", x: BATTERY.x, y: BATTERY.y, cd: 20, id: "battery" }); say("[예비] 해안 지대함 포대 사격 개시", "hit"); }
  S.dirty = true;
}
/** highlight: pause and show a card (throttled; later ones only go to the feed) */
function hl(title, body, acts = [], cls = "", force = false) {
  const F = S.fm; if (!F || S.phase !== "run") return;
  if (!force && (F.hl || S.t - F.lastHl < 45)) return;
  F.hl = { title, body, acts, cls, at: S.t }; F.lastHl = S.t; F.ff = false; S.dirty = true;
}
const stOf = (k) => (S.fm.st[k] ??= { hits: 0, kills: 0, icpt: 0, dmg: 0, det: 0, air: 0, shots: 0 });
function fmEstimate() {
  const F = S.fm, R = F.roles, has = (s) => (R[s] || []).length > 0; let p = 40; const weak = [];
  if (S.isAir) {
    if (has("recon")) p += 15; else weak.push("정찰이 없어 적을 늦게 찾습니다");
    if (has("cap")) p += 14; else weak.push("방공(CAP)이 없어 적 전투기가 정찰기·급유기를 노립니다");
    if (has("strike")) p += 16 + 4 * (R.strike.length - 1); else weak.push("타격대가 없어 적을 칠 수 없습니다");
    if (has("tanker")) p += 3; if (has("airlift")) p += 4; if (has("reserve")) p += 2;
  } else {
    if (has("front")) p += 14; else weak.push("전위 초계가 없어 적을 늦게 찾습니다");
    if (has("main")) p += 16; else weak.push("주력 방어가 비어 연평 해역이 뚫리기 쉽습니다");
    if (has("strike")) p += 12; else weak.push("타격대가 없어 측면 공격이 불가능합니다");
    if (has("cap")) p += 6; if (has("reserve")) p += 3;
    if (F.concept === "decoy" && !(R.front || []).some((id) => id !== "p3c")) { p -= 12; weak.push("기만 유인인데 미끼 전단(전위)이 없습니다"); }
    if (F.concept === "forward" && !has("strike")) { p -= 6; weak.push("전진 차단은 타격대가 있어야 효과가 큽니다"); }
  }
  if (F.concept === "deep") p += 4;
  if (F.ins.salvo === 8) { p -= 2; weak.push("포화 8발 — 탄약이 중반에 바닥날 수 있음"); }
  if (F.ins.tempo === "aggr") p -= 3; if (F.ins.radar === "off" && !(S.isAir || (R.front || []).includes("p3c"))) { p -= 8; weak.push("전파 차단인데 P-3C 정찰이 없음"); }
  if (S.ctx.grade >= 4 && !S.isAir) weak.push("적 제2전단(해주)이 8분 뒤 북동쪽에서 출현 — 주력이 연평에 있어야 함");
  return { p: clamp(Math.round(p), 12, 92), weak: weak.slice(0, 3) };
}

// ── FM UI ──
/** 지도 위 역할 칸이 서로 겹치지 않게 밀어낸다 (지도 영역 안으로 제한) */
function fmSpread() {
  const box = $("#fmSlots"), map = box?.parentElement; if (!box || !map) return;
  const W = map.clientWidth, H = map.clientHeight, els = [...box.children], R = els.map((e) => ({ e, x: parseFloat(e.style.left), y: parseFloat(e.style.top), w: e.offsetWidth + 8, h: e.offsetHeight + 8 }));
  for (let it = 0; it < 60; it++) { let moved = false;
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], b = R[j], ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
      if (ox > 0 && oy > 0) { moved = true; if (ox < oy) { const d = (ox / 2 + 1) * (a.x <= b.x ? -1 : 1); a.x += d; b.x -= d; } else { const d = (oy / 2 + 1) * (a.y <= b.y ? -1 : 1); a.y += d; b.y -= d; } } }
    for (const r of R) { r.x = clamp(r.x, r.w / 2, W - r.w / 2); r.y = clamp(r.y, r.h / 2 + 4, H - r.h / 2); }
    if (!moved) break; }
  for (const r of R) { r.e.style.left = r.x + "px"; r.e.style.top = r.y + "px"; }
}
function fmBuild() {
  let el = $("#opMap"); if (!el) { el = document.createElement("div"); el.id = "opMap"; document.body.append(el); }
  el.className = "fm"; el.dataset.ph = "plan";
  el.innerHTML = `<div class="fm-top"><b class="brand">STEEL TIDE</b><span class="fm-title">${S.isAir ? "항공 작전 · 서해 항공 지원" : "작전 지휘 · 서해 해상 차단"}</span><div class="fm-tabs" id="fmTabs"></div><div class="fm-tr" id="fmTR"></div></div>
    <div class="fm-body"><aside class="fm-l" id="fmL"></aside><main class="fm-c"><div class="fm-map"><canvas id="omCv"></canvas><div id="fmSlots"></div><div id="fmScore"></div><div id="omRep"></div><div id="fmHL"></div><div id="fmIntel"></div></div><div class="fm-bot" id="fmBot"></div></main><aside class="fm-r" id="fmR"></aside></div>
    <div id="fmRes"></div><div id="omRes" hidden></div>`;
  el.style.display = "flex";
  const cv = $("#omCv"); const fit = () => { const r = cv.parentElement.getBoundingClientRect(); if (!r.width) return; cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio; cv.style.width = r.width + "px"; cv.style.height = r.height + "px"; S.dirty = true; };
  S.fit = fit; addEventListener("resize", fit); requestAnimationFrame(fit);
  cv.oncontextmenu = (e) => e.preventDefault();
  el.ondragstart = (e) => { const c = e.target.closest?.("[data-card]"); if (!c) return; S.fm.pick = c.dataset.card; e.dataTransfer.setData("text/plain", c.dataset.card); e.dataTransfer.effectAllowed = "move"; };
  el.ondragover = (e) => { if (e.target.closest?.("[data-slot]")) e.preventDefault(); };
  el.ondrop = (e) => { const s = e.target.closest?.("[data-slot]"); if (!s) return; e.preventDefault(); const id = e.dataTransfer.getData("text/plain") || S.fm.pick; if (id) fmAssign(id, s.dataset.slot); };
  el.onclick = onClick;
  S.key = (e) => { if (!S.on) return; if (e.code === "Space") { e.preventDefault(); e.stopImmediatePropagation(); if (S.phase === "run") { if (S.fm.hl) { S.fm.hl = null; S.dirty = true; } else S.paused = !S.paused; } } };
  addEventListener("keydown", S.key, true);
}
function fmClick(a) {
  const F = S.fm;
  if (a.startsWith("cn:")) F.concept = a.slice(3);
  else if (a.startsWith("tab:")) F.tab = a.slice(4);
  else if (a.startsWith("ins:")) { const [, k, v] = a.split(":"); F.ins[k] = k === "salvo" ? +v : v; }
  else if (a.startsWith("rule:")) { const k = a.slice(5); F.rules[k] = !F.rules[k]; }
  else if (a.startsWith("card:")) F.pick = F.pick === a.slice(5) ? null : a.slice(5);
  else if (a.startsWith("slot:")) { if (F.pick) fmAssign(F.pick, a.slice(5)); }
  else if (a.startsWith("unrole:")) { const id = a.slice(7); for (const k of Object.keys(F.roles)) F.roles[k] = F.roles[k].filter((x) => x !== id); }
  else if (a === "fmdef") fmDefault();
  else if (a === "fmgo") { fmApply(); S.phase = "run"; S.paused = false; S.speed = 2; $("#opMap").dataset.ph = "run"; requestAnimationFrame(() => S.fit()); }
  else if (a.startsWith("sh:")) shout(a.slice(3));
  else if (a.startsWith("rs:")) useReserve(a.slice(3));
  else if (a.startsWith("hla:")) { const f = F.hl?.acts[+a.slice(4)]?.[1]; F.hl = null; f?.(); }
  else if (a === "hlok") F.hl = null;
  else if (a.startsWith("half:")) { const k = a.slice(5); F.half = null; if (k !== "none") shout(k); }
  else if (a === "ff") F.ff = !F.ff;
  else if (a.startsWith("sp:")) { S.speed = +a.slice(3); F.ff = false; S.paused = false; }
  else if (a === "pz") S.paused = !S.paused;
  else return false;
  S.dirty = true; return true;
}
function fmPanel() {
  const F = S.fm, sig = JSON.stringify([S.phase, F.tab, F.concept, F.roles, F.ins, F.rules, F.pick, F.res, F.hl && F.hl.at, !!F.half, F.ff, S.speed, S.paused, Math.floor(S.t / 2), S.log[0]?.at, S.log.length, S.evt?.id, F.flash, S.repShow?.done, $("#omCv")?.width]);
  if (sig === S.psig && !S.dirty) return; S.psig = sig; S.dirty = false;
  if (S.evt && !F.hl && S.phase === "run") { const e = S.evt; F.hl = { title: e.t, body: "결정이 필요합니다.", acts: [[e.a[1] + ` — ${e.a[2]}`, () => resolveEvent(e.a[0])], [e.b[1] + ` — ${e.b[2]}`, () => resolveEvent(e.b[0])]], cls: "y", at: S.t, noOk: true }; }
  const el = $("#opMap"); if (el.dataset.ph !== S.phase) { el.dataset.ph = S.phase; requestAnimationFrame(() => S.fit()); }
  $("#fmTabs").innerHTML = (S.phase === "plan" ? [["tac", "① 작전 전술"], ["intel", "② 적 정보"]] : S.phase === "run" ? [["run", "③ 작전 진행"]] : [["res", "④ 작전 결과"]]).map(([k, n]) => `<span class="${F.tab === k || S.phase !== "plan" ? "on" : ""}" ${S.phase === "plan" ? `data-om="tab:${k}"` : ""}>${n}</span>`).join("");
  if (S.phase === "plan") fmPlanView(); else if (S.phase === "run") fmRunView(); else fmResultView();
}
const KIND = (id) => fmCards().find((c) => c.id === id);
function fmPlanView() {
  const F = S.fm, E = fmEstimate(), SL = SLOTS[S.isAir ? "air" : "sea"];
  $("#fmTR").innerHTML = `<button class="fm-ghost" data-om="fmdef">추천 배치로</button><button class="fm-go" data-om="fmgo">작전 개시 ›</button>`;
  const known = S.foe.filter((f) => !f.delay), later = S.foe.filter((f) => f.delay);
  $("#fmL").innerHTML = `<div class="fm-h"><i>1</i>작전 개념</div>${Object.entries(CONCEPTS).map(([k, c]) => `<button class="fm-cn${F.concept === k ? " on" : ""}" data-om="cn:${k}"><b>${c.n}</b><small>${c.d}</small><span>${c.pro.map((x) => `<em class="p">${x}</em>`).join("")}${c.con.map((x) => `<em class="c">${x}</em>`).join("")}</span></button>`).join("")}
    <div class="fm-h"><i>2</i>참모 분석</div><div class="fm-card fm-q">정보처장: "적 수상전단 <b>${S.foe.length}개</b>. ${known.map((f) => f.name).join("·")}은 이미 남하 중이고, ${later.map((f) => `${f.name}은 약 ${Math.round(f.delay / 60)}분 뒤 출항`).join(", ") || "추가 출항 징후는 없습니다"}."<br>${S.isAir ? `항공작전과장: "정찰기로 먼저 찾고, 전투기 1개는 CAP, 나머지는 <b>타격대</b>에 두십시오."` : `작전처장: "${S.us.length > 1 ? "<b>종심 방어</b>로 주력을 연평에 두고 타격대로 측면을 치는 것을 권합니다." : "전단이 하나뿐입니다. <b>종심 방어</b>로 연평을 지키고 P-3C로 먼저 찾으십시오."}"`}</div>
    <div class="fm-h">작전 적합도</div><div class="fm-fit">${fitBars().map(([n, v, c]) => `<span>${n}</span><i><em style="width:${v}%;background:${c}"></em></i>`).join("")}</div>`;
  $("#fmR").innerHTML = `<div class="fm-h"><i>4</i>부대 지시 <small>(전 부대 공통)</small></div><div class="fm-ins">${INS.filter(([k]) => !S.isAir || k === "salvo" || k === "loss").map(([k, n, opts, hint]) => `<span>${n}</span><div class="fm-seg">${opts.map(([v, t]) => `<button data-om="ins:${k}:${v}" class="${String(F.ins[k]) === String(v) ? "on" : ""}">${t}</button>`).join("")}</div><small>${hint[F.ins[k]]}</small>`).join("")}</div>
    <div class="fm-h"><i>5</i>조건부 지시</div>${RULES.filter(([k]) => S.isAir || k !== "weak").map(([k, c, d]) => `<button class="fm-rule${F.rules[k] ? " on" : ""}" data-om="rule:${k}"><span>${F.rules[k] ? "☑" : "☐"} ${c}</span><b>${d}</b></button>`).join("")}
    <div class="fm-h">예상 결과 <small>(참모 추정)</small></div><div class="fm-card fm-est"><div><span>성공 가능성</span><b class="${E.p > 65 ? "g" : E.p > 45 ? "y" : "r"}">${E.p}%</b></div>${E.weak.length ? E.weak.map((w) => `<small>⚠ ${w}</small>`).join("") : `<small class="g">✓ 큰 약점이 없습니다</small>`}</div>`;
  // slots on the map
  const cv = $("#omCv"), dpr = devicePixelRatio; if (cv && cv.width) {
    const { k, ox, oy } = view(), px = (p) => [(ox + p.x * k) / dpr, (oy + p.y * k) / dpr];
    $("#fmSlots").innerHTML = F.tab === "tac" ? SL.map(([s, n, d]) => { const p = slotPos(s); if (!p) return ""; const [x, y] = px(p), ids = F.roles[s] || []; const okP = F.pick && KIND(F.pick)?.ok.includes(s);
      return `<div class="fm-slot ${ids.length ? "" : "empty"} ${okP ? "can" : F.pick ? "no" : ""}" style="left:${x}px;top:${y}px" data-slot="${s}" data-om="slot:${s}"><span class="rt">${n}${S.isAir ? "" : ` · ${secOf(p)?.n || ""}`}</span>${ids.length ? ids.map((id) => `<b>${KIND(id)?.ic || ""} ${KIND(id)?.n || id} <a data-om="unrole:${id}">×</a></b>`).join("") : `<b class="e">+ ${d.split(" — ")[0]}</b>`}<small>${d.split(" — ")[1] || ""}</small></div>`; }).join("") : "";  fmSpread();
  }
  $("#fmIntel").innerHTML = F.tab === "intel" ? `<div class="fm-intel"><div class="fm-h">② 적 정보 — 정보처 판단</div><div class="fm-ig">${S.foe.map((f) => `<div class="fm-card"><b>${f.name}</b><small>${f.delay ? `약 ${Math.round(f.delay / 60)}분 뒤 출항 예상` : "남하 중 (위치 일부 확인)"}</small><div>${f.ships.map((x) => `<span class="fm-tag">${x.n}</span>`).join("")}</div><small>대함미사일 ${f.ships.reduce((a, x) => a + x.asm, 0)}발 · 대공 ${f.ships.reduce((a, x) => a + x.sam, 0) > 20 ? "강" : "약"}</small></div>`).join("")}</div>${S.isAir ? `<div class="fm-card" style="margin-top:10px">적 전투기 편대(MiG-29) 출격이 두 차례(약 8분·18분) 예상됩니다 — CAP이 없으면 초계기·급유기가 노려집니다.</div>` : `<div class="fm-card" style="margin-top:10px">서방 미확인 접촉(?)은 기만체일 가능성이 있습니다.</div>`}</div>` : "";
  $("#fmBot").innerHTML = `<div class="fm-h"><i>3</i>보유 전력 — 카드를 지도의 역할 칸에 끌어다 놓거나, 카드를 누른 뒤 역할 칸을 누르세요${F.flash ? ` <em class="r">· ${F.flash}</em>` : ""}</div><div class="fm-tray">${fmCards().map((c) => { const r = roleOf(c.id), rn = r && SL.find((x) => x[0] === r)?.[1]; return `<div class="fm-unit${F.pick === c.id ? " pick" : ""}${r ? "" : " free"}" draggable="true" data-card="${c.id}" data-om="card:${c.id}"><span class="ic">${c.ic}</span><span><b>${c.n}</b><small>${c.sub}</small><em>${rn ? `역할: ${rn}` : "미배치"}</em></span></div>`; }).join("")}</div>`;
  $("#fmScore").innerHTML = ""; $("#fmHL").innerHTML = "";
}
function fitBars() {
  const R = S.fm.roles, n = (s) => (R[s] || []).length;
  return S.isAir ? [["정찰", Math.min(100, n("recon") * 50), "#9be06a"], ["방공", Math.min(100, n("cap") * 60), "#7cc4ff"], ["타격력", Math.min(100, n("strike") * 35), "#ffb35c"], ["지속력", (n("tanker") ? 60 : 20) + (n("reserve") ? 30 : 0), "#d9c7ff"]]
    : [["정찰", Math.min(100, n("front") * 55), "#9be06a"], ["방어", Math.min(100, n("main") * 70 + n("cap") * 25), "#7cc4ff"], ["타격력", Math.min(100, n("strike") * 60 + (S.fm.ins.salvo === 8 ? 20 : 0)), "#ffb35c"], ["예비", Math.min(100, n("reserve") * 60 + 30), "#d9c7ff"]];
}
function fmRunView() {
  const F = S.fm, sunk = S.foe.flatMap((f) => f.ships).filter((s) => s.hp <= 0).length, lost = S.us.flatMap((g) => g.ships).filter((s) => s.hp <= 0).length + (S.airLost || 0);
  const our = S.us.reduce((a, g) => a + alive(g).reduce((s, x) => s + x.hp, 0), 0) + S.air.filter((u) => u.st !== "lost").length * 25, their = S.foe.filter((f) => !f.gone).reduce((a, f) => a + alive(f).reduce((s, x) => s + x.hp, 0), 0), dom = Math.round((our / Math.max(1, our + their)) * 100);
  $("#fmTR").innerHTML = `<div class="fm-spd"><button data-om="pz" class="${S.paused ? "on" : ""}">${S.paused ? "▶" : "⏸"}</button>${[1, 2, 4].map((s) => `<button data-om="sp:${s}" class="${S.speed === s && !F.ff ? "on" : ""}">x${s}</button>`).join("")}<button data-om="ff" class="${F.ff ? "on" : ""}">하이라이트까지 ⏭</button></div><button class="fm-ghost" data-om="quit">작전 중단</button>`;
  $("#fmSlots").innerHTML = ""; $("#fmIntel").innerHTML = ""; $("#fmL").innerHTML = "";
  $("#fmScore").innerHTML = `<div class="fm-score"><div><b class="u">${sunk}</b><small>적 격침</small></div><div><b>${fmtT(S.t)}</b><small>/ 30:00</small></div><div><b class="f">${lost}</b><small>아군 손실</small></div><div class="dm"><b class="${dom >= 50 ? "y" : "f"}">${dom}%</b><small>작전 우세</small></div></div>`;
  const H = F.hl, Hf = F.half;
  $("#fmHL").innerHTML = Hf ? `<div class="fm-hl y"><span class="tag">15:00 중간 보고 · 일시정지</span><h3>전반 15분 총평 — 수정안을 고르십시오</h3><p>작전 우세 <b>${Hf.ours}%</b> · 탐지된 적 ${Hf.seen}개 · 미탐지 ${Hf.hidden}개 · 남은 대함미사일 ${Hf.ammo}발</p><div class="fm-hopts">${Hf.opts.map(([k, n, d, who]) => `<button data-om="half:${k}"><b>${n}</b><small>${who}: "${d}"</small></button>`).join("")}<button data-om="half:none"><b>현 계획 유지</b><small>지금 지시 그대로 후반을 진행합니다</small></button></div></div>`
    : H ? `<div class="fm-hl ${H.cls || ""}"><span class="tag">하이라이트 · ${fmtT(H.at)} · 자동 일시정지</span><h3>${H.title}</h3><div class="b">${H.body}</div><div class="row">${H.noOk ? "" : `<button class="ok" data-om="hlok">계속 ›</button>`}${H.acts.map(([n], i) => `<button data-om="hla:${i}">${n}</button>`).join("")}</div></div>` : "";
  const SH = SHOUTS[S.isAir ? "air" : "sea"], RS = RESERVES[S.isAir ? "air" : "sea"];
  $("#fmBot").innerHTML = `<div class="fm-run"><div><div class="fm-h"><i>2</i>지휘 지시 — 누르면 즉시 전 부대에 하달</div><div class="fm-shouts">${SH.map(([k, n, d]) => `<button data-om="sh:${k}" class="${(k === "emcon" && F.shout.emcon) || (k === "aaw" && F.shout.aaw) || F.lastShout === k ? "on" : ""}"><b>${n}</b><small>${d}</small></button>`).join("")}</div></div>
    <div class="fm-resv"><div class="fm-h"><i>3</i>예비 전력 투입 <small>남은 ${F.res}회</small></div><div class="dots">${[0, 1, 2].map((i) => `<em class="${i < 3 - F.res ? "u" : ""}"></em>`).join("")}</div><div class="rl">${RS.map(([k, n, d]) => `<button data-om="rs:${k}" ${F.res <= 0 || F.resUsed.includes(k) ? "disabled" : ""}><b>${n}</b><small>${F.resUsed.includes(k) ? "투입함" : d}</small></button>`).join("")}</div></div></div>`;
  const fs = F.fs, pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "—");
  const ammo = S.us.reduce((a, g) => a + alive(g).reduce((s, x) => s + x.asm, 0), 0) + S.air.filter((u) => u.st !== "lost").reduce((a, u) => a + u.asm, 0), ammo0 = S.us.reduce((a, g) => a + g.ships.reduce((s, x) => s + x.asm0, 0), 0) + S.air.reduce((a, u) => a + AIR_T[u.t].asm, 0);
  $("#fmR").innerHTML = `<div class="fm-feed"><div class="fm-h"><i>4</i>상황 중계</div>${S.log.map((l) => `<div class="ln ${l.cls}${/\[교전\]|격침|격추|요격 성공/.test(l.t) ? " big" : ""}"><span>${fmtT(l.at)}</span>${l.t}</div>`).join("")}</div>
    <div class="fm-stats"><div class="fm-h"><i>5</i>작전 통계 <small>아군 · 적</small></div>${[["미사일 발사", fs.us.n, fs.foe.n], ["명중률", pct(fs.us.hit, fs.us.n), pct(fs.foe.hit, fs.foe.n)], ["상대 미사일 요격", pct(fs.foe.icpt, fs.foe.n), pct(fs.us.icpt, fs.us.n)], ["적 전단 위치 확인", `${S.foe.filter((f) => f.everSeen).length} / ${S.foe.length}`, "—"], ["남은 대함미사일", pct(ammo, ammo0), "?"]].map(([n, a, b]) => `<div class="st"><b class="u">${a}</b><span>${n}</span><b class="f">${b}</b></div>`).join("")}${F.halfDone ? "" : `<div class="fm-card fm-half"><b>15:00 중간 보고</b> 예정 — 참모가 수정안 3개를 올립니다</div>`}</div>`;
}
function rateAll() {
  const F = S.fm, L = [];
  const add = (key, name, sub, lostX) => { const s = stOf(key); let r = 6 + s.hits * 0.35 + s.kills * 0.7 + s.icpt * 0.12 + s.det * 0.5 + s.air * 0.6 - s.dmg / 45 - (lostX ? 1.2 : 0); r = clamp(Math.round(r * 10) / 10, 4.5, 10); L.push({ key, name, sub, r, s }); };
  for (const g of S.us) { const s = stOf(g.id), lostN = g.ships.filter((x) => x.hp <= 0).length; add(g.id, g.name, `${s.kills ? `격침 ${s.kills} · ` : ""}명중 ${s.hits} · 요격 ${s.icpt}${lostN ? ` · 손실 ${lostN}척` : ""}`, lostN === g.ships.length); }
  for (const u of S.air) { const s = stOf(u.id); add(u.id, short(u.name), `${s.air ? `적기 요격 ${s.air} · ` : ""}${s.det ? `탐지 ${s.det} · ` : ""}명중 ${s.hits}${u.st === "lost" ? " · 손실" : ""}`, u.st === "lost"); }
  for (const sp of S.sup) if (sp.id) { const s = stOf(sp.id); add(sp.id, { p3c: "P-3C 해상초계기", cap: "공군 CAP", fa50: "비상대기 FA-50", battery: "해안 지대함 포대" }[sp.id] || sp.id, `${s.det ? `탐지 ${s.det} · ` : ""}명중 ${s.hits}`, false); }
  if (S.isleBat) { const s = stOf("isle"); add("isle", "연평도 지대함", `명중 ${s.hits}`, false); }
  return L.sort((a, b) => b.r - a.r);
}
function fmResultView() {
  const r = S.result; if (!r) return; const F = S.fm, L = rateAll(), mvp = L[0], lostShips = S.us.flatMap((g) => g.ships).filter((s) => s.hp <= 0).length;
  const goals = [[lostShips === 0 && !(S.airLost > 0), "아군 손실 0"], [S.shots <= 24, `미사일 24발 이내 (${S.shots}발 사용)`], [F.firstKill != null && F.firstKill < 900, `15분 안에 첫 격침${F.firstKill != null ? ` (${fmtT(F.firstKill)})` : ""}`]];
  const score = clamp(Math.round((r.won ? 58 : 22) + r.stars * 7 + goals.filter((g) => g[0]).length * 5 + Math.min(8, r.sunk * 1.5) - lostShips * 4 - (S.airLost || 0) * 2), 0, 100); r.score = score; r.mvp = mvp?.name;
  const q = r.won ? [[`해군작전사령관: "${CONCEPTS[F.concept].n.slice(2)} 판단이 적중했다.${S.shots > 24 ? " 다만 미사일 소모가 많았다." : ""}"`, "신뢰도 +" + Math.max(2, Math.round(score / 14)), "g"], [`국방일보: "서해 ${S.isAir ? "항공 지원" : "해상 차단"} 성공 — ${mvp ? mvp.name + " 활약 빛나" : "적 남하 저지"}"`, "", ""]]
    : [[`해군작전사령관: "${r.why}. 작전 계획을 재검토하라."`, "신뢰도 −4", "r"], [`국방일보: "서해 ${S.isAir ? "항공 작전" : "해상 차단"} 차질 — 군 당국 경위 조사"`, "", "r"]];
  if (S.foe.some((f) => f.everSeen && f.delay && !f.ships.some((x) => x.hp <= 0) && !f.gone)) q.push(['합참: "늦게 출항한 적 전단 대응이 늦었다. 정찰 배치를 재검토할 것."', "지적 1", "r"]);
  $("#fmTR").innerHTML = `<button class="fm-go" data-om="done">항구로 귀환 ›</button>`;
  $("#fmRes").innerHTML = `<div class="fm-res"><div class="col"><div class="fm-card big"><small>작전 결과</small><div class="rt ${r.won ? "w" : "l"}">${r.won ? "작전 성공" : "작전 실패"}</div><div class="stars">${"★".repeat(r.stars)}${"☆".repeat(3 - r.stars)}</div><small>${r.why}</small></div>
      <div class="fm-card"><div class="fm-h"><i>1</i>보조 목표</div>${goals.map(([ok, n]) => `<div class="kv"><span>${ok ? "✓" : "✗"} ${n}</span><b class="${ok ? "g" : "r"}">${ok ? "+5" : "—"}</b></div>`).join("")}</div>
      <div class="fm-card"><div class="fm-h">핵심 통계</div>${[["명중률", F.fs.us.n ? Math.round((F.fs.us.hit / F.fs.us.n) * 100) + "%" : "—"], ["적 미사일 요격률", F.fs.foe.n ? Math.round((F.fs.foe.icpt / F.fs.foe.n) * 100) + "%" : "—"], ["격침 / 적 함정", `${r.sunk} / ${r.foes}`], ["예비 투입", `${3 - F.res}회`]].map(([a, b]) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`).join("")}</div></div>
    <div class="col"><div class="fm-card"><div class="fm-h"><i>2</i>${S.isAir ? "편대·함정" : "전단·지원"} 평점</div>${L.map((x, i) => `<div class="rt"><span>${x.name}<small>${x.sub}</small></span><b class="sc ${x.r >= 7.5 ? "a" : x.r >= 6.5 ? "b" : "c"}">${x.r.toFixed(1)}</b><em>${i === 0 ? "⭐MVP" : ""}</em></div>`).join("")}</div>
      ${mvp ? `<div class="fm-card mvp"><div class="fm-h">⭐ 최우수 — ${mvp.name}</div><small>${mvp.sub} · 평점 ${mvp.r.toFixed(1)}${mvp.r >= 8 ? " → 표창 상신" : ""}</small></div>` : ""}</div>
    <div class="col"><div class="fm-card"><div class="fm-h"><i>3</i>상부·언론 반응</div>${q.map(([t, b, c]) => `<div class="fm-q2 ${c}">${t}${b ? ` <b class="${c}">${b}</b>` : ""}</div>`).join("")}</div>
      <div class="fm-card"><div class="fm-h"><i>4</i>지휘관 평가</div><div class="kv"><span>작전 평가 점수</span><b class="${score >= 70 ? "g" : score >= 45 ? "y" : "r"}">${score} / 100</b></div><div class="kv"><span>진급 심사 반영</span><b>${score >= 75 ? "+1 우수" : score >= 50 ? "보통" : "−1"}</b></div><div class="kv"><span>부대 사기</span><b class="${r.won ? "g" : "r"}">${r.won ? "▲ 높음" : "▼ 낮음"}</b></div></div>
      <div class="fm-card"><div class="fm-h">참모 총평</div><small>${fmReview(r)}</small></div></div></div>`;
}
function fmReview(r) {
  const F = S.fm, t = [];
  if (!S.foe.every((f) => f.everSeen)) t.push("정찰이 끝까지 모든 적을 찾지 못했습니다 — 전위·정찰 수단을 늘리십시오.");
  if (F.fs.us.n && F.fs.us.icpt / F.fs.us.n > 0.5) t.push("적 대공에 절반 이상 막혔습니다 — '포화 8발' 조건부 지시나 근접 사격을 권합니다.");
  if (S.shots > 30) t.push("미사일 소모가 컸습니다 — 일제사격 4발이 적당합니다.");
  if (!r.won) t.push(`${CONCEPTS[F.concept].n.slice(2)} 대신 다른 작전 개념도 시험해 보십시오.`);
  return t.length ? t.join(" ") : "계획과 지휘 모두 훌륭했습니다. 다음 작전에서도 이 편성을 유지하십시오.";
}

// ── drawing: sectors first, details only for the selected unit (or when a map layer is switched on) ──
const COL = { us: "#4de8d4", ally: "#7cc4ff", foe: "#ff6b5e", warn: "#f2ca5c", ok: "#9be06a", fuel: "#ffe066" };
function etaGoal(f) { let d = 0, p = f; for (const q of f.path) { d += d2(p, q); p = q; } return d / (SPD * 0.9) + (f.delay && S.t < f.delay ? f.delay - S.t : 0); }
/** the next sector the group will enter along its path, and when (game seconds) */
function nextSec(f) { const cur = secOf(f); let d = 0, p = f; for (const w of f.path) { const q = secOf(w); d += d2(p, w); p = w; if (q && q !== cur) return { q, t: d / (SPD * 0.9) + (f.delay && S.t < f.delay ? f.delay - S.t : 0) }; } return null; }
function secState(q) {
  const ch = [], foes = S.foe.filter((f) => alive(f).length && !f.gone && f.seen && !(f.delay && S.t < f.delay) && secOf(f) === q);
  if (foes.length) { const sam = foes.reduce((a, f) => a + alive(f).reduce((b, s) => b + s.sam, 0), 0); ch.push([COL.foe, `▲ 적 전단 ${foes.length} · 대공 ${sam > 20 ? "강" : sam > 0 ? "약" : "없음"}`]); }
  if (S.isAir) {
    const here = (j) => S.air.filter((u) => u.st !== "lost" && u.sec === q.id && u.job === j).length;
    const cap = here("cap"); if (cap) ch.push([COL.us, `✈ CAP ${cap} · 요격 +25%`]);
    const st = here("strike"); if (st) ch.push([COL.warn, `✈ 타격 ${st}`]);
    const pa = here("patrol"); if (pa) ch.push([COL.ok, `◎ 정찰 ${pa}`]);
    if (here("refuel")) ch.push([COL.fuel, "⛽ 급유 궤도"]);
  } else {
    const g = S.us.filter((u) => alive(u).length && (u.sec === q.id || secOf(u) === q)); if (g.length) ch.push([COL.ally, `■ 아군 전단 ${g.length}`]);
    const sp = S.sup.filter((x) => secOf(x) === q); if (sp.length) ch.push([COL.ok, sp.map((x) => SUP[x.k].n.replace("공군 ", "").replace(" 초계 정찰", "")).join(" · ")]);
  }
  return { ch, hot: foes.length > 0 };
}
/** Chart base (sea depth bands, tidal flats, land relief, coast, graticule, names, scale) — drawn once per canvas size. */
let BASE = null;
function chartBase(cv, k, ox, oy, dpr) {
  const key = `${cv.width}x${cv.height}`; if (BASE && BASE.key === key) return BASE.c;
  const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height; const x = c.getContext("2d"), P = (px, py) => [ox + px * k, oy + py * k], F = (n, w = 400, f = "'Noto Sans KR', sans-serif") => `${w} ${n * dpr}px ${f}`;
  const path = () => { x.beginPath(); for (const poly of LAND) { poly.forEach(([a, b], i) => (i ? x.lineTo(...P(a, b)) : x.moveTo(...P(a, b)))); x.closePath(); } };
  x.fillStyle = "#08141b"; x.fillRect(0, 0, c.width, c.height);
  // open sea: deeper (darker) to the south-west, the shallow Gyeonggi Bay lighter to the east
  const g = x.createLinearGradient(ox, oy + H * k, ox + W * k, oy); g.addColorStop(0, "#0b2433"); g.addColorStop(0.55, "#123448"); g.addColorStop(1, "#1a4152"); x.fillStyle = g; x.fillRect(ox, oy, W * k, H * k);
  x.save(); x.beginPath(); x.rect(ox, oy, W * k, H * k); x.clip();
  // depth bands: shallow water halos around every coast (the Yellow Sea is shallow and muddy near shore)
  x.lineJoin = "round"; x.lineCap = "round";
  for (const [wu, a] of [[12, 0.028], [7, 0.04], [4, 0.055], [2.2, 0.08], [1, 0.12]]) { path(); x.strokeStyle = `rgba(120,185,190,${a})`; x.lineWidth = wu * k; x.stroke(); }
  // tidal flats (갯벌) along the Gyeonggi coast and Ganghwa
  x.save(); x.beginPath(); x.rect(...P(100, 20), 50 * k, 70 * k); x.clip(); path(); x.strokeStyle = "rgba(140,120,80,.28)"; x.lineWidth = 2.6 * k; x.stroke(); path(); x.strokeStyle = "rgba(170,150,100,.25)"; x.lineWidth = 1.2 * k; x.stroke(); x.restore();
  // land: base, relief noise, inland darkening, coastline
  path(); x.fillStyle = "#33442f"; x.fill("evenodd");
  x.save(); path(); x.clip("evenodd");
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9000; i++) { const px = rnd() * W, py = rnd() * H, r = (0.25 + rnd() * 0.9) * k; x.fillStyle = rnd() < 0.5 ? `rgba(110,125,80,${0.05 + rnd() * 0.07})` : `rgba(18,26,16,${0.06 + rnd() * 0.08})`; x.beginPath(); x.arc(...P(px, py), r, 0, Math.PI * 2); x.fill(); }
  for (const [wu, a] of [[6, 0.18], [3, 0.12]]) { path(); x.strokeStyle = `rgba(150,165,110,${a})`; x.lineWidth = wu * k; x.stroke(); } /* lighter lowland along the shore */
  x.restore();
  path(); x.strokeStyle = "rgba(10,18,14,.9)"; x.lineWidth = 2.2 * dpr; x.stroke(); path(); x.strokeStyle = "rgba(205,220,175,.7)"; x.lineWidth = 0.9 * dpr; x.stroke();
  // graticule (every 0.25° lat / 0.5° lon) with edge labels
  x.strokeStyle = "rgba(190,215,225,.07)"; x.lineWidth = 1 * dpr; x.fillStyle = "rgba(190,215,225,.45)"; x.font = F(10, 400, "monospace");
  const LX = (lon) => ((lon - GEO.lon0) / (GEO.lon1 - GEO.lon0)) * W, LY = (lat) => ((GEO.lat1 - lat) / (GEO.lat1 - GEO.lat0)) * H;
  for (let lon = 124.5; lon < GEO.lon1; lon += 0.5) { const [a] = P(LX(lon), 0); x.beginPath(); x.moveTo(a, oy); x.lineTo(a, oy + H * k); x.stroke(); x.fillText(`${Math.floor(lon)}°${lon % 1 ? "30'" : "00'"}E`, a + 3 * dpr, oy + H * k - 5 * dpr); }
  for (let lat = 37; lat < GEO.lat1; lat += 0.25) { const [, b] = P(0, LY(lat)); x.beginPath(); x.moveTo(ox, b); x.lineTo(ox + W * k, b); x.stroke(); x.fillText(`${Math.floor(lat)}°${String(Math.round((lat % 1) * 60)).padStart(2, "0")}'N`, ox + 4 * dpr, b - 3 * dpr); }
  // names
  for (const [n, a, b, t] of PLACES) {
    const [px, py] = P(a, b);
    if (t === "sea") { x.font = F(t === "sea" && n.length > 4 ? 22 : 15, 300); x.fillStyle = "rgba(190,220,235,.2)"; x.textAlign = "center"; x.fillText(n, px, py); x.textAlign = "left"; continue; }
    if (t === "city") { x.fillStyle = "rgba(235,230,210,.85)"; x.beginPath(); x.arc(px, py, 2.6 * dpr, 0, Math.PI * 2); x.fill(); x.font = F(11.5, 600); x.fillText(n, px + 5 * dpr, py + 4 * dpr); continue; }
    x.font = F(t === "region" ? 13 : 11, t === "region" ? 500 : 600); x.fillStyle = t === "region" ? "rgba(225,230,200,.4)" : "rgba(225,235,215,.7)"; x.fillText(n, px, py);
  }
  x.font = F(11, 600); for (const [n, a, b, r] of ISLES) { x.fillStyle = "rgba(10,18,14,.65)"; const [px, py] = P(a + r + 0.6, b + 0.6), w = x.measureText(n).width; x.fillRect(px - 2 * dpr, py - 10 * dpr, w + 4 * dpr, 13 * dpr); x.fillStyle = "rgba(235,242,230,.9)"; x.fillText(n, px, py); }
  // fictional boundary line
  x.setLineDash([10 * dpr, 7 * dpr]); x.strokeStyle = "rgba(255,107,94,.85)"; x.lineWidth = 2 * dpr; x.beginPath(); NLL.forEach(([a, b], i) => (i ? x.lineTo(...P(a, b)) : x.moveTo(...P(a, b)))); x.stroke(); x.setLineDash([]);
  x.fillStyle = "#ff8a7a"; x.font = F(11, 600); x.fillText("경계선 (게임용 가상선)", ...P(96, 41.5));
  // scale bar + north arrow
  const u20 = 20 / GEO.kmPerUnit, [sx, sy] = P(W - 12 - u20, 9); x.fillStyle = "rgba(8,16,22,.75)"; x.fillRect(sx - 8 * dpr, sy - 22 * dpr, u20 * k + 16 * dpr, 30 * dpr);
  x.strokeStyle = "#dfe8e4"; x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + u20 * k, sy); x.moveTo(sx, sy - 5 * dpr); x.lineTo(sx, sy); x.moveTo(sx + (u20 * k) / 2, sy - 3 * dpr); x.lineTo(sx + (u20 * k) / 2, sy); x.moveTo(sx + u20 * k, sy - 5 * dpr); x.lineTo(sx + u20 * k, sy); x.stroke();
  x.fillStyle = "#dfe8e4"; x.font = F(10, 600); x.fillText("0", sx - 3 * dpr, sy - 8 * dpr); x.fillText("10", sx + (u20 * k) / 2 - 5 * dpr, sy - 8 * dpr); x.fillText("20 km", sx + u20 * k - 12 * dpr, sy - 8 * dpr);
  const [nx, ny] = P(W - 5, 6); x.fillStyle = "rgba(230,235,225,.85)"; x.beginPath(); x.moveTo(nx, ny - 12 * dpr); x.lineTo(nx + 6 * dpr, ny + 6 * dpr); x.lineTo(nx, ny + 2 * dpr); x.lineTo(nx - 6 * dpr, ny + 6 * dpr); x.closePath(); x.fill(); x.font = F(11, 700); x.textAlign = "center"; x.fillText("N", nx, ny - 15 * dpr); x.textAlign = "left";
  x.restore();
  x.strokeStyle = "rgba(120,160,175,.35)"; x.lineWidth = 1 * dpr; x.strokeRect(ox, oy, W * k, H * k);
  BASE = { key, c }; return c;
}
function draw() {
  const cv = $("#omCv"); if (!cv) return; const x = cv.getContext("2d"), { k, ox, oy } = view(), P = (px, py) => [ox + px * k, oy + py * k], dpr = devicePixelRatio, F = (n, w = 400) => `${w} ${n * dpr}px 'Noto Sans KR', sans-serif`;
  x.drawImage(chartBase(cv, k, ox, oy, dpr), 0, 0);
  // sectors
  for (const q of SECTORS) {
    const st = secState(q), [a, b] = P(q.x0, q.y0), w = (q.x1 - q.x0) * k, h = (q.y1 - q.y0) * k, sel = S.sel && (S.sel.sec === q.id), hov = S.hover === q;
    x.fillStyle = hov ? "rgba(242,202,92,.16)" : st.hot ? "rgba(255,107,94,.09)" : q.goal ? "rgba(77,232,212,.05)" : "rgba(0,0,0,0)"; x.fillRect(a, b, w, h);
    x.strokeStyle = hov ? COL.warn : sel ? COL.us : q.goal ? "rgba(77,232,212,.5)" : "rgba(170,210,225,.22)"; x.lineWidth = (hov || sel ? 2.5 : 1.2) * dpr; x.strokeRect(a, b, w, h);
    const lb = q.ly ? P(q.x0, q.ly)[1] : b, lab = q.n + (q.goal ? " ★방어 목표" : ""); x.font = F(14, 700); x.fillStyle = "rgba(10,20,26,.8)"; x.fillRect(a + 6 * dpr, lb + 4 * dpr, x.measureText(lab).width + 10 * dpr, 22 * dpr); x.fillStyle = st.hot ? "#ff9b8a" : q.goal ? COL.us : "#cfe"; x.fillText(lab, a + 11 * dpr, lb + 20 * dpr);
    st.ch.forEach(([c, t], i) => { x.font = F(11.5, 700); const tw = x.measureText(t).width + 16 * dpr, yy = (q.ly ? P(q.x0, q.ly)[1] : b) + (30 + i * 22) * dpr; x.fillStyle = "rgba(10,20,26,.85)"; x.beginPath(); x.roundRect(a + 10 * dpr, yy, tw, 18 * dpr, 9 * dpr); x.fill(); x.fillStyle = c; x.fillText(t, a + 18 * dpr, yy + 13 * dpr); });
  }
  x.strokeStyle = COL.warn; x.fillStyle = "rgba(242,202,92,.08)"; x.lineWidth = 2 * dpr; x.beginPath(); x.arc(...P(GOAL.x, GOAL.y), GOAL.r * k, 0, Math.PI * 2); x.fill(); x.stroke();
  // supports (sea): icon only, ring with the range layer
  for (const sp of S.sup) {
    const c = { cap: COL.us, battery: "#ff8c52", p3c: COL.ok, sub: COL.ally }[sp.k], r = { cap: 15, battery: BATTERY.range, p3c: 30, sub: 8 }[sp.k];
    if (S.layers.rng || S.layers.det) { x.strokeStyle = c; x.globalAlpha = 0.5; x.setLineDash([4 * dpr, 5 * dpr]); x.lineWidth = 1.2 * dpr; x.beginPath(); x.arc(...P(sp.x, sp.y), r * k, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); x.globalAlpha = 1; }
    x.fillStyle = c; x.beginPath(); x.arc(...P(sp.x, sp.y), 5 * dpr, 0, Math.PI * 2); x.fill();
  }
  if (S.isleBat) { x.fillStyle = "#ff8c52"; x.beginPath(); x.arc(...P(S.isleBat.x, S.isleBat.y), 5 * dpr, 0, Math.PI * 2); x.fill(); if (S.layers.rng) { x.strokeStyle = "#ff8c52"; x.setLineDash([4 * dpr, 5 * dpr]); x.beginPath(); x.arc(...P(S.isleBat.x, S.isleBat.y), 28 * k, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); } }
  if (!S.decoy.gone) { x.fillStyle = "#ff8a7a"; x.font = F(13, 800); x.fillText("?", ...P(S.decoy.x - 0.6, S.decoy.y + 0.8)); x.strokeStyle = COL.foe; x.setLineDash([3 * dpr, 3 * dpr]); x.beginPath(); x.arc(...P(S.decoy.x, S.decoy.y), 2.6 * k, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); }
  // friendly ship groups
  for (const g of S.us) {
    if (!alive(g).length) continue; const sel = g === S.sel;
    if (g.path.length && (sel || S.layers.path)) { x.strokeStyle = sel ? COL.us : "rgba(124,196,255,.6)"; x.setLineDash([8 * dpr, 6 * dpr]); x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(...P(g.x, g.y)); for (const q of g.path) x.lineTo(...P(q.x, q.y)); x.stroke(); x.setLineDash([]); }
    if (sel || S.layers.det) { x.strokeStyle = "rgba(77,232,212,.35)"; x.setLineDash([4 * dpr, 6 * dpr]); x.beginPath(); x.arc(...P(g.x, g.y), detR(g) * k, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); }
    if (S.layers.rng) { x.strokeStyle = "rgba(124,196,255,.35)"; x.beginPath(); x.arc(...P(g.x, g.y), 30 * k, 0, Math.PI * 2); x.stroke(); }
    token(x, P(g.x, g.y), g.name.replace("제", ""), sel ? COL.us : COL.ally, strength(g), dpr);
  }
  // enemies: one marker per group with a ship-count badge; the next move only (telegraph)
  const tele = [];
  for (const f of S.foe) {
    if (!alive(f).length || f.gone) continue; const known = f.seen && !(f.delay && S.t < f.delay), intel = S.phase === "plan" && !f.delay;
    if (!known && !intel) continue;
    const [a, b] = P(f.x, f.y);
    if (f.path[0] && !f.retreat) { const [ex, ey] = P(f.path[0].x, f.path[0].y), ang = Math.atan2(ey - b, ex - a), L = Math.min(Math.hypot(ex - a, ey - b), 140 * dpr), tx = a + Math.cos(ang) * L, ty = b + Math.sin(ang) * L;
      x.strokeStyle = known ? COL.foe : "rgba(255,107,94,.55)"; x.lineWidth = 3.5 * dpr; x.beginPath(); x.moveTo(a, b); x.lineTo(tx, ty); x.stroke();
      x.fillStyle = x.strokeStyle; x.beginPath(); x.moveTo(tx + Math.cos(ang) * 8 * dpr, ty + Math.sin(ang) * 8 * dpr); x.lineTo(tx + Math.cos(ang + 2.4) * 10 * dpr, ty + Math.sin(ang + 2.4) * 10 * dpr); x.lineTo(tx + Math.cos(ang - 2.4) * 10 * dpr, ty + Math.sin(ang - 2.4) * 10 * dpr); x.closePath(); x.fill();
      tele.push({ f, tx, ty }); }
    x.fillStyle = known ? COL.foe : "rgba(255,107,94,.6)"; x.beginPath(); x.moveTo(a, b + 10 * dpr); x.lineTo(a - 11 * dpr, b - 8 * dpr); x.lineTo(a + 11 * dpr, b - 8 * dpr); x.closePath(); x.fill();
    x.fillStyle = "#fff"; x.beginPath(); x.arc(a + 12 * dpr, b - 10 * dpr, 8 * dpr, 0, Math.PI * 2); x.fill(); x.fillStyle = "#b02a22"; x.font = F(11, 800); x.textAlign = "center"; x.fillText(String(alive(f).length), a + 12 * dpr, b - 6 * dpr); x.textAlign = "left";
    if (S.layers.rng && known) { x.strokeStyle = "rgba(255,107,94,.35)"; x.setLineDash([3 * dpr, 5 * dpr]); x.beginPath(); x.arc(a, b, 30 * k, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); }
  }
  tele.sort((p, q) => etaGoal(p.f) - etaGoal(q.f)).slice(0, 2).forEach(({ f, tx, ty }) => { const ns = nextSec(f), l1 = ns ? `다음: ${ns.q.n} 진입` : `다음: ${GOAL.n} 돌입`, l2 = fmtT(ns ? ns.t : etaGoal(f)) + " 후"; x.font = F(11.5, 700); const w = Math.max(x.measureText(l1).width, 60 * dpr) + 16 * dpr; x.fillStyle = "rgba(42,20,22,.92)"; x.strokeStyle = COL.foe; x.lineWidth = 1 * dpr; x.beginPath(); x.roundRect(tx + 8 * dpr, ty - 4 * dpr, w, 36 * dpr, 4 * dpr); x.fill(); x.stroke(); x.fillStyle = "#ffb3a8"; x.fillText(l1, tx + 16 * dpr, ty + 12 * dpr); x.fillStyle = "#ff8a7a"; x.font = F(11); x.fillText(l2, tx + 16 * dpr, ty + 27 * dpr); });
  if (S.isAir) drawAir(x, P, k, dpr, F);
  for (const m of S.msl) { x.fillStyle = m.side === "us" ? "#ffe066" : "#ff5a4e"; x.beginPath(); x.arc(...P(m.x, m.y), 2.2 * dpr, 0, Math.PI * 2); x.fill(); }
  for (const f of S.fx) { const u = f.t / 25; x.strokeStyle = f.c; x.globalAlpha = 1 - u; x.lineWidth = 2 * dpr; x.beginPath(); x.arc(...P(f.x, f.y), (f.big ? 3 : 1.6) * k * (0.3 + u), 0, Math.PI * 2); x.stroke(); x.globalAlpha = 1; }
  if (S.place) { x.fillStyle = "rgba(242,202,92,.9)"; x.font = F(14, 700); x.fillText(`${SUP[S.place].n} — 지도에서 배치할 곳을 클릭 (Esc 취소)`, ox + 16 * dpr, oy + 26 * dpr); }
  if (S.phase === "run" && S.paused) { x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = "#fff"; x.font = F(28, 700); x.fillText("일시정지", cv.width / 2 - 56 * dpr, cv.height / 2); }
}
const AIR_IC = { fighter: "✈", mpa: "◎", helo: "✚", tanker: "⛽", transport: "▣" };
function plane(x, [a, b], ang, c, dpr, sz = 1) {
  x.save(); x.translate(a, b); x.rotate(ang); x.scale(dpr * sz, dpr * sz); x.fillStyle = c; x.beginPath();
  x.moveTo(9, 0); x.lineTo(-2, -2); x.lineTo(-3, -9); x.lineTo(-6, -9); x.lineTo(-5, -2); x.lineTo(-8, -1.5); x.lineTo(-10, -5); x.lineTo(-11, -5); x.lineTo(-10, 0); x.lineTo(-11, 5); x.lineTo(-10, 5); x.lineTo(-8, 1.5); x.lineTo(-5, 2); x.lineTo(-6, 9); x.lineTo(-3, 9); x.lineTo(-2, 2); x.closePath(); x.fill(); x.restore();
}
function drawAir(x, P, k, dpr, F) {
  const [bx, by] = P(AIRBASE.x, AIRBASE.y); x.fillStyle = COL.ally; x.fillRect(bx - 8 * dpr, by - 2 * dpr, 16 * dpr, 4 * dpr); x.font = F(11, 600); x.fillText(AIRBASE.n, bx - 34 * dpr, by - 8 * dpr);
  for (const u of S.air) {
    if (!airborne(u)) continue; const sel = u === S.sel, T = AIR_T[u.t], c = sel ? COL.us : { fighter: "#9fd8ff", mpa: COL.ok, helo: COL.ok, tanker: COL.fuel, transport: "#d9c7ff" }[u.t];
    const dest = u.st === "rtb" ? airHome(u) : u.job === "strike" ? u.tgt : u.job === "escort" ? u.follow : u.pt;
    if (dest && (sel || S.layers.path)) { x.strokeStyle = u.job === "strike" ? "rgba(255,200,90,.85)" : "rgba(77,232,212,.75)"; x.setLineDash([6 * dpr, 5 * dpr]); x.lineWidth = 1.6 * dpr; x.beginPath(); x.moveTo(...P(u.x, u.y)); x.lineTo(...P(dest.x, dest.y)); x.stroke(); x.setLineDash([]); }
    if ((sel || S.layers.det) && T.det) { x.strokeStyle = "rgba(155,224,106,.35)"; x.setLineDash([4 * dpr, 6 * dpr]); x.beginPath(); x.arc(...P(u.x, u.y), T.det * k, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); }
    if (u.t === "tanker" && u.st === "station" && (sel || S.layers.rng)) { x.strokeStyle = "rgba(255,224,102,.4)"; x.beginPath(); x.arc(...P(u.x, u.y), 20 * k, 0, Math.PI * 2); x.stroke(); }
    const d = dest || airHome(u), ang = Math.atan2(d.y - u.y, d.x - u.x);
    if (sel) { x.strokeStyle = COL.us; x.lineWidth = 2 * dpr; x.beginPath(); x.arc(...P(u.x, u.y), 13 * dpr, 0, Math.PI * 2); x.stroke(); x.fillStyle = COL.us; x.font = F(11.5, 700); x.fillText(u.name.split(" (")[0], ...P(u.x + 2.4, u.y - 2)); }
    plane(x, P(u.x, u.y), ang, c, dpr, u.t === "fighter" ? 0.9 : 1.15);
  }
  for (const r of S.raids) { if (!r.alive) continue; plane(x, P(r.x, r.y), Math.PI / 2, "#ff5a4e", dpr, 1.1); x.fillStyle = "#ff8a7a"; x.font = F(11.5, 700); x.fillText("적 전투기", ...P(r.x + 2, r.y)); }
}
function token(x, [a, b], label, c, st, dpr) {
  const w = 58 * dpr, h = 24 * dpr; x.fillStyle = "#13324a"; x.strokeStyle = c; x.lineWidth = 2 * dpr; x.fillRect(a - w / 2, b - h / 2, w, h); x.strokeRect(a - w / 2, b - h / 2, w, h);
  x.fillStyle = "#e6fbff"; x.font = `bold ${11 * dpr}px 'Noto Sans KR', sans-serif`; x.textAlign = "center"; x.fillText(label, a, b + 4 * dpr); x.textAlign = "left";
  x.fillStyle = "#223"; x.fillRect(a - w / 2, b + h / 2 + 2 * dpr, w, 4 * dpr); x.fillStyle = st > 0.5 ? COL.us : st > 0.25 ? "#ffc857" : COL.foe; x.fillRect(a - w / 2, b + h / 2 + 2 * dpr, w * st, 4 * dpr);
}

// ── panels ──
const short = (n) => n.split(" (")[0];
function threats() {
  let unseen = 0; const L = [], free = () => S.air.filter((u) => u.t === "fighter" && u.st !== "lost" && u.asm > 0 && (u.st === "ready" || u.job === "cap") && !(u.job === "strike"));
  for (const f of S.foe) {
    if (!alive(f).length || f.gone) continue;
    if (f.delay && S.t < f.delay) { L.push({ cd: f.delay - S.t, t: `${f.name} 출현 예상`, sub: "정보처 추정 — 위치·시각 정확도 낮음", cls: "y dim" }); continue; }
    if (f.retreat) continue;
    if (!f.seen && S.phase !== "plan" && !f.everSeen) { unseen++; continue; }
    if (!f.seen && S.phase !== "plan") { L.push({ cd: null, t: `${f.name} — 위치 놓침`, sub: S.isAir ? "초계기·헬기를 근처 구역에 배정해 다시 찾으십시오" : "정찰 전단이나 P-3C로 다시 찾으십시오", cls: "y" }); continue; }
    const ns = nextSec(f), q = ns && ns.q, item = { cd: etaGoal(f), t: `${f.name} → ${GOAL.n}`, sub: `${alive(f).map((s) => s.n).join("·")}${q ? ` · 다음 ${q.n}` : ""}`, cls: "" };
    if (S.isAir) { const rd = S.air.filter((u) => u.t === "fighter" && u.st === "ready" && u.asm > 0 && !u.sec); if (rd.length && f.seen) item.act = [`대응: ${rd.slice(0, 2).map((u) => short(u.name)).join("+")} 타격`, () => strikeMission(f, rd.slice(0, 2).map((u) => u.id), rd[2]?.id)]; }
    else { const g = S.us.filter((u) => alive(u).length).sort((a, b) => d2(a, f) - d2(b, f))[0]; if (g && (g.mission !== "strike" || !g.path.length)) item.act = [`대응: ${g.name} 요격 기동`, () => { const p = f.path[0] || f; g.path = [{ x: (p.x + f.x) / 2, y: (p.y + f.y) / 2 + 6 }]; g.mission = "strike"; S.sel = g; say(`${g.name} — ${f.name} 요격 기동`); }]; }
    L.push(item);
  }
  if (unseen) L.push({ cd: null, t: `미탐지 적 전단 ${unseen}개`, sub: S.isAir ? "북쪽 구역에 초계기를 배정해 먼저 찾으십시오" : "P-3C나 정찰 전단으로 북쪽을 수색하십시오", cls: "y" });
  if (S.isAir) {
    for (const at of RAIDS) if (S.t < at) L.push({ cd: at - S.t, t: "적 전투기 편대 출격 예상", sub: "CAP이 없으면 초계기·급유기가 노려집니다", cls: "y", act: !S.air.some((u) => u.job === "cap" && u.sec) && free()[0] ? [`대응: ${short(free()[0].name)} → 연평 CAP`, () => assignSector(free()[0].id, secById("s2"))] : null });
    for (const r of S.raids) if (r.alive) { const prey = S.air.filter((u) => airborne(u) && u.t !== "fighter").sort((a, b) => d2(a, r) - d2(b, r))[0]; L.push({ cd: prey ? d2(prey, r) / 0.45 : 0, t: `적 전투기 → ${prey ? short(prey.name) : "아군 전단"}`, sub: "방공 레이더 추적 중", cls: "", act: prey ? [`대응: ${short(prey.name)} 귀환`, () => { prey.st = "rtb"; say(`${prey.name} 위협 회피 — 귀환`); }] : null }); }
  }
  return L.sort((a, b) => (a.cd ?? 1e9) - (b.cd ?? 1e9)).slice(0, 4);
}
function airAdvice() {
  const by = (t) => S.air.filter((u) => u.t === t && u.st !== "lost"), free = by("fighter").filter((u) => !u.sec);
  if (!by("mpa").some((u) => u.sec)) { const u = by("mpa")[0]; if (u) return [`항공작전과장: "초계기를 백령·대청 구역에 띄우면 서쪽으로 들어오는 적 전단을 먼저 찾습니다."`, () => assignSector(u.id, secById("s1"))]; }
  if (!by("fighter").some((u) => u.job === "cap" && u.sec)) { const u = free[0] || by("fighter")[0]; if (u) return [`항공작전과장: "적 전투기가 내려옵니다. ${short(u.name)}를 연평 구역에 CAP으로 거십시오."`, () => assignSector(u.id, secById("s2"))]; }
  const raid = S.raids.find((r) => r.alive); if (raid) return ["방공 통제관: \"적 전투기 편대 남하 중! 위협 카드에서 표적이 된 항공기를 물리십시오.\"", null];
  const seen = S.foe.find((f) => f.seen && alive(f).length && !f.gone && !(f.delay && S.t < f.delay)), sq = seen && (secOf(seen) || nextSec(seen)?.q);
  if (seen && sq && !by("fighter").some((u) => u.job === "strike")) { const u = free[0] || by("fighter").find((v) => v.job !== "cap") || by("fighter")[1]; if (u) return [`항공작전과장: "${seen.name}이 ${sq.n}에 있습니다. ${short(u.name)}를 그 구역에 넣으면 자동으로 대함 타격합니다."`, () => assignSector(u.id, sq)]; }
  const tk = by("tanker")[0]; if (tk && !tk.sec) return ["항공작전과장: \"급유기를 덕적 북방 구역에 두면 전투기 교대 없이 오래 버팁니다.\"", () => assignSector(tk.id, secById("s5"))];
  const tr = by("transport")[0]; if (tr && tr.sec == null && !S.isleBat) return ["항공작전과장: \"수송기로 연평도에 지대함 유도탄 반을 공수하면 섬이 직접 싸웁니다.\"", () => assignSector(tr.id, secById("s2"))];
  return ["항공작전과장: \"현 편성 유지. 귀환한 편대는 재무장 후 같은 구역으로 자동 재출격합니다.\"", null];
}
function staffAdvice() {
  if (!S.ctx.ops) return [S.phase === "plan" ? "참모: \"작전 계획은 사령관 판단에 맡기겠습니다.\" (작전 병과 지휘관에게는 구체적인 참모 의견이 올라옵니다)" : "참모: \"현 상황 보고 — 교전 지속 중.\"", null];
  const hidden = S.foe.some((f) => alive(f).length && !f.seen && !(f.delay && S.t < f.delay)), noP3 = !S.sup.some((s) => s.k === "p3c");
  if (S.phase === "plan" && noP3) return ["정보처장: \"적 전단 위치가 일부만 확인됩니다. P-3C 초계를 경계선 남쪽에 두면 조기 탐지가 가능합니다.\"", S.pts >= SUP.p3c.c ? () => { S.pts -= SUP.p3c.c; S.sup.push({ k: "p3c", x: 45, y: 44, used: false }); say("P-3C 초계 배치 완료 (연평 서쪽)."); } : null];
  if (S.phase === "plan" && !S.us.some((g) => g.path.length)) return ["작전처장: \"제1전단을 연평 구역으로 전개해 적의 접근로를 막으십시오.\"", () => assignSector(S.us[0].id, secById("s2"))];
  if (!S.decoy.gone) return ["정보처장: \"서방 미확인 접촉(?)은 기만일 가능성이 있습니다. 정찰 전단으로 확인을 권고합니다.\"", null];
  if (hidden) return ["작전처장: \"미탐지 적 전력이 남아 있습니다. 방어 전단은 목표 해역을 유지하십시오.\"", null];
  const weak = S.us.find((g) => alive(g).length && strength(g) < 0.4); if (weak) return [`작전처장: "${weak.name} 전력 저하. 덕적 북방 구역으로 물려 재정비를 권고합니다."`, () => assignSector(weak.id, secById("s5"))];
  return ["작전처장: \"현 기동 유지. 적 전단이 사거리에 들어오면 즉시 타격합니다.\"", null];
}
const PHASES = ["계획", "정찰", "교전", "차단 유지", "평가"];
function phaseNow() {
  if (S.phase === "plan") return 0; if (S.phase === "end") return 4;
  const known = S.foe.filter((f) => f.seen && alive(f).length && !f.gone && !f.retreat);
  if (!S.foe.some((f) => f.everSeen)) return 1;
  if (known.some((f) => S.us.some((u) => alive(u).length && d2(u, f) < 45) || d2(f, GOAL) < 30) || (S.repShow && S.t - S.repShow.done < 60)) return 2;
  return 3;
}
/** the single next thing to do, with a button when it can be done in one click */
function todoNow() {
  const gs = S.us.filter((u) => alive(u).length);
  if (S.isAir) return airTodo();
  if (S.phase === "plan") {
    if (!gs.some((g) => g.path.length)) return ["제1전단을 연평 구역으로 전개하십시오 — 카드를 지도의 '연평' 구역으로 끌어다 놓거나 버튼을 누르세요.", () => assignSector(S.us[0].id, secById("s2")), "연평으로 전개"];
    if (!S.sup.some((x) => x.k === "p3c") && !gs.some((g) => g.mission === "scout")) return ["적 위치가 대부분 미상입니다. 정찰 수단을 두십시오 (P-3C 1P 또는 한 전단을 '정찰').", S.pts >= SUP.p3c.c ? () => { S.pts -= SUP.p3c.c; S.sup.push({ k: "p3c", x: 45, y: 44, used: false }); say("P-3C 초계 배치 완료 (백령·대청 남쪽)."); } : null, "P-3C 배치"];
    return ["계획이 준비됐습니다. 전단을 하나 골라 교전규칙·레이더·속력을 확인한 뒤 작전을 개시하십시오.", () => onClickAct("go"), "작전 개시"];
  }
  if (S.phase === "end") return ["작전 종료 — 결과를 확인하십시오.", null, ""];
  for (const g of gs) { const t = nearest(g, S.foe.filter((f) => f.seen && !f.gone)); if (t && t.d < 30 && g.roe === "hold") return [`${g.name} 앞 ${KMU(t.d)}km에 적 — 교전규칙이 '사격 금지'입니다.`, () => { g.roe = "tight"; S.sel = g; say(`${g.name} 교전규칙 → 근접 사격`); }, "사격 허가"]; }
  for (const g of gs) { const t = nearest(g, S.foe.filter((f) => f.seen && !f.gone)); if (t && t.d < 30 && t.d > 18 && g.roe === "tight" && alive(g).some((x) => x.asm > 0)) return [`${t.g.name}이 해성 최대 사거리(${KMU(30)}km) 안 — 근접 사격 대기 중. 먼저 쏠지 결정하십시오.`, () => { g.roe = "free"; S.sel = g; say(`${g.name} 교전규칙 → 자유 사격`); }, "자유 사격"]; }
  for (const g of gs) if (!alive(g).some((x) => x.asm > 0)) return [`${g.name} 대함미사일 소진 — 방공만 가능합니다. 덕적 북방으로 물리는 걸 검토하십시오.`, () => assignSector(g.id, secById("s5")), "덕적 북방으로"];
  for (const g of gs) if (g.fuel < 20 && g.spd === "full") return [`${g.name} 연료 ${Math.round(g.fuel)}% — 전속을 유지하면 곧 고갈됩니다.`, () => { g.spd = "eco"; say(`${g.name} 속력 → 경제`); }, "경제 속력"];
  const near = S.foe.filter((f) => f.seen && alive(f).length && !f.gone && !f.retreat).sort((a, b) => etaGoal(a) - etaGoal(b))[0];
  if (near && !gs.some((g) => secOf(g) === secById("s2") || g.sec === "s2")) { const g = gs.sort((a, b) => d2(a, GOAL) - d2(b, GOAL))[0]; if (g) return [`${near.name}이 ${GOAL.n}으로 접근 중인데 연평 구역이 비었습니다.`, () => assignSector(g.id, secById("s2")), `${g.name} 연평 투입`]; }
  if (!S.foe.some((f) => f.seen && alive(f).length && !f.gone) && gs.every((g) => g.radar === false)) return ["모든 전단이 전파 차단 중이라 적을 찾지 못합니다. 한 전단의 레이더를 켜거나 P-3C로 수색하십시오.", () => { gs[0].radar = true; say(`${gs[0].name} 레이더 켜기`); }, "레이더 켜기"];
  const [t, fn] = staffAdvice(); return [t.replace(/^[^:]+: /, "").replace(/"/g, ""), fn, "추천대로 실행"];
}
function airTodo() {
  const by = (t) => S.air.filter((u) => u.t === t && u.st !== "lost"), rdy = by("fighter").filter((u) => u.st === "ready" && u.asm > 0 && !u.sec);
  if (S.phase === "plan") return S.air.some(hasOrder) ? ["배치가 끝났습니다. 작전을 개시하면 편대가 출격합니다. 적이 보이면 적을 클릭해 타격을 보내십시오.", () => onClickAct("go"), "작전 개시"] : ["먼저 정찰과 방공을 배치하십시오 — '추천 계획'을 누르거나, 지도 구역을 클릭해 편대를 보내세요.", recommendAir, "추천 계획 적용"];
  if (S.phase === "end") return ["작전 종료 — 결과를 확인하십시오.", null, ""];
  const raid = S.raids.find((r) => r.alive);
  if (raid) { const prey = S.air.filter((u) => airborne(u) && u.t !== "fighter").sort((a, b) => d2(a, raid) - d2(b, raid))[0]; const cap = by("fighter").some((u) => u.job === "cap" && airborne(u));
    if (prey && !cap) return [`적 전투기가 ${short(prey.name)}를 노립니다. 방공(CAP)이 없습니다 — 귀환시키십시오.`, () => { prey.st = "rtb"; say(`${prey.name} 위협 회피 — 귀환`); }, `${short(prey.name)} 귀환`]; }
  const tg = S.foe.filter((f) => f.seen && alive(f).length && !f.gone && !f.retreat && !(f.delay && S.t < f.delay)).filter((f) => !S.air.some((u) => u.job === "strike" && u.tgt === f && u.st !== "lost")).sort((a, b) => etaGoal(a) - etaGoal(b))[0];
  if (tg && rdy.length) return [`${tg.name} 발견 (${alive(tg).map((x) => x.n).join("·")}) — 대기 전투기로 타격하십시오. 적을 직접 클릭하면 편대·호위를 고를 수 있습니다.`, () => strikeMission(tg, rdy.slice(0, 2).map((u) => u.id), rdy[2]?.id), `${rdy.slice(0, 2).map((u) => short(u.name)).join("+")} 타격`];
  if (!by("fighter").some((u) => u.job === "cap")) { const u = rdy[0] || by("fighter").find((v) => v.st === "ready"); if (u) return ["방공(CAP)이 없어 적 전투기가 초계기·급유기를 노립니다.", () => assignSector(u.id, secById("s2")), `${short(u.name)} 연평 CAP`]; }
  if (!by("mpa").some((u) => u.sec) && by("mpa")[0]) return ["정찰이 없어 적을 못 찾습니다.", () => assignSector(by("mpa")[0].id, secById("s1")), "초계기 백령·대청 정찰"];
  if (!S.foe.some((f) => f.seen && alive(f).length && !f.gone)) return [S.foe.some((f) => f.delay && S.t < f.delay) && S.foe.every((f) => !alive(f).length || f.gone || (f.delay && S.t < f.delay)) ? "보이는 적을 모두 막았습니다. 정보처가 추가 출항을 예상합니다 — 정찰·CAP을 유지하고 대기하십시오." : "적을 찾는 중 — 초계기·헬기 정찰 범위(초록 원) 안에 적이 들어오면 표시됩니다.", null, ""];
  const fly = S.air.find((u) => u.job === "strike" && u.tgt && airborne(u) && u.st !== "rtb");
  if (fly) return [`${short(fly.name)}가 ${fly.tgt.name}으로 타격 비행 중 — ${fmtT(Math.max(0, (d2(fly, fly.tgt) - 15) / AIR_T[fly.t].sp))} 후 미사일 발사. 결과는 교전 보고로 뜹니다.`, null, ""];
  const re = S.air.filter((u) => u.t === "fighter" && u.st === "rearm").sort((a, b) => a.cd - b.cd)[0];
  return [re ? `전투기 재무장 중 — ${short(re.name)} ${fmtT(re.cd)} 후 다시 출격 가능. 그때 적을 클릭해 보내십시오.` : "대기 중인 전투기가 없습니다. 임무를 마친 편대가 돌아오면 다시 보내십시오.", null, ""];
}
function onClickAct(a) { const b = document.createElement("button"); b.dataset.om = a; $("#opMap")?.appendChild(b); b.click(); b.remove(); }
function topBars() {
  const ph = $("#omPhase"), p = phaseNow(); if (ph) ph.innerHTML = PHASES.map((n, i) => `<span class="${i < p ? "done" : i === p ? "on" : ""}">${i + 1} ${n}${i < p ? " ✓" : ""}</span>`).join("");
  const td = $("#omTodo"); if (!td) return; const [t, fn, lab] = todoNow(); S.todoFn = fn;
  td.innerHTML = `<b>지금 할 일</b><span>${t}</span>${fn ? `<button data-om="todo">${lab} ›</button>` : ""}`;
  const rp = $("#omRep"), R = S.repShow;
  if (rp) rp.innerHTML = R && S.t - R.done < 90 ? `<div class="om-rep ${R.side}"><div class="h">교전 보고 · ${fmtT(R.done)} · ${R.from} → ${R.to}</div><div class="fl"><span>${R.w}</span><b class="a">${R.n}</b><i>발사 →</i><span>${R.side === "us" ? "적 요격" : "아군 요격"}</span><b class="b">${R.icpt}</b><i>→</i><span>${R.side === "us" ? "명중" : "피격"}</span><b class="c">${R.hit}</b></div><div class="dm">${[...new Map(R.dmg.map(([n, k]) => [n, k])).entries()].map(([n, k]) => `${n} <em>${k}</em>`).join(" · ") || (R.side === "us" ? "피해 없음 — 적 대공망이 모두 막았습니다" : "피해 없음 — 아군 방공 성공")}</div>${R.side === "us" && R.n > 0 && R.icpt / R.n > 0.5 ? `<div class="tip">참모: 적 대공이 강합니다. 일제사격 발수를 늘리거나(포화) 근접 사격으로 바꿔 보십시오.</div>` : ""}</div>` : "";
}
function shipDetail(g) {
  const sum = (k) => alive(g).reduce((a, x) => a + x[k], 0), max = (k) => g.ships.filter((x) => x.hp > 0).reduce((a, x) => a + x[k + "0"], 0), bar = (v, m, c) => `<i><em style="width:${m ? Math.round((v / m) * 100) : 0}%;background:${c}"></em></i>`;
  const seg = (k, opts) => `<div class="om-seg">${opts.map(([v, n]) => `<button data-om="ord:${k}:${v}" class="${String(g[k] === true ? "on" : g[k] === false ? "off" : g[k]) === String(v) ? "on" : ""}">${n}</button>`).join("")}</div>`;
  return `<div class="om-det"><div class="om-shp">${g.ships.map((x) => `<span>${x.name}${x.hp <= 0 ? " (침몰)" : ""}</span>${bar(x.hp, x.max, x.hp / x.max > 0.5 ? COL.us : x.hp / x.max > 0.25 ? "#ffc857" : COL.foe)}`).join("")}</div>
    <div class="om-amm"><span>해성 대함</span>${bar(sum("asm"), max("asm"), "#ffb35c")}<b>${sum("asm")}/${max("asm")}</b><span>대공 미사일</span>${bar(sum("sam"), max("sam"), "#7cc4ff")}<b>${sum("sam")}/${max("sam")}</b><span>연료</span>${bar(g.fuel, 100, "#ffe066")}<b>${Math.round(g.fuel)}%</b></div>
    <div class="om-ord"><span>교전규칙</span>${seg("roe", [["hold", "사격 금지"], ["tight", "근접 사격"], ["free", "자유 사격"]])}<small>${ROE[g.roe][1]}</small>
    <span>레이더</span>${seg("radar", [["on", `켜기 ${KMU(detR({ ...g, radar: true }))}km`], ["off", "전파 차단"]])}<small>${g.radar === false ? `들키지 않지만(적은 ${KMU(15)}km 안에서만 봄) 탐지 ${KMU(detR(g))}km` : `적이 ${KMU(46)}km 밖에서도 아군을 봅니다`}</small>
    <span>속력</span>${seg("spd", [["slow", "저속"], ["eco", "경제"], ["full", "전속"]])}<small>${SPDS[g.spd][0]} — 이동 ×${SPDS[g.spd][1]} · 연료 ${(SPDS[g.spd][2] * 60).toFixed(1)}%/분</small>
    <span>일제사격</span>${seg("salvoN", [[2, "2발"], [4, "4발"], [8, "8발"]])}<small>${g.salvoN >= 8 ? "적 대공을 포화 — 명중 ↑ · 탄 소모 큼" : g.salvoN <= 2 ? "아껴 쏘기 — 대부분 요격될 수 있음" : "균형"}</small></div></div>`;
}
function rightPanel() {
  const el = $("#omRight"); if (!el) return; const T = threats(), [adv, fn] = S.isAir ? airAdvice() : staffAdvice(); S.acts = [];
  const btn = (a, cls = "") => { if (!a) return ""; S.acts.push(a[1]); return `<button class="om-act ${cls}" data-om="act:${S.acts.length - 1}">${a[0]} ›</button>`; };
  el.innerHTML = `<div class="om-h">다가오는 위협</div>${T.length ? T.map((t) => `<div class="om-thr ${t.cls}"><span class="cd">${t.cd == null ? "—" : fmtT(t.cd)}</span><b>${t.t}</b><small>${t.sub}</small>${btn(t.act)}</div>`).join("") : `<div class="om-note">탐지된 위협 없음</div>`}`
    + `<div class="om-h">참모 한 줄</div><div class="om-adv">${adv}${fn ? `<br>${btn(["추천대로 실행", fn], "ok")}` : ""}</div>`
    + `<div class="om-h">상황 일지</div><div class="om-log">${S.log.map((l) => `<div class="${l.cls}"><span>${fmtT(l.at)}</span> ${l.t}</div>`).join("")}</div>`;
}
function timeline() {
  const el = $("#omTl"); if (!el) return; const C = { out: ["이동", "#7cc4ff"], rtb: ["귀환", "#7cc4ff"], rearm: ["재무장", "#5b6b74"], cap: ["CAP", COL.us], strike: ["타격", "#ffb35c"], patrol: ["정찰", COL.ok], refuel: ["급유", COL.fuel], airlift: ["공수", "#d9c7ff"], escort: ["호위", "#9fd8ff"], lost: ["손실", COL.foe] };
  const pct = (t) => `${(Math.min(t, LIMIT) / LIMIT) * 100}%`;
  el.innerHTML = `<div class="om-tlh"><b>편대 운용 시간표</b><span>출격 → 임무 → 귀환 → 재무장 · 흰 선 = 현재</span></div><div class="om-tlax">${[0, 5, 10, 15, 20, 25, 30].map((m) => `<span>${m}분</span>`).join("")}</div>`
    + S.air.map((u) => `<div class="om-tlr${u === S.sel ? " on" : ""}"><span class="nm">${AIR_IC[u.t]} ${short(u.name)}</span><div class="bar">${(S.hist[u.id] || []).filter((h) => h.l).map((h) => { const c = C[h.l] || ["", "#888"], t1 = h.t1 ?? S.t; return `<i style="left:${pct(h.t0)};width:calc(${pct(Math.max(t1 - h.t0, 1))});background:${c[1]}" title="${c[0]}">${t1 - h.t0 > 90 ? c[0] : ""}</i>`; }).join("")}${u.st === "rearm" ? `<i class="fut" style="left:${pct(S.t + u.cd)};width:${pct(60)}">재출격</i>` : ""}<em style="left:${pct(S.t)}"></em></div></div>`).join("");
}
function panel() {
  const clock = $("#omClock"); if (clock) clock.textContent = `${S.phase === "plan" ? "계획 단계" : S.phase === "run" ? (S.paused ? "일시정지" : `진행 x${S.speed}`) : "종료"} · 작전 시간 ${fmtT(S.t)} / 30:00`;
  const sig = JSON.stringify([S.pop && [S.pop.k, S.pop.pick, S.pop.esc, S.pop.x],S.isAir && S.air.map((a) => [a.st, a.job, a.sec, !!a.tgt, Math.round(a.fuel / 60), a.asm, Math.ceil(a.cd / 10)]), S.phase, S.sel?.id, S.repShow?.done, Math.floor(S.t / 5), S.us.map((g) => [g.roe, g.radar, g.spd, g.salvoN, Math.round(g.fuel / 5), alive(g).reduce((a, x) => a + x.asm + x.sam, 0), g.mission, g.sec, g.path.length, Math.round(strength(g) * 20), alive(g).length]), S.foe.map((f) => [f.seen, alive(f).length, f.gone]), S.raids.map((r) => r.alive), S.pts, S.sup.length, S.log.length && S.log[0].t, S.evt?.id, S.place, Math.floor(S.t / 10)]);
  if (sig === S.psig && !S.dirty) return; S.psig = sig; S.dirty = false;
  rightPanel(); timeline(); briefCards(); topBars(); { const pp = $("#omPop"); if (pp) pp.innerHTML = popHTML(); }
  const side = $("#omSide"); if (!side) return; const g = S.sel, out = S.foe.filter((f) => !alive(f).length || f.gone).length;
  const obj = `<div class="om-obj"><b>목표</b> ${S.isAir ? "항공 지원으로 " : ""}적 전단의 <em>연평 해역(노란 원)</em> 진입 저지<small>적 격퇴 ${out}/${S.foe.length} · 남은 시간 ${fmtT(Math.max(0, LIMIT - S.t))} · <a data-om="rebrief">브리핑</a></small></div>`;
  if (S.isAir) {
    const grp = [["전투기 — 방공(CAP)·타격", (u) => u.t === "fighter"], ["정찰", (u) => u.t === "mpa" || u.t === "helo"], ["지원", (u) => u.t === "tanker" || u.t === "transport"]];
    side.innerHTML = obj + (S.phase === "plan" ? `<button class="om-rec" data-om="airrec">⚡ 추천 계획 적용 <small>초계기 정찰 · 전투기 1개 CAP · 급유·공수 — 나머지 전투기는 타격 대기</small></button>` : "")
      + grp.map(([h, fn]) => { const L = S.air.filter(fn); return L.length ? `<div class="om-h">${h}</div>${L.map((a) => `<div class="om-card${a === g ? " on" : ""}${a.st === "lost" ? " dead" : ""}${a.st === "rearm" || a.st === "rtb" ? " wait" : ""}${a.st === "ready" && !hasOrder(a) ? " idle" : ""}" draggable="${a.st !== "lost"}" data-drag="${a.id}" data-om="asel:${a.id}"><span class="ic">${AIR_IC[a.t]}</span><span class="tx"><b>${short(a.name)}</b><small>${airStatus(a)}</small></span><span class="tag">${AIR_T[a.t].asm ? `🚀${a.asm}` : ""} ⛽${Math.round((a.fuel / AIR_T[a.t].fuel) * 100)}%</span></div>`).join("")}` : ""; }).join("")
      + (g && g.t && g.st !== "lost" ? `<div class="om-row" style="margin-top:6px">${airborne(g) ? `<button data-om="rtb">${short(g.name)} 귀환</button>` : ""}${g.sec || g.job === "strike" ? `<button data-om="unsec">임무 취소</button>` : ""}</div>` : "")
      + `<div class="om-help"><b>조작은 두 가지뿐</b><span>🗺 <b>구역 클릭</b> → 그 구역에 정찰·방공(CAP)·급유 보내기</span><span>▲ <b>적 전단 클릭</b> → 타격 편대 고르고 출격 (예상 명중·위험 표시)</span><span>편대는 연료가 떨어지면 스스로 귀환·재무장하고, 구역 임무는 다시 나갑니다.</span></div>`
      + `<div class="om-h">함정 전단 (자동 방어)</div>${S.us.map((x) => `<div class="om-note">${x.name} — 전력 ${Math.round(strength(x) * 100)}%</div>`).join("")}`
      + (S.phase === "plan" ? `<button class="om-go" data-om="go">작전 개시 ›</button>` : "");
    return;
  }
  side.innerHTML = obj + `<div class="om-h">아군 전단 — 카드를 지도 구역으로 끌기</div>${S.us.map((u) => `<div class="om-card${u === g ? " on" : ""}${alive(u).length ? "" : " dead"}" draggable="${!!alive(u).length}" data-drag="${u.id}" data-om="sel:${u.id}"><span class="ic">■</span><span class="tx"><b>${u.name}</b><small>${u.ships.map((s) => `${s.name}${s.hp <= 0 ? "(침몰)" : ""}`).join(", ")}</small></span><span class="tag">${MISS[u.mission]}${u.sec ? ` · ${secById(u.sec).n}` : ""}</span></div>`).join("")}`
    + (g && !g.t ? `<div class="om-h">${g.name} 상태 · 명령</div>${shipDetail(g)}<div class="om-h">${g.name} 임무</div><div class="om-row">${Object.entries(MISS).map(([k, n]) => `<button data-om="mis:${k}" class="${g.mission === k ? "on" : ""}">${n}</button>`).join("")}<button data-om="clr">경로 지우기</button></div><div class="om-note">${{ strike: "탐지된 적 전단이 48km 안에 오면 접근해 타격", hold: "도착한 구역을 지키며 사거리 안의 적만 교전", scout: "탐지 반경 52km, 교전을 피하고 물러남" }[g.mission]}</div>` : "")
    + `<div class="om-h">지원 배정 · 남은 포인트 ${S.pts}</div>${Object.entries(SUP).map(([k, s]) => `<div class="om-sup"><button data-om="sup:${k}" ${S.phase !== "plan" ? "disabled" : ""}>${s.n} <b>${s.c}P</b></button><small>${s.d}</small></div>`).join("")}`
    + (S.sup.length ? `<div class="om-tags">${S.sup.map((s, i) => `<span>${SUP[s.k].n}${S.phase === "plan" ? ` <a data-om="unsup:${i}">×</a>` : ""}</span>`).join("")}</div>` : "")
    + (S.phase === "plan" ? `<button class="om-go" data-om="go">작전 개시 ›</button>` : "");
}
function briefCards() {
  const ev = $("#omEvt"); if (ev) ev.innerHTML = S.evt ? `<div class="om-evt"><div class="om-et">${S.evt.t}</div>${[S.evt.a, S.evt.b].map(([k, n, d]) => `<button data-om="evt:${k}"><b>${n}</b><small>${d}</small></button>`).join("")}</div>` : "";
  const bf = $("#omBrief"); if (!bf) return;
  if (!S.brief) { bf.innerHTML = ""; return; }
  bf.innerHTML = S.isAir
    ? `<div class="om-brief"><div class="om-bh">항공 작전 브리핑 · 서해 항공 지원</div><p><b>상황</b> 적 수상전단 ${S.foe.length}개가 연평 해역으로 남하합니다. 아군 초계전단은 연평 구역을 자동으로 지킵니다. 귀관은 <b>항공 전력</b>을 지휘합니다.</p><p><b>목표</b> 30분 동안 적이 연평 해역(노란 원)에 들어오지 못하게 막으십시오. 적 전투기 편대가 두 차례 내려옵니다.</p><p><b>할 일은 세 가지</b> ① <b>찾기</b> — 초계기를 구역에 보내 적을 찾는다 ② <b>막기</b> — 전투기 하나를 연평 상공 방공(CAP)에 둬 적 전투기를 막는다 ③ <b>치기</b> — 적 전단이 보이면 <b>적을 클릭</b>해 대기 전투기로 타격한다.</p><p><b>조작</b> 지도 <b>구역을 클릭</b>하면 그 구역에 보낼 편대를, <b>적을 클릭</b>하면 타격 편대와 예상 결과(명중·격추 위험)를 보여줍니다. 처음이라면 왼쪽 위 <b>추천 계획</b>을 누르세요. 위 노란 줄의 '지금 할 일'을 따라가면 됩니다.</p><p><b>읽는 법</b> 오른쪽 <b>다가오는 위협</b> 카드에 시간순으로 위협이 쌓이고, 버튼 한 번으로 대응할 수 있습니다. 아래 <b>시간표</b>로 언제 하늘이 비는지 확인하십시오. 원·경로선은 선택한 편대만 보이고, 위쪽 '지도 표시'로 켤 수 있습니다.</p><button data-om="brief">계획 시작 ›</button></div>`
    : `<div class="om-brief"><div class="om-bh">작전 브리핑 · 서해 해상 차단</div><p><b>상황</b> 적 수상전단 ${S.foe.length}개가 북쪽 경계선을 넘어 <b>연평 해역</b>으로 남하하고 있습니다. 일부는 아직 위치가 확인되지 않았습니다.</p><p><b>목표</b> 30분 동안 적이 연평 해역(노란 원)에 들어오지 못하게 막으십시오. 적 전단을 격멸하거나 퇴각시키면 바로 성공입니다.</p><p><b>조작</b> 왼쪽 전단 카드를 지도의 <b>구역</b>으로 끌어다 놓으면 그 구역으로 기동합니다. 세밀한 경로가 필요하면 우클릭으로 경로점을 찍으십시오.</p><p><b>읽는 법</b> 빨간 화살표 = 적의 <b>다음 행동</b>만 표시합니다. 오른쪽 <b>다가오는 위협</b> 카드의 버튼으로 바로 대응할 수 있고, 참모의 '추천대로 실행'도 있습니다.</p><button data-om="brief">계획 시작 ›</button></div>`;
}
