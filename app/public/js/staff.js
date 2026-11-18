// Fleet headquarters staff (modern era). Appointments shape every modern battle, auto battles included,
// through a handful of multipliers the battle code already exposes: hull damage in/out, gun reload, repair crews, jets.

const clamp01 = (v, a, b) => Math.min(b, Math.max(a, v));

export const STAFF_ROLES = [
  { k: "cos", n: "참모장", stat: "지휘", d: "참모진 조율 — 다른 참모 효과를 키움" },
  { k: "ops", n: "작전과장", stat: "전술", d: "방책·교전 지휘 — 화력, 미사일 돌파율" },
  { k: "int", n: "정보참모", stat: "분석", d: "적 정보·조기경보 — 요격 성공률, 받는 피해" },
  { k: "log", n: "군수참모", stat: "군수", d: "탄약·정비 — 재장전 속도, 수리반" },
  { k: "air", n: "항공참모", stat: "항공", d: "항공 작전 — 출격 가능 전투기" },
];

export const TRAITS = {
  bold: { n: "공격적", d: "화력 +5% · 받는 피해 +4%" },
  calm: { n: "신중함", d: "받는 피해 −5% · 화력 −2%" },
  vet: { n: "노련함", d: "주 능력 효과 ×1.25" },
  fast: { n: "속전속결", d: "재장전 −4% · 수리반 −1" },
  green: { n: "신진", d: "효과 ×0.8 · 경험 2배" },
};

