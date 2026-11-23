/* Live2D-style SVG character animation engine (half-body + full-body 2-joint rig) */

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
      transform-origin: 84px 98px;
      transform: translate(10px, 28px) rotate(14deg);
      transition: opacity .2s ease, transform .38s cubic-bezier(.22, .85, .36, 1);
      pointer-events: none;
    }

    /* Full-body 2-joint rig */
    .live-fullbody {
      overflow: visible;
    }
    .live-fullbody .fb-upper {
      transform-origin: 90px 195px;
      animation: fbBreathe 3.8s ease-in-out infinite;
    }
    .live-fullbody .fb-arm-l {
      transform-origin: 58px 104px;
      animation: fbArmIdleL 4.4s ease-in-out infinite;
      transition: transform .35s ease;
    }
    .live-fullbody .fb-arm-r {
      transform-origin: 120px 102px;
      transform: rotate(0deg);
      transition: transform .42s cubic-bezier(.22, .85, .36, 1);
    }
    .live-fullbody .fb-forearm-r {
      transform-origin: 127px 148px;
      transform: rotate(0deg);
      transition: transform .42s cubic-bezier(.22, .85, .36, 1);
    }
    .live-fullbody.mood-speak .fb-arm-r {
      transform: rotate(-16deg);
    }
    .live-fullbody.mood-speak .fb-forearm-r {
      animation: fbSpeakForearm 1.15s ease-in-out infinite;
    }
    .live-fullbody.mood-salute .fb-arm-r {
      transform: rotate(-112deg);
    }
    .live-fullbody.mood-salute .fb-forearm-r {
      transform: rotate(-128deg);
    }
    .live-fullbody.mood-smile .fb-arm-l {
      transform: rotate(3deg);
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
    @keyframes fbBreathe {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-1.6px); }
    }
    @keyframes fbArmIdleL {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(1.6deg); }
    }
    @keyframes fbSpeakForearm {
      0%, 100% { transform: rotate(-28deg); }
      50% { transform: rotate(-44deg); }
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
      35% { transform: translateY(-1.1px) rotate(-0.7deg); }
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
      width: min(740px, 96vw);
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
      grid-template-columns: 300px 1fr;
      gap: 20px;
      padding: 20px;
      align-items: center;
    }
    @media (max-width: 660px) {
      .la-body { grid-template-columns: 1fr; }
    }
    .la-stage {
      width: 290px;
      height: 360px;
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

const FULLBODY_PALETTE = {
  kr: {
    army: { coat: "#243d33", coat2: "#162921", pants: "#1b2f27", shirt: "#dce4dd", tie: "#14261f", btn: "#d8b247", cuff: "#d8b247" },
    navy: { coat: "#f2f4f7", coat2: "#d8dfe6", pants: "#182436", shirt: "#ffffff", tie: "#141d2b", btn: "#d8b247", cuff: "#d8b247" },
    air: { coat: "#1c345c", coat2: "#10203b", pants: "#172b4d", shirt: "#d8e8f8", tie: "#0e1c36", btn: "#cfd8e4", cuff: "#9eb4cc" },
  },
  us: {
    army: { coat: "#4d4f36", coat2: "#323522", pants: "#383b27", shirt: "#e4d8b8", tie: "#292e1b", btn: "#d8b247", cuff: "#d8b247" },
    navy: { coat: "#121e33", coat2: "#0a111f", pants: "#101a2c", shirt: "#f5f7fa", tie: "#0d1016", btn: "#e2be52", cuff: "#e2be52" },
    air: { coat: "#1f3f73", coat2: "#122647", pants: "#18325c", shirt: "#d6e8fb", tie: "#12274a", btn: "#cfd8e4", cuff: "#9eb4cc" },
  },
};

/**
 * Full-body standing SVG actor (180x340 viewBox) with 2-joint arm rigging.
 * Embeds the player's own face SVG directly on top of the body.
 */
export function fullBodyActorHTML({
  headSVG,
  svc = "navy",
  us = false,
  outfit = "uniform",
  grade = 0,
  skin = "#e3b695",
  skinDark = "#b88262",
  name = "지휘관",
  moodCls = "mood-idle",
  height = 335,
} = {}) {
  const pal = outfit === "president"
    ? { coat: "#192231", coat2: "#0f1520", pants: "#141c28", shirt: "#f8fafc", tie: "#8b1e24", btn: "#d4af37", cuff: "#64748b" }
    : outfit === "minister"
      ? { coat: "#202b3d", coat2: "#131b27", pants: "#182130", shirt: "#f8fafc", tie: "#1e3a6e", btn: "#cbd5e1", cuff: "#64748b" }
      : (FULLBODY_PALETTE[us ? "us" : "kr"][svc] || FULLBODY_PALETTE.kr.navy);

  const isUniform = outfit === "uniform";
  const stars = isUniform && grade >= 6 ? Math.min(5, grade - 5) : 0;
  const starText = stars ? "★".repeat(stars) : (isUniform ? "◆" : "");
  const cleanHead = (headSVG || "").replace(/^<svg /, '<svg x="0" y="0" ');

  return `<svg class="live-fullbody ${moodCls}" viewBox="0 0 180 340" height="${height}" role="img" aria-label="${name} 전신 캐릭터">
    <ellipse cx="90" cy="328" rx="44" ry="7" fill="rgba(0,0,0,0.45)"/>

    <!-- Legs & dress shoes -->
    <g class="fb-legs">
      <path d="M66 196 L88 196 L85 316 L67 316 Z" fill="${pal.pants}" stroke="#080c12" stroke-width="1"/>
      <path d="M92 196 L114 196 L113 316 L95 316 Z" fill="${pal.pants}" stroke="#080c12" stroke-width="1"/>
      <line x1="77" y1="202" x2="76" y2="312" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <line x1="103" y1="202" x2="104" y2="312" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <!-- Dress shoes -->
      <path d="M64 316 L86 316 L88 326 Q73 329 61 325 Z" fill="#12151a" stroke="#05070a" stroke-width="1"/>
      <path d="M94 316 L116 316 L119 325 Q107 329 92 326 Z" fill="#12151a" stroke="#05070a" stroke-width="1"/>
      <path d="M66 322 Q74 323 83 322 M97 322 Q106 323 114 322" stroke="rgba(255,255,255,0.22)" stroke-width="0.9" fill="none"/>
    </g>

    <!-- Upper body (breathes) -->
    <g class="fb-upper">
      <!-- Left arm (relaxed at side) -->
      <g class="fb-arm-l">
        <path d="M59 96 L46 150 L58 153 L68 104 Z" fill="${pal.coat2}" stroke="#080c12" stroke-width="1"/>
        <path d="M46 150 L43 196 L55 197 L58 153 Z" fill="${pal.coat}" stroke="#080c12" stroke-width="1"/>
        <rect x="43.5" y="189" width="11.5" height="2.4" fill="${pal.cuff}" opacity="0.85"/>
        <path d="M44 197 L54 197 L53 211 Q49 214 44 210 Z" fill="${skin}" stroke="${skinDark}" stroke-width="0.8"/>
      </g>

      <!-- Torso / Jacket -->
      <g class="fb-torso">
        <path d="M58 94 Q90 88 122 94 L117 198 Q90 202 63 198 Z" fill="${pal.coat}" stroke="#080c12" stroke-width="1.1"/>
        <!-- Shirt & tie -->
        <path d="M77 92 L90 132 L103 92 Z" fill="${pal.shirt}"/>
        <path d="M87 98 L90 95 L93 98 L92 134 L90 138 L88 134 Z" fill="${pal.tie}"/>
        <!-- Lapels -->
        <path d="M75 93 L90 134 L82 140 L67 108 Z" fill="${pal.coat2}" stroke="#080c12" stroke-width="0.8"/>
        <path d="M105 93 L90 134 L98 140 L113 108 Z" fill="${pal.coat2}" stroke="#080c12" stroke-width="0.8"/>
        <!-- Buttons -->
        <circle cx="90" cy="144" r="2.2" fill="${pal.btn}"/>
        <circle cx="90" cy="159" r="2.2" fill="${pal.btn}"/>
        <circle cx="90" cy="174" r="2.2" fill="${pal.btn}"/>
        <!-- Belt / waist seam -->
        <rect x="64" y="182" width="52" height="5" fill="#12161d" opacity="0.9"/>
        <rect x="86" y="181.5" width="8" height="6" rx="1" fill="${pal.btn}"/>
        ${isUniform ? `
          <!-- Shoulder boards -->
          <rect x="57" y="90" width="17" height="5.5" rx="1.2" transform="rotate(-10 65 92)" fill="#131c28" stroke="${pal.btn}" stroke-width="0.7"/>
          <rect x="106" y="90" width="17" height="5.5" rx="1.2" transform="rotate(10 115 92)" fill="#131c28" stroke="${pal.btn}" stroke-width="0.7"/>
          ${starText ? `<text x="65" y="94.5" font-size="4.4" fill="#ffe082" text-anchor="middle" transform="rotate(-10 65 92)">${starText}</text>
          <text x="115" y="94.5" font-size="4.4" fill="#ffe082" text-anchor="middle" transform="rotate(10 115 92)">${starText}</text>` : ""}
          <!-- Ribbon rack & name tag -->
          <g transform="translate(97 132)">
            <rect width="6" height="3" fill="#b03a2e"/><rect x="6" width="6" height="3" fill="#2a5aa0"/><rect x="12" width="6" height="3" fill="#d8b23a"/>
            <rect y="3.2" width="6" height="3" fill="#3b7a3e"/><rect x="6" y="3.2" width="6" height="3" fill="#cbd5e1"/><rect x="12" y="3.2" width="6" height="3" fill="#8a1f1f"/>
          </g>
          <rect x="67" y="135" width="17" height="5" rx="0.8" fill="#151b24" stroke="${pal.btn}" stroke-width="0.5"/>
        ` : `
          <!-- Civilian lapel pin -->
          <circle cx="101" cy="116" r="3" fill="#d4af37" stroke="#0f172a" stroke-width="0.6"/>
        `}
      </g>

      <!-- Head (existing rigged SVG portrait, seated directly into shirt collar) -->
      <g transform="translate(40 19) scale(1)">
        ${cleanHead}
      </g>

      <!-- Right arm (2-joint: rounded shoulder + forearm + extended salute hand) -->
      <g class="fb-arm-r">
        <path d="M113 102 C113 94 127 94 128 104 L133 148 C133 153 121 153 121 148 L113 106 Z" fill="${pal.coat2}" stroke="#080c12" stroke-width="1"/>
        <g class="fb-forearm-r">
          <path d="M121 148 C121 143 133 143 133 148 L134 193 L122 193 Z" fill="${pal.coat}" stroke="#080c12" stroke-width="1"/>
          <rect x="122" y="186" width="12" height="2.4" fill="${pal.cuff}" opacity="0.85"/>
          <path d="M123 193 L133 193 L132 208 Q128 212 123 207 Z" fill="${skin}" stroke="${skinDark}" stroke-width="0.8"/>
        </g>
      </g>
    </g>
  </svg>`;
}

const MOOD_LIST = [
  { id: "idle", label: "😌 대기 (호흡·깜빡임)", badge: "대기 호흡 / 눈 깜빡임" },
  { id: "speak", label: "🎙️ 말하기 (립싱크+음성)", badge: "립싱크 발화 · 제스처" },
  { id: "smile", label: "😊 미소 · 축하", badge: "미소 / 긍정 표정" },
  { id: "stern", label: "😠 단호 · 결단", badge: "단호 / 작전 집중" },
  { id: "salute", label: "🫡 충성 경례", badge: "2단 관절 거수경례" }
];

const OUTFIT_LIST = [
  { id: "uniform", label: "군 정복" },
  { id: "minister", label: "국방장관 정장" },
  { id: "president", label: "대통령 정장" }
];

const VIEW_LIST = [
  { id: "full", label: "🧍 전신 스탠딩" },
  { id: "bust", label: "🪪 반신 (흉상)" }
];

export function openLiveActorPreview({
  getPortraitHTML,
  getFullBodyHTML,
  name = "지휘관",
  rankTitle = "",
  onSpeakSample,
  onClose,
} = {}) {
  initLiveActorStyles();
  document.getElementById("la-preview-modal")?.remove();

  let currentMood = "idle";
  let currentOutfit = "uniform";
  let currentView = typeof getFullBodyHTML === "function" ? "full" : "bust";

  const bg = document.createElement("div");
  bg.id = "la-preview-modal";
  bg.className = "la-modal-bg";
  bg.innerHTML = `
    <div class="la-modal" role="dialog" aria-modal="true" aria-label="내 캐릭터 라이브 모션 시험관">
      <div class="la-head">
        <h3>🎭 내 캐릭터 라이브 모션 시험관</h3>
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
            <span>${rankTitle || "현역 지휘관"} · 실시간 SVG 호흡·깜빡임·립싱크·경례</span>
          </div>
          <div>
            <div class="la-grp-label">표시 형태</div>
            <div class="la-btn-grid">
              ${VIEW_LIST.map((v) => `<button type="button" class="la-btn${v.id === currentView ? " active" : ""}" data-view="${v.id}">${v.label}</button>`).join("")}
            </div>
          </div>
          <div>
            <div class="la-grp-label">모션 &amp; 표정 테스트</div>
            <div class="la-btn-grid">
              ${MOOD_LIST.map((m) => `<button type="button" class="la-btn${m.id === currentMood ? " active" : ""}" data-mood="${m.id}">${m.label}</button>`).join("")}
            </div>
          </div>
          <div>
            <div class="la-grp-label">복장 전환 테스트</div>
            <div class="la-btn-grid" style="grid-template-columns:repeat(3,1fr)">
              ${OUTFIT_LIST.map((o) => `<button type="button" class="la-btn${o.id === currentOutfit ? " active" : ""}" data-outfit="${o.id}">${o.label}</button>`).join("")}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const renderStage = () => {
    const slot = bg.querySelector("#la-stage-slot");
    const badge = bg.querySelector("#la-badge");
    if (!slot) return;
    if (currentView === "full" && typeof getFullBodyHTML === "function") {
      slot.innerHTML = getFullBodyHTML(currentOutfit, `mood-${currentMood}`);
    } else if (typeof getPortraitHTML === "function") {
      slot.innerHTML = getPortraitHTML(currentOutfit, 260, `mood-${currentMood}`);
    }
    const info = MOOD_LIST.find((m) => m.id === currentMood);
    if (badge && info) badge.textContent = info.badge;
    bg.querySelectorAll("[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === currentView));
    bg.querySelectorAll("[data-mood]").forEach((b) => b.classList.toggle("active", b.dataset.mood === currentMood));
    bg.querySelectorAll("[data-outfit]").forEach((b) => b.classList.toggle("active", b.dataset.outfit === currentOutfit));
  };

  bg.addEventListener("click", (e) => {
    if (e.target === bg || e.target.closest("[data-la-close]")) {
      bg.remove();
      if (typeof onClose === "function") onClose();
      return;
    }
    const viewBtn = e.target.closest("[data-view]");
    if (viewBtn) {
      currentView = viewBtn.dataset.view;
      renderStage();
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
