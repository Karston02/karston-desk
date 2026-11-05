import { projects, type Project } from '../content/data';
import { drawTitleBar, scanlines, type Terminal } from '../terminal/terminal';
import { roundRect, wrap } from './helpers';
import type { Game } from '../games/game';

export const SCREEN_W = 1024;
export const SCREEN_H = 600;

const MONO = '"Space Mono", monospace';
const SANS = 'Karla, sans-serif';

/**
 * What the 3D monitor displays: the terminal, or a mock app for whichever
 * case study is open. If a project has a real screenshot, that is shown instead.
 */
export class MonitorScreen {
  readonly canvas = document.createElement('canvas');
  private g: CanvasRenderingContext2D;
  private project: Project | null = null;
  private since = 0;
  private lastFrame = -1;
  private images = new Map<string, HTMLImageElement>();
  private game: Game | null = null;
  private lastT = 0;
  private gameFrame = -1;

  constructor(private term: Terminal) {
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.g = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    projects.forEach(p => {
      if (!p.image) return;
      const img = new Image();
      img.src = p.image;
      this.images.set(p.slug, img);
    });
  }

  showProject(slug: string | null, t: number): void {
    this.project = slug ? (projects.find(p => p.slug === slug) ?? null) : null;
    this.since = t;
    this.lastFrame = -1;
  }

  get showingProject(): boolean {
    return !!this.project;
  }

  /** Runs a game on the monitor, or returns to the terminal with null. */
  play(game: Game | null): void {
    this.game = game;
    this.project = null;
    this.lastT = 0;
    this.term.redraw();
  }

  get currentGame(): Game | null {
    return this.game;
  }

  /** Redraws when needed. Returns true if the texture changed. */
  update(t: number): boolean {
    if (this.game) {
      const dt = this.lastT ? Math.min(0.1, t - this.lastT) : 0;
      this.lastT = t;
      this.game.update(dt);
      const f = Math.floor(t * 40);
      if (f === this.gameFrame) return false;
      this.gameFrame = f;
      this.game.draw(this.g, SCREEN_W, SCREEN_H, t);
      scanlines(this.g, SCREEN_W, SCREEN_H);
      return true;
    }
    if (!this.project) {
      const dirty = this.term.tick(t);
      if (dirty) this.term.draw(this.g, SCREEN_W, SCREEN_H, t);
      return dirty;
    }
    this.term.tick(t); // keep queued output flowing in the background
    const frame = Math.floor(t * 12);
    if (frame === this.lastFrame) return false;
    this.lastFrame = frame;
    this.drawProject(this.project, t - this.since);
    return true;
  }

