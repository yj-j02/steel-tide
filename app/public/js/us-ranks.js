// U.S. Armed Forces 3-Service Rank System, Authentic Insignia SVGs, Official English Billets, Org Charts & Discharge Endings.
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
  army: ["2LT", "1LT", "CPT", "MAJ", "LTC", "COL", "BG", "MG", "LTG", "GEN", "GA"],
  navy: ["ENS", "LTJG", "LT", "LCDR", "CDR", "CAPT", "RDML", "RADM", "VADM", "ADM", "FADM"],
  air:  ["2d Lt", "1st Lt", "Capt", "Maj", "Lt Col", "Col", "Brig Gen", "Maj Gen", "Lt Gen", "Gen", "GAF"],
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
  if (g === 0 || g === 1) {
    const fill = g === 0 ? "#e2b546" : "#dfe4e8";
    const hi = g === 0 ? "#f8df90" : "#ffffff";
    const rim = g === 0 ? "#8a6614" : "#7a858f";
    return `<svg role="img" aria-label="${US_PAY[g]} bar" width="${Math.round(size * 0.55)}" height="${size}" viewBox="0 0 18 34"><rect x="3" y="3" width="12" height="28" rx="1.4" fill="${fill}" stroke="${rim}" stroke-width="1.2"/><rect x="5" y="5" width="3.5" height="24" rx=".6" fill="${hi}" opacity=".55"/></svg>`;
  }
  if (g === 2) {
    return `<svg role="img" aria-label="O-3 twin bars" width="${Math.round(size * 0.95)}" height="${size}" viewBox="0 0 32 34"><rect x="11" y="9" width="10" height="3" fill="#b8c0c8"/><rect x="11" y="22" width="10" height="3" fill="#b8c0c8"/><rect x="2" y="3" width="10" height="28" rx="1.3" fill="#dfe4e8" stroke="#7a858f" stroke-width="1.1"/><rect x="4" y="5" width="3" height="24" fill="#fff" opacity=".55"/><rect x="20" y="3" width="10" height="28" rx="1.3" fill="#dfe4e8" stroke="#7a858f" stroke-width="1.1"/><rect x="22" y="5" width="3" height="24" fill="#fff" opacity=".55"/></svg>`;
  }
  if (g === 3 || g === 4) {
    const fill = g === 3 ? "#e0b341" : "#dfe4e8";
    const stroke = g === 3 ? "#876312" : "#7a858f";
    const vein = g === 3 ? "#9b7419" : "#8e99a3";
    return `<svg role="img" aria-label="${US_PAY[g]} oak leaf" width="${size}" height="${size}" viewBox="0 0 34 34"><path d="M17 2 C19.5 4.5 21 6.5 20.2 8.8 C23.5 7.5 27 9 27.5 12 C27.8 14 26 15.8 24.2 16.5 C27.8 17.2 29.5 20 28 23 C26.6 25.5 23.2 25.5 21 24.4 C21.8 27 20.5 29 18.2 29.2 L18.2 32.5 L15.8 32.5 L15.8 29.2 C13.5 29 12.2 27 13 24.4 C10.8 25.5 7.4 25.5 6 23 C4.5 20 6.2 17.2 9.8 16.5 C8 15.8 6.2 14 6.5 12 C7 9 10.5 7.5 13.8 8.8 C13 6.5 14.5 4.5 17 2 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.1"/><path d="M17 6 L17 29 M17 12 L23 11.5 M17 12 L11 11.5 M17 18 L24.5 20.5 M17 18 L9.5 20.5" stroke="${vein}" stroke-width="1" stroke-linecap="round"/></svg>`;
  }
  if (g === 5) {
    return `<svg role="img" aria-label="O-6 eagle" width="${Math.round(size * 1.4)}" height="${size}" viewBox="0 0 48 34"><path d="M24 6 C25.8 6 26.8 7.5 26.2 9 L28 11 L45 7 L43 11.5 L46 13 L41.5 16.5 L43 18.5 L36 20 L31 19 L28 21 L29 28 L24 25.5 L19 28 L20 21 L17 19 L12 20 L5 18.5 L6.5 16.5 L2 13 L5 11.5 L3 7 L20 11 L21.8 9 C21.2 7.5 22.2 6 24 6 Z" fill="#e2e7ec" stroke="#76828d" stroke-width="1.05"/><path d="M21.2 13 L26.8 13 L26 20 L24 22 L22 20 Z" fill="#c3ccd4" stroke="#76828d" stroke-width=".7"/></svg>`;
  }
  if (g >= 10) {
    const st = [0, 1, 2, 3, 4].map((i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      return `<path d="${starPath(30 + Math.cos(a) * 17, 30 + Math.sin(a) * 17, 10.5)}" fill="#e9edf1" stroke="#76828d" stroke-width=".8"/>`;
    }).join("");
    return `<svg role="img" aria-label="O-11 five stars" width="${Math.round(size * 1.2)}" height="${Math.round(size * 1.2)}" viewBox="0 0 60 60">${st}</svg>`;
  }
  const n = g - 5;
  const w = 32 * n;
  const stars = Array.from({ length: n }, (_, i) => `<path d="${starPath(16 + i * 32, 17, 13.5)}" fill="#e9edf1" stroke="#76828d" stroke-width=".9"/>`).join("");
  return `<svg role="img" aria-label="${US_PAY[g]} ${n}-star" width="${Math.min(size * n * 0.9, size * 2.8)}" height="${size}" viewBox="0 0 ${w} 34">${stars}</svg>`;
}

