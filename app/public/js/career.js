import { careerDate, serviceTurn } from "./service-calendar.js";
import { careerStorage } from "./characters.js";
// Officer career: pay steps (호봉) within a rank, service record (약력), medals and flagship assignment.

const KEY = "steeltide:career";
export const SAVE_VERSION = 2;
export function migrateCareerSave(raw) {
  const c = raw && typeof raw === "object" && Array.isArray(raw.log) ? raw : { log: [], ship: null, seen: null };
  c.medals = c.medals && typeof c.medals === "object" ? c.medals : {};
  c.medalHistory = c.medalHistory && typeof c.medalHistory === "object" ? c.medalHistory : {};
  c.evals = c.evals && typeof c.evals === "object" ? c.evals : {};
  c.rankWeeks = c.rankWeeks && typeof c.rankWeeks === "object" ? c.rankWeeks : {};
  c.boardHistory = Array.isArray(c.boardHistory) ? c.boardHistory : [];
  c.boardWaits = Array.isArray(c.boardWaits) ? c.boardWaits : [];
  c.crisisWins = c.crisisWins && typeof c.crisisWins === "object" ? c.crisisWins : {};
  c.tours = c.tours && typeof c.tours === "object" ? c.tours : {};
  if (c.warVictory === undefined) c.warVictory = null;
  c.saveVersion = SAVE_VERSION;
  return c;
}
export const career = (() => { let c = null; try { c = JSON.parse(careerStorage.getItem(KEY) || "null"); } catch {} return migrateCareerSave(c); })();
export const saveCareer = () => { try { career.saveVersion = SAVE_VERSION; careerStorage.setItem(KEY, JSON.stringify(career)); } catch {} };

/** First visit: record a single enlistment line. */
export function careerInit(grade, title, branchName) {
  if (career.seen != null) return;
  career.seen = grade;
  career.log.push({ serviceDate: careerDate(), turn: serviceTurn(), g: grade, t: title, b: branchName, d: new Date().toISOString().slice(0, 10), why: grade ? "기존 경력 승계" : "임관" });
  saveCareer();
}

export function logPromotion(e) { career.log.push({ serviceDate: careerDate(), turn: serviceTurn(), ...e, d: new Date().toISOString().slice(0, 10) }); saveCareer(); }

