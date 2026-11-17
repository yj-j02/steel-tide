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

// ri = rank index (0 소위 … 10 원수, in-game rank, not the person's exact historical rank)
// sk = skill 1-10 for the role's stat; f = portrait [skin, hair, age 1-3, moustache, glasses, jaw, fem, beard]
// Everyone here is a historical figure who is no longer living.
export const STAFF = [
  { id: "c1", r: "cos", nm: "체스터 니미츠", nat: "us", ri: 10, sk: 10, tr: "vet", f: [0, 5, 3, null, false, 1.0] },
  { id: "c2", r: "cos", nm: "알레이 버크", nat: "us", ri: 9, sk: 8, tr: "bold", f: [1, 2, 2, null, false, 1.08] },
  { id: "c3", r: "cos", nm: "정걸", nat: "kr", ri: 7, sk: 7, tr: "vet", f: [3, 5, 3, "full", false, 1.02, false, true] },
  { id: "c4", r: "cos", nm: "장보고", nat: "kr", ri: 7, sk: 7, tr: "bold", f: [4, 0, 2, "full", false, 1.1, false, true] },
  { id: "c5", r: "cos", nm: "이억기", nat: "kr", ri: 4, sk: 6, tr: "calm", f: [3, 0, 1, "trim", false, 0.98] },
  { id: "o1", r: "ops", nm: "이순신", nat: "kr", ri: 9, sk: 10, tr: "calm", f: [4, 4, 3, "full", false, 1.04, false, true] },
  { id: "o2", r: "ops", nm: "윌리엄 홀시", nat: "us", ri: 10, sk: 8, tr: "bold", f: [1, 4, 3, null, false, 1.12] },
  { id: "o3", r: "ops", nm: "레이먼드 스프루언스", nat: "us", ri: 9, sk: 9, tr: "calm", f: [0, 3, 2, null, false, 0.96] },
  { id: "o4", r: "ops", nm: "토머스 킨케이드", nat: "us", ri: 8, sk: 7, tr: "vet", f: [2, 2, 2, null, false, 1.02] },
  { id: "o5", r: "ops", nm: "정운", nat: "kr", ri: 5, sk: 7, tr: "bold", f: [4, 0, 1, "trim", false, 1.1] },
  { id: "o6", r: "ops", nm: "어영담", nat: "kr", ri: 3, sk: 5, tr: "green", f: [3, 0, 2, "full", false, 0.98] },
  { id: "i1", r: "int", nm: "에드윈 레이턴", nat: "us", ri: 7, sk: 8, tr: "vet", f: [0, 1, 1, null, true, 0.98] },
  { id: "i2", r: "int", nm: "조지프 로슈포르", nat: "us", ri: 5, sk: 9, tr: "calm", f: [1, 3, 2, null, true, 0.94] },
  { id: "i3", r: "int", nm: "정경달", nat: "kr", ri: 4, sk: 6, tr: "calm", f: [3, 0, 2, "full", true, 0.96, false, true] },
  { id: "i4", r: "int", nm: "송희립", nat: "kr", ri: 3, sk: 4, tr: "green", f: [4, 0, 1, null, false, 1.0] },
  { id: "l1", r: "log", nm: "하이먼 리코버", nat: "us", ri: 9, sk: 9, tr: "fast", f: [2, 5, 3, null, false, 0.9] },
  { id: "l2", r: "log", nm: "벤 모렐", nat: "us", ri: 9, sk: 8, tr: "vet", f: [0, 3, 2, null, true, 1.06] },
  { id: "l3", r: "log", nm: "최무선", nat: "kr", ri: 6, sk: 7, tr: "vet", f: [3, 5, 3, "full", false, 1.0, false, true] },
  { id: "l4", r: "log", nm: "나대용", nat: "kr", ri: 5, sk: 8, tr: "calm", f: [4, 0, 2, "trim", false, 1.02] },
  { id: "l5", r: "log", nm: "이봉수", nat: "kr", ri: 3, sk: 4, tr: "green", f: [3, 0, 1, null, false, 1.04] },
  { id: "a1", r: "air", nm: "마크 미처", nat: "us", ri: 9, sk: 9, tr: "vet", f: [1, 5, 3, null, false, 0.94] },
  { id: "a2", r: "air", nm: "지미 둘리틀", nat: "us", ri: 9, sk: 9, tr: "bold", f: [0, 2, 2, "trim", false, 1.0] },
  { id: "a3", r: "air", nm: "이근석", nat: "kr", ri: 6, sk: 7, tr: "bold", f: [4, 0, 1, null, false, 1.06] },
  { id: "a4", r: "air", nm: "김영환", nat: "kr", ri: 6, sk: 6, tr: "calm", f: [3, 0, 1, null, true, 1.0] },
  { id: "a5", r: "air", nm: "권기옥", nat: "kr", ri: 5, sk: 7, tr: "vet", f: [3, 0, 2, null, false, 0.92, true] },
  { id: "a6", r: "air", nm: "안창남", nat: "kr", ri: 3, sk: 5, tr: "green", f: [4, 0, 1, null, false, 0.98] },
];
export const RANKS = ["소위", "중위", "대위", "소령", "중령", "대령", "준장", "소장", "중장", "대장", "원수"];
for (const o of STAFF) o.rk = RANKS[o.ri];
/** The fleet commander above you until you make 중장 yourself. */
export const FLEET_CDR = { id: "fc", nm: "손원일", nat: "kr", ri: 8, f: [3, 0, 2, null, true, 1.0] };
FLEET_CDR.rk = RANKS[FLEET_CDR.ri];
/** Branch (보직) chosen as 소위; the career ladder and a personal bonus follow it. Titles 0 소위 … 7 소장 per branch, 8+ shared. */
export const BRANCHES = {
  sea: { n: "함정", d: "함정 지휘 계통 — 함장을 거쳐 기동부대 지휘관으로", bonus: "수리반 +1 (대위부터)", t: ["갑판사관", "작전관", "부장", "구축함 함장", "구축대 사령", "구축전대 사령", "전단장", "기동부대 사령관"] },
  ops: { n: "작전", d: "작전처 — 방책 수립과 교전 지휘", bonus: "화력 +", t: ["작전처 견습장교", "작전장교", "선임작전장교", "작전과장", "작전차장", "작전처장", "작전참모부장", "작전본부장"] },
  int: { n: "정보", d: "정보처 — 적 정보 분석과 조기경보", bonus: "받는 피해 −, 요격 +", t: ["정보처 견습장교", "정보분석장교", "선임정보장교", "정보과장", "정보차장", "정보처장", "정보참모부장", "정보본부장"] },
  log: { n: "군수", d: "군수처 — 탄약·정비·보급", bonus: "재장전 −", t: ["군수처 견습장교", "군수장교", "선임군수장교", "군수과장", "군수차장", "군수처장", "군수참모부장", "군수본부장"] },
  air: { n: "항공", d: "항공처 — 함재기·항공 작전", bonus: "전투기 + (중위부터)", t: ["항공처 견습장교", "항공작전장교", "선임항공장교", "항공과장", "항공차장", "항공처장", "항공참모부장", "항공본부장"] },
};
const TOP_POSTS = ["함대사령관", "작전사령관", "해군 원수"];
export const careerTitle = (grade, br = staff.branch) => grade >= 8 ? TOP_POSTS[Math.min(2, grade - 8)] : (BRANCHES[br] || BRANCHES.sea).t[grade];
export function setBranch(k) { if (BRANCHES[k]) { staff.branch = k; saveStaff(); } }
/** Which posts you may fill grows with rank; who you may bring in is capped at four grades above you. */
export const ROLE_UNLOCK = { ops: 0, int: 2, log: 3, air: 4, cos: 5 };
export const canFill = (role, grade) => grade >= ROLE_UNLOCK[role];
export const canAppoint = (o, grade) => canFill(o.r, grade) && o.ri <= grade + 4;