export const US_SERVICES = {
  army: { n: "U.S. Army", en: "U.S. ARMY", icon: "⛨", c: "#7ca868", bg: "#20331e", motto: "FORSCOM · Airborne · Armor · CSA", d: "제82공수·제1기갑사단 소대장에서 Chief of Staff of the Army(CSA)·CJCS까지 지상 전력을 지휘합니다." },
  navy: { n: "U.S. Navy", en: "U.S. NAVY", icon: "⚓", c: "#4e92d4", bg: "#14263d", motto: "USPACFLT · 7th Fleet · CSG · CNO", d: "Arleigh Burke급 구축함·핵잠수함·항모타격단으로 인도-태평양 제해권을 수호합니다." },
  air:  { n: "U.S. Air Force", en: "U.S. AIR FORCE", icon: "✈️", c: "#72ace8", bg: "#1a2e4a", motto: "PACAF · F-22/F-35A · NORAD · CSAF", d: "전투비행단·NORAD·우주정찰 자산으로 글로벌 제공권과 전략 억제를 담당합니다." },
};

export const US_BRANCHES = {
  // U.S. Army
  inf: { svc: "army", n: "Infantry / Airborne", d: "82nd Airborne · Ranger · 야전보병 지휘 및 신속대응 작전", bonus: "위기 방어↑ · 부대 사기 관리 수월 · 받는 피해 −",
    t: ["Rifle Platoon Leader (82nd ABN)", "Company Executive Officer", "Ranger Company Commander", "Battalion S-3 (Operations)", "Infantry Battalion Commander", "Brigade Combat Team Commander", "Deputy Commanding General", "CG, 82nd Airborne Division", "CG, XVIII Airborne Corps", "Chief of Staff of the Army (CSA)", "General of the Army"] },
  arm: { svc: "army", n: "Armor", d: "M1A2 Abrams 기갑여단전투단(ABCT) 및 기동 돌파 작전", bonus: "화력 + · 재장전 − · 기동 위기 대응력 강화",
    t: ["Tank Platoon Leader (1st AD)", "Scout Platoon Leader", "Armor Company Commander", "Armored Battalion S-3", "Combined Arms Bn Commander", "Armored BCT Commander", "Commandant, Armor School", "CG, 1st Armored Division", "CG, U.S. Army Forces Command", "Chief of Staff of the Army (CSA)", "General of the Army"] },
  art: { svc: "army", n: "Field Artillery / ADA", d: "HIMARS · THAAD 장거리 정밀타격 및 방공", bonus: "화력 + · 요격률 + · 원거리 화력 억제력 상향",
    t: ["Fire Direction Officer (HIMARS)", "Fire Support Officer (FSO)", "Artillery Battery Commander", "Artillery Battalion S-3", "THAAD Battalion Commander", "Field Artillery Bde Commander", "Deputy CG, 32nd AAMDC", "CG, U.S. Army Pacific (USARPAC)", "Commander, U.S. Central Command", "Chief of Staff of the Army (CSA)", "General of the Army"] },
  // U.S. Navy
  sea: { svc: "navy", n: "Surface Warfare (SWO)", d: "Arleigh Burke급 이지스 구축함·항모타격단 수상 지휘", bonus: "수리반 +1 (O-3부터) · 함대함/함대공 효율 +",
    t: ["Division Officer (DDG)", "Navigator (DDG)", "Combat Systems Officer (Aegis)", "Executive Officer (DDG)", "CO, Arleigh Burke-class DDG", "Commander, DESRON", "Commander, Carrier Strike Group", "Commander, U.S. 7th Fleet", "Commander, U.S. Pacific Fleet", "Chief of Naval Operations (CNO)", "Fleet Admiral"] },
  sub: { svc: "navy", n: "Submarine Force", d: "Virginia-class SSN · Ohio-class SSBN 전략 수중작전", bonus: "은밀 정찰↑ · 받는 피해 − · 미사일·뇌격 돌파율 +",
    t: ["Nuclear Reactor Officer (SSN)", "Weapons Officer (SSN)", "Operations Officer (SSN)", "Executive Officer (SSN)", "CO, Virginia-class SSN", "CO, Ohio-class SSBN", "Commander, SUBRON", "Commander, SUBPAC", "Commander, U.S. Strategic Command", "Chief of Naval Operations (CNO)", "Fleet Admiral"] },
  mar: { svc: "navy", n: "Naval Aviation", d: "F/A-18E/F 함재기 비행단 및 원정타격단 작전", bonus: "전투기 +1 (O-2부터) · 광역 정찰 · 상륙작전 강화",
    t: ["Naval Aviator (VFA)", "TOPGUN Instructor", "Division Lead (F/A-18E/F)", "VFA Squadron XO", "CO, Strike Fighter Squadron", "Commander, Carrier Air Wing", "Commander, ESG", "Commander, Naval Air Forces", "Commander, USINDOPACOM", "Chief of Naval Operations (CNO)", "Fleet Admiral"] },
  // U.S. Air Force
  plt: { svc: "air", n: "Fighter Pilot", d: "F-22 Raptor · F-35A 스텔스 제공권 및 전략 타격", bonus: "전투기 +1 (O-2부터) · 화력 + · 영공 대응 최상",
    t: ["F-16 Wingman", "F-22 Raptor Pilot", "Flight Commander", "Director of Operations (FS)", "Commander, F-35A Fighter Sq", "Operations Group Commander", "Commander, 1st Fighter Wing", "Commander, 7th Air Force", "Commander, Pacific Air Forces", "Chief of Staff of the Air Force", "General of the Air Force"] },
  sam: { svc: "air", n: "Missile & Space Defense", d: "NORAD 북미항공우주방위 및 탄도탄 요격 체계", bonus: "대공·대탄도탄 요격률 대폭 + · 받는 피해 −",
    t: ["Missile Combat Crew Officer", "Space Operations Officer", "Air Defense Flight Commander", "Missile Defense Ops Officer", "Missile Defense Bn Commander", "Space Delta Commander", "Air Defense Sector Commander", "Deputy Commander, NORAD", "Commander, USNORTHCOM", "Chief of Staff of the Air Force", "General of the Air Force"] },
  tac: { svc: "air", n: "ISR & Cyber Operations", d: "E-3 AWACS 공중조기경보·사이버·연합정보 작전", bonus: "위기 탐지 단축 · 요격률 + · 미사일 돌파율 +",
    t: ["Air Battle Manager (AWACS)", "Senior Surveillance Officer", "Mission Crew Commander (E-3)", "Joint Intelligence Officer (J-2)", "Cyber Ops Squadron Commander", "Reconnaissance Group Commander", "Commander, 9th Recon Wing", "Commander, 16th Air Force", "Commander, USCYBERCOM", "Chief of Staff of the Air Force", "General of the Air Force"] },
  // Pentagon / Joint Tracks (O-4+)
  acq: { svc: "joint", n: "DoD Acquisition & Logistics", d: "미 국방부 획득·군수(USD A&S) 및 차세대 무기체계", bonus: "전력증강 비용 −15% · 재장전 − · 정비 효율↑",
    t: ["Logistics Readiness Officer", "Maintenance Officer", "Requirements Officer", "Pentagon Acquisition Officer", "DARPA Program Manager", "Joint Staff J-4 Division Chief", "Deputy Director, DLA", "Director, Defense Logistics Agency", "Director for Logistics (J-4)", "Chairman of the Joint Chiefs (CJCS)", "Five-Star General / Admiral"] },
  pol: { svc: "joint", n: "Joint Strategy & Policy", d: "백악관 NSC · 펜타곤 J-5 전략기획 및 미 의회 대응", bonus: "상원 청문회·지지율 방어 + · 받는 피해 − · 외교 보너스",
    t: ["Military Aide", "Foreign Area Officer", "NATO Liaison Officer", "Pentagon Policy Planner", "U.S. Defense Attaché", "Joint Staff J-5 Division Chief", "Deputy Director, Strategy (J-5)", "NSC Military Advisor", "Vice Chairman, Joint Chiefs (VCJCS)", "Chairman of the Joint Chiefs (CJCS)", "Five-Star General / Admiral"] },
};

