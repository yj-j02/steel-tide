/* 정상회담 협상 미니게임 (H)
   손패 5장 중 3장을 차례로 내 상대 정상의 '회담 분위기'를 끌어올린다.
   상대국마다 의제 선호가 다르고, 관심사 2개만 미리 공개된다. 같은 유형을 연달아 내면 효과가 줄어든다.
   3라운드 뒤 분위기로 합의 수준이 정해진다: 포괄 합의(3) · 부분 합의(2) · 공동성명(1) · 결렬(0).
   모든 국가·정상 반응은 게임용 단순화이며 실제 외교 사안의 평가가 아니다. */

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const CARD_TYPES = {
  eco: { n: "경제 협력", icon: "💹", d: "교역·투자 확대" },
  supply: { n: "공급망", icon: "🔗", d: "반도체·배터리·핵심 광물" },
  sec: { n: "안보 공조", icon: "🛡️", d: "정보 공유·연합 훈련" },
  tech: { n: "기술·방산", icon: "🛰️", d: "공동 연구·방산 협력" },
  value: { n: "원칙·가치", icon: "⚖️", d: "인권·법치·역사 문제 제기" },
  people: { n: "인적 교류", icon: "🎓", d: "청년·관광·유학" },
  give: { n: "양보안", icon: "🤝", d: "예산·관세 일부 양보" },
};
/* 상대국 선호(−2~+3). 게임용 가정 */
const PREFS = {
  us: { sec: 3, tech: 2, supply: 2, give: 2, eco: 1, people: 1, value: 0 },
  jp: { people: 2, eco: 2, supply: 1, sec: 1, give: 1, tech: 0, value: -2 },
  cn: { eco: 3, supply: 1, people: 1, give: 1, tech: -1, sec: -2, value: -2 },
  nk: { eco: 2, give: 2, people: 1, sec: -1, tech: -1, value: -2, supply: 0 },
  eu: { value: 2, supply: 2, tech: 2, eco: 1, sec: 1, people: 1, give: 0 },
  au: { sec: 2, supply: 2, eco: 1, people: 1, tech: 1, give: 1, value: 1 },
  ph: { sec: 2, eco: 2, people: 1, give: 1, supply: 0, tech: 0, value: 0 },
  kr: { sec: 2, tech: 2, supply: 2, eco: 1, people: 1, give: 1, value: 0 },
};
/* 카드를 낼 때 우리 쪽에 생기는 부수 효과 (KR 대통령 지표 키) */
const SIDE = { give: { bud: -2 }, value: { ap: 1 }, eco: { eco: 1 }, sec: { sec: 1 } };
export const LEVELS = [["결렬", "회담이 성과 없이 끝났습니다."], ["공동성명", "원론적 공동성명만 냈습니다."], ["부분 합의", "핵심 의제 일부에 합의했습니다."], ["포괄 합의", "포괄적 합의문에 서명했습니다."]];

function hand(rng) {
  const keys = Object.keys(CARD_TYPES);
  const out = [];
  while (out.length < 5) { const k = keys[Math.floor(rng() * keys.length)]; if (out.filter((x) => x === k).length < 2) out.push(k); }
  return out;
}
/** 순수 로직 (시뮬레이션 가능): 분위기 계산 */
export function playCard(state, type, rng = Math.random) {
  const pref = (PREFS[state.nation] || PREFS.us)[type] ?? 0;
  const repeat = state.played.length && state.played[state.played.length - 1] === type ? -4 : 0;
  const delta = Math.round(pref * 6 + repeat + (rng() * 6 - 3));
  state.mood = Math.max(0, Math.min(100, state.mood + delta));
  state.played.push(type);
  return delta;
}
export const levelOf = (mood) => (mood >= 75 ? 3 : mood >= 55 ? 2 : mood >= 35 ? 1 : 0);
export function sideFx(played) {
  const fx = {};
  for (const t of played) for (const [k, v] of Object.entries(SIDE[t] || {})) fx[k] = (fx[k] || 0) + v;
  return fx;
}
function react(delta, us) {
  if (delta >= 14) return us ? "상대 정상이 크게 고개를 끄덕입니다. \"That's exactly what we needed.\"" : "상대 정상이 메모를 멈추고 고개를 끄덕입니다. \"바로 그 얘기를 기다렸습니다.\"";
  if (delta >= 5) return "상대 대표단이 긍정적으로 반응합니다.";
  if (delta >= -2) return "상대 정상이 말없이 다음 의제를 기다립니다.";
  if (delta >= -9) return "상대 대표단의 표정이 굳습니다. 통역이 잠시 멈칫합니다.";
  return "상대 정상이 \"그 문제는 오늘 의제가 아니다\"라며 선을 긋습니다.";
}

