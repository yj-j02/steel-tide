/* Live2D-style SVG character animation engine and interactive preview modal */

const STYLE_ID = "live-actor-styles";

export function initLiveActorStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const st = document.createElement("style");
  st.id = STYLE_ID;
  st.textContent = `
    .live-actor {
      overflow: visible;
      transform-box: view-box;
    }
    .live-actor .fa-torso {
      transform-origin: 50px 96px;
      animation: faBreathe 3.8s ease-in-out infinite;
    }
    .live-actor .fa-head {
      transform-origin: 50px 72px;
      animation: faHeadIdle 4.8s ease-in-out infinite;
    }
    .live-actor .fa-eye {
      animation: faBlink 5.2s ease-in-out infinite;
    }
    .live-actor .fa-brows {
      transform-origin: 50px 35px;
      transition: transform .22s ease;
    }
    .live-actor .fa-mouth {
      transition: transform .15s ease;
    }
    .live-actor .fa-mouth-open {
      opacity: 0;
      transform-box: fill-box;
      transform-origin: center center;
      transform: scaleY(0.12);
      transition: opacity .1s ease, transform .1s ease;
    }
    .live-actor .fa-mouth-smile {
      opacity: 0;
      transition: opacity .2s ease;
    }
    .live-actor .fa-salute-hand {
      opacity: 0;
      transform-origin: 86px 94px;
      transform: translate(16px, 24px) rotate(24deg);
      transition: opacity .22s ease, transform .42s cubic-bezier(.22, .85, .36, 1);
      pointer-events: none;
    }

    /* Speaking state: explicit class or active VO on player portrait */
    .live-actor.mood-speak .fa-head,
    body.vo-speaking .live-actor.self-actor .fa-head {
      animation: faSpeakHead 0.9s ease-in-out infinite;
    }
    .live-actor.mood-speak .fa-brows,
    body.vo-speaking .live-actor.self-actor .fa-brows {
      animation: faSpeakBrows 1.4s ease-in-out infinite;
    }
    .live-actor.mood-speak .fa-mouth-closed,
    body.vo-speaking .live-actor.self-actor .fa-mouth-closed {
      opacity: 0.25;
    }
    .live-actor.mood-speak .fa-mouth-open,
    body.vo-speaking .live-actor.self-actor .fa-mouth-open {
      opacity: 1;
      animation: faSpeakMouth 0.32s ease-in-out infinite;
    }

    /* Smile / celebration mood */
    .live-actor.mood-smile .fa-head {
      animation: faSmileNod 2.6s ease-in-out infinite;
    }
    .live-actor.mood-smile .fa-brows {
      transform: translateY(-1.4px);
    }
    .live-actor.mood-smile .fa-mouth-closed {
      opacity: 0;
    }
    .live-actor.mood-smile .fa-mouth-smile {
      opacity: 1;
    }

    /* Stern / decisive mood */
    .live-actor.mood-stern .fa-head {
      animation: faSternHold 3.2s ease-in-out infinite;
    }
    .live-actor.mood-stern .fa-brows {
      transform: translateY(1.3px) scaleY(0.92);
    }
    .live-actor.mood-stern .fa-eye {
      animation: faBlinkSlow 6.8s ease-in-out infinite;
    }

    /* Salute mood */
    .live-actor.mood-salute .fa-head {
      animation: faSaluteHead 2.8s ease-in-out infinite;
    }
    .live-actor.mood-salute .fa-salute-hand {
      opacity: 1;
      transform: translate(0, 0) rotate(0deg);
    }

    @keyframes faBreathe {
      0%, 100% { transform: translateY(0) scaleY(1); }
      50% { transform: translateY(-0.85px) scaleY(1.015); }
    }
    @keyframes faHeadIdle {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      35% { transform: translateY(-0.7px) rotate(-0.8deg); }
      70% { transform: translateY(-0.35px) rotate(0.9deg); }
    }
    @keyframes faBlink {
      0%, 44%, 48%, 92%, 96%, 100% { transform: scaleY(1); }
      46%, 94% { transform: scaleY(0.08); }
    }
    @keyframes faBlinkSlow {
      0%, 47%, 51%, 100% { transform: scaleY(1); }
      49% { transform: scaleY(0.1); }
    }
    @keyframes faSpeakHead {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      25% { transform: translateY(-1.3px) rotate(-1.3deg); }
      60% { transform: translateY(0.4px) rotate(1.1deg); }
    }
    @keyframes faSpeakBrows {
      0%, 100% { transform: translateY(0); }
      45% { transform: translateY(-1.2px); }
    }
    @keyframes faSpeakMouth {
      0%, 100% { transform: scaleY(0.3); }
      35% { transform: scaleY(1.18); }
      65% { transform: scaleY(0.55); }
      85% { transform: scaleY(0.95); }
    }
    @keyframes faSmileNod {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      40% { transform: translateY(-1.1px) rotate(1.2deg); }
      75% { transform: translateY(-0.4px) rotate(-0.8deg); }
    }
    @keyframes faSternHold {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(0.6px) rotate(-0.5deg); }
    }
    @keyframes faSaluteHead {
      0%, 100% { transform: translateY(-0.5px) rotate(0deg); }
      35% { transform: translateY(-1.2px) rotate(-0.9deg); }
    }

    /* Live actor preview modal */
    .la-modal-bg {
      position: fixed;
      inset: 0;
      z-index: 12000;
      background: rgba(6, 10, 16, 0.82);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .la-modal {
      width: min(680px, 96vw);
      background: linear-gradient(165deg, #151c27 0%, #0d121a 100%);
      border: 1px solid rgba(212, 175, 55, 0.42);
      border-radius: 12px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
      color: #e6ecf5;
      overflow: hidden;
      font-family: inherit;
    }
    .la-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(212, 175, 55, 0.22);
      background: rgba(212, 175, 55, 0.06);
    }
    .la-head h3 {
      margin: 0;
      font-size: 16px;
      color: #f4d375;
      letter-spacing: 0.02em;
    }
    .la-close {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #cbd5e1;
      border-radius: 6px;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 13px;
    }
    .la-close:hover {
      border-color: #f4d375;
      color: #fff;
    }
    .la-body {
      display: grid;
      grid-template-columns: 290px 1fr;
      gap: 20px;
      padding: 20px;
      align-items: center;
    }
    @media (max-width: 640px) {
      .la-body { grid-template-columns: 1fr; }
    }
    .la-stage {
      width: 280px;
      height: 280px;
      margin: 0 auto;
      border-radius: 12px;
      border: 1px solid rgba(212, 175, 55, 0.35);
      background: radial-gradient(circle at 50% 34%, #253449 0%, #101722 76%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 0 36px rgba(0, 0, 0, 0.55);
    }
    .la-stage svg {
      width: 260px;
      height: 260px;
    }
    .la-badge {
      position: absolute;
      left: 10px;
      bottom: 10px;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 11px;
      background: rgba(12, 18, 28, 0.85);
      border: 1px solid rgba(212, 175, 55, 0.4);
      color: #f4d375;
    }
    .la-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .la-meta {
      font-size: 13px;
      color: #9fb0c7;
      line-height: 1.5;
    }
    .la-meta strong {
      color: #f8fafc;
      font-size: 15px;
      display: block;
      margin-bottom: 2px;
    }
    .la-grp-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #8ea0b8;
      margin-bottom: 6px;
    }
    .la-btn-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .la-btn {
      padding: 8px 10px;
      border-radius: 7px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: rgba(30, 41, 59, 0.72);
      color: #e2e8f0;
      font-size: 12.5px;
      cursor: pointer;
      text-align: left;
      transition: all .15s ease;
    }
    .la-btn:hover {
      border-color: rgba(244, 211, 117, 0.65);
      background: rgba(51, 65, 85, 0.85);
    }
    .la-btn.active {
      border-color: #f4d375;
      background: rgba(212, 175, 55, 0.2);
      color: #fde68a;
      font-weight: 600;
    }
  `;
  document.head.appendChild(st);
}

