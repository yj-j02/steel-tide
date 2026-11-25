import { careerStorage } from "./characters.js";
// Fleet headquarters staff (modern era). Appointments shape every modern battle, auto battles included,
// through a handful of multipliers the battle code already exposes: hull damage in/out, gun reload, repair crews, jets.
import { US_SERVICES, US_BRANCHES, US_FLAG_POSTS, usNpcName, koreanUsRanks, usRankName } from "./us-ranks.js";

const clamp01 = (v, a, b) => Math.min(b, Math.max(a, v));

export const STAFF_ROLES = [
  { k: "cos", n: "참모장", stat: "지휘", d: "참모진 조율 — 다른 참모 효과를 키움" },
  { k: "ops", n: "작전과장", stat: "전술", d: "방책·교전 지휘 — 화력, 미사일 돌파율" },
  { k: "int", n: "정보참모", stat: "분석", d: "적 정보·조기경보 — 요격 성공률, 받는 피해" },
  { k: "log", n: "군수참모", stat: "군수", d: "탄약·정비 — 재장전 속도, 수리반" },
  { k: "air", n: "항공참모", stat: "항공", d: "항공 작전 — 출격 가능 전투기" },
];

export const TRAITS = {
  bold: { n: "공격적", d: "화력 +5% · 받는 피해 +4%" },
  calm: { n: "신중함", d: "받는 피해 −5% · 화력 −2%" },
  vet: { n: "노련함", d: "주 능력 효과 ×1.25" },
  fast: { n: "속전속결", d: "재장전 −4% · 수리반 −1" },
  green: { n: "신진", d: "효과 ×0.8 · 경험 2배" },
};

