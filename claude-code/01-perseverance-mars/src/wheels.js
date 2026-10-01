import * as THREE from 'three';

// El GLB trae las 6 ruedas fusionadas en un solo objeto (Wheels_objs).
// Las separamos por triángulos (k-means sobre XZ, 6 centros) en 6 pivotes independientes
// para poder girarlas, orientarlas y moverlas por separado. Las geometrías se comparten (no se copian).
export function splitWheels(model) {
  const root = model.getObjectByName('Wheels_objs');
  if (!root) return [];
  model.updateMatrixWorld(true);
  const meshes = [];
  root.traverse(o => { if (o.isMesh) meshes.push(o); });

  const v = new THREE.Vector3();
  const tris = []; // { m, a, b, c, x, z }
  meshes.forEach((mesh, m) => {
    const pos = mesh.geometry.attributes.position, idx = mesh.geometry.index;
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i += 3) {
      const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2;
      let x = 0, z = 0;
      for (const j of [ia, ib, ic]) { v.fromBufferAttribute(pos, j).applyMatrix4(mesh.matrixWorld); x += v.x; z += v.z; }
      tris.push({ m, a: ia, b: ib, c: ic, x: x / 3, z: z / 3 });
    }
  });
  if (!tris.length) return [];

  // k-means: 2 lados x 3 ejes
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const t of tris) { minX = Math.min(minX, t.x); maxX = Math.max(maxX, t.x); minZ = Math.min(minZ, t.z); maxZ = Math.max(maxZ, t.z); }
  let centers = [];
  for (const x of [minX, maxX]) for (const z of [minZ, (minZ + maxZ) / 2, maxZ]) centers.push([x, z]);
  for (let it = 0; it < 10; it++) {
    const acc = centers.map(() => [0, 0, 0]);
    for (const t of tris) {
      let best = 0, bd = Infinity;
      centers.forEach((c, i) => { const d = (c[0] - t.x) ** 2 + (c[1] - t.z) ** 2; if (d < bd) { bd = d; best = i; } });
      t.k = best; acc[best][0] += t.x; acc[best][1] += t.z; acc[best][2]++;
    }
    centers = centers.map((c, i) => (acc[i][2] ? [acc[i][0] / acc[i][2], acc[i][1] / acc[i][2]] : c));
  }

  const wheels = [];
  const toLocal = new THREE.Matrix4(), mat = new THREE.Matrix4();
  centers.forEach((_, k) => {
    const mine = tris.filter(t => t.k === k);
    if (!mine.length) return;
    // centro y radio reales (caja de los vértices de esta rueda)
    const box = new THREE.Box3();
    for (const t of mine) for (const j of [t.a, t.b, t.c]) {
      const mesh = meshes[t.m];
      box.expandByPoint(v.fromBufferAttribute(mesh.geometry.attributes.position, j).applyMatrix4(mesh.matrixWorld));
    }
    const center = box.getCenter(new THREE.Vector3());
    const radius = (box.max.y - box.min.y) / 2;

    const pivot = new THREE.Group();
    pivot.name = `wheel_${k}`;
    pivot.position.copy(center);
    toLocal.makeTranslation(-center.x, -center.y, -center.z);
    meshes.forEach((mesh, m) => {
      const list = mine.filter(t => t.m === m);
      if (!list.length) return;
      const g = new THREE.BufferGeometry();
      for (const name in mesh.geometry.attributes) g.setAttribute(name, mesh.geometry.attributes[name]);
      g.setIndex(list.flatMap(t => [t.a, t.b, t.c]));
      const part = new THREE.Mesh(g, mesh.material);
      mat.multiplyMatrices(toLocal, mesh.matrixWorld).decompose(part.position, part.quaternion, part.scale);
      pivot.add(part);
    });
    wheels.push({ pivot, center, radius });
  });

  root.removeFromParent();
  for (const w of wheels) model.add(w.pivot);
  return wheels;
}
