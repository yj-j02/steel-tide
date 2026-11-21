import { econRank, ECON_RANK_XP } from "./shop.js";
import { chamberVote } from "./career-rules.js";
import {
  ranks,
  stations,
  parties,
  primaryRounds,
  defense,
  campaign,
  agenda,
  debates,
  partners,
  crises,
  electors,
} from "./content/us.js";

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function newCareer() {
  return {
    phase: "service",
    rank: 0,
    turn: 0,
    trust: 50,
    funds: 8,
    record: 0,
    score: 0,
    party: null,
    delegates: 0,
    visits: {},
    xp: 0,
    polls: {},
    term: 0,
    quarter: 1,
    house: 222,
    senate: 51,
    laws: 0,
    orders: 0,
    log: [],
    station: 0,
    results: null,
    admin: false,
  };
}
export function role(s) {
  if (s.phase === "service") return ranks[s.rank];
  if (s.phase === "waiver" || s.phase === "hearing")
    return "Secretary-designate";
  if (s.phase === "defense") return "Secretary of Defense";
  if (s.phase === "end") return "Service archive";
  return s.term ? "President" : "Former Secretary of Defense";
}
function log(s, line) {
  s.log.unshift(line);
  s.log.length = Math.min(20, s.log.length);
}
function end(s, title) {
  s.phase = "end";
  s.ending = title;
  log(s, title);
}
function beginCampaign(s) {
  s.phase = "primary";
  s.turn = 0;
  s.delegates = 0;
  s.visits = {};
  s.score = clamp((s.trust - 50) / 10, -3, 3);
  s.results = null;
}
function inaugurate(s) {
  s.term++;
  s.phase = "cabinet";
  s.quarter = 1;
  if (s.term === 1) s.trust = 50;
  log(s, "Inauguration · Term " + s.term);
}
function nextQuarter(s, rng) {
  if (s.quarter === 8) {
    const shift = Math.round((s.trust - 50) / 2 + (rng() - 0.5) * 18);
    s.house = clamp(s.house + shift, 0, 435);
    s.senate = clamp(s.senate + clamp(Math.round(shift / 5), -16, 16), 0, 100);
    log(
      s,
      "Midterms · All House seats and one Senate class contested. Party holds " +
        s.house +
        " House and " +
        s.senate +
        " Senate seats.",
    );
  }
  if (s.quarter === 16) {
    if (s.term === 1) s.phase = "renew";
    else retire(s);
  } else {
    s.quarter++;
    s.phase = "cabinet";
  }
}
function retire(s) {
  end(
    s,
    s.trust >= 70
      ? "Successful presidency"
      : s.trust >= 54
        ? "Stable presidency"
        : s.trust >= 35
          ? "Mixed legacy"
          : "Lame-duck retirement",
  );
}
export function election(s, rng) {
  const tide = (rng() - 0.5) * 24 + s.score - 5;
  const results = {};
  for (const [state, total] of Object.entries(electors)) {
    const margin =
      (s.polls?.[state] ?? (rng() - 0.5) * 40) +
      tide +
      (s.visits[state] || 0) * 2;
    let votes = margin >= 0 ? total : 0;
    if (state === "ME" || state === "NE") {
      votes = margin >= 0 ? 2 : 0;
      for (let i = 2; i < total; i++)
        votes += Number(margin + (rng() - 0.5) * 15 >= 0);
    }
    results[state] = votes;
  }
  return results;
}
export function brief(s) {
  const office = s.phase;
  if (office === "service")
    return [
      "Pacific duty station",
      stations[s.station][0] +
        " requests support for a civilian port readiness review.",
    ];
  if (office === "waiver")
    return [
      "Civilian control",
      "The President has nominated you immediately after retirement. An O-7 or higher regular officer normally waits ten years. Congress must enact an exception before appointment.",
    ];
  if (office === "hearing")
    return [
      "Senate confirmation",
      "The Armed Services Committee asks how civilian officials will oversee your former service.",
    ];
  if (office === "defense") return defense[s.turn];
  if (office === "party")
    return [
      "A return to public life",
      "Choose a fictional party for your campaign.",
    ];
  if (office === "primary")
    return [
      [
        "Iowa caucuses",
        "New Hampshire primary",
        "Super Tuesday",
        "Final primaries",
      ][s.turn],
      "Win more than half of 100 convention delegates. Allocation and calendar simplified for gameplay.",
    ];
  if (office === "convention")
    return [
      "National convention",
      s.delegates + " delegates pledged to your ticket.",
    ];
  if (office === "campaign") return campaign[s.turn];
  if (office === "debate")
    return [
      "Candidate forum · fictional series",
      debates[Math.floor(s.turn / 3) - 1][0],
    ];
  if (office === "night")
    return [
      "Election night",
      "Networks project returns state by state. A majority requires 270 of 538 electors.",
    ];
  if (office === "contingent")
    return [
      "Contingent election",
      "The electoral vote is tied. The House chooses a president by state delegation.",
    ];
  if (office === "trial")
    return [
      "Senate impeachment trial",
      "The House adopted articles of impeachment. With all senators present the threshold for conviction is 67.",
    ];
  if (office === "cabinet") return agenda[s.quarter - 1];
  if (office === "bill")
    return [
      "Enrolled bill",
      "Both chambers passed the measure. The legislation awaits your signature.",
    ];
  if (office === "summit")
    return [
      "Regional summit · " + partners[Math.floor(s.quarter / 4) - 1],
      "Partners have proposed a joint disaster assistance agreement.",
    ];
  if (office === "crisis")
    return [
      crises[(Math.floor(s.quarter / 3) - 1 + s.term - 1) % crises.length],
      "The Situation Room requests a civilian relief decision.",
    ];
  if (office === "renew")
    return [
      "End of the first term",
      "Seek another nomination or retire from public life.",
    ];
  return [s.ending, "Your career record is available below."];
}
function afterPolicy(s, rng) {
  if (s.quarter % 3 === 0) s.phase = "crisis";
  else if (s.quarter % 4 === 0) s.phase = "summit";
  else nextQuarter(s, rng);
}
export function choices(s) {
  switch (s.phase) {
    case "service":
      return ["Coordinate a port review", "Organize a relief exercise"];
    case "waiver":
      return s.waiverDenied
        ? ["Return after the waiting period"]
        : ["Seek a congressional waiver", "Return after the waiting period"];
    case "hearing":
      return [
        "Commit to independent civilian review",
        "Withdraw the nomination",
      ];
    case "defense":
      return [...defense[s.turn].slice(2), "Defer the decision"];
    case "party":
      return Object.values(parties);
    case "primary":
      return ["Organize a delegate slate", "Hold a national rally"];
    case "convention":
      return ["Hear the roll call"];
    case "campaign":
      return campaign[s.turn].slice(2);
    case "debate":
      return debates[Math.floor(s.turn / 3) - 1].slice(1);
    case "night":
      return ["Resolve the election"];
    case "contingent":
      return ["Count the state delegations"];
    case "trial":
      return ["Convene the Senate trial"];
    case "cabinet": {
      const [, , bill, order] = agenda[s.quarter - 1];
      return [
        "Negotiate " + bill,
        "Seek a party-line vote on " + bill,
        "Executive order · " + order,
      ];
    }
    case "bill":
      return ["Sign the bill", "Veto and return to Congress"];
    case "summit":
      return ["Sign a mutual assistance plan", "Defer the agreement"];
    case "crisis":
      return ["Coordinate emergency relief", "Wait for additional reports"];
    case "renew":
      return ["Run for reelection", "Retire"];
    default:
      return [];
  }
}
// All probabilities, seat shifts, resources and delegate pools are fictional game values.
export function decide(s, i, rng = Math.random) {
  if (!Number.isInteger(i) || !choices(s)[i]) return;
  if (s.phase === "campaign" && !Object.hasOwn(electors, s.target)) return;
  if (s.phase === "defense" && i === 0 && s.funds < 2) return;
  const action = choices(s)[i];
  log(s, action);
  switch (s.phase) {
    case "service":
      s.station = (s.station + 1 + i) % stations.length;
      if (s.rank === ranks.length - 1) s.phase = "waiver";
      else {
        const interval = ECON_RANK_XP[s.rank + 1] - ECON_RANK_XP[s.rank];
        s.xp =
          (s.xp ?? ECON_RANK_XP[s.rank]) + Math.ceil(interval * (i ? 0.75 : 1));
        s.rank = Math.min(ranks.length - 1, econRank(s.xp));
      }
      break;
    case "waiver":
      if (i || s.waiverDenied) {
        log(
          s,
          "Ten civilian years later, the President renews the nomination.",
        );
      } else {
        const house = chamberVote(435, 210 + rng() * 65);
        const senate = chamberVote(100, 48 + rng() * 24);
        log(
          s,
          "Individual waiver · House " +
            house.yes +
            "/435 · Senate " +
            senate.yes +
            "/100.",
        );
        if (!house.ok || !senate.ok) {
          log(
            s,
            "The exemption failed. Return after the statutory waiting period.",
          );
          s.waiverDenied = true;
          break;
        }
        log(s, "The President signs the waiver into law.");
      }
      s.phase = "hearing";
      break;
    case "hearing":
      if (i) end(s, "Returned to civilian life");
      else {
        s.phase = "defense";
        log(
          s,
          "Senate confirms the nomination. The President appoints you Secretary of Defense.",
        );
      }
      break;
    case "defense": {
      const funded = i === 0 && s.funds >= 2;
      const gain = funded ? 3 : i === 1 ? 2 : -2;
      s.funds += funded ? -2 : 1;
      s.record += gain;
      s.trust = clamp(s.trust + Math.sign(gain), 0, 100);
      log(
        s,
        defense[s.turn][0] +
          " · Service record " +
          (gain > 0 ? "+" : "") +
          gain,
      );
      if (++s.turn === defense.length) {
        s.phase = "party";
        log(
          s,
          s.record >= 55 ? "Department goals met" : "Department goals missed",
        );
      }
      break;
    }
    case "party":
      s.party = Object.keys(parties)[i];
      beginCampaign(s);
      break;
    case "primary": {
      const share = (i ? 0.46 : 0.58) + rng() * 0.08;
      for (const [state, pool] of primaryRounds[s.turn]) {
        const won = Math.round(pool * share);
        s.delegates += won;
        log(s, state + " · " + won + " of " + pool + " delegates pledged.");
      }
      if (++s.turn === 4) s.phase = "convention";
      break;
    }
    case "convention":
      if (s.delegates <= 50) end(s, "Convention defeat");
      else {
        s.phase = "campaign";
        s.turn = 0;
        s.polls = Object.fromEntries(
          Object.keys(electors).map((state) => [state, (rng() - 0.5) * 40]),
        );
      }
      break;
    case "campaign":
      s.visits[s.target] = (s.visits[s.target] || 0) + 1;
      s.target = null;
      s.score += i ? -1.14 : 0.95;
      s.turn++;
      if (s.turn === 10) {
        s.results = election(s, rng);
        s.phase = "night";
      } else if (s.turn % 3 === 0) s.phase = "debate";
      break;
    case "debate":
      s.score += i ? -0.9 : 0.8;
      s.phase = "campaign";
      break;
    case "night": {
      const votes = Object.values(s.results).reduce((a, b) => a + b, 0);
      if (votes >= 270) inaugurate(s);
      else if (votes === 269) s.phase = "contingent";
      else end(s, "Election defeat");
      break;
    }
    case "contingent":
      if (rng() < 0.5) {
        log(s, "26 delegations select your ticket.");
        inaugurate(s);
      } else end(s, "House elects your opponent");
      break;
    case "cabinet": {
      if (i === 2) {
        s.orders++;
        const stayed = rng() < 0.35;
        s.trust -= stayed ? 5 : 1;
        log(
          s,
          stayed ? "A court stays the order." : "Agencies implement the order.",
        );
        afterPolicy(s, rng);
        break;
      }
      s.votes = [
        clamp(s.house + Math.round(rng() * 48 - 18 + (i ? 0 : 24)), 0, 435),
        clamp(s.senate + Math.round(rng() * 12 - 5 + (i ? 0 : 12)), 0, 100),
      ];
      const [h, v] = s.votes,
        filibuster = rng() < 0.55;
      log(
        s,
        "House " +
          h +
          "/435 · Senate " +
          v +
          "/100" +
          (filibuster ? " · Cloture requires 60." : " · Ordinary majority."),
      );
      if (
        chamberVote(435, h).ok &&
        chamberVote(100, v, filibuster ? 60 : 51).ok
      )
        s.phase = "bill";
      else {
        s.trust -= 1;
        afterPolicy(s, rng);
      }
      break;
    }
    case "bill": {
      let override = false;
      if (i) {
        const h = chamberVote(435, s.votes[0] + rng() * 28 - 10, 290);
        const v = chamberVote(100, s.votes[1] + rng() * 8 - 3, 67);
        override = h.ok && v.ok;
        log(
          s,
          "Override roll call · House " +
            h.yes +
            "/435 · Senate " +
            v.yes +
            "/100.",
        );
      }
      if (!i || override) {
        s.laws++;
        s.trust += 2;
      } else s.trust--;
      log(
        s,
        !i
          ? "Bill signed into law."
          : override
            ? "Both chambers override the veto."
            : "Override falls short. Veto sustained.",
      );
      afterPolicy(s, rng);
      break;
    }
    case "summit":
      s.trust += i ? -1 : 2;
      nextQuarter(s, rng);
      break;
    case "crisis":
      s.trust += i ? -3 : 2;
      if (s.trust < 25 && chamberVote(435, 435 - s.house).ok) {
        log(
          s,
          "House adopts articles of impeachment by " +
            (435 - s.house) +
            " votes.",
        );
        s.phase = "trial";
      } else if (s.quarter % 4 === 0) s.phase = "summit";
      else nextQuarter(s, rng);
      break;
    case "trial": {
      const vote = chamberVote(100, 100 - s.senate + Math.floor(rng() * 5), 67);
      log(s, "Senate trial · " + vote.yes + " votes to convict.");
      if (vote.ok) end(s, "Senate conviction and removal");
      else nextQuarter(s, rng);
      break;
    }
    case "renew":
      if (i) retire(s);
      else beginCampaign(s);
      break;
  }
  s.trust = clamp(s.trust, 0, 100);
}