// ri = in-game rank of the post (참모장 소장, 처장 대령) — every candidate for a post holds that post's rank, skills differ
// sk = skill 1-10 for the role's stat; f = portrait [skin, hair, age 1-3, moustache, glasses, jaw, fem, beard]
// Everyone here is a historical figure who is no longer living.
export const STAFF = [
  { id: "c1", r: "cos", nm: "체스터 니미츠", nat: "us", ri: 7, sk: 10, tr: "vet", f: [0, 5, 3, null, false, 1.0] },
  { id: "c2", r: "cos", nm: "알레이 버크", nat: "us", ri: 7, sk: 8, tr: "bold", f: [1, 2, 2, null, false, 1.08] },
  { id: "c3", r: "cos", nm: "정걸", nat: "kr", ri: 7, sk: 7, tr: "vet", f: [3, 5, 3, "full", false, 1.02, false, true] },
  { id: "c4", r: "cos", nm: "장보고", nat: "kr", ri: 7, sk: 7, tr: "bold", f: [4, 0, 2, "full", false, 1.1, false, true] },
  { id: "c5", r: "cos", nm: "이억기", nat: "kr", ri: 7, sk: 6, tr: "calm", f: [3, 0, 1, "trim", false, 0.98] },
  { id: "o1", r: "ops", nm: "이순신", nat: "kr", ri: 5, sk: 10, tr: "calm", f: [4, 4, 3, "full", false, 1.04, false, true] },
  { id: "o2", r: "ops", nm: "윌리엄 홀시", nat: "us", ri: 5, sk: 8, tr: "bold", f: [1, 4, 3, null, false, 1.12] },
  { id: "o3", r: "ops", nm: "레이먼드 스프루언스", nat: "us", ri: 5, sk: 9, tr: "calm", f: [0, 3, 2, null, false, 0.96] },
  { id: "o4", r: "ops", nm: "토머스 킨케이드", nat: "us", ri: 5, sk: 7, tr: "vet", f: [2, 2, 2, null, false, 1.02] },
  { id: "o5", r: "ops", nm: "정운", nat: "kr", ri: 5, sk: 7, tr: "bold", f: [4, 0, 1, "trim", false, 1.1] },
  { id: "o6", r: "ops", nm: "어영담", nat: "kr", ri: 5, sk: 5, tr: "green", f: [3, 0, 2, "full", false, 0.98] },
  { id: "i1", r: "int", nm: "에드윈 레이턴", nat: "us", ri: 5, sk: 8, tr: "vet", f: [0, 1, 1, null, true, 0.98] },
  { id: "i2", r: "int", nm: "조지프 로슈포르", nat: "us", ri: 5, sk: 9, tr: "calm", f: [1, 3, 2, null, true, 0.94] },
  { id: "i3", r: "int", nm: "정경달", nat: "kr", ri: 5, sk: 6, tr: "calm", f: [3, 0, 2, "full", true, 0.96, false, true] },
  { id: "i4", r: "int", nm: "송희립", nat: "kr", ri: 5, sk: 4, tr: "green", f: [4, 0, 1, null, false, 1.0] },
  { id: "l1", r: "log", nm: "하이먼 리코버", nat: "us", ri: 5, sk: 9, tr: "fast", f: [2, 5, 3, null, false, 0.9] },
  { id: "l2", r: "log", nm: "벤 모렐", nat: "us", ri: 5, sk: 8, tr: "vet", f: [0, 3, 2, null, true, 1.06] },
  { id: "l3", r: "log", nm: "최무선", nat: "kr", ri: 5, sk: 7, tr: "vet", f: [3, 5, 3, "full", false, 1.0, false, true] },
  { id: "l4", r: "log", nm: "나대용", nat: "kr", ri: 5, sk: 8, tr: "calm", f: [4, 0, 2, "trim", false, 1.02] },
  { id: "l5", r: "log", nm: "이봉수", nat: "kr", ri: 5, sk: 4, tr: "green", f: [3, 0, 1, null, false, 1.04] },
  { id: "a1", r: "air", nm: "마크 미처", nat: "us", ri: 5, sk: 9, tr: "vet", f: [1, 5, 3, null, false, 0.94] },
  { id: "a2", r: "air", nm: "지미 둘리틀", nat: "us", ri: 5, sk: 9, tr: "bold", f: [0, 2, 2, "trim", false, 1.0] },
  { id: "a3", r: "air", nm: "이근석", nat: "kr", ri: 5, sk: 7, tr: "bold", f: [4, 0, 1, null, false, 1.06] },
  { id: "a4", r: "air", nm: "김영환", nat: "kr", ri: 5, sk: 6, tr: "calm", f: [3, 0, 1, null, true, 1.0] },
  { id: "a5", r: "air", nm: "권기옥", nat: "kr", ri: 5, sk: 7, tr: "vet", f: [3, 0, 2, null, false, 0.92, true] },
  { id: "a6", r: "air", nm: "안창남", nat: "kr", ri: 5, sk: 5, tr: "green", f: [4, 0, 1, null, false, 0.98] },
];
export const RANKS = ["소위", "중위", "대위", "소령", "중령", "대령", "준장", "소장", "중장", "대장", "원수"];
for (const o of STAFF) {
  Object.defineProperty(o, "rk", {get: () => o.nat === "us" && isUS() ? usRankName(o.ri, serviceOf()) : RANKS[o.ri]});
}
/** The operations commander (해군작전사령관) above you until you make 중장 yourself. */
export const FLEET_CDR = { id: "fc", nm: "손원일", nat: "kr", ri: 8, f: [3, 0, 2, null, true, 1.0] };
FLEET_CDR.rk = RANKS[FLEET_CDR.ri];
/** Three military services (군종) chosen upon commissioning as 소위. */
export const SERVICES = {
  army: { n: "육군", en: "ROKA", icon: "⛨", c: "#6ba35c", bg: "#223620", motto: "지상 방위 · 기갑 · 화력", d: "GOP·전차·포병 부대 지휘에서 지상작전사령관·육군참모총장까지 지상 안보를 책임집니다." },
  navy: { n: "해군", en: "ROKN", icon: "⚓", c: "#4e92d4", bg: "#172a42", motto: "제해권 · 기동함대 · 수중작전", d: "구축함·잠수함·해상항공 전력으로 서·동·남해 영해와 해상교통로를 수호합니다." },
  air: { n: "공군", en: "ROKAF", icon: "✈️", c: "#72ace8", bg: "#1c314d", motto: "제공권 · 전략타격 · 미사일방어", d: "전투비행단·방공유도탄·조기경보통제기로 한반도 영공과 방공망을 지킵니다." },
};
/** Branch (병과) chosen under a service (or joint track from 소령+); carries rank titles and bonuses. */
export const BRANCHES = {
  // 육군 (ROKA)
  inf: { svc: "army", n: "보병·특수전", d: "GP/GOP 경계, 야전 복무 및 특수전 작전 지휘", bonus: "접경·도서 위기 방어↑ · 전군 사기 관리 수월 · 받는 피해 −", t: ["GOP 소대장", "수색소대장", "특전여단 중대장", "보병대대 작전과장", "보병대대장", "보병연대장", "보병사단 부사단장", "보병사단장", "군단장", "육군참모총장", "육군원수"] },
  arm: { svc: "army", n: "기갑·기동", d: "K2 흑표 전차·장갑차 기반 기동전 및 돌파 작전", bonus: "화력 + · 재장전 − · 기동 위기 대응력 강화", t: ["전차소대장", "기갑수색소대장", "전차중대장", "기계화대대 작전과장", "K2 전차대대장", "기갑여단장", "기갑여단장(준장)", "기계화보병사단장", "기동군단장", "육군참모총장", "육군원수"] },
  art: { svc: "army", n: "포병·방공", d: "K9 자주포 화력 지원, 대화력전 및 야전 방공", bonus: "화력 + · 요격률 + · 화력 도발 즉각 응징력 상향", t: ["포병 전포대장", "화력관측장교", "포대장", "포병대대 작전과장", "K9 포병대대장", "포병여단장", "화력여단장", "미사일전략사령관", "수도방위사령관", "육군참모총장", "육군원수"] },
  eng: { svc: "army", n: "공병", d: "시설 점검, 재난 복구와 공사 일정 관리", bonus: "첫 10주 시설 복구 연속 사건", t: ["공병소대장", "시설복구장교", "공병중대장", "공병대대 계획장교", "공병대대장", "공병여단장", "육군공병학교장", "국방시설본부장", "육군군수사령관", "육군참모총장", "육군원수"] },
  // 해군 (ROKN)
  sea: { svc: "navy", n: "수상함", d: "구축함·호위함 기반 함대 지휘 및 해상 기동전", bonus: "수리반 +1 (대위부터) · 함대함/함대공 효율 +", t: ["고속정 부장", "고속정 정장", "구축함 전투정보관", "호위함 작전관", "구축함 함장", "구축함전대장", "해상전투단장", "제2함대사령관", "해군작전사령관", "해군참모총장", "해군원수"] },
  sub: { svc: "navy", n: "잠수함", d: "214급·안창호급 수중 은밀 작전 및 뇌격 임무", bonus: "은밀 정찰↑ · 받는 피해 − · 미사일·뇌격 돌파율 +", t: ["잠수함 항해관", "잠수함 무장관", "잠수함 작전관", "잠수함 부장", "214급 잠수함장", "안창호급 잠수함장", "잠수함전단장", "잠수함사령관", "해군작전사령관", "해군참모총장", "해군원수"] },
  mar: { svc: "navy", n: "해상항공·해병", d: "해상초계기·작전헬기 및 상륙작전·도서 방어 전력", bonus: "전투기 +1 (중위부터) · 광역 정찰 · 도서 방어력 +", t: ["항공운항담당", "상륙소대장", "해상초계기 전술관", "항공작전과장", "해상항공전대장", "상륙여단장", "항공전단장", "해병대 제1사단장", "해병대사령관", "해군참모총장", "해군원수"] },
  // 공군 (ROKAF)
  plt: { svc: "air", n: "전투조종 (Pilot)", d: "KF-21·F-35A·F-15K 핵심 전투기 출격 및 영공 방위", bonus: "전투기 +1 (중위부터) · 화력 + · 영공 대응 속도 최상", t: ["KF-16 편대원", "전투비행대대 요격조종사", "전투비행대대 편대장", "비행대대 작전과장", "F-35A 비행대대장", "항공작전전대장", "전투비행단장", "공중전투사령관", "공군작전사령관", "공군참모총장", "공군원수"] },
  sam: { svc: "air", n: "방공유도탄", d: "패트리어트·천궁·L-SAM 기반 탄도미사일 방어망 운용", bonus: "대공·대탄도탄 요격률 대폭 + · 받는 피해 −", t: ["발사통제장교", "방공포대 작전장교", "천궁 포대장", "방공유도탄대대 작전과장", "패트리어트 대대장", "방공유도탄전대장", "방공유도탄여단장", "미사일방어사령관", "공군작전사령관", "공군참모총장", "공군원수"] },
  tac: { svc: "air", n: "전술통제·정보", d: "E-737 조기경보통제기 및 연합 정찰 자산 통제", bonus: "위기 탐지 단축 · 요격률 + · 미사일 돌파율 +", t: ["방공관제사", "E-737 통제관", "선임전술통제관", "항공정보과장", "항공정보단 작전과장", "전술항공통제전대장", "방공관제사 부사령관", "방공관제사령관", "국방정보본부장", "공군참모총장", "공군원수"] },
  // 공통 융합 트랙 (영관급 소령 이상 전과 가능)
  acq: { svc: "joint", n: "방산·전력획득", d: "방위사업청·군수사·ADD 연계 전력증강 및 정비 체계 총괄", bonus: "전력증강 비용 −15% · 재장전 − · 정비 효율↑", t: ["군수계획담당", "정비보급장교", "소요제기장교", "방위사업청 사업담당", "ADD 체계개발과장", "전력기획처장", "군수사 부사령관", "군수사령관", "합참 전략기획본부장", "합동참모의장", "국군원수"] },
  pol: { svc: "joint", n: "정보·외교·정책", d: "합참·연합사·주외무관·NSC 안보 정책 및 대국회 대응", bonus: "청문회·지지율 방어 + · 받는 피해 − · 외교 보너스", t: ["정책보좌관", "국방외교장교", "연합사 연락장교", "국방부 정책기획과 실무장교", "주외무관", "합참 전략기획과장", "국방정책실 국장", "NSC 안보비서관", "합동참모차장", "합동참모의장", "국군원수"] },
};
const BR_ALIAS = { ops: "sea", int: "tac", log: "acq", air: "mar" };
export const normBranch = (b) => (BRANCHES[b] ? b : BR_ALIAS[b] || "sea");
export const serviceOf = (b = staff.branch) => { const br = BRANCHES[normBranch(b)]; return br?.svc && br.svc !== "joint" ? br.svc : staff.service || "navy"; };
/** Hidden posting tier for promotion board odds (never shown to the player): "key" (요직) / "std" (보통) / "back" (한직). */
const KEY_POSTS = new Set(["보병연대장", "보병대대장", "공병대대장", "공병여단장", "K2 전차대대장", "K9 포병대대장", "특전여단장", "기갑여단장", "화력여단장", "보병사단장", "기계화보병사단장", "미사일전략사령관", "해병대 제1사단장", "수도방위사령관", "군단장", "기동군단장", "해병대사령관", "지상작전사령관", "제2작전사령관", "육군참모차장",
  "구축함 함장", "214급 잠수함장", "안창호급 잠수함장", "구축함전대장", "해상전투단장", "잠수함전단장", "제2함대사령관", "잠수함사령관", "해군작전사령관", "해군참모차장",
  "F-35A 비행대대장", "패트리어트 대대장", "항공작전전대장", "전투비행단장", "공중전투사령관", "미사일방어사령관", "공군작전사령관", "공군참모차장",
  "방위사업청 사업담당", "전력기획처장", "국방부 정책기획과장", "합참 전략기획과장", "국방정책실 국장", "NSC 안보비서관", "국방정보본부장", "합동참모차장", "합참 전략기획본부장", "합참 군사지원본부장", "한미연합사 부사령관",
  "Infantry Battalion Commander", "Combined Arms Bn Commander", "Brigade Combat Team Commander", "Engineer Brigade Commander", "CG, 82nd Airborne Division", "CG, 1st Armored Division", "CG, 25th Infantry Division", "CG, XVIII Airborne Corps", "CG, III Armored Corps", "CG, I Corps", "Chief of Engineers & CG, USACE", "Deputy CG, FORSCOM", "CG, U.S. Army Forces Command", "CG, U.S. Army Pacific (USARPAC)", "Vice Chief of Staff of the Army",
  "CO, Arleigh Burke-class DDG", "CO, Virginia-class SSN", "CO, Ohio-class SSBN", "Commander, Carrier Strike Group", "Commander, Carrier Strike Group 5", "Commander, U.S. 7th Fleet", "Commander, U.S. 3rd Fleet", "Commander, Naval Submarine Forces", "Commander, Naval Air Forces", "Deputy CNO (Operations)", "Commander, U.S. Pacific Fleet", "Commander, USINDOPACOM",
  "Commander, F-35A Fighter Sq", "Commander, 1st Fighter Wing", "Commander, 7th Air Force", "Commander, 11th Air Force", "Commander, 16th Air Force", "Deputy Commander, NORAD", "Deputy CSAF (Operations)", "Commander, Pacific Air Forces", "Commander, Air Combat Command", "Director of the Joint Staff (DJS)", "Vice Chairman, Joint Chiefs (VCJCS)", "NSC Military Advisor"]);
