import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  obtenerLunesDeLaSemana,
  obtenerRangoMapa,
  agruparMinutosPorDia,
  obtenerColorDelDia,
  construirCuadriculaMapa,
  formatearFechaTooltip,
  formatearMinutosTooltip,
} from '../src/app.js';

test('obtenerLunesDeLaSemana devuelve lunes para un miércoles', () => {
  const miercoles = new Date(2026, 9, 7); // 7 de octubre de 2026 (miércoles)
  const lunes = obtenerLunesDeLaSemana(miercoles);
  assert.equal(lunes.getDay(), 1);
  assert.equal(lunes.getDate(), 5);
});

test('obtenerLunesDeLaSemana devuelve lunes para un domingo', () => {
  const domingo = new Date(2026, 9, 11); // 11 de octubre de 2026 (domingo)
  const lunes = obtenerLunesDeLaSemana(domingo);
  assert.equal(lunes.getDay(), 1);
  assert.equal(lunes.getDate(), 5);
});

test('obtenerLunesDeLaSemana devuelve la misma fecha si ya es lunes', () => {
  const lunes = new Date(2026, 9, 5); // 5 de octubre de 2026 (lunes)
  const resultado = obtenerLunesDeLaSemana(lunes);
  assert.equal(resultado.getDate(), 5);
  assert.equal(resultado.getMonth(), 9);
  assert.equal(resultado.getFullYear(), 2026);
});

test('obtenerRangoMapa devuelve inicio = lunes actual - 21 días', () => {
  const hoy = new Date(2026, 9, 7); // 7 de octubre de 2026 (miércoles)
  const rango = obtenerRangoMapa(hoy);
  assert.equal(rango.inicio.getDay(), 1); // lunes
  assert.equal(rango.inicio.getDate(), 14); // 14 de septiembre
  assert.equal(rango.fin.getDate(), 7); // 7 de octubre
});

test('obtenerRangoMapa devuelve fin = hoy', () => {
  const hoy = new Date(2026, 9, 7);
  const rango = obtenerRangoMapa(hoy);
  assert.equal(rango.fin.getDate(), hoy.getDate());
  assert.equal(rango.fin.getMonth(), hoy.getMonth());
  assert.equal(rango.fin.getFullYear(), hoy.getFullYear());
});

test('agruparMinutosPorDia suma minutos de múltiples sesiones el mismo día', () => {
  const sesiones = [
    { fecha: '2026-10-07', minutos: 30 },
    { fecha: '2026-10-07', minutos: 45 },
  ];
  const inicio = new Date(2026, 8, 14);
  const fin = new Date(2026, 9, 7);
  const resultado = agruparMinutosPorDia(sesiones, inicio, fin);
  assert.equal(resultado.get('2026-10-07'), 75);
});

test('agruparMinutosPorDia ignora sesiones fuera de rango', () => {
  const sesiones = [
    { fecha: '2026-09-01', minutos: 60 }, // fuera de rango
    { fecha: '2026-10-07', minutos: 30 },
  ];
  const inicio = new Date(2026, 8, 14);
  const fin = new Date(2026, 9, 7);
  const resultado = agruparMinutosPorDia(sesiones, inicio, fin);
  assert.equal(resultado.get('2026-09-01'), undefined);
  assert.equal(resultado.get('2026-10-07'), 30);
});

test('agruparMinutosPorDia ignora sesiones con minutos negativos', () => {
  const sesiones = [
    { fecha: '2026-10-07', minutos: -30 },
    { fecha: '2026-10-07', minutos: 45 },
  ];
  const inicio = new Date(2026, 8, 14);
  const fin = new Date(2026, 9, 7);
  const resultado = agruparMinutosPorDia(sesiones, inicio, fin);
  assert.equal(resultado.get('2026-10-07'), 45);
});

test('agruparMinutosPorDia ignora sesiones con fecha inválida', () => {
  const sesiones = [
    { fecha: '2026-02-30', minutos: 60 }, // fecha inválida
    { fecha: '2026-10-07', minutos: 30 },
  ];
  const inicio = new Date(2026, 8, 14);
  const fin = new Date(2026, 9, 7);
  const resultado = agruparMinutosPorDia(sesiones, inicio, fin);
  assert.equal(resultado.get('2026-02-30'), undefined);
  assert.equal(resultado.get('2026-10-07'), 30);
});

