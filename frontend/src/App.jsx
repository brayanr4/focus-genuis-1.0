import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, Logo } from "./components/Icons.jsx";
import PlanForm from "./components/PlanForm.jsx";
import PlanView from "./components/PlanView.jsx";
import FocusTimer from "./components/FocusTimer.jsx";
import Progress from "./components/Progress.jsx";
import Library from "./components/Library.jsx";
import { useToast } from "./components/Toasts.jsx";
import { usePersistentState } from "./lib/storage.js";
import { createPlan, fetchHealth } from "./lib/api.js";
import { MODES, chime, fmtClock, useTimer } from "./lib/timer.js";
import { findSession, focusStats, setTopicOrder, todayIndex, updateSession } from "./lib/plan.js";

const NAV = [
  { id: "plan", label: "Plan", icon: "plan" },
  { id: "focus", label: "Focus", icon: "focus" },
  { id: "progress", label: "Progress", icon: "progress" },
  { id: "library", label: "Library", icon: "library" },
];

export default function App() {
  const toast = useToast();
  const [view, setView] = usePersistentState("fg.view", "plan");
  const [theme, setTheme] = usePersistentState("fg.theme", "system");
  const [plans, setPlans] = usePersistentState("fg.plans", []);
  const [activeId, setActiveId] = usePersistentState("fg.activePlan", null);
  const [log, setLog] = usePersistentState("fg.focusLog", []);
  const [autoBreak, setAutoBreak] = usePersistentState("fg.autoBreak", true);
  const [linkedRef, setLinkedRef] = useState(null); // { planId, sessionId }
  const [cycle, setCycle] = useState(0);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState({ mode: "checking" });

  const plan = plans.find((p) => p.id === activeId) || null;
  setTopicOrder(plan?.topics);
  const linked = linkedRef ? findSession(plans, linkedRef.planId, linkedRef.sessionId) : null;

  useEffect(() => {
    fetchHealth().then(setHealth);
  }, []);

  // Theme: "system" follows the OS; explicit choices are written to <html data-theme>.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);
  const systemDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && systemDark);

  const onTimerComplete = useCallback(
    ({ mode, minutes }) => {
      chime();
      if (MODES[mode].kind === "focus") {
        const entry = { id: crypto.randomUUID(), at: new Date().toISOString(), minutes, topic: linked?.session.topic, planId: linked?.plan.id, sessionId: linked?.session.id };
        setLog((l) => [...l, entry]);
        if (linked) setPlans((ps) => updateSession(ps, linked.plan.id, linked.session.id, { done: true }));
        const nextCycle = cycle + 1;
        setCycle(nextCycle);
        toast(linked ? `Session complete: ${linked.session.title}` : `${minutes} minutes of focus logged`, { icon: "check" });
        setLinkedRef(null);
        if (autoBreak) timer.select(nextCycle % 4 === 0 ? "long" : "short");
        if (document.hidden && "Notification" in window && Notification.permission === "granted") new Notification("Focus block done", { body: "Time for a break." });
      } else {
        toast("Break's over. Ready for the next one?", { icon: "bell" });
        timer.select("focus");
      }
    },
    [linked, cycle, autoBreak, toast] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const timer = useTimer({ onComplete: onTimerComplete });

  // Show the countdown in the tab title while the timer runs.
  useEffect(() => {
    document.title = timer.running ? `${fmtClock(timer.remaining)} · ${MODES[timer.mode].label} · FocusGenius` : "FocusGenius";
  }, [timer.running, timer.remaining, timer.mode]);

  const upNext = useMemo(() => {
    if (!plan) return [];
    const today = plan.days[todayIndex(plan)];
    const rest = plan.days.flatMap((d) => d.sessions).filter((s) => !s.done);
    const todays = today.sessions.filter((s) => !s.done);
    return (todays.length ? todays : rest).slice(0, 5);
  }, [plan]);

  const stats = useMemo(() => focusStats(log), [log]);

  const handleCreate = async (input) => {
    setLoading(true);
    try {
      const { plan: p, warning } = await createPlan(input);
      setPlans((ps) => [p, ...ps]);
      setActiveId(p.id);
      setCreating(false);
      setView("plan");
      toast(warning || (p.source === "ai" ? "Your AI plan is ready" : "Plan ready (demo planner)"), { icon: warning ? "bell" : "sparkle" });
    } catch (e) {
      toast(e.message, { tone: "error", icon: "close" });
    } finally {
      setLoading(false);
    }
  };

  const startFocus = (session) => {
    setLinkedRef({ planId: plan.id, sessionId: session.id });
    timer.select("focus", session.minutes);
    setView("focus");
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
  };

  const toggleSession = (sessionId, done) => {
    setPlans((ps) => updateSession(ps, plan.id, sessionId, { done }));
  };

  const deletePlan = (id) => {
    setPlans((ps) => ps.filter((p) => p.id !== id));
    if (id === activeId) setActiveId(plans.find((p) => p.id !== id)?.id || null);
    if (linkedRef?.planId === id) setLinkedRef(null);
    toast("Plan deleted", { icon: "trash" });
  };

  const go = (id) => {
    setView(id);
    if (id !== "plan") setCreating(false);
  };

  const showForm = view === "plan" && (creating || !plan);

  return (
    <div className="app">
      <div className="aurora" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <aside className="sidebar">
        <div className="brand">
          <Logo size={34} />
          <div>
            <strong>FocusGenius</strong>
            <span className="muted small">Study smarter</span>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <button key={n.id} className={`nav-item ${view === n.id ? "active" : ""}`} onClick={() => go(n.id)} aria-current={view === n.id ? "page" : undefined}>
              {view === n.id && <motion.span layoutId="nav-active" className="nav-active" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <Icon name={n.icon} size={19} />
              <span>{n.label}</span>
              {n.id === "focus" && timer.running && <span className="nav-live mono">{fmtClock(timer.remaining)}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="streak">
            <Icon name="flame" size={16} />
            <span>
              <strong>{stats.streak}</strong> day streak
            </span>
          </div>
          <div className="row between">
            <span className={`status status-${health.mode}`} title={health.model ? `Model: ${health.model}` : undefined}>
              <i />
              {health.mode === "ai" ? "AI connected" : health.mode === "demo" ? "Demo mode" : health.mode === "checking" ? "Connecting" : "Server offline"}
            </span>
            <button className="btn-icon" onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={`Switch to ${isDark ? "light" : "dark"} theme`} title="Toggle theme">
              <Icon name={isDark ? "sun" : "moon"} size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, behavior: "instant" })}>
          <motion.div
            key={showForm ? "form" : view}
            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(2px)" }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {showForm && <PlanForm onSubmit={handleCreate} loading={loading} mode={health.mode} onCancel={plan ? () => setCreating(false) : null} />}
            {view === "plan" && !showForm && <PlanView plan={plan} onToggle={toggleSession} onFocus={startFocus} onNew={() => setCreating(true)} activeSessionId={linked?.session.id} />}
            {view === "focus" && (
              <FocusTimer
                timer={timer}
                linked={linked}
                upNext={upNext}
                onPick={startFocus}
                onUnlink={() => setLinkedRef(null)}
                cycle={cycle}
                todayMinutes={stats.todayMinutes}
                dailyTarget={(plan?.dailyHours || 2) * 60}
                autoBreak={autoBreak}
                setAutoBreak={setAutoBreak}
              />
            )}
            {view === "progress" && <Progress log={log} plan={plan} onStart={() => go("focus")} />}
            {view === "library" && (
              <Library
                plans={plans}
                activeId={activeId}
                onOpen={(id) => {
                  setActiveId(id);
                  setCreating(false);
                  setView("plan");
                }}
                onDelete={deletePlan}
                onNew={() => {
                  setCreating(true);
                  setView("plan");
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <button key={n.id} className={view === n.id ? "active" : ""} onClick={() => go(n.id)} aria-current={view === n.id ? "page" : undefined}>
            <Icon name={n.icon} size={20} />
            <span>{n.id === "focus" && timer.running ? fmtClock(timer.remaining) : n.label}</span>
          </button>
        ))}
        <button onClick={() => setTheme(isDark ? "light" : "dark")} aria-label="Toggle theme">
          <Icon name={isDark ? "sun" : "moon"} size={20} />
          <span>Theme</span>
        </button>
      </nav>
    </div>
  );
}
