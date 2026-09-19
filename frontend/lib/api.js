const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function apiUrl(path) {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function getJson(path) {
  const response = await fetch(apiUrl(path), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

export async function postJson(path, body) {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }
  return response.json();
}
