import { motion } from "framer-motion";
import { Icon } from "./Icons.jsx";
import Ring from "./Ring.jsx";
import { focusStats, formatMinutes, planProgress, topicHue } from "../lib/plan.js";

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });
const LONG = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

export default function Progress({ log, plan, onStart }) {
  const stats = focusStats(log);
  const pp = planProgress(plan);
  const max = Math.max(60, ...stats.last14.map((d) => d.minutes));
  const topMax = Math.max(1, ...stats.topics.map((t) => t.minutes));

  const tiles = [
    { icon: "clock", label: "Total focus", value: formatMinutes(stats.totalMinutes), sub: `${stats.blocks} focus blocks` },
    { icon: "flame", label: "Current streak", value: `${stats.streak} ${stats.streak === 1 ? "day" : "days"}`, sub: stats.todayMinutes ? "You focused today" : "Focus today to keep it going" },
    { icon: "check", label: "Sessions done", value: `${pp.done}`, sub: plan ? `of ${pp.total} in this plan` : "No active plan" },
    { icon: "target", label: "Today", value: formatMinutes(stats.todayMinutes), sub: plan ? `Goal ${formatMinutes(plan.dailyHours * 60)}` : "Free focus" },
  ];

  return (
    <div className="stack-lg">
      <header className="page-head">
        <span className="eyebrow">Progress</span>
        <h1 className="display display-md">
          Small sessions, <em>big</em> results.
        </h1>
      </header>

      <div className="tiles">
        {tiles.map((t, i) => (
          <motion.div key={t.label} className="card tile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <span className="tile-icon">
              <Icon name={t.icon} size={18} />
            </span>
            <span className="muted small">{t.label}</span>
            <strong className="stat-number">{t.value}</strong>
            <span className="muted small">{t.sub}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid-progress">
        <section className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow">Last 14 days</span>
              <h2 className="h3">Focus time per day</h2>
            </div>
            <span className="muted small mono">{formatMinutes(stats.last14.reduce((a, d) => a + d.minutes, 0))}</span>
          </div>
          <div className="chart" role="img" aria-label="Bar chart of focus minutes per day for the last 14 days">
            {stats.last14.map((d, i) => (
              <div className={`chart-col ${i === 13 ? "today" : ""}`} key={d.key} title={`${LONG.format(d.date)}: ${formatMinutes(d.minutes)}`}>
                <div className="chart-track">
                  <motion.span
                    className="chart-bar"
                    initial={{ height: 0 }}
                    animate={{ height: `${(d.minutes / max) * 100}%` }}
                    transition={{ delay: i * 0.025, type: "spring", stiffness: 120, damping: 18 }}
                  />
                </div>
                <span className="chart-label">{WEEKDAY.format(d.date)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow">Plan</span>
              <h2 className="h3">{plan ? plan.title : "No active plan"}</h2>
            </div>
          </div>
          <div className="plan-ring">
            <Ring value={pp.pct} size={150} stroke={12}>
              <strong className="ring-number">{Math.round(pp.pct * 100)}%</strong>
              <span className="ring-caption">complete</span>
            </Ring>
            <p className="muted small center">{formatMinutes(pp.doneMinutes)} of {formatMinutes(pp.minutes)} planned</p>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <span className="eyebrow">Topics</span>
            <h2 className="h3">Where your time goes</h2>
          </div>
        </div>
        {stats.topics.length ? (
          <ul className="topic-bars">
            {stats.topics.map((t) => (
              <li key={t.topic}>
                <span className="topic-name">
                  <span className={`dot hue-${topicHue(t.topic)}`} /> {t.topic}
                </span>
                <div className="bar bar-lg">
                  <motion.span className={`bar-fill hue-fill-${topicHue(t.topic)}`} initial={{ width: 0 }} animate={{ width: `${(t.minutes / topMax) * 100}%` }} />
                </div>
                <span className="muted small mono">{formatMinutes(t.minutes)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">
            <p className="muted">Finish a focus block and your topics show up here.</p>
            <button className="btn btn-primary" onClick={onStart}>
              <Icon name="play" size={12} /> Start focusing
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
