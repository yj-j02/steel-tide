// 3군 장교 커리어 성장기 (소위 → 대장): 주간 직무·훈련 결재, 계급장 성장 시각화, 위기 3대 대응(위임 / FM 작전 / 3D 직접 개입).
import { SERVICES, BRANCHES, normBranch, serviceOf, careerTitle } from "./staff.js";
import { recordEval, evalOf, board, runBoard, FOCUS, letter } from "./service.js";
import { career, saveCareer } from "./career.js";

const DK = "steeltide:duty";
const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (a) => a[(Math.random() * a.length) | 0];

/** Service-specific weekly duty events: [id, svc ('all'|'army'|'navy'|'air'), minG, maxG, title, desc, [[label, effectText, xp, evalScore, morale, rep, headline]]] */
const EVENTS = [
  // 육군 (ROKA)
  ["a_gop", "army", 0, 2, "GOP 철책 야간 미상 인원 포착", "열상감시장비(TOD)에 비무장지대 인근 미상 움직임이 잡혔습니다. 초동 조치 지침을 내리십시오.", [
    ["즉각 경계태세 격상 · 수색조 투입", "평정 A+ · 경험치 +240 · 사기 −2", 240, 88, -2, 4, "전방 GOP 부대, 야간 미상 접근 완벽 차단"],
    ["감시 자산 집중 · 상급부대 우선 보고", "평정 A · 경험치 +180 · 안전 최우선", 180, 76, 1, 2, "접경 경계부대, 침착한 합동 감시 대응"],
    ["단순 야생동물 오인 판단 · 현상 유지", "평정 C · 경험치 +90 · 사기 +2 · 리스크", 90, 48, 2, -4, "전방 경계 소홀 논란 — 상급부대 감찰 착수"],
  ]],
  ["a_k2", "army", 1, 5, "K2 흑표 기갑 기동·사격 종합훈련", "혹한기 전차 기동훈련 중 선두 전차 2대에서 사격통제장치 경고가 떴습니다.", [
    ["야전 정비반 긴급 투입 후 실사격 완수", "평정 S · 경험치 +340 · 사기 +3", 340, 91, 3, 5, "기갑부대, 혹한기 야전 정비 극복하고 실사격 전원 명중"],
    ["예비 전차로 대체해 훈련 일정 준수", "평정 A · 경험치 +240 · 안정적 운영", 240, 78, 1, 2, "기계화부대, 동계 기동훈련 무사고 완료"],
    ["안전 우려로 실사격 취소 · 도상훈련 전환", "평정 B− · 경험치 +150 · 평판 −2", 150, 58, 0, -2, "동계 기갑 실사격 축소 — 대비태세 점검 요구"],
  ]],
  ["a_k9", "army", 2, 7, "대화력전 즉각 응징 사격 점검", "서북 도서·접경 포병 여단의 3분 내 초탄 발사 대비태세 불시 검열이 떨어졌습니다.", [
    ["전 포대 실전 배치 · K9 동시탄착(TOT) 시범", "평정 S · 경험치 +420 · 평판 +6", 420, 93, 2, 6, "포병여단, K9 동시탄착 대화력전 불시 검열 최우수"],
    ["표준 교범 절차대로 단계별 점검", "평정 A · 경험치 +280 · 사기 +1", 280, 77, 1, 2, "접경 포병부대, 대화력전 대비태세 이상 무"],
    ["탄약 절감 위해 시뮬레이터 평가 요청", "평정 C+ · 경험치 +150 · 평판 −4", 150, 52, 1, -4, "포병 실사격 검열 소극 대응 지적"],
  ]],
  // 해군 (ROKN)
  ["n_nll", "navy", 0, 3, "서해 NLL 경비정 월선 접근", "안개 낀 새벽, 북측 경비정 2척이 NLL 북방 1마일까지 고속 남하 중입니다.", [
    ["경고통신 후 고속정 전진 차단 기동", "평정 S · 경험치 +270 · 평판 +5", 270, 90, 2, 5, "해군 경비전력, NLL 접근 세력 단호한 차단 기동"],
    ["함대사령부 보고 후 교전수칙 단계별 대응", "평정 A · 경험치 +210 · 안전 확보", 210, 79, 1, 3, "서해 함대, 교전수칙 준수 속 NLL 안정 관리"],
    ["원거리 감시만 유지 · 접촉 회피", "평정 C · 경험치 +110 · 평판 −5", 110, 46, -2, -5, "서해 NLL 소극 대응 논란 — 작전 검토 지시"],
  ]],
  ["n_sub", "navy", 2, 6, "동해 수중 미상 음향 접촉", "대잠 초계 중 300m 심도에서 저주파 추진기 소음이 탐지됐습니다.", [
    ["예인소나 전개 · 잠수함·초계기 합동 추적", "평정 S · 경험치 +380 · 평판 +6", 380, 92, 2, 6, "해군 대잠전단, 동해 미상 수중표적 48시간 연속 추적 성공"],
    ["소노부이 투하 후 항적 기록 · 상부 보고", "평정 A · 경험치 +260 · 안정적 평가", 260, 78, 1, 2, "동해 대잠경계망, 미상 음향 정밀 식별"],
    ["어선 소음으로 추정 · 추적 종료", "평정 C · 경험치 +120 · 평판 −4", 120, 49, 0, -4, "동해 대잠 감시 공백 우려 제기"],
  ]],
  ["n_aegis", "navy", 4, 9, "기동함대 탄도미사일 추적·요격 훈련", "한미일 연합 해상기동훈련에서 다중 표적 동시 요격 과제가 주어졌습니다.", [
    ["이지스 전단 선도 지휘 · 다중 동시 교전 성공", "평정 S · 경험치 +520 · 평판 +7", 520, 94, 3, 7, "한국 해군 기동전단, 연합 미사일방어 훈련 완벽 주도"],
    ["방어 섹터 분담 · 안정적 교전 완수", "평정 A · 경험치 +360 · 사기 +2", 360, 80, 2, 3, "해군 기동부대, 연합 해상방어 훈련 무결점 수행"],
    ["통신 간섭 핑계로 실교전 축소", "평정 C+ · 경험치 +180 · 평판 −4", 180, 52, -1, -4, "연합 해상훈련 실교전 축소로 평가 하락"],
  ]],
  // 공군 (ROKAF)
  ["f_kadiz", "air", 0, 4, "KADIZ 미상 항적 긴급 발진(Scramble)", "이어도 남방 방공식별구역에 미통보 군용기 편대가 진입했습니다.", [
    ["전투기 편대 즉각 긴급 발진 · 근접 차단 비행", "평정 S · 경험치 +290 · 평판 +6", 290, 91, 3, 6, "공군 전투비행단, KADIZ 진입 항적 즉각 차단 비행"],
    ["E-737 관제 하에 표준 경고통신 및 호위 퇴거", "평정 A · 경험치 +220 · 안전 확보", 220, 80, 1, 3, "공군 방공관제망, KADIZ 진입기 안전 퇴거 유도"],
    ["지상 레이더 추적만 유지 · 출격 보류", "평정 C · 경험치 +100 · 평판 −5", 100, 45, -2, -5, "방공식별구역 대응 지연 지적"],
  ]],
  ["f_sam", "air", 2, 6, "천궁-II · L-SAM 합동 방공 사격 평가", "야간 저고도 순항미사일 모의 표적에 대한 실사격 평가가 진행됩니다.", [
    ["전자전 재밍 환경 속 실사격 전탄 명중 도전", "평정 S · 경험치 +410 · 평판 +6", 410, 93, 2, 6, "방공유도탄여단, 복합 전자전 속 표적 100% 요격"],
    ["정상 환경 기준 실사격 통과", "평정 A · 경험치 +270 · 사기 +1", 270, 78, 1, 2, "공군 미사일방어포대, 야간 실사격 검증 통과"],
    ["기상 악화로 모의 평가 대체", "평정 B− · 경험치 +150 · 평판 −2", 150, 58, 0, -2, "방공 실사격 연기 — 후속 검증 예정"],
  ]],
  ["f_kf21", "air", 5, 9, "차세대 전투기 합동 정밀타격(SEAD) 지휘", "적 방공망 제압 및 핵심 표적 정밀타격 합동 항공작전 지휘를 맡았습니다.", [
    ["스텔스기·전자전기 편조로 무손실 타격 완수", "평정 S · 경험치 +540 · 평판 +7", 540, 95, 3, 7, "공군작전사, 합동 SEAD 정밀타격 훈련 압도적 성과"],
    ["단계별 방공망 회피 기동으로 목표 달성", "평정 A · 경험치 +370 · 사기 +2", 370, 81, 2, 3, "공군 비행단, 합동 정밀타격 임무 안정 수행"],
    ["위험 부담 줄이려 스탠드오프 원거리 사격만 실시", "평정 B · 경험치 +220 · 평판 −1", 220, 64, 0, -1, "항공작전 보수적 운용 — 합참 보완 의견"],
  ]],
  // 공통 · 전군 (All services)
  ["c_train", "all", 0, 5, "부대 야간 비상소집 및 장비 점검", "신임 지휘관으로서 부대 전투준비태세를 불시 점검할 시점입니다.", [
    ["실전형 불시 비상소집 후 우수 장병 포상", "평정 A+ · 경험치 +250 · 사기 +4", 250, 86, 4, 4, "현장 지휘관, 실전형 비상점검과 즉각 포상으로 사기 진작"],
    ["사전 예고 후 체계적 정비·군기 확립", "평정 A · 경험치 +190 · 사기 +2", 190, 76, 2, 2, "체계적 정비 점검으로 부대 전투준비태세 향상"],
    ["장병 피로 고려해 서류 점검으로 갈음", "평정 C+ · 경험치 +110 · 사기 +1 · 평판 −3", 110, 54, 1, -3, "부대 점검 형식화 지적 — 상급부대 주의"],
  ]],
  ["c_joint", "all", 3, 9, "육·해·공 합동 지휘소 연습(CPX)", "다영역 동시 도발 시나리오에서 각 군 전력 배분과 우선순위를 조율해야 합니다.", [
    ["3군 합동 데이터링크 통합 작전안 주도", "평정 S · 경험치 +460 · 평판 +6", 460, 92, 3, 6, "합동 지휘소 연습서 3군 통합 작전안 호평"],
    ["각 군 기존 작계 중심의 안정적 협조", "평정 A · 경험치 +310 · 사기 +1", 310, 79, 1, 2, "합동 지휘소 연습 원활한 공조 마무리"],
    ["소속 군 이익 우선 주장으로 이견 발생", "평정 C · 경험치 +160 · 평판 −5", 160, 48, -2, -5, "합동훈련 군종 이기주의 논란"],
  ]],
  ["c_budget", "all", 5, 9, "국방부 전력소요·예산 심의 회의", "차기 무기체계 예산 배정을 두고 방위사업청·합참·국회 전문위원과 논의합니다.", [
    ["데이터 기반 전력 분석 보고서로 예산 확보", "평정 S · 경험치 +480 · 평판 +7", 480, 93, 2, 7, "전력소요 심의 통과 — 차기 핵심 전력 예산 전액 확보"],
    ["핵심 항목 중심 타협안 도출", "평정 A · 경험치 +330 · 안정적 통과", 330, 80, 1, 3, "전력증강 예산 합리적 조정안 확정"],
    ["원안 고수로 심의 보류", "평정 C+ · 경험치 +170 · 평판 −4", 170, 54, -1, -4, "국방 전력소요 심의 난항 — 사업 지연 우려"],
  ]],
];

