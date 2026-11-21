import { careerStorage } from "./characters.js";
import { careerDate } from "./service-calendar.js";
import { openingDuty, openingEvent } from "./army-opening.js";
// 3군 장교 커리어 성장기 (소위 → 대장): 주간 직무·훈련 결재, 계급장 성장 시각화, 위기 3대 대응(위임 / FM 작전 / 3D 직접 개입).
import { SERVICES, BRANCHES, normBranch, serviceOf, careerTitle, staff, isUS, curFlagPosts, curBranches } from "./staff.js";
import { usNpcName } from "./us-ranks.js";
import { recordEval, evalOf, board, FOCUS, letter, addRankWeek, weeksOf, minWeeks } from "./service.js";
import { career, saveCareer, awardMedals } from "./career.js";
import { ngBonuses } from "./endings.js";

export const STANCES = {
  hard: { n: "🔥 실전 강훈", d: "XP +15% · 평정 +3 / 매 안건 사기 −4 · 차질 위험↑" },
  bal:  { n: "⚖️ 균형 운영", d: "표준 훈련·정비 균형 유지" },
  rest: { n: "🛡️ 정비·휴식", d: "매 안건 사기 +6 · 차질 위험 대폭↓ / XP −10%" },
};
export function setStance(k) {
  if (!STANCES[k]) return null;
  const d = dutyState();
  d.stance = k;
  saveDuty(d);
  return d;
}