// ri = in-game rank of the post (참모장 소장, 처장 대령) — every candidate for a post holds that post's rank, skills differ
// sk = skill 1-10 for the role's stat; f = portrait [skin, hair, age 1-3, moustache, glasses, jaw, fem, beard]
// Everyone here is a historical figure who is no longer living.
export const STAFF = [
  { id: "c1", r: "cos", nm: "체스터 니미츠", nat: "us", ri: 7, sk: 10, tr: "vet", f: [0, 5, 3, null, false, 1.0] },
  { id: "c2", r: "cos", nm: "알레이 버크", nat: "us", ri: 7, sk: 8, tr: "bold", f: [1, 2, 2, null, false, 1.08] },
  { id: "c3", r: "cos", nm: "정걸", nat: "kr", ri: 7, sk: 7, tr: "vet", f: [3, 5, 3, "full", false, 1.02, false, true] },
  { id: "c4", r: "cos", nm: "장보고", nat: "kr", ri: 7, sk: 7, tr: "bold", f: [4, 0, 2, "full", false, 1.1, false, true] },
  { id: "c5", r: "cos", nm: "이억기", nat: "kr", ri: 7, sk: 6, tr: "calm", f: [3, 0, 1, "trim", false, 0.98] },
  { id: "o1", r: "ops", nm: "이순신", nat: "kr", ri: 5, sk: 10, tr: "calm", f: [4, 4, 3, "full", false, 1.04, false, true] },
  { id: "o2", r: "ops", nm: "윌리엄 홀시", nat: "us", ri: 5, sk: 8, tr: "bold", f: [1, 4, 3, null, false, 1.12] },
  { id: "o3", r: "ops", nm: "레이먼드 스프루언스", nat: "us", ri: 5, sk: 9, tr: "calm", f: [0, 3, 2, null, false, 0.96] },
  { id: "o4", r: "ops", nm: "토머스 킨케이드", nat: "us", ri: 5, sk: 7, tr: "vet", f: [2, 2, 2, null, false, 1.02] },
  { id: "o5", r: "ops", nm: "정운", nat: "kr", ri: 5, sk: 7, tr: "bold", f: [4, 0, 1, "trim", false, 1.1] },
  { id: "o6", r: "ops", nm: "어영담", nat: "kr", ri: 5, sk: 5, tr: "green", f: [3, 0, 2, "full", false, 0.98] },
  { id: "i1", r: "int", nm: "에드윈 레이턴", nat: "us", ri: 5, sk: 8, tr: "vet", f: [0, 1, 1, null, true, 0.98] },
  { id: "i2", r: "int", nm: "조지프 로슈포르", nat: "us", ri: 5, sk: 9, tr: "calm", f: [1, 3, 2, null, true, 0.94] },
  { id: "i3", r: "int", nm: "정경달", nat: "kr", ri: 5, sk: 6, tr: "calm", f: [3, 0, 2, "full", true, 0.96, false, true] },
  { id: "i4", r: "int", nm: "송희립", nat: "kr", ri: 5, sk: 4, tr: "green", f: [4, 0, 1, null, false, 1.0] },
  { id: "l1", r: "log", nm: "하이먼 리코버", nat: "us", ri: 5, sk: 9, tr: "fast", f: [2, 5, 3, null, false, 0.9] },
  { id: "l2", r: "log", nm: "벤 모렐", nat: "us", ri: 5, sk: 8, tr: "vet", f: [0, 3, 2, null, true, 1.06] },
  { id: "l3", r: "log", nm: "최무선", nat: "kr", ri: 5, sk: 7, tr: "vet", f: [3, 5, 3, "full", false, 1.0, false, true] },
  { id: "l4", r: "log", nm: "나대용", nat: "kr", ri: 5, sk: 8, tr: "calm", f: [4, 0, 2, "trim", false, 1.02] },
  { id: "l5", r: "log", nm: "이봉수", nat: "kr", ri: 5, sk: 4, tr: "green", f: [3, 0, 1, null, false, 1.04] },
  { id: "a1", r: "air", nm: "마크 미처", nat: "us", ri: 5, sk: 9, tr: "vet", f: [1, 5, 3, null, false, 0.94] },
  { id: "a2", r: "air", nm: "지미 둘리틀", nat: "us", ri: 5, sk: 9, tr: "bold", f: [0, 2, 2, "trim", false, 1.0] },
  { id: "a3", r: "air", nm: "이근석", nat: "kr", ri: 5, sk: 7, tr: "bold", f: [4, 0, 1, null, false, 1.06] },
  { id: "a4", r: "air", nm: "김영환", nat: "kr", ri: 5, sk: 6, tr: "calm", f: [3, 0, 1, null, true, 1.0] },
  { id: "a5", r: "air", nm: "권기옥", nat: "kr", ri: 5, sk: 7, tr: "vet", f: [3, 0, 2, null, false, 0.92, true] },
  { id: "a6", r: "air", nm: "안창남", nat: "kr", ri: 5, sk: 5, tr: "green", f: [4, 0, 1, null, false, 0.98] },
];
export const RANKS = ["소위", "중위", "대위", "소령", "중령", "대령", "준장", "소장", "중장", "대장", "원수"];
for (const o of STAFF) o.rk = RANKS[o.ri];
/** The operations commander (해군작전사령관) above you until you make 중장 yourself. */
export const FLEET_CDR = { id: "fc", nm: "손원일", nat: "kr", ri: 8, f: [3, 0, 2, null, true, 1.0] };
FLEET_CDR.rk = RANKS[FLEET_CDR.ri];
/** Branch (보직) chosen as 소위; the career ladder (a title for every rank, 소위 … 원수) and a personal bonus follow it. */
export const BRANCHES = {
  sea: { n: "함정", d: "수상함 조함·포술과 해상 전술기동 — 함장을 거쳐 전투단·기동부대 지휘로", bonus: "수리반 +1 (대위부터)", t: ["갑판사관", "포술관", "초계함 부장", "호위함 부장", "구축함 함장", "구축함전대장", "해상전투단장", "제2함대사령관", "해군작전사령관", "해군참모총장", "해군원수"] },
  ops: { n: "작전", d: "함대 기동계획과 화력 투사·합동 타격 작전을 총괄하는 참모 계통", bonus: "화력 + (계급이 오를수록 증가)", t: ["작전보좌관", "작전상황장교", "선임작전장교", "작전계획과장", "작전참모차장", "작전참모처장", "기동전단장", "기동함대사령관", "합동참모차장", "합동참모의장", "해군원수"] },
  int: { n: "정보", d: "적 표적 조기탐지·전자전과 대공·대미사일 방어 판단을 맡는 정보 계통", bonus: "받는 피해 −, 아군 요격 성공률 + (계급이 오를수록 증가)", t: ["정보분석담당", "해양정보장교", "선임정보장교", "정보분석과장", "정보참모차장", "정보참모처장", "해작사 해양작전본부장", "해군작전사령부 부사령관", "국방정보본부장", "해군참모총장", "해군원수"] },
  log: { n: "군수", d: "탄약·미사일 재보급, 함정 정비와 지속지원을 책임지는 군수 계통", bonus: "함포 재장전 시간 − (계급이 오를수록 증가)", t: ["군수계획담당", "정비보급장교", "선임군수장교", "군수계획과장", "군수참모차장", "군수참모처장", "해군본부 처장 (군수)", "해군본부 군수참모부장", "해군참모차장", "해군참모총장", "해군원수"] },
  air: { n: "항공", d: "함재 전투기·초계기 출격 통제와 해상 항공타격을 지휘하는 항공 계통", bonus: "전투기 +1 (중위부터)", t: ["항공운항담당", "함재항공장교", "편대작전장교", "항공작전과장", "항공전대 부전대장", "항공전대장", "항공전단장", "항공사령관", "합참 군사지원본부장", "해군참모총장", "해군원수"] },
};
export const careerTitle = (grade, br = staff.branch) => (BRANCHES[br] || BRANCHES.sea).t[Math.max(0, Math.min(10, grade))];
export function setBranch(k) { if (BRANCHES[k]) { staff.branch = k; saveStaff(); } }
/** Your own staff follows the size of what you command, and is always junior to you:
 *  위관 — a ship's department (부사관), 영관 — a ship / squadron staff (위관), 준장·소장 — a task group staff (영관),
 *  중장 and up — the fleet headquarters (처장 대령, 참모장 소장: the historical figures above). */
