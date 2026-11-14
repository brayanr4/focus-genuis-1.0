import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icons.jsx";
import Ring from "./Ring.jsx";
import { MODES, fmtClock } from "../lib/timer.js";
import { formatMinutes, topicHue } from "../lib/plan.js";

export default function FocusTimer({ timer, linked, upNext, onPick, onUnlink, cycle, todayMinutes, dailyTarget, autoBreak, setAutoBreak }) {
  const [zen, setZen] = useState(false);
  const isBreak = MODES[timer.mode].kind === "break";

  // Keyboard: space toggles, Escape leaves zen mode.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest("input, textarea, select")) return;
      if (e.code === "Space") {
        e.preventDefault();
        timer.running ? timer.pause() : timer.start();
      } else if (e.key === "Escape") setZen(false);
      else if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey) setZen((z) => !z);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [timer]);

  const controls = (
    <div className="timer-controls">
      <button className="btn-icon" onClick={timer.reset} aria-label="Reset timer" title="Reset">
        <Icon name="reset" size={20} />
      </button>
      <motion.button whileTap={{ scale: 0.94 }} className={`btn-play ${isBreak ? "is-break" : ""}`} onClick={timer.running ? timer.pause : timer.start} aria-label={timer.running ? "Pause" : "Start"}>
        <Icon name={timer.running ? "pause" : "play"} size={26} />
      </motion.button>
      <button className="btn-icon" onClick={() => setZen((z) => !z)} aria-label={zen ? "Exit full screen" : "Full screen focus"} title="Full screen (F)">
        <Icon name={zen ? "close" : "expand"} size={20} />
      </button>
    </div>
  );

  const dial = (size) => (
    <Ring value={timer.progress} size={size} stroke={size > 300 ? 10 : 8} className={`timer-ring ${timer.running ? "running" : ""} ${isBreak ? "is-break" : ""}`}>
      <span className="timer-mode">{MODES[timer.mode].label}</span>
      <span className="timer-clock mono">{fmtClock(timer.remaining)}</span>
      <span className="timer-cycle">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i < cycle % 4 ? "on" : ""} />
        ))}
      </span>
    </Ring>
  );

  return (
    <div className="focus-layout">
      <section className="card timer-card card-glow">
        <div className="mode-tabs" role="tablist" aria-label="Timer mode">
          {Object.entries(MODES).map(([key, m]) => (
            <button key={key} role="tab" aria-selected={timer.mode === key} className={timer.mode === key ? "active" : ""} onClick={() => timer.select(key)}>
              {timer.mode === key && <motion.span layoutId="mode-pill" className="segmented-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        <div className={`timer-stage ${isBreak ? "is-break" : ""}`}>
          <div className="timer-halo" data-running={timer.running} />
          {dial(320)}
        </div>

        {controls}

        <AnimatePresence mode="wait">
          {linked ? (
            <motion.div key={linked.session.id} className="linked" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <span className={`tag hue-${topicHue(linked.session.topic)}`}>{linked.session.topic}</span>
              <div className="linked-text">
                <strong>{linked.session.title}</strong>
                {linked.session.objective && <span className="muted small">{linked.session.objective}</span>}
              </div>
              <button className="btn-icon btn-icon-sm" onClick={onUnlink} aria-label="Unlink session">
                <Icon name="close" size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.p key="free" className="muted small center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Free focus. Pick a session to link it to your plan.
            </motion.p>
          )}
        </AnimatePresence>
        <p className="kbd-hint muted small center">
          <kbd>Space</kbd> start or pause · <kbd>F</kbd> full screen
        </p>
      </section>

      <aside className="stack">
        <section className="card">
          <span className="eyebrow">Today</span>
          <div className="today-meter">
            <strong className="stat-number">{formatMinutes(todayMinutes)}</strong>
            <span className="muted small">of {formatMinutes(dailyTarget)} goal</span>
          </div>
          <div className="bar">
            <motion.span className="bar-fill" animate={{ width: `${Math.min(1, todayMinutes / Math.max(1, dailyTarget)) * 100}%` }} />
          </div>
          <label className="toggle">
            <input type="checkbox" checked={autoBreak} onChange={(e) => setAutoBreak(e.target.checked)} />
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
            Start breaks automatically
          </label>
        </section>

        <section className="card">
          <span className="eyebrow">Up next</span>
          {upNext.length ? (
            <ul className="upnext">
              {upNext.map((s) => (
                <li key={s.id}>
                  <button className={`upnext-item ${linked?.session.id === s.id ? "active" : ""}`} onClick={() => onPick(s)}>
                    <span className={`dot hue-${topicHue(s.topic)}`} />
                    <span className="upnext-title">{s.title}</span>
                    <span className="muted small mono">{s.minutes}m</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Nothing left for today. Nice work, or create a plan to get sessions here.</p>
          )}
        </section>
      </aside>

      {createPortal(
      <AnimatePresence>
        {zen && (
          <motion.div className={`zen ${isBreak ? "is-break" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <div className="zen-aurora" />
            <motion.div className="zen-inner" initial={{ scale: 0.94 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 120, damping: 18 }}>
              {linked && <p className="zen-task">{linked.session.title}</p>}
              <div className={`timer-stage ${isBreak ? "is-break" : ""}`}>
                <div className="timer-halo" data-running={timer.running} />
                {dial(Math.min(440, typeof window !== "undefined" ? window.innerWidth - 48 : 440))}
              </div>
              {controls}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
}
