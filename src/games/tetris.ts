import { drawGameOver, highScore, MONO, type Game } from './game';

const COLS = 10;
const ROWS = 20;
const CELL = 26;
const OX = 512 - (COLS * CELL) / 2 - 90;
const OY = 46;

const SHAPES: Record<string, number[][]> = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};
const COLORS: Record<string, string> = { I: '#7FD1C7', O: '#F6E27A', T: '#B6A6F5', S: '#7ED492', Z: '#FF6B6B', J: '#7AA2FF', L: '#F6B85C' };
const LINE_POINTS = [0, 100, 300, 500, 800];

type Piece = { k: string; m: number[][]; x: number; y: number };

const rotate = (m: number[][]) => m[0].map((_, i) => m.map(r => r[i]).reverse());

export class Tetris implements Game {
  readonly name = 'tetris';
  score = 0;
  over = false;
  lines = 0;
  private grid: (string | null)[][] = [];
  private cur!: Piece;
  private next = '';
  private bag: string[] = [];
  private acc = 0;
  private hi = highScore('tetris');

  constructor(private onLines: (total: number) => void = () => {}) {
    this.reset();
  }

  private reset(): void {
    this.grid = Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null));
    this.score = 0;
    this.lines = 0;
    this.over = false;
    this.bag = [];
    this.next = this.draw7();
    this.spawn();
  }

  private draw7(): string {
    if (!this.bag.length) this.bag = Object.keys(SHAPES).sort(() => Math.random() - 0.5);
    return this.bag.pop() as string;
  }

  private spawn(): void {
    const k = this.next;
    this.next = this.draw7();
    const m = SHAPES[k].map(r => [...r]);
    this.cur = { k, m, x: Math.floor((COLS - m[0].length) / 2), y: 0 };
    if (this.collides(this.cur.m, this.cur.x, this.cur.y)) {
      this.over = true;
      this.hi = highScore('tetris', this.score);
    }
  }

  private collides(m: number[][], x: number, y: number): boolean {
    return m.some((row, r) => row.some((v, c) => v && (x + c < 0 || x + c >= COLS || y + r >= ROWS || (y + r >= 0 && this.grid[y + r][x + c]))));
  }

  private lock(): void {
    this.cur.m.forEach((row, r) => row.forEach((v, c) => v && this.cur.y + r >= 0 && (this.grid[this.cur.y + r][this.cur.x + c] = this.cur.k)));
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.grid[r].every(Boolean)) {
        this.grid.splice(r, 1);
        this.grid.unshift(Array<string | null>(COLS).fill(null));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      this.lines += cleared;
      this.score += LINE_POINTS[cleared] * this.level;
      this.onLines(this.lines);
    }
    this.spawn();
  }

  private get level(): number {
    return 1 + Math.floor(this.lines / 10);
  }

  private move(dx: number, dy: number): boolean {
    if (this.collides(this.cur.m, this.cur.x + dx, this.cur.y + dy)) return false;
    this.cur.x += dx;
    this.cur.y += dy;
    return true;
  }

  handleKey(key: string): boolean {
    if (this.over) {
      if (key === 'Enter') {
        this.reset();
        return true;
      }
      return false;
    }
    switch (key) {
      case 'ArrowLeft':
      case 'a':
        this.move(-1, 0);
        return true;
      case 'ArrowRight':
      case 'd':
        this.move(1, 0);
        return true;
      case 'ArrowDown':
      case 's':
        if (this.move(0, 1)) this.score += 1;
        else this.lock();
        this.acc = 0;
        return true;
      case 'ArrowUp':
      case 'w': {
        const m = rotate(this.cur.m);
        // simple wall kicks
        for (const dx of [0, -1, 1, -2, 2]) {
          if (!this.collides(m, this.cur.x + dx, this.cur.y)) {
            this.cur.m = m;
            this.cur.x += dx;
            break;
          }
        }
        return true;
      }
      case ' ':
        while (this.move(0, 1)) this.score += 2;
        this.lock();
        this.acc = 0;
        return true;
    }
    return false;
  }

  update(dt: number): void {
    if (this.over) return;
    this.acc += dt;
    const step = Math.max(0.08, 0.7 - (this.level - 1) * 0.06);
    if (this.acc >= step) {
      this.acc = 0;
      if (!this.move(0, 1)) this.lock();
    }
  }

  private ghostY(): number {
    let y = this.cur.y;
    while (!this.collides(this.cur.m, this.cur.x, y + 1)) y++;
    return y;
  }

  draw(g: CanvasRenderingContext2D, W: number, H: number): void {
    g.fillStyle = '#0D111D';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#141A2A';
    g.fillRect(OX, OY, COLS * CELL, ROWS * CELL);
    g.strokeStyle = '#2A3048';
    g.lineWidth = 2;
    g.strokeRect(OX - 2, OY - 2, COLS * CELL + 4, ROWS * CELL + 4);
    const cell = (x: number, y: number, color: string, alpha = 1) => {
      g.globalAlpha = alpha;
      g.fillStyle = color;
      g.fillRect(OX + x * CELL + 1, OY + y * CELL + 1, CELL - 2, CELL - 2);
      g.fillStyle = 'rgba(255,255,255,.18)';
      g.fillRect(OX + x * CELL + 1, OY + y * CELL + 1, CELL - 2, 4);
      g.globalAlpha = 1;
    };
    this.grid.forEach((row, r) => row.forEach((k, c) => k && cell(c, r, COLORS[k])));
    if (!this.over) {
      const gy = this.ghostY();
      this.cur.m.forEach((row, r) => row.forEach((v, c) => v && cell(this.cur.x + c, gy + r, COLORS[this.cur.k], 0.2)));
      this.cur.m.forEach((row, r) => row.forEach((v, c) => v && this.cur.y + r >= 0 && cell(this.cur.x + c, this.cur.y + r, COLORS[this.cur.k])));
    }
    // side panel
    const sx = OX + COLS * CELL + 40;
    g.fillStyle = '#E6E1D6';
    g.font = `700 24px ${MONO}`;
    g.fillText('tetris', sx, OY + 24);
    g.font = `16px ${MONO}`;
    const rows: [string, string][] = [
      ['score', String(this.score)],
      ['lines', String(this.lines)],
      ['level', String(this.level)],
      ['best', String(this.hi)],
    ];
    rows.forEach(([k, v], i) => {
      g.fillStyle = '#6F7590';
      g.fillText(k, sx, OY + 70 + i * 52);
      g.fillStyle = '#F6B85C';
      g.font = `700 22px ${MONO}`;
      g.fillText(v, sx, OY + 94 + i * 52);
      g.font = `16px ${MONO}`;
    });
    g.fillStyle = '#6F7590';
    g.fillText('next', sx, OY + 300);
    SHAPES[this.next].forEach((row, r) =>
      row.forEach((v, c) => {
        if (!v) return;
        g.fillStyle = COLORS[this.next];
        g.fillRect(sx + c * 22, OY + 316 + r * 22, 20, 20);
      }),
    );
    g.fillStyle = '#6F7590';
    g.font = `14px ${MONO}`;
    ['← → move', '↑ rotate', '↓ soft drop', 'space hard drop', 'esc quit'].forEach((l, i) => g.fillText(l, sx, OY + 400 + i * 22));
    if (this.over) drawGameOver(g, W, H, this.score, this.hi);
  }
}
