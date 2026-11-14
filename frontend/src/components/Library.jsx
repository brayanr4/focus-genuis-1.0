import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icons.jsx";
import Ring from "./Ring.jsx";
import { planProgress, topicHue } from "../lib/plan.js";
import { download, planToIcs, planToMarkdown, slug } from "../lib/export.js";

const DATE = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function Library({ plans, activeId, onOpen, onDelete, onNew }) {
  return (
    <div className="stack-lg">
      <header className="page-head row between wrap gap-sm">
        <div>
          <span className="eyebrow">Library</span>
          <h1 className="display display-md">
            Your <em>plans</em>
          </h1>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          <Icon name="plus" size={15} /> New plan
        </button>
      </header>

      {plans.length ? (
        <motion.div className="library" layout>
          <AnimatePresence>
            {plans.map((p) => {
              const pp = planProgress(p);
              return (
                <motion.article key={p.id} layout className={`card plan-card ${p.id === activeId ? "active" : ""}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <div className="row between">
                    <span className="muted small">{DATE.format(new Date(p.createdAt))}</span>
                    {p.id === activeId && <span className="pill pill-accent">Active</span>}
                  </div>
                  <h3 className="h3">{p.title}</h3>
                  <div className="row gap-xs wrap">
                    {p.topics.slice(0, 4).map((t) => (
                      <span key={t} className={`tag hue-${topicHue(t)}`}>
                        {t}
                      </span>
                    ))}
                    {p.topics.length > 4 && <span className="tag">+{p.topics.length - 4}</span>}
                  </div>
                  <div className="row gap-sm plan-card-progress">
                    <Ring value={pp.pct} size={40} stroke={4} />
                    <span className="small">
                      <strong>{Math.round(pp.pct * 100)}%</strong> <span className="muted">· {pp.done}/{pp.total} sessions · {p.duration} days</span>
                    </span>
                  </div>
                  <div className="row gap-xs plan-card-actions">
                    <button className="btn btn-soft btn-sm" onClick={() => onOpen(p.id)}>
                      Open <Icon name="arrow" size={14} />
                    </button>
                    <button className="btn-icon btn-icon-sm" title="Add to calendar" aria-label="Add to calendar" onClick={() => download(`${slug(p.title)}.ics`, planToIcs(p), "text/calendar")}>
                      <Icon name="calendar" size={15} />
                    </button>
                    <button className="btn-icon btn-icon-sm" title="Export Markdown" aria-label="Export Markdown" onClick={() => download(`${slug(p.title)}.md`, planToMarkdown(p), "text/markdown")}>
                      <Icon name="doc" size={15} />
                    </button>
                    <button className="btn-icon btn-icon-sm danger" title="Delete plan" aria-label={`Delete ${p.title}`} onClick={() => onDelete(p.id)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="card empty">
          <p className="muted">No saved plans yet. Plans you create are saved here in your browser.</p>
          <button className="btn btn-primary" onClick={onNew}>
            Create your first plan
          </button>
        </div>
      )}
    </div>
  );
}
