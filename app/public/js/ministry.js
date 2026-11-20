// 국방부장관 · 국방 경영 (집무실): 예산·지지율, 전군 작전 교리, 방위력 개선 사업, 국방부 결재판, 합동 워룸, 임기·명예의 전당.
import { KOREA, kxy } from "./korea.js";
// 모든 수치는 게임용 값이다 (실제 국방 예산·제원이 아님).
const MK = "steeltide:mod", HK = "steeltide:hall", LK = "steeltide:legacy";
const TERM = 50, BASE = 4000, UPKEEP = 2000;
const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const won = (n) => `${Math.round(n).toLocaleString("ko-KR")}억`;
const pick = (a) => a[(Math.random() * a.length) | 0];

export const DOCTRINES = {
  off: { n: "공세적 억제", d: "먼저, 더 세게 친다", up: ["아군 화력 +15%", "재장전 −8% (초탄 빠르게)"], dn: ["받는 피해 +10%", "작전·해역 패배 시 지지율 감소 ×1.3"] },
  aad: { n: "전방위 방공·생존", d: "잃지 않는 군대", up: ["아군 요격 +12%", "함정 수리 기간 −1작전"], dn: ["재장전 +8%", "방위력 개선 사업 비용 +10%"] },
  joint: { n: "기동·합동 전력 극대화", d: "빠르게 모으고 빠르게 친다", up: ["지휘 지시 재사용 −20%", "작전 예비 투입 +1회"], dn: ["조종사 피로 +25%", "주간 유지비 +15%"] },
  tech: { n: "기술 중심 첨단화", d: "먼저 보고 먼저 안다", up: ["탐지 거리 +25%", "항공·KAMD·군수 사업 비용 −20%"], dn: ["수상함 사업 비용 +15%"] },
};
export const PROGS = {
  ship: { n: "수상함 전력 증강", ic: "⚓", lv: [[3000, "이지스함 배정 제한 해제 · 워룸 함대 전력 +6"], [5000, "작전 실패 시 신뢰도 감소 −15%"], [8000, "예비 투입 'FFX 호위함 증원' 해금"], [12000, "아군 대함미사일 사거리 +10%"], [20000, "예비 투입 '합동화력함 화력 지원' 해금"]] },
  air: { n: "차세대 항공·무장 개량", ic: "✈", lv: [[2500, "KF-21·F-15K 체공 시간 +15%"], [4500, "공대함 피해 +10%"], [7000, "항공 작전에 SEAD 전용 편대 추가"], [10000, "재무장 −30% · 조종사 피로 −30%"], [18000, "무인 전투기 편대 — 적 요격기 편대마다 1기 자동 격추"]] },
  kamd: { n: "KAMD 고도화 (L-SAM·SM-3)", ic: "⛨", lv: [[3000, "조기경보 — 아군 탐지 +10%"], [6000, "아군 요격 +8%"], [9000, "동시 교전 +2 — 포화 공격 대응 향상"], [13000, "요격 실패 시 2차 자동 요격 (30%)"], [22000, "전역 요격 쉴드 — 해안 지대함 위협 반감 · 워룸 위협 −10%"]] },
  log: { n: "군수·정비 인프라 자동화", ic: "⚙", lv: [[2000, "함정 수리 기간 −1작전"], [4000, "주간 유지비 −20%"], [6000, "작전 후 30% 확률 자동 정비"], [9000, "긴급 수리 신뢰도 비용 10 → 5"], [15000, "작전마다 1회 — 침몰 직전 함정 현장 즉시 수리"]] },
};
const AREAS = { west: { n: "서해 NLL", fleet: "f2", base: 80, w: [1, 3, 4] }, east: { n: "동해 북방", fleet: "f1", base: 70, w: [2, 4, 2] }, south: { n: "남해 교역로", fleet: "f3", base: 60, w: [4, 3, 1] } };
const FLEETS = { f1: "제1함대", f2: "제2함대", f3: "제3함대" }, REINF = { mob: ["기동함대", 35], sub: ["잠수함사령부", 28], airc: ["항공사령부", 30] };
const LVN = ["LOW", "MID", "HIGH"], LVK = ["낮음", "보통", "높음"], THREAT = [100, 140, 180];
const SUR = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오"], GIV = ["태준", "성호", "민재", "정훈", "현우", "동석", "재영", "상민", "영철", "준혁", "기현", "도윤"];

