import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const URL = 'http://localhost:5173/';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const up = () => fetch(URL).then(r => r.ok, () => false);
let server;
if (!(await up())) {
  server = spawn('npx', ['vite', '--port', '5173', '--strictPort'], { shell: true, stdio: 'ignore' });
  for (let i = 0; i < 40 && !(await up()); i++) await new Promise(r => setTimeout(r, 500));
}

const errors = [];
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', m => { if (m.type() === 'log' && /^\[(cámaras|rover|ruedas)\]/.test(m.text())) console.log(m.text()); if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
page.on('requestfailed', r => errors.push(`[requestfailed] ${r.url()}`));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', null, { timeout: 30000 }).catch(() => errors.push('[check] la escena no quedó lista (window.__ready)'));
await page.waitForTimeout(1500);
mkdirSync('screenshots', { recursive: true });
await page.screenshot({ path: 'screenshots/check.png' });
// --- Control de misión: los 4 datos cargan con números reales y T lo oculta ---
await page.waitForFunction('window.__mission && window.__mission.ready', null, { timeout: 45000 }).catch(() => errors.push('[check] el control de misión no terminó de cargar'));
const mission = await page.evaluate('JSON.parse(JSON.stringify(window.__mission))');
for (const key of ['distance', 'elevation', 'tilt', 'light']) {
  const c = mission.cards[key];
  if (!c?.loaded || !Number.isFinite(c.value) || !(c.points > 1)) errors.push('[check] dato sin cargar: ' + key + ' ' + JSON.stringify(c));
  else console.log(`Dato ${key}: ${c.value.toFixed(2)} ${c.unit} · ${c.points} puntos · ${c.provider}`);
}
const panelShown = () => page.evaluate("!document.getElementById('mission').classList.contains('off')");
if (!(await panelShown())) errors.push('[check] el panel debería empezar visible');
await page.screenshot({ path: 'screenshots/check-mission.png' });
await page.keyboard.press('KeyT'); await page.waitForTimeout(600);
if (await panelShown()) errors.push('[check] T no ocultó el control de misión');
await page.keyboard.press('KeyT'); await page.waitForTimeout(600);
if (!(await panelShown())) errors.push('[check] T no volvió a mostrar el control de misión');

