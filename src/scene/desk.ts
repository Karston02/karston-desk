import * as THREE from 'three';
import { COLORS, LIGHTS } from './config';
import { at, austinTime, box, canvasTex, cyl, flatGlow, glow, mat, rod, type Frame, type Part, type Quality, type Register } from './helpers';

export interface Desk extends Part {
  pressKey(key: string): void;
  quack(): void;
  /** Returns true when the phone starts buzzing this frame (so a sound can play). */
  buzzed(): boolean;
  /**
   * Screen brightness. Dark screens (terminal, games) can glow; light screens
   * (project previews) must stay under the bloom threshold or they wash out.
   */
  setScreenLevel(level: number): void;
}

/** Brightness for dark screen content (terminal, games). */
export const SCREEN_GLOW = 1.08;
/** Brightness for light screen content, kept below BLOOM.threshold. */
export const SCREEN_LIGHT = 0.78;

export function buildDesk(scene: THREE.Scene, register: Register, screenCanvas: HTMLCanvasElement, q: Quality): Desk & { screenTexture: THREE.CanvasTexture } {
  const frameM = mat(COLORS.frame, { roughness: 0.5, metalness: 0.3 });

  /* Desk */
  scene.add(at(box(7, 0.22, 3.2, mat(0x9c653e, { roughness: 0.5 })), 0, -0.11, 0));
  scene.add(at(box(7.02, 0.04, 3.22, mat(0x7c4e30, { roughness: 0.5 })), 0, -0.235, 0));
  const legM = mat(0x2a2e44, { roughness: 0.35, metalness: 0.6 });
  [
    [-3.3, -1.4],
    [3.3, -1.4],
    [-3.3, 1.4],
    [3.3, 1.4],
  ].forEach(([x, z]) => scene.add(at(box(0.12, 2.4, 0.12, legM), x, -1.45, z)));
  scene.add(at(box(2.6, 0.012, 1.1, mat(0x262a3c, { roughness: 0.95 })), 0, 0.006, 0.55));

  /* Monitor */
  const mon = new THREE.Group();
  const dark = mat(0x1d2029, { roughness: 0.35, metalness: 0.5 });
  mon.add(at(box(0.9, 0.05, 0.55, dark), 0, 0.025, -0.75));
  mon.add(at(box(0.12, 0.85, 0.08, dark), 0, 0.45, -0.9));
  mon.add(at(box(2.75, 1.66, 0.09, dark), 0, 1.26, -0.85));
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = 8;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false });
  screenMat.color.setScalar(SCREEN_GLOW);
  mon.add(at(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.523), screenMat), 0, 1.26, -0.801));
  (
    [
      // stuck to the bezel edges, hanging off the side so they never cover the screen
      ['spec first', '#F6E27A', 1.47, 1.82, -0.1],
      ['ship it', '#FF9EC4', -1.47, 0.66, 0.12],
    ] as const
  ).forEach(([txt, col, x, y, r]) => {
    const n = canvasTex(128, 128);
    n.g.fillStyle = col;
    n.g.fillRect(0, 0, 128, 128);
    n.g.fillStyle = '#3A3020';
    n.g.font = '30px Yellowtail, cursive';
    n.g.textAlign = 'center';
    n.g.fillText(txt, 64, 74);
    n.t.needsUpdate = true;
    const m = at(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshStandardMaterial({ map: n.t, roughness: 0.9 })), x, y, -0.795);
    m.rotation.z = r;
    mon.add(m);
  });
  scene.add(mon);
  register('projects', 'monitor → Projects', mon, 'lift');
  // bias-light halo behind the monitor
  const screenGlow = at(flatGlow(COLORS.screen, 4.4, 2.9, 0.14), 0, 1.26, -0.93);
  scene.add(screenGlow);
  const screenLight = at(new THREE.PointLight(COLORS.screen, LIGHTS.screen, 5, 2), 0, 1.2, -0.2);
  scene.add(screenLight);

  /* Keyboard that reacts to typing */
  scene.add(at(box(1.9, 0.06, 0.7, mat(0x262a38, { roughness: 0.45, metalness: 0.2 })), 0.02, 0.03, 0.55));
  type Key = { m: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>; t: number };
  const keys: Record<string, Key> = {};
  const keyMat = mat(0x383d52, { roughness: 0.55 });
  const addKey = (id: string, w: number, x: number, z: number) => {
    const m = at(box(w, 0.035, 0.1, keyMat.clone(), false), x, 0.078, z) as Key['m'];
    scene.add(m);
    keys[id] = { m, t: 0 };
  };
  ['1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./'].forEach((row, r) => [...row].forEach((ch, i) => addKey(ch, 0.1, -0.69 + r * 0.03 + i * 0.12, 0.3 + r * 0.12)));
  addKey(' ', 0.62, 0, 0.78);
  addKey('Enter', 0.2, 0.72, 0.54);
  addKey('Backspace', 0.2, 0.8, 0.3);
  const shifted: Record<string, string> = { '!': '1', '@': '2', '#': '3', $: '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', _: '-', '+': '=', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/', '{': '[', '}': ']' };
  const mouse = at(new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), mat(0x2b2f3e, { roughness: 0.3 })), 1.15, 0.04, 0.6);
  mouse.scale.set(0.9, 0.45, 1.4);
  mouse.castShadow = true;
  scene.add(mouse);

  /* Mug: about */
  const mug = new THREE.Group();
  const mugM = mat(0xe9e1d2, { roughness: 0.35 });
  mug.add(at(cyl(0.22, 0.2, 0.46, mugM), 0, 0.23, 0));
  const handle = at(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 12, 24, Math.PI), mugM), 0.22, 0.25, 0);
  handle.rotation.z = -Math.PI / 2;
  handle.castShadow = true;
  mug.add(handle);
  mug.add(at(cyl(0.19, 0.19, 0.01, mat(0x3a2516, { roughness: 0.15 })), 0, 0.42, 0));
  mug.add(at(cyl(0.222, 0.222, 0.07, mat(COLORS.lamp, { roughness: 0.4 })), 0, 0.3, 0));
  at(mug, 1.85, 0, 0.35);
  scene.add(mug);
  register('about', 'mug → About', mug, 'lift');
  const steam = Array.from({ length: 9 }, (_, i) => {
    const s = glow(0xffffff, 0.25, 0);
    s.material.blending = THREE.NormalBlending;
    s.userData.p = i / 9;
    scene.add(s);
    return s;
  });

  /* Notebook: résumé */
  const nb = new THREE.Group();
  nb.add(at(box(0.95, 0.07, 1.25, mat(0x3e6e68, { roughness: 0.8 })), 0, 0.035, 0));
  nb.add(at(box(0.9, 0.05, 1.2, mat(0xf3eee2, { roughness: 0.9 })), 0.02, 0.03, 0));
  nb.add(at(box(0.05, 0.075, 1.26, mat(0x1e2230)), 0.32, 0.04, 0));
  const pen = at(cyl(0.025, 0.025, 1.0, mat(COLORS.lamp, { metalness: 0.5, roughness: 0.3 }), 12), 0.1, 0.1, 0.2);
  pen.rotation.z = Math.PI / 2;
  pen.rotation.y = 0.4;
  nb.add(pen);
  at(nb, -1.95, 0, 0.6);
  nb.rotation.y = 0.35;
  scene.add(nb);
  register('resume', 'notebook → Résumé', nb, 'lift');

  /* Phone: contact. Buzzes every so often. */
  const phone = new THREE.Group();
  phone.add(at(box(0.38, 0.04, 0.76, mat(0x15171f, { roughness: 0.25, metalness: 0.5 })), 0, 0.02, 0));
  const ph = canvasTex(160, 320);
  const drawPhone = (lit: boolean) => {
    const g = ph.g;
    g.fillStyle = lit ? '#1E2A48' : '#0B0D14';
    g.fillRect(0, 0, 160, 320);
    if (lit) {
      g.fillStyle = '#E8ECFF';
      g.font = '700 40px "Space Mono", monospace';
      g.textAlign = 'center';
      g.fillText(austinTime().text, 80, 90);
      g.fillStyle = 'rgba(255,255,255,.12)';
      g.fillRect(12, 140, 136, 56);
      g.fillStyle = '#F6B85C';
      g.fillRect(22, 152, 18, 18);
      g.fillStyle = '#E8ECFF';
      g.font = '15px Karla, sans-serif';
      g.textAlign = 'left';
      g.fillText('New message', 48, 165);
      g.fillStyle = '#A3A0B2';
      g.fillText('Say hello →', 48, 184);
    }
    ph.t.needsUpdate = true;
  };
  drawPhone(false);
  const phScreen = at(new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.7), new THREE.MeshBasicMaterial({ map: ph.t, toneMapped: false })), 0, 0.042, 0);
  phScreen.rotation.x = -Math.PI / 2;
  phone.add(phScreen);
  const phGlow = at(flatGlow(0x9fb0ff, 1.3, 1.3, 0), 2.6, 0.012, 0.9);
  phGlow.rotation.x = -Math.PI / 2;
  scene.add(phGlow);
  at(phone, 2.6, 0, 0.9);
  phone.rotation.y = -0.4;
  scene.add(phone);
  register('contact', 'phone → Contact', phone, 'lift');

  /* Rubber duck (debugging, obviously) */
  const duck = new THREE.Group();
  const yellow = mat(0xffd23f, { roughness: 0.35 });
  const dBody = at(new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), yellow), 0, 0.15, 0);
  dBody.scale.set(1.25, 0.85, 1);
  dBody.castShadow = true;
  duck.add(dBody);
  const dHead = at(new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), yellow), 0.12, 0.33, 0);
  dHead.castShadow = true;
  duck.add(dHead);
  const beak = at(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 16), mat(0xf2843a, { roughness: 0.4 })), 0.25, 0.31, 0);
  beak.rotation.z = -Math.PI / 2;
  duck.add(beak);
  [-0.05, 0.05].forEach(z => duck.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), mat(0x111111, { roughness: 0.2 })), 0.2, 0.37, z)));
  const tail = at(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 12), yellow), -0.22, 0.22, 0);
  tail.rotation.z = Math.PI / 2.6;
  duck.add(tail);
  at(duck, 1.0, 0, 1.25);
  duck.rotation.y = -0.9;
  scene.add(duck);
  register('duck', 'rubber duck → debug', duck, 'lift');
  let hop = 0;

  /* Plant */
  scene.add(at(cyl(0.26, 0.2, 0.45, mat(0xc9774e, { roughness: 0.9 })), 3.15, 0.225, -0.85));
  const leafM = mat(0x5e9a6c, { roughness: 0.8, flatShading: true });
  const leaves = (
    [
      [0, 0.75, 0, 0.3],
      [0.2, 0.62, 0.1, 0.22],
      [-0.17, 0.66, -0.06, 0.24],
      [0.05, 0.98, -0.05, 0.2],
      [-0.08, 0.88, 0.12, 0.17],
    ] as const
  ).map(([x, y, z, r]) => {
    const l = at(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leafM), 3.15 + x, y, -0.85 + z);
    l.castShadow = true;
    scene.add(l);
    return l;
  });

  /* Lamp */
  const lamp = new THREE.Group();
  const lampM = mat(0x2e3248, { roughness: 0.3, metalness: 0.7 });
  const LB = new THREE.Vector3(-2.3, 0.06, -1.05);
  const LE = new THREE.Vector3(-2.1, 1.5, -0.95);
  const SHADE = new THREE.Vector3(-1.72, 1.9, -0.5);
  const TARGET = new THREE.Vector3(-0.6, 0, 0.45);
  const dir = SHADE.clone().sub(TARGET).normalize();
  lamp.add(at(cyl(0.3, 0.34, 0.06, lampM), LB.x, 0.03, LB.z));
  lamp.add(rod(LB, LE, 0.03, lampM));
  lamp.add(rod(LE, SHADE, 0.028, lampM));
  lamp.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), lampM), LE.x, LE.y, LE.z));
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 32, 1, true), mat(COLORS.lamp, { side: THREE.DoubleSide, roughness: 0.35, emissive: 0x6a4010 }));
  shade.position.copy(SHADE);
  shade.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  lamp.add(shade);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe2b0, toneMapped: false });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), bulbMat);
  bulb.position.copy(SHADE).addScaledVector(dir, -0.14);
  lamp.add(bulb);
  scene.add(lamp);
  register('lamp', 'lamp → toggle light', lamp, 'lift');
  const bulbGlow = glow(COLORS.warm, 1.4, 0.8);
  bulbGlow.position.copy(bulb.position);
  scene.add(bulbGlow);
  const spot = new THREE.SpotLight(COLORS.warm, LIGHTS.lampSpot, 0, 0.95, 0.6, 2);
  spot.position.copy(bulb.position);
  spot.target.position.copy(TARGET);
  scene.add(spot, spot.target);
  spot.castShadow = true;
  spot.shadow.mapSize.set(q.shadowSize, q.shadowSize);
  spot.shadow.bias = -0.0012;
  spot.shadow.normalBias = 0.02;
  // Volumetric-looking beam: brightest near the bulb, fading toward the desk and toward its silhouette edges.
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(COLORS.warm) }, opacity: { value: 0.32 } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color; uniform float opacity;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        float facing = pow(abs(dot(normalize(vN), normalize(vV))), 1.4);
        float fall = pow(vUv.y, 1.3);
        gl_FragColor = vec4(color * opacity * facing * fall, 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.35, SHADE.distanceTo(TARGET), 40, 1, true), beamMat);
  beam.position.copy(SHADE).add(TARGET).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  scene.add(beam);

  /* Dust in the beam */
  const DUST = q.low ? 80 : 160;
  const dustPos = new Float32Array(DUST * 3);
  const seeds = Array.from({ length: DUST }, () => {
    const s = Math.random();
    return [s, Math.random() * 0.9 * s, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2];
  });
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.025, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  scene.add(new THREE.Points(dustGeo, dustMat));
  const perpA = new THREE.Vector3(1, 0, 0).cross(dir).normalize();
  const perpB = dir.clone().cross(perpA).normalize();
  const tmp = new THREE.Vector3();

  let buzz = 0;
  let nextBuzz = 8;
  let justBuzzed = false;
  const one = new THREE.Vector3(1, 1, 1);
  const duckBaseY = duck.position.y;

  return {
    screenTexture,
    pressKey(key: string) {
      const k = keys[key] ?? keys[key.toLowerCase()] ?? keys[shifted[key] ?? ''];
      if (k) k.t = 1;
    },
    quack() {
      hop = 1;
    },
    setScreenLevel(level: number) {
      screenMat.color.setScalar(level);
    },
    buzzed() {
      const b = justBuzzed;
      justBuzzed = false;
      return b;
    },
    update(f: Frame) {
      const { t, dt, lamp: L, reduced } = f;
      // lamp
      spot.intensity = LIGHTS.lampSpot * L * (reduced ? 1 : 1 + Math.sin(t * 1.3) * 0.015);
      bulbGlow.material.opacity = 0.85 * L;
      beamMat.uniforms.opacity.value = 0.32 * L;
      dustMat.opacity = 0.75 * L;
      bulbMat.color.setRGB(0.25 + 2.2 * L, 0.22 + 1.9 * L, 0.2 + 1.4 * L);
      const night = 1 - L;
      screenLight.intensity = LIGHTS.screen * (1 + night * 0.6);
      screenGlow.material.opacity = 0.1 + night * 0.1;

      // keys spring back
      for (const k of Object.values(keys)) {
        if (k.t > 0) k.t = Math.max(0, k.t - dt * 5);
        k.m.position.y = 0.078 - k.t * 0.02;
        k.m.material.emissive.setRGB(k.t * 0.5, k.t * 0.33, k.t * 0.1);
      }

      // duck hop and flip
      if (hop > 0) {
        hop = Math.max(0, hop - dt * 1.35);
        const p = 1 - hop;
        duck.position.y = duckBaseY + Math.sin(p * Math.PI) * 0.45;
        duck.rotation.y = -0.9 + p * Math.PI * 2;
        const sq = 1 + Math.sin(p * Math.PI * 2) * 0.12;
        duck.scale.set(1 / sq, sq, 1 / sq);
      } else duck.scale.lerp(one, 0.2);

      // dust drifting down the beam
      for (let i = 0; i < DUST; i++) {
        const [s, r, a, ph] = seeds[i];
        const ss = (s + (reduced ? 0 : t * 0.01)) % 1;
        const aa = a + (reduced ? 0 : t * 0.15 + Math.sin(t * 0.5 + ph) * 0.2);
        const rr = r * (0.3 + ss);
        tmp.copy(SHADE).lerp(TARGET, ss * 0.95);
        const c = Math.cos(aa) * rr;
        const sn = Math.sin(aa) * rr;
        dustPos[i * 3] = tmp.x + perpA.x * c + perpB.x * sn;
        dustPos[i * 3 + 1] = tmp.y + perpA.y * c + perpB.y * sn + Math.sin(t + ph) * 0.02;
        dustPos[i * 3 + 2] = tmp.z + perpA.z * c + perpB.z * sn;
      }
      dustGeo.attributes.position.needsUpdate = true;

      // steam
      for (const s of steam) {
        const p = (s.userData.p + (reduced ? 0 : t * 0.18)) % 1;
        s.position.set(mug.position.x + Math.sin(p * 6 + s.userData.p * 10) * 0.06, mug.position.y + 0.45 + p * 0.9, mug.position.z + Math.cos(p * 5) * 0.04);
        const sc = 0.18 + p * 0.45;
        s.scale.set(sc, sc, 1);
        s.material.opacity = reduced ? 0.08 : Math.sin(p * Math.PI) * 0.16;
      }

      // phone
      if (t > nextBuzz) {
        buzz = 1;
        justBuzzed = true;
        nextBuzz = t + 14 + Math.random() * 10;
        drawPhone(true);
      }
      if (buzz > 0) {
        buzz -= dt * 0.36;
        const shake = buzz > 0.75 && !reduced ? Math.sin(t * 90) * 0.012 : 0;
        phone.position.x = 2.6 + shake;
        phone.rotation.y = -0.4 + shake * 2;
        phGlow.material.opacity = Math.min(1, buzz * 2) * 0.35;
        if (buzz <= 0) drawPhone(false);
      }

      if (!reduced) leaves.forEach((l, i) => (l.rotation.z = Math.sin(t * 0.8 + i) * 0.04));
    },
  };
}
