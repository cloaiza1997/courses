const CLAVE_STORAGE = 'diario-estudio-sesiones';

// Constantes de colores del mapa de calor
const COLOR_SIN_SESION = '#E8DFD3';
const COLOR_SUAVE = '#C6D9C6';
const COLOR_MEDIO = '#8BA888';
const COLOR_INTENSO = '#5C8A5C';
const COLOR_MUY_INTENSO = '#2D5A2D';
const COLOR_FUTURO = '#F5F0EA';
const COLOR_BORDE_HOY = '#C4704A';

// Utilidades de fecha local (nunca UTC)
function fechaLocalISO(d) {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function parsearFechaLocal(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

function hoyISO() {
  return fechaLocalISO(new Date());
}

// Cargar y guardar
function cargarSesiones() {
  const datos = localStorage.getItem(CLAVE_STORAGE);
  return datos ? JSON.parse(datos) : [];
}

function guardarSesiones(sesiones) {
  localStorage.setItem(CLAVE_STORAGE, JSON.stringify(sesiones));
}

// Calcular racha: días consecutivos con sesión, terminando hoy o ayer
function calcularRacha(sesiones) {
  if (sesiones.length === 0) return 0;

  const dias = new Set(sesiones.map(s => s.fecha));
  let cursor = new Date();

  // Si hoy no hay sesión, empezamos desde ayer (la racha sigue viva)
  if (!dias.has(fechaLocalISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let racha = 0;
  while (dias.has(fechaLocalISO(cursor))) {
    racha++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return racha;
}

// Calcular mejor racha: tramo más largo de días consecutivos con sesión
function calcularMejorRacha(sesiones) {
  if (sesiones.length === 0) return 0;

  // Extraer fechas únicas, ordenar y excluir futuras
  const dias = [...new Set(sesiones.map(s => s.fecha))].sort();
  const hoy = hoyISO();
  const diasValidos = dias.filter(d => d <= hoy);

  if (diasValidos.length === 0) return 0;

  let mejor = 1;
  let actual = 1;

  for (let i = 1; i < diasValidos.length; i++) {
    const anterior = parsearFechaLocal(diasValidos[i - 1]);
    const actualFecha = parsearFechaLocal(diasValidos[i]);
    const diffDias = (actualFecha - anterior) / (1000 * 60 * 60 * 24);

    if (diffDias === 1) {
      actual++;
      if (actual > mejor) mejor = actual;
    } else {
      actual = 1;
    }
  }

  return mejor;
}

// Calcular minutos estudiados esta semana (lunes a hoy)
function calcularMinutosSemana(sesiones) {
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0 = domingo, 1 = lunes, ...
  const diasDesdeLunes = diaSemana === 0 ? 6 : diaSemana - 1;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - diasDesdeLunes);
  const lunesISO = fechaLocalISO(lunes);

  return sesiones
    .filter(s => s.fecha >= lunesISO)
    .reduce((total, s) => total + s.minutos, 0);
}

// Calcular días estudiados este mes (fechas únicas, excluyendo futuras)
function calcularDiasMes(sesiones) {
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();
  const hoy = hoyISO();

  const dias = new Set(
    sesiones
      .filter(s => {
        const d = parsearFechaLocal(s.fecha);
        return d.getMonth() === mesActual && d.getFullYear() === anioActual;
      })
      .map(s => s.fecha)
  );

  // Excluir fechas futuras
  let contador = 0;
  for (const fecha of dias) {
    if (fecha <= hoy) contador++;
  }

  return contador;
}

function formatearMinutos(minutos) {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

// ============ Mapa de calor ============

function obtenerLunesDeLaSemana(fecha) {
  const resultado = new Date(fecha);
  const dia = resultado.getDay();
  const diferencia = dia === 0 ? -6 : 1 - dia;
  resultado.setDate(resultado.getDate() + diferencia);
  return resultado;
}

function obtenerRangoMapa(hoy) {
  const lunesActual = obtenerLunesDeLaSemana(hoy);
  const inicio = new Date(lunesActual);
  inicio.setDate(inicio.getDate() - 21);
  return { inicio, fin: hoy };
}

function agruparMinutosPorDia(sesiones, inicio, fin) {
  const resultado = new Map();
  const inicioISO = fechaLocalISO(inicio);
  const finISO = fechaLocalISO(fin);

  for (const s of sesiones) {
    if (!s.fecha || typeof s.fecha !== 'string') continue;
    if (s.fecha < inicioISO || s.fecha > finISO) continue;
    if (typeof s.minutos !== 'number' || s.minutos < 0) continue;

    const actual = resultado.get(s.fecha) || 0;
    resultado.set(s.fecha, actual + s.minutos);
  }

  return resultado;
}

function obtenerColorDelDia(minutos, esHoy, esFuturo) {
  if (esFuturo) return COLOR_FUTURO;
  if (minutos === 0) return COLOR_SIN_SESION;
  if (minutos <= 30) return COLOR_SUAVE;
  if (minutos <= 60) return COLOR_MEDIO;
  if (minutos <= 90) return COLOR_INTENSO;
  return COLOR_MUY_INTENSO;
}

function construirCuadriculaMapa(hoy, minutosPorDia) {
  const { inicio } = obtenerRangoMapa(hoy);
  const cuadricula = [];
  const cursor = new Date(inicio);

  for (let i = 0; i < 28; i++) {
    const fecha = new Date(cursor);
    const fechaISO = fechaLocalISO(fecha);
    const minutos = minutosPorDia.get(fechaISO) || 0;
    const esHoy = fechaISO === fechaLocalISO(hoy);
    const esFuturo = fechaISO > fechaLocalISO(hoy);

    cuadricula.push({ fecha, minutos, esHoy, esFuturo });
    cursor.setDate(cursor.getDate() + 1);
  }

  return cuadricula;
}

function formatearFechaTooltip(fecha) {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return `${fecha.getDate()} de ${meses[fecha.getMonth()]}`;
}

function formatearMinutosTooltip(minutos) {
  if (minutos === 0) return 'Sin sesión';
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

// Renderizar
function renderizar() {
  const sesiones = cargarSesiones();

  // Racha
  document.getElementById('racha-numero').textContent = calcularRacha(sesiones);
  document.getElementById('mejor-racha-numero').textContent = calcularMejorRacha(sesiones);
  document.getElementById('minutos-semana').textContent = formatearMinutos(calcularMinutosSemana(sesiones));
  document.getElementById('dias-mes').textContent = calcularDiasMes(sesiones);

  // Mapa de calor
  renderizarMapaCalor();

  // Lista ordenada de más reciente a más antigua
  const lista = document.getElementById('lista-sesiones');
  lista.innerHTML = '';

  const ordenadas = [...sesiones].sort((a, b) => b.fecha.localeCompare(a.fecha));

  document.getElementById('sin-sesiones').style.display =
    ordenadas.length === 0 ? 'block' : 'none';

  for (const s of ordenadas) {
    const li = document.createElement('li');
    li.className = 'sesion';

    const izquierda = document.createElement('div');

    const fecha = document.createElement('div');
    fecha.className = 'sesion-fecha';
    fecha.textContent = formatearFecha(s.fecha);

    const tema = document.createElement('div');
    tema.className = 'sesion-tema';
    tema.textContent = s.tema;

    izquierda.appendChild(fecha);
    izquierda.appendChild(tema);

    const minutos = document.createElement('span');
    minutos.className = 'sesion-minutos';
    minutos.textContent = `${s.minutos} min`;

    li.appendChild(izquierda);
    li.appendChild(minutos);
    lista.appendChild(li);
  }
}

function formatearFecha(iso) {
  const d = parsearFechaLocal(iso);
  return d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// Exportar funciones puras para tests (solo si no estamos en el navegador)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    obtenerLunesDeLaSemana,
    obtenerRangoMapa,
    agruparMinutosPorDia,
    obtenerColorDelDia,
    construirCuadriculaMapa,
    formatearFechaTooltip,
    formatearMinutosTooltip,
  };
}

// Renderizar mapa de calor
function renderizarMapaCalor() {
  const sesiones = cargarSesiones();
  const hoy = new Date();
  const { inicio } = obtenerRangoMapa(hoy);
  const minutosPorDia = agruparMinutosPorDia(sesiones, inicio, hoy);
  const cuadricula = construirCuadriculaMapa(hoy, minutosPorDia);

  const contenedor = document.getElementById('mapa-calor');
  contenedor.innerHTML = '';

  // Crear tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);

  for (const celda of cuadricula) {
    const div = document.createElement('div');
    div.className = 'mapa-celda';
    div.style.backgroundColor = obtenerColorDelDia(celda.minutos, celda.esHoy, celda.esFuturo);

    if (celda.esHoy && celda.minutos === 0) {
      div.classList.add('hoy-sin-sesion');
    }

    const fechaTexto = formatearFechaTooltip(celda.fecha);
    const minutosTexto = formatearMinutosTooltip(celda.minutos);
    div.setAttribute('aria-label', `${fechaTexto}: ${minutosTexto}`);

    div.addEventListener('mouseenter', (e) => {
      if (celda.esFuturo) {
        tooltip.textContent = fechaTexto;
      } else {
        tooltip.textContent = `${fechaTexto}: ${minutosTexto}`;
      }
      tooltip.style.display = 'block';
      tooltip.style.left = `${e.pageX + 10}px`;
      tooltip.style.top = `${e.pageY + 10}px`;
    });

    div.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });

    contenedor.appendChild(div);
  }
}

// Solo ejecutar en el navegador
if (typeof document !== 'undefined') {
  // Inicializar
  document.getElementById('fecha').value = hoyISO();

  document.getElementById('form-sesion').addEventListener('submit', (e) => {
    e.preventDefault();

    const sesion = {
      fecha: document.getElementById('fecha').value,
      tema: document.getElementById('tema').value.trim(),
      minutos: parseInt(document.getElementById('minutos').value, 10),
    };

    const sesiones = cargarSesiones();
    sesiones.push(sesion);
    guardarSesiones(sesiones);

    document.getElementById('tema').value = '';
    document.getElementById('minutos').value = '';
    document.getElementById('tema').focus();

    renderizar();
  });

  renderizar();
  renderizarMapaCalor();
}
