/**
 * 기존 콘텐츠 연출·시각화·타격감 강화 모듈 (fx-ui.js)
 * 1) 결재 도장(Stamp) & 상단 스탯 플로팅 피드백 (+N ↑ / -N ↓)
 * 2) 이벤트 선택 결과 상황 시각화 카드 (배경 스틸 + 작전 배너)
 * 3) 국방일보 / Pentagon Times 속보 호외 신문 1면 연출
 * 4) 직속 상관·동기 1줄 즉각 반응 말풍선 생성
 * 5) 집무실 안보 긴장도·계급 연동 분위기 클래스
 */

const playVO = (...args) => globalThis.__playVO?.(...args);

function injectFxStyles() {
  if (document.getElementById("fx-ui-style")) return;
  const s = document.createElement("style");
  s.id = "fx-ui-style";
  s.textContent = `
    .fx-stamp { position:absolute; top:14px; right:16px; z-index:8; padding:4px 10px; border:2.5px solid #e64c3c;
      color:#ff6e5e; font-weight:900; font-size:13px; letter-spacing:2px; border-radius:4px;
      background:rgba(28,8,8,.78); transform:rotate(-11deg) scale(1.45); opacity:0; pointer-events:none;
      box-shadow:0 0 12px rgba(230,76,60,.45); animation:fxStampIn .24s cubic-bezier(.2,.9,.3,1) forwards; }
    @keyframes fxStampIn { to { transform:rotate(-11deg) scale(1); opacity:1; } }

    .fx-float-wrap { position:fixed; top:68px; right:26px; z-index:140; display:flex; flex-direction:column; gap:5px; pointer-events:none; }
    .fx-float { padding:5px 11px; border-radius:99px; font-weight:800; font-size:12.5px; background:rgba(12,20,30,.92);
      border:1px solid rgba(255,255,255,.18); box-shadow:0 6px 18px rgba(0,0,0,.4);
      animation:fxFloatUp 1.55s ease forwards; white-space:nowrap; }
    .fx-float.up { color:#8ef07a; border-color:rgba(142,240,122,.45); }
    .fx-float.dn { color:#ff8e80; border-color:rgba(255,142,128,.45); }
    .fx-float.xp { color:#f5d778; border-color:rgba(245,215,120,.45); }
    @keyframes fxFloatUp { 0%{opacity:0;transform:translateY(10px) scale(.95)} 15%{opacity:1;transform:translateY(0) scale(1)} 82%{opacity:1;transform:translateY(-10px)} 100%{opacity:0;transform:translateY(-22px)} }

    #fxSceneCard { position:fixed; right:22px; bottom:22px; z-index:132; width:min(410px,92vw); border-radius:11px;
      overflow:hidden; border:1.5px solid rgba(242,202,92,.65); background:#0c141f;
      box-shadow:0 16px 40px rgba(0,0,0,.62); color:#eef5fb; cursor:pointer;
      animation:fxSlideIn .28s cubic-bezier(.2,.85,.3,1); }
    @keyframes fxSlideIn { from { opacity:0; transform:translateY(18px) scale(.97); } to { opacity:1; transform:none; } }
    .fx-sc-img { height:128px; background-size:cover; background-position:center; position:relative; display:flex; align-items:flex-end; padding:10px 13px; }
    .fx-sc-img::before { content:""; position:absolute; inset:0; background:linear-gradient(180deg, rgba(6,10,16,.22), rgba(8,14,22,.94)); }
    .fx-sc-img > div { position:relative; z-index:2; width:100%; }
    .fx-sc-cat { display:inline-block; font-size:10.5px; font-weight:800; letter-spacing:1px; padding:2px 8px; border-radius:99px;
      background:rgba(242,202,92,.22); color:#ffe082; border:1px solid rgba(242,202,92,.5); margin-bottom:4px; }
    .fx-sc-title { font-size:14.5px; font-weight:800; color:#fff; text-shadow:0 1px 6px rgba(0,0,0,.8); }
    .fx-sc-body { padding:11px 14px 12px; font-size:12.5px; line-height:1.52; color:#d2e2f0; }
    .fx-sc-pills { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
    .fx-sc-pill { font-size:11px; padding:2px 8px; border-radius:99px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.15); font-weight:700; }
    .fx-sc-pill.g { color:#8ef07a; border-color:rgba(142,240,122,.35); }
    .fx-sc-pill.r { color:#ff9082; border-color:rgba(255,144,130,.35); }
    .fx-sc-pill.y { color:#f5d778; border-color:rgba(245,215,120,.35); }
    .fx-sc-foot { font-size:10.5px; color:#8ba6ba; margin-top:6px; text-align:right; }

    #fxPaperM { position:fixed; inset:0; z-index:145; display:none; align-items:center; justify-content:center; padding:18px;
      background:rgba(4,8,14,.84); backdrop-filter:blur(3px); }
    #fxPaperM.on { display:flex; animation:fxFadeIn .25s ease; }
    @keyframes fxFadeIn { from { opacity:0; } to { opacity:1; } }
    .fx-paper { width:min(580px,94vw); background:#f4ecd8; color:#181613; border:3px double #2b2620; border-radius:4px;
      box-shadow:0 22px 60px rgba(0,0,0,.75); padding:20px 26px 22px; font-family:"Noto Serif KR", Georgia, serif; position:relative; }
    .fx-paper-top { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #1f1b16; padding-bottom:6px; font-size:11px; font-weight:700; letter-spacing:1px; color:#4b4238; }
    .fx-paper-mast { text-align:center; font-size:28px; font-weight:900; letter-spacing:4px; padding:10px 0 6px; border-bottom:3px double #1f1b16; }
    .fx-paper-extra { display:inline-block; background:#b82020; color:#fff; font-size:11px; font-weight:900; padding:2px 10px; letter-spacing:2px; margin:10px 0 6px; font-family:sans-serif; }
    .fx-paper h2 { margin:0 0 8px; font-size:22px; line-height:1.32; color:#111; font-weight:900; }
    .fx-paper p { margin:0 0 14px; font-size:13.5px; line-height:1.62; color:#2b2722; font-family:"Noto Sans KR", sans-serif; }
    .fx-paper-meta { display:flex; justify-content:space-between; align-items:center; border-top:1px solid #8a7f70; padding-top:10px; font-family:"Noto Sans KR", sans-serif; font-size:12px; color:#4a433a; }
    .fx-paper button { background:#1f2833; color:#f7e4ad; border:1px solid #594b34; padding:8px 18px; border-radius:4px; font-weight:800; cursor:pointer; font-size:12.5px; }
    .fx-paper button:hover { background:#2d3b4c; }

    .fx-bubble { margin-top:7px; padding:7px 10px; border-radius:8px; background:rgba(28,48,68,.55); border:1px solid rgba(114,172,232,.38);
      font-size:11.5px; line-height:1.45; color:#dcecf8; position:relative; animation:fxFadeIn .3s ease; }
    .fx-bubble b { color:#ffe082; font-size:11px; display:block; margin-bottom:2px; }
    .dm-shell.mood-alert { box-shadow:0 0 0 1.5px rgba(255,95,82,.5), 0 0 28px rgba(255,82,66,.16); border-radius:10px; }
    .fx-defcon { display:inline-flex; align-items:center; gap:5px; padding:2px 9px; border-radius:99px; font-size:11px; font-weight:800;
      background:rgba(220,53,45,.22); color:#ff8f82; border:1px solid rgba(255,107,87,.55); animation:fxPulse 1.8s infinite; }
    @keyframes fxPulse { 0%,100%{opacity:1} 50%{opacity:.58} }

    #fxMinOfferM { position:fixed; inset:0; z-index:148; display:none; align-items:center; justify-content:center; padding:18px;
      background:radial-gradient(ellipse at center, rgba(16,28,46,.92), rgba(4,8,14,.97)); backdrop-filter:blur(4px); }
    #fxMinOfferM.on { display:flex; animation:fxFadeIn .3s ease; }
    .fx-mo-card { width:min(540px,94vw); background:linear-gradient(160deg,#101d30,#09111c); border:2px solid #f2ca5c; border-radius:14px;
      box-shadow:0 0 50px rgba(242,202,92,.28), 0 24px 60px rgba(0,0,0,.78); padding:26px 28px; text-align:center; color:#eef5fc;
      animation:fxMoUp .45s cubic-bezier(.18,.88,.3,1); }
    @keyframes fxMoUp { from { opacity:0; transform:translateY(28px) scale(.94); } to { opacity:1; transform:none; } }
    .fx-mo-seal { width:72px; height:72px; margin:0 auto 12px; border-radius:50%; background:radial-gradient(circle,#ffe38e,#c9942a);
      display:flex; align-items:center; justify-content:center; font-size:34px; color:#131b26;
      box-shadow:0 0 28px rgba(242,202,92,.55); animation:fxMoSeal .55s cubic-bezier(.2,1.15,.35,1); }
    @keyframes fxMoSeal { 0%{transform:scale(.4) rotate(-18deg);opacity:0} 70%{transform:scale(1.08) rotate(4deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
    .fx-mo-kicker { font-size:11px; font-weight:800; letter-spacing:2.4px; color:#f2ca5c; margin-bottom:6px; }
    .fx-mo-card h2 { margin:0 0 10px; font-size:22px; color:#fff; }
    .fx-mo-card p { margin:0 0 18px; font-size:13.5px; line-height:1.68; color:#d2e2f0; }
    .fx-mo-btns { display:flex; flex-direction:column; gap:9px; }
    .fx-mo-accept { background:linear-gradient(90deg,#c98a1c,#f0c44c); color:#101822; border:none; border-radius:8px; padding:12px 16px;
      font-weight:900; font-size:14px; cursor:pointer; box-shadow:0 6px 20px rgba(240,196,76,.32); }
    .fx-mo-accept:hover { filter:brightness(1.08); }
    .fx-mo-decline { background:rgba(255,255,255,.06); color:#b8cfe0; border:1px solid rgba(255,255,255,.18); border-radius:8px;
      padding:10px 14px; font-size:12.5px; cursor:pointer; }
    .fx-mo-decline:hover { background:rgba(255,255,255,.12); color:#fff; }
  `;
  document.head.appendChild(s);
}

