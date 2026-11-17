// Officer career: promotion perks (replace the old shipyard upgrades), pay steps (호봉) within a rank,
// the service record (약력) and the flagship assigned by rank. Kept apart from the economy profile.

export const PERKS = {
  reload: { n: "장전·발사 숙련", c: "화력", d: "주포·어뢰 재장전 −8%/단계", max: 3 },
  fc: { n: "사격통제 정밀화", c: "명중", d: "탄착 산포 −15% · 적 요격률 −4% /단계", max: 3 },
  hull: { n: "선체 격벽·손상통제", c: "생존", d: "기함·아군 최대 내구도 +10%/단계", max: 3 },
  engine: { n: "기관 출력 극대화", c: "기동", d: "최고 속력 +5%/단계", max: 3 },
  ad: { n: "방공망·기만 숙련", c: "방어", d: "아군 요격 성공률 +8%/단계", max: 3 },
  air: { n: "함재기 출격 정비", c: "항공", d: "전투기 재무장 시간 −10%/단계", max: 3 },
  repair: { n: "수리반·응급정비", c: "지속", d: "수리반 회복량 +15%/단계", max: 3 },
  alpha: { n: "초탄 일제사격", c: "상급 전술", d: "전투 첫 60초 화력 +20% · 재장전 −4%", max: 1, tier: 1 },
  screen: { n: "호위 진형 숙달", c: "상급 전술", d: "아군 호위함 받는 피해 −8% · 수리반 +1", max: 1, tier: 1 },
  shield: { n: "기동전단 방패", c: "제독 특기", d: "아군 함대 전체 받는 피해 −10%", max: 1, tier: 2 },
  strike: { n: "합동 항공타격", c: "제독 특기", d: "전투기 +1기 · 재무장 −20%", max: 1, tier: 2 },
};
const FAVOR = { sea: ["hull", "engine", "repair"], ops: ["reload", "fc"], int: ["ad", "fc"], log: ["reload", "repair"], air: ["air", "ad"] };

/** Flagship (WWII) the navy assigns by rank, 0 소위 … */
export const SHIP_BY_GRADE = [[0, "fletcher"], [3, "cleveland"], [4, "baltimore"], [5, "colorado"], [6, "northcarolina"], [7, "iowa"]];
export const shipsFor = (grade) => SHIP_BY_GRADE.filter(([g]) => grade >= g).map(([, id]) => id);

const KEY = "steeltide:career";
export const career = (() => { let c = null; try { c = JSON.parse(localStorage.getItem(KEY) || "null"); } catch {} return c && c.perks ? c : null; })() || { perks: {}, picks: 0, log: [], ship: null, seen: null };
export const saveCareer = () => { try { localStorage.setItem(KEY, JSON.stringify(career)); } catch {} };

/** First visit after this update: one pick per promotion already earned, and a single enlistment line. */
export function careerInit(grade, title, branchName) {
  if (career.seen != null) return;
  career.seen = grade; career.picks = grade;
  career.log.push({ g: grade, t: title, b: branchName, d: new Date().toISOString().slice(0, 10), why: grade ? "기존 경력 승계" : "임관" });
  saveCareer();
}

const tierOf = (g) => (g >= 6 ? 2 : g >= 3 ? 1 : 0);
/** Three distinct choices for a promotion to grade g; the first favours the branch. */
export function rollPerks(g, branch, rnd = Math.random) {
  const ok = (k) => (PERKS[k].tier || 0) <= tierOf(g) && (career.perks[k] || 0) < PERKS[k].max;
  const pool = Object.keys(PERKS).filter(ok), out = [];
  const fav = (FAVOR[branch] || []).filter(ok);
  if (fav.length) out.push(fav[Math.floor(rnd() * fav.length)]);
  const special = pool.filter((k) => (PERKS[k].tier || 0) === tierOf(g) && tierOf(g) > 0 && !out.includes(k));
  if (special.length) out.push(special[Math.floor(rnd() * special.length)]);
  while (out.length < 3) { const rest = pool.filter((k) => !out.includes(k)); if (!rest.length) break; out.push(rest[Math.floor(rnd() * rest.length)]); }
  return out;
}
export function takePerk(k) {
  if (!PERKS[k] || career.picks <= 0) return false;
  career.perks[k] = Math.min(PERKS[k].max, (career.perks[k] || 0) + 1); career.picks--;
  const last = career.log[career.log.length - 1]; if (last && !last.perk) last.perk = `${PERKS[k].n}${PERKS[k].max > 1 ? ` ${career.perks[k]}단계` : ""}`;
  saveCareer(); return true;
}
export function logPromotion(e) { career.log.push({ ...e, d: new Date().toISOString().slice(0, 10) }); saveCareer(); }

