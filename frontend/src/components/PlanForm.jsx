import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icons.jsx";
import { topicHue } from "../lib/plan.js";

const SUGGESTIONS = ["Linear algebra", "React hooks", "SQL joins", "Spanish verbs", "Organic chemistry", "System design"];
const LEVELS = ["beginner", "intermediate", "advanced"];

export default function PlanForm({ onSubmit, loading, mode, onCancel }) {
  const [topics, setTopics] = useState([]);
  const [draft, setDraft] = useState("");
  const [dailyHours, setDailyHours] = useState(3);
  const [duration, setDuration] = useState(7);
  const [level, setLevel] = useState("intermediate");
  const [goal, setGoal] = useState("");

  const addTopics = (text) => {
    const next = text.split(",").map((t) => t.trim()).filter(Boolean);
    if (!next.length) return;
    setTopics((cur) => [...new Set([...cur, ...next])].slice(0, 12));
    setDraft("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTopics(draft);
    } else if (e.key === "Backspace" && !draft && topics.length) {
      setTopics((t) => t.slice(0, -1));
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const all = [...new Set([...topics, ...draft.split(",").map((t) => t.trim()).filter(Boolean)])];
    if (!all.length || loading) return;
    setTopics(all);
    setDraft("");
    onSubmit({ topics: all, dailyHours, duration, level, goal });
  };

  const totalHours = dailyHours * duration;
  const ready = topics.length > 0 || draft.trim();

  return (
    <motion.form className="planform card" onSubmit={submit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="planform-head">
        <span className="eyebrow">
          <Icon name="sparkle" size={14} /> New study plan
        </span>
        {onCancel && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      <h1 className="display">
        What do you want to <em>master</em>?
      </h1>
      <p className="lede">Add your topics and how much time you have. FocusGenius builds a day-by-day plan you can follow with the focus timer.</p>

      <div className="field">
        <span className="field-label">Topics</span>
        <div className="chip-input" onClick={(e) => e.currentTarget.querySelector("input")?.focus()}>
          <AnimatePresence initial={false}>
            {topics.map((t) => (
              <motion.span
                key={t}
                layout
                className={`chip hue-${topicHue(t)}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                {t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => setTopics((cur) => cur.filter((x) => x !== t))}>
                  <Icon name="close" size={12} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <input
            value={draft}
            onChange={(e) => (e.target.value.includes(",") ? addTopics(e.target.value) : setDraft(e.target.value))}
            onKeyDown={onKeyDown}
            onBlur={() => addTopics(draft)}
            placeholder={topics.length ? "Add another…" : "e.g. Calculus, Python, World history"}
            aria-label="Add a topic"
          />
        </div>
        {!topics.length && (
          <div className="suggestions">
            <span>Try</span>
            {SUGGESTIONS.map((s) => (
              <button type="button" key={s} className="suggestion" onClick={() => addTopics(s)}>
                <Icon name="plus" size={12} />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid-2">
        <label className="field">
          <span className="field-label">
            Hours per day <output>{dailyHours}h</output>
          </span>
          <input type="range" min="0.5" max="8" step="0.5" value={dailyHours} onChange={(e) => setDailyHours(+e.target.value)} style={{ "--fill": `${((dailyHours - 0.5) / 7.5) * 100}%` }} />
        </label>
        <label className="field">
          <span className="field-label">
            Plan length <output>{duration} {duration === 1 ? "day" : "days"}</output>
          </span>
          <input type="range" min="1" max="30" step="1" value={duration} onChange={(e) => setDuration(+e.target.value)} style={{ "--fill": `${((duration - 1) / 29) * 100}%` }} />
        </label>
      </div>

      <div className="grid-2">
        <div className="field">
          <span className="field-label">Your level</span>
          <div className="segmented" role="radiogroup" aria-label="Your level">
            {LEVELS.map((l) => (
              <button type="button" role="radio" aria-checked={level === l} key={l} className={level === l ? "active" : ""} onClick={() => setLevel(l)}>
                {level === l && <motion.span layoutId="level-pill" className="segmented-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                <span>{l[0].toUpperCase() + l.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span className="field-label">
            Goal <small>optional</small>
          </span>
          <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Pass my finals on 2 December" maxLength={300} />
        </label>
      </div>

      <div className="planform-foot">
        <p className="muted small">
          <Icon name="clock" size={14} /> {totalHours} hours of focus in total
          {mode === "demo" && <span className="pill pill-soft">Demo planner, add an OpenAI key for AI plans</span>}
          {mode === "offline" && <span className="pill pill-warn">Server offline</span>}
        </p>
        <button className="btn btn-primary btn-lg" disabled={!ready || loading}>
          {loading ? (
            <>
              <span className="spinner" /> Building your plan…
            </>
          ) : (
            <>
              Create my plan <Icon name="arrow" size={16} />
            </>
          )}
        </button>
      </div>
    </motion.form>
  );
}
