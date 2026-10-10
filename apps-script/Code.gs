/**
 * Videojuegos Dr.Mario — backend del catálogo (Google Apps Script)
 *
 * Guarda los productos en la hoja "Productos" de esta Google Sheet
 * y las fotos en una carpeta de Google Drive.
 *
 * Seguridad: el PIN NO está en la página. Vive aquí, en
 * Configuración del proyecto → Propiedades del script → ADMIN_KEY.
 * Después de 8 intentos fallidos se bloquea 15 minutos.
 *
 * Instalación paso a paso: apps-script/INSTRUCCIONES.md
 */

const HOJA = 'Productos';
const HOJA_CLICS = 'Clics';
const MAX_CLICS_MINUTO = 600;   // freno anti-abuso para el contador público
const CARPETA_FOTOS = 'Catálogo Dr.Mario - Fotos';
const COLUMNAS = ['id', 'nombre', 'categoria', 'empresa', 'plataforma', 'estilo', 'franquicia', 'marca',
  'autenticidad', 'tamano', 'precio', 'estado', 'disponible', 'cantidad', 'imagen', 'destacado', 'visible', 'actualizado'];
const MAX_INTENTOS = 8;
const BLOQUEO_SEG = 15 * 60;

/* ---------- Lectura pública (la usa el catálogo) ---------- */
function doGet(e) {
  const todos = e && e.parameter && e.parameter.all === '1';
  const productos = leerProductos().filter((p) => todos || p.visible !== 'No');
  return json({ ok: true, productos });
}

/* ---------- Escritura (solo con PIN) ---------- */
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'Solicitud inválida' }); }

  const cache = CacheService.getScriptCache();

  // Público: el catálogo cuenta un "Lo quiero" (no necesita PIN)
  if (body.action === 'click') return json(registrarClic(String(body.id || ''), cache));

  const fallos = Number(cache.get('fallos') || 0);
  if (fallos >= MAX_INTENTOS) return json({ ok: false, error: 'Demasiados intentos. Espera 15 minutos.' });

  const clave = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!clave) return json({ ok: false, error: 'Falta configurar ADMIN_KEY en el script' });
  if (String(body.key || '') !== clave) {
    cache.put('fallos', String(fallos + 1), BLOQUEO_SEG);
    return json({ ok: false, error: 'PIN incorrecto' });
  }
  cache.remove('fallos');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    switch (body.action) {
      case 'ping': return json({ ok: true });
      case 'save': return json({ ok: true, producto: guardarProducto(body.producto || {}, body.imagen) });
      case 'delete': borrarProducto(String(body.id || '')); return json({ ok: true });
      case 'stats': return json({ ok: true, clics: leerClics(Number(body.dias) || 90) });
      default: return json({ ok: false, error: 'Acción desconocida' });
    }
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Hoja ---------- */
function hoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA);
  if (!sh) sh = ss.insertSheet(HOJA);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUMNAS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold');
  } else {
    // Si la hoja es de una versión anterior, agrega las columnas que falten al final
    const cab = cabecera(sh);
    const faltan = COLUMNAS.filter((c) => cab.indexOf(c) < 0);
    if (faltan.length) sh.getRange(1, cab.length + 1, 1, faltan.length).setValues([faltan]).setFontWeight('bold');
  }
  return sh;
}

function cabecera(sh) {
  return sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(String).filter((c) => c !== '');
}

function leerProductos() {
  const sh = hoja();
  const datos = sh.getDataRange().getValues();
  const cab = datos.shift().map(String);
  return datos
    .filter((fila) => fila.some((c) => c !== ''))
    .map((fila) => {
      const p = {};
      cab.forEach((c, i) => { p[c] = fila[i] instanceof Date ? fila[i].toISOString() : fila[i]; });
      return p;
    });
}

