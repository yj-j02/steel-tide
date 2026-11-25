/* Supabase-backed global leaderboard & live concurrent-player presence */
import { isBadName, safeName } from "./name-filter.js";

const SUPABASE_URL = "https://yjxududnzimqlgroqjpz.supabase.co";
const SUPABASE_KEY = "sb_publishable_9p1RoYd6uc8JjepQ6HOanA_VjSRFSPh";

let sbClient = null;
let sbInitPromise = null;
let presenceChannel = null;
let onlinePlayers = [];
let cachedRows = [];
let lastFetchAt = 0;
let lastSyncHash = "";
let lastSyncInfo = { level: "none", msg: "" };
export const getSyncInfo = () => lastSyncInfo;
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try { fn({ onlinePlayers, rows: cachedRows }); } catch {}
  }
}

export function onOnlineBoardUpdate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getOnlineState() {
  /* 욕설·성적 표현 이름은 순위표에서 빼고, 접속자 목록에서는 가린다 */
  return { onlinePlayers: onlinePlayers.map((p) => (isBadName(p?.name) ? { ...p, name: safeName(p.name) } : p)), rows: cachedRows.filter((r) => !isBadName(r?.name)) };
}

async function getClient() {
  if (sbClient) return sbClient;
  if (sbInitPromise) return sbInitPromise;
  if (typeof window === "undefined") return null;
  sbInitPromise = (async () => {
    try {
      const mod = await import("https://esm.sh/@supabase/supabase-js@2");
      sbClient = mod.createClient(SUPABASE_URL, SUPABASE_KEY, {
        realtime: { params: { eventsPerSecond: 4 } },
      });
      return sbClient;
    } catch (err) {
      console.warn("Supabase SDK load failed, using REST fallback:", err);
      return null;
    }
  })();
  return sbInitPromise;
}

export async function startPresence(myMeta) {
  if (typeof window === "undefined") return;
  const sb = await getClient();
  if (!sb) return;
  if (presenceChannel) {
    try { await presenceChannel.track(myMeta); } catch {}
    return;
  }
  presenceChannel = sb.channel("steel-tide-lobby", {
    config: { presence: { key: myMeta.player_id || "anon" } },
  });
  presenceChannel
    .on("presence", { event: "sync" }, () => {
      const state = presenceChannel.presenceState();
      const list = [];
      for (const [key, metas] of Object.entries(state || {})) {
        if (Array.isArray(metas) && metas.length) {
          list.push({ key, ...metas[0] });
        }
      }
      onlinePlayers = list;
      notify();
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try { await presenceChannel.track(myMeta); } catch {}
      }
    });
}

export async function updatePresence(myMeta) {
  if (presenceChannel) {
    try { await presenceChannel.track(myMeta); } catch {}
  }
}

const EXCLUDED_NAME_RE = /^(무명|테스트|test\d*|admin|관리자|익명|temp|dummy)$/i;

export function isExcludedLeaderboardName(name = "") {
  const n = String(name || "").trim();
  return !n || EXCLUDED_NAME_RE.test(n) || isBadName(n);
}

/** 3초 안에 끝나지 않으면 null (느린 네트워크에서 임관·이름 변경이 멈추지 않게) */
const withTimeout = (p, ms = 3000) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

