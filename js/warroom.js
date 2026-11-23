// 장성급(준장~대장) 다단계 워룸 안보 위기 (3단계 연속 결단 → 완벽 제압 시 원수 5성 특별진급 공적 직결).
import { isUS } from "./staff.js";

const KR_SCENARIOS = [
  {
    id: "kr_nll_wr",
    tag: "합참 워룸 · 서해 NLL 복합 도발",
    bg: "img/bg/war_room.jpg",
    defcon: "DEFCON 3 · 진돗개 하나",
    stages: [
      {
        title: "1단계 · 초동 경계 격상 및 합동 전력 전개",
        desc: "적 고속정 편대와 해안포·무인기가 서해 NLL 일대에서 동시다발적 기습 도발을 개시했습니다. 워룸 지휘관으로서 초동 전력 운용을 지시하십시오.",
        opts: [
          { l: "이지스함·F-35A·K9 즉각 전진 배치 및 합동 타격망 가동", d: "압도적 초동 억제 · 통제력 크게 상승 · 긴장도 +3", pts: 92, mor: 2, rep: 3, ten: 3 },
          { l: "서해 방어 섹터 강화 및 한미연합 감시자산 집중 투입", d: "안정적 방어 태세 · 통제력 상승", pts: 78, mor: 2, rep: 2, ten: 0 },
          { l: "군사 핫라인 경고 통보 우선 · 전력 이동 최소화", d: "긴장 억제 · 초동 주도권 약화 위험", pts: 52, mor: -2, rep: -2, ten: -2 },
        ],
      },
      {
        title: "2단계 · 교전 수위 결단 (비례 응징 vs 확전 통제)",
        desc: "적 화력 도발이 아군 완충수역 인근까지 근접했습니다. 합참 워룸 화면이 붉게 점멸하는 가운데 교전 수위를 결단해야 합니다.",
        opts: [
          { l: "정밀 비례 응징 사격 및 공중 차단선 단호히 유지", d: "적 도발 의지 완전 분쇄 · 최고 통제력 확보", pts: 94, mor: 3, rep: 4, ten: 2 },
          { l: "요격·방어망 집중 및 동맹 전략폭격기 무력 시위 요청", d: "안정적 억제 균형 복원", pts: 80, mor: 2, rep: 3, ten: -1 },
          { l: "교전 회피 기동 및 외교 채널 중재 대기", d: "충돌 회피 · 주도권 상실 위험", pts: 48, mor: -3, rep: -3, ten: 2 },
        ],
      },
      {
        title: "3단계 · 위기 종결 및 대국민·국회 사후 브리핑",
        desc: "적 세력이 북방으로 퇴각하며 위기가 진정 국면에 접어들었습니다. 합참 대변인실과 국회 보고 방향을 확정하십시오.",
        opts: [
          { l: "합동 작전 성과 투명 공개 · 3군 장병 노고 및 동맹 공조 강조", d: "대국민 신뢰 극대화 · 최종 통제력 보너스", pts: 92, mor: 4, rep: 5, ten: -4 },
          { l: "군사 보안 중심의 절제된 공식 발표", d: "안정적 마무리", pts: 78, mor: 1, rep: 2, ten: -2 },
          { l: "피해 우려 축소 및 간략 서면 보고로 대체", d: "언론 의구심 유발 가능", pts: 54, mor: -1, rep: -3, ten: 0 },
        ],
      },
    ],
  },
  {
    id: "kr_east_wr",
    tag: "합참 워룸 · 동해 잠수함·탄도미사일 동시 위협",
    bg: "img/bg/war_room.jpg",
    defcon: "DEFCON 3 · KAMD 통합 경보",
    stages: [
      {
        title: "1단계 · 대잠·미사일방어(KAMD) 통합 경보 발령",
        desc: "동해 수중에서 미상 잠수함 음향이 포착됨과 동시에 적 탄도미사일 발사 징후가 위성에 잡혔습니다.",
        opts: [
          { l: "이지스 BMD·천궁-II·대잠초계기 전 자산 동시 전개", d: "완벽한 다층 방어망 가동 · 높은 통제력", pts: 93, mor: 2, rep: 3, ten: 2 },
          { l: "핵심 기지 방공망 우선 경계 및 해군 대잠전단 출동", d: "균형 잡힌 단계 대응", pts: 79, mor: 1, rep: 2, ten: 0 },
          { l: "오경보 가능성 검토하며 경계 격상 보류", d: "대응 지연 위험", pts: 50, mor: -2, rep: -3, ten: 2 },
        ],
      },
      {
        title: "2단계 · 한미일 합동 실시간 추적 및 요격 결단",
        desc: "실시간 미사일 경보 공유 체계가 가동되며 동해 수중 표적이 아군 기동함대 방면으로 기동합니다.",
        opts: [
          { l: "한미일 실시간 데이터링크 통합 추적 · 부상 강제 압박", d: "완벽한 합동 제압 · 최고 통제력", pts: 94, mor: 3, rep: 4, ten: 1 },
          { l: "아군 단독 대잠 포위망 유지 및 방공 요격 대기", d: "안정적 방어 유지", pts: 80, mor: 2, rep: 2, ten: 0 },
          { l: "원거리 감시만 유지하며 접촉 회피", d: "억제력 약화 우려", pts: 50, mor: -2, rep: -3, ten: 2 },
        ],
      },
      {
        title: "3단계 · 워룸 최종 결산 및 안보 태세 발표",
        desc: "적 잠수함이 외해로 이탈하고 미사일 도발이 무력화됐습니다. 국가안보실과 국민에게 최종 보고하십시오.",
        opts: [
          { l: "KAMD·대잠전력 완벽 작동 입증 및 장병 즉각 포상", d: "군내 평판·사기 대폭 상승", pts: 92, mor: 4, rep: 5, ten: -4 },
          { l: "표준 작전 결과 보고 및 연합 공조 감사 표명", d: "안정적 결산", pts: 78, mor: 2, rep: 2, ten: -2 },
          { l: "비공개 내부 보고로 축소 종결", d: "국민 불안 해소 미흡", pts: 56, mor: 0, rep: -2, ten: 0 },
        ],
      },
    ],
  },
];

