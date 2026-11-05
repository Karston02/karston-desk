import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BLOOM, COLORS, LIGHTS } from './config';
import { buildDesk } from './desk';
import { buildRoom } from './room';
import { buildCat } from './cat';
import type { MonitorScreen } from './screens';
import { dateForPhase, skyAt, type SkyPhase, type SkyState } from './sky';
import type { Frame, HoverStyle, Quality } from './helpers';

export interface WorldOptions {
  canvas: HTMLCanvasElement;
  screen: MonitorScreen;
  reduced: boolean;
  onPick: (key: string) => void;
  onHover: (label: string | null, x: number, y: number) => void;
  onBuzz: () => void;
  /** Called when the lamp switches by itself (sunset/sunrise). */
  onAutoLamp: (on: boolean) => void;
  onCatKey: (key: string) => void;
  onCatCrossed: () => void;
}

export interface World {
  /** Moves the camera to a section (or home when null). */
  focus(key: string | null, panelOpen: boolean): void;
  setLamp(on: boolean): void;
  readonly lampOn: boolean;
  pressKey(key: string): void;
  quack(): void;
  /** Starts the lights-on sequence after the boot screen. */
  lightsOn(): void;
  /** Pins the sky to a phase, or back to live Austin time with null. */
  setSky(phase: SkyPhase | null): SkyState;
  readonly sky: SkyState;
  /** Wakes the cat. Returns false if it's already up. */
  wakeCat(): boolean;
  /** Moves the camera so the monitor fills the view. */
  sit(on: boolean): void;
  readonly sitting: boolean;
  /** Parallax input in -0.5..0.5 (used by phone tilt). */
  setPointer(x: number, y: number): void;
}

type View = { pos: THREE.Vector3; look: THREE.Vector3 };
const V = (p: [number, number, number], l: [number, number, number]): View => ({ pos: new THREE.Vector3(...p), look: new THREE.Vector3(...l) });

const VIEWS: Record<string, View> = {
  home: V([5.8, 3.9, 7.8], [0, 1.15, -0.2]),
  about: V([4.1, 2.3, 4.2], [1.6, 0.35, 0.3]),
  projects: V([0.9, 1.75, 3.6], [0, 1.2, -0.85]),
  work: V([1.0, 2.1, 3.0], [2.75, 1.85, -2.1]),
  edu: V([-0.4, 2.1, 2.4], [-2.9, 0.35, -1.15]),
  whiteboard: V([-1.2, 2.35, 2.2], [-3.25, 2.2, -2.1]),
  resume: V([0.4, 2.9, 3.7], [-1.8, 0.1, 0.45]),
  contact: V([4.4, 2.5, 3.9], [2.5, 0.15, 0.8]),
};
const INTRO = V([9.5, 6.5, 13], [0, 1.4, -0.5]);

function detectQuality(): Quality {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 600;
  const low = coarse || small;
  return { low, shadowSize: low ? 1024 : 2048, bloom: true, pixelRatio: Math.min(devicePixelRatio, low ? 1.5 : 2) };
}

