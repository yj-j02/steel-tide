import { services } from "./management-stories.js";

import { posts } from "./management-posts.js";

const key = (id) => "steeltide:management:v1:" + id;
const initial = () => ({ picks: [] });
function read(id) {
  try {
    const data = JSON.parse(localStorage.getItem(key(id)));
    if (
      Array.isArray(data?.picks) &&
      data.picks.length <= 4 &&
      data.picks.every((i) => i === 0 || i === 1)
    )
      return data;
  } catch {
    /* Allow play when local storage is unavailable. */
  }
  return initial();
}
function assignment(story, picks) {
  const route = story.routes[picks[0] ?? 0];
  const steps = [
    [story.title, story.intro, story.decision, story.routes.map((r) => r[0])],
    [
      "첫 결정의 여파",
      route[1],
      "추가 요청을 어떻게 처리할까?",
      route.slice(2),
    ],
    [
      "현장의 목소리",
      story.review,
      "남은 자원을 어디에 쓸까?",
      [story.fix, story.wait],
    ],
    [
      story.closing,
      picks[2] === 0
        ? "추가 지원이 도착했다. 담당자들은 다음 기수에도 같은 예산을 확보할 수 있을지 묻는다."
        : "새 일정이 자리 잡았다. 담당자들은 다음 달에도 겸직이 계속될까 걱정한다.",
      "다음 담당자에게 무엇을 남길까?",
      ["인수인계 워크숍", "현장팀이 직접 쓴 운영 기록"],
    ],
  ];
  return steps;
}
const costs = [
  [3, 2],
  [2, 2],
  [3, 2],
  [2, 1],
];
function resources(picks) {
  let budget = 8,
    staff = 6;
  picks.forEach((choice, week) => {
    if (choice === 0) budget -= costs[week][0];
    else staff -= costs[week][1];
  });
  return { budget, staff };
}
export function openManagement(panel) {
  let id = new URLSearchParams(location.search).get("service");
  if (!Object.hasOwn(services, id)) id = null;
  const role = new URLSearchParams(location.search).get("post");
  const story = id && Object.hasOwn(posts[id], role) ? posts[id][role] : null;
  const slot = id + ":" + role;
  let state = story ? read(slot) : initial();
  let warning = "";
  function render() {
    if (!id) {
      panel.innerHTML =
        '<div class="pick"><a href="?">‹ 모드 선택</a><h1>어느 군에 부임할까요?</h1><p>군을 선택한 뒤 첫 보직을 정합니다.</p><div class="mg-services">' +
        Object.entries(posts)
          .map(
            ([code, roles]) =>
              '<a class="region-link" href="?mode=management&service=' +
              code +
              '"><h2>' +
              services[code].name +
              "</h2><small>" +
              Object.values(roles)
                .map((r) => r.post)
                .join(" · ") +
              "</small></a>",
          )
          .join("") +
        "</div></div>";
      return;
    }
    if (!story) {
      panel.innerHTML =
        '<div class="pick"><a href="?mode=management">‹ 군 선택</a><h1>' +
        services[id].name +
        ' 보직 선택</h1><p>제1장 · 부임 후 첫 4주</p><div class="mg-services">' +
        Object.entries(posts[id])
          .map(([code, r]) => {
            const week = read(id + ":" + code).picks.length;
            return (
              '<a class="region-link" href="?mode=management&service=' +
              id +
              "&post=" +
              code +
              '"><small>' +
              r.unit +
              "</small><h2>" +
              r.post +
              "</h2><p>" +
              r.title +
              "</p><span>" +
              (week === 4
                ? "기록 보기"
                : week
                  ? week + 1 + "주차 이어하기"
                  : "부임하기") +
              " ›</span></a>"
            );
          })
          .join("") +
        "</div></div>";
      return;
    }
    const picks = state.picks,
      week = picks.length;
    const steps = assignment(story, picks),
      { budget, staff } = resources(picks);
    const ledger = picks
      .map((n, i) => "<li>" + (i + 1) + "주차 · " + steps[i][3][n] + "</li>")
      .join("");
    let body;
    if (week === 4) {
      const result =
        budget <= 1
          ? "예산을 집중해 현장 인력을 보호했습니다."
          : staff <= 1
            ? "내부 인력으로 일정을 지키고 다음 분기 예산을 확보했습니다."
            : "현장 인력과 예산을 나누어 다음 담당자의 여력을 남겼습니다.";
      body =
        "<h1>" +
        story.target +
        "</h1><p>" +
        story.routes[picks[0]][0] +
        "에서 시작한 한 달이 끝났습니다. " +
        result +
        '</p><a class="region-link" href="?mode=management">다른 군 이야기</a><button data-replay>이 보직 다시 시작</button>';
    } else {
      const [title, report, question, options] = steps[week];
      body =
        "<h1>" +
        title +
        "</h1><p>" +
        report +
        "</p><h2>" +
        question +
        "</h2>" +
        options
          .map((label, i) => {
            const amount = costs[week][i],
              available = i ? staff : budget;
            return (
              '<button data-choice="' +
              i +
              '" ' +
              (available < amount ? "disabled" : "") +
              ">" +
              label +
              "<small>" +
              (i ? "참모 여력" : "예산") +
              " " +
              available +
              " → " +
              (available < amount ? "부족" : available - amount) +
              "</small></button>"
            );
          })
          .join("");
    }
    panel.innerHTML =
      '<header><strong>STEEL TIDE</strong>국방 경영<a href="?mode=management&service=' +
      id +
      '">보직 선택</a><a href="?">모드 선택</a></header><main><article><p class="kicker">' +
      story.name +
      " · " +
      story.post +
      " · " +
      (week === 4 ? "제1장 완료" : week + 1 + "주차") +
      "</p>" +
      body +
      '<p role="status">' +
      warning +
      "</p></article><aside><h2>" +
      story.unit +
      "</h2><p>가용 예산 <b>" +
      budget +
      "</b>　참모 여력 <b>" +
      staff +
      "</b></p><h3>근무 기록</h3>" +
      (week
        ? "<ol>" + ledger + "</ol>"
        : "<p>이번 주 결정부터 기록됩니다.</p>") +
      "</aside></main>";
  }
  function save() {
    try {
      localStorage.setItem(key(slot), JSON.stringify(state));
    } catch {
      warning = "저장 공간에 접근할 수 없어 이번 세션에서만 진행합니다.";
    }
    render();
  }
  panel.onclick = (e) => {
    const button = e.target.closest("button");
    if (!button || button.disabled) return;
    if (
      button.hasAttribute("data-replay") &&
      confirm("이 보직의 첫 장 기록을 초기화할까요?")
    ) {
      state = initial();
      save();
    }
    if (button.hasAttribute("data-choice") && state.picks.length < 4) {
      state.picks.push(Number(button.dataset.choice));
      save();
    }
  };
  render();
}
