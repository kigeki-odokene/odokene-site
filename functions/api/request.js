import prices from '../../src/data/pricing.json' with { type: 'json' };
// Cloudflare Pages Functions: form endpoint. Secrets are set only on Cloudflare.
// Production requires TURNSTILE_SECRET_KEY, RESEND_API_KEY, RESEND_FROM,
// NOTIFY_EMAIL, DISCORD_WEBHOOK_URL. Never put them in the site repository.
const withJson=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
});
const str=(x,max=1000)=>String(x ?? '').trim().slice(0,max);
const isMail=(email)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isoDate=(s)=>!s || /^\d{4}-\d{2}-\d{2}$/.test(s);
function priceFor(x){
 const base=prices[x.plan].base;
 const per=prices[x.plan].extraSinger;
 const harmony=prices.harmony[x.harmony];
 const rush=prices.rush[x.rush];
 return base+Math.max(0,x.singers-1)*per+harmony+rush;
}
export async function onRequestPost({request,env}){
  if(!env?.TURNSTILE_SECRET_KEY || !env.RESEND_API_KEY || !env.RESEND_FROM || !env.NOTIFY_EMAIL || !env.DISCORD_WEBHOOK_URL){
    return withJson({error:'フォーム送信は現在準備中です。XのDMからお問い合わせください。'},503);
  }
  if((request.headers.get('content-type')||'').split(';')[0]!=='application/json')return withJson({error:'リクエスト形式が正しくありません。'},415);
  const raw=await request.text();
  if(raw.length>14000)return withJson({error:'入力内容が長すぎます。'},413);
  let data; try{data=JSON.parse(raw);}catch{return withJson({error:'入力内容を確認してください。'},400);}
  if(!data || typeof data !== 'object' || Array.isArray(data)) return withJson({error:'入力内容を確認してください。'},400);
  if(str(data.companyUrl))return withJson({ok:true}); // honeypot: never send
  const x={
    name:str(data.name,90),replyMethod:str(data.replyMethod,10),
    xHandle:str(data.xHandle,80),email:str(data.email,180),
    plan:str(data.plan,10),singers:Number(data.singers),
    harmony:str(data.harmony,15),rush:str(data.rush,10),
    songTitle:str(data.songTitle,160),materialsUrl:str(data.materialsUrl,600),
    wishDate:str(data.wishDate,10),message:str(data.message,2500),consent:data.consent
  };
  if(!x.name || !['x','email'].includes(x.replyMethod) || !['one','full'].includes(x.plan) || !Number.isInteger(x.singers) || x.singers<1 || x.singers>prices.maxSingers || !['none','generate','arrange'].includes(x.harmony) || !['normal','72h','24h'].includes(x.rush) || x.consent!=='yes') return withJson({error:'必須項目をご確認ください。'},400);
  if((x.replyMethod==='x'&&!/^@?[A-Za-z0-9_]{1,15}$/.test(x.xHandle)) || (x.replyMethod==='email'&&!isMail(x.email)) || (x.email&&!isMail(x.email)) || !isoDate(x.wishDate)) return withJson({error:'返信先または納品日の入力をご確認ください。'},400);
  if(x.materialsUrl){try{const url=new URL(x.materialsUrl);if(!['https:','http:'].includes(url.protocol))throw 0;}catch{return withJson({error:'素材URLの形式をご確認ください。'},400);}}
  // Verify bot protection on the server, fail closed when misconfigured.
  const cfIp=request.headers.get('CF-Connecting-IP')||undefined;
  const verify=new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:str(data['cf-turnstile-response'],2000)});
  if(cfIp)verify.set('remoteip',cfIp);
  let result;
  try{const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:verify});result=await r.json();}
  catch{return withJson({error:'認証を確認できませんでした。時間をおいてお試しください。'},503);}
  if(!result.success)return withJson({error:'認証が完了していません。もう一度お試しください。'},403);
  const requestId=crypto.randomUUID().slice(0,8);
  const cleanDiscord = value => value.replaceAll('@', '＠').replaceAll(String.fromCharCode(96,96,96), '[code]');
  const summary=[
    `受付ID: ${requestId}`,`お名前: ${x.name}`,`返信方法: ${x.replyMethod==='x'?'X DM':'メール'}`,
    `X: ${x.xHandle || '(未入力)'}`,`メール: ${x.email || '(未入力)'}`,
    `プラン: ${x.plan==='one'?'ワンコーラス':'フルコーラス'}`,
    `ボーカル人数: ${x.singers}名`,`ハモリ: ${x.harmony}`,`納期: ${x.rush}`,
    `概算（税込）: ${priceFor(x).toLocaleString('ja-JP')}円`,`曲名: ${x.songTitle || '(未入力)'}`,
    `素材URL: ${x.materialsUrl || '(後日)'}`,`希望納品日: ${x.wishDate || '(未指定)'}`,
    `ご相談内容:\n${x.message || '(未入力)'}`
  ].join('\n');
  const dest=[
    fetch('https://api.resend.com/emails',{
      method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({from:env.RESEND_FROM,to:[env.NOTIFY_EMAIL],subject:`[ODOKENE MIX] 新規依頼 ${requestId}`,
        text:summary,...(x.email?{reply_to:x.email}:{})})
    }),
    fetch(env.DISCORD_WEBHOOK_URL,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({content:`**ODOKENE / 新規MIX依頼**\n\`\`\`\n${cleanDiscord(summary).slice(0,1700)}\n\`\`\``,allowed_mentions:{parse:[]}})
    })
  ];
  const settled=await Promise.allSettled(dest);
  const ok=[];
  for(const a of settled){ok.push(a.status==='fulfilled'&&a.value.ok);}
  if(ok.every(Boolean))return withJson({ok:true,id:requestId});
  // One notification might have arrived; not claim complete success.
  console.error('Notification delivery failed', {id:requestId,emailOk:ok[0],discordOk:ok[1]});
  return withJson({error:'通知処理の一部が失敗しました。内容が届いている可能性があるため、再送せずXのDMでご確認ください。'},502);
}
export async function onRequestGet(){return withJson({error:'POSTのみ対応しています。'},405);}
