const BASE = import.meta.env.VITE_API_URL || "";

export async function fetchHealth() {
  try {
    const res = await fetch(`${BASE}/api/health`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { ok: false, mode: "offline" };
  }
}

export async function createPlan(input) {
  let res;
  try {
    res = await fetch(`${BASE}/api/create-schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error("Can't reach the FocusGenius server. Is the backend running on port 5500?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong while building your plan.");
  return data;
}
