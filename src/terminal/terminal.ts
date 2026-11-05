/** A small zsh-flavored terminal drawn onto a canvas (the 3D monitor's screen). */

export type Color = 'text' | 'dim' | 'amber' | 'teal' | 'pink' | 'violet' | 'prompt';
type Line = [string, Color];
export type Command = (args: string[], raw: string) => void;

export const PROMPT = 'karston@austin ~ % ';
const COL: Record<Exclude<Color, 'prompt'>, string> = {
  text: '#E6E1D6',
  dim: '#6F7590',
  amber: '#F6B85C',
  teal: '#7FD1C7',
  pink: '#FF8CC3',
  violet: '#B6A6F5',
};

export class Terminal {
  private lines: Line[] = [];
  private queue: Line[] = [];
  private input = '';
  private auto = '';
  private autoT = 0;
  private lastQ = 0;
  private history: string[] = [];
  private hIndex = -1;
  private blink = -1;
  private dirty = true;
  private commands: Record<string, Command> = {};
  /** Fires on each simulated or real keystroke, so the 3D keyboard can react. */
  onKey: (key: string) => void = () => {};

  setCommands(c: Record<string, Command>): void {
    this.commands = c;
  }

  print(text: string, color: Color = 'text'): void {
    text.split('\n').forEach(l => this.queue.push([l, color]));
  }

  /** Forces a redraw on the next frame. */
  redraw(): void {
    this.dirty = true;
  }

  clear(): void {
    this.lines = [];
    this.queue = [];
    this.dirty = true;
  }

  /** Echoes a command line without running anything (used when the duck is clicked, etc). */
  echo(cmd: string): void {
    this.lines.push([PROMPT + cmd, 'prompt']);
    this.dirty = true;
  }

  /** Adds a character to the prompt as if typed (the cat uses this). */
  inject(ch: string): void {
    if (this.input.length >= 60) return;
    this.input += ch;
    this.onKey(ch);
    this.dirty = true;
  }

  /** Runs whatever is on the prompt right now. */
  submit(): void {
    const cmd = this.input;
    this.input = '';
    this.onKey('Enter');
    this.exec(cmd);
  }

  /** Types a command out character by character, then runs it. */
  type(cmd: string, instant = false): void {
    if (instant) {
      this.exec(cmd);
      return;
    }
    this.input = '';
    this.auto = cmd + '\n';
  }

  exec(raw: string): void {
    const line = raw.trim().replace(/\s+/g, ' ');
    this.lines.push([PROMPT + raw, 'prompt']);
    this.dirty = true;
    if (!line) return;
    this.history.push(line);
    this.hIndex = -1;
    const lower = line.toLowerCase();
    // longest matching command name wins, so "sudo hire-karston" beats "sudo"
    const names = Object.keys(this.commands).sort((a, b) => b.length - a.length);
    const hit = names.find(n => lower === n || lower.startsWith(n + ' '));
    if (hit) this.commands[hit](lower.slice(hit.length).trim().split(' ').filter(Boolean), line);
    else this.commands['*']?.([lower.split(' ')[0]], line);
  }

  /** Handles a real keypress. Returns true if the terminal used it. */
  handleKey(e: KeyboardEvent): boolean {
    const k = e.key;
    if (k === 'Enter') {
      this.onKey('Enter');
      const cmd = this.input;
      this.input = '';
      this.auto = '';
      this.exec(cmd);
    } else if (k === 'Backspace') {
      this.onKey('Backspace');
      this.input = this.input.slice(0, -1);
    } else if (k === 'ArrowUp' || k === 'ArrowDown') {
      if (!this.history.length) return true;
      if (k === 'ArrowUp') this.hIndex = this.hIndex < 0 ? this.history.length - 1 : Math.max(0, this.hIndex - 1);
      else this.hIndex = this.hIndex < 0 ? -1 : this.hIndex + 1;
      if (this.hIndex >= this.history.length) this.hIndex = -1;
      this.input = this.hIndex < 0 ? '' : this.history[this.hIndex];
    } else if (k === 'Tab') {
      const names = Object.keys(this.commands).filter(n => n !== '*' && n.startsWith(this.input.toLowerCase()));
      if (names.length === 1) this.input = names[0] + ' ';
      else if (names.length > 1 && this.input) this.print(names.sort().join('   '), 'dim');
    } else if (k.length === 1) {
      if (this.input.length >= 60) return true;
      this.onKey(k);
      this.input += k;
      this.auto = '';
    } else return false;
    this.dirty = true;
    return true;
  }

