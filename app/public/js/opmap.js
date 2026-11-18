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
/* 구역(섹터): 편대·전단을 구역 단위로 배정한다 (지점을 일일이 찍지 않음) */
const SECTORS = [
  { id: "s1", n: "대청 북", x0: 14, y0: 8, x1: 62, y1: 46, c: { x: 40, y: 34 } },
  { id: "s2", n: "연평 서", x0: 62, y0: 8, x1: 100, y1: 46, c: { x: 82, y: 38 }, goal: true },
  { id: "s3", n: "연평 동", x0: 100, y0: 8, x1: 126, y1: 46, c: { x: 108, y: 34 } },
  { id: "s4", n: "대청 남", x0: 14, y0: 46, x1: 62, y1: 84, c: { x: 40, y: 62 } },
  { id: "s5", n: "덕적", x0: 62, y0: 46, x1: 100, y1: 84, c: { x: 84, y: 62 } },
  { id: "s6", n: "본토 연안", x0: 100, y0: 46, x1: 124, y1: 84, c: { x: 110, y: 62 } },
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
  Object.assign(S, { on: true, ctx, air: A, isAir, layers: { det: false, rng: false, path: false }, hist: {}, drag: null, hover: null, raids: [], isleBat: null, airLost: 0, sorties: 0, us: F.us, foe: F.foe, t: 0, run: false, speed: 1, paused: false, sel: isAir ? A[0] : F.us[0], phase: "plan",
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
export const opMapAir = { setAirPoint: (p) => setAirPoint(p), launch: (u) => launch(u), assign: (id, sid) => assignSector(id, secById(sid)), secOf: (p) => secOf(p) };
/** test hook: run the operation forward by game seconds without waiting for frames */
export function opMapAdvance(sec) { if (S.phase !== "run") return; for (let t = 0; t < sec && S.phase === "run"; t += 1) { if (S.evt) resolveEvent(S.evt.a[0]); step(1); } S.dirty = true; }

function say(t, cls = "") { S.log.unshift({ t, cls, at: S.t }); if (S.log.length > 7) S.log.pop(); S.logDirty = true; }

function build() {
  let el = $("#opMap"); if (!el) { el = document.createElement("div"); el.id = "opMap"; document.body.append(el); }
  el.innerHTML = `<div class="om-top"><b>STEEL TIDE</b><span class="om-t">${S.isAir ? "항공 작전 · 서해 항공 지원" : "작전 지휘 · 서해 해상 차단 작전"}</span><span id="omClock"></span><div class="om-spd"><button data-om="pause">⏸</button><button data-om="s1" class="on">x1</button><button data-om="s2">x2</button><button data-om="s4">x4</button></div><button data-om="quit" class="om-quit">작전 중단</button></div>`
    + `<div class="om-b"><div class="om-side" id="omSide"></div><div class="om-mapw"><div class="om-cvw"><canvas id="omCv"></canvas><div class="om-lay"><span>지도 표시</span>${[["det", "탐지 범위"], ["rng", "사거리"], ["path", "경로"]].map(([k, n]) => `<button data-om="layer:${k}">${n}</button>`).join("")}</div><div class="om-hint">${S.isAir ? "왼쪽 편대 카드를 지도의 <b>구역</b>으로 끌어다 놓기 (또는 편대 선택 후 구역 우클릭) · 임무는 자동 결정 · Space: 일시정지" : "왼쪽 전단 카드를 지도의 <b>구역</b>으로 끌어다 놓기 (또는 우클릭으로 세부 경로) · Space: 일시정지"}</div><div id="omEvt"></div><div id="omRes"></div><div id="omBrief"></div></div>${S.isAir ? `<div class="om-tl" id="omTl"></div>` : ""}</div><div class="om-right" id="omRight"></div></div>`;
  el.style.display = "flex";
  const cv = $("#omCv"); const fit = () => { const r = cv.parentElement.getBoundingClientRect(); cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio; cv.style.width = r.width + "px"; cv.style.height = r.height + "px"; };
  fit(); S.fit = fit; addEventListener("resize", fit);
  cv.oncontextmenu = (e) => e.preventDefault();
  cv.ondragover = (e) => { e.preventDefault(); S.hover = secOf(toMap(e)); };
  cv.ondragleave = () => { S.hover = null; };
  cv.ondrop = (e) => { e.preventDefault(); S.hover = null; const id = e.dataTransfer.getData("text/plain") || S.drag; const q = secOf(toMap(e)); if (id && q) assignSector(id, q); S.drag = null; };
  el.ondragstart = (e) => { const c = e.target.closest?.("[data-drag]"); if (!c) return; S.drag = c.dataset.drag; e.dataTransfer.setData("text/plain", S.drag); e.dataTransfer.effectAllowed = "move"; };
  cv.onmousedown = (e) => { const p = toMap(e);
    if (S.isAir) { if (e.button === 2) { const q = secOf(p); if (S.sel && q) assignSector(S.sel.id, q); return; } if (e.button !== 0) return; const u = S.air.filter((a) => a.st !== "lost").sort((a, b) => d2(a, p) - d2(b, p))[0]; if (u && d2(u, p) < 5) S.sel = u; S.dirty = true; return; }
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
  else if (a.startsWith("layer:")) { const k = a.slice(6); S.layers[k] = !S.layers[k]; b.classList.toggle("on", S.layers[k]); }
  else if (a.startsWith("act:")) { const f = S.acts?.[+a.slice(4)]; if (f) f(); }
  else if (a === "unsec") { const u = S.sel; if (u) { u.sec = null; if (u.t) { u.pt = null; u.tgt = null; } } }
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
const hasOrder = (u) => u.st !== "lost" && (u.sec ? true : u.job === "strike" ? !!u.tgt : u.job === "escort" ? !!u.follow : !!u.pt);
const foeIn = (q) => S.foe.filter((f) => f.seen && alive(f).length && !f.gone && !(f.delay && S.t < f.delay) && f.x >= q.x0 - 4 && f.x < q.x1 + 4 && f.y >= q.y0 - 4 && f.y < q.y1 + 4).sort((a, b) => d2(a, q.c) - d2(b, q.c))[0];
/** 구역 배정: 편대 종류와 구역 상황으로 임무를 정한다 (전투기: 적이 있으면 대함 타격, 없으면 CAP). */
function assignSector(id, q) {
  const u = S.air.find((a) => a.id === id), g = S.us.find((x) => x.id === id);
  if (u) {
    if (u.st === "lost") return;
    if (u.t === "transport" && !q.goal) { say("대형수송기는 연평 서 구역(연평도)에만 공수할 수 있습니다.", "bad"); return; }
    if (u.t === "transport" && S.isleBat) { say("연평도 지대함 유도탄 반은 이미 전개됐습니다.", "bad"); return; }
    u.sec = q.id; secJob(u); S.sel = u; say(`${u.name} → ${q.n} · ${JOB[u.job][0]}`);
    if (S.phase === "run" && u.st === "ready") launch(u);
  } else if (g && alive(g).length) {
    const c = { ...q.c }; for (let k = 0; k < 20 && inLand(c); k++) c.x -= 2;
    g.sec = q.id; g.path = [c]; S.sel = g; say(`${g.name} → ${q.n} 구역으로 기동`);
  }
  S.dirty = true;
}
function secJob(u) {
  const q = secById(u.sec); if (!q) return;
  if (u.t === "transport") { u.job = "airlift"; u.pt = { ...YEONPYEONG }; return; }
  if (u.t === "tanker") { u.job = "refuel"; u.pt = { ...q.c }; return; }
  const f = AIR_T[u.t].asm && u.asm > 0 ? foeIn(q) : null;
  if (f && (u.t === "fighter" || u.t === "helo")) { if (u.job !== "strike" || u.tgt !== f) { u.job = "strike"; u.tgt = f; u.pt = null; } return; }
  u.tgt = null; u.job = u.t === "fighter" ? "cap" : "patrol"; u.pt = { ...q.c };
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
    if (u.st === "rtb") { if (moveAir(u, home, dt)) { u.st = "rearm"; u.cd = T.re; if (u.job === "strike") { u.tgt = null; if (!u.sec) u.pt = null; } say(`${u.name} 착륙 — 재무장 ${Math.round(T.re / 60 * 10) / 10}분.`); } continue; }
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
    if (u.job === "airlift") { u.drop += dt; if (u.drop >= 40) { S.isleBat = { x: YEONPYEONG.x, y: YEONPYEONG.y, cd: 10 }; say("연평도 해병 지대함 유도탄 반 전개 완료 — 사거리 28km.", "hit"); u.pt = null; u.sec = null; u.st = "rtb"; } continue; }
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
  for (const f of S.foe) { const v = alive(f).length > 0; const was = f.seen; f.seen = v && seenFoe(f); if (f.seen) f.everSeen = true; if (f.seen && !was) say(`${f.name} 탐지 — ${alive(f).map((s) => s.n).join(", ")}`, "bad"); }
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
  if (k === "scramble") { const u = air("a9", "fighter", "비상대기 편대 (FA-50)"); u.asm = 2; u.sec = "s2"; S.air.push(u); secJob(u); launch(u); }
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
function draw() {
  const cv = $("#omCv"); if (!cv) return; const x = cv.getContext("2d"), { k, ox, oy } = view(), P = (px, py) => [ox + px * k, oy + py * k], dpr = devicePixelRatio, F = (n, w = 400) => `${w} ${n * dpr}px 'Noto Sans KR', sans-serif`;
  x.fillStyle = "#0a1822"; x.fillRect(0, 0, cv.width, cv.height);
  const sea = x.createRadialGradient(ox + W * k * 0.5, oy + H * k * 0.5, 10, ox + W * k * 0.5, oy + H * k * 0.5, W * k * 0.7); sea.addColorStop(0, "#173246"); sea.addColorStop(1, "#0c1d29"); x.fillStyle = sea; x.fillRect(ox, oy, W * k, H * k);
  // sectors
  for (const q of SECTORS) {
    const st = secState(q), [a, b] = P(q.x0, q.y0), w = (q.x1 - q.x0) * k, h = (q.y1 - q.y0) * k, sel = S.sel && (S.sel.sec === q.id), hov = S.hover === q;
    x.fillStyle = hov ? "rgba(242,202,92,.16)" : st.hot ? "rgba(255,107,94,.09)" : q.goal ? "rgba(77,232,212,.07)" : "rgba(255,255,255,.015)"; x.fillRect(a, b, w, h);
    x.strokeStyle = hov ? COL.warn : sel ? COL.us : q.goal ? "rgba(77,232,212,.55)" : "rgba(110,160,180,.28)"; x.lineWidth = (hov || sel ? 2.5 : 1.2) * dpr; x.strokeRect(a, b, w, h);
    x.fillStyle = st.hot ? "#ff9b8a" : q.goal ? COL.us : "#cfe"; x.font = F(14, 700); x.fillText(q.n + (q.goal ? " ★방어 목표" : ""), a + 10 * dpr, b + 20 * dpr);
    st.ch.forEach(([c, t], i) => { x.font = F(11.5, 700); const tw = x.measureText(t).width + 16 * dpr, yy = b + (30 + i * 22) * dpr; x.fillStyle = "rgba(10,20,26,.85)"; x.beginPath(); x.roundRect(a + 10 * dpr, yy, tw, 18 * dpr, 9 * dpr); x.fill(); x.fillStyle = c; x.fillText(t, a + 18 * dpr, yy + 13 * dpr); });
  }
  x.fillStyle = "#2c3b2f"; x.strokeStyle = "#5d7a5f"; x.lineWidth = 1.5 * dpr;
  for (const poly of LAND) { x.beginPath(); poly.forEach(([a, b], i) => (i ? x.lineTo(...P(a, b)) : x.moveTo(...P(a, b)))); x.closePath(); x.fill(); x.stroke(); }
  x.font = F(11);
  for (const [n, a, b, r] of ISLES) { x.fillStyle = "#2c3b2f"; x.beginPath(); x.arc(...P(a, b), r * k, 0, Math.PI * 2); x.fill(); x.stroke(); x.fillStyle = "rgba(207,231,234,.75)"; x.fillText(n, ...P(a + r + 1, b + 0.6)); }
  x.setLineDash([10 * dpr, 8 * dpr]); x.strokeStyle = COL.foe; x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(...P(14, LINE_Y)); x.lineTo(...P(122, LINE_Y)); x.stroke(); x.setLineDash([]);
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
  const [bx, by] = P(AIRBASE.x, AIRBASE.y); x.fillStyle = COL.ally; x.fillRect(bx - 8 * dpr, by - 2 * dpr, 16 * dpr, 4 * dpr); x.font = F(11); x.fillText(AIRBASE.n, bx - 34 * dpr, by + 16 * dpr);
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
    if (S.isAir) { const u = free()[0], fq = secOf(f) || q; if (u && fq) item.act = [`대응: ${short(u.name)} → ${fq.n} 타격`, () => assignSector(u.id, fq)]; }
    else { const g = S.us.filter((u) => alive(u).length).sort((a, b) => d2(a, f) - d2(b, f))[0]; if (g && (g.mission !== "strike" || !g.path.length)) item.act = [`대응: ${g.name} 요격 기동`, () => { const p = f.path[0] || f; g.path = [{ x: (p.x + f.x) / 2, y: (p.y + f.y) / 2 + 6 }]; g.mission = "strike"; S.sel = g; say(`${g.name} — ${f.name} 요격 기동`); }]; }
    L.push(item);
  }
  if (unseen) L.push({ cd: null, t: `미탐지 적 전단 ${unseen}개`, sub: S.isAir ? "북쪽 구역에 초계기를 배정해 먼저 찾으십시오" : "P-3C나 정찰 전단으로 북쪽을 수색하십시오", cls: "y" });
  if (S.isAir) {
    for (const at of RAIDS) if (S.t < at) L.push({ cd: at - S.t, t: "적 전투기 편대 출격 예상", sub: "CAP이 없으면 초계기·급유기가 노려집니다", cls: "y", act: !S.air.some((u) => u.job === "cap" && u.sec) && free()[0] ? [`대응: ${short(free()[0].name)} → 연평 서 CAP`, () => assignSector(free()[0].id, secById("s2"))] : null });
    for (const r of S.raids) if (r.alive) { const prey = S.air.filter((u) => airborne(u) && u.t !== "fighter").sort((a, b) => d2(a, r) - d2(b, r))[0]; L.push({ cd: prey ? d2(prey, r) / 0.45 : 0, t: `적 전투기 → ${prey ? short(prey.name) : "아군 전단"}`, sub: "방공 레이더 추적 중", cls: "", act: prey ? [`대응: ${short(prey.name)} 귀환`, () => { prey.st = "rtb"; say(`${prey.name} 위협 회피 — 귀환`); }] : null }); }
  }
  return L.sort((a, b) => (a.cd ?? 1e9) - (b.cd ?? 1e9)).slice(0, 4);
}
function airAdvice() {
  const by = (t) => S.air.filter((u) => u.t === t && u.st !== "lost"), free = by("fighter").filter((u) => !u.sec);
  if (!by("mpa").some((u) => u.sec)) { const u = by("mpa")[0]; if (u) return [`항공작전과장: "초계기를 대청 북 구역에 띄우면 경계선 너머 적 전단을 먼저 찾습니다."`, () => assignSector(u.id, secById("s1"))]; }
  if (!by("fighter").some((u) => u.job === "cap" && u.sec)) { const u = free[0] || by("fighter")[0]; if (u) return [`항공작전과장: "적 전투기가 내려옵니다. ${short(u.name)}를 연평 서에 CAP으로 거십시오."`, () => assignSector(u.id, secById("s2"))]; }
  const raid = S.raids.find((r) => r.alive); if (raid) return ["방공 통제관: \"적 전투기 편대 남하 중! 위협 카드에서 표적이 된 항공기를 물리십시오.\"", null];
  const seen = S.foe.find((f) => f.seen && alive(f).length && !f.gone && !(f.delay && S.t < f.delay)), sq = seen && (secOf(seen) || nextSec(seen)?.q);
  if (seen && sq && !by("fighter").some((u) => u.job === "strike")) { const u = free[0] || by("fighter").find((v) => v.job !== "cap") || by("fighter")[1]; if (u) return [`항공작전과장: "${seen.name}이 ${sq.n}에 있습니다. ${short(u.name)}를 그 구역에 넣으면 자동으로 대함 타격합니다."`, () => assignSector(u.id, sq)]; }
  const tk = by("tanker")[0]; if (tk && !tk.sec) return ["항공작전과장: \"급유기를 덕적 구역에 두면 전투기 교대 없이 오래 버팁니다.\"", () => assignSector(tk.id, secById("s5"))];
  const tr = by("transport")[0]; if (tr && tr.sec == null && !S.isleBat) return ["항공작전과장: \"수송기로 연평도에 지대함 유도탄 반을 공수하면 섬이 직접 싸웁니다.\"", () => assignSector(tr.id, secById("s2"))];
  return ["항공작전과장: \"현 편성 유지. 귀환한 편대는 재무장 후 같은 구역으로 자동 재출격합니다.\"", null];
}
function staffAdvice() {
  if (!S.ctx.ops) return [S.phase === "plan" ? "참모: \"작전 계획은 사령관 판단에 맡기겠습니다.\" (작전 병과 지휘관에게는 구체적인 참모 의견이 올라옵니다)" : "참모: \"현 상황 보고 — 교전 지속 중.\"", null];
  const hidden = S.foe.some((f) => alive(f).length && !f.seen && !(f.delay && S.t < f.delay)), noP3 = !S.sup.some((s) => s.k === "p3c");
  if (S.phase === "plan" && noP3) return ["정보처장: \"적 전단 위치가 일부만 확인됩니다. P-3C 초계를 경계선 남쪽에 두면 조기 탐지가 가능합니다.\"", S.pts >= SUP.p3c.c ? () => { S.pts -= SUP.p3c.c; S.sup.push({ k: "p3c", x: 70, y: 32, used: false }); say("P-3C 초계 배치 완료 (연평 서 북쪽)."); } : null];
  if (S.phase === "plan" && !S.us.some((g) => g.path.length)) return ["작전처장: \"제1전단을 연평 서 구역으로 전개해 적의 접근로를 막으십시오.\"", () => assignSector(S.us[0].id, secById("s2"))];
  if (!S.decoy.gone) return ["정보처장: \"서방 미확인 접촉(?)은 기만일 가능성이 있습니다. 정찰 전단으로 확인을 권고합니다.\"", null];
  if (hidden) return ["작전처장: \"미탐지 적 전력이 남아 있습니다. 방어 전단은 목표 해역을 유지하십시오.\"", null];
  const weak = S.us.find((g) => alive(g).length && strength(g) < 0.4); if (weak) return [`작전처장: "${weak.name} 전력 저하. 덕적 구역으로 물려 재정비를 권고합니다."`, () => assignSector(weak.id, secById("s5"))];
  return ["작전처장: \"현 기동 유지. 적 전단이 사거리에 들어오면 즉시 타격합니다.\"", null];
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
  const sig = JSON.stringify([S.isAir && S.air.map((a) => [a.st, a.job, a.sec, !!a.tgt, Math.round(a.fuel / 60), a.asm, Math.ceil(a.cd / 10)]), S.phase, S.sel?.id, S.us.map((g) => [g.mission, g.sec, g.path.length, Math.round(strength(g) * 20), alive(g).length]), S.foe.map((f) => [f.seen, alive(f).length, f.gone]), S.raids.map((r) => r.alive), S.pts, S.sup.length, S.log.length && S.log[0].t, S.evt?.id, S.place, Math.floor(S.t / 10)]);
  if (sig === S.psig && !S.dirty) return; S.psig = sig; S.dirty = false;
  rightPanel(); timeline(); briefCards();
  const side = $("#omSide"); if (!side) return; const g = S.sel, out = S.foe.filter((f) => !alive(f).length || f.gone).length;
  const obj = `<div class="om-obj"><b>목표</b> ${S.isAir ? "항공 지원으로 " : ""}적 전단의 <em>연평 해역(노란 원)</em> 진입 저지<small>적 격퇴 ${out}/${S.foe.length} · 남은 시간 ${fmtT(Math.max(0, LIMIT - S.t))} · <a data-om="rebrief">브리핑</a></small></div>`;
  if (S.isAir) {
    const ST = { ready: "대기", out: "이동", station: "임무 중", rtb: "귀환", rearm: "재무장", lost: "손실" };
    side.innerHTML = obj + `<div class="om-h">항공 편대 — 카드를 지도 구역으로 끌기</div>${S.air.map((a) => { const q = secById(a.sec); return `<div class="om-card${a === g ? " on" : ""}${a.st === "lost" ? " dead" : ""}${a.st === "rearm" || a.st === "rtb" ? " wait" : ""}" draggable="${a.st !== "lost"}" data-drag="${a.id}" data-om="asel:${a.id}"><span class="ic">${AIR_IC[a.t]}</span><span class="tx"><b>${short(a.name)}</b><small>${a.name.match(/\((.*)\)/)?.[1] || a.n} · ${q ? `${q.n} · ${JOB[a.job]?.[0] || ""}` : a.st === "lost" ? "손실" : "구역 미배정"}</small></span><span class="tag">${a.st === "rearm" ? fmtT(a.cd) : ST[a.st]}</span></div>`; }).join("")}`
      + (g && g.t ? `<div class="om-row" style="margin-top:6px">${airborne(g) ? `<button data-om="rtb">${short(g.name)} 귀환</button>` : ""}${g.sec ? `<button data-om="unsec">배정 해제</button>` : ""}</div>` : "")
      + `<div class="om-note" style="margin-top:8px">구역에 놓으면 임무가 자동으로 정해집니다 — 전투기: 적이 있으면 <b style="color:#ffb35c">대함 타격</b>, 없으면 <b style="color:#4de8d4">CAP</b> · 초계기·헬기: <b style="color:#9be06a">정찰</b> · 급유기: <b style="color:#ffe066">급유 궤도</b> · 수송기: 연평 서에만</div>`
      + `<div class="om-h">함정 전단 (자동 방어)</div>${S.us.map((x) => `<div class="om-note">${x.name} — 전력 ${Math.round(strength(x) * 100)}%</div>`).join("")}`
      + (S.phase === "plan" ? `<button class="om-go" data-om="go">작전 개시 ›</button>` : "");
    return;
  }
  side.innerHTML = obj + `<div class="om-h">아군 전단 — 카드를 지도 구역으로 끌기</div>${S.us.map((u) => `<div class="om-card${u === g ? " on" : ""}${alive(u).length ? "" : " dead"}" draggable="${!!alive(u).length}" data-drag="${u.id}" data-om="sel:${u.id}"><span class="ic">■</span><span class="tx"><b>${u.name}</b><small>${u.ships.map((s) => `${s.name}${s.hp <= 0 ? "(침몰)" : ""}`).join(", ")}</small></span><span class="tag">${MISS[u.mission]}${u.sec ? ` · ${secById(u.sec).n}` : ""}</span></div>`).join("")}`
    + (g && !g.t ? `<div class="om-h">${g.name} 임무</div><div class="om-row">${Object.entries(MISS).map(([k, n]) => `<button data-om="mis:${k}" class="${g.mission === k ? "on" : ""}">${n}</button>`).join("")}<button data-om="clr">경로 지우기</button></div><div class="om-note">${{ strike: "탐지된 적 전단이 48km 안에 오면 접근해 타격", hold: "도착한 구역을 지키며 사거리 안의 적만 교전", scout: "탐지 반경 52km, 교전을 피하고 물러남" }[g.mission]}</div>` : "")
    + `<div class="om-h">지원 배정 · 남은 포인트 ${S.pts}</div>${Object.entries(SUP).map(([k, s]) => `<div class="om-sup"><button data-om="sup:${k}" ${S.phase !== "plan" ? "disabled" : ""}>${s.n} <b>${s.c}P</b></button><small>${s.d}</small></div>`).join("")}`
    + (S.sup.length ? `<div class="om-tags">${S.sup.map((s, i) => `<span>${SUP[s.k].n}${S.phase === "plan" ? ` <a data-om="unsup:${i}">×</a>` : ""}</span>`).join("")}</div>` : "")
    + (S.phase === "plan" ? `<button class="om-go" data-om="go">작전 개시 ›</button>` : "");
}
function briefCards() {
  const ev = $("#omEvt"); if (ev) ev.innerHTML = S.evt ? `<div class="om-evt"><div class="om-et">${S.evt.t}</div>${[S.evt.a, S.evt.b].map(([k, n, d]) => `<button data-om="evt:${k}"><b>${n}</b><small>${d}</small></button>`).join("")}</div>` : "";
  const bf = $("#omBrief"); if (!bf) return;
  if (!S.brief) { bf.innerHTML = ""; return; }
  bf.innerHTML = S.isAir
    ? `<div class="om-brief"><div class="om-bh">항공 작전 브리핑 · 서해 항공 지원</div><p><b>상황</b> 적 수상전단 ${S.foe.length}개가 연평 해역으로 남하합니다. 아군 초계전단은 연평 서 구역을 자동으로 지킵니다. 귀관은 <b>항공 전력</b>을 지휘합니다.</p><p><b>목표</b> 30분 동안 적이 연평 해역(노란 원)에 들어오지 못하게 막으십시오. 적 전투기 편대가 두 차례 내려옵니다.</p><p><b>조작</b> 왼쪽 편대 카드를 지도의 <b>구역</b>에 끌어다 놓으면 끝입니다. 임무는 구역 상황에 맞게 자동으로 정해지고, 연료가 떨어지면 귀환해 재무장 후 같은 구역으로 다시 나갑니다.</p><p><b>읽는 법</b> 오른쪽 <b>다가오는 위협</b> 카드에 시간순으로 위협이 쌓이고, 버튼 한 번으로 대응할 수 있습니다. 아래 <b>시간표</b>로 언제 하늘이 비는지 확인하십시오. 원·경로선은 선택한 편대만 보이고, 위쪽 '지도 표시'로 켤 수 있습니다.</p><button data-om="brief">계획 시작 ›</button></div>`
    : `<div class="om-brief"><div class="om-bh">작전 브리핑 · 서해 해상 차단</div><p><b>상황</b> 적 수상전단 ${S.foe.length}개가 북쪽 경계선을 넘어 <b>연평 해역</b>으로 남하하고 있습니다. 일부는 아직 위치가 확인되지 않았습니다.</p><p><b>목표</b> 30분 동안 적이 연평 해역(노란 원)에 들어오지 못하게 막으십시오. 적 전단을 격멸하거나 퇴각시키면 바로 성공입니다.</p><p><b>조작</b> 왼쪽 전단 카드를 지도의 <b>구역</b>으로 끌어다 놓으면 그 구역으로 기동합니다. 세밀한 경로가 필요하면 우클릭으로 경로점을 찍으십시오.</p><p><b>읽는 법</b> 빨간 화살표 = 적의 <b>다음 행동</b>만 표시합니다. 오른쪽 <b>다가오는 위협</b> 카드의 버튼으로 바로 대응할 수 있고, 참모의 '추천대로 실행'도 있습니다.</p><button data-om="brief">계획 시작 ›</button></div>`;
}
