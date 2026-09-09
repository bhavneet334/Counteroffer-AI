export default function ScenarioForm({ scenario, moods, disabled, onChange }) {
  const set = (field) => (e) => onChange({ ...scenario, [field]: e.target.value });

  return (
    <>
      <label htmlFor="role">Role you're interviewing for</label>
      <input id="role" value={scenario.role} onChange={set("role")} disabled={disabled} />

      <label htmlFor="offer">Their opening offer (USD)</label>
      <input id="offer" type="number" step="1000" value={scenario.offer} onChange={set("offer")} disabled={disabled} />

      <label htmlFor="ceiling">Their secret ceiling (USD)</label>
      <input id="ceiling" type="number" step="1000" value={scenario.ceiling} onChange={set("ceiling")} disabled={disabled} />

      <label htmlFor="difficulty">Hiring manager mood</label>
      <select id="difficulty" value={scenario.difficulty} onChange={set("difficulty")} disabled={disabled}>
        {moods.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </>
  );
}