export const ECH = [
  { u: "함정 부서", g: [0, 2], rk: "부사관", t: { cos: "부서 선임부사관", ops: "전탐 부사관", int: "통신 부사관", log: "보급 부사관", air: "항공정비 부사관" } },
  { u: "함정·전대 참모부", g: [3, 5], rk: "위관", t: { cos: "부장", ops: "작전관", int: "정보관", log: "보급관", air: "항공관" } },
  { u: "전투단·기동부대 참모부", g: [6, 7], rk: "영관", t: { cos: "참모장", ops: "작전참모", int: "정보참모", log: "군수참모", air: "항공참모" } },
  { u: "해군작전사령부", g: [8, 10], rk: "장성·영관", t: { cos: "참모장", ops: "작전처장", int: "정보처장", log: "군수처장", air: "항공처장" } },
];
export const echOf = (grade) => (grade <= 2 ? 0 : grade <= 5 ? 1 : grade <= 7 ? 2 : 3);
export const roleTitle = (k, grade) => ECH[echOf(grade)].t[k];
/* fictional junior candidates for the three smaller echelons (names are made up) */
const NCO = ["하사", "중사", "상사", "원사"], SUR = "김이박최정강조윤장임한오서신권황안송류홍", GIV = ["태호", "정민", "도현", "승원", "우석", "민혁", "현수", "재석", "기훈", "성택", "동욱", "세훈", "지원", "우진", "혁준", "민규", "성우", "재현", "현철", "상민"];
const GEN = [];
{ let n = 0; const tr = ["vet", "calm", "bold", "fast", "green"];
  for (let e = 0; e < 3; e++) for (const R of ["cos", "ops", "int", "log", "air"]) for (let i = 0; i < 4; i++) {
    const h = (e * 131 + R.charCodeAt(0) * 17 + R.charCodeAt(1) * 7 + i * 29) >>> 0, sk = 3 + ((h >> 2) % 6), nm = SUR[n % 20] + GIV[(3 * n + Math.floor(n / 20)) % 20]; /* unique per candidate */
    const ri = e === 0 ? -1 : e === 1 ? 1 + (i % 2) : (R === "cos" ? 5 : 3 + (i % 3));
    GEN.push({ id: `g${e}${R}${i}`, r: R, e, nm, nat: "kr", ri, rk: e === 0 ? NCO[1 + (i % 3)] : RANKS[ri], sk, tr: tr[(h >> 4) % 5], f: [3 + (i % 2), i % 2 ? 0 : 1, 1 + (e > 0 ? 1 : 0) + (i === 3 ? 1 : 0) > 3 ? 3 : 1 + (e > 0 ? 1 : 0), e === 2 && i === 0 ? "trim" : null, i === 2, 0.96 + (i % 3) * 0.05] }); n++;
  } }
