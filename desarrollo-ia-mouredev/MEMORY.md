# MEMORY.md — Diario de Estudio
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.
## Estado actual
- v1.4 funcionando: registrar sesiones (fecha, tema, minutos), racha actual, mejor racha, total semanal, días del mes, mapa de calor y lista de sesiones.
- Datos en localStorage.
- Rediseño visual completo: paleta cálida (crema/terracota/verde salvia), tipografía Fraunces + Inter, hero con número protagonista.
- Constitución creada en `docs/constitution.md` con 6 principios innegociables.
- Spec 001 (mapa de calor) implementada y verificada.
- README.md creado en la raíz (cómo usar, estructura, tests, convenciones).
## Decisiones (y por qué)
- Sin backend ni dependencias: cualquiera debe poder abrirlo con doble clic.
- Fecha editable en el formulario: permite registrar días pasados y ver la racha crecer.
- Mejor racha = tramo más largo de días consecutivos con sesión, excluyendo futuras. Se muestra bajo la racha actual y se actualiza automáticamente si la racha actual la supera.
- Semana empieza en lunes. Total semanal = suma de minutos desde el lunes hasta hoy. Formato: "X h Y min".
- Días del mes = fechas únicas con sesión en el mes actual, excluyendo futuras.
- Rediseño: paleta cálida, tipografía editorial (Fraunces + Inter), hero centrado con número grande como protagonista. Sin gradientes ni sombras suaves.
- Constitución: 6 principios verificables que cubren stack, spec-código, separación, tests, datos e idioma.
- Mapa de calor: últimas 4 semanas, colores por umbrales fijos (0/1-30/31-60/61-90/91+), escala de verdes, leyenda incluida, celdas no clickeables.
- Mapa de calor: funciones puras con "hoy" como parámetro para tests deterministas. Tooltip con event listeners. Actualización dinámica sin recargar.
## Aprendizajes y errores a evitar
- app.js necesita exports condicionales y guarda `typeof document !== 'undefined'` para que node --test pueda importar las funciones puras sin ejecutar el código del DOM.
## Próximos pasos
- (vacío por ahora)