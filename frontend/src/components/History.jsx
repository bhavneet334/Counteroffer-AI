import { useState } from "react";
import { api } from "../api.js";
import Transcript from "./Transcript.jsx";

function fmtDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
function fmtDuration(s) {
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function History({ sessions, onDeleted }) {
  const [open, setOpen] = useState(null);

  async function view(id) {
    setOpen(await api.getSession(id));
  }
  async function remove(id) {
    await api.deleteSession(id);
    if (open?.id === id) setOpen(null);
    onDeleted();
  }

  if (open) {
    return (
      <>
        <div className="history-head">
          <button className="btn" onClick={() => setOpen(null)}>← Back</button>
          <span className="muted">
            {open.scenario.role} · ${open.scenario.offer.toLocaleString()} → ceiling ${open.scenario.ceiling.toLocaleString()}
          </span>
        </div>
        <Transcript turns={open.transcript} emptyText="No transcript was captured for this call." />
      </>
    );
  }

  if (sessions.length === 0) {
    return <div className="empty">No past calls yet. Your first one will show up here.</div>;
  }

  return (
    <ul className="history">
      {sessions.map((s) => (
        <li key={s.id}>
          <button className="history-row" onClick={() => view(s.id)}>
            <strong>{s.scenario.role}</strong>
            <span className="muted">
              {fmtDate(s.createdAt)} · {fmtDuration(s.durationSeconds)} · {s.turns} turns · {s.scenario.difficulty}
            </span>
          </button>
          <button className="btn small" onClick={() => remove(s.id)} title="Delete">✕</button>
        </li>
      ))}
    </ul>
  );
}
