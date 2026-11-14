// Public Turnstile site key only. The secret key never leaves the server.
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
});

export async function onRequestGet({ env }) {
  const siteKey = typeof env?.PUBLIC_TURNSTILE_SITE_KEY === 'string'
    ? env.PUBLIC_TURNSTILE_SITE_KEY.trim()
    : '';

  if (!/^0x[A-Za-z0-9_-]{15,}$/.test(siteKey)) {
    return json({ error: 'Turnstileの公開キーが設定されていません。' }, 503);
  }
  return json({ siteKey });
}
