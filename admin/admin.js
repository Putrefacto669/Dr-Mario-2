/* ==========================================================
   CAPA 4 · PRESENTACIÓN — Inventario (panel del Doc)
   Formularios y lista. Reglas en DrMario.modelo, guardado en DrMario.datos.
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

async function abrirPanel() {
    $('#login').hidden = true; $('#app').hidden = false;
    icons();
    $('#list').innerHTML = '<p class="text-center text-slate-500 py-16">Cargando productos…</p>';
    try { productos = await Store.listar({ todos: true }); }
    catch (err) { toast('No se pudieron cargar los productos'); console.warn(err); }
    pintarLista();
}

/* ================= LISTA ================= */
$('#f-cat').innerHTML = ['<option value="">Todos los tipos</option>', ...CATEGORIAS.map((c) => `<option>${c.id}</option>`)].join('');
$('#q').addEventListener('input', pintarLista);
$('#f-cat').addEventListener('change', pintarLista);

function pintarLista() {
    const total = productos.length;
    const disp = productos.filter((p) => p.disponible !== 'agotado').length;
    $('#stats').innerHTML = [
        ['Productos', total, 'text-white'], ['Disponibles', disp, 'text-emerald-400'], ['Agotados', total - disp, 'text-brand-red'],
    ].map(([l, n, c]) => `<div class="bg-brand-card border border-slate-800 rounded-2xl p-4"><p class="text-2xl font-bold ${c}">${n}</p><p class="text-xs text-slate-400">${l}</p></div>`).join('');

    const q = norm($('#q').value), cat = $('#f-cat').value;
    const lista = productos.filter((p) => (!cat || p.categoria === cat)
        && (!q || norm([p.nombre, p.plataforma, p.franquicia, p.marca, p.empresa].join(' ')).includes(q)));

    $('#list-empty').hidden = lista.length > 0;
    $('#list').innerHTML = lista.map((p) => {
        const ap = M.apariencia(p);
        const thumb = p.imagen
            ? `<img src="${esc(p.imagen)}" alt="" class="w-full h-full object-cover" onerror="this.style.display='none'">`
            : `<i data-lucide="${ap.icono}" class="w-6 h-6" style="color:${ap.color}"></i>`;
        const seg = Object.entries({ si: 'Hay', pocas: 'Pocas', agotado: 'Agotado' }).map(([k, l]) =>
            `<button type="button" data-disp="${k}" class="s-${k} px-2.5 py-1.5 text-xs font-bold rounded-lg text-slate-400 hover:text-white" aria-pressed="${p.disponible === k}">${l}</button>`).join('');
        return `
        <div class="bg-brand-card border border-slate-800 rounded-2xl p-3 flex flex-wrap sm:flex-nowrap items-center gap-3 ${p.visible ? '' : 'opacity-60'}" data-id="${esc(p.id)}">
            <div class="w-14 h-14 rounded-xl bg-[#0f1626] overflow-hidden flex items-center justify-center shrink-0">${thumb}</div>
            <div class="flex-1 min-w-0">
                <p class="font-bold text-white truncate">${esc(p.nombre)} ${p.destacado ? '<span class="font-pixel text-[8px] bg-brand-yellow text-slate-900 px-1.5 py-1 rounded align-middle">TOP</span>' : ''} ${p.visible ? '' : '<span class="text-[10px] font-bold bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded align-middle">OCULTO</span>'}</p>
                <p class="text-xs text-slate-400 truncate"><span style="color:${ap.color}">${esc(ap.etiqueta)}</span> · ${esc(M.detalle(p))}</p>
                <p class="text-sm font-bold text-white mt-0.5">${fmt(p.precio)}</p>
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto justify-between">
                <div class="seg flex bg-[#0f1626] border border-slate-700 rounded-xl p-1" role="group" aria-label="Disponibilidad">${seg}</div>
                <div class="flex">
                    <button type="button" data-edit class="w-10 h-10 rounded-xl hover:bg-slate-800 flex items-center justify-center" aria-label="Editar ${esc(p.nombre)}"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                    <button type="button" data-del class="w-10 h-10 rounded-xl hover:bg-brand-red/20 text-slate-400 hover:text-brand-red flex items-center justify-center" aria-label="Borrar ${esc(p.nombre)}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');
    icons();
}

$('#list').addEventListener('click', async (e) => {
    const row = e.target.closest('[data-id]'); if (!row) return;
    const p = productos.find((x) => x.id === row.dataset.id); if (!p) return;

    const dispBtn = e.target.closest('[data-disp]');
    if (dispBtn) {                          // cambio rápido de disponibilidad
        const antes = p.disponible;
        if (antes === dispBtn.dataset.disp) return;
        p.disponible = dispBtn.dataset.disp; pintarLista();
        try { await Store.guardar(p); toast(`${p.nombre}: ${DISPONIBILIDAD[p.disponible]}`); }
        catch (err) { p.disponible = antes; pintarLista(); toast('No se guardó: ' + err.message); }
        return;
    }
    if (e.target.closest('[data-edit]')) return abrirEditor(p);
    if (e.target.closest('[data-del]')) {
        if (!confirm(`¿Borrar "${p.nombre}" del catálogo?\nSi solo se acabó, mejor márcalo como Agotado.`)) return;
        try { await Store.borrar(p.id); productos = productos.filter((x) => x.id !== p.id); pintarLista(); toast('Producto borrado'); }
        catch (err) { toast('No se pudo borrar: ' + err.message); }
    }
});

$('#demo-reset button').addEventListener('click', async () => {
    if (!confirm('¿Volver a los productos de ejemplo? Se borran los que agregaste en la demo.')) return;
    Store.reiniciarDemo(); productos = await Store.listar({ todos: true }); pintarLista(); toast('Demo reiniciada');
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
        cerrarEditor(); pintarLista();
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
