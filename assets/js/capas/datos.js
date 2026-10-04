/* ==========================================================
   CAPA 3 · DATOS (dónde se guardan los productos)
   Modo demo  → localStorage de este navegador
   Modo real  → Google Apps Script (hoja + fotos en Drive)
   Las pantallas solo llaman a DrMario.datos.*; no saben cuál se usa.
   ========================================================== */
window.DrMario = window.DrMario || {};

(function (D) {
  const { config } = D;
  const { limpiar, DEMO } = D.modelo;

  const DEMO_KEY = 'drmario_demo_productos_v1';
  const CACHE_KEY = 'drmario_cache_productos_v1';
  const SESSION_KEY = 'drmario_admin_key';
  const modoDemo = !config.API_URL;

  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };

  function demoLeer() {
    let data = ls.get(DEMO_KEY);
    if (!Array.isArray(data)) { data = DEMO.map(limpiar); ls.set(DEMO_KEY, data); }
    return data.map(limpiar);
  }

  async function api(body) {
    // Sin cabeceras extra: así es una petición "simple" y Apps Script no necesita preflight CORS
    const res = await fetch(config.API_URL, { method: 'POST', body: JSON.stringify(body) });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error del servidor');
    return data;
  }

  // Achica la foto en el celular antes de guardarla (máx. 1000 px, JPEG)
  function comprimirImagen(file, max = 1000, calidad = 0.82) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', calidad));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la foto')); };
      img.src = url;
    });
  }

  D.datos = {
    modoDemo,

    // Lista de productos. todos=true incluye los ocultos (para el admin).
    async listar({ todos = false } = {}) {
      let lista;
      if (modoDemo) {
        lista = demoLeer();
      } else {
        const res = await fetch(`${config.API_URL}?action=list${todos ? '&all=1' : ''}`, { cache: 'no-store' });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'No se pudo leer el catálogo');
        lista = data.productos.map(limpiar);
        if (!todos) ls.set(CACHE_KEY, lista);
      }
      return todos ? lista : lista.filter((p) => p.visible);
    },

    // Última lista guardada, para mostrar algo al instante mientras carga
    cache() { const c = ls.get(CACHE_KEY); return Array.isArray(c) ? c.map(limpiar) : null; },

    async entrar(pin) {
      pin = String(pin || '').trim();
      if (modoDemo) {
        if (pin !== config.DEMO_PIN) throw new Error('PIN incorrecto');
      } else {
        await api({ action: 'ping', key: pin });
      }
      try { sessionStorage.setItem(SESSION_KEY, pin); } catch { /* sin sesión guardada */ }
      return true;
    },
    sesion() { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } },
    salir() { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* nada */ } },

    // imagenDataUrl: foto nueva ya comprimida (o null para dejar la actual)
    async guardar(producto, imagenDataUrl = null) {
      const p = limpiar(producto);
      if (modoDemo) {
        if (imagenDataUrl) p.imagen = imagenDataUrl;
        const lista = demoLeer();
        const i = lista.findIndex((x) => x.id === p.id);
        if (i >= 0) lista[i] = p; else lista.unshift(p);
        if (!ls.set(DEMO_KEY, lista)) throw new Error('El navegador no tiene espacio para más fotos en la demo');
        return p;
      }
      const imagen = imagenDataUrl
        ? { base64: imagenDataUrl.split(',')[1], mime: 'image/jpeg', nombre: `${p.nombre}.jpg` }
        : null;
      const data = await api({ action: 'save', key: this.sesion(), producto: p, imagen });
      return limpiar(data.producto);
    },

    async borrar(id) {
      if (modoDemo) { ls.set(DEMO_KEY, demoLeer().filter((p) => p.id !== id)); return; }
      await api({ action: 'delete', key: this.sesion(), id });
    },

    reiniciarDemo() { if (modoDemo) ls.set(DEMO_KEY, DEMO.map(limpiar)); },
    comprimirImagen,
  };
})(window.DrMario);