/** Pick an atmospheric background image & category label matching an event title/text. */
function pickSceneVisual({ title = "", text = "", nation = "kr", service = "army", kind = "duty" }) {
  const hay = `${title} ${text}`.toLowerCase();
  const us = nation === "us";
  const svcBg = us
    ? (service === "army" ? "img/bg/us_bg_army.jpg" : service === "air" ? "img/bg/us_bg_air.jpg" : "img/bg/us_bg_navy.jpg")
    : (service === "army" ? "img/bg/kr_bg_army.jpg" : service === "air" ? "img/bg/kr_bg_air.jpg" : "img/bg/kr_bg_navy.jpg");

  if (kind === "warroom" || /도발|미사일|침투|교전|요격|위기|경보|발진|포격|nll|kadiz|adiz|scramble/i.test(hay)) {
    return { bg: us ? "img/bg/warroom_us.jpg" : "img/bg/warroom_kr.jpg", cat: "🚨 안보 위기 · 작전 상황" };
  }
  if (/청문회|국회|의회|감찰|언론|기자|보도|감사|비리|사고/i.test(hay)) {
    return { bg: us ? "img/bg/us_capitol_hearing.jpg" : "img/bg/press_briefing.jpg", cat: "🎙️ 언론 · 의회 · 감찰 대응" };
  }
  if (/외교|연합|동맹|정상|주외무관|협정|방문|회의|nsc|백악관|펜타곤/i.test(hay)) {
    return { bg: us ? "img/bg/us_pentagon_office.jpg" : "img/bg/ministry_office.jpg", cat: "🌐 전략 · 연합 · 정책 조율" };
  }
  if (kind === "rival" || /동기|인맥|공조|추천|브리핑/i.test(hay)) {
    return { bg: svcBg, cat: "🤝 동기 · 지휘부 인맥" };
  }
  if (kind === "arc") {
    return { bg: svcBg, cat: "📖 시그니처 스토리 전개" };
  }
  return { bg: svcBg, cat: "📋 현장 지휘 · 결재 완료" };
}

