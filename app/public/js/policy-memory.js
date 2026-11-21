const escape = value => String(value).replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;",
})[c]);

export function remember(state, quarter, issue, title, choice, advice) {
  const history = state.policyDecisions ??= [];
  history.push({ quarter, issue, title, choice, advice });
}

export function followUp(state, quarter, issue) {
  const previous = (state.policyDecisions || []).findLast(entry => entry.issue === issue && entry.quarter < quarter);
  return previous ? `<p><b>후속 보고</b> · 지난 결정 ‘${escape(previous.choice)}’ 이후의 안건입니다. ${escape(previous.advice)}</p>` : "";
}

export function quarterBrief(state, quarter, adviser) {
  const entries = (state.policyDecisions || []).filter(entry => entry.quarter === quarter - 1);
  if (!entries.length) return "";
  return `<section class="mn-card"><h3>전 분기 결정 후속 브리핑</h3>${entries.map(entry =>
    `<p><b>${escape(entry.title)}</b> · ${escape(entry.choice)}<br><small>${adviser}　“${escape(entry.advice)}”</small></p>`
  ).join("")}</section>`;
}
