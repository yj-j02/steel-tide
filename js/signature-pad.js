/**
 * Interactive handwritten signature pad for Minister of Defense / President.
 * Exports transparent PNG data URL stored in career.customSign.
 */

function injectSigStyles() {
  if (document.getElementById("sig-pad-style")) return;
  const st = document.createElement("style");
  st.id = "sig-pad-style";
  st.textContent = `
    #sigPadM { position:fixed; inset:0; z-index:160; display:none; align-items:center; justify-content:center; padding:18px;
      background:rgba(4,9,16,.84); backdrop-filter:blur(4px); }
    #sigPadM.on { display:flex; animation:sigFade .2s ease; }
    @keyframes sigFade { from { opacity:0; } to { opacity:1; } }
    .sig-box { width:min(520px,95vw); background:#101926; border:1.5px solid #f2ca5c; border-radius:12px;
      box-shadow:0 22px 60px rgba(0,0,0,.78); padding:18px 20px; color:#eaf1f8; }
    .sig-head { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px; }
    .sig-head h3 { margin:0; font-size:17px; color:#ffe082; }
    .sig-sub { margin:0 0 12px; font-size:12px; color:#9eb8ce; line-height:1.5; }
    .sig-pad-wrap { position:relative; background:repeating-linear-gradient(0deg, #faf6eb 0px, #faf6eb 27px, #ece4d0 28px);
      border:2px solid #c9a750; border-radius:8px; overflow:hidden; touch-action:none; }
    .sig-pad-line { position:absolute; left:24px; right:24px; bottom:38px; border-bottom:1.5px dashed rgba(90,74,44,.42); pointer-events:none; }
    .sig-pad-hint { position:absolute; left:26px; bottom:16px; font-size:10.5px; color:rgba(90,74,44,.65); font-weight:700; pointer-events:none; letter-spacing:1px; }
    .sig-canvas { display:block; width:100%; height:170px; cursor:crosshair; }
    .sig-tools { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin:11px 0 12px; }
    .sig-colors { display:flex; align-items:center; gap:6px; font-size:11.5px; color:#b8cde0; }
    .sig-col { width:22px; height:22px; border-radius:50%; border:2px solid rgba(255,255,255,.35); cursor:pointer; padding:0; }
    .sig-col.on { border-color:#ffd166; box-shadow:0 0 0 2px rgba(255,209,102,.45); transform:scale(1.1); }
    .sig-btns { display:flex; gap:7px; flex-wrap:wrap; justify-content:flex-end; }
    .sig-btn { padding:7px 13px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;
      background:rgba(255,255,255,.08); color:#dce8f4; border:1px solid rgba(255,255,255,.2); }
    .sig-btn:hover { background:rgba(255,255,255,.16); }
    .sig-btn.save { background:linear-gradient(90deg,#c98a1c,#f0c44c); color:#101822; border-color:#ffe48f; font-weight:900; }
    .sig-btn.save:hover { filter:brightness(1.07); }
  `;
  document.head.appendChild(st);
}

