// 영관·장성 전용 시그니처 스토리 아크 (중령·대령·중장·대장 — 각 3화 연속 스토리 + 직전 선택 이어받기).
import { isUS } from "./staff.js";

const KR_ARCS = {
  4: {
    name: "첫 독립 지휘관의 시험",
    tag: "중령 시그니처 아크",
    eps: [
      {
        title: "제1화 · 첫 지휘권 인수와 숨겨진 정비 부실",
        desc: "대대장·함장·비행대대장 취임 첫 주, 야간 현장 점검에서 전임자 시절 보고되지 않은 핵심 장비 정비 누락이 대거 발견됐습니다.",
        opts: [
          { l: "즉각 전면 재정비 선포 및 상급부대 사실 보고", d: "초기 피로 발생 · 2화 전술평가에서 완벽한 가동률 확보", sc: 90, xp: 340, mor: -2, rep: 5, carry: "철저한 사전 정비 덕분에 핵심 장비 가동률 100%를 확보했습니다.", pts: 5, hl: "신임 중령 지휘관, 취임 첫 주 숨겨진 정비 부실 전면 시정" },
          { l: "부대 자체 야간 정비반 편성으로 조용히 보완", d: "안정적 수습 · 평정 A · 사기 소폭 유지", sc: 80, xp: 280, mor: 1, rep: 2, carry: "자체 보완 정비로 급한 불을 끄고 평가 준비에 돌입했습니다.", pts: 2, hl: "신임 지휘관, 부대 자체 정비 역량으로 장비 가동률 회복" },
          { l: "훈련 일정 우선 — 경미 결함은 다음 주기로 이월", d: "사기 유지 · 2화 평가 중 돌발 고장 위험", sc: 58, xp: 180, mor: 2, rep: -3, carry: "이월했던 장비 결함이 본 평가 직전 다시 말썽을 일으킵니다.", pts: -5, hl: "부대 정비 이월 처리 — 상급부대 우려 시선" },
        ],
      },
      {
        title: "제2화 · 야간 악기상 종합 전술평가",
        desc: "폭우와 짙은 안개 속 상급부대 불시 야간 전술평가가 개시됐습니다. 첫 독립 지휘관으로서 부대의 진가를 증명해야 합니다.",
        opts: [
          { l: "예비대 직접 선도 지휘 · 실전형 야간 돌파 완수", d: "고성과 도전 · 평정 S 기대 · 장병 피로 누적", sc: 92, xp: 400, mor: -2, rep: 6, carry: "야간 악기상 속 압도적 전술 성과가 전군에 보고됐습니다.", pts: 5, hl: "독립 지휘관 부대, 악기상 야간 전술평가 최우수 돌파" },
          { l: "표준 야간 교범 절차로 안전·정밀 임무 완수", d: "균형 지휘 · 안정적 A평정 확보", sc: 81, xp: 300, mor: 2, rep: 3, carry: "무사고 정밀 임무 완수로 상급부대의 두터운 신뢰를 얻었습니다.", pts: 2, hl: "신임 지휘관, 야간 종합 전술평가 무사고 통과" },
          { l: "기상 악화 사유로 야간 기동 축소 건의", d: "부대 안전 확보 · 평가 점수 보수적", sc: 60, xp: 190, mor: 3, rep: -3, carry: "보수적 평가 축소로 인해 지휘력 검증 요구가 남았습니다.", pts: -4, hl: "야간 전술평가 축소 건의 — 보수적 지휘 평가" },
        ],
      },
      {
        title: "제3화 · 첫 지휘관 종합평정과 부대 표창",
        desc: "독립 지휘관 첫 반기 결산 시점입니다. 상급부대에서 우수 부대 포상과 함께 차기 핵심 보직 추천 대상자를 추리고 있습니다.",
        opts: [
          { l: "부대 장병 전원 포상 휴가 건의 · 공을 부하에게 돌림", d: "아크 완결 · 부대 사기 대폭 + · 군내 평판 +7", sc: 93, xp: 480, mor: 6, rep: 7, carry: "", pts: 0, hl: "[아크 완결] 신임 중령 지휘관, 부대 최우수 표창과 두터운 신망 확보" },
          { l: "실전 전술 교리 개선 보고서 제출로 전문성 각인", d: "아크 완결 · 평정 최상 · XP 보너스", sc: 95, xp: 520, mor: 2, rep: 5, carry: "", pts: 0, hl: "[아크 완결] 독립 지휘관 전술 개선안 상급사령부 공식 채택" },
          { l: "무난한 결산 보고로 임기 안정 관리", d: "아크 완결 · 안정적 마무리", sc: 80, xp: 340, mor: 3, rep: 3, carry: "", pts: 0, hl: "[아크 완결] 첫 독립 지휘관 반기 임무 무사고 결산" },
        ],
      },
    ],
  },
  5: {
    name: "별(준장)을 향한 최종 검증",
    tag: "대령 시그니처 아크",
    eps: [
      {
        title: "제1화 · 대규모 연합 야외훈련 주력 부대 지휘",
        desc: "장성 진급 1차 관문으로 불리는 연례 대규모 연합훈련에서 핵심 여단·전대·비행단 주공 임무를 맡았습니다.",
        opts: [
          { l: "신규 합동 데이터링크 전술 과감히 실증 지휘", d: "고성과 · 2화 감찰 및 심사에서 강력한 전공 어필", sc: 93, xp: 440, mor: -2, rep: 6, carry: "연합훈련 최우수 전공이 국방부 인사라인에 깊게 각인됐습니다.", pts: 5, hl: "대령 지휘관, 연합훈련 합동 신전술 실증으로 최고 평가" },
          { l: "동맹군과 완벽한 교리 공조로 무결점 완수", d: "안정적 연합 성과 · 평판 +4", sc: 82, xp: 340, mor: 2, rep: 4, carry: "동맹군 지휘부의 우호적 평가서가 상부에 전달됐습니다.", pts: 2, hl: "대령 지휘관, 연합 야외훈련 무결점 공조 완수" },
          { l: "손실 회피 위주 방어적 운용", d: "무사고 유지 · 인상적 성과 부족", sc: 62, xp: 210, mor: 2, rep: -2, carry: "소극적 운용 평가가 장성 인사 검토에서 숙제로 남았습니다.", pts: -4, hl: "연합훈련 보수적 운용 — 적극성 보완 의견" },
        ],
      },
      {
        title: "제2화 · 장성 인사 전 불시 청렴·보안 감찰",
        desc: "국방부 특별감찰단이 예고 없이 부대 예산·군수·보안 전반을 정밀 감사하기 시작했습니다. 과거 관행적 행정 처리 1건이 도마에 올랐습니다.",
        opts: [
          { l: "모든 장부 투명 공개 · 관행 즉시 폐지 및 재발 방지", d: "청렴도 극대화 · 3화 최종 브리핑 신뢰도 +5", sc: 92, xp: 420, mor: 2, rep: 7, carry: "무결점 청렴 감찰 통과로 장성 후보 중 최고 신뢰를 얻었습니다.", pts: 5, hl: "장성 후보 대령, 불시 청렴·보안 감찰 무결점 통과" },
          { l: "규정 범위 내 소명서 제출 및 행정 시정", d: "표준 대응 · 무난한 통과", sc: 80, xp: 310, mor: 1, rep: 3, carry: "감찰 지적 사항을 무난히 소명하고 최종 단계로 넘어갔습니다.", pts: 2, hl: "부대 특별감찰 행정 시정 후 정상 종결" },
          { l: "인맥을 통해 감사 수위 완화 비공식 타진", d: "리스크 높음 · 청렴 평판 훼손 우려", sc: 52, xp: 180, mor: -2, rep: -6, carry: "비공식 청탁 정황이 구설에 올라 심사 분위기가 냉랭해졌습니다.", pts: -6, hl: "장성 후보 감찰 무마 시도 의혹 — 군내 여론 악화" },
        ],
      },
      {
        title: "제3화 · 장성(준장) 진급 추천 최종 지휘 브리핑",
        desc: "각 군 참모총장과 합참 주요 장성들 앞에서 차세대 전력 운용 비전을 발표하는 최종 무대입니다.",
        opts: [
          { l: "야전 경험과 미래 다영역 합동 비전 결합 발표", d: "아크 완결 · 평정 최상 · 평판 +8", sc: 95, xp: 560, mor: 3, rep: 8, carry: "", pts: 0, hl: "[아크 완결] 대령 지휘관, 장성단 만장일치 호평 — 유력 준장 진급 후보 부상" },
          { l: "현장 장병 안전과 실전 준비태세 중심 실용 발표", d: "아크 완결 · 사기 +5 · 평판 +6", sc: 89, xp: 480, mor: 5, rep: 6, carry: "", pts: 0, hl: "[아크 완결] 현장 중심 지휘 철학 브리핑 — 군내 두터운 지지 확보" },
          { l: "기존 교범 요약 중심의 무난한 보고", d: "아크 완결 · 안정적 마무리", sc: 78, xp: 360, mor: 1, rep: 2, carry: "", pts: 0, hl: "[아크 완결] 대령 최종 지휘 브리핑 무난히 완료" },
        ],
      },
    ],
  },
  8: {
    name: "전구 국지도발과 4성의 무게",
    tag: "중장 시그니처 아크",
    eps: [
      {
        title: "제1화 · 접경·해상 복합 국지도발 경보 발령",
        desc: "군단·함대·사령부 관할 구역에서 적 무인기 침투와 화력·해상 위협이 동시에 포착됐습니다. 초동 경계 수위를 결정하십시오.",
        opts: [
          { l: "즉각 합동 대비태세 격상 · 타격자산 전진 배치", d: "단호한 억제 · 2화 합참 협상에서 주도권 확보", sc: 92, xp: 520, mor: 2, rep: 6, carry: "신속한 초동 전력 전개로 적의 추가 도발 의지를 꺾었습니다.", pts: 5, hl: "중장 사령관, 복합 도발에 즉각 합동 억제 태세 가동" },
          { l: "합참·연합사 실시간 공조 하에 단계적 대응", d: "안정적 위기 관리 · 평판 +4", sc: 83, xp: 400, mor: 2, rep: 4, carry: "연합사와의 긴밀한 공조로 위기 통제력을 유지했습니다.", pts: 2, hl: "전구 사령부, 연합 공조 기반 단계적 위기 대응" },
          { l: "우발 충돌 우려로 대응 수위 최소화", d: "긴장 완화 · 대비태세 소극 지적 우려", sc: 58, xp: 240, mor: -2, rep: -4, carry: "소극적 초동 대응으로 상부에서 강경 대응 압박이 거세집니다.", pts: -5, hl: "국지도발 초동 대응 지연 논란" },
        ],
      },
      {
        title: "제2화 · 합참 작전 수위 갈등 — 비례 응징 vs 확전 억제",
        desc: "적의 2차 도발 징후 앞에서 합참 내부 의견이 강경 타격파와 외교·억제파로 팽팽히 갈렸습니다. 현장 최고 지휘관의 결단이 필요합니다.",
        opts: [
          { l: "정밀 비례 응징 태세 공개 시위로 압도적 억제 달성", d: "고난도 결단 · 3화 4성 발탁 유력", sc: 94, xp: 560, mor: 3, rep: 7, carry: "비례 응징 억제 시위가 적중해 추가 충돌 없이 위기가 진정됐습니다.", pts: 5, hl: "중장 사령관, 압도적 비례 억제 결단으로 국지도발 차단" },
          { l: "방어망 집중 보강 및 동맹 전략자산 전개 요청", d: "안정적 억제 · 평판 +5", sc: 84, xp: 430, mor: 2, rep: 5, carry: "동맹 전략자산 전개로 안정적 억제 균형을 복원했습니다.", pts: 2, hl: "동맹 전략자산 합동 전개로 전구 위기 안정화" },
          { l: "상부 최종 지침만 대기하며 현장 판단 유보", d: "책임 회피 지적 · 평판 하락", sc: 56, xp: 240, mor: -2, rep: -5, carry: "결정적 순간의 판단 유보가 지휘력 의문으로 남았습니다.", pts: -5, hl: "위기 국면 현장 지휘관 결단 부재 지적" },
        ],
      },
      {
        title: "제3화 · 위기 종결과 4성(대장) 승진 분수령",
        desc: "국지도발 위기가 성공적으로 종결됐습니다. 청와대·국방부에서 차기 4성(참모총장·작전사령관) 후보군 최종 면담을 요청했습니다.",
        opts: [
          { l: "전구 합동작전 교훈 백서 제출 · 3군 통합 개혁 제시", d: "아크 완결 · 평정 최상 · 평판 +8", sc: 95, xp: 640, mor: 3, rep: 8, carry: "", pts: 0, hl: "[아크 완결] 중장 사령관, 국지도발 완벽 제압 공로로 차기 4성 1순위 부상" },
          { l: "작전 참여 전 장병 포상과 연합 공조 강화 강조", d: "아크 완결 · 사기 +6 · 평판 +6", sc: 90, xp: 540, mor: 6, rep: 6, carry: "", pts: 0, hl: "[아크 완결] 위기 극복 공로 장병 격려 — 전군 신망 극대화" },
          { l: "조용히 본연 임무로 복귀", d: "아크 완결 · 안정적 마무리", sc: 82, xp: 420, mor: 2, rep: 3, carry: "", pts: 0, hl: "[아크 완결] 전구 위기 임무 완수 후 정상 대비태세 복귀" },
        ],
      },
    ],
  },
  9: {
    name: "별 넷의 고독 — 정치적 중립과 국가안보",
    tag: "대장 시그니처 아크",
    eps: [
      {
        title: "제1화 · 정권 교체기 — 군의 정치적 중립 수호",
        desc: "대규모 정치적 격변기 속, 일부 정치권 인사가 군 수뇌부의 공개 지지 성명을 비공식적으로 타진해 왔습니다.",
        opts: [
          { l: "“군은 오직 헌법과 국민에게만 충성한다” 단호히 거절", d: "역사적 명예 · 평판 +8 · 2화 국회 청문회 신뢰 극대화", sc: 95, xp: 600, mor: 5, rep: 8, carry: "헌법 수호와 정치적 중립 원칙이 여야 모두의 존경을 이끌어냈습니다.", pts: 5, hl: "4성 대장, 정권 교체기 군의 정치적 중립 단호히 천명" },
          { l: "공식 규정 문서로만 원론적 불가 회신", d: "안전한 원칙 대응 · 평판 +4", sc: 84, xp: 450, mor: 2, rep: 4, carry: "원론적 중립 유지로 불필요한 정치적 파장을 차단했습니다.", pts: 2, hl: "군 수뇌부, 선거·정권 교체기 엄정 중립 지침 하달" },
          { l: "모호한 태도로 정치권과의 접점 유지", d: "군내 신뢰 하락 · 언론 비판 위험", sc: 52, xp: 240, mor: -4, rep: -7, carry: "정치적 중립 훼손 논란이 국회 청문회 쟁점으로 번졌습니다.", pts: -6, hl: "군 최고 지휘관 정치권 접촉 논란 — 군심 동요" },
        ],
      },
      {
        title: "제2화 · 국회 국방위원회 대규모 전력 개편 청문회",
        desc: "차세대 국방혁신 10년 계획과 병력 구조 개편을 두고 국회 국방위원회에서 치열한 질의가 쏟아집니다.",
        opts: [
          { l: "AI·무인체계·정예 간부 중심의 정량 데이터로 초당적 설득", d: "압도적 청문회 성과 · 3화 국방장관 유력 후보", sc: 95, xp: 620, mor: 3, rep: 8, carry: "초당적 지지를 이끌어낸 청문회 답변이 차기 장관 하마평에 올랐습니다.", pts: 5, hl: "4성 대장, 국회 국방위서 차세대 국방혁신안 초당적 찬사" },
          { l: "현행 전력 안정 유지와 점진적 개편 절충안 제시", d: "안정적 통과 · 평판 +4", sc: 84, xp: 470, mor: 2, rep: 4, carry: "실용적 절충안으로 국회 예산 소위를 무난히 통과했습니다.", pts: 2, hl: "국회 국방위 전력 개편안 원만한 합의" },
          { l: "군 내부 원안만 고수하며 위원들과 정면 충돌", d: "예산 보류 · 평판 하락", sc: 58, xp: 260, mor: -1, rep: -4, carry: "국회와의 갈등으로 개혁안 처리가 지연됐습니다.", pts: -5, hl: "국회 국방위 증언 마찰 — 국방개혁안 진통" },
        ],
      },
      {
        title: "제3화 · 차기 국방부장관 제청의 갈림길",
        desc: "대통령실에서 차기 국방부장관 후보 검증과 함께 군 원로로서의 마지막 소임을 물어왔습니다.",
        opts: [
          { l: "“국가안보를 위해서라면 어떤 소임도 마다 않겠습니다”", d: "아크 완결 · 국방장관 취임·원수 특별진급 명분 극대화", sc: 96, xp: 700, mor: 5, rep: 9, carry: "", pts: 0, hl: "[아크 완결] 4성 대장, 국가안보의 거목으로 평가 — 차기 국방부장관 유력 거론" },
          { l: "“후배 장성들이 성장할 수 있는 토대를 남기겠습니다”", d: "아크 완결 · 전군 사기 +7 · 평판 +7", sc: 92, xp: 600, mor: 7, rep: 7, carry: "", pts: 0, hl: "[아크 완결] 4성 대장의 품격 있는 리더십 — 전군 장병 존경" },
          { l: "군 본연의 대비태세 완성에만 집중 선언", d: "아크 완결 · 안정적 마무리", sc: 86, xp: 500, mor: 3, rep: 5, carry: "", pts: 0, hl: "[아크 완결] 4성 대장, 완벽한 군사대비태세 유지 천명" },
        ],
      },
    ],
  },
};

