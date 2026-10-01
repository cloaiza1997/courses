# Constitución del Diario de Estudio

1. **Stack cero**: HTML, CSS y JS puros. Sin frameworks, npm, bundler ni build.
2. **Spec primero**: cada funcionalidad nace de una especificación clara; el código la implementa, no la inventa.
3. **Separación**: lógica (cálculos, datos) en funciones puras; interfaz (DOM) solo en `renderizar()` y event listeners.
4. **Tests sin dependencias**: verificación manual con Chrome DevTools (consola, localStorage, vista móvil). Sin frameworks de test.
5. **Datos del usuario**: localStorage es la única fuente. Nunca se envían datos a servidores. Cambios de formato requieren migración.
6. **Español**: textos de interfaz y comentarios en español. Nombres de variables en inglés solo si son estándar del lenguaje.
