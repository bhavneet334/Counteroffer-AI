import { useEffect, useState } from "react";
import { api } from "./api.js";
import { useVapi } from "./useVapi.js";
import ScenarioForm from "./components/ScenarioForm.jsx";
import Coin from "./components/Coin.jsx";
import Transcript from "./components/Transcript.jsx";
import History from "./components/History.jsx";

const DEFAULT_SCENARIO = { role: "Senior Software Engineer", offer: 120000, ceiling: 150000, difficulty: "firm" };

export default function App() {
  const [publicKey, setPublicKey] = useState(null);
  const [bootError, setBootError] = useState(null);
  const [moods, setMoods] = useState([]);
  const [scenario, setScenario] = useState(DEFAULT_SCENARIO);
  const [tab, setTab] = useState("live");
  const [sessions, setSessions] = useState([]);
  const [formError, setFormError] = useState(null);

  const vapi = useVapi(publicKey);
  useEffect(() => {
    Promise.all([api.config(), api.moods(), api.listSessions()])
      .then(([cfg, moodList, past]) => {
        setPublicKey(cfg.vapiPublicKey);
        setMoods(moodList);
        setSessions(past);
      })
      .catch((err) => setBootError(err.message));
  }, []);
  useEffect(() => {
    if (!vapi.lastCall || vapi.lastCall.transcript.length === 0) return;
    const payload = {
      scenario: { ...scenario, offer: Number(scenario.offer), ceiling: Number(scenario.ceiling) },
      transcript: vapi.lastCall.transcript,
      durationSeconds: vapi.lastCall.durationSeconds,
    };
    api.saveSession(payload).then(() => api.listSessions()).then(setSessions).catch(console.error);
  }, [vapi.lastCall]);

  async function onCoin() {
    if (vapi.phase !== "idle") {
      vapi.stop();
      return;
    }
    setFormError(null);
    try {
      const config = await api.assistant({
        ...scenario,
        offer: Number(scenario.offer),
        ceiling: Number(scenario.ceiling),
      });
      await vapi.start(config);
    } catch (err) {
      setFormError(err.message);
    }
  }

  if (bootError) {
    return (
      <main className="boot-error">
        <h1>🪙 The Counteroffer</h1>
        <p className="err">Couldn't reach the backend: {bootError}</p>
        <p className="muted">Is FastAPI running? From the backend folder: <code>uvicorn main:app --reload --port 8000</code></p>
      </main>
    );
  }

  const busy = vapi.phase !== "idle";

  return (
    <main>
      <h1>🪙 The Counteroffer</h1>
      <p className="tagline">Practice salary negotiation out loud against an AI hiring manager who does not want to pay you more.</p>

      <div className="layout">
        <section className="panel">
          <h2>Scenario</h2>
          <ScenarioForm scenario={scenario} moods={moods} disabled={busy} onChange={setScenario} />
          <Coin phase={vapi.phase} status={formError ? { text: formError, kind: "err" } : vapi.status} onClick={onCoin} />
          <div className="actions">
            <button className="btn" disabled={vapi.phase !== "live"} onClick={vapi.askForFeedback}>Ask for feedback</button>
            <button className="btn" disabled={vapi.phase !== "live"} onClick={vapi.toggleMute}>{vapi.muted ? "Unmute" : "Mute"}</button>
          </div>
          <p className="tip">
            Tip: at any point you can just <em>say</em> "can I have your feedback" and Jennifer will drop the act and coach you.
          </p>
        </section>

        <section className="panel">
          <div className="tabs">
            <button className={tab === "live" ? "active" : ""} onClick={() => setTab("live")}>Live transcript</button>
            <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
              Past calls {sessions.length > 0 && <span className="pill">{sessions.length}</span>}
            </button>
          </div>
          {tab === "live" ? (
            <Transcript turns={vapi.transcript} />
          ) : (
            <History sessions={sessions} onDeleted={() => api.listSessions().then(setSessions)} />
          )}
        </section>
      </div>
    </main>
  );
}
