import * as THREE from 'three';
import { fbm } from './noise.js';

export const SIZE = 700;

// Dunas asimétricas (ladera suave a barlovento, cara empinada a sotavento) + ondulación fina
export function heightAt(x, z) {
  const warp = (fbm(x * 0.008 + 10, z * 0.008 + 3, 3) - 0.5) * 60;
  const d = (x * 0.55 + z * 0.83 + warp) * 0.038;
  const s = d - Math.floor(d);
  const p = 0.72;
  const a = s < p ? s / p : (1 - s) / (1 - p);
  const dune = a * a * (3 - 2 * a);
  const amp = 2.5 + 7 * fbm(x * 0.006 - 4, z * 0.006 + 7, 3);
  const ripple = (fbm(x * 0.35, z * 0.35, 2) - 0.5) * 0.35;
  const plains = (fbm(x * 0.02, z * 0.02, 4) - 0.5) * 4;
  return dune * amp + ripple + plains;
}

export function createTerrain() {
  const seg = 280;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, seg, seg).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const nrm = geo.attributes.normal;
  const lo = new THREE.Color(0x8a3d22), mid = new THREE.Color(0xc2693a), hi = new THREE.Color(0xe8a36a);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = THREE.MathUtils.clamp((y + 2) / 11, 0, 1);
    c.copy(lo).lerp(mid, Math.min(t * 2, 1)).lerp(hi, Math.max(t * 2 - 1, 0));
    const grain = 0.88 + 0.24 * fbm(x * 0.5, z * 0.5, 2);
    c.multiplyScalar(grain * (0.85 + 0.15 * nrm.getY(i)));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  mesh.receiveShadow = true;
  return mesh;
}

// Punto de salida: zona lo más plana posible (para que el rover no nazca sobre una cresta)
export const START = (() => {
  let best = { x: 0, z: 30 }, bs = Infinity;
  for (let x = -30; x <= 30; x += 3) for (let z = 10; z <= 60; z += 3) {
    let s = 0;
    for (const [dx, dz] of [[6, 0], [-6, 0], [0, 6], [0, -6], [0, 14], [0, -14]]) s += Math.abs(heightAt(x + dx, z + dz) - heightAt(x, z));
    if (s < bs) { bs = s; best = { x, z }; }
  }
  return best;
})();
