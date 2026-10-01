# Spec 001: Mapa de Calor de Estudio

## Contexto y objetivo

El Diario de Estudio ya muestra la racha actual, el récord, los minutos semanales y los días del mes. Sin embargo, el usuario no tiene una visión visual de su constancia a lo largo del tiempo.

El objetivo es añadir un mapa de calor tipo GitHub que muestre los días estudiados de las últimas 4 semanas (semana actual + 3 semanas anteriores), donde la intensidad del color refleja cuántos minutos se estudió cada día. Esto permite ver patrones de un vistazo: qué días de la semana suelen ser más productivos, si hay huecos recurrentes, etc.

## Usuarios

- **Usuario principal**: alguien que empieza a programar, registra sus sesiones de estudio y quiere motivarse viendo su progreso.
- **Necesidad**: ver de un vistazo su constancia en las últimas semanas sin tener que revisar la lista de sesiones.

## Historias de usuario

1. Como usuario, quiero ver un mapa de calor de las últimas 4 semanas para identificar rápidamente qué días estudié y cuánto.
2. Como usuario, quiero que la intensidad del color refleje los minutos estudiados para ver mis días más productivos.
3. Como usuario, quiero distinguir entre días sin sesión, días futuros y el día de hoy para entender el estado actual.

## Requisitos funcionales

### RF-1: Visualización del mapa de calor
**EARS**: El sistema DEBE mostrar un mapa de calor con las últimas 4 semanas (semana actual + 3 semanas anteriores) organizadas en una cuadrícula de 7 columnas (días de la semana, de lunes a domingo) y 4 filas (semanas).

**Criterios de aceptación**:
- La cuadrícula muestra exactamente 28 celdas (7 columnas × 4 filas).
- Cada celda representa un día.
- Las columnas están etiquetadas con los días de la semana (L, M, X, J, V, S, D).
- La primera fila corresponde a la semana actual; las filas 2-4 a las semanas anteriores en orden cronológico inverso.
- Si hoy es miércoles, la primera fila muestra lunes, martes y miércoles como días pasados; jueves a domingo como días futuros.

### RF-2: Color por intensidad de minutos
**EARS**: El sistema DEBE colorear cada celda según los minutos estudiados ese día, usando umbrales fijos:
- 0 min: `#E8DFD3` (gris arena, sin sesión)
- 1-30 min: `#C6D9C6` (verde muy suave)
- 31-60 min: `#8BA888` (verde suave)
- 61-90 min: `#5C8A5C` (verde medio)
- 91+ min: `#2D5A2D` (verde intenso)

**Criterios de aceptación**:
- Un día con 0 minutos tiene color `#E8DFD3`.
- Un día con 15 minutos tiene color `#C6D9C6`.
- Un día con 45 minutos tiene color `#8BA888`.
- Un día con 75 minutos tiene color `#5C8A5C`.
- Un día con 120 minutos tiene color `#2D5A2D`.

### RF-3: Días sin sesión
**EARS**: El sistema DEBE mostrar los días sin sesión en `#E8DFD3` (gris arena), diferenciándolos de los días estudiados.

**Criterios de aceptación**:
- Un día sin ninguna sesión tiene color `#E8DFD3`.
- Un día con al menos 1 sesión tiene un color diferente al gris arena.

### RF-4: Días futuros
**EARS**: El sistema DEBE mostrar los días futuros de la semana en curso en `#F5F0EA` (gris muy claro), diferenciándolos visualmente de los días pasados sin sesión (`#E8DFD3`).

**Criterios de aceptación**:
- Los días posteriores a hoy tienen color `#F5F0EA`, más claro que `#E8DFD3`.
- Los días futuros no muestran minutos en el tooltip.
- Los días futuros no responden a eventos de clic.

### RF-5: Día de hoy sin sesión
**EARS**: El sistema DEBE destacar el día de hoy si todavía no tiene sesión, añadiendo un borde de 2px sólido color `#C4704A` (terracota) sobre el fondo `#E8DFD3`.

**Criterios de aceptación**:
- Si hoy no tiene sesión, la celda de hoy tiene un borde terracota de 2px.
- Si hoy tiene sesión, la celda de hoy se colorea según los minutos (igual que cualquier otro día) y no tiene borde especial.

### RF-6: Tooltip con información del día
**EARS**: El sistema DEBE mostrar un tooltip al pasar el cursor sobre una celda con la fecha en formato "15 de marzo" y los minutos en formato "45 min" o "1 h 30 min".