test('obtenerColorDelDia devuelve #E8DFD3 para 0 minutos', () => {
  assert.equal(obtenerColorDelDia(0, false, false), '#E8DFD3');
});

test('obtenerColorDelDia devuelve #C6D9C6 para 15 minutos', () => {
  assert.equal(obtenerColorDelDia(15, false, false), '#C6D9C6');
});

test('obtenerColorDelDia devuelve #8BA888 para 45 minutos', () => {
  assert.equal(obtenerColorDelDia(45, false, false), '#8BA888');
});

test('obtenerColorDelDia devuelve #5C8A5C para 75 minutos', () => {
  assert.equal(obtenerColorDelDia(75, false, false), '#5C8A5C');
});

test('obtenerColorDelDia devuelve #2D5A2D para 120 minutos', () => {
  assert.equal(obtenerColorDelDia(120, false, false), '#2D5A2D');
});

test('obtenerColorDelDia devuelve #F5F0EA para días futuros', () => {
  assert.equal(obtenerColorDelDia(0, false, true), '#F5F0EA');
  assert.equal(obtenerColorDelDia(45, false, true), '#F5F0EA');
});

test('obtenerColorDelDia devuelve borde terracota para hoy sin sesión', () => {
  const resultado = obtenerColorDelDia(0, true, false);
  assert.equal(resultado, '#E8DFD3');
  // El borde se aplica en el renderizado, no en el color
});

test('construirCuadriculaMapa devuelve exactamente 28 celdas', () => {
  const hoy = new Date(2026, 9, 7);
  const minutosPorDia = new Map();
  const cuadricula = construirCuadriculaMapa(hoy, minutosPorDia);
  assert.equal(cuadricula.length, 28);
});

test('construirCuadriculaMapa primera celda es lunes de la semana más antigua', () => {
  const hoy = new Date(2026, 9, 7); // miércoles
  const minutosPorDia = new Map();
  const cuadricula = construirCuadriculaMapa(hoy, minutosPorDia);
  assert.equal(cuadricula[0].fecha.getDay(), 1); // lunes
  assert.equal(cuadricula[0].fecha.getDate(), 14); // 14 de septiembre
});

test('construirCuadriculaMapa última celda es domingo de la semana actual', () => {
  const hoy = new Date(2026, 9, 7); // miércoles
  const minutosPorDia = new Map();
  const cuadricula = construirCuadriculaMapa(hoy, minutosPorDia);
  assert.equal(cuadricula[27].fecha.getDay(), 0); // domingo
  assert.equal(cuadricula[27].fecha.getDate(), 11); // 11 de octubre
});

test('construirCuadriculaMapa identifica correctamente el día de hoy', () => {
  const hoy = new Date(2026, 9, 7);
  const minutosPorDia = new Map();
  const cuadricula = construirCuadriculaMapa(hoy, minutosPorDia);
  const celdaHoy = cuadricula.find(c => c.esHoy);
  assert.equal(celdaHoy.fecha.getDate(), 7);
});

test('construirCuadriculaMapa identifica correctamente los días futuros', () => {
  const hoy = new Date(2026, 9, 7); // miércoles
  const minutosPorDia = new Map();
  const cuadricula = construirCuadriculaMapa(hoy, minutosPorDia);
  const futuros = cuadricula.filter(c => c.esFuturo);
  assert.equal(futuros.length, 4); // jueves, viernes, sábado, domingo
});

test('formatearFechaTooltip devuelve "15 de marzo" para el 15 de marzo', () => {
  const fecha = new Date(2026, 2, 15);
  assert.equal(formatearFechaTooltip(fecha), '15 de marzo');
});

test('formatearFechaTooltip devuelve "1 de enero" para el 1 de enero', () => {
  const fecha = new Date(2026, 0, 1);
  assert.equal(formatearFechaTooltip(fecha), '1 de enero');
});

test('formatearMinutosTooltip devuelve "45 min" para 45 minutos', () => {
  assert.equal(formatearMinutosTooltip(45), '45 min');
});

test('formatearMinutosTooltip devuelve "1 h 30 min" para 90 minutos', () => {
  assert.equal(formatearMinutosTooltip(90), '1 h 30 min');
});

test('formatearMinutosTooltip devuelve "Sin sesión" para 0 minutos', () => {
  assert.equal(formatearMinutosTooltip(0), 'Sin sesión');
});
