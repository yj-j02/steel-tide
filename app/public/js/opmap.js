// 작전 지휘 (operation map): plan on a 2D chart of the West Sea, then run the operation in
// real time (pause, x1/x2/x4). Groups move along the paths you draw; when a group detects an
// enemy group within missile range the exchange is resolved on the chart (salvos, interceptions,
// hits). Staff and promotion perks feed the numbers. Coastline: Natural Earth 1:10m (west of Incheon, 1 unit ≈ 1.4 km).

const KM = 1; /* map unit: kilometres; x east, y south */
const W = 150, H = 96;
import { minFx } from "./ministry.js";
import { COAST, ISLES, PLACES, NLL, GEO } from "./westsea.js";
const LAND = COAST; /* real coastline (Natural Earth), see westsea.js */
const GOAL0 = { x: 75, y: 47, r: 9, n: "연평 해역" };
let GOAL = GOAL0;
const BATTERY = { x: 126, y: 38, range: 48 };
/** 작전 시나리오 (FM: 경기 선택) */
const SCEN = {
  intercept: { n: "서해 해상 차단", ic: "⚓", diff: "보통", reload: 50, flank: 720, d: "적 수상전단 3개가 연평 해역으로 남하합니다. 해역에 들어오기 전에 찾아서 막으십시오.", win: "적이 연평 해역(노란 원)에 들어오지 못하게 막기 — 적 격멸 또는 30분 버티기", tip: "P-3C로 먼저 찾고, 주력은 연평에." },
  night: { n: "야간 침투 저지", ic: "☾", diff: "어려움", night: true, detK: 0.6, limit: 1500, reload: 90, d: "야음을 틈타 적 유도탄정 편대가 여러 방향에서 빠르게 침투합니다. 모든 탐지 거리가 크게 줄어듭니다.", win: "고속 편대가 연평 해역에 들어오지 못하게 막기 — 격멸 또는 25분 버티기", tip: "레이더 거리 40%↓ · 정찰 수단이 승부를 가릅니다." },
  fog: { n: "해무 속 기습 포격전", ic: "≋", diff: "어려움", sea: true, fog: true, detK: 0.5, limit: 1200, cmd: "decoy", goal: { x: 104, y: 72, r: 8, n: "덕적 해역" }, off: { dx: 30, dy: 24 }, d: "짙은 해무로 탐지 거리가 절반으로 줄었습니다. 적 미사일정·고속정 10척이 섬 그림자를 타고 덕적 해역으로 기습해 옵니다.", win: "주력함(구축함·호위함)을 잃지 않고 적 6척 이상 격파 — 함정 3척을 잃거나 적이 덕적 해역에 들어오면 실패", tip: "레이더를 켜면 적이 먼저 봅니다 — 전파 차단·미끼·정찰 중 고르십시오." },
  airsup: { n: "서해 제공권 쟁탈전", ic: "✈", diff: "보통", air: true, limit: 1500, cmd: "aggr", d: "적 요격기 16기가 3파(3분·11분·19분)에 걸쳐 서해 상공으로 들어옵니다. 25분 동안 연평 상공을 비우지 마십시오.", win: "적기 10기 이상 격추 — CAP 공백이 누적 3분을 넘거나 아군기 4기를 잃으면 실패", tip: "1파에 다 띄우면 2파 때 공역이 빕니다 — 'CAP 2교대' 칸과 급유기를 쓰십시오." },
  sead: { n: "적 지대공망 제압", ic: "⌖", diff: "어려움", air: true, limit: 1320, goal: { x: 58, y: 17, r: 13, n: "적 방공망" }, cmd: "caut", d: "북방 해안의 적 지대공 포대 3기와 방공함 2척이 후속 타격 회랑을 막고 있습니다. 방공망을 무너뜨리십시오.", win: "지대공 포대 2기 이상 + 방공함 1척 이상 격파 — 아군기 4기를 잃으면 실패", tip: "SEAD 무장으로 포대부터 — 포대 사거리(약 25km) 안은 25초마다 SAM이 날아옵니다." },
  baeng: { n: "백령 공중 보급 엄호", ic: "⇣", diff: "보통", air: true, limit: 1200, goal: { x: 16, y: 22, r: 5, n: "백령 투하 구역" }, cmd: "aggr", d: "봉쇄된 백령도에 C-130H 수송기 2대가 저고도 감속 투하를 시도합니다. 적 요격기 3파로부터 지켜 내십시오.", win: "수송기 1대 이상 투하 후 이탈 (2대 모두 성공하면 별 +1) — 2대 모두 잃으면 실패", tip: "'수송기 호위' 칸에 전투기를 — 호위가 없으면 적기가 수송기부터 노립니다." },
  convoy: { n: "수송 선단 호위", ic: "⛴", diff: "보통", convoy: true, d: "인천에서 연평도로 가는 보급·여객 선단 3척을 지킵니다. 적은 해역이 아니라 선단을 노립니다.", win: "선단 3척 중 2척 이상을 연평도에 도착시키기", tip: "선단은 스스로 방어할 수 없습니다 — 주력을 '선단 호위' 칸에." },
};
/** 적 지휘관 성향 (FM: 상대 감독 성향) — 가상 인물 */
const FOE_CMD = {
  aggr: { n: "공세형", who: "적 서해함대 사령관 '돌격' (가상)", d: "빠르게 밀고 들어오고, 피해를 입어도 쉽게 물러나지 않습니다. 가까이 붙어서 쏩니다.", tip: "종심 방어로 받아치고 '대공 집중'을 아껴 두십시오.", spd: 1.12, ret: 0.18, hold: 18, good: "deep" },
  caut: { n: "신중형", who: "적 서해함대 사령관 '거북' (가상)", d: "천천히 접근하고 멀리서 쏘며, 피해가 커지면 일찍 물러납니다.", tip: "전진 차단으로 먼저 때리면 쉽게 무너집니다.", spd: 0.88, ret: 0.45, hold: 28, good: "forward" },
  decoy: { n: "기만형", who: "적 서해함대 사령관 '여우' (가상)", d: "허위 표적을 여러 개 뿌리고, 레이더를 끈 채 접근해 잘 보이지 않습니다.", tip: "P-3C·정찰 전력을 늘리고 미확인 접촉(?)에 속지 마십시오.", spd: 1, ret: 0.3, hold: 24, stealth: 0.75, good: "decoy" },
};
const CONVOY_FROM = { x: 118, y: 70 };

