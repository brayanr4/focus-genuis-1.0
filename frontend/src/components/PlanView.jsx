import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icons.jsx";
import Ring from "./Ring.jsx";
import { dayProgress, formatMinutes, planProgress, todayIndex, topicHue } from "../lib/plan.js";
import { download, planToIcs, planToMarkdown, slug } from "../lib/export.js";

export default function PlanView({ plan, onToggle, onFocus, onNew, activeSessionId }) {
  const today = todayIndex(plan);
  const [dayIdx, setDayIdx] = useState(today);
  const stripRef = useRef(null);
  const progress = planProgress(plan);
  const day = plan.days[Math.min(dayIdx, plan.days.length - 1)];
  const dp = dayProgress(day);

  useEffect(() => setDayIdx(todayIndex(plan)), [plan.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    stripRef.current?.querySelector(".day-pill.active")?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [dayIdx]);

  return (
    <div className="stack-lg">
      <header className="plan-hero card card-glow">
        <div className="plan-hero-text">
          <div className="row gap-sm wrap">
            <span className={`pill ${plan.source === "ai" ? "pill-accent" : "pill-soft"}`}>
              <Icon name="sparkle" size={12} /> {plan.source === "ai" ? "AI plan" : "Demo plan"}
            </span>
            <span className="pill pill-soft">
              {plan.duration} days · {plan.dailyHours}h a day
            </span>
          </div>
          <h1 className="display display-md">{plan.title}</h1>
          {plan.summary && <p className="lede">{plan.summary}</p>}
          <div className="row gap-xs wrap">
            {plan.topics.map((t) => (
              <span key={t} className={`chip chip-static hue-${topicHue(t)}`}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="plan-hero-side">
          <Ring value={progress.pct} size={132} stroke={10}>
            <strong className="ring-number">{Math.round(progress.pct * 100)}%</strong>
            <span className="ring-caption">complete</span>
          </Ring>
          <p className="muted small center">
            {progress.done} of {progress.total} sessions
            <br />
            {formatMinutes(progress.doneMinutes)} of {formatMinutes(progress.minutes)}
          </p>
        </div>
        <div className="plan-hero-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => download(`${slug(plan.title)}.ics`, planToIcs(plan), "text/calendar")}>
            <Icon name="calendar" size={15} /> Add to calendar
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => download(`${slug(plan.title)}.md`, planToMarkdown(plan), "text/markdown")}>
            <Icon name="doc" size={15} /> Export Markdown
          </button>
          <button className="btn btn-soft btn-sm" onClick={onNew}>
            <Icon name="plus" size={15} /> New plan
          </button>
        </div>
      </header>

      <nav className="day-strip" ref={stripRef} aria-label="Plan days">
        {plan.days.map((d, i) => {
          const p = dayProgress(d);
          return (
            <button key={d.day} className={`day-pill ${i === dayIdx ? "active" : ""} ${p.pct === 1 ? "complete" : ""}`} onClick={() => setDayIdx(i)} aria-current={i === dayIdx}>
              {i === dayIdx && <motion.span layoutId="day-active" className="day-pill-bg" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <span className="day-pill-label">{i === today ? "Today" : `Day`}</span>
              <span className="day-pill-num">{d.day}</span>
              <Ring value={p.pct} size={22} stroke={3} />
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
        <motion.section
          key={day.day}
          className="card day-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="day-card-head">
            <div>
              <span className="eyebrow">Day {day.day}{dayIdx === today ? " · Today" : ""}</span>
              <h2 className="h2">{day.theme}</h2>
            </div>
            <div className="day-meter">
              <span className="muted small">
                {dp.done}/{dp.total} done
              </span>
              <div className="bar">
                <motion.span className="bar-fill" animate={{ width: `${dp.pct * 100}%` }} transition={{ type: "spring", stiffness: 140, damping: 22 }} />
              </div>
            </div>
          </div>

          <ol className="sessions">
            {day.sessions.map((s, i) => (
              <motion.li
                key={s.id}
                className={`session ${s.done ? "done" : ""} ${activeSessionId === s.id ? "live" : ""}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <button className="check" role="checkbox" aria-checked={s.done} aria-label={`Mark "${s.title}" ${s.done ? "not done" : "done"}`} onClick={() => onToggle(s.id, !s.done)}>
                  <AnimatePresence>
                    {s.done && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 26 }}>
                        <Icon name="check" size={14} strokeWidth={2.5} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                <div className="session-body">
                  <div className="row gap-xs wrap">
                    <span className={`tag hue-${topicHue(s.topic)}`}>{s.topic}</span>
                    <span className="muted small mono">{s.minutes} min</span>
                    {activeSessionId === s.id && <span className="pill pill-live">In focus</span>}
                  </div>
                  <h3 className="session-title">{s.title}</h3>
                  {s.objective && (
                    <p className="session-goal">
                      <Icon name="target" size={14} /> {s.objective}
                    </p>
                  )}
                </div>
                {!s.done && (
                  <button className="btn btn-soft btn-sm session-cta" onClick={() => onFocus(s)}>
                    <Icon name="play" size={12} /> Focus
                  </button>
                )}
              </motion.li>
            ))}
          </ol>

          {day.tip && (
            <aside className="tip">
              <Icon name="bulb" size={16} />
              <span>{day.tip}</span>
            </aside>
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
