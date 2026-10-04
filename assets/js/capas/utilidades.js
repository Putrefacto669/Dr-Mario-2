/* ==========================================================
   Utilidades compartidas (texto, precios, ids)
   ========================================================== */
window.DrMario = window.DrMario || {};

window.DrMario.util = {
  // Minúsculas y sin tildes, para buscar sin importar cómo se escriba
  norm: (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(),

  // Evita que un texto de la hoja se interprete como HTML
  esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),

  fmt: (n) => 'C$ ' + Number(n || 0).toLocaleString('en-US'),

  uid: () => (crypto.randomUUID ? crypto.randomUUID() : 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)),

  bool: (v) => v === true || ['si', 'sí', 'true', '1', 'x', 'yes'].includes(String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()),
};