/** Stamp a card visually with a red official seal. */
export function stampCard(el, text = "결재 완료") {
  injectFxStyles();
  if (!el) return;
  const pos = getComputedStyle(el).position;
  if (pos === "static") el.style.position = "relative";
  const st = document.createElement("div");
  st.className = "fx-stamp";
  st.textContent = text;
  el.appendChild(st);
}

/** Spawn floating stat delta pills at top-right. */
export function floatStatDeltas({ morale = 0, rep = 0, tension = 0, xp = 0 } = {}) {
  injectFxStyles();
  const items = [];
  if (xp > 0) items.push({ t: `+${xp.toLocaleString()} XP`, cls: "xp" });
  if (morale) items.push({ t: `사기 ${morale > 0 ? `+${morale} ↑` : `${morale} ↓`}`, cls: morale > 0 ? "up" : "dn" });
  if (rep) items.push({ t: `평판 ${rep > 0 ? `+${rep} ↑` : `${rep} ↓`}`, cls: rep > 0 ? "up" : "dn" });
  if (tension) items.push({ t: `긴장도 ${tension > 0 ? `+${tension} ↑` : `${tension} ↓`}`, cls: tension > 0 ? "dn" : "up" });
  if (!items.length) return;

  let wrap = document.querySelector(".fx-float-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "fx-float-wrap";
    document.body.appendChild(wrap);
  }
  items.forEach((it, i) => {
    setTimeout(() => {
      const d = document.createElement("div");
      d.className = `fx-float ${it.cls}`;
      d.textContent = it.t;
      wrap.appendChild(d);
      setTimeout(() => d.remove(), 1600);
    }, i * 95);
  });
}