const BACK_POSTS = new Set(["육군보병학교장", "육군포병학교장", "육군기계화학교장", "육군공병학교장", "신병교육대 소대장", "신병교육대 교관", "육군보병학교 교관", "기갑학교 교관", "포병학교 교관", "공병학교 교관", "비행교관", "잠수함 교육훈련장교", "육군대학 교관", "육군교육사령관", "해군사관학교장", "공군교육사령관", "방공관제사 부사령관", "군수사 부사령관", "주외무관", "항공정보단 작전과장", "기계화대대 작전과장", "해상항공전대장", "잠수함 부장", "방공유도탄대대 작전과장", "보병사단 부사단장", "기동군단 참모장",
  "Commandant, Armor School", "Deputy Commanding General", "U.S. Defense Attaché", "Executive Officer (SSN)", "VFA Squadron XO", "Commander, 9th Recon Wing", "Deputy Director, DLA"]);
/** 병과 전용 보직 (2026-11-25): 그 병과로 임관한 사람만 받는다. 병과학교장은 병과장을 겸하는 자리라 타 병과 출신이 맡지 않는다. */
export const BRANCH_LOCK = {
  "육군보병학교장": "inf", "특전여단장": "inf",
  "육군기계화학교장": "arm", "기갑여단장(준장)": "arm",
  "육군포병학교장": "art", "화력여단장": "art", "포병여단장": "art", "미사일전략사령관": "art",
  "육군공병학교장": "eng", "공병여단장": "eng", "국방시설본부장": "eng",
  "잠수함전단장": "sub", "잠수함사령관": "sub", "안창호급 잠수함장": "sub", "214급 잠수함장": "sub",
  "해병대 제1사단장": "mar", "해병대사령관": "mar", "상륙여단장": "mar", "항공전단장": "mar", "해상항공전대장": "mar",
  "전투비행단장": "plt", "공중전투사령관": "plt", "항공작전전대장": "plt", "F-35A 비행대대장": "plt",
  "방공유도탄여단장": "sam", "미사일방어사령관": "sam", "방공유도탄전대장": "sam", "패트리어트 대대장": "sam",
  "방공관제사령관": "tac", "방공관제사 부사령관": "tac", "전술항공통제전대장": "tac",
};
/** 임관 병과 (캐릭터 생성 때 저장, 옛 저장은 client.js가 약력에서 복원) */
export const originBranch = () => normBranch(staff.origin || staff.branch);
export const lockedOut = (title) => { const need = BRANCH_LOCK[title]; return !!need && need !== originBranch(); };