  /** Advances auto-typing and queued output. Returns true when the screen needs a redraw. */
  tick(t: number): boolean {
    if (this.auto && t - this.autoT > 0.045) {
      this.autoT = t;
      const ch = this.auto[0];
      this.auto = this.auto.slice(1);
      if (ch === '\n') {
        this.onKey('Enter');
        const cmd = this.input;
        this.input = '';
        this.exec(cmd);
      } else {
        this.input += ch;
        this.onKey(ch);
      }
      this.dirty = true;
    }
    if (this.queue.length && t - this.lastQ > 0.03) {
      this.lastQ = t;
      this.lines.push(this.queue.shift() as Line);
      if (this.lines.length > 200) this.lines.splice(0, 50);
      this.dirty = true;
    }
    const b = Math.floor(t * 2.2);
    if (b !== this.blink) {
      this.blink = b;
      this.dirty = true;
    }
    const d = this.dirty;
    this.dirty = false;
    return d;
  }

  draw(g: CanvasRenderingContext2D, W: number, H: number, t: number): void {
    g.fillStyle = '#0D111D';
    g.fillRect(0, 0, W, H);
    const v = g.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 640);
    v.addColorStop(0, 'rgba(127,209,199,.06)');
    v.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    drawTitleBar(g, W, 'karston — zsh — 80×24');
    g.font = '19px "Space Mono", monospace';
    g.textAlign = 'left';
    const LH = 26;
    const rows = this.lines.slice(-19);
    rows.forEach(([txt, col], i) => {
      const y = 66 + i * LH;
      if (col === 'prompt') {
        g.fillStyle = COL.teal;
        g.fillText(PROMPT, 22, y);
        g.fillStyle = COL.text;
        g.fillText(txt.slice(PROMPT.length), 22 + g.measureText(PROMPT).width, y);
      } else {
        g.fillStyle = COL[col];
        g.fillText(txt, 22, y);
      }
    });
    const y = 66 + rows.length * LH;
    g.fillStyle = COL.teal;
    g.fillText(PROMPT, 22, y);
    const px = 22 + g.measureText(PROMPT).width;
    g.fillStyle = COL.text;
    g.fillText(this.input, px, y);
    if (Math.floor(t * 2.2) % 2 === 0) {
      g.fillStyle = COL.amber;
      g.fillRect(px + g.measureText(this.input).width + 2, y - 18, 11, 23);
    }
    scanlines(g, W, H);
  }
}

export function drawTitleBar(g: CanvasRenderingContext2D, W: number, title: string): void {
  g.fillStyle = '#171C2C';
  g.fillRect(0, 0, W, 34);
  ['#FF6B6B', '#F6B85C', '#7FD1C7'].forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath();
    g.arc(20 + i * 20, 17, 6, 0, Math.PI * 2);
    g.fill();
  });
  g.font = '15px "Space Mono", monospace';
  g.fillStyle = '#6F7590';
  g.textAlign = 'center';
  g.fillText(title, W / 2, 22);
  g.textAlign = 'left';
}

export function scanlines(g: CanvasRenderingContext2D, W: number, H: number): void {
  g.fillStyle = 'rgba(0,0,0,.12)';
  for (let s = 34; s < H; s += 3) g.fillRect(0, s, W, 1);
}
