const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const { parseRequest, demoPlan, normalizeAiPlan, buildPrompt } = require("./planner");

const PORT = Number(process.env.PORT) || 5500;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// The OpenAI client is optional: without a key the app runs in demo mode
// instead of crashing at startup.
let openai = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require("openai");
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mode: openai ? "ai" : "demo", model: openai ? MODEL : null });
});

app.post("/api/create-schedule", async (req, res) => {
  const { value, error } = parseRequest(req.body);
  if (error) return res.status(400).json({ error });

  if (!openai) return res.json({ plan: demoPlan(value) });

  try {
    const result = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an expert study coach. You answer with valid JSON only." },
        { role: "user", content: buildPrompt(value) },
      ],
    });
    const plan = normalizeAiPlan(value, JSON.parse(result.choices[0].message.content));
    res.json({ plan });
  } catch (err) {
    // Fall back to the offline planner so the user still gets a plan.
    console.error("AI plan failed, using demo planner:", err.message);
    res.json({ plan: demoPlan(value), warning: "The AI service was unavailable, so this plan was built offline." });
  }
});

if (require.main === module) {
  app.listen(PORT, () =>
    console.log(`FocusGenius backend on http://localhost:${PORT} (${openai ? `AI: ${MODEL}` : "demo mode, no OPENAI_API_KEY"})`)
  );
}

module.exports = app;