/** Active crisis templates for officer phase (supports 3-way response: delegate / FM / 3D) */
const CRISES = [
  { id: "west_nll", domain: "navy", tag: "해상 위기", title: "서해 NLL 고속정·미사일정 기습 도발", desc: "적 수상전단이 서해 완충수역을 넘어 고속 남하 중입니다. 대응 방식을 선택하십시오.", map: "west", opAir: false, op3d: "navy" },
  { id: "air_kadiz", domain: "air", tag: "영공 위기", title: "동해·서해 영공 동시 침범 및 순항미사일 위협", desc: "적 전투기 편대와 저고도 순항미사일이 방공식별구역을 돌파했습니다.", map: "east", opAir: true, op3d: "air" },
  { id: "land_fire", domain: "army", tag: "접경 위기", title: "서북 도서·접경 해안포 기습 포격 도발", desc: "적 해안포·방사포 진지가 아군 접경 기지와 해상을 겨냥해 포격을 개시했습니다.", map: "west", opAir: false, op3d: "army" },
];

export function dutyState() {
  let d = rd(DK, null);
  if (!d) { d = { week: 1, morale: 72, rep: 55, tension: 32, headlines: ["신임 소위 임관 — 대한민국 국군 장교 커리어 시작"], pending: [], crisis: null, last: null }; wr(DK, d); }
  return d;
}
export function saveDuty(d) { wr(DK, d); }

