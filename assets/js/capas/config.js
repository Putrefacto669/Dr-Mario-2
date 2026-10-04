/* ==========================================================
   CAPA 1 · CONFIGURACIÓN
   Lo único que normalmente se cambia a mano.

   MODO DEMO  (API_URL vacío): los productos se guardan en este
   navegador. Sirve para enseñar cómo funciona. PIN demo: 1234.
   MODO REAL  (API_URL con el link del Apps Script): los productos
   se guardan en Google Sheets y las fotos en Google Drive.
   Instrucciones: apps-script/INSTRUCCIONES.md
   ========================================================== */
window.DrMario = window.DrMario || {};

window.DrMario.config = {
  API_URL: '',                 // ← link de la "Aplicación web" de Apps Script (termina en /exec)
  WHATSAPP: '50583807800',     // número de la tienda, con código de país, sin + ni espacios
  DEMO_PIN: '1234',            // solo para el modo demo; el PIN real vive en Apps Script
  TIENDA: 'Videojuegos Dr.Mario',
};
