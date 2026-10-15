# Slot-AI – control de gastos personal (PWA tipo Monefy)

App web instalable (PWA), sin servidor: todos los datos se guardan **solo en tu móvil** (localStorage del navegador). Funciona sin conexión.

## Funciones (v1.2)
- Estilo Monefy: cabecera verde menta, iconos de línea alrededor de un donut con porcentajes, ingresos/gastos en el centro y botón «Saldo».
- Botones redondos **−** (gasto) y **+** (ingreso); toca un icono del donut para añadir un gasto directo en esa categoría.
- Pantalla de entrada con calculadora (+ − * / =), fecha, cuenta, nota; «OK» guarda, papelera elimina, ⇄ cambia gasto/ingreso.
- **Cuentas** (negocios/locales): crear, renombrar, icono, saldo inicial, eliminar (si no tienen movimientos). Vista «Todas las cuentas» o una cuenta concreta (embudo ▽ de la cabecera).
- **Transferencias** entre cuentas (⇄ en la cabecera o en el panel de cuentas ⋮); no cuentan como ingreso ni gasto.
- Periodos: día, semana, mes, año, todo, intervalo y «Elegir fecha» (embudo ▽). Desliza el gráfico para cambiar de periodo.
- Lista (toca «Saldo»): ingresos primero y luego gastos por importe, con contador; toca para expandir y toca un movimiento para editarlo o eliminarlo. Búsqueda 🔍 y orden por importe/nombre.
- 6 categorías de gasto fijas (Comida, Casa, Transporte, Ocio, Salud, Otros) renombrables con icono y color; categorías de ingreso editables.
- Ajustes (⋮ → Ajustes): moneda, primer día de la semana, tema oscuro, copia JSON, CSV para Excel.

## Publicar en GitHub Pages
No hay compilación: el sitio es la propia carpeta raíz. Sube el repositorio a GitHub → *Settings → Pages* → rama `main`, carpeta `/ (root)`. Quedará en `https://<usuario>.github.io/<repo>/`. (La carpeta `tests/` no hace falta en producción, pero no molesta.)

**Al publicar una versión nueva**, cambia `VERSION` en `sw.js` (y `APP_VERSION` en `js/app.js`). Los móviles mostrarán el aviso «Nueva versión disponible → Actualizar».

## Instalar en el móvil
- **Android (Chrome):** abre la URL → menú ⋮ → *Instalar aplicación* / *Añadir a pantalla de inicio*.
- **iPhone (Safari):** abre la URL → botón Compartir → *Añadir a pantalla de inicio*.

## Copias de seguridad
Los datos viven solo en el navegador del móvil: si borras los datos del navegador o desinstalas la app, se pierden.
- *Menú ☰ → Ajustes → Copia de seguridad (JSON) → Exportar*: descarga `slot-ai-copia-AAAA-MM-DD.json`. Guárdalo en Drive, correo, etc.
- *Restaurar copia → Importar*: elige el archivo JSON (sustituye todos los datos actuales).
- *Exportar a CSV*: archivo con `;` y BOM UTF-8, se abre directamente en Excel en español.

## Desarrollo y pruebas
```
python3 -m http.server 8000      # y abrir http://localhost:8000/
cd tests && npm install && npx playwright install chromium && node e2e.js   # necesita servidor en :8123 bajo /gastos/
```
Capa de datos en `js/store.js` (preparada para añadir sincronización con Google Drive en una versión futura).

## Migración de datos
- Desde la v1.1 (sin cuentas): se crea la cuenta «Efectivo» con el saldo inicial anterior y todos los movimientos pasan a ella.
- Desde la v1.0: se conservan cuentas y transferencias; los gastos de categorías que ya no existen pasan a «Otros».
- Las copias JSON antiguas también se migran al importarlas.
