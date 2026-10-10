# Videojuegos Dr.Mario

Sitio web (landing page) de **Videojuegos Dr.Mario**, tienda de consolas retro y modernas en Niquinohomo, Masaya — Nicaragua. Página estática de un solo archivo con visores 3D interactivos de las consolas.

## Ver el sitio

Los modelos `.glb` se cargan con `fetch`, así que **abrir `index.html` con doble clic (`file://`) no funciona**: el navegador bloquea las peticiones por CORS y los visores 3D quedan vacíos.

Opción recomendada en Windows:

```
Iniciar Dr.Mario.bat
```

El script levanta `python -m http.server 8000`, espera 2 s y abre <http://127.0.0.1:8000>. Si no tenés Python instalado, hacelo manual:

```bash
python -m http.server 8000
```

Y abrí <http://127.0.0.1:8000/index.html>.

## Stack

Todo vía CDN, sin build step ni dependencias que instalar.

| Qué | Qué se usa |
| --- | --- |
| Estilos | [Tailwind CSS](https://cdn.tailwindcss.com) por CDN, con config de marca inline |
| 3D | [three.js](https://threejs.org) `0.160.0` vía `importmap` (jsDelivr) |
| Modelos | `GLTFLoader` + `RoomEnvironment` de `three/addons/` |
| Iconos | [Lucide](https://lucide.dev) |
| Fuentes | *Press Start 2P* (pixel) y *Space Grotesk*, desde Google Fonts |

Se necesita WebGL: si no está disponible, cada tarjeta muestra un aviso "3D no soportado en este navegador" (`index.html:1409`).

## Estructura

```
index.html                      # Todo el sitio: HTML + CSS + JS en un archivo
Iniciar Dr.Mario.bat            # Lanzador del servidor local en Windows
_maptest.html / _maptest2.html  # Pruebas del embed de Google Maps (no se usan en producción)
assets/
  icono.webp                    # Favicon y logo
  dr-mario.glb                  # Modelo del hero
  modelos-embebidos.js          # Fallback base64 para file:// (NO versionado, ver abajo)
  galeria/                      # 6 fotos de la tienda
  Models/                       # Modelos de consolas (~88 MB)
    NES.glb, super_nintendo.glb, gamecube.glb, PS1.glb, switch.glb
    opt/                         # Variantes optimizadas, sin referencias en el HTML
```

## Visores 3D

Cada tarjeta de consola tiene un `<canvas>` con su propio `WebGLRenderer` y escena independiente (`createViewer`, `index.html:952` en adelante).

- **Rotación automática** constante; al mover el puntero sobre el modelo, este sigue el cursor y vuelve a la rotación automática al soltarlo.
- **Carga diferida**: los visores se crean con `IntersectionObserver` cuando la tarjeta entra a 250 px del viewport. El modelo del hero se crea de inmediato.
- **Animación en pausa** cuando la tarjeta no está visible, cuando la pestaña está oculta (`document.hidden`) o cuando el usuario pidió movimiento reducido (`prefers-reduced-motion`).
- **Cola de carga** (`enqueueLoad`) para no saturar la red con varios `.glb` a la vez, con badge de progreso en porcentaje.
- **Respaldo procedural**: si falta WebGL o el `.glb` no carga, se dibuja una consola hecha con primitivas de three.js en vez de dejar el espacio vacío.

Para cambiar o agregar un modelo, editá el atributo `data-model` de la tarjeta:

```html
<article class="console-card" data-console="nes" data-accent="#FF2E63"
         data-model="assets/Models/NES.glb">
```

Los `data-accent` tiñen la primitiva de respaldo. La tarjeta de **Nintendo 64** no tiene `data-model` a propósito: usa solo el modelo procedural.

### Sobre `assets/modelos-embebidos.js`

Este archivo guarda los `.glb` como data URIs en base64 para que el sitio funcione abriendo el archivo con `file://`. Pesa **108 MB**, por encima del límite de 100 MB por archivo de GitHub, así que está en `.gitignore` y **no se sube al repo**. Servido por HTTP (GitHub Pages included) no hace falta: `index.html:1305` cae automáticamente a los `.glb` reales.

Si lo regenerás o lo movés de lugar, mantenelo fuera del control de versiones.

## Personalización rápida

- **Colores de marca**: `tailwind.config` en `index.html:49` (`dark`, `card`, `red`, `cyan`, `yellow`).
- **Textos de contacto** (dirección, teléfono, horarios) y el link de Google Maps están repetidos en la sección *Ubicación* (`index.html:714`) y en el *footer*.
- **SEO / Open Graph**: `index.html:5-33`. El canonical y `og:url` apuntan a `https://videojuegosdrmario.com/`; hay un TODO en `index.html:20` para reemplazarlos por URLs absolutas reales al publicar.

## Desplegar en GitHub Pages

1. Settings → Pages → Source: rama `main`, carpeta `/ (root)`.
2. El sitio queda en `https://<usuario>.github.io/Dr-Mario-Catarina/`.

Como el proyecto está en la raíz del repo no hay que cambiar rutas. Si algún día lo movés a un subdirectorio, las rutas de los `.glb` van a dejar de resolver.

## Contacto

- Teléfono / WhatsApp: +505 8380 7800
- [Videojuegos Dr.Mario en Google Maps](https://maps.app.goo.gl/RQ6SYKeLa8aRRdzx5)
- Lun – Sáb: 10:30 AM – 7:00 PM · Domingo: 10:00 AM – 8:00 PM
## Estructura por capas

El sitio tiene tres secciones separadas, cada una en su carpeta:

| Sección | URL | Archivos |
| --- | --- | --- |
| Landing (inicio) | `/` | `index.html` |
| Catálogo público | `/catalogo/` | `catalogo/index.html`, `catalogo/catalogo.js` |
| Inventario del Doc | `/admin/` | `admin/index.html`, `admin/admin.js` (no está enlazado en el menú) |

El catálogo y el inventario comparten las mismas capas de código, como en N-Capas:

| Capa | Archivo | Responsabilidad |
| --- | --- | --- |
| 1 · Configuración | `assets/js/capas/config.js` | `API_URL`, WhatsApp, PIN demo |
| Utilidades | `assets/js/capas/utilidades.js` | Texto, precios, ids |
| 2 · Modelo | `assets/js/capas/modelo.js` | Categorías, empresas, estilos de figura, validación |
| 3 · Datos | `assets/js/capas/datos.js` | Guardar y leer: demo (navegador) o Apps Script |
| 4 · Presentación | `catalogo/catalogo.js`, `admin/admin.js` | Solo pantallas: pintar, filtrar, formularios |
| Backend | `apps-script/Code.gs` | Hoja de Google Sheets + fotos en Drive |

Se cargan en ese orden (config → utilidades → modelo → datos → presentación). Una capa solo usa las de arriba.

- **Modo demo** (`API_URL` vacío): guarda en el navegador, PIN `1234`. Para enseñarlo.
- **Modo real**: sigue `apps-script/INSTRUCCIONES.md` y pega la URL en `config.js`. El PIN real vive solo en el script de Google, nunca en la página.
- Las **figuras** no se clasifican por consola: llevan estilo, serie o personaje, fabricante y si son originales o genéricas.
- `catalogo.html` y `admin.html` en la raíz solo redirigen a las carpetas nuevas.

## Logo

`assets/img/` tiene el logo en tamaños livianos (`logo-128/256/512.webp`), el favicon, el ícono para iPhone y la imagen para compartir (`og-image.jpg`). `assets/icono.webp` es el original (1345 px).

## Dashboard del inventario

Al entrar a `admin/` el Doc ve primero el **Dashboard** y luego la pestaña **Inventario**.

| Parte | Qué muestra |
| --- | --- |
| Tarjetas | Productos publicados, disponibles, agotados y **valor del inventario** (precio × unidades) |
| Clics en "Lo quiero" | Gráfica por día con filtro de 7, 30 o 90 días |
| Lo más pedido | Top de productos con más clics |
| Stock por tipo | Disponible, pocas unidades y agotado por tipo de producto |
| Reponer pronto | Agotados o con pocas unidades, ordenados por lo que más piden |
| Descargar reporte | CSV que abre en Excel con todo el inventario y los clics del periodo |

Archivos: `assets/js/capas/reportes.js` (cálculos, capa de modelo), `admin/dashboard.js` (gráficas, presentación). Las gráficas son SVG propio, sin librerías.
En modo demo los clics son de ejemplo; los que se hagan en el catálogo desde el mismo dispositivo también se suman.