export function openSignaturePad({ roleTitle = "국방부장관", signerName = "", currentDataUrl = "", currentStrokes = null, onSave, onReset }) {
  injectSigStyles();
  let el = document.getElementById("sigPadM");
  if (!el) {
    el = document.createElement("div");
    el.id = "sigPadM";
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="sig-box">
    <div class="sig-head">
      <h3>✍️ 내 서명 만들기 · ${roleTitle} ${signerName}</h3>
    </div>
    <p class="sig-sub">마우스 또는 터치로 직접 서명하세요. 내가 결재하는 국방부장관 서류와 내 초상화 아래에 투명 잉크로 새겨집니다. (임명장의 대통령 서명처럼 다른 사람이 서명하는 칸은 바뀌지 않습니다.)</p>
    <div class="sig-pad-wrap">
      <div class="sig-pad-line"></div>
      <div class="sig-pad-hint">OFFICIAL SIGNATURE · 정자 또는 필기체로 서명하십시오</div>
      <canvas class="sig-canvas" width="460" height="170"></canvas>
    </div>
    <div class="sig-tools">
      <div class="sig-colors">
        <span>잉크 색상:</span>
        <button type="button" class="sig-col on" data-col="#111827" style="background:#111827" title="만년필 검정"></button>
        <button type="button" class="sig-col" data-col="#143264" style="background:#143264" title="공문서 감청"></button>
        <button type="button" class="sig-col" data-col="#785612" style="background:#785612" title="고전 세피아"></button>
      </div>
      <div class="sig-btns">
        <button type="button" class="sig-btn" id="sigClear">지우기</button>
        ${currentDataUrl ? `<button type="button" class="sig-btn" id="sigReset">내 서명 지우기</button>` : ""}
      </div>
    </div>
    <div class="sig-btns">
      <button type="button" class="sig-btn" id="sigCancel">취소</button>
      <button type="button" class="sig-btn save" id="sigSave">✍️ 서명 저장</button>
    </div>
  </div>`;

  const canvas = el.querySelector(".sig-canvas");
  const ctx = canvas.getContext("2d");
  let inkColor = "#111827";
  let drawing = false;
  let hasStroke = false;
  let lastPt = null;
  let lastT = 0;
  let strokes = [];   /* 획 기록: [{c: 색, p: [[x, y, 굵기], ...]}] — 결재 때 빠르게 재생한다 */
  let curStroke = null;

  if (currentDataUrl && Array.isArray(currentStrokes) && currentStrokes.length) {
    strokes = currentStrokes.map((st) => ({ c: st.c, p: st.p.map((q) => q.slice()) }));
    drawStrokes(ctx, strokes, 1);
    hasStroke = true;
  } else if (currentDataUrl) {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      hasStroke = true;
    };
    img.src = currentDataUrl;
  }

  const getPt = (ev) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((ev.clientX - r.left) / r.width) * canvas.width,
      y: ((ev.clientY - r.top) / r.height) * canvas.height,
    };
  };

  canvas.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    canvas.setPointerCapture?.(ev.pointerId);
    drawing = true;
    hasStroke = true;
    lastPt = getPt(ev);
    lastT = performance.now();
    ctx.fillStyle = inkColor;
    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    curStroke = { c: inkColor, p: [[Math.round(lastPt.x), Math.round(lastPt.y), 1.8]] };
    strokes.push(curStroke);
  });

  canvas.addEventListener("pointermove", (ev) => {
    if (!drawing || !lastPt) return;
    ev.preventDefault();
    const pt = getPt(ev);
    const now = performance.now();
    const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
    const dt = Math.max(1, now - lastT);
    const speed = dist / dt;
    const width = Math.max(1.8, Math.min(4.8, 4.4 - speed * 1.4));
    ctx.strokeStyle = inkColor;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(lastPt.x, lastPt.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    if (curStroke && curStroke.p.length < 600) curStroke.p.push([Math.round(pt.x), Math.round(pt.y), Math.round(width * 10) / 10]);
    lastPt = pt;
    lastT = now;
  });

  const endDraw = () => { drawing = false; lastPt = null; curStroke = null; };
  canvas.addEventListener("pointerup", endDraw);
  canvas.addEventListener("pointercancel", endDraw);

  el.querySelectorAll(".sig-col").forEach((btn) => {
    btn.onclick = () => {
      el.querySelectorAll(".sig-col").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      inkColor = btn.dataset.col;
    };
  });

  const close = () => el.classList.remove("on");
  el.querySelector("#sigClear").onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStroke = false;
    strokes = [];
  };
  const resetBtn = el.querySelector("#sigReset");
  if (resetBtn) {
    resetBtn.onclick = () => {
      close();
      if (onReset) onReset();
    };
  }
  el.querySelector("#sigCancel").onclick = close;
  el.querySelector("#sigSave").onclick = () => {
    if (!hasStroke) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      close();
      if (onReset) onReset();
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    close();
    if (onSave) onSave(dataUrl, strokes.length ? strokes : null);
  };
  el.classList.add("on");
}


/** 저장된 획을 캔버스에 그린다. progress 0~1 만큼의 점까지만 그려서 '쓰는 중' 모습을 만든다. */
function drawStrokes(ctx, strokes, progress = 1) {
  const total = strokes.reduce((n, st) => n + st.p.length, 0);
  let left = Math.max(0, Math.round(total * progress));
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const st of strokes) {
    if (left <= 0) break;
    ctx.strokeStyle = st.c; ctx.fillStyle = st.c;
    const n = Math.min(left, st.p.length);
    const [x0, y0, w0] = st.p[0];
    ctx.beginPath(); ctx.arc(x0, y0, w0 || 1.8, 0, Math.PI * 2); ctx.fill();
    for (let i = 1; i < n; i++) {
      ctx.lineWidth = st.p[i][2] || 2.4;
      ctx.beginPath(); ctx.moveTo(st.p[i - 1][0], st.p[i - 1][1]); ctx.lineTo(st.p[i][0], st.p[i][1]); ctx.stroke();
    }
    left -= st.p.length;
  }
}

/** 결재 서류 칸에 내 서명을 '쓰는 모션'으로 넣는다. 획 기록이 있으면 그대로 빠르게 재생하고, 없으면 왼쪽에서 오른쪽으로 번지듯 나타낸다. */
export function playSignature(host, { strokes = null, dataUrl = "", ms = 900, onDone } = {}) {
  if (!host) { onDone?.(); return; }
  const cv = document.createElement("canvas");
  cv.width = 460; cv.height = 170;
  cv.className = "sign-live";
  cv.style.cssText = "display:block;height:34px;max-width:96px;margin:2px auto;pointer-events:none;background:rgba(255,250,240,.85);border-radius:3px";
  host.appendChild(cv);
  const ctx = cv.getContext("2d");
  const t0 = performance.now();
  let img = null;
  if (!(strokes && strokes.length) && dataUrl) { img = new Image(); img.src = dataUrl; }
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (strokes && strokes.length) drawStrokes(ctx, strokes, k);
    else if (img && img.complete) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cv.width * k, cv.height); ctx.clip(); ctx.drawImage(img, 0, 0, cv.width, cv.height); ctx.restore(); }
    if (k < 1) requestAnimationFrame(step);
    else { if (dataUrl) { const fin = new Image(); fin.src = dataUrl; fin.alt = "서명"; fin.style.cssText = cv.style.cssText; cv.replaceWith(fin); } onDone?.(); }
  };
  requestAnimationFrame(step);
}
