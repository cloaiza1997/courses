# Tasks 001: Mapa de Calor de Estudio

## Fase 1: Tests de funciones puras

- [x] **T1.1**: Crear `tests/heatmap.test.js` con tests de `obtenerLunesDeLaSemana` (lunes para miércoles, domingo, y si ya es lunes). **RF-1**. Hecho cuando: `node --test tests/heatmap.test.js` pasa 3 tests.

- [x] **T1.2**: Añadir tests de `obtenerRangoMapa` (inicio = lunes actual - 21 días, fin = hoy). **RF-1, RF-8**. Hecho cuando: 2 tests pasan.

- [x] **T1.3**: Añadir tests de `agruparMinutosPorDia` (suma múltiples sesiones, ignora fuera de rango, ignora minutos negativos, ignora fechas inválidas). **RF-2, RF-8**. Hecho cuando: 4 tests pasan.

- [x] **T1.4**: Añadir tests de `obtenerColorDelDia` (0/15/45/75/120 min, futuro, hoy sin sesión). **RF-2, RF-3, RF-4, RF-5**. Hecho cuando: 7 tests pasan.

- [x] **T1.5**: Añadir tests de `construirCuadriculaMapa` (28 celdas, primera = lunes semana antigua, última = domingo semana actual, identifica hoy y futuros). **RF-1, RF-5**. Hecho cuando: 5 tests pasan.

- [x] **T1.6**: Añadir tests de `formatearFechaTooltip` ("15 de marzo", "1 de enero") y `formatearMinutosTooltip` ("45 min", "1 h 30 min", "Sin sesión"). **RF-6**. Hecho cuando: 5 tests pasan.

## Fase 2: Funciones puras en app.js

- [x] **T2.1**: Añadir constantes de colores al inicio de `app.js`. **RF-2, RF-3, RF-4, RF-5**. Hecho cuando: 5 constantes definidas con los valores de la spec.

- [x] **T2.2**: Implementar `obtenerLunesDeLaSemana(fecha)` en `app.js`. **RF-1**. Hecho cuando: T1.1 pasa.

- [x] **T2.3**: Implementar `obtenerRangoMapa(hoy)` en `app.js`. **RF-1, RF-8**. Hecho cuando: T1.2 pasa.

- [x] **T2.4**: Implementar `agruparMinutosPorDia(sesiones, inicio, fin)` en `app.js`. **RF-2, RF-8**. Hecho cuando: T1.3 pasa.

- [x] **T2.5**: Implementar `obtenerColorDelDia(minutos, esHoy, esFuturo)` en `app.js`. **RF-2, RF-3, RF-4, RF-5**. Hecho cuando: T1.4 pasa.

- [x] **T2.6**: Implementar `construirCuadriculaMapa(hoy, minutosPorDia)` en `app.js`. **RF-1, RF-5**. Hecho cuando: T1.5 pasa.

- [x] **T2.7**: Implementar `formatearFechaTooltip(fecha)` y `formatearMinutosTooltip(minutos)` en `app.js`. **RF-6**. Hecho cuando: T1.6 pasa.

## Fase 3: Interfaz

- [x] **T3.1**: Añadir contenedor del mapa de calor en `index.html` (sección con `id="mapa-calor"`, contenedor de celdas, leyenda). **RF-1**. Hecho cuando: el HTML tiene la estructura del mapa.

- [x] **T3.2**: Añadir estilos del mapa en `styles.css` (cuadrícula 7x4, celdas, leyenda, tooltip, borde hoy). **RF-1, RF-2, RF-3, RF-4, RF-5**. Hecho cuando: el mapa se ve correctamente en el navegador.

- [x] **T3.3**: Implementar `renderizarMapaCalor()` en `app.js` (llama a las funciones puras y pinta las celdas). **RF-1, RF-2, RF-3, RF-4, RF-5**. Hecho cuando: el mapa se renderiza con colores correctos.

- [x] **T3.4**: Añadir event listeners del tooltip en `app.js` (mouseenter/mouseleave con fecha y minutos). **RF-6**. Hecho cuando: al pasar el cursor aparece el tooltip con fecha y minutos.

- [x] **T3.5**: Llamar a `renderizarMapaCalor()` dentro de `renderizar()` para actualización dinámica. **RF-7**. Hecho cuando: al guardar una sesión, el mapa se actualiza sin recargar.

## Fase 4: Verificación

- [x] **T4.1**: Ejecutar `node --test tests/heatmap.test.js` y verificar que todos los tests pasan. **RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-8**. Hecho cuando: todos los tests están en verde.

- [x] **T4.2**: Verificar con Chrome DevTools: abrir `index.html`, registrar una sesión, comprobar que el mapa se actualiza sin recargar y no hay errores en consola. **RF-7**. Hecho cuando: verificado manualmente.

- [x] **T4.3**: Verificar responsive en móvil (375px) y escritorio. **RF-1**. Hecho cuando: el mapa se ve bien en ambos tamaños.

- [x] **T4.4**: Verificar accesibilidad (aria-label en celdas). **RF-6**. Hecho cuando: las celdas tienen aria-label con fecha y minutos.
