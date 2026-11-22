import { careerStorage } from "./characters.js";
// 엔딩 컬렉션 도감 (한국·미국 12종 영구 수집, 2회차 초기화에도 보존)
const EK = "steeltide:endings";
const AK = "steeltide:achievements";

export const ACHIEVEMENTS = [
  { id: "ach_ocs_gen", ic: "🔥", n: "유리천장을 깬 별", sub: "학사장교·후보생 출신으로 장성(준장+) 진급", headline: "유리천장을 깼다! 학사장교 출신 장성 탄생 — 창군 이래 손꼽히는 쾌거" },
  { id: "ach_3sa_gen", ic: "⚡", n: "영천의 신화", sub: "육군3사관학교 출신으로 장성(준장+) 진급", headline: "영천의 신화! 육군3사관학교 출신 장성 진급에 동문·야전 환호" },
  { id: "ach_nonacad_4star", ic: "👑", n: "비사관학교 4성 대장", sub: "학사·3사 출신으로 4성 대장 도달", headline: "역사를 새로 쓰다! 비사관학교 출신 4성 대장 전격 발탁" },
  { id: "ach_eng_gen", ic: "🏗️", n: "공병의 별", sub: "공병 병과로 장성(준장+) 진급", headline: "기술·공병 병과의 자부심 — 공병 출신 장성 진급 쾌거" },
  { id: "ach_longterm_win", ic: "⭐", n: "단기에서 장기로", sub: "3사·학사 단기복무 → 장기복무 선발 합격", headline: "치열한 경쟁 뚫고 장기복무 선발 전형 최종 합격!" },
  { id: "ach_one_track", ic: "🏛️", n: "외길 정통 지휘관", sub: "보직 전과 0회로 장성(준장+) 진급", headline: "한 우물만 판 정통 야전 지휘관, 마침내 별을 달다" },
  { id: "ach_joint_master", ic: "⚔️", n: "야전·합동·교육 3관왕", sub: "야전 지휘 + 합동 보직 + 고등군사교육 모두 이수", headline: "야전·합동·고등군사교육을 모두 섭렵한 완벽한 전략 지휘관" },
  { id: "ach_brotherhood", ic: "🤝", n: "평생의 전우들", sub: "임관 동기 3명 이상과 핵심 우군(관계도 75+) 달성", headline: "동기 3명 이상과 굳건한 전우애 구축 — 전군 최고 인망" },
  { id: "ach_sky_captain", ic: "✈️", n: "하늘의 두 번째 비행", sub: "전역 후 민간 항공사 기장 진로 확정", headline: "전투기 조종간에서 여객기 콕핏으로 — 하늘의 두 번째 비행" },
  { id: "ach_5star_war", ic: "🌟", n: "전시 구국의 5성 원수", sub: "전시 총력전 완승으로 5성 원수 추대", headline: "전시 총력전 완전 승전 — 역사적인 5성 원수(★★★★★) 추대" },
  { id: "ach_commissioned", ic: "🎖️", n: "초임 소위의 선서", sub: "소위 임관식 및 장교 임관 선서 완료", headline: "초임 소위 임관 선서 — 국가와 국민을 향한 첫걸음을 내딛다" },
  { id: "ach_sub_commander", ic: "🦈", n: "심해의 사령관", sub: "잠수함 병과로 장성(준장+) 진급", headline: "은밀한 심해의 방패 — 잠수함 병과 출신 장성 탄생" },
  { id: "ach_marine_general", ic: "⚓", n: "무적 해병의 별", sub: "해병대 병과로 장성(준장+) 진급", headline: "상륙작전의 선봉 — 해병대 출신 장성 진급에 전 부대 환호" },
  { id: "ach_topgun_chief", ic: "🦅", n: "창공의 지배자", sub: "전투기 조종 병과로 4성 대장 달성", headline: "조종간으로 정상에 서다! 전투기 조종사 출신 4성 대장 등극" },
  { id: "ach_artillery_star", ic: "💥", n: "전장의 신(화력 장성)", sub: "포병·방공 병과로 장성(준장+) 진급", headline: "압도적 화력 지휘관 — 포병·방공 출신 장성 진급 쾌거" },
  { id: "ach_medal_collector", ic: "🏅", n: "만장(滿章)의 영예", sub: "한 캐릭터로 훈장·표창 6개 이상 수훈", headline: "가슴을 가득 채운 약장 — 6개 이상 훈장 수훈한 살아있는 전설" },
  { id: "ach_minister_appointed", ic: "💼", n: "문민 국방의 수장", sub: "예비역 장성으로 국방부장관/SecDef 취임", headline: "예비역 대장에서 문민 국방부장관으로 — 군정·군령 총괄 취임" },
  { id: "ach_president_elected", ic: "🏛️", n: "국군통수권자 등극", sub: "대통령 선거 승리 및 국군통수권자 취임", headline: "소위 임관에서 대통령까지 — 입지전적 국군통수권자 탄생" },
  { id: "ach_civil_master", ic: "🏆", n: "제2의 인생 완성", sub: "전역 후 민간 진로 3단계 핵심 결단 시나리오 완수", headline: "군문을 떠나 민간에서도 정점에 서다 — 제2의 인생 마스터" },
  { id: "ach_defense_mogul", ic: "🛡️", n: "방산·안보계의 거목", sub: "전역 후 방산 임원·사이버보안·싱크탱크 진로 확정", headline: "야전 지휘 경험 살려 국가 방산·사이버·안보 전략의 거목으로" },
];

