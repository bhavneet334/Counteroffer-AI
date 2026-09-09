import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

export function useVapi(publicKey) {
  const vapiRef = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [status, setStatus] = useState({ text: "Ready.", kind: "" });
  const [transcript, setTranscript] = useState([]);
  const [muted, setMuted] = useState(false);
  const [lastCall, setLastCall] = useState(null);
  const startedAt = useRef(null);
  useEffect(() => {
    if (!publicKey) return;
    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      startedAt.current = Date.now();
      setPhase("live");
      setStatus({ text: "Live. Jennifer is on the line.", kind: "ok" });
    });

    vapi.on("call-end", () => {
      setPhase("idle");
      setMuted(false);
      setStatus({ text: "Call ended. Change the scenario and try again.", kind: "" });
      setTranscript((t) => {
        const finalTurns = t.filter((x) => !x.partial).map(({ role, text }) => ({ role, text }));
        const durationSeconds = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
        setLastCall({ transcript: finalTurns, durationSeconds });
        return t;
      });
    });

    vapi.on("speech-start", () => setStatus({ text: "Jennifer is speaking…", kind: "ok" }));
    vapi.on("speech-end", () => setStatus({ text: "Your turn.", kind: "ok" }));

    vapi.on("message", (msg) => {
      if (msg.type !== "transcript") return;
      const role = msg.role === "user" ? "user" : "assistant";
      const partial = msg.transcriptType === "partial";
      setTranscript((t) => {
        const last = t[t.length - 1];
        if (last && last.partial && last.role === role) {
          return [...t.slice(0, -1), { role, text: msg.transcript, partial }];
        }
        return [...t, { role, text: msg.transcript, partial }];
      });
    });

    vapi.on("error", (err) => {
      console.error("VAPI error:", err);
      setPhase("idle");
      const text = JSON.stringify(err);
      if (/NotAllowed|Permission denied|microphone/i.test(text)) {
        setStatus({ text: "Microphone blocked. Allow mic access for localhost and try again.", kind: "err" });
      } else {
        setStatus({ text: "Error: " + (err?.error?.message || err?.message || text), kind: "err" });
      }
    });

    return () => {
      vapi.stop();
      vapiRef.current = null;
    };
  }, [publicKey]);

  const start = useCallback(async (assistantConfig) => {
    if (!vapiRef.current) return;
    setTranscript([]);
    setLastCall(null);
    setPhase("connecting");
    setStatus({ text: "Connecting… allow microphone access if asked.", kind: "" });
    try {
      await vapiRef.current.start(assistantConfig);
    } catch (err) {
      setPhase("idle");
      setStatus({ text: "Could not start the call: " + (err?.message || err), kind: "err" });
    }
  }, []);

  const stop = useCallback(() => {
    vapiRef.current?.stop();
    setPhase("idle");
    setStatus({ text: "Call cancelled.", kind: "" });
  }, []);

  const askForFeedback = useCallback(() => {
    const content = "Can I have your feedback on how I'm doing so far?";
    vapiRef.current?.send({ type: "add-message", message: { role: "user", content } });
    setTranscript((t) => [...t, { role: "user", text: content, partial: false }]);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      vapiRef.current?.setMuted(!m);
      return !m;
    });
  }, []);

  return { phase, status, transcript, muted, lastCall, start, stop, askForFeedback, toggleMute };
}
