# Activar el modo administrador real

Mientras `API_URL` esté vacío en `assets/js/capas/config.js`, el catálogo y el
admin funcionan en **modo demo**: los productos se guardan solo en el navegador
donde se agregan (PIN demo `1234`). Sirve para enseñarlo.

Para que el Doc agregue productos desde su cel y todos los clientes los vean,
se conecta a una hoja de Google Sheets. Es gratis y se hace una sola vez
(unos 15 minutos). Hazlo **con la cuenta de Gmail del Doc**, así todo queda a su nombre.

## 1. Crear la hoja y el script

1. Entra a [sheets.new](https://sheets.new) con el Gmail del Doc y nómbrala "Catálogo Dr.Mario".
2. Menú **Extensiones → Apps Script**.
3. Borra lo que trae el editor, pega todo el contenido de `Code.gs` y guarda (ícono de disquete).

## 2. Poner el PIN del Doc

1. En Apps Script, ve a **Configuración del proyecto** (ícono de engranaje).
2. Abajo, en **Propiedades del script**, agrega:
   - Propiedad: `ADMIN_KEY`
   - Valor: el PIN del Doc. Usa **al menos 8 caracteres** (ej. `Mario2026nica`), no `1234`.
3. Guarda.

El PIN solo vive ahí, nunca en la página. Si alguien falla 8 veces, el admin se bloquea 15 minutos.

## 3. Dar permisos

1. Vuelve al editor, elige la función `configurar` arriba y dale **Ejecutar**.
2. Google pedirá permisos para la hoja y para Drive (para las fotos). Acepta.
   Si sale "Google no verificó esta app": **Configuración avanzada → Ir a … (no seguro)**. Es normal porque el script es del mismo Doc.
3. Se crea la pestaña **Productos** y la carpeta **Catálogo Dr.Mario - Fotos** en su Drive.

## 4. Publicar como aplicación web

1. **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier usuario**.
4. **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).

## 5. Conectar la página

1. Abre `assets/js/capas/config.js` y pega la URL:
   ```js
   API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```
2. Haz commit y push.

Listo: la franja amarilla de demo desaparece, el catálogo lee de la hoja y el Doc
entra a `.../admin/` con su PIN.

## Cosas a saber

- **Cambios en el script:** si editas `Code.gs`, ve a **Implementar → Administrar implementaciones → editar → Versión: nueva**. Si no, sigue corriendo la versión vieja.
- **La hoja también se puede editar a mano** (por ejemplo, para cargar muchos productos de una vez). Respeta los nombres de las columnas de la fila 1. Valores de `disponible`: `si`, `pocas` o `agotado`.
- **Fotos:** se achican en el cel antes de subir (máx. 1000 px), así que suben rápido aunque sean de cámara.
- **Cargar productos iniciales:** puedes importar `productos-ejemplo.csv` en la pestaña Productos (Archivo → Importar → Reemplazar hoja actual), cambiarlos por los reales y borrar los que no sirvan.
- **Velocidad:** la primera carga del día puede tardar 1 o 2 segundos (Google "despierta" el script). Después el catálogo guarda la última lista en el cel y se ve al instante.
