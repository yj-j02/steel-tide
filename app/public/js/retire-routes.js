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
