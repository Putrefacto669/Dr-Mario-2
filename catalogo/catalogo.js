/* ==========================================================
   CAPA 4 · PRESENTACIÓN — Catálogo público
   Solo pinta y filtra. Los datos vienen de DrMario.datos.
   ========================================================== */
const { config: CONFIG, datos: Store } = window.DrMario;
const { norm, esc, fmt } = window.DrMario.util;
const { CATEGORIAS, EMPRESAS, ESTILOS_FIGURA, DISPONIBILIDAD, apariencia, detalle, esRetro } = window.DrMario.modelo;
const $ = (s) => document.querySelector(s);

const FILTRO_MARCAS = ['Todas', 'Nintendo', 'PlayStation', 'Xbox', 'Sega', 'Retro', 'Otras'];
const FILTRO_ESTILOS = ['Todos', ...Object.keys(ESTILOS_FIGURA)];
const state = { q: '', categoria: 'Todo', sub: 'Todas', sort: 'destacados', soloDisp: false };
let productos = [];

/* ---------- Chips ---------- */
function pintarChips(el, items, valor) {
    el.innerHTML = items.map((it) => `
        <button type="button" class="chip shrink-0 px-3.5 py-1.5 rounded-full border border-slate-700 bg-brand-card text-sm font-semibold text-slate-300 hover:border-brand-cyan transition-colors"
            data-v="${esc(it)}" aria-pressed="${valor === it}">${esc(it)}</button>`).join('');
}
function pintarSub() {
    // Las figuras se filtran por estilo, lo demás por marca de consola
    const items = state.categoria === 'Figuras' ? FILTRO_ESTILOS : FILTRO_MARCAS;
    if (!items.includes(state.sub)) state.sub = items[0];
    pintarChips($('#sub-chips'), items, state.sub);
    $('#sub-chips').setAttribute('aria-label', state.categoria === 'Figuras' ? 'Filtrar figuras por estilo' : 'Filtrar por marca');
}

/* ---------- Filtros ---------- */
function pasaSub(p) {
    const s = state.sub;
    if (s === 'Todas' || s === 'Todos') return true;
    if (state.categoria === 'Figuras') return p.estilo === s;
    if (p.categoria === 'Figuras') return false;            // las figuras no tienen marca de consola
    if (s === 'Retro') return esRetro(p);
    if (s === 'Otras') return !EMPRESAS[p.empresa] || p.empresa === 'Otra';
    return p.empresa === s;
}

function waLink(p) {
    const quien = p.categoria === 'Figuras' ? `figura ${p.nombre}${p.franquicia ? ' (' + p.franquicia + ')' : ''}` : `${p.nombre}${p.plataforma ? ' (' + p.plataforma + ')' : ''}`;
    const msg = p.disponible === 'agotado'
        ? `Hola Dr. Mario, me interesa ${quien}. ¿Me avisan cuando vuelva a haber?`
        : `Hola Dr. Mario, me interesa ${quien} de ${fmt(p.precio)}. ¿Está disponible?`;
    return `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

function tarjeta(p) {
    const ap = apariencia(p);
    const agotado = p.disponible === 'agotado';
    const media = p.imagen
        ? `<img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy" class="absolute inset-0 w-full h-full object-cover" onerror="this.style.display='none'">`
        : `<div class="absolute inset-0 flex items-center justify-center" style="background:radial-gradient(circle at 50% 40%, ${ap.color}33, transparent 70%)">
               <i data-lucide="${ap.icono}" class="w-12 h-12" style="color:${ap.color}"></i></div>`;
    const punto = { si: 'bg-emerald-400', pocas: 'bg-amber-400', agotado: 'bg-brand-red' }[p.disponible];
    return `
    <article class="card relative bg-brand-card border border-slate-800 rounded-2xl overflow-hidden flex flex-col ${agotado ? 'opacity-70' : ''}">
        <div class="relative aspect-square bg-[#0f1626] overflow-hidden">
            ${media}
            <span class="absolute top-2 left-2 max-w-[75%] truncate text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-black/60 backdrop-blur" style="color:${ap.color}">${esc(ap.etiqueta)}</span>
            ${p.destacado ? '<span class="absolute top-2 right-2 font-pixel text-[8px] px-2 py-1.5 rounded-md bg-brand-yellow text-slate-900">TOP</span>' : ''}
        </div>
        <div class="p-3 sm:p-4 flex flex-col flex-1">
            <h3 class="text-sm sm:text-base font-bold text-white leading-snug">${esc(p.nombre)}</h3>
            <p class="text-xs text-slate-500 mt-1">${esc(detalle(p))}</p>
            <div class="mt-auto pt-3">
                <p class="text-lg sm:text-xl font-bold text-white">${fmt(p.precio)}</p>
                <p class="flex items-center gap-1.5 text-xs text-slate-400 mt-1"><span class="w-2 h-2 rounded-full ${punto}"></span>${DISPONIBILIDAD[p.disponible]}</p>
                <a href="${waLink(p)}" target="_blank" rel="noopener"
                    class="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors ${agotado ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'}">
                    <i data-lucide="${agotado ? 'bell' : 'message-circle'}" class="w-4 h-4"></i>${agotado ? 'Avisarme' : 'Lo quiero'}
                </a>
            </div>
        </div>
    </article>`;
}

