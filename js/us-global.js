import { WORLD, wxy } from "./geo-maps.js";
// White House Global Situation Room: 6 World Theaters & Presidential Foreign/Economic/Security Directives.

export const STATE_NAMES = {
  WA: "Washington", OR: "Oregon", CA: "California", NV: "Nevada", ID: "Idaho", MT: "Montana", WY: "Wyoming",
  UT: "Utah", AZ: "Arizona", CO: "Colorado", NM: "New Mexico", ND: "North Dakota", SD: "South Dakota",
  NE: "Nebraska", KS: "Kansas", OK: "Oklahoma", TX: "Texas", MN: "Minnesota", IA: "Iowa", MO: "Missouri",
  AR: "Arkansas", LA: "Louisiana", WI: "Wisconsin", IL: "Illinois", MI: "Michigan", IN: "Indiana", OH: "Ohio",
  KY: "Kentucky", TN: "Tennessee", MS: "Mississippi", AL: "Alabama", GA: "Georgia", FL: "Florida", SC: "South Carolina",
  NC: "North Carolina", VA: "Virginia", WV: "West Virginia", MD: "Maryland", DE: "Delaware", PA: "Pennsylvania",
  NJ: "New Jersey", NY: "New York", CT: "Connecticut", RI: "Rhode Island", MA: "Massachusetts", VT: "Vermont",
  NH: "New Hampshire", ME: "Maine", AK: "Alaska", HI: "Hawaii", DC: "Washington, D.C.",
};

export const SWING_STATES = ["PA", "MI", "WI", "GA", "NC", "AZ", "NV"];