export const canFill = () => true;
export const POST_RANK = { cos: 7, ops: 5, int: 5, log: 5, air: 5 };
/** Candidates for your own staff at this grade: always junior to you. */
export const candidates = (role, grade) => { const e = echOf(grade); return e === 3 ? STAFF.filter((o) => o.r === role && o.ri < grade) : GEN.filter((o) => o.r === role && o.e === e && o.ri < grade); };
export const canAppoint = (o, grade) => candidates(o.r, grade).includes(o); /* admin too: the rank rule is never waived */
/** You yourself hold a department head post when your branch and rank match it. */
export const holds = () => false; /* your own staff is always a smaller unit's juniors, so you never fill one of its seats yourself */

const KEY = "steeltide:staff";
export const staff = (() => {
  let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch {}
  if (!s || !s.a) s = { a: {}, x: {} };
  s.byE ||= {};
  return s;
})();
export const saveStaff = () => { try { localStorage.setItem(KEY, JSON.stringify(staff)); } catch {} };
export const officer = (id) => STAFF.find((o) => o.id === id) || GEN.find((o) => o.id === id);
/** Switch the appointment set to the echelon of this grade (each echelon keeps its own staff); empty posts get the least able candidate. */
export function staffFor(grade) {
  const e = echOf(grade);
  if (staff.e !== e) { if (staff.e != null) staff.byE[staff.e] = { ...staff.a }; staff.a = { ...(staff.byE[e] || {}) }; staff.e = e; }
  let ch = false; for (const R of STAFF_ROLES) { const ok = candidates(R.k, grade); if (!ok.length) continue; if (!ok.some((o) => o.id === staff.a[R.k])) { staff.a[R.k] = ok.slice().sort((x, y) => x.sk - y.sk)[0].id; ch = true; } }
  if (ch || staff.byE[e] !== staff.a) saveStaff(); return staff.a;
}
export const skillOf = (o) => Math.min(10, o.sk + Math.floor((staff.x[o.id] || 0) / 3)); /* +1 per three battles served */
export function appoint(role, id) { if (officer(id)?.r === role) { staff.a[role] = id; saveStaff(); } }