**Criterios de aceptación**:
- Al pasar el cursor sobre una celda, aparece un tooltip con la fecha (ej: "15 de marzo") y los minutos (ej: "45 min" o "Sin sesión").
- El tooltip desaparece al salir del cursor.
- El tooltip se implementa con event listeners (mouseenter/mouseleave), permitido por la constitución.

### RF-7: Actualización dinámica
**EARS**: El sistema DEBE actualizar el mapa de calor automáticamente cuando se añade una nueva sesión, sin necesidad de recargar la página.

**Criterios de aceptación**:
- Al guardar una nueva sesión, el mapa se actualiza inmediatamente.
- La actualización no requiere recargar la página.

### RF-8: Sesiones fuera de rango
**EARS**: El sistema DEBE ignorar las sesiones cuya fecha esté fuera del rango de las últimas 4 semanas.

**Criterios de aceptación**:
- Las sesiones con fecha anterior al inicio de la semana más antigua mostrada no aparecen en el mapa.
- Las sesiones con fecha futura no aparecen en el mapa.

## Requisitos no funcionales

- **Rendimiento**: el mapa de calor debe renderizarse instantáneamente (menos de 100 ms).
- **Responsive**: el mapa debe verse bien en móvil (375 px) y escritorio.
- **Accesibilidad**: las celdas deben tener texto alternativo (aria-label) con la fecha y los minutos.
- **Idioma**: todos los textos en español.

## Casos límite

- **Sin sesiones en las últimas 4 semanas**: el mapa muestra todas las celdas en `#E8DFD3` (excepto hoy y futuros).
- **Sesiones con fecha futura**: no se muestran en el mapa (fuera del rango).
- **Sesiones con fecha fuera del rango**: se ignoran y no aparecen en el mapa.
- **Múltiples sesiones el mismo día**: se suman los minutos de todas las sesiones del día.
- **Cambio de hora (verano/invierno)**: el mapa debe mostrar los días correctos sin desplazamientos.
- **Semana incompleta**: si hoy es miércoles, solo se muestran lunes, martes y miércoles de esta semana; jueves a domingo son días futuros.
- **Sesiones con minutos = 0**: cuentan como "estudiado" con 0 minutos (color `#E8DFD3`).
- **Sesiones con minutos negativos**: se ignoran y no se muestran en el mapa.
- **Sesiones con minutos muy grandes** (ej: 10000): no hay límite; se muestran con el color más intenso.
- **Sesiones con fecha inválida** (ej: "2026-02-30"): se ignoran y no se muestran en el mapa.
- **Sesiones con formato de fecha incorrecto** (ej: "2026/03/15"): se ignoran y no se muestran en el mapa.
- **Hoy con sesión**: el tooltip muestra la misma información que cualquier otro día.

## Fuera de alcance

- Mapa de calor de más de 4 semanas.
- Personalización de umbrales de color.
- Exportar el mapa como imagen.
- Estadísticas adicionales (promedio, tendencias, etc.).
- Modo oscuro.

## Criterios de finalización

- [ ] El mapa de calor muestra las últimas 4 semanas en una cuadrícula 7x4.
- [ ] Los colores reflejan los minutos según los umbrales definidos.
- [ ] Los días sin sesión, futuros y hoy se distinguen visualmente.
- [ ] El tooltip muestra fecha y minutos al pasar el cursor.
- [ ] El mapa se renderiza correctamente en móvil y escritorio.
- [ ] No hay errores en la consola.
- [ ] Los textos están en español.
- [ ] El mapa se actualiza dinámicamente al añadir una sesión.

## Decisiones tomadas

- **Colores**: escala de verdes (estilo GitHub). 0 min: `#E8DFD3`, 1-30: `#C6D9C6`, 31-60: `#8BA888`, 61-90: `#5C8A5C`, 91+: `#2D5A2D`.
- **Días futuros**: `#F5F0EA` (gris muy claro, diferente al gris arena de días sin sesión).
- **Hoy sin sesión**: borde terracota `#C4704A` de 2px sobre fondo `#E8DFD3`.
- **Leyenda**: sí, una leyenda pequeña bajo el mapa con los 5 niveles de color.
- **Clickeables**: no, las celdas son informativas. El tooltip ya muestra la información necesaria.
- **Formato fecha tooltip**: "15 de marzo" (día + mes en texto).
- **Formato minutos tooltip**: "X min" o "X h Y min" (coherente con el resto de la app).
- **Actualización**: dinámica, sin recargar la página.
- **Rango**: semana actual + 3 semanas anteriores. Sesiones fuera de rango se ignoran.
- **Constitución**: el tooltip usa event listeners (permitido por constitución #3). El cálculo de la cuadrícula es una función pura (constitución #3). El mapa es lo suficientemente simple para vanilla JS (constitución #1).
