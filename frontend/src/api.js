async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || `Request failed: ${res.status}`);
  return body;
}

export const api = {
  config: () => request("/api/config"),
  moods: () => request("/api/moods"),
  assistant: (scenario) => request("/api/assistant", { method: "POST", body: JSON.stringify(scenario) }),
  listSessions: () => request("/api/sessions"),
  getSession: (id) => request(`/api/sessions/${id}`),
  saveSession: (data) => request("/api/sessions", { method: "POST", body: JSON.stringify(data) }),
  deleteSession: (id) => request(`/api/sessions/${id}`, { method: "DELETE" }),
};
