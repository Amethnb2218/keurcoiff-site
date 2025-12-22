export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
async function jsonSafe(res){ try { return await res.json(); } catch { return null; } }
export async function api(path, { method="GET", body, token } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { ...(body?{"Content-Type":"application/json"}:{}), ...(token?{Authorization:`Bearer ${token}`}:{}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await jsonSafe(res);
  if (!res.ok) throw new Error(data?.message || data?.error || `Erreur API (${res.status})`);
  return data;
}
