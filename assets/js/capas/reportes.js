/* ==========================================================
   CAPA 2b · REPORTES (cálculos del dashboard)
   Recibe productos y clics ya cargados y devuelve números.
   No dibuja nada ni sabe de dónde vienen los datos.
   ========================================================== */
window.DrMario = window.DrMario || {};

(function (D) {
  const { CATEGORIAS } = D.modelo;
  const DIA = 24 * 60 * 60 * 1000;

  const unidades = (p) => (p.cantidad === null || p.cantidad === undefined ? (p.disponible === 'agotado' ? 0 : 1) : p.cantidad);

  // Fecha local en formato AAAA-MM-DD
  function claveDia(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function enPeriodo(clics, dias, ahora = Date.now()) {
    const desde = ahora - dias * DIA;
    return clics.filter((c) => c.ts >= desde && c.ts <= ahora);
  }

  // Tarjetas de arriba
  function resumen(productos) {
    const visibles = productos.filter((p) => p.visible);
    const r = { total: visibles.length, disponibles: 0, pocas: 0, agotados: 0, unidades: 0, valor: 0 };
    visibles.forEach((p) => {
      if (p.disponible === 'agotado') r.agotados++;
      else if (p.disponible === 'pocas') r.pocas++;
      else r.disponibles++;
      const u = p.disponible === 'agotado' ? 0 : unidades(p);
      r.unidades += u;
      r.valor += u * p.precio;
    });
    return r;
  }

  // Stock por tipo de producto (para la barra apilada)
  function stockPorTipo(productos) {
    return CATEGORIAS.map((c) => {
      const lista = productos.filter((p) => p.visible && p.categoria === c.id);
      return {
        tipo: c.id,
        si: lista.filter((p) => p.disponible === 'si').length,
        pocas: lista.filter((p) => p.disponible === 'pocas').length,
        agotado: lista.filter((p) => p.disponible === 'agotado').length,
        total: lista.length,
      };
    }).filter((f) => f.total > 0);
  }

  // Clics de "Lo quiero" por día, incluye los días en cero
  function clicsPorDia(clics, dias, ahora = Date.now()) {
    const cuenta = {};
    enPeriodo(clics, dias, ahora).forEach((c) => { const k = claveDia(c.ts); cuenta[k] = (cuenta[k] || 0) + 1; });
    const serie = [];
    for (let i = dias - 1; i >= 0; i--) {
      const ts = ahora - i * DIA;
      const k = claveDia(ts);
      serie.push({ fecha: k, ts, n: cuenta[k] || 0 });
    }
    return serie;
  }

  function clicsPorProducto(clics, dias, ahora = Date.now()) {
    const cuenta = {};
    enPeriodo(clics, dias, ahora).forEach((c) => { cuenta[c.id] = (cuenta[c.id] || 0) + 1; });
    return cuenta;
  }

  // Más pedidos (aunque estén agotados)
  function topPedidos(productos, clics, dias, n = 5) {
    const cuenta = clicsPorProducto(clics, dias);
    return productos
      .map((p) => ({ producto: p, clics: cuenta[p.id] || 0 }))
      .filter((x) => x.clics > 0)
      .sort((a, b) => b.clics - a.clics)
      .slice(0, n);
  }

  // Lo que hay que conseguir: agotado o pocas unidades, ordenado por demanda
  function reposicion(productos, clics, dias) {
    const cuenta = clicsPorProducto(clics, dias);
    const prioridad = { agotado: 0, pocas: 1 };
    return productos
      .filter((p) => p.visible && (p.disponible === 'agotado' || p.disponible === 'pocas'))
      .map((p) => ({ producto: p, clics: cuenta[p.id] || 0 }))
      .sort((a, b) => b.clics - a.clics || prioridad[a.producto.disponible] - prioridad[b.producto.disponible]);
  }

  // Reporte descargable (CSV que abre en Excel)
  function csvReporte(productos, clics, dias) {
    const cuenta = clicsPorProducto(clics, dias);
    const celda = (v) => {
      const s = String(v ?? '');
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const cab = ['Producto', 'Tipo', 'Marca / Serie', 'Consola / Estilo', 'Estado', 'Precio (C$)', 'Unidades',
      'Valor en stock (C$)', 'Disponibilidad', `Clics "Lo quiero" (${dias} días)`, 'Visible'];
    const filas = productos.map((p) => {
      const u = p.disponible === 'agotado' ? 0 : unidades(p);
      return [
        p.nombre, p.categoria,
        p.categoria === 'Figuras' ? p.franquicia : p.empresa,
        p.categoria === 'Figuras' ? p.estilo : p.plataforma,
        p.estado, p.precio, p.cantidad ?? '', u * p.precio,
        D.modelo.DISPONIBILIDAD[p.disponible], cuenta[p.id] || 0, p.visible ? 'Sí' : 'No',
      ];
    });
    // BOM para que Excel lea bien las tildes
    return '﻿' + [cab, ...filas].map((f) => f.map(celda).join(',')).join('\r\n');
  }

  D.reportes = { resumen, stockPorTipo, clicsPorDia, clicsPorProducto, topPedidos, reposicion, csvReporte, claveDia, DIA };
})(window.DrMario);
