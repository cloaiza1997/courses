import * as THREE from 'three';
import { heightAt, START } from './terrain.js';

// --- Física de rocas: cada roca es un elipsoide (cúpula) sobre el terreno, indexado en una rejilla ---
const CELL = 8;
let grid = new Map();
export const ROCK_LIST = [];
const key = (i, j) => (i + 1000) * 4000 + (j + 1000);
export function addRock(r) {
  ROCK_LIST.push(r);
  const R = Math.max(r.rx, r.rz) * 1.05;
  for (let i = Math.floor((r.x - R) / CELL); i <= Math.floor((r.x + R) / CELL); i++)
    for (let j = Math.floor((r.z - R) / CELL); j <= Math.floor((r.z + R) / CELL); j++) {
      const kk = key(i, j); if (!grid.has(kk)) grid.set(kk, []); grid.get(kk).push(r);
    }
}
// Altura de la cara superior de las rocas en (x,z), o -Infinity si no hay roca
export function rockTop(x, z) {
  const cell = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
  let top = -Infinity;
  if (!cell) return top;
  for (const r of cell) {
    const dx = x - r.x, dz = z - r.z, c = Math.cos(r.yaw), s = Math.sin(r.yaw);
    const lx = (dx * c - dz * s) / r.rx, lz = (dx * s + dz * c) / r.rz, u = lx * lx + lz * lz;
    if (u < 1) top = Math.max(top, r.cy + r.ry * Math.sqrt(1 - u));
  }
  return top;
}
export const groundAt = (x, z) => Math.max(heightAt(x, z), rockTop(x, z));
// Cuánto sobresale una roca sobre el terreno natural (-Infinity si no hay)
export const rockExcess = (x, z) => rockTop(x, z) - heightAt(x, z);
import { fbm, mulberry32 } from './noise.js';

export function createRocks(count = 420) {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(0.65 + 0.7 * fbm(v.x * 1.7 + 5, v.y * 1.7 + v.z * 1.3, 3));
    v.y *= 0.75;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = mesh.receiveShadow = true;

  grid = new Map(); ROCK_LIST.length = 0;
  const rnd = mulberry32(42);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const s = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    // más densidad cerca de la cámara (cámara en z≈40)
    const near = i < count * 0.4;
    let x = (rnd() - 0.5) * (near ? 90 : 360);
    let z = near ? 40 - rnd() * 60 : 60 - rnd() * 360;
    if (Math.hypot(x - START.x, z - START.z) < 14) { x += 30; z -= 30; } // despejar la salida
    const size = (near ? 0.3 : 0.6) + Math.pow(rnd(), 3) * (near ? 2.6 : 5);
    pos.set(x, heightAt(x, z) + size * 0.15, z);
    e.set(rnd() * 0.5, rnd() * Math.PI * 2, rnd() * 0.5);
    q.setFromEuler(e);
    s.set(size * (0.8 + rnd() * 0.6), size * (0.7 + rnd() * 0.5), size * (0.8 + rnd() * 0.6));
    addRock({ x, z, cy: pos.y, rx: s.x, rz: s.z, ry: 0.75 * s.y, yaw: e.y });
    m.compose(pos, q, s);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.setHSL(0.03 + rnd() * 0.03, 0.35 + rnd() * 0.2, 0.16 + rnd() * 0.14));
  }
  return mesh;
}
