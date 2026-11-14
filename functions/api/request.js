import prices from '../../src/data/pricing.json';
import { estimateDelivery } from '../../src/lib/delivery.mjs';
// Cloudflare Pages Functions: form endpoint. Secrets are set only on Cloudflare.
// Production requires TURNSTILE_SECRET_KEY and DISCORD_WEBHOOK_URL.
// Keep secret values in Cloudflare Pages variables, never in this repository.
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
 const rush=prices.rush[x.rush] * (x.rush==='normal' ? 1 : x.singers);
 return base+Math.max(0,x.singers-1)*per+harmony+rush;
}
export async function onRequestPost({request,env}){
  if(!env?.TURNSTILE_SECRET_KEY || !env.DISCORD_WEBHOOK_URL){
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
  if(!x.name || !['x','email'].includes(x.replyMethod) || !['one','full'].includes(x.plan) || !Number.isInteger(x.singers) || x.singers<1 || x.singers>prices.maxSingers || !['none','generate'].includes(x.harmony) || !['normal','72h','24h'].includes(x.rush) || x.consent!=='yes') return withJson({error:'必須項目をご確認ください。'},400);
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
    `ボーカル人数: ${x.singers}名`,`ハモリ: ${x.harmony}`,
    `納期オプション: ${x.rush==='24h'?'超特急（要相談）':x.rush==='72h'?'お急ぎ（72時間基準）':'通常'}`,
    `初回納品目安（人数加算済み）: ${estimateDelivery(prices,x.singers,x.rush)}`,
    `概算（税込）: ${priceFor(x).toLocaleString('ja-JP')}円${x.rush==='24h'?'（超特急は目安・正式料金要相談）':''}`,`曲名: ${x.songTitle || '(未入力)'}`,
    `素材URL: ${x.materialsUrl || '(後日)'}`,`希望納品日: ${x.wishDate || '(未指定)'}`,
    `ご相談内容:\n${x.message || '(未入力)'}`
  ].join('\n');
  
  let sent = false;

  try {
    const response = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: `**ODOKENE / 新規MIX依頼**\n\`\`\`\n${cleanDiscord(summary).slice(0, 1700)}\n\`\`\``,
        allowed_mentions: { parse: [] }
      })
    });

    sent = response.ok;
  } catch (error) {
    console.error('Discord webhook request failed', {
      id: requestId
    });
  }

  if (sent) {
    return withJson({
      ok: true,
      id: requestId
    });
  }

  console.error('Discord notification failed', {
    id: requestId
  });

  return withJson({
    error: 'Discordへの通知に失敗した可能性があります。二重送信を避けるため、XのDMでご確認ください。'
  }, 502);
}

export async function onRequestGet() {
  return withJson({
    error: 'POSTのみ対応しています。'
  }, 405);
}
