// 실사 이미지 연출 장면: 국방부 브리핑룸 기자회견 · 국회 국방위원회 · 긴급 NSC.
// 정지 이미지 위에 카메라 패닝·줌(컷 전환), 플래시, 자막, 답변 선택지를 얹는다. 이미지 속 인물은 모두 AI로 만든 가상 인물이다.
/* 정당 색 테마 (blue = 민주함께당, red = 한누리당, null = 무소속/공통) */
let THEME = null; const THEMED = ["declaration", "primary_hall", "rally", "election_night", "victory", "president_office", "address"];
const usBackgrounds = { briefing: "us_press_spokesperson", hearing: "us_capitol_hearing", indopac: "us_war_room", situation: "us_war_room", office: "us_pentagon_office", ceremony: "us_ceremony", study: "us_pentagon_office", primary: "primary_hall", rally: "rally", convention: "primary_hall", debate: "debate", poll: "poll_booth", election_night: "election_night", victory: "victory", inauguration: "us_ceremony", president_office: "us_oval_office", address: "us_press_secdef", summit: "summit" };
THEMED.push(...["primary","rally","convention","election_night","victory","address","president_office"].map(n => "us_" + n));
/* Add delivered US artwork here to enable it ahead of the fallback. */
const availableUS = new Set(["us_war_room", "us_pentagon_office", "us_oval_office", "us_capitol_hearing", "us_press_secdef", "us_press_corps", "us_press_spokesperson", "us_ceremony"]);
export const setTheme = (t) => { THEME = t || null; };
const US_SWAP = { war_room: "us_war_room", nsc: "us_war_room", office: "us_pentagon_office", assembly: "us_capitol_hearing", president_office: "us_oval_office", press_minister: "us_press_secdef", press_journalist: "us_press_corps", press_spokesperson: "us_press_spokesperson", ceremony: "us_ceremony" };
const IMG = (n) => {
  if (typeof document !== "undefined" && document.body?.classList.contains("us-nat") && US_SWAP[n]) return `img/bg/${US_SWAP[n]}.jpg`;
  return `img/bg/${THEMED.includes(n) && THEME ? `${n}_${THEME}` : n}.jpg`;
};
/* 아직 없는 배경은 비슷한 기존 사진으로 대신한다 */
const FB = { declaration: "press_minister", election_night: "nsc", victory: "press_minister", rally: "ceremony", primary_hall: "press_minister", debate: "press_minister", poll_booth: "office", camp_room: "war_room", inauguration: "ceremony", study: "office", summit: "nsc", president_office: "office", address: "press_minister" };
for (const [id, fallback] of Object.entries(usBackgrounds)) FB["us_" + id] = fallback;
/* 테마 이미지 우선 로드 후 실패 시 대체 사진(FB) 사용 */
const load = (img, n, go) => { const tries = (n.startsWith("us_") && !availableUS.has(n) ? [FB[n]] : [n, FB[n]]).filter(Boolean); let i = 0;
  img.onload = go; img.onerror = () => { i++; if (i < tries.length) img.src = IMG(tries[i]); else go(); }; img.src = IMG(tries[0]); };