/** 결재 안건 12종: [id, 제목, 설명, [[선택, 설명, 효과 함수]]] */
const DOCKET = [
  ["export", "해외 방산 수출 승인", "K-2 전차와 천궁-II의 해외 수출 요청이 들어왔습니다. 전력 일시 공백과 경제적 이득 사이에서 결정하십시오.", [
    ["승인", "예산 +4,000억 · 2주간 아군 미사일 탑재 −10%", (m) => { m.budget += 4000; fx(m, "asmK", 0.9, 2); }],
    ["거부", "지지율 +5 · 산업계 반발로 예산 −500억", (m) => { m.support += 5; m.budget -= 500; }],
    ["조건부 수용", "예산 +2,000억 · 기술 유출 위험 5%", (m) => { m.budget += 2000; if (Math.random() < 0.05) { m.support -= 8; note(m, "기술 유출 의혹 보도 — 지지율 −8"); } }]], { sc: "press" }],
  ["roe", "NLL 교전수칙(ROE) 개정", "서해 접적 해역 교전수칙을 선제 타격 허용으로 바꾸자는 합참 건의입니다.", [
    ["선제 타격 허용", "4주간 아군 화력 +10% · 매주 10% 오발 사고(지지율 −20)", (m) => { fx(m, "outK", 1.1, 4); fx(m, "misfire", 1, 4); }],
    ["기존 수칙 유지", "지지율 +5 · 4주간 받는 피해 +5%", (m) => { m.support += 5; fx(m, "inK", 1.05, 4); }]]],
  ["audit", "국회 국방위 방위비 감사", "국방위원회가 방위비 집행 전반을 감사하겠다고 통보했습니다.", [
    ["강경 대립 (군 사기 고수)", "4주간 부대 사기 +1단계 · 예산 −1,000억 · 지지율 −10", (m) => { fx(m, "moraleAdd", 4, 4); m.budget -= 1000; m.support -= 10; }],
    ["타협 · 삭감 수용", "예산 −2,000억 · 지지율 +10", (m) => { m.budget -= 2000; m.support += 10; }]], { sc: "assembly" }],
  ["welfare", "장병 복지·정비창 예산 증액", "정비창 노후 설비 교체와 장병 생활관 개선 예산입니다.", [
    ["대규모 집행", "예산 −1,500억 · 4주간 수리 기간 −1작전 · 지지율 +8", (m) => { m.budget -= 1500; fx(m, "repairCut", 1, 4); m.support += 8; }],
    ["보류", "예산 보존 · 4주간 함대 사령관 지휘 −5", (m) => { fx(m, "cmd", -5, 4); }]]],
  ["rimpac", "연합 훈련(RIMPAC) 참가 규모", "환태평양 연합 훈련 참가 규모를 정해야 합니다.", [
    ["최대 규모 참가", "예산 −1,000억 · 4주간 지휘 지시 재사용 −30%", (m) => { m.budget -= 1000; fx(m, "cdK", 0.7, 4); }],
    ["축소 참가", "예산 보존 · 연합 효과 없음", () => {}]]],
  ["kss", "차기 잠수함 예산 증액", "잠수함사령부가 차기 잠수함 조기 전력화 예산을 요청했습니다.", [
    ["증액", "예산 −3,000억 · 워룸 잠수함사령부 지원 영구 +10", (m) => { m.budget -= 3000; m.subUp = (m.subUp || 0) + 10; }],
    ["보류", "지지율 −3 (안보 공백 논란)", (m) => { m.support -= 3; }]]],
  ["pay", "병사 봉급 인상", "병사 봉급 단계적 인상안이 국무회의에 올라왔습니다.", [
    ["인상", "예산 −2,000억 · 지지율 +12", (m) => { m.budget -= 2000; m.support += 12; }],
    ["동결", "예산 보존 · 4주간 부대 사기 −1단계", (m) => { fx(m, "moraleAdd", -4, 4); }]]],
  ["provoke", "서해 포격 도발 대응 수위", "북측이 서해 완충구역에 포격을 가했습니다. 대응 수위를 정하십시오.", [
    ["강경 대응", "지지율 +5 · 2주간 서해 위협 −1단계 · 10% 확전(동해 위협 +1단계)", (m) => { m.support += 5; fx(m, "thr:west", -1, 2); if (Math.random() < 0.1) { fx(m, "thr:east", 1, 2); note(m, "확전 — 동해 위협 상승"); } }],
    ["절제 대응", "지지율 −5", (m) => { m.support -= 5; }]], { sc: "press" }],
  ["graft", "방산 비리 의혹", "방산업체 납품 비리 의혹이 언론에 보도됐습니다.", [
    ["전면 감사", "지지율 +8 · 2주간 사업 비용 +15% (지연)", (m) => { m.support += 8; fx(m, "costK", 1.15, 2); }],
    ["내부 처리", "지지율 −10 · 10% 추가 폭로(−10)", (m) => { m.support -= 10; if (Math.random() < 0.1) { m.support -= 10; note(m, "추가 폭로 — 지지율 −10"); } }]], { sc: "assembly" }],
  ["intel", "한미 연합 정보 공유 확대", "연합 감시정찰 자산의 정보 공유 범위를 넓히는 안입니다.", [
    ["확대", "4주간 탐지 +10% · 지지율 −3 (주권 논란)", (m) => { fx(m, "detK", 1.1, 4); m.support -= 3; }],
    ["현행 유지", "변화 없음", () => {}]]],
  ["sat", "정찰위성 조기 전력화", "군 정찰위성 추가 발사를 1년 앞당기는 예산입니다.", [
    ["조기 전력화", "예산 −3,500억 · 탐지 영구 +5%", (m) => { m.budget -= 3500; m.satUp = true; }],
    ["원안대로", "변화 없음", () => {}]]],
  ["reserve", "예비군 훈련 강화", "예비군 동원훈련 일수를 늘리는 안입니다.", [
    ["강화", "예산 −800억 · 지지율 −4 · 4주간 워룸 전 함대 +5", (m) => { m.budget -= 800; m.support -= 4; fx(m, "fleet", 5, 4); }],
    ["축소", "지지율 +4 · 4주간 워룸 전 함대 −5", (m) => { m.support += 4; fx(m, "fleet", -5, 4); }]]],
  ["gmsa", "9·19 군사합의 효력 정지", "북측의 합의 위반이 이어지자 합참이 남북 군사합의 효력 정지를 건의했습니다. 접경 감시·훈련 제약이 풀리는 대신 우발 충돌 위험이 커집니다.", [
    ["전부 효력 정지", "4주간 탐지 +10%(공중감시 복원) · 2주간 서해 위협 +1단계 · 지지율 −2(찬반 갈림)", (m) => { fx(m, "detK", 1.1, 4); fx(m, "thr:west", 1, 2); m.support -= 2; }],
    ["일부 조항만 정지", "4주간 탐지 +5% · 변화 최소", (m) => { fx(m, "detK", 1.05, 4); }],
    ["합의 유지", "지지율 +3 · 4주간 탐지 −5%", (m) => { m.support += 3; fx(m, "detK", 0.95, 4); }]], { sc: "press", once: true, mo: "2023년 일부·2024년 전부 효력 정지 결정" }],
  ["speaker", "대북 확성기 방송", "북측의 오물풍선 살포가 계속되자 접경 확성기 방송 재개 여부를 결정해야 합니다.", [
    ["방송 재개", "지지율 +2 · 2주간 부대 사기 +1단계 · 30% 확률로 서해 위협 +1단계 — 3주 뒤 후속 안건", (m) => { m.support += 2; fx(m, "moraleAdd", 3, 2); if (Math.random() < 0.3) fx(m, "thr:west", 1, 2); chain(m, "noise", 3); }],
    ["방송 중지", "2주간 서해 위협 −1단계 · 지지율 −1", (m) => { fx(m, "thr:west", -1, 2); m.support -= 1; }]], { sc: "press", mo: "2024년 6월 재개, 2025년 6월 중지" }],
  ["noise", "접경 주민 소음 민원", "확성기 방송 이후 북측도 대남 소음 방송을 시작해 접경 지역 주민 민원이 쌓이고 있습니다.", [
    ["방송 유지", "지지율 −4 · 2주간 부대 사기 +1단계", (m) => { m.support -= 4; fx(m, "moraleAdd", 3, 2); }],
    ["상호 중지 제안", "지지율 +3 · 2주간 서해 위협 −1단계", (m) => { m.support += 3; fx(m, "thr:west", -1, 2); }]], { chainOnly: true }],
  ["drone", "드론 전력 조직 개편", "드론 전담 사령부가 각 군과 기능이 겹친다는 자문위원회 권고가 올라왔습니다.", [
    ["사령부 유지·확대", "예산 −2,500억 · 탐지 영구 +8% · 유지비 +5%", (m) => { m.budget -= 2500; m.droneUp = 1.08; m.upkeepUp = (m.upkeepUp || 1) * 1.05; }],
    ["각 군 이관 + 정책 본부", "예산 −800억 · 6주간 지휘 지시 재사용 −10%", (m) => { m.budget -= 800; fx(m, "cdK", 0.9, 6); }],
    ["현행 유지", "변화 없음", () => {}]], { once: true, mo: "2023년 드론작전사령부 창설 → 2026년 국방드론본부로 개편" }],
  ["phone", "병사 휴대전화 사용 시간 확대", "일과 후에만 허용하던 병사 휴대전화를 일과 중까지 넓히자는 시범 결과가 올라왔습니다.", [
    ["일과 중까지 확대", "지지율 +4 · 6주간 사기 +1단계 · 10% 보안 사고(지지율 −8, 2주 탐지 −5%)", (m) => { m.support += 4; fx(m, "moraleAdd", 3, 6); if (Math.random() < 0.1) { m.support -= 8; fx(m, "detK", 0.95, 2); note(m, "휴대전화 보안 사고 — 지지율 −8"); } }],
    ["현행 유지 (일과 후)", "변화 없음", () => {}],
    ["사용 축소", "4주간 사기 −1단계", (m) => { fx(m, "moraleAdd", -3, 4); }]], { mo: "2020년 일과 후 사용 전면 시행, 이후 확대 시범" }],
  ["meal", "장병 급식 개선", "부실 급식 제보가 이어지며 급식 민간위탁 확대안이 올라왔습니다.", [
    ["민간위탁 대폭 확대", "예산 −1,800억 · 지지율 +6 · 4주간 사기 +1단계", (m) => { m.budget -= 1800; m.support += 6; fx(m, "moraleAdd", 3, 4); }],
    ["급식비 인상만", "예산 −1,000억 · 지지율 +3", (m) => { m.budget -= 1000; m.support += 3; }],
    ["보류", "지지율 −4 · 10% 부실급식 보도(−8)", (m) => { m.support -= 4; if (Math.random() < 0.1) { m.support -= 8; note(m, "부실급식 보도 — 지지율 −8"); } }]], { sc: "press", mo: "2021년 부실급식 논란 → 민간위탁 확대" }],
  ["ssn", "핵추진잠수함 사업 착수", "방위사업추진위원회에 핵추진잠수함 사업추진기본전략이 상정됐습니다. 사상 최대 규모 무기 사업입니다.", [
    ["착수 의결", "예산 −6,000억 · 워룸 잠수함사령부 영구 +15 · 지지율 +4 · 2주간 동해 위협 +1단계(주변국 반발)", (m) => { m.budget -= 6000; m.subUp = (m.subUp || 0) + 15; m.support += 4; fx(m, "thr:east", 1, 2); }],
    ["연구 단계만", "예산 −1,500억 · 잠수함사령부 +5", (m) => { m.budget -= 1500; m.subUp = (m.subUp || 0) + 5; }],
    ["보류", "지지율 −3", (m) => { m.support -= 3; }]], { sc: "assembly", once: true, mo: "2026년 방추위 핵잠 사업 의결" }],
  ["opcon", "전시작전통제권 전환 목표연도", "한미안보협의회에서 전작권 전환 목표연도를 건의할지 결정해야 합니다.", [
    ["조기 연도 건의", "지지율 −5 · 8주간 워룸 사령관 지휘 +5 · 4주간 지휘 지시 재사용 +10%(연합 체계 조정)", (m) => { m.support -= 5; fx(m, "cmd", 5, 8); fx(m, "cdK", 1.1, 4); }],
    ["조건 충족 후 결정", "변화 없음", () => {}],
    ["시기상조 입장", "지지율 +5", (m) => { m.support += 5; }]], { sc: "press", once: true, mo: "2026년 SCM 전환 목표연도 건의 추진" }],
  ["kf21", "KF-21 최초 양산 물량", "국책연구기관이 무장 검증 전 양산 물량을 절반으로 줄이라고 권고했습니다.", [
    ["계획대로 대량 양산", "예산 −4,000억 · 워룸 항공사령부 영구 +10", (m) => { m.budget -= 4000; m.airUp = (m.airUp || 0) + 10; }],
    ["절반 양산 후 검증", "예산 −2,000억 · 항공사령부 +5", (m) => { m.budget -= 2000; m.airUp = (m.airUp || 0) + 5; }],
    ["양산 연기", "예산 +1,000억 · 지지율 −4(방산업계 반발)", (m) => { m.budget += 1000; m.support -= 4; }]], { sc: "assembly", once: true, mo: "2024년 KF-21 최초 양산 물량 논란" }],
  ["manpower", "상비병력 감소 대응", "저출산으로 상비병력이 정원보다 크게 모자랍니다. 대응 방향을 정해야 합니다.", [
    ["상비예비군 대폭 확대", "예산 −2,500억 · 8주간 워룸 전 함대 +5", (m) => { m.budget -= 2500; fx(m, "fleet", 5, 8); }],
    ["복무기간 연장 검토", "지지율 −12 · 4주간 사기 −1단계 · 8주간 전 함대 +8", (m) => { m.support -= 12; fx(m, "moraleAdd", -3, 4); fx(m, "fleet", 8, 8); }],
    ["부대 통폐합", "유지비 영구 −15% · 8주간 전 함대 −3", (m) => { m.upkeepUp = (m.upkeepUp || 1) * 0.85; fx(m, "fleet", -3, 8); }]], { sc: "assembly", mo: "상비병력 50만 명 선 붕괴" }],
  ["nco", "초급간부 처우 개선", "부사관·초급장교 지원율이 떨어져 당직비·주거 지원 개선안이 올라왔습니다.", [
    ["대폭 개선", "예산 −2,200억 · 6주간 사기 +1단계 · 4주간 수리 −1작전", (m) => { m.budget -= 2200; fx(m, "moraleAdd", 3, 6); fx(m, "repairCut", 1, 4); }],
    ["단계적 개선", "예산 −900억 · 2주간 사기 +1단계", (m) => { m.budget -= 900; fx(m, "moraleAdd", 3, 2); }],
    ["동결", "4주간 함대 사령관 지휘 −3", (m) => { fx(m, "cmd", -3, 4); }]], { mo: "간부 선발률 하락" }],
  ["rank", "병 계급체계 단순화", "병사 계급을 줄이고 직업군인 중심으로 개편하는 안입니다.", [
    ["추진", "지지율 +2 · 2주간 지휘 지시 재사용 +10%(과도기) · 6주간 사기 +1단계", (m) => { m.support += 2; fx(m, "cdK", 1.1, 2); fx(m, "moraleAdd", 3, 6); }],
    ["보류", "변화 없음", () => {}]], { once: true, mo: "국방부 병 계급체계 개편 추진" }],
  ["dronewar", "드론 운용 인력 양성", "장병·예비군 대상 대규모 드론 운용 교육 예산입니다.", [
    ["대규모 양성", "예산 −2,000억 · 탐지 영구 +5% · 지지율 +2", (m) => { m.budget -= 2000; m.droneWar = 1.05; m.support += 2; }],
    ["시범 운영", "예산 −500억 · 4주간 탐지 +3%", (m) => { m.budget -= 500; fx(m, "detK", 1.03, 4); }],
    ["보류", "변화 없음", () => {}]], { once: true, mo: "'50만 드론전사' 양성 정책" }],
  ["sma", "한미 방위비분담금 협상", "주한미군 방위비분담금 협상 막바지입니다. 미측이 큰 폭의 인상을 요구합니다.", [
    ["대폭 인상 수용", "예산 −3,000억 · 4주간 지휘 지시 재사용 −20%(연합 지원) · 지지율 −6", (m) => { m.budget -= 3000; fx(m, "cdK", 0.8, 4); m.support -= 6; }],
    ["소폭 인상 타결", "예산 −1,200억 · 지지율 +2", (m) => { m.budget -= 1200; m.support += 2; }],
    ["협상 장기화", "예산 보존 · 지지율 +3 · 4주간 지휘 지시 재사용 +15%", (m) => { m.support += 3; fx(m, "cdK", 1.15, 4); }]], { sc: "press" }],
  ["balloon", "오물풍선·GPS 교란 대응", "북측이 오물풍선과 GPS 전파 교란을 이어 가고 있습니다.", [
    ["강경 대응", "지지율 +3 · 2주간 서해 위협 +1단계", (m) => { m.support += 3; fx(m, "thr:west", 1, 2); }],
    ["감시·방공 강화", "예산 −700억 · 4주간 탐지 +5%", (m) => { m.budget -= 700; fx(m, "detK", 1.05, 4); }],
    ["외교 채널 대응", "지지율 −2", (m) => { m.support -= 2; }]], { mo: "2024년 오물풍선·GPS 교란" }],
  ["uav", "적 무인기 영공 침투", "적 소형 무인기가 수도권 상공까지 들어왔다가 돌아갔습니다. 격추에 실패했습니다.", [
    ["대드론 체계 긴급 구매", "예산 −2,500억 · 4주간 요격 +8%", (m) => { m.budget -= 2500; fx(m, "icptK", 1.08, 4); }],
    ["감시 레이더 재배치", "예산 −600억 · 4주간 탐지 +8%", (m) => { m.budget -= 600; fx(m, "detK", 1.08, 4); }],
    ["작전 책임자 문책", "지지율 +4 · 4주간 사령관 지휘 −3", (m) => { m.support += 4; fx(m, "cmd", -3, 4); }]], { sc: "assembly", mo: "2022년 12월 북 무인기 침투" }],
  ["drill", "한미 연합연습 규모", "다음 연합연습의 실기동 훈련 규모를 정해야 합니다.", [
    ["대규모 실기동", "예산 −1,200억 · 4주간 화력 +8% · 2주간 동해 위협 +1단계", (m) => { m.budget -= 1200; fx(m, "outK", 1.08, 4); fx(m, "thr:east", 1, 2); }],
    ["지휘소 연습 위주", "예산 −300억", (m) => { m.budget -= 300; }],
    ["축소·유예", "지지율 +2 · 4주간 화력 −5%", (m) => { m.support += 2; fx(m, "outK", 0.95, 4); }]] ],
  ["airbase", "군 공항 이전 갈등", "도심 군 공항 이전을 두고 지자체 간 갈등이 커지고 있습니다.", [
    ["이전 추진", "예산 −2,000억 · 지지율 +2", (m) => { m.budget -= 2000; m.support += 2; }],
    ["현 위치 유지", "지지율 −5", (m) => { m.support -= 5; }],
    ["협의체 구성", "지지율 +1 — 4주 뒤 다시 결정", (m) => { m.support += 1; chain(m, "airbase", 4); }]] ],
  ["zone", "접경 군사시설보호구역 해제", "접경 지역 지자체가 보호구역 해제를 요구합니다.", [
    ["대규모 해제", "지지율 +8 · 4주간 탐지 −5%", (m) => { m.support += 8; fx(m, "detK", 0.95, 4); }],
    ["일부 해제", "지지율 +3", (m) => { m.support += 3; }],
    ["유지", "지지율 −4", (m) => { m.support -= 4; }]] ],
  ["gsomia", "한·일 군사정보 공유", "한·일 군사정보 공유 범위를 넓히자는 제안이 들어왔습니다.", [
    ["확대", "6주간 탐지 +6% · 지지율 −5", (m) => { fx(m, "detK", 1.06, 6); m.support -= 5; }],
    ["현행 유지", "변화 없음", () => {}],
    ["축소", "지지율 +3 · 4주간 탐지 −4%", (m) => { m.support += 3; fx(m, "detK", 0.96, 4); }]], { sc: "press" }],
  ["trilat", "한미일 해상 훈련 정례화", "한미일 해상 미사일 경보 훈련을 정례화하자는 안입니다.", [
    ["정례화", "4주간 요격 +5% · 지지율 −3 · 2주간 동해 위협 +1단계", (m) => { fx(m, "icptK", 1.05, 4); m.support -= 3; fx(m, "thr:east", 1, 2); }],
    ["사안별 실시", "변화 없음", () => {}]] ],
  ["medic", "군의관 부족", "군의관과 의무 인력이 부족해 응급 후송 체계에 공백이 생겼습니다.", [
    ["민간 병원 위탁 확대", "예산 −1,500억 · 4주간 사기 +1단계", (m) => { m.budget -= 1500; fx(m, "moraleAdd", 3, 4); }],
    ["단기 군의관 증원", "예산 −800억", (m) => { m.budget -= 800; }],
    ["보류", "10% 의료사고 보도(지지율 −10)", (m) => { if (Math.random() < 0.1) { m.support -= 10; note(m, "군 의료사고 보도 — 지지율 −10"); } }]] ],
  ["probe", "훈련 중 사망 사고 수사", "훈련 중 장병 사망 사고가 발생했습니다. 수사 방식을 두고 국회가 장관 출석을 요구했습니다.", [
    ["민간 수사기관 이첩·전면 공개", "지지율 +6 · 4주간 사령관 지휘 −4(지휘부 위축)", (m) => { m.support += 6; fx(m, "cmd", -4, 4); }],
    ["군 자체 수사", "지지율 −8 · 15% 외압 의혹 보도(−10)", (m) => { m.support -= 8; if (Math.random() < 0.15) { m.support -= 10; note(m, "수사 외압 의혹 보도 — 지지율 −10"); } }]], { sc: "assembly" }],
  ["neutral", "군의 정치적 중립 교육", "군의 정치적 중립을 제도로 강화하라는 국회 요구가 나왔습니다.", [
    ["전군 교육·제도 개선", "예산 −500억 · 지지율 +5 · 2주간 사기 −1단계(피로)", (m) => { m.budget -= 500; m.support += 5; fx(m, "moraleAdd", -3, 2); }],
    ["현행 교육 유지", "지지율 −3", (m) => { m.support -= 3; }]], { sc: "assembly" }],
  ["lhd", "경항모 사업", "경항공모함 사업을 계속할지 재검토 요구가 나왔습니다.", [
    ["추진", "예산 −5,000억 · 워룸 기동함대 영구 +12 · 지지율 −2(예산 논란)", (m) => { m.budget -= 5000; m.mobUp = (m.mobUp || 0) + 12; m.support -= 2; }],
    ["재검토", "지지율 +2", (m) => { m.support += 2; }]], { sc: "assembly", once: true, mo: "경항모 사업 존폐 논쟁" }],
  ["lsam", "장거리 지대공 조기 배치", "L-SAM 조기 배치를 위해 양산 일정을 앞당기는 안입니다.", [
    ["조기 배치", "예산 −3,500억 · 요격 영구 +5%", (m) => { m.budget -= 3500; m.lsamUp = 1.05; }],
    ["계획대로", "변화 없음", () => {}]], { once: true }],
  ["cyber", "군 내부망 해킹 시도", "군 내부망에 대한 대규모 해킹 시도가 탐지됐습니다.", [
    ["망 분리 강화", "예산 −900억 · 2주간 탐지 −3%(운용 불편)", (m) => { m.budget -= 900; fx(m, "detK", 0.97, 2); }],
    ["공세적 사이버 대응", "지지율 −2 · 4주간 탐지 +5%", (m) => { m.support -= 2; fx(m, "detK", 1.05, 4); }],
    ["조사 후 보고", "20% 정보 유출 확인(지지율 −8)", (m) => { if (Math.random() < 0.2) { m.support -= 8; note(m, "해킹 정보 유출 확인 — 지지율 −8"); } }]] ]
];
function chain(m, id, weeks) { (m.queue ??= []).push({ id, week: m.week + weeks }); }
const DK = (id) => DOCKET.find((d) => d[0] === id);
function fx(m, k, v, weeks) { (m.fx ??= []).push({ k, v, until: m.week + weeks }); }
function note(m, t) { (m.notes ??= []).unshift(`${m.week}주차 · ${t}`); m.notes = m.notes.slice(0, 30); }

