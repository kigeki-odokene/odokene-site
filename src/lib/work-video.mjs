// Shared metadata for YouTube videos and X posts.
export function getWorkVideo(work = {}) {
  const value = String(work.videoUrl || work.youtubeUrl || '').trim();
  let url;
  try { url = new URL(value); } catch { return { type: 'link', url: '', thumb: '', label: '動画' }; }
  if (url.protocol !== 'https:') return { type: 'link', url: '', thumb: '', label: '動画' };
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  let id = '';
  if (hostname === 'youtu.be' || hostname === 'www.youtu.be') id = parts[0] || '';
  if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'music.youtube.com') {
    if (parts[0] === 'watch') id = url.searchParams.get('v') || '';
    if (['shorts', 'live', 'embed'].includes(parts[0])) id = parts[1] || '';
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return {
      type: 'youtube',
      url: value,
      id,
      label: 'YouTube',
      thumb: String(work.thumbnail || '').trim() || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    };
  }
  if (['x.com', 'mobile.x.com', 'twitter.com', 'mobile.twitter.com'].includes(hostname)) {
    const statusIndex = parts.findIndex(part => part === 'status');
    const postId = parts[statusIndex + 1] || '';
    if (statusIndex > 0 && /^\d{5,}$/.test(postId)) {
      return {
        type: 'x',
        url: `https://x.com/${parts[0]}/status/${postId}`,
        id: postId,
        label: 'X',
        thumb: String(work.thumbnail || '').trim()
      };
    }
  }
  return { type: 'link', url: value, label: '動画', thumb: String(work.thumbnail || '').trim() };
}

export function workCreditText(work = {}) {
  const selections = Array.isArray(work.creditSelections) ? work.creditSelections.filter(Boolean) : [];
  const extra = String(work.creditExtra || '').trim();
  if (selections.length || extra) return [...selections, ...(extra ? [extra] : [])].join(' / ');
  return String(work.creditText || '').trim() || (Array.isArray(work.credits) ? work.credits.join(' / ') : '');
}