/** 같은 계급 안에서 갈 수 있는 다른 보직 (진급 때 보직 선택지 + 순환 보직 인사명령). 게임용 단순화 — 실제 편제와 다를 수 있다. */
export const ALT_POSTS = {
  inf: [["수색소대장", "특공소대장", "신병교육대 소대장"], ["GOP 부중대장", "대대 작전장교", "신병교육대 교관"], ["보병 중대장", "대대 정보장교", "육군보병학교 교관"], ["연대 작전장교", "사단 작전참모부 작전장교", "보병대대 부대대장"], ["사단 작전참모", "군단 작전과장", "육군본부 정책장교"], ["사단 참모장", "군단 작전참모", "육군본부 과장"]],
  arm: [["장갑차소대장", "기갑수색대 소대장"], ["전차중대 부중대장", "대대 작전장교"], ["기계화보병 중대장", "기갑학교 교관"], ["기갑여단 작전과장", "기계화대대 부대대장"], ["기계화보병대대장", "기갑여단 작전참모"], ["기계화사단 참모장", "군단 기동참모"]],
  art: [["사격지휘소 사격지휘장교", "관측반장"], ["대대 사격지휘장교", "포대 부포대장"], ["대대 정보장교", "포병학교 교관"], ["포병여단 작전과장", "포병대대 부대대장"], ["천무 대대장", "사단 화력참모"], ["군단 화력처장", "포병여단 참모장"]],
  eng: [["교량소대장", "장애물개척 소대장"], ["공병중대 부중대장", "대대 작전장교"], ["건설공병 중대장", "공병학교 교관"], ["공병여단 작전과장", "공병대대 부대대장"], ["군단 공병참모", "건설공병대대장"], ["건설공병단장", "군단 공병처장"]],
  sea: [["호위함 통신관", "초계함 갑판사관"], ["초계함 작전관", "고속정편대 작전장교"], ["호위함 포술장", "해군작전사 작전장교"], ["유도탄고속함장", "함대사 작전과장"], ["호위함장", "함대 작전참모"], ["해역방어사령관", "함대 작전처장"]],
  sub: [["잠수함 통신관"], ["잠수함 음탐관", "잠수함전대 작전장교"], ["잠수함 기관장", "잠수함 교육훈련장교"], ["잠수함사 작전과장", "잠수함 교육훈련장교"], ["잠수함전대 작전참모", "잠수함 시운전 감독관"], ["잠수함전대장", "잠수함사 참모장"]],
  mar: [["해병 소총소대장", "해병 수색소대장"], ["해병 수색소대장", "해병대대 작전장교"], ["해병 중대장", "해상초계기 정찰관"], ["해병대대 작전과장", "해병여단 작전장교"], ["해병대대장", "해상초계기 비행대대장"], ["해병연대장", "해병사단 참모장"]],
  plt: [["수송기 부조종사", "기초비행 교육생"], ["공중기동 조종사", "전투비행대대 교관 후보"], ["비행교관", "전투비행대대 편대장"], ["비행단 작전계획과장", "비행교육대대 교관"], ["비행전대 작전과장", "공군본부 전력기획 담당"], ["비행단 부단장", "공군작전사 작전처장"]],
  sam: [["레이더 통제장교", "발사대 소대장"], ["사격통제장교", "방공포대 부포대장"], ["방공포대장", "방공학교 교관"], ["방공여단 작전과장", "방공대대 부대대장"], ["천궁 대대장", "미사일방어사 작전과장"], ["방공유도탄여단 참모장", "미사일방어사 작전처장"]],
  tac: [["항공기상장교", "레이더 관제사"], ["레이더 관제사", "항공정보장교"], ["항공정보장교", "관제교관"], ["방공관제단 작전과장", "항공정보단 분석과장"], ["관제대대장", "작전사 정보처 과장"], ["방공관제단장", "작전사 정보처장"]],
  acq: [[], [], [], ["국방부 전력정책 실무장교", "방위사업청 사업관리 실무장교"], ["방위사업청 사업팀장", "국방기술품질원 파견 팀장"], ["합참 전력기획과장", "방위사업청 사업부 차장"]],
  pol: [[], [], [], ["합참 작전부 실무장교", "국방부 국제정책 실무장교"], ["합참 전략기획 담당", "국방부 대북정책 담당"], ["국방부 정책기획과장", "한미연합사 기획참모부 과장"]],
};
/** 한직 (인사 실적이 나쁠 때 내정되는 자리) — 계급(0~8)별. 게임용 단순화. */
export const HARD_POSTS = {
  army: [["신병교육대 소대장", "예비군 훈련대 교관"], ["부대 행정장교", "신병교육대 교관"], ["예비군 훈련대장", "동원지원단 중대장"], ["동원사단 대대 작전과장", "예비군 지역대장"], ["동원사단 대대장", "예비군 지역연대 작전과장"], ["동원사단 참모장", "향토사단 부사단장"], ["교육사령부 처장", "동원전력사령부 참모장"], ["향토사단장", "교육사령부 부사령관"], ["육군교육사령관"]],
  navy: [["해군 교육사 교관", "기지 행정장교"], ["함정 수리창 감독관", "기지 행정장교"], ["해군 교육사 교관", "기지 경비대 중대장"], ["해군 교육사 교관대장", "기지 경비대대 작전과장"], ["기지 경비대대장", "정비창 감독관"], ["해군 교육사 참모장", "기지전대장"], ["해군 교육사 부사령관"], ["해군 교육사령관"], ["해군사관학교장"]],
  air: [["기지 경비대대 행정장교", "공군 교육사 교관"], ["기상단 예보장교", "기지 행정장교"], ["공군 교육사 교관", "기지 경비중대장"], ["기지 경비대대 작전과장", "공군 교육사 교관대장"], ["기지 경비대대장", "군수사 정비창 감독관"], ["공군 교육사 참모장", "기지전대장"], ["공군 교육사 부사령관"], ["군수사 부사령관"], ["공군교육사령관"]],
};
export const hardPostsFor = (service, grade) => (HARD_POSTS[service] || HARD_POSTS.army)[Math.max(0, Math.min(8, grade))] || [];
const HARD_SET = new Set(Object.values(HARD_POSTS).flat(2));
export const altPostsFor = (branch, grade) => (ALT_POSTS[normBranch(branch)]?.[grade] || []).filter((t) => !lockedOut(t));

