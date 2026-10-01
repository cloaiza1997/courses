# Plan 001: Mapa de Calor de Estudio

## Archivos a crear o modificar

| Archivo | Responsabilidad | RF |
|---------|-----------------|-----|
| `src/index.html` | Añadir contenedor del mapa de calor + leyenda | RF-1 |
| `src/styles.css` | Estilos del mapa, celdas, leyenda, tooltip, borde hoy | RF-1, RF-2, RF-3, RF-4, RF-5 |
| `src/app.js` | Añadir funciones puras de lógica + renderizado del mapa + event listeners tooltip | RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8 |
| `tests/heatmap.test.js` | Tests de las funciones puras con `node --test` | Todos |

## Funciones puras de lógica (con "hoy" como parámetro)

Todas las funciones reciben `hoy` como parámetro para ser testables sin depender de la fecha real.

### 1. `obtenerLunesDeLaSemana(fecha)` → Date
Devuelve el lunes de la semana de la fecha dada.
- **RF-1**: necesaria para calcular el rango de semanas.

### 2. `obtenerRangoMapa(hoy)` → { inicio: Date, fin: Date }
Devuelve el rango de fechas del mapa: desde el lunes de la semana más antigua hasta hoy.
- **RF-1**: define el rango de 4 semanas.
- **RF-8**: permite filtrar sesiones fuera de rango.

### 3. `agruparMinutosPorDia(sesiones, inicio, fin)` → Map<string, number>
Agrupa las sesiones por fecha y suma los minutos. Ignora sesiones fuera de rango, con minutos negativos o fechas inválidas.
- **RF-2**: calcula los minutos por día.
- **RF-8**: filtra sesiones fuera de rango.
- **Casos límite**: minutos negativos, fechas inválidas, fuera de rango.

### 4. `obtenerColorDelDia(minutos, esHoy, esFuturo)` → string
Devuelve el color de la celda según los minutos y el estado del día.
- **RF-2**: umbrales de color.
- **RF-3**: color para días sin sesión.
- **RF-4**: color para días futuros.
- **RF-5**: borde para hoy sin sesión.

### 5. `construirCuadriculaMapa(hoy, minutosPorDia)` → Array<{ fecha: Date, minutos: number, esHoy: boolean, esFuturo: boolean }>
Construye la cuadrícula 7x4 con los datos de cada celda.
- **RF-1**: estructura de la cuadrícula.
- **RF-5**: identifica el día de hoy.

### 6. `formatearFechaTooltip(fecha)` → string
Formatea la fecha como "15 de marzo".
- **RF-6**: formato del tooltip.

### 7. `formatearMinutosTooltip(minutos)` → string
Formatea los minutos como "45 min" o "1 h 30 min".
- **RF-6**: formato del tooltip.

## Algoritmo del mapa en pseudocódigo

```
function renderizarMapaCalor(sesiones, hoy):
    # 1. Calcular rango del mapa
    fin = hoy
    inicio = obtenerLunesDeLaSemana(hoy) - 21 días  # 3 semanas atrás + semana actual = 4 semanas
    
    # 2. Agrupar minutos por día (filtrando fuera de rango)
    minutosPorDia = agruparMinutosPorDia(sesiones, inicio, fin)
    
    # 3. Construir cuadrícula 7x4
    cuadricula = []
    cursor = inicio
    para fila en 0..3:
        para columna en 0..6:
            fecha = cursor
            minutos = minutosPorDia.get(fecha) ?? 0
            esHoy = fecha === hoy
            esFuturo = fecha > hoy
            cuadricula.push({ fecha, minutos, esHoy, esFuturo })
            cursor = cursor + 1 día
    
    # 4. Renderizar en el DOM
    para cada celda en cuadricula:
        color = obtenerColorDelDia(celda.minutos, celda.esHoy, celda.esFuturo)
        pintarCelda(celda.fecha, color, celda.minutos, celda.esHoy, celda.esFuturo)
```

## Cómo se pinta en la interfaz

### Estructura HTML
```html
<section class="mapa-calor">
  <h2>Últimas 4 semanas</h2>
  <div class="mapa">
    <div class="mapa-columna">L</div>
    <div class="mapa-columna">M</div>
    ...
    <div class="mapa-celda" data-fecha="2026-09-01"></div>
    ...
  </div>
  <div class="leyenda">
    <span>Menos</span>
    <div class="leyenda-celda" style="background: #E8DFD3"></div>
    <div class="leyenda-celda" style="background: #C6D9C6"></div>
    <div class="leyenda-celda" style="background: #8BA888"></div>
    <div class="leyenda-celda" style="background: #5C8A5C"></div>
    <div class="leyenda-celda" style="background: #2D5A2D"></div>
    <span>Más</span>
  </div>
</section>
```

### Renderizado (en `renderizar()`)
1. Llamar a `construirCuadriculaMapa(hoy, minutosPorDia)`.
2. Para cada celda, crear un `div` con:
   - `background-color` según `obtenerColorDelDia()`.
   - `border: 2px solid #C4704A` si es hoy sin sesión.
   - `aria-label` con fecha y minutos.
   - Event listeners `mouseenter`/`mouseleave` para el tooltip.

### Tooltip
- Se crea un `div` flotante con posición absoluta.
- Se muestra al `mouseenter` y se oculta al `mouseleave`.
- Contiene fecha y minutos formateados.

