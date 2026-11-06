import { projects, type Project } from '../content/data';
import { drawTitleBar, scanlines, type Terminal } from '../terminal/terminal';
import { roundRect, wrap } from './canvas';
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

  /** True when the screen shows mostly-white content (project previews without a screenshot). */
  get isLight(): boolean {
    return !!this.project && !this.game && !this.images.get(this.project.slug)?.naturalWidth;
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
    if (p.screen === 'trading') drawTrading(g, W, H, t);
    else if (p.screen === 'proxy') drawProxy(g, W, H, t);
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

function drawTrading(g: CanvasRenderingContext2D, W: number, _H: number, t: number): void {
  header(g, 'Strategy · backtest', 'Signals from price, indicators and Form 4 insider filings');
  const x0 = 36;
  const y0 = 140;
  const cw = 620;
  const ch = 380;
  g.fillStyle = '#FFFFFF';
  roundRect(g, x0, y0, cw, ch, 10);
  g.fill();
  g.strokeStyle = '#E4E0D8';
  g.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    g.beginPath();
    g.moveTo(x0 + 12, y0 + (ch / 5) * i);
    g.lineTo(x0 + cw - 12, y0 + (ch / 5) * i);
    g.stroke();
  }
  const N = 120;
  const price = (i: number) => y0 + ch * 0.62 - i * 1.1 - 55 * Math.sin(i / 11) - 22 * Math.sin(i / 3.3);
  const px = (i: number) => x0 + 20 + (i / (N - 1)) * (cw - 40);
  const shown = Math.min(N, Math.floor(t * 60) + 2);
  g.strokeStyle = '#3B6FD1';
  g.lineWidth = 2.5;
  g.beginPath();
  for (let i = 0; i < shown; i++) (i ? g.lineTo : g.moveTo).call(g, px(i), price(i));
  g.stroke();
  // buy at local price lows (largest y), sell at local highs (smallest y)
  const signals: [number, 'BUY' | 'SELL'][] = [];
  for (let i = 4; i < N - 4; i++) {
    const win = [-4, -3, -2, -1, 1, 2, 3, 4].map(d => price(i + d));
    if (win.every(y => price(i) > y)) signals.push([i, 'BUY']);
    else if (win.every(y => price(i) < y)) signals.push([i, 'SELL']);
  }
  for (const [i, side] of signals) {
    if (i >= shown) break;
    const x = px(i);
    const y = price(i);
    const buy = side === 'BUY';
    g.fillStyle = buy ? '#2E9B6B' : '#C2412D';
    g.beginPath();
    if (buy) {
      g.moveTo(x, y + 10);
      g.lineTo(x - 8, y + 24);
      g.lineTo(x + 8, y + 24);
    } else {
      g.moveTo(x, y - 10);
      g.lineTo(x - 8, y - 24);
      g.lineTo(x + 8, y - 24);
    }
    g.fill();
  }
  // signal feed
  const fx = x0 + cw + 24;
  const fw = W - fx - 36;
  g.fillStyle = '#8A8B97';
  g.font = `13px ${MONO}`;
  g.fillText('SIGNALS', fx, y0 + 18);
  const feed: [string, string, string][] = [
    ['BUY', 'NVDA', 'Form 4 cluster buy'],
    ['SELL', 'AAPL', 'RSI > 70'],
    ['BUY', 'AMD', 'MACD cross'],
    ['SELL', 'TSLA', 'stop hit'],
    ['BUY', 'MSFT', 'insider buy'],
  ];
  const n = Math.min(feed.length, Math.floor(t * 1.6) + 1);
  for (let i = 0; i < n; i++) {
    const [side, sym, why] = feed[i];
    const y = y0 + 36 + i * 68;
    g.fillStyle = i % 2 ? '#F4F2EE' : '#ECE9E2';
    roundRect(g, fx, y, fw, 56, 8);
    g.fill();
    g.fillStyle = side === 'BUY' ? '#2E9B6B' : '#C2412D';
    g.font = `700 14px ${MONO}`;
    g.fillText(side, fx + 12, y + 24);
    g.fillStyle = '#16171F';
    g.font = `700 17px ${SANS}`;
    g.fillText(sym, fx + 70, y + 24);
    g.fillStyle = '#5A5B68';
    g.font = `14px ${SANS}`;
    g.fillText(why, fx + 12, y + 45);
  }
}

function drawProxy(g: CanvasRenderingContext2D, W: number, _H: number, t: number): void {
  header(g, 'proxy.py · :8080', 'Threaded · GET + CONNECT · JSON logging on');
  const rows: [string, string, string, string][] = [
    ['CONNECT', 'github.com:443', '200', 'thread-3'],
    ['GET', 'example.com/', '200', 'thread-1'],
    ['CONNECT', 'fonts.gstatic.com:443', '200', 'thread-4'],
    ['GET', 'neverssl.com/', '301', 'thread-2'],
    ['GET', 'httpbin.org/headers', '200', 'thread-5'],
    ['CONNECT', 'api.github.com:443', '200', 'thread-3'],
  ];
  g.fillStyle = '#8A8B97';
  g.font = `13px ${MONO}`;
  ['METHOD', 'HOST', 'STATUS', 'WORKER'].forEach((h, i) => g.fillText(h, [36, 170, 470, 560][i], 160));
  const shown = Math.min(rows.length, Math.floor(t * 3) + 1);
  for (let i = 0; i < shown; i++) {
    const y = 196 + i * 44;
    const [m, host, status, worker] = rows[i];
    g.fillStyle = i % 2 ? '#F4F2EE' : '#ECE9E2';
    g.fillRect(28, y - 26, 640, 38);
    g.font = `700 15px ${MONO}`;
    g.fillStyle = m === 'GET' ? '#3B6FD1' : '#8A4FBF';
    g.fillText(m, 36, y);
    g.fillStyle = '#16171F';
    g.font = `16px ${SANS}`;
    g.fillText(host, 170, y);
    g.fillStyle = status === '200' ? '#2E9B6B' : '#C9821F';
    g.font = `700 15px ${MONO}`;
    g.fillText(status, 470, y);
    g.fillStyle = '#6A6B78';
    g.font = `14px ${MONO}`;
    g.fillText(worker, 560, y);
  }
  // last logged request, as JSON
  const jx = 696;
  g.fillStyle = '#16171F';
  roundRect(g, jx, 140, W - jx - 36, 400, 10);
  g.fill();
  const json = ['{', '  "method": "GET",', '  "host": "example.com",', '  "headers": {', '    "Connection": "close",', '    "Proxy-Connection": null', '  },', '  "http": "1.0",', '  "status": 200', '}'];
  g.font = `14px ${MONO}`;
  json.forEach((l, i) => {
    g.fillStyle = l.includes('"') ? '#7FD1C7' : '#F1ECE2';
    g.fillText(l, jx + 18, 176 + i * 30);
  });
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
  const slots: [number, number][] = [[70, 160], [400, 160], [730, 160], [400, 380]];
  const schema = projects.find(p => p.screen === 'database')?.schema ?? [];
  const ents = schema.slice(0, slots.length).map(({ name, fields }, i) => [name, slots[i][0], slots[i][1], fields] as const);
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