function drawEvents(d, svc, grade) {
  const pool = EVENTS.filter((e) => (e[1] === "all" || e[1] === svc) && grade >= e[2] && grade <= e[3]);
  const fallback = EVENTS.filter((e) => e[1] === "all" || e[1] === svc);
  const src = pool.length >= 2 ? pool : fallback;
  const out = [], copy = src.slice();
  while (out.length < 2 && copy.length) out.push(copy.splice((Math.random() * copy.length) | 0, 1)[0][0]);
  d.pending = out;
  d.crisis = d.week % 2 === 0 || Math.random() < 0.45 ? pick(CRISES).id : null;
  saveDuty(d);
}

export function ensureDuty(svc, grade) {
  const d = dutyState();
  if (!d.pending || (!d.pending.length && !d.crisis && !d.doneWeek)) drawEvents(d, svc, grade);
  return d;
}

export function dutyEventById(id) { return EVENTS.find((e) => e[0] === id); }
export function dutyCrisisById(id) { return CRISES.find((c) => c.id === id); }

/** Resolve a weekly duty choice -> returns { xpGain, score, headline, morale, rep } */
export function resolveDuty(id, optIdx, grade) {
  const d = dutyState(), ev = dutyEventById(id); if (!ev || !d.pending.includes(id)) return null;
  const o = ev[6][optIdx]; if (!o) return null;
  const [label, , xpBase, sc, dm, dr, headline] = o;
  const xpGain = Math.round(xpBase * (1 + grade * 0.22));
  d.morale = clamp(d.morale + dm, 10, 100);
  d.rep = clamp(d.rep + dr, 0, 100);
  d.tension = clamp(d.tension + (sc >= 85 ? -2 : sc < 55 ? 4 : 0), 5, 95);
  d.pending = d.pending.filter((x) => x !== id);
  d.headlines.unshift(`${d.week}주차 · ${headline}`);
  d.headlines = d.headlines.slice(0, 12);
  d.last = `${ev[4]} → ${label} (평정 ${letter(sc)} · +${xpGain} XP)`;
  if (!d.pending.length && !d.crisis) d.doneWeek = true;
  recordEval(grade, sc);
  saveDuty(d);
  return { xpGain, score: sc, headline, label };
}

