/* 장관 인사청문회 (G): 한국 국회 인사청문회 / 미국 상원 군사위원회 인준 청문회.
   질문 3개(미국은 퇴역 7년 규정 면제 표결이 하나 더). 답변 점수로 취임 직후 지지율이 바뀐다.
   제도 메모: 한국 국무위원은 청문 후 국회 동의 없이도 임명될 수 있다.
   미국 국방장관은 상원 인준이 필요하고, 현역 퇴역 7년 이내면 의회의 별도 면제 법안이 필요하다. */
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const KR_Q = [
  ["문민 통제", "위원: \"대장 전역 직후 장관이 되면 군을 감독하는 게 아니라 군을 대변하지 않겠습니까?\"",
    [["국방 정책은 국회 감독 아래 투명하게 공개하겠다고 약속한다", 3], ["군 경험이 있어야 개혁도 할 수 있다고 반박한다", 1], ["답변을 피하고 다음 질문을 요청한다", -2]]],
  ["방산 이해충돌", "위원: \"전역 후 방산업체 자문 경력이 있다는 제보가 있습니다. 해명하시죠.\"",
    [["자문 계약 내역 전체를 위원회에 제출한다", 3], ["\"보수 없는 명예직이었다\"고만 답한다", 0], ["\"인신공격\"이라며 언성을 높인다", -3]]],
  ["장병 처우", "위원: \"병사 처우 개선 예산, 임기 안에 어디까지 할 수 있습니까?\"",
    [["단계별 목표와 재원 계획을 수치로 제시한다", 3], ["\"최선을 다하겠다\"고 원론적으로 답한다", 0], ["\"재정 당국 소관\"이라고 넘긴다", -2]]],
];
const US_Q = [
  ["Waiver vote · 면제 표결", "퇴역 7년이 지나지 않아 의회가 별도 면제(waiver) 법안을 표결합니다. 표결 전 상원 지도부 면담 자리입니다.",
    [["문민 통제를 지킬 구체적 장치(독립 감찰·민간 차관 권한)를 약속한다", 3], ["\"전례가 있다\"며 면제를 당연하게 요구한다", -1], ["면제 없이 기다리겠다고 하되 지명은 유지한다", 1]]],
  ["Civilian control · 문민 통제", "SASC 위원장: \"How will you keep your former service from capturing the Pentagon?\"",
    [["민간 관료 중심의 의사결정 구조를 유지하겠다고 답한다", 3], ["\"I know the uniform better than anyone\"이라 답한다", 0], ["질문 취지를 문제 삼는다", -2]]],
  ["Readiness & budget · 대비태세·예산", "위원: \"Shipyard backlog and munitions stockpiles — your first-year plan?\"",
    [["정비 적체·탄약 비축 목표를 분기별로 보고하겠다고 약속한다", 3], ["\"Congress must fund it\"이라 답한다", 0], ["세부 질문은 비공개로 하자고 한다", -1]]],
];

/** 청문회를 띄우고 끝나면 onDone({ score, delta, label }) 호출 */
export function openConfirmationHearing({ us = false, name = "", onDone } = {}) {
  if (typeof document === "undefined") { onDone?.({ score: 0, delta: 0, label: "" }); return; }
  const Q = us ? US_Q : KR_Q, max = Q.length * 3;
  let i = 0, score = 0;
  document.querySelector("#hearingOv")?.remove();
  const ov = document.createElement("div");
  ov.id = "hearingOv";
  ov.className = "hr-ov";
  document.body.appendChild(ov);
  const render = () => {
    const [topic, prompt, answers] = Q[i];
    ov.innerHTML = `<div class="hr-doc mn-paper" role="dialog" aria-label="인사청문회">
      <div class="dh"><div class="dt"><small>${us ? "U.S. SENATE · ARMED SERVICES COMMITTEE" : "대한민국 국회 · 국방위원회"} · ${i + 1}/${Q.length}</small><b>${us ? "국방장관 인준 청문회" : "국방부장관 후보자 인사청문회"}</b><span>${esc(name)} ${us ? "nominee" : "후보자"} · ${esc(topic)}</span></div></div>
      <p>${esc(prompt)}</p>
      ${answers.map(([t], k) => `<button type="button" data-hr="${k}">${esc(t)}</button>`).join("")}
    </div>`;
    ov.querySelector("button")?.focus();
  };
  const finish = () => {
    const ratio = score / max;
    const delta = ratio >= 0.8 ? 6 : ratio >= 0.5 ? 2 : ratio >= 0.2 ? -3 : -8;
    const verdict = us
      ? (ratio >= 0.5 ? `상원 인준 가결 · 면제 법안 통과 (청문 점수 ${score}/${max})` : `상원 인준 신승 · 반대 표 다수 (청문 점수 ${score}/${max})`)
      : (ratio >= 0.5 ? `인사청문 경과보고서 채택 (청문 점수 ${score}/${max})` : `청문보고서 채택 불발 — 대통령 임명 강행 (청문 점수 ${score}/${max})`);
    const label = `${verdict} · 취임 지지율 ${delta >= 0 ? "+" : ""}${delta}`;
    ov.innerHTML = `<div class="hr-doc mn-paper" role="dialog"><div class="dh"><div class="dt"><small>${us ? "CONFIRMATION RESULT" : "청문회 결과"}</small><b>${esc(verdict)}</b><span>취임 직후 지지율 ${delta >= 0 ? "+" : ""}${delta}</span></div></div>
      <p>${us ? "인준 결과는 펜타곤 첫 주 지지율에 반영됩니다." : "한국 국무위원은 청문보고서가 채택되지 않아도 대통령이 임명할 수 있습니다. 결과는 취임 첫 주 지지율에 반영됩니다."}</p>
      <button type="button" data-hr="done" class="hr-go">${us ? "취임 선서로 ▶" : "임명장 수여식으로 ▶"}</button></div>`;
    ov.querySelector("button").focus();
    ov.querySelector("[data-hr=done]").onclick = () => { ov.remove(); onDone?.({ score, delta, label }); };
  };
  ov.addEventListener("click", (e) => {
    const b = e.target.closest("[data-hr]"); if (!b || b.dataset.hr === "done") return;
    score += Q[i][2][Number(b.dataset.hr)][1];
    i += 1;
    if (i >= Q.length) finish(); else render();
  });
  render();
}
