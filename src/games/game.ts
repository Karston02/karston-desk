/** A game that runs on the 3D monitor's canvas. */
export interface Game {
  readonly name: string;
  readonly score: number;
  readonly over: boolean;
  /** Returns true if the key was used. */
  handleKey(key: string): boolean;
  update(dt: number): void;
  draw(g: CanvasRenderingContext2D, W: number, H: number, t: number): void;
}

export const MONO = '"Space Mono", monospace';

export function highScore(name: string, score?: number): number {
  const key = `karston-desk:hi:${name}`;
  let hi = 0;
  try {
    hi = Number(localStorage.getItem(key)) || 0;
    if (score !== undefined && score > hi) {
      hi = score;
      localStorage.setItem(key, String(score));
    }
  } catch {
    /* storage blocked */
  }
  return Math.max(hi, score ?? 0);
}

/** Shared "game over" overlay. */
export function drawGameOver(g: CanvasRenderingContext2D, W: number, H: number, score: number, hi: number): void {
  g.fillStyle = 'rgba(8,10,18,.78)';
  g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.fillStyle = '#F6B85C';
  g.font = `700 54px ${MONO}`;
  g.fillText('GAME OVER', W / 2, H / 2 - 30);
  g.fillStyle = '#E6E1D6';
  g.font = `22px ${MONO}`;
  g.fillText(`score ${score} · best ${hi}`, W / 2, H / 2 + 16);
  g.fillStyle = '#7FD1C7';
  g.font = `18px ${MONO}`;
  g.fillText('enter to play again · esc to quit', W / 2, H / 2 + 56);
  g.textAlign = 'left';
}