const KEY = "steeltide:staff";
export const staff = (() => {
  let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch {}
  if (!s || !s.a) s = { a: {}, x: {} };
  for (const R of STAFF_ROLES) if (!s.a[R.k]) s.a[R.k] = STAFF.filter((o) => o.r === R.k).sort((x, y) => x.ri - y.ri)[0].id; /* start with the most junior candidate */
  return s;
})();
export const saveStaff = () => { try { localStorage.setItem(KEY, JSON.stringify(staff)); } catch {} };
export const officer = (id) => STAFF.find((o) => o.id === id);
export const skillOf = (o) => Math.min(10, o.sk + Math.floor((staff.x[o.id] || 0) / 3)); /* +1 per three battles served */
export function appoint(role, id) { if (officer(id)?.r === role) { staff.a[role] = id; saveStaff(); } }

/** What the current staff does to a modern battle. */
export function staffMods(grade = 0) {
  const at = (k) => { const o = officer(staff.a[k]); return o ? { o, s: skillOf(o), t: o.tr } : null; };
  const cos = at("cos"), amp = 1 + ((cos?.s ?? 3) - 5) * 0.05 * (cos?.t === "vet" ? 1.25 : 1);
  const eff = (x) => { if (!x) return -2; const k = x.t === "vet" ? 1.25 : x.t === "green" ? 0.8 : 1; return (x.s - 5) * k * (x === cos ? 1 : amp); };
  const ops = at("ops"), int = at("int"), log = at("log"), air = at("air"), all = [cos, ops, int, log, air];
  let outK = 1 + eff(ops) * 0.05, inK = 1 - eff(int) * 0.04, reloadK = 1 - eff(log) * 0.03, repairN = 3 + (eff(log) >= 2 ? 1 : 0) - (eff(log) <= -2 ? 1 : 0), jets = Math.max(-1, Math.round(eff(air) / 2.5));
  for (const x of all) { if (!x) continue; if (x.t === "bold") { outK += 0.05; inK += 0.04; } if (x.t === "calm") { inK -= 0.05; outK -= 0.02; } if (x.t === "fast") { reloadK -= 0.04; repairN -= 1; } }
  { const b = staff.branch, g = 0.02 + grade * 0.004; /* your own branch expertise grows with rank */
    if (b === "ops") outK += g; if (b === "int") { inK -= g; } if (b === "log") reloadK -= g; if (b === "air" && grade >= 1) jets += 1; if (b === "sea" && grade >= 2) repairN += 1; }
  const icptK0 = staff.branch === "int" ? 0.02 + grade * 0.004 : 0;
  const icptK = clamp01(1 + eff(int) * 0.05 + icptK0, 0.75, 1.35), penK = clamp01(1 - eff(ops) * 0.05, 0.7, 1.25); /* our SAM kill chance; enemy SAM kill chance against our missiles */
  return { outK: Math.max(0.7, outK), inK: Math.max(0.6, inK), reloadK: Math.max(0.7, reloadK), repairN: Math.max(1, repairN), jets, icptK, penK };
}

/** After a modern battle every appointed officer gains service (green ones twice as fast). */
export function staffServe(won) { for (const R of STAFF_ROLES) { const o = officer(staff.a[R.k]); if (o) staff.x[o.id] = (staff.x[o.id] || 0) + (won ? 2 : 1) * (o.tr === "green" ? 2 : 1); } saveStaff(); }
