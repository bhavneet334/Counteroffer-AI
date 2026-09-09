export default function Coin({ phase, status, onClick }) {
  const label = phase === "live" ? "END CALL" : phase === "connecting" ? "CANCEL" : "START CALL";
  return (
    <div className="coin-wrap">
      <button className={`coin ${phase !== "idle" ? "live" : ""}`} onClick={onClick}>
        {label}
      </button>
      <div className={`status ${status.kind}`}>{status.text}</div>
    </div>
  );
}
