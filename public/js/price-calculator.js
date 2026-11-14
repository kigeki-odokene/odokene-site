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
    rush: {normal: '通常', '72h': 'お急ぎ（72時間固定・1人につき追加料金）', '24h': '超特急（24時間希望・1人あたり料金は目安）'}
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
        !(harmony in pricing.harmony) || !['normal','72h','24h'].includes(rush)) return;

    const base = pricing[plan].base;
    const extra = (singers - 1) * pricing[plan].extraSinger;
    const harmonyPrice = pricing.harmony[harmony];
    const superExpress = rush === '24h';
    const rushPrice = pricing.rush[rush] * (rush === 'normal' ? 1 : singers);
    const total = base + extra + harmonyPrice + rushPrice;
    output.base.textContent = yen(base);
    output.singer.textContent = yen(extra);
    output.singerRow.hidden = singers === 1;
    output.harmony.textContent = harmony === 'none' ? 'なし' : '基本料金に含む';
    output.harmonyRow.hidden = harmony === 'none';
    output.rush.textContent = yen(rushPrice) + (superExpress ? '（目安）' : '');
    output.rushRow.hidden = rush === 'normal';
    output.total.textContent = yen(total) + (superExpress ? '（目安）' : '');
    const policy = pricing.delivery;
    const extraPeople = singers - 1;
    const addedHours = rush === 'normal'
      ? extraPeople * policy.extraDaysPerSinger * 24
      : 0;
    const delivery = superExpress
      ? `要相談（${policy.rush24Hours}時間希望）`
      : rush === '72h'
        ? `${policy.rush72Hours}時間以内`
        : `${policy.normalMinDays + addedHours / 24}〜${policy.normalMaxDays + addedHours / 24}日程度`;
    output.delivery.textContent = delivery;
    const extensionLabel = addedHours % 24 === 0
      ? `${addedHours / 24}日`
      : addedHours < 24 ? `${addedHours}時間` : `${Math.floor(addedHours / 24)}日${addedHours % 24}時間`;
    output.deliveryExtra.textContent = superExpress
      ? '超特急の正式な料金・納期・対応可否はご相談のうえ決定します'
      : rush === '72h'
        ? 'お急ぎは人数にかかわらず72時間以内（対応可否は内容確認後）'
        : extraPeople > 0
          ? `追加${extraPeople}名による延長：＋${extensionLabel}`
          : '通常納期はボーカル1名の場合の目安';
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
      '\nお急ぎ・超特急：' + output.rush.textContent +
      '\n合計：' + output.total.textContent +
      '\n初回納品の目安：' + output.delivery.textContent +
      '\n※お急ぎ・超特急の追加料金はボーカル人数分加算します。超特急の金額は目安で、正式な料金・納期・対応可否はご相談のうえ決定します。';
    try {
      await navigator.clipboard.writeText(content);
      output.copyResult.textContent = '計算内容をコピーしました。';
    } catch {
      output.copyResult.textContent = 'コピーできませんでした。ブラウザの設定をご確認ください。';
    }
  });
})();
