/**
 * Phase 5 Chapters (phase5-chapters.js)
 * 1. ⚖️ 군내 대형 스캔들 · 특별감찰 · 국회/상원 청문회 위기 돌파 챕터
 * 2. 🌍 해외 실전 파병 & 연합원정군 3단계 특별 파견 트랙
 * 3. 🧬 장교 결혼·가족 서사 & 2대·3대 자녀 세대 계승 (군인 명문가 시스템)
 */

export const OVERSEAS_TOURS = {
  kr_army: {
    id: "kr_army",
    icon: "🏜️",
    title: "레바논 동명부대 · UAE 아크부대 해외 파병단",
    badge: "UN 평화유지 · 특수전 군사협력 파병",
    stages: [
      {
        title: "파병 1단계 · UN 완충지대 블루라인 긴급 전개",
        desc: "현지 무장세력 간 포격으로 긴장이 고조된 접경 완충지대에 파병부대 주력 기동대를 전개해야 합니다.",
        opts: [
          ["장갑차 기동순찰 강화 및 현지 주민 보호소 즉시 개방", "강력한 장갑 기동 시위와 인도적 보호 조치로 무장세력의 오판을 막고 현지 주민들의 절대적 신뢰를 얻었습니다."],
          ["다국적군 사령부(UNIFIL) 합동 감시초소 통합 운용", "우방국 파병부대와 실시간 표적·감시망을 연동해 접경 도발 징후를 조기에 차단했습니다."],
        ],
      },
      {
        title: "파병 2단계 · 아크부대 사막 고온 특수전 연합훈련",
        desc: "섭씨 45도를 넘나드는 사막 환경에서 현지 특수전 사령부와 대테러·인질구출 합동 실사격 훈련을 지휘합니다.",
        opts: [
          ["야간 고공강하(HALO) 및 건물 내부 소탕 시범 주도", "한 치의 오차 없는 야간 침투와 정밀 사격으로 현지군 수뇌부의 극찬과 방산 협력 요청을 이끌어냈습니다."],
          ["사막 기동 군수·의무 후송 합동 교리 정립", "극한 환경에서의 전투지속지원 능력을 입증해 양국 군사외교의 핵심 가교 역할을 완수했습니다."],
        ],
      },
      {
        title: "파병 3단계 · UN 평화유지훈장 수훈 및 본국 귀환",
        desc: "8개월간의 파병 임무를 단 한 건의 인명 피해 없이 완수하고 귀국길에 오릅니다.",
        opts: [
          ["실전 파병 교훈을 정리한 합동 전술교범 합참 제출", "파병지의 실전 전훈을 전군 교범에 반영해 합참의장 특별표창과 해외파병 기장을 수훈했습니다."],
          ["파병 장병 전원 무사 귀환 환영식 및 전우회 결성", "생사고락을 함께한 파병 장병들과 평생의 전우애를 다지며 명예롭게 본대 보직으로 복귀했습니다."],
        ],
      },
    ],
  },
  kr_navy: {
    id: "kr_navy",
    icon: "⚓",
    title: "청해부대 아덴만 해역 대해적 호송전단 파병",
    badge: "아덴만·인도양 원양 해상교통로 수호 파병",
    stages: [
      {
        title: "파병 1단계 · 아덴만 우리 국적 상선 피랍 위기 긴급 출동",
        desc: "소말리아 인근 해역에서 해적 모선과 고속단정 2척이 우리 상선에 접근 중이라는 조난 신호가 수신되었습니다.",
        opts: [
          ["링스 해상작전헬기 긴급 발진 및 저격수 경고사격", "헬기 기동 사격으로 해적 고속단정의 엔진을 무력화하고 상선 승무원 전원을 안전하게 보호했습니다."],
          ["UDT/SEAL 검문검색대 고속단정(RIB) 즉시 투입", "파도를 뚫고 해적 단정을 완벽히 제압·나포하여 청해부대의 위용을 전 세계 해역에 각인시켰습니다."],
        ],
      },
      {
        title: "파병 2단계 · 다국적 연합해군(CTF-151) 인해전술 합동 기동",
        desc: "미·영·일 등이 참여하는 대해적 연합해군 사령부로부터 핵심 해역 기함 지휘 협조 요청이 들어왔습니다.",
        opts: [
          ["연합 호송 구역 통합 지휘 및 위성 전술데이터링크 연동", "다국적 함정을 일사불란하게 지휘해 해당 분기 해적 피해율 0%라는 대기록을 달성했습니다."],
          ["인접 해역 우방국 조난 선박 야간 긴급 구조 작전", "악천후 속 야간 해상 탐색구조(SAR)를 성공시켜 국제해사기구(IMO) 특별 감사패를 받았습니다."],
        ],
      },
      {
        title: "파병 3단계 · 원양 파병 임무 완수 및 진해 군항 입항",
        desc: "거친 인도양과 아덴만 항해를 마치고 함정이 마침내 모항으로 귀항합니다.",
        opts: [
          ["원양 작전 항해일지 및 대양해군 전훈 보고서 헌정", "실전 대양 작전 데이터를 해군작전사령부에 공유하며 해외파병 기장과 진급 가산점을 획득했습니다."],
          ["장기간 함상 생활을 견딘 승조원 전원 포상 휴가 건의", "승조원들의 사기를 최고조로 끌어올리며 해군 내 최고의 덕장으로 이름을 알렸습니다."],
        ],
      },
    ],
  },
  kr_air: {
    id: "kr_air",
    icon: "🦅",
    title: "레드플래그 알래스카 · 국제 긴급공수 파병단",
    badge: "태평양 횡단 연합 공중전 · 인도적 공수 파병",
    stages: [
      {
        title: "파병 1단계 · 북태평양 무착륙 공중급유 페리(Ferry) 비행",
        desc: "전투기 편대와 수송기를 이끌고 악기상과 장거리 피로를 극복하며 태평양을 무착륙 횡단해야 합니다.",
        opts: [
          ["공중급유기(KC-330) 정밀 랑데부 및 편대 대형 유지", "강한 난기류 속에서도 전 기체 1회 시도 만에 공중급유에 성공하며 정시에 알래스카 기지에 전개했습니다."],
          ["기상 위성 연동 대체 항로 기동 및 정비지원반 선발 전개", "선발 정비팀과의 완벽한 호흡으로 전개 직후 가동률 100%를 기록해 미 태평양공군을 놀라게 했습니다."],
        ],
      },
      {
        title: "파병 2단계 · 다국적 대규모 공중전(LFE) 패키지 지휘",
        desc: "가상 적 방공망(SAM)과 대항군(Aggressor) 편대가 매복한 공역에서 다국적 공격편대군 임무사령관(Mission Commander)을 맡았습니다.",
        opts: [
          ["전자전 재밍 엄호 하 저고도 침투 및 정밀 타격 지휘", "적 방공 레이더 사각을 파고드는 전술 기동으로 가상 표적 명중률 98%・아군 피격 0기를 달성했습니다."],
          ["조기경보기 연동 BVR(가시거리 밖) 선제 교전", "완벽한 데이터링크 공중 지휘로 대항군 편대를 조기에 격추 판정시키며 최우수 편대로 선정되었습니다."],
        ],
      },
      {
        title: "파병 3단계 · 재난 지역 긴급 구호물자 공수 및 귀국",
        desc: "귀국 중 우방국 대규모 자연재해 현장에 긴급 구호물자 전술 공수 임무가 추가 하달되었습니다.",
        opts: [
          ["활주로 파손 지역 저고도 정밀 화물 투하(CDS) 완수", "비포장 임시 활주로와 저고도 공중투하를 완벽히 수행해 국제사회에 대한민국 공군의 위상을 드높였습니다."],
          ["현지 교민 및 부상자 신속 의무후송 작전 완수", "안전하게 교민과 파병단 전원을 본국으로 귀환시키며 해외파병 기장을 가슴에 달았습니다."],
        ],
      },
    ],
  },
  us_exp: {
    id: "us_exp",
    icon: "🌍",
    title: "Combined Joint Task Force (CJTF) Expeditionary Tour",
    badge: "Forward Combat & Coalition Deterrence Deployment",
    stages: [
      {
        title: "Stage 1 · Rapid Forward Theater Deployment",
        desc: "Your task unit is ordered on an emergency 6-month forward expeditionary deployment to a contested maritime and air choke point.",
        opts: [
          ["Execute immediate 48-hour surge deployment with coalition allies", "Your rapid readiness posture deterred regional provocations and earned a theater commendation."],
          ["Establish hardened forward logistics & air-defense umbrella first", "Zero equipment failures and 100% force protection throughout the opening phase of deployment."],
        ],
      },
      {
        title: "Stage 2 · Contested Strait Freedom of Navigation & Air Patrol",
        desc: "Adversary fast-attack craft and interceptors shadow your coalition formation at close range.",
        opts: [
          ["Maintain firm course with lock-on warning & disciplined ROE", "Unflinching professionalism forced the adversary formation to break off without firing a shot."],
          ["Coordinate multi-domain coalition escort screen", "Seamless USN-USAF-Allied integration showcased textbook joint deterrence."],
        ],
      },
      {
        title: "Stage 3 · Joint Meritorious Unit Award & Homecoming",
        desc: "Your expeditionary tour concludes with zero casualties and top theater readiness evaluations.",
        opts: [
          ["Brief lessons-learned doctrine to Joint Staff & War College", "Your after-action report became standard reading across the force, earning the Expeditionary Medal."],
          ["Honor the enlisted crew & junior officers at homecoming ceremony", "Morale and unit cohesion soared as your command returned home with honors."],
        ],
      },
    ],
  },
};