let sceneTimer = null;
/** Show a non-blocking visual scene card summarizing the outcome of an event choice. */
export function showEventScene({ title, text, nation = "kr", service = "army", kind = "duty", customBg = null, score = null, xp = 0, dMorale = 0, dRep = 0, dTension = 0 }) {
  injectFxStyles();
  const prev = document.getElementById("fxSceneCard");
  if (prev) prev.remove();
  if (sceneTimer) clearTimeout(sceneTimer);

  const vis = pickSceneVisual({ title, text, nation, service, kind });
  if (customBg) vis.bg = customBg;
  const pills = [];
  if (score != null) pills.push(`<span class="fx-sc-pill ${score >= 85 ? "g" : score < 65 ? "r" : "y"}">평정 ${score}점</span>`);
  if (xp > 0) pills.push(`<span class="fx-sc-pill y">+${xp.toLocaleString()} XP</span>`);
  if (dMorale) pills.push(`<span class="fx-sc-pill ${dMorale > 0 ? "g" : "r"}">사기 ${dMorale > 0 ? `+${dMorale}` : dMorale}</span>`);
  if (dRep) pills.push(`<span class="fx-sc-pill ${dRep > 0 ? "g" : "r"}">평판 ${dRep > 0 ? `+${dRep}` : dRep}</span>`);
  if (dTension) pills.push(`<span class="fx-sc-pill ${dTension > 0 ? "r" : "g"}">긴장도 ${dTension > 0 ? `+${dTension}` : dTension}</span>`);

  const card = document.createElement("div");
  card.id = "fxSceneCard";
  card.innerHTML = `
    <div class="fx-sc-img" style="background-image:url('${vis.bg}')">
      <div>
        <span class="fx-sc-cat">${vis.cat}</span>
        <div class="fx-sc-title">${title}</div>
      </div>
    </div>
    <div class="fx-sc-body">
      <div>${text}</div>
      ${pills.length ? `<div class="fx-sc-pills">${pills.join("")}</div>` : ""}
      <div class="fx-sc-foot">클릭하면 즉시 닫힘</div>
    </div>`;
  card.onclick = () => { card.remove(); if (sceneTimer) clearTimeout(sceneTimer); };
  document.body.appendChild(card);
  sceneTimer = setTimeout(() => { card.remove(); }, 3800);
}

/** Show a classic front-page breaking newspaper modal for milestone moments. */
export function showBreakingPaper({ nation = "kr", headline, body, dateline = "", byline = "" }) {
  injectFxStyles();
  let el = document.getElementById("fxPaperM");
  if (!el) {
    el = document.createElement("div");
    el.id = "fxPaperM";
    document.body.appendChild(el);
  }
  const us = nation === "us";
  el.innerHTML = `<div class="fx-paper">
    <div class="fx-paper-top"><span>${us ? "WASHINGTON · DEFENSE DESK" : "서울 · 국방부 출입기자단"}</span><span>${dateline}</span></div>
    <div class="fx-paper-mast">${us ? "THE PENTAGON TIMES" : "국 방 일 보"}</div>
    <span class="fx-paper-extra">${us ? "SPECIAL EDITION · 호외" : "호 외 · 긴급 속보"}</span>
    <h2>${headline}</h2>
    <p>${body}</p>
    <div class="fx-paper-meta"><span>${byline || (us ? "Defense Affairs Correspondent" : "국방안보 특별취재팀")}</span><button id="fxPaperOk">확인 (Enter)</button></div>
  </div>`;
  el.classList.add("on");
  const onKey = (e) => { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); close(); } };
  const close = () => { el.classList.remove("on"); window.removeEventListener("keydown", onKey); };
  window.addEventListener("keydown", onKey);
  el.querySelector("#fxPaperOk").onclick = close;
  el.onclick = (e) => { if (e.target === el) close(); };
}

