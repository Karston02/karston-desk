import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BLOOM, COLORS, LIGHTS } from './config';
import { buildDesk, SCREEN_GLOW, SCREEN_LIGHT } from './desk';
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
/** Phones held upright: a more frontal view, so dragging sideways pans along the wall. */
const PORTRAIT_HOME = V([0.3, 4.0, 12.0], [0.3, 1.55, -1.2]);
/** How far (world units) a portrait drag can pan left or right of the center. */
const PAN = 1.8;
const PORTRAIT_FOV = 48;

function detectQuality(): Quality {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 600;
  const low = coarse || small;
  // Phones get the same 2x cap as desktop: at 1.5x a 3x phone renders at half resolution and the text on the
  // monitor, whiteboard and phone goes blurry. If a phone can't keep up, the loop drops it to 1.5x.
  return { low, shadowSize: low ? 1024 : 2048, bloom: true, pixelRatio: Math.min(devicePixelRatio, 2) };
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

  // Sharp text on surfaces seen at an angle (whiteboard, ticket board, monitor, phone)
  const aniso = renderer.capabilities.getMaxAnisotropy();
  scene.traverse((obj: THREE.Object3D) => {
    const m = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m?.map && m.map.anisotropy !== aniso) {
      m.map.anisotropy = aniso;
      m.map.needsUpdate = true;
    }
  });

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
  let pixelRatio = q.pixelRatio;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Phone GPUs light at lower precision, so a sharp highlight can come out as Infinity or NaN. Bloom then
  // smears that one pixel into big black blocks. Zero out bad pixels and cap the brightness before bloom.
  composer.addPass(
    new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          bool bad = any(isnan(c)) || any(isinf(c)) || any(greaterThan(abs(c), vec4(60000.0)));
          gl_FragColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : vec4(min(c.rgb, vec3(16.0)), c.a);
        }`,
    }),
  );
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  if (q.bloom) composer.addPass(bloom);
  composer.addPass(new OutputPass());

  if (import.meta.env.DEV)
    (window as unknown as { __desk: unknown }).__desk = {
      scene,
      camera,
      THREE,
      /** Tune the portrait framing live: __desk.portrait([x,y,z], [x,y,z], fov) */
      portrait(pos: [number, number, number], lookAt: [number, number, number], fov?: number) {
        PORTRAIT_HOME.pos.set(...pos);
        PORTRAIT_HOME.look.set(...lookAt);
        if (fov) portraitFov = fov;
        frameCamera();
      },
      closeUp(n: number) {
        closeUpFit = n;
        frameCamera();
      },
    };

  /* Camera */
  let view = VIEWS.home;
  let panelOpen = false;
  let sitting = false;
  let portrait = false;
  let portraitFov = PORTRAIT_FOV;
  /** Sideways pan from dragging in portrait (world units, -PAN..PAN). */
  let pan = 0;
  let current: string | null = null;
  /** How much to pull close-ups back on a narrow screen (dev: __desk.closeUp = n). */
  let closeUpFit = 0.8;
  const viewFor = (key: string | null): View => {
    const v = key ? VIEWS[key] : undefined;
    if (!v) return portrait ? PORTRAIT_HOME : VIEWS.home;
    if (!portrait) return v;
    // Close-ups were framed for a wide screen (about 0.49 of the distance visible on each side).
    // In portrait far less fits across, so back the camera away from its target until the object fits.
    const halfW = Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
    const k = Math.max(1, (0.49 / halfW) * closeUpFit);
    return { pos: v.pos.clone().sub(v.look).multiplyScalar(k).add(v.look), look: v.look };
  };
  const sitView = V([0, 1.26, 2], [0, 1.26, -0.8]);
  /** Distance at which the monitor (2.75 × 1.66 incl. bezel) fills the frame. */
  const fitSit = () => {
    const tanH = Math.tan((camera.fov * Math.PI) / 360);
    const d = Math.max(1.66 / (2 * tanH) / 0.94, 2.75 / (2 * tanH * camera.aspect) / 0.96);
    sitView.pos.set(0, 1.26, -0.8 + d);
  };
  const look = (o.reduced ? VIEWS.home : INTRO).look.clone();
  camera.position.copy((o.reduced ? VIEWS.home : INTRO).pos);

  /** Camera framing only. Cheap and never touches the canvas, so panel and sit changes can't flash. */
  const frameCamera = () => {
    const w = innerWidth;
    const h = innerHeight;
    const wide = w > 760;
    portrait = w / h < 0.8;
    camera.aspect = w / h;
    camera.fov = wide ? 34 : portrait ? portraitFov : 52;
    fitSit();
    if (!sitting) view = viewFor(current);
    if (sitting) camera.clearViewOffset();
    else if (panelOpen && wide) camera.setViewOffset(w, h, w * 0.17, 0, w, h);
    // phones: the panel is a bottom sheet, so lift the scene into the space above it
    else if (panelOpen) camera.setViewOffset(w, h, 0, h * 0.3, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  /**
   * Resizing the canvas wipes it and rebuilds the bloom buffers, so only do it when the size really
   * changed, then draw straight away so a blank frame never reaches the screen.
   */
  let sizedAs = '';
  let running = false;
  /*
   * Phones can drop the WebGL context when memory runs low (or after the tab was in the background).
   * three.js restores it; canvas textures then need re-uploading and the canvas a fresh size.
   */
  o.canvas.addEventListener('webglcontextlost', e => e.preventDefault());
  o.canvas.addEventListener('webglcontextrestored', () => {
    scene.traverse((obj: THREE.Object3D) => {
      const m = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial | undefined;
      if (m && 'map' in m && m.map) m.map.needsUpdate = true;
    });
    sizedAs = '';
    resize();
  });

  const resize = () => {
    const w = innerWidth;
    const h = innerHeight;
    const key = `${w}x${h}@${pixelRatio}`;
    if (key !== sizedAs) {
      sizedAs = key;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(w, h, false);
      composer.setPixelRatio(pixelRatio);
      composer.setSize(w, h);
      frameCamera();
      if (running) composer.render(0);
      return;
    }
    frameCamera();
  };
  addEventListener('resize', resize);
  resize();

  /* Picking */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointer = { x: 0, y: 0 };
  let hovered: Pick | null = null;
  const pickAt = (x: number, y: number): Pick | null => {
    const r = o.canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
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
  /** Fingers are imprecise: if a tap misses, look for an object within ~36px of it. */
  const RING = [0, 1, 2, 3, 4, 5, 6, 7].map(i => [Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)]);
  const pickNear = (x: number, y: number): Pick | null => {
    const hit = pickAt(x, y);
    if (hit) return hit;
    for (const r of [18, 36]) {
      for (const [cx, cy] of RING) {
        const p = pickAt(x + cx * r, y + cy * r);
        if (p) return p;
      }
    }
    return null;
  };

  /* Portrait: drag sideways to look along the wall */
  let drag: { x: number; pan: number; moved: boolean } | null = null;
  let dragged = false;
  const canPan = () => portrait && !current && !sitting && !o.reduced;
  o.canvas.addEventListener('pointerdown', e => {
    dragged = false;
    if (e.pointerType !== 'mouse' && canPan()) drag = { x: e.clientX, pan, moved: false };
  });
  const endDrag = () => {
    if (drag?.moved) dragged = true;
    drag = null;
  };
  o.canvas.addEventListener('pointerup', endDrag);
  o.canvas.addEventListener('pointercancel', endDrag);

  o.canvas.addEventListener('pointermove', e => {
    if (drag) {
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 8) drag.moved = true;
      if (drag.moved) pan = Math.max(-PAN, Math.min(PAN, drag.pan - (dx / innerWidth) * PAN * 2.2));
      return;
    }
    if (e.pointerType !== 'mouse') return;
    pointer.x = e.clientX / innerWidth - 0.5;
    pointer.y = e.clientY / innerHeight - 0.5;
    const p = pickAt(e.clientX, e.clientY);
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
    if (dragged) {
      dragged = false;
      return;
    }
    const p = (e as PointerEvent).pointerType === 'mouse' ? pickAt(e.clientX, e.clientY) : pickNear(e.clientX, e.clientY);
    if (p) o.onPick(p.key);
  });

  /* Lamp state */
  const lampWanted = (s: SkyState) => s.day < 0.8;
  let lampOn = lampWanted(sky);
  let lampLevel = 0;
  let litAt = o.reduced ? -10 : Infinity;
  // lights on: one soft catch before the bulb settles (a single dip, never a strobe)
  const flicker = (d: number) => (d < 0 ? 0 : d < 0.12 ? 0.6 : d < 0.24 ? 0.3 : 1);

  /* Loop */
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const lookTo = new THREE.Vector3();
  const frame: Frame = { t: 0, dt: 0.016, lamp: 0, reduced: o.reduced, sky };
  // Watch the frame rate for a few seconds; if a phone is struggling at 2x, drop to 1.5x once.
  let slowFrames = 0;
  let sampled = 0;
  const loop = () => {
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    const t = clock.elapsedTime;
    if (pixelRatio > 1.5 && t > 2 && sampled < 120) {
      sampled++;
      if (raw > 1 / 40) slowFrames++;
      if (sampled === 120 && slowFrames > 60) {
        pixelRatio = 1.5;
        resize();
      }
    }
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
    const panX = canPan() ? pan : 0;
    tmp.copy(view.pos);
    tmp.x += panX + (pointer.x * 0.9 + Math.sin(t * 0.25) * 0.15) * par;
    tmp.y += (-pointer.y * 0.5 + Math.sin(t * 0.33) * 0.06) * par;
    lookTo.copy(view.look);
    lookTo.x += panX;
    // follow a dragging finger closely; otherwise glide
    const ease = o.reduced ? 1 : 1 - Math.pow(drag ? 0.0005 : sinceLit < 3 ? 0.2 : 0.03, dt);
    camera.position.lerp(tmp, ease);
    look.lerp(lookTo, Math.min(1, ease * 1.2));
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
    desk.setScreenLevel(o.screen.isLight ? SCREEN_LIGHT : SCREEN_GLOW);

    composer.render(dt);
    running = true;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return {
    focus(key, open) {
      if (sitting && !key) return; // closing a panel shouldn't make you stand up
      current = key;
      sitting = false;
      view = viewFor(key);
      panelOpen = open;
      frameCamera();
    },
    sit(on) {
      sitting = on;
      current = on ? 'projects' : null;
      panelOpen = false;
      view = on ? sitView : viewFor(null);
      frameCamera();
    },
    get sitting() {
      return sitting;
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