export const minState = () => rd(MK, null);
const save = (m) => wr(MK, m);
export const hall = () => rd(HK, []);
export const legacy = () => rd(LK, null);

/** 장관 취임: 집무실 데이터 생성 (이미 있으면 그대로) */
export function minStart(name) {
  let m = minState(); if (m && !m.retired) return m;
  const L = legacy(), cm = () => ({ name: `${pick(SUR)}${pick(GIV)}`, st: 50 + ((Math.random() * 36) | 0) });
  m = { week: 1, budget: 14200, support: 60, doctrine: null, prog: { ship: 0, air: 0, kamd: 0, log: 0 }, fx: [], notes: [], sup: [], war: null, wins: 0, fights: 0, docket: [], name,
    cmdr: { f1: cm(), f2: cm(), f3: cm(), mob: cm(), sub: cm(), airc: cm() }, retired: false };
  if (L?.prog) m.prog[L.prog] = 3;
  newWeek(m, true); save(m); return m;
}
function lvOf(m, k) { return m.week ? Math.max(0, m.prog[k] || 0) : 0; }
const fxv = (m, k, d) => (m.fx || []).filter((e) => e.k === k && e.until >= m.week).reduce((a, e) => (d === 1 ? a * e.v : a + e.v), d);

/** 작전·전투에 쓰는 보정치 — 장관 재임 중이거나 2회차 계승이 있을 때만 */
export function minFx() {
  const m = minState(), on = m && !m.retired, L = legacy(), lv = (k) => (on ? m.prog[k] || 0 : L?.prog === k ? 3 : 0), D = on ? m.doctrine : null;
  const F = { outK: 1, inK: 1, icptK: 1, detK: 1, reloadK: 1, resPlus: 0, fatK: 1, cdK: 1, asmK: 1, moraleAdd: 0, repairCut: 0, trustLossK: 1, rngK: 1, airFuelK: 1, a2sK: 1, seadUnit: false, uav: false, satK: 0, icpt2: false, coastCut: false, autoRepair: false, fixCost: 10, saveSunk: false, aegisOk: false, ffx: false, jsf: false, lossK: 1, on: !!on };
  if (L?.medal) F.outK *= 1.1;
  if (D === "off") { F.outK *= 1.15; F.reloadK *= 0.92; F.inK *= 1.1; F.lossK = 1.3; }
  if (D === "aad") { F.icptK *= 1.12; F.repairCut += 1; F.reloadK *= 1.08; }
  if (D === "joint") { F.cdK *= 0.8; F.resPlus += 1; F.fatK *= 1.25; }
  if (D === "tech") F.detK *= 1.25;
  const s = lv("ship"), a = lv("air"), k = lv("kamd"), g = lv("log");
  if (s >= 1) F.aegisOk = true; if (s >= 2) F.trustLossK = 0.85; if (s >= 3) F.ffx = true; if (s >= 4) F.rngK = 1.1; if (s >= 5) F.jsf = true;
  if (a >= 1) F.airFuelK = 1.15; if (a >= 2) F.a2sK = 1.1; if (a >= 3) F.seadUnit = true; if (a >= 4) { F.rearmK = 0.7; F.fatK *= 0.7; } if (a >= 5) F.uav = true;
  if (k >= 1) F.detK *= 1.1; if (k >= 2) F.icptK *= 1.08; if (k >= 3) F.satK = 2; if (k >= 4) F.icpt2 = true; if (k >= 5) F.coastCut = true;
  if (g >= 1) F.repairCut += 1; if (g >= 3) F.autoRepair = true; if (g >= 4) F.fixCost = 5; if (g >= 5) F.saveSunk = true;
  if (on) { F.outK *= fxv(m, "outK", 1); F.inK *= fxv(m, "inK", 1); F.icptK *= fxv(m, "icptK", 1) * (m.lsamUp || 1); F.detK *= fxv(m, "detK", 1) * (m.satUp ? 1.05 : 1) * (m.droneUp || 1) * (m.droneWar || 1); F.asmK *= fxv(m, "asmK", 1); F.cdK *= fxv(m, "cdK", 1); F.moraleAdd += fxv(m, "moraleAdd", 0); F.repairCut += fxv(m, "repairCut", 0); }
  F.rearmK ??= 1; F.repairCut = Math.min(2, F.repairCut); return F;
}

