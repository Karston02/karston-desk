/**
 * Tuning knobs for the look of the room. Light intensities use three.js
 * physical units (r155+), so point and spot lights are in candela.
 */
export const LIGHTS = {
  lampSpot: 24,
  hemi: 1.25,
  moon: 0.9,
  fill: 0.4,
  neon: 2.6,
  screen: 3,
  city: 2.2,
  /** Daylight through the window at noon. */
  sun: 2.4,
};

export const BLOOM = {
  strength: 0.55,
  radius: 0.5,
  threshold: 0.86,
};

export const COLORS = {
  bg: 0x12141f,
  lamp: 0xf6b85c,
  warm: 0xffc27a,
  neon: 0xff6fae,
  screen: 0x7fd1c7,
  frame: 0x353a54,
};

/** Window on the back wall (world units). */
export const WINDOW = { x: -0.25, y: 2.55, w: 3.1, h: 1.95 };
export const WALL_Z = -2.2;
