import { useCallback, useEffect, useRef, useState } from "react";

export const MODES = {
  focus: { label: "Focus", minutes: 25, kind: "focus" },
  deep: { label: "Deep work", minutes: 50, kind: "focus" },
  short: { label: "Short break", minutes: 5, kind: "break" },
  long: { label: "Long break", minutes: 15, kind: "break" },
};

/**
 * A wall-clock based timer: it stores when the block ends, so it stays accurate
 * when the tab is in the background and the browser throttles intervals.
 */
export function useTimer({ onComplete }) {
  const [mode, setMode] = useState("focus");
  const [duration, setDuration] = useState(MODES.focus.minutes * 60);
  const [endsAt, setEndsAt] = useState(null); // ms timestamp while running
  const [pausedLeft, setPausedLeft] = useState(MODES.focus.minutes * 60);
  const [now, setNow] = useState(Date.now());
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const running = endsAt != null;
  const remaining = running ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : pausedLeft;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (running && remaining === 0) {
      setEndsAt(null);
      setPausedLeft(0);
      completeRef.current?.({ mode, minutes: Math.round(duration / 60) });
    }
  }, [running, remaining, mode, duration]);

  const start = useCallback(() => {
    const left = pausedLeft || duration;
    setNow(Date.now());
    setEndsAt(Date.now() + left * 1000);
  }, [pausedLeft, duration]);

  const pause = useCallback(() => {
    setPausedLeft(remaining);
    setEndsAt(null);
  }, [remaining]);

  const select = useCallback((nextMode, minutes) => {
    const secs = Math.round((minutes ?? MODES[nextMode].minutes) * 60);
    setMode(nextMode);
    setDuration(secs);
    setPausedLeft(secs);
    setEndsAt(null);
  }, []);

  const reset = useCallback(() => select(mode, duration / 60), [select, mode, duration]);

  return { mode, duration, remaining, running, start, pause, reset, select, progress: 1 - remaining / duration };
}

export const fmtClock = (secs) => `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

/** A soft two-note chime made with WebAudio, no audio files needed. */
export function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 783.99].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1.3);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch {
    /* audio not available */
  }
}