const DK = "steeltide:duty";
const rd = (k, d) => { try { return JSON.parse(careerStorage.getItem(k)) ?? d; } catch { return d; } };
const wr = (k, v) => { try { careerStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (a) => a[(Math.random() * a.length) | 0];

/** Service-specific weekly duty events: [id, svc ('all'|'army'|'navy'|'air'), minG, maxG, title, desc, [[label, effectText, xp, evalScore, morale, rep, headline]]] */
const EVENTS = [
  // ── 위관 (소위~대위, g 0..2): 소대·중대·함정·편대 현장 실무 ──
  ["a_gop", "army", 0, 2, "GOP 소초 야간 경계근무 및 TOD 점검", "야간 순찰 중 소초 경계병의 피로 누적이 확인됐습니다. 초급 지휘관으로서 현장 조치를 내리십시오.", [
    ["직접 야간 동반 순찰 · 경계 섹터 재정비", "평정 A+ · 경험치 +240 · 사기 −2", 240, 88, -2, 4, "전방 소초 장교, 솔선수범 야간 순찰로 경계태세 확립"],
    ["교대 주기 조정 및 표준 경계 수칙 점검", "평정 A · 경험치 +190 · 안전 최우선", 190, 77, 2, 2, "접경 소초, 체계적 근무 교대로 안정적 경계 유지"],
    ["분대장 보고만 받고 소초 대기", "평정 C · 경험치 +100 · 사기 +2 · 리스크", 100, 48, 2, -4, "소초 야간 경계 점검 소홀 지적"],
  ]],
  ["a_recruit", "army", 0, 2, "신병 전입 면담 및 소대 화기·장비 점검", "신규 전입 병사 6명과 소대 공용화기 정비 상태가 동시에 보고됐습니다.", [
    ["1:1 전입 면담 후 야간 화기 정비까지 직접 확인", "평정 S · 경험치 +260 · 사기 +4", 260, 90, 4, 4, "초급 장교, 세심한 신병 관리와 완벽한 화기 정비 호평"],
    ["부소대장과 업무 분담 · 체크리스트대로 처리", "평정 A · 경험치 +200 · 안정적 운영", 200, 78, 2, 2, "소대 신병 적응 및 장비 점검 무사고 완료"],
    ["행정병에게 서류 정리만 맡기고 간소화", "평정 C+ · 경험치 +110 · 평판 −3", 110, 52, 0, -3, "전입 신병 관리 미흡 — 중대장 주의 조치"],
  ]],
  ["n_watch", "navy", 0, 2, "함정 당직사관 야간 항해·레이더 감시", "짙은 해무 속 연안 항해 중 어선 수십 척이 항로 전방에 밀집해 있습니다.", [
    ["항해 레이더·견시 이중 확인 후 침착한 변침 지휘", "평정 S · 경험치 +260 · 평판 +5", 260, 90, 2, 5, "초급 항해장교, 농무 속 완벽한 충돌 회피 기동"],
    ["함장 보고 후 감속 항해로 안전거리 확보", "평정 A · 경험치 +200 · 안전 확보", 200, 79, 1, 3, "연안 초계함, 교범 준수 항해로 무사고 임무 수행"],
    ["자동항법 유지 · 원거리 우회 지연", "평정 C · 경험치 +110 · 평판 −4", 110, 47, -2, -4, "야간 당직 항해 대응 지연 지적"],
  ]],
  ["n_dc", "navy", 0, 2, "함내 소화·방수 훈련 및 수병 고충 면담", "신규 승조원 비중이 높아 함내 화재·침수 대응 훈련 숙달이 시급합니다.", [
    ["불시 격실 소화훈련 실시 후 우수 수병 포상", "평정 A+ · 경험치 +250 · 사기 +3", 250, 88, 3, 4, "함정 손상통제 훈련 최우수 — 승조원 결속 강화"],
    ["구획별 단계 훈련 및 전입 수병 면담 병행", "평정 A · 경험치 +195 · 사기 +2", 195, 78, 2, 2, "함내 안전훈련 및 승조원 관리 양호"],
    ["정박 중 피로 고려해 이론 교육으로 대체", "평정 C+ · 경험치 +110 · 평판 −3", 110, 53, 1, -3, "함내 손상통제 실습 부족 지적"],
  ]],
  ["f_preflight", "air", 0, 2, "출격 전 기체·무장 안전점검 및 편대 브리핑", "야간 비행훈련을 앞두고 기체 센서 경고가 간헐적으로 점등됐습니다.", [
    ["정비반과 현장 정밀 점검 후 예비기 전환 출격 완수", "평정 S · 경험치 +265 · 평판 +5", 265, 91, 2, 5, "공군 초급장교, 철저한 비행안전 점검으로 무사고 출격"],
    ["표준 안전 절차대로 점검 후 비행 일정 순연", "평정 A · 경험치 +200 · 안전 확보", 200, 79, 2, 2, "비행대대, 안전 우선 절차 준수로 사고 예방"],
    ["경미한 오류로 판단해 그대로 이륙 강행", "평정 C · 경험치 +100 · 평판 −5", 100, 45, -2, -5, "비행안전 수칙 미준수 경고 조치"],
  ]],
  ["f_alert", "air", 0, 2, "비상대기실 야간 근무 및 방공포대 일일 점검", "기상 악화 속 야간 비상대기 교대와 레이더 점검 보고가 올라왔습니다.", [
    ["전 대기요원 장비·통신 직접 점검 후 실전 모의 발진", "평정 A+ · 경험치 +250 · 평판 +4", 250, 88, 1, 4, "비상대기 편대, 악기상 속 최단 시간 출격 태세 유지"],
    ["교범 절차대로 교대 인수인계 철저 확인", "평정 A · 경험치 +195 · 사기 +2", 195, 77, 2, 2, "공군 비상대기 근무 이상 무"],
    ["야간 피로 고려해 유선 보고로 갈음", "평정 C+ · 경험치 +110 · 평판 −3", 110, 52, 1, -3, "비상대기 인수인계 형식화 지적"],
  ]],
  ["c_barracks", "all", 0, 2, "부대 야간 점호 및 장병 안전·고충 관리", "주말을 앞두고 병영 내 안전사고 예방과 외출·휴가 장병 관리가 필요합니다.", [
    ["직접 생활관 순회 면담 및 안전 체크리스트 완비", "평정 A+ · 경험치 +240 · 사기 +4", 240, 87, 4, 4, "초급 지휘관, 현장 소통으로 무사고 병영 문화 정착"],
    ["표준 안전 교육 및 분대장 중심 관리", "평정 A · 경험치 +190 · 사기 +2", 190, 76, 2, 2, "부대 안전관리 및 장병 복무 여건 안정"],
    ["간단한 구두 당부로 마무리", "평정 C+ · 경험치 +110 · 평판 −3", 110, 53, 0, -3, "병영 안전관리 미흡 지적"],
  ]],
  ["c_ammo", "all", 0, 2, "탄약고·보급창 일일 재고 및 보안 점검", "정기 감찰을 앞두고 부대 탄약·통신장비 보안 장부를 대조해야 합니다.", [
    ["실물 전수 대조 및 잠금·경계장치 직접 확인", "평정 A+ · 경험치 +245 · 평판 +4", 245, 88, 1, 4, "부대 탄약·보안 관리 전수 점검 최우수"],
    ["담당 부사관과 합동 표본 점검 실시", "평정 A · 경험치 +190 · 안정적 평가", 190, 77, 1, 2, "부대 보급·보안 장부 이상 무"],
    ["전일 장부 기준으로 서류 확인만 진행", "평정 C · 경험치 +105 · 평판 −4", 105, 49, 1, -4, "보안·탄약 점검 소홀 주의"],
  ]],

  // ── 영관 (소령~대령, g 3..5): 대대·함정·전대·연대 지휘 및 참모 결재 ──
  ["a_k2", "army", 3, 5, "K2 흑표 기갑대대 혹한기 실사격 평가", "혹한기 전차 기동훈련 중 선두 전차 2대에서 사격통제장치 경고가 떴습니다.", [
    ["야전 정비반 긴급 투입 후 실사격 전원 완수", "평정 S · 경험치 +360 · 사기 +3", 360, 91, 3, 5, "기갑대대, 혹한기 야전 정비 극복하고 실사격 전원 명중"],
    ["예비 전차로 대체해 훈련 일정 준수", "평정 A · 경험치 +260 · 안정적 운영", 260, 78, 1, 2, "기계화부대, 동계 기동훈련 무사고 완료"],
    ["안전 우려로 실사격 취소 · 도상훈련 전환", "평정 B− · 경험치 +160 · 평판 −2", 160, 58, 0, -2, "동계 기갑 실사격 축소 — 대비태세 점검 요구"],
  ]],
  ["a_k9", "army", 3, 5, "K9 포병대대 대화력전 즉각 응징 사격 검열", "접경 포병 대대의 3분 내 초탄 발사 대비태세 불시 검열이 떨어졌습니다.", [
    ["전 포대 실전 배치 · K9 동시탄착(TOT) 시범", "평정 S · 경험치 +410 · 평판 +6", 410, 93, 2, 6, "포병대대, K9 동시탄착 대화력전 불시 검열 최우수"],
    ["표준 교범 절차대로 단계별 점검", "평정 A · 경험치 +290 · 사기 +1", 290, 78, 1, 2, "접경 포병부대, 대화력전 대비태세 이상 무"],
    ["탄약 절감 위해 시뮬레이터 평가 요청", "평정 C+ · 경험치 +160 · 평판 −4", 160, 52, 1, -4, "포병 실사격 검열 소극 대응 지적"],
  ]],
  ["n_nll", "navy", 3, 5, "서해 NLL 경비함대 월선 접근 차단 지휘", "안개 낀 새벽, 북측 경비정 2척이 NLL 북방 1마일까지 고속 남하 중입니다.", [
    ["경고통신 후 고속정·호위함 전진 차단 기동", "평정 S · 경험치 +380 · 평판 +6", 380, 91, 2, 6, "해군 전대, NLL 접근 세력 단호한 차단 기동"],
    ["함대사령부 보고 후 교전수칙 단계별 대응", "평정 A · 경험치 +270 · 안전 확보", 270, 79, 1, 3, "서해 함대, 교전수칙 준수 속 NLL 안정 관리"],
    ["원거리 감시만 유지 · 접촉 회피", "평정 C · 경험치 +150 · 평판 −5", 150, 46, -2, -5, "서해 NLL 소극 대응 논란 — 작전 검토 지시"],
  ]],
  ["n_sub", "navy", 3, 5, "동해 수중 미상 음향 대잠전단 추적", "대잠 초계 중 300m 심도에서 저주파 추진기 소음이 탐지됐습니다.", [
    ["예인소나 전개 · 잠수함·초계기 합동 추적", "평정 S · 경험치 +400 · 평판 +6", 400, 92, 2, 6, "해군 대잠전단, 동해 미상 수중표적 48시간 연속 추적 성공"],
    ["소노부이 투하 후 항적 기록 · 상부 보고", "평정 A · 경험치 +280 · 안정적 평가", 280, 78, 1, 2, "동해 대잠경계망, 미상 음향 정밀 식별"],
    ["어선 소음으로 추정 · 추적 종료", "평정 C · 경험치 +140 · 평판 −4", 140, 49, 0, -4, "동해 대잠 감시 공백 우려 제기"],
  ]],
  ["f_kadiz", "air", 3, 5, "KADIZ 미상 항적 긴급 발진(Scramble) 통제", "이어도 남방 방공식별구역에 미통보 군용기 편대가 진입했습니다.", [
    ["전투기 편대 즉각 긴급 발진 · 근접 차단 비행", "평정 S · 경험치 +390 · 평판 +6", 390, 91, 3, 6, "공군 전투비행전대, KADIZ 진입 항적 즉각 차단 비행"],
    ["E-737 관제 하에 표준 경고통신 및 호위 퇴거", "평정 A · 경험치 +280 · 안전 확보", 280, 80, 1, 3, "공군 방공관제망, KADIZ 진입기 안전 퇴거 유도"],
    ["지상 레이더 추적만 유지 · 출격 보류", "평정 C · 경험치 +140 · 평판 −5", 140, 45, -2, -5, "방공식별구역 대응 지연 지적"],
  ]],
  ["f_sam", "air", 3, 5, "천궁-II 방공대대 야간 실사격 평가", "야간 저고도 순항미사일 모의 표적에 대한 실사격 평가가 진행됩니다.", [
    ["전자전 재밍 환경 속 실사격 전탄 명중 도전", "평정 S · 경험치 +410 · 평판 +6", 410, 93, 2, 6, "방공유도탄대대, 복합 전자전 속 표적 100% 요격"],
    ["정상 환경 기준 실사격 통과", "평정 A · 경험치 +280 · 사기 +1", 280, 78, 1, 2, "공군 미사일방어포대, 야간 실사격 검증 통과"],
    ["기상 악화로 모의 평가 대체", "평정 B− · 경험치 +160 · 평판 −2", 160, 58, 0, -2, "방공 실사격 연기 — 후속 검증 예정"],
  ]],
  ["c_unit_eval", "all", 3, 5, "대대·전대 연간 훈련예산 및 간부 평정 결재", "하반기 훈련 탄약 배분과 예하 초급장교 근무평정 서열을 확정해야 합니다.", [
    ["실전 훈련 성과 중심 배분 · 공정한 서열 확정", "평정 A+ · 경험치 +350 · 평판 +5", 350, 89, 2, 5, "부대 지휘관, 공정한 인사평정과 실전 예산 집행 호평"],
    ["각 부서 균등 배분 · 기존 관행 존중", "평정 A · 경험치 +260 · 사기 +2", 260, 78, 2, 2, "부대 예산·인사 결재 무난히 마무리"],
    ["행정 편의 위주 일괄 처리", "평정 C+ · 경험치 +150 · 평판 −3", 150, 54, -1, -3, "부대 인사평정 형평성 불만 제기"],
  ]],

  // ── 장성 (준장~대장, g 6..9): 사단·군단·함대·합참·국방부 전략 결재 ──
  ["a_corps", "army", 6, 9, "전구급 한미연합 대화력·기동 작전계획(OPLAN) 결재", "접경 전선 다중 도발 시나리오에 맞춘 군단·지작사 합동 화력 운용안을 확정합니다.", [
    ["드론·정밀타격·기갑 통합 신작계 주도 채택", "평정 S · 경험치 +540 · 평판 +7", 540, 94, 3, 7, "육군 지휘부, 첨단 다영역 연합작계 완성으로 호평"],
    ["기존 연합작계 보완 및 안정적 전력 배치", "평정 A · 경험치 +380 · 사기 +2", 380, 81, 2, 3, "접경 방어작계 최신화 원활히 완료"],
    ["예산·부담 우려로 기존 계획 동결", "평정 C+ · 경험치 +200 · 평판 −4", 200, 53, -1, -4, "전구 작계 보완 지연 지적"],
  ]],
  ["n_aegis", "navy", 6, 9, "기동함대 탄도미사일 추적·요격 연합훈련", "한미일 연합 해상기동훈련에서 다중 표적 동시 요격 과제가 주어졌습니다.", [
    ["이지스 전단 선도 지휘 · 다중 동시 교전 성공", "평정 S · 경험치 +540 · 평판 +7", 540, 94, 3, 7, "한국 해군 기동함대, 연합 미사일방어 훈련 완벽 주도"],
    ["방어 섹터 분담 · 안정적 교전 완수", "평정 A · 경험치 +380 · 사기 +2", 380, 80, 2, 3, "해군 기동부대, 연합 해상방어 훈련 무결점 수행"],
    ["통신 간섭 핑계로 실교전 축소", "평정 C+ · 경험치 +200 · 평판 −4", 200, 52, -1, -4, "연합 해상훈련 실교전 축소로 평가 하락"],
  ]],
  ["f_kf21", "air", 6, 9, "차세대 전투기 합동 정밀타격(SEAD) 전략 지휘", "적 방공망 제압 및 핵심 표적 정밀타격 합동 항공작전 지휘를 맡았습니다.", [
    ["스텔스기·전자전기 편조로 무손실 타격 완수", "평정 S · 경험치 +550 · 평판 +7", 550, 95, 3, 7, "공군작전사, 합동 SEAD 정밀타격 훈련 압도적 성과"],
    ["단계별 방공망 회피 기동으로 목표 달성", "평정 A · 경험치 +390 · 사기 +2", 390, 81, 2, 3, "공군 사령부, 합동 정밀타격 임무 안정 수행"],
    ["위험 부담 줄이려 스탠드오프 원거리 사격만 실시", "평정 B · 경험치 +240 · 평판 −1", 240, 64, 0, -1, "항공작전 보수적 운용 — 합참 보완 의견"],
  ]],
  ["c_joint", "all", 6, 9, "육·해·공 합동 지휘소 연습(CPX) 총괄", "다영역 동시 도발 시나리오에서 각 군 전력 배분과 우선순위를 조율해야 합니다.", [
    ["3군 합동 데이터링크 통합 작전안 주도", "평정 S · 경험치 +520 · 평판 +7", 520, 93, 3, 7, "합동 지휘소 연습서 3군 통합 작전안 호평"],
    ["각 군 기존 작계 중심의 안정적 협조", "평정 A · 경험치 +370 · 사기 +1", 370, 80, 1, 2, "합동 지휘소 연습 원활한 공조 마무리"],
    ["소속 군 이익 우선 주장으로 이견 발생", "평정 C · 경험치 +190 · 평판 −5", 190, 48, -2, -5, "합동훈련 군종 이기주의 논란"],
  ]],
  ["c_budget", "all", 6, 9, "국방부 전력소요·예산 심의 및 국회 보고", "차기 무기체계 예산 배정을 두고 방위사업청·합참·국회 전문위원과 논의합니다.", [
    ["데이터 기반 전력 분석 보고서로 예산 전액 확보", "평정 S · 경험치 +530 · 평판 +7", 530, 93, 2, 7, "전력소요 심의 통과 — 차기 핵심 전력 예산 전액 확보"],
    ["핵심 항목 중심 타협안 도출", "평정 A · 경험치 +370 · 안정적 통과", 370, 80, 1, 3, "전력증강 예산 합리적 조정안 확정"],
    ["원안 고수로 심의 보류", "평정 C+ · 경험치 +190 · 평판 −4", 190, 54, -1, -4, "국방 전력소요 심의 난항 — 사업 지연 우려"],
  ]],
  // ── 비전투 지휘 딜레마 · 연간 연합훈련 (대민지원 · 청렴 · 언론 · 연합) ──
  ["c_disaster", "all", 0, 5, "폭설·집중호우 지역 대민지원 긴급 출동", "관할 지역 인근에 기록적 폭우·폭설 피해가 발생해 지자체가 군 대민지원을 긴급 요청했습니다.", [
    ["안전장비 완비 후 전 가용 병력·장비 신속 투입", "평정 S · 경험치 +320 · 평판 +7", 320, 92, 2, 7, "군 대민지원 부대, 밤샘 복구 작업으로 주민 찬사"],
    ["경계 병력 유지 범위 내 지원조 단계적 파견", "평정 A · 경험치 +240 · 사기 +2", 240, 80, 2, 4, "지역 재난 복구 지원 무사고 완료"],
    ["부대 훈련 일정 우선으로 지원 규모 최소화", "평정 C+ · 경험치 +130 · 평판 −4", 130, 54, 0, -4, "재난 대민지원 소극 대응 지역 여론 악화"],
  ]],
  ["c_whistle", "all", 1, 5, "병영 부조리·안전 은폐 제보 접수", "익명 소통함을 통해 부대 내 가혹행위 및 장비 손상 은폐 정황이 제보됐습니다.", [
    ["즉각 분리 조치·원칙 감찰 의뢰 및 재발 방지 선포", "평정 A+ · 경험치 +290 · 평판 +6", 290, 89, 3, 6, "지휘관의 단호한 원칙 대응으로 투명한 병영 신뢰 회복"],
    ["자체 사실조사 후 관련자 징계 및 비공개 시정", "평정 A · 경험치 +220 · 안정적 수습", 220, 77, 1, 2, "부대 내부 기강 점검 및 시정 조치 완료"],
    ["진급 심사 불이익 우려해 주의 조치로 내부 종결", "평정 C · 경험치 +110 · 평판 −6", 110, 46, -4, -6, "병영 부조리 축소 처리 의혹 제기"],
  ]],
  ["c_media", "all", 3, 9, "국방 전문지 현장 취재 및 훈련 공개 요청", "주요 언론사가 부대 첨단 장비 운용 및 장병 생활상 동행 취재를 요청했습니다.", [
    ["보안 지침 준수 하에 실전 훈련 현장 투명 공개", "평정 S · 경험치 +390 · 평판 +6", 390, 91, 3, 6, "언론 현장 보도 호평 — 국군 대비태세 대국민 신뢰 상승"],
    ["사전 조율된 공식 브리핑과 제한적 촬영 허용", "평정 A · 경험치 +280 · 안전 확보", 280, 79, 1, 2, "부대 홍보 브리핑 무리 없이 마무리"],
    ["보안 부담을 이유로 취재 전면 거부", "평정 B− · 경험치 +160 · 평판 −2", 160, 60, 0, -2, "폐쇄적 대언론 대응으로 소통 부족 지적"],
  ]],
  ["c_defect", "all", 3, 9, "신형 장비 결함 보고 및 전력화 연기 판단", "야전 운용시험 중 신형 무기체계 부품에서 간헐적 오작동이 발견됐습니다.", [
    ["전력화 일시 보류 · 제작사 합동 정밀 개선 관철", "평정 S · 경험치 +420 · 평판 +6", 420, 92, 2, 6, "지휘관의 원칙적 결함 시정 요구로 무기 신뢰성 확보"],
    ["운용 제한 조건부 배치 및 순차 보완 합의", "평정 A · 경험치 +300 · 균형 조정", 300, 79, 1, 2, "신형 전력 단계적 보완 배치 결정"],
    ["일정 준수 압박에 결함 보고 축소 후 강행 배치", "평정 C · 경험치 +150 · 평판 −6", 150, 47, -3, -6, "신형 장비 초기 결함 묵살 논란 — 감사 착수"],
  ]],
  ["a_ulchi", "army", 3, 9, "을지·호국 연합 야외기동훈련(FTX) 지휘", "전구급 전시 전환과 대규모 기동·도하 작전을 검증하는 연례 야외기동훈련이 시작됐습니다.", [
    ["야간 도하·드론 정찰 연계 실전형 기동 완수", "평정 S · 경험치 +440 · 평판 +6", 440, 93, 2, 6, "육군 기동부대, 호국훈련 야간 실전 도하 최우수 평가"],
    ["표준 작계 절차에 따른 단계별 기동 점검", "평정 A · 경험치 +310 · 사기 +1", 310, 80, 1, 2, "연례 야외기동훈련 무사고 완수"],
    ["안전사고 우려로 핵심 기동 구간 생략", "평정 C+ · 경험치 +170 · 평판 −3", 170, 55, 1, -3, "호국훈련 실기동 축소로 대비태세 지적"],
  ]],
  ["n_rimpac", "navy", 3, 9, "환태평양 연합해상훈련(RIMPAC) 전단 지휘", "다국적 해군 함대가 참가하는 대규모 연합 대함·대공 실사격 훈련에 파견됐습니다.", [
    ["연합 기동부대 선도 지휘 · 대함유도탄 실사격 명중", "평정 S · 경험치 +450 · 평판 +7", 450, 94, 3, 7, "대한민국 해군 전단, RIMPAC 다국적 연합훈련 최우수 전과"],
    ["부여된 호위·방공 구역 완벽 사수", "평정 A · 경험치 +320 · 사기 +2", 320, 80, 2, 3, "해군 파견전단, RIMPAC 연합작전 무결점 수행"],
    ["정비 여건 이유로 핵심 실사격 참가 보류", "평정 C+ · 경험치 +175 · 평판 −4", 175, 53, -1, -4, "국제 연합훈련 소극 참여 지적"],
  ]],
  ["f_redflag_kr", "air", 3, 9, "다국적 연합 공중훈련(맥스선더·레드플래그) 편조 지휘", "연합 공군 전력과 대규모 적 방공망 돌파 및 정밀폭격 임무를 합동 수행합니다.", [
    ["야간 저고도 침투·정밀유도폭탄 전탄 명중 지휘", "평정 S · 경험치 +450 · 평판 +7", 450, 94, 3, 7, "공군 전투비행단, 다국적 연합 공중훈련 최우수 편조 선정"],
    ["연합 관제 절차 준수 속 안정적 임무 완수", "평정 A · 경험치 +320 · 사기 +2", 320, 81, 2, 3, "한미 연합 공중훈련 무사고 종료"],
    ["기상·피로 이유로 출격 소티 대폭 축소", "평정 C+ · 경험치 +175 · 평판 −3", 175, 55, 0, -3, "연합 공중훈련 소티 축소 평가 하락"],
  ]],
];

/** Active crisis templates for officer phase (supports 3-way response: delegate / FM / 3D) */
const CRISES = [
  { id: "west_nll", domain: "navy", tag: "해상 위기", title: "서해 NLL 고속정·미사일정 기습 도발", desc: "적 수상전단이 서해 완충수역을 넘어 고속 남하 중입니다. 대응 방식을 선택하십시오.", map: "west", opAir: false, op3d: "navy" },
  { id: "air_kadiz", domain: "air", tag: "영공 위기", title: "동해·서해 영공 동시 침범 및 순항미사일 위협", desc: "적 전투기 편대와 저고도 순항미사일이 방공식별구역을 돌파했습니다.", map: "east", opAir: true, op3d: "air" },
  { id: "land_fire", domain: "army", tag: "접경 위기", title: "서북 도서·접경 해안포 기습 포격 도발", desc: "적 해안포·방사포 진지가 아군 접경 기지와 해상을 겨냥해 포격을 개시했습니다.", map: "west", opAir: false, op3d: "army" },
];

const US_EVENTS = [
  // ── Company Grade (O-1..O-3, g 0..2): Platoon / Ship Watch / Flight Line Duties ──
  ["us_a_insp", "army", 0, 2, "Platoon Weapons & Night Vision Inspection (82nd ABN)", "소대 개인화기·야간투시경(NVG) 일일 점검 중 2개 분대의 정비 지연이 보고됐습니다.", [
    ["현장 직접 점검 및 야간 보강 정비로 100% 가동률 확보", "평정 A+ · 경험치 +250 · 평판 +4", 250, 89, -1, 4, "미 육군 초급장교, 철저한 소대 장비 관리로 중대 최우수 평가"],
    ["분대장·부소대장 협조 하에 표준 절차대로 정비 완료", "평정 A · 경험치 +195 · 사기 +2", 195, 78, 2, 2, "소대 장비 점검 무사고 완료"],
    ["서류 보고만 수령하고 현장 확인 생략", "평정 C · 경험치 +105 · 평판 −4", 105, 48, 0, -4, "소대 화기·장비 관리 소홀 지적"],
  ]],
  ["us_n_ood", "navy", 0, 2, "Officer of the Deck (OOD) Night Bridge Watch", "구축함 야간 당직 중 악기상과 밀집 어선단 사이를 통과해야 합니다.", [
    ["레이더·견시 이중 확인 후 침착한 변침으로 안전 항해", "평정 S · 경험치 +260 · 평판 +5", 260, 90, 2, 5, "미 해군 초급 당직사관, 야간 악기상 속 완벽한 함교 지휘"],
    ["함장 호출 후 감속 항해로 안전거리 확보", "평정 A · 경험치 +200 · 안전 확보", 200, 79, 1, 3, "구축함 야간 항해 당직 무사고 완수"],
    ["자동항로 유지 · 위험 선박 회피 지연", "평정 C · 경험치 +105 · 평판 −4", 105, 47, -2, -4, "야간 당직 대응 지연으로 주의 조치"],
  ]],
  ["us_f_preflt", "air", 0, 2, "Pre-Flight Sortie Safety & Maintenance Brief", "훈련 출격 직전 기체 항전장비 경고가 떠 정비반과 출격 여부를 결정해야 합니다.", [
    ["정비반과 합동 정밀 점검 후 예비기 전환 출격 완수", "평정 S · 경험치 +265 · 평판 +5", 265, 91, 2, 5, "미 공군 초급장교, 철저한 비행안전 검증으로 무사고 훈련"],
    ["안전 수칙에 따라 점검 완료 후 비행 순연", "평정 A · 경험치 +200 · 안전 확보", 200, 79, 2, 2, "비행대대 안전 우선 절차 준수 호평"],
    ["경미한 경고로 간주해 그대로 이륙 진행", "평정 C · 경험치 +100 · 평판 −5", 100, 45, -2, -5, "비행안전 규정 위반 경고"],
  ]],
  ["us_c_counsel", "all", 0, 2, "Junior Enlisted Counseling & Arms Room Audit", "신규 전입 장병 면담과 부대 무기고·보안 일일 점검이 예정되어 있습니다.", [
    ["전입 장병 1:1 면담 및 무기고 실물 전수 확인", "평정 A+ · 경험치 +245 · 사기 +4", 245, 88, 4, 4, "현장 초급장교, 세심한 병영 관리와 무결점 보안 점검"],
    ["부사관단과 분담해 표준 체크리스트대로 처리", "평정 A · 경험치 +190 · 사기 +2", 190, 77, 2, 2, "부대 보안·장병 관리 안정적 유지"],
    ["행정 보고서만 결재하고 현장 생략", "평정 C+ · 경험치 +110 · 평판 −3", 110, 52, 0, -3, "초급 지휘관 현장 점검 미흡 지적"],
  ]],

  // ── Field Grade (O-4..O-6, g 3..5): Battalion / Ship / Wing / Staff Operations ──
  ["us_a_abn", "army", 3, 5, "82nd Airborne 18-Hour Emergency Deployment (EDRE)", "동유럽 NATO 동맹국 전방 증원을 가정한 불시 공수 전개 명령이 하달됐습니다.", [
    ["야간 강하·실전 화력 전개까지 18시간 내 완수", "평정 S · 경험치 +380 · 평판 +6", 380, 92, 2, 6, "미 82공수 대대, 18시간 내 NATO 전방 긴급전개 완벽 완수"],
    ["표준 수송 절차 준수 · 안전 최우선 전개", "평정 A · 경험치 +270 · 사기 +2", 270, 79, 2, 2, "미 육군 신속대응여단, 무사고 공수전개 완료"],
    ["기상 악화 이유로 강하 생략 · 지상 이동 전환", "평정 C+ · 경험치 +150 · 평판 −4", 150, 52, 0, -4, "공수 긴급전개 훈련 축소 — FORSCOM 점검 지시"],
  ]],
  ["us_a_m1", "army", 3, 5, "M1A2 Armored BCT NATO Combined Maneuver", "NATO 동부 전선 연합 기갑훈련 중 드론·대전차 복합 위협 시나리오가 투입됐습니다.", [
    ["능동방호(APS)·드론대응 통합 돌파 전술 지휘", "평정 S · 경험치 +400 · 평판 +6", 400, 92, 3, 6, "미 제1기갑여단, NATO 연합 기동훈련 최우수 평가"],
    ["교범 기반 제병협동 돌파 기동 완수", "평정 A · 경험치 +280 · 사기 +1", 280, 79, 1, 2, "미 기갑전투단, 동유럽 연합훈련 안정적 완수"],
    ["장비 정비 부담으로 기동 거리 축소", "평정 C+ · 경험치 +150 · 평판 −4", 150, 53, 0, -4, "미 육군 전방 기갑부대 가동률 우려 제기"],
  ]],
  ["us_n_fonop", "navy", 3, 5, "Taiwan Strait Freedom of Navigation (FONOP)", "알레이버크급 구축함이 대만해협을 통과하는 중 상대 구축함 2척이 근접 압박합니다.", [
    ["국제법 준수 통보 후 예정 항로 단호히 유지", "평정 S · 경험치 +390 · 평판 +6", 390, 91, 2, 6, "미 제7함대 구축함, 대만해협 항행의 자유 작전 완수"],
    ["함대사령부 교신 하에 안전거리 확보 기동", "평정 A · 경험치 +275 · 안전 확보", 275, 79, 1, 3, "미 태평양함대, 대만해협 안정적 통과 작전 수행"],
    ["우발 충돌 우려로 항로 조기 우회", "평정 C · 경험치 +145 · 평판 −5", 145, 47, -2, -5, "항행의 자유 작전 후퇴 논란 — 인도태평양사 질책"],
  ]],
  ["us_f_norad", "air", 3, 5, "NORAD Alaska ADIZ Scramble Control", "알래스카 방공식별구역에 장거리 전략폭격기 편대가 접근해 F-22 긴급 발진이 떨어졌습니다.", [
    ["F-22 랩터 편대 즉각 요격 · 근접 식별 및 퇴거", "평정 S · 경험치 +400 · 평판 +6", 400, 92, 3, 6, "NORAD F-22 편대, 알래스카 ADIZ 접근기 즉각 차단"],
    ["AWACS 통제 하에 표준 호위 퇴거 절차 수행", "평정 A · 경험치 +280 · 안전 확보", 280, 80, 1, 3, "북미항공우주방위사령부, 영공 접근기 안전 퇴거"],
    ["지상 레이더 감시만 유지 · 출격 지연", "평정 C · 경험치 +145 · 평판 −5", 145, 45, -2, -5, "NORAD 긴급 발진 지연 — 미 공군성 조사 착수"],
  ]],
  ["us_c_pentagon", "all", 3, 5, "Inspector General (IG) Combat Readiness Inspection", "상급 사령부 감찰관(IG)이 불시에 부대 정비·군기·탄약 현황을 점검합니다.", [
    ["현장 중심 실전 점검 후 우수 장병 즉각 표창", "평정 A+ · 경험치 +360 · 사기 +4", 360, 89, 4, 5, "미군 지휘관, IG 불시 검열 최우수 통과"],
    ["교범 체크리스트대로 체계적 대응", "평정 A · 경험치 +265 · 사기 +2", 265, 78, 2, 2, "체계적 군기·장비 관리로 IG 검열 무난 통과"],
    ["서류 보완에 치중해 현장 점검 축소", "평정 C+ · 경험치 +150 · 평판 −3", 150, 53, 0, -3, "IG 감찰서 형식적 행정 대응 지적"],
  ]],

  // ── Flag / General Officer (O-7..O-10, g 6..9): Theater / Pentagon / Congress ──
  ["us_a_theater", "army", 6, 9, "Theater Corps Multi-Domain Fires & Deterrence Exercise", "인도-태평양·유럽 전구 연합군단 다영역 화력·방공 통합 작전안을 최종 결재합니다.", [
    ["우주·사이버·장거리 정밀타격 통합 작계 채택", "평정 S · 경험치 +540 · 평판 +7", 540, 94, 3, 7, "미 육군 장성단, 다영역 연합작전 구상 펜타곤 호평"],
    ["동맹국 표준 교리 중심의 안정적 연합 운용", "평정 A · 경험치 +380 · 사기 +2", 380, 81, 2, 3, "연합군단 전구 작전계획 원활히 확정"],
    ["예산 부담으로 신전력 통합 보류", "평정 C+ · 경험치 +200 · 평판 −4", 200, 53, -1, -4, "다영역 전력 통합 지연 지적"],
  ]],
  ["us_n_csg", "navy", 6, 9, "Carrier Strike Group (CSG) Indo-Pacific Integrated Air Defense", "남중국해·필리핀해에서 동맹국 함대와 대규모 항모타격단 통합방공 훈련을 지휘합니다.", [
    ["F-35C·이지스 통합 화력망(NIFC-CA) 실증 주도", "평정 S · 경험치 +540 · 평판 +7", 540, 94, 3, 7, "미 항모타격단, 인도-태평양 통합방공 훈련 압도적 성과"],
    ["전통적 항모 방어 섹터 운용으로 무결점 완료", "평정 A · 경험치 +380 · 사기 +2", 380, 80, 2, 3, "미 태평양함대 연합 해상기동훈련 성공적 종료"],
    ["연료·정비 절감 위해 함재기 출격 횟수 축소", "평정 C+ · 경험치 +200 · 평판 −4", 200, 52, -1, -4, "항모타격단 출격 축소로 작전 준비태세 지적"],
  ]],
  ["us_f_redflag", "air", 6, 9, "Nevada Red Flag Allied SEAD Package Command", "동맹국 공군 80여 기가 참가하는 대규모 적 방공망 제압(SEAD) 연합 작전을 총괄합니다.", [
    ["F-35A·전자전기·우주자산 통합 타격 패키지 지휘", "평정 S · 경험치 +550 · 평판 +7", 550, 94, 3, 7, "레드플래그 연합훈련서 미 공군 다영역 SEAD 전술 호평"],
    ["안정적 단계별 방공망 우회 타격 완수", "평정 A · 경험치 +385 · 사기 +2", 385, 81, 2, 3, "미 공군 사령부, 레드플래그 임무 성공적 완수"],
    ["손실 회피 위주 소극적 원거리 타격", "평정 B · 경험치 +230 · 평판 −1", 230, 63, 0, -1, "레드플래그 작전 보수적 운용 평가"],
  ]],
  ["us_c_congress", "all", 6, 9, "Senate Armed Services Committee (SASC) Posture Hearing", "상원 군사위원회에서 차기 무기체계 예산과 인도-태평양 억제 전략을 증언해야 합니다.", [
    ["정량 데이터와 합동 억제 논리로 초당적 예산 확보", "평정 S · 경험치 +530 · 평판 +7", 530, 93, 2, 7, "상원 군사위 청문회 호평 — 핵심 전력 예산 초당적 통과"],
    ["의회 요구를 일부 수용한 실용적 타협안 제시", "평정 A · 경험치 +370 · 안정적 통과", 370, 80, 1, 3, "미 국방예산 심의 원만한 합의 도출"],
    ["원안 고수 발언으로 위원회와 정면 충돌", "평정 C+ · 경험치 +190 · 평판 −4", 190, 54, -1, -4, "의회 군사위 증언 마찰 — 예산안 보류"],
  ]],
  ["us_c_jroc", "all", 6, 9, "Pentagon JROC Modernization & Force Allocation Review", "합참 소요심의회(JROC)에서 각 군 차세대 전력 우선순위와 해외 전개 병력을 배분합니다.", [
    ["합동 억지력 극대화 중심의 과감한 전력 재배치 관철", "평정 S · 경험치 +520 · 평판 +7", 520, 93, 2, 7, "펜타곤 JROC 심의서 합동 전력 재배치안 전폭 지지"],
    ["각 군 균형 배분으로 합참 내부 합의 도출", "평정 A · 경험치 +370 · 사기 +2", 370, 80, 2, 3, "합동 전력 소요 심의 원활한 타결"],
    ["소속 군 이익 우선 주장으로 합참 내 갈등", "평정 C · 경험치 +185 · 평판 −5", 185, 49, -2, -5, "펜타곤 합동 소요 심의 군종 갈등 보도"],
  ]],
  // ── Non-Combat Dilemmas & Joint Exercises (US) ──
  ["us_c_fema", "all", 0, 5, "Domestic Disaster Relief & Defense Support (DSCA)", "허리케인·산불 피해 지역에 연방 재난구호(DSCA) 병력·수송 지원 요청이 하달됐습니다.", [
    ["신속 구호팀 편성 및 야간 보급·구조 작전 완수", "평정 S · 경험치 +320 · 평판 +7", 320, 92, 3, 7, "미군 재난구호 지원단, 신속한 대민 구조로 전국적 찬사"],
    ["표준 DSCA 절차에 따른 단계적 지원 전개", "평정 A · 경험치 +240 · 사기 +2", 240, 80, 2, 4, "연방 재난 복구 군 지원 임무 무사고 완료"],
    ["본연 훈련 일정 우선으로 지원 범위 최소화", "평정 C+ · 경험치 +130 · 평판 −4", 130, 54, 0, -4, "재난 지원 소극 대응 지역 언론 비판"],
  ]],
  ["us_c_ethics", "all", 1, 5, "Command Climate & Safety Compliance Audit", "익명 부대 설문에서 안전 규정 미준수 및 하급자 과로 문제가 공식 제기됐습니다.", [
    ["즉각 안전 점검 실시 및 투명한 지휘 문화 개선 선포", "평정 A+ · 경험치 +290 · 평판 +6", 290, 89, 4, 6, "미군 지휘관, 투명한 Command Climate 개혁으로 높은 신뢰 확보"],
    ["부사관단과 비공개 면담 후 단계적 시정", "평정 A · 경험치 +220 · 안정적 수습", 220, 78, 1, 2, "부대 안전·복무 환경 점진적 개선"],
    ["진급 평정 우려로 문제 제기를 경미 사안 처리", "평정 C · 경험치 +110 · 평판 −6", 110, 46, -4, -6, "부대 안전 제보 묵살 논란 — 상급 감찰 착수"],
  ]],
  ["us_c_press", "all", 3, 9, "Pentagon Press Corps Embed & Readiness Briefing", "워싱턴 국방부 출입기자단이 부대 실전 대비태세 동행 취재를 요청했습니다.", [
    ["작전보안(OPSEC) 준수 하에 실전 훈련 현장 공개", "평정 S · 경험치 +390 · 평판 +6", 390, 91, 3, 6, "펜타곤 출입기자단 동행 보도 호평 — 미군 대비태세 신뢰 상승"],
    ["공보관 중심 표준 브리핑 및 제한 촬영 허용", "평정 A · 경험치 +280 · 안전 확보", 280, 79, 1, 2, "국방부 공보 브리핑 안정적 마무리"],
    ["보안 우려로 취재 요청 일괄 거절", "평정 B− · 경험치 +160 · 평판 −2", 160, 60, 0, -2, "대언론 소통 부족 지적"],
  ]],
  ["us_a_ntc", "army", 3, 6, "National Training Center (Fort Irwin) Rotation", "모하비 사막 NTC에서 대항군(OPFOR)과 실전형 여단 전투단 종합 기동평가를 치릅니다.", [
    ["제병협동 야간 기습 돌파로 OPFOR 방어선 격파", "평정 S · 경험치 +430 · 평판 +6", 430, 93, 2, 6, "미 육군 전투단, Fort Irwin NTC 순환훈련 최우수 평가"],
    ["교범 기반 방어·반격 기동으로 안정적 통과", "평정 A · 경험치 +305 · 사기 +1", 305, 80, 1, 2, "NTC 종합 기동평가 무사고 수료"],
    ["장비 손실 회피 위주 소극적 기동", "평정 C+ · 경험치 +165 · 평판 −3", 165, 55, 0, -3, "NTC 훈련 소극 전술 보완 지적"],
  ]],
  ["us_n_rimpac", "navy", 3, 6, "RIMPAC Multinational Maritime Strike Exercise", "하와이 인근 해역에서 동맹국 20여 개국 함대와 연합 해상타격·대잠 훈련을 지휘합니다.", [
    ["연합 기동전단 선도 지휘 · 실사격 표적 완벽 격침", "평정 S · 경험치 +440 · 평판 +7", 440, 94, 3, 7, "미 태평양함대, RIMPAC 다국적 해상타격 훈련 압도적 주도"],
    ["동맹 함대 섹터 조율 및 무결점 방어 완수", "평정 A · 경험치 +315 · 사기 +2", 315, 80, 2, 3, "RIMPAC 다국적 연합훈련 성공적 종료"],
    ["연료·정비 사유로 핵심 실사격 단계 축소", "평정 C+ · 경험치 +170 · 평판 −4", 170, 53, -1, -4, "RIMPAC 핵심 훈련 축소 지적"],
  ]],
  ["us_f_tanker", "air", 3, 6, "Indo-Pacific Agile Combat Employment (ACE) Drill", "서태평양 분산 활주로를 활용한 신속 전개·재무장(ACE) 작전 능력을 검증합니다.", [
    ["전방 도서 기지 신속 전개 및 무중단 출격 사이클 달성", "평정 S · 경험치 +440 · 평판 +7", 440, 94, 2, 7, "미 공군 비행단, 인도-태평양 ACE 분산전개 훈련 최우수"],
    ["표준 수송·공중급유 절차로 안전 전개 완료", "평정 A · 경험치 +315 · 사기 +2", 315, 80, 2, 3, "태평양 공군 신속전개 훈련 안정 완료"],
    ["기상·정비 부담으로 분산 기지 전개 축소", "평정 C+ · 경험치 +170 · 평판 −3", 170, 54, 0, -3, "ACE 분산작전 검증 미흡 지적"],
  ]],
];

const US_CRISES = [
  { id: "us_taiwan", domain: "navy", tag: "인도-태평양 위기", title: "대만해협·남중국해 적 수상전단 봉쇄 위협", desc: "적 대형 수상전단이 인도-태평양 핵심 해상교통로에서 봉쇄 기동을 개시했습니다.", map: "west", opAir: false, op3d: "navy" },
  { id: "us_norad", domain: "air", tag: "영공·방공 위기", title: "태평양·알래스카 장거리 폭격기·순항미사일 위협", desc: "미 식별 전략기 편대와 순항미사일 항적이 태평양 방공망으로 접근 중입니다.", map: "east", opAir: true, op3d: "air" },
  { id: "us_base", domain: "army", tag: "전방기지 위기", title: "인도-태평양 전방기지 탄도·포격 도발 경보", desc: "전방 주둔 기지와 동맹국 도서를 겨냥한 기습 화력 도발이 탐지됐습니다.", map: "west", opAir: false, op3d: "army" },
];

const SUR = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오"], GIV = ["도현", "준혁", "민재", "서진", "태윤", "성호", "지훈", "현우", "정민", "재원"];
function mkRivals(svc) {
  const s1 = pick(SUR) + pick(GIV); let s2 = pick(SUR) + pick(GIV); if (s2 === s1) s2 = "한재민";
  const brs = Object.keys(BRANCHES).filter((k) => BRANCHES[k].svc === svc);
  return [
    { name: s1, br: brs[0] || "sea", g: 0, style: "야전 엘리트", xp: 0 },
    { name: s2, br: brs[1] || brs[0] || "sea", g: 0, style: "전략 참모형", xp: 0 },
  ];
}
export function dutyState() {
  let d = rd(DK, null);
  if (!d) {
    const ng = ngBonuses();
    d = { week: 1, morale: 72, rep: clamp(55 + ng.initRep, 0, 100), tension: 32, stance: "bal", recent: [], headlines: [isUS() ? "O-1 소위 임관 — 미합중국 군(U.S. Armed Forces) 장교 커리어 시작" : "신임 소위 임관 — 대한민국 국군 장교 커리어 시작"], pending: [], crisis: null, report: null, rivals: null, last: null };
    wr(DK, d);
  }
  return d;
}
export function saveDuty(d) { wr(DK, d); }

function shuffle3() { const a = [0, 1, 2]; for (let i = 2; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const dutyOptionHint = (optIdx) => (
  optIdx === 0 ? "강경·적극 지휘 · 높은 성과 기대 / 부대 피로 누적·돌발 사고 리스크"
  : optIdx === 1 ? "교범·균형 지휘 · 안정적 임무 수행 및 부대 컨디션 관리"
  : "보수·안전 우선 · 부대 사기 회복·위험 최소화 / 소극 대응 지적 가능"
);

const rankTier = (g) => (g <= 2 ? 0 : g <= 5 ? 1 : 2);
const currentOpening = (d, svc, grade) =>
  grade === 0 && svc === serviceOf(staff.branch) ? openingDuty(staff.branch, d.week) : null;

export function openingCarryover(d, event) {
  const previous = d.openingChoices?.[event.track]?.[event.week - 1];
  if (previous == null) return null;
  return {
    text: openingDuty(event.track, event.week - 1).outcomes[previous],
    points: previous === 0 ? 4 : -4,
    followup: previous === 0 ? "확보한 시간으로 이번 안건을 시작합니다." : "밀린 일정을 정리한 뒤 이번 안건을 시작합니다.",
  };
}

function drawEvents(d, svc, grade) {
  if (!d.rivals) d.rivals = mkRivals(svc);
  const us = isUS(), evSrc = us ? US_EVENTS : EVENTS, crSrc = us ? US_CRISES : CRISES;
  const gClamped = Math.min(9, grade);
  const pool = evSrc.filter((e) => (e[1] === "all" || e[1] === svc) && gClamped >= e[2] && gClamped <= e[3]);
  const tierFallback = evSrc.filter((e) => rankTier(e[2]) === rankTier(gClamped));
  const src0 = pool.length >= 2 ? pool : tierFallback.length >= 2 ? tierFallback : evSrc;
  const recentSet = new Set((d.recent || []).slice(-4));
  const fresh = src0.filter((e) => !recentSet.has(e[0]));
  const src = fresh.length >= 2 ? fresh : src0;
  const out = [], copy = src.slice();
  while (out.length < 2 && copy.length) out.push(copy.splice((Math.random() * copy.length) | 0, 1)[0][0]);
  d.recent = [...(d.recent || []), ...out].slice(-6);
  const opening = currentOpening(d, svc, grade);
  d.openingId = opening?.id ?? null;
  d.pending = opening ? (d.openingChoices?.[opening.track]?.[opening.week] == null ? [opening.id] : []) : out;
  if (opening && !d.pending.length) d.doneWeek = true;
  d.optOrder = Object.fromEntries(out.map((id) => [id, shuffle3()]));
  d.nat = us ? "us" : "kr";
  d.tier = rankTier(gClamped);
  d.crisis = grade >= 2 && d.week >= 3 && (d.week % 4 === 0 || Math.random() < 0.2) ? pick(crSrc).id : null; /* 합동 위기: 대위 이상부터 발생 */
  saveDuty(d);
}

/** Ensure every rival classmate holds a real, unique billet that never collides with the player or another rival. */
export function syncRivalPosts(d, svc, playerPost = "") {
  if (!d?.rivals?.length) return false;
  const BR = curBranches(), FP = curFlagPosts();
  const svcBrs = Object.keys(BR).filter((k) => BR[k].svc === svc);
  const jointBrs = Object.keys(BR).filter((k) => BR[k].svc === "joint");
  const allBrs = [...svcBrs, ...jointBrs];
  const used = new Set();
  if (playerPost) used.add(playerPost);
  let changed = false;
  d.rivals.forEach((r, ri) => {
    if (!BR[r.br] || (BR[r.br].svc !== svc && BR[r.br].svc !== "joint")) {
      r.br = svcBrs[ri % svcBrs.length] || allBrs[0] || "sea";
      r.post = null;
      changed = true;
    }
    const validCur = () => {
      if (!r.post || used.has(r.post)) return false;
      if (r.g >= 6) return FP.some((p) => p.g === r.g && (p.svc === svc || p.svc === "joint") && p.t === r.post);
      return allBrs.some((bk) => BR[bk]?.t?.[r.g] === r.post);
    };
    if (!validCur()) {
      let picked = null;
      if (r.g >= 6) {
        for (let tryG = Math.min(9, r.g); tryG >= 6; tryG--) {
          const cands = FP.filter((p) => p.g === tryG && (p.svc === svc || p.svc === "joint") && !used.has(p.t));
          if (cands.length) {
            picked = cands.find((p) => p.svc === svc && p.b === r.br)
              || cands.find((p) => p.svc === svc)
              || cands[0];
            if (r.g !== tryG) r.g = tryG;
            break;
          }
        }
      }
      if (picked) {
        r.post = picked.t;
      } else {
        if (r.g >= 6) r.g = 5;
        const pref = BR[r.br]?.t?.[r.g];
        if (pref && !used.has(pref)) {
          r.post = pref;
        } else {
          const altBr = allBrs.find((bk) => BR[bk]?.t?.[r.g] && !used.has(BR[bk].t[r.g]));
          r.post = altBr ? BR[altBr].t[r.g] : careerTitle(r.g, r.br);
          if (altBr) r.br = altBr;
        }
      }
      changed = true;
    }
    if (r.post) used.add(r.post);
  });
  return changed;
}

export function ensureDuty(svc, grade, playerPost = "") {
  const d = dutyState(), wantNat = isUS() ? "us" : "kr", wantTier = rankTier(Math.min(9, grade));
  let dirty = false;
  if (!d.rivals) { d.rivals = mkRivals(svc); dirty = true; }
  for(const rival of d.rivals){if(rival.rel==null){rival.rel=50;dirty=true;}}
  for (const rival of d.rivals) {
    if (rival.rankSinceWeek != null) continue;
    // Older saves only know total weeks. Correct impossible early officer grades once.
    const elapsed = d.week - 1;
    if (rival.g > 0 && rival.g <= 3 && elapsed < rival.g * minWeeks() && grade < rival.g) {
      rival.g = Math.floor(elapsed / minWeeks());
      rival.post = null;
    }
    rival.rankSinceWeek = rival.g === 0 ? 1 : d.week;
    dirty = true;
  }
  if (syncRivalPosts(d, svc, playerPost)) dirty = true;
  if ((d.nat && d.nat !== wantNat) || (d.tier != null && d.tier !== wantTier)) { d.pending = []; d.crisis = null; d.report = null; d.doneWeek = false; drawEvents(d, svc, grade); syncRivalPosts(d, svc, playerPost); saveDuty(d); return d; }
  const openingId = currentOpening(d, svc, grade)?.id ?? null;
  if ((d.openingId ?? null) !== openingId && !d.doneWeek && !d.report && !d.crisis) {
    drawEvents(d, svc, grade);
    return d;
  }
  if (!d.pending || (!d.pending.length && !d.crisis && !d.report && !d.doneWeek)) { drawEvents(d, svc, grade); syncRivalPosts(d, svc, playerPost); saveDuty(d); return d; }
  if (dirty) saveDuty(d);
  return d;
}

export function dutyEventById(id) { return EVENTS.find((e) => e[0] === id) || US_EVENTS.find((e) => e[0] === id); }
export function dutyCrisisById(id) { return CRISES.find((c) => c.id === id) || US_CRISES.find((c) => c.id === id); }

export function rivalEligible(rival, week) {
  return week - (rival.rankSinceWeek ?? (rival.g === 0 ? 1 : week)) >= minWeeks(rival.g);
}

/** Advance rival classmates alongside player progress so they stay neck-and-neck (playerGrade - 1 to +1). */
function tickRivals(d, playerGrade, svc = "navy", playerPost = "") {
  if (!d.rivals) return;
  const promoted = [];
  d.rivals.forEach((r, ri) => {
    if (r.g >= playerGrade || r.g >= 9 || !rivalEligible(r, d.week)) return;
    const prevG = r.g;
    r.g++;
    r.rankSinceWeek = d.week;
    r.post = null;
    promoted.push([r, ri, prevG]);
  });
  syncRivalPosts(d, svc, playerPost);
  for (const [r, ri, prevG] of promoted) {
    if (r.g > prevG) {
      const t = r.post || careerTitle(r.g, r.br);
      const rNm = isUS() ? usNpcName(r.name + ri) : r.name;
      d.headlines.unshift(`${careerDate(d.week)} · [동기 동향] ${isUS() ? "사관학교 동기" : "임관 동기"} ${rNm}, ${t} 보직으로 진급!`);
      d.headlines = d.headlines.slice(0, 12);
    }
  }
}

function resolveOpening(d, event, choice, grade) {
  const label = event.options[choice];
  if (!label || grade !== 0 || currentOpening(d, serviceOf(staff.branch), grade)?.id !== event.id) return null;
  const previous = openingCarryover(d, event);
  const score = (choice === 0 ? 93 : 86) + (previous?.points ?? 0);
  const track = ((d.openingChoices ??= {})[event.track] ??= {});
  track[event.week] = choice;
  const xpGain = 450;
  d.rep = clamp(d.rep + (choice === 0 ? 3 : 1), 0, 100);
  d.morale = clamp(d.morale + (choice === 0 ? 2 : 0), 10, 100);
  const next = openingDuty(event.track, event.week + 1);
  (d.timeline ??= []).push({
    id: event.id, opening: true, turn: d.week, date: careerDate(d.week), title: event.title,
    choice: label, outcome: event.outcomes[choice], score,
    nextTitle: next?.title, nextPoints: next ? choice === 0 ? 4 : -4 : undefined,
    carriedPoints: previous?.points,
  });
  d.last = `${event.outcomes[choice]} · 평정 ${score}점 · +${xpGain} XP`;
  d.headlines = [`${careerDate(d.week)} · ${event.title} · ${event.outcomes[choice]}`, ...d.headlines].slice(0, 12);
  d.pending = d.pending.filter(id => id !== event.id);
  d.doneWeek = !d.pending.length && !d.report && !d.crisis;
  recordEval(grade, score);
  career.goodEvals = (career.goodEvals || 0) + 1;
  saveCareer();
  awardMedals({source: event.title, turn: d.week, score, morale: d.morale, goodEvals: career.goodEvals, grade});
  saveDuty(d);
  return {xpGain, score, label};
}

/** Resolve a weekly duty choice with genuine risk/morale tradeoffs (no guaranteed best pick). */
export function resolveDuty(id, optIdx, grade) {
  const d = dutyState();
  if (!d.pending.includes(id)) return null;
  const opening = openingEvent(id);
  if (opening) return resolveOpening(d, opening, optIdx, grade);
  const ev = dutyEventById(id);
  if (!ev) return null;
  const o = ev[6][optIdx]; if (!o) return null;
  let [label, , xpBase, sc, dm, dr, headline] = o;
  const stance = d.stance || "bal", ng = ngBonuses();
  let backfired = false;
  if (optIdx === 0) {
    const stanceRisk = stance === "hard" ? 0.06 : stance === "rest" ? -0.10 : 0;
    const failProb = clamp(0.18 + stanceRisk + Math.max(0, 72 - d.morale) * 0.008 + Math.max(0, d.tension - 50) * 0.003, 0.08, 0.62);
    if (Math.random() < failProb) {
      backfired = true;
      sc = 42 + ((Math.random() * 12) | 0);
      xpBase = Math.round(xpBase * 0.55);
      dm = -6; dr = -7;
      headline = `[작전 차질] ${ev[4]} 강경 대응 중 장비·안전 차질 발생 — 지휘 책임 추궁`;
    } else {
      sc = clamp(sc + (((Math.random() * 7) | 0) - 3) + (stance === "hard" ? 3 : 0), 84, 98);
      dm = Math.min(dm, -2); /* 고강도 작전은 성공해도 부대 피로가 누적됨 */
    }
  } else if (optIdx === 1) {
    sc = clamp(sc + (((Math.random() * 9) | 0) - 4) + (stance === "hard" ? 2 : 0), 70, 90);
    dm = Math.max(dm, 2);
  } else {
    sc = clamp(sc + (((Math.random() * 11) | 0) - 3), 50, 68);
    dm = Math.max(dm, 5); /* 보수·안전 선택은 부대 사기를 크게 회복 */
  }
  const stanceXp = stance === "hard" ? 1.15 : stance === "rest" ? 0.9 : 1;
  const xpGain = Math.round(xpBase * (1 + grade * 0.12) * stanceXp * ng.xpMult);
  d.morale = clamp(d.morale + dm, 10, 100);
  d.rep = clamp(d.rep + dr, 0, 100);
  d.tension = clamp(d.tension + (backfired ? 5 : optIdx === 2 ? -3 : sc >= 85 ? -2 : 0), 5, 95);
  d.pending = d.pending.filter((x) => x !== id);
  d.headlines.unshift(`${careerDate(d.week)} · ${headline}`);
  d.headlines = d.headlines.slice(0, 12);
  if (sc >= 85 || backfired) {
    (d.timeline ??= []).push({id: `${d.week}:${id}`, turn: d.week, date: careerDate(d.week),
      title: ev[4], choice: label, outcome: headline, score: sc});
  }
  d.last = `${ev[4]} → ${label}${backfired ? " [차질 발생!]" : ""} (평정 ${letter(sc)} · ${sc}점 · +${xpGain} XP)`;
  if ((!d.report || d.report.routine) && (backfired || sc < 80)) {
    d.report = { title: `${ev[4]} — 상부 결과 보고`, items: d.report?.items ?? [], desc: backfired ? "업무 차질과 손실을 상급부대에 어떻게 보고하시겠습니까?" : "수행 중 확인된 미흡점과 장비 소모를 어떻게 보고하시겠습니까?" };
  } else if (sc >= 80 && d.week % 3 === 0 && d.reportFiledWeek !== d.week) {
    d.report ??= {title: "정례 보고", routine: true, items: []};
    (d.report.items ??= []).push(ev[4]);
  }
  if (!d.pending.length && !d.crisis && !d.report) d.doneWeek = true;
  recordEval(grade, sc);
  if (sc >= 70) { career.goodEvals = (career.goodEvals || 0) + 1; saveCareer(); }
  awardMedals({ source: ev[4], turn: d.week, score: sc, morale: d.morale, goodEvals: career.goodEvals || 0, grade });
  saveDuty(d);
  return { xpGain, score: sc, headline, label: backfired ? `${label} (작전 차질!)` : label, backfired };
}

/** Resolve after-action report dilemma: 0 = honest, 1 = embellish (18% audit risk), 2 = blame subordinate */
export function resolveReport(choiceIdx, grade) {
  const d = dutyState();
  if (!d.report || ![0, 1, 2].includes(choiceIdx)) return null;
  const { title, routine } = d.report;
  if (routine && (choiceIdx !== 0 || d.pending.length || d.crisis)) return null;
  d.report = null;
  d.reportFiledWeek = d.week;
  let sc = 75, dm = 0, dr = 0, msg = "";
  if (choiceIdx === 0) {
    sc = 72; dm = 3; dr = 6; msg = "사실대로 솔직 보고 — 군내 평판 +6 · 부대 사기 +3 (신뢰 확보)";
    if (routine) msg = "정례 보고 제출 · 평정 72점 · 군내 평판 +6 · 부대 사기 +3";
    d.headlines.unshift(`${careerDate(d.week)} · ${routine ? "정례 보고 제출" : "[군내 평판] 투명한 지휘 보고로 상급부대·부하 신뢰 확보"}`);
  } else if (choiceIdx === 1) {
    const caught = Math.random() < 0.18;
    if (caught) {
      (d.auditByGrade ??= {})[grade] = (d.auditByGrade[grade] || 0) + 1;
      sc = 44; dm = -4; dr = -10; msg = "성과 과장·축소 보고 감찰 적발! — 평정 44점 · 평판 −10";
      d.headlines.unshift(`${careerDate(d.week)} · [감찰 경고] 허위·축소 보고 정황 포착 — 인사 평정 감점`);
    } else {
      sc = 88; dm = -1; dr = 2; msg = "성과 중심 보고 통과 — 단기 평정 +88점 (감찰 미적발)";
      d.headlines.unshift(`${careerDate(d.week)} · [성과 보고] 우수 지휘 성과로 상급부대 호평`);
    }
  } else {
    sc = 78; dm = -8; dr = -4; msg = "현장 실무자 책임 전가 — 단기 평정 방어 · 부대 사기 −8";
    d.headlines.unshift(`${careerDate(d.week)} · [부대 여론] 지휘관 책임 전가 논란으로 사기 저하`);
  }
  d.morale = clamp(d.morale + dm, 10, 100);
  d.rep = clamp(d.rep + dr, 0, 100);
  d.headlines = d.headlines.slice(0, 12);
  if (!routine) {
    const labels = ["사실대로 보고", "성과 강조 · 미흡점 축소", "현장 실무자 책임으로 선 긋기"];
    (d.timeline ??= []).push({id: `${d.week}:report:${title}`, date: careerDate(d.week), turn:d.week,
      title, choice:labels[choiceIdx], outcome:msg, score:sc});
  }
  d.last = `${title} → ${msg}`;
  if (!d.pending.length && !d.crisis) d.doneWeek = true;
  recordEval(grade, sc);
  saveDuty(d);
  return { score: sc, msg };
}

/** Auto-delegate a crisis based on staff/branch/morale -> returns { win, xpGain, score, msg } */
export function resolveCrisisDelegate(grade, br, staffPower = 1) {
  const d = dutyState(), cr = dutyCrisisById(d.crisis); if (!cr) return null;
  const svc = serviceOf(br), match = cr.domain === svc ? 10 : 0, ng = ngBonuses();
  const chance = clamp(Math.round(52 + grade * 3 + (d.morale - 50) * 0.35 + (staffPower - 1) * 45 + match + ng.crisisBonus), 20, 95);
  const win = Math.random() * 100 < chance;
  const sc = win ? 78 + ((Math.random() * 14) | 0) : 42 + ((Math.random() * 14) | 0);
  const xpGain = Math.round((win ? 420 : 160) * (1 + grade * 0.25));
  d.morale = clamp(d.morale + (win ? 4 : -6), 10, 100);
  d.rep = clamp(d.rep + (win ? 5 : -6), 0, 100);
  d.tension = clamp(d.tension + (win ? -5 : 8), 5, 95);
  const hl = win ? `[속보] ${cr.title} — 군 위임 작전으로 격퇴 (승률 ${chance}%)` : `[속보] ${cr.title} 대응 차질 — 지휘부 책임론 대두`;
  d.headlines.unshift(`${careerDate(d.week)} · ${hl}`); d.headlines = d.headlines.slice(0, 12);
  d.last = `${cr.title} 자동 위임 → ${win ? "격퇴 성공" : "대응 실패"} (평정 ${letter(sc)} · +${xpGain} XP)`;
  d.crisis = null; if (!d.pending.length) d.doneWeek = true;
  recordEval(grade, sc);
  awardMedals({ won: win, crisis: true, score: sc, morale: d.morale, goodEvals: career.goodEvals || 0, grade });
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
  d.headlines.unshift(`${careerDate(d.week)} · ${hl}`); d.headlines = d.headlines.slice(0, 12);
  d.last = `${cr.title} (${modeLabel}) → ${win ? "대승" : "고전"} (평정 ${letter(sc)} · +${xpGain} XP)`;
  d.crisis = null; if (!d.pending.length) d.doneWeek = true;
  recordEval(grade, sc);
  awardMedals({ won: win, crisis: true, score: sc, morale: d.morale, goodEvals: career.goodEvals || 0, grade });
  if (win) { (career.crisisWins ??= {})[grade] = (career.crisisWins[grade] || 0) + 1; saveCareer(); }
  saveDuty(d);
  return { win, xpGain, score: sc, msg: hl };
}

export function nextDutyWeek(svc, grade, playerPost = "") {
  const d = dutyState();
  d.week++; d.doneWeek = false;
  addRankWeek(grade, 1);
  if (d.stance === "hard") d.morale = clamp(d.morale - 4, 10, 100);
  else if (d.stance === "rest") d.morale = clamp(d.morale + 6, 10, 100);
  d.lowMoraleWeeks = d.morale < 35 ? (d.lowMoraleWeeks || 0) + 1 : 0;
  if (d.study) {
    d.study--; recordEval(grade, 80);
    d.last = d.study ? "합동 세미나 · 부처 간 예산 조정 사례 발표" : "고등군사교육 수료 · 평판 +6";
    if (d.study) { d.doneWeek=true; saveDuty(d); return d; }
    (career.tours ??= {}).edu=true; saveCareer(); d.rep=Math.min(100,d.rep+6);
  }
  d.tension = clamp(d.tension + (Math.random() < 0.45 ? 3 : -1), 5, 95);
  tickRivals(d, grade, svc, playerPost);
  drawEvents(d, svc, grade);
  syncRivalPosts(d, svc, playerPost);
  saveDuty(d);
  return d;
}

export { SERVICES, BRANCHES, normBranch, serviceOf, careerTitle, evalOf, board, FOCUS, letter, career, saveCareer, weeksOf, minWeeks };
