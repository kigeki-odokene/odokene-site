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
  updateContact(); updatePrice();
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
