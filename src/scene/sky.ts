/**
 * The sky outside the window follows the real sun over Austin, TX.
 * Sunrise and sunset come from a standard solar approximation (declination +
 * equation of time), computed in UTC so daylight saving time doesn't matter.
 */

const LAT = 30.2672;
const LON = -97.7431;
const RAD = Math.PI / 180;

export type SkyPhase = 'night' | 'dawn' | 'day' | 'dusk';

export interface SkyState {
  /** 0 = full night, 1 = full day. */
  day: number;
  /** 0..1, peaks at sunrise and sunset. */
  twilight: number;
  /** Sun's progress across the day, 0 at sunrise, 1 at sunset. */
  arc: number;
  phase: SkyPhase;
  /** Sunrise and sunset as UTC hours (may be past 24). */
  rise: number;
  set: number;
}

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};

export function sunTimesUTC(d: Date): { rise: number; set: number; noon: number } {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const n = Math.floor((d.getTime() - start) / 86400000);
  const decl = 23.44 * RAD * Math.sin(((2 * Math.PI) / 365) * (284 + n));
  // -0.833° accounts for refraction and the sun's radius (official sunrise/sunset)
  const cosH = clamp((Math.sin(-0.833 * RAD) - Math.sin(LAT * RAD) * Math.sin(decl)) / (Math.cos(LAT * RAD) * Math.cos(decl)), -1, 1);
  const halfDay = Math.acos(cosH) / RAD / 15; // hours
  const b = ((2 * Math.PI) / 364) * (n - 81);
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b); // minutes
  const noon = 12 - LON / 15 - eot / 60;
  return { rise: noon - halfDay, set: noon + halfDay, noon };
}

export function skyAt(d: Date): SkyState {
  const { rise, set } = sunTimesUTC(d);
  let h = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  while (h < rise - 6) h += 24;
  while (h > rise + 18) h -= 24;
  const ramp = 0.6;
  const day = smooth((h - (rise - ramp)) / (2 * ramp)) * (1 - smooth((h - (set - ramp)) / (2 * ramp)));
  const bump = (x: number) => Math.max(0, 1 - Math.abs(x) / 1.1);
  const twilight = Math.max(bump(h - rise), bump(h - set));
  const arc = clamp((h - rise) / (set - rise));
  let phase: SkyPhase = 'night';
  if (twilight > 0.35) phase = Math.abs(h - rise) < Math.abs(h - set) ? 'dawn' : 'dusk';
  else if (day > 0.6) phase = 'day';
  return { day, twilight, arc, phase, rise, set };
}

/** A Date today at the given phase, for the `sky` command. */
export function dateForPhase(phase: SkyPhase, now = new Date()): Date {
  const { rise, set, noon } = sunTimesUTC(now);
  const hour = { dawn: rise, day: noon, dusk: set, night: noon + 12 }[phase];
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(base + hour * 3600000);
}

/** "6:52 AM" in Austin time, from a UTC hour. */
export function austinClock(utcHour: number, now = new Date()): string {
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  try {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(new Date(base + utcHour * 3600000));
  } catch {
    return `${Math.floor(utcHour)}:00 UTC`;
  }
}

/* ---------- color helpers ---------- */
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mix = (a: string, b: string, t: number): string => {
  const A = hex(a);
  const B = hex(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * clamp(t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
const mixRGB = (a: string, b: string, t: number): string => {
  const m = mix(a, b, t).match(/\d+/g) as string[];
  return '#' + m.map(v => (+v).toString(16).padStart(2, '0')).join('');
};

/** Sky gradient stops for a sky state: [top, middle, horizon-glow, horizon]. */
export function skyColors(s: SkyState): [string, string, string, string] {
  const night = ['#070A1A', '#1A1840', '#4A2A55', '#7A3E52'];
  const day = ['#3F7FD0', '#7DB4EA', '#B9DAF3', '#DCEBF5'];
  const twi = ['#1B2350', '#5E4A8E', '#E8795A', '#FFB070'];
  return night.map((n, i) => mixRGB(mixRGB(n, day[i], s.day), twi[i], s.twilight * 0.85)) as [string, string, string, string];
}