export const WORLD_THEATERS = [
  {
    id: "indopac", icon: "🌏", name: "인도-태평양", en: "INDOPACOM", lon: 128, lat: 22,
    sub: "대만해협 · 한미일 동맹 · 남중국해",
    actions: [
      { l: "제7함대 항모전단 전진 배치 · 항행의 자유", d: "전구 안보 +7 · 동맹 신뢰 +4 · 경제 −2", world: 4, sec: 7, econ: -2, trust: 2, log: "인도-태평양 항모전단 전진 배치로 대만해협 억제력 강화" },
      { l: "캠프 데이비드 한·미·일 정상회담 개최", d: "동맹 신뢰 +7 · 전구 안보 +4 · 지지율 +3", world: 7, sec: 4, econ: 1, trust: 3, log: "캠프 데이비드 한·미·일 정상회담 성료 — 인도-태평양 안보 축 공고화" },
      { l: "인도-태평양 반도체·핵심광물 공급망 협정", d: "미국 경제 +6 · 동맹 신뢰 +5", world: 5, sec: 1, econ: 6, trust: 2, log: "인도-태평양 반도체·배터리 공급망 동맹 체결" },
    ],
  },
  {
    id: "europe", icon: "🇪🇺", name: "유럽 · NATO", en: "EUCOM / NATO", lon: 24, lat: 50,
    sub: "NATO 동부전선 · 방위비 · 대서양 동맹",
    actions: [
      { l: "NATO 동부전선 미 육군 기갑여단 순환 증원", d: "전구 안보 +6 · 동맹 신뢰 +6 · 경제 −3", world: 6, sec: 6, econ: -3, trust: 2, log: "NATO 동부전선 미군 증원 — 유럽 집단방위 공약 재확인" },
      { l: "동맹국 GDP 2.5% 방위비 분담 정상 압박", d: "미국 경제 +5 · 지지율 +3 · 동맹 신뢰 −3", world: -3, sec: 3, econ: 5, trust: 3, log: "NATO 정상회의서 유럽 방위비 분담 대폭 증액 합의 도출" },
      { l: "대서양 에너지·LNG 장기 공급 및 외교 중재", d: "동맹 신뢰 +5 · 미국 경제 +4 · 지지율 +2", world: 5, sec: 2, econ: 4, trust: 2, log: "미-EU 에너지 안보 협정 및 대서양 외교 안정화" },
    ],
  },
  {
    id: "mideast", icon: "🕌", name: "중동 · 홍해", en: "CENTCOM", lon: 46, lat: 22,
    sub: "호르무즈·홍해 호송 · 휴전 중재 · 유가",
    actions: [
      { l: "홍해·호르무즈 다국적 해군 호송작전 지휘", d: "전구 안보 +6 · 미국 경제 +4 · 지지율 +2", world: 4, sec: 6, econ: 4, trust: 2, log: "다국적 해상 호송작전으로 홍해·호르무즈 해상교통로 안전 확보" },
      { l: "백악관 중동 평화 특사 파견 · 휴전 중재", d: "동맹 신뢰 +7 · 지지율 +4", world: 7, sec: 3, econ: 1, trust: 4, log: "백악관 주도로 중동 주요국 단계적 휴전 및 인질 석방 중재" },
      { l: "전략비축유(SPR) 방출 및 산유국 증산 협상", d: "미국 경제 +7 · 지지율 +3", world: 2, sec: 0, econ: 7, trust: 3, log: "국제 유가 급등 차단 — 미국 내 물가 및 에너지 시장 안정" },
    ],
  },
  {
    id: "americas", icon: "🌎", name: "미주 · 본토", en: "NORTHCOM", lon: -98, lat: 40,
    sub: "USMCA · 국경 안보 · 제조업 리쇼어링",
    actions: [
      { l: "첨단 제조업·반도체 본토 리쇼어링 세제 지원", d: "미국 경제 +7 · 지지율 +4", world: 1, sec: 2, econ: 7, trust: 4, log: "미국 본토 첨단 반도체·방산 제조 클러스터 대규모 투자 유치" },
      { l: "북미 항공우주방위(NORAD) 현대화 및 국경 안보", d: "전구 안보 +6 · 지지율 +3", world: 2, sec: 6, econ: -1, trust: 3, log: "NORAD 북극·영공 방어망 현대화 및 국경 통제 강화" },
      { l: "미주 경제번영 파트너십(APEP) 정상회의", d: "동맹 신뢰 +5 · 미국 경제 +4", world: 5, sec: 1, econ: 4, trust: 2, log: "미주 동맹국 공급망·이민 협력 협정 체결" },
    ],
  },
  {
    id: "econ", icon: "💵", name: "글로벌 경제 · G7", en: "G7 / TRADE", lon: -32, lat: 22,
    sub: "달러 패권 · 관세 협상 · AI 수출통제",
    actions: [
      { l: "G7 정상회의 주도 · AI·양자컴퓨팅 국제 규범 선도", d: "동맹 신뢰 +6 · 미국 경제 +5 · 지지율 +2", world: 6, sec: 2, econ: 5, trust: 2, log: "G7 정상회의서 미국 주도 첨단 AI·기술 표준 채택" },
      { l: "핵심 전략산업 보호 관세 및 공정무역 협상", d: "미국 경제 +6 · 지지율 +4 · 동맹 신뢰 −2", world: -2, sec: 1, econ: 6, trust: 4, log: "전략 산업 보호 관세 발효 — 국내 제조업 지지율 상승" },
      { l: "연준(Fed)·재무부 달러 유동성 안정 공조", d: "미국 경제 +7 · 동맹 신뢰 +3", world: 3, sec: 0, econ: 7, trust: 3, log: "글로벌 금융 변동성 차단 및 달러 기축통화 신뢰 수호" },
    ],
  },
  {
    id: "space", icon: "🛰️", name: "우주 · 사이버", en: "USSF / CYBER", lon: 10, lat: 76,
    sub: "저궤도 방어망 · 핵우산 · 사이버전",
    actions: [
      { l: "미 우주군(USSF) 저궤도 미사일 추적 위성망 확충", d: "전구 안보 +8 · 경제 −2 · 지지율 +2", world: 3, sec: 8, econ: -2, trust: 2, log: "미 우주군 차세대 극초음속 미사일 조기경보 위성망 배치" },
      { l: "파이브 아이즈·한일 합동 사이버 방어 사령부 강화", d: "전구 안보 +6 · 동맹 신뢰 +6", world: 6, sec: 6, econ: 0, trust: 2, log: "동맹국 핵심 인프라 방어용 합동 사이버 대응망 출범" },
      { l: "전략핵 3축(B-21·콜럼비아급) 현대화 예산 서명", d: "전구 안보 +7 · 지지율 +2 · 경제 −3", world: 2, sec: 7, econ: -3, trust: 2, log: "미 전략핵 3축 현대화 프로그램 최종 승인" },
    ],
  },
];

export function ensureGlobalState(s) {
  if (s.world == null) s.world = 68;
  if (s.econ == null) s.econ = 66;
  if (s.sec == null) s.sec = 72;
  if (!s.theaters) {
    s.theaters = { indopac: 62, europe: 66, mideast: 54, americas: 74, econ: 68, space: 72 };
  }
  if (!s.selTheater) s.selTheater = "indopac";
  return s;
}

