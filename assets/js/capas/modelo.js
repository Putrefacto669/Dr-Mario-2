/* ==========================================================
   CAPA 2 · MODELO (reglas del negocio)
   Qué es un producto, cómo se clasifica y qué datos son
   obligatorios. No sabe nada de pantallas ni de dónde se guarda.
   ========================================================== */
window.DrMario = window.DrMario || {};

(function (D) {
  const { norm, uid, bool } = D.util;

  const CATEGORIAS = [
    { id: 'Consolas', icono: 'gamepad-2', singular: 'Consola' },
    { id: 'Juegos', icono: 'disc-3', singular: 'Juego' },
    { id: 'Controles y accesorios', icono: 'cable', singular: 'Control o accesorio' },
    { id: 'Figuras', icono: 'sparkles', singular: 'Figura' },
    { id: 'Otros', icono: 'package', singular: 'Otro' },
  ];

  // Empresa → plataformas. "Otra" permite escribir la plataforma a mano.
  const EMPRESAS = {
    Nintendo: { color: '#FF2E63', plataformas: ['Nintendo Switch 2', 'Nintendo Switch', 'Wii U', 'Wii', 'GameCube', 'Nintendo 64', 'Super Nintendo', 'NES', 'Nintendo 3DS', 'Nintendo DS', 'Game Boy Advance', 'Game Boy'] },
    PlayStation: { color: '#3B82F6', plataformas: ['PlayStation 5', 'PlayStation 4', 'PlayStation 3', 'PlayStation 2', 'PlayStation 1', 'PS Vita', 'PSP'] },
    Xbox: { color: '#22C55E', plataformas: ['Xbox Series X|S', 'Xbox One', 'Xbox 360', 'Xbox clásico'] },
    Sega: { color: '#60A5FA', plataformas: ['Dreamcast', 'Saturn', 'Genesis / Mega Drive', 'Master System', 'Game Gear'] },
    Otra: { color: '#94A3B8', plataformas: [] },
  };

  const RETRO = new Set(['NES', 'Super Nintendo', 'Nintendo 64', 'GameCube', 'Game Boy', 'Game Boy Advance',
    'PlayStation 1', 'PlayStation 2', 'Xbox clásico', 'Dreamcast', 'Saturn', 'Genesis / Mega Drive', 'Master System', 'Game Gear']);

  // Figuras: NO pertenecen a una consola. Se clasifican por estilo y franquicia.
  const ESTILOS_FIGURA = {
    'Anime y manga': '#F472B6',
    'Videojuegos': '#FF2E63',
    'Películas y series': '#FFDE7D',
    'Cómics y superhéroes': '#F97316',
    'Otro estilo': '#A78BFA',
  };
  const SUGERENCIAS = {
    franquicias: ['One Piece', 'Dragon Ball', 'Naruto', 'Demon Slayer', 'Jujutsu Kaisen', 'My Hero Academia', 'Attack on Titan',
      'Pokémon', 'Super Mario', 'The Legend of Zelda', 'Sonic', 'Final Fantasy', 'Marvel', 'DC', 'Star Wars', 'Harry Potter'],
    fabricantes: ['Bandai', 'Banpresto', 'Good Smile Company', 'Funko', 'Hasbro', 'McFarlane', 'Hot Toys', 'Kotobukiya', 'SEGA Prize', 'Genérica'],
  };
  const AUTENTICIDAD = ['Original (licencia oficial)', 'Alternativa / genérica'];
  const ESTADOS = ['Nuevo', 'Usado'];
  const DISPONIBILIDAD = { si: 'Disponible', pocas: 'Últimas unidades', agotado: 'Agotado' };

  function dispNorm(v) {
    const t = norm(v);
    if (['no', 'agotado', '0'].includes(t)) return 'agotado';
    if (['pocas', 'pocos', 'ultimas', 'ultimos', 'poco'].includes(t)) return 'pocas';
    return 'si';
  }

  // Deja cada producto con la misma forma, venga de la demo o de la hoja
  function limpiar(p) {
    const categoria = CATEGORIAS.some((c) => c.id === p.categoria) ? p.categoria : 'Otros';
    const esFigura = categoria === 'Figuras';
    return {
      id: String(p.id || uid()),
      nombre: String(p.nombre || '').trim() || 'Producto sin nombre',
      categoria,
      empresa: esFigura ? '' : (EMPRESAS[p.empresa] ? p.empresa : (p.empresa ? 'Otra' : '')),
      plataforma: esFigura ? '' : String(p.plataforma || '').trim(),
      estilo: esFigura ? (ESTILOS_FIGURA[p.estilo] ? p.estilo : 'Otro estilo') : '',
      franquicia: esFigura ? String(p.franquicia || '').trim() : '',
      marca: esFigura ? String(p.marca || '').trim() : '',
      autenticidad: esFigura ? (AUTENTICIDAD.includes(p.autenticidad) ? p.autenticidad : '') : '',
      tamano: esFigura ? String(p.tamano || '').replace(/[^\d.]/g, '') : '',
      precio: Number(String(p.precio ?? '').replace(/[^\d.]/g, '')) || 0,
      estado: ESTADOS.includes(p.estado) ? p.estado : '',
      disponible: dispNorm(p.disponible),
      imagen: String(p.imagen || '').trim(),
      destacado: bool(p.destacado),
      visible: p.visible === undefined || p.visible === '' ? true : bool(p.visible),
    };
  }

  // Qué le falta a un producto antes de guardarlo (lista vacía = está completo)
  function validar(p) {
    const faltas = [];
    const esFigura = p.categoria === 'Figuras';
    if (!p.categoria) faltas.push('qué tipo de producto es');
    if (!String(p.nombre || '').trim()) faltas.push('el nombre');
    if (!esFigura && p.categoria && !p.empresa) faltas.push('la empresa');
    if (!esFigura && p.empresa && p.empresa !== 'Otra' && !p.plataforma) faltas.push('la consola');
    if (esFigura && !p.estilo) faltas.push('el estilo de la figura');
    if (esFigura && !String(p.franquicia || '').trim()) faltas.push('la serie o personaje');
    if (esFigura && !p.autenticidad) faltas.push('si la figura es original');
    if (!(Number(p.precio) > 0)) faltas.push('el precio');
    return faltas;
  }

  // ¿En qué filtro de marca cae? (Retro se calcula por plataforma)
  function esRetro(p) { return RETRO.has(p.plataforma); }

  // Color, ícono y etiqueta de cada tarjeta
  function apariencia(p) {
    const cat = CATEGORIAS.find((c) => c.id === p.categoria) || CATEGORIAS[4];
    if (p.categoria === 'Figuras') {
      return { color: ESTILOS_FIGURA[p.estilo] || '#A78BFA', icono: cat.icono, etiqueta: p.franquicia || p.estilo || 'Figura' };
    }
    const emp = EMPRESAS[p.empresa] || EMPRESAS.Otra;
    return { color: emp.color, icono: cat.icono, etiqueta: p.plataforma || p.empresa || p.categoria };
  }

  function detalle(p) {
    if (p.categoria === 'Figuras') {
      const orig = p.autenticidad ? (p.autenticidad.startsWith('Original') ? 'Original' : 'Genérica') : '';
      return ['Figura', p.marca, orig, p.tamano ? `${p.tamano} cm` : ''].filter(Boolean).join(' · ');
    }
    return [p.categoria, p.estado].filter(Boolean).join(' · ');
  }

  // Productos de ejemplo para el modo demo
  const DEMO = [
    { nombre: 'Nintendo Switch OLED', categoria: 'Consolas', empresa: 'Nintendo', plataforma: 'Nintendo Switch', precio: 12500, estado: 'Nuevo', disponible: 'si', destacado: true },
    { nombre: 'PS Vita 2000 + cargador', categoria: 'Consolas', empresa: 'PlayStation', plataforma: 'PS Vita', precio: 7100, estado: 'Usado', disponible: 'pocas', destacado: true },
    { nombre: 'PlayStation 2 Slim', categoria: 'Consolas', empresa: 'PlayStation', plataforma: 'PlayStation 2', precio: 3900, estado: 'Usado', disponible: 'si', destacado: true },
    { nombre: 'Nintendo 64 + control', categoria: 'Consolas', empresa: 'Nintendo', plataforma: 'Nintendo 64', precio: 5200, estado: 'Usado', disponible: 'pocas' },
    { nombre: 'Xbox 360 Slim 250GB', categoria: 'Consolas', empresa: 'Xbox', plataforma: 'Xbox 360', precio: 4200, estado: 'Usado', disponible: 'si' },
    { nombre: 'Sega Genesis + 2 controles', categoria: 'Consolas', empresa: 'Sega', plataforma: 'Genesis / Mega Drive', precio: 3600, estado: 'Usado', disponible: 'agotado' },
    { nombre: 'Mario Kart 8 Deluxe', categoria: 'Juegos', empresa: 'Nintendo', plataforma: 'Nintendo Switch', precio: 1950, estado: 'Nuevo', disponible: 'si', destacado: true },
    { nombre: 'God of War Ragnarök', categoria: 'Juegos', empresa: 'PlayStation', plataforma: 'PlayStation 5', precio: 1800, estado: 'Usado', disponible: 'si' },
    { nombre: 'Super Mario 64', categoria: 'Juegos', empresa: 'Nintendo', plataforma: 'Nintendo 64', precio: 1500, estado: 'Usado', disponible: 'si' },
    { nombre: 'Persona 4 Golden', categoria: 'Juegos', empresa: 'PlayStation', plataforma: 'PS Vita', precio: 900, estado: 'Usado', disponible: 'si' },
    { nombre: 'Control DualShock 4', categoria: 'Controles y accesorios', empresa: 'PlayStation', plataforma: 'PlayStation 4', precio: 1300, estado: 'Usado', disponible: 'si' },
    { nombre: 'Joy-Con (par)', categoria: 'Controles y accesorios', empresa: 'Nintendo', plataforma: 'Nintendo Switch', precio: 2100, estado: 'Nuevo', disponible: 'si' },
    { nombre: 'Cable HDMI 2 m', categoria: 'Controles y accesorios', empresa: 'Otra', plataforma: 'Universal', precio: 250, estado: 'Nuevo', disponible: 'si' },
    { nombre: 'Portgas D. Ace sentado', categoria: 'Figuras', estilo: 'Anime y manga', franquicia: 'One Piece', marca: 'Banpresto', autenticidad: 'Original (licencia oficial)', tamano: '16', precio: 1400, estado: 'Nuevo', disponible: 'si', destacado: true },
    { nombre: 'Monkey D. Luffy con tarro', categoria: 'Figuras', estilo: 'Anime y manga', franquicia: 'One Piece', marca: 'Genérica', autenticidad: 'Alternativa / genérica', tamano: '15', precio: 650, estado: 'Nuevo', disponible: 'pocas' },
    { nombre: 'Goku Super Saiyajin', categoria: 'Figuras', estilo: 'Anime y manga', franquicia: 'Dragon Ball', marca: 'Bandai', autenticidad: 'Original (licencia oficial)', tamano: '22', precio: 1900, estado: 'Nuevo', disponible: 'si' },
    { nombre: 'Funko Pop! Mario', categoria: 'Figuras', estilo: 'Videojuegos', franquicia: 'Super Mario', marca: 'Funko', autenticidad: 'Original (licencia oficial)', tamano: '10', precio: 850, estado: 'Nuevo', disponible: 'si' },
    { nombre: 'Spider-Man articulado', categoria: 'Figuras', estilo: 'Cómics y superhéroes', franquicia: 'Marvel', marca: 'Hasbro', autenticidad: 'Original (licencia oficial)', tamano: '15', precio: 1250, estado: 'Nuevo', disponible: 'agotado' },
  ];

  D.modelo = {
    CATEGORIAS, EMPRESAS, RETRO, ESTILOS_FIGURA, SUGERENCIAS, AUTENTICIDAD, ESTADOS, DISPONIBILIDAD, DEMO,
    limpiar, validar, esRetro, apariencia, detalle,
  };
})(window.DrMario);
