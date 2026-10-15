# Análisis de Monefy (referencia para la PWA)

Fuentes: monefy.com (guía "Learn how to budget", Help Center), ficha de Google Play (com.monefy.app.lite), App Store (id1212024409), reseñas de usuarios, y el conocimiento general de la UI de la app.

## Pantalla principal
- **Gráfico de donut** con los gastos del periodo por categoría. Alrededor del anillo se colocan los **iconos circulares de las categorías** (coloreados), en orden fijo; al tocar un icono se abre la entrada de gasto directamente con esa categoría.
- En el **centro del donut**: ingresos (verde) y gastos (rojo) del periodo.
- Debajo: barra de **Saldo** (balance), al tocarla se abre la lista de transacciones.
- Dos botones grandes: **"−" rojo (GASTO)** y **"+" verde (INGRESO)**.
- Barra superior: menú lateral (cuentas, categorías, moneda, ajustes), selector de **cuenta** ("Todas las cuentas"), búsqueda, botón de transferencia.
- **Periodo**: Día / Semana / Mes / Año / Todo / Intervalo (elegir fecha) desde el menú. Se **desliza horizontalmente** (swipe) para ir al periodo anterior/siguiente; la etiqueta del periodo aparece arriba.

## Flujo de entrada de transacción
1. Pulsar − o +. Se abre pantalla con **teclado-calculadora** (0-9, coma, + − × ÷, =, borrar), cuenta seleccionada arriba, fecha (hoy por defecto, cambiable) y campo **nota**.
2. Botón "Elegir categoría" → cuadrícula de iconos de categorías (de gasto o ingreso).
3. Se guarda al tocar la categoría. Solo el importe es obligatorio ("one click").

## Categorías por defecto
Gasto (aprox. en la app en español): Facturas, Coche, Ropa, Comunicaciones, Comer fuera, Bebidas, Regalos, Comida, Amigos, Salud, Casa, Mascotas, Deportes, Taxi, Aseo, Transporte, Ocio (entretenimiento). Cada una con icono y color propio.
Ingreso: Salario, Ahorros, Depósitos.
Las categorías son editables: renombrar, cambiar icono, crear, eliminar/ocultar.

## Cuentas
- Varias cuentas (Efectivo, Tarjeta de pago por defecto) con saldo inicial y moneda.
- **Transferencias** entre cuentas (no cuentan como gasto/ingreso).
- Filtro "Todas las cuentas" o una concreta.

## Lista de transacciones
- Agrupada **por categoría** con total y porcentaje; se **expande** para ver cada transacción (fecha, nota, importe). También vista por fecha.
- Tocar una transacción → editar (importe, categoría, cuenta, fecha, nota) o **eliminar**.

## Ajustes
Moneda principal (multimoneda con tipos de cambio), primer día de la semana, primer día del mes, **tema oscuro**, idioma, **código de acceso** (passcode/huella), modo presupuesto, sincronización Google Drive/Dropbox, copias de seguridad, **exportar CSV** (columnas: fecha, cuenta, categoría, importe, moneda, importe convertido, moneda, descripción) e importación.

## Premium / otros
- **Modo presupuesto**: límite mensual; el donut muestra gasto vs. presupuesto restante.
- **Transacciones recurrentes** (diario/semanal/mensual/anual).
- Widgets, multimoneda, sincronización.
