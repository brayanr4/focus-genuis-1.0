const test = require("node:test");
const assert = require("node:assert");
const { parseRequest, demoPlan, normalizeAiPlan, splitMinutes } = require("./planner");

test("parseRequest accepts a comma string and trims topics", () => {
  const { value } = parseRequest({ topics: " React, , SQL,React ", dailyHours: 2, duration: 5 });
  assert.deepStrictEqual(value.topics, ["React", "SQL"]);
});

test("parseRequest rejects bad input", () => {
  assert.ok(parseRequest({ topics: [], dailyHours: 2, duration: 5 }).error);
  assert.ok(parseRequest({ topics: ["a"], dailyHours: 0, duration: 5 }).error);
  assert.ok(parseRequest({ topics: ["a"], dailyHours: 2, duration: 0 }).error);
});

test("splitMinutes covers the whole budget in 25 to 50 minute blocks", () => {
  for (const total of [30, 60, 90, 120, 180, 225]) {
    const blocks = splitMinutes(total);
    assert.strictEqual(blocks.reduce((a, b) => a + b, 0), total);
    blocks.forEach((b) => assert.ok(b >= 25 && b <= 50, `${total}: ${blocks}`));
  }
});

test("demoPlan has one entry per day with sessions", () => {
  const { value } = parseRequest({ topics: ["Algebra", "Physics"], dailyHours: 3, duration: 7 });
  const plan = demoPlan(value);
  assert.strictEqual(plan.days.length, 7);
  assert.ok(plan.days.every((d) => d.sessions.length > 0));
  assert.strictEqual(plan.source, "demo");
});

test("normalizeAiPlan clamps and fills missing fields", () => {
  const { value } = parseRequest({ topics: ["Go"], dailyHours: 1, duration: 2 });
  const plan = normalizeAiPlan(value, {
    title: "Go",
    days: [{ sessions: [{ minutes: 999 }] }, { theme: "x", sessions: [{ title: "y" }] }, { sessions: [{}] }],
  });
  assert.strictEqual(plan.days.length, 2);
  assert.strictEqual(plan.days[0].sessions[0].minutes, 120);
  assert.throws(() => normalizeAiPlan(value, { days: [] }));
});
