// Plan helpers shared by the AI path and the offline demo path.
// Both paths return the same shape so the frontend never has to care.

const crypto = require("crypto");

const LIMITS = { maxTopics: 12, maxDays: 60, maxHours: 12 };

const PHASES = [
  { name: "Foundations", verb: "Learn the core ideas of" },
  { name: "Build", verb: "Practise and apply" },
  { name: "Deepen", verb: "Go deeper into" },
  { name: "Connect", verb: "Link ideas across" },
  { name: "Review", verb: "Review and self-test on" },
];

const OBJECTIVES = [
  "Summarise the key ideas in your own words",
  "Work through 5 practice problems",
  "Make a one-page cheat sheet",
  "Teach it back out loud in 3 minutes",
  "Write 10 flashcards for spaced review",
  "Do a timed mini-quiz and note weak spots",
  "Build a small example from scratch",
  "Revisit yesterday's weak spots",
];

const TIPS = [
  "Phone in another room. Future you says thanks.",
  "Start with the hardest session while your energy is high.",
  "Stand up and stretch on every break.",
  "Write down distractions instead of acting on them.",
  "End the day by planning tomorrow's first task.",
  "Drink water before each session.",
  "Close every tab you don't need for this session.",
];

const id = () => crypto.randomUUID();

/** Validate and clean the request body. Returns { value } or { error }. */
function parseRequest(body = {}) {
  const raw = Array.isArray(body.topics)
    ? body.topics
    : String(body.topics || "").split(",");
  const topics = [...new Set(raw.map((t) => String(t).trim()).filter(Boolean))].slice(
    0,
    LIMITS.maxTopics
  );
  const dailyHours = Number(body.dailyHours);
  const duration = Math.round(Number(body.duration));
  const goal = String(body.goal || "").trim().slice(0, 300);
  const level = ["beginner", "intermediate", "advanced"].includes(body.level)
    ? body.level
    : "intermediate";

  if (!topics.length) return { error: "Add at least one topic." };
  if (!(dailyHours > 0 && dailyHours <= LIMITS.maxHours))
    return { error: `Hours per day must be between 0.5 and ${LIMITS.maxHours}.` };
  if (!(duration >= 1 && duration <= LIMITS.maxDays))
    return { error: `Plan length must be between 1 and ${LIMITS.maxDays} days.` };

  return { value: { topics, dailyHours, duration, goal, level } };
}

/** Split a daily budget into near-equal focus blocks of at most 50 minutes. */
function splitMinutes(total) {
  const minutes = Math.max(15, Math.round(total));
  const count = Math.ceil(minutes / 50);
  const base = Math.floor(minutes / count);
  return Array.from({ length: count }, (_, i) => base + (i < minutes % count ? 1 : 0));
}

/** Deterministic offline plan, used when no API key is set or the AI call fails. */
function demoPlan({ topics, dailyHours, duration, goal, level }) {
  const days = [];
  let cursor = 0;
  for (let d = 0; d < duration; d++) {
    const phase = PHASES[Math.min(PHASES.length - 1, Math.floor((d / duration) * PHASES.length))];
    const blocks = splitMinutes(dailyHours * 60);
    const sessions = blocks.map((minutes, i) => {
      const topic = topics[cursor++ % topics.length];
      return {
        id: id(),
        topic,
        title: `${phase.verb} ${topic}`,
        minutes,
        objective: OBJECTIVES[(d * 3 + i) % OBJECTIVES.length],
        done: false,
      };
    });
    days.push({
      day: d + 1,
      theme: `${phase.name}${topics.length > 1 ? "" : `: ${topics[0]}`}`,
      sessions,
      tip: TIPS[d % TIPS.length],
    });
  }
  return finalize({ topics, dailyHours, duration, goal, level }, {
    title: `${duration}-day sprint: ${topics.slice(0, 2).join(" & ")}${topics.length > 2 ? ` +${topics.length - 2}` : ""}`,
    summary: `${/^[aeiou]/.test(level) ? "An" : "A"} ${level} plan that moves from foundations to review, about ${dailyHours}h of focus a day.`,
    days,
  }, "demo");
}

/** Coerce whatever the model returned into our plan shape. Throws if unusable. */
function normalizeAiPlan(input, ai) {
  if (!ai || !Array.isArray(ai.days) || !ai.days.length) throw new Error("AI plan had no days");
  const days = ai.days.slice(0, input.duration).map((d, i) => ({
    day: i + 1,
    theme: String(d.theme || `Day ${i + 1}`).slice(0, 80),
    tip: d.tip ? String(d.tip).slice(0, 160) : TIPS[i % TIPS.length],
    sessions: (Array.isArray(d.sessions) ? d.sessions : []).slice(0, 12).map((s) => ({
      id: id(),
      topic: String(s.topic || input.topics[0]).slice(0, 60),
      title: String(s.title || s.topic || "Focus session").slice(0, 120),
      minutes: Math.min(120, Math.max(10, Math.round(Number(s.minutes) || 45))),
      objective: String(s.objective || "").slice(0, 200),
      done: false,
    })),
  }));
  if (!days.some((d) => d.sessions.length)) throw new Error("AI plan had no sessions");
  return finalize(input, { title: ai.title, summary: ai.summary, days }, "ai");
}

function finalize(input, plan, source) {
  return {
    id: id(),
    createdAt: new Date().toISOString(),
    source,
    title: String(plan.title || "Study plan").slice(0, 80),
    summary: String(plan.summary || "").slice(0, 240),
    ...input,
    days: plan.days,
  };
}

function buildPrompt({ topics, dailyHours, duration, goal, level }) {
  return [
    `Create a ${duration}-day study plan for a ${level} learner covering: ${topics.join(", ")}.`,
    goal ? `Their goal: ${goal}.` : "",
    `Each day has about ${dailyHours} hours of focused study split into sessions of 25 to 50 minutes.`,
    "Progress from foundations to practice to review. Give each session one concrete, checkable objective.",
    "Reply with JSON only, in this shape:",
    `{"title": string, "summary": string, "days": [{"theme": string, "tip": string, "sessions": [{"topic": string, "title": string, "minutes": number, "objective": string}]}]}`,
    `The days array must have exactly ${duration} entries.`,
  ]
    .filter(Boolean)
    .join("\n");
}

module.exports = { parseRequest, demoPlan, normalizeAiPlan, buildPrompt, splitMinutes, LIMITS };
