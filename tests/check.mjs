import assert from 'node:assert/strict';
import fs from 'node:fs';
import { onRequestPost } from '../functions/api/request.js';
import { onRequestGet as auth } from '../functions/auth.js';
import { onRequestGet as callback } from '../functions/callback.js';
import pricing from '../src/data/pricing.json' with { type:'json' };
let cases = 0;
const check = (v,msg) => {assert.ok(v,msg);cases++};
const jsonResponse = (x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json'}});
const originalFetch=globalThis.fetch;
let endpoints=[];
let deliveries=[];
globalThis.fetch=async (url, options={}) => {
  endpoints.push(String(url));
  if(String(url).includes('turnstile/v0/siteverify')) return jsonResponse({success:true});
  if(String(url).includes('api.resend.com/emails')){deliveries.push({type:'email',payload:JSON.parse(options.body)});return jsonResponse({id:'email-test-id'});}
  if(String(url).includes('discord.com/api/webhooks')){deliveries.push({type:'discord',payload:JSON.parse(options.body)});return new Response(null,{status:204});}
  if(String(url).includes('github.com/login/oauth/access_token'))return jsonResponse({access_token:'ghu_testtoken'});
  if(String(url).includes('api.github.com/user'))return jsonResponse({login:'correct-editor'});
  throw new Error('Unknown fetch endpoint: '+url);
};
const env={TURNSTILE_SECRET_KEY:'test',RESEND_API_KEY:'test',RESEND_FROM:'test@verified.example',NOTIFY_EMAIL:'private@example.com',DISCORD_WEBHOOK_URL:'https://discord.com/api/webhooks/test'};
const good={name:'test vocalist',replyMethod:'x',xHandle:'@x_handle',email:'',plan:'full',singers:2,harmony:'generate',rush:'24h',songTitle:'曲名',materialsUrl:'https://example.com/file',wishDate:'2026-12-01',message:'お願いします',consent:'yes','cf-turnstile-response':'test'};
const request = (x) => new Request('https://odokene.pages.dev/api/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(x)});
try {
  let r=await onRequestPost({request:request(good),env});check(r.status===200,'valid request should succeed');check((await r.json()).ok,'json success');
  check(endpoints.some(e=>e.includes('resend')) && endpoints.some(e=>e.includes('discord')),'both notifications called');
  check(deliveries.some(d => d.type==='email' && d.payload.text.includes('13,000円')),'email includes 13,000 yen price');
  check(deliveries.some(d => d.type==='discord' && d.payload.content.includes('13,000円')),'Discord includes the same price');
  // Check arithmetic directly. 5,000 + 3,000 + 1,000 + 4,000 = 13,000
  check(pricing.full.base+pricing.full.extraSinger+pricing.harmony.generate+pricing.rush['24h']===13000,'prices consistent');
  r=await onRequestPost({request:request({...good,replyMethod:'email',email:'person@example.org',xHandle:''}),env});check(r.status===200,'email option works');
  r=await onRequestPost({request:request({...good,message:'@everyone code ```'}),env});check(r.status===200,'Discord sanitizing request can send');check(deliveries.at(-1)?.payload?.content?.includes('＠everyone')===true,'Discord mention neutralized');check(!deliveries.at(-1)?.payload?.content?.includes('``` code ```'),'Discord code fences neutralized');
  r=await onRequestPost({request:request({...good,xHandle:'not a handle!'}),env});check(r.status===400,'invalid X rejected');
  r=await onRequestPost({request:request({...good,materialsUrl:'javascript:alert(1)'}),env});check(r.status===400,'invalid URL rejected');
  r=await onRequestPost({request:request({...good,singers:100}),env});check(r.status===400,'excess count rejected');
  r=await onRequestPost({request:request({...good,consent:'no'}),env});check(r.status===400,'privacy consent required');
  r=await onRequestPost({request:request(good),env:{}});check(r.status===503,'fail closed without secrets');
  r=await onRequestPost({request:request(null),env});check(r.status===400,'reject null');
  const authEnv={GITHUB_CLIENT_ID:'id',GITHUB_CLIENT_SECRET:'private',CMS_ALLOWED_GITHUB_LOGIN:'correct-editor',CMS_SITE_ORIGIN:'https://odokene.pages.dev'};
  const reqAuth=new Request('https://odokene.pages.dev/auth');
  r=await auth({request:reqAuth,env:authEnv});check(r.status===302,'auth should redirect');
  const redirect=new URL(r.headers.get('location'));
  check(redirect.hostname==='github.com','auth goes GitHub');
  const state=redirect.searchParams.get('state');
  check(state?.length===48,'state secure random');
  const cookie=r.headers.get('set-cookie').split(';')[0];
  const cbRequest=new Request(`https://odokene.pages.dev/callback?code=abc&state=${state}`,{headers:{Cookie:cookie}});
  r=await callback({request:cbRequest,env:authEnv});check(r.status===200,'OAuth callback works with mocked GitHub');
  let content=await r.text();check(content.includes('authorization:github:success:'),'OAuth handoff exists');
  r=await callback({request:new Request('https://odokene.pages.dev/callback?code=abc&state=invalid',{headers:{Cookie:cookie}}),env:authEnv});check(r.status===403,'invalid state denied');
  r=await auth({request:reqAuth,env:{}});check(r.status===503,'OAuth fail closed');
  const config=fs.readFileSync(new URL('../public/admin/config.yml',import.meta.url),'utf8');
  check(config.includes('src/data/copy.json')&&config.includes('src/data/pricing.json'),'CMS edits both copy and pricing');
  console.log(`PASS: ${cases} checks. Request submission, price math, OAuth mock, invalid cases & CMS configs.`);
} finally {globalThis.fetch=originalFetch;}