export function worldMapHTML(s) {
  ensureGlobalState(s);
  const sel = WORLD_THEATERS.find((t) => t.id === s.selTheater) || WORLD_THEATERS[0];
  const usedThisQ = s.globalActQ === `${s.term}:${s.quarter}`;
  const stColor = (v) => (v >= 70 ? "#3fb97a" : v >= 50 ? "#e8b948" : "#e85d5d");
  const stLabel = (v) => (v >= 70 ? "안정" : v >= 50 ? "긴장" : "위기");
  const [dcX, dcY] = wxy(-77, 38.9);
  /* 경위선: 30도 간격 */
  let grid = "";
  for (let lon = -150; lon <= 150; lon += 30) { const [x] = wxy(lon, 0); grid += `<line x1="${x}" y1="0" x2="${x}" y2="400"/>`; }
  for (let lat = -30; lat <= 60; lat += 30) { const [, y] = wxy(0, lat); grid += `<line x1="0" y1="${y}" x2="1000" y2="${y}"/>`; }
  /* 전구별 국가 색: 안정도에 따라 */
  const regions = ["americas", "europe", "mideast", "indopac"].map((id) => {
    const v = s.theaters[id] ?? 65, on = id === sel.id;
    return `<path d="${WORLD[id]}" fill="${stColor(v)}" fill-opacity="${on ? 0.55 : 0.28}" stroke="${on ? "#fff" : "none"}" stroke-width="${on ? 0.8 : 0}" data-usth="${id}" class="wh-reg"/>`;
  }).join("");
  /* 워싱턴 → 각 전구 지휘선 */
  const arcs = WORLD_THEATERS.filter((t) => t.id !== "americas").map((t) => {
    const [x, y] = wxy(t.lon, t.lat), mx = (dcX + x) / 2, my = Math.min(dcY, y) - 40;
    const on = t.id === sel.id;
    return `<path d="M${dcX.toFixed(0)},${dcY.toFixed(0)} Q${mx.toFixed(0)},${my.toFixed(0)} ${x.toFixed(0)},${y.toFixed(0)}" fill="none" stroke="${on ? "#ffd166" : "rgba(150,200,240,.35)"}" stroke-width="${on ? 1.6 : 1}" stroke-dasharray="4 4"/>`;
  }).join("");
  const pins = WORLD_THEATERS.map((t) => {
    const v = s.theaters[t.id] ?? 65;
    const on = t.id === sel.id;
    const [x, y] = wxy(t.lon, t.lat);
    return `<button class="wh-pin${on ? " on" : ""}" data-usth="${t.id}" style="left:${(x / 10).toFixed(1)}%;top:${(y / 4).toFixed(1)}%;border-color:${stColor(v)}" title="${t.name} (${t.en}) · 안정도 ${v}%">
      <span>${t.icon}</span><b>${t.name}</b><em style="color:${stColor(v)}">${v}% · ${stLabel(v)}</em>
    </button>`;
  }).join("");

  const acts = sel.actions.map((a, i) => `<button class="us-ch" data-uspres="glob:${sel.id}:${i}" ${usedThisQ ? "disabled" : ""}><b>${a.l}</b><small style="display:block;color:#5b6773;font-size:11px;margin-top:2px">${a.d}</small></button>`).join("");

  return `<div class="mn-card wh-sitroom">
    <div class="mn-h">🌐 백악관 상황실 (White House Situation Room) <small>${usedThisQ ? "이번 분기 글로벌 지침 발령 완료" : "전 세계 6대 전구 중 1곳을 선택해 대통령 지침 발령"}</small></div>
    <div class="wh-world">
      <svg viewBox="0 0 1000 400" class="wh-svg" aria-hidden="true">
        <defs><radialGradient id="whOcean" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#10263a"/><stop offset="1" stop-color="#060f19"/></radialGradient></defs>
        <rect width="1000" height="400" fill="url(#whOcean)"/>
        <g stroke="rgba(120,180,235,.10)" stroke-width="1">${grid}</g>
        <path d="${WORLD.land}" fill="#22384a"/>
        ${regions}
        <path d="${WORLD.borders}" fill="none" stroke="rgba(6,15,25,.85)" stroke-width=".6"/>
        <g>${arcs}</g>
        <circle cx="${dcX.toFixed(0)}" cy="${dcY.toFixed(0)}" r="4" fill="#ffd166" stroke="#fff" stroke-width="1"/>
        <text x="${(dcX + 7).toFixed(0)}" y="${(dcY + 14).toFixed(0)}" font-size="10" fill="#ffd166" font-weight="700">백악관</text>
      </svg>
      ${pins}
    </div>
    <div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:rgba(12,24,38,.72);border:1px solid rgba(93,168,232,.3)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <b style="color:#fff;font-size:13.5px">${sel.icon} ${sel.name} (${sel.en}) — ${sel.sub}</b>
        <span style="font-size:11.5px;font-weight:700;color:${stColor(s.theaters[sel.id] ?? 65)}">지역 안정도 ${s.theaters[sel.id] ?? 65}% (${stLabel(s.theaters[sel.id] ?? 65)})</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">${acts}</div>
    </div>
  </div>`;
}