export function unlockedAchievements() {
  try {
    const raw = JSON.parse(careerStorage.getItem(AK) || "{}");
    const norm = {};
    for (const [k, v] of Object.entries(raw || {})) {
      if (Array.isArray(v)) norm[k] = v;
      else if (v) norm[k] = [{ charId: "legacy", name: "이전 지휘관", date: String(v) }];
    }
    return norm;
  } catch { return {}; }
}

/** Allow every distinct character (charId) to earn and stack the same achievement independently (pure trophy collection, zero gameplay stat bonuses). */
export function unlockAchievement(id, { charId = "default", name = "지휘관" } = {}) {
  const meta = ACHIEVEMENTS.find((a) => a.id === id);
  if (!meta) return null;
  const map = unlockedAchievements();
  const list = Array.isArray(map[id]) ? map[id] : [];
  if (list.some((x) => x.charId === charId)) return null;
  list.push({ charId, name: name || "지휘관", date: new Date().toISOString().slice(0, 10) });
  map[id] = list;
  try { careerStorage.setItem(AK, JSON.stringify(map)); } catch {}
  return { ...meta, count: list.length };
}

export const ENDINGS = [
  { id: "kr_civil", nat: "kr", ic: "🏛️", n: "국방부 군무원 임용", sub: "KR 위관(소위~대위) 전역" },
  { id: "kr_corp", nat: "kr", ic: "🏢", n: "태극디펜스 임원 스카우트", sub: "KR 소령~중령 전역" },
  { id: "kr_prof", nat: "kr", ic: "🎓", n: "국방안보연구원 석좌위원", sub: "KR 대령 전역" },
  { id: "kr_gen", nat: "kr", ic: "⭐", n: "예비역 장성 · 방산협회장", sub: "KR 준장~중장 전역" },
  { id: "kr_marshal", nat: "kr", ic: "★", n: "대한민국 국군 원수 (5성)", sub: "KR 원수 특별진급 퀘스트 달성" },
  { id: "kr_min", nat: "kr", ic: "🎖️", n: "대한민국 국방부장관 명예 퇴임", sub: "KR 국방부 36주 목표 달성" },
  { id: "kr_pres", nat: "kr", ic: "🇰🇷", n: "대한민국 대통령 당선", sub: "KR 대통령 선거 승리" },
  { id: "us_civil", nat: "us", ic: "🏛️", n: "DoD GS-13 연방 문관", sub: "US O-1~O-3 전역" },
  { id: "us_corp", nat: "us", ic: "🏢", n: "Aegis Dynamics 부사장", sub: "US O-4~O-5 전역" },
  { id: "us_prof", nat: "us", ic: "🎓", n: "National War College 교수", sub: "US O-6 대령 전역" },
  { id: "us_marshal", nat: "us", ic: "★", n: "미합중국 5성 원수 (O-11)", sub: "US 5성 원수 특별진급 달성" },
  { id: "us_potus", nat: "us", ic: "🇺🇸", n: "미합중국 대통령 (POTUS)", sub: "US 538 선거인단 대선 승리" },
];

export function unlockedEndings() {
  try { return JSON.parse(careerStorage.getItem(EK) || "{}"); } catch { return {}; }
}

export function unlockEnding(id) {
  if (!ENDINGS.some((e) => e.id === id)) return false;
  const map = unlockedEndings();
  if (map[id]) return false;
  map[id] = new Date().toISOString().slice(0, 10);
  try { careerStorage.setItem(EK, JSON.stringify(map)); } catch {}
  return true;
}

export function ngBonuses() {
  const got = unlockedEndings();
  const cnt = Object.keys(got).filter((k) => ENDINGS.some((e) => e.id === k)).length;
  return {
    cnt,
    initRep: cnt >= 1 ? 5 : 0,
    xpMult: cnt >= 3 ? 1.1 : 1,
    crisisBonus: cnt >= 6 ? 8 : 0,
  };
}

