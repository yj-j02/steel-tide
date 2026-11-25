/* 인사기록 카드 (E): 한 장짜리 공유용 이미지(1080×1350, 종이 서식).
   긴 회고록 PNG(relations.js)와 별개로, SNS·메신저에 바로 올릴 수 있는 요약 카드다. */
import { careerDate } from "./service-calendar.js";

function svgToImage(svgStr) {
  return new Promise((resolve) => {
    try {
      const clean = String(svgStr || "").replace(/<image\b[^>]*>/gi, "").replace(/^\s*<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ');
      if (!clean.startsWith("<svg")) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(clean);
    } catch { resolve(null); }
  });
}
function wrap(ctx, text, x, y, maxW, lh, maxLines = 3) {
  const words = String(text || "").split(/(\s+)/);
  let line = "", n = 0;
  for (const w of words) {
    const t = line + w;
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line.trim(), x, y); y += lh; n++; line = w.trimStart();
      if (n >= maxLines - 1) { while (ctx.measureText(line + "…").width > maxW && line) line = line.slice(0, -1); }
    } else line = t;
    if (n >= maxLines) return y;
  }
  if (line.trim()) { ctx.fillText(line.trim(), x, y); y += lh; }
  return y;
}

/** 카드 그리기 → canvas. data는 client.js chronCtx() + 추가 정보 */
export async function drawRecordCard(data) {
  const { cmdrName = "", rankName = "", post = "", svcName = "", branchName = "", origin = "", week = 1, medalsCount = 0, crisisCount = 0, achCount = 0, chapterLabel = "", log = [], rivals = [], portraitSvg = "", rankLabelFn = (g) => String(g), us = false } = data || {};
  const W = 1080, H = 1350, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  const SANS = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', SERIF = '"Noto Serif KR", "Nanum Myeongjo", serif';
  /* 종이 바탕 + 잔결 */
  x.fillStyle = "#e9e3d4"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#f8f3e6"; x.fillRect(48, 48, W - 96, H - 96);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(110,90,50,${Math.random() * 0.05})`; x.fillRect(48 + Math.random() * (W - 96), 48 + Math.random() * (H - 96), 1.4, 1.4); }
  x.strokeStyle = "#c8bc9f"; x.lineWidth = 2; x.strokeRect(48, 48, W - 96, H - 96);
  x.fillStyle = "#1f3a5f"; x.fillRect(48, 48, W - 96, 10);
  /* 머리 */
  x.fillStyle = "#a8322a"; x.font = `700 22px ${SANS}`; x.fillText(us ? "THE GENERAL · OFFICER RECORD CARD" : "THE GENERAL · 장교 인사기록 카드", 96, 120);
  x.fillStyle = "#6b6457"; x.font = `400 20px ${SANS}`; x.fillText(chapterLabel || "", 96, 152);
  x.strokeStyle = "#1d1b17"; x.lineWidth = 3; x.beginPath(); x.moveTo(96, 176); x.lineTo(W - 96, 176); x.stroke();
  x.lineWidth = 1; x.beginPath(); x.moveTo(96, 182); x.lineTo(W - 96, 182); x.stroke();
  /* 초상 */
  const img = await svgToImage(portraitSvg);
  x.fillStyle = "#efe7d3"; x.fillRect(96, 214, 300, 360); x.strokeStyle = "#c8bc9f"; x.strokeRect(96, 214, 300, 360);
  if (img) x.drawImage(img, 106, 224, 280, 340);
  /* 이름·계급 */
  x.fillStyle = "#1d1b17"; x.font = `700 64px ${SERIF}`; x.fillText(cmdrName, 430, 290);
  x.fillStyle = "#1f3a5f"; x.font = `700 32px ${SANS}`; x.fillText(rankName, 432, 340);
  x.fillStyle = "#4d473d"; x.font = `400 24px ${SANS}`;
  let yy = wrap(x, `${svcName} · ${branchName}`, 432, 384, 560, 34, 2);
  yy = wrap(x, post, 432, yy, 560, 34, 2);
  if (origin) wrap(x, origin, 432, yy, 560, 34, 1);
  /* 수치 칸 */
  const stats = [[us ? "복무" : "누적 복무", careerDate(week)], [us ? "Medals" : "훈장", `${medalsCount}`], [us ? "Crises" : "위기 대응", `${crisisCount}회`], [us ? "Achievements" : "업적", `${achCount}개`]];
  const bw = (W - 192 - 30) / 4;
  stats.forEach(([k, v], i) => {
    const bx = 96 + i * (bw + 10), by = 610;
    x.fillStyle = "#fffdf8"; x.fillRect(bx, by, bw, 110); x.strokeStyle = "#d6cfc0"; x.strokeRect(bx, by, bw, 110);
    x.fillStyle = "#6b6457"; x.font = `400 19px ${SANS}`; x.fillText(k, bx + 16, by + 34);
    x.fillStyle = "#1d1b17"; x.font = `700 ${v.length > 9 ? 20 : 30}px ${SANS}`; wrap(x, v, bx + 16, by + 76, bw - 28, 26, 2);
  });
  /* 주요 이력 */
  x.fillStyle = "#1f3a5f"; x.font = `700 26px ${SERIF}`; x.fillText(us ? "Key assignments" : "주요 이력", 96, 776);
  x.strokeStyle = "#d6cfc0"; x.beginPath(); x.moveTo(96, 792); x.lineTo(W - 96, 792); x.stroke();
  let y = 832;
  const L = log.slice(-5);
  x.font = `400 22px ${SANS}`;
  for (const e of L) { x.fillStyle = "#a8322a"; x.fillText("■", 96, y); x.fillStyle = "#1d1b17"; y = wrap(x, `${rankLabelFn(e.g)} · ${e.t || ""}${e.why && e.why !== "보직 변경" ? ` (${e.why})` : ""}`, 128, y, W - 240, 30, 1) + 6; }
  if (!L.length) { x.fillStyle = "#6b6457"; x.fillText(us ? "Commissioned" : "임관", 128, y); y += 36; }
  /* 동기 결말 */
  const fates = rivals.filter((r) => r.fate?.note || r.retiredNote).slice(0, 3);
  if (fates.length) {
    y += 14;
    x.fillStyle = "#1f3a5f"; x.font = `700 26px ${SERIF}`; x.fillText(us ? "Classmates" : "동기들의 길", 96, y);
    x.strokeStyle = "#d6cfc0"; x.beginPath(); x.moveTo(96, y + 16); x.lineTo(W - 96, y + 16); x.stroke();
    y += 52; x.font = `400 21px ${SANS}`;
    for (const r of fates) { x.fillStyle = "#1d1b17"; x.font = `700 21px ${SANS}`; x.fillText(r.name, 96, y); x.font = `400 21px ${SANS}`; x.fillStyle = "#4d473d"; y = wrap(x, r.fate?.note || r.retiredNote, 210, y, W - 320, 28, 2) + 8; if (y > H - 200) break; }
  }
  /* 도장·서명 */
  x.save(); x.translate(W - 220, H - 190); x.rotate(-0.12);
  x.strokeStyle = "rgba(168,50,42,.85)"; x.lineWidth = 5; x.beginPath(); x.arc(0, 0, 70, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 58, 0, Math.PI * 2); x.stroke();
  x.fillStyle = "rgba(168,50,42,.9)"; x.font = `800 30px ${SERIF}`; x.textAlign = "center"; x.fillText(us ? "CERTIFIED" : "확 인", 0, 10); x.restore();
  x.fillStyle = "#6b6457"; x.font = `400 18px ${SANS}`; x.fillText(us ? "Fictional game record · THE GENERAL" : "가상 게임 기록 · THE GENERAL", 96, H - 84);
  return c;
}

/** 카드를 저장하거나(공유 지원 기기면) 공유 시트를 연다. */
export async function saveRecordCard(data) {
  const c = await drawRecordCard(data);
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));
  if (!blob) return false;
  const name = `the-general-${(data?.cmdrName || "record").replace(/[^\w가-힣-]/g, "")}.png`;
  try {
    const file = new File([blob], name, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] }) && matchMedia("(pointer: coarse)").matches) { await navigator.share({ files: [file], title: "THE GENERAL 인사기록 카드" }); return true; }
  } catch { /* 공유 취소 시 저장으로 */ }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  return true;
}