export const US_FLAG_POSTS = [
  // Army
  { g: 6, c: "sea", svc: "army", b: "inf", t: "Deputy Commanding General" },
  { g: 6, c: "ops", svc: "army", b: "arm", t: "Commandant, Armor School" },
  { g: 6, c: "air", svc: "army", b: "art", t: "Deputy CG, 32nd AAMDC" },
  { g: 7, c: "sea", svc: "army", b: "inf", t: "CG, 82nd Airborne Division" },
  { g: 7, c: "ops", svc: "army", b: "arm", t: "CG, 1st Armored Division" },
  { g: 7, c: "air", svc: "army", b: "art", t: "CG, U.S. Army Pacific (USARPAC)" },
  { g: 8, c: "sea", svc: "army", b: "inf", t: "CG, XVIII Airborne Corps" },
  { g: 8, c: "cmd", svc: "army", b: "arm", t: "CG, U.S. Army Forces Command" },
  { g: 9, c: "cmd", svc: "army", b: "inf", t: "Chief of Staff of the Army (CSA)" },
  // Navy
  { g: 6, c: "sea", svc: "navy", b: "sea", t: "Commander, Carrier Strike Group" },
  { g: 6, c: "ops", svc: "navy", b: "sub", t: "Commander, SUBRON" },
  { g: 6, c: "air", svc: "navy", b: "mar", t: "Commander, ESG" },
  { g: 7, c: "sea", svc: "navy", b: "sea", t: "Commander, U.S. 7th Fleet" },
  { g: 7, c: "ops", svc: "navy", b: "sub", t: "Commander, SUBPAC" },
  { g: 7, c: "air", svc: "navy", b: "mar", t: "Commander, Naval Air Forces" },
  { g: 8, c: "sea", svc: "navy", b: "sea", t: "Commander, U.S. Pacific Fleet" },
  { g: 8, c: "cmd", svc: "navy", b: "mar", t: "Commander, USINDOPACOM" },
  { g: 9, c: "cmd", svc: "navy", b: "sea", t: "Chief of Naval Operations (CNO)" },
  // Air Force
  { g: 6, c: "sea", svc: "air", b: "plt", t: "Commander, 1st Fighter Wing" },
  { g: 6, c: "ops", svc: "air", b: "sam", t: "Air Defense Sector Commander" },
  { g: 6, c: "air", svc: "air", b: "tac", t: "Commander, 9th Recon Wing" },
  { g: 7, c: "sea", svc: "air", b: "plt", t: "Commander, 7th Air Force" },
  { g: 7, c: "ops", svc: "air", b: "sam", t: "Deputy Commander, NORAD" },
  { g: 7, c: "air", svc: "air", b: "tac", t: "Commander, 16th Air Force" },
  { g: 8, c: "sea", svc: "air", b: "plt", t: "Commander, Pacific Air Forces" },
  { g: 8, c: "cmd", svc: "air", b: "sam", t: "Commander, USNORTHCOM" },
  { g: 9, c: "cmd", svc: "air", b: "plt", t: "Chief of Staff of the Air Force" },
  // Pentagon / Joint
  { g: 6, c: "int", svc: "joint", b: "pol", t: "Deputy Director, Strategy (J-5)" },
  { g: 6, c: "log", svc: "joint", b: "acq", t: "Deputy Director, DLA" },
  { g: 7, c: "int", svc: "joint", b: "pol", t: "NSC Military Advisor" },
  { g: 7, c: "log", svc: "joint", b: "acq", t: "Director, Defense Logistics Agency" },
  { g: 8, c: "jcs", svc: "joint", b: "pol", t: "Vice Chairman, Joint Chiefs (VCJCS)" },
  { g: 9, c: "jcs", svc: "joint", b: "pol", t: "Chairman of the Joint Chiefs (CJCS)" },
];