function progCost(m, k, lvl) { const D = m.doctrine, base = PROGS[k].lv[lvl][0]; return Math.round(base * (D === "aad" ? 1.1 : 1) * (D === "tech" ? (k === "ship" ? 1.15 : 0.8) : 1) * fxv(m, "costK", 1)); }
function upkeep(m) { return Math.round(UPKEEP * (m.doctrine === "joint" ? 1.15 : 1) * ((m.prog.log || 0) >= 2 ? 0.8 : 1) * (m.upkeepUp || 1)); }
function income(m) { return Math.round(BASE * (1 + m.support / 200)); }

function newWeek(m, first) {
  const areas = {};
  for (const [k, A] of Object.entries(AREAS)) { const r = Math.random() * (A.w[0] + A.w[1] + A.w[2]); let lvl = r < A.w[0] ? 0 : r < A.w[0] + A.w[1] ? 1 : 2; lvl = clamp(lvl + fxv(m, `thr:${k}`, 0), 0, 2); areas[k] = { lvl, reinf: null, res: null }; }
  m.war = { areas, direct: null };
  const seen = m.seenDk ??= {}, due = (m.queue || []).filter((q) => q.week <= m.week).map((q) => q.id); m.queue = (m.queue || []).filter((q) => q.week > m.week);
  let pool = DOCKET.filter((d) => !d[4]?.chainOnly && !(d[4]?.once && seen[d[0]]) && !(seen[d[0]] && m.week - seen[d[0]] < 18) && !due.includes(d[0])).map((d) => d[0]);
  if (pool.length < 3) pool = DOCKET.filter((d) => !d[4]?.chainOnly && !(d[4]?.once && seen[d[0]])).map((d) => d[0]);
  const n = first ? 1 : Math.random() < 0.55 ? 2 : 1; m.docket = due.slice(0, 2);
  while (m.docket.length < n && pool.length) { const id = pool.splice((Math.random() * pool.length) | 0, 1)[0]; if (!m.docket.includes(id)) m.docket.push(id); }
  for (const id of m.docket) seen[id] = m.week;
}
/** 긴급 NSC 대응 방침 (위협 '높음' 해역이 생긴 주) — 진돗개는 실제 대비태세 명칭을 빌린 것 */
const NSC_OPT = [["진돗개 하나 발령 · 대비태세 격상", "해당 해역 위임 승률 +10% · 지지율 −1", "진돗개 하나를 발령하고 해당 해역 전력을 즉각 대응 태세로 올리겠습니다.", (m, W) => { W.nsc = 0.1; m.support -= 1; }],
  ["한미 공조 · 외교 채널 가동", "위협 한 단계 낮춤 · 예산 −300억", "동맹과 정보를 공유하고 외교 채널로 긴장 완화를 시도하겠습니다.", (m, W) => { W.lvl = 1; m.budget -= 300; }],
  ["사령관 판단 존중 · 정례 대응", "변화 없음 · 지지율 +1 (침착한 대응)", "현장 지휘관의 판단을 존중하고 정례 절차대로 대응하겠습니다.", (m) => { m.support += 1; }]];