/* 컷: [이미지, 초점 x, 초점 y (0~1), 확대 배율] */
const SHOTS = {
  press: { wide: ["press_minister", 0.5, 0.42, 1.06], ask: ["press_journalist", 0.56, 0.42, 1.18], askAlt: ["press_minister", 0.27, 0.6, 1.9], ans: ["press_minister", 0.53, 0.36, 1.8], end: ["press_spokesperson", 0.55, 0.45, 1.1] },
  assembly: { wide: ["assembly", 0.5, 0.45, 1.06], ask: ["assembly", 0.25, 0.62, 1.85], askAlt: ["assembly", 0.42, 0.36, 2.0], ans: ["assembly", 0.66, 0.55, 1.9], end: ["assembly", 0.42, 0.34, 1.8] },
  debate: { wide: ["debate", 0.45, 0.45, 1.06], ask: ["debate", 0.26, 0.5, 1.9], askAlt: ["debate", 0.48, 0.5, 1.9], ans: ["debate", 0.37, 0.48, 1.9], end: ["debate", 0.45, 0.45, 1.1] },
  declare: { wide: ["declaration", 0.5, 0.5, 1.06], ask: ["declaration", 0.4, 0.75, 1.5], askAlt: ["declaration", 0.3, 0.7, 1.5], ans: ["declaration", 0.66, 0.42, 1.6], end: ["declaration", 0.5, 0.5, 1.1] },
  primary: { wide: ["primary_hall", 0.5, 0.45, 1.06], ask: ["primary_hall", 0.3, 0.72, 1.5], askAlt: ["primary_hall", 0.72, 0.72, 1.5], ans: ["primary_hall", 0.5, 0.42, 1.8], end: ["primary_hall", 0.5, 0.45, 1.1] },
  summit: { wide: ["summit", 0.5, 0.5, 1.06], ask: ["summit", 0.75, 0.55, 1.6], askAlt: ["summit", 0.7, 0.5, 1.6], ans: ["summit", 0.3, 0.55, 1.6], end: ["summit", 0.5, 0.5, 1.1] },
  nsc: { wide: ["nsc", 0.5, 0.5, 1.06], ask: ["nsc", 0.8, 0.5, 1.75], askAlt: ["nsc", 0.62, 0.7, 1.7], ans: ["nsc", 0.42, 0.6, 1.7], end: ["nsc", 0.62, 0.32, 1.5] },
};
for (const [id, original] of Object.entries({ hearing: "assembly", debate: "debate", briefing: "press", situation: "nsc", summit: "summit" })) {
  SHOTS["us_" + id] = Object.fromEntries(Object.entries(SHOTS[original]).map(([key, [, ...focus]]) => [key, ["us_" + id, ...focus]]));
}
const PLACE = { declare: "출마 선언 기자회견", summit: "정상회담", debate: "TV 토론", primary: "당내 경선", press: "국방부 브리핑룸 · 정례 기자회견", assembly: "국회 국방위원회 · 현안 질의", nsc: "국가안전보장회의 · 긴급 소집" };
const END = { declare: ["사회자", "출마 선언 기자회견을 마치겠습니다."], summit: ["의전비서관", "회담을 마치고 공동 기자회견을 시작하겠습니다."], debate: ["사회자", "이상으로 오늘 토론을 마치겠습니다."], primary: ["사회자", "합동 토론회를 마칩니다."], press: ["대변인", "이상으로 오늘 브리핑을 마치겠습니다."], assembly: ["위원장", "답변 잘 들었습니다. 다음 안건으로 넘어가겠습니다."], nsc: ["안보실장", "결정 사항을 각 군에 하달하겠습니다."] };
let R = null;

const inferCutVO = ({ title = "", cut = {}, played }) => {
  const txt = `${cut.who || ""} ${cut.text || ""} ${cut.card || ""}`;
  const isEn = /[a-zA-Z]{4,}/.test(txt) && !/[가-힣]/.test(cut.text || "");
  if (/이임|Farewell/i.test(title) && !played.has(45)) { played.add(45); return 45; }
  if (/퇴임|Farewell Address/i.test(title) && !played.has(55)) { played.add(55); return 55; }
  if (/취임|Inaugur|선서|Oath/i.test(txt)) {
    const id = isEn ? 64 : 52;
    if (!played.has(id)) { played.add(id); return id; }
  }
  if ((/당선|President-Elect|270|확실|유력|승리|Victory/i.test(txt)) && !/낙선|패배|Defeat|Concede/i.test(txt)) {
    const id = isEn ? 63 : 51;
    if (!played.has(id)) { played.add(id); return id; }
  }
  if (/출구조사|투표 마감|개표|8시/i.test(txt) && !isEn && !played.has(50)) {
    played.add(50);
    return 50;
  }
  return null;
};

const inferAskVO = ({ kind, title = "", q = {}, qi = 0, played }) => {
  if (q.vo) return q.vo;
  if (qi === 0) {
    if (kind === "us_hearing") return 62;
    if (kind === "assembly") return 31;
    if (kind === "press") return 43;
    if (kind === "debate") return 49;
    if (kind === "nsc") return /White House|Pentagon|United States|U\.S\./i.test(title) ? 65 : 53;
    if (kind === "summit" && !played.has(54)) { played.add(54); return 54; }
    if (kind === "declare" && !played.has(46)) { played.add(46); return 46; }
    if (/수락|후보/.test(title) && !played.has(48)) { played.add(48); return 48; }
  }
  return null;
};

const inferPickVO = ({ kind, title = "", opt = [], qi = 0, total = 1, played }) => {
  if (opt[3]) return opt[3];
  if (kind === "assembly" && !played.has(`ans:${qi}`)) { played.add(`ans:${qi}`); return 32; }
  if (kind === "declare" && qi === total - 1 && !played.has(46)) { played.add(46); return 46; }
  if ((kind === "primary" || /수락|후보/.test(title)) && qi === total - 1 && !played.has(48)) { played.add(48); return 48; }
  if (kind === "summit" && qi === total - 1 && !played.has(54)) { played.add(54); return 54; }
  if (kind === "nsc" && /제압|격퇴|타격|원점/.test(opt[0] || "") && !played.has(23)) { played.add(23); return 23; }
  return null;
};

