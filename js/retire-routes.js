/**
 * 전역 후 제2의 인생 진로 루트 & 전용 일러스트 시스템 (retire-routes.js)
 * 군종·병과·계급에 맞춰 전역 후 선택 가능한 현실적인 민간 진로(민간 항공사 기장, 대형 상선 선장,
 * 인프라/건설 임원, 방산·우주항공 임원, 사이버보안/위기관리 CEO, 안보 싱크탱크·정계)를 제공합니다.
 */

export const RETIRE_ROUTES = [
  {
    id: "airline",
    icon: "✈️",
    img: "img/bg/retire_airline.jpg",
    branches: ["plt", "mar"],
    minGrade: 1,
    kr: {
      badge: "✈️ 민간 항공사 기장 · 하늘의 두 번째 비행",
      title: "대형 국적 항공사 B787 / A350 국제선 기장",
      short: "민간 항공사 기장",
      desc: "전투기·군용기 조종간을 놓고 대형 국적 항공사 국제선 기장으로 제2의 비행을 시작했습니다. 수천 시간의 실전 비행 경력과 위기 대처 능력으로 승객 수백 명의 안전을 책임지는 베테랑 기장으로 존경받습니다.",
    },
    us: {
      badge: "✈️ Commercial Airline Captain · Second Flight",
      title: "미국 메이저 항공사 B777 / B787 국제선 기장",
      short: "메이저 항공사 기장",
      desc: "미 공군·해군 항공대 실전 비행 경력을 인정받아 글로벌 메이저 항공사 국제선 기장으로 스카우트되었습니다. 대양을 횡단하며 세계 최고 수준의 항공 안전을 이끕니다.",
    },
  },
  {
    id: "maritime",
    icon: "🚢",
    img: "img/bg/retire_maritime.jpg",
    branches: ["sea", "sub"],
    minGrade: 1,
    kr: {
      badge: "🚢 글로벌 해운사 선장 · 해상물류 총괄",
      title: "초대형 컨테이너선 선장 · 글로벌 해운 운항본부장",
      short: "대형 상선 선장·해운 임원",
      desc: "함정·잠수함 지휘와 원양 항해 경험을 바탕으로 글로벌 해운사의 초대형 컨테이너선 선장 겸 운항 임원으로 발탁되었습니다. 세계 해상 물류 항로와 해양 안전을 책임집니다.",
    },
    us: {
      badge: "🚢 Master Mariner & Maritime Executive",
      title: "글로벌 해운선단 선장 · 항만물류 총괄 디렉터",
      short: "대형 상선 선장·해운 임원",
      desc: "미 해군 함대 운용과 대양 항해 경력을 바탕으로 글로벌 해운·항만 물류 기업의 운항 총괄 임원으로 취임했습니다. 태평양·대서양 해상 공급망의 핵심을 지휘합니다.",
    },
  },
  {
    id: "engineer",
    icon: "🏗️",
    img: "img/bg/retire_engineer.jpg",
    branches: ["eng"],
    minGrade: 1,
    kr: {
      badge: "🏗️ 글로벌 인프라·건설 총괄 임원",
      title: "대형 건설·플랜트 그룹 SOC 사업본부장",
      short: "건설·인프라 총괄 임원",
      desc: "공병 장교로서 쌓은 대규모 토목·시설 복구·공정 관리 역량을 높이 평가받아 글로벌 대형 건설사의 핵심 인프라 사업본부장으로 영입되었습니다. 초대형 교량과 스마트시티 건설을 진두지휘합니다.",
    },
    us: {
      badge: "🏗️ Global Infrastructure & Engineering VP",
      title: "미국 대형 엔지니어링·인프라 기업 부사장 (VP)",
      short: "글로벌 인프라 임원",
      desc: "미 육군 공병단(USACE) 프로젝트 총괄 경력을 인정받아 미국 굴지의 인프라·건설 엔지니어링 기업 부사장으로 취임했습니다. 국가 기간망 현대화 사업을 이끕니다.",
    },
  },
  {
    id: "defense",
    icon: "🛡️",
    img: "img/bg/retire_defense.jpg",
    branches: ["arm", "art", "sam", "acq"],
    minGrade: 2,
    kr: {
      badge: "🛡️ K-방산 · 항공우주 대기업 임원",
      title: "글로벌 방산·항공우주 기업 전략기획 본부장 (상무)",
      short: "방산·우주항공 임원",
      desc: "실전 무기체계 운용과 전력 획득 전문성을 인정받아 국내 대표 방산·항공우주 기업의 글로벌 수출 총괄 임원으로 스카우트되었습니다. 차세대 무기체계 개발과 K-방산 해외 수출의 주역으로 활약합니다.",
    },
    us: {
      badge: "🛡️ Aerospace & Defense Executive",
      title: "미국 방산·항공우주 대기업 전략사업 부사장 (VP)",
      short: "방산·우주항공 임원",
      desc: "미군 무기체계 운용과 펜타곤 획득 경험을 바탕으로 차세대 스텔스·미사일·위성 체계를 개발하는 방산 대기업 핵심 임원으로 영입되었습니다.",
    },
  },
  {
    id: "cyber",
    icon: "📡",
    img: "img/bg/retire_cyber.jpg",
    branches: ["inf", "tac", "pol"],
    minGrade: 0,
    kr: {
      badge: "📡 사이버보안 · 글로벌 위기관리 CEO",
      title: "글로벌 보안·위기관리 컨설팅 대표이사 (CISO)",
      short: "보안·위기관리 CEO",
      desc: "야전 작전·정보·위기 대응 경험을 민간 영역으로 확장해 대기업 글로벌 위기관리 및 사이버보안 컨설팅 기업을 설립했습니다. 초국가적 사이버 위협과 기업 안보 리스크를 방어합니다.",
    },
    us: {
      badge: "📡 Cybersecurity & Strategic Risk CEO",
      title: "글로벌 사이버안보·위기관리 컨설팅 대표이사",
      short: "사이버안보·위기관리 CEO",
      desc: "군 정보·특수작전·전략 분석 경력을 바탕으로 워싱턴·뉴욕 기반 글로벌 사이버보안 및 지정학 리스크 자문사를 이끌며 포춘 500대 기업을 자문합니다.",
    },
  },
  {
    id: "thinktank",
    icon: "🎓",
    img: "img/bg/retire_thinktank.jpg",
    branches: ["pol", "inf", "sea", "plt"],
    minGrade: 4,
    kr: {
      badge: "🎓 국가안보 싱크탱크 석좌위원 · 외교안보 원로",
      title: "국가안보전략연구원 석좌연구위원 · 주요 방송 안보 패널",
      short: "안보 싱크탱크·정계 진출",
      desc: "오랜 지휘관·참모 경륜을 바탕으로 국가안보 싱크탱크 석좌연구위원 겸 국제 안보 포럼 기조연설가로 활동합니다. 국방 개혁 담론을 이끌며 정계·외교계의 핵심 자문 역할을 맡습니다.",
    },
    us: {
      badge: "🎓 National Security Think Tank Fellow & Statesman",
      title: "워싱턴 국방안보 싱크탱크 석좌연구원 · 안보 해설위원",
      short: "워싱턴 싱크탱크·정계",
      desc: "펜타곤과 야전 최고위직 경륜을 바탕으로 워싱턴 유력 안보 싱크탱크 석좌연구원 겸 주요 방송의 국가안보 수석 해설위원으로 활약하며 미국 외교안보 정책에 큰 영향력을 행사합니다.",
    },
  },
];