  private drawProject(p: Project, t: number): void {
    const g = this.g;
    const W = SCREEN_W;
    const H = SCREEN_H;
    const img = this.images.get(p.slug);
    if (img && img.complete && img.naturalWidth) {
      g.fillStyle = '#0D111D';
      g.fillRect(0, 0, W, H);
      const s = Math.min(W / img.naturalWidth, (H - 34) / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      g.drawImage(img, (W - w) / 2, 34 + (H - 34 - h) / 2, w, h);
      drawTitleBar(g, W, p.title);
      return;
    }
    g.fillStyle = '#F4F2EE';
    g.fillRect(0, 0, W, H);
    if (p.screen === 'scraper') drawScraper(g, W, H, t);
    else if (p.screen === 'tickets') drawTickets(g, W, H, t);
    else if (p.screen === 'database') drawDatabase(g, W, H, t);
    else drawDesk(g, W, H, t);
    drawTitleBar(g, W, `${p.slug} — preview`);
    g.fillStyle = 'rgba(13,17,29,.55)';
    g.font = `13px ${MONO}`;
    g.textAlign = 'right';
    g.fillText('illustration · press any key for the terminal', W - 16, H - 14);
    g.textAlign = 'left';
    scanlines(g, W, H);
  }
}

/* ---------- Mock app screens (illustrations, not real data) ---------- */

function header(g: CanvasRenderingContext2D, title: string, sub: string): void {
  g.fillStyle = '#16171F';
  g.font = `700 30px ${SANS}`;
  g.fillText(title, 36, 86);
  g.fillStyle = '#6A6B78';
  g.font = `16px ${SANS}`;
  g.fillText(sub, 36, 112);
}

function drawScraper(g: CanvasRenderingContext2D, W: number, _H: number, t: number): void {
  header(g, 'Matches', 'Filtered by: remote or Austin · salary floor · no on-call');
  const rows = [
    ['Backend Engineer', 'Remote', '✓'],
    ['Full-Stack Engineer', 'Austin, TX', '✓'],
    ['Forward Deployed Engineer', 'Remote', '✓'],
    ['Software Engineer II', 'Hybrid · Austin', '✓'],
    ['Platform Engineer', 'Remote', '✓'],
    ['Product Engineer', 'Austin, TX', '✓'],
  ];
  const shown = Math.min(rows.length, Math.floor(t * 3) + 1);
  g.fillStyle = '#E4E0D8';
  g.fillRect(36, 136, W - 72, 1);
  g.font = `13px ${MONO}`;
  g.fillStyle = '#8A8B97';
  ['ROLE', 'LOCATION', 'MATCH'].forEach((h, i) => g.fillText(h, [36, 520, 860][i], 160));
  for (let i = 0; i < shown; i++) {
    const y = 200 + i * 54;
    const [role, loc, ok] = rows[i];
    g.fillStyle = i % 2 ? '#F4F2EE' : '#ECE9E2';
    g.fillRect(28, y - 30, W - 56, 48);
    g.fillStyle = '#16171F';
    g.font = `600 19px ${SANS}`;
    g.fillText(role, 36, y);
    g.fillStyle = '#5A5B68';
    g.font = `17px ${SANS}`;
    g.fillText(loc, 520, y);
    g.fillStyle = '#2E9B6B';
    g.font = `700 18px ${MONO}`;
    g.fillText(ok, 870, y);
  }
  g.fillStyle = '#8A8B97';
  g.font = `14px ${MONO}`;
  g.fillText(`scanned 12 boards · ${shown} of ${rows.length} shown`, 36, 548);
}

function drawTickets(g: CanvasRenderingContext2D, W: number, _H: number, t: number): void {
  header(g, 'Brief → Spec → Tickets', 'Generated draft · reviewed before it ships');
  const cols = ['Spec', 'Diagram', 'Tickets'];
  const cw = (W - 72 - 40) / 3;
  cols.forEach((c, i) => {
    const x = 36 + i * (cw + 20);
    g.fillStyle = '#E9E5DD';
    roundRect(g, x, 140, cw, 400, 10);
    g.fill();
    g.fillStyle = '#5A5B68';
    g.font = `700 14px ${MONO}`;
    g.fillText(c.toUpperCase(), x + 16, 168);
  });
  const step = Math.min(3, Math.floor(t * 1.5));
  // spec lines
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i === 0 ? '#16171F' : '#B8B3A8';
    g.fillRect(52, 196 + i * 30, (i === 0 ? 160 : 120 + ((i * 47) % 90)) * 1, i === 0 ? 12 : 8);
  }
  // diagram
  if (step >= 1) {
    const x = 36 + cw + 20;
    g.strokeStyle = '#3B6FD1';
    g.lineWidth = 2;
    [[x + 30, 200], [x + cw - 130, 200], [x + cw / 2 - 50, 330]].forEach(([bx, by]) => {
      roundRect(g, bx, by, 100, 56, 6);
      g.stroke();
    });
    g.beginPath();
    g.moveTo(x + 130, 228);
    g.lineTo(x + cw - 130, 228);
    g.moveTo(x + 80, 256);
    g.lineTo(x + cw / 2, 330);
    g.moveTo(x + cw - 80, 256);
    g.lineTo(x + cw / 2, 330);
    g.stroke();
  }
  // tickets
  const x = 36 + 2 * (cw + 20);
  const n = step >= 2 ? Math.min(5, Math.floor((t - 1.3) * 3) + 1) : 0;
  for (let i = 0; i < n; i++) {
    g.fillStyle = '#FFFFFF';
    roundRect(g, x + 14, 188 + i * 66, cw - 28, 54, 6);
    g.fill();
    g.fillStyle = ['#3B6FD1', '#2E9B6B', '#C9821F'][i % 3];
    g.fillRect(x + 14, 188 + i * 66, 4, 54);
    g.fillStyle = '#6A6B78';
    g.font = `12px ${MONO}`;
    g.fillText(`PROJ-${101 + i}`, x + 28, 208 + i * 66);
    g.fillStyle = '#16171F';
    g.font = `600 15px ${SANS}`;
    g.fillText(['Add schema migration', 'Build API endpoint', 'Wire up UI form', 'Write e2e test', 'Rollout + flag'][i], x + 28, 230 + i * 66);
  }
}

