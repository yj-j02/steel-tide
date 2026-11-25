import { career } from "./career.js";

// Realistic average time-in-grade (months) matched to KR/US officer promotion ages (23 O-1 -> 24 O-2 -> 26 O-3 -> 33 O-4 -> 39 O-5 -> 45 O-6 -> 49 O-7 -> 52 O-8 -> 55 O-9 -> 58 O-10)
const monthsPerRank = [12, 30, 78, 72, 72, 48, 30, 30, 27, 36, 36]; /* 장성: 10주 ≈ 2년 3개월~2년 6개월 (실제 장성 진급 간격 2~3년) */
const juniorMonths = [0, 0, 1, 2, 3, 5, 6, 7, 9, 10];

export function rankMonths(grade, steps) {
  if (+grade === 0 && steps < juniorMonths.length) return juniorMonths[steps];
  return Math.floor(steps * (monthsPerRank[grade] ?? 24) / 10);
}

export function serviceDuration(months) {
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return [years ? `${years}년` : "", remainder ? `${remainder}개월` : ""].filter(Boolean).join(" ") || "0개월";
}

export const serviceTurn = (record = career) =>
  Object.values(record.rankWeeks ?? {}).reduce((sum, count) => sum + count, 1);

export function careerMonths(turn = 1, rankWeeks = career.rankWeeks ?? {}) {
  let total = 0;
  let counted = 0;
  for (const [grade, steps] of Object.entries(rankWeeks)) {
    total += rankMonths(grade, steps);
    counted += steps;
  }
  return total + rankMonths(0, Math.max(0, turn - 1 - counted));
}

export function careerDate(turn = 1, rankWeeks = career.rankWeeks ?? {}) {
  return calendarLabel(careerMonths(turn, rankWeeks));
}

export const COMMISSIONING_AGE = 23;
export const careerAge = (total) => COMMISSIONING_AGE + Math.floor(Math.max(0, total) / 12);

export function calendarLabel(total) {
  const years = Math.floor(Math.max(0, total) / 12);
  const season = ["겨울", "봄", "여름", "가을"][Math.floor((Math.max(0, total) % 12) / 3)];
  return `복무 ${years + 1}년차 (${COMMISSIONING_AGE + years}세) · ${season}`;
}