/** What the current staff does to a modern battle. */
export function staffMods(grade = 0, branch = staff.branch) {
  staffFor(grade);
  const at = (k) => { if (holds(k, grade, branch)) return { o: null, s: 7, t: null }; const o = officer(staff.a[k]); return o ? { o, s: skillOf(o), t: o.tr } : null; };
  const cos = at("cos"), amp = 1 + ((cos?.s ?? 3) - 5) * 0.05 * (cos?.t === "vet" ? 1.25 : 1);
  const eff = (x) => { if (!x) return -2; const k = x.t === "vet" ? 1.25 : x.t === "green" ? 0.8 : 1; return (x.s - 5) * k * (x === cos ? 1 : amp); };
  const ops = at("ops"), int = at("int"), log = at("log"), air = at("air"), all = [cos, ops, int, log, air];
  let outK = 1 + eff(ops) * 0.05, inK = 1 - eff(int) * 0.04, reloadK = 1 - eff(log) * 0.03, repairN = 3 + (eff(log) >= 2 ? 1 : 0) - (eff(log) <= -2 ? 1 : 0), jets = Math.max(-1, Math.round(eff(air) / 2.5));
  for (const x of all) { if (!x) continue; if (x.t === "bold") { outK += 0.05; inK += 0.04; } if (x.t === "calm") { inK -= 0.05; outK -= 0.02; } if (x.t === "fast") { reloadK -= 0.04; repairN -= 1; } }
  { const b = branch, g = 0.02 + grade * 0.004; /* your own branch expertise grows with rank */
    if (b === "ops") outK += g; if (b === "int") { inK -= g; } if (b === "log") reloadK -= g; if (b === "air" && grade >= 1) jets += 1; if (b === "sea" && grade >= 2) repairN += 1; }
  const icptK0 = branch === "int" ? 0.02 + grade * 0.004 : 0;
  const icptK = clamp01(1 + eff(int) * 0.05 + icptK0, 0.75, 1.35), penK = clamp01(1 - eff(ops) * 0.05, 0.7, 1.25); /* our SAM kill chance; enemy SAM kill chance against our missiles */
  return { outK: Math.max(0.7, outK), inK: Math.max(0.6, inK), reloadK: Math.max(0.7, reloadK), repairN: Math.max(1, repairN), jets, icptK, penK };
}

/** After a modern battle every appointed officer gains service (green ones twice as fast). */
export function staffServe(won) { for (const R of STAFF_ROLES) { const o = officer(staff.a[R.k]); if (o) staff.x[o.id] = (staff.x[o.id] || 0) + (won ? 2 : 1) * (o.tr === "green" ? 2 : 1); } saveStaff(); }

/** Every flag-officer post a naval officer can hold, with the chart column it sits in and the branch whose
 *  evaluation weights it uses (public reporting; ranks and names shift with reorganisations). */
export const FLAG_POSTS = [
  { g: 9, t: "해군참모총장", c: "cmd", b: "sea" }, { g: 9, t: "합동참모의장", c: "jcs", b: "ops" },
  { g: 8, t: "해군작전사령관", c: "sea", b: "sea" }, { g: 8, t: "해군참모차장", c: "cmd", b: "log" }, { g: 8, t: "해군사관학교장", c: "cmd", b: "log" },
  { g: 8, t: "합동참모차장", c: "jcs", b: "ops" }, { g: 8, t: "합참 전략기획본부장", c: "jcs", b: "ops" }, { g: 8, t: "합참 군사지원본부장", c: "jcs", b: "air" }, { g: 8, t: "국방정보본부장", c: "int", b: "int" },
  { g: 7, t: "제1함대사령관", c: "sea", b: "sea" }, { g: 7, t: "제2함대사령관", c: "sea", b: "sea" }, { g: 7, t: "제3함대사령관", c: "sea", b: "sea" }, { g: 7, t: "잠수함사령관", c: "sea", b: "sea" },
  { g: 7, t: "기동함대사령관", c: "ops", b: "ops" }, { g: 7, t: "해군작전사령부 부사령관", c: "int", b: "int" }, { g: 7, t: "해군교육사령관", c: "cmd", b: "log" }, { g: 7, t: "해군본부 기획관리참모부장", c: "cmd", b: "ops" },
  { g: 7, t: "해군본부 군수참모부장", c: "log", b: "log" }, { g: 7, t: "항공사령관", c: "air", b: "air" },
  { g: 6, t: "해상전투단장", c: "sea", b: "sea" }, { g: 6, t: "잠수함전단장", c: "sea", b: "sea" }, { g: 6, t: "기동전단장", c: "ops", b: "ops" }, { g: 6, t: "해작사 해양작전본부장", c: "int", b: "int" },
  { g: 6, t: "해군본부 처장 (군수)", c: "log", b: "log" }, { g: 6, t: "항공전단장", c: "air", b: "air" },
];