export const postTier = (title) => (KEY_POSTS.has(title) || /Commander|Commanding Officer|^CG,|Chief of Staff|Joint Staff|Platoon Leader/i.test(title) ? "key" : BACK_POSTS.has(title) || HARD_SET.has(title) || /School|Instructor|Academy/i.test(title) ? "back" : "std");
export const isUS = () => staff.nation === "us";
export const curServices = () => (isUS() ? US_SERVICES : SERVICES);
export const curBranches = () => (isUS() ? US_BRANCHES : BRANCHES);
export const curFlagPosts = () => (isUS() ? allUsFlagPosts : allKrFlagPosts);

export function flagPostsForTrack(grade, branch, service) {
  const posts = curFlagPosts().filter(post => post.g === grade && (post.svc === service || post.svc === "joint") && (!lockedOut(post.t) || BRANCH_LOCK[post.t] === normBranch(branch)));
  const track = curBranches()[branch];
  const ownTitle = track?.t[grade];
  // Shared titles such as service chief can continue any branch in that service.
  const own = posts.find(post => post.t === ownTitle && post.svc === track?.svc);
  return own ? [{ ...own, b: branch }, ...posts.filter(post => post !== own)] : posts;
}
export const careerTitle = (grade, br = staff.branch) => {
  const g = Math.max(0, Math.min(10, grade));
  if (g >= 10 && isUS()) {
    const sv = serviceOf(br);
    return sv === "navy" ? "Fleet Admiral" : sv === "air" ? "General of the Air Force" : "General of the Army";
  }
  return (curBranches()[normBranch(br)] || curBranches().sea).t[g];
};
export function setNation(n) { if (n === "kr" || n === "us") { staff.nation = n; saveStaff(); } }
export function setService(s) { if (SERVICES[s]) { staff.service = s; saveStaff(); } }
export function setBranch(k) { const nk = normBranch(k); if (BRANCHES[nk]) { staff.branch = nk; if (BRANCHES[nk].svc !== "joint") staff.service = BRANCHES[nk].svc; saveStaff(); } }
/** Your own staff follows the size of what you command, and is always junior to you:
 *  위관 — a ship's department (부사관), 영관 — a ship / squadron staff (위관), 준장·소장 — a task group staff (영관),
 *  중장 and up — the fleet headquarters (처장 대령, 참모장 소장: the historical figures above). */