/** Generate an immediate 1-line reaction quote from the superior based on their personality & choice. */
export function bossReactionQuote(boss, optIdx, backfired) {
  if (!boss?.style) return "";
  const k = boss.style.k;
  if (k === "strict") {
    if (optIdx === 1) return "“교범과 절차대로 깔끔하게 처리했군. 평정에 긍정적으로 반영하겠네.”";
    if (optIdx === 0 && backfired) return "“절차를 건너뛰고 무리수를 두니 결국 탈이 나지 않나. 다음부턴 원칙을 지키게.”";
    return "“결과는 지켜보겠네. 보고 체계와 규정을 항상 유념하도록.”";
  }
  if (k === "bold") {
    if (optIdx === 0 && !backfired) return "“좋아! 지휘관은 저렇게 과감하게 밀어붙여야지. 아주 인상적이었네.”";
    if (optIdx === 2) return "“너무 몸을 사리는 것 아닌가? 지휘관이라면 주도권을 쥐어야 해.”";
    return "“무난하군. 하지만 다음 기회엔 더 확실한 성과를 보여주게.”";
  }
  if (optIdx === 2) return "“인명과 안전을 최우선으로 둔 현명한 판단이었네. 부대원들도 안도할 걸세.”";
  if (optIdx === 0 && backfired) return "“무리하지 말라고 누차 강조했거늘… 안전사고는 지휘관 최대의 책임일세.”";
  return "“큰 탈 없이 마무리돼 다행이네. 항상 장병 안전을 먼저 챙기게.”";
}

/** Rank-based command office label for mood header. */
export function officeAmbienceLabel(grade, isUSFlag) {
  if (grade >= 10) return isUSFlag ? "⭐ 합동최고통수본부" : "⭐ 대한민국 최고통수권 보좌";
  if (grade >= 8) return isUSFlag ? "🏛️ 펜타곤·전구사령부 지휘실" : "🏛️ 작전사령부·합참 지휘실";
  if (grade >= 6) return isUSFlag ? "🎖️ 장성 사령부 집무실" : "🎖️ 장성급 사령부 집무실";
  if (grade >= 3) return isUSFlag ? "📋 영관 지휘관실" : "📋 대대·연대 지휘관실";
  return isUSFlag ? "⛺ 야전 초급장교 지휘소" : "⛺ 야전 부대 지휘소";
}

/** Show a dramatic animated Minister of Defense / SecDef nomination offer modal upon retiring as a 4-star+ General. */
export function showMinisterOfferModal({ nation = "kr", rankName = "대장", cmdrName = "지휘관", onAccept, onDecline }) {
  injectFxStyles();
  let el = document.getElementById("fxMinOfferM");
  if (!el) {
    el = document.createElement("div");
    el.id = "fxMinOfferM";
    document.body.appendChild(el);
  }
  const us = nation === "us";
  el.innerHTML = `<div class="fx-mo-card">
    <div class="fx-mo-seal">${us ? "🦅" : "🏛️"}</div>
    <div class="fx-mo-kicker">${us ? "THE WHITE HOUSE · URGENT NOMINATION" : "대한민국 대통령실 · 비서실장 긴급 연락"}</div>
    <h2>${us ? "미합중국 국방장관 (SecDef) 지명 오퍼" : "대한민국 국방부장관 지명 오퍼"}</h2>
    <p>${us
      ? `예비역 ${rankName} <b>${cmdrName}</b> 장군님, 현역 복무를 명예롭게 마치신 직후 백악관으로부터 긴급 연락이 도착했습니다.<br>대통령께서 귀하를 차기 <b>미 국방장관(Secretary of Defense)</b>으로 지명하고자 합니다. 펜타곤의 수장이 되어 36주간 미군 국방 경영을 이끄시겠습니까?`
      : `예비역 ${rankName} <b>${cmdrName}</b> 장군님, 명예로운 전역을 축하드리며 대통령실 비서실장이 긴급 연락을 전해왔습니다.<br>대통령께서 귀하를 차기 <b>대한민국 국방부장관</b>으로 임명하고자 합니다. 국방부 집무실에 입성해 36주간 3군 국방 경영을 총괄하시겠습니까?`
    }</p>
    <div class="fx-mo-btns">
      <button class="fx-mo-accept" id="fxMoAccept">🏛️ ${us ? "미 국방장관 (SecDef) 지명 수락 ›" : "국방부장관 지명 수락 (국방부 집무실 입성) ›"}</button>
      <button class="fx-mo-decline" id="fxMoDecline">정중히 사양하고 민간 제2의 인생 진로 선택</button>
    </div>
  </div>`;
  el.classList.add("on");
  playVO(us ? 60 : 40);
  const close = () => { el.classList.remove("on"); };
  el.querySelector("#fxMoAccept").onclick = () => { close(); if (onAccept) onAccept(); };
  el.querySelector("#fxMoDecline").onclick = () => { close(); if (onDecline) onDecline(); };
}
