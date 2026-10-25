const configuredBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

function getBaseUrl() {
  if (configuredBaseUrl) return configuredBaseUrl.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'development') return 'http://localhost:4000';

  const host = typeof window === 'undefined' ? '' : window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:4000';
  return '';
}

export function apiUrl(path) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_BACKEND_URL is not configured for this deployment.');
  }
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function getJson(path) {
  const response = await fetch(apiUrl(path), { cache: 'no-store' });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed: ${response.status}`);
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
