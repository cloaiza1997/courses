# Diario de Estudio

Web estática para registrar sesiones de estudio y motivarse viendo la racha de días seguidos. Proyecto didáctico: código simple, entendible para alguien que empieza a programar.

## Funcionalidades

- Registrar sesiones de estudio (fecha, tema, minutos).
- Racha actual de días consecutivos con sesión.
- Mejor racha (récord).
- Total de minutos de la semana actual (lunes a hoy).
- Días estudiados en el mes actual.
- Mapa de calor de las últimas 4 semanas (tipo GitHub) con tooltip por día.
- Lista de sesiones registradas.
- Diseño limpio y responsive.

## Cómo usarlo

No requiere instalación ni build. Abre `src/index.html` con doble clic en tu navegador (funciona con `file://`).

Los datos se guardan en el navegador (`localStorage`, clave `diario-estudio-sesiones`), por lo que no se pierden al cerrar la página, pero tampoco se comparten entre navegadores o dispositivos.

Para empezar de cero: DevTools → Application → Local Storage → borrar la clave `diario-estudio-sesiones`.

## Estructura

```
src/
  index.html   Estructura de la página
  styles.css   Estilos
  app.js       Lógica y datos
tests/         Tests con node:test
specs/         Specs por funcionalidad (p. ej. specs/001-heat-map/)
docs/          Constitución del proyecto
AGENTS.md      Guía de trabajo y convenciones
MEMORY.md      Estado del proyecto entre sesiones
```

## Tests

```bash
node --test
```

## Convenciones

- HTML, CSS y JavaScript puros: sin frameworks, librerías, npm ni bundler. Nunca añadir dependencias ni un paso de build.
- Textos de la interfaz en español.
- Fechas siempre en hora local; nunca usar `toISOString()` ni `new Date("AAAA-MM-DD")` para lógica de días (se interpretan como UTC).
- Detalle de las decisiones en `MEMORY.md` y `docs/constitution.md`.