## Decisiones técnicas justificadas

### 1. Funciones puras con "hoy" como parámetro
- **Decisión**: todas las funciones de lógica reciben `hoy` como parámetro.
- **Alternativa descartada**: usar `new Date()` directamente en las funciones.
- **Por qué**: permite tests deterministas sin depender de la fecha real. Requerido por constitución #3.

### 2. Cálculo de semanas con `setDate()` en lugar de milisegundos
- **Decisión**: usar `setDate(getDate() - 21)` para retroceder 3 semanas.
- **Alternativa descartada**: usar `setTime(getTime() - 21 * 24 * 60 * 60 * 1000)`.
- **Por qué**: los cambios de hora (verano/invierno) hacen que 24h no siempre sea un día. La skill `local-dates` lo prohíbe explícitamente.

### 3. Tooltip con event listeners en lugar de CSS `:hover`
- **Decisión**: usar `mouseenter`/`mouseleave` en JavaScript.
- **Alternativa descartada**: usar `:hover` de CSS con un `::after` para el tooltip.
- **Por qué**: el tooltip necesita contenido dinámico (fecha y minutos), que CSS no puede generar. Los event listeners están permitidos por constitución #3.

### 4. Cuadrícula construida con JavaScript en lugar de HTML estático
- **Decisión**: generar las 28 celdas dinámicamente en `renderizar()`.
- **Alternativa descartada**: escribir las 28 celdas en el HTML.
- **Por qué**: las celdas cambian cada día. HTML estático requeriría actualizar el archivo manualmente. La constitución #3 permite DOM en `renderizar()`.

### 5. Colores como constantes en el código
- **Decisión**: definir los colores como constantes al inicio de `app.js`.
- **Alternativa descartada**: usar variables de CSS (`var(--color-1)`, etc.).
- **Por qué**: las funciones puras necesitan los colores para tests. Si estuvieran en CSS, no podrían verificarse con `node --test`.

### 6. Tests con `node --test` en lugar de tests en el navegador
- **Decisión**: crear `tests/heatmap.test.js` con `node:test` y `node:assert`.
- **Alternativa descartada**: tests con Chrome DevTools o frameworks como Jest.
- **Por qué**: constitución #4 prohíbe frameworks de test. `node --test` es nativo de Node.js, sin dependencias.

## Estrategia de tests con `node --test`

### Archivo: `tests/heatmap.test.js`

Tests de las funciones puras (no del DOM):

1. **`obtenerLunesDeLaSemana`**
   - Devuelve lunes para un miércoles.
   - Devuelve lunes para un domingo.
   - Devuelve la misma fecha si ya es lunes.

2. **`obtenerRangoMapa`**
   - Devuelve inicio = lunes de la semana actual - 21 días.
   - Devuelve fin = hoy.

3. **`agruparMinutosPorDia`**
   - Suma minutos de múltiples sesiones el mismo día.
   - Ignora sesiones fuera de rango.
   - Ignora sesiones con minutos negativos.
   - Ignora sesiones con fecha inválida.

4. **`obtenerColorDelDia`**
   - Devuelve `#E8DFD3` para 0 minutos.
   - Devuelve `#C6D9C6` para 15 minutos.
   - Devuelve `#8BA888` para 45 minutos.
   - Devuelve `#5C8A5C` para 75 minutos.
   - Devuelve `#2D5A2D` para 120 minutos.
   - Devuelve `#F5F0EA` para días futuros.
   - Devuelve borde terracota para hoy sin sesión.

5. **`construirCuadriculaMapa`**
   - Devuelve exactamente 28 celdas.
   - La primera celda es el lunes de la semana más antigua.
   - La última celda es el domingo de la semana actual.
   - Identifica correctamente el día de hoy.
   - Identifica correctamente los días futuros.

6. **`formatearFechaTooltip`**
   - Devuelve "15 de marzo" para el 15 de marzo.
   - Devuelve "1 de enero" para el 1 de enero.

7. **`formatearMinutosTooltip`**
   - Devuelve "45 min" para 45 minutos.
   - Devuelve "1 h 30 min" para 90 minutos.
   - Devuelve "Sin sesión" para 0 minutos.

### Ejecución
```bash
node --test tests/heatmap.test.js
```

### Cobertura de RF por tests

| RF | Tests |
|----|-------|
| RF-1 | `obtenerLunesDeLaSemana`, `obtenerRangoMapa`, `construirCuadriculaMapa` |
| RF-2 | `obtenerColorDelDia` (umbrales) |
| RF-3 | `obtenerColorDelDia` (0 min) |
| RF-4 | `obtenerColorDelDia` (futuros) |
| RF-5 | `obtenerColorDelDia` (hoy sin sesión) |
| RF-6 | `formatearFechaTooltip`, `formatearMinutosTooltip` |
| RF-7 | Verificación manual con Chrome DevTools |
| RF-8 | `agruparMinutosPorDia` (fuera de rango) |

## Verificación con Chrome DevTests (RF-7)

Los tests de `node --test` cubren la lógica, pero RF-7 (actualización dinámica) requiere verificación manual:

1. Abrir `index.html` en Chrome.
2. Registrar una nueva sesión.
3. Verificar que el mapa se actualiza sin recargar.
4. Verificar que no hay errores en la consola.
