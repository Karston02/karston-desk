import * as THREE from 'three';
import { at, canvasTex, mat, type Frame, type Part, type Register } from './helpers';

export interface Cat extends Part {
  wake(): boolean;
  readonly asleep: boolean;
}

/** Keys on the 3D keyboard, matching desk.ts, so the cat's paws press real keys. */
const ROWS = ['1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./'];
const keyAt = (x: number, z: number): string | null => {
  const r = Math.round((z - 0.3) / 0.12);
  if (r < 0 || r >= ROWS.length) return null;
  const i = Math.round((x - (-0.69 + r * 0.03)) / 0.12);
  return ROWS[r][i] ?? null;
};

const HOME = new THREE.Vector3(-1.15, 0, -0.35);
// Walk: off the bed, up onto the keyboard, across it, down, back behind the keyboard, home.
const PATH = [
  HOME,
  new THREE.Vector3(-1.1, 0, 0.55),
  new THREE.Vector3(-0.93, 0.1, 0.56),
  new THREE.Vector3(0.95, 0.1, 0.56),
  new THREE.Vector3(1.25, 0, 0.12),
  new THREE.Vector3(0.65, 0, -0.3),
  HOME.clone(),
];
const KEYBOARD_SEGMENT = 2; // PATH[2] -> PATH[3]
const SPEED = 0.55;

type State = 'sleep' | 'wake' | 'walk' | 'settle';