export function getOverseasTour(svk = "army", us = false) {
  if (us) return OVERSEAS_TOURS.us_exp;
  if (svk === "navy") return OVERSEAS_TOURS.kr_navy;
  if (svk === "air") return OVERSEAS_TOURS.kr_air;
  return OVERSEAS_TOURS.kr_army;
}

export function overseasCardHTML(careerState = {}, svk = "army", us = false) {
  const tour = getOverseasTour(svk, us);
  const step = careerState.overseasStep || 0;
  const done = Boolean(careerState.tours?.overseas) || step >= tour.stages.length;
  if (done) {
    return `<div class="mn-card" style="margin-top:10px;border-color:rgba(99,212,113,.55);background:rgba(14,28,22,.82)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <b style="color:#8ef07a;font-size:13px">${tour.icon} ${tour.title} — 파병 완수</b>
        <span style="font-size:11px;color:#ffd166;font-weight:700">🌍 해외파병 기장 · 진급심사 가산점 적용 중</span>
      </div>
    </div>`;
  }
  const stg = tour.stages[step];
  return `<div class="mn-card" style="margin-top:10px;border-color:#5da8e8;background:rgba(12,24,38,.9)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <b style="color:#7ec2f8;font-size:13.5px">${tour.icon} [해외 실전 파병 트랙] ${tour.title} (${step + 1} / ${tour.stages.length})</b>
      <span style="font-size:11px;color:#ffd166">${tour.badge}</span>
    </div>
    <div style="font-size:12.5px;font-weight:700;color:#fff2c6;margin-bottom:3px">${stg.title}</div>
    <p style="font-size:12px;color:#c8dbe8;margin:0 0 8px;line-height:1.5">${stg.desc}</p>
    <div style="display:flex;flex-direction:column;gap:5px">
      ${stg.opts.map(([lbl], idx) => `<button class="mn-doc" data-duty="overseas:${idx}" style="text-align:left;padding:7px 10px;cursor:pointer"><b>▸ ${lbl}</b></button>`).join("")}
    </div>
  </div>`;
}

