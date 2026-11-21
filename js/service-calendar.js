import { career } from "./career.js";

const monthsPerRank = [24, 24, 48, 36, 36, 36, 24, 24, 24, 24, 24];
const juniorMonths = [0, 0, 2, 4, 7, 9, 12, 15, 18, 21];

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

export function calendarLabel(total) {
  const season = ["겨울", "봄", "여름", "가을"][Math.floor((total % 12) / 3)];
  return `복무 ${Math.floor(total / 12) + 1}년차 · ${season}`;
}
