import * as THREE from 'three';
import type { SkyState } from './sky';

export interface Frame {
  /** Seconds since start. */
  t: number;
  /** Seconds since last frame, clamped. */
  dt: number;
  /** Lamp brightness, 0 (off) to 1 (on). */
  lamp: number;
  reduced: boolean;
  sky: SkyState;
}

export interface Part {
  update(f: Frame): void;
}

export type HoverStyle = 'lift' | 'pop' | 'none';
export type Register = (key: string, label: string, group: THREE.Group, hover?: HoverStyle) => void;

export interface Quality {
  low: boolean;
  shadowSize: number;
  bloom: boolean;
  pixelRatio: number;
}

export const mat = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...o });

export function box(w: number, h: number, d: number, m: THREE.Material, shadow = true): THREE.Mesh {
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  g.castShadow = shadow;
  g.receiveShadow = true;
  return g;
}

export function cyl(rt: number, rb: number, h: number, m: THREE.Material, seg = 32): THREE.Mesh {
  const g = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  g.castShadow = g.receiveShadow = true;
  return g;
}

export function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
  o.position.set(x, y, z);
  return o;
}

/** A cylinder spanning two points. */
export function rod(p1: THREE.Vector3, p2: THREE.Vector3, r: number, m: THREE.Material): THREE.Mesh {
  const mesh = cyl(r, r, p1.distanceTo(p2), m, 12);
  mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
  return mesh;
}

export interface CanvasTex {
  c: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  t: THREE.CanvasTexture;
}

export function canvasTex(w: number, h: number): CanvasTex {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { c, g, t };
}

let glowTexture: THREE.CanvasTexture | null = null;
function glowTex(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const { g, t } = canvasTex(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.18, 'rgba(255,255,255,.5)');
  gr.addColorStop(0.5, 'rgba(255,255,255,.12)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  glowTexture = t;
  return t;
}

/** A soft additive glow sprite. */
export function glow(color: THREE.ColorRepresentation, size: number, opacity: number): THREE.Sprite {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  s.scale.set(size, size, 1);
  return s;
}

/**
 * A soft glow on a flat plane. Unlike a sprite it never turns to face the
 * camera, so it can sit against a wall or desk without being sliced by it.
 */
export function flatGlow(color: THREE.ColorRepresentation, w: number, h: number, opacity: number): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
}

/** Deterministic random numbers, so the city skyline is the same on every visit. */
export function seeded(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Wraps text onto lines no wider than maxWidth. */
export function wrap(g: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxWidth && line) {
      out.push(line);
      line = w;
    } else line = test;
  }
  if (line) out.push(line);
  return out;
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function austinTime(): { h: number; m: number; s: number; text: string } {
  let h = 0;
  let m = 0;
  let s = 0;
  try {
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false, timeZone: 'America/Chicago' })
      .formatToParts(new Date())
      .forEach(p => {
        if (p.type === 'hour') h = +p.value % 24;
        if (p.type === 'minute') m = +p.value;
        if (p.type === 'second') s = +p.value;
      });
  } catch {
    const d = new Date();
    h = d.getHours();
    m = d.getMinutes();
    s = d.getSeconds();
  }
  return { h, m, s, text: `${h}:${String(m).padStart(2, '0')}` };
}