export const ECH = [
  { u: "함정 부서", g: [0, 2], rk: "부사관", t: { cos: "부서 선임부사관", ops: "전탐 부사관", int: "통신 부사관", log: "보급 부사관", air: "항공정비 부사관" } },
  { u: "함정·전대 참모부", g: [3, 5], rk: "위관", t: { cos: "부장", ops: "작전관", int: "정보관", log: "보급관", air: "항공관" } },
  { u: "전투단·기동부대 참모부", g: [6, 7], rk: "영관", t: { cos: "참모장", ops: "작전참모", int: "정보참모", log: "군수참모", air: "항공참모" } },
  { u: "해군작전사령부", g: [8, 10], rk: "장성·영관", t: { cos: "참모장", ops: "작전처장", int: "정보처장", log: "군수처장", air: "항공처장" } },
];
export const echOf = (grade) => (grade <= 2 ? 0 : grade <= 5 ? 1 : grade <= 7 ? 2 : 3);
export const roleTitle = (k, grade) => ECH[echOf(grade)].t[k];
/* fictional junior candidates for the three smaller echelons (names are made up) */
const NCO = ["하사", "중사", "상사", "원사"], SUR = "김이박최정강조윤장임한오서신권황안송류홍", GIV = ["태호", "정민", "도현", "승원", "우석", "민혁", "현수", "재석", "기훈", "성택", "동욱", "세훈", "지원", "우진", "혁준", "민규", "성우", "재현", "현철", "상민"];
const GEN = [], GEN_US = [], US_NCO = ["SGT", "SSG", "SFC", "CSM"];
{ let n = 0; const tr = ["vet", "calm", "bold", "fast", "green"];
  for (let e = 0; e < 3; e++) for (const R of ["cos", "ops", "int", "log", "air"]) for (let i = 0; i < 4; i++) {
    const h = (e * 131 + R.charCodeAt(0) * 17 + R.charCodeAt(1) * 7 + i * 29) >>> 0, sk = 3 + ((h >> 2) % 6), nm = SUR[n % 20] + GIV[(3 * n + Math.floor(n / 20)) % 20]; /* unique per candidate */
    const ri = e === 0 ? -1 : e === 1 ? 1 + (i % 2) : (R === "cos" ? 5 : 3 + (i % 3));
    const age = 1 + (e > 0 ? 1 : 0) + (i === 3 ? 1 : 0) > 3 ? 3 : 1 + (e > 0 ? 1 : 0);
    GEN.push({ id: `g${e}${R}${i}`, r: R, e, nm, nat: "kr", ri, rk: e === 0 ? NCO[1 + (i % 3)] : RANKS[ri], sk, tr: tr[(h >> 4) % 5], f: [3 + (i % 2), i % 2 ? 0 : 1, age, e === 2 && i === 0 ? "trim" : null, i === 2, 0.96 + (i % 3) * 0.05] });
    GEN_US.push({ id: `u${e}${R}${i}`, r: R, e, nm: usNpcName(`us_${e}_${R}_${i}`), nat: "us", ri, get rk() { return e === 0 ? (koreanUsRanks() ? NCO : US_NCO)[1 + (i % 3)] : usRankName(ri, serviceOf()); }, sk, tr: tr[(h >> 4) % 5], f: [i % 3, 1 + (i % 4), age, e === 2 && i === 0 ? "trim" : null, i === 2, 0.96 + (i % 3) * 0.05] }); n++;
  } }
