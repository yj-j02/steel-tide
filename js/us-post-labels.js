import { US_BRANCHES } from "./us-ranks.js";
import { US_ALT_POSTS, US_HARD_POSTS } from "./us-alt-posts.js";

const localized = {
  inf: ["보병·공수", "제82공수사단 소총소대장", "중대 부중대장", "레인저 중대장", "대대 작전과장", "보병대대장", "여단전투단장", "부사단장", "제82공수사단장", "제18공수군단장", "육군참모총장", "육군원수"],
  arm: ["기갑", "제1기갑사단 전차소대장", "정찰소대장", "기갑중대장", "기갑대대 작전과장", "제병협동대대장", "기갑여단전투단장", "기갑학교장", "제1기갑사단장", "제3기갑군단장", "육군참모총장", "육군원수"],
  art: ["야전포병·방공포병", "HIMARS 사격지휘장교", "화력지원장교", "포병포대장", "포병대대 작전과장", "THAAD 대대장", "야전포병여단장", "제32방공·미사일방어사령부 부사령관", "제25보병사단장", "제1군단장", "육군참모총장", "육군원수"],
  eng: ["공병", "공병소대장", "시설사업장교", "공병중대장", "공병대대 계획장교", "공병대대장", "공병여단장", "육군 공병학교장", "미 육군 공병단 부사령관", "미 육군 공병감 겸 공병단 사령관", "육군참모총장", "육군원수"],
  sea: ["수상함", "구축함 분대장교", "구축함 항해장교", "이지스 전투체계장교", "구축함 부함장", "알레이버크급 구축함장", "구축함전대장", "항모타격단장", "제5항모강습단장", "제7함대사령관", "해군참모총장", "해군원수"],
  sub: ["잠수함", "공격잠수함 원자로장교", "공격잠수함 무장장교", "공격잠수함 작전장교", "공격잠수함 부함장", "버지니아급 잠수함장", "오하이오급 전략잠수함장", "잠수함전대장", "태평양잠수함전단장", "미 해군 잠수함전력사령관", "해군참모총장", "해군원수"],
  mar: ["해상항공", "해군 타격전투비행대 조종사", "탑건 교관", "F/A-18E/F 비행분대장", "타격전투비행대 부대장", "타격전투비행대장", "항모항공단장", "원정타격단장", "해군항공사령부 부사령관", "미 해군항공사령관", "해군참모총장", "해군원수"],
  plt: ["전투조종", "F-16 편대원", "F-22 조종사", "비행편대장", "전투비행대 작전과장", "F-35A 전투비행대장", "작전전대장", "제1전투비행단장", "미 공군전투발전센터장", "제7공군사령관", "공군참모총장", "공군원수"],
  sam: ["미사일·우주방어", "미사일 근무조 장교", "우주작전장교", "방공편대장", "미사일 방어 작전장교", "미사일 방어대대장", "우주 델타 부대장", "방공구역사령관", "미 본토 방공사령관", "북미항공우주방위사령부(NORAD) 부사령관", "공군참모총장", "공군원수"],
  tac: ["정보·감시·정찰 및 사이버", "공중조기경보 관제장교", "선임 감시장교", "E-3 임무승무조장", "합동정보장교(J-2)", "사이버작전비행대장", "정찰전대장", "제9정찰비행단장", "인도태평양사 정보참모부장(J-2)", "제16공군(사이버)사령관", "공군참모총장", "공군원수"],
  acq: ["국방 획득·군수", "군수준비장교", "정비장교", "소요기획장교", "펜타곤 획득장교", "국방고등연구계획국(DARPA) 사업책임자", "합참 군수과장(J-4)", "국방군수청 차장", "국방군수청장", "합참 군수본부장(J-4)", "합동참모의장", "육군원수"],
  pol: ["합동 전략·정책", "군사보좌관", "지역전문장교", "NATO 연락장교", "펜타곤 정책기획장교", "미 국방무관", "합참 전략기획과장(J-5)", "합참 전략기획 부국장(J-5)", "국가안보회의(NSC) 군사고문", "미 합동참모본부장(DJS)", "합동참모의장", "육군원수"],
};

const translations = new Map([
  ["Deputy CG, FORSCOM", "육군전력사령부 부사령관"],
  ["CG, U.S. Army Forces Command", "미 육군전력사령관(FORSCOM)"],
  ["CG, U.S. Army Pacific (USARPAC)", "미 태평양육군사령관(USARPAC)"],
  ["Vice Chief of Staff of the Army", "육군참모차장"],
  ["Commander, U.S. 3rd Fleet", "제3함대사령관"],
  ["Commander, U.S. Pacific Fleet", "미 태평양함대사령관"],
  ["Commander, USINDOPACOM", "미 인도태평양사령관(INDOPACOM)"],
  ["Deputy CNO (Operations)", "해군 작전담당 참모차장"],
  ["Commander, 11th Air Force", "제11공군사령관"],
  ["Commander, Pacific Air Forces", "미 태평양공군사령관(PACAF)"],
  ["Deputy CSAF (Operations)", "공군 작전담당 참모차장"],
  ["Commander, Air Combat Command", "미 공군전투사령관(ACC)"],
  ["Vice Chairman, Joint Chiefs (VCJCS)", "미 합동참모차장(VCJCS)"],
  ["Secretary of Defense (SecDef)", "미 국방장관 (SecDef)"],
  ["Five-Star General / Admiral", "미합중국 5성 원수"],
  ["Engineer Group Commander", "공병여단장"],
  ["Engineer Brigade Deputy Commander", "육군 공병학교장"],
  ["Army Facilities Director", "미 육군 공병단 부사령관"],
  ["Army Engineer Staff Director", "미 육군 공병감 겸 공병단 사령관"],
]);
for (const [id, [name, ...posts]] of Object.entries(localized)) {
  const branch = US_BRANCHES[id];
  translations.set(branch.n, name);
  branch.t.forEach((post, grade) => translations.set(post, posts[grade]));
}
for (const table of [US_ALT_POSTS, US_HARD_POSTS]) for (const rows of Object.values(table)) for (const pairs of rows) for (const [en, ko] of pairs) translations.set(en, ko);
export const koreanPostName = title => translations.get(title) ?? title;
