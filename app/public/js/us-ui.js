import { careerStorage } from "./characters.js";
import { docketPaper, adminBar } from "./career-rules.js";
import { econIsAdminCode } from "./shop.js";
import { stripes, stations, parties, tiles, electors } from "./content/us.js";
import { land, project } from "./indopac.js";
import {
  newCareer,
  role,
  brief,
  choices,
  decide,
  election, DEPT_GOAL } from "./us-career.js";
import { playCuts, setTheme } from "./scene.js";
const KEY = "steeltide:us:career";
const phases = [
  ["Service", "service"],
  ["Nomination", "waiver", "hearing"],
  ["Pentagon", "defense"],
  [
    "Election",
    "party",
    "primary",
    "convention",
    "campaign",
    "debate",
    "night",
    "contingent",
  ],
  ["White House", "cabinet", "bill", "crisis", "summit", "renew", "trial"],
  ["Archive", "end"],
];
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
function gradeMark(rank) {
  let y = 3;
  const stripesSvg = stripes[rank].map((width) => {
    const line = `<rect x="3" y="${y}" width="25" height="${width * 1.5}"/>`;
    y += width * 1.5 + 1.5;
    return line;
  });
  return `<svg class="mark" width="31" viewBox="0 0 31 35" fill="#ebc77b" aria-hidden="true">${stripesSvg.join("")}</svg>`;
}
function map(s) {
  const points = stations.map(([name, lon, lat], i) => {
    const [x, y] = project(lon, lat);
    return `<g transform="translate(${x} ${y})"><circle r="4" fill="${i === s.station ? "#f7c76c" : "#b1d9df"}"/><text x="${x > 350 ? -8 : 8}" text-anchor="${x > 350 ? "end" : "start"}" y="-4" fill="white" font-size="15">${name}</text></g>`;
  });
  return `<svg class="board" viewBox="0 0 470 520" role="img" aria-label="Indo-Pacific situation board"><path d="${land}" fill="#36565e"/>${points.join("")}</svg>`;
}
function electionMap(s) {
  return `<div class="tiles">${tiles
    .join(" ")
    .split(" ")
    .map((code) => {
      if (code === "..") return "<span></span>";
      const count = s.results?.[code];
      const value =
        count == null ? electors[code] : count + "/" + electors[code];
      const swing =
        Math.abs((s.polls?.[code] ?? 20) + 2 * (s.visits[code] || 0)) < 6;
      const color =
        count == null
          ? swing
            ? "#755b32"
            : ""
          : count === electors[code]
            ? "#286958"
            : count
              ? "#746137"
              : "#584854";
      return `<button data-state="${code}" aria-pressed="${s.target === code}" style="background-color:${color}" ${s.phase !== "campaign" ? "disabled" : ""}>${code}<small>${value}</small></button>`;
    })
    .join("")}</div>`;
}
function status(s) {
  if (s.phase === "defense")
    return `Decision ${s.turn + 1}/30 · Budget ${s.funds} · Service record ${s.record} (goal ${DEPT_GOAL})`;
  if (s.phase === "service")
    return `U.S. Navy · O-${s.rank + 1} · ${s.xp || 0} XP · ${stations[s.station][0]}`;
  if (s.phase === "campaign")
    return `Campaign stop ${s.turn + 1}/10 · ${s.turn >= 7 ? "Early and mail voting underway" : "Field operations"}`;
  if (s.phase === "primary") return `Delegate tally ${s.delegates}/100`;
  if (s.phase === "night")
    return `Projected electors ${Object.values(s.results).reduce((a, b) => a + b, 0)}/538`;
  if (s.term)
    return `Term ${s.term} · Year ${Math.ceil(s.quarter / 4)}, Q${((s.quarter - 1) % 4) + 1} · ${s.laws} laws enacted`;
  return parties[s.party] || "United States";
}
function adminActions(s) {
  if (["service", "waiver", "hearing"].includes(s.phase))
    return [["confirm", "Confirm nominee"]];
  if (s.phase === "defense") return [["party", "Complete tenure"]];
  if (["party", "primary", "convention"].includes(s.phase))
    return [["primary", "Win nomination"]];
  if (["campaign", "debate", "night", "contingent"].includes(s.phase))
    return [
      ["night", "Election night"],
      ["win", "Win election"],
      ["loss", "Lose election"],
    ];
  if (s.phase !== "end")
    return [
      ["seats", "Change seats"],
      ["quarter", "Skip quarter"],
      ["end", "End term"],
    ];
  return [];
}
function admin(s, id) {
  if (!s.admin || !adminActions(s).some(([key]) => key === id)) return;
  if (id === "confirm") {
    s.phase = "hearing";
    decide(s, 0);
  }
  if (id === "party") s.phase = "party";
  if (id === "primary") {
    if (!s.party) s.party = "blue";
    s.delegates = 75;
    s.phase = "convention";
    decide(s, 0);
  }
  if (["win", "loss", "night"].includes(id)) {
    s.phase = "night";
    s.results = election(s, Math.random);
    if (id !== "night") {
      for (const key in electors)
        s.results[key] = id === "win" ? electors[key] : 0;
      decide(s, 0);
    }
  }
  if (id === "seats") {
    s.house = s.house > 217 ? 190 : 300;
    s.senate = s.senate > 50 ? 32 : 70;
  }
  if (id === "quarter") {
    if (s.quarter < 16) {
      s.quarter++;
      s.phase = "cabinet";
    } else if (s.term === 1) s.phase = "renew";
    else {
      s.ending = "Presidential retirement";
      s.phase = "end";
    }
  }
  if (id === "end") {
    s.phase = "end";
    s.ending = "Presidential retirement";
  }
}
function startCareer(panel) {
  let s;
  try {
    s = JSON.parse(careerStorage.getItem(KEY));
  } catch {
    /* Storage unavailable. */
  }
  if (!s || !phases.some((row) => row.slice(1).includes(s.phase)))
    s = newCareer();
  let warning = "";
  let tallyTimer;
  const save = () => {
    try {
      careerStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      warning = "Local saving is unavailable.";
    }
  };
  function render() {
    clearInterval(tallyTimer);
    setTheme(s.party);
    panel.dataset.party = s.party || "";
    const [title, description] = brief(s);
    const voting = ["campaign", "debate", "night"].includes(s.phase);
    const buttons = choices(s)
      .map((label, i) => {
        const disabled =
          (s.phase === "campaign" && !s.target) ||
          (s.phase === "defense" && i === 0 && s.funds < 2);
        return `<button data-choice="${i}" ${disabled ? "disabled" : ""}>${escape(label)}${s.phase === "defense" ? [" (−2 budget)", " (+1 budget)", " (−2 record)"][i] : ""}</button>`;
      })
      .join("");
    const steps = phases
      .map(([name, ...stages]) =>
        stages.includes(s.phase) ? `<strong>${name}</strong>` : name,
      )
      .join("　›　");
    panel.innerHTML = `<header><strong>STEEL TIDE</strong><span>United States · ${escape(role(s))}</span><a href="?">Change edition</a></header>
      <main><article><p class="steps">${steps}</p><p class="kicker">${escape(status(s))}</p><h1>${escape(title)}</h1>
      ${s.phase === "defense" ? "" : `<p>${escape(description)}</p>`}
      ${voting ? electionMap(s) : ""}${s.phase === "campaign" ? `<p>${s.target ? "Next stop · " + escape(s.target) : "Choose a stop. Gold tiles show close races in this fictional election."}</p>` : ""}
      <div class="actions">${s.phase === "defense" ? docketPaper("Department of Defense", "Decision memorandum", "Item " + (s.turn + 1), escape(description), buttons) : buttons}${s.phase === "end" ? "<button data-new>Start another career</button>" : ""}</div>
      ${adminBar(s.admin, "Admin test", adminActions(s))}
      <details><summary>Service record & settings</summary><p>${escape(role(s))} · Department record ${s.record}</p><label><input type="checkbox" data-scenes ${s.quiet ? "" : "checked"}> Play career scenes</label>
      ${s.admin ? "" : '<form><label>Access code <input type="password" maxlength="32" autocomplete="off"></label><button>Apply</button></form>'}</details><p role="status">${escape(warning)}</p></article>
      <aside><p class="kicker">Personnel record</p><h2>${s.term ? '<img class="mark" src="img/us_mark.svg" alt="">' : s.phase === "service" ? gradeMark(s.rank) : ""}${escape(role(s))}</h2>
      <p class="stats">Public trust ${s.trust} · ${s.party ? escape(parties[s.party]) : "Nonpartisan"}</p>
      ${s.term ? `<p>House ${s.house}/435 · Senate ${s.senate}/100</p>` : ""}
      ${["service", "defense", "crisis", "summit"].includes(s.phase) ? map(s) : ""}
      <h3>Recent decisions</h3><ol class="ledger">${s.log
        .slice(0, 5)
        .map((t) => `<li>${escape(t)}</li>`)
        .join("")}</ol></aside></main>`;
    if (s.phase === "night" && !s.quiet) {
      const cells = [...panel.querySelectorAll("[data-state]")];
      let index = 0,
        called = 0;
      const desk = panel.querySelector("article .kicker");
      for (const cell of cells) cell.querySelector("small").textContent = "…";
      tallyTimer = setInterval(() => {
        const cell = cells[index++],
          state = cell.dataset.state;
        called += s.results[state];
        cell.querySelector("small").textContent =
          s.results[state] + "/" + electors[state];
        desk.textContent =
          "Network projections · " +
          called +
          " electors · " +
          index +
          "/51 called";
        if (index === cells.length) clearInterval(tallyTimer);
      }, 70);
    }
  }
  function transition(i) {
    const before = s.phase;
    decide(s, i);
    save();
    render();
    if (s.quiet) return;
    const scenes = {
      hearing: ["us_hearing", "Senate Armed Services Committee"],
      debate: ["us_debate", "Televised candidate forum"],
      night: ["us_election_night", "Network election desk"],
      convention: ["us_convention", "National convention"],
      summit: ["us_summit", "Bilateral meeting"],
      crisis: ["us_situation", "White House Situation Room"],
    };
    let cut = scenes[s.phase];
    if (s.phase === "cabinet" && ["night", "contingent"].includes(before))
      cut = ["us_inauguration", "Inauguration Day"];
    if (cut && before !== s.phase)
      playCuts({
        title: cut[1],
        place: "United States",
        cuts: [{ img: cut[0], who: role(s), text: brief(s)[1] }],
      });
  }
  panel.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.state) {
      s.target = b.dataset.state;
      save();
      render();
    }
    if (b.hasAttribute("data-choice")) transition(Number(b.dataset.choice));
    if (b.dataset.adm) {
      admin(s, b.dataset.adm);
      save();
      render();
    }
    if (b.hasAttribute("data-new")) {
      s = newCareer();
      save();
      render();
    }
  };
  panel.onchange = (e) => {
    if (e.target.hasAttribute("data-scenes")) {
      s.quiet = !e.target.checked;
      save();
    }
  };
  panel.onsubmit = (e) => {
    e.preventDefault();
    s.admin = econIsAdminCode(e.target.querySelector("input").value);
    warning = s.admin ? "" : "Invalid access code.";
    save();
    render();
  };
  save();
  render();
}
export { startCareer };