export const canFill = () => true;
export const POST_RANK = { cos: 7, ops: 5, int: 5, log: 5, air: 5 };
/** Candidates for your own staff at this grade: always junior to you. */
export const candidates = (role, grade) => {
  const e = echOf(grade);
  if (isUS()) return e === 3 ? STAFF.filter((o) => o.r === role && o.ri < grade && o.nat === "us") : GEN_US.filter((o) => o.r === role && o.e === e && o.ri < grade);
  return e === 3 ? STAFF.filter((o) => o.r === role && o.ri < grade) : GEN.filter((o) => o.r === role && o.e === e && o.ri < grade);
};
export const canAppoint = (o, grade) => candidates(o.r, grade).includes(o); /* admin too: the rank rule is never waived */
/** You yourself hold a department head post when your branch and rank match it. */
export const holds = () => false; /* your own staff is always a smaller unit's juniors, so you never fill one of its seats yourself */

const KEY = "steeltide:staff";
export const staff = (() => {
  let s = null; try { s = JSON.parse(careerStorage.getItem(KEY) || "null"); } catch {}
  if (!s || typeof s !== "object") s = { a: {}, x: {} };
  s.a ||= {}; s.x ||= {}; s.byE ||= {};
  return s;
})();
export const saveStaff = () => { try { careerStorage.setItem(KEY, JSON.stringify(staff)); } catch {} };
export const officer = (id) => STAFF.find((o) => o.id === id) || GEN.find((o) => o.id === id) || GEN_US.find((o) => o.id === id);
/** Switch the appointment set to the echelon of this grade (each echelon keeps its own staff); empty posts get the least able candidate. */
export function staffFor(grade) {
  const e = echOf(grade);
  if (staff.e !== e) { if (staff.e != null) staff.byE[staff.e] = { ...staff.a }; staff.a = { ...(staff.byE[e] || {}) }; staff.e = e; }
  let ch = false; for (const R of STAFF_ROLES) { const ok = candidates(R.k, grade); if (!ok.length) continue; if (!ok.some((o) => o.id === staff.a[R.k])) { staff.a[R.k] = ok.slice().sort((x, y) => x.sk - y.sk)[0].id; ch = true; } }
  if (ch || staff.byE[e] !== staff.a) saveStaff(); return staff.a;
}
export const skillOf = (o) => Math.min(10, o.sk + Math.floor((staff.x[o.id] || 0) / 3)); /* +1 per three battles served */
export function appoint(role, id) { if (officer(id)?.r === role) { staff.a[role] = id; saveStaff(); } }

/** What the current staff does to a modern battle. */
export function staffMods(grade = 0, branch = staff.branch) {
  staffFor(grade);
  const at = (k) => { if (holds(k, grade, branch)) return { o: null, s: 7, t: null }; const o = officer(staff.a[k]); return o ? { o, s: skillOf(o), t: o.tr } : null; };
  const cos = at("cos"), amp = 1 + ((cos?.s ?? 3) - 5) * 0.05 * (cos?.t === "vet" ? 1.25 : 1);
  const eff = (x) => { if (!x) return -2; const k = x.t === "vet" ? 1.25 : x.t === "green" ? 0.8 : 1; return (x.s - 5) * k * (x === cos ? 1 : amp); };
  const ops = at("ops"), int = at("int"), log = at("log"), air = at("air"), all = [cos, ops, int, log, air];
  let outK = 1 + eff(ops) * 0.05, inK = 1 - eff(int) * 0.04, reloadK = 1 - eff(log) * 0.03, repairN = 3 + (eff(log) >= 2 ? 1 : 0) - (eff(log) <= -2 ? 1 : 0), jets = Math.max(-1, Math.round(eff(air) / 2.5));
  for (const x of all) { if (!x) continue; if (x.t === "bold") { outK += 0.05; inK += 0.04; } if (x.t === "calm") { inK -= 0.05; outK -= 0.02; } if (x.t === "fast") { reloadK -= 0.04; repairN -= 1; } }
  { const b = normBranch(branch), g = 0.02 + grade * 0.004; /* your own branch expertise grows with rank */
    if (b === "arm" || b === "art" || b === "plt" || b === "sea") outK += g;
    if (b === "inf" || b === "sub" || b === "sam" || b === "pol") inK -= g;
    if (b === "arm" || b === "acq") reloadK -= g;
    if ((b === "mar" || b === "plt") && grade >= 1) jets += 1;
    if (b === "sea" && grade >= 2) repairN += 1; }
  const b0 = normBranch(branch);
  const icptK0 = (b0 === "sam" ? 0.04 : b0 === "art" || b0 === "mar" || b0 === "tac" ? 0.02 : 0) + (b0 === "sam" || b0 === "tac" ? grade * 0.005 : 0);
  const penK0 = b0 === "sub" || b0 === "tac" ? 0.02 + grade * 0.003 : 0;
  const icptK = clamp01(1 + eff(int) * 0.05 + icptK0, 0.75, 1.38), penK = clamp01(1 - eff(ops) * 0.05 - penK0, 0.68, 1.25); /* our SAM kill chance; enemy SAM kill chance against our missiles */
  return { outK: Math.max(0.7, outK), inK: Math.max(0.6, inK), reloadK: Math.max(0.7, reloadK), repairN: Math.max(1, repairN), jets, icptK, penK };
}

/** After a modern battle every appointed officer gains service (green ones twice as fast). */
export function staffServe(won) { for (const R of STAFF_ROLES) { const o = officer(staff.a[R.k]); if (o) staff.x[o.id] = (staff.x[o.id] || 0) + (won ? 2 : 1) * (o.tr === "green" ? 2 : 1); } saveStaff(); }

