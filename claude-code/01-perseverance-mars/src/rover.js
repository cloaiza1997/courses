import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { heightAt, START } from './terrain.js';
import { splitWheels } from './wheels.js';
import { groundAt, rockExcess } from './rocks.js';

const LENGTH = 3.0;            // m: largo real del chasis de Perseverance
const WHEEL_W = 0.42;          // m: ancho de la huella
const STEP = 0.35;             // m entre marcas de huella
const MAX_STAMPS = 12000;
const CLIMB = 0.45;           // m: altura máxima de roca que las ruedas pueden subir
const MAX_SPEED = 5, MAX_REVERSE = 3, TURN_RATE = 1.1, LIMIT = 320;

const CAM_RE = /cam|watson|lens|look/i;
const NOT_CAM_RE = /cover|wiring|microphone|bracket/i;

const up = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();

// Orientación con eje Y = normal del terreno y frente = f proyectado sobre el plano
function orient(f, n, out) {
  const fwd = f.clone().addScaledVector(n, -f.dot(n)).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, n);
  return out.setFromRotationMatrix(_m.makeBasis(right, n, fwd.clone().negate()));
}

function normalAt(x, z, out, e = 0.6) {
  return out.set(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
}

function treadTexture() {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const cx = cv.getContext('2d');
  cx.fillStyle = 'rgba(45,18,8,0.6)'; cx.fillRect(0, 0, 64, 64);
  cx.globalCompositeOperation = 'destination-out';
  cx.fillStyle = 'rgba(0,0,0,0.55)';
  for (let y = 4; y < 64; y += 16) { cx.fillRect(6, y, 52, 4); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function createRover(scene) {
  const draco = new DRACOLoader().setDecoderPath('/draco/');
  const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync('/models/perseverance.glb');
  const model = gltf.scene;

  // Nombres de las piezas que son cámaras (los usaremos más adelante)
  const cams = [];
  model.traverse(o => { if (o.name && CAM_RE.test(o.name) && !NOT_CAM_RE.test(o.name)) cams.push(o.name); });
  console.log(`[cámaras] ${cams.length} piezas: ${cams.join(', ')}`);

  const split = splitWheels(model);

  model.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });

  // Orientar: el frente (hazcams frontales) debe mirar a -Z
  const inner = new THREE.Group(); inner.add(model);
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  const center = box.getCenter(new THREE.Vector3());
  const front = model.getObjectByName('hazcams_front');
  if (front) {
    const fc = new THREE.Box3().setFromObject(front).getCenter(new THREE.Vector3()).sub(center);
    const phi = Math.atan2(fc.x, fc.z);
    inner.rotation.y = Math.round((Math.PI - phi) / (Math.PI / 2)) * (Math.PI / 2);
  }
  // Escala real (1 unidad = 1 m) y apoyar sobre el suelo, centrado
  inner.updateMatrixWorld(true);
  let b = new THREE.Box3().setFromObject(inner);
  const size = b.getSize(new THREE.Vector3());
  const k = LENGTH / Math.max(size.x, size.z);
  inner.scale.setScalar(k);
  inner.updateMatrixWorld(true);
  b = new THREE.Box3().setFromObject(inner);
  const c = b.getCenter(new THREE.Vector3());
  inner.position.set(-c.x, -b.min.y, -c.z);
  const fin = b.getSize(new THREE.Vector3());
  console.log(`[rover] tamaño final: ${fin.x.toFixed(2)} x ${fin.y.toFixed(2)} x ${fin.z.toFixed(2)} m (x,y,z), escala ${k.toFixed(4)}, rotY ${inner.rotation.y.toFixed(2)}`);

  const rover = new THREE.Group();
  rover.add(inner);
  scene.add(rover);
  inner.updateMatrix();

  // Puntos de las cámaras sobre el modelo (en el espacio del rover, para seguirlo al moverse)
  const CAM_PARTS = { mastcam: 'Mastcam_Z_cams', navcam: 'NavCams', hazcam: 'hazcams_front', watson: 'WATSON' };
  const cameraPoints = {};
  for (const [key, name] of Object.entries(CAM_PARTS)) {
    const part = model.getObjectByName(name);
    if (part) cameraPoints[key] = rover.worldToLocal(new THREE.Box3().setFromObject(part).getCenter(new THREE.Vector3()));
    else console.warn('[cámaras] no encontré la pieza', name);
  }

  // Ruedas: posición real respecto al chasis (lat = derecha, along = hacia delante), radio en metros
  const axle = new THREE.Vector3(1, 0, 0).applyAxisAngle(up, -inner.rotation.y); // eje X del mundo, en el espacio del modelo
  const wheels = split.map(w => {
    const r = w.center.clone().applyMatrix4(inner.matrix);
    return {
      pivot: w.pivot, base: w.pivot.position.clone(), lat: r.x, along: -r.z, radius: w.radius * k,
      spin: 0, steer: 0, offset: 0, vel: 0,
    };
  });
  console.log(`[ruedas] ${wheels.length} detectadas, radio ${wheels.map(w => w.radius.toFixed(2)).join(', ')} m`);
  const qSpin = new THREE.Quaternion(), qSteer = new THREE.Quaternion();

  // Huellas
  const tread = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(WHEEL_W, STEP * 1.3).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: treadTexture(), transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    }),
    MAX_STAMPS
  );
  tread.count = 0; tread.frustumCulled = false;
  scene.add(tread);

  const state = { x: START.x, z: START.z, yaw: 0, speed: 0, stamps: 0, sinceStamp: 0 };
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), n = new THREE.Vector3();
  const qTarget = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);

  function stamp() {
    for (const w of wheels) {
      const x = state.x + fwd.x * w.along + right.x * w.lat;
      const z = state.z + fwd.z * w.along + right.z * w.lat;
      if (rockExcess(x, z) > 0) continue; // no marcar encima de una roca
      p.set(x, heightAt(x, z) + 0.04, z);
      normalAt(x, z, n);
      _m.compose(p, orient(fwd, n, new THREE.Quaternion()), one);
      tread.setMatrixAt(state.stamps % MAX_STAMPS, _m);
      state.stamps++;
    }
    tread.count = Math.min(state.stamps, MAX_STAMPS);
    tread.instanceMatrix.needsUpdate = true;
  }

  // Colisiones con rocas: una roca que sobresale más de CLIMB (≈ diámetro de rueda) sobre el terreno
  // no se puede subir y bloquea; las más bajas se suben con las ruedas.
  const foot = [];
  for (const w of wheels) foot.push({ along: w.along, lat: w.lat, r: 0.3 });
  for (const [along, lat] of [[1.55, 0], [-1.55, 0], [1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95], [0, 1.3], [0, -1.3]]) foot.push({ along, lat, r: 0.12 });
  const RING = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function blockedAt(x, z, yaw) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    for (const c of foot) {
      const px = x + fx * c.along + rx * c.lat, pz = z + fz * c.along + rz * c.lat;
      if (rockExcess(px, pz) > CLIMB) return true;
      for (const [dx, dz] of RING) if (rockExcess(px + dx * c.r, pz + dz * c.r) > CLIMB) return true;
    }
    return false;
  }
  const meanA = wheels.reduce((s, w) => s + w.along, 0) / wheels.length, meanL = wheels.reduce((s, w) => s + w.lat, 0) / wheels.length;
  const varA = wheels.reduce((s, w) => s + (w.along - meanA) ** 2, 0), varL = wheels.reduce((s, w) => s + (w.lat - meanL) ** 2, 0);

  function update(dt, keys) {
    const drive = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const turn = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
    const target = drive > 0 ? MAX_SPEED : drive < 0 ? -MAX_REVERSE : 0;
    state.speed += (target - state.speed) * Math.min(1, dt * 3);
    let yawRate = turn * TURN_RATE * (drive === 0 ? 0.6 : 1) * (drive < 0 ? -1 : 1);
    const newYaw = state.yaw + yawRate * dt;
    if (!blockedAt(state.x, state.z, newYaw)) state.yaw = newYaw; else yawRate = 0;

    fwd.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    const d = state.speed * dt;
    const nx = THREE.MathUtils.clamp(state.x + fwd.x * d, -LIMIT, LIMIT), nz = THREE.MathUtils.clamp(state.z + fwd.z * d, -LIMIT, LIMIT);
    const px = state.x, pz = state.z;
    let hit = false;
    if (!blockedAt(nx, nz, state.yaw)) { state.x = nx; state.z = nz; }
    else if (!blockedAt(nx, state.z, state.yaw)) { state.x = nx; hit = true; }
    else if (!blockedAt(state.x, nz, state.yaw)) { state.z = nz; hit = true; }
    else hit = true;
    state.hitT = hit ? 0.3 : Math.max(0, (state.hitT || 0) - dt);
    state.blocked = state.hitT > 0;
    // velocidad real conseguida (las ruedas dejan de avanzar si chocan con una roca grande)
    const moved = (state.x - px) * fwd.x + (state.z - pz) * fwd.z;
    if (hit && dt > 0) state.speed = moved / dt;

    // Contacto de cada rueda con el suelo (terreno + rocas) y plano del chasis ajustado por mínimos cuadrados
    let meanH = 0;
    for (const w of wheels) {
      const wx = state.x + fwd.x * w.along + right.x * w.lat, wz = state.z + fwd.z * w.along + right.z * w.lat;
      const e = w.radius * 0.7;
      w.h = Math.max(groundAt(wx, wz), groundAt(wx + fwd.x * e, wz + fwd.z * e), groundAt(wx - fwd.x * e, wz - fwd.z * e));
      meanH += w.h / wheels.length;
    }
    let cf = 0, cr = 0;
    for (const w of wheels) { cf += (w.along - meanA) * (w.h - meanH); cr += (w.lat - meanL) * (w.h - meanH); }
    const sf = THREE.MathUtils.clamp(cf / varA, -0.8, 0.8), sr = THREE.MathUtils.clamp(cr / varL, -0.8, 0.8);
    n.set(0, 1, 0).addScaledVector(fwd, -sf).addScaledVector(right, -sr).normalize();
    const targetY = meanH - sf * meanA - sr * meanL + 0.03;
    // Chasis sobre la suspensión: muelle amortiguado (rebota un poco al pasar baches)
    if (state.y === undefined) { state.y = targetY; state.vy = 0; }
    else if (dt > 0) {
      state.vy += ((targetY - state.y) * 90 - state.vy * 14) * dt;
      state.y = THREE.MathUtils.clamp(state.y + state.vy * dt, targetY - 0.5, targetY + 0.5);
    }
    rover.position.set(state.x, state.y, state.z);
    rover.quaternion.slerp(orient(fwd, n, qTarget), Math.min(1, dt * 8));

    // Ruedas: giran según la velocidad de su lado (diferencial), las de las esquinas giran (dirección),
    // y cada una sube/baja con su propio muelle según el terreno que pisa.
    const steerTarget = THREE.MathUtils.clamp(turn, -1, 1) * 0.5;
    for (const w of wheels) {
      const planeY = state.y + sf * w.along + sr * w.lat;
      const want = THREE.MathUtils.clamp(w.h - planeY, -0.4, 0.4);
      if (dt > 0) {
        w.vel += ((want - w.offset) * 140 - w.vel * 18) * dt;
        w.offset += w.vel * dt;
        w.spin += ((state.speed + yawRate * w.lat) * dt) / w.radius;
        if (Math.abs(w.along) > 0.5) w.steer += ((w.along > 0 ? steerTarget : -steerTarget) - w.steer) * Math.min(1, dt * 6);
      }
      qSpin.setFromAxisAngle(axle, -w.spin);
      qSteer.setFromAxisAngle(up, w.steer);
      w.pivot.quaternion.copy(qSteer).multiply(qSpin);
      w.pivot.position.set(w.base.x, w.base.y + w.offset / k, w.base.z);
    }

    state.sinceStamp += Math.abs(moved);
    while (state.sinceStamp >= STEP) { state.sinceStamp -= STEP; stamp(); }
  }

  return { object: rover, state, wheels, cameraPoints, forward: fwd, update };
}
