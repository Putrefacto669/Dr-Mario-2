/* ==========================================================
   CAPA 4 · PRESENTACIÓN — Dashboard del inventario
   Dibuja tarjetas, gráficas (SVG propio, sin librerías),
   la lista de reposición y descarga el reporte.
   Los números salen de DrMario.reportes.
   ========================================================== */
(function () {
  const D = window.DrMario;
  const R = D.reportes;
  const { esc, fmt } = D.util;
  const { apariencia, DISPONIBILIDAD } = D.modelo;
  const $ = (s) => document.querySelector(s);

  // Colores (validados sobre el fondo oscuro #161F33)
  const SERIE = '#08D9D6';                         // un solo dato: clics
  const ESTADO = {                                 // estados de stock: siempre con ícono y texto
    si: { color: '#0ca30c', icono: 'check-circle-2', texto: 'Disponible' },
    pocas: { color: '#fab219', icono: 'alert-triangle', texto: 'Pocas unidades' },
    agotado: { color: '#d03b3b', icono: 'x-circle', texto: 'Agotado' },
  };
  const GRID = '#253048';
  const TINTA_SUAVE = '#94a3b8';

  const estado = { productos: [], clics: [], dias: 30, onEditar: null };
  const iconos = () => window.lucide && lucide.createIcons();
  const fechaCorta = (ts) => new Date(ts).toLocaleDateString('es-NI', { day: 'numeric', month: 'short' }).replace('.', '');
  const fechaLarga = (ts) => new Date(ts).toLocaleDateString('es-NI', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  const plural = (n, uno, varios) => `${n.toLocaleString('en-US')} ${n === 1 ? uno : varios}`;

  /* ---------------- Tarjetas ---------------- */
  function pintarKpis() {
    const r = R.resumen(estado.productos);
    const tarjeta = (titulo, valor, sub, icono, colorIcono) => `
      <div class="viz-card !p-4">
        <p class="viz-sub flex items-center gap-1.5"><i data-lucide="${icono}" class="w-3.5 h-3.5" style="color:${colorIcono}"></i>${titulo}</p>
        <p class="text-2xl sm:text-3xl font-bold text-white mt-2 leading-none">${valor}</p>
        <p class="viz-sub mt-2">${sub}</p>
      </div>`;
    $('#kpis').innerHTML = [
      tarjeta('Productos', r.total, 'publicados en el catálogo', 'package', TINTA_SUAVE),
      tarjeta('Disponibles', r.disponibles + r.pocas, r.pocas ? plural(r.pocas, 'con pocas unidades', 'con pocas unidades') : 'todo con buen stock', ESTADO.si.icono, ESTADO.si.color),
      tarjeta('Agotados', r.agotados, r.agotados ? 'revisa "Reponer pronto"' : 'nada agotado', ESTADO.agotado.icono, ESTADO.agotado.color),
      tarjeta('Valor del inventario', fmt(r.valor), plural(r.unidades, 'unidad en stock', 'unidades en stock'), 'wallet', SERIE),
    ].join('');
  }

  /* ---------------- Clics por día (barras) ---------------- */
  function escalaBonita(max) {
    if (max <= 4) return 4;
    const paso = Math.pow(10, Math.floor(Math.log10(max)));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * paso >= max) return m * paso;
    return max;
  }

  function pintarClicsPorDia() {
    const cont = $('#chart-dias');
    const serie = R.clicsPorDia(estado.clics, estado.dias);
    const total = serie.reduce((a, d) => a + d.n, 0);
    $('#clics-total').textContent = total.toLocaleString('en-US');
    $('#clics-prom').textContent = `${(total / estado.dias).toFixed(1)} por día · ${estado.dias} días`;

    const caja = cont.getBoundingClientRect();
    if (!caja.width) return;                              // pestaña oculta: se dibuja al mostrarla
    const W = Math.floor(caja.width), H = Math.max(200, Math.floor(caja.height) || 224);
    const m = { t: 8, r: 4, b: 24, l: 30 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const yMax = escalaBonita(Math.max(1, ...serie.map((d) => d.n)));
    const y = (v) => m.t + ih - (v / yMax) * ih;
    const banda = iw / serie.length;
    const ancho = Math.max(2, Math.min(18, banda * 0.68));

    let svg = '';
    // Rejilla discreta: 0, mitad y máximo
    [0, yMax / 2, yMax].forEach((v) => {
      svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${GRID}" stroke-width="1" ${v ? 'stroke-dasharray="2 4"' : ''}/>`;
      svg += `<text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="${TINTA_SUAVE}">${Number.isInteger(v) ? v : v.toFixed(1)}</text>`;
    });
    // Barras con punta redondeada (4px) apoyadas en la base
    serie.forEach((d, i) => {
      const cx = m.l + banda * i + banda / 2;
      const x0 = cx - ancho / 2;
      if (d.n > 0) {
        const top = y(d.n), base = y(0), r = Math.min(4, ancho / 2, base - top);
        svg += `<path d="M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + ancho - r} Q${x0 + ancho},${top} ${x0 + ancho},${top + r} V${base} Z" fill="${SERIE}"/>`;
      }
      // Zona de hover más grande que la barra
      svg += `<rect x="${m.l + banda * i}" y="${m.t}" width="${banda}" height="${ih}" fill="transparent" data-tip="${esc(fechaLarga(d.ts))} · ${plural(d.n, 'clic', 'clics')}"/>`;
    });
    // Fechas: unas pocas, sin amontonar
    const cada = Math.ceil(serie.length / Math.max(2, Math.floor(iw / 64)));
    serie.forEach((d, i) => {
      if (i % cada !== 0 && i !== serie.length - 1) return;
      if (i !== serie.length - 1 && serie.length - 1 - i < cada * 0.6) return;
      // La primera y la última se alinean al borde para que no se corten
      const ultima = i === serie.length - 1;
      const x = i === 0 ? m.l : ultima ? W - m.r : m.l + banda * i + banda / 2;
      const ancla = i === 0 ? 'start' : ultima ? 'end' : 'middle';
      svg += `<text x="${x}" y="${H - 6}" text-anchor="${ancla}" font-size="10" fill="${TINTA_SUAVE}">${esc(fechaCorta(d.ts))}</text>`;
    });
    cont.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Clics en Lo quiero por día: ${total} en ${estado.dias} días">${svg}</svg>`;
  }

  /* ---------------- Lo más pedido ---------------- */
  function pintarTop() {
    const top = R.topPedidos(estado.productos, estado.clics, estado.dias, 6);
    const cont = $('#chart-top');
    if (!top.length) {
      cont.innerHTML = '<p class="text-sm text-slate-500 py-10 text-center">Todavía no hay clics en este periodo.</p>';
      return;
    }
    const max = top[0].clics;
    cont.innerHTML = top.map(({ producto: p, clics }, i) => {
      const ap = apariencia(p);
      const est = ESTADO[p.disponible];
      return `
        <div class="py-2" data-tip="${esc(p.nombre)} · ${plural(clics, 'clic', 'clics')}">
          <div class="flex items-center justify-between gap-3 text-sm">
            <span class="min-w-0 flex items-center gap-2">
              <span class="text-xs font-bold text-slate-500 w-4">${i + 1}</span>
              <span class="truncate text-white font-semibold">${esc(p.nombre)}</span>
              ${p.disponible !== 'si' ? `<i data-lucide="${est.icono}" class="w-3.5 h-3.5 shrink-0" style="color:${est.color}" aria-label="${est.texto}"></i>` : ''}
            </span>
            <span class="font-bold text-white tabular-nums">${clics}</span>
          </div>
          <div class="ml-6 mt-1.5 h-2 rounded-full bg-[#0f1626] overflow-hidden">
            <div class="h-full rounded-full" style="width:${Math.max(4, (clics / max) * 100)}%;background:${SERIE}"></div>
          </div>
          <p class="ml-6 mt-1 text-[11px] text-slate-500 truncate">${esc(ap.etiqueta)}</p>
        </div>`;
    }).join('');
  }

  /* ---------------- Stock por tipo (barra apilada) ---------------- */
  function pintarStock() {
    $('#leyenda-stock').innerHTML = Object.values(ESTADO).map((e) =>
      `<span class="inline-flex items-center gap-1.5"><i data-lucide="${e.icono}" class="w-3.5 h-3.5" style="color:${e.color}"></i>${e.texto}</span>`).join('');
    const filas = R.stockPorTipo(estado.productos);
    const max = Math.max(1, ...filas.map((f) => f.total));
    $('#chart-stock').innerHTML = filas.map((f) => {
      const seg = (k) => f[k] ? `<div class="h-full first:rounded-l-md last:rounded-r-md" style="flex:${f[k]};background:${ESTADO[k].color}" data-tip="${esc(f.tipo)} · ${ESTADO[k].texto}: ${f[k]}"></div>` : '';
      return `
        <div class="py-2.5">
          <div class="flex justify-between text-sm mb-1.5">
            <span class="text-white font-semibold">${esc(f.tipo)}</span>
            <span class="text-slate-400 tabular-nums">${f.total}</span>
          </div>
          <div class="flex gap-[2px] h-3.5" style="width:${(f.total / max) * 100}%">${seg('si')}${seg('pocas')}${seg('agotado')}</div>
          <p class="text-[11px] text-slate-500 mt-1">${f.si} disp. · ${f.pocas} pocas · ${f.agotado} agot.</p>
        </div>`;
    }).join('');
  }

  /* ---------------- Reponer pronto ---------------- */
  function pintarReposicion() {
    const lista = R.reposicion(estado.productos, estado.clics, estado.dias).slice(0, 8);
    const cont = $('#reposicion');
    if (!lista.length) {
      cont.innerHTML = '<p class="text-sm text-slate-500 py-10 text-center">Todo tiene buen stock. 🎉</p>';
      return;
    }
    cont.innerHTML = lista.map(({ producto: p, clics }) => {
      const ap = apariencia(p);
      const est = ESTADO[p.disponible];
      const thumb = p.imagen
        ? `<img src="${esc(p.imagen)}" alt="" class="w-full h-full object-cover" onerror="this.style.display='none'">`
        : `<i data-lucide="${ap.icono}" class="w-5 h-5" style="color:${ap.color}"></i>`;
      return `
        <div class="flex items-center gap-3 py-2.5">
          <div class="w-11 h-11 rounded-lg bg-[#0f1626] overflow-hidden flex items-center justify-center shrink-0">${thumb}</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-white truncate">${esc(p.nombre)}</p>
            <p class="text-xs flex items-center gap-1.5 mt-0.5"><i data-lucide="${est.icono}" class="w-3.5 h-3.5" style="color:${est.color}"></i><span class="text-slate-300">${est.texto}${p.cantidad !== null ? ` · ${plural(p.cantidad, 'unidad', 'unidades')}` : ''}</span></p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-sm font-bold text-white tabular-nums">${clics}</p>
            <p class="text-[11px] text-slate-500">${clics === 1 ? 'pedido' : 'pedidos'}</p>
          </div>
          <button type="button" data-editar="${esc(p.id)}" class="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center shrink-0" aria-label="Editar ${esc(p.nombre)}">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
        </div>`;
    }).join('');
  }

  /* ---------------- Tooltip ---------------- */
  function activarTooltip() {
    const tip = $('#viz-tip');
    const raiz = $('#tab-dashboard');
    const mostrar = (el, x, yTop) => {
      tip.textContent = el.dataset.tip;
      tip.hidden = false;
      const w = tip.offsetWidth / 2 + 8;
      tip.style.left = `${Math.min(window.innerWidth - w, Math.max(w, x))}px`;
      tip.style.top = `${Math.max(tip.offsetHeight + 12, yTop)}px`;
    };
    raiz.addEventListener('pointermove', (e) => {
      const el = e.target.closest('[data-tip]');
      if (!el) { tip.hidden = true; return; }
      const r = el.getBoundingClientRect();
      mostrar(el, e.clientX, el.tagName === 'rect' ? r.top + 8 : r.top);
    });
    raiz.addEventListener('pointerleave', () => (tip.hidden = true));
    window.addEventListener('scroll', () => (tip.hidden = true), { passive: true });
  }

  /* ---------------- Reporte ---------------- */
  function descargarReporte() {
    const csv = R.csvReporte(estado.productos, estado.clics, estado.dias);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-drmario-${R.claveDia(Date.now())}-${estado.dias}dias.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------------- Público ---------------- */
  function pintar() {
    pintarKpis();
    pintarClicsPorDia();
    pintarTop();
    pintarStock();
    pintarReposicion();
    iconos();
  }

  let listo = false;
  function iniciar({ onEditar }) {
    if (listo) return;
    listo = true;
    estado.onEditar = onEditar;
    $('#demo-clics').hidden = !D.datos.clicsSonDeEjemplo();
    document.querySelectorAll('.periodo').forEach((b) => b.addEventListener('click', () => {
      estado.dias = Number(b.dataset.dias);
      document.querySelectorAll('.periodo').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      pintar();
    }));
    $('#exportar').addEventListener('click', descargarReporte);
    $('#reposicion').addEventListener('click', (e) => {
      const b = e.target.closest('[data-editar]');
      if (b && estado.onEditar) estado.onEditar(b.dataset.editar);
    });
    activarTooltip();
    // Redibuja la gráfica si cambia el tamaño de su caja (rotar el cel, cambiar ventana)
    let t, ultimo = '';
    new ResizeObserver(([entrada]) => {
      const { width, height } = entrada.contentRect;
      const llave = `${Math.round(width)}x${Math.round(height)}`;
      if (!width || llave === ultimo) return;
      ultimo = llave;
      clearTimeout(t); t = setTimeout(pintarClicsPorDia, 60);
    }).observe($('#chart-dias'));
  }

  function actualizar(productos, clics) {
    estado.productos = productos;
    if (clics) estado.clics = clics;
    if (!$('#tab-dashboard').hidden) pintar();
  }

  window.DrMarioDashboard = { iniciar, actualizar, pintar };
})();