/** Neutral combat modifiers (kept for 3D battle compatibility). */
export function perkMods() {
  return {
    upg: { engine: 0, fc: 0, gun: 0, armor: 0 },
    hpK: 1, icptK: 1, penK: 1, rearmK: 1,
    repairK: 1, jets: 0, alpha: false, escortK: 1, fleetK: 1, repairN: 0,
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
  commend: { n: "국방부장관 표창", d: "첫 임무 완수 (작전 승리 또는 평정 S)", rb: ["#1d4e9e", "#ffffff", "#1d4e9e"] },
  service: { n: "보국포장", d: "누적 10회 작전 승 또는 우수 평정 15회", rb: ["#2a6e3f", "#e8d35a", "#2a6e3f"] },
  inheon: { n: "인헌무공훈장", d: "위기 작전 완승 또는 한 전투 3표적 격파", rb: ["#c8202c", "#ffffff", "#2a6e3f", "#ffffff", "#c8202c"] },
  hwarang: { n: "화랑무공훈장", d: "악조건(사기 50↓ 또는 선체 50%↓) 극복", rb: ["#7a1f2b", "#e8d35a", "#7a1f2b"] },
  chungmu: { n: "충무무공훈장", d: "완벽 임무 (평정 93+ 또는 무손실 승리)", rb: ["#0d3b66", "#e8d35a", "#ffffff", "#e8d35a", "#0d3b66"] },
  samil: { n: "보국훈장 삼일장", d: "영관(소령) 진급", rb: ["#5a3d8a", "#ffffff", "#5a3d8a"] },
  cheonsu: { n: "보국훈장 천수장", d: "대령 진급", rb: ["#5a3d8a", "#e8d35a", "#5a3d8a"] },
  eulji: { n: "을지무공훈장", d: "장성(준장) 진급", rb: ["#c8202c", "#e8d35a", "#c8202c", "#e8d35a", "#c8202c"] },
  taeguk: { n: "태극무공훈장", d: "원수(5성) 특별진급", rb: ["#c8202c", "#1d4e9e", "#ffffff", "#1d4e9e", "#c8202c"] },
  modern: { n: "합동작전 참전기장", d: "첫 위기 작전 또는 실전 출격", rb: ["#3a7ca5", "#ffffff", "#3a7ca5"] },
};
/** Official U.S. Armed Forces decorations & ribbon colors (matching the 10 career milestones). */
export const US_MEDALS = {
  commend: { n: "Joint Service Commendation Medal", d: "첫 임무 완수 (작전 승리 또는 평정 S)", rb: ["#1f5c3a", "#ffffff", "#66a3d2", "#ffffff", "#1f5c3a"] },
  service: { n: "Meritorious Service Medal (MSM)", d: "누적 10회 작전 승 또는 우수 평정 15회", rb: ["#8e1b3d", "#ffffff", "#8e1b3d", "#ffffff", "#8e1b3d"] },
  inheon: { n: "Bronze Star Medal", d: "위기 작전 완승 또는 한 전투 3표적 격파", rb: ["#ffffff", "#b8202c", "#ffffff", "#1b3b82", "#ffffff", "#b8202c", "#ffffff"] },
  hwarang: { n: "Purple Heart", d: "악조건(사기 50↓ 또는 선체 50%↓) 극복", rb: ["#ffffff", "#5a2a82", "#5a2a82", "#5a2a82", "#ffffff"] },
  chungmu: { n: "Silver Star", d: "완벽 임무 (평정 93+ 또는 무손실 승리)", rb: ["#1b3b82", "#ffffff", "#1b3b82", "#ffffff", "#c8202c", "#ffffff", "#1b3b82", "#ffffff", "#1b3b82"] },
  samil: { n: "Legion of Merit (LOM)", d: "영관(O-4) 진급", rb: ["#ffffff", "#9c1c3e", "#9c1c3e", "#9c1c3e", "#ffffff"] },
  cheonsu: { n: "Defense Superior Service Medal", d: "대령(O-6) 진급", rb: ["#6ea8d8", "#1b3b82", "#e8c448", "#c8202c", "#e8c448", "#1b3b82", "#6ea8d8"] },
  eulji: { n: "Distinguished Service Medal", d: "장성(O-7) 진급", rb: ["#1b3b82", "#ffffff", "#c8202c", "#ffffff", "#1b3b82"] },
  taeguk: { n: "Medal of Honor", d: "원수(5성) 특별진급", rb: ["#6aa6d8", "#ffffff", "#6aa6d8", "#ffffff", "#6aa6d8"] },
  modern: { n: "Indo-Pacific Campaign Medal", d: "첫 위기 작전 또는 실전 출격", rb: ["#1b4f8a", "#e8c448", "#c8202c", "#e8c448", "#1b4f8a"] },
};
/** Award what this battle/duty/promotion earned; returns the new medal keys. */
export function awardMedals(o = {}) {
  career.medals ||= {}; const got = [], give = (k) => { if (!career.medals[k]) { career.medals[k] = new Date().toISOString().slice(0, 10); (career.medalHistory ??= {})[k] = {
    date: careerDate(o.turn), turn: o.turn ?? serviceTurn(), source: o.source,
  }; got.push(k); } };
  if (o.flight !== false && (o.battle || o.crisis)) give("modern");
  if (o.won || (o.score || 0) >= 85) give("commend");
  if ((o.wins || 0) >= 10 || (o.goodEvals || 0) >= 15) give("service");
  if (o.won && ((o.sunk || 0) >= 3 || o.crisis)) give("inheon");
  if ((o.won && o.lowHp) || ((o.score || 0) >= 85 && (o.morale ?? 100) <= 50)) give("hwarang");
  if ((o.won && (o.hp || 0) >= 0.995) || (o.score || 0) >= 93) give("chungmu");
  if ((o.grade || 0) >= 3) give("samil"); if ((o.grade || 0) >= 5) give("cheonsu"); if ((o.grade || 0) >= 6) give("eulji"); if ((o.grade || 0) >= 10) give("taeguk");
  if (got.length) saveCareer(); return got;
}
