import { drawGameOver, highScore, MONO, type Game } from './game';

const COLS = 30;
const ROWS = 16;
const CELL = 30;
const OX = (1024 - COLS * CELL) / 2;
const OY = 78;

type P = { x: number; y: number };

export class Snake implements Game {
  readonly name = 'snake';
  score = 0;
  over = false;
  private body: P[] = [];
  private dir: P = { x: 1, y: 0 };
  private queued: P[] = [];
  private food: P = { x: 0, y: 0 };
  private acc = 0;
  private hi = highScore('snake');

  constructor(private onScore: (score: number) => void = () => {}) {
    this.reset();
  }

  private reset(): void {
    this.body = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ];
    this.dir = { x: 1, y: 0 };
    this.queued = [];
    this.score = 0;
    this.over = false;
    this.acc = 0;
    this.placeFood();
  }

  private placeFood(): void {
    do {
      this.food = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (this.body.some(b => b.x === this.food.x && b.y === this.food.y));
  }

  handleKey(key: string): boolean {
    if (this.over) {
      if (key === 'Enter' || key === ' ') {
        this.reset();
        return true;
      }
      return false;
    }
    const map: Record<string, P> = {
      ArrowUp: { x: 0, y: -1 },
      w: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      s: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      a: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      d: { x: 1, y: 0 },
    };
    const d = map[key];
    if (!d) return false;
    const last = this.queued[this.queued.length - 1] ?? this.dir;
    if (d.x === -last.x && d.y === -last.y) return true; // no reversing into yourself
    if (this.queued.length < 3) this.queued.push(d);
    return true;
  }

  update(dt: number): void {
    if (this.over) return;
    this.acc += dt;
    const step = Math.max(0.055, 0.12 - this.score * 0.003);
    while (this.acc >= step) {
      this.acc -= step;
      if (this.queued.length) this.dir = this.queued.shift() as P;
      const head = { x: this.body[0].x + this.dir.x, y: this.body[0].y + this.dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || this.body.some(b => b.x === head.x && b.y === head.y)) {
        this.over = true;
        this.hi = highScore('snake', this.score);
        return;
      }
      this.body.unshift(head);
      if (head.x === this.food.x && head.y === this.food.y) {
        this.score++;
        this.onScore(this.score);
        this.placeFood();
      } else this.body.pop();
    }
  }

  draw(g: CanvasRenderingContext2D, W: number, H: number, t: number): void {
    g.fillStyle = '#0D111D';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#E6E1D6';
    g.font = `700 22px ${MONO}`;
    g.fillText('snake', OX, 60);
    g.textAlign = 'right';
    g.fillStyle = '#7FD1C7';
    g.fillText(`${this.score}  ·  best ${this.hi}`, OX + COLS * CELL, 60);
    g.textAlign = 'left';
    g.strokeStyle = '#2A3048';
    g.lineWidth = 2;
    g.strokeRect(OX - 2, OY - 2, COLS * CELL + 4, ROWS * CELL + 4);
    // food pulses
    const r = CELL * (0.32 + Math.sin(t * 8) * 0.05);
    g.fillStyle = '#FF6FAE';
    g.beginPath();
    g.arc(OX + this.food.x * CELL + CELL / 2, OY + this.food.y * CELL + CELL / 2, r, 0, Math.PI * 2);
    g.fill();
    this.body.forEach((b, i) => {
      g.fillStyle = i === 0 ? '#F6B85C' : i % 2 ? '#7FD1C7' : '#6BC0B6';
      g.fillRect(OX + b.x * CELL + 2, OY + b.y * CELL + 2, CELL - 4, CELL - 4);
    });
    g.fillStyle = '#6F7590';
    g.font = `15px ${MONO}`;
    g.fillText('arrows / wasd · esc quits', OX, H - 12);
    if (this.over) drawGameOver(g, W, H, this.score, this.hi);
  }
}
