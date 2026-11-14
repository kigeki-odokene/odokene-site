(() => {
  const form = document.getElementById('mix-request');
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const fields = ['plan','singers','harmony','rush'];
  const prices = JSON.parse(form.dataset.pricing || '{}');
  function updatePrice() {
    const plan=$('plan').value;
    const count=Number($('singers').value);
    const base=prices[plan]?.base ?? 0;
    const perSinger=prices[plan]?.extraSinger ?? 0;
    const harmony=prices.harmony?.[$('harmony').value] ?? 0;
    const rush=prices.rush?.[$('rush').value] ?? 0;
    $('estimated-price').textContent='¥'+(base+Math.max(0,count-1)*perSinger+harmony+rush).toLocaleString('ja-JP');
    const extraDays = Math.max(0,count-1)*(prices.delivery?.extraDaysPerSinger ?? 0.5);
    const policy=prices.delivery;
    const type=$('rush').value;
    if(policy){
      const days=type==='normal'
        ? `${policy.normalMinDays+extraDays}〜${policy.normalMaxDays+extraDays}日程度`
        : `${(type==='72h'?policy.rush72Hours:policy.rush24Hours)+extraDays*24}時間以内`;
      $('estimated-delivery').textContent=days;
    }
  }
  fields.forEach(id => $(id)?.addEventListener('change',updatePrice));
  function updateContact(){
    const isX=$('reply-method').value==='x';
    $('x-handle').required=isX;
    $('client-email').required=!isX;
    $('x-required').textContent=isX?'*':'任意';
    $('x-required').className=isX?'required':'optional';
    $('email-required').textContent=isX?'任意':'*';
    $('email-required').className=isX?'optional':'required';
  }
  $('reply-method')?.addEventListener('change',updateContact);
  // Preselect valid options from the standalone price calculator.
  // Invalid or unknown query parameters are ignored.
  const estimateParams = new URLSearchParams(window.location.search);
  for (const field of fields) {
    const input = $(field);
    const value = estimateParams.get(field);
    if (input && value !== null && Array.from(input.options).some(option => option.value === value)) {
      input.value = value;
    }
  }
  updateContact(); updatePrice();
  // Load the public site key from Cloudflare Pages Functions, not a build-time variable.
  // Never expose the Turnstile secret key in the browser.
  async function initTurnstile() {
    const button = $('submit-request');
    const warning = $('form-warning');
    const container = $('turnstile-container');
    if (!button || !warning || !container) return;
    try {
      const response = await fetch('/api/turnstile-config', { cache: 'no-store' });
      if (!response.ok) throw new Error('Turnstile configuration unavailable');
      const config = await response.json();
      if (typeof config.siteKey !== 'string' || !config.siteKey.startsWith('0x')) {
        throw new Error('Invalid Turnstile site key');
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => {
        try {
          if (!window.turnstile?.render) throw new Error('Turnstile failed to load');
          window.turnstile.render(container, { sitekey: config.siteKey });
          warning.hidden = true;
          button.disabled = false;
          button.textContent = '依頼内容を送信する';
        } catch (error) {
          console.error('Turnstile initialization failed', error);
          warning.textContent = '認証機能を表示できません。再読み込みするか、XのDMでご連絡ください。';
        }
      };
      script.onerror = () => {
        warning.textContent = '認証機能を読み込めませんでした。再読み込みするか、XのDMでご連絡ください。';
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('Turnstile configuration failed', error);
      warning.textContent = 'フォームを現在利用できません。XのDMからご連絡ください。';
    }
  }
  void initTurnstile();
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const info=$('request-response'); const button=$('submit-request');
    info.dataset.state=''; info.textContent='';
    if (!form.reportValidity()) return;
    const token=form.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!token) { info.dataset.state='error'; info.textContent='認証の完了後に送信してください。'; return; }
    const data=Object.fromEntries(new FormData(form).entries());
    button.disabled=true; button.textContent='送信中…';
    try{
      const response=await fetch('/api/request',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data)
      });
      const json=await response.json();
      if(!response.ok) throw new Error(json.error || '送信できませんでした。');
      info.dataset.state='success'; info.textContent='依頼内容を送信しました。返信をお待ちください。';
      form.reset();updateContact();updatePrice();
    }catch(err){info.dataset.state='error';info.textContent=(err?.message || '送信できませんでした。')+' お急ぎの場合はXのDMをご利用ください。';}
    finally{button.disabled=false;button.textContent='依頼内容を送信する ↗'; if(window.turnstile) window.turnstile.reset();}
  });
})();