/** ⚖️ Feature ① — 특별감찰 · 국회/상원 청문회 위기 돌파 챕터 */
export const HEARING_CASES = [
  {
    id: "wpn_audit",
    title: "차세대 핵심 무기체계 시험평가 논란 · 국회 긴급 현안질의",
    usTitle: "Senate Armed Services Hearing · Next-Gen Weapon Testing Controversy",
    desc: "야전 배치 중인 신형 장비의 결함 은폐 의혹이 언론에 보도되어 국회 국방위원회(상원 군사위) 긴급 청문회 증인으로 출석 요구를 받았습니다.",
    questions: [
      {
        who: "국방위원 (야당 간사)",
        q: "현장 지휘관으로서 신형 장비 결함 보고를 묵살하고 전력화를 강행했다는 의혹이 있습니다! 국민 앞에 사실대로 밝히십시오!",
        opts: [
          ["야전 시험 로우데이터와 개선 건의서 원본을 즉석 공개한다", "신뢰·평판 대폭 상승 (+10)", "숨긴 적은 단 한 번도 없습니다. 제가 직접 결함을 식별해 세 차례 기술 수정을 요구한 원본 기록을 이 자리에서 모두 공개하겠습니다!"],
          ["지휘관으로서 모든 책임을 지되, 장병들의 명예는 건드리지 말라 호소", "부대 사기 대폭 상승 (+12)", "장비 보완이 늦어진 책임은 전적으로 지휘관인 제게 있습니다. 다만 밤낮으로 장비를 고치며 전선을 지킨 야전 장병들의 헌신만은 매도하지 마십시오!"],
          ["동기생 합동감찰관의 객관적 검증 보고서를 증거로 제시", "전우애·평판 동시 상승 (+8)", "이미 임관 동기인 감찰실장과 함께 교차 검증을 마쳐 부품 교체를 완료했습니다. 완벽한 실사격 명중 결과로 증명하겠습니다!"],
        ],
      },
      {
        who: "국방위원장",
        q: "추후 전력화 일정과 야전 대비태세는 어떻게 보장하겠습니까?",
        opts: [
          ["야전 운용 장병 입회 하에 공개 재검증 사격을 실시한다", "완벽한 여론 반전 · XP +450", "언론과 국방위원님들이 직접 참관하시는 공개 실사격 시험을 다음 주에 즉시 실시해 모든 의혹을 종식시키겠습니다!"],
          ["전수 정밀점검 후 100% 안전 확인 시에만 작전 배치한다", "안정적 신뢰 회복 · XP +400", "장병들의 생명과 타협하는 전력화는 없습니다. 전수 점검을 통과한 장비만 최전선에 배치하겠습니다."],
        ],
      },
    ],
  },
];

