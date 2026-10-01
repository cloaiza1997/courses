// Mini "Open MCT" para el juego: el mismo patrón de tres piezas.
//  1) Diccionario: cada dato es un objeto con identificador, nombre, unidad y qué proveedor lo entrega.
//  2) Proveedores: declaran qué datos soportan y responden a request() (historial) y subscribe() (en vivo).
//  3) API: telemetry.request(objeto) / telemetry.subscribe(objeto, cb) eligen el proveedor por el objeto.
// Cada dato (datum) es { sol, value }; 'sol' es el eje de tiempo (días marcianos desde el aterrizaje).

const SOL_MS = 88775244.1;                       // un sol en milisegundos
const SOL0 = Date.UTC(2021, 1, 18, 20, 55, 0);   // aterrizaje de Perseverance (sol 0)
export const solAt = (date = Date.now()) => (+date - SOL0) / SOL_MS;
export const dateOfSol = (sol) => new Date(SOL0 + sol * SOL_MS);

// ---------- Tiempo de luz Tierra-Marte (efemérides aproximadas de Standish/JPL, 1800-2050) ----------
const D2R = Math.PI / 180;
const EARTH = [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0, 0];
const MARS = [1.52371034, 0.00001847, 0.0933941, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343];
const LIGHT_S_PER_AU = 499.004784;

function heliocentric(el, T) {
  const [a0, ar, e0, er, I0, Ir, L0, Lr, w0, wr, O0, Or] = el;
  const a = a0 + ar * T, e = e0 + er * T, I = (I0 + Ir * T) * D2R;
  const L = L0 + Lr * T, wbar = w0 + wr * T, Odeg = O0 + Or * T, O = Odeg * D2R;
  const omega = (wbar - Odeg) * D2R;
  const M = ((((L - wbar) % 360) + 540) % 360 - 180) * D2R;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(omega), sw = Math.sin(omega), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp,
  ];
}
export function earthMarsAU(date = Date.now()) {
  const T = (+date / 86400000 + 2440587.5 - 2451545) / 36525;
  const e = heliocentric(EARTH, T), m = heliocentric(MARS, T);
  return Math.hypot(e[0] - m[0], e[1] - m[1], e[2] - m[2]);
}
export const lightMinutes = (date = Date.now()) => (earthMarsAU(date) * LIGHT_S_PER_AU) / 60;

// ---------- Proveedor 1: historial de manejos de la NASA (MMGIS, M20_waypoints.json) ----------
const NASA_URL = 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json';
const LOCAL_URL = '/data/waypoints.json';   // copia del mismo archivo, por si no hay red
let waypointsPromise;
function loadWaypoints() {
  waypointsPromise ??= (async () => {
    try {
      const r = await fetch(NASA_URL);
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      const rows = j.features.map((f) => f.properties).map((p) => [p.sol, p.dist_total_m, p.elev_geoid, p.tilt]);
      return { rows, origin: 'NASA MMGIS · en vivo' };
    } catch {
      const j = await (await fetch(LOCAL_URL)).json();
      return { rows: j.rows, origin: 'NASA MMGIS · copia guardada' };
    }
  })();
  return waypointsPromise;
}
const waypointColumn = { distance: 1, elevation: 2, tilt: 3 };
const nasaWaypoints = {
  key: 'nasa.waypoints',
  label: 'NASA MMGIS · M20_waypoints.json',
  supports: (o) => o.key in waypointColumn,
  async request(o) {
    const { rows, origin } = await loadWaypoints();
    this.origin = origin;
    const col = waypointColumn[o.key];
    let best = 0;
    return rows.map((r) => {
      let v = r[col];
      if (o.key === 'distance') { best = Math.max(best, v); v = best; }   // acumulado: algunas filas reinician en 0
      return { sol: r[0], value: v * (o.scale ?? 1) };
    });
  },
};

// ---------- Proveedor 2: cálculo en vivo ----------
const liveLight = {
  key: 'calc.light',
  label: 'Cálculo en vivo · efemérides JPL',
  supports: (o) => o.key === 'light',
  async request() {
    const now = solAt(), out = [];
    for (let s = 0; s < now; s += 20) out.push({ sol: s, value: lightMinutes(dateOfSol(s)) });
    out.push({ sol: now, value: lightMinutes() });
    return out;
  },
  subscribe(o, cb) {
    const tick = () => cb({ sol: solAt(), value: lightMinutes() });
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  },
};

// ---------- Diccionario y API ----------
export const dictionary = [
  { key: 'distance', name: 'Distancia recorrida', unit: 'km', scale: 0.001, decimals: 2, provider: 'nasa.waypoints' },
  { key: 'elevation', name: 'Altura del terreno', unit: 'm', decimals: 0, provider: 'nasa.waypoints' },
  { key: 'tilt', name: 'Inclinación', unit: '°', decimals: 1, provider: 'nasa.waypoints' },
  { key: 'light', name: 'Tiempo de luz a la Tierra', unit: 'min', decimals: 1, provider: 'calc.light' },
];
const providers = [nasaWaypoints, liveLight];
export const telemetry = {
  providerFor: (o) => providers.find((p) => p.supports(o) && p.key === o.provider),
  request: (o) => telemetry.providerFor(o).request(o),
  subscribe: (o, cb) => telemetry.providerFor(o)?.subscribe?.(o, cb),
  label: (o) => {
    const p = telemetry.providerFor(o);
    return p.origin ?? p.label;
  },
};