function guardarProducto(p, imagen) {
  const sh = hoja();
  const id = /^[\w-]{1,64}$/.test(String(p.id || '')) ? String(p.id) : Utilities.getUuid();

  if (imagen && imagen.base64) p.imagen = guardarFoto(imagen, id);

  const valores = {
    id: id,
    nombre: texto(p.nombre, 80),
    categoria: texto(p.categoria, 40),
    empresa: texto(p.empresa, 30),
    plataforma: texto(p.plataforma, 40),
    estilo: texto(p.estilo, 40),
    franquicia: texto(p.franquicia, 40),
    marca: texto(p.marca, 40),
    autenticidad: texto(p.autenticidad, 40),
    tamano: texto(p.tamano, 6),
    precio: Math.max(0, Math.round(Number(p.precio) || 0)),
    estado: texto(p.estado, 20),
    disponible: ['si', 'pocas', 'agotado'].indexOf(p.disponible) >= 0 ? p.disponible : 'si',
    cantidad: p.cantidad === null || p.cantidad === undefined || p.cantidad === '' ? '' : Math.max(0, Math.round(Number(p.cantidad) || 0)),
    imagen: /^https:\/\//.test(String(p.imagen || '')) ? String(p.imagen) : '',
    destacado: p.destacado ? 'Sí' : 'No',
    visible: p.visible === false ? 'No' : 'Sí',
    actualizado: new Date(),
  };
  if (!valores.nombre) throw new Error('El producto necesita nombre');

  const fila = cabecera(sh).map((c) => (c in valores ? valores[c] : ''));
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map((r) => String(r[0]));
  const i = ids.indexOf(id);
  if (i > 0) sh.getRange(i + 1, 1, 1, fila.length).setValues([fila]);
  else sh.appendRow(fila);

  valores.actualizado = valores.actualizado.toISOString();
  return valores;
}

function borrarProducto(id) {
  const sh = hoja();
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map((r) => String(r[0]));
  const i = ids.indexOf(id);
  if (i > 0) sh.deleteRow(i + 1);
}

/* ---------- Clics de "Lo quiero" ---------- */
function hojaClics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA_CLICS);
  if (!sh) {
    sh = ss.insertSheet(HOJA_CLICS);
    sh.appendRow(['ts', 'id', 'fecha']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function registrarClic(id, cache) {
  if (!/^[\w-]{1,64}$/.test(id)) return { ok: false, error: 'Producto inválido' };
  const llave = 'clics_' + Math.floor(Date.now() / 60000);
  const n = Number(cache.get(llave) || 0);
  if (n >= MAX_CLICS_MINUTO) return { ok: false, error: 'Demasiados clics' };
  cache.put(llave, String(n + 1), 120);
  const ahora = new Date();
  hojaClics().appendRow([ahora.getTime(), id, ahora]);
  return { ok: true };
}

function leerClics(dias) {
  const sh = hojaClics();
  const total = sh.getLastRow() - 1;
  if (total <= 0) return [];
  const leer = Math.min(total, 20000);                      // los más recientes
  const datos = sh.getRange(sh.getLastRow() - leer + 1, 1, leer, 2).getValues();
  const desde = Date.now() - Math.min(dias, 366) * 24 * 60 * 60 * 1000;
  return datos.filter((f) => Number(f[0]) >= desde).map((f) => ({ ts: Number(f[0]), id: String(f[1]) }));
}

/* ---------- Fotos en Drive ---------- */
function guardarFoto(imagen, id) {
  const mime = String(imagen.mime || 'image/jpeg');
  if (!/^image\/(jpeg|png|webp)$/.test(mime)) throw new Error('Formato de foto no permitido');
  const bytes = Utilities.base64Decode(imagen.base64);
  if (bytes.length > 3 * 1024 * 1024) throw new Error('La foto es muy pesada (máx. 3 MB)');

  const archivo = carpetaFotos().createFile(Utilities.newBlob(bytes, mime, id + '.jpg'));
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?id=' + archivo.getId() + '&sz=w1000';
}

function carpetaFotos() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* se creó otra */ } }
  const carpeta = DriveApp.createFolder(CARPETA_FOTOS);
  props.setProperty('FOLDER_ID', carpeta.getId());
  return carpeta;
}

/* ---------- Utilidades ---------- */
// Recorta y evita que un texto se interprete como fórmula en la hoja
function texto(v, max) {
  let s = String(v == null ? '' : v).trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Ejecuta esta función una vez desde el editor para crear la hoja y dar permisos. */
function configurar() {
  hoja();
  hojaClics();
  carpetaFotos();
  if (!PropertiesService.getScriptProperties().getProperty('ADMIN_KEY')) {
    Logger.log('Falta ADMIN_KEY: agrégala en Configuración del proyecto → Propiedades del script.');
  } else {
    Logger.log('Listo. Ahora: Implementar → Nueva implementación → Aplicación web.');
  }
}