function drawDatabase(g: CanvasRenderingContext2D, W: number, _H: number, t: number): void {
  header(g, 'EER diagram', 'Phase 2 · relational mapping');
  const ents: [string, number, number, string[]][] = [
    // TODO(karston): swap in your project's real entities
    ['Customer', 70, 160, ['customer_id PK', 'email', 'name']],
    ['Order', 400, 160, ['order_id PK', 'customer_id FK', 'placed_at']],
    ['Product', 730, 160, ['product_id PK', 'name', 'price']],
    ['LineItem', 400, 380, ['order_id FK', 'product_id FK', 'qty']],
  ];
  const reveal = Math.min(ents.length, Math.floor(t * 2.5) + 1);
  g.strokeStyle = '#8A8B97';
  g.lineWidth = 2;
  if (reveal > 1) line(g, 290, 215, 400, 215);
  if (reveal > 2) line(g, 620, 215, 730, 215);
  if (reveal > 3) {
    line(g, 840, 270, 840, 330);
    line(g, 840, 330, 620, 430);
  }
  for (let i = 0; i < reveal; i++) {
    const [name, x, y, fields] = ents[i];
    g.fillStyle = '#FFFFFF';
    roundRect(g, x, y, 220, 40 + fields.length * 26, 8);
    g.fill();
    g.strokeStyle = '#16171F';
    g.stroke();
    g.fillStyle = '#16171F';
    g.fillRect(x, y, 220, 36);
    g.fillStyle = '#F6B85C';
    g.font = `700 17px ${MONO}`;
    g.fillText(name, x + 14, y + 24);
    g.font = `14px ${MONO}`;
    fields.forEach((f, j) => {
      g.fillStyle = f.includes('PK') ? '#16171F' : '#5A5B68';
      g.fillText(f, x + 14, y + 60 + j * 26);
    });
  }
}

function line(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
}

function drawDesk(g: CanvasRenderingContext2D, W: number, H: number, t: number): void {
  g.fillStyle = '#12141F';
  g.fillRect(0, 34, W, H - 34);
  g.strokeStyle = 'rgba(127,209,199,.8)';
  g.lineWidth = 1.5;
  // a slowly rotating wireframe cube: the desk in miniature
  const cx = W / 2;
  const cy = H / 2 + 10;
  const s = 120;
  const a = t * 0.6;
  const pts = [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => [x, y, z])));
  const proj = pts.map(([x, y, z]) => {
    const X = x * Math.cos(a) - z * Math.sin(a);
    const Z = x * Math.sin(a) + z * Math.cos(a);
    const Y = y * Math.cos(0.5) - Z * Math.sin(0.5);
    return [cx + X * s, cy + Y * s * 0.6];
  });
  pts.forEach((p, i) =>
    pts.forEach((q, j) => {
      if (j <= i) return;
      const diff = p.filter((v, k) => v !== q[k]).length;
      if (diff === 1) line(g, proj[i][0], proj[i][1], proj[j][0], proj[j][1]);
    }),
  );
  g.fillStyle = '#F6B85C';
  g.font = `700 22px ${MONO}`;
  g.textAlign = 'center';
  g.fillText('you are here', cx, H - 70);
  g.textAlign = 'left';
  g.fillStyle = '#6F7590';
  g.font = `15px ${MONO}`;
  wrap(g, 'three.js · typescript · vite · no models, no images', 600).forEach((l, i) => {
    g.textAlign = 'center';
    g.fillText(l, cx, H - 44 + i * 18);
    g.textAlign = 'left';
  });
}
