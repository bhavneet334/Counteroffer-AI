import { useEffect, useRef } from "react";

export default function Transcript({ turns, emptyText = "Press the coin. Jennifer will call you." }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [turns]);

  return (
    <div className="transcript" ref={ref}>
      {turns.length === 0 && <div className="empty">{emptyText}</div>}
      {turns.map((t, i) => (
        <div key={i} className={`bubble ${t.role} ${t.partial ? "partial" : ""}`}>
          <span className="who">{t.role === "user" ? "You" : "Jennifer"}</span>
          {t.text}
        </div>
      ))}
    </div>
  );
}
