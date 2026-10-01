import { defineConfig } from 'vite';

// El juego usa await de nivel superior: hace falta un destino moderno para la compilación de producción
export default defineConfig({ build: { target: 'esnext' } });