function areaP(m, k) {
  const A = AREAS[k], W = m.war.areas[k], c = m.cmdr[A.fleet], r = W.reinf;
  const sCmd = c.st + fxv(m, "cmd", 0), sFleet = A.base + (m.prog.ship || 0) * 4 + ((m.prog.ship || 0) >= 1 ? 6 : 0) + (m.prog.log || 0) * 2 + fxv(m, "fleet", 0);
  const sSup = r ? REINF[r][1] + m.cmdr[r].st * 0.2 + (r === "sub" ? m.subUp || 0 : 0) + (r === "airc" ? (m.prog.air || 0) * 4 + (m.airUp || 0) : 0) + (r === "mob" ? (m.prog.ship || 0) * 3 + (m.mobUp || 0) : 0) : 0;
  const thr = (THREAT[W.lvl] + m.week * 2.8) * (1 - (m.prog.kamd || 0) * 0.02) * ((m.prog.kamd || 0) >= 5 ? 0.9 : 1);
  const k2 = m.doctrine === "off" ? 1.08 : m.doctrine === "joint" && r ? 1.06 : m.doctrine === "aad" ? 1.03 : 1;
  return clamp(Math.round(((sCmd + sFleet + sSup * (m.doctrine === "joint" ? 1.2 : 1)) / thr) * 100 * k2 * 0.62 * (1 + (W.nsc || 0))), 5, 99);
}
const outcomeOf = (p) => (p >= 75 ? ["대승", "g", 1, 300] : p >= 50 ? ["승리", "y", 0, 100] : ["패배", "r", -4, -500]);

/** 직접 지휘한 서해 작전 결과 (작전지도에서 호출) */
export function minOpResult(win) {
  const m = minState(); if (!m || m.retired || !m.war || m.war.direct !== "west") return; const W = m.war.areas.west;
  W.res = win ? ["대승", "g", 3, 800, true] : ["패배", "r", -5, -500, true]; save(m);
}

function endWeek(m) {
  const log = [];
  for (const k of Object.keys(AREAS)) { const W = m.war.areas[k]; let o = W.res;
    if (!o) { const p = clamp(areaP(m, k) + ((Math.random() * 21) | 0) - 10, 0, 100); o = outcomeOf(p); o = [...o, false, p]; }
    const sup = o[2] < 0 ? Math.round(o[2] * (m.doctrine === "off" ? 1.3 : 1)) : o[2]; m.support += sup; m.budget += o[3]; m.fights++; if (o[0] !== "패배") m.wins++;
    log.push(`${AREAS[k].n} ${o[0]}${o[4] ? "(직접 지휘)" : ""} 지지율 ${sup > 0 ? "+" : ""}${sup}`); }
  if (fxv(m, "misfire", 0) > 0 && Math.random() < 0.1) { m.support -= 20; log.push("선제 타격 수칙 — 오발 사고 발생, 지지율 −20"); }
  const inc = income(m), up = upkeep(m); m.budget += inc - up; log.push(`정기 예산 +${won(inc)} · 유지비 −${won(up)}`);
  m.support = clamp(Math.round(m.support + (m.support > 75 ? -3 : m.support > 65 ? -1 : m.support < 50 ? 2 : 0)), 0, 100); m.sup.push(m.support); (m.bud ??= []).push(m.budget);
  note(m, log.join(" · ")); m.last = log;
  m.fx = m.fx.filter((e) => e.until > m.week); m.week++;
  if (m.week > TERM) return termEnd(m);
  newWeek(m);
}
function termEnd(m) {
  const avg = Math.round(m.sup.reduce((a, b) => a + b, 0) / Math.max(1, m.sup.length)), l5 = Object.values(m.prog).filter((v) => v >= 5).length, rate = Math.round((m.wins / Math.max(1, m.fights)) * 100);
  const ok = avg >= 60 && l5 >= 2 && rate >= 80; m.retired = true; m.term = { avg, l5, rate, ok };
  const H = hall(); H.unshift({ name: m.name, gen: (legacy()?.gen || 1), at: new Date().toISOString().slice(0, 10), avg, l5, rate, ok, doctrine: m.doctrine ? DOCTRINES[m.doctrine].n : "—", prog: { ...m.prog }, face: globalThis.__myFace?.() || null, start: m.started || null }); wr(HK, H.slice(0, 40));
}

