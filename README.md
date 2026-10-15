# Slot-AI – control de gastos personal (PWA tipo Monefy)

App web instalable (PWA), sin servidor: todos los datos se guardan **solo en tu móvil** (localStorage del navegador). Funciona sin conexión.

## Funciones (v1)
- Pantalla principal con gráfico de donut por categorías, iconos alrededor, ingresos/gastos en el centro y saldo.
- Botones grandes **−** (gasto) y **+** (ingreso); toca un icono del donut para añadir un gasto directo en esa categoría.
- Teclado calculadora (+ − × ÷), cuenta, fecha y nota.
- Periodos: día, semana, mes, año, todo e intervalo. Desliza el gráfico a izquierda/derecha para cambiar de periodo.
- Varias cuentas con saldo inicial y transferencias (⇄).
- Lista de transacciones agrupada por categoría (tócala para expandir); toca una transacción para editarla o eliminarla.
- Categorías editables (nombre, emoji, color).
- Ajustes: símbolo de moneda, primer día de la semana, tema oscuro, copia de seguridad JSON, exportar CSV para Excel.

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