const US_SCENARIOS = [
  {
    id: "us_taiwan_wr",
    tag: "NMCC War Room · Taiwan Strait Blockade Standoff",
    bg: "img/bg/us_war_room.jpg",
    defcon: "DEFCON 3 · INDOPACOM ALERT",
    stages: [
      {
        title: "Stage 1 · Carrier Strike Group Forward Positioning",
        desc: "적 대형 수상전단과 미사일 전력이 대만해협 핵심 해상교통로 봉쇄를 시도합니다. 펜타곤 NMCC 워룸에서 초동 배치를 지시하십시오.",
        opts: [
          { l: "Deploy Dual Carrier Strike Groups & B-21 Deterrence Patrol", d: "압도적 초동 억제 · 높은 통제력 확보", pts: 93, mor: 2, rep: 3, ten: 3 },
          { l: "Reinforce 7th Fleet & Allied Maritime Chokepoints", d: "안정적 동맹 방어 태세", pts: 79, mor: 2, rep: 2, ten: 0 },
          { l: "Hold Fleet Outside First Island Chain Pending Diplomacy", d: "긴장 완화 · 주도권 상실 위험", pts: 51, mor: -2, rep: -3, ten: -1 },
        ],
      },
      {
        title: "Stage 2 · Allied Coalition & Rules of Engagement (ROE)",
        desc: "동맹국 함정들이 합류한 가운데 상대 구축함이 근접 차단 기동을 시도합니다. 교전수칙(ROE)과 대응 수위를 결단하십시오.",
        opts: [
          { l: "Enforce Calibrated Freedom of Navigation with Full Air Cover", d: "봉쇄 의지 완전 무력화 · 최고 통제력", pts: 94, mor: 3, rep: 4, ten: 1 },
          { l: "Establish Joint Defensive Escort Corridors with Allies", d: "안정적 억제 및 항로 확보", pts: 80, mor: 2, rep: 3, ten: -1 },
          { l: "Suspend Transit to Avoid Tactical Incident", d: "봉쇄 기정사실화 위험", pts: 48, mor: -3, rep: -4, ten: 2 },
        ],
      },
      {
        title: "Stage 3 · White House NSC & Pentagon Press Briefing",
        desc: "상대 함대가 봉쇄 대형을 풀고 철수했습니다. 백악관 국가안보회의(NSC)와 펜타곤 브리핑 기조를 확정하십시오.",
        opts: [
          { l: "Highlight Allied Unity & Unbroken Indo-Pacific Deterrence", d: "워싱턴·동맹 신뢰 극대화", pts: 92, mor: 4, rep: 5, ten: -4 },
          { l: "Deliver Measured DoD Operational Summary", d: "안정적 마무리", pts: 78, mor: 1, rep: 2, ten: -2 },
          { l: "Decline Press Questions — Classified Memo Only", d: "의회·언론 의구심 유발", pts: 54, mor: -1, rep: -3, ten: 0 },
        ],
      },
    ],
  },
  {
    id: "us_scs_wr",
    tag: "NMCC War Room · South China Sea Carrier Confrontation",
    bg: "img/bg/us_war_room.jpg",
    defcon: "DEFCON 3 · PACFLT / PACAF JOINT",
    stages: [
      {
        title: "Stage 1 · Integrated Air & Missile Defense Activation",
        desc: "남중국해 공해상에서 작전 중인 미 항모타격단을 겨냥해 적 장거리 대함·항공 편대가 포위 기동을 시작했습니다.",
        opts: [
          { l: "Activate NIFC-CA Network & Scramble F-35C / F-22 Escorts", d: "완벽한 통합 방공 우위 확보", pts: 93, mor: 2, rep: 3, ten: 2 },
          { l: "Tighten Outer Aegis Screen & AWACS Surveillance", d: "균형 방어 태세", pts: 79, mor: 1, rep: 2, ten: 0 },
          { l: "Pull Carrier Group Back Without Escort Response", d: "억제 신뢰도 하락 우려", pts: 50, mor: -2, rep: -3, ten: 1 },
        ],
      },
      {
        title: "Stage 2 · Proportional Deterrence vs Escalation Control",
        desc: "적 항공기가 방공식별 경계선 10마일까지 접근했습니다. 전자전과 차단 비행 수위를 지시하십시오.",
        opts: [
          { l: "Conduct Precision Electronic Jamming & Firm Escort Intercept", d: "무충돌 완벽 제압 · 최고 통제력", pts: 94, mor: 3, rep: 4, ten: 1 },
          { l: "Maintain Standard Radio Warnings & Defensive Formations", d: "안정적 대치 관리", pts: 80, mor: 2, rep: 2, ten: 0 },
          { l: "Restrict Jamming & Yield Airspace Buffer", d: "위협 고조 위험", pts: 49, mor: -2, rep: -3, ten: 2 },
        ],
      },
      {
        title: "Stage 3 · Joint Chiefs After-Action & Senate Brief",
        desc: "항모타격단이 무손실로 작전 해역을 장악하며 대치가 종료됐습니다. 합참과 상원 군사위에 최종 보고하십시오.",
        opts: [
          { l: "Present Full Joint Lessons & Commend Strike Group Crews", d: "사기·평판 대폭 상승", pts: 92, mor: 4, rep: 5, ten: -4 },
          { l: "Submit Standard INDOPACOM Readiness Report", d: "안정적 결산", pts: 78, mor: 2, rep: 2, ten: -2 },
          { l: "Downplay Incident in Brief Written Notice", d: "의회 신뢰 저하 우려", pts: 55, mor: 0, rep: -2, ten: 0 },
        ],
      },
    ],
  },
];

export function warroomById(id) {
  return KR_SCENARIOS.find((s) => s.id === id) || US_SCENARIOS.find((s) => s.id === id) || null;
}

export function pickWarroom(week = 1) {
  const pool = isUS() ? US_SCENARIOS : KR_SCENARIOS;
  return pool[Math.floor(week / 5) % pool.length];
}
