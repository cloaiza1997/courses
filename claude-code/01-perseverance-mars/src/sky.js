import * as THREE from 'three';

export const SUN_DIR = new THREE.Vector3(-0.55, 0.2, -0.8).normalize();
export const HORIZON = new THREE.Color(0xf0b070);

export function createSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: {
      sunDir: { value: SUN_DIR },
      zenith: { value: new THREE.Color(0xa85a34) },
      mid: { value: new THREE.Color(0xd98f58) },
      horizon: { value: HORIZON },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir; uniform vec3 sunDir, zenith, mid, horizon;
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.25, h));
        col = mix(col, zenith, smoothstep(0.2, 0.9, h));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        col += vec3(1.0,0.62,0.30) * pow(s, 6.0) * 0.55;
        col += vec3(1.0,0.80,0.52) * pow(s, 40.0) * 0.6;
        col += vec3(1.0,0.95,0.80) * smoothstep(0.9988, 0.9994, s) * 2.0;
        col = mix(col, horizon * 1.05, (1.0 - smoothstep(0.0, 0.07, h)) * 0.8);
        if (d.y < 0.0) col = horizon;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), mat);
  sky.renderOrder = -1;
  return sky;
}

// Partículas de polvo flotando
export function createDust(n = 900) {
  const g = new THREE.BufferGeometry();
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([(Math.random() - 0.5) * 160, Math.random() * 28 + 1, 40 - Math.random() * 140], i * 3);
  g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const cx = cv.getContext('2d'); const gr = cx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,215,170,0.9)'); gr.addColorStop(1, 'rgba(255,215,170,0)');
  cx.fillStyle = gr; cx.fillRect(0, 0, 32, 32);
  const pts = new THREE.Points(g, new THREE.PointsMaterial({
    map: new THREE.CanvasTexture(cv), size: 0.7, transparent: true, opacity: 0.35, depthWrite: false, color: 0xffc890,
  }));
  pts.userData.update = t => { pts.position.x = Math.sin(t * 0.05) * 3; pts.position.y = Math.sin(t * 0.2) * 0.3; };
  return pts;
}