/** myPlayerId가 ':'로 끝나면 접두사로 보고, 같은 브라우저의 내 다른 캐릭터 기록은 '남의 이름'으로 치지 않는다 */
export async function isNameTaken(name, myPlayerId = "") {
  const n = String(name || "").trim();
  if (!n || typeof window === "undefined") return false;
  const mine = (pid) => !!myPlayerId && (myPlayerId.endsWith(":") ? String(pid || "").startsWith(myPlayerId) : pid === myPlayerId);
  const hit = (rows) => Array.isArray(rows) && rows.some((r) => String(r?.name || "").trim().toLowerCase() === n.toLowerCase() && !mine(r.player_id));
  const localHit = hit(cachedRows || []);
  try {
    const sb = await withTimeout(getClient());
    if (sb) {
      const out = await withTimeout(sb.from("leaderboard").select("player_id,name").ilike("name", n).limit(5));
      if (out && !out.error && Array.isArray(out.data)) return hit(out.data);
    }
    const res = await withTimeout(fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=player_id,name&name=ilike.${encodeURIComponent(n)}&limit=5`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    }));
    if (res && res.ok) return hit(await res.json());
  } catch {}
  return localHit;
}

export async function syncLeaderboardScore(entry, { force = false } = {}) {
  if (typeof window === "undefined" || !entry?.player_id) return false;
  if (isExcludedLeaderboardName(entry?.name)) { lastSyncInfo = { level: "skip", msg: "이 이름은 랭킹에 올릴 수 없는 이름입니다. 이름을 바꿔 주세요." }; return false; }
  if (entry.easy_run) { lastSyncInfo = { level: "skip", msg: "쉬운 모드로 진행한 캐릭터라 랭킹에 등록되지 않습니다. (다른 캐릭터를 만들어 일반 모드로 진행하세요)" }; return false; } /* 쉬운 모드로 진행한 캐릭터는 랭킹에 올리지 않는다 (서버에는 이 칸을 보내지 않음) */
  if (await isNameTaken(entry.name, `${String(entry.player_id).split(":")[0]}:`)) { lastSyncInfo = { level: "skip", msg: "같은 이름을 쓰는 다른 플레이어가 이미 있어 등록되지 않았습니다. 이름을 바꿔 보세요." }; return false; }
  const hash = JSON.stringify([
    entry.player_id, entry.nation, entry.service, entry.name,
    entry.grade, entry.xp, entry.wins, entry.battles, entry.medals,
    entry.ending_title, entry.chapter, entry.board_avg, entry.promo_week,
    entry.approval, entry.hardcore, entry.post_name, entry.route_info,
  ]);
  if (!force && hash === lastSyncHash) return true;
  lastSyncHash = hash;
  lastSyncInfo = { level: "pending", msg: "" };

  const { easy_run: _er, ...serverEntry } = entry; /* easy_run은 서버 칸이 없으므로 보내지 않는다 */
  const payload = { ...serverEntry, updated_at: new Date().toISOString() };
  const { route_info: _ri, ...midPayload } = payload; /* route_info 칸이 아직 없는 서버용 */
  const basePayload = {
    player_id: entry.player_id,
    nation: entry.nation,
    service: entry.service,
    name: entry.name,
    grade: entry.grade,
    rank_name: entry.rank_name,
    xp: entry.xp,
    wins: entry.wins,
    battles: entry.battles,
    medals: entry.medals,
    ending_title: entry.ending_title,
    chapter: entry.chapter,
    updated_at: payload.updated_at,
  };
  try {
    const sb = await getClient();
    if (sb) {
      const { error } = await sb.from("leaderboard").upsert(payload, { onConflict: "player_id" });
      if (!error) { lastSyncInfo = { level: "full", msg: "" }; return true; }
      /* 서버 표에 심사평균·도달연차 등 칸이 없으면 여기서 실패하고 기본 정보만 저장된다 → docs/supabase_leaderboard_columns.md */
      console.warn("[leaderboard] 전체 정보 저장 실패, 일부 칸 없이 다시 저장합니다:", error.message || error);
      const { error: errMid } = await sb.from("leaderboard").upsert(midPayload, { onConflict: "player_id" });
      if (!errMid) { lastSyncInfo = { level: "mid", msg: String(error.message || error) }; return true; }
      console.warn("[leaderboard] 기본 정보만 저장합니다:", errMid.message || errMid);
      const { error: err2 } = await sb.from("leaderboard").upsert(basePayload, { onConflict: "player_id" });
      if (!err2) { lastSyncInfo = { level: "base", msg: String(errMid.message || errMid) }; return true; }
      lastSyncInfo = { level: "fail", msg: String(err2.message || err2) };
    }
    const post = (body) => fetch(`${SUPABASE_URL}/rest/v1/leaderboard?on_conflict=player_id`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(body),
    });
    const res = await post(payload);
    if (res.ok) { lastSyncInfo = { level: "full", msg: "" }; return true; }
    if (res.status === 400) {
      const resMid = await post(midPayload);
      if (resMid.ok) return true;
      const res2 = await post(basePayload);
      return res2.ok;
    }
    return false;
  } catch (e) {
    lastSyncInfo = { level: "fail", msg: String(e?.message || e) };
    return false;
  }
}

export async function fetchLeaderboard({ force = false } = {}) {
  if (typeof window === "undefined") return [];
  const now = Date.now();
  if (!force && cachedRows.length && now - lastFetchAt < 12000) return cachedRows;
  try {
    const sb = await getClient();
    if (sb) {
      const { data, error } = await sb
        .from("leaderboard")
        .select("*")
        .order("grade", { ascending: false })
        .order("xp", { ascending: false })
        .limit(100);
      if (!error && Array.isArray(data)) {
        cachedRows = data;
        lastFetchAt = now;
        notify();
        return cachedRows;
      }
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=*&order=grade.desc,xp.desc&limit=100`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (res.ok) {
      cachedRows = await res.json();
      lastFetchAt = now;
      notify();
    }
  } catch {}
  return cachedRows;
}