// ── 화면 ──
/** 결재 서류 한 장 (sc가 있으면 국회·기자회견 장면으로 결정) */
const DRAFTER = { gmsa: "국방정책실장", speaker: "국방정책실장", opcon: "국방정책실장", gsomia: "국제정책관", trilat: "국제정책관", neutral: "국방정책실장", sma: "국제정책관", kf21: "전력정책관", lhd: "전력정책관", lsam: "전력정책관", ssn: "전력정책관", cyber: "전력정책관", drone: "전력정책관", dronewar: "전력정책관", uav: "전력정책관", manpower: "인사복지실장", nco: "인사복지실장", rank: "인사복지실장", phone: "인사복지실장", meal: "인사복지실장", medic: "보건복지관", airbase: "군사시설기획관", zone: "군사시설기획관" };
const SCK = "steeltide:scenes", scenesOn = () => { try { return localStorage.getItem(SCK) !== "off"; } catch { return true; } };
const face = (seed, s, o) => (globalThis.__face ? globalThis.__face(seed, s, o) : "");
function docHTML(m, id, t, d, opts, meta) {
  const sc = scenesOn() && meta.sc, who = DRAFTER[id] || "기획조정실장", no = `국방정책-${String(2026 * 7 + m.week * 13 + id.length * 97).slice(-4)}`;
  return `<div class="mn-card mn-dk mn-paper" data-dk="${id}"><div class="dh"><div class="dt"><small>국 방 부</small><b>${t}</b><span>문서번호 ${no} · ${m.week}주차 · 보고 ${who}</span></div>
    <table class="kj"><tr><th>기안</th><th>검토</th><th>결재</th></tr><tr><td>${face(who + id, 30, { age: 2 })}<i>${who.replace(/(실장|관)$/, "")}</i></td><td><em class="ok">차관</em></td><td class="me"><em>장관</em></td></tr></table></div>
    ${meta.mo ? `<span class="mo">실제 사례 모티브 · ${meta.mo}</span>` : ""}<p>${d}</p>${sc ? `<button class="mn-sc" data-min="scene:${id}"><b>${sc === "press" ? "🎤 기자회견장으로 ›" : "🏛 국회 국방위원회 출석 ›"}</b><small>${opts.length}개 답변 중 하나를 고르면 결재됩니다</small></button>` : opts.map(([n, e], i) => `<button data-min="dk:${id}:${i}"><b>${n}</b><small>${e}</small></button>`).join("")}</div>`;
}
let tab = "desk", ngArm = false;
const bar = (v, c = "") => `<i class="mn-bar"><em class="${c}" style="width:${clamp(v, 0, 100)}%"></em></i>`;
export function minHTML() {
  const m = minState(); if (!m) return "";
  if (m.retired) return retiredHTML(m);
  const F = minFx(), dk = m.docket.map(DK).filter(Boolean), pend = dk.length;
  const nscC = m.nsc && m.war.areas[m.nsc] ? `<div class="mn-card mn-dk mn-nsc"><b>긴급 NSC — ${AREAS[m.nsc].n} 위협 '높음'</b><p>적 함정·항공기 활동이 급증했습니다. 이번 주 대응 방침을 정하십시오.</p>${scenesOn() ? `<button class="mn-sc" data-min="nscview"><b>🎬 회의 장면으로 ›</b><small>장면을 건너뛰었다면 여기서 다시 열 수 있습니다</small></button>` : ""}${NSC_OPT.map(([n, e], i) => `<button data-min="nsc:${i}"><b>${n}</b><small>${e}</small></button>`).join("")}</div>` : "";
  const left = `<div class="mn-col"><div class="mn-h">국방부 결재판 <small>${pend ? `${pend}건 대기` : "처리 완료"}</small><button class="mn-tg ${scenesOn() ? "on" : ""}" data-min="scenes">🎬 결재 연출 ${scenesOn() ? "ON" : "OFF"}</button></div>${nscC}${dk.length ? dk.map(([id, t, d, opts, meta]) => docHTML(m, id, t, d, opts, meta || {})).join("") : `<div class="mn-card"><small>이번 주 결재 안건을 모두 처리했습니다.</small></div>`}
    <div class="mn-h">작전 교리 <small>출격 전 언제든 변경</small></div>${Object.entries(DOCTRINES).map(([k, d]) => `<button class="mn-doc ${m.doctrine === k ? "on" : ""}" data-min="doc:${k}"><b>${d.n}</b><small>${d.d}</small><span>${d.up.map((x) => `<em class="g">${x}</em>`).join("")}${d.dn.map((x) => `<em class="r">${x}</em>`).join("")}</span></button>`).join("")}</div>`;
  const A = m.war.areas, mapSv = warMap(m), used = Object.values(A).map((w) => w.reinf).filter(Boolean);
  const mid = `<div class="mn-col mn-war"><div class="mn-h">합동 워룸 <small>${m.week}주차 위기 — 서해만 직접 지휘 가능, 나머지는 사령관 위임</small></div>${mapSv}<div class="mn-map">${Object.entries(AREAS).map(([k, a]) => { const W = A[k], p = areaP(m, k), c = m.cmdr[a.fleet], o = W.res;
      return `<div class="mn-area ${k} t${W.lvl}"><div class="ah"><b>${a.n}</b><span class="lv l${W.lvl}">위협 ${LVN[W.lvl]}</span></div><small>할당 <b>${FLEETS[a.fleet]}</b> · 사령관 ${c.name} 중장 (지휘 ${c.st}${fxv(m, "cmd", 0) ? ` ${fxv(m, "cmd", 0) > 0 ? "+" : ""}${fxv(m, "cmd", 0)}` : ""})</small>
      <div class="rf">증원 ${Object.entries(REINF).map(([r, [n]]) => `<button data-min="rf:${k}:${r}" class="${W.reinf === r ? "on" : ""}" ${used.includes(r) && W.reinf !== r ? "disabled" : ""}>${n.replace("사령부", "")}</button>`).join("")}</div>
      <div class="pw">위임 예상 ${bar(p, p >= 75 ? "g" : p >= 50 ? "y" : "r")}<b class="${p >= 75 ? "g" : p >= 50 ? "y" : "r"}">${p}% · ${outcomeOf(p)[0]}</b></div>
      ${k === "west" ? (o ? `<div class="dr ${o[1]}">직접 지휘 결과: <b>${o[0]}</b></div>` : `<button class="mn-go" data-min="direct">직접 지휘 — 작전지도로 출격</button>`) : ""}</div>`; }).join("")}</div>
    ${trendSVG(m)}<div class="mn-card mn-log"><div class="mn-h">지난 주 결과</div>${(m.last || ["취임 첫 주입니다. 교리를 선포하고 결재·워룸을 정리한 뒤 '다음 주'를 누르십시오."]).map((t) => `<small>${t}</small>`).join("")}</div></div>`;
  const right = `<div class="mn-col"><div class="mn-h">방위력 개선 사업 <small>각 5단계</small></div>${Object.entries(PROGS).map(([k, P]) => { const L = m.prog[k] || 0, nx = L < 5 ? progCost(m, k, L) : 0;
      return `<div class="mn-card mn-pg"><div class="ph"><b>${P.ic} ${P.n}</b><span>LV ${L}/5</span></div><div class="lvs">${P.lv.map(([, d], i) => `<div class="${i < L ? "done" : i === L ? "next" : ""}"><i>${i + 1}</i>${d}</div>`).join("")}</div>${L < 5 ? `<button data-min="pg:${k}" ${m.budget < nx ? "disabled" : ""}>LV ${L + 1} 투자 — ${won(nx)}</button>` : `<em class="g">완성</em>`}</div>`; }).join("")}</div>`;
  const avg = m.sup.length ? Math.round(m.sup.reduce((a, b) => a + b, 0) / m.sup.length) : m.support, l5 = Object.values(m.prog).filter((v) => v >= 5).length, rate = m.fights ? Math.round((m.wins / m.fights) * 100) : 0;
  return `<div class="mn"><div class="mn-top"><div class="mt"><span>임기</span><b>${m.week} / ${TERM}주</b>${bar((m.week / TERM) * 100)}</div><div class="mt"><span>국방 예산</span><b>${won(m.budget)}</b><small>주간 +${won(income(m))} · 유지비 −${won(upkeep(m))}</small></div><div class="mt"><span>국정 지지율</span><b class="${m.support >= 60 ? "g" : m.support >= 40 ? "y" : "r"}">${m.support}</b>${bar(m.support, m.support >= 60 ? "g" : m.support >= 40 ? "y" : "r")}</div>
    <div class="mt goals"><span>임기 목표</span><small class="${avg >= 60 ? "g" : ""}">평균 지지율 ${avg}/60</small><small class="${l5 >= 2 ? "g" : ""}">LV5 사업 ${l5}/2</small><small class="${rate >= 80 ? "g" : ""}">위기 방어 ${rate}%/80%</small></div>
    <button class="mn-next" data-min="next" ${pend ? "disabled" : ""}>${pend ? `결재 ${pend}건 남음` : "다음 주 ›"}</button></div>
    <div class="mn-body">${left}${mid}${right}</div><div class="mn-foot">${m.doctrine ? `현재 교리 <b>${DOCTRINES[m.doctrine].n}</b>` : "<b class='r'>교리 미선포</b>"} · 전투 보정 화력 ×${F.outK.toFixed(2)} · 받는 피해 ×${F.inK.toFixed(2)} · 요격 ×${F.icptK.toFixed(2)} · 탐지 ×${F.detK.toFixed(2)} · 수치는 모두 게임용 값입니다</div></div>`;
}
const ZONE = { west: [125.1, 37.65, "서해 NLL"], east: [129.6, 38.25, "동해 북방"], south: [128.6, 33.95, "남해 교역로"] }, RIC = { mob: "⚓", sub: "◆", airc: "✈" };
/** 합동 워룸 한반도 상황도 */
function warMap(m) {
  const A = m.war.areas, P = (lo, la) => kxy(lo, la).map((v) => v.toFixed(1)).join(","), C = ["#5fd17a", "#f2ca5c", "#ff6b5e"];
  const mdl = [[126.1, 37.75], [126.7, 37.95], [127.1, 38.25], [127.8, 38.3], [128.3, 38.6]].map(([a, b]) => P(a, b)).join(" "), nll = [[124.6, 37.95], [124.9, 37.68], [125.7, 37.6], [126.1, 37.72]].map(([a, b]) => P(a, b)).join(" ");
  const city = ([lo, la, n, cap, left]) => { const [x, y] = kxy(lo, la); return `<circle cx="${x}" cy="${y}" r="${cap ? 3.2 : 2.2}" fill="${cap ? "#fff" : "#cfe"}"/><text x="${left ? x - 5 : x + 5}" y="${y + 4}" class="ct"${left ? ' text-anchor="end"' : ""}>${n}</text>`; };
  const zones = Object.entries(ZONE).map(([k, [lo, la, n]]) => { const W = A[k], [x, y] = kxy(lo, la), c = C[W.lvl], r = 18 + W.lvl * 6, o = W.res;
    return `<g class="zn l${W.lvl}"><circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity=".16"/><circle class="pu" cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="2" style="--d:${2.4 - W.lvl * 0.7}s"/><circle cx="${x}" cy="${y}" r="4" fill="${c}"/>
      <text x="${x}" y="${y - r - 6}" class="zl" text-anchor="middle">${n} · ${LVK[W.lvl]}</text>${W.reinf ? `<text x="${x + r - 2}" y="${y + r}" class="ri">${RIC[W.reinf]}</text><text x="${x + r + 12}" y="${y + r}" class="rn">${REINF[W.reinf][0].replace("사령부", "")}</text>` : ""}
      ${o ? `<g transform="translate(${x - 26} ${y - 9}) rotate(-12 26 9)"><rect width="52" height="18" rx="2" fill="none" stroke="${o[1] === "g" ? "#5fd17a" : o[1] === "r" ? "#ff6b5e" : "#f2ca5c"}" stroke-width="2"/><text x="26" y="13" text-anchor="middle" class="st" fill="${o[1] === "g" ? "#5fd17a" : o[1] === "r" ? "#ff6b5e" : "#f2ca5c"}">${o[0]}</text></g>` : ""}</g>`; }).join("");
  return `<div class="mn-kmap"><svg viewBox="0 0 410 405" role="img" aria-label="한반도 상황도"><rect width="410" height="405" fill="#0b1a26"/>
    <g class="grid">${[34, 35, 36, 37, 38, 39].map((la) => { const y = kxy(124, la)[1]; return `<line x1="0" x2="410" y1="${y}" y2="${y}"/><text x="3" y="${y - 2}">${la}°N</text>`; }).join("")}${[124, 126, 128, 130].map((lo) => { const x = kxy(lo, 36)[0]; return `<line y1="0" y2="405" x1="${x}" x2="${x}"/><text x="${x + 2}" y="400">${lo}°E</text>`; }).join("")}</g>
    <path d="${KOREA.cn}" fill="#2a2e33"/><path d="${KOREA.jp}" fill="#2a2e33"/><path d="${KOREA.nk}" fill="#3a2a2c" stroke="#5a3a3c" stroke-width=".6"/><path d="${KOREA.kr}" fill="#24384a" stroke="#4d7590" stroke-width=".7"/>
    <polyline points="${mdl}" fill="none" stroke="#ff6b5e" stroke-width="1.4" stroke-dasharray="4 3"/><polyline points="${nll}" fill="none" stroke="#ffcf8a" stroke-width="1.2" stroke-dasharray="2 3"/>
    <text x="${kxy(124.5, 37.48)[0]}" y="${kxy(124.5, 37.48)[1]}" class="ln">NLL</text><text x="${kxy(127.2, 38.55)[0]}" y="${kxy(127.2, 38.55)[1]}" class="ln r">MDL</text>
    ${[[126.98, 37.56, "서울", 1], [125.75, 39.03, "평양", 1], [129.07, 35.18, "부산"], [126.63, 37.46, "인천"], [128.6, 35.87, "대구"], [124.7, 37.97, "백령도"], [130.9, 37.5, "울릉도"], [131.87, 37.24, "독도", 0, 1], [126.5, 33.38, "제주"]].map(city).join("")}
    ${zones}<text x="406" y="14" text-anchor="end" class="lg">● 낮음 <tspan fill="#f2ca5c">● 보통</tspan> <tspan fill="#ff6b5e">● 높음</tspan></text></svg></div>`;
}
/** 지지율·예산 추이 */
function trendSVG(m) {
  const S = m.sup || [], B = m.bud || []; if (S.length < 2) return `<div class="mn-card mn-trend"><div class="mn-h">국정 지지율 · 예산 추이</div><small>2주 이상 지나면 그래프가 그려집니다.</small></div>`;
  const W = 300, H = 92, n = S.length, X = (i) => 26 + (i / (n - 1)) * (W - 34), bmax = Math.max(...B, 1), Ys = (v) => 8 + (1 - v / 100) * (H - 18), Yb = (v) => 8 + (1 - v / bmax) * (H - 18);
  const line = (a, Y) => a.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  return `<div class="mn-card mn-trend"><div class="mn-h">국정 지지율 · 예산 추이 <small>1~${n}주차</small></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="지지율과 예산 추이">
    ${[0, 60, 100].map((v) => `<line x1="26" x2="${W - 8}" y1="${Ys(v)}" y2="${Ys(v)}" class="${v === 60 ? "gl" : "gx"}"/><text x="22" y="${Ys(v) + 3}" text-anchor="end">${v}</text>`).join("")}
    ${B.length > 1 ? `<path d="${line(B, Yb)}" class="bd"/>` : ""}<path d="${line(S, Ys)}" class="sp"/><circle cx="${X(n - 1)}" cy="${Ys(S[n - 1])}" r="3" class="spd"/></svg>
    <div class="lgd"><span class="s">━ 지지율 (현재 ${S[n - 1]}, 목표선 60)</span><span class="b">━ 예산 (현재 ${won(B[B.length - 1] ?? m.budget)})</span></div></div>`;
}
/** 임기 종료 연출 컷 */
/** 역대 국방부장관 초상 갤러리 (게임 속 기록) */
export function galleryHTML() {
  const m = minState(), H = hall(), F = (h, s) => (globalThis.__faceOf ? globalThis.__faceOf(h.face, s, h.name) : "");
  const cur = m && !m.retired ? [{ name: m.name, cur: true, face: globalThis.__myFace?.() || null, week: m.week }] : [];
  const all = [...cur, ...H], N = H.length;
  return `<div class="gal"><div class="gal-h"><b>역대 국방부장관</b><small>이 브라우저에서 임기를 마친 장관 ${N}명${cur.length ? " + 현직" : ""} · 게임 속 기록입니다</small><button data-min="galx">닫기 ✕</button></div>
    <div class="gal-g">${all.map((h, i) => { const no = h.cur ? N + 1 : N - (i - cur.length); return `<div class="gal-c ${h.cur ? "cur" : h.ok ? "ok" : ""}"><div class="gal-f">${F(h, 132)}</div><em>제${no}대${h.cur ? " · 현직" : ""}</em><b>${h.name}</b>
      <small>${h.cur ? `재임 ${h.week}주차` : `${h.gen}회차 · ${h.at} 퇴임`}</small>${h.cur ? "" : `<small>${h.ok ? "★ 명예 퇴임" : "임기 종료"} · 지지율 ${h.avg} · 방어율 ${h.rate}%</small><small>교리 ${h.doctrine}</small>`}</div>`; }).join("") || "<small>아직 기록이 없습니다.</small>"}</div></div>`;
}
export function retireCuts(m) {
  const T = m.term || {}, ok = T.ok, best = Object.entries(PROGS).filter(([k]) => (m.prog[k] || 0) >= 5).map(([, P]) => P.n);
  const stat = `<h4>${ok ? "명예 퇴임" : "임기 종료"}</h4><div><span>평균 국정 지지율</span><b class="${T.avg >= 60 ? "g" : "r"}">${T.avg}</b></div><div><span>LV5 방위력 개선 사업</span><b class="${T.l5 >= 2 ? "g" : "r"}">${T.l5}개</b></div><div><span>다해역 위기 방어율</span><b class="${T.rate >= 80 ? "g" : "r"}">${T.rate}%</b></div><div><span>남긴 국방 예산</span><b>${won(m.budget)}</b></div>`;
  return [
    { img: "office", f: [0.55, 0.62, 1.1], to: [0.5, 0.5, 1.02], who: "", text: `${TERM}주의 임기가 끝났습니다. 결재판에는 더 이상 올라올 서류가 없습니다.` },
    { img: "war_room", f: [0.5, 0.42, 1.12], who: "합참의장", text: `장관님, 마지막 상황 보고입니다. 임기 중 다해역 위기 방어율은 ${T.rate}%였습니다.` },
    { img: "press_minister", f: [0.53, 0.36, 1.7], flash: 4, who: `장관 ${m.name}`, text: ok ? "국민 여러분이 보내 주신 신뢰 덕분에 맡은 임무를 마칠 수 있었습니다. 장병들에게 감사드립니다." : "부족한 점이 많았습니다. 남은 과제는 후임 장관이 잘 이어 갈 것이라 믿습니다." },
    { img: "ceremony", f: [0.36, 0.68, 1.6], to: [0.5, 0.55, 1.05], who: "사회자", text: `지금부터 ${m.name} 국방부장관 이임식 및 함대 사열을 거행하겠습니다.${best.length ? ` 재임 중 ${best.join("·")} 사업을 완성했습니다.` : ""}`, card: stat },
    { img: "ceremony", f: [0.62, 0.62, 1.15], to: [0.5, 0.45, 1.02], flash: 2, who: "", text: ok ? "예포가 울리고, 도열한 장병들이 마지막 경례를 올립니다. 당신의 이름이 명예의 전당에 올랐습니다." : "도열한 장병들이 마지막 경례를 올립니다. 당신의 이름이 역대 장관 기록에 남았습니다." },
    { img: "office", f: [0.3, 0.45, 1.2], to: [0.5, 0.5, 1.02], who: "", text: "제복도, 직함도 내려놓았습니다. 이제 당신은 민간인입니다.", cls: "a" },
  ];
}
function retiredHTML(m) {
  const T = m.term, H = hall();
  return `<div class="mn"><div class="mn-ret"><div class="mn-card big"><h3>${T.ok ? "명예 퇴임" : "임기 종료"}</h3><p>${m.name} 장관 · ${TERM}주 임기</p>
    <div class="kv"><span>평균 국정 지지율</span><b class="${T.avg >= 60 ? "g" : "r"}">${T.avg} / 60</b></div><div class="kv"><span>LV5 방위력 개선 사업</span><b class="${T.l5 >= 2 ? "g" : "r"}">${T.l5} / 2</b></div><div class="kv"><span>다해역 위기 방어율</span><b class="${T.rate >= 80 ? "g" : "r"}">${T.rate}% / 80%</b></div>
    <p>${T.ok ? "임기 목표를 모두 달성했습니다. 2회차를 시작하면 특전이 주어집니다: 명예 약장(화력 +10%·초반 봉급 +50%), 완성 사업 1개 LV3 계승, 원수 승진 30% 단축." : "임기 목표를 다 이루지 못했습니다. 2회차를 시작할 수 있지만 특전은 없습니다."}</p>
    ${T.ok ? `<div class="mn-h">계승할 사업 (LV3로 시작)</div><div class="rf">${Object.entries(PROGS).filter(([k]) => (m.prog[k] || 0) >= 5).map(([k, P]) => `<button data-min="inh:${k}" class="${m.inh === k ? "on" : ""}">${P.n}</button>`).join("")}</div>` : ""}
    <button class="mn-pres" data-pres="start"><b>다음 장 · 대통령 출마 ›</b><small>민간인이 된 당신에게 정당들이 접촉해 오기 시작했습니다.</small></button><button data-min="replay" class="mn-rp">🎬 이임식 다시 보기</button>
    <button class="mn-ng ${ngArm ? "arm" : ""}" data-min="ng">${ngArm ? "한 번 더 누르면 커리어·함정·기록이 초기화되고 소위로 다시 시작합니다" : "2회차 시작 (소위부터)"}</button><small>명예의 전당·설정·지휘관 이름은 그대로 남습니다. 이 버튼을 누르지 않으면 지금 커리어로 계속 플레이할 수 있습니다.</small></div>
    <div class="mn-card"><div class="mn-h">역대 국방부장관 명예의 전당 <button class="mn-tg on" data-min="gal">🖼 초상 갤러리</button></div>${H.map((h) => `<div class="hl ${h.ok ? "ok" : ""}"><b>${h.ok ? "★ " : ""}${h.name}</b><span>${h.gen}회차 · ${h.at}</span><small>지지율 ${h.avg} · LV5 ${h.l5}개 · 방어율 ${h.rate}% · 교리 ${h.doctrine}</small></div>`).join("") || "<small>기록 없음</small>"}</div></div></div>`;
}

/** 클릭 처리: 결과 { redraw, direct, reset } */
export function minClick(a) {
  const m = minState(); if (!m) return {};
  if (a === "ng") { if (!ngArm) { ngArm = true; return { redraw: true }; } ngArm = false; const T = m.term, L = legacy();
    wr(LK, { gen: (L?.gen || 1) + 1, medal: !!T?.ok, prog: T?.ok ? m.inh || Object.keys(m.prog).find((k) => m.prog[k] >= 5) || null : null, minister: !!T?.ok }); return { reset: true }; }
  if (a.startsWith("inh:")) { m.inh = a.slice(4); save(m); return { redraw: true }; }
  if (a === "gal") return { gallery: true };
  if (a === "replay" && m.retired) return { retire: retireCuts(m) };
  if (m.retired) return {};
  if (a.startsWith("doc:")) { const k = a.slice(4); m.doctrine = m.doctrine === k ? null : k; save(m); return { redraw: true, toast: m.doctrine ? `작전 교리 선포 — ${DOCTRINES[k].n}` : "작전 교리 해제" }; }
  if (a.startsWith("scene:")) { const id = a.slice(6), d = DK(id); if (!d || !m.docket.includes(id)) return {}; const meta = d[4] || {}, press = meta.sc === "press";
    const Q = { who: press ? `${["한빛", "동해", "서울", "새벽", "중앙"][m.week % 5]}일보 기자` : `국방위원 (${["여당", "야당"][m.week % 2]})`, q: d[2], opts: d[3].map(([n, e]) => [n, e, `${n} — 이것이 국방부의 입장입니다.`]) };
    return { scene: { kind: press ? "press" : "assembly", title: d[1], id, questions: [Q] } }; }
  if (a.startsWith("dk:")) { const [, id, i] = a.split(":"), d = DK(id), o = d?.[3][+i]; if (!o || !m.docket.includes(id)) return {}; o[2](m); (m.picks ??= {})[id] = +i; m.support = clamp(m.support, 0, 100); m.docket = m.docket.filter((x) => x !== id); note(m, `결재 「${d[1]}」 — ${o[0]}`); save(m); return { redraw: true, toast: `결재 — ${o[0]}` }; }
  if (a.startsWith("pg:")) { const k = a.slice(3), L = m.prog[k] || 0; if (L >= 5) return {}; const c = progCost(m, k, L); if (m.budget < c) return { toast: "예산이 부족합니다" }; m.budget -= c; m.prog[k] = L + 1; note(m, `${PROGS[k].n} LV${L + 1} 완료 (−${won(c)})`); save(m); return { redraw: true, toast: `${PROGS[k].n} LV${L + 1} — ${PROGS[k].lv[L][1]}` }; }
  if (a.startsWith("rf:")) { const [, k, r] = a.split(":"), W = m.war.areas[k]; W.reinf = W.reinf === r ? null : r; save(m); return { redraw: true }; }
  if (a === "direct") { if (m.war.areas.west.res) return {}; m.war.direct = "west"; save(m); return { direct: true }; }
  if (a === "next") { if (m.docket.length) return { toast: "결재 안건을 먼저 처리하십시오" }; endWeek(m); m.support = clamp(m.support, 0, 100);
    const hot = !m.retired && Object.keys(AREAS).find((k) => m.war.areas[k].lvl === 2); m.nsc = hot || null; save(m);
    return { redraw: true, retire: m.retired ? retireCuts(m) : null, toast: m.retired ? "" : `${m.week}주차 — 새 위기와 결재 안건`, nsc: hot && scenesOn() ? { kind: "nsc", title: `${AREAS[hot].n} 위협 '높음'`, id: hot, questions: [{ who: "국가안보실장", q: `${AREAS[hot].n}에서 적 함정·항공기 활동이 급증했습니다. 이번 주 위기 대응 방침을 정해 주십시오.`, opts: NSC_OPT.map(([n, e, l]) => [n, e, l]) }] } : null }; }
  if (a === "scenes") { const on = !scenesOn(); try { localStorage.setItem(SCK, on ? "on" : "off"); } catch { /* 저장 불가 */ } return { redraw: true, toast: on ? "결재 연출 켜짐 — 기자회견·국회·NSC 장면이 나옵니다" : "결재 연출 꺼짐 — 결재판에서 바로 고릅니다" }; }
  if (a === "nscview") { const k = m.nsc; if (!k) return {}; return { nsc: { kind: "nsc", title: `${AREAS[k].n} 위협 '높음'`, id: k, questions: [{ who: "국가안보실장", q: `${AREAS[k].n}에서 적 함정·항공기 활동이 급증했습니다. 이번 주 위기 대응 방침을 정해 주십시오.`, opts: NSC_OPT.map(([n, e, l]) => [n, e, l]) }] } }; }
  if (a.startsWith("nsc:")) { const k = m.nsc, W = k && m.war.areas[k], i = +a.slice(4); if (!W) return {}; NSC_OPT[i]?.[3](m, W); m.nsc = null; m.support = clamp(m.support, 0, 100); note(m, `NSC — ${AREAS[k].n}: ${NSC_OPT[i][0]}`); save(m); return { redraw: true }; }
  return {};
}
/** 2회차 시작 시 지울 저장 키 (설정·지휘관 이름·명예의 전당·계승은 남김) */
export const NG_RESET = ["steeltide:potus", "steeltide:pres", "steeltide:profile", "steeltide:career", "steeltide:staff", "steeltide:kcamp", "steeltide:camp", "steeltide:oplog", "steeltide:c72", "steeltide:post", "steeltide:mission", MK];