/** Builds the room. Returns null if WebGL is unavailable. */
export function createWorld(o: WorldOptions): World | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const q = detectQuality();
  renderer.setPixelRatio(q.pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(COLORS.bg);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(COLORS.bg, 13, 30);
  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 100);

  /* Clickable things */
  type Pick = { key: string; label: string; group: THREE.Group; hover: HoverStyle; base: THREE.Vector3; mats: { m: THREE.MeshStandardMaterial; em: THREE.Color }[] };
  const picks: Pick[] = [];
  const register = (key: string, label: string, group: THREE.Group, hover: HoverStyle = 'lift') => {
    picks.push({ key, label, group, hover, base: new THREE.Vector3(), mats: [] });
  };

  const room = buildRoom(scene, register);
  const desk = buildDesk(scene, register, o.screen.canvas, q);
  const cat = buildCat(scene, register, { onKey: k => o.onCatKey(k), onCrossed: () => o.onCatCrossed() });

  // Give each clickable mesh its own material so hover glow doesn't leak to shared materials.
  for (const p of picks) {
    p.base.copy(p.group.position);
    p.group.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const m = mesh.material;
      if (m instanceof THREE.MeshStandardMaterial) {
        const c = m.clone();
        mesh.material = c;
        p.mats.push({ m: c, em: c.emissive.clone() });
      }
    });
  }
  const HOVER = new THREE.Color(0x3a2810);
  const setGlow = (p: Pick, on: boolean) => p.mats.forEach(({ m, em }) => m.emissive.copy(em).add(on ? HOVER : new THREE.Color(0)));

  /* Ambient light */
  const hemi = new THREE.HemisphereLight(0x8a93c8, 0x15172a, LIGHTS.hemi);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x9aa8ff, LIGHTS.moon);
  moon.position.set(-2, 6, -6);
  scene.add(moon);
  const fill = new THREE.DirectionalLight(0xffe0c0, LIGHTS.fill);
  fill.position.set(6, 5, 7);
  scene.add(fill);
  // Daylight coming in through the window
  const sun = new THREE.DirectionalLight(0xfff1dc, 0);
  sun.position.set(-0.6, 5.5, -7);
  sun.target.position.set(0.4, 0, 0.6);
  scene.add(sun, sun.target);
  const sunWarm = new THREE.Color(0xffb070);
  const sunWhite = new THREE.Color(0xfff1dc);
  const hemiNight = new THREE.Color(0x8a93c8);
  const hemiDay = new THREE.Color(0xcfe0ff);

  /* Sky: live Austin time unless pinned with the `sky` command */
  let pinned: SkyPhase | null = null;
  let sky = skyAt(new Date());
  let lastSkyCheck = 0;
  let userTouchedLamp = false;

  /* Post-processing: bloom makes the neon, screen and bulb glow for real */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  if (q.bloom) composer.addPass(bloom);
  composer.addPass(new OutputPass());

  if (import.meta.env.DEV) (window as unknown as { __desk: unknown }).__desk = { scene, camera, THREE };

  /* Camera */
  let view = VIEWS.home;
  let panelOpen = false;
  let sitting = false;
  const sitView = V([0, 1.26, 2], [0, 1.26, -0.8]);
  /** Distance at which the monitor (2.75 × 1.66 incl. bezel) fills the frame. */
  const fitSit = () => {
    const tanH = Math.tan((camera.fov * Math.PI) / 360);
    const d = Math.max(1.66 / (2 * tanH) / 0.94, 2.75 / (2 * tanH * camera.aspect) / 0.96);
    sitView.pos.set(0, 1.26, -0.8 + d);
  };
  const look = (o.reduced ? VIEWS.home : INTRO).look.clone();
  camera.position.copy((o.reduced ? VIEWS.home : INTRO).pos);

  const resize = () => {
    const w = innerWidth;
    const h = innerHeight;
    const wide = w > 760;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(q.pixelRatio);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = wide ? 34 : 52;
    fitSit();
    if (sitting) camera.clearViewOffset();
    else if (panelOpen && wide) camera.setViewOffset(w, h, w * 0.17, 0, w, h);
    else if (panelOpen) camera.setViewOffset(w, h, 0, h * 0.22, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  /* Picking */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointer = { x: 0, y: 0 };
  let hovered: Pick | null = null;
  const pick = (e: PointerEvent | MouseEvent): Pick | null => {
    const r = o.canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(
      picks.map(p => p.group),
      true,
    )[0];
    if (!hit) return null;
    let obj: THREE.Object3D | null = hit.object;
    while (obj) {
      const found = picks.find(p => p.group === obj);
      if (found) return found;
      obj = obj.parent;
    }
    return null;
  };
  o.canvas.addEventListener('pointermove', e => {
    pointer.x = e.clientX / innerWidth - 0.5;
    pointer.y = e.clientY / innerHeight - 0.5;
    const p = pick(e);
    if (p !== hovered) {
      if (hovered) setGlow(hovered, false);
      hovered = p;
      if (p) setGlow(p, true);
    }
    o.canvas.style.cursor = p ? 'pointer' : 'default';
    o.onHover(p && e.pointerType === 'mouse' ? p.label : null, e.clientX, e.clientY);
  });
  o.canvas.addEventListener('pointerleave', () => {
    if (hovered) setGlow(hovered, false);
    hovered = null;
    o.onHover(null, 0, 0);
  });
  o.canvas.addEventListener('click', e => {
    const p = pick(e);
    if (p) o.onPick(p.key);
  });

  /* Lamp state */
  const lampWanted = (s: SkyState) => s.day < 0.8;
  let lampOn = lampWanted(sky);
  let lampLevel = 0;
  let litAt = o.reduced ? -10 : Infinity;
  const flicker = (d: number) => (d < 0 ? 0 : d < 0.08 ? 0.7 : d < 0.16 ? 0 : d < 0.24 ? 0.9 : d < 0.4 ? 0.1 : d < 0.5 ? 0.6 : 1);

  /* Loop */
  const clock = new THREE.Clock();
  let current: string | null = null;
  const tmp = new THREE.Vector3();
  const frame: Frame = { t: 0, dt: 0.016, lamp: 0, reduced: o.reduced, sky };
  const loop = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    if (t - lastSkyCheck > 10) {
      lastSkyCheck = t;
      sky = skyAt(pinned ? dateForPhase(pinned) : new Date());
      const want = lampWanted(sky);
      if (!userTouchedLamp && want !== lampOn) {
        lampOn = want;
        o.onAutoLamp(want);
      }
    }
    frame.sky = sky;
    sun.intensity = LIGHTS.sun * sky.day;
    sun.color.copy(sunWhite).lerp(sunWarm, Math.max(sky.twilight, 1 - Math.sin(sky.arc * Math.PI)) * 0.8);
    hemi.color.copy(hemiNight).lerp(hemiDay, sky.day);
    const sinceLit = t - litAt;
    const target = (lampOn ? 1 : 0) * flicker(sinceLit);
    lampLevel += (target - lampLevel) * (sinceLit < 0.5 ? 1 : Math.min(1, dt * 7));
    hemi.intensity = LIGHTS.hemi * (0.45 + 0.55 * lampLevel + 0.9 * sky.day);
    fill.intensity = LIGHTS.fill * lampLevel;
    frame.t = t;
    frame.dt = dt;
    frame.lamp = lampLevel;

    // camera: ease toward the current view, with a little drift and pointer parallax
    const par = o.reduced || sitting ? 0 : 1;
    tmp.copy(view.pos);
    tmp.x += (pointer.x * 0.9 + Math.sin(t * 0.25) * 0.15) * par;
    tmp.y += (-pointer.y * 0.5 + Math.sin(t * 0.33) * 0.06) * par;
    const ease = o.reduced ? 1 : 1 - Math.pow(sinceLit < 3 ? 0.2 : 0.03, dt);
    camera.position.lerp(tmp, ease);
    look.lerp(view.look, Math.min(1, ease * 1.2));
    camera.lookAt(look);

    // hover: desk objects lift, wall objects pop forward
    for (const p of picks) {
      const on = p === hovered || p.key === current;
      const off = on ? 0.06 : 0;
      if (p.hover === 'none') continue;
      if (p.hover === 'lift') p.group.position.y += (p.base.y + off - p.group.position.y) * 0.15;
      else p.group.position.z += (p.base.z + off * 0.8 - p.group.position.z) * 0.15;
    }

    room.update(frame);
    desk.update(frame);
    cat.update(frame);
    if (desk.buzzed()) o.onBuzz();
    if (o.screen.update(t)) desk.screenTexture.needsUpdate = true;

    composer.render(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return {
    focus(key, open) {
      if (sitting && !key) return; // closing a panel shouldn't make you stand up
      current = key;
      sitting = false;
      view = (key && VIEWS[key]) || VIEWS.home;
      panelOpen = open;
      resize();
    },
    sit(on) {
      sitting = on;
      current = on ? 'projects' : null;
      panelOpen = false;
      view = on ? sitView : VIEWS.home;
      resize();
    },
    get sitting() {
      return sitting;
    },
    setPointer(x, y) {
      pointer.x = x;
      pointer.y = y;
    },
    setLamp(on) {
      lampOn = on;
      userTouchedLamp = true;
    },
    setSky(phase) {
      pinned = phase;
      userTouchedLamp = false;
      lastSkyCheck = -100;
      return skyAt(phase ? dateForPhase(phase) : new Date());
    },
    get sky() {
      return sky;
    },
    wakeCat: () => cat.wake(),
    get lampOn() {
      return lampOn;
    },
    pressKey: k => desk.pressKey(k),
    quack: () => desk.quack(),
    lightsOn() {
      if (litAt === Infinity) litAt = clock.elapsedTime;
    },
  };
}
