// 3군 장교 커리어 성장기 (소위 → 대장): 주간 직무·훈련 결재, 계급장 성장 시각화, 위기 3대 대응(위임 / FM 작전 / 3D 직접 개입).
import { SERVICES, BRANCHES, normBranch, serviceOf, careerTitle, isUS } from "./staff.js";
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

const US_EVENTS = [
  ["us_a_abn", "army", 0, 3, "제82공수사단 18시간 긴급전개 훈련 (EDRE)", "동유럽 NATO 동맹국 전방 증원을 가정한 불시 공수 전개 명령이 하달됐습니다.", [
    ["야간 강하·실전 화력 전개까지 18시간 내 완수", "평정 S · 경험치 +270 · 평판 +5", 270, 91, 2, 5, "미 82공수, 18시간 내 NATO 전방 긴급전개 완벽 완수"],
    ["표준 수송 절차 준수 · 안전 최우선 전개", "평정 A · 경험치 +200 · 사기 +2", 200, 78, 2, 2, "미 육군 신속대응여단, 무사고 공수전개 완료"],
    ["기상 악화 이유로 강하 생략 · 지상 이동 전환", "평정 C+ · 경험치 +110 · 평판 −4", 110, 52, 0, -4, "공수 긴급전개 훈련 축소 — FORSCOM 점검 지시"],
  ]],
  ["us_a_m1", "army", 2, 6, "M1A2 에이브람스 기갑여단 동유럽 연합기동", "NATO 동부 전선 연합 기갑훈련 중 드론·대전차 복합 위협 시나리오가 투입됐습니다.", [
    ["능동방호(APS)·드론대응 통합 돌파 전술 지휘", "평정 S · 경험치 +380 · 평판 +6", 380, 92, 3, 6, "미 제1기갑여단, NATO 연합 기동훈련 최우수 평가"],
    ["교범 기반 제병협동 돌파 기동 완수", "평정 A · 경험치 +260 · 사기 +1", 260, 79, 1, 2, "미 기갑전투단, 동유럽 연합훈련 안정적 완수"],
    ["장비 정비 부담으로 기동 거리 축소", "평정 C+ · 경험치 +140 · 평판 −4", 140, 53, 0, -4, "미 육군 전방 기갑부대 가동률 우려 제기"],
  ]],
  ["us_n_fonop", "navy", 0, 4, "대만해협 항행의 자유(FONOP) 작전", "알레이버크급 구축함이 대만해협을 통과하는 중 상대 구축함 2척이 근접 압박합니다.", [
    ["국제법 준수 통보 후 예정 항로 단호히 유지", "평정 S · 경험치 +290 · 평판 +6", 290, 91, 2, 6, "미 제7함대 구축함, 대만해협 항행의 자유 작전 완수"],
    ["함대사령부 교신 하에 안전거리 확보 기동", "평정 A · 경험치 +210 · 안전 확보", 210, 79, 1, 3, "미 태평양함대, 대만해협 안정적 통과 작전 수행"],
    ["우발 충돌 우려로 항로 조기 우회", "평정 C · 경험치 +110 · 평판 −5", 110, 47, -2, -5, "항행의 자유 작전 후퇴 논란 — 인도태평양사 질책"],
  ]],
  ["us_n_csg", "navy", 4, 9, "항모타격단(CSG) 인도-태평양 다영역 연합훈련", "남중국해·필리핀해에서 동맹국 함대와 대규모 항모타격단 통합방공 훈련을 지휘합니다.", [
    ["F-35C·이지스 통합 화력망(NIFC-CA) 실증 주도", "평정 S · 경험치 +520 · 평판 +7", 520, 94, 3, 7, "미 항모타격단, 인도-태평양 통합방공 훈련 압도적 성과"],
    ["전통적 항모 방어 섹터 운용으로 무결점 완료", "평정 A · 경험치 +360 · 사기 +2", 360, 80, 2, 3, "미 태평양함대 연합 해상기동훈련 성공적 종료"],
    ["연료·정비 절감 위해 함재기 출격 횟수 축소", "평정 C+ · 경험치 +180 · 평판 −4", 180, 52, -1, -4, "항모타격단 출격 축소로 작전 준비태세 지적"],
  ]],
  ["us_f_norad", "air", 0, 4, "NORAD 알래스카 ADIZ 긴급 발진(Scramble)", "알래스카 방공식별구역에 장거리 전략폭격기 편대가 접근해 F-22 긴급 발진이 떨어졌습니다.", [
    ["F-22 랩터 편대 즉각 요격 · 근접 식별 및 퇴거", "평정 S · 경험치 +300 · 평판 +6", 300, 92, 3, 6, "NORAD F-22 편대, 알래스카 ADIZ 접근기 즉각 차단"],
    ["AWACS 통제 하에 표준 호위 퇴거 절차 수행", "평정 A · 경험치 +220 · 안전 확보", 220, 80, 1, 3, "북미항공우주방위사령부, 영공 접근기 안전 퇴거"],
    ["지상 레이더 감시만 유지 · 출격 지연", "평정 C · 경험치 +100 · 평판 −5", 100, 45, -2, -5, "NORAD 긴급 발진 지연 — 미 공군성 조사 착수"],
  ]],
  ["us_f_redflag", "air", 3, 9, "네바다 레드플래그(Red Flag) 연합 공중전 지휘", "동맹국 공군 80여 기가 참가하는 대규모 적 방공망 제압(SEAD) 임무 편대장을 맡았습니다.", [
    ["F-35A·전자전기·우주자산 통합 타격 패키지 지휘", "평정 S · 경험치 +500 · 평판 +7", 500, 94, 3, 7, "레드플래그 연합훈련서 미 공군 다영역 SEAD 전술 호평"],
    ["안정적 단계별 방공망 우회 타격 완수", "평정 A · 경험치 +350 · 사기 +2", 350, 81, 2, 3, "미 공군 전투비행단, 레드플래그 임무 성공적 완수"],
    ["손실 회피 위주 소극적 원거리 타격", "평정 B · 경험치 +210 · 평판 −1", 210, 63, 0, -1, "레드플래그 작전 보수적 운용 평가"],
  ]],
  ["us_c_pentagon", "all", 0, 5, "부대 전투준비태세 불시 검열 (IG Inspection)", "상급 사령부 감찰관(IG)이 불시에 부대 정비·군기·탄약 현황을 점검합니다.", [
    ["현장 중심 실전 점검 후 우수 장병 즉각 표창", "평정 A+ · 경험치 +250 · 사기 +4", 250, 86, 4, 4, "미군 현장 지휘관, IG 불시 검열 최우수 통과"],
    ["교범 체크리스트대로 체계적 대응", "평정 A · 경험치 +190 · 사기 +2", 190, 76, 2, 2, "체계적 군기·장비 관리로 IG 검열 무난 통과"],
    ["서류 보완에 치중해 현장 점검 축소", "평정 C+ · 경험치 +110 · 평판 −3", 110, 53, 0, -3, "IG 감찰서 형식적 행정 대응 지적"],
  ]],
  ["us_c_congress", "all", 4, 9, "미 의회 군사위원회(SASC) 국방예산·전력 청문회", "상원 군사위원회에서 차기 무기체계 예산과 인도-태평양 억제 전략을 증언해야 합니다.", [
    ["정량 데이터와 합동 억제 논리로 초당적 예산 확보", "평정 S · 경험치 +490 · 평판 +7", 490, 93, 2, 7, "상원 군사위 청문회 호평 — 핵심 전력 예산 초당적 통과"],
    ["의회 요구를 일부 수용한 실용적 타협안 제시", "평정 A · 경험치 +340 · 안정적 통과", 340, 80, 1, 3, "미 국방예산 심의 원만한 합의 도출"],
    ["원안 고수 발언으로 위원회와 정면 충돌", "평정 C+ · 경험치 +170 · 평판 −4", 170, 54, -1, -4, "의회 군사위 증언 마찰 — 예산안 보류"],
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
  if (!d) { d = { week: 1, morale: 72, rep: 55, tension: 32, headlines: [isUS() ? "O-1 소위 임관 — 미합중국 군(U.S. Armed Forces) 장교 커리어 시작" : "신임 소위 임관 — 대한민국 국군 장교 커리어 시작"], pending: [], crisis: null, report: null, rivals: null, last: null }; wr(DK, d); }
  return d;
}
export function saveDuty(d) { wr(DK, d); }

function shuffle3() { const a = [0, 1, 2]; for (let i = 2; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const dutyOptionHint = (optIdx) => (
  optIdx === 0 ? "강경·적극 지휘 · 높은 성과 기대 / 부대 피로 누적·돌발 사고 리스크"
  : optIdx === 1 ? "교범·균형 지휘 · 안정적 임무 수행 및 부대 컨디션 관리"
  : "보수·안전 우선 · 부대 사기 회복·위험 최소화 / 소극 대응 지적 가능"
);

function drawEvents(d, svc, grade) {
  if (!d.rivals) d.rivals = mkRivals(svc);
  const us = isUS(), evSrc = us ? US_EVENTS : EVENTS, crSrc = us ? US_CRISES : CRISES;
  const pool = evSrc.filter((e) => (e[1] === "all" || e[1] === svc) && grade >= e[2] && grade <= e[3]);
  const fallback = evSrc.filter((e) => e[1] === "all" || e[1] === svc);
  const src = pool.length >= 2 ? pool : fallback;
  const out = [], copy = src.slice();
  while (out.length < 2 && copy.length) out.push(copy.splice((Math.random() * copy.length) | 0, 1)[0][0]);
  d.pending = out;
  d.optOrder = Object.fromEntries(out.map((id) => [id, shuffle3()]));
  d.nat = us ? "us" : "kr";
  d.crisis = d.week >= 3 && (d.week % 4 === 0 || Math.random() < 0.2) ? pick(crSrc).id : null; /* 합동 위기 빈도 완화 */
  saveDuty(d);
}

export function ensureDuty(svc, grade) {
  const d = dutyState(), wantNat = isUS() ? "us" : "kr";
  if (!d.rivals) { d.rivals = mkRivals(svc); saveDuty(d); }
  if (d.nat && d.nat !== wantNat) { d.pending = []; d.crisis = null; d.report = null; d.doneWeek = false; drawEvents(d, svc, grade); return d; }
  if (!d.pending || (!d.pending.length && !d.crisis && !d.report && !d.doneWeek)) drawEvents(d, svc, grade);
  return d;
}

export function dutyEventById(id) { return EVENTS.find((e) => e[0] === id) || US_EVENTS.find((e) => e[0] === id); }
export function dutyCrisisById(id) { return CRISES.find((c) => c.id === id) || US_CRISES.find((c) => c.id === id); }

/** Advance rival classmates alongside player progress and post news headlines when they promote */
function tickRivals(d, playerGrade) {
  if (!d.rivals) return;
  for (const r of d.rivals) {
    if (r.g >= 9) continue;
    const rate = r.style === "야전 엘리트" ? 0.24 : 0.2;
    if (r.g <= playerGrade && Math.random() < rate) {
      r.g = Math.min(9, r.g + 1);
      const t = careerTitle(r.g, r.br);
      d.headlines.unshift(`${d.week}주차 · [동기 동향] 임관 동기 ${r.name}, ${t} 보직으로 진급!`);
      d.headlines = d.headlines.slice(0, 12);
    }
  }
}

/** Resolve a weekly duty choice with genuine risk/morale tradeoffs (no guaranteed best pick). */
export function resolveDuty(id, optIdx, grade) {
  const d = dutyState(), ev = dutyEventById(id); if (!ev || !d.pending.includes(id)) return null;
  const o = ev[6][optIdx]; if (!o) return null;
  let [label, , xpBase, sc, dm, dr, headline] = o;
  let backfired = false;
  if (optIdx === 0) {
    const failProb = clamp(0.18 + Math.max(0, 72 - d.morale) * 0.008 + Math.max(0, d.tension - 50) * 0.003, 0.14, 0.58);
    if (Math.random() < failProb) {
      backfired = true;
      sc = 42 + ((Math.random() * 12) | 0);
      xpBase = Math.round(xpBase * 0.55);
      dm = -6; dr = -7;
      headline = `[작전 차질] ${ev[4]} 강경 대응 중 장비·안전 차질 발생 — 지휘 책임 추궁`;
    } else {
      sc = clamp(sc + (((Math.random() * 7) | 0) - 3), 84, 96);
      dm = Math.min(dm, -2); /* 고강도 작전은 성공해도 부대 피로가 누적됨 */
    }
  } else if (optIdx === 1) {
    sc = clamp(sc + (((Math.random() * 9) | 0) - 4), 70, 86);
    dm = Math.max(dm, 2);
  } else {
    sc = clamp(sc + (((Math.random() * 11) | 0) - 3), 50, 68);
    dm = Math.max(dm, 5); /* 보수·안전 선택은 부대 사기를 크게 회복 */
  }
  const xpGain = Math.round(xpBase * (1 + grade * 0.22));
  d.morale = clamp(d.morale + dm, 10, 100);
  d.rep = clamp(d.rep + dr, 0, 100);
  d.tension = clamp(d.tension + (backfired ? 5 : optIdx === 2 ? -3 : sc >= 85 ? -2 : 0), 5, 95);
  d.pending = d.pending.filter((x) => x !== id);
  d.headlines.unshift(`${d.week}주차 · ${headline}`);
  d.headlines = d.headlines.slice(0, 12);
  d.last = `${ev[4]} → ${label}${backfired ? " [차질 발생!]" : ""} (평정 ${letter(sc)} · ${sc}점 · +${xpGain} XP)`;
  if (!d.report && (backfired || sc < 80 || d.week % 3 === 0)) {
    d.report = { title: `${ev[4]} — 상부 결과 보고서 작성`, desc: backfired ? "강경 대응 과정에서 발생한 차질과 장비 손실을 상급부대에 어떻게 보고하시겠습니까?" : "수행 과정에서 일부 미흡점과 장비 소모가 보고됐습니다. 상급부대에 어떻게 보고하시겠습니까?" };
  }
  if (!d.pending.length && !d.crisis && !d.report) d.doneWeek = true;
  recordEval(grade, sc);
  saveDuty(d);
  return { xpGain, score: sc, headline, label: backfired ? `${label} (작전 차질!)` : label, backfired };
}

/** Resolve after-action report dilemma: 0 = honest, 1 = embellish (18% audit risk), 2 = blame subordinate */
export function resolveReport(choiceIdx, grade) {
  const d = dutyState(); if (!d.report) return null;
  const title = d.report.title; d.report = null;
  let sc = 75, dm = 0, dr = 0, msg = "";
  if (choiceIdx === 0) {
    sc = 72; dm = 3; dr = 6; msg = "사실대로 솔직 보고 — 군내 평판 +6 · 부대 사기 +3 (신뢰 확보)";
    d.headlines.unshift(`${d.week}주차 · [군내 평판] 투명한 지휘 보고로 상급부대·부하 신뢰 확보`);
  } else if (choiceIdx === 1) {
    const caught = Math.random() < 0.18;
    if (caught) {
      sc = 44; dm = -4; dr = -10; msg = "성과 과장·축소 보고 감찰 적발! — 평정 44점 · 평판 −10";
      d.headlines.unshift(`${d.week}주차 · [감찰 경고] 허위·축소 보고 정황 포착 — 인사 평정 감점`);
    } else {
      sc = 88; dm = -1; dr = 2; msg = "성과 중심 보고 통과 — 단기 평정 +88점 (감찰 미적발)";
      d.headlines.unshift(`${d.week}주차 · [성과 보고] 우수 지휘 성과로 상급부대 호평`);
    }
  } else {
    sc = 78; dm = -8; dr = -4; msg = "현장 실무자 책임 전가 — 단기 평정 방어 · 부대 사기 −8";
    d.headlines.unshift(`${d.week}주차 · [부대 여론] 지휘관 책임 전가 논란으로 사기 저하`);
  }
  d.morale = clamp(d.morale + dm, 10, 100);
  d.rep = clamp(d.rep + dr, 0, 100);
  d.headlines = d.headlines.slice(0, 12);
  d.last = `${title} → ${msg}`;
  if (!d.pending.length && !d.crisis) d.doneWeek = true;
  recordEval(grade, sc);
  saveDuty(d);
  return { score: sc, msg };
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
  tickRivals(d, grade);
  drawEvents(d, svc, grade);
  return d;
}

export { SERVICES, BRANCHES, normBranch, serviceOf, careerTitle, evalOf, board, runBoard, FOCUS, letter, career, saveCareer };