export function trophyShelfHTML(grade, careerState = {}, us = false, isPres = false) {
  const items = [
    { ic: "🎖️", n: us ? "Command Pin (O-4+)" : "지휘관 휘장", sub: us ? "영관(O-4) 진급" : "영관(소령) 진급", ok: grade >= 3 },
    { ic: "🗡️", n: us ? "General Officer Pistol" : "삼정검 (三精劍)", sub: us ? "장성(O-7) 진급" : "장성(준장) 진급", ok: grade >= 6 },
    { ic: "🚩", n: us ? "Four-Star Personal Flag" : "4성 장성기", sub: us ? "4성(O-10) 대장 진급" : "대장(4성) 진급", ok: grade >= 9 },
    { ic: "🏛️", n: us ? "SecDef Commission Plaque" : "국방부장관 임명패", sub: us ? "펜타곤 국방장관 취임" : "국방부장관 취임", ok: !!careerState.minister },
    { ic: "🦅", n: us ? "POTUS Inaugural Seal" : "대통령 취임 기념패", sub: us ? "미국 대통령 당선" : "대한민국 대통령 당선", ok: !!isPres },
  ];
  const gotN = items.filter((x) => x.ok).length;
  return `<h3>🏛️ 지휘관 기념관 (${gotN} / ${items.length})</h3><div class="mi-md">${items.map((x) => `<div class="md${x.ok ? "" : " no"}" title="${x.sub}"><i style="font-style:normal;font-size:16px;display:flex;align-items:center;justify-content:center;background:none;border:0">${x.ic}</i><span>${x.n}</span><small>${x.ok ? "획득 완료" : x.sub}</small></div>`).join("")}</div>`;
}

export function endingsHTML(hallHTML = "") {
  const got = unlockedEndings(), ng = ngBonuses();
  const achGot = unlockedAchievements();
  const achCnt = Object.keys(achGot).filter((k) => ACHIEVEMENTS.some((a) => a.id === k) && achGot[k]?.length).length;
  const achTotal = Object.entries(achGot).filter(([k]) => ACHIEVEMENTS.some((a) => a.id === k)).reduce((s, [, list]) => s + (list?.length || 0), 0);
  const ngStrip = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px;font-size:11px">`
    + `<span style="padding:4px 8px;border-radius:6px;border:1px solid ${ng.cnt >= 1 ? "#8ef07a" : "rgba(180,200,210,.25)"};color:${ng.cnt >= 1 ? "#b8f7a8" : "#88a0b0"}">${ng.cnt >= 1 ? "✔" : "🔒"} 1종 달성: 초기 평판 +5</span>`
    + `<span style="padding:4px 8px;border-radius:6px;border:1px solid ${ng.cnt >= 3 ? "#8ef07a" : "rgba(180,200,210,.25)"};color:${ng.cnt >= 3 ? "#b8f7a8" : "#88a0b0"}">${ng.cnt >= 3 ? "✔" : "🔒"} 3종 달성: 직무 XP +10%</span>`
    + `<span style="padding:4px 8px;border-radius:6px;border:1px solid ${ng.cnt >= 6 ? "#8ef07a" : "rgba(180,200,210,.25)"};color:${ng.cnt >= 6 ? "#b8f7a8" : "#88a0b0"}">${ng.cnt >= 6 ? "✔" : "🔒"} 6종 달성: 위기 위임 승률 +8%</span>`
    + `</div>`;
  const achHTML = `<h3 style="margin-top:18px">🏅 특수 업적 · 명예 도전과제 (${achCnt} / ${ACHIEVEMENTS.length}종 · 누적 ${achTotal}회 · 순수 수집)</h3><div class="mi-md">${ACHIEVEMENTS.map((a) => {
    const list = achGot[a.id] || [];
    const names = list.slice(-3).map((x) => x.name).join(", ");
    const subTxt = list.length ? `✔ ${list.length}회 달성 (${names}${list.length > 3 ? " 외" : ""})` : a.sub;
    return `<div class="md${list.length ? "" : " no"}" title="${a.sub}"><i style="font-style:normal;font-size:15px;display:flex;align-items:center;justify-content:center;background:none;border:0">${a.ic}</i><span>${a.n}</span><small>${subTxt}</small></div>`;
  }).join("")}</div>`;
  return `${hallHTML}<h3>🏆 엔딩 컬렉션 도감 (${ng.cnt} / ${ENDINGS.length})</h3>${ngStrip}<div class="mi-md">${ENDINGS.map((e) => {
    const dt = got[e.id];
    return `<div class="md${dt ? "" : " no"}" title="${e.sub}"><i style="font-style:normal;font-size:15px;display:flex;align-items:center;justify-content:center;background:none;border:0">${e.ic}</i><span>${e.n}</span><small>${dt ? `${dt} 달성` : e.sub}</small></div>`;
  }).join("")}</div>${achHTML}`;
}
