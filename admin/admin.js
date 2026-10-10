/* ==========================================================
   CAPA 4 · PRESENTACIÓN — Panel del Doc (dashboard + inventario)
   Formularios y lista. Reglas en DrMario.modelo, cálculos en
   DrMario.reportes, guardado en DrMario.datos, gráficas en dashboard.js.
   ========================================================== */
const D = window.DrMario;
const Store = D.datos;
const M = D.modelo;
const { CATEGORIAS, EMPRESAS, ESTILOS_FIGURA, SUGERENCIAS, AUTENTICIDAD, ESTADOS, DISPONIBILIDAD } = M;
const { esc, fmt, norm } = D.util;
const $ = (s) => document.querySelector(s);
let productos = [];
let editando = null;     // producto en edición (null = nuevo)
let fotoNueva = null;    // dataURL de la foto elegida
let fotoActual = '';     // imagen guardada antes

const icons = () => window.lucide && lucide.createIcons();
function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2600);
}

/* ================= LOGIN ================= */
$('#demo-hint').hidden = !Store.modoDemo;
$('#demo-badge').hidden = !Store.modoDemo;
$('#demo-reset').hidden = !Store.modoDemo;

$('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#login-btn'); btn.disabled = true; btn.textContent = 'Entrando…';
    $('#login-error').textContent = '';
    try { await Store.entrar($('#pin').value); abrirPanel(); }
    catch (err) { $('#login-error').textContent = err.message; $('#pin').select(); }
    finally { btn.disabled = false; btn.textContent = 'Entrar'; }
});
$('#logout').addEventListener('click', () => { Store.salir(); location.reload(); });

const Dash = window.DrMarioDashboard;

async function abrirPanel() {
    $('#login').hidden = true; $('#app').hidden = false;
    Dash.iniciar({ onEditar: (id) => { const p = productos.find((x) => x.id === id); if (p) abrirEditor(p); } });
    mostrarTab(sessionStorage.getItem('drmario_tab') || 'dashboard');
    guiaInicial();
    icons();
    $('#list').innerHTML = '<p class="text-center text-slate-500 py-16">Cargando productos…</p>';
    let clics = [];
    try {
        [productos, clics] = await Promise.all([
            Store.listar({ todos: true }),
            Store.clics({ dias: 90 }).catch((err) => { console.warn(err); toast('No se pudieron cargar los reportes'); return []; }),
        ]);
    } catch (err) { toast('No se pudieron cargar los productos'); console.warn(err); }
    pintarLista();
    Dash.actualizar(productos, clics);
}

// Vuelve a pintar todo después de un cambio
function refrescar() { pintarLista(); Dash.actualizar(productos); }

/* ================= PESTAÑAS ================= */
function mostrarTab(nombre) {
    document.querySelectorAll('[data-tab]').forEach((b) => {
        const activo = b.dataset.tab === nombre;
        b.setAttribute('aria-selected', String(activo));
        $('#tab-' + b.dataset.tab).hidden = !activo;
    });
    try { sessionStorage.setItem('drmario_tab', nombre); } catch { /* nada */ }
    $('#add-fab').classList.toggle('!hidden', nombre !== 'inventario');
    if (nombre === 'dashboard') Dash.pintar();
}
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => mostrarTab(b.dataset.tab)));

/* ================= LISTA ================= */
$('#f-cat').innerHTML = ['<option value="">Todos los tipos</option>', ...CATEGORIAS.map((c) => `<option>${c.id}</option>`)].join('');
$('#q').addEventListener('input', pintarLista);
$('#f-cat').addEventListener('change', pintarLista);