const inferEndVO = ({ kind, title = "" }) => {
  if (kind === "assembly") return 33;
  if (kind === "primary" && /승리|확정/.test(title)) return 47;
  return null;
};

/** 나레이션 장면: cuts = [{ img, f: [x, y, 배율], who, text, card?, flash? }] 순서대로 재생 후 닫힘 */
export function playCuts({ title = "", place = "", cuts = [], onClose }) {
  closeScene();
  const isEn = document.documentElement.lang === "en";
  const el = document.createElement("div"); el.id = "scene2d"; el.className = "cuts";
  el.innerHTML = `<div class="sv"><div class="ly"></div><div class="ly"></div></div><div class="fl"></div><div class="vg"></div><div class="s3-bar t"></div><div class="s3-bar b"></div>
    <div class="s3-title"><span>${place}</span><b>${title}</b></div><div class="s3-card"></div><div class="s3-sub"></div><button class="s3-skip">${isEn ? "Skip" : "건너뛰기"} ✕</button><button class="s3-next">${isEn ? "Next" : "다음"} ›</button>`;
  document.body.appendChild(el);
  const S = (R = { el, onClose, qi: 0, timers: [], cur: 0, typer: 0, skipped: false });
  const L = [...el.querySelectorAll(".ly")], sub = el.querySelector(".s3-sub"), card = el.querySelector(".s3-card"), fl = el.querySelector(".fl"), nb = el.querySelector(".s3-next");
  for (const c of cuts) load(new Image(), c.img, () => {});
  let i = -1, ready = false, delayT = 0, curCut = null;
  const played = new Set();
  const finishTyping = () => {
    if (!curCut || ready) return;
    clearTimeout(delayT); clearInterval(S.typer);
    sub.className = `s3-sub on ${curCut.cls || ""}`;
    sub.innerHTML = `<i>${curCut.who || ""}</i><span></span>`;
    sub.querySelector("span").textContent = curCut.text;
    ready = true; nb.classList.add("on");
    if (curCut.auto) S.timers.push(setTimeout(next, curCut.auto));
  };
  const show = (c) => { const img = new Image(); const nx = L[S.cur ^ 1], old = L[S.cur], [fx, fy, z] = c.f || [0.5, 0.5, 1.06];
    const go = () => { nx.innerHTML = ""; nx.appendChild(img); img.style.transition = "none"; img.style.transform = fit(el, img, fx, fy, z); nx.style.transition = "opacity 1.0s"; nx.style.opacity = 1; old.style.opacity = 0; S.cur ^= 1;
      requestAnimationFrame(() => requestAnimationFrame(() => { img.style.transition = "transform 10s cubic-bezier(.25,.1,.25,1)"; img.style.transform = fit(el, img, c.to?.[0] ?? fx, c.to?.[1] ?? fy, c.to?.[2] ?? z * 1.08); })); };
    load(img, c.img, go); };
  const next = () => {
    if (!ready && i >= 0) { finishTyping(); return; }
    clearTimeout(delayT); clearInterval(S.typer);
    i++; if (i >= cuts.length) return closeScene(true);
    const c = (curCut = cuts[i]); ready = false; nb.classList.remove("on");
    if (c.img !== cuts[i - 1]?.img || c.f) show(c);
    if (c.flash) for (let k = 0; k < c.flash; k++) S.timers.push(setTimeout(() => { fl.classList.remove("on"); void fl.offsetWidth; fl.classList.add("on"); }, 220 + k * 240));
    card.className = c.card ? "s3-card on" : "s3-card"; card.innerHTML = c.card || "";
    const done = () => { ready = true; nb.classList.add("on"); if (c.auto) S.timers.push(setTimeout(next, c.auto)); };
    delayT = setTimeout(() => {
      const vo = c.vo ?? inferCutVO({ title, cut: c, played });
      if (vo) globalThis.__playVO?.(vo);
      sub.className = `s3-sub on ${c.cls || ""}`;
      sub.innerHTML = `<i>${c.who || ""}</i><span></span>`;
      const sp = sub.querySelector("span"), t0 = performance.now();
      clearInterval(S.typer);
      S.typer = setInterval(() => {
        const n = Math.ceil((performance.now() - t0) / 24);
        sp.textContent = c.text.slice(0, n);
        if (n >= c.text.length) { clearInterval(S.typer); done(); }
      }, 24);
    }, 280);
    S.timers.push(delayT);
  };
  nb.addEventListener("click", (e) => { e.stopPropagation(); next(); });
  el.addEventListener("click", (e) => { if (e.target.closest(".s3-skip") || e.target.closest(".s3-next")) return; next(); });
  el.querySelector(".s3-skip").addEventListener("click", (e) => { e.stopPropagation(); S.skipped = true; closeScene(true); });
  S.onKey = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); next(); } else if (e.key === "Escape") { S.skipped = true; closeScene(true); } };
  addEventListener("keydown", S.onKey);
  S.resize = () => {}; next();
}
function fit(el, img, fx, fy, z) { const W = el.clientWidth, H = el.clientHeight, iw = img.naturalWidth || 1376, ih = img.naturalHeight || 768, s = Math.max(W / iw, H / ih) * z, w = iw * s, h = ih * s;
  const x = Math.min(0, Math.max(W - w, W / 2 - fx * w)), y = Math.min(0, Math.max(H - h, H / 2 - fy * h)); return `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(4)})`; }

