import * as THREE from 'three';
import { mulberry32 } from './noise.js';

function craterTexture(seed, base) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
  const cx = cv.getContext('2d'); const r = mulberry32(seed);
  cx.fillStyle = base; cx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 160; i++) {
    const x = r() * 512, y = r() * 256, rad = 3 + Math.pow(r(), 2.5) * 30;
    const g = cx.createRadialGradient(x, y, rad * 0.1, x, y, rad);
    g.addColorStop(0, 'rgba(25,20,18,0.55)'); g.addColorStop(0.75, 'rgba(25,20,18,0.25)');
    g.addColorStop(0.9, 'rgba(210,195,180,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, rad, 0, 7); cx.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function makeMoon(dir, dist, radius, scale, seed, base) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 32),
    new THREE.MeshStandardMaterial({ map: craterTexture(seed, base), roughness: 1, fog: false, emissive: 0xffd2a0, emissiveMap: null, emissiveIntensity: 0.22 })
  );
  m.material.emissiveMap = m.material.map; m.scale.set(...scale);
  m.position.copy(dir).normalize().multiplyScalar(dist);
  return m;
}

// Fobos (grande, irregular) y Deimos (pequeña, más clara). Tamaños exagerados para cine.
export function createMoons() {
  const g = new THREE.Group();
  const phobos = makeMoon(new THREE.Vector3(0.449, 0.438, -0.778), 1000, 34, [1.25, 0.95, 1], 7, '#6f625a');
  const deimos = makeMoon(new THREE.Vector3(0.193, 0.375, -0.907), 1000, 13, [1.1, 0.9, 1], 21, '#8a7a6c');
  g.add(phobos, deimos);
  g.userData.update = t => { phobos.rotation.y = t * 0.03; deimos.rotation.y = t * 0.02; };
  return g;
}