/** Auto-delegate a crisis based on staff/branch/morale -> returns { win, xpGain, score, msg } */
export function resolveCrisisDelegate(grade, br, staffPower = 1) {
  const d = dutyState(), cr = dutyCrisisById(d.crisis); if (!cr) return null;
  const svc = serviceOf(br), match = cr.domain === svc ? 10 : 0;
  const chance = clamp(Math.round(52 + grade * 3 + (d.morale - 50) * 0.35 + (staffPower - 1) * 45 + match), 20, 95);
  const win = Math.random() * 100 < chance;
  const sc = win ? 78 + ((Math.random() * 14) | 0) : 42 + ((Math.random() * 14) | 0);
  const xpGain = Math.round((win ? 420 : 160) * (1 + grade * 0.25));
  d.morale = clamp(d.morale + (win ? 4 : -6), 10, 100);
  d.rep = clamp(d.rep + (win ? 5 : -6), 0, 100);
  d.tension = clamp(d.tension + (win ? -5 : 8), 5, 95);
  const hl = win ? `[속보] ${cr.title} — 군 위임 작전으로 격퇴 (승률 ${chance}%)` : `[속보] ${cr.title} 대응 차질 — 지휘부 책임론 대두`;
  d.headlines.unshift(`${d.week}주차 · ${hl}`); d.headlines = d.headlines.slice(0, 12);
  d.last = `${cr.title} 자동 위임 → ${win ? "격퇴 성공" : "대응 실패"} (평정 ${letter(sc)} · +${xpGain} XP)`;
  d.crisis = null; if (!d.pending.length) d.doneWeek = true;
  recordEval(grade, sc);
  saveDuty(d);
  return { win, xpGain, score: sc, msg: hl, chance };
}

/** Record outcome of a direct 3D or FM crisis intervention */
export function resolveCrisisDirect(win, grade, modeLabel = "3D 직접 개입") {
  const d = dutyState(), cr = dutyCrisisById(d.crisis); if (!cr) return null;
  const sc = win ? 92 : 48;
  const xpGain = Math.round((win ? 620 : 220) * (1 + grade * 0.28));
  d.morale = clamp(d.morale + (win ? 7 : -5), 10, 100);
  d.rep = clamp(d.rep + (win ? 8 : -5), 0, 100);
  d.tension = clamp(d.tension + (win ? -8 : 7), 5, 95);
  const hl = win ? `[속보] ${cr.title} — 지휘관 ${modeLabel}으로 완벽 제압!` : `[속보] ${cr.title} ${modeLabel} 중 피해 발생`;
  d.headlines.unshift(`${d.week}주차 · ${hl}`); d.headlines = d.headlines.slice(0, 12);
  d.last = `${cr.title} (${modeLabel}) → ${win ? "대승" : "고전"} (평정 ${letter(sc)} · +${xpGain} XP)`;
  d.crisis = null; if (!d.pending.length) d.doneWeek = true;
  recordEval(grade, sc);
  saveDuty(d);
  return { win, xpGain, score: sc, msg: hl };
}

export function nextDutyWeek(svc, grade) {
  const d = dutyState();
  d.week++; d.doneWeek = false;
  d.tension = clamp(d.tension + (Math.random() < 0.45 ? 3 : -1), 5, 95);
  drawEvents(d, svc, grade);
  return d;
}

export { SERVICES, BRANCHES, normBranch, serviceOf, careerTitle, evalOf, board, runBoard, FOCUS, letter, career, saveCareer };