export function hearingCardHTML(grade = 0, careerState = {}, us = false) {
  if (grade < 3) return "";
  if (careerState.hearingCleared) {
    return `<div class="mn-card" style="margin-top:10px;border-color:rgba(242,202,92,.45);background:rgba(28,24,14,.75)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <b style="color:#ffe082;font-size:12.5px">⚖️ ${us ? "Senate Armed Services Hearing Cleared" : "국회 국방위원회 특별청문회 정면 돌파 완료"}</b>
        <span style="font-size:11px;color:#8ef07a">✔ 소신 증언으로 대국민 신뢰 확보</span>
      </div>
    </div>`;
  }
  const c = HEARING_CASES[0];
  return `<div class="mn-card" style="margin-top:10px;border-color:#ff8a65;background:linear-gradient(135deg,rgba(42,18,18,.92),rgba(20,16,28,.94))">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <b style="color:#ffab91;font-size:13.5px">⚖️ [긴급 특별감찰 · 청문회 위기] ${us ? c.usTitle : c.title}</b>
      <span style="font-size:10.5px;padding:2px 7px;border-radius:4px;background:rgba(255,107,94,.22);color:#ffcdd2;font-weight:800">출석 요구서 도착</span>
    </div>
    <p style="font-size:12px;color:#ebd6d2;margin:0 0 8px;line-height:1.5">${c.desc}</p>
    <button class="mn-go" data-duty="hearing" style="margin:0;padding:8px 12px;font-size:12.5px;background:linear-gradient(90deg,#c98a1c,#f0c44c);color:#101822;font-weight:800">🏛️ ${us ? "상원 군사위 청문회 출석 — 정면 돌파 ›" : "국회 국방위 청문회 출석 — 소신 증언으로 정면 돌파 ›"}</button>
  </div>`;
}