/**
 * Return selectable post-retirement routes tailored to the officer's branch and rank.
 * The first item is always the branch's primary recommended civilian career!
 */
export function availableRetireRoutes(branch, grade, isUS = false) {
  const scored = RETIRE_ROUTES
    .filter((r) => {
      const isBranchMatch = r.branches.includes(branch);
      if (isBranchMatch) return true;
      if (r.id === "airline" || r.id === "maritime" || r.id === "engineer") return false;
      return grade >= r.minGrade;
    })
    .map((r) => {
      const primary = r.branches.includes(branch);
      const copy = isUS ? r.us : r.kr;
      return { ...r, ...copy, primary };
    })
    .sort((a, b) => Number(b.primary) - Number(a.primary));

  if (!scored.length) {
    const fb = RETIRE_ROUTES.find((r) => r.id === "cyber");
    return [{ ...fb, ...(isUS ? fb.us : fb.kr), primary: true }];
  }
  return scored;
}

export function resolveRetireRoute(routeId, branch, grade, isUS = false) {
  const list = availableRetireRoutes(branch, grade, isUS);
  return list.find((r) => r.id === routeId) || list[0];
}

export const RETIRE_SCENARIOS = {
  airline: {
    masterTitle: "✈️ 전설의 수석 기장 (Chief Pilot · 무사고 2만 시간 명예기장)",
    stages: [
      {
        title: "제1장 · 북태평양 야간 비행과 응급 환자",
        desc: "승객 310명을 태운 야간 대양 횡단 비행 중 강한 제트기류 난기류와 함께 기내 중증 응급 환자가 발생했습니다.",
        opts: [
          ["최단거리 알래스카 대체공항 긴급 회항 결단", "연료 소모와 지연을 감수하고 회항을 결단해 응급 승객의 생명을 구하고 항공사 안전 표창을 받았습니다."],
          ["기내 의료진 협진 및 고도 변경으로 목적지 직항", "순항 고도를 낮춰 난기류를 회피하고 지상의료 통제센터와 실시간 협진해 정시 착륙과 환자 인계를 완수했습니다."],
        ],
      },
      {
        title: "제2장 · 태풍 측풍 속 활주로 비상착륙",
        desc: "목적지 공항에 돌발 강풍(측풍 38노트)과 윈드시어 경보가 발령되었고 잔여 연료가 여유롭지 않습니다.",
        opts: [
          ["전투기 조종 감각을 살려 수동 크랩(Crab) 착륙 감행", "자동항법장치를 해제하고 정교한 러더 조작으로 활주로 중앙선에 완벽히 접지해 승객들의 박수갈채를 받았습니다."],
          ["1회 복행(Go-Around) 후 돌풍 소강 타이밍 재진입", "무리한 접지 대신 침착하게 복행을 지시한 뒤 기상 레이더 공백을 포착해 안전하게 착륙했습니다."],
        ],
      },
      {
        title: "제3장 · 수석 기장(Chief Pilot) 안전운항 교범 개편",
        desc: "항공사 운항본부가 귀하를 수석 기장으로 추대하며 차세대 조종사 훈련 체계 개편을 맡겼습니다.",
        opts: [
          ["군 공중전·비상처치 기반 CRM 시뮬레이터 훈련 도입", "실전형 위기대응 시뮬레이터 과정을 정착시켜 항공사 국제 안전도 평가 1위 달성을 이끌었습니다."],
          ["데이터 기반 피로도 관리 및 표준 운항절차 확립", "장거리 노선 승무원 피로 관리와 표준 교범을 고도화해 무사고 운항 금자탑을 세웠습니다."],
        ],
      },
    ],
  },
  maritime: {
    masterTitle: "🚢 대양의 마스터 마리너 (Master Mariner · 글로벌 해운 명예선장)",
    stages: [
      {
        title: "제1장 · 아덴만 해적 의심 고속단정 접근",
        desc: "24,000TEU급 초대형 컨테이너선을 지휘해 홍해로 진입하던 중 미식별 고속단정 3척이 본선 좌현으로 급접근합니다.",
        opts: [
          ["소화포 물대포 사격 및 지그재그 회피기동 지시", "해군 함장 시절의 기동 전술로 고속단정의 접현 각도를 완전히 봉쇄하고 안전 해역으로 이탈했습니다."],
          ["청해부대·연합해군 호송전단에 긴급 좌표 전송 및 시타델 격리", "즉시 연합해군 헬기를 유도하고 승조원 전원을 안전격실(Citadel)에 대피시켜 무피해로 위기를 돌파했습니다."],
        ],
      },
      {
        title: "제2장 · 수에즈 운하 적체와 항로 재설계",
        desc: "운하 내 선박 좌초 사고로 양방향 통항이 중단되어 글로벌 공급망 지연 위기가 발생했습니다.",
        opts: [
          ["희망봉 우회 항로 조기 결단 및 경제속도 재산출", "경쟁 선단보다 12시간 먼저 우회 항로를 결단해 화주들의 핵심 반도체·배터리 납기를 사수했습니다."],
          ["현지 운하청 비상 통항 슬롯 협상 및 선단 우선 진입", "군 시절 연합 작전 네트워크를 활용해 1순위 통항 슬롯을 확보하고 최단 시간 내 지중해로 진입했습니다."],
        ],
      },
      {
        title: "제3장 · 차세대 친환경 스마트 선단 총괄",
        desc: "해운사 이사회가 귀하를 운항총괄 본부장 겸 명예선장으로 선임했습니다.",
        opts: [
          ["AI 자율운항 보조 및 위성 통합 운항통제실 구축", "함대 작전상황실(CIC) 모델을 접목한 24시간 글로벌 선단 관제센터를 완성했습니다."],
          ["메탄올·암모니아 친환경 초대형 선대 표준 확립", "친환경 원양 선대 전환을 성공시켜 세계 해운업계 올해의 인물상을 수상했습니다."],
        ],
      },
    ],
  },
  engineer: {
    masterTitle: "🏗️ 글로벌 인프라 거장 (국가 기간망·스마트시티 총괄 부사장)",
    stages: [
      {
        title: "제1장 · 해저터널 난공사 단층대 돌파",
        desc: "초대형 해저터널 굴착 중 예상치 못한 고수압 파쇄대가 발견되어 공정 중단 위기에 놓였습니다.",
        opts: [
          ["TBM 특수 차수 그라우팅 공법 즉시 전환", "야전 공병 도하·굴착 경험을 살려 특수 보강 공법을 즉시 투입, 단 한 건의 안전사고 없이 난구간을 돌파했습니다."],
          ["우회 선형 재설계 및 모듈형 프리캐스트 공법 병행", "정밀 지질 재탐사 후 우회 선형과 모듈 시공을 결합해 공사 기간을 오히려 2개월 단축했습니다."],
        ],
      },
      {
        title: "제2장 · 해외 전후 재건 스마트시티 수주전",
        desc: "해외 대규모 전후 복구 인프라·스마트시티 입찰에서 글로벌 건설사들과 최종 경합 중입니다.",
        opts: [
          ["전시 신속 복구 노하우를 결합한 패키지 제안", "발전·상수도·교량을 18개월 내 동시 복구하는 군 공병식 기동 공정표를 제시해 단독 수주에 성공했습니다."],
          ["방호·재난 안전 특화 지하 인프라 설계 제시", "극한 재난과 안보 위협에도 가동되는 고생존성 도시 인프라 설계로 발주국 정부의 극찬을 받았습니다."],
        ],
      },
      {
        title: "제3장 · 국가 기간망 안전 자문위원장 위촉",
        desc: "국내외 대형 SOC 프로젝트를 잇달아 성공시키며 업계 최고의 인프라 리더로 자리매김했습니다.",
        opts: [
          ["디지털 트윈 기반 국가 교량·터널 상시 진단망 구축", "전국 핵심 교량과 터널에 실시간 구조 안전 감시체계를 도입해 국가 산업훈장을 수훈했습니다."],
          ["차세대 건설·공병 기술 인재 아카데미 설립", "후배 공병 장교와 청년 엔지니어를 양성하는 기술 교육원을 세워 업계의 존경을 한 몸에 받았습니다."],
        ],
      },
    ],
  },
  defense: {
    masterTitle: "🛡️ K-방산·우주항공 글로벌 주역 (해외수출 10조 달성 총괄부사장)",
    stages: [
      {
        title: "제1장 · 해외 수출 현지 사막·혹한기 실사격 시험평가",
        desc: "10조 원 규모 차세대 기갑·포병·방공 체계 수출을 앞두고 구매국 국방부가 가혹한 현지 실사격 시험을 요구했습니다.",
        opts: [
          ["야전 지휘관 경험을 살려 현지 사격장 직접 지휘", "모래폭풍 속 기동 사격과 동시탄착(TOT) 시연을 완벽히 성공시켜 구매국 장성들의 기립박수를 이끌어냈습니다."],
          ["실시간 야전 정비·군수지원 패키지 동시 시연", "단순 명중률을 넘어 30분 내 야전 엔진 교체와 통합 군수지원(ILS) 능력을 입증해 경쟁사를 압도했습니다."],
        ],
      },
      {
        title: "제2장 · 현지 기술이전 및 공동생산 본협상",
        desc: "최종 계약 단계에서 구매국이 핵심 화력통제 기술 이전과 현지 공장 설립을 강하게 요구합니다.",
        opts: [
          ["1차 물량 직도입 + 2차 물량 현지 조립 단계적 타결", "초도 물량의 조기 전력화와 후속 물량 현지 생산을 결합한 절충안으로 수익성과 수주를 모두 잡았습니다."],
          ["차세대 탄약·창정비 허브 공동 구축으로 역제안", "구매국을 지역 방산 군수 허브로 격상시키는 장기 파트너십을 제안해 20년 장기 공급계약까지 체결했습니다."],
        ],
      },
      {
        title: "제3장 · 글로벌 방산·항공우주 박람회 기조연설",
        desc: "사상 최대 방산 수출 계약을 성사시키며 글로벌 방산 컨소시엄 총괄 부사장으로 승진했습니다.",
        opts: [
          ["유무인 복합체계(MUM-T) 및 AI 자율무기 로드맵 발표", "실전 교리와 첨단 AI 기술을 결합한 차세대 전장 비전을 발표해 글로벌 방산업계의 표준을 선도했습니다."],
          ["예비역 야전 전문가 기술자문단 상설화", "전역 장교들의 현장 경험을 무기 개발 초기부터 반영하는 피드백 체계를 완성해 명품 무기 신화를 이어갔습니다."],
        ],
      },
    ],
  },
  cyber: {
    masterTitle: "📡 글로벌 사이버안보·위기관리 최고권위자 (CISO · 시큐리티 그룹 회장)",
    stages: [
      {
        title: "제1장 · 국가 금융·전력망 제로데이 랜섬웨어 심야 침투",
        desc: "새벽 2시, 초국가 해킹 조직이 주요 금융·전력 제어망에 신종 제로데이 악성코드를 유포하며 백업 서버를 노리고 있습니다.",
        opts: [
          ["감염 구획 즉시 망분리 차단 및 허니팟 역추적 가동", "군 작전통제소 대응처럼 15분 만에 망분리를 결단하고 공격 서버의 C2 인프라를 역추적해 피해를 원천 봉쇄했습니다."],
          ["무중단 백업 코어 전환 및 위협 인텔리전스 긴급 패치 배포", "대국민 서비스 중단 없이 클린 백업 코어로 트래픽을 우회시키고 전 고객사에 실시간 백신 시그니처를 배포했습니다."],
        ],
      },
      {
        title: "제2장 · 글로벌 공급망 지정학 위기 컨설팅",
        desc: "해협 봉쇄 위기로 다국적 기업들의 반도체·에너지 공급망이 마비될 위기에 처해 긴급 자문 요청이 쇄도합니다.",
        opts: [
          ["군사 작전계획 기반 3단계 대체 물류·거점 시나리오 가동", "군 작전계획(OPLAN) 수립 기법을 응용한 위기대응 매뉴얼로 고객사들의 공급망 손실을 90% 이상 방어했습니다."],
          ["24시간 글로벌 지정학·사이버 통합 워룸(War Room) 오픈", "전 세계 분쟁 징후와 사이버 공격을 실시간 결합 분석하는 민간 전략 워룸을 구축해 업계 1위에 올랐습니다."],
        ],
      },
      {
        title: "제3장 · 글로벌 AI 사이버안보 표준 컨소시엄 의장 선임",
        desc: "귀하가 설립한 보안·위기관리 기업이 글로벌 유니콘으로 성장해 국제 보안 표준 의장직을 맡게 되었습니다.",
        opts: [
          ["AI 자율 방어 체계 및 민·군 사이버 핫라인 표준화", "민간 보안기업과 국가 사이버사령부 간 실시간 위협 공유 표준을 정립해 대통령 표창을 받았습니다."],
          ["전역 장병 사이버 화이트해커 양성 재단 설립", "군 복무 경험을 가진 청년들을 최정예 보안 전문가로 육성하는 장학재단을 설립했습니다."],
        ],
      },
    ],
  },
  thinktank: {
    masterTitle: "🎓 국가안보 전략의 산증인 (국가안보연구원 명예이사장 · 안보 원로)",
    stages: [
      {
        title: "제1장 · 한반도·인도태평양 복합위기 워게임 주재",
        desc: "동북아 해양·영공 동시 도발을 가정한 국제 안보 싱크탱크 합동 워게임에서 수석 통제관으로 추대되었습니다.",
        opts: [
          ["다영역 통합억제(Integrated Deterrence) 교리 제시", "육·해·공·우주·사이버를 묶은 실전적 합동 대응 시나리오를 입증해 동맹국 전략가들의 찬사를 받았습니다."],
          ["위기관리 핫라인과 비례적 단계별 압박 모델 발표", "군사적 단호함과 외교적 출구전략을 결합한 정교한 에스컬레이션 통제 모델로 국제 학술지에 등재되었습니다."],
        ],
      },
      {
        title: "제2장 · 국회·의회 초당적 국방개혁 특위 기조 증언",
        desc: "인구 절벽과 첨단 기술전 시대를 맞아 입법부 국방개혁 특별위원회가 귀하를 제1 참고인으로 초청했습니다.",
        opts: [
          ["간부 처우 전면 혁신과 유무인 복합 과학기술군 전환 역설", "야전 초급간부부터 장성까지 직접 겪은 생생한 현장 증언으로 여야 만장일치 국방예산 증액을 이끌어냈습니다."],
          ["초당적 국가안보 전략법안 및 방산 생태계 육성 제안", "정권 교체에 흔들리지 않는 중장기 전력 증강 로드맵을 설득해 국가 안보 백서의 핵심 기틀을 마련했습니다."],
        ],
      },
      {
        title: "제3장 · 올해의 국가전략 대상 및 안보 회고록 출간",
        desc: "소위 임관부터 전역 후 국가 전략 자문까지의 발자취를 담은 저서가 베스트셀러에 올랐습니다.",
        opts: [
          ["사관학교·국방대학교 명예 석좌교수 특강 순회", "후배 장교들에게 지휘관의 양심과 전략적 식견을 전수하며 군과 사회를 잇는 존경받는 원로가 되었습니다."],
          ["국제 안보 포럼 상임의장 취임 및 민간 공공외교 주도", "세계 주요 안보 콘퍼런스에서 한미동맹과 지역 평화의 가교 역할을 수행하며 국가적 명예를 드높였습니다."],
        ],
      },
    ],
  },
};

