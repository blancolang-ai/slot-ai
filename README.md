# Slot-AI – control de gastos personal (PWA tipo Monefy)

App web instalable (PWA), sin servidor: todos los datos se guardan **solo en tu móvil** (localStorage del navegador). Funciona sin conexión.

## Funciones (v1)
- Pantalla principal con gráfico de donut por categorías, iconos alrededor, ingresos/gastos en el centro y saldo.
- Botones grandes **−** (gasto) y **+** (ingreso); toca un icono del donut para añadir un gasto directo en esa categoría.
- Teclado calculadora (+ − × ÷), fecha y nota.
- Periodos: día, semana, mes, año, todo e intervalo. Desliza el gráfico a izquierda/derecha para cambiar de periodo.
- Todo es efectivo: un único saldo (con «Saldo inicial» configurable en Ajustes).
- Lista de transacciones agrupada por categoría (tócala para expandir); toca una transacción para editarla o eliminarla.
- 6 categorías de gasto fijas (Comida, Casa, Transporte, Ocio, Salud, Otros), renombrables con su emoji y color; categorías de ingreso editables.
- Ajustes: símbolo de moneda, saldo inicial, primer día de la semana, tema oscuro, copia de seguridad JSON, exportar CSV para Excel.

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
Al abrir la v1.1 con datos de la v1.0 (o importar una copia antigua) se eliminan las cuentas y transferencias, el saldo inicial pasa a ser la suma de los saldos iniciales de las cuentas, y los gastos de categorías que ya no existen pasan a «Otros».
