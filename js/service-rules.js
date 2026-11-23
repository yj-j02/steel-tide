import { career, saveCareer } from "./career.js";
import { careerDate, careerMonths, rankMonths, serviceDuration } from "./service-calendar.js";

const YEAR = 12;
const commissioningAge = 23;
const koreanService = [15, 15, 15, 24, 32, 35];
const koreanAge = [43, 43, 43, 50, 53, 56, 58, 59, 61, 63];
const flagYears = { 6: 6, 7: 6, 8: 4 };
const koreaLaw = "https://www.law.go.kr/LSW/lsInfoP.do?ancNo=21857&efYd=20261002&lsiSeq=290773";
const usaLaw = section => `https://uscode.house.gov/us/usc/t10/s${section}/`;

// Game scenario: regular officers with an active-duty career beginning at commissioning.
export function commissionRoutes(us, branch, service) {
  const flight = branch === "plt" || branch === "mar";
  if (us) {
    return flight
      ? [{id:"jet", title:"사관학교 · 고정익 제트 조종", years:8}]
      : [{id:"academy", title:"사관학교 · 일반 현역 약정", years:5}];
  }
  const standard = [
    {id:"academy", title:"사관학교 · 장기복무 (진급 우대)", years:10},
    {id:"short", title:"학사장교·사관후보생 · 단기복무 (진급 난이도 ↑↑)", years:4},
  ];
  if (service === "army") standard.push({id:"army3", title:"육군3사관학교 · 단기복무 (진급 난이도 ↑)", years:6});
  if (flight) standard.unshift(
    {id:"aviationAcademy", title:"해·공군 사관학교 · 비회전익 조종 (진급 우대)", years:15},
    {id:"aviationOther", title:"학사·기타 임관 · 비회전익 조종 (진급 난이도 ↑↑)", years:13},
  );
  return branch === "plt" ? standard.slice(0, 2) : standard;
}

export function contractFor(route) {
  const short = route.id === "short" || route.id === "army3";
  return { id:route.id, title:route.title, obligation:route.years * YEAR, initialObligation:route.years * YEAR, short };
}

export function serviceStatus({us, grade, turn, service, branch, rep = 0, average = 0, record = career}) {
  const elapsed = careerMonths(turn, record.rankWeeks);
  const inGrade = rankMonths(grade, record.rankWeeks?.[grade] ?? 0);
  const rawContract = record.serviceContract ?? contractFor(commissionRoutes(us, branch, service)[0]);
  const contract = !us && rawContract.short && grade >= 3
    ? { ...rawContract, short: false, longTermSelected: true, title: rawContract.title.replace("단기복무", "장기복무 (영관 전환)") }
    : rawContract;
  const relevantFailures = (record.boardHistory ?? []).filter(receipt => receipt.grade === grade && !receipt.passed);
  const existing = record.serviceNotices?.[grade];
  const approved = record.serviceExtensions?.[grade];
  const limits = [];
  const add = (month, title, section, extension) => limits.push({month, title, section, extension});
  let notice = null;
  if (us) {
    if (grade < 10) add(((grade < 6 ? 62 : 64) - commissioningAge) * YEAR + 1, "연령정년", grade < 6 ? 1251 : 1253);
    if (grade === 0 && relevantFailures.length) {
      const first = relevantFailures[0].careerMonths ?? existing?.start ?? elapsed;
      notice = {start:first, grade};
      add(first + 18, "O-2 진급 부적격 판정 후 18개월", 630);
    }
    if ((grade === 2 || grade === 3) && relevantFailures.length >= 2) {
      const start = relevantFailures[1].careerMonths ?? existing?.start ?? elapsed;
      notice = {start, grade};
      const ordinaryExit = Math.max(start + 7, contract.obligation);
      const retirementEligibility = service === "navy" ? 20 * YEAR + 1 : 20 * YEAR;
      const protectedExit = ordinaryExit >= retirementEligibility - 2 * YEAR && ordinaryExit < retirementEligibility ? retirementEligibility : ordinaryExit;
      const cap = (grade === 2 ? 20 : 24) * YEAR;
      const end = approved?.until ? Math.max(protectedExit, approved.until) : protectedExit;
      add(end, approved?.until ? "선발된 계속복무 기간 만료" : protectedExit > ordinaryExit ? "진급 2회 미선발 · 퇴직자격 도달" : "진급 2회 미선발에 따른 현역 복무 종료",
        approved?.until ? 637 : 632,
        !approved && protectedExit < cap ? {action:"continue", label:"계속복무 선발 신청", until:cap, section:637} : null);
    }
    if (grade >= 4 && grade <= 9) {
      const rankLimit = grade === 4 ? 28 * YEAR
        : grade === 5 ? 30 * YEAR
        : Math.max(([30, 35, 38, 40][grade - 6]) * YEAR, elapsed - inGrade + 5 * YEAR);
      const section = grade + 629;
      const law = grade <= 6 ? section : 636;
      const ordinaryEnd = rankLimit + 1;
      add(approved?.until ?? ordinaryEnd, approved ? "승인된 현역 연장 만료" : "계급별 복무 상한 도달",
        approved ? 637 : law, !approved ? {action:"defer", label:"현역 정년 유예 신청", until:ordinaryEnd + 2 * YEAR, section:637} : null);
    }
  } else {
    if (koreanAge[grade]) add((koreanAge[grade] - commissioningAge) * YEAR, "연령정년", 8);
    if (koreanService[grade]) add(koreanService[grade] * YEAR, "근속정년", 8);
    if (flagYears[grade]) {
      const end = elapsed - inGrade + flagYears[grade] * YEAR;
      add(approved?.until ?? end, approved ? "연장된 계급정년" : "장성 계급정년", 8, !approved ?
        {action:"defer", label:"장성 계급정년 연장 심의", until:end + YEAR, section:8} : null);
    }
    if (contract.short && grade === 2) add(contract.obligation, "단기복무 기간 만료", 36, {
      action:"short", label:"단기복무 1년 연장 전형", until:contract.obligation + YEAR, section:6,
    });
  }
  limits.sort((a,b) => a.month - b.month);
  const limit = limits[0];
  const obligationLeft = Math.max(0, contract.obligation - elapsed);
  const remaining = limit ? Math.max(0, limit.month - elapsed) : null;
  // Approval thresholds are game mechanics, not statutory qualifications.
  const qualifies = rep >= 70 && average >= 65;
  const proposed = limit?.extension;
  const until = proposed ? Math.min(proposed.until, limits[1]?.month ?? Infinity) : 0;
  const extension = proposed && until > limit.month && remaining <= YEAR && elapsed <= limit.month
    ? { ...proposed, until }
    : null;
  const earlyWindow = !us && !contract.short && !contract.earlyUsed && elapsed >= 5 * YEAR && elapsed < 6 * YEAR && obligationLeft > 0;
  const longTermWindow = !us && !!contract.short && grade < 3 && (grade >= 1 || elapsed >= 2 * YEAR);
  const longTermReq = contract.id === "army3" ? { rep: 70, avg: 72 } : { rep: 72, avg: 75 };
  const longTermQualifies = rep >= longTermReq.rep && average >= longTermReq.avg;
  return {elapsed, inGrade, contract, remaining, limit, extension, notice, obligationLeft,
    due: !!limit && elapsed >= limit.month, qualifies, earlyWindow, longTermWindow, longTermReq, longTermQualifies, us,
    source:us ? usaLaw(limit?.section ?? 651) : koreaLaw};
}

