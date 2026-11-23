/* Supabase-backed global leaderboard & live concurrent-player presence */

const SUPABASE_URL = "https://yjxududnzimqlgroqjpz.supabase.co";
const SUPABASE_KEY = "sb_publishable_9p1RoYd6uc8JjepQ6HOanA_VjSRFSPh";

let sbClient = null;
let sbInitPromise = null;
let presenceChannel = null;
let onlinePlayers = [];
let cachedRows = [];
let lastFetchAt = 0;
let lastSyncHash = "";
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
  return { onlinePlayers, rows: cachedRows };
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

export async function syncLeaderboardScore(entry, { force = false } = {}) {
  if (typeof window === "undefined" || !entry?.player_id || !entry?.name) return false;
  const hash = JSON.stringify([
    entry.player_id, entry.nation, entry.service, entry.name,
    entry.grade, entry.xp, entry.wins, entry.battles, entry.medals,
    entry.ending_title, entry.chapter, entry.board_avg, entry.promo_week,
    entry.approval, entry.hardcore, entry.post_name,
  ]);
  if (!force && hash === lastSyncHash) return true;
  lastSyncHash = hash;

  const payload = { ...entry, updated_at: new Date().toISOString() };
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
      if (!error) return true;
      const { error: err2 } = await sb.from("leaderboard").upsert(basePayload, { onConflict: "player_id" });
      if (!err2) return true;
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
    if (res.ok) return true;
    if (res.status === 400) {
      const res2 = await post(basePayload);
      return res2.ok;
    }
    return false;
  } catch {
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