/**
 * 미니게임 열기. onDone({ level, label, fx, played, mood })
 * nation: 선호표 키, nationName: 표시 이름, topic: 회담 주제, rel: 현재 관계(0~100)
 */
export function openSummitGame({ nation = "us", nationName = "", topic = "", rel = 50, us = false, onDone } = {}) {
  if (typeof document === "undefined") return;
  const rng = Math.random;
  const st = { nation, mood: Math.round(45 + (rel - 50) / 2), played: [], hand: hand(rng), round: 0, log: [] };
  const P = PREFS[nation] || PREFS.us;
  const hints = Object.entries(P).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => CARD_TYPES[k].n);
  document.querySelector("#summitOv")?.remove();
  const ov = document.createElement("div");
  ov.id = "summitOv"; ov.className = "hr-ov sm-ov";
  document.body.appendChild(ov);
  const moodBar = () => `<div class="sm-mood"><span>회담 분위기</span><i><em style="width:${st.mood}%"></em><b style="left:35%"></b><b style="left:55%"></b><b style="left:75%"></b></i><strong>${st.mood}</strong><small>${LEVELS[levelOf(st.mood)][0]} 예상</small></div>`;
  const render = () => {
    const done = st.round >= 3;
    ov.innerHTML = `<div class="hr-doc mn-paper sm-doc" role="dialog" aria-label="정상회담 협상">
      <div class="dh"><div class="dt"><small>${us ? "BILATERAL SUMMIT" : "정상회담"} · ${esc(nationName)} · ${done ? "결과" : `${st.round + 1}/3 라운드`}</small><b>${esc(topic || "정상회담")}</b><span>상대 관심사(사전 브리핑): ${hints.map(esc).join(" · ")}</span></div></div>
      ${moodBar()}
      <div class="sm-log">${st.log.map((l) => `<p>${l}</p>`).join("") || `<p>의제 카드를 하나 골라 테이블에 올리세요. 같은 유형을 연달아 내면 효과가 줄어듭니다.</p>`}</div>
      ${done ? "" : `<div class="sm-hand">${st.hand.map((k, i) => `<button type="button" class="sm-card" data-sm="${i}"><span>${CARD_TYPES[k].icon}</span><b>${CARD_TYPES[k].n}</b><small>${CARD_TYPES[k].d}${SIDE[k]?.bud ? " · 예산 −2조" : ""}</small></button>`).join("")}</div>`}
      ${done ? `<button type="button" class="hr-go" data-sm="done">${LEVELS[levelOf(st.mood)][0]} — 회담 종료 ▶</button>` : ""}
    </div>`;
    ov.querySelector(done ? "[data-sm=done]" : ".sm-card")?.focus();
  };
  ov.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sm]"); if (!b) return;
    if (b.dataset.sm === "done") {
      const level = levelOf(st.mood);
      ov.remove();
      onDone?.({ level, label: LEVELS[level][0], text: LEVELS[level][1], fx: sideFx(st.played), played: st.played, mood: st.mood });
      return;
    }
    const k = st.hand.splice(Number(b.dataset.sm), 1)[0];
    const d = playCard(st, k, rng);
    st.log.push(`<b>${CARD_TYPES[k].icon} ${CARD_TYPES[k].n}</b> — ${esc(react(d, us))} <em class="${d >= 0 ? "sm-up" : "sm-dn"}">${d >= 0 ? "+" : ""}${d}</em>`);
    st.round += 1;
    render();
  });
  render();
}
