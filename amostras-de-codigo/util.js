// Utilidades compartilhadas
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brl0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const money = (v, round = false) => (round ? brl0 : brl).format(Number(v) || 0);
export const pct = (v) => `${(Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
export const num = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Datas no fuso local (YYYY-MM-DD)
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function fmtDate(iso, opts = { day: '2-digit', month: 'short' }) {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', opts).replace('.', '');
}
export function daysBetween(a, b) {
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
}
export const monthKey = (iso) => (iso || '').slice(0, 7);
export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').replace(' de ', '/');
}

export function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

// Telefone -> link WhatsApp (assume Brasil)
export function waNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = d.replace(/^0+/, '');
  if (!d.startsWith('55') || d.length <= 11) d = '55' + d;
  return d;
}
export function waLink(phone, text = '') {
  const n = waNumber(phone);
  if (!n) return '';
  return `https://wa.me/${n}${text ? '?text=' + encodeURIComponent(text) : ''}`;
}
// Celular brasileiro tem 9 dígitos começando com 9 depois do DDD
export function isMobileBR(phone) {
  const d = String(phone || '').replace(/\D/g, '').replace(/^55/, '');
  return d.length === 11 && d[2] === '9';
}

export function haversine(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
export function bearing(a, b) {
  const rad = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad);
  const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad);
  return Math.atan2(y, x); // radianos, 0 = norte
}
export const fmtDist = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);

export function stars(r) {
  const n = Math.round(Number(r) || 0);
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
}

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

export async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copiado');
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('Copiado'); } catch { toast('Selecione e copie manualmente'); }
    ta.remove();
    return false;
  }
}

export function download(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

// Drawer e modal
export function openDrawer(html) {
  const d = $('#drawer');
  d.innerHTML = `<button class="btn btn-sm drawer-close" data-close type="button">Fechar ✕</button>${html}`;
  d.hidden = false;
  $('#drawer-backdrop').hidden = false;
  d.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  return d;
}
export function closeDrawer() {
  $('#drawer').hidden = true;
  $('#drawer-backdrop').hidden = true;
  document.body.style.overflow = '';
}
export function openModal(html) {
  const m = $('#modal');
  m.innerHTML = html;
  $('#modal-backdrop').hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => m.querySelector('input, select, textarea')?.focus(), 50);
  return m;
}
export function closeModal() {
  $('#modal-backdrop').hidden = true;
  $('#modal').innerHTML = '';
  if ($('#drawer').hidden) document.body.style.overflow = '';
}

// Confirmação dentro da página (sem confirm())
export function confirmBox(msg, okLabel = 'Confirmar') {
  return new Promise((resolve) => {
    const m = openModal(`
      <h2>${esc(msg)}</h2>
      <div class="modal-foot"><button class="btn" data-no>Cancelar</button><button class="btn btn-primary" data-yes>${esc(okLabel)}</button></div>`);
    m.querySelector('[data-no]').onclick = () => { closeModal(); resolve(false); };
    m.querySelector('[data-yes]').onclick = () => { closeModal(); resolve(true); };
  });
}
