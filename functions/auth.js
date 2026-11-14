// Decap CMS GitHub OAuth login, hosted on the SAME Cloudflare Pages origin.
// Requires GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, CMS_SITE_ORIGIN and
// CMS_ALLOWED_GITHUB_LOGIN (the only allowed editor).
const headers = {
  'Cache-Control':'no-store',
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
};
const error = (message, code=400) => new Response(message, {status:code, headers:{...headers,'Content-Type':'text/plain; charset=utf-8'}});
export async function onRequestGet({request,env}) {
  const url = new URL(request.url);
  if (!env?.GITHUB_CLIENT_ID || !env?.GITHUB_CLIENT_SECRET || !env?.CMS_ALLOWED_GITHUB_LOGIN || !env?.CMS_SITE_ORIGIN) {
    return error('CMS認証の設定が完了していません。',503);
  }
  if (url.origin !== env.CMS_SITE_ORIGIN) return error('CMS origin mismatch',403);
  const state = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', `${env.CMS_SITE_ORIGIN}/callback`);
  authorize.searchParams.set('scope', env.CMS_GITHUB_SCOPE === 'repo' ? 'repo' : 'public_repo');
  authorize.searchParams.set('state', state);
  return new Response(null, {status:302, headers:{
    ...headers,
    'Location':authorize.toString(),
    'Set-Cookie':`odokene_oauth_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
  }});
}
