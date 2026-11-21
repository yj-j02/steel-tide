// U.S. Armed Forces 3-Service Rank System, Authentic Insignia SVGs, Branches, Org Charts & Discharge Endings.
// Pay grades O-1 (0) through O-10 (9) + Special 5-Star O-11 (10).

const starPath = (cx, cy, R) => {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? R * 0.42 : R;
    d += `${i ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }
  return d + "Z";
};

export const US_PAY = ["O-1", "O-2", "O-3", "O-4", "O-5", "O-6", "O-7", "O-8", "O-9", "O-10", "O-11"];

export const US_RANKS = {
  army: [
    "소위 (2LT)", "중위 (1LT)", "대위 (CPT)",
    "소령 (MAJ)", "중령 (LTC)", "대령 (COL)",
    "준장 (BG)", "소장 (MG)", "중장 (LTG)", "대장 (GEN)", "원수 (GA)",
  ],
  navy: [
    "소위 (ENS)", "중위 (LTJG)", "대위 (LT)",
    "소령 (LCDR)", "중령 (CDR)", "대령 (CAPT)",
    "준장 (RDML)", "소장 (RADM)", "중장 (VADM)", "대장 (ADM)", "해군원수 (FADM)",
  ],
  air: [
    "소위 (2d Lt)", "중위 (1st Lt)", "대위 (Capt)",
    "소령 (Maj)", "중령 (Lt Col)", "대령 (Col)",
    "준장 (Brig Gen)", "소장 (Maj Gen)", "중장 (Lt Gen)", "대장 (Gen)", "공군원수 (GAF)",
  ],
};

export const US_RANK_FULL = {
  army: [
    "Second Lieutenant", "First Lieutenant", "Captain",
    "Major", "Lieutenant Colonel", "Colonel",
    "Brigadier General", "Major General", "Lieutenant General", "General", "General of the Army",
  ],
  navy: [
    "Ensign", "Lieutenant (j.g.)", "Lieutenant",
    "Lieutenant Commander", "Commander", "Captain",
    "Rear Admiral (Lower Half)", "Rear Admiral", "Vice Admiral", "Admiral", "Fleet Admiral",
  ],
  air: [
    "Second Lieutenant", "First Lieutenant", "Captain",
    "Major", "Lieutenant Colonel", "Colonel",
    "Brigadier General", "Major General", "Lieutenant General", "General", "General of the Air Force",
  ],
};

export const usRankName = (g, svc = "navy") => (US_RANKS[svc] || US_RANKS.army)[Math.max(0, Math.min(10, g))];
export const usRankFull = (g, svc = "navy") => (US_RANK_FULL[svc] || US_RANK_FULL.army)[Math.max(0, Math.min(10, g))];

/** Authentic U.S. military officer rank insignia SVG (O-1 Gold Bar → O-11 5-Star Pentagon Ring). */
export function insigniaUS(r, size = 24) {
  const g = Math.max(0, Math.min(10, r));
  // O-1 Gold Bar / O-2 Silver Bar
  if (g === 0 || g === 1) {
    const fill = g === 0 ? "#e2b546" : "#dfe4e8";
    const hi = g === 0 ? "#f8df90" : "#ffffff";
    const rim = g === 0 ? "#8a6614" : "#7a858f";
    return `<svg role="img" aria-label="${US_PAY[g]} bar" width="${Math.round(size * 0.55)}" height="${size}" viewBox="0 0 18 34"><rect x="3" y="3" width="12" height="28" rx="1.4" fill="${fill}" stroke="${rim}" stroke-width="1.2"/><rect x="5" y="5" width="3.5" height="24" rx=".6" fill="${hi}" opacity=".55"/></svg>`;
  }
  // O-3 Twin Silver Bars (Captain / Navy Lieutenant)
  if (g === 2) {
    return `<svg role="img" aria-label="O-3 twin bars" width="${Math.round(size * 0.95)}" height="${size}" viewBox="0 0 32 34"><rect x="11" y="9" width="10" height="3" fill="#b8c0c8"/><rect x="11" y="22" width="10" height="3" fill="#b8c0c8"/><rect x="2" y="3" width="10" height="28" rx="1.3" fill="#dfe4e8" stroke="#7a858f" stroke-width="1.1"/><rect x="4" y="5" width="3" height="24" fill="#fff" opacity=".55"/><rect x="20" y="3" width="10" height="28" rx="1.3" fill="#dfe4e8" stroke="#7a858f" stroke-width="1.1"/><rect x="22" y="5" width="3" height="24" fill="#fff" opacity=".55"/></svg>`;
  }
  // O-4 Gold Oak Leaf / O-5 Silver Oak Leaf
  if (g === 3 || g === 4) {
    const fill = g === 3 ? "#e0b341" : "#dfe4e8";
    const stroke = g === 3 ? "#876312" : "#7a858f";
    const vein = g === 3 ? "#9b7419" : "#8e99a3";
    return `<svg role="img" aria-label="${US_PAY[g]} oak leaf" width="${size}" height="${size}" viewBox="0 0 34 34"><path d="M17 2 C19.5 4.5 21 6.5 20.2 8.8 C23.5 7.5 27 9 27.5 12 C27.8 14 26 15.8 24.2 16.5 C27.8 17.2 29.5 20 28 23 C26.6 25.5 23.2 25.5 21 24.4 C21.8 27 20.5 29 18.2 29.2 L18.2 32.5 L15.8 32.5 L15.8 29.2 C13.5 29 12.2 27 13 24.4 C10.8 25.5 7.4 25.5 6 23 C4.5 20 6.2 17.2 9.8 16.5 C8 15.8 6.2 14 6.5 12 C7 9 10.5 7.5 13.8 8.8 C13 6.5 14.5 4.5 17 2 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.1"/><path d="M17 6 L17 29 M17 12 L23 11.5 M17 12 L11 11.5 M17 18 L24.5 20.5 M17 18 L9.5 20.5" stroke="${vein}" stroke-width="1" stroke-linecap="round"/></svg>`;
  }
  // O-6 Silver Spread Eagle (Colonel / Navy Captain)
  if (g === 5) {
    return `<svg role="img" aria-label="O-6 eagle" width="${Math.round(size * 1.4)}" height="${size}" viewBox="0 0 48 34"><path d="M24 6 C25.8 6 26.8 7.5 26.2 9 L28 11 L45 7 L43 11.5 L46 13 L41.5 16.5 L43 18.5 L36 20 L31 19 L28 21 L29 28 L24 25.5 L19 28 L20 21 L17 19 L12 20 L5 18.5 L6.5 16.5 L2 13 L5 11.5 L3 7 L20 11 L21.8 9 C21.2 7.5 22.2 6 24 6 Z" fill="#e2e7ec" stroke="#76828d" stroke-width="1.05"/><path d="M21.2 13 L26.8 13 L26 20 L24 22 L22 20 Z" fill="#c3ccd4" stroke="#76828d" stroke-width=".7"/></svg>`;
  }
  // O-11 Five-Star Pentagon Ring (General of the Army / Fleet Admiral / General of the Air Force)
  if (g >= 10) {
    const st = [0, 1, 2, 3, 4].map((i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      return `<path d="${starPath(30 + Math.cos(a) * 17, 30 + Math.sin(a) * 17, 10.5)}" fill="#e9edf1" stroke="#76828d" stroke-width=".8"/>`;
    }).join("");
    return `<svg role="img" aria-label="O-11 five stars" width="${Math.round(size * 1.2)}" height="${Math.round(size * 1.2)}" viewBox="0 0 60 60">${st}</svg>`;
  }
  // O-7 ~ O-10: 1 to 4 Silver Stars
  const n = g - 5;
  const w = 32 * n;
  const stars = Array.from({ length: n }, (_, i) => `<path d="${starPath(16 + i * 32, 17, 13.5)}" fill="#e9edf1" stroke="#76828d" stroke-width=".9"/>`).join("");
  return `<svg role="img" aria-label="${US_PAY[g]} ${n}-star" width="${Math.min(size * n * 0.9, size * 2.8)}" height="${size}" viewBox="0 0 ${w} 34">${stars}</svg>`;
}

export const US_SERVICES = {
  army: { n: "미 육군", en: "U.S. ARMY", icon: "⛨", c: "#7ca868", bg: "#20331e", motto: "FORSCOM · 공수 · 기갑 · 미 육군참모총장", d: "제82공수·제1기갑사단 소대장에서 미 육군참모총장·합참의장(CJCS)까지 지상 전력을 지휘합니다." },
  navy: { n: "미 해군", en: "U.S. NAVY", icon: "⚓", c: "#4e92d4", bg: "#14263d", motto: "USPACFLT · 제7함대 · 항모전단 · CNO", d: "알레이버크급 구축함·핵잠수함·항모타격단으로 인도-태평양 제해권을 수호합니다." },
  air:  { n: "미 공군", en: "U.S. AIR FORCE", icon: "✈️", c: "#72ace8", bg: "#1a2e4a", motto: "PACAF · F-22/F-35A · NORAD · CSAF", d: "전투비행단·미사일방어·우주정찰 자산으로 글로벌 제공권과 전략 억제를 담당합니다." },
};

export const US_BRANCHES = {
  // U.S. Army
  inf: { svc: "army", n: "보병·공수 (Infantry)", d: "82공수·레인저·야전보병 지휘 및 신속대응 작전", bonus: "위기 방어↑ · 부대 사기 관리 수월 · 받는 피해 −",
    t: ["소총소대장 (82공수)", "중대 부중대장", "레인저 중대장", "대대 작전장교 (S-3)", "보병대대장 (2사단)", "공수여단장 (82공수)", "사단 부사단장", "제82공수사단장", "제18공수군단장", "미 육군참모총장 (CSA)", "미 육군원수 (GA)"] },
  arm: { svc: "army", n: "기갑·기동 (Armor)", d: "M1A2 에이브람스 기갑여단 및 기동 돌파 작전", bonus: "화력 + · 재장전 − · 기동 위기 대응력 강화",
    t: ["전차소대장 (1기갑)", "기갑수색소대장", "전차중대장", "기갑대대 작전장교", "M1A2 전차대대장", "기갑여단전투단장", "기갑학교장", "제1기갑사단장", "미 육군전력사령관 (FORSCOM)", "미 육군참모총장 (CSA)", "미 육군원수 (GA)"] },
  art: { svc: "army", n: "야전포병·방공 (Field Artillery)", d: "HIMARS·사드(THAAD) 장거리 정밀타격 및 방공", bonus: "화력 + · 요격률 + · 원거리 화력 억제력 상향",
    t: ["포반장 (HIMARS)", "화력지원장교 (FSO)", "포대장", "포병대대 작전장교", "THAAD 방공대대장", "화력여단장", "방공포병여단장", "미 태평양육군사령관 (USARPAC)", "미 중부사령관 (CENTCOM)", "미 육군참모총장 (CSA)", "미 육군원수 (GA)"] },
  // U.S. Navy
  sea: { svc: "navy", n: "수상함 (Surface Warfare)", d: "알레이버크급 이지스 구축함·항모타격단 수상 지휘", bonus: "수리반 +1 (대위부터) · 함대함/함대공 효율 +",
    t: ["구축함 갑판사관 (DDG)", "구축함 항해관", "이지스 전투정보관", "구축함 작전관", "알레이버크급 함장", "구축함전대장 (DESRON)", "항모타격단장 (CSG)", "미 제7함대사령관", "미 태평양함대사령관 (USPACFLT)", "미 해군참모총장 (CNO)", "미 해군원수 (FADM)"] },
  sub: { svc: "navy", n: "잠수함 (Submarine Force)", d: "버지니아급 SSN·오하이오급 SSBN 전략 수중작전", bonus: "은밀 정찰↑ · 받는 피해 − · 미사일·뇌격 돌파율 +",
    t: ["핵잠수함 원자로장교", "잠수함 무장관", "잠수함 작전관", "잠수함 부함장 (XO)", "버지니아급 함장", "오하이오급 SSBN 함장", "잠수함전단장", "태평양잠수함사령관 (SUBPAC)", "미 전략사령관 (STRATCOM)", "미 해군참모총장 (CNO)", "미 해군원수 (FADM)"] },
  mar: { svc: "navy", n: "해군항공·해병 (Naval Aviation)", d: "F/A-18E/F 함재기 비행단 및 미 해병 원정군 작전", bonus: "전투기 +1 (중위부터) · 광역 정찰 · 상륙작전 강화",
    t: ["함재기 조종사 (VFA)", "TOPGUN 교관", "비행대대 편대장", "항모비행단 작전관", "F/A-18 비행대대장", "항모비행단장 (CAG)", "원정타격단장 (ESG)", "해군항공군사령관", "미 인도태평양사령관 (INDOPACOM)", "미 해군참모총장 (CNO)", "미 해군원수 (FADM)"] },
  // U.S. Air Force
  plt: { svc: "air", n: "전투조종 (Fighter Pilot)", d: "F-22 랩터·F-35A 스텔스 제공권 및 전략 타격", bonus: "전투기 +1 (중위부터) · 화력 + · 영공 대응 최상",
    t: ["F-16 편대원", "F-22 랩터 조종사", "전투비행대대 편대장", "비행대대 작전과장", "F-35A 비행대대장", "전투비행전대장", "제1전투비행단장", "미 제7공군사령관", "미 태평양공군사령관 (PACAF)", "미 공군참모총장 (CSAF)", "미 공군원수 (GAF)"] },
  sam: { svc: "air", n: "미사일·우주방어 (NORAD/Space)", d: "북미항공우주방위(NORAD) 및 탄도탄 요격 체계", bonus: "대공·대탄도탄 요격률 대폭 + · 받는 피해 −",
    t: ["미사일발사통제장교", "우주감시관제장교", "방공포대장", "미사일방어 작전과장", "탄도탄방어대대장", "우주방어전대장", "미사일방어여단장", "NORAD 부사령관", "미 북부사령관 (NORTHCOM)", "미 공군참모총장 (CSAF)", "미 공군원수 (GAF)"] },
  tac: { svc: "air", n: "전술통제·사이버 (ISR/Cyber)", d: "E-3 AWACS 공중조기경보·사이버·연합정보 작전", bonus: "위기 탐지 단축 · 요격률 + · 미사일 돌파율 +",
    t: ["항공관제장교", "AWACS 전술통제관", "선임공중지휘관", "합동정보과장 (J-2)", "사이버작전대대장", "정찰비행전대장", "정보감시정찰단장", "공군정보사령관", "미 사이버사령관 (CYBERCOM)", "미 공군참모총장 (CSAF)", "미 공군원수 (GAF)"] },
  // Pentagon / Joint Tracks (O-4+)
  acq: { svc: "joint", n: "펜타곤 전력획득 (Acquisition)", d: "미 국방부 획득·군수(USD A&S) 및 차세대 무기체계", bonus: "전력증강 비용 −15% · 재장전 − · 정비 효율↑",
    t: ["군수장교", "정비보급장교", "소요분석장교", "펜타곤 전력획득담당", "DARPA 프로그램매니저", "합참 군수기획과장 (J-4)", "군수사 부사령관", "국방군수청장 (DLA)", "합참 군수본부장 (J-4)", "미 합동참모의장 (CJCS)", "미 5성 원수"] },
  pol: { svc: "joint", n: "펜타곤 전략·외교 (Joint Policy)", d: "백악관 NSC·펜타곤 J-5 전략기획 및 미 의회 대응", bonus: "상원 청문회·지지율 방어 + · 받는 피해 − · 외교 보너스",
    t: ["정책보좌관", "국방외교장교", "NATO 연락장교", "펜타곤 정책기획관", "주외 국방무관", "합참 전략기획과장 (J-5)", "국방정책국장", "백악관 NSC 안보보좌관", "미 합동참모차장 (VCJCS)", "미 합동참모의장 (CJCS)", "미 5성 원수"] },
};

export const US_FLAG_POSTS = [
  // Army
  { g: 6, c: "sea", svc: "army", b: "inf", t: "사단 부사단장" },
  { g: 6, c: "ops", svc: "army", b: "arm", t: "기갑학교장" },
  { g: 6, c: "air", svc: "army", b: "art", t: "방공포병여단장" },
  { g: 7, c: "sea", svc: "army", b: "inf", t: "제82공수사단장" },
  { g: 7, c: "ops", svc: "army", b: "arm", t: "제1기갑사단장" },
  { g: 7, c: "air", svc: "army", b: "art", t: "미 태평양육군사령관 (USARPAC)" },
  { g: 8, c: "sea", svc: "army", b: "inf", t: "제18공수군단장" },
  { g: 8, c: "cmd", svc: "army", b: "arm", t: "미 육군전력사령관 (FORSCOM)" },
  { g: 9, c: "cmd", svc: "army", b: "inf", t: "미 육군참모총장 (CSA)" },
  // Navy
  { g: 6, c: "sea", svc: "navy", b: "sea", t: "항모타격단장 (CSG)" },
  { g: 6, c: "ops", svc: "navy", b: "sub", t: "잠수함전단장" },
  { g: 6, c: "air", svc: "navy", b: "mar", t: "원정타격단장 (ESG)" },
  { g: 7, c: "sea", svc: "navy", b: "sea", t: "미 제7함대사령관" },
  { g: 7, c: "ops", svc: "navy", b: "sub", t: "태평양잠수함사령관 (SUBPAC)" },
  { g: 7, c: "air", svc: "navy", b: "mar", t: "해군항공군사령관" },
  { g: 8, c: "sea", svc: "navy", b: "sea", t: "미 태평양함대사령관 (USPACFLT)" },
  { g: 8, c: "cmd", svc: "navy", b: "mar", t: "미 인도태평양사령관 (INDOPACOM)" },
  { g: 9, c: "cmd", svc: "navy", b: "sea", t: "미 해군참모총장 (CNO)" },
  // Air Force
  { g: 6, c: "sea", svc: "air", b: "plt", t: "제1전투비행단장" },
  { g: 6, c: "ops", svc: "air", b: "sam", t: "미사일방어여단장" },
  { g: 6, c: "air", svc: "air", b: "tac", t: "정보감시정찰단장" },
  { g: 7, c: "sea", svc: "air", b: "plt", t: "미 제7공군사령관" },
  { g: 7, c: "ops", svc: "air", b: "sam", t: "NORAD 부사령관" },
  { g: 7, c: "air", svc: "air", b: "tac", t: "공군정보사령관" },
  { g: 8, c: "sea", svc: "air", b: "plt", t: "미 태평양공군사령관 (PACAF)" },
  { g: 8, c: "cmd", svc: "air", b: "sam", t: "미 북부사령관 (NORTHCOM)" },
  { g: 9, c: "cmd", svc: "air", b: "plt", t: "미 공군참모총장 (CSAF)" },
  // Pentagon / Joint
  { g: 6, c: "int", svc: "joint", b: "pol", t: "국방정책국장" },
  { g: 6, c: "log", svc: "joint", b: "acq", t: "군수사 부사령관" },
  { g: 7, c: "int", svc: "joint", b: "pol", t: "백악관 NSC 안보보좌관" },
  { g: 7, c: "log", svc: "joint", b: "acq", t: "국방군수청장 (DLA)" },
  { g: 8, c: "jcs", svc: "joint", b: "pol", t: "미 합동참모차장 (VCJCS)" },
  { g: 9, c: "jcs", svc: "joint", b: "pol", t: "미 합동참모의장 (CJCS)" },
];

export const US_SVC_ORG = {
  army: {
    top: "미 육군원수 (GA)", hq: "FORSCOM", box: "미 육군전력사령부 참모부 · 참모 계통",
    ech: ["대대·중대 부서", "여단전투단 참모부", "사단·군단 참모부", "미 육군전력사령부 (FORSCOM)"],
    ch: { sea: "공수·보병 · 군단", cmd: "미 육군부 (DA)", jcs: "펜타곤 · 합참 (JCS)", ops: "기갑·기동 계통", int: "정책·NSC 계통", log: "전력·획득 계통", air: "포병·방공 계통" },
    map: { sea: "inf", ops: "arm", int: "pol", log: "acq", air: "art" },
  },
  navy: {
    top: "미 해군원수 (FADM)", hq: "USPACFLT", box: "미 태평양함대사령부 참모부 · 참모 계통",
    ech: ["함정 부서", "구축함·전대 참모부", "항모타격단 참모부", "미 태평양함대사령부 (USPACFLT)"],
    ch: { sea: "항모타격단 · 제7함대", cmd: "미 해군부 (OPNAV)", jcs: "펜타곤 · 합참 (JCS)", ops: "잠수함 계통", int: "정책·NSC 계통", log: "전력·획득 계통", air: "해군항공·해병 계통" },
    map: { sea: "sea", ops: "sub", int: "pol", log: "acq", air: "mar" },
  },
  air: {
    top: "미 공군원수 (GAF)", hq: "PACAF", box: "미 태평양공군사령부 참모부 · 참모 계통",
    ech: ["비행대대 부서", "전대 참모부", "전투비행단 참모부", "미 태평양공군사령부 (PACAF)"],
    ch: { sea: "전투비행단 · PACAF", cmd: "미 공군부 (SAF)", jcs: "펜타곤 · 합참 (JCS)", ops: "미사일·NORAD 계통", int: "정보·사이버 계통", log: "전력·획득 계통", air: "정책·외교 계통" },
    map: { sea: "plt", ops: "sam", int: "tac", log: "acq", air: "pol" },
  },
};

export const US_NPC_FIRST = ["James", "Sarah", "Marcus", "Elena", "David", "Rachel", "Thomas", "Claire", "Daniel", "Hannah", "Robert", "Grace", "Nathan", "Lauren", "Andrew", "Emily"];
export const US_NPC_LAST = ["Vance", "Chen", "Cole", "Miller", "Hayes", "Brooks", "Grant", "Reed", "Ward", "Cross", "Foster", "Stone", "Blake", "Shaw", "Price", "Wells"];
export function usNpcName(seed) {
  let h = 11;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return `${US_NPC_FIRST[h % US_NPC_FIRST.length]} ${US_NPC_LAST[(h >>> 13) % US_NPC_LAST.length]}`;
}

export function usDischargeEndingOf(g, svName) {
  if (g <= 2) return {
    icon: "🏛️", tag: "미 국방부(DoD) 문관 임용 엔딩",
    role: "펜타곤 전력분석관 (GS-13 Civil Service)",
    desc: `${svName} 위관급 현장 복무 경력을 인정받아 미 국방부(DoD) 연방 공무원(GS-13)으로 특채되었습니다. 펜타곤에서 실무 예산과 군수 혁신을 이끕니다.`,
    canPol: false,
  };
  if (g === 3 || g === 4) return {
    icon: "🏢", tag: "미 대형 방산기업 임원 스카우트 엔딩",
    role: "Aegis Dynamics · 전략기획 부사장 (VP)",
    desc: `영관급(${US_PAY[g]}) 작전·무기체계 운용 경력을 높이 평가받아 미 대형 방산기업 'Aegis Dynamics' 임원으로 스카우트되었습니다. 차세대 방위사업을 진두지휘합니다.`,
    canPol: false,
  };
  if (g === 5) return {
    icon: "🎓", tag: "미 국방대학원 석좌교수 엔딩",
    role: "National War College 선임연구위원",
    desc: `대령(O-6) 지휘관으로서의 오랜 복무를 마치고 워싱턴 National War College 석좌교수로 초빙되어 차세대 합동지휘관을 양성합니다.`,
    canPol: false,
  };
  if (g === 6 || g === 7) return {
    icon: "⭐", tag: "예비역 장성 · 워싱턴 싱크탱크 & 상원 자문 엔딩",
    role: "워싱턴 전략안보연구소장 · 상원 군사위 고문",
    desc: `성공적인 장성 복무를 마치고 워싱턴 안보 싱크탱크 소장 겸 상원 군사위 자문으로 활동하며 정계 영입 1순위로 주목받습니다.`,
    canPol: true,
  };
  return {
    icon: "🇺🇸", tag: "국가안보 원로 · 정계 거물 엔딩",
    role: "예비역 고위 장성 · 미 대선 유력 주자",
    desc: `미군 최고위 지휘관을 역임한 국가안보 원로로 예우받습니다. 백악관과 의회의 전폭적 신망을 바탕으로 미 대통령 선거에 도전할 수 있습니다.`,
    canPol: true,
  };
}
