import { dictionary, telemetry, solAt } from './telemetry.js';

const nf = (v, d) => v.toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d });

// Frase simple que explica qué significa el valor actual
const PHRASES = {
  distance: (v, s) => `Desde que aterrizó, Percy ha rodado ${nf(v, 1)} km: unas ${nf(Math.round((v * 1000) / 105), 0)} canchas de fútbol puestas en fila.`,
  elevation: (v, s) => `Ahora está a ${nf(v, 0)} m del nivel de referencia de Marte, ${nf(v - s[0].value, 0)} m más arriba que donde aterrizó.`,
  tilt: (v) => `Se inclina ${nf(v, 1)}°: ${v < 3 ? 'casi plano' : v < 10 ? 'una pendiente suave' : v < 20 ? 'como una rampa de garaje empinada' : 'muy inclinado, cerca de sus límites'}.`,
  light: (v) => `Una señal de radio tarda ${Math.floor(v)} min ${String(Math.round((v % 1) * 60)).padStart(2, '0')} s en llegar de Marte a la Tierra; la respuesta tarda otro tanto.`,
};

function chartSvg(points, w = 300, h = 58) {
  const xs = points.map((p) => p.sol), ys = points.map((p) => p.value);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const sx = (x) => 2 + ((x - x0) / (x1 - x0 || 1)) * (w - 4);
  const sy = (y) => h - 3 - ((y - y0) / (y1 - y0 || 1)) * (h - 8);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.sol).toFixed(1)},${sy(p.value).toFixed(1)}`).join('');
  const last = points[points.length - 1];
  return { x0, x1, y0, y1, sx, sy, html:
    `<path class="area" d="${line}L${sx(x1)},${h}L${sx(x0)},${h}Z"/><path class="line" d="${line}"/>` +
    `<circle class="now" cx="${sx(last.sol).toFixed(1)}" cy="${sy(last.value).toFixed(1)}" r="3.2"/><line class="cursor" y1="0" y2="${h}" x1="-9" x2="-9"/>` };
}

export function initMission() {
  const root = document.createElement('aside');
  root.id = 'mission'; root.className = 'hud';
  root.innerHTML = `<header><b>CONTROL DE MISIÓN</b><kbd>T</kbd></header>` + dictionary.map((o) =>
    `<article class="m-card" data-key="${o.key}" data-loaded="false">
       <div class="m-top"><span class="m-name">${o.name}</span><span class="m-prov">cargando…</span></div>
       <div class="m-val"><b>—</b><span>${o.unit}</span></div>
       <svg class="m-chart" viewBox="0 0 300 58" preserveAspectRatio="none" role="img" aria-label="${o.name} durante toda la misión"></svg>
       <div class="m-axis"><span class="a0"></span><span class="ah"></span><span class="a1"></span></div>
       <p class="m-phrase"></p>
     </article>`).join('');
  document.body.appendChild(root);

  const hint = document.createElement('div');
  hint.id = 'hint'; hint.className = 'hud';
  hint.innerHTML = '<kbd>W A S D</kbd> conducir &nbsp;·&nbsp; <kbd>T</kbd> control de misión &nbsp;·&nbsp; clic en un punto brillante: cámaras';
  document.body.appendChild(hint);

  const state = { cards: {}, ready: false };
  window.__mission = state;

  addEventListener('keydown', (e) => {
    if (e.code === 'KeyT' && !e.repeat && !e.ctrlKey && !e.metaKey) { root.classList.toggle('off'); state.hidden = root.classList.contains('off'); }
  });
  state.hidden = false;

  Promise.all(dictionary.map(async (o) => {
    const card = root.querySelector(`[data-key="${o.key}"]`);
    const set = (c) => { Object.assign(state.cards[o.key] ??= {}, c); };
    try {
      const pts = await telemetry.request(o);
      if (!pts.length) throw new Error('sin datos');
      const c = chartSvg(pts);
      card.querySelector('svg').innerHTML = c.html;
      card.querySelector('.a0').textContent = `Sol ${Math.round(c.x0)}`;
      card.querySelector('.a1').textContent = `Sol ${Math.round(c.x1)}`;
      card.querySelector('.m-prov').textContent = telemetry.label(o);
      const show = (datum) => {
        card.querySelector('.m-val b').textContent = nf(datum.value, o.decimals);
        card.querySelector('.m-phrase').textContent = PHRASES[o.key](datum.value, pts);
        set({ value: datum.value, sol: datum.sol });
      };
      show(pts[pts.length - 1]);
      telemetry.subscribe(o, (d) => { show(d); pts[pts.length - 1] = d; });   // en vivo, si el proveedor lo soporta

      // lectura al pasar el cursor sobre la gráfica
      const svg = card.querySelector('svg'), ah = card.querySelector('.ah'), cur = svg.querySelector('.cursor');
      svg.addEventListener('pointermove', (e) => {
        const r = svg.getBoundingClientRect(), sol = c.x0 + ((e.clientX - r.left) / r.width) * (c.x1 - c.x0);
        let best = pts[0]; for (const p of pts) if (Math.abs(p.sol - sol) < Math.abs(best.sol - sol)) best = p;
        cur.setAttribute('x1', c.sx(best.sol)); cur.setAttribute('x2', c.sx(best.sol));
        ah.textContent = `Sol ${Math.round(best.sol)}: ${nf(best.value, o.decimals)} ${o.unit}`;
      });
      svg.addEventListener('pointerleave', () => { ah.textContent = ''; cur.setAttribute('x1', -9); cur.setAttribute('x2', -9); });

      card.dataset.loaded = 'true';
      set({ loaded: true, name: o.name, unit: o.unit, provider: telemetry.label(o), points: pts.length });
    } catch (err) {
      card.dataset.loaded = 'error';
      card.querySelector('.m-prov').textContent = 'sin datos';
      set({ loaded: false, error: String(err) });
    }
  })).then(() => { state.ready = true; state.sol = solAt(); });
}