// --- Cámaras: cada una abre una foto real; Esc vuelve al juego; flechas cambian de foto ---
for (const cam of ['mastcam', 'navcam', 'hazcam', 'watson']) {
  if (cam === 'mastcam') {   // clic real con el ratón sobre el punto brillante
    const r = await page.evaluate(`(() => { const b = document.querySelector('.cam-dot[data-cam="mastcam"] i').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
    await page.mouse.move(r.x, r.y); await page.waitForTimeout(250);
    await page.screenshot({ path: 'screenshots/check-hover.png' });
    await page.mouse.click(r.x, r.y);
  }
  else await page.evaluate(`document.querySelector('.cam-dot[data-cam="${cam}"]').click()`);
  await page.waitForFunction('window.__camera.shown', null, { timeout: 20000 }).catch(() => errors.push('[check] la cámara ' + cam + ' no abrió foto'));
  const shown = await page.evaluate('window.__camera.shown');
  if (!shown || shown.cam !== cam || !(shown.w > 500)) errors.push('[check] foto inválida en ' + cam + ': ' + JSON.stringify(shown));
  else console.log(`Cámara ${cam}: foto ${shown.src} sol ${shown.sol} (${shown.w}x${shown.h})`);
  if (cam === 'mastcam') {
    await page.waitForTimeout(4200);   // deja que la foto se revele por completo
    await page.screenshot({ path: 'screenshots/check-camera.png' });
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction('window.__camera.shown && window.__camera.shown.index === 1', null, { timeout: 15000 }).catch(() => errors.push('[check] la flecha no cambió de foto'));
  }
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  if (await page.evaluate('window.__camera.isOpen()')) errors.push('[check] Esc no cerró el visor (' + cam + ')');
}

// Conducir: avanzar, girar, y comprobar que deja huellas
await page.keyboard.down('KeyW'); await page.waitForTimeout(7000);
await page.keyboard.down('KeyA'); await page.waitForTimeout(1500);
await page.keyboard.up('KeyA'); await page.waitForTimeout(1500);
await page.screenshot({ path: 'screenshots/check-drive.png' });
await page.keyboard.up('KeyW');
const st = await page.evaluate('({ ...window.__rover })');
console.log('Estado rover:', JSON.stringify(st));
const ws = await page.evaluate('window.__wheels.map(w => ({ spin: +w.spin.toFixed(2), steer: +w.steer.toFixed(2), offset: +w.offset.toFixed(3), along: +w.along.toFixed(2), lat: +w.lat.toFixed(2) }))');
console.log('Ruedas:', JSON.stringify(ws));
if (ws.length !== 6) errors.push('[check] se esperaban 6 ruedas, hay ' + ws.length);
if (!ws.every(w => Math.abs(w.spin) > 0.1)) errors.push('[check] alguna rueda no giró');
if (!(st.stamps > 0)) errors.push('[check] el rover no dejó huellas');
// Física de rocas: una roca grande bloquea, una pequeña se sube
async function approach(kind) {
  const info = await page.evaluate(`(() => {
    const { rocks, rockExcess } = window.__phys;
    const ok = r => Math.abs(r.x) < 200 && Math.abs(r.z) < 200 && rocks.every(o => o === r || Math.hypot(o.x - r.x, o.z - r.z) > 12);
    const ex = r => rockExcess(r.x, r.z);
    let r;
    if ('${kind}' === 'big') r = rocks.find(r => ok(r) && ex(r) > 1.2 && r.rx > 1.3);
    else { // roca de prueba baja (sobresale 0.3 m) en un claro
      const { addRock, heightAt } = window.__phys;
      for (let x = -150; x < 150 && !r; x += 10) for (let z = -150; z < 150 && !r; z += 10)
        if (rocks.every(o => Math.hypot(o.x - x, o.z - z) > 14)) { r = { x, z, rx: 0.9, rz: 0.9, ry: 0.3, cy: heightAt(x, z), yaw: 0 }; addRock(r); }
    }
    if (!r) return null;
    const s = window.__rover, d = r.rx + 2.6;
    Object.assign(s, { x: r.x, z: r.z + d, yaw: 0, speed: 0, y: undefined, blocked: false });
    return { x: r.x, z: r.z, rx: r.rx, ex: ex(r), y0: null };
  })()`);
  if (!info) { errors.push('[check] no encontré roca de prueba ' + kind); return null; }
  await page.waitForTimeout(500);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(300); let maxY = -Infinity, y0 = await page.evaluate('window.__rover.y');
  for (let i = 0; i < 140; i++) {   // hasta ~70 s: el Chrome sin ventana va lento
    await page.waitForTimeout(500); maxY = Math.max(maxY, await page.evaluate('window.__rover.y'));
    const s = await page.evaluate('({ z: window.__rover.z, blocked: window.__rover.blocked })');
    if (kind === 'big' ? s.blocked : s.z < info.z - 1.4) break;
  }
  const end = await page.evaluate('({ ...window.__rover })');
  await page.keyboard.up('KeyW');
  if (kind === 'big') await page.screenshot({ path: 'screenshots/check-rock.png' });
  return { info, end, rise: maxY - y0 };
}
const big = await approach('big');
if (big) {
  console.log('Roca grande:', JSON.stringify({ excess: +big.info.ex.toFixed(2), rx: +big.info.rx.toFixed(2), rover_z: +big.end.z.toFixed(2), rock_z: +big.info.z.toFixed(2), blocked: big.end.blocked }));
  if (!(big.end.z > big.info.z + 0.3)) errors.push('[check] el rover traspasó la roca grande');
  if (!big.end.blocked) errors.push('[check] la roca grande no bloqueó al rover');
}
const small = await approach('small');
if (small) {
  console.log('Roca pequeña:', JSON.stringify({ excess: +small.info.ex.toFixed(2), rover_z: +small.end.z.toFixed(2), rock_z: +small.info.z.toFixed(2), rx: +small.info.rx.toFixed(2), blocked: small.end.blocked, sube_m: +small.rise.toFixed(2) }));
  if (!(small.end.z < small.info.z - 0.3)) errors.push('[check] el rover no pudo pasar sobre la roca pequeña');
}
await browser.close();
server?.kill();

console.log('Captura: screenshots/check.png');
if (errors.length) {
  console.log(`Errores de consola (${errors.length}):\n` + errors.join('\n'));
  process.exit(1);
}
console.log('Sin errores de consola.');