export function noteServiceNotice(status) {
  if (!status.notice) return;
  const {grade} = status.notice;
  if (career.serviceNotices?.[grade]) return;
  (career.serviceNotices ??= {})[grade] = status.notice;
  saveCareer();
}

export function applyServiceAction(action, status, grade, turn) {
  const {extension, contract, earlyWindow, longTermWindow, longTermReq, longTermQualifies, qualifies} = status;
  if (action === "longterm" && longTermWindow) {
    if (!longTermQualifies) {
      return { ok: false, message: `장기복무 선발 요건 미달 · 군내 평판 ${longTermReq.rep}점 이상 & 평균 평정 ${longTermReq.avg}점 이상이 필요합니다.` };
    }
    const baseName = contract.id === "army3" ? "육군3사관학교" : "학사장교·사관후보생";
    const nextObligation = Math.max(contract.obligation, 10 * YEAR);
    career.serviceContract = {
      ...contract,
      short: false,
      longTermSelected: true,
      title: `${baseName} · 장기복무 전환 선발`,
      obligation: nextObligation,
    };
    const message = `⭐ 장기복무 선발 합격! 정규 장기복무 장교로 전환되었습니다 (의무복무 ${serviceDuration(nextObligation)}, 정년 트랙 적용).`;
    (career.serviceHistory ??= []).push({turn, date:careerDate(turn), title:"장기복무 선발 전형", message});
    saveCareer();
    return { ok: true, longTerm: true, message };
  }
  if (!(extension && action === extension.action) && !(action === "early" && earlyWindow)) return null;
  const label = action === "early" ? "5년차 전역 지원" : extension.label;
  if (!qualifies) return {message:"게임 전형 요건 · 군내 평판 70점과 평균 평정 65점이 필요합니다."};
  if (action === "early") career.serviceContract = {...contract, earlyUsed:true, obligation:status.elapsed};
  else if (action === "short") career.serviceContract = {...contract, obligation:extension.until};
  else (career.serviceExtensions ??= {})[grade] = {until:extension.until};
  const message = action === "early" ? "전역 신청 자격이 생겼습니다." : `누적 복무 ${serviceDuration(extension.until)}까지 연장됐습니다.`;
  (career.serviceHistory ??= []).push({turn, date:careerDate(turn), title:label, message});
  saveCareer();
  return {ok: true, message};
}