/** Every flag-officer post a naval officer can hold, with the chart column it sits in and the branch whose
 *  evaluation weights it uses (public reporting; ranks and names shift with reorganisations). */
export const FLAG_POSTS = [
  { g: 9, t: "합동참모의장", c: "jcs", b: "pol", svc: "joint" },
  { g: 9, t: "한미연합사 부사령관", c: "jcs", b: "pol", svc: "joint" },
  { g: 9, t: "육군참모총장", c: "cmd", b: "inf", svc: "army" }, { g: 9, t: "지상작전사령관", c: "sea", b: "arm", svc: "army" }, { g: 9, t: "제2작전사령관", c: "ops", b: "art", svc: "army" },
  { g: 9, t: "해군참모총장", c: "cmd", b: "sea", svc: "navy" }, { g: 9, t: "공군참모총장", c: "cmd", b: "plt", svc: "air" },
  { g: 8, t: "군단장", c: "sea", b: "arm", svc: "army" }, { g: 8, t: "육군참모차장", c: "cmd", b: "inf", svc: "army" }, { g: 8, t: "육군교육사령관", c: "cmd", b: "art", svc: "army" },
  { g: 8, t: "해군작전사령관", c: "sea", b: "sea", svc: "navy" }, { g: 8, t: "해군참모차장", c: "cmd", b: "acq", svc: "navy" }, { g: 8, t: "해군사관학교장", c: "cmd", b: "sea", svc: "navy" },
  { g: 8, t: "공군작전사령관", c: "sea", b: "plt", svc: "air" }, { g: 8, t: "공군참모차장", c: "cmd", b: "tac", svc: "air" }, { g: 8, t: "공군교육사령관", c: "cmd", b: "sam", svc: "air" },
  { g: 8, t: "합동참모차장", c: "jcs", b: "pol", svc: "joint" }, { g: 8, t: "합참 전략기획본부장", c: "jcs", b: "acq", svc: "joint" }, { g: 8, t: "합참 군사지원본부장", c: "jcs", b: "mar", svc: "joint" }, { g: 8, t: "국방정보본부장", c: "int", b: "tac", svc: "joint" },
  { g: 7, t: "보병사단장", c: "sea", b: "inf", svc: "army" }, { g: 7, t: "기계화보병사단장", c: "ops", b: "arm", svc: "army" }, { g: 7, t: "미사일전략사령관", c: "air", b: "art", svc: "army" },
  { g: 7, t: "제2함대사령관", c: "sea", b: "sea", svc: "navy" }, { g: 7, t: "잠수함사령관", c: "ops", b: "sub", svc: "navy" }, { g: 7, t: "해병대 제1사단장", c: "air", b: "mar", svc: "navy" },
  { g: 7, t: "공중전투사령관", c: "sea", b: "plt", svc: "air" }, { g: 7, t: "미사일방어사령관", c: "ops", b: "sam", svc: "air" }, { g: 7, t: "방공관제사령관", c: "int", b: "tac", svc: "air" },
  { g: 7, t: "군수사령관", c: "log", b: "acq", svc: "joint" }, { g: 7, t: "NSC 안보비서관", c: "cmd", b: "pol", svc: "joint" },
  { g: 6, t: "특전여단장", c: "sea", b: "inf", svc: "army" }, { g: 6, t: "육군보병학교장", c: "cmd", b: "inf", svc: "army" }, { g: 6, t: "육군포병학교장", c: "cmd", b: "art", svc: "army" }, { g: 6, t: "육군기계화학교장", c: "cmd", b: "arm", svc: "army" }, { g: 6, t: "기갑여단장(준장)", c: "ops", b: "arm", svc: "army" }, { g: 6, t: "화력여단장", c: "air", b: "art", svc: "army" },
  { g: 6, t: "해상전투단장", c: "sea", b: "sea", svc: "navy" }, { g: 6, t: "잠수함전단장", c: "ops", b: "sub", svc: "navy" }, { g: 6, t: "항공전단장", c: "air", b: "mar", svc: "navy" },
  { g: 6, t: "전투비행단장", c: "sea", b: "plt", svc: "air" }, { g: 6, t: "방공유도탄여단장", c: "ops", b: "sam", svc: "air" }, { g: 6, t: "방공관제사 부사령관", c: "int", b: "tac", svc: "air" },
  { g: 6, t: "전력기획처장", c: "log", b: "acq", svc: "joint" }, { g: 6, t: "국방정책실 국장", c: "int", b: "pol", svc: "joint" },
];

function includeBranchFlagPosts(posts, branches) {
  const column = {inf:"sea", arm:"ops", art:"air", eng:"log", sea:"sea", sub:"ops", mar:"air",
    plt:"sea", sam:"ops", tac:"int", acq:"log", pol:"jcs"};
  const expanded = [...posts];
  for (const [branch, track] of Object.entries(branches)) {
    for (let grade = 6; grade <= 9; grade++) {
      const title = track.t[grade];
      if (!title || expanded.some(post => post.g === grade && post.svc === track.svc && post.t === title)) continue;
      expanded.push({g:grade, t:title, c:column[branch], b:branch, svc:track.svc});
    }
  }
  return expanded;
}

const allKrFlagPosts = includeBranchFlagPosts(FLAG_POSTS, BRANCHES);
const allUsFlagPosts = includeBranchFlagPosts(US_FLAG_POSTS, US_BRANCHES);