function fallbackSpeech(kind, label) {
  if (kind === "declare" || kind === "primary" || kind === "debate") return label;
  if (kind === "summit") return `${label} — 양국의 공동 이익을 위해 이 방향으로 협의하겠습니다.`;
  if (kind === "nsc") return `${label} — 즉시 관계 부처와 합참에 하달하겠습니다.`;
  return `${label} — 이 원칙에 따라 흔들림 없이 추진하겠습니다.`;
}

/** 장면 열기: questions = [{ who, q, opts: [[답변, 효과 설명, 대사?]] }], onPick(qi, ai), onClose(qi, skipped) */
export function openScene({ kind = "press", title = "", questions = [], onPick, onClose, speaker = "장관", place = null }) {
  closeScene();
  const K = SHOTS[kind] ? kind : "press", Sh = SHOTS[K];
  const isEn = document.documentElement.lang === "en";
  const el = document.createElement("div"); el.id = "scene2d"; el.className = K;
  el.innerHTML = `<div class="sv"><div class="ly"></div><div class="ly"></div></div><div class="fl"></div><div class="vg"></div><div class="s3-bar t"></div><div class="s3-bar b"></div>
    <div class="s3-title"><span>${place || PLACE[K]}</span><b>${title}</b></div><div class="s3-sub"></div><div class="s3-opts"></div><button class="s3-skip">${isEn ? "Skip" : "건너뛰기"} ✕</button>`;
  document.body.appendChild(el);
  const S = (R = { el, onClose, qi: 0, timers: [], cur: 0, typer: 0, skipped: false, fast: null });
  const L = [...el.querySelectorAll(".ly")], sub = el.querySelector(".s3-sub"), box = el.querySelector(".s3-opts"), fl = el.querySelector(".fl");
  const later = (f, ms) => { const id = setTimeout(f, ms); S.timers.push(id); return id; };
  const stepAfter = (fn, ms) => {
    let ran = false;
    const go = () => { if (ran) return; ran = true; S.fast = null; clearTimeout(id); fn(); };
    const id = later(go, ms);
    S.fast = go;
  };
  for (const n of new Set(Object.values(Sh).map((s) => s[0]))) load(new Image(), n, () => {});
  /* 화면을 꽉 채우도록 배율·위치를 계산해 (fx, fy)가 화면 중앙에 오게 한다 */
  const frame = (img, fx, fy, z) => { const W = el.clientWidth, H = el.clientHeight, iw = img.naturalWidth || 1376, ih = img.naturalHeight || 768, s = Math.max(W / iw, H / ih) * z, w = iw * s, h = ih * s;
    const x = Math.min(0, Math.max(W - w, W / 2 - fx * w)), y = Math.min(0, Math.max(H - h, H / 2 - fy * h)); return `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(4)})`; };
  const shot = ([n, fx, fy, z], cut = true) => {
    const nx = L[S.cur ^ 1], old = L[S.cur], img = new Image();
    const go = () => { nx.innerHTML = ""; nx.appendChild(img); img.style.transition = "none"; img.style.transform = frame(img, fx, fy, z);
      nx.style.transition = cut ? "opacity .35s" : "opacity 1.0s"; nx.style.opacity = 1; old.style.opacity = 0; S.cur ^= 1;
      /* 천천히 밀고 들어가는 카메라 (Ken Burns) */
      requestAnimationFrame(() => requestAnimationFrame(() => { img.style.transition = "transform 9s cubic-bezier(.25,.1,.25,1)"; img.style.transform = frame(img, fx + (Math.random() - 0.5) * 0.04, fy, z * 1.07); })); };
    load(img, n, go);
  };
  const flash = (n = 3) => { for (let i = 0; i < n; i++) later(() => { fl.classList.remove("on"); void fl.offsetWidth; fl.classList.add("on"); }, i * (120 + Math.random() * 260)); };
  const say = (who, text, cls, done) => {
    sub.className = `s3-sub on ${cls}`;
    sub.innerHTML = `<i>${who}</i><span></span><em style="display:block;font-style:normal;font-size:11px;opacity:.55;margin-top:6px;letter-spacing:.04em">${isEn ? "Click / Space to fast-forward" : "화면 클릭 · Space — 빠르게 넘기기"}</em>`;
    const sp = sub.querySelector("span"), t0 = performance.now();
    clearInterval(S.typer);
    let finished = false;
    const complete = () => {
      if (finished) return;
      finished = true;
      clearInterval(S.typer);
      sp.textContent = text;
      S.fast = null;
      done?.();
    };
    S.fast = complete;
    S.typer = setInterval(() => {
      const n = Math.ceil((performance.now() - t0) / 24);
      sp.textContent = text.slice(0, n);
      if (n >= text.length) complete();
    }, 24);
  };
  const played = new Set();
  const ask = () => {
    const Q = questions[S.qi]; if (!Q) return finish();
    box.className = "s3-opts"; box.innerHTML = "";
    shot(S.qi % 2 ? Sh.askAlt : Sh.ask); if (K === "press") flash(2);
    stepAfter(() => {
      const vo = inferAskVO({ kind: K, title, q: Q, qi: S.qi, played });
      if (vo) globalThis.__playVO?.(vo);
      say(Q.who || (K === "press" ? "기자" : K === "assembly" ? "국방위원" : "참석자"), Q.q, "q", () => {
        stepAfter(() => {
          box.innerHTML = Q.opts.map(([n, e], i) => `<button data-a="${i}"><b>${n}</b>${e ? `<small>${e}</small>` : ""}</button>`).join("");
          box.className = "s3-opts on";
        }, 180);
      });
    }, 380);
  };
  const answer = (ai) => {
    const o = questions[S.qi].opts[ai]; box.className = "s3-opts"; box.innerHTML = ""; shot(Sh.ans); if (K === "press") flash(4);
    onPick?.(S.qi, ai);
    const spoken = o[2] || fallbackSpeech(K, o[0]);
    stepAfter(() => {
      const vo = inferPickVO({ kind: K, title, opt: o, qi: S.qi, total: questions.length, played });
      if (vo) globalThis.__playVO?.(vo);
      say(speaker, spoken, "a", () => {
        stepAfter(() => {
          S.qi++;
          if (S.qi < questions.length) { shot(Sh.wide, false); stepAfter(ask, 850); }
          else finish();
        }, 1300);
      });
    }, 320);
  };
  const finish = () => {
    shot(Sh.end, false);
    const [w, t] = K.startsWith("us_") ? ["Chair", "The session is adjourned."] : END[K];
    stepAfter(() => {
      const vo = inferEndVO({ kind: K, title });
      if (vo) globalThis.__playVO?.(vo);
      say(w, t, "", () => stepAfter(() => closeScene(true), 950));
    }, 450);
  };
  box.addEventListener("click", (e) => { const b = e.target.closest("[data-a]"); if (b && box.classList.contains("on")) { e.stopPropagation(); answer(+b.dataset.a); } });
  el.addEventListener("click", (e) => { if (e.target.closest(".s3-skip") || e.target.closest(".s3-opts")) return; if (S.fast) S.fast(); });
  el.querySelector(".s3-skip").addEventListener("click", (e) => { e.stopPropagation(); if (S.qi < questions.length) S.skipped = true; closeScene(true); });
  S.onKey = (e) => { if (e.key === " " || e.key === "Enter") { if (S.fast) { e.preventDefault(); S.fast(); } } else if (e.key === "Escape") { if (S.qi < questions.length) S.skipped = true; closeScene(true); } };
  addEventListener("keydown", S.onKey);
  S.resize = () => { const img = L[S.cur].querySelector("img"); if (img) img.style.transition = "none"; };
  addEventListener("resize", S.resize);
  shot(Sh.wide, false); stepAfter(ask, 1100);
}
export function closeScene(fire = false) {
  if (!R) return; const S = R; R = null; S.timers.forEach(clearTimeout); clearInterval(S.typer); removeEventListener("resize", S.resize); if (S.onKey) removeEventListener("keydown", S.onKey); globalThis.__stopVO?.(); S.el.remove();
  if (fire) S.onClose?.(S.qi, S.skipped);
}
export const sceneOn = () => !!R;