function pintarLista() {
    const q = norm($('#q').value), cat = $('#f-cat').value;
    const lista = productos.filter((p) => (!cat || p.categoria === cat)
        && (!q || norm([p.nombre, p.plataforma, p.franquicia, p.marca, p.empresa].join(' ')).includes(q)));

    const thumb = (p, tam) => {
        const ap = M.apariencia(p);
        return p.imagen
            ? `<img src="${esc(p.imagen)}" alt="" class="w-full h-full object-cover" onerror="this.style.display='none'">`
            : `<i data-lucide="${ap.icono}" class="${tam}" style="color:${ap.color}"></i>`;
    };
    const seg = (p) => `<div class="seg inline-flex bg-[#0f1626] border border-slate-700 rounded-xl p-1" role="group" aria-label="Disponibilidad">${
        Object.entries({ si: 'Hay', pocas: 'Pocas', agotado: 'Agotado' }).map(([k, l]) =>
            `<button type="button" data-disp="${k}" class="s-${k} px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-400 hover:text-white" aria-pressed="${p.disponible === k}">${l}</button>`).join('')}</div>`;
    const etiquetas = (p) => `${p.destacado ? ' <span class="font-pixel text-[8px] bg-brand-yellow text-slate-900 px-1.5 py-1 rounded align-middle">TOP</span>' : ''}${p.visible ? '' : ' <span class="text-[10px] font-bold bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded align-middle">OCULTO</span>'}`;
    const acciones = (p) => `
        <button type="button" data-edit class="w-10 h-10 rounded-xl hover:bg-slate-800 inline-flex items-center justify-center" aria-label="Editar ${esc(p.nombre)}"><i data-lucide="pencil" class="w-4 h-4"></i></button>
        <button type="button" data-del class="w-10 h-10 rounded-xl hover:bg-brand-red/20 text-slate-400 hover:text-brand-red inline-flex items-center justify-center" aria-label="Borrar ${esc(p.nombre)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
    const unidades = (p) => (p.cantidad === null ? '—' : p.cantidad);

    $('#list-empty').hidden = lista.length > 0;

    // Tabla (compu)
    $('#tabla').innerHTML = lista.map((p) => {
        const ap = M.apariencia(p);
        const marca = p.categoria === 'Figuras' ? (p.franquicia || '—') : (p.empresa || '—');
        const sub = p.categoria === 'Figuras' ? [p.estilo, p.marca].filter(Boolean).join(' · ') : p.plataforma;
        return `
        <tr data-id="${esc(p.id)}" class="${p.visible ? '' : 'opacity-60'}">
            <td><div class="w-12 h-12 rounded-lg bg-[#0f1626] overflow-hidden flex items-center justify-center">${thumb(p, 'w-5 h-5')}</div></td>
            <td class="max-w-[16rem]"><p class="font-semibold text-white truncate">${esc(p.nombre)}${etiquetas(p)}</p><p class="text-xs text-slate-500">${esc(p.categoria)}</p></td>
            <td><p class="text-white">${esc(marca)}</p><p class="text-xs truncate max-w-[12rem]" style="color:${ap.color}">${esc(sub || '')}</p></td>
            <td class="text-slate-300">${esc(p.estado || '—')}</td>
            <td class="text-right font-semibold text-white tabular-nums whitespace-nowrap">${fmt(p.precio)}</td>
            <td class="text-right tabular-nums text-slate-300">${unidades(p)}</td>
            <td>${seg(p)}</td>
            <td class="text-right whitespace-nowrap">${acciones(p)}</td>
        </tr>`;
    }).join('');

    // Tarjetas (celular)
    $('#list').innerHTML = lista.map((p) => {
        const ap = M.apariencia(p);
        return `
        <div class="bg-brand-card border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center gap-3 ${p.visible ? '' : 'opacity-60'}" data-id="${esc(p.id)}">
            <div class="w-14 h-14 rounded-xl bg-[#0f1626] overflow-hidden flex items-center justify-center shrink-0">${thumb(p, 'w-6 h-6')}</div>
            <div class="flex-1 min-w-0">
                <p class="font-bold text-white truncate">${esc(p.nombre)}${etiquetas(p)}</p>
                <p class="text-xs text-slate-400 truncate"><span style="color:${ap.color}">${esc(ap.etiqueta)}</span> · ${esc(M.detalle(p))}</p>
                <p class="text-sm font-bold text-white mt-0.5">${fmt(p.precio)}${p.cantidad !== null ? ` <span class="text-xs font-normal text-slate-400">· ${p.cantidad} unid.</span>` : ''}</p>
            </div>
            <div class="flex items-center gap-2 w-full justify-between">
                ${seg(p)}
                <div class="flex">${acciones(p)}</div>
            </div>
        </div>`;
    }).join('');
    icons();
}

async function clicEnFila(e) {
    const row = e.target.closest('[data-id]'); if (!row) return;
    const p = productos.find((x) => x.id === row.dataset.id); if (!p) return;

    const dispBtn = e.target.closest('[data-disp]');
    if (dispBtn) {                          // cambio rápido de disponibilidad
        const antes = { disponible: p.disponible, cantidad: p.cantidad };
        if (antes.disponible === dispBtn.dataset.disp) return;
        p.disponible = dispBtn.dataset.disp;
        // Mantiene las unidades coherentes con el cambio rápido
        if (p.disponible === 'agotado' && p.cantidad) p.cantidad = 0;
        else if (p.disponible !== 'agotado' && p.cantidad === 0) p.cantidad = null;
        refrescar();
        try { await Store.guardar(p); toast(`${p.nombre}: ${DISPONIBILIDAD[p.disponible]}`); }
        catch (err) { Object.assign(p, antes); refrescar(); toast('No se guardó: ' + err.message); }
        return;
    }
    if (e.target.closest('[data-edit]')) return abrirEditor(p);
    if (e.target.closest('[data-del]')) {
        if (!confirm(`¿Borrar "${p.nombre}" del catálogo?\nSi solo se acabó, mejor márcalo como Agotado.`)) return;
        try { await Store.borrar(p.id); productos = productos.filter((x) => x.id !== p.id); refrescar(); toast('Producto borrado'); }
        catch (err) { toast('No se pudo borrar: ' + err.message); }
    }
}
$('#list').addEventListener('click', clicEnFila);
$('#tabla').addEventListener('click', clicEnFila);

$('#demo-reset button').addEventListener('click', async () => {
    if (!confirm('¿Volver a los productos y clics de ejemplo? Se borra lo que agregaste en la demo.')) return;
    Store.reiniciarDemo();
    productos = await Store.listar({ todos: true });
    pintarLista(); Dash.actualizar(productos, await Store.clics({ dias: 90 }));
    toast('Demo reiniciada');
});

/* ================= EDITOR ================= */
const radios = (cont, name, opciones) => {
    $(cont).innerHTML = opciones.map(([v, l, icono]) => `
        <label class="opt"><input type="radio" name="${name}" value="${esc(v)}" class="sr-only"><span>${icono ? `<i data-lucide="${icono}" class="w-4 h-4"></i>` : ''}${esc(l)}</span></label>`).join('');
};
radios('#opt-categoria', 'categoria', CATEGORIAS.map((c) => [c.id, c.singular, c.icono]));
radios('#opt-empresa', 'empresa', Object.keys(EMPRESAS).map((k) => [k, k]));
radios('#opt-estilo', 'estilo', Object.keys(ESTILOS_FIGURA).map((k) => [k, k]));
radios('#opt-autenticidad', 'autenticidad', AUTENTICIDAD.map((k) => [k, k]));
radios('#opt-estado', 'estado', ESTADOS.map((k) => [k, k]));
radios('#opt-disponible', 'disponible', Object.entries(DISPONIBILIDAD));
$('#dl-franquicias').innerHTML = SUGERENCIAS.franquicias.map((f) => `<option value="${esc(f)}">`).join('');
$('#dl-fabricantes').innerHTML = SUGERENCIAS.fabricantes.map((f) => `<option value="${esc(f)}">`).join('');

const form = $('#form');
const val = (name) => (form.querySelector(`input[name="${name}"]:checked`) || {}).value || '';
const setRadio = (name, v) => form.querySelectorAll(`input[name="${name}"]`).forEach((r) => (r.checked = r.value === v));

function actualizarSecciones() {
    const cat = val('categoria');
    const esFigura = cat === 'Figuras';
    $('#sec-figura').hidden = !esFigura;
    $('#sec-plataforma').hidden = esFigura || !cat;

    const emp = val('empresa');
    const plataformas = (EMPRESAS[emp] || {}).plataformas || [];
    const esOtra = emp === 'Otra' || !emp;
    $('#wrap-plataforma-sel').hidden = esOtra;
    $('#wrap-plataforma-txt').hidden = !esOtra || !emp;
    if (!esOtra) {
        const actual = $('#plataforma-sel').value;
        $('#plataforma-sel').innerHTML = '<option value="">Elige una…</option>' +
            plataformas.map((p) => `<option ${p === actual ? 'selected' : ''}>${esc(p)}</option>`).join('');
    }
    $('#nombre').placeholder = esFigura ? 'Ej. Portgas D. Ace sentado' : cat === 'Juegos' ? 'Ej. Mario Kart 8 Deluxe' : 'Ej. PlayStation 2 Slim + 2 controles';
}
form.addEventListener('change', (e) => {
    if (['categoria', 'empresa'].includes(e.target.name)) actualizarSecciones();
});
// Al escribir las unidades, sugiere la disponibilidad (se puede cambiar a mano)
$('#cantidad').addEventListener('input', (e) => {
    const sugerida = M.dispPorCantidad(e.target.value);
    if (sugerida) setRadio('disponible', sugerida);
});

function pintarFoto(src) {
    $('#foto-prev').innerHTML = src ? `<img src="${esc(src)}" alt="Foto del producto" class="w-full h-full object-cover">` : '<i data-lucide="image" class="w-7 h-7 text-slate-600"></i>';
    $('#foto-quitar').hidden = !src; icons();
}
$('#foto').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { fotoNueva = await Store.comprimirImagen(file); pintarFoto(fotoNueva); }
    catch (err) { toast(err.message); }
    e.target.value = '';
});
$('#foto-quitar').addEventListener('click', () => { fotoNueva = null; fotoActual = ''; pintarFoto(''); });

function abrirEditor(p = null) {
    editando = p; fotoNueva = null; fotoActual = p ? p.imagen : '';
    form.reset();
    $('#editor-title').textContent = p ? 'Editar producto' : 'Agregar producto';
    $('#form-error').textContent = '';
    setRadio('categoria', p ? p.categoria : '');
    setRadio('empresa', p ? p.empresa : '');
    setRadio('estilo', p ? p.estilo : '');
    setRadio('autenticidad', p ? p.autenticidad : '');
    setRadio('estado', p ? p.estado : 'Usado');
    setRadio('disponible', p ? p.disponible : 'si');
    actualizarSecciones();
    $('#nombre').value = p ? p.nombre : '';
    if (p && EMPRESAS[p.empresa] && p.empresa !== 'Otra') $('#plataforma-sel').value = p.plataforma;
    $('#plataforma-txt').value = p && (p.empresa === 'Otra') ? p.plataforma : '';
    $('#franquicia').value = p ? p.franquicia : '';
    $('#marca').value = p ? p.marca : '';
    $('#tamano').value = p ? p.tamano : '';
    $('#precio').value = p ? p.precio : '';
    $('#cantidad').value = p && p.cantidad !== null ? p.cantidad : '';
    $('#destacado').checked = p ? p.destacado : false;
    $('#visible').checked = p ? p.visible : true;
    pintarFoto(fotoActual);
    $('#editor').hidden = false; document.body.style.overflow = 'hidden';
    icons();
    setTimeout(() => (p ? $('#nombre') : form.querySelector('input[name="categoria"]')).focus(), 50);
}
function cerrarEditor() { $('#editor').hidden = true; document.body.style.overflow = ''; }
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', cerrarEditor));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#editor').hidden) cerrarEditor(); });
$('#add-btn').addEventListener('click', () => abrirEditor());
$('#add-btn-dash').addEventListener('click', () => abrirEditor());

/* ================= GUÍA DE BIENVENIDA ================= */
const GUIA_KEY = 'drmario_guia_vista';
function mostrarGuia(ver) {
    $('#guia').hidden = !ver;
    if (ver) { mostrarTab('dashboard'); $('#guia').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}
$('#guia-cerrar').addEventListener('click', () => {
    mostrarGuia(false);
    try { localStorage.setItem(GUIA_KEY, '1'); } catch { /* nada */ }
});
$('#ayuda').addEventListener('click', () => mostrarGuia($('#guia').hidden));
$('#guia').addEventListener('click', (e) => {
    const b = e.target.closest('[data-guia]'); if (!b) return;
    if (b.dataset.guia === 'agregar') abrirEditor();
    if (b.dataset.guia === 'inventario') mostrarTab('inventario');
    if (b.dataset.guia === 'reportes') $('#titulo-reponer').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
function guiaInicial() {
    let vista = false;
    try { vista = localStorage.getItem(GUIA_KEY) === '1'; } catch { /* nada */ }
    $('#guia').hidden = vista;
}
$('#add-fab').addEventListener('click', () => abrirEditor());

function leerFormulario() {
    const categoria = val('categoria');
    const esFigura = categoria === 'Figuras';
    const empresa = esFigura ? '' : val('empresa');
    const p = {
        ...(editando || {}),
        categoria,
        nombre: $('#nombre').value.trim(),
        empresa,
        plataforma: esFigura ? '' : (empresa === 'Otra' ? $('#plataforma-txt').value.trim() : $('#plataforma-sel').value),
        estilo: esFigura ? val('estilo') : '',
        franquicia: esFigura ? $('#franquicia').value.trim() : '',
        marca: esFigura ? $('#marca').value.trim() : '',
        autenticidad: esFigura ? val('autenticidad') : '',
        tamano: esFigura ? $('#tamano').value : '',
        precio: Number($('#precio').value),
        cantidad: $('#cantidad').value === '' ? null : Number($('#cantidad').value),
        estado: val('estado'),
        disponible: val('disponible') || 'si',
        imagen: fotoActual,
        destacado: $('#destacado').checked,
        visible: $('#visible').checked,
    };
    // Las reglas viven en la capa modelo
    const faltas = M.validar(p);
    return { p, faltas };
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { p, faltas } = leerFormulario();
    if (faltas.length) { $('#form-error').textContent = 'Falta: ' + faltas.join(', ') + '.'; return; }
    const btn = $('#save-btn'); btn.disabled = true; btn.querySelector('span').textContent = 'Guardando…';
    try {
        const guardado = await Store.guardar(p, fotoNueva);
        const i = productos.findIndex((x) => x.id === guardado.id);
        if (i >= 0) productos[i] = guardado; else productos.unshift(guardado);
        cerrarEditor(); refrescar();
        toast(editando ? 'Cambios guardados' : 'Producto agregado al catálogo');
    } catch (err) {
        $('#form-error').textContent = 'No se pudo guardar: ' + err.message;
    } finally {
        btn.disabled = false; btn.querySelector('span').textContent = 'Guardar';
    }
});

/* ================= INICIO ================= */
icons();
if (Store.sesion()) abrirPanel();