function render() {
    const q = norm(state.q);
    let list = productos.filter((p) =>
        (state.categoria === 'Todo' || p.categoria === state.categoria)
        && pasaSub(p)
        && (!state.soloDisp || p.disponible !== 'agotado')
        && (!q || norm([p.nombre, p.plataforma, p.empresa, p.categoria, p.franquicia, p.marca, p.estilo].join(' ')).includes(q)));

    const agot = (p) => (p.disponible === 'agotado' ? 1 : 0);
    const sorters = {
        destacados: (a, b) => agot(a) - agot(b) || b.destacado - a.destacado,
        'precio-asc': (a, b) => a.precio - b.precio,
        'precio-desc': (a, b) => b.precio - a.precio,
        nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
    };
    list = list.slice().sort(sorters[state.sort]);

    $('#grid').innerHTML = list.map(tarjeta).join('');
    $('#empty').hidden = list.length > 0;
    $('#count').textContent = `${list.length} producto${list.length === 1 ? '' : 's'}`;
    $('#empty-wa').href = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(`Hola Dr. Mario, ¿tienen ${state.q || 'este producto'}?`)}`;
    if (window.lucide) lucide.createIcons();
}

async function init() {
    $('#year').textContent = new Date().getFullYear();
    $('#demo-banner').hidden = !Store.modoDemo;

    pintarChips($('#category-chips'), ['Todo', ...CATEGORIAS.map((c) => c.id)], state.categoria);
    pintarSub();
    $('#category-chips').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        state.categoria = b.dataset.v;
        pintarChips($('#category-chips'), ['Todo', ...CATEGORIAS.map((c) => c.id)], state.categoria);
        pintarSub(); render();
    });
    $('#sub-chips').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        state.sub = b.dataset.v; pintarSub(); render();
    });

    let t;
    $('#q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 150); });
    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
    $('#only-available').addEventListener('change', (e) => { state.soloDisp = e.target.checked; render(); });

    // Muestra la última lista guardada al instante y luego actualiza
    const cache = Store.cache();
    if (cache && !Store.modoDemo) { productos = cache.filter((p) => p.visible); render(); }
    else $('#grid').innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton rounded-2xl aspect-[3/4]"></div>').join('');

    try {
        productos = await Store.listar();
        $('#updated').textContent = `Precios actualizados al ${new Date().toLocaleDateString('es-NI', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
    } catch (err) {
        console.warn(err);
        if (!productos.length) $('#updated').textContent = 'No se pudo cargar el catálogo. Escríbenos por WhatsApp.';
    }
    render();
}

init();