/** 🧬 Feature ③ — 장교 결혼·가족 서사 & 2대·3대 자녀 세대 계승 */
export const FAMILY_STAGES = [
  {
    minG: 0,
    title: "💍 제1장 · 예도(禮刀) 아래 맺은 백년가약",
    desc: "임관 동기들이 뽑아 든 예도 터널을 지나 평생의 반려자와 백년가약을 맺고 첫 군 관사에 입주했습니다.",
    btn: "💍 가족의 응원을 가슴에 새기다 (부대 사기 +5 · 평판 +3)",
    log: "임관 동기들의 예도 축복 속에 가정을 꾸리고 첫 군 관사에 입주했습니다.",
  },
  {
    minG: 3,
    title: "👶 제2장 · 전방 관사의 불빛과 아이의 첫 거수경례",
    desc: "잦은 전속과 비상대기 속에서도 건강하게 자란 자녀가 현관에서 고사리손으로 첫 거수경례를 올립니다.",
    btn: "👶 부끄럽지 않은 지휘관이 되겠다고 다짐 (사기 +6 · XP +250)",
    log: "자녀의 첫 거수경례를 받으며 영관 지휘관으로서의 책임감을 되새겼습니다.",
  },
  {
    minG: 6,
    title: "🗡️ 제3장 · 자녀의 사관학교 입교 결심 — “대를 이어 충성하겠습니다”",
    desc: "장성으로 성장한 당신의 뒷모습을 보고 자란 자녀가 사관생도의 길을 선택해 가문의 삼정검을 잇겠다고 선언합니다.",
    btn: "🗡️ 호국 명문가 2세 사관생도 입교 축복 (새 캐릭터 생성 시 가문 계승 활성화!)",
    log: "자녀가 사관학교에 입교하여 대를 잇는 군인 명문가의 전통을 세웠습니다.",
  },
];

export function familyCardHTML(grade = 0, careerState = {}) {
  const fStep = careerState.familyStep || 0;
  const heritage = careerState.heritageParent
    ? `<div style="margin-bottom:6px;padding:5px 8px;border-radius:5px;background:rgba(242,202,92,.15);border:1px solid rgba(242,202,92,.5);color:#ffe082;font-size:11.5px">🗡️ <b>호국 명문가 2대 장교</b> — 선대 <b>${careerState.heritageParent}</b> 장군의 삼정검과 명예를 계승하여 복무 중입니다.</div>`
    : "";
  if (fStep >= FAMILY_STAGES.length) {
    return `<div class="mn-card" style="margin-top:10px;border-color:rgba(242,202,92,.45);background:rgba(18,24,32,.85)">
      ${heritage}
      <div style="display:flex;justify-content:space-between;align-items:center">
        <b style="color:#ffd166;font-size:12.5px">🏡 군인 가족 & 호국 명문가 서사 완수</b>
        <span style="font-size:11px;color:#8ef07a">✔ 자녀 사관생도 입교 · 새 캐릭터 가문 계승 가능</span>
      </div>
    </div>`;
  }
  const stg = FAMILY_STAGES[fStep];
  if (grade < stg.minG) {
    return heritage ? `<div class="mn-card" style="margin-top:10px">${heritage}</div>` : "";
  }
  return `<div class="mn-card" style="margin-top:10px;border-color:rgba(242,202,92,.45);background:rgba(18,24,34,.88)">
    ${heritage}
    <div style="font-weight:800;color:#ffe082;font-size:13px;margin-bottom:4px">${stg.title}</div>
    <p style="font-size:12px;color:#d0e0ec;margin:0 0 8px;line-height:1.5">${stg.desc}</p>
    <button class="mn-doc" data-duty="famstep" style="width:100%;text-align:left;padding:7px 10px;cursor:pointer;border-color:#d8b247"><b style="color:#ffd166">▸ ${stg.btn}</b></button>
  </div>`;
}