const MOOD_LIST = [
  { id: "idle", label: "😌 대기 (호흡·깜빡임)", badge: "대기 호흡 / 눈 깜빡임" },
  { id: "speak", label: "🎙️ 말하기 (립싱크+음성)", badge: "립싱크 발화 중" },
  { id: "smile", label: "😊 미소 · 축하", badge: "미소 / 긍정 표정" },
  { id: "stern", label: "😠 단호 · 결단", badge: "단호 / 작전 집중" },
  { id: "salute", label: "🫡 충성 경례", badge: "거수 경례" }
];

const OUTFIT_LIST = [
  { id: "uniform", label: "군 정복" },
  { id: "minister", label: "국방장관 정장" },
  { id: "president", label: "대통령 정장" }
];

export function openLiveActorPreview({ getPortraitHTML, name = "지휘관", rankTitle = "", onSpeakSample, onClose } = {}) {
  initLiveActorStyles();
  document.getElementById("la-preview-modal")?.remove();

  let currentMood = "idle";
  let currentOutfit = "uniform";

  const bg = document.createElement("div");
  bg.id = "la-preview-modal";
  bg.className = "la-modal-bg";
  bg.innerHTML = `
    <div class="la-modal" role="dialog" aria-modal="true" aria-label="내 캐릭터 라이브 모션 시험관">
      <div class="la-head">
        <h3>🎭 내 캐릭터 라이브 모션 시험관 (프로토타입)</h3>
        <button type="button" class="la-close" data-la-close>닫기</button>
      </div>
      <div class="la-body">
        <div class="la-stage">
          <div id="la-stage-slot"></div>
          <div class="la-badge" id="la-badge">대기 호흡 / 눈 깜빡임</div>
        </div>
        <div class="la-controls">
          <div class="la-meta">
            <strong>${name}</strong>
            <span>${rankTitle || "현역 지휘관"} · SVG 실시간 호흡·깜빡임·립싱크·표정·경례 구동 중</span>
          </div>
          <div>
            <div class="la-grp-label">모션 &amp; 표정 테스트</div>
            <div class="la-btn-grid" id="la-mood-btns">
              ${MOOD_LIST.map((m) => `<button type="button" class="la-btn${m.id === currentMood ? " active" : ""}" data-mood="${m.id}">${m.label}</button>`).join("")}
            </div>
          </div>
          <div>
            <div class="la-grp-label">복장 전환 테스트</div>
            <div class="la-btn-grid" id="la-outfit-btns" style="grid-template-columns:repeat(3,1fr)">
              ${OUTFIT_LIST.map((o) => `<button type="button" class="la-btn${o.id === currentOutfit ? " active" : ""}" data-outfit="${o.id}">${o.label}</button>`).join("")}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const renderStage = () => {
    const slot = bg.querySelector("#la-stage-slot");
    const badge = bg.querySelector("#la-badge");
    if (!slot || typeof getPortraitHTML !== "function") return;
    slot.innerHTML = getPortraitHTML(currentOutfit, 260, `mood-${currentMood}`);
    const info = MOOD_LIST.find((m) => m.id === currentMood);
    if (badge && info) badge.textContent = info.badge;
    bg.querySelectorAll("[data-mood]").forEach((b) => b.classList.toggle("active", b.dataset.mood === currentMood));
    bg.querySelectorAll("[data-outfit]").forEach((b) => b.classList.toggle("active", b.dataset.outfit === currentOutfit));
  };

  bg.addEventListener("click", (e) => {
    if (e.target === bg || e.target.closest("[data-la-close]")) {
      bg.remove();
      if (typeof onClose === "function") onClose();
      return;
    }
    const moodBtn = e.target.closest("[data-mood]");
    if (moodBtn) {
      currentMood = moodBtn.dataset.mood;
      renderStage();
      if (currentMood === "speak" && typeof onSpeakSample === "function") onSpeakSample();
      return;
    }
    const outfitBtn = e.target.closest("[data-outfit]");
    if (outfitBtn) {
      currentOutfit = outfitBtn.dataset.outfit;
      renderStage();
    }
  });

  document.body.appendChild(bg);
  renderStage();
}