/** What the perks do in battle. */
export function perkMods() {
  const p = (k) => career.perks[k] || 0;
  return {
    upg: { engine: p("engine"), fc: p("fc"), gun: p("reload"), armor: 0 }, /* fed to the ship like the old yard levels */
    hpK: 1 + 0.1 * p("hull"), icptK: 1 + 0.08 * p("ad"), penK: 1 - 0.04 * p("fc"), rearmK: (1 - 0.1 * p("air")) * (p("strike") ? 0.8 : 1),
    repairK: 1 + 0.15 * p("repair"), jets: p("strike"), alpha: !!p("alpha"), escortK: p("screen") ? 0.92 : 1, fleetK: p("shield") ? 0.9 : 1, repairN: p("screen") ? 1 : 0,
  };
}

/** 호봉: steps inside a rank by XP share toward the next one (위관 2, 영관 3, 장성 4; 원수 +1 every 3000 XP). */
export function payStep(xp, g, XP) {
  if (g >= XP.length - 1) return { step: 1 + Math.floor(Math.max(0, xp - XP[g]) / 3000), max: null };
  const n = g <= 2 ? 2 : g <= 5 ? 3 : 4, f = (xp - XP[g]) / (XP[g + 1] - XP[g]);
  return { step: Math.min(n, 1 + Math.floor(f * n)), max: n };
}

/** Decorations: names of Korean military decorations, ribbon colours are the game's own (not official patterns). */
export const MEDALS = {
  commend: { n: "국방부장관 표창", d: "첫 승리", rb: ["#1d4e9e", "#ffffff", "#1d4e9e"] },
  service: { n: "보국포장", d: "누적 10승", rb: ["#2a6e3f", "#e8d35a", "#2a6e3f"] },
  inheon: { n: "인헌무공훈장", d: "한 전투에서 적함 3척 이상 격침", rb: ["#c8202c", "#ffffff", "#2a6e3f", "#ffffff", "#c8202c"] },
  hwarang: { n: "화랑무공훈장", d: "선체 50% 이하에서 역전승", rb: ["#7a1f2b", "#e8d35a", "#7a1f2b"] },
  chungmu: { n: "충무무공훈장", d: "선체 손상 없이 승리", rb: ["#0d3b66", "#e8d35a", "#ffffff", "#e8d35a", "#0d3b66"] },
  samil: { n: "보국훈장 삼일장", d: "영관(소령) 진급", rb: ["#5a3d8a", "#ffffff", "#5a3d8a"] },
  cheonsu: { n: "보국훈장 천수장", d: "대령 진급", rb: ["#5a3d8a", "#e8d35a", "#5a3d8a"] },
  eulji: { n: "을지무공훈장", d: "장성(준장) 진급", rb: ["#c8202c", "#e8d35a", "#c8202c", "#e8d35a", "#c8202c"] },
  taeguk: { n: "태극무공훈장", d: "원수 진급", rb: ["#c8202c", "#1d4e9e", "#ffffff", "#1d4e9e", "#c8202c"] },
  modern: { n: "현대전 참전기장", d: "현대전 첫 출격", rb: ["#3a7ca5", "#ffffff", "#3a7ca5"] },
  pacific: { n: "태평양 전역 참전기장", d: "2차대전 첫 출격", rb: ["#b38b2e", "#ffffff", "#b38b2e"] },
};
/** Award what this battle (and promotion) earned; returns the new medal keys. */
export function awardMedals(o) {
  career.medals ||= {}; const got = [], give = (k) => { if (!career.medals[k]) { career.medals[k] = new Date().toISOString().slice(0, 10); got.push(k); } };
  if (o.flight !== false) give(o.modern ? "modern" : "pacific");
  if (o.won) { give("commend"); if (o.wins >= 10) give("service"); if (o.sunk >= 3) give("inheon"); if (o.lowHp) give("hwarang"); if (o.hp >= 0.995) give("chungmu"); }
  if (o.grade >= 3) give("samil"); if (o.grade >= 5) give("cheonsu"); if (o.grade >= 6) give("eulji"); if (o.grade >= 10) give("taeguk");
  if (got.length) saveCareer(); return got;
}
