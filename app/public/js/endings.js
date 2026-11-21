// 엔딩 컬렉션 도감 (한국·미국 12종 영구 수집, 2회차 초기화에도 보존)
const EK = "steeltide:endings";

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
  try { return JSON.parse(localStorage.getItem(EK) || "{}"); } catch { return {}; }
}

export function unlockEnding(id) {
  if (!ENDINGS.some((e) => e.id === id)) return false;
  const map = unlockedEndings();
  if (map[id]) return false;
  map[id] = new Date().toISOString().slice(0, 10);
  try { localStorage.setItem(EK, JSON.stringify(map)); } catch {}
  return true;
}

export function endingsHTML() {
  const got = unlockedEndings(), cnt = Object.keys(got).filter((k) => ENDINGS.some((e) => e.id === k)).length;
  return `<h3>🏆 엔딩 컬렉션 도감 (${cnt} / ${ENDINGS.length})</h3><div class="mi-md">${ENDINGS.map((e) => {
    const dt = got[e.id];
    return `<div class="md${dt ? "" : " no"}" title="${e.sub}"><i style="font-style:normal;font-size:15px;display:flex;align-items:center;justify-content:center;background:none;border:0">${e.ic}</i><span>${e.n}</span><small>${dt ? `${dt} 달성` : e.sub}</small></div>`;
  }).join("")}</div>`;
}
