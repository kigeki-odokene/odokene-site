// Build-time and server-side delivery estimate. The CMS edits src/data/pricing.json.
export function estimateDelivery(pricing, singers = 1, rush = 'normal') {
  const config = pricing.delivery;
  const count = Number.isInteger(Number(singers)) ? Math.max(1, Number(singers)) : 1;
  const addedDays = (count - 1) * config.extraDaysPerSinger;
  if (rush === '72h' || rush === '24h') {
    const hours = (rush === '72h' ? config.rush72Hours : config.rush24Hours) + addedDays * 24;
    return `${hours}時間以内`;
  }
  return `${config.normalMinDays + addedDays}〜${config.normalMaxDays + addedDays}日程度`;
}

export function extraDeliveryDays(pricing, singers = 1) {
  return Math.max(0, Number(singers) - 1) * pricing.delivery.extraDaysPerSinger;
}
