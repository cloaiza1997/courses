import * as THREE from 'three';

const CAMS = [
  { key: 'mastcam', name: 'Mastcam-Z' },
  { key: 'navcam', name: 'Navcam' },
  { key: 'hazcam', name: 'Hazcam frontal' },
  { key: 'watson', name: 'WATSON' },
];
const IDLE_MS = 14000;   // en modo tarjeta, vuelve solo al juego si no tocas nada

function daysAgo(utc) {
  const d = Math.max(0, Math.floor((Date.now() - Date.parse(utc + 'Z')) / 86400000));
  return d === 0 ? 'hoy' : d === 1 ? 'hace 1 día' : `hace ${d} días`;
}

// Obturador sintetizado: dos clics cortos de ruido
function shutterSound() {
  try {
    const ctx = (shutterSound.ctx ??= new (window.AudioContext || window.webkitAudioContext)());
    for (const at of [0, 0.09]) {
      const len = Math.floor(ctx.sampleRate * 0.035), buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf; g.gain.value = 0.35; src.connect(g).connect(ctx.destination); src.start(ctx.currentTime + at);
    }
  } catch { /* sin audio: no pasa nada */ }
}

export async function initCameras({ camera, rover }) {
  const manifest = await (await fetch('/photos/manifest.json')).json();

  // --- Puntos brillantes sobre las piezas ---
  const dots = CAMS.filter((c) => rover.cameraPoints[c.key]).map((c) => {
    const b = document.createElement('button');
    b.className = 'cam-dot'; b.type = 'button'; b.dataset.cam = c.key;
    b.setAttribute('aria-label', `Cámara ${c.name}: ver foto real de Marte`);
    b.innerHTML = `<i></i><span>${c.name}</span>`;
    document.body.appendChild(b);
    b.addEventListener('click', () => open(c.key));
    return { ...c, el: b, point: rover.cameraPoints[c.key] };
  });

  // --- Visor ---
  const flash = document.createElement('div'); flash.id = 'flash';
  const viewer = document.createElement('div'); viewer.id = 'viewer'; viewer.hidden = true;
  viewer.innerHTML = `<figure class="v-card"><div class="v-frame"><img alt=""><div class="v-scan"></div></div>
    <figcaption><b class="v-cam"></b><span class="v-meta"></span><span class="v-count"></span></figcaption></figure>
    <div class="v-help"><kbd>clic</kbd> ampliar &nbsp;·&nbsp; <kbd>←</kbd><kbd>→</kbd> más fotos &nbsp;·&nbsp; <kbd>Esc</kbd> volver al juego</div>`;
  document.body.append(flash, viewer);
  const img = viewer.querySelector('img'), frame = viewer.querySelector('.v-frame');
  const api = { isOpen: () => !viewer.hidden, opened: null, shown: null };
  window.__camera = api;

  let cam = null, idx = 0, idle = 0;
  const poke = () => { clearTimeout(idle); if (!viewer.classList.contains('zoom')) idle = setTimeout(close, IDLE_MS); };

  function show(i) {
    const list = manifest[cam.key];
    idx = (i + list.length) % list.length;
    const p = list[idx];
    viewer.querySelector('.v-cam').textContent = `${cam.name} · ${p.instrument.replace(/_/g, ' ')}`;
    viewer.querySelector('.v-meta').textContent = `Sol ${p.sol} · ${daysAgo(p.utc)}`;
    viewer.querySelector('.v-count').textContent = `${idx + 1} / ${list.length}`;
    frame.classList.remove('reveal'); img.removeAttribute('src');
    img.onload = () => {
      void frame.offsetWidth;   // reinicia la animación
      frame.classList.add('reveal');
      api.shown = { cam: cam.key, index: idx, sol: p.sol, w: img.naturalWidth, h: img.naturalHeight, src: p.file };
    };
    img.src = `/${p.file}`;
    img.alt = `${cam.name}, sol ${p.sol}`;
    poke();
  }
  function open(key) {
    cam = CAMS.find((c) => c.key === key);
    shutterSound();
    flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
    viewer.classList.remove('zoom'); viewer.hidden = false; api.opened = key;
    document.body.classList.add('viewing');
    show(0);
  }
  function close() {
    clearTimeout(idle); viewer.hidden = true; viewer.classList.remove('zoom'); api.opened = null; api.shown = null;
    document.body.classList.remove('viewing');
  }
  frame.addEventListener('click', () => { viewer.classList.toggle('zoom'); poke(); });
  viewer.addEventListener('pointermove', poke);
  addEventListener('keydown', (e) => {
    if (viewer.hidden) return;
    if (e.code === 'Escape') { close(); e.preventDefault(); }
    else if (e.code === 'ArrowRight') { show(idx + 1); e.preventDefault(); }
    else if (e.code === 'ArrowLeft') { show(idx - 1); e.preventDefault(); }
  }, true);

  // --- Posición de los puntos en pantalla, cada cuadro ---
  const v = new THREE.Vector3();
  const MIN_GAP = 40;   // px: los puntos cercanos (mástil) se separan para poder hacer clic en cada uno
  function update() {
    const pos = [];
    for (const d of dots) {
      v.copy(d.point); rover.object.localToWorld(v);
      const dist = v.distanceTo(camera.position);
      v.project(camera);
      d.visible = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && dist < 60 && viewer.hidden;
      d.x = ((v.x + 1) / 2) * innerWidth; d.y = ((1 - v.y) / 2) * innerHeight;
      if (d.visible) pos.push(d);
    }
    for (let it = 0; it < 4; it++) for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
      const a = pos[i], b = pos[j]; let dx = b.x - a.x, dy = b.y - a.y; const len = Math.hypot(dx, dy);
      if (len >= MIN_GAP) continue;
      if (len < 0.5) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
      const push = (MIN_GAP - len) / 2;
      a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push;
    }
    for (const d of dots) {
      d.el.style.display = d.visible ? '' : 'none';
      d.el.style.transform = `translate(${d.x}px, ${d.y}px)`;
    }
  }
  return { update, isOpen: api.isOpen };
}