export const US_SVC_ORG = {
  army: {
    top: "General of the Army", hq: "FORSCOM", box: "U.S. Army Forces Command Staff (G-Staff)",
    ech: ["Company / Battalion", "Brigade Combat Team Staff", "Division / Corps Staff", "U.S. Army Forces Command (FORSCOM)"],
    ch: { sea: "Infantry · Airborne", cmd: "Dept. of the Army", jcs: "Pentagon · JCS", ops: "Armor", int: "Strategy · NSC", log: "Acquisition · DLA", air: "Field Artillery" },
    map: { sea: "inf", ops: "arm", int: "pol", log: "acq", air: "art" },
  },
  navy: {
    top: "Fleet Admiral", hq: "USPACFLT", box: "U.S. Pacific Fleet Staff (N-Staff)",
    ech: ["Ship Division", "DDG / DESRON Staff", "Carrier Strike Group Staff", "U.S. Pacific Fleet (USPACFLT)"],
    ch: { sea: "CSG · 7th Fleet", cmd: "OPNAV · Dept. of Navy", jcs: "Pentagon · JCS", ops: "Submarine Force", int: "Strategy · NSC", log: "Acquisition · DLA", air: "Naval Aviation" },
    map: { sea: "sea", ops: "sub", int: "pol", log: "acq", air: "mar" },
  },
  air: {
    top: "General of the Air Force", hq: "PACAF", box: "Pacific Air Forces Staff (A-Staff)",
    ech: ["Fighter Squadron", "Operations Group Staff", "Fighter Wing Staff", "Pacific Air Forces (PACAF)"],
    ch: { sea: "Fighter Wing · PACAF", cmd: "Dept. of the Air Force", jcs: "Pentagon · JCS", ops: "Missile · NORAD", int: "ISR · Cyber", log: "Acquisition · DLA", air: "Strategy · Policy" },
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
    icon: "🏛️", tag: "DoD Civil Service Ending",
    role: "Pentagon Defense Analyst (GS-13)",
    desc: `${svName} 위관급 현장 복무 경력을 인정받아 미 국방부(DoD) 연방 공무원(GS-13)으로 특채되었습니다. 펜타곤에서 실무 예산과 군수 혁신을 이끕니다.`,
    canPol: false,
  };
  if (g === 3 || g === 4) return {
    icon: "🏢", tag: "Defense Industry Executive Ending",
    role: "Aegis Dynamics · VP of Strategic Programs",
    desc: `영관급(${US_PAY[g]}) 작전·무기체계 운용 경력을 높이 평가받아 미 대형 방산기업 'Aegis Dynamics' 임원으로 스카우트되었습니다. 차세대 방위사업을 진두지휘합니다.`,
    canPol: false,
  };
  if (g === 5) return {
    icon: "🎓", tag: "National War College Fellow Ending",
    role: "Senior Fellow, National War College",
    desc: `대령(O-6) 지휘관으로서의 오랜 복무를 마치고 워싱턴 National War College 석좌교수로 초빙되어 차세대 합동지휘관을 양성합니다.`,
    canPol: false,
  };
  if (g === 6 || g === 7) return {
    icon: "⭐", tag: "Retired Flag Officer · Think Tank & Senate Advisor",
    role: "Director, Center for Strategic Security · SASC Advisor",
    desc: `성공적인 장성 복무를 마치고 워싱턴 안보 싱크탱크 소장 겸 상원 군사위 자문으로 활동하며 백악관 대선 주자로 주목받습니다.`,
    canPol: true,
  };
  return {
    icon: "🇺🇸", tag: "National Security Elder Statesman Ending",
    role: "Retired Senior General / Admiral · Presidential Contender",
    desc: `미군 최고위 지휘관을 역임한 국가안보 원로로 예우받습니다. 백악관과 의회의 전폭적 신망을 바탕으로 미 대통령 선거(538 선거인단)에 도전할 수 있습니다.`,
    canPol: true,
  };
}
