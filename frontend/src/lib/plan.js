// Pure helpers for plans, focus logs and stats.

export const DAY_MS = 86_400_000;

export const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const allSessions = (plan) => (plan ? plan.days.flatMap((d) => d.sessions) : []);

export function planProgress(plan) {
  const sessions = allSessions(plan);
  const done = sessions.filter((s) => s.done).length;
  const minutes = sessions.reduce((a, s) => a + s.minutes, 0);
  const doneMinutes = sessions.filter((s) => s.done).reduce((a, s) => a + s.minutes, 0);
  return { done, total: sessions.length, pct: sessions.length ? done / sessions.length : 0, minutes, doneMinutes };
}

export const dayProgress = (day) => {
  const done = day.sessions.filter((s) => s.done).length;
  return { done, total: day.sessions.length, pct: day.sessions.length ? done / day.sessions.length : 0 };
};

/** Which plan day is "today", counting from the day the plan was created. */
export function todayIndex(plan, now = Date.now()) {
  if (!plan) return 0;
  const diff = Math.floor((startOfDay(now) - startOfDay(plan.createdAt)) / DAY_MS);
  return Math.min(plan.days.length - 1, Math.max(0, diff));
}

export function updateSession(plans, planId, sessionId, patch) {
  return plans.map((p) =>
    p.id !== planId
      ? p
      : {
          ...p,
          days: p.days.map((d) => ({
            ...d,
            sessions: d.sessions.map((s) => (s.id === sessionId ? { ...s, ...patch } : s)),
          })),
        }
  );
}

export function findSession(plans, planId, sessionId) {
  const plan = plans.find((p) => p.id === planId);
  for (const day of plan?.days || []) {
    const s = day.sessions.find((x) => x.id === sessionId);
    if (s) return { plan, day, session: s };
  }
  return null;
}

/** Focus stats from the log of completed focus blocks. */
export function focusStats(log, now = Date.now()) {
  const byDay = new Map();
  const byTopic = new Map();
  for (const e of log) {
    const k = dayKey(e.at);
    byDay.set(k, (byDay.get(k) || 0) + e.minutes);
    const t = e.topic || "Free focus";
    byTopic.set(t, (byTopic.get(t) || 0) + e.minutes);
  }

  // Streak: consecutive days with focus, ending today (or yesterday if nothing yet today).
  let streak = 0;
  let cursor = startOfDay(now);
  if (!byDay.has(dayKey(cursor))) cursor = new Date(cursor - DAY_MS);
  while (byDay.has(dayKey(cursor))) {
    streak++;
    cursor = new Date(cursor - DAY_MS);
  }

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(startOfDay(now) - (13 - i) * DAY_MS);
    return { key: dayKey(d), date: d, minutes: byDay.get(dayKey(d)) || 0 };
  });

  return {
    totalMinutes: log.reduce((a, e) => a + e.minutes, 0),
    todayMinutes: byDay.get(dayKey(now)) || 0,
    blocks: log.length,
    streak,
    last14,
    topics: [...byTopic.entries()].map(([topic, minutes]) => ({ topic, minutes })).sort((a, b) => b.minutes - a.minutes),
  };
}

export const formatMinutes = (m) => {
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  if (!h) return `${r}m`;
  return r ? `${h}h ${r}m` : `${h}h`;
};

const HUES = ["violet", "coral", "teal", "amber", "sky", "rose"];
const assigned = new Map();

/** Give the active plan's topics distinct colors, in order. Call before rendering. */
export function setTopicOrder(topics = []) {
  assigned.clear();
  topics.forEach((t, i) => assigned.set(t.toLowerCase(), HUES[i % HUES.length]));
}

/** Stable color name for a topic so it looks the same everywhere. */
export function topicHue(topic = "") {
  const key = topic.toLowerCase();
  if (assigned.has(key)) return assigned.get(key);
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return HUES[h % HUES.length];
}
