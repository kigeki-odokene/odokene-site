// Delivery estimates shared by static pages and Cloudflare Pages Functions.
// 24h (super express) is a consultation request, not a guaranteed deadline.
export function estimateDelivery(pricing, singers = 1, rush = 'normal') {
  const config = pricing.delivery;
  const count = Number.isInteger(Number(singers)) ? Math.max(1, Number(singers)) : 1;
  if (rush === '24h') return `要相談（${config.rush24Hours}時間希望）`;
  if (rush === '72h') {
    const hours = config.rush72Hours + (count - 1) * config.rushExtraHoursPerSinger;
    return `${hours}時間以内`;
  }
  const addedDays = (count - 1) * config.extraDaysPerSinger;
  return `${config.normalMinDays + addedDays}〜${config.normalMaxDays + addedDays}日程度`;
}

export function extraDeliveryDays(pricing, singers = 1) {
  return Math.max(0, Number(singers) - 1) * pricing.delivery.extraDaysPerSinger;
}
