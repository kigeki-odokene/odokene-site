// GitHub OAuth callback. Only same-origin CMS can receive the access token.
const baseHeaders = {
  'Cache-Control':'no-store',
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
  'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
  'Set-Cookie':'odokene_oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
};
const err = (message,code=400) => new Response(message, {status:code,headers:{...baseHeaders,'Content-Type':'text/plain; charset=utf-8'}});
function getCookie(req,name){
  const parts=(req.headers.get('Cookie') || '').split(';');
  const part=parts.find(part=>part.trim().startsWith(`${name}=`));
  return part ? part.trim().slice(name.length+1) : '';
}
function safeJS(x){return JSON.stringify(x).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026');}
export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  if(!env?.CMS_SITE_ORIGIN || !env?.GITHUB_CLIENT_ID || !env?.GITHUB_CLIENT_SECRET || !env?.CMS_ALLOWED_GITHUB_LOGIN) return err('CMS認証の設定が完了していません。',503);
  if(url.origin!==env.CMS_SITE_ORIGIN)return err('CMS origin mismatch',403);
  const state=url.searchParams.get('state') || '';
  const cookie=getCookie(request,'odokene_oauth_state');
  if(!cookie || !state || cookie!==state || !/^[0-9a-f]{48}$/.test(state))return err('認証の有効期限が切れました。管理画面からやり直してください。',403);
  const code=url.searchParams.get('code');
  if(!code || url.searchParams.has('error'))return err('GitHubの認証がキャンセルされました。',400);
  let token;
  try{
    const r=await fetch('https://github.com/login/oauth/access_token',{
      method:'POST',
      headers:{'Accept':'application/json','Content-Type':'application/json'},
      body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:`${env.CMS_SITE_ORIGIN}/callback`,state})
    });
    if(!r.ok)return err('GitHub認証に失敗しました。',502);
    const res=await r.json();token=res.access_token;
    if(!token)return err('GitHubアクセストークンを取得できませんでした。',403);
    const who=await fetch('https://api.github.com/user', {headers:{Authorization:`Bearer ${token}`,'Accept':'application/vnd.github+json','User-Agent':'ODOKENE-CMS'}});
    if(!who.ok)return err('GitHubアカウントを確認できませんでした。',403);
    const user=await who.json();
    if(String(user.login||'').toLowerCase() !== env.CMS_ALLOWED_GITHUB_LOGIN.toLowerCase())return err('このアカウントには編集権限がありません。',403);
  }catch{return err('GitHub認証の処理中にエラーが発生しました。',502);}
  // Decap expects the handshake: popup says "authorizing:github", opener
  // replies with the same message, popup returns the token to exact origin.
  const payload='authorization:github:success:'+JSON.stringify({token,provider:'github'});
  const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>ODOKENE ログイン</title></head><body><p>ログイン処理中です。この画面が閉じない場合は、管理画面からやり直してください。</p><script>
  (function(){
    const origin=${safeJS(env.CMS_SITE_ORIGIN)};
    const payload=${safeJS(payload)};
    if(!window.opener){document.body.textContent='管理画面からログインしてください。';return;}
    let sent=false;
    window.addEventListener('message',function(event){
      if(sent || event.origin!==origin || event.source!==window.opener || event.data!=='authorizing:github')return;
      sent=true;
      window.opener.postMessage(payload,origin);
      setTimeout(function(){window.close();},250);
    });
    window.opener.postMessage('authorizing:github',origin);
  })();
  <\/script></body></html>`;
  return new Response(html,{status:200,headers:{...baseHeaders,'Content-Type':'text/html; charset=utf-8'}});
}