const US_ARCS = {
  4: {
    name: "First Independent Command (O-5)",
    tag: "O-5 Signature Arc",
    eps: [
      {
        title: "Ep 1 · Assumption of Command & Hidden Maintenance Backlog",
        desc: "대대장·함장·비행대대장(O-5) 취임 첫 주, 현장 점검에서 전임 지휘부 시절 누락된 핵심 장비 정비 결함이 다수 발견됐습니다.",
        opts: [
          { l: "Full Stand-Down & Transparent Report to Higher HQ", d: "초기 피로 발생 · 2화 실전 평가 가동률 100% 확보", sc: 90, xp: 340, mor: -2, rep: 5, carry: "철저한 사전 정비로 핵심 무기체계 100% 가동률을 달성했습니다.", pts: 5, hl: "New O-5 Commander clears hidden maintenance backlog on Week 1" },
          { l: "Internal Maintenance Surge to Fix Quietly", d: "안정적 수습 · 평정 A", sc: 80, xp: 280, mor: 1, rep: 2, carry: "자체 정비반 집중 투입으로 급한 결함을 해결했습니다.", pts: 2, hl: "Unit maintenance surge restores readiness ahead of schedule" },
          { l: "Defer Minor Defects to Protect Training Tempo", d: "사기 유지 · 2화 평가 중 돌발 고장 위험", sc: 58, xp: 180, mor: 2, rep: -3, carry: "이월했던 결함이 본 평가 직전 다시 문제를 일으킵니다.", pts: -5, hl: "Deferred maintenance raises readiness concerns at higher HQ" },
        ],
      },
      {
        title: "Ep 2 · Night Live-Fire & Operational Readiness Inspection",
        desc: "악기상 야간 실사격·작전 준비태세(ORI) 불시 검열이 하달됐습니다. 첫 독립 지휘관의 역량이 시험대에 올랐습니다.",
        opts: [
          { l: "Lead from the Front — Execute Full Night Live-Fire", d: "고성과 도전 · 평정 S 기대", sc: 92, xp: 400, mor: -2, rep: 6, carry: "야간 악기상 실사격 최우수 성과가 사령부 전체에 보고됐습니다.", pts: 5, hl: "O-5 Command earns top marks in night ORI live-fire evaluation" },
          { l: "Follow Standard Doctrine for Zero-Mishap Pass", d: "균형 지휘 · 안정적 A평정", sc: 81, xp: 300, mor: 2, rep: 3, carry: "무사고 정밀 평가 통과로 상급부대 신뢰를 굳혔습니다.", pts: 2, hl: "Command passes night readiness inspection with zero mishaps" },
          { l: "Request Weather Waiver to Scale Back Exercise", d: "안전 확보 · 평가 보수적", sc: 60, xp: 190, mor: 3, rep: -3, carry: "평가 축소로 지휘 결단력에 의문이 남았습니다.", pts: -4, hl: "Scaled-back exercise draws cautious feedback from evaluators" },
        ],
      },
      {
        title: "Ep 3 · First Command FitRep & Unit Citation",
        desc: "독립 지휘관 첫 결산과 부대 표창 추천 시즌입니다. 상급 사령부가 차기 O-6 핵심 보직 후보를 검토하고 있습니다.",
        opts: [
          { l: "Credit Junior Officers & Enlisted — Recommend Unit Award", d: "아크 완결 · 부대 사기 대폭 + · 평판 +7", sc: 93, xp: 480, mor: 6, rep: 7, carry: "", pts: 0, hl: "[Arc Complete] O-5 Commander earns Meritorious Unit Commendation" },
          { l: "Submit Tactical Lessons-Learned Paper to Doctrine Center", d: "아크 완결 · 평정 최상 · XP 보너스", sc: 95, xp: 520, mor: 2, rep: 5, carry: "", pts: 0, hl: "[Arc Complete] Tactical innovation paper adopted by Service Doctrine Center" },
          { l: "File Standard End-of-Cycle Report", d: "아크 완결 · 안정적 마무리", sc: 80, xp: 340, mor: 3, rep: 3, carry: "", pts: 0, hl: "[Arc Complete] First independent command cycle completed cleanly" },
        ],
      },
    ],
  },
  5: {
    name: "Road to the First Star (O-6)",
    tag: "O-6 Signature Arc",
    eps: [
      {
        title: "Ep 1 · Multinational Joint Brigade / Wing Exercise",
        desc: "준장(O-7) 진급의 핵심 관문인 동맹국 합동 대규모 훈련에서 주력 여단·전대·비행단을 지휘합니다.",
        opts: [
          { l: "Integrate JADC2 Multi-Domain Strike Package", d: "고성과 · 2화 감찰 및 진급 심사 강력 어필", sc: 93, xp: 440, mor: -2, rep: 6, carry: "합동훈련 최우수 성과가 펜타곤 장성 인사위원회에 보고됐습니다.", pts: 5, hl: "O-6 Commander pioneers JADC2 strike integration in allied exercise" },
          { l: "Deliver Seamless NATO / Indo-Pacific Allied Coordination", d: "안정적 연합 성과 · 평판 +4", sc: 82, xp: 340, mor: 2, rep: 4, carry: "동맹군 사령관의 찬사가 상부 평정서에 첨부됐습니다.", pts: 2, hl: "Allied partners praise O-6 leadership in multinational drill" },
          { l: "Keep Conservative Defensive Posture", d: "무사고 유지 · 인상적 성과 부족", sc: 62, xp: 210, mor: 2, rep: -2, carry: "보수적 운용 평가가 장성 심사에서 아쉬움으로 남았습니다.", pts: -4, hl: "Conservative exercise posture noted by joint observers" },
        ],
      },
      {
        title: "Ep 2 · Pre-Flag Officer IG & Ethics Clearance",
        desc: "장성(O-7) 후보 검증을 앞두고 펜타곤 감찰관(IG)이 부대 회계·보안·지휘문화를 정밀 감사합니다.",
        opts: [
          { l: "Full Transparency — Reform Legacy Admin Practices", d: "청렴도 극대화 · 3화 최종 브리핑 신뢰 +5", sc: 92, xp: 420, mor: 2, rep: 7, carry: "무결점 IG 청렴 검증 통과로 최상위 장성 후보로 꼽혔습니다.", pts: 5, hl: "Flag candidate clears Pentagon IG ethics audit with flying colors" },
          { l: "Submit Formal Documentation & Standard Remediation", d: "표준 대응 · 무난한 통과", sc: 80, xp: 310, mor: 1, rep: 3, carry: "감찰 소명을 무난히 마치고 최종 브리핑에 올랐습니다.", pts: 2, hl: "Unit closes routine IG findings cleanly" },
          { l: "Use Backchannel Contacts to Soften Audit Tone", d: "리스크 높음 · 청렴 평판 하락", sc: 52, xp: 180, mor: -2, rep: -6, carry: "비공식 접촉 정황이 문제가 되어 인사 분위기가 냉각됐습니다.", pts: -6, hl: "Audit backchannel rumors cast shadow over promotion board" },
        ],
      },
      {
        title: "Ep 3 · Pentagon Flag Selection Briefing",
        desc: "합참과 각 군 수뇌부 앞에서 차세대 억제 전략과 부대 지휘 비전을 발표하는 최종 무대입니다.",
        opts: [
          { l: "Present Bold Joint Deterrence & Modernization Vision", d: "아크 완결 · 평정 최상 · 평판 +8", sc: 95, xp: 560, mor: 3, rep: 8, carry: "", pts: 0, hl: "[Arc Complete] Pentagon leadership hails O-6 strategic vision — top O-7 contender" },
          { l: "Focus on Warfighter Readiness & Troop Welfare", d: "아크 완결 · 사기 +5 · 평판 +6", sc: 89, xp: 480, mor: 5, rep: 6, carry: "", pts: 0, hl: "[Arc Complete] People-first readiness briefing wins broad support" },
          { l: "Deliver Standard Doctrine Overview", d: "아크 완결 · 안정적 마무리", sc: 78, xp: 360, mor: 1, rep: 2, carry: "", pts: 0, hl: "[Arc Complete] O-6 capstone briefing completed" },
        ],
      },
    ],
  },
  8: {
    name: "Theater Flashpoint & The Fourth Star (O-9)",
    tag: "O-9 Signature Arc",
    eps: [
      {
        title: "Ep 1 · Indo-Pacific Flashpoint Escalation Alert",
        desc: "관할 전구에서 적 수상전단과 장거리 폭격기 편대의 복합 도발 경보가 동시에 울렸습니다.",
        opts: [
          { l: "Elevate Readiness & Forward-Deploy Deterrence Assets", d: "단호한 억제 · 2화 합참 논의 주도권 확보", sc: 92, xp: 520, mor: 2, rep: 6, carry: "신속한 전방 전개로 적의 추가 도발 의지를 선제 차단했습니다.", pts: 5, hl: "Three-star commander deploys rapid joint deterrence posture" },
          { l: "Coordinate Phased Allied Response via INDOPACOM", d: "안정적 위기 관리 · 평판 +4", sc: 83, xp: 400, mor: 2, rep: 4, carry: "동맹국과의 긴밀한 공조로 위기 통제권을 유지했습니다.", pts: 2, hl: "Allied theater command establishes steady crisis response" },
          { l: "Hold Forces Back to Avoid Provocation", d: "긴장 완화 · 소극 대응 지적 우려", sc: 58, xp: 240, mor: -2, rep: -4, carry: "소극적 초동 대응으로 워싱턴의 우려가 커졌습니다.", pts: -5, hl: "Delayed theater response draws scrutiny in Washington" },
        ],
      },
      {
        title: "Ep 2 · Joint Staff Rules of Engagement Dilemma",
        desc: "펜타곤과 백악관 NSC 사이에서 강경 비례 대응과 확전 억제 의견이 팽팽히 맞섭니다. 전구 지휘관의 건의가 결정적입니다.",
        opts: [
          { l: "Recommend Calibrated Proportional Deterrence Show of Force", d: "고난도 결단 · 3화 4성 지명 유력", sc: 94, xp: 560, mor: 3, rep: 7, carry: "정밀 비례 억제 시위가 적중해 확전 없이 위기가 종결됐습니다.", pts: 5, hl: "Calibrated deterrence de-escalates Indo-Pacific standoff without conflict" },
          { l: "Bolster Integrated Air & Maritime Defense Shield", d: "안정적 억제 · 평판 +5", sc: 84, xp: 430, mor: 2, rep: 5, carry: "동맹 방어망 강화로 안정적 균형을 되찾았습니다.", pts: 2, hl: "Integrated allied defense posture restores regional stability" },
          { l: "Defer All Judgment to Washington Without Recommendation", d: "지휘력 의문 · 평판 하락", sc: 56, xp: 240, mor: -2, rep: -5, carry: "결정적 순간의 판단 유보가 4성 검증에서 약점으로 남았습니다.", pts: -5, hl: "Hesitation during crisis clouds four-star prospects" },
        ],
      },
      {
        title: "Ep 3 · Crisis Resolution & Four-Star Nomination",
        desc: "전구 위기가 성공적으로 마무리됐습니다. 미 국방부와 백악관이 차기 4성(O-10) 지명 후보군을 최종 면담합니다.",
        opts: [
          { l: "Deliver Joint After-Action Blueprint for Theater Reform", d: "아크 완결 · 평정 최상 · 평판 +8", sc: 95, xp: 640, mor: 3, rep: 8, carry: "", pts: 0, hl: "[Arc Complete] Three-star commander emerges as front-runner for Fourth Star" },
          { l: "Spotlight Allied Teamwork & Frontline Troops", d: "아크 완결 · 사기 +6 · 평판 +6", sc: 90, xp: 540, mor: 6, rep: 6, carry: "", pts: 0, hl: "[Arc Complete] Troops and allies rally behind theater commander" },
          { l: "Return Quietly to Routine Readiness Operations", d: "아크 완결 · 안정적 마무리", sc: 82, xp: 420, mor: 2, rep: 3, carry: "", pts: 0, hl: "[Arc Complete] Theater operations return to steady state" },
        ],
      },
    ],
  },
  9: {
    name: "Four Stars & The Constitution (O-10)",
    tag: "O-10 Signature Arc",
    eps: [
      {
        title: "Ep 1 · Presidential Transition & Non-Partisan Military Ethos",
        desc: "치열한 정권 교체기, 일부 정치권 인사가 군 최고 수뇌부의 공개적 정치 지지를 비공식 요청해 왔습니다.",
        opts: [
          { l: "“We swear an oath to the Constitution, not a party.”", d: "역사적 명예 · 평판 +8 · 2화 상원 청문회 신뢰 극대화", sc: 95, xp: 600, mor: 5, rep: 8, carry: "헌법 수호와 비정치적 군 전통 수호가 초당적 존경을 얻었습니다.", pts: 5, hl: "Four-star general reaffirms non-partisan oath to U.S. Constitution" },
          { l: "Issue Formal DoD Directive Citation Only", d: "안전한 원칙 대응 · 평판 +4", sc: 84, xp: 450, mor: 2, rep: 4, carry: "원론적 규정 회신으로 정치적 파장을 차단했습니다.", pts: 2, hl: "Pentagon leadership reiterates DoD political neutrality policy" },
          { l: "Keep Ambiguous Political Backchannels Open", d: "군내 신뢰 하락 · 언론 비판 위험", sc: 52, xp: 240, mor: -4, rep: -7, carry: "정치적 중립 논란이 상원 청문회 쟁점으로 비화됐습니다.", pts: -6, hl: "Partisan rumors spark backlash on Capitol Hill" },
        ],
      },
      {
        title: "Ep 2 · Senate Armed Services Committee (SASC) Posture Clash",
        desc: "미 의회 상원 군사위원회에서 10년 국방 현대화 예산과 해외 주둔 전략을 두고 치열한 청문회가 열립니다.",
        opts: [
          { l: "Win Bipartisan Backing with Data-Driven Modernization Plan", d: "압도적 청문회 성과 · 3화 국방장관 유력 후보", sc: 95, xp: 620, mor: 3, rep: 8, carry: "초당적 지지를 이끌어낸 증언이 차기 국방장관(SecDef) 하마평에 올랐습니다.", pts: 5, hl: "SASC senators praise four-star chief's bipartisan modernization testimony" },
          { l: "Negotiate Pragmatic Compromise on Key Programs", d: "안정적 통과 · 평판 +4", sc: 84, xp: 470, mor: 2, rep: 4, carry: "실용적 타협안으로 국방수권법(NDAA) 핵심 예산을 지켰습니다.", pts: 2, hl: "NDAA modernization compromise clears Senate committee" },
          { l: "Clash Directly with Senators Over Budget Cuts", d: "예산 보류 · 평판 하락", sc: 58, xp: 260, mor: -1, rep: -4, carry: "의회와의 정면 충돌로 핵심 사업 예산이 보류됐습니다.", pts: -5, hl: "Heated SASC hearing stalls key defense appropriations" },
        ],
      },
      {
        title: "Ep 3 · The White House Call — Secretary of Defense Shortlist",
        desc: "백악관에서 차기 미 국방장관(Secretary of Defense) 후보군 검증과 함께 국가안보 최고 원로로서의 소임을 물어왔습니다.",
        opts: [
          { l: "“Whenever the nation calls, I am ready to serve.”", d: "아크 완결 · SecDef 취임·5성 원수 명분 극대화", sc: 96, xp: 700, mor: 5, rep: 9, carry: "", pts: 0, hl: "[Arc Complete] Four-star chief named top contender for Secretary of Defense" },
          { l: "“My duty is to leave the strongest force for the next generation.”", d: "아크 완결 · 전군 사기 +7 · 평판 +7", sc: 92, xp: 600, mor: 7, rep: 7, carry: "", pts: 0, hl: "[Arc Complete] Servicemembers applaud four-star leader's enduring legacy" },
          { l: "Stay Focused Purely on Active Operational Readiness", d: "아크 완결 · 안정적 마무리", sc: 86, xp: 500, mor: 3, rep: 5, carry: "", pts: 0, hl: "[Arc Complete] Four-star commander maintains peak force readiness" },
        ],
      },
    ],
  },
};

export function arcFor(grade) {
  const pool = isUS() ? US_ARCS : KR_ARCS;
  return pool[grade] || null;
}

/** Return the next uncompleted signature arc episode for the player's current grade, or null. */
export function currentRankArc(d, grade) {
  const arc = arcFor(grade);
  if (!arc) return null;
  const done = d.arcChoices?.[grade] || [];
  if (done.length >= arc.eps.length) return null;
  const step = done.length;
  const ep = arc.eps[step];
  let carryover = null;
  if (step > 0) {
    const prevChoice = done[step - 1];
    const prevOpt = arc.eps[step - 1]?.opts?.[prevChoice];
    if (prevOpt?.carry) carryover = { text: prevOpt.carry, pts: prevOpt.pts || 0 };
  }
  return { grade, step, total: arc.eps.length, name: arc.name, tag: arc.tag, ep, carryover };
}
