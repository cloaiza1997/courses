const CLAVE_STORAGE = 'diario-estudio-sesiones';

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

// Renderizar
function renderizar() {
  const sesiones = cargarSesiones();

  // Racha
  document.getElementById('racha-numero').textContent = calcularRacha(sesiones);
  document.getElementById('mejor-racha-numero').textContent = calcularMejorRacha(sesiones);

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
