(() => {
  const calculator = document.getElementById('price-calculator');
  if (!calculator) return;

  let pricing;
  try { pricing = JSON.parse(calculator.dataset.pricing || '{}'); }
  catch { return; }

  const get = (name) => calculator.elements.namedItem(name);
  const yen = amount => '¥' + amount.toLocaleString('ja-JP');
  const labels = {
    plan: {one: 'ワンコーラス', full: 'フルコーラス'},
    harmony: {none: 'なし', generate: 'ハモリ生成', arrange: 'ハモリ作成・アレンジ'},
    rush: {normal: '通常', '72h': 'お急ぎ（72時間・1名基準）', '24h': 'お急ぎ（24時間・1名基準）'}
  };

  const output = {
    base: document.getElementById('calc-base'),
    singer: document.getElementById('calc-extra-singers'),
    singerRow: document.getElementById('calc-extra-singers-row'),
    harmony: document.getElementById('calc-harmony'),
    harmonyRow: document.getElementById('calc-harmony-row'),
    rush: document.getElementById('calc-rush'),
    rushRow: document.getElementById('calc-rush-row'),
    total: document.getElementById('calc-total'),
    note: document.getElementById('calc-selection'),
    delivery: document.getElementById('calc-delivery'),
    deliveryExtra: document.getElementById('calc-delivery-extra'),
    request: document.getElementById('calc-request-link'),
    copy: document.getElementById('calc-copy'),
    copyResult: document.getElementById('calc-copy-result')
  };

  let summary = '';
  function update() {
    const plan = get('plan').value;
    const singers = Number(get('singers').value);
    const harmony = get('harmony').value;
    const rush = get('rush').value;
    if (!pricing[plan] || !Number.isInteger(singers) || singers < 1 || singers > pricing.maxSingers ||
        !(harmony in pricing.harmony) || !(rush in pricing.rush)) return;

    const base = pricing[plan].base;
    const extra = (singers - 1) * pricing[plan].extraSinger;
    const harmonyPrice = pricing.harmony[harmony];
    const rushPrice = pricing.rush[rush];
    const total = base + extra + harmonyPrice + rushPrice;
    output.base.textContent = yen(base);
    output.singer.textContent = yen(extra);
    output.singerRow.hidden = singers === 1;
    output.harmony.textContent = yen(harmonyPrice);
    output.harmonyRow.hidden = harmonyPrice === 0;
    output.rush.textContent = yen(rushPrice);
    output.rushRow.hidden = rushPrice === 0;
    output.total.textContent = yen(total);
    const policy = pricing.delivery;
    const addedDays = (singers - 1) * policy.extraDaysPerSinger;
    const delivery = rush === 'normal'
      ? `${policy.normalMinDays + addedDays}〜${policy.normalMaxDays + addedDays}日程度`
      : `${(rush === '72h' ? policy.rush72Hours : policy.rush24Hours) + 24 * addedDays}時間以内`;
    output.delivery.textContent = delivery;
    output.deliveryExtra.textContent = singers > 1
      ? `追加${singers - 1}名による延長：＋${addedDays}日`
      : 'ボーカル1名の場合の目安';
    summary = [
      labels.plan[plan],
      singers + '人',
      labels.harmony[harmony],
      labels.rush[rush]
    ].join(' / ');
    output.note.textContent = summary;
    const params = new URLSearchParams({plan, singers: String(singers), harmony, rush});
    output.request.href = '/contact/?' + params.toString();
    output.copyResult.textContent = '';
  }

  calculator.addEventListener('change', update);
  update();

  output.copy?.addEventListener('click', async () => {
    const content = 'ODOKENE MIX概算（税込）\n' + summary +
      '\n基本料金：' + output.base.textContent +
      '\n追加ボーカル：' + output.singer.textContent +
      '\nハモリ：' + output.harmony.textContent +
      '\nお急ぎ納品：' + output.rush.textContent +
      '\n合計：' + output.total.textContent +
      '\n初回納品の目安：' + output.delivery.textContent +
      '\n※正式な料金はご依頼内容を確認後にご案内します。';
    try {
      await navigator.clipboard.writeText(content);
      output.copyResult.textContent = '計算内容をコピーしました。';
    } catch {
      output.copyResult.textContent = 'コピーできませんでした。ブラウザの設定をご確認ください。';
    }
  });
})();
