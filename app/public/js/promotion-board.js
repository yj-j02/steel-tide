import { ECON_RANK_XP } from "./shop.js";
import { usNpcName } from "./us-ranks.js";
import { career, saveCareer } from "./career.js";
import { board, minWeeks, weeksOf, recordEval } from "./service.js";
import { curFlagPosts, postTier, isUS } from "./staff.js";
import { dutyState, saveDuty, rivalEligible, syncRivalPosts } from "./duty.js";

const bound = (n, max) => Math.max(0, Math.min(max, n));
const termKey = (week) => Math.floor((week - 1) / 4);
function track(title, br) {
  if (
    ["acq", "pol"].includes(br) ||
    /합참|합동|정책|획득|Joint|Pentagon|Policy|Acquisition/i.test(title)
  )
    return "joint";
  if (
    /함장|대장$|단장$|사령관|소대장|중대장|Commander|Commanding Officer|Leader/i.test(
      title,
    )
  )
    return "cmd";
  return "staff";
}
export function hint(title) {
  return {
    key: "핵심 지휘·전략 경험이 심사에 반영됩니다.",
    std: "안정적인 직무 수행과 평정이 중요합니다.",
    back: "지원·교육 경험을 쌓는 자리입니다.",
  }[postTier(title)];
}
export function preview(g, xp, title, br, svc, d = dutyState()) {
  const b = board(g, xp),
    season = termKey(d.week),
    cutoff = [55, 68, 76, 78][g < 3 ? 0 : g < 5 ? 1 : g === 5 ? 2 : 3];
  const prior = career.boardHistory?.at(-1),
    tours = career.tours || {};
  const kind = track(title, br),
    cmd = (tours.cmd || 0) + Number(kind === "cmd"),
    joint = (tours.joint || 0) + Number(kind === "joint");
  const legacy = career.boardLegacyGrade === g,
    gap =
      g === 5 && !legacy
        ? isUS()
          ? !joint && !tours.edu
            ? 10
            : 0
          : !cmd
            ? 8
            : 0
        : 0;
  const parts = [
    ["근무평정", Math.round(bound(((b.e.avg - 55) * 40) / 45, 40))],
    ["보직 트랙", { key: 25, std: 15, back: 5 }[postTier(title)]],
    ["군내 평판", Math.round(bound(d.rep, 100) / 5)],
    [
      "전공·훈장",
      bound(
        (career.crisisWins?.[g] || 0) * 5 +
          Object.keys(career.medals || {}).length * 2,
        15,
      ),
    ],
  ];
  const bonus = (cmd && joint ? 5 : 0) + (tours.edu && g >= 5 ? 8 : 0);
  const penalty =
    bound(
      (d.auditByGrade?.[g] || 0) * 4 + ((d.lowMoraleWeeks || 0) >= 2 ? 4 : 0),
      10,
    ) + gap;
  const score = bound(
    parts.reduce((sum, [, v]) => sum + v, 0) + bonus - penalty,
    100,
  );
  const posts = curFlagPosts().filter(
    (p) => p.g === g + 1 && (p.svc === svc || p.svc === "joint"),
  );
  const vacant = posts.filter(
    (p) => !d.rivals?.some((r) => r.g === g + 1 && r.post === p.t),
  );
  const seats =
    g < 3 ? 1 : g < 5 ? 2 : Math.min(vacant.length, g === 5 ? 2 : 1);
  const rivals = (d.rivals || [])
    .map((r, index) => ({
      index,
      name: isUS() ? usNpcName(r.name + index) : r.name,
      g: r.g,
      score: bound(
        57 +
          ((season * 7 + index * 13) % 24) +
          (r.style === "야전 엘리트" ? 3 : 0),
        100,
      ),
    }))
    .filter((r) => g >= 3 && r.g === g && rivalEligible(d.rivals[r.index], d.week));
  const ready =
    g < 9 &&
    season > 0 &&
    b.weeks - ((d.week - 1) % 4) >= b.needWk &&
    prior?.season !== season &&
    b.wk &&
    b.xp &&
    b.cnt &&
    !career.discharged;
  return {
    parts,
    cutoff,
    score,
    bonus,
    penalty,
    season,
    seats,
    rivals,
    posts,
    vacant,
    ready,
    kind,
  };
}
export function settle(g, xp, title, br, svc, preferred) {
  const d = dutyState(),
    v = preview(g, xp, title, br, svc, d);
  if (
    !v.ready ||
    !v.seats ||
    (g === 8 && !v.vacant.some((p) => p.t === preferred))
  )
    return null;
  const ranked = [{ index: -1, score: v.score }, ...v.rivals]
    .filter((r) => r.score >= v.cutoff)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = ranked.slice(0, v.seats),
    passed = selected.some((r) => r.index === -1);
  const reason = passed
    ? "진급 선발"
    : v.score < v.cutoff
      ? "기준 미달 · " +
        v.parts
          .map(([n, s], i) => [n, s / [40, 25, 20, 15][i]])
          .sort((a, b) => a[1] - b[1])[0][0]
      : "동기 경쟁에서 정원 밖";
  const receipt = {
    season: v.season,
    grade: g,
    score: v.score,
    passed,
    reason,
  };
  (career.boardHistory ??= []).push(receipt);
  if (passed) {
    career.cap = g + 1;
    career.defer = 0;
    career.picks = (career.picks || 0) + 1;
    const tours = (career.tours ??= {});
    tours[v.kind] = (tours[v.kind] || 0) + 1;
    if (g >= 5) {
      const seat =
        v.vacant.find((p) => p.t === preferred) ||
        v.vacant.find((p) => p.b === br) ||
        v.vacant[0];
      career.post = { g: g + 1, t: seat.t };
    }
  } else if (g >= 3 && ++career.defer >= 3)
    career.discharged = {
      g,
      title,
      avg: board(g, xp).e.avg,
      at: new Date().toISOString().slice(0, 10),
    };
  for (const r of selected.filter((r) => r.index >= 0)) {
    d.rivals[r.index].g = g + 1;
    d.rivals[r.index].rankSinceWeek = d.week;
    d.rivals[r.index].post = null;
  }
  if (passed && g < 3) {
    for (const rival of d.rivals || []) {
      if (rival.g !== g || !rivalEligible(rival, d.week)) continue;
      rival.g++;
      rival.rankSinceWeek = d.week;
      rival.post = null;
    }
  }
  syncRivalPosts(
    d,
    svc,
    passed ? (career.post?.g === g + 1 ? career.post.t : "") : title,
  );
  saveDuty(d);
  saveCareer();
  return receipt;
}
export function prepareRecord(g) {
  if (career.boardVersion) return;
  career.boardLegacyGrade = g > 0 || weeksOf(g) > 0 ? g : null;
  career.boardVersion = 1;
  career.defer = 0;
  saveCareer();
}
export function interact(id, g) {
  const d = dutyState();
  if (id.startsWith("deputy-") && g >= 9 && !career.deputy) {
    const index = Number(id.slice(7)),
      r = d.rivals?.[index];
    if (!r || !(r.rel >= 75)) return;
    career.deputy = isUS() ? usNpcName(r.name + index) : r.name;
    d.rep = bound(d.rep + 3, 100);
    saveCareer();
  } else if (
    id === "study" &&
    g >= 3 &&
    g <= 5 &&
    !career.tours?.edu &&
    !d.study &&
    d.doneWeek
  ) {
    d.study = 2;
    d.pending = [];
    d.report = null;
    d.crisis = null;
  } else if (
    (id === "share" || id === "solo") &&
    d.week % 7 === 0 &&
    d.peerWeek !== d.week &&
    d.rivals?.length
  ) {
    const peer = d.rivals[(d.week / 7 - 1) % d.rivals.length];
    peer.rel = bound((peer.rel ?? 50) + (id === "share" ? 15 : -12), 100);
    if (id === "share") d.rep = bound(d.rep + 3, 100);
    else recordEval(g, Math.min(100, board(g, g).e.avg + 5));
    d.peerWeek = d.week;
  } else return;
  saveDuty(d);
}
export function boardCard(g, xp, title, br, svc, d, experience) {
  if (g === 0 && !career.log.some(entry => entry.g > 0) && weeksOf(0) < d.week - 1) {
    career.rankWeeks[0] = d.week - 1;
    saveCareer();
  }
  prepareRecord(g);
  const v = preview(g, xp, title, br, svc, d),
    left = (4 - ((d.week - 1) % 4)) % 4;
  const peer =
    d.rivals?.[(d.week / 7 - 1) % Math.max(1, d.rivals?.length || 1)];
  const last = career.boardHistory?.at(-1);
  const b = board(g, xp);
  const requirements = g < 9 ? `<p>경험치 ${experience.toLocaleString()} / ${ECON_RANK_XP[g+1].toLocaleString()} XP · 평정 ${b.e.n} / ${b.need}회 · 예상 심사 ${v.score} / ${v.cutoff}점</p>` : "";
  return (
    '<section class="mn-card"><b>정기 진급심사위원회</b><p>' +
    (g >= 9
      ? "정규 심사 종료"
      : v.ready
        ? v.seats
          ? "이번 차수 상정 가능"
          : "상위 보직 공석 대기 · 누락 미산입"
        : left
          ? "다음 심사까지 " + left + "주"
          : "이번 차수 자격 확인") +
    " · 현 계급 " +
    weeksOf(g) +
    " / " +
    minWeeks(g) +
    "주</p>" + requirements +
    (last
      ? "<p>최근 심사 · " + last.score + "점 · " + last.reason + "</p>"
      : "") +
    (v.ready && v.seats
      ? '<button data-duty="review">진급심사 받기 · 채점표 확인</button>'
      : "") +
    (d.study
      ? "<p>고등군사교육 · 남은 세미나 " + d.study + "주</p>"
      : g >= 3 && g <= 5 && d.doneWeek && !career.tours?.edu
        ? '<button data-duty="study">' +
          (isUS()
            ? g === 5
              ? "미 국방대학"
              : "미 지휘참모대학"
            : g === 5
              ? "국방대학교"
              : "합동군사대학교") +
          " 2주 파견</button>"
        : "") +
    (g >= 9 && !career.deputy
      ? (d.rivals || [])
          .map((r, i) =>
            r.rel >= 75
              ? '<button data-duty="deputy-' +
                i +
                '">' +
                (isUS() ? usNpcName(r.name + i) : r.name) +
                " 차장 기용 · 장관 취임 지지율 +3</button>"
              : "",
          )
          .join("")
      : "") +
    (peer && d.peerWeek !== d.week
      ? "<p>동기 " +
        (isUS() ? usNpcName(peer.name + d.rivals.indexOf(peer)) : peer.name) +
        '의 공동 예산 보고 요청</p><button data-duty="share">공동 보고 · 관계 강화</button><button data-duty="solo">단독 보고 · 개인 평정</button>'
      : "") +
    "</section>"
  );
}