export function retireScenarioHTML(route, dc = {}) {
  const sc = RETIRE_SCENARIOS[route?.id] || RETIRE_SCENARIOS.cyber;
  const step = dc.civStep || 0;
  const logs = dc.civLog || [];
  const done = step >= sc.stages.length;
  const cur = sc.stages[step];
  return `<div class="ret-scen" style="margin-top:14px;padding:14px 16px;background:rgba(12,22,34,.82);border:1px solid rgba(216,178,71,.45);border-radius:8px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
      <b style="color:#ffd166;font-size:14px">🌟 제2의 인생 핵심 결단 시나리오 (${Math.min(step, sc.stages.length)} / ${sc.stages.length})</b>
      <span style="font-size:11.5px;color:#9fc5e2">${done ? "✔ 전 과정 완수 · 마스터 달성" : `Stage ${step + 1}`}</span>
    </div>
    ${logs.length ? `<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px">${logs.map((l, i) => `<div style="font-size:12px;color:#cfe4f5;background:rgba(255,255,255,.04);padding:6px 10px;border-left:3px solid #63d471;border-radius:3px"><b>${i + 1}장 완료 · ${l.choice}</b><br><span style="opacity:.86">${l.outcome}</span></div>`).join("")}</div>` : ""}
    ${done
      ? `<div style="padding:10px 12px;background:linear-gradient(90deg,rgba(216,178,71,.2),rgba(40,70,50,.28));border:1px solid #d8b247;border-radius:6px;color:#fff3c4;font-size:13px"><b>🏆 최종 칭호 획득: ${sc.masterTitle}</b><br><small style="color:#cfe4f5">군 복무의 명예를 넘어 민간 제2의 인생에서도 정점에 올랐습니다. (회고록 및 특수 업적 영구 기록)</small></div>`
      : `<div style="background:rgba(8,14,22,.75);padding:12px;border-radius:6px;border:1px solid rgba(150,185,215,.22)">
          <div style="font-weight:800;color:#fff2c6;font-size:13.5px;margin-bottom:4px">${cur.title}</div>
          <p style="margin:0 0 10px;font-size:12.5px;color:#d6e4f0;line-height:1.55">${cur.desc}</p>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${cur.opts.map(([lbl], idx) => `<button class="mn-doc" data-duty="civstep:${idx}" style="text-align:left;padding:8px 12px;cursor:pointer"><b>▸ ${lbl}</b></button>`).join("")}
          </div>
        </div>`}
  </div>`;
}