export function buildCat(
  scene: THREE.Scene,
  register: Register,
  hooks: { onKey: (key: string) => void; onCrossed: () => void },
): Cat {
  const fur = mat(0xd9883f, { roughness: 0.85 });
  const cream = mat(0xf2e2c4, { roughness: 0.85 });
  const dark = mat(0x1a1410, { roughness: 0.3 });
  const pink = mat(0xe89a9a, { roughness: 0.6 });

  const cat = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), fur);
  body.castShadow = true;
  cat.add(body);
  const belly = at(new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), cream), 0.04, -0.04, 0);
  body.add(belly);

  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), fur);
  skull.castShadow = true;
  head.add(skull);
  head.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), cream), 0.085, -0.035, 0));
  head.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), pink), 0.14, -0.015, 0));
  const ears = [-1, 1].map(s => {
    const e = at(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 12), fur), 0.0, 0.11, s * 0.065);
    e.rotation.x = s * 0.35;
    head.add(e);
    return e;
  });
  const eyes = [-1, 1].map(s => {
    const e = at(new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), dark), 0.1, 0.03, s * 0.045);
    head.add(e);
    return e;
  });
  cat.add(head);

  // legs pivot at the hip so they can swing
  const legs = (
    [
      [0.13, 0.08],
      [0.13, -0.08],
      [-0.13, 0.08],
      [-0.13, -0.08],
    ] as const
  ).map(([x, z], i) => {
    const pivot = at(new THREE.Group(), x, 0, z);
    const leg = at(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.16, 10), fur), 0, -0.08, 0);
    leg.castShadow = true;
    pivot.add(leg);
    pivot.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), cream), 0, -0.16, 0));
    pivot.userData.phase = i === 0 || i === 3 ? 0 : Math.PI;
    cat.add(pivot);
    return pivot;
  });

  const TAIL = 14;
  const tail = Array.from({ length: TAIL }, (_, i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.04 - i * 0.0012, 10, 8), i === TAIL - 1 ? cream : fur);
    s.castShadow = true;
    cat.add(s);
    return s;
  });

  // floating Zzz while asleep
  const zTex = canvasTex(64, 64);
  zTex.g.fillStyle = '#E6E1D6';
  zTex.g.font = '700 46px "Space Mono", monospace';
  zTex.g.textAlign = 'center';
  zTex.g.fillText('z', 32, 46);
  zTex.t.needsUpdate = true;
  const zs = [0, 1, 2].map(i => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex.t, transparent: true, opacity: 0, depthWrite: false }));
    s.userData.o = i / 3;
    scene.add(s);
    return s;
  });

  cat.position.copy(HOME);
  cat.rotation.y = 0.6;
  scene.add(cat);
  register('cat', 'cat → wake it up', cat, 'none');

  let state: State = 'sleep';
  let stateT = 0;
  let stand = 0; // 0 curled, 1 standing
  let seg = 0;
  let segT = 0;
  let walkPhase = 0;
  let lastKey = '';
  let keyTimer = 0;
  let nextBlink = 2;
  const tmp = new THREE.Vector3();
  const lerp = THREE.MathUtils.lerp;

  const pose = (t: number, walking: boolean) => {
    const sleepBreath = (1 - stand) * Math.sin(t * 1.6) * 0.03;
    body.scale.set(lerp(1.15, 1.45, stand), lerp(0.72, 0.78, stand) * (1 + sleepBreath), lerp(1.05, 0.85, stand));
    body.position.set(0, lerp(0.13, 0.25, stand) + (walking ? Math.abs(Math.sin(walkPhase)) * 0.012 : 0), 0);
    head.position.set(lerp(0.18, 0.36, stand), lerp(0.1, 0.36, stand), lerp(0.13, 0, stand));
    head.rotation.set(lerp(0.5, 0, stand), lerp(0.9, 0, stand), lerp(-0.45, walking ? Math.sin(walkPhase * 0.5) * 0.08 : 0, stand));
    legs.forEach(l => {
      l.position.y = lerp(0.1, 0.2, stand);
      l.scale.y = Math.max(0.01, stand);
      l.rotation.z = walking ? Math.sin(walkPhase + l.userData.phase) * 0.55 : 0;
    });
    // eyes: shut while asleep, blink now and then while awake
    const blink = stand > 0.5 && t > nextBlink && t < nextBlink + 0.12;
    if (t > nextBlink + 0.12) nextBlink = t + 2 + Math.random() * 3;
    eyes.forEach(e => e.scale.set(1, stand < 0.5 || blink ? 0.15 : 1, 1));
    ears.forEach(e => (e.rotation.z = Math.sin(t * 0.7) * 0.05 * stand));
    // tail: wrapped around the body when curled, up and swishing when standing
    tail.forEach((s, i) => {
      const k = i / (tail.length - 1);
      const a = Math.PI * (0.95 + k * 0.75);
      const curled = tmp.set(Math.cos(a) * 0.26, 0.06, -Math.sin(a) * 0.24);
      const sx = -0.28 - k * 0.12;
      const sy = 0.3 + k * 0.28 + Math.sin(t * 2 + k * 3) * 0.02;
      const sz = Math.sin(t * 2.4 + k * 2) * 0.05 * k;
      s.position.set(lerp(curled.x, sx, stand), lerp(curled.y, sy, stand), lerp(curled.z, sz, stand));
    });
  };

  return {
    get asleep() {
      return state === 'sleep';
    },
    wake() {
      if (state !== 'sleep') return false;
      state = 'wake';
      stateT = 0;
      return true;
    },
    update(f: Frame) {
      const { t, dt, reduced } = f;
      stateT += dt;
      let walking = false;
      if (state === 'wake') {
        stand = Math.min(1, stand + dt * 1.6);
        // stretch: long body, head down, after standing up
        if (stand >= 1 && !reduced) {
          const s = Math.sin(Math.min(1, (stateT - 0.6) / 1.2) * Math.PI);
          body.scale.x *= 1 + Math.max(0, s) * 0.18;
        }
        if (stateT > (reduced ? 0.7 : 2)) {
          state = 'walk';
          seg = 0;
          segT = 0;
        }
      } else if (state === 'walk') {
        walking = true;
        const a = PATH[seg];
        const b = PATH[seg + 1];
        const len = a.distanceTo(b);
        segT += (dt * SPEED) / Math.max(len, 0.001);
        const k = Math.min(1, segT);
        cat.position.lerpVectors(a, b, k);
        const yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
        let dy = yaw - cat.rotation.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        cat.rotation.y += dy * Math.min(1, dt * 8);
        walkPhase += dt * 11;
        if (seg === KEYBOARD_SEGMENT) {
          keyTimer -= dt;
          if (keyTimer <= 0) {
            keyTimer = 0.11;
            // alternate front paws
            const side = Math.sin(walkPhase) > 0 ? 0.07 : -0.07;
            const key = keyAt(cat.position.x + 0.13, cat.position.z + side);
            if (key && key !== lastKey) {
              hooks.onKey(key);
              lastKey = key;
            }
          }
        }
        if (k >= 1) {
          if (seg === KEYBOARD_SEGMENT) hooks.onCrossed();
          seg++;
          segT = 0;
          if (seg >= PATH.length - 1) {
            state = 'settle';
            stateT = 0;
          }
        }
      } else if (state === 'settle') {
        stand = Math.max(0, stand - dt * 1.2);
        let dy = 0.6 - cat.rotation.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        cat.rotation.y += dy * Math.min(1, dt * 3);
        if (stand <= 0) {
          state = 'sleep';
          lastKey = '';
        }
      }
      pose(t, walking);
      // Zzz
      const asleep = state === 'sleep' ? 1 : 0;
      zs.forEach(z => {
        const p = (z.userData.o + t * 0.25) % 1;
        z.position.set(cat.position.x + 0.15 + p * 0.15, cat.position.y + 0.35 + p * 0.45, cat.position.z + 0.1);
        const sc = 0.07 + p * 0.07;
        z.scale.set(sc, sc, 1);
        z.material.opacity = reduced ? 0 : asleep * Math.sin(p * Math.PI) * 0.8;
      });
    },
  };
}
