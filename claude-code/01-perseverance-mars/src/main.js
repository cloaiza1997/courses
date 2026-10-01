import * as THREE from 'three';
import { createTerrain, heightAt } from './terrain.js';
import { createRocks, groundAt, rockExcess, addRock, ROCK_LIST } from './rocks.js';
import { createSky, createDust, SUN_DIR, HORIZON } from './sky.js';
import { createMoons } from './moons.js';
import { createRover } from './rover.js';
import { initMission } from './mission.js';
import { initCameras } from './cameras.js';
import './style.css';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(HORIZON.getHex(), 0.0042);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 3000);

const sky = createSky();
const moons = createMoons();
const dust = createDust();
scene.add(sky, createTerrain(), createRocks(), moons, dust);

// Sol de tarde: cálido, bajo, sombras suaves; la sombra sigue al rover
const sun = new THREE.DirectionalLight(0xffb878, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
const sc = sun.shadow.camera;
sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 10; sc.far = 500;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; sun.shadow.radius = 4;
scene.add(sun, sun.target, new THREE.HemisphereLight(0xffc08a, 0x8a4a2e, 0.9));

const keys = {};
addEventListener('keydown', e => {
  if (window.__camera?.isOpen()) return;   // con el visor de fotos abierto, el rover no recibe teclas
  keys[e.code] = true; if (e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('pointerdown', () => { if (window.__camera?.isOpen()) for (const k in keys) keys[k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

const rover = await createRover(scene);
window.__rover = rover.state;
window.__wheels = rover.wheels;
window.__phys = { rocks: ROCK_LIST, rockExcess, addRock, heightAt };

// Cámara de seguimiento
const desired = new THREE.Vector3(), look = new THREE.Vector3();
function follow(dt, snap) {
  const f = rover.forward, p = rover.object.position;
  desired.set(p.x - f.x * 8, 0, p.z - f.z * 8);
  desired.y = Math.max(p.y + 3.2, groundAt(desired.x, desired.z) + 1.8);
  if (snap) camera.position.copy(desired);
  else camera.position.lerp(desired, 1 - Math.exp(-dt * 3));
  look.set(p.x + f.x * 3, p.y + 1.3, p.z + f.z * 3);
  camera.lookAt(look);
}
rover.update(0, keys); follow(0, true);
const cameras = await initCameras({ camera, rover });
initMission();

let last = performance.now(), elapsed = 0;
renderer.setAnimationLoop(now => {
  const dt = Math.min((now - last) / 1000, 0.05); last = now; elapsed += dt;
  rover.update(dt, keys);
  follow(dt, false);
  const p = rover.object.position;
  sun.target.position.copy(p);
  sun.position.copy(p).addScaledVector(SUN_DIR, 200);
  sky.position.copy(camera.position); moons.position.copy(camera.position);
  dust.userData.update(elapsed);
  dust.position.x += p.x; dust.position.z = p.z - 40;
  moons.userData.update(elapsed);
  cameras.update();
  renderer.render(scene, camera);
  if (elapsed > 0.5) window.__ready = true;
});

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