const SHIP_T = {
  aegis: { n: "이지스구축함", hp: 100, asm: 16, sam: 48 },
  ddh: { n: "구축함", hp: 85, asm: 8, sam: 24 },
  ffg: { n: "호위함", hp: 70, asm: 8, sam: 12 },
  pkg: { n: "유도탄고속함", hp: 40, asm: 4, sam: 2 },
  civ: { n: "수송선", hp: 45, asm: 0, sam: 0 },
  foeFAST: { n: "적 고속정 (물살형·가상)", hp: 22, asm: 0, sam: 0 }, /* 함포·어뢰 근접전 전용 */
  foeMSL: { n: "적 미사일정 (해칼형·가상)", hp: 30, asm: 4, sam: 0 },
  foeSAM: { n: "지대공 포대 (철벽형·가상)", hp: 40, asm: 0, sam: 12 },
  foeAAW: { n: "방공함 (파도형·가상)", hp: 50, asm: 2, sam: 30 },
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
const fmax = (u) => u.fmax || AIR_T[u.t].fuel;
const on = (k) => (S.fm?.fx?.[k] || 0) > S.t; /* timed effect active */
const fatK = (u) => ((u.fat || 0) >= 50 ? 0.1 : 0);
/** 무장 프리셋 (전투기): 공대공 / 공대함 / 방공제압 */
const ARM = { a2a: { n: "공대공", kill: 0.1, fuel: 1 }, a2s: { n: "공대함", kill: -0.15, fuel: 1.15 }, sead: { n: "SEAD", kill: -0.1, fuel: 1.1 } };
const armOf = (u) => S.fm?.arm?.[u.id] || (roleOf(u.id) === "strike" ? (S.scenK === "sead" ? "sead" : "a2s") : "a2a");
const armAsm = (u) => (u.t !== "fighter" ? AIR_T[u.t].asm : u.arm === "a2a" ? 0 : /FA-50/.test(u.name) ? 2 : 4);

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

/** a point in open water near p (nudged toward the goal) */
function wet(p) { const q = { ...p }; for (let k = 0; k < 30 && inLand(q); k++) { q.x += Math.sign(GOAL.x - q.x) * 1.5; q.y += Math.sign(GOAL.y - q.y) * 1.5; } return q; }
function forces(grade, sk = "intercept") {
  let us = [{ id: "u1", name: "제1전단", x: 104, y: 66, ships: [ship("aegis", "정조대왕함"), ship("ffg", "대구함")], mission: "strike", path: [] }];
  if (grade >= 3) us.push({ id: "u2", name: "제2전단", x: 98, y: 80, ships: [ship("ddh", "충무공이순신함"), ship("ffg", "경기함"), ship("pkg", "윤영하함")], mission: "hold", path: [] });
  if (grade >= 6) us.push({ id: "u3", name: "제3전단", x: 116, y: 62, ships: [ship("ddh", "왕건함"), ship("ffg", "서울함")], mission: "scout", path: [] });
  let foe;
  if (sk === "fog") {
    us = [{ id: "u1", name: "제1전단", x: 112, y: 64, ships: [ship("ddh", "충무공이순신함"), ship("ffg", "대구함")], mission: "hold", path: [] },
      { id: "u2", name: "제2전단", x: 100, y: 82, ships: [ship("ffg", "경기함"), ship("pkg", "윤영하함"), ship("pkg", "한상국함")], mission: "hold", path: [] },
      { id: "u3", name: "고속함 전대", x: 118, y: 78, ships: [ship("pkg", "조천형함"), ship("pkg", "황도현함")], mission: "hold", path: [] }];
    const grp = (t, n, k) => Array.from({ length: n }, (_, i) => ship(t, `${k} ${i + 1}호`)), G = GOAL;
    foe = [{ id: "f1", name: "적 고속 1제대", ...wet({ x: 50, y: 42 }), ships: grp("foeFAST", 3, "물살 1제대"), spdK: 1.3 },
      { id: "f2", name: "적 미사일정 1제대", ...wet({ x: 30, y: 72 }), ships: grp("foeMSL", 2, "해칼 1제대"), delay: 120 },
      { id: "f3", name: "적 고속 2제대", ...wet({ x: 74, y: 32 }), ships: grp("foeFAST", 3, "물살 2제대"), delay: 360, spdK: 1.3 },
      { id: "f4", name: "적 미사일정 2제대", ...wet({ x: 24, y: 86 }), ships: grp("foeMSL", 2, "해칼 2제대"), delay: 480 }];
    for (const f of foe) { f.seen = false; f.path = route(f, { x: G.x, y: G.y }); }
  } else if (sk === "night") {
    const fac = (n, k) => Array.from({ length: n }, (_, i) => ship("foeFAC", `${k} ${i + 1}호정`));
    foe = [{ id: "f1", name: "적 고속 1편대", x: 26, y: 12, ships: fac(3, "1편대"), path: [{ x: 34, y: 30 }, { x: 55, y: 44 }, { x: GOAL.x, y: GOAL.y }], seen: false, spdK: 1.25 },
      { id: "f2", name: "적 고속 2편대", x: 88, y: 26, ships: fac(2, "2편대"), path: [{ x: 90, y: 36 }, { x: GOAL.x + 5, y: GOAL.y - 1 }], seen: false, delay: 300, spdK: 1.25 },
      { id: "f3", name: "적 고속 3편대", x: 6, y: 44, ships: fac(3, "3편대"), path: [{ x: 30, y: 52 }, { x: 55, y: 50 }, { x: GOAL.x, y: GOAL.y }], seen: false, delay: 360, spdK: 1.25 }]; /* 2·3편대 거의 동시 협공 */
    if (grade <= 2) foe.pop(); /* 입문: 3편대 없음 */
    if (grade >= 4) foe.push({ id: "f4", name: "적 고속 4편대", x: 58, y: 14, ships: fac(2, "4편대"), path: [{ x: 62, y: 30 }, { x: GOAL.x, y: GOAL.y }], seen: false, delay: 720, spdK: 1.25 });
  } else if (sk === "airsup" || sk === "baeng") {
    foe = [];
  } else if (sk === "sead") {
    const site = (id, n, x, y) => ({ id, name: n, x, y, ships: [ship("foeSAM", n)], path: [], seen: true, everSeen: true, site: true, noGoal: true, spdK: 0 });
    foe = [site("s1", "지대공 포대 1 (철벽형)", 40, 14), site("s2", "지대공 포대 2 (철벽형)", 58, 12), site("s3", "지대공 포대 3 (철벽형)", 74, 18),
      { id: "w1", name: "방공함 1 (파도형)", ...wet({ x: 50, y: 30 }), ships: [ship("foeAAW", "파도 1호")], path: [], seen: true, everSeen: true, noGoal: true, spdK: 0, aaw: true },
      { id: "w2", name: "방공함 2 (파도형)", ...wet({ x: 70, y: 32 }), ships: [ship("foeAAW", "파도 2호")], path: [], seen: true, everSeen: true, noGoal: true, spdK: 0, aaw: true }];
  } else {
    foe = [
      { id: "f1", name: "적 제1전단", x: 22, y: 12, ships: [ship("foeDD", "최현"), ship("foeFF", "적 호위함 1")], path: [{ x: 30, y: 30 }, { x: 55, y: 44 }, { x: GOAL.x, y: GOAL.y }], seen: false },
      { id: "f2", name: "적 제2전단", x: 88, y: 26, ships: [ship("foeFF", "적 호위함 2"), ship("foeFAC", "적 유도탄정 1"), ship("foeFAC", "적 유도탄정 2")], path: [{ x: 90, y: 36 }, { x: GOAL.x + 5, y: GOAL.y - 1 }], seen: false, delay: 480 },
    ];
    if (grade >= 4) foe.push({ id: "f3", name: "적 제3전단", x: 5, y: 40, ships: [ship("foeDD", "강건"), ship("foeFF", "적 호위함 3")], path: [{ x: 30, y: 50 }, { x: 55, y: 50 }, { x: GOAL.x, y: GOAL.y }], seen: false, delay: 300 });
    if (sk === "convoy") for (const f of foe) { f.hunt = true; if (f.delay) f.delay = Math.round(f.delay * 0.8); }
  }
  for (const g of [...us, ...foe]) { g.side = us.includes(g) ? "us" : "foe"; g.fireT = 30; g.home = { x: g.x, y: g.y }; if (g.side === "us") Object.assign(g, ORD0); }
  return { us, foe };
}
function mkConvoy() {
  const g = { id: "cv", name: "수송 선단", civ: true, ...ORD0, radar: false, roe: "hold", x: CONVOY_FROM.x, y: CONVOY_FROM.y, ships: [ship("civ", "보급선 한빛호"), ship("civ", "여객선 서해누리호"), ship("civ", "유류선 강화호")], mission: "hold", path: [], side: "us", fireT: 30 };
  g.home = { x: g.x, y: g.y }; g.path = route(g, YEONPYEONG); return g;
}

/** ctx: { grade, branch, ops (작전 병과: +2 support points, specific staff advice), mods: {outK, inK, icptK}, onDone(res) } */
export function openOpMap(ctx) {
  const isAir = !!ctx.air;
  Object.assign(S, { on: true, ctx, isAir, layers: { det: false, rng: false, path: false }, hist: {}, drag: null, hover: null, t: 0, run: false, speed: 1, paused: false, log: [], evt: null, evtDone: {} });
  setupScen(ctx.scen || "intercept"); S.phase = ctx.scen ? "plan" : "pick";
  fmBuild(); S.brief = false;
  let last = performance.now();
  const loop = (now) => { if (!S.on) return; const dt = Math.min(0.1, (now - last) / 1000); last = now; if (S.phase === "run" && !S.paused && !S.evt && !S.fm.hl && !S.fm.half) for (let k = 0; k < (S.fm.ff ? 24 : S.speed); k++) { step(dt * 30); if (S.fm.hl || S.fm.half || S.evt || S.phase !== "run") break; } draw(); fmPanel(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
/** build forces for a scenario (작전 선택 → 전술판) */
function setupScen(sk) {
  const sc = SCEN[sk] || SCEN.intercept, isAir = S.isAir; GOAL = sc.goal || GOAL0;
  const F = forces(S.ctx.grade, sk), C = camp(), notes = [], MF = (S.mf = minFx());
  if (isAir) { const g = { id: "u1", name: "초계전단", x: sk === "sead" ? 118 : 104, y: sk === "sead" ? 80 : 66, ships: [ship("ddh", "문무대왕함"), ship("ffg", "대구함"), ship("pkg", "윤영하함")], mission: "hold", path: ["sead", "baeng", "airsup"].includes(sk) ? [] : [{ x: 95, y: 62 }, { x: 70, y: 50 }], side: "us", fireT: 30, ...ORD0 }; g.home = { x: g.x, y: g.y }; F.us = [g]; }
  /* 작전 간 누적: 수리 중인 함정은 하위 함정으로 대체, 신뢰도가 낮으면 핵심 자산 배정 제한 */
  const SUB = { aegis: "ddh", ddh: "ffg", ffg: "pkg", pkg: "pkg" }, lowT = C.trust <= 30 && S.ctx.grade >= 3 && !MF.aegisOk; /* 신뢰도 페널티는 계급 3부터 (수상함 사업 LV1이면 해제) */
  for (const g of F.us) g.ships = g.ships.map((x) => { const rp = C.ships[x.name]?.rep || 0, low = lowT && x.t === "aegis";
    if (!rp && !low) return x; const t2 = SUB[x.t], y = ship(t2, `${x.name.replace(/함$/, "")} 대체 ${SHIP_T[t2].n}`); y.subFor = x.name; notes.push(low ? `${x.name} 배정 제한(신뢰도 낮음) → ${SHIP_T[t2].n}` : `${x.name} 수리 중 → ${SHIP_T[t2].n} 대체`); return y; });
  const FT = (id, nm) => air(id, "fighter", nm);
  let A = isAir && sk === "sead" ? [FT("a1", "제1 전투비행대 (KF-21)"), FT("a2", "제2 전투비행대 (KF-21)"), FT("a3", "제3 전투비행대 (F-15K)"), FT("a4", "제4 전투비행대 (F-15K)"), FT("a5", "제5 전투비행대 (FA-50)"), air("a6", "tanker", "공중급유기 (KC-330)")]
    : isAir && sk === "baeng" ? [air("t1", "transport", "수송기 1호 (C-130H)"), air("t2", "transport", "수송기 2호 (C-130H)"), FT("a1", "제1 전투비행대 (KF-21)"), FT("a2", "제2 전투비행대 (KF-21)"), FT("a4", "제4 전투비행대 (FA-50)"), FT("a5", "제5 전투비행대 (FA-50)"), air("a6", "tanker", "공중급유기 (KC-330)")]
    : isAir ? (sk === "airsup" ? [air("a1", "fighter", "제1 전투비행대 (KF-21)"), air("a2", "fighter", "제2 전투비행대 (KF-21)"), air("a3", "fighter", "제3 전투비행대 (F-15K)"), air("a4", "fighter", "제4 전투비행대 (FA-50)"), air("a5", "fighter", "제5 전투비행대 (FA-50)"), air("a6", "tanker", "공중급유기 (KC-330)"), air("a8", "helo", "해상작전헬기 (MH-60R)")] : airForces(S.ctx.grade)) : [];
  if (isAir && sk === "intercept") for (const f of F.foe) if (f.id === "f1" || f.id === "f2") for (const x of f.ships) { x.sam += 6; x.sam0 += 6; } /* 단거리 방공 추가 */
  if (isAir && MF.seadUnit && sk !== "airsup") A.push(air("a7s", "fighter", "SEAD 편대 (KF-21)"));
  for (const u of A) { if (u.t === "fighter" && !/FA-50/.test(u.name)) { u.fmax = Math.round(fmax(u) * MF.airFuelK); u.fuel = u.fmax; }
    if (/FA-50/.test(u.name)) { u.fmax = 560; u.fuel = 560; u.asm = 2; } u.fat = C.pilots[short(u.name)] || 0; if (u.fat >= 80) { u.st = "rest"; notes.push(`${short(u.name)} 조종사 피로 ${u.fat} — 강제 휴식`); } }
  if (lowT && A.some((u) => u.t === "tanker")) { A = A.filter((u) => u.t !== "tanker"); notes.push("공중급유기 배정 제한(신뢰도 낮음)"); }
  const ck = S.ctx.foeCmd || sc.cmd || ["aggr", "caut", "decoy"][(Math.random() * 3) | 0];
  Object.assign(S, { scenK: sk, scen: sc, foeCmd: FOE_CMD[ck], foeCmdK: ck, air: A, raids: [], raidPlan: sk === "airsup" ? [[180, 4], [660, 6], [1140, 6]] : sk === "sead" ? [[360, 4], [840, 4]] : sk === "baeng" ? [[240, 3], [600, 5], [900, 4]] : RAIDS.map((t) => [t, 2]), drops: 0, airKills: 0, gap: 0, isleBat: null, airLost: 0, sorties: 0, us: F.us, foe: F.foe, t: 0, sel: isAir ? A[0] : F.us[0], phase: "plan",
    pts: isAir ? 0 : 6 + (S.ctx.ops ? 2 : 0), sup: [], place: null, msl: [], fx: [], log: [], evt: null, evtDone: {}, evade: 0, preempt: 0, reps: [], repShow: null,
    shots: 0, hits: 0, inside: {}, result: null, convoy: null, campD: { trust: 0, morale: 0 }, domPen: 0, campNotes: notes, trust0: C.trust });
  for (const u of S.air) if (u.t === "transport" && sk === "baeng") { u.fmax = 1900; u.fuel = 1900; }
  S.decoys = ["airsup", "sead", "baeng"].includes(sk) ? [] : [{ x: 40, y: 50, gone: false }]; if (ck === "decoy" && !["airsup", "sead", "baeng"].includes(sk)) S.decoys.push({ x: 60, y: 22, gone: false }, { x: 18, y: 62, gone: false }); S.decoy = S.decoys[0] || { gone: true, x: 0, y: 0 };
  if (sc.convoy) { S.convoy = mkConvoy(); S.us.push(S.convoy); }
  if (MF.asmK !== 1) for (const g of S.us) for (const x of g.ships) { x.asm = Math.round(x.asm * MF.asmK); }
  if (MF.on || MF.outK !== 1) notes.push(`국방부 보정 — 화력 ×${MF.outK.toFixed(2)} · 요격 ×${MF.icptK.toFixed(2)} · 탐지 ×${MF.detK.toFixed(2)}`);
  const cm = S.ctx.c72 && S.ctx.c72Mod?.step === 3 ? c72Mod(S.ctx.c72Mod) : null; S.c72fin = cm;
  if (cm === "easy" && S.foe.length > 1) { S.foe.pop(); notes.push("캠페인 전적 3승 — 적 1개 전단 감소 · 예비 +1"); }
  if (cm === "hard") { const f = { id: "f9", name: "적 증원 전단", x: 50, y: 10, ships: [ship("foeFF", "적 호위함 9"), ship("foeFAC", "적 유도탄정 9"), ship("foeFAC", "적 유도탄정 10")], path: [{ x: 56, y: 30 }, { x: GOAL.x, y: GOAL.y }], seen: false, delay: 600, side: "foe", fireT: 30 }; f.home = { x: f.x, y: f.y }; S.foe.push(f); notes.push("캠페인 전적 0~1승 — 적 증원 전단 추가 (10분)"); }
  for (const f of S.foe) { f.spdK = (f.spdK || 1) * S.foeCmd.spd; if (S.ctx.grade <= 2) for (const x of f.ships) { x.max = Math.round(x.max * 0.88); x.hp = Math.min(x.hp, x.max); } }
  if (S.ctx.grade <= 2) notes.push("입문 보정 — 적 재장전 +15초 · 적 내구 ×0.88");
  S.morLv = moraleLv(); S.moraleK = MOR_ICPT[S.morLv];
  fmInit(); BASE = null; if (C.trust >= 70) { S.fm.res = 4; notes.push("상부 신뢰도 70↑ — 예비 투입 4회"); } if (S.c72fin === "easy") S.fm.res++; S.fm.res += MF.resPlus; if (MF.seadUnit && S.air.some((u) => u.id === "a7s")) (S.fm.arm ??= {}).a7s = "sead"; S.fm.res0 = S.fm.res;
  say(`${sc.n} — 작전 전술을 정하십시오. 작전 개념, 역할 배치, 부대 지시를 정하고 '작전 개시'.`);
  for (const n of notes) say(`[현황] ${n}`, "bad");
}
export const opMapOn = () => S.on;
/** test hook: the live operation state */
export const opMapState = () => S;
export const opMapAir = { setAirPoint: (p) => setAirPoint(p), launch: (u) => launch(u), assign: (id, sid) => assignSector(id, secById(sid)), secOf: (p) => secOf(p) };
/** test hook: run the operation forward by game seconds without waiting for frames */
export function opMapAdvance(sec) { if (S.phase !== "run") return; for (let t = 0; t < sec && S.phase === "run"; t += 1) { if (S.evt) resolveEvent(S.evt.a[0]); if (S.fm.hl) { const H = S.fm.hl; S.fm.hl = null; if (H.dec) H.acts[Math.min(H.acts.length - 1, S.testPick ?? 0)]?.[1]?.(); } if (S.fm.half) S.fm.half = null; step(1); } S.dirty = true; }

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
const limitOf = () => S.scen?.limit || LIMIT;
const civ = (g) => !!g.civ;
const nightK = () => S.scen?.detK || 1;
function detR(g) { return (g.side === "us" ? (S.mf?.detK || 1) *  (g.radar === false ? (g.mission === "scout" ? 16 : 12) : g.mission === "scout" ? 52 : 36) : 30) * nightK(); }
/** 적이 아군 전단을 볼 수 있나: 레이더를 켜면 전파가 멀리서 잡힌다 (EMCON) */
function foeSees(f, u) { const d = d2(f, u) / (S.scen?.night ? 0.7 : S.scen?.fog ? (u.radar === false ? 0.6 : 1.35) : 1); return u.radar === false ? d < 15 || (u.firedAt != null && S.t - u.firedAt < 60 && d < 34) : d < 46; }
function seenFoe(f) { if (f.site || f.aaw) return true; if (on("reveal") && !(f.delay && S.t < f.delay)) return true; const k = (S.foeCmd?.stealth && !(f.firedAt != null && S.t - f.firedAt < 90) ? S.foeCmd.stealth : 1) * (S.scen?.night ? 0.8 : S.scen?.fog ? 0.6 : 1); if (S.us.some((u) => !civ(u) && alive(u).length && d2(u, f) < detR(u) * k)) return true; if (S.air?.some((u) => airborne(u) && AIR_T[u.t].det && d2(u, f) < AIR_T[u.t].det * k * (S.scen?.night ? 0.7 : 1) * (S.mf?.detK || 1))) return true; return S.sup.some((s) => s.k === "p3c" && d2(s, f) < 30 * k); }

// ── air (항공 작전) ──
const hasOrder = (u) => u.st !== "lost" && u.st !== "rest" && (u.sec ? true : u.job === "strike" ? !!u.tgt : u.job === "escort" ? !!u.follow : !!u.pt);
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
function launch(u) { if (u.st === "rest") return; const h = airHome(u); u.x = h.x; u.y = h.y; u.st = "out"; S.sorties++; u.flew = true; u.fat = (u.fat || 0) + Math.round((15 + (S.scen?.night || S.scen?.fog ? 10 : 0)) * (S.mf?.fatK || 1)); say(`${u.name} 출격.`, "hit"); }
function moveAir(u, p, dt) { const dx = p.x - u.x, dy = p.y - u.y, L = Math.hypot(dx, dy), s = Math.min(L, AIR_T[u.t].sp * dt * (u.t === "fighter" && on("ab") ? 1.35 : 1)); if (L > 0.01) { u.x += (dx / L) * s; u.y += (dy / L) * s; } return L < 1; }
function loseAir(u, why) { if (S.fm && u.t === "fighter" && !S.fm.trig.lost) S.fm.trig.lost = { u, x: u.x, y: u.y }; if (S.fm && u.t === "tanker") S.campD.trust -= 20; u.st = "lost"; S.airLost++; S.fx.push({ x: u.x, y: u.y, t: 0, c: "#ff6b5e", big: true }); say(`${u.name} ${why}`, "bad"); }
function histLab(u) { return u.st === "lost" ? "lost" : u.st === "ready" ? "" : u.st === "rearm" ? "rearm" : u.st === "rtb" ? "rtb" : u.job === "strike" ? "strike" : u.st === "out" ? "out" : u.job; }
function airStep(dt) {
  for (const u of S.air) {
    const T = AIR_T[u.t];
    { const H = (S.hist[u.id] ??= []), lab = histLab(u), L = H[H.length - 1]; if (!L || L.l !== lab) { if (L) L.t1 = S.t; H.push({ l: lab, t0: S.t, t1: null }); } }
    if (u.st === "lost" || u.st === "rest") continue;
    if (u.sec && u.st !== "rtb" && u.st !== "rearm" && !(u.job === "strike" && u.tgt && alive(u.tgt).length && !u.tgt.gone)) secJob(u);
    if (u.st === "rearm") { u.cd -= dt; if (u.cd <= 0) { u.st = "ready"; u.fuel = fmax(u); u.asm = armAsm(u); say(`${u.name} 재무장·급유 완료.`); if (S.fm && S.t > 400 && hasOrder(u)) S.fm.trig.ready ??= u; } continue; }
    if (u.st === "ready") { if (hasOrder(u) && !(u.holdTill > S.t) && (u.job !== "strike" || (u.tgt && alive(u.tgt).length && !u.tgt.gone))) launch(u); else { const h = airHome(u); u.x = h.x; u.y = h.y; } continue; }
    u.fuel -= dt * (u.t === "fighter" && on("ab") ? 2 : 1) * (on("low") ? 1.25 : 1) * (ARM[u.arm]?.fuel || 1);
    if (u.refuelTo > S.t) { u.fuel = Math.min(fmax(u), u.fuel + dt * 4); continue; } /* 공중급유 중: 전투 이탈 */
    const home = airHome(u);
    if (u.st !== "rtb" && u.fuel < d2(u, home) / T.sp + 40) { u.st = "rtb"; say(`${u.name} 연료 부족 — 귀환.`); }
    if (u.st === "rtb") { if (moveAir(u, home, dt)) { u.st = "rearm"; u.cd = T.re * (S.mf?.rearmK || 1); if (u.job === "strike") { u.tgt = null; if (!u.sec) u.pt = null; } if (u.job === "escort") { u.follow = null; u.job = "cap"; } say(`${u.name} 착륙 — 재무장 ${Math.round(T.re / 60 * 10) / 10}분.`); } continue; }
    if (u.job === "strike") {
      const f = u.tgt; if (!f || !alive(f).length || f.gone) { u.st = "rtb"; continue; }
      const rng = u.t === "helo" ? 10 : 15;
      if (d2(u, f) > rng) { moveAir(u, f, dt); continue; }
      if (u.asm > 0) {
        launch2({ x: u.x, y: u.y, name: u.name.split(" (")[0], side: "us", id: u.id, arm: u.arm }, f, u.asm, u.arm === "sead" ? "대레이더" : "공대함", 25, 12); S.shots += u.asm; say(`${u.name} 공대함 미사일 ${u.asm}발 발사 → ${f.name}`, "hit"); u.asm = 0;
        const sam = alive(f).reduce((a, s) => a + s.sam, 0), esc = S.air.some((e) => e.job === "escort" && e.follow === u && airborne(e) && d2(e, u) < 15);
        if (sam > 0 && Math.random() < (u.t === "helo" ? 0.15 : S.scenK === "intercept" && !on("low") && !on("jam") ? 0.15 : 0.07) * (esc ? 0.3 : 1) * (on("low") ? 0.7 : 1) * (on("jam") ? 0.7 : 1) * (on("sead") ? 0.6 : 1) * ((u.fat || 0) >= 50 ? 1.5 : 1)) { loseAir(u, "적 대공미사일에 피격 — 격추"); continue; }
      }
      u.st = "rtb"; continue;
    }
    if (u.job === "escort") { const o = u.follow; if (!o || !airborne(o)) { u.st = "rtb"; continue; } moveAir(u, { x: o.x + 2, y: o.y + 2 }, dt); u.st = "out"; continue; }
    if (!u.pt) { u.st = "rtb"; continue; }
    if (u.st === "out") { if (moveAir(u, u.pt, dt)) { u.st = "station"; say(`${u.name} ${u.job === "airlift" ? (S.scenK === "baeng" ? "백령 투하 구역 도착 — 저고도 감속 투하 개시(4분)" : "연평도 도착 — 하역 개시") : "임무 지점 도착"}.`); u.drop = 0; } continue; }
    if (u.job === "airlift" && S.scenK === "baeng") { const d0 = u.drop; u.drop += dt; const esc = S.air.some((e) => e.t === "fighter" && airborne(e) && d2(e, u) < 15);
      if (Math.floor(d0 / 30) !== Math.floor(u.drop / 30) && Math.random() < 0.08 * (esc ? 0.6 : 1) * (on("low") ? 0.7 : 1)) { loseAir(u, "투하 중 적 고속정 대공 사격에 격추"); continue; }
      if (u.drop >= 240) { u.dropped = true; S.drops++; u.pt = null; u.st = "rtb"; say(`${short(u.name)} 백령도 투하 완료 — 이탈`, "hit"); hl(`${short(u.name)} 투하 완료`, `백령도에 물자 투하 완료. 이제 안전하게 빠져나가야 합니다.`, [], "g", true); } continue; }
    if (u.job === "airlift") { u.drop += dt; if (u.drop >= 40) { S.isleBat = { x: YEONPYEONG.x, y: YEONPYEONG.y, cd: 10 }; say("연평도 해병 지대함 유도탄 반 전개 완료 — 사거리 28km.", "hit"); u.pt = null; u.sec = null; u.st = "rtb"; } continue; }
    const a = (S.t * 0.05 + u.id.charCodeAt(1)) % (Math.PI * 2); u.x = u.pt.x + Math.cos(a) * 2.5; u.y = u.pt.y + Math.sin(a) * 2.5;
  }
  if (S.isleBat) { const b = S.isleBat; b.cd -= dt; if (b.cd <= 0) { const t = nearest(b, S.foe.filter((f) => f.seen && !f.gone)); if (t && t.d < 28) { launch2({ x: b.x, y: b.y, name: "연평도 지대함", side: "us", id: "isle" }, t.g, 2, "지대함", 40); S.shots += 2; b.cd = 90; say("연평도 지대함 유도탄 2발 발사.", "hit"); } else b.cd = 10; } }
  tankerStep(dt); raidStep(dt); samStep(dt);
  if (S.scenK === "airsup" && S.t >= 170) { const capOn = S.air.some((u) => u.t === "fighter" && u.st === "station" && u.job === "cap" && !(u.busyTo > S.t) && !(u.refuelTo > S.t)); if (!capOn) { S.gap += dt; if (!S.gapWarn || S.t - S.gapWarn > 60) { S.gapWarn = S.t; say(`연평 상공 CAP 공백! (누적 ${fmtT(S.gap)} / 3:00)`, "bad"); } } }
}
const RAIDS = [480, 1080];
/** 지대공 포대·방공함: 사거리 안 아군기에 25초마다 SAM */
function samStep(dt) {
  for (const f of S.foe) { if (!(f.site || f.aaw) || !alive(f).length) continue; f.samT = (f.samT ?? 10) - dt; if (f.samT > 0) continue;
    const R = f.site ? 18 : 14, t = S.air.filter((u) => airborne(u) && d2(u, f) < R).sort((a, b) => d2(a, f) - d2(b, f))[0]; if (!t) { f.samT = 3; continue; }
    f.samT = 25; f.firedAt = S.t; const p = 0.2 * (on("sead") ? 0.6 : 1) * (on("jam") ? 0.7 : 1) * (on("low") ? 0.7 : 1) * (t.arm === "sead" ? 0.8 : 1);
    S.fx.push({ x: t.x, y: t.y, t: 0, c: "#ff6b5e", big: false }); if (Math.random() < p) loseAir(t, `${f.name} SAM에 격추`); else say(`${f.name} SAM 발사 — ${short(t.name)} 회피`, "bad"); }
}
/** KC-330: 반경 20 안에서 연료가 가장 적은 편대 하나씩만 급유 (2분) */
function tankerStep(dt) {
  for (const k of S.air) { if (k.t !== "tanker" || k.st !== "station") continue;
    if (k.cur && !(k.cur.refuelTo > S.t && k.cur.st !== "lost")) k.cur = null;
    if (!k.cur) { const c = S.air.filter((u) => u !== k && airborne(u) && u.st !== "rtb" && d2(u, k) < 20 && u.fuel / fmax(u) < 0.6).sort((a, b) => a.fuel / fmax(a) - b.fuel / fmax(b))[0]; if (c) { c.refuelTo = S.t + 120; k.cur = c; say(`${short(k.name)} → ${short(c.name)} 공중급유 시작 (2분)`); } } }
}
function raidStep(dt) {
  for (const [at, n] of S.raidPlan) if (S.t >= at && !S.raids.some((r) => r.at === at)) { const r = { at, n, n0: n, x: 40 + Math.random() * 60, y: -3, alive: true, cd: 0, runs: 0, nm: n > 2 ? `적 요격기 ${n}기 편대` : "적 전투기 편대 (2기)" }; S.raids.push(r);
    if (S.mf?.uav && r.n > 1) { r.n--; S.airKills++; say("무인 전투기 편대 — 적기 1기 자동 격추", "hit"); } say(`${r.nm} 남하 — 방공 레이더 포착!`, "bad"); hl(`${r.nm} 출현`, `${n}기가 남하합니다. ${S.air.some((u) => u.job === "cap" && airborne(u)) ? "CAP 편대가 요격에 나섭니다." : "<b>CAP이 없습니다</b> — 초계기·급유기가 위험합니다."}`, [["약한 기체 후퇴", () => shout("safe")], ["방공 강화", () => shout("capall")]], "y", true); }
  for (const r of S.raids) {
    if (!r.alive) continue; r.cd -= dt;
    const fs = S.air.filter((f) => f.t === "fighter" && airborne(f) && f.st !== "rtb" && !(f.refuelTo > S.t) && !(f.busyTo > S.t) && d2(f, r) < 25);
    if (fs.length && r.cd <= 0) { r.cd = 20;
      for (const f of fs) { if (!r.alive || r.n <= 0) break;
        const p = clamp((S.scenK === "airsup" ? 0.42 : 0.55) + (ARM[f.arm]?.kill || 0) + (on("ab") ? 0.15 : 0) + (fs.length > 1 ? 0.1 : 0) - fatK(f) - (on("rescue") ? 0.1 : 0), 0.2, 0.9);
        if (Math.random() < p) { const k = Math.min(r.n, Math.random() < (S.scenK === "airsup" ? 0.2 : 0.35) ? 2 : 1); r.n -= k; S.airKills += k; if (S.fm) { stOf(f.id).air += k; if (f.fuel / fmax(f) < 0.35) S.fm.trig.kill ??= f; } S.fx.push({ x: r.x, y: r.y, t: 0, c: "#7cc4ff", big: true }); say(`${short(f.name)} — 적기 ${k}기 격추 (남은 ${r.n}기)`, "hit"); }
        else if (Math.random() < 0.12 * (on("jam") ? 0.7 : 1) * ((f.fat || 0) >= 50 ? 1.4 : 1)) loseAir(f, "공중전에서 피격 — 격추");
        else say(`${short(f.name)} 요격 실패 — 적기 계속 남하`, "bad"); }
      if (r.n <= 0 || r.n <= Math.floor(r.n0 * 0.3)) { r.alive = false; say(r.n <= 0 ? `${r.nm} 전멸!` : `${r.nm} 잔존 ${r.n}기 퇴각`, "hit"); continue; }
    }
    const prey = S.air.filter((u) => airborne(u) && u.t !== "fighter").sort((a, b) => d2(a, r) - d2(b, r))[0];
    const tgt = prey && d2(prey, r) < 80 ? prey : nearest(r, S.us)?.g;
    if (!tgt) { r.y -= 0.45 * dt; if (r.y < -8) r.alive = false; continue; }
    if (fs.length) continue; /* 공중전 중: 전진 못 함 */
    const dx = tgt.x - r.x, dy = tgt.y - r.y, L = Math.hypot(dx, dy), sp = Math.min(L, 0.45 * dt); r.x += (dx / (L || 1)) * sp; r.y += (dy / (L || 1)) * sp;
    if (tgt.t && L < 3) { loseAir(tgt, "적 전투기에 격추"); if (++r.runs >= 2) r.alive = false; }
    else if (!tgt.t && L < 20) { const n = Math.min(6, r.n * 2); launch2({ x: r.x, y: r.y, name: "적 전투기", side: "foe" }, tgt, n, "적기 대함미사일", 35); say(`${r.nm} 대함미사일 ${n}발 발사 → ${tgt.name}`, "bad"); r.alive = false; }
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
  for (const f of S.foe) { const v = alive(f).length > 0 && !(f.delay && S.t < f.delay); const was = f.seen; /* not yet sailed: cannot be seen */ f.seen = v && seenFoe(f); if (f.seen && !was) { f.seenAt ??= S.t; say(`${f.name} 탐지 — ${alive(f).map((s) => s.n).join(", ")}`, "bad"); if (!f.everSeen) fmDetected(f); } if (f.seen) f.everSeen = true; }
  for (const dc of S.decoys) if (!dc.gone && (S.us.some((u) => !civ(u) && d2(u, dc) < detR(u) * 0.8) || S.sup.some((x) => x.k === "p3c" && d2(x, dc) < 26) || S.air.some((u) => airborne(u) && AIR_T[u.t].det && d2(u, dc) < AIR_T[u.t].det))) { dc.gone = true; say("미확인 접촉 확인 결과 — 기만체(허위 표적)로 판명.", "hit"); }
  for (const g of S.us) { if (!alive(g).length) continue; usMove(g, dt); }
  for (const f of S.foe) { if (!alive(f).length || (f.delay && S.t < f.delay)) continue; foeMove(f, dt); }
  if (S.isAir) airStep(dt);
  fmStep(dt);
  combat(dt); support(dt); missiles(dt); events(); judge();
}
function nearest(g, list) { let b = null, d = Infinity; for (const o of list) { if (!alive(o).length) continue; const dd = d2(g, o); if (dd < d) { d = dd; b = o; } } return b ? { g: b, d } : null; }
function usMove(g, dt) {
  if (civ(g)) { if (!g.arrived && g.path.length) { if (moveTo(g, g.path[0], dt, SPD * (g.slow ? 0.4 : 0.8))) g.path.shift(); } if (!g.arrived && d2(g, YEONPYEONG) < 3.5) { g.arrived = true; say(`${g.name} 연평도 도착!`, "hit"); hl(`${g.name} 연평도 도착`, `${alive(g).length}척이 연평도에 입항했습니다.`, [], "g", true); } return; }
  const ET = g.escortT && alive(g.escortT).length && !g.escortT.arrived ? g.escortT : S.convoy;
  if (g.escort && ET && alive(ET).length && !ET.arrived) { const t0 = nearest(g, S.foe.filter((f) => f.seen && !f.gone)); if (!(g.mission === "strike" && t0 && t0.d < 20)) { const c = ET, sp0 = SPDS[g.fuel > 0 ? g.spd || "eco" : "slow"]; if (d2(g, c) > 2.5) moveTo(g, { x: c.x + 1.5, y: c.y - 2 }, dt, SPD * sp0[1] * 1.1); return; } }
  const sp = SPDS[g.fuel > 0 ? g.spd || "eco" : "slow"], moving = g.path.length || g.mission !== "hold";
  if (g.fuel != null && moving) { g.fuel = Math.max(0, g.fuel - sp[2] * dt * (S.fm?.concept === "forward" ? 1.3 : 1)); if (g.fuel <= 0 && !g.dry) { g.dry = true; say(`${g.name} 연료 고갈 — 저속으로만 기동`, "bad"); } }
  const v = SPD * sp[1] * (S.evade > 0 ? 0.7 : 1), t = nearest(g, S.foe.filter((f) => f.seen && !f.gone));
  if (g.mission === "scout" && t && t.d < 26) { moveTo(g, g.home, dt, v); return; }
  if (g.mission === "strike" && t && t.d < (g.seek || 48)) { if (t.d > (g.close || 24)) moveTo(g, t.g, dt, v); return; }
  if (g.path.length) { if (moveTo(g, g.path[0], dt, v)) g.path.shift(); }
}
function foeMove(f, dt) {
  if (f.gone || f.site || f.aaw) return; const C = S.foeCmd || FOE_CMD.aggr, t = nearest(f, S.us.filter((u) => foeSees(f, u)));
  if (strength(f) < C.ret) { if (!f.retreat) { f.retreat = true; say(`${f.name} 퇴각 개시`, "hit"); hl(`${f.name} 퇴각!`, `전력이 ${Math.round(C.ret * 100)}% 아래로 떨어진 ${f.name}이(가) 북쪽으로 물러납니다 (${C.n} 지휘관). 남은 적 ${S.foe.filter((x) => alive(x).length && !x.gone && !x.retreat).length}개 전단.`, [], "g"); } if (moveTo(f, f.home, dt, SPD)) f.gone = true; return; }
  if (f.hunt && S.convoy && alive(S.convoy).length && !S.convoy.arrived) { if (t && t.g === S.convoy && t.d < 22) return; if (t && !civ(t.g) && t.d < C.hold - 4) return; if (!f.reT || S.t - f.reT > 30) { f.reT = S.t; f.path = route(f, S.convoy); } }
  else if (t && t.d < (alive(f).some((x) => x.asm > 0) ? C.hold : 3)) return; /* hold and shoot (gun boats close in) */
  if (f.path.length) { if (moveTo(f, f.path[0], dt, SPD * 0.9 * (f.spdK || 1))) f.path.shift(); }
}
/** one engagement report per salvo: launched → intercepted → hits → damage */
function mkRep(w, fromName, side, to, n, key) { const r = { w, from: fromName, key, side, to: to.name, toG: to, n, icpt: 0, hit: 0, dmg: [], left: n, t: S.t }; (S.reps ??= []).push(r); return r; }
function launch2(from, to, n, w, T = 40, rng = null) {
  const r = mkRep(w, from.name, from.side, to, n, from.id || from.ref?.id || from.key), d = rng ?? d2(from, to); if (S.fm) S.fm.fs[from.side].n += n; if (from.arm) r.arm = from.arm;
  if (S.fm && from.side === "foe" && n >= 4 && S.t > 240 && to.side === "us" && !S.fm.decDone.chaff && !S.fm.trig.salvo) S.fm.trig.salvo = { to };
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
    if (a.side === "us" && (civ(a) || a.roe === "hold" || S.fm?.shout.aaw || a.fmRes || a.fmOut > S.t || on("hold") || (on("dry") && !on("dry0")))) { a.fireT = 5; continue; }
    const pool0 = a.side === "us" ? S.foe.filter((f) => f.seen && !f.gone) : S.us.filter((u) => foeSees(a, u)), bait = a.side === "foe" && (a.hunt && pool0.find((u) => civ(u) && alive(u).length && d2(a, u) < 30) || pool0.find((u) => u.bait && alive(u).length && d2(a, u) < 30)), pool = bait ? [bait] : pool0, t = nearest(a, pool), rng = (a.side === "us" && a.roe === "tight" ? 18 : 30) * (a.side === "us" ? S.mf?.rngK || 1 : 1);
    if (t && t.d < rng) { salvo(a, t.g); if (a.side === "foe") a.firedAt = S.t; a.fireT = a.side === "foe" ? (S.scen?.reload || 75) + (S.ctx.grade <= 2 ? 15 : 0) : (on("burst") ? 45 : 75) * (S.mf?.reloadK || 1); } else a.fireT = 5;
  }
}
function missiles(dt) {
  for (let i = S.msl.length - 1; i >= 0; i--) {
    const m = S.msl[i]; m.t += dt; const k = Math.min(1, dt / Math.max(1, m.T - m.t + dt)); m.x += (m.to.x - m.x) * k; m.y += (m.to.y - m.y) * k;
    if (m.t < m.T) continue; S.msl.splice(i, 1);
    const tgt = m.to, live = alive(tgt), R = m.rep; if (R) R.left--; if (!live.length) { repDone(R); continue; }
    const esc = tgt.civ ? S.us.filter((g) => !civ(g) && alive(g).length && d2(g, tgt) < 11) : null, sam = esc ? esc.reduce((a, g) => a + alive(g).reduce((b, x) => b + x.sam, 0), 0) * 0.9 : live.reduce((a, s) => a + s.sam, 0), capOn = tgt.side === "us" && (S.sup.some((s) => s.k === "cap" && d2(s, tgt) < 15) || S.air.some((u) => u.job === "cap" && u.st === "station" && d2(u, tgt) < 20));
    let p = clamp(0.25 + sam / (live.length * 60) - (tgt.side === "foe" && S.morLv === 2 ? 0.05 : 0), 0.1, 0.78) * (tgt.side === "us" ? (S.ctx.mods.icptK || 1) * (capOn ? 1.2 : 1) * (S.moraleK || 1) : 1)
      * (m.sz ? clamp(1.15 - 0.06 * Math.max(1, m.sz - (tgt.side === "us" ? S.mf?.satK || 0 : 0)), 0.6, 1.1) : 1) /* saturation: big salvos overwhelm the defence */ * (m.rng == null ? 1 : m.rng > 22 ? 1.15 : m.rng < 18 ? 0.8 : 1) /* long shots give time to react */
      * (tgt.side === "us" && S.fm ? (on("icptA") ? 1.35 : 1) * (on("icptB") ? 0.8 : 1) * (on("icptC") ? 1.2 : 1) * (on("lag") && !on("lag0") ? 0.83 : 1) * (on("jam") ? 1.25 : 1) * (on("allin") ? 0.8 : 1) * (S.scen?.night && tgt.radar ? 0.85 : 1) : 1)
      * (S.fm ? (tgt.side === "us" ? (S.fm.concept === "deep" ? 1.15 : 1) * (S.fm.shout.aaw ? 1.2 : 1) : (S.fm.concept === "forward" ? 0.85 : 1) * (S.fm.concept === "decoy" && S.us.find((g) => g.id === R?.key)?.fmRole === "strike" ? 0.75 : 1)) : 1);
    if (sam > 0) { const sh = esc ? esc.flatMap((g) => alive(g)).find((s) => s.sam > 0) : live.find((s) => s.sam > 0); if (sh) sh.sam = Math.max(0, sh.sam - 2); } else p = tgt.civ ? 0.04 : 0;
    if (Math.random() < clamp(p, 0, 0.9) || (tgt.side === "us" && S.mf?.icpt2 && sam > 0 && Math.random() < 0.3)) { S.fx.push({ x: tgt.x, y: tgt.y, t: 0, c: "#7cc4ff" }); if (R) { R.icpt++; repDone(R); } if (S.fm) { S.fm.fs[m.side].icpt++; if (tgt.side === "us") stOf(tgt.id).icpt++; } continue; }
    const s = live[(Math.random() * live.length) | 0], dmg = 34 * (m.side === "us" ? (S.ctx.mods.outK || 1) * (on("allin") ? 1.25 : 1) * (m.from?.fireUp > S.t ? 1.1 : 1) * (m.rep?.arm === "sead" ? 0.7 : 1) * (m.rep?.arm === "a2s" ? S.mf?.a2sK || 1 : 1) : (S.ctx.mods.inK || 1) * (S.evade > 0 ? 0.7 : 1) * (tgt.evadeTo > S.t ? 0.7 : 1) * (on("allin") ? 1.25 : 1) * (S.scen?.night && m.from?.seenAt != null && S.t - m.from.seenAt > 110 ? 1.2 : 1) * (tgt.exposedTo > S.t ? 1.15 : 1));
    s.hp = Math.max(0, s.hp - dmg); if (m.side === "us") S.hits++;
    if (s.hp <= 0 && tgt.side === "us" && S.mf?.saveSunk && !S.savedOnce && !tgt.civ) { S.savedOnce = true; s.hp = Math.max(1, Math.round(s.max * 0.15)); say(`현장 즉시 수리 — ${s.name} 침몰 직전 복구 (작전당 1회)`, "hit"); }
    if (m.rep?.arm === "sead" && S.fm && (s.sam0 > 0 || s.t === "foeSAM")) { if (!on("sead")) say("방공제압 성공 — 3분간 적 방공 효과 −40%", "hit"); S.fm.fx.sead = S.t + 180; }
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
function events() { if (S.fm) return; for (const e of S.isAir ? AIR_EVENTS : EVENTS) if (!S.evtDone[e.id] && S.t >= e.at) { S.evtDone[e.id] = true; S.evt = e; S.dirty = true; return; } }
function resolveEvent(k) {
  const e = S.evt; if (!e) return; S.evt = null;
  if (k === "reserve") { if (S.pts >= 1) { S.pts--; const g = { id: "u9", name: "예비 고속정 편대", ...ORD0, x: 110, y: 72, ships: [ship("pkg", "고속함 1"), ship("pkg", "고속함 2")], mission: "strike", path: [], side: "us", fireT: 30 }; g.home = { x: g.x, y: g.y }; S.us.push(g); say("예비 고속정 편대 합류.", "hit"); } else say("지원 포인트가 없어 투입하지 못했습니다.", "bad"); }
  if (k === "scramble") { const u = air("a9", "fighter", "비상대기 편대 (FA-50)"); u.asm = 2; u.sec = "s2"; S.air.push(u); secJob(u); launch(u); }
  if (k === "evade") { S.evade = 300; say("전 전단 회피 기동.", "hit"); }
  if (k === "preempt") { S.preempt = 2; say("선제 타격 준비 — 다음 사격 증강.", "hit"); }
}
function judge() {
  if (S.phase !== "run") return;
  const sk = S.scenK, kills = S.foe.flatMap((f) => f.ships).filter((x) => x.hp <= 0).length, lostShips = S.us.filter((g) => !civ(g)).flatMap((g) => g.ships).filter((x) => x.hp <= 0);
  if (sk === "airsup") { if (S.gap > 180) return finish(false, `연평 상공 CAP 공백 ${fmtT(S.gap)} — 제공권 상실`); if (S.airLost >= 4) return finish(false, `아군기 ${S.airLost}기 손실 — 제공권 상실`);
    if (S.airKills >= 10 && S.raids.length === S.raidPlan.length && S.raids.every((r) => !r.alive)) return finish(true, `적기 ${S.airKills}기 격추 — 제공권 확보`);
    if (S.t >= limitOf()) return S.airKills >= 10 ? finish(true, `적기 ${S.airKills}기 격추 — 25분 제공권 유지`) : finish(false, `격추 ${S.airKills}기 — 목표(10기) 미달`); return; }
  if (sk === "sead") { const sd = S.foe.filter((f) => f.site && !alive(f).length).length, wd = S.foe.filter((f) => f.aaw && !alive(f).length).length;
    if (S.airLost >= 4) return finish(false, `아군기 ${S.airLost}기 손실 — 방공망 제압 실패`); if (sd >= 2 && wd >= 1) return finish(true, `지대공 포대 ${sd}기·방공함 ${wd}척 격파 — 방공망 제압 성공`);
    if (S.t >= limitOf()) return finish(false, `시간 종료 — 포대 ${sd}기·방공함 ${wd}척 격파, 목표 미달`); return; }
  if (sk === "baeng") { const tr = S.air.filter((u) => u.t === "transport"), ok = tr.filter((u) => u.dropped && u.st !== "lost" && (u.st === "rearm" || u.st === "ready" || d2(u, GOAL) > 35)).length, pend = tr.filter((u) => u.st !== "lost" && !(u.dropped && (u.st === "rearm" || u.st === "ready" || d2(u, GOAL) > 35))).length; S.baengOk = ok;
    if (tr.every((u) => u.st === "lost")) return finish(false, "수송기 2대 모두 격추 — 보급 실패"); if (ok >= 1 && !pend) return finish(true, `수송기 ${ok}대 투하·이탈 성공 — 백령 보급 완료`);
    if (S.t >= limitOf()) return ok ? finish(true, `수송기 ${ok}대 투하 성공 — 시간 종료`) : finish(false, "시간 종료 — 투하 실패"); return; }
  const civs = S.us.filter(civ);
  if (civs.length) { const live = civs.reduce((a, g) => a + alive(g).length, 0), arr = civs.filter((g) => g.arrived).reduce((a, g) => a + alive(g).length, 0);
    if (live < 2) return finish(false, "수송 선단 2척 이상 침몰 — 호위 실패"); if (arr >= 2) return finish(true, `수송 선단 ${arr}척 연평도 도착 — 호위 성공`); }
  else for (const f of S.foe) { if (!alive(f).length || f.gone || f.noGoal) continue; const inG = d2(f, GOAL) < GOAL.r; S.inside[f.id] = inG ? (S.inside[f.id] || 0) + 1 : 0; if (S.inside[f.id] > 4) return finish(false, `${f.name} ${GOAL.n} 돌파 — 차단 실패`); }
  if (sk === "fog") { if (lostShips.length >= 3) return finish(false, `아군 함정 ${lostShips.length}척 침몰 — 기습 저지 실패`);
    if (kills >= 6 && !lostShips.some((x) => x.t === "ddh" || x.t === "ffg")) return finish(true, `적 ${kills}척 격파 — 해무 속 기습 저지`); }
  if (!S.isAir && !S.us.some((g) => !civ(g) && alive(g).length)) return finish(false, "아군 전단 전멸"); /* 항공 작전: 함정이 전멸해도 항공으로 막으면 계속 */
  if (!civs.length && S.foe.every((f) => !alive(f).length || f.gone)) return sk === "fog" && kills < 6 ? finish(false, `적 퇴각 — 격파 ${kills}척으로 목표(6척) 미달`) : finish(true, `적 ${S.scen?.night ? "고속 편대" : "전단"} 격멸·퇴각 — ${S.scen?.night ? "침투 저지" : "해상 차단"} 성공`);
  if (S.t >= limitOf()) return civs.length ? finish(false, "작전 시간 종료 — 선단 미도착") : sk === "fog" ? finish(false, kills >= 6 ? `작전 시간 종료 — 주력함 손실로 목표 미달 (격파 ${kills}척)` : `작전 시간 종료 — 격파 ${kills}척, 목표(6척) 미달`) : finish(true, `작전 시간 종료 — ${GOAL.n} 방어 성공`);
}
function finish(won, why) {
  S.phase = "end"; S.paused = false;
  const all = S.us.flatMap((g) => g.ships), foes = S.foe.flatMap((f) => f.ships);
  const r = { won, why, secs: Math.max(1, Math.round(S.t)), shots: Math.min(5000, S.shots), hits: Math.min(S.hits, S.shots, 5000), hp: all.reduce((a, s) => a + s.hp, 0) / all.reduce((a, s) => a + s.max, 0), sunk: foes.filter((s) => s.hp <= 0).length, foes: foes.length, lost: all.filter((s) => s.hp <= 0).length + (S.airLost || 0), allies: all.length + (S.air?.length || 0), jetsOut: S.isAir ? S.sorties : S.sup.some((s) => s.k === "cap") ? 2 : 0, airLost: S.airLost || 0, sorties: S.sorties || 0 };
  r.stars = won ? 1 + (r.lost === 0 ? 1 : 0) + (S.foe.every((f) => !alive(f).length || f.gone) ? 1 : 0) : 0; S.result = r;
  if (S.ctx.c72 && S.fm) { const c = c72(); if (c.step < 4) { c.res.push({ scen: S.scenK, air: S.isAir, won, stars: r.stars || (won ? 1 : 0) }); c.step++; saveC72(c); } r.c72 = { step: c.step, wins: c.res.filter((x) => x.won).length, done: c.step >= 4, next: c72Next(c).map(([k, air]) => `${SCEN[k].n}${air ? "(항공)" : ""}`).join(" 또는 ") }; if (r.c72.done) r.c72bonus = r.c72.wins * 3; }
  if (S.scenK === "baeng" && won) r.stars = S.baengOk >= 2 ? 3 : Math.min(2, r.stars);
  if (S.fm) { if (won && S.fm.allIn) { r.stars = Math.min(3, r.stars + 1); S.campD.trust += 10; } campUpdate(r); }
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
  air: [["recon", "정찰", "초계기·헬기 — 적을 찾습니다"], ["cap", "방공(CAP)", "전투기 — 연평 상공에서 적기 요격"], ["cap2", "CAP 2교대", "1차 CAP이 귀환하면 이어서 출격 — 공백 방지"], ["escort", "수송기 호위", "수송기 옆에 붙어 적기를 막음 (백령 보급)"], ["strike", "타격대", "전투기·헬기 — 탐지된 적을 자동으로 타격"], ["tanker", "급유", "급유기 — 체공시간 연장"], ["airlift", "공수", "수송기 — 연평도에 지대함 유도탄 반"], ["reserve", "예비", "작전 중 '예비 투입'으로 출격"]],
};
const slotsOf = () => SLOTS[S.isAir ? "air" : "sea"].filter((x) => (x[0] !== "escort" || S.scenK === "baeng") && (!S.isAir || x[0] === "reserve" || fmCards().some((c) => c.ok.includes(x[0])))).map((x) => (S.convoy && x[0] === "main" ? ["main", "선단 호위", "수송 선단 옆에서 함께 이동하며 대공 방어 — 주력을 두십시오"] : x));
const SHOUTS = {
  sea: [["attack", "➤ 공세 전환", "모든 전단 전진 · 먼저 다가가 사격"], ["defend", "⛨ 방어 유지", "연평 해역으로 집결"], ["retreat", "↩ 전면 후퇴", "손실 최소화 · 해역 일부 포기"], ["emcon", "📡 전파 차단", "은밀 · 탐지 ↓ (다시 누르면 해제)"], ["sat", "🎯 포화 사격", "일제사격 8발 · 탄 소모 ↑"], ["aaw", "🛡 대공 집중", "요격 +20% · 대함 사격 중지 (토글)"]],
  air: [["attack", "➤ 총공격", "대기 중인 전투기 전부 즉시 타격"], ["capall", "🛡 방공 강화", "대기 전투기 전부 연평 CAP"], ["ab", "🔥 애프터버너 요격", "3분간 속도 +35%·요격 +15% · 연료 소모 ×2"], ["low", "⤵ 저고도 침투", "3분간 SAM 피격 −30% · 연료 +25%"], ["hot", "⚡ 긴급 재출격", "재무장 시간 절반 · 피로 +20 · 15% 기체 이상"], ["tank", "⛽ 긴급 공중급유", "연료 가장 적은 편대 체공 +8분 · 2분 전투 이탈"], ["safe", "↩ 약한 기체 후퇴", "초계기·급유기·수송기 귀환"]],
};
const RESERVES = {
  sea: [["resgrp", "예비 전단", "예비 칸의 전단이 연평으로 출동"], ["pkg", "예비 고속정 편대", "고속함 2척 합류"], ["fa50", "비상대기 FA-50", "연평 상공 CAP"], ["battery", "해안 지대함 포대", "강화도 포대 사격 개시"]],
  air: [["resair", "예비 편대", "예비 칸의 편대가 출격"], ["kf21", "비상대기 KF-21 스크램블", "공대공 2기 즉시 투입 (체공 8분)"], ["jam", "전자전 재밍 지원", "3분간 적 SAM·적기 명중 −30%"], ["cruise", "장거리 순항미사일", "탐지된 적 1개 전단 정밀 타격 4발"]],
};
const INS = [["roe", "교전규칙", [["tight", "근접 사격"], ["free", "자유 사격"]], { tight: `${KMU(18)}km 안에서만 — 명중 ↑, 적이 먼저 쏠 수 있음`, free: `최대 ${KMU(30)}km — 먼저 쏘지만 요격당하기 쉬움` }],
  ["radar", "레이더", [["on", "켜기"], ["off", "전파 차단"], ["strike", "타격 직전만"]], { on: "멀리 보지만 적도 아군을 멀리서 봄", off: "숨지만 근시 — 정찰 수단 필요", strike: "평소엔 끄고 적이 가까우면 켬" }],
  ["salvo", "일제사격", [[2, "절약 2"], [4, "균형 4"], [8, "포화 8"]], { 2: "아껴 쏨 — 대부분 요격될 수 있음", 4: "균형", 8: "적 대공 포화 — 명중 ↑ · 탄 빨리 소진" }],
  ["tempo", "템포", [["slow", "신중"], ["norm", "보통"], ["aggr", "공세"]], { slow: "타격대가 멀리서만 교전, 추격 안 함", norm: "보통", aggr: "타격대가 바짝 다가가 사격 — 피격 ↑" }],
  ["loss", "손실 허용", [["low", "낮음"], ["norm", "보통"], ["high", "높음"]], { low: "전력 40% 아래 전단은 스스로 물러남", norm: "전력 25% 아래면 물러남", high: "끝까지 싸움" }]];
const RULES = [["sat", "적 대공 '강' 표적이면", "포화 8발"], ["weak", "적 전투기 출현 시", "약한 기체 자동 후퇴"], ["ammo", "미사일 30% 이하", "방어로 전환"]];

function fmInit() {
  S.fm = { concept: "deep", roles: {}, ins: { roe: "free", radar: "on", salvo: 4, tempo: "norm", loss: "norm" }, rules: { sat: true, weak: true, ammo: true }, tab: "tac", pick: null, res: 3, resUsed: [], hl: null, hlQ: [], lastHl: -999, half: false, halfDone: false, ff: false, st: {}, fs: { us: { n: 0, icpt: 0, hit: 0 }, foe: { n: 0, icpt: 0, hit: 0 } }, firstKill: null, shout: {}, view: "", fx: {}, trig: {}, timers: [], decDone: {}, lastDec: -999, coastAt: 600 + Math.random() * 360, fishAt: 330 + Math.random() * 240 };
  fmDefault();
}
const fmCards = () => S.isAir ? S.air.map((u) => ({ id: u.id, n: short(u.name), sub: `${u.name.match(/\((.*)\)/)?.[1] || u.n}${u.fat ? ` · 피로 ${u.fat}` : ""}${u.st === "rest" ? " · 휴식" : ""}`, ic: AIR_IC[u.t], rest: u.st === "rest", arm: u.t === "fighter" ? armOf(u) : null, ok: { fighter: ["cap", "cap2", "strike", "escort", "reserve"], mpa: ["recon"], helo: ["recon", "strike"], tanker: ["tanker"], transport: ["airlift"] }[u.t] }))
  : [...S.us.filter((g) => !civ(g)).map((g) => ({ id: g.id, n: g.name, sub: g.ships.map((x) => x.name).join(" · "), st: [["함정", g.ships.length + "척"], ["대함", g.ships.reduce((a, x) => a + x.asm0, 0) + "발"], ["대공", g.ships.reduce((a, x) => a + x.sam0, 0)]], ic: "■", ok: ["front", "main", "strike", "reserve"] })), { id: "p3c", n: "P-3C 해상초계기", sub: `정찰 ${KMU(30)}km`, ic: "◎", ok: ["front"] }, { id: "cap", n: "공군 CAP", sub: "KF-16 편대 · 요격 +20%", ic: "✈", ok: ["cap"] }];
function fmDefault() {
  const R = (S.fm.roles = {}), put = (slot, id) => { if (id) (R[slot] ??= []).push(id); };
  if (S.isAir) { const sup = S.scenK === "airsup"; for (const u of S.air) { if (u.st === "rest") continue; put(u.t === "mpa" ? "recon" : u.t === "helo" ? "recon" : u.t === "tanker" ? "tanker" : u.t === "transport" ? "airlift" : sup ? ({ a1: "cap", a3: "cap", a2: "cap2", a4: "cap2", a5: "reserve" }[u.id] || "cap") : S.scenK === "sead" ? ({ a1: "cap", a2: "cap2", a3: "strike", a4: "strike", a5: "strike" }[u.id] || "cap") : S.scenK === "baeng" ? ({ a1: "escort", a2: "escort", a4: "cap", a5: "cap2" }[u.id] || "cap") : u.id === "a1" ? "cap" : u.id === "a7" ? "reserve" : "strike", u.id); } return; }
  const G = S.us.filter((g) => !civ(g)); put("main", "u1"); if (G[1]) put("strike", "u2"); if (G[2]) put("front", "u3"); put("front", "p3c"); put("cap", "cap");
}
const roleOf = (id) => Object.keys(S.fm.roles).find((k) => S.fm.roles[k].includes(id));
function fmAssign(id, slot) {
  const c = fmCards().find((x) => x.id === id); if (!c) return;
  if (c.rest) { S.fm.flash = `${c.n} — 조종사 휴식 중 (피로 80↑)`; return; }
  if (!c.ok.includes(slot)) { say(`${c.n}은(는) '${(slotsOf().find((s) => s[0] === slot) || [])[1]}' 역할을 맡을 수 없습니다.`, "bad"); S.fm.flash = `${c.n} → 이 역할 불가`; return; }
  for (const k of Object.keys(S.fm.roles)) S.fm.roles[k] = S.fm.roles[k].filter((x) => x !== id);
  (S.fm.roles[slot] ??= []).push(id); S.fm.pick = null; S.fm.flash = null; S.dirty = true;
}
function slotPos(slot) {
  const P = SLOTP[S.fm.concept];
  if (S.convoy && slot === "main" && S.phase !== "run") return { x: S.convoy.x - 4, y: S.convoy.y - 3 };
  if (!S.isAir) { const q = P[slot], o = S.scen?.off; return q && o ? wet({ x: q.x + o.dx, y: q.y + o.dy }) : q; }
  if (slot === "cap2") return { x: P.cap.x + 8, y: P.cap.y + 9 };
  if (slot === "escort") return { x: 104, y: 84 };
  if (slot === "airlift" && S.scenK === "baeng") return { x: 112, y: 90 };
  if (slot === "recon") return secById(P.recon).c; if (slot === "cap") return { x: P.cap.x, y: P.cap.y }; return AIRSLOT[slot] || P[slot] || P.main;
}
/** 작전 개시: 역할·부대 지시를 실제 명령으로 바꾼다 */
function fmApply() {
  const F = S.fm, I = F.ins, R = F.roles;
  for (const g of S.us) {
    if (civ(g)) continue;
    const role = roleOf(g.id) || "main"; g.fmRole = role; g.escort = !!S.convoy && role === "main"; g.roe = I.roe; g.radarMode = I.radar; g.radar = I.radar === "on"; g.salvoN = I.salvo;
    g.seek = I.tempo === "slow" ? 30 : I.tempo === "aggr" ? 60 : 48; g.close = I.tempo === "slow" ? 28 : I.tempo === "aggr" ? 15 : 24;
    if (role === "reserve") { g.mission = "hold"; g.path = []; g.fmRes = true; continue; }
    g.mission = role === "front" ? (F.concept === "decoy" ? "hold" : "scout") : role === "strike" ? "strike" : "hold";
    if (role === "front" && F.concept === "decoy") { g.radar = true; g.radarMode = "on"; g.bait = true; }
    if (role === "strike" && F.concept === "decoy") { g.radar = false; g.radarMode = "strike"; }
    g.path = g.escort ? [] : route(g, slotPos(role));
  }
  if (!S.isAir) {
    if ((R.front || []).includes("p3c")) S.sup.push({ k: "p3c", x: slotPos("front").x + 6, y: slotPos("front").y - 4, used: false, id: "p3c" });
    if ((R.cap || []).includes("cap")) S.sup.push({ k: "cap", x: slotPos("main").x, y: slotPos("main").y - 3, used: false, id: "cap" });
  } else {
    const P = SLOTP[F.concept]; let rc = 0;
    for (const u of S.air) {
      const role = roleOf(u.id); u.fmRole = role;
      if (u.t === "fighter") { u.arm = armOf(u); u.asm = armAsm(u); }
      if (role === "recon") { assignSector(u.id, secById(rc++ ? P.recon2 : P.recon)); }
      else if (role === "cap") assignSector(u.id, secById("s2"));
      else if (role === "cap2") { u.wait2 = true; }
      else if (role === "tanker") assignSector(u.id, secById("s5"));
      else if (role === "airlift" && S.scenK === "baeng") { u.job = "airlift"; u.sec = null; u.pt = { x: GOAL.x, y: GOAL.y }; u.holdTill = 120; }
      else if (role === "airlift") assignSector(u.id, secById("s2"));
      else if (role === "escort") { u.wantEsc = true; }
    }
  }
  say(`작전 개시 — ${CONCEPTS[F.concept].n.slice(2)}. 교전규칙 ${I.roe === "free" ? "자유 사격" : "근접 사격"}, 일제사격 ${I.salvo}발.`, "hit");
}
function fmStep(dt) {
  const F = S.fm; if (!F) return; const I = F.ins;
  const thr = { low: 0.4, norm: 0.25, high: -1 }[I.loss] + (S.morLv === -2 ? 0.1 : 0);
  for (const g of S.us) {
    if (!alive(g).length || civ(g)) continue;
    if (g.radarMode === "strike") { const t = nearest(g, S.foe.filter((f) => f.seen && !f.gone)); g.radar = !!(t && t.d < 34) || F.shout.emcon === false; }
    if (F.shout.emcon) g.radar = false;
    if (!g.fmRet && strength(g) < thr) { g.fmRet = true; g.mission = "hold"; g.path = route(g, slotPos("reserve") || { x: 90, y: 62 }); hl("손실 허용 한계 — 전단 후퇴", `${g.name} 전력 ${Math.round(strength(g) * 100)}% — 부대 지시(손실 허용 '${{ low: "낮음", norm: "보통" }[I.loss]}')에 따라 스스로 물러납니다.`, [], "y"); }
    if (F.rules.ammo && !g.ammoRet && g.mission === "strike") { const a = alive(g).reduce((s, x) => s + x.asm, 0), m = alive(g).reduce((s, x) => s + x.asm0, 0); if (m && a / m < 0.3) { g.ammoRet = true; g.mission = "hold"; g.path = route(g, slotPos("main")); say(`${g.name} 미사일 30% 이하 — 조건부 지시로 방어 전환`); } }
  }
  if (S.isAir) {
    for (const u of S.air) if (u.fmRole === "strike" && u.st === "ready" && u.asm > 0 && !u.tgt) { const f = S.foe.filter((x) => x.seen && alive(x).length && !x.gone && !x.retreat && !(x.delay && S.t < x.delay)).sort((a, b) => { const want = u.arm === "sead" || S.foe.some((x) => x.aaw && !alive(x).length) ? "site" : "aaw"; const tk = (x) => S.air.filter((o) => o !== u && o.tgt === x && o.st !== "lost").length; return tk(a) - tk(b) || ((b[want] ? 1 : 0) - (a[want] ? 1 : 0)) || (etaGoal(a) || 999) - (etaGoal(b) || 999); })[0]; if (f) strikeMission(f, [u.id]); }
  }
  if (F.rules.weak && S.isAir) for (const r of S.raids) if (r.alive && !r.fmWarned) { r.fmWarned = true; if (!S.air.some((u) => u.job === "cap" && airborne(u))) for (const u of S.air) if (airborne(u) && ["mpa", "tanker", "transport"].includes(u.t)) { u.st = "rtb"; say(`${short(u.name)} — 조건부 지시로 위협 회피 귀환`); } }
  if (!F.halfDone && S.t >= 900) { F.halfDone = true; F.half = halfOpts(); }
  for (let i = F.timers.length - 1; i >= 0; i--) if (S.t >= F.timers[i][0]) { const f = F.timers[i][1]; F.timers.splice(i, 1); f(); }
  if (S.isAir && S.t >= 121) for (const u of S.air) if (u.wantEsc && u.st === "ready") { const tr = S.air.filter((x) => x.t === "transport" && airborne(x) && !x.dropped).sort((a, b) => S.air.filter((e) => e.follow === a).length - S.air.filter((e) => e.follow === b).length)[0]; if (tr) { u.wantEsc = false; u.job = "escort"; u.follow = tr; say(`${short(u.name)} → ${short(tr.name)} 호위 출격`, "hit"); } }
  if (S.isAir) for (const u of S.air) if (u.wait2 && u.st === "ready" && (S.t >= 600 || S.air.some((c) => c.fmRole === "cap" && (c.st === "rtb" || c.st === "rearm" || c.st === "lost" || c.fuel / fmax(c) < 0.3)))) { u.wait2 = false; assignSector(u.id, secById("s2")); say(`[2교대] ${short(u.name)} 출격 — CAP 교대`, "hit"); }
  scenScript(); guns(dt); decide();
}
/** 시나리오별 고정 사건 (난이도 조정안) */
function scenScript() {
  const F = S.fm, sc = S.scen;
  if (sc.flank && S.t >= sc.flank && !F.flanked) { F.flanked = true; const f = S.foe.find((x) => x.id === "f3" && alive(x).length && !x.gone && !x.retreat) || S.foe.find((x) => alive(x).length && !x.gone && !x.retreat && !(x.delay && S.t < x.delay));
    if (f) { f.path = [...route(f, { x: 44, y: 64 }), { x: 62, y: 60 }, { x: GOAL.x, y: GOAL.y + 4 }]; f.flank = true; f.spdK = (f.spdK || 1) * 1.15; if (f.seen) hl(`${f.name} 우회 기동!`, `${f.name}이(가) 남서쪽으로 크게 돌아 <b>연평 해역 남쪽</b>을 노립니다. 주력이 북쪽만 보고 있으면 뚫립니다.`, [["방어 유지 — 연평으로 집결", () => shout("defend")]], "y", true); else say("정보처: 적 일부 전단이 진로를 바꾼 징후 — 위치 미확인", "bad"); } }
  if (S.convoy && S.t >= 600 && !F.satDone && alive(S.convoy).length && !S.convoy.arrived) { F.satDone = true; const src = nearest(S.convoy, S.foe.filter((x) => !x.gone && !(x.delay && S.t < x.delay)))?.g || { x: S.convoy.x - 30, y: 10, name: "적 해안" };
    launch2({ x: src.x, y: src.y, name: src.name, side: "foe", id: src.id }, S.convoy, 4, "적 대함미사일(포화)", 55); say(`정보처: 항적 8개 중 기만체 4 — 진짜 대함미사일 4발이 선단을 노립니다!`, "bad"); }
  if (S.convoy && S.t >= 840 && !F.strag && alive(S.convoy).length >= 2 && !S.convoy.arrived) { F.strag = true; const sh = alive(S.convoy).slice(-1)[0];
    S.convoy.ships = S.convoy.ships.filter((x) => x !== sh); const g = { id: "cv2", name: "낙오선", civ: true, ...ORD0, radar: false, roe: "hold", x: S.convoy.x + 1.5, y: S.convoy.y + 1.5, ships: [sh], mission: "hold", path: [...S.convoy.path], side: "us", fireT: 30, slow: true }; g.home = { x: g.x, y: g.y }; S.us.push(g); S.strag = g; F.trig.strag = g; say(`${sh.name} 기관 고장 — 속력 절반, 선단에서 낙오`, "bad"); }
  if (!S.isAir && F.coastFired && !F.coast2 && S.t >= F.coastFired + 300 && !on("quiet")) { F.coast2 = true; const t = coastTarget(); if (t) { launch2({ x: t.x - 12, y: 6, name: "적 해안 지대함", side: "foe", id: "coast" }, t, 4, "적 지대함미사일", 70); say("적 해안 포대 2차 발사 — 4발", "bad"); } }
}
function domNow() { const our = S.us.reduce((a, g) => a + alive(g).reduce((s2, x) => s2 + x.hp, 0), 0) + S.air.filter((u) => u.st !== "lost").length * 25, their = S.foe.filter((f) => !f.gone).reduce((a, f) => a + alive(f).reduce((s2, x) => s2 + x.hp, 0), 0) + S.raids.filter((r) => r.alive).reduce((a, r) => a + r.n * 12, 0); return clamp(Math.round((our / Math.max(1, our + their)) * 100) - S.domPen, 0, 100); }
function spawnPkg() { const g = { id: "u9", name: "예비 고속정 편대", ...ORD0, x: 110, y: 72, ships: [ship("pkg", "고속함 1"), ship("pkg", "고속함 2")], mission: "strike", path: [], side: "us", fireT: 30, salvoN: S.fm.ins.salvo, seek: 48, close: 24 }; g.home = { x: g.x, y: g.y }; g.path = route(g, slotPos("main")); S.us.push(g); say("[예비] 고속정 편대 합류", "hit"); }
const coastTarget = () => S.us.filter((g) => !civ(g) && alive(g).length).sort((a, b) => a.y - b.y)[0];
/** 근접전: 5 단위(약 7km) 안에서는 함포·어뢰로 서로 깎는다 (해무·야간에 자주 발생) */
function guns(dt) {
  const F = S.fm; F.gunT = (F.gunT || 0) - dt; if (F.gunT > 0) return; F.gunT = 10;
  for (const f of S.foe) { if (!alive(f).length || f.gone || (f.delay && S.t < f.delay)) continue;
    for (const g of S.us) { if (!alive(g).length || d2(f, g) > 5) continue; f.seen = true; f.everSeen = true;
      const fv = alive(f).reduce((a, x) => a + (x.t === "foeFAST" || x.t === "foeFAC" ? 2 : 1.5), 0) * (f.seenAt != null && S.t - f.seenAt > 110 && S.scen.night ? 1.2 : 1) * (on("allin") ? 1.25 : 1), uv = civ(g) ? 0 : alive(g).length * 2.5 * (on("allin") ? 1.25 : 1);
      const a = alive(g)[(Math.random() * alive(g).length) | 0], b = alive(f)[(Math.random() * alive(f).length) | 0];
      a.hp = Math.max(0, a.hp - fv); if (a.hp <= 0) say(`${a.name} 근접전에서 침몰`, "bad");
      if (b && uv) { b.hp = Math.max(0, b.hp - uv); stOf(g.id).hits++; if (b.hp <= 0) { stOf(g.id).kills++; say(`${b.name} 함포에 격침!`, "hit"); if (F.firstKill == null) F.firstKill = S.t; } }
      if (!F.gunSaid || S.t - F.gunSaid > 60) { F.gunSaid = S.t; say(`[근접전] ${g.name} ↔ ${f.name} 함포 교전`, "bad"); } break; } }
}
/** 진행 중 결정 이벤트: 조건이 맞으면 일시정지하고 선택지를 묻는다 (100초에 한 번까지) */
function decide() {
  const F = S.fm; if (F.hl || F.half || S.t - F.lastDec < 100) return;
  for (const e of S.isAir ? DEC_AIR : DEC_SEA) { if (F.decDone[e.id]) continue; const c = e.when(); if (!c) continue;
    F.decDone[e.id] = true; F.lastDec = S.t; const o = e.opts(c);
    F.hl = { title: e.t(c), body: e.b(c), acts: o.map(([n, risk, fn]) => [`<b>${n}</b><small>${risk}</small>`, fn]), cls: e.cls || "y", at: S.t, noOk: true, dec: true, who: e.who }; F.lastHl = S.t; F.ff = false; S.dirty = true; return; }
}
const mkFoe = (id, name, p, ships, extra = {}) => { const f = { id, name, ...wet(p), ships, seen: false, side: "foe", fireT: 20, spdK: 1.3, noGoal: true, ...extra }; f.home = { x: f.x, y: f.y - 20 }; f.path = []; S.foe.push(f); return f; }; /* 소규모 기습대: 해역 돌파는 노리지 않고 근처 아군과 교전 */
const fwd = () => S.us.filter((g) => !civ(g) && alive(g).length && !g.fmRes).sort((a, b) => a.y - b.y)[0];
const burnAsm = (g, n) => { for (const x of alive(g)) { const k = Math.min(n, x.asm); x.asm -= k; n -= k; if (n <= 0) break; } };
const burnSam = (g, n) => { for (const x of alive(g)) { const k = Math.min(n, x.sam); x.sam -= k; n -= k; if (n <= 0) break; } };
const DEC_SEA = [
  { id: "fish", who: "전탐관", when: () => S.t >= S.fm.fishAt && fwd() && { g: fwd(), foe: Math.random() < 0.5 },
    t: () => "미확인 고속 접촉 3개", b: (c) => `${c.g.name} 북서쪽 ${KMU(9)}km에 고속 표적 3개가 접근합니다. <b>민간 어선인지 적 고속정인지</b> 식별되지 않았습니다.`,
    opts: (c) => [["A. 즉각 경고 사격", "미사일 2발 소모 · 60초간 위치 노출(받는 피해 +15%) · 적이면 먼저 때림, 어선이면 신뢰도 −15",
      () => { burnAsm(c.g, 2); c.g.exposedTo = S.t + 60; if (c.foe) { const f = mkFoe("fx", "적 고속정 편대", { x: c.g.x - 6, y: c.g.y - 4 }, [ship("foeFAST", "물살 3제대 1호"), ship("foeFAST", "물살 3제대 2호")]); for (const x of f.ships) x.hp -= 10; f.seen = true; say("경고 사격 — 적 고속정이었다! 선제 타격 명중", "hit"); } else { S.campD.trust -= 15; say("경고 사격 — 민간 어선으로 확인. 오인 사격 항의 접수", "bad"); } }],
      ["B. 헬기·초계기로 근접 식별", "50초 뒤 정체 확인 · 적이면 1발 먼저 맞음 · 어선이면 신뢰도 +5, 30초간 적 위치 노출",
      () => S.fm.timers.push([S.t + 50, () => { if (c.foe) { const f = mkFoe("fx", "적 고속정 편대", { x: c.g.x - 5, y: c.g.y - 3 }, [ship("foeFAST", "물살 3제대 1호"), ship("foeFAST", "물살 3제대 2호")]); f.seen = true; launch2({ ...f, name: f.name }, c.g, 1, "적 대함미사일", 25); say("식별 결과 적 고속정 — 적이 먼저 1발 발사!", "bad"); } else { S.campD.trust += 5; S.fm.fx.reveal = S.t + 30; say("식별 결과 민간 어선 — 신중한 대응. 식별 중 적 위치 일부 노출", "hit"); } }])],
      ["C. 전파 차단·회피 기동", "교전 회피 · 작전 우세 −8%", () => { S.domPen += 8; for (const g of [c.g]) { g.radar = false; g.path = route(g, { x: g.x + 6, y: g.y + 6 }); } say("회피 기동 — 미확인 표적과 거리 벌림"); }]] },
  { id: "ammo", who: "군수참모", when: () => { const g = S.us.find((x) => !civ(x) && alive(x).length && S.t > 200 && (() => { const m = alive(x).reduce((a, y) => a + y.asm0, 0); return m && alive(x).reduce((a, y) => a + y.asm, 0) / m <= 0.4; })()); return g && { g }; },
    t: (c) => `${c.g.name} 미사일 잔량 40% 이하`, b: () => "교전이 길어지며 대함미사일이 바닥나고 있습니다. 남은 탄을 어떻게 쓰시겠습니까?",
    opts: () => [["A. 탄약 절약", "일제사격 2발 고정 · 끝까지 버팀 · 격침 속도 ↓", () => shout("save")],
      ["B. 남은 화력 총동원", "2분간 8발·빠른 재장전 → 이후 3분간 미사일 사격 불가", () => { S.fm.fx.burst = S.t + 120; S.fm.fx.dry0 = S.t + 120; S.fm.fx.dry = S.t + 300; for (const g of S.us) g.salvoN = 8; S.fm.timers.push([S.t + 120, () => { for (const g of S.us) g.salvoN = S.fm.ins.salvo; say("총동원 종료 — 재장전 중(3분)", "bad"); }]); say("[지휘] 남은 화력 총동원!", "hit"); }]] },
  { id: "fire", who: "손상통제관", cls: "r", when: () => { for (const g of S.us) if (!civ(g)) for (const x of alive(g)) if (x.hp / x.max <= 0.45) return { g, x }; return null; },
    t: (c) => `${c.x.name} 기관실 화재`, b: (c) => `${c.x.name}(내구도 ${Math.round((c.x.hp / c.x.max) * 100)}%)에 불이 났습니다. 진화반을 넣으면 전투력이 떨어집니다.`,
    opts: (c) => [["A. 전투 지속 (응급 진화만)", "3분간 전단 화력 +10% · 매분 내구도 −3", () => { c.g.fireUp = S.t + 180; for (const k of [60, 120, 180]) S.fm.timers.push([S.t + k, () => { if (c.x.hp > 0) { c.x.hp = Math.max(1, c.x.hp - 3); say(`${c.x.name} 화재 확산 — 내구도 −3`, "bad"); } }]); }],
      ["B. 후방 이탈·집중 진화", "3분간 전단 교전 제외 · 내구도 +15", () => { c.g.fmOut = S.t + 180; c.g.path = route(c.g, slotPos("reserve") || { x: 90, y: 62 }); c.x.hp = Math.min(c.x.max, c.x.hp + 15); say(`${c.g.name} 이탈 — 집중 진화`); }],
      ["C. 예비 전단과 즉시 교대", S.fm.res > 0 ? "예비 투입 1회 소모 · 고속정 편대 투입, 피해 전단 안전 이탈" : "예비 투입이 없어 불가 — B로 처리", () => { if (S.fm.res > 0) { S.fm.res--; spawnPkg(); c.g.fmRet = true; c.g.mission = "hold"; c.g.path = route(c.g, slotPos("reserve") || { x: 90, y: 62 }); } else { c.g.fmOut = S.t + 180; c.x.hp = Math.min(c.x.max, c.x.hp + 15); } }]] },
  { id: "chaff", who: "방공통제관", cls: "r", when: () => S.fm.trig.salvo, t: () => "레이더에 항적 12개 — 기만체 혼재", b: (c) => `${c.to.name}을(를) 향해 항적 12개가 날아옵니다. 채프·기만 드론이 섞여 있어 <b>진짜 미사일이 몇 발인지</b> 모릅니다.`,
    opts: (c) => [["A. 전 탄막 요격 (대공 집중)", "90초간 요격 ×1.35 · 대공 8발 소모 → 이후 60초 요격 효율 ↓(재장전)", () => { S.fm.fx.icptA = S.t + 90; S.fm.fx.lag0 = S.t + 90; S.fm.fx.lag = S.t + 150; burnSam(c.to, 8); }],
      ["B. 근접방어(CIWS) 위주", "대공미사일 2발만 소모 · 피격 확률 +20%", () => { S.fm.fx.icptB = S.t + 90; burnSam(c.to, 2); }],
      ["C. 전자전 교란 + 전파 차단", "요격 ×1.2 · 적 다음 일제사격 45초 지연 · 아군 반격 60초 중단", () => { S.fm.fx.icptC = S.t + 90; S.fm.fx.hold = S.t + 60; for (const f of S.foe) f.fireT = (f.fireT || 0) + 45; }]] },
  { id: "strag", who: "선단 지휘관", when: () => S.fm.trig.strag && { g: S.fm.trig.strag }, t: () => "선단 1척 기관 고장 — 낙오", b: (c) => `${c.g.ships[0].name}이(가) 기관 고장으로 속력이 절반이 됐습니다. 본대 2척만 도착해도 성공이지만, 낙오선을 버리면 적의 표적이 됩니다.`,
    opts: (c) => [["A. 타격대가 낙오선 엄호", "낙오선 생존 ↑ · 본대 호위 약화", () => { const g = S.us.find((x) => x.fmRole === "strike" && alive(x).length) || S.us.find((x) => !civ(x) && !x.escort && alive(x).length); if (g) { g.escort = true; g.escortT = c.g; g.fmRes = false; say(`${g.name} → 낙오선 엄호`, "hit"); } }],
      ["B. 본대 우선", "낙오선은 홀로 항해 · 본대 방공 유지", () => say("낙오선 단독 항해 — 본대 우선")]] },
  { id: "coast", who: "작전참모", cls: "r", when: () => S.t >= S.fm.coastAt && S.t < 1200 && coastTarget() && { g: coastTarget() },
    t: () => "적 해안 지대함 발사 경보", b: (c) => `북쪽 해안에서 지대함 미사일 4발 발사 — <b>${c.g.name}</b>을(를) 노립니다.`,
    opts: (c) => { const R = launch2({ x: c.g.x - 12, y: 6, name: "적 해안 지대함", side: "foe", id: "coast" }, c.g, S.mf?.coastCut ? 2 : 4, "적 지대함미사일", 70); S.fm.coastFired = S.t; if (S.mf?.coastCut) { S.fm.coast2 = true; say("KAMD 전역 쉴드 — 지대함 2발 사전 차단", "hit"); }
      return [["A. 전속으로 외해 이탈", "받는 피해 −30% · 작전 우세 −12%", () => { c.g.evadeTo = S.t + 120; S.domPen += 12; if (!civ(c.g)) c.g.path = route(c.g, { x: c.g.x + 4, y: c.g.y + 10 }); }],
        ["B. 해안 포대 역타격 요청", S.fm.res > 0 ? "예비 1회 소모 · 2발 공중 격파 + 포대 5분 침묵" : "예비 투입이 없어 불가", () => { if (S.fm.res > 0) { S.fm.res--; S.fm.fx.quiet = S.t + 300; let k = 2; S.msl = S.msl.filter((m) => !(m.rep === R && k-- > 0)); R.left -= 2; R.icpt += 2; say("FA-50 역타격 — 지대함 2발 격파, 포대 침묵", "hit"); } }],
        ["C. 그대로 요격", "추가 소모 없음", () => {}]]; } },
];
const DEC_LAST = { id: "last5", who: "합참 전문", when: () => S.t >= limitOf() - 300 && !S.convoy && (() => { const d = domNow(); return d >= 45 && d <= 55; })() && {},
  t: () => "종료 5분 전 — 백중세", b: () => `작전 우세 <b>${domNow()}%</b>. 합참: "결정적 전과를 올리든 안전하게 지키든 지휘관이 판단하라."`,
  opts: () => [["A. 위험 감수 총공세", "5분간 화력 +25% · 받는 피해 +25% — 이기면 별 +1·신뢰도 +10", () => { S.fm.fx.allin = S.t + 300; S.fm.allIn = true; shout("attack"); }], ["B. 현 위치 사수", "추가 손실 방지 · 사기 유지", () => shout("defend")]] };
DEC_SEA.push(DEC_LAST);
const DEC_AIR = [
  { id: "bingo", who: "요격 통제관", when: () => { const u = S.fm.trig.kill; if (!u) return null; S.fm.trig.kill = null; return u.st !== "lost" && airborne(u) && { u }; },
    t: (c) => `${short(c.u.name)} 빙고 연료`, b: (c) => `적기를 떨어뜨렸지만 ${short(c.u.name)}의 연료가 ${Math.round((c.u.fuel / fmax(c.u)) * 100)}%입니다. 남은 적기가 도주 중입니다.`,
    opts: (c) => { const k = S.air.find((x) => x.t === "tanker" && x.st !== "lost" && x.st !== "rest"); return [["A. 추격 금지, 즉시 귀환", "안전 귀환 · 정상 재무장", () => { c.u.st = "rtb"; }],
      ["B. 급유기 전진 급유 후 추격", k ? "추가 격추 기회 · 급유기 피격 위험 25%" : "급유기 없음 — 연료만 소폭 회복", () => { c.u.fuel = Math.min(fmax(c.u), c.u.fuel + (k ? 300 : 120)); if (k) { if (Math.random() < 0.6) { S.airKills++; stOf(c.u.id).air++; say(`${short(c.u.name)} 추격 — 적기 1기 추가 격추!`, "hit"); } if (Math.random() < 0.25) loseAir(k, "전진 급유 중 적기에 피격 — 격추"); } }]]; } },
  { id: "sam", who: "전자전 장교", cls: "r", when: () => { const u = S.air.find((x) => x.job === "strike" && x.st === "out" && x.tgt && alive(x.tgt).reduce((a, y) => a + y.sam, 0) > 0 && S.t > 240); return u && { u }; },
    t: () => "미확인 SAM 레이더 록온!", b: (c) => `${short(c.u.name)} 타격 경로 아래에서 이동식 SAM 레이더가 켜졌습니다.`,
    opts: (c) => [["A. 고도 상승 회피 (타격 취소)", "손실 0 · 타격 임무 지연", () => { c.u.st = "rtb"; c.u.tgt = null; }], ["B. 채프 살포 후 강행 돌파", "타격 유지 · 피격 확률 35%", () => { if (Math.random() < 0.35 * (on("jam") ? 0.6 : 1)) loseAir(c.u, "SAM에 피격 — 격추"); else say(`${short(c.u.name)} SAM 회피 성공 — 타격 계속`, "hit"); }]] },
  { id: "wind", who: "기지 운항관제", when: () => { const u = S.fm.trig.ready; if (!u) return null; S.fm.trig.ready = null; return u.st === "ready" && { u }; },
    t: () => "기지 측풍 — 이륙 제한", b: (c) => `재무장을 마친 ${short(c.u.name)}이(가) 강한 측풍으로 이륙을 기다립니다.`,
    opts: (c) => [["A. 안전 대기 (2분)", "손실 없음 · 공역 압박 증가", () => { c.u.st = "rearm"; c.u.cd = 120; }], ["B. 강풍 무리 이륙", "즉시 투입 · 피로 +15 · 15% 이상 발생", () => { c.u.fat = (c.u.fat || 0) + 15; if (Math.random() < 0.15) { c.u.st = "rearm"; c.u.cd = 180; say(`${short(c.u.name)} 이륙 중 이상 — 정비 복귀`, "bad"); } }]] },
  { id: "bail", who: "탐색구조 통제관", cls: "r", when: () => S.fm.trig.lost && { p: S.fm.trig.lost },
    t: () => "조종사 비상탈출 — 조난 신호", b: (c) => `${short(c.p.u.name)} 조종사가 서해 해상에 탈출했습니다. 구조 신호가 들어옵니다.`,
    opts: (c) => { const h = S.air.find((x) => x.t === "helo" && x.st !== "lost" && x.st !== "rest"); return [["A. 구조 투입 (전투기 엄호)", `${h ? "해상작전헬기" : "함정 구조정"} 출동 · 전투기 1개 편대 2분간 엄호로 교전 이탈 · 3분간 요격 −10% · 성공 시 사기 +15·신뢰도 +10`, () => { S.fm.fx.rescue = S.t + 180; const e = S.air.find((x) => x.t === "fighter" && airborne(x) && x.st !== "rtb"); if (e) { e.busyTo = S.t + 120; say(`${short(e.name)} 구조 엄호 — 2분간 교전 이탈`, "bad"); } S.fm.timers.push([S.t + 180, () => { if (!h || h.st !== "lost") { S.campD.morale += 15; S.campD.trust += 10; S.fm.rescued = true; say("조종사 구조 성공!", "hit"); } else say("구조 실패", "bad"); }]); }],
      ["B. 작전 우선 (구조 지연)", "전선 유지 · 사기 −15 · 기자회견 악재", () => { S.campD.morale -= 15; S.campD.trust -= 5; S.fm.leftPilot = true; }]]; } },
  DEC_LAST,
];
function halfOpts() {
  const ours = S.us.filter((g) => !civ(g)).reduce((a, g) => a + strength(g), 0), theirs = S.foe.filter((f) => !f.gone).reduce((a, f) => a + strength(f), 0), ammo = S.us.reduce((a, g) => a + alive(g).reduce((s, x) => s + x.asm, 0), 0);
  const seen = S.foe.filter((f) => f.seen && alive(f).length && !f.gone).length, hidden = S.foe.filter((f) => alive(f).length && !f.gone && !f.seen).length;
  const L = [];
  L.push(ours > theirs ? ["attack", "공세로 전환", "아군 전력이 앞섭니다. 남은 적을 쫓아가 끝냅니다.", "작전처장"] : ["defend", "연평 해역으로 집결", "전력이 대등하거나 불리합니다. 해역 방어에 집중합니다.", "작전처장"]);
  L.push(hidden ? ["scout", "정찰 강화", `미탐지 적 전단 ${hidden}개 — 전위·정찰 수단을 북쪽으로 더 밀어 올립니다.`, "정보처장"] : ["sat", "포화 사격으로 마무리", "적 대공이 남아 있습니다. 일제사격을 8발로 올립니다.", "정보처장"]);
  L.push(ammo < 16 ? ["save", "탄약 절약", `남은 대함미사일 ${ammo}발 — 일제사격을 2발로 줄여 끝까지 버팁니다.`, "군수참모"] : ["aaw", "대공 방어 강화", "적 미사일 반격에 대비해 요격을 강화합니다(대함 사격 일시 중지).", "작전참모"]);
  return { ours: Math.round((ours / Math.max(0.01, ours + theirs)) * 100), seen, hidden, ammo, opts: L };
}
function shout(k) {
  const F = S.fm, gs = S.us.filter((g) => !civ(g) && alive(g).length && !g.fmRes);
  if (k === "attack" && !S.isAir) { for (const g of gs) { g.mission = "strike"; g.seek = 70; g.close = 15; g.fmRet = false; } say("[지휘] 공세 전환 — 전 전단 전진", "hit"); }
  if (k === "defend") { for (const g of gs) { g.mission = "hold"; if (S.convoy) { g.escort = true; g.path = []; } else g.path = route(g, slotPos("main")); } say("[지휘] 방어 유지 — 연평 해역으로 집결", "hit"); }
  if (k === "retreat") { for (const g of gs) { g.mission = "hold"; g.roe = "tight"; g.path = route(g, slotPos("reserve")); } say("[지휘] 전면 후퇴 — 손실 최소화", "bad"); }
  if (k === "emcon") { F.shout.emcon = !F.shout.emcon; for (const g of gs) g.radar = !F.shout.emcon; say(`[지휘] ${F.shout.emcon ? "전 전단 전파 차단" : "전파 차단 해제 — 레이더 켜기"}`, "hit"); }
  if (k === "sat") { for (const g of S.us) g.salvoN = 8; F.ins.salvo = 8; say("[지휘] 포화 사격 — 일제사격 8발", "hit"); }
  if (k === "save") { for (const g of S.us) g.salvoN = 2; F.ins.salvo = 2; say("[지휘] 탄약 절약 — 일제사격 2발"); }
  if (k === "aaw") { F.shout.aaw = !F.shout.aaw; say(`[지휘] ${F.shout.aaw ? "대공 집중 — 대함 사격 중지" : "대공 집중 해제"}`, "hit"); }
  if (k === "scout") { for (const g of gs) if (g.fmRole === "front") { g.mission = "scout"; g.path = route(g, { x: 34, y: 30 }); } for (const s of S.sup) if (s.k === "p3c") { s.y = Math.max(20, s.y - 8); } for (const u of S.air) if (u.t === "mpa" && u.st !== "lost") assignSector(u.id, secById("s1")); say("[지휘] 정찰 강화 — 전위·초계기 북쪽으로", "hit"); }
  if (S.isAir && k === "attack") { const rd = S.air.filter((u) => u.t === "fighter" && u.st === "ready" && u.asm > 0), f = S.foe.filter((x) => x.seen && alive(x).length && !x.gone && !(x.delay && S.t < x.delay)).sort((a, b) => etaGoal(a) - etaGoal(b))[0]; if (f && rd.length) strikeMission(f, rd.map((u) => u.id)); else say("[지휘] 총공격 — 보낼 전투기나 탐지된 적이 없습니다", "bad"); }
  if (k === "capall") { for (const u of S.air) if (u.t === "fighter" && u.st !== "lost" && u.job !== "strike") assignSector(u.id, secById("s2")); say("[지휘] 방공 강화 — 전투기 연평 CAP 집중", "hit"); }
  if (k === "ab") { F.fx.ab = S.t + 180; say("[지휘] 애프터버너 요격 — 3분간", "hit"); }
  if (k === "low") { F.fx.low = S.t + 180; say("[지휘] 저고도 침투 — 3분간", "hit"); }
  if (k === "hot") { let n = 0; for (const u of S.air) if (u.st === "rearm") { u.cd *= 0.5; u.fat = (u.fat || 0) + 20; n++; if (Math.random() < 0.15) { u.cd += 90; say(`${short(u.name)} 긴급 정비 중 기체 이상 — 1.5분 추가`, "bad"); } } say(n ? `[지휘] 긴급 재출격 — 재무장 중 ${n}개 편대 시간 단축` : "[지휘] 재무장 중인 편대가 없습니다", n ? "hit" : "bad"); }
  if (k === "tank") { const kc = S.air.find((x) => x.t === "tanker" && x.st !== "lost" && x.st !== "rest"), u = S.air.filter((x) => x.t === "fighter" && airborne(x) && x.st !== "rtb" && !(x.refuelTo > S.t)).sort((a, b) => a.fuel / fmax(a) - b.fuel / fmax(b))[0];
    if (!kc) say("[지휘] 급유기가 없습니다", "bad"); else if (on("tankcd")) say(`[지휘] 급유기 재배정은 ${fmtT(F.fx.tankcd - S.t)} 뒤 가능`, "bad"); else if (!u) say("[지휘] 급유할 공중 편대가 없습니다", "bad");
    else { F.fx.tankcd = S.t + 240; u.refuelTo = S.t + 120; u.fuel = Math.min(fmax(u), u.fuel + 360); say(`[지휘] 긴급 공중급유 → ${short(u.name)} (2분 전투 이탈)`, "hit"); if (S.raids.some((r) => r.alive && d2(r, kc) < 60) && Math.random() < 0.25) loseAir(kc, "급유 위치 노출 — 적기에 격추"); } }
  if (k === "safe") { for (const u of S.air) if (airborne(u) && ["mpa", "tanker", "transport"].includes(u.t)) u.st = "rtb"; say("[지휘] 약한 기체 후퇴"); }
  F.lastShout = k; S.dirty = true;
}
function useReserve(k) {
  const F = S.fm; if (F.res <= 0 || F.resUsed.includes(k)) return; F.res--; F.resUsed.push(k);
  if (k === "resgrp") { const g = S.us.find((x) => x.fmRes && alive(x).length); if (g) { g.fmRes = false; g.mission = "strike"; g.path = route(g, slotPos("main")); say(`[예비] ${g.name} 출동 — 연평으로`, "hit"); } else { F.res++; F.resUsed.pop(); say("예비 칸에 전단이 없습니다.", "bad"); } }
  if (k === "resair") { const u = S.air.find((x) => x.fmRole === "reserve" && x.st === "ready"); if (u) { u.fmRole = "strike"; say(`[예비] ${u.name} 투입 — 타격대 합류`, "hit"); } else { F.res++; F.resUsed.pop(); say("예비 칸에 대기 편대가 없습니다.", "bad"); } }
  if (k === "pkg") spawnPkg();
  if (k === "ffx") { const g = { id: "u8", name: "FFX 증원 전대", ...ORD0, x: 112, y: 70, ships: [ship("ffg", "충남함"), ship("ffg", "경북함")], mission: "strike", path: [], side: "us", fireT: 20, salvoN: F.ins.salvo, seek: 48, close: 24 }; g.home = { x: g.x, y: g.y }; g.path = route(g, slotPos("main")); S.us.push(g); say("[예비] FFX 호위함 2척 증원", "hit"); }
  if (k === "jsf") { const f = S.foe.filter((x) => x.seen && alive(x).length && !x.gone).sort((a, b) => strength(b) - strength(a))[0]; if (f) { launch2({ x: 120, y: 80, name: "합동화력함", side: "us", id: "jsf" }, f, 8, "합동화력", 45, 12); S.shots += 8; say(`[예비] 합동화력함 화력 지원 8발 → ${f.name}`, "hit"); } else { F.res++; F.resUsed.pop(); say("탐지된 적 전단이 없습니다.", "bad"); } }
  if (k === "fa50") { if (S.isAir) { const u = air("a9", "fighter", "비상대기 편대 (FA-50)"); u.asm = 2; S.air.push(u); assignSector(u.id, secById("s2")); launch(u); } else S.sup.push({ k: "cap", x: GOAL.x, y: GOAL.y - 4, used: false, id: "fa50" }); say("[예비] 비상대기 FA-50 출격 — 연평 상공 CAP", "hit"); }
  if (k === "kf21") { const u = air("a9", "fighter", "비상대기 편대 (KF-21)"); u.fmax = 480; u.fuel = 480; S.air.push(u); assignSector(u.id, secById("s2")); launch(u); say("[예비] 비상대기 KF-21 스크램블", "hit"); }
  if (k === "jam") { F.fx.jam = S.t + 180; say("[예비] 전자전 재밍 지원 — 3분간 적 명중률 ↓", "hit"); }
  if (k === "cruise") { const f = S.foe.filter((x) => x.seen && alive(x).length && !x.gone).sort((a, b) => strength(b) - strength(a))[0]; if (f) { launch2({ x: AIRBASE.x, y: AIRBASE.y, name: "장거리 순항미사일", side: "us", id: "cruise" }, f, 4, "순항미사일", 50, 12); S.shots += 4; say(`[예비] 장거리 순항미사일 4발 → ${f.name}`, "hit"); } else { F.res++; F.resUsed.pop(); say("탐지된 적 전단이 없습니다.", "bad"); } }
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
    const surf = S.foe.some((f) => !f.site && !f.aaw);
    if (has("recon") || !surf) p += 15; else weak.push("정찰이 없어 적을 늦게 찾습니다");
    if (has("cap")) p += 14; else weak.push("방공(CAP)이 없어 적 전투기가 정찰기·급유기를 노립니다");
    if (S.scenK === "airsup") p += has("cap2") ? 12 : 0; else if (has("strike")) p += 16 + 4 * (R.strike.length - 1); else if (S.foe.length) weak.push("타격대가 없어 적을 칠 수 없습니다"); else p += 10;
    if (S.scenK === "baeng" && !has("escort")) { p -= 15; weak.push("수송기 호위가 없습니다 — 적기가 수송기부터 노립니다"); }
    if (has("tanker")) p += 3; if (has("airlift")) p += 4; if (has("reserve")) p += 2;
    for (const id of R.strike || []) { const u = S.air.find((x) => x.id === id); if (u?.t === "fighter" && armOf(u) === "a2a") { p -= 8; weak.push(`${short(u.name)} — 공대공 무장이라 타격할 수 없습니다`); } }
    for (const id of [...(R.cap || []), ...(R.cap2 || [])]) { const u = S.air.find((x) => x.id === id); if (u && armOf(u) !== "a2a") { p -= 3; weak.push(`${short(u.name)} — CAP인데 ${ARM[armOf(u)].n} 무장(격추 확률 ↓)`); } }
    if (S.scenK === "sead" && !S.air.some((u) => u.t === "fighter" && (R.strike || []).includes(u.id) && armOf(u) === "sead")) { p -= 10; weak.push("SEAD 무장 편대가 없습니다 — 지대공 포대에 타격기가 계속 떨어집니다"); }
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
  const C = S.foeCmd; if (C && F.concept === C.good) p += 5;
  if (S.foeCmdK === "decoy" && !(S.isAir ? has("recon") : (R.front || []).includes("p3c"))) { p -= 6; weak.push("기만형 지휘관 — 정찰기 없이는 허위 표적에 끌려다닙니다"); }
  if (S.scen?.fog) { p -= 14; if (!(R.front || []).includes("p3c")) { p -= 6; weak.push("해무 — 정찰기 없이는 적을 코앞에서야 봅니다"); } if (S.fm.ins.radar === "on") { p -= 6; weak.push("해무 속 레이더 상시 가동 — 적이 먼저 보고 쏩니다"); } }
  if (S.scenK === "airsup") { if (!has("cap2")) { p -= 15; weak.push("CAP 2교대가 비었습니다 — 1차 편대가 귀환하면 공역이 빕니다"); } if (!has("tanker")) { p -= 6; weak.push("급유기가 없어 체공 시간이 짧습니다"); } p -= 6; }
  if (S.scen?.night) { p -= 8; if (!(S.isAir ? has("recon") : (R.front || []).length)) { p -= 6; weak.push("야간 — 전위 초계(정찰) 없이는 고속정을 놓칩니다"); } }
  if (S.convoy) { if (!S.isAir && !has("main")) { p -= 18; weak.push("선단 호위 칸이 비어 있습니다 — 선단은 스스로 방어할 수 없습니다"); } if (S.isAir && !has("cap")) { p -= 10; weak.push("선단 상공 CAP이 없습니다"); } }
  if (S.ctx.grade >= 4 && !S.isAir && S.scenK === "intercept") weak.push("적 제2전단(해주)이 8분 뒤 북동쪽에서 출현 — 주력이 연평에 있어야 함");
  return { p: clamp(Math.round(p), 12, 92), weak: weak.slice(0, 3) };
}

// ── 작전 기록 · 기자회견 ──
const LOGK = "steeltide:oplog", CAMPK = "steeltide:camp";
function camp() { let c = null; try { c = JSON.parse(localStorage.getItem(CAMPK)); } catch { c = null; } return { trust: 60, ships: {}, pilots: {}, ...(c || {}) }; }
const saveCamp = (c) => { try { localStorage.setItem(CAMPK, JSON.stringify(c)); } catch { /* storage full or blocked */ } };
const opLog = () => { try { return JSON.parse(localStorage.getItem(LOGK)) || []; } catch { return []; } };
const saveLog = (L) => { try { localStorage.setItem(LOGK, JSON.stringify(L.slice(0, 30))); } catch { /* storage full or blocked */ } };
const moraleNow = () => opLog().slice(0, 3).reduce((a, e) => a + (e.morale || 0) + (e.won ? 1 : -1), 0);
/** 사기 5단계: 충천(+2) 양호(+1) 보통(0) 동요(−1) 위축(−2) */
const moraleLv = () => { const m = moraleNow() + (minFx().moraleAdd || 0); return m >= 7 ? 2 : m >= 3 ? 1 : m >= -2 ? 0 : m >= -6 ? -1 : -2; };
const MOR = { 2: ["충천", "g", "요격 +5% · 명중 +5%p · 지시 재사용 −20%"], 1: ["양호", "g", "요격 +3%"], 0: ["보통", "y", "기본"], "-1": ["동요", "r", "요격 −3% · 지시 재사용 +15%"], "-2": ["위축", "r", "요격 −5% · 퇴각 기준 +10%p · 지시 재사용 +30%"] };
const MOR_ICPT = { 2: 1.05, 1: 1.03, 0: 1, "-1": 0.97, "-2": 0.95 }, MOR_CD = { 2: 0.8, 1: 1, 0: 1, "-1": 1.15, "-2": 1.3 };
function pressQs(r) {
  if (S.fm?.leftPilot) return [["기자: \"추락한 조종사 구조를 미뤘다는 보도가 있습니다.\"", [["작전상 불가피했습니다. 제 책임입니다", 1, -1], ["구조 작전은 계속 중입니다", 0, 0], ["확인해 드릴 수 없습니다", -2, -2]]], pressQs({ won: r.won })[1]];
  return r.won ? [["기자: \"이번 작전 성공의 비결은 무엇입니까?\"", [["장병들이 잘 싸워 준 덕분입니다", 0, 2], ["계획한 대로 정확히 됐습니다", 2, 0], ["운도 따랐습니다. 아직 갈 길이 멉니다", 1, 1]]],
    ["기자: \"북측이 보복을 예고했습니다. 대비는?\"", [["언제든 같은 결과를 보여 주겠습니다", 1, 1], ["상황을 지켜보며 신중히 대응하겠습니다", 2, 0], ["작전 관련 사항은 말씀드릴 수 없습니다", 0, 0]]]]
    : [["기자: \"작전 실패의 책임은 누구에게 있습니까?\"", [["지휘관인 제 책임입니다", 2, 1], ["정보가 부족했습니다", -1, 0], ["적이 예상보다 강했습니다", -2, -1]]],
      ["기자: \"다음 작전은 어떻게 바꿀 겁니까?\"", [["정찰과 배치를 처음부터 다시 짜겠습니다", 2, 0], ["장병들을 믿고 다시 싸우겠습니다", 0, 2], ["답변하지 않겠습니다", -1, -1]]]];
}
function pressApply() {
  const r = S.result, P = S.fm.press || {}, Q = pressQs(r); let tr = 0, mo = 0;
  Q.forEach(([, A], qi) => { const a = A[P[qi]]; if (a) { tr += a[1]; mo += a[2]; } });
  r.press = tr; r.morale = mo; const L = opLog(); if (L[0] && L[0].id === r.logId) { L[0].press = tr; L[0].morale = mo + Math.round(S.campD.morale / 5); saveLog(L); }
  if (r.camp) { const C = camp(), d = tr * 2 - (r.pressCamp || 0); C.trust = clamp(C.trust + d, 0, 100); r.pressCamp = tr * 2; r.camp.after = C.trust; saveCamp(C); }
}
/** 작전 간 누적: 함정 수리 · 조종사 피로 · 상부 신뢰도 */
function campUpdate(r) {
  const C = camp(), before = C.trust, rep = [];
  for (const k of Object.keys(C.ships)) { C.ships[k].rep = Math.max(0, (C.ships[k].rep || 0) - 1); if (!C.ships[k].rep) delete C.ships[k]; }
  const MF = S.mf || {};
  for (const g of S.us) if (!civ(g) && g.id !== "u9") for (const x of g.ships) { if (x.subFor) continue; const q = x.hp / x.max; let n = (q <= 0.2 ? 2 : q <= 0.5 ? 1 : 0); if (n) n = Math.max(0, n - (MF.repairCut || 0)); if (n === 1 && MF.autoRepair && Math.random() < 0.3) n = 0; if (n) { C.ships[x.name] = { rep: n }; rep.push([x.name, n, x.hp <= 0]); } }
  for (const u of S.air) { if (u.id === "a9") continue; C.pilots[short(u.name)] = u.flew ? Math.min(100, u.fat || 0) : Math.max(0, (u.fat || 0) - 40); }
  C.trust = clamp(Math.round(C.trust + (r.won ? 10 + (r.stars - 1) * 3 : Math.round((S.ctx.grade <= 2 ? -8 : -15) * (S.mf?.trustLossK || 1))) + S.campD.trust), 0, 100); saveCamp(C);
  r.camp = { before, after: C.trust, rep, pilots: S.air.filter((u) => u.flew && u.id !== "a9").map((u) => [short(u.name), C.pilots[short(u.name)]]) };
}
function logResult(r, score, mvp) {
  if (r.logId) return; r.logId = Date.now(); const L = opLog();
  L.unshift({ id: r.logId, at: new Date().toISOString().slice(0, 10), scen: S.scenK, air: S.isAir, won: r.won, stars: r.stars, score, mvp: mvp?.name || "", concept: S.fm.concept, cmd: S.foeCmdK, morale: Math.round(S.campD.morale / 5), press: 0 }); saveLog(L);
}
function campBar() {
  const C = camp(), t = C.trust, reps = Object.entries(C.ships).filter(([, v]) => v.rep > 0), tired = S.isAir ? S.air.filter((u) => (u.fat || 0) >= 50) : [];
  return `<div class="fm-camp"><div class="cb"><span>상부 신뢰도</span><i class="tb"><em style="width:${t}%" class="${t >= 70 ? "g" : t <= 30 ? "r" : "y"}"></em></i><b>${t}</b><small>${t >= 70 ? "예비 투입 +1 (4회)" : t <= 30 ? "이지스함·급유기 배정 제한" : "70↑ 예비 +1 · 30↓ 핵심 자산 제한"}</small></div>
    <div class="cb"><span>부대 사기</span><em class="mo ${MOR[moraleLv()][1]}">${MOR[moraleLv()][0]}</em><small>${MOR[moraleLv()][2]}</small></div>
    <div class="cb"><span>수리 중</span>${reps.length ? reps.map(([n, v]) => `<em class="rp">${n} ${v.rep}작전 <button data-om="fix:${n}" ${t < 10 ? "disabled" : ""}>긴급 수리 (신뢰도 −${minFx().fixCost})</button></em>`).join("") : `<small>없음</small>`}</div>
    ${S.isAir ? `<div class="cb"><span>조종사 피로</span>${tired.length ? tired.map((u) => `<em class="${u.fat >= 80 ? "r" : "y"}">${short(u.name)} ${u.fat}${u.fat >= 80 ? " 휴식" : ""}</em>`).join("") : `<small>모두 양호 (50↑ 명중 −10% · 80↑ 휴식)</small>`}</div>` : ""}</div>`;
}
// ── 캠페인 「서해 72시간」 ──
const C72K = "steeltide:c72";
const c72 = () => { try { return JSON.parse(localStorage.getItem(C72K)) || { step: 0, res: [] }; } catch { return { step: 0, res: [] }; } };
const saveC72 = (c) => { try { localStorage.setItem(C72K, JSON.stringify(c)); } catch { /* storage blocked */ } };
const C72_DAY = ["1일차 야간", "2일차 오전", "2일차 오후", "3일차 결전"];
/** 다음 작전 후보: [시나리오, 항공 여부] (분기 포함) */
function c72Next(c) {
  const w = c.res.map((x) => x.won);
  if (c.step === 0) return [["night", false]];
  if (c.step === 1) return w[0] ? [["airsup", true]] : [["fog", false]];
  if (c.step === 2) return w[0] && w[1] ? [["sead", true], ["convoy", false]] : [["baeng", true]];
  if (c.step === 3) return [["intercept", false]];
  return [];
}
const c72Mod = (c) => { const n = c.res.filter((x) => x.won).length; return n >= 3 ? "easy" : n <= 1 ? "hard" : "norm"; };
function c72View() {
  const c = c72(), nx = c72Next(c), wins = c.res.filter((x) => x.won).length, done = c.step >= 4;
  const node = (i) => { const r = c.res[i], cur = i === c.step; const lab = r ? `${SCEN[r.scen].ic} ${SCEN[r.scen].n}${r.air ? " ✈" : ""}` : cur ? nx.map(([k]) => SCEN[k].n).join(" / ") : "?";
    return `<div class="c7n ${r ? (r.won ? "w" : "l") : cur ? "cur" : ""}"><span>${C72_DAY[i]}</span><b>${lab}</b><em>${r ? (r.won ? `성공 ${"★".repeat(r.stars || 1)}` : "실패") : cur ? "다음 작전" : ""}</em></div>`; };
  const mod = c72Mod(c), modT = { easy: "3승 — 적 1개 전단 감소 · 예비 +1", norm: "2승 — 기본 난이도", hard: "0~1승 — 적 1개 전단 추가 (절체절명)" }[mod];
  return `<div class="fm-c72"><div class="fm-h">캠페인 「서해 72시간」 <small>4개 작전 연속 — 신뢰도·함정 수리·조종사 피로가 이어집니다</small></div><div class="c7t">${[0, 1, 2, 3].map(node).join('<i class="c7a">›</i>')}</div>
    ${done ? `<div class="fm-card c7d"><b class="${wins >= 3 ? "g" : wins >= 2 ? "y" : "r"}">캠페인 종료 — ${wins}승 ${4 - wins}패</b><small>${wins >= 3 ? "서해 수호 훈장 — 근무평정 대폭 가산" : wins >= 2 ? "작전 완수 — 근무평정 가산" : "고전 끝에 종료"}</small><button class="fm-go" data-om="c72new">새 캠페인 시작</button></div>`
      : `<div class="c7x">${nx.map(([k, air]) => { const sc = SCEN[k]; return `<div class="fm-card fm-scc"><div class="ic">${sc.ic}</div><div class="hd"><b>${c.step === 3 ? "결전 — " : ""}${sc.n}</b><span class="df ${sc.diff === "어려움" ? "r" : "y"}">${air ? "항공 작전" : "작전 지휘"}</span></div><p>${sc.d}</p><div class="kv"><span>승리 조건</span><b>${sc.win}</b></div>${c.step === 3 ? `<div class="kv"><span>전적 보정</span><b class="${mod === "hard" ? "r" : mod === "easy" ? "g" : ""}">${modT}</b></div><div class="kv"><span>참고</span><b>기획서의 '탄도탄 방어'는 다음 차례 — 지금은 해상 차단 결전으로 진행</b></div>` : ""}<button class="fm-go" data-om="c72go:${k}:${air ? 1 : 0}">출격 ›</button></div>`; }).join("")}</div>
        ${c.step > 0 ? `<button class="fm-ghost c7r" data-om="c72new">처음부터 다시</button>` : ""}`}</div>`;
}
function fmPickView() {
  if (S.ctx.c72) { $("#fmTR").innerHTML = `<button class="fm-ghost" data-om="leave">나가기</button>`; $("#fmPick").innerHTML = `<div class="fm-pick c72">${campBar()}${c72View()}</div>`; return; }
  const L = opLog(), m = moraleNow(), best = (k) => Math.max(0, ...L.filter((e) => e.scen === k && e.air === S.isAir).map((e) => (e.won ? e.stars : 0)));
  $("#fmTR").innerHTML = `<button class="fm-ghost" data-om="leave">나가기</button>`;
  $("#fmPick").innerHTML = `<div class="fm-pick">${campBar()}<div class="fm-sc">${Object.entries(SCEN).filter(([, c]) => (S.isAir ? !c.sea : !c.air)).map(([k, c]) => { const b = best(k), n = L.filter((e) => e.scen === k && e.air === S.isAir).length;
    return `<div class="fm-card fm-scc"><div class="ic">${c.ic}</div><div class="hd"><b>${c.n}</b><span class="df ${c.diff === "어려움" ? "r" : "y"}">${c.diff}</span></div><p>${c.d}</p><div class="kv"><span>승리 조건</span><b>${c.win}</b></div><div class="kv"><span>참모 메모</span><b>${c.tip}</b></div><div class="kv"><span>최고 기록</span><b class="y">${"★".repeat(b)}${"☆".repeat(3 - b)} <small>(${n}회 출전)</small></b></div><button class="fm-go" data-om="scen:${k}">이 작전으로 ›</button></div>`; }).join("")}</div>
    <div class="fm-card fm-log"><div class="fm-h">작전 기록 <small>최근 ${Math.min(L.length, 12)}건</small></div><div class="kv"><span>부대 사기</span><b class="${MOR[moraleLv()][1]}">${MOR[moraleLv()][0]} <small>(${m > 0 ? "+" : ""}${m})</small></b></div>${L.length ? L.slice(0, 12).map((e) => `<div class="lg"><span>${e.at.slice(5)}</span><b>${SCEN[e.scen]?.ic || ""} ${SCEN[e.scen]?.n || e.scen}${e.air ? " ✈" : ""}</b><em class="${e.won ? "g" : "r"}">${e.won ? "성공" : "실패"}</em><i>${"★".repeat(e.stars || 0)}</i><small>${e.score ?? "—"}점 · ${CONCEPTS[e.concept]?.n.slice(2) || ""}${e.mvp ? ` · MVP ${e.mvp}` : ""}</small></div>`).join("") : `<small>아직 기록이 없습니다. 첫 작전을 고르십시오.</small>`}</div></div>`;
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
  el.className = "fm"; el.dataset.ph = S.phase;
  el.innerHTML = `<div class="fm-top"><b class="brand">STEEL TIDE</b><span class="fm-title" id="fmTitle"></span><div class="fm-tabs" id="fmTabs"></div><div class="fm-tr" id="fmTR"></div></div>
    <div id="fmPick"></div><div class="fm-body"><aside class="fm-l" id="fmL"></aside><main class="fm-c"><aside class="fm-side" id="fmSide"></aside><div class="fm-map"><canvas id="omCv"></canvas><div id="fmSlots"></div><div id="fmScore"></div><div id="omRep"></div><div id="fmHL"></div><div id="fmIntel"></div></div><div class="fm-bot" id="fmBot"></div></main><aside class="fm-r" id="fmR"></aside></div>
    <div id="fmRes"></div><div id="omRes" hidden></div>`;
  el.style.display = "flex";
  const cv = $("#omCv"); const fit = () => { const c = cv.parentElement.parentElement; if (c && c.clientWidth) { /* the map keeps the chart's aspect; leftover height goes to the panel below */ const side = S.phase === "run" ? $("#fmSide").offsetWidth : 0, w = c.clientWidth - side, hMax = c.clientHeight - (S.phase === "run" ? 118 : 128); c.style.setProperty("--mh", Math.max(220, Math.min(hMax, Math.round((w * H) / W) + 4)) + "px"); }
    const r = cv.parentElement.getBoundingClientRect(); if (!r.width) return; cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio; cv.style.width = r.width + "px"; cv.style.height = r.height + "px"; S.dirty = true; };
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
  if (a.startsWith("scen:")) { setupScen(a.slice(5)); S.phase = "plan"; requestAnimationFrame(() => S.fit()); }
  else if (a === "repick") { S.phase = "pick"; }
  else if (a.startsWith("c72go:")) { const [, k, air] = a.split(":"); S.isAir = air === "1"; S.ctx.c72Mod = c72(); setupScen(k); S.phase = "plan"; requestAnimationFrame(() => S.fit()); }
  else if (a === "c72new") { saveC72({ step: 0, res: [] }); }
  else if (a.startsWith("fix:")) { const C = camp(), n = a.slice(4), fc = minFx().fixCost; if (C.trust >= fc && C.ships[n]) { C.trust -= fc; delete C.ships[n]; saveCamp(C); setupScen(S.scenK); S.phase = "pick"; say(`${n} 긴급 수리 완료 (신뢰도 −10)`, "hit"); } }
  else if (a === "leave") { close(); S.ctx.onLeave?.(); return true; }
  else if (a.startsWith("prs:")) { const [, q, i] = a.split(":"); (F.press ??= {})[q] = +i; pressApply(); }
  else if (a.startsWith("arm:")) { const [, id, k] = a.split(":"); (F.arm ??= {})[id] = k; }
  else if (a.startsWith("cn:")) F.concept = a.slice(3);
  else if (a.startsWith("tab:")) F.tab = a.slice(4);
  else if (a.startsWith("ins:")) { const [, k, v] = a.split(":"); F.ins[k] = k === "salvo" ? +v : v; }
  else if (a.startsWith("rule:")) { const k = a.slice(5); F.rules[k] = !F.rules[k]; }
  else if (a.startsWith("card:")) F.pick = F.pick === a.slice(5) ? null : a.slice(5);
  else if (a.startsWith("slot:")) { if (F.pick) fmAssign(F.pick, a.slice(5)); }
  else if (a.startsWith("unrole:")) { const id = a.slice(7); for (const k of Object.keys(F.roles)) F.roles[k] = F.roles[k].filter((x) => x !== id); }
  else if (a === "fmdef") fmDefault();
  else if (a === "fmgo") { fmApply(); S.phase = "run"; S.paused = false; S.speed = 2; $("#opMap").dataset.ph = "run"; requestAnimationFrame(() => S.fit()); }
  else if (a.startsWith("sh:")) { const k = a.slice(3), cd = (F.cd ??= {}); if (cd[k] > S.t) F.flash = `재사용 대기 ${fmtT(cd[k] - S.t)}`; else { shout(k); cd[k] = S.t + 60 * MOR_CD[S.morLv ?? 0] * (S.mf?.cdK || 1); } }
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
  const F = S.fm, sig = JSON.stringify([S.phase, S.scenK, S.ctx.c72 && localStorage.getItem(C72K), F.press, F.arm, F.tab, F.concept, F.roles, F.ins, F.rules, F.pick, F.res, F.hl && F.hl.at, !!F.half, F.ff, S.speed, S.paused, Math.floor(S.t / 2), S.log[0]?.at, S.log.length, S.evt?.id, F.flash, S.repShow?.done, $("#omCv")?.width]);
  if (sig === S.psig && !S.dirty) return; S.psig = sig; S.dirty = false;
  if (S.evt && !F.hl && S.phase === "run") { const e = S.evt; F.hl = { title: e.t, body: "결정이 필요합니다.", acts: [[e.a[1] + ` — ${e.a[2]}`, () => resolveEvent(e.a[0])], [e.b[1] + ` — ${e.b[2]}`, () => resolveEvent(e.b[0])]], cls: "y", at: S.t, noOk: true }; }
  const el = $("#opMap"); if (el.dataset.ph !== S.phase) { el.dataset.ph = S.phase; requestAnimationFrame(() => S.fit()); }
  $("#fmTabs").innerHTML = (S.phase === "pick" ? [["pick", "작전 선택"]] : S.phase === "plan" ? [["tac", "① 작전 전술"], ["intel", "② 적 정보"]] : S.phase === "run" ? [["run", "③ 작전 진행"]] : [["res", "④ 작전 결과"]]).map(([k, n]) => `<span class="${F.tab === k || S.phase !== "plan" ? "on" : ""}" ${S.phase === "plan" ? `data-om="tab:${k}"` : ""}>${n}</span>`).join("");
  $("#fmTitle").textContent = `${S.ctx.c72 ? "캠페인 「서해 72시간」" : S.isAir ? "항공 작전" : "작전 지휘"} · ${S.phase === "pick" ? (S.ctx.c72 ? "진행 현황" : "작전 선택") : S.scen.n}`;
  if (S.phase === "pick") fmPickView(); else if (S.phase === "plan") fmPlanView(); else if (S.phase === "run") fmRunView(); else fmResultView();
}
const KIND = (id) => fmCards().find((c) => c.id === id);
function fmPlanView() {
  const F = S.fm, E = fmEstimate(), SL = slotsOf();
  $("#fmTR").innerHTML = `${S.ctx.scen ? "" : `<button class="fm-ghost" data-om="repick">‹ 작전 선택</button>`}<button class="fm-ghost" data-om="fmdef">추천 배치로</button><button class="fm-go" data-om="fmgo">작전 개시 ›</button>`;
  const known = S.foe.filter((f) => !f.delay), later = S.foe.filter((f) => f.delay);
  $("#fmL").innerHTML = `<div class="fm-h"><i>1</i>작전 개념</div>${Object.entries(CONCEPTS).map(([k, c]) => `<button class="fm-cn${F.concept === k ? " on" : ""}" data-om="cn:${k}"><b>${c.n}</b><small>${c.d}</small><span>${c.pro.map((x) => `<em class="p">${x}</em>`).join("")}${c.con.map((x) => `<em class="c">${x}</em>`).join("")}</span></button>`).join("")}
    <div class="fm-h"><i>2</i>참모 분석</div><div class="fm-card fm-q"><b class="y">${S.scen.ic} ${S.scen.n}</b> — ${S.scen.win}<br>${S.scen.night || S.convoy ? `<small class="y">⚠ ${S.scen.tip}</small><br>` : ""}정보처장: "상대는 <b>${S.foeCmd.n}</b> 지휘관입니다 — ${S.foeCmd.tip}"<br>${S.foe.length ? `정보처장: "적 수상전단 <b>${S.foe.length}개</b>. ${known.map((f) => f.name).join("·")}은 이미 남하 중이고, ${later.map((f) => `${f.name}은 약 ${Math.round(f.delay / 60)}분 뒤 출항`).join(", ") || "추가 출항 징후는 없습니다"}."` : `정보처장: "적 수상 전력은 없습니다 — 적 요격기 ${S.raidPlan.reduce((a, r) => a + r[1], 0)}기가 ${S.raidPlan.map((r) => fmtT(r[0])).join("·")}에 내려옵니다."`}<br>${S.isAir ? `항공작전과장: "정찰기로 먼저 찾고, 전투기 1개는 CAP, 나머지는 <b>타격대</b>에 두십시오."` : `작전처장: "${S.us.length > 1 ? "<b>종심 방어</b>로 주력을 연평에 두고 타격대로 측면을 치는 것을 권합니다." : "전단이 하나뿐입니다. <b>종심 방어</b>로 연평을 지키고 P-3C로 먼저 찾으십시오."}"`}</div>
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
  $("#fmIntel").innerHTML = F.tab === "intel" ? `<div class="fm-intel"><div class="fm-h">② 적 정보 — 정보처 판단</div><div class="fm-card fm-cmd"><span class="fm-tag">상대 지휘관</span><b>${S.foeCmd.who}</b> — <b class="y">${S.foeCmd.n}</b><small>${S.foeCmd.d}</small><div class="fm-cmdk">${[["접근 속도", S.foeCmd.spd * 50], ["버티는 힘", (1 - S.foeCmd.ret) * 100], ["교전 거리", S.foeCmd.hold * 3], ["은밀성", S.foeCmd.stealth ? 85 : 35]].map(([n, v]) => `<span>${n}</span><i><em style="width:${Math.round(Math.min(100, v))}%"></em></i>`).join("")}</div><small class="g">대응: ${S.foeCmd.tip} (추천 작전 개념: ${CONCEPTS[S.foeCmd.good].n.slice(2)})</small></div><div class="fm-ig">${S.foe.map((f) => `<div class="fm-card"><b>${f.name}</b><small>${f.delay ? `약 ${Math.round(f.delay / 60)}분 뒤 출항 예상` : "남하 중 (위치 일부 확인)"}</small><div>${f.ships.map((x) => `<span class="fm-tag">${x.n}</span>`).join("")}</div><small>대함미사일 ${f.ships.reduce((a, x) => a + x.asm, 0)}발 · 대공 ${f.ships.reduce((a, x) => a + x.sam, 0) > 20 ? "강" : "약"}</small></div>`).join("")}</div>${S.isAir ? `<div class="fm-card" style="margin-top:10px">적 전투기 편대(MiG-29) 출격이 두 차례(약 8분·18분) 예상됩니다 — CAP이 없으면 초계기·급유기가 노려집니다.</div>` : `<div class="fm-card" style="margin-top:10px">미확인 접촉(?) ${S.decoys.length}개 — 기만체일 가능성이 있습니다.${S.scen.night ? " 야간이라 모든 탐지 거리가 약 40% 줄어듭니다." : ""}${S.convoy ? " 적은 수송 선단을 노릴 것으로 판단됩니다." : ""}</div>`}</div>` : "";
  $("#fmBot").innerHTML = `<div class="fm-h"><i>3</i>보유 전력 — 카드를 지도의 역할 칸에 끌어다 놓거나, 카드를 누른 뒤 역할 칸을 누르세요${F.flash ? ` <em class="r">· ${F.flash}</em>` : ""}</div><div class="fm-tray">${fmCards().map((c) => { const r = roleOf(c.id), rn = r && SL.find((x) => x[0] === r)?.[1]; return `<div class="fm-unit${F.pick === c.id ? " pick" : ""}${r ? "" : " free"}" draggable="true" data-card="${c.id}" data-om="card:${c.id}"><span class="ic">${c.ic}</span><span><b>${c.n}</b><small>${c.sub}</small>${c.st ? `<span class="cs">${c.st.map(([a, b]) => `<i>${a} <b>${b}</b></i>`).join("")}</span>` : ""}${c.arm ? `<span class="arm">${Object.entries(ARM).map(([k, a]) => `<button data-om="arm:${c.id}:${k}" class="${c.arm === k ? "on" : ""}">${a.n}</button>`).join("")}</span>` : ""}<em>${rn ? `역할: ${rn}` : "미배치"}</em></span></div>`; }).join("")}</div>`;
  $("#fmScore").innerHTML = ""; $("#fmHL").innerHTML = "";
}
function fitBars() {
  const R = S.fm.roles, n = (s) => (R[s] || []).length;
  return S.isAir ? [["정찰", Math.min(100, n("recon") * 50), "#9be06a"], ["방공", Math.min(100, n("cap") * 60), "#7cc4ff"], ["타격력", Math.min(100, n("strike") * 35), "#ffb35c"], ["지속력", (n("tanker") ? 60 : 20) + (n("reserve") ? 30 : 0), "#d9c7ff"]]
    : [["정찰", Math.min(100, n("front") * 55), "#9be06a"], ["방어", Math.min(100, n("main") * 70 + n("cap") * 25), "#7cc4ff"], ["타격력", Math.min(100, n("strike") * 60 + (S.fm.ins.salvo === 8 ? 20 : 0)), "#ffb35c"], ["예비", Math.min(100, n("reserve") * 60 + 30), "#d9c7ff"]];
}
function fmRunView() {
  const F = S.fm, sunk = S.foe.flatMap((f) => f.ships).filter((s) => s.hp <= 0).length + (S.airKills || 0), lost = S.us.flatMap((g) => g.ships).filter((s) => s.hp <= 0).length + (S.airLost || 0);
  const dom = domNow();
  $("#fmTR").innerHTML = `<div class="fm-spd"><button data-om="pz" class="${S.paused ? "on" : ""}">${S.paused ? "▶" : "⏸"}</button>${[1, 2, 4].map((s) => `<button data-om="sp:${s}" class="${S.speed === s && !F.ff ? "on" : ""}">x${s}</button>`).join("")}<button data-om="ff" class="${F.ff ? "on" : ""}">하이라이트까지 ⏭</button></div><button class="fm-ghost" data-om="quit">작전 중단</button>`;
  $("#fmSlots").innerHTML = ""; $("#fmIntel").innerHTML = ""; $("#fmL").innerHTML = "";
  $("#fmScore").innerHTML = `<div class="fm-score"><div><b class="u">${sunk}</b><small>${S.scenK === "airsup" ? "적기 격추" : "적 격침"}</small></div><div><b>${fmtT(S.t)}</b><small>/ ${fmtT(limitOf())}</small></div><div><b class="f">${lost}</b><small>아군 손실</small></div><div class="dm"><b class="${dom >= 50 ? "y" : "f"}">${dom}%</b><small>작전 우세</small></div></div>`;
  const H = F.hl, Hf = F.half;
  $("#fmHL").innerHTML = Hf ? `<div class="fm-hl y"><span class="tag">15:00 중간 보고 · 일시정지</span><h3>전반 15분 총평 — 수정안을 고르십시오</h3><p>작전 우세 <b>${Hf.ours}%</b> · 탐지된 적 ${Hf.seen}개 · 미탐지 ${Hf.hidden}개 · 남은 대함미사일 ${Hf.ammo}발</p><div class="fm-hopts">${Hf.opts.map(([k, n, d, who]) => `<button data-om="half:${k}"><b>${n}</b><small>${who}: "${d}"</small></button>`).join("")}<button data-om="half:none"><b>현 계획 유지</b><small>지금 지시 그대로 후반을 진행합니다</small></button></div></div>`
    : H && H.dec ? `<div class="fm-hl dec ${H.cls || ""}"><span class="tag">결정 필요 · ${fmtT(H.at)} · 일시정지</span><h3>${H.title}</h3><div class="b">${H.who ? `<small class="who">${H.who} 보고</small>` : ""}${H.body}</div><div class="fm-hopts">${H.acts.map(([n], i) => `<button data-om="hla:${i}">${n}</button>`).join("")}</div></div>`
    : H ? `<div class="fm-hl ${H.cls || ""}"><span class="tag">하이라이트 · ${fmtT(H.at)} · 자동 일시정지</span><h3>${H.title}</h3><div class="b">${H.body}</div><div class="row">${H.noOk ? "" : `<button class="ok" data-om="hlok">계속 ›</button>`}${H.acts.map(([n], i) => `<button data-om="hla:${i}">${n}</button>`).join("")}</div></div>` : "";
  const SH = SHOUTS[S.isAir ? "air" : "sea"], RS = [...RESERVES[S.isAir ? "air" : "sea"], ...(S.mf?.ffx && !S.isAir ? [["ffx", "FFX 호위함 증원", "호위함 2척 합류 (수상함 사업)"]] : []), ...(S.mf?.jsf ? [["jsf", "합동화력함 화력 지원", "탐지된 적 1개 전단에 8발 (수상함 사업)"]] : [])];
  $("#fmBot").innerHTML = `<div class="fm-h"><i>2</i>지휘 지시 — 누르면 즉시 전 부대에 하달${S.convoy ? ` <small>· 선단 ${alive(S.convoy).length}/3척 · 연평도까지 ${S.convoy.arrived ? "도착" : Math.round(d2(S.convoy, YEONPYEONG) * 1.41) + "km"}</small>` : ""}</div><div class="fm-shouts">${SH.map(([k, n, d]) => `<button data-om="sh:${k}" class="${(k === "emcon" && F.shout.emcon) || (k === "aaw" && F.shout.aaw) || F.lastShout === k ? "on" : ""}" ${F.cd?.[k] > S.t ? "disabled" : ""}><b>${n}</b><small>${F.cd?.[k] > S.t ? `재사용 ${fmtT(F.cd[k] - S.t)}` : d}</small></button>`).join("")}</div>`;
  $("#fmSide").innerHTML = `<div class="fm-resv"><div class="fm-h"><i>3</i>예비 투입 <small>남은 ${F.res}회</small></div><div class="dots">${Array.from({ length: F.res0 || 3 }, (_, i) => `<em class="${i < (F.res0 || 3) - F.res ? "u" : ""}"></em>`).join("")}</div><div class="rl">${RS.map(([k, n, d]) => `<button data-om="rs:${k}" ${F.res <= 0 || F.resUsed.includes(k) ? "disabled" : ""}><b>${n}</b><small>${F.resUsed.includes(k) ? "투입함" : d}</small></button>`).join("")}</div></div>
    ${S.isAir ? `<div class="fm-wings"><div class="fm-h">편대 상태 <small>연료 · 피로</small></div>${S.air.map((u) => { const st = u.st === "lost" ? ["손실", "x"] : u.st === "rest" ? ["휴식", "x"] : u.refuelTo > S.t ? ["급유 중", "g"] : u.st === "rearm" ? [`재무장 ${fmtT(u.cd)}`, "y"] : u.st === "rtb" ? ["귀환", "y"] : u.st === "station" ? ["체공", "g"] : u.st === "out" ? ["이동", "b"] : u.wait2 ? ["2교대 대기", ""] : ["대기", ""], fp = Math.round((u.fuel / fmax(u)) * 100);
      return `<div class="wg ${st[1] === "x" ? "dead" : ""}"><span class="ic">${AIR_IC[u.t]}</span><b>${short(u.name).replace(/^제/, "")}</b><em class="bd ${st[1]}">${st[0]}</em><i class="fb"><em style="width:${u.st === "lost" ? 0 : fp}%" class="${fp < 30 ? "lo" : ""}"></em></i><small>${u.fat ? `피로 ${u.fat}` : ""}</small></div>`; }).join("")}${S.scenK === "airsup" ? `<div class="kv"><span>격추</span><b class="g">${S.airKills} / 10기</b></div><div class="kv"><span>CAP 공백</span><b class="${S.gap > 120 ? "r" : "y"}">${fmtT(S.gap)} / 3:00</b></div>` : ""}</div>` : ""}
    <div class="fm-card fm-opp"><div class="fm-h">상대 지휘관</div><b>${S.foeCmd.n}</b><small>${S.foeCmd.tip}</small></div>`;
  const fs = F.fs, pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "—");
  const ammo = S.us.reduce((a, g) => a + alive(g).reduce((s, x) => s + x.asm, 0), 0) + S.air.filter((u) => u.st !== "lost").reduce((a, u) => a + u.asm, 0), ammo0 = S.us.reduce((a, g) => a + g.ships.reduce((s, x) => s + x.asm0, 0), 0) + S.air.reduce((a, u) => a + AIR_T[u.t].asm, 0);
  $("#fmR").innerHTML = `<div class="fm-feed"><div class="fm-h"><i>4</i>상황 중계</div>${S.log.map((l) => `<div class="ln ${l.cls}${/\[교전\]|격침|격추|요격 성공/.test(l.t) ? " big" : ""}"><span>${fmtT(l.at)}</span>${l.t}</div>`).join("")}</div>
    <div class="fm-stats"><div class="fm-h"><i>5</i>작전 통계 <small>아군 · 적</small></div>${[["미사일 발사", fs.us.n, fs.foe.n], ["명중률", pct(fs.us.hit, fs.us.n), pct(fs.foe.hit, fs.foe.n)], ["상대 미사일 요격", pct(fs.foe.icpt, fs.foe.n), pct(fs.us.icpt, fs.us.n)], ["적 전단 위치 확인", `${S.foe.filter((f) => f.everSeen).length} / ${S.foe.length}`, "—"], ["남은 대함미사일", pct(ammo, ammo0), "?"]].map(([n, a, b]) => `<div class="st"><b class="u">${a}</b><span>${n}</span><b class="f">${b}</b></div>`).join("")}${F.halfDone ? "" : `<div class="fm-card fm-half"><b>15:00 중간 보고</b> 예정 — 참모가 수정안 3개를 올립니다</div>`}</div>`;
}
function rateAll() {
  const F = S.fm, L = [];
  const add = (key, name, sub, lostX) => { const s = stOf(key); let r = 6 + s.hits * 0.35 + s.kills * 0.7 + s.icpt * 0.12 + s.det * 0.5 + s.air * 0.6 - s.dmg / 45 - (lostX ? 1.2 : 0); r = clamp(Math.round(r * 10) / 10, 4.5, 10); L.push({ key, name, sub, r, s }); };
  for (const g of S.us.filter((x) => !civ(x))) { const s = stOf(g.id), lostN = g.ships.filter((x) => x.hp <= 0).length; add(g.id, g.name, `${s.kills ? `격침 ${s.kills} · ` : ""}명중 ${s.hits} · 요격 ${s.icpt}${lostN ? ` · 손실 ${lostN}척` : ""}`, lostN === g.ships.length); }
  for (const u of S.air) { const s = stOf(u.id); add(u.id, short(u.name), `${s.air ? `적기 요격 ${s.air} · ` : ""}${s.det ? `탐지 ${s.det} · ` : ""}명중 ${s.hits}${u.st === "lost" ? " · 손실" : ""}`, u.st === "lost"); }
  for (const sp of S.sup) if (sp.id) { const s = stOf(sp.id); add(sp.id, { p3c: "P-3C 해상초계기", cap: "공군 CAP", fa50: "비상대기 FA-50", battery: "해안 지대함 포대" }[sp.id] || sp.id, `${s.det ? `탐지 ${s.det} · ` : ""}명중 ${s.hits}`, false); }
  if (S.isleBat) { const s = stOf("isle"); add("isle", "연평도 지대함", `명중 ${s.hits}`, false); }
  return L.sort((a, b) => b.r - a.r);
}
function fmResultView() {
  const r = S.result; if (!r) return; const F = S.fm, L = rateAll(), mvp = L[0], lostShips = S.us.flatMap((g) => g.ships).filter((s) => s.hp <= 0).length;
  const goals = S.scenK === "airsup" ? [[!(S.airLost > 0), "아군기 손실 0"], [S.gap <= 60, `CAP 공백 1분 이내 (${fmtT(S.gap)})`], [S.airKills >= 14, `적기 14기 이상 격추 (${S.airKills}기)`]] : [[lostShips === 0 && !(S.airLost > 0), "아군 손실 0"], [S.shots <= 24, `미사일 24발 이내 (${S.shots}발 사용)`], [F.firstKill != null && F.firstKill < 900, `15분 안에 첫 격침${F.firstKill != null ? ` (${fmtT(F.firstKill)})` : ""}`]];
  const score = clamp(Math.round((r.won ? 58 : 22) + r.stars * 7 + goals.filter((g) => g[0]).length * 5 + Math.min(8, r.sunk * 1.5) - lostShips * 4 - (S.airLost || 0) * 2), 0, 100); r.score = score; r.mvp = mvp?.name; logResult(r, score, mvp);
  const P = F.press || {}, PQ = pressQs(r), pr = `<div class="fm-card fm-press"><div class="fm-h"><i>5</i>작전 후 기자회견 <small>답변에 따라 신뢰도·사기가 바뀝니다</small></div>${PQ.map(([q, A], qi) => `<div class="pq"><b>${q}</b>${A.map(([t, tr, mo], ai) => `<button data-om="prs:${qi}:${ai}" class="${P[qi] === ai ? "on" : ""}" ${P[qi] != null && P[qi] !== ai ? "disabled" : ""}>${t}${P[qi] === ai ? ` <em>${tr ? `신뢰도 ${tr > 0 ? "+" : ""}${tr}` : ""}${tr && mo ? " · " : ""}${mo ? `사기 ${mo > 0 ? "+" : ""}${mo}` : ""}${!tr && !mo ? "변화 없음" : ""}</em>` : ""}</button>`).join("")}</div>`).join("")}${Object.keys(P).length === PQ.length ? `<div class="kv"><span>근무평정 반영</span><b class="${r.press > 0 ? "g" : r.press < 0 ? "r" : ""}">${r.press > 0 ? "+" : ""}${r.press}점</b></div>` : ""}</div>`;
  const q = r.won ? [[`해군작전사령관: "${CONCEPTS[F.concept].n.slice(2)} 판단이 적중했다.${S.shots > 24 ? " 다만 미사일 소모가 많았다." : ""}"`, "신뢰도 +" + Math.max(2, Math.round(score / 14)), "g"], [`국방일보: "${S.scen.n} ${S.isAir ? "항공 지원 " : ""}성공 — ${mvp ? mvp.name + " 활약 빛나" : "적 남하 저지"}"`, "", ""]]
    : [[`해군작전사령관: "${r.why}. 작전 계획을 재검토하라."`, "신뢰도 −4", "r"], [`국방일보: "${S.scen.n} ${S.isAir ? "항공 작전 " : ""}차질 — 군 당국 경위 조사"`, "", "r"]];
  if (S.foe.some((f) => f.everSeen && f.delay && !f.ships.some((x) => x.hp <= 0) && !f.gone)) q.push(['합참: "늦게 출항한 적 전단 대응이 늦었다. 정찰 배치를 재검토할 것."', "지적 1", "r"]);
  $("#fmTR").innerHTML = `<button class="fm-go" data-om="done">항구로 귀환 ›</button>`;
  $("#fmRes").innerHTML = `<div class="fm-res"><div class="col"><div class="fm-card big"><small>작전 결과</small><div class="rt ${r.won ? "w" : "l"}">${r.won ? "작전 성공" : "작전 실패"}</div><div class="stars">${"★".repeat(r.stars)}${"☆".repeat(3 - r.stars)}</div><small>${r.why}</small></div>
      <div class="fm-card"><div class="fm-h"><i>1</i>보조 목표</div>${goals.map(([ok, n]) => `<div class="kv"><span>${ok ? "✓" : "✗"} ${n}</span><b class="${ok ? "g" : "r"}">${ok ? "+5" : "—"}</b></div>`).join("")}</div>
      <div class="fm-card"><div class="fm-h">핵심 통계</div>${[["명중률", F.fs.us.n ? Math.round((F.fs.us.hit / F.fs.us.n) * 100) + "%" : "—"], ["적 미사일 요격률", F.fs.foe.n ? Math.round((F.fs.foe.icpt / F.fs.foe.n) * 100) + "%" : "—"], S.scenK === "airsup" ? ["격추 / 적기", `${S.airKills} / 16`] : ["격침 / 적 함정", `${r.sunk} / ${r.foes}`], ["예비 투입", `${(F.res0 || 3) - F.res}회`]].map(([a, b]) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`).join("")}</div>${pr}</div>
    <div class="col"><div class="fm-card"><div class="fm-h"><i>2</i>${S.isAir ? "편대·함정" : "전단·지원"} 평점</div>${L.map((x, i) => `<div class="rt"><span>${x.name}<small>${x.sub}</small></span><b class="sc ${x.r >= 7.5 ? "a" : x.r >= 6.5 ? "b" : "c"}">${x.r.toFixed(1)}</b><em>${i === 0 ? "⭐MVP" : ""}</em></div>`).join("")}</div>
      ${mvp ? `<div class="fm-card mvp"><div class="fm-h">⭐ 최우수 — ${mvp.name}</div><small>${mvp.sub} · 평점 ${mvp.r.toFixed(1)}${mvp.r >= 8 ? " → 표창 상신" : ""}</small></div>` : ""}</div>
    <div class="col"><div class="fm-card"><div class="fm-h"><i>3</i>상부·언론 반응</div>${q.map(([t, b, c]) => `<div class="fm-q2 ${c}">${t}${b ? ` <b class="${c}">${b}</b>` : ""}</div>`).join("")}</div>
      <div class="fm-card"><div class="fm-h"><i>4</i>지휘관 평가</div><div class="kv"><span>작전 평가 점수</span><b class="${score >= 70 ? "g" : score >= 45 ? "y" : "r"}">${score} / 100</b></div><div class="kv"><span>진급 심사 반영</span><b>${score >= 75 ? "+1 우수" : score >= 50 ? "보통" : "−1"}</b></div><div class="kv"><span>부대 사기 (다음 작전)</span><b class="${MOR[moraleLv()][1]}">${MOR[moraleLv()][0]}</b></div></div>
      ${r.c72 ? `<div class="fm-card fm-cst"><div class="fm-h">캠페인 「서해 72시간」 ${Math.min(4, r.c72.step)}/4</div>${r.c72.done ? `<div class="kv"><span>캠페인 종료</span><b class="${r.c72.wins >= 3 ? "g" : "y"}">${r.c72.wins}승 — 근무평정 +${r.c72bonus}</b></div>` : `<div class="kv"><span>다음 작전</span><b class="y">${r.c72.next}</b></div><small>항구로 귀환한 뒤 캠페인 메뉴에서 이어서 진행</small>`}</div>` : ""}
      ${r.camp ? `<div class="fm-card fm-cst"><div class="fm-h"><i>6</i>다음 작전에 이어지는 것</div><div class="kv"><span>상부 신뢰도</span><b class="${r.camp.after >= r.camp.before ? "g" : "r"}">${r.camp.before} → ${r.camp.after}</b></div><small>${r.camp.after >= 70 ? "70↑ — 다음 작전 예비 투입 4회" : r.camp.after <= 30 ? "30↓ — 이지스함·급유기 배정 제한" : "보통 — 특별한 혜택·제한 없음"}</small>${r.camp.rep.map(([n, k, dead]) => `<div class="kv"><span>${n}</span><b class="r">${dead ? "침몰 — " : ""}수리 ${k}작전</b></div>`).join("")}${r.camp.pilots.map(([n, f]) => `<div class="kv"><span>${n} 조종사</span><b class="${f >= 80 ? "r" : f >= 50 ? "y" : ""}">피로 ${f}${f >= 80 ? " · 다음 작전 휴식" : f >= 50 ? " · 명중 −10%" : ""}</b></div>`).join("")}${S.fm.rescued ? `<div class="kv"><span>조종사 구조</span><b class="g">사기 +15</b></div>` : ""}${S.fm.leftPilot ? `<div class="kv"><span>조종사 미구조</span><b class="r">사기 −15</b></div>` : ""}</div>` : ""}
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
  if (S.scen?.night) { x.fillStyle = "rgba(3,6,22,.42)"; x.fillRect(0, 0, cv.width, cv.height); }
  // sectors
  for (const q of SECTORS) {
    const st = secState(q), [a, b] = P(q.x0, q.y0), w = (q.x1 - q.x0) * k, h = (q.y1 - q.y0) * k, sel = S.sel && (S.sel.sec === q.id), hov = S.hover === q;
    const qg = S.scenK === "airsup" ? q.goal : secOf(GOAL) === q;
    x.fillStyle = hov ? "rgba(242,202,92,.16)" : st.hot ? "rgba(255,107,94,.09)" : qg ? "rgba(77,232,212,.05)" : "rgba(0,0,0,0)"; x.fillRect(a, b, w, h);
    x.strokeStyle = hov ? COL.warn : sel ? COL.us : qg ? "rgba(77,232,212,.5)" : "rgba(170,210,225,.22)"; x.lineWidth = (hov || sel ? 2.5 : 1.2) * dpr; x.strokeRect(a, b, w, h);
    const lb = q.ly ? P(q.x0, q.ly)[1] : b, lab = q.n + (qg ? (S.convoy ? " ★선단 목적지" : S.scenK === "airsup" ? " ★방공 구역" : S.scenK === "sead" ? " ★제압 목표" : S.scenK === "baeng" ? " ★투하 구역" : " ★방어 목표") : ""); x.font = F(14, 700); x.fillStyle = "rgba(10,20,26,.8)"; x.fillRect(a + 6 * dpr, lb + 4 * dpr, x.measureText(lab).width + 10 * dpr, 22 * dpr); x.fillStyle = st.hot ? "#ff9b8a" : q.goal ? COL.us : "#cfe"; x.fillText(lab, a + 11 * dpr, lb + 20 * dpr);
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
  for (const dc of S.decoys) if (!dc.gone) { x.fillStyle = "#ff8a7a"; x.font = F(13, 800); x.fillText("?", ...P(dc.x - 0.6, dc.y + 0.8)); x.strokeStyle = COL.foe; x.setLineDash([3 * dpr, 3 * dpr]); x.beginPath(); x.arc(...P(dc.x, dc.y), 2.6 * k, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); }
  // friendly ship groups
  for (const g of S.us) {
    if (!alive(g).length) continue; const sel = g === S.sel;
    if (g.path.length && (sel || S.layers.path)) { x.strokeStyle = sel ? COL.us : "rgba(124,196,255,.6)"; x.setLineDash([8 * dpr, 6 * dpr]); x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(...P(g.x, g.y)); for (const q of g.path) x.lineTo(...P(q.x, q.y)); x.stroke(); x.setLineDash([]); }
    if (sel || S.layers.det) { x.strokeStyle = "rgba(77,232,212,.35)"; x.setLineDash([4 * dpr, 6 * dpr]); x.beginPath(); x.arc(...P(g.x, g.y), detR(g) * k, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); }
    if (S.layers.rng) { x.strokeStyle = "rgba(124,196,255,.35)"; x.beginPath(); x.arc(...P(g.x, g.y), 30 * k, 0, Math.PI * 2); x.stroke(); }
    if (civ(g) && !g.arrived) { x.strokeStyle = "rgba(255,224,102,.55)"; x.setLineDash([5 * dpr, 6 * dpr]); x.lineWidth = 1.6 * dpr; x.beginPath(); x.moveTo(...P(g.x, g.y)); for (const q of g.path) x.lineTo(...P(q.x, q.y)); x.stroke(); x.setLineDash([]); }
    token(x, P(g.x, g.y), g.name.replace("제", ""), civ(g) ? "#ffe066" : sel ? COL.us : COL.ally, strength(g), dpr);
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
