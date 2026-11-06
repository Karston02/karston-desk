import './styles/desk.css';
import { profile } from './content/data';
import { Sound } from './audio';
import { Panel, SECTIONS, setSecretsSource, type PanelId } from './ui/panel';
import { runBoot } from './ui/boot';
import { Terminal } from './terminal/terminal';
import { buildCommands, commandFor } from './terminal/commands';
import { MonitorScreen } from './scene/screens';
import { Secrets } from './secrets';
import { Snake } from './games/snake';
import { Tetris } from './games/tetris';
import type { World } from './scene/world';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer: coarse)').matches;

$('pitch').textContent = profile.pitch;
if (touch) {
  const hint = document.querySelector('.brand .hint span');
  if (hint) hint.textContent = 'Tap anything on the desk';
}

const sound = new Sound();
const term = new Terminal();
const screen = new MonitorScreen(term);
let world: World | null = null;
let booted = false;

/* ---------- Toasts + secrets ---------- */
const toast = $('toast');
let toastTimer = 0;
function showToast(html: string): void {
  toast.innerHTML = html;
  toast.hidden = false;
  toast.classList.remove('in');
  void toast.offsetWidth;
  toast.classList.add('in');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.hidden = true), 3800);
}
const secretsCount = $('secretsCount');
const secrets = new Secrets((s, n, total) => {
  secretsCount.textContent = `${n}/${total}`;
  showToast(`<b>★ Secret found: ${s.name}</b><span>${n} of ${total}</span>`);
  term.print(`★ secret found: ${s.name} (${n}/${total})`, 'amber');
  if (n === total)
    setTimeout(() => {
      showToast('<b>★ All secrets found</b><span>You should probably say hello.</span>');
      term.print('you found every secret. type `contact` :)', 'pink');
    }, 4000);
  if (panel.current === 'secrets') panel.show('secrets');
});
secretsCount.textContent = `${secrets.count}/${secrets.total}`;
setSecretsSource(() => secrets.found);
$('secretsBtn').addEventListener('click', () => open('secrets'));

/* ---------- Panels ---------- */
const dock = $('dock');
const sectionKey = (id: PanelId | null) => (id?.startsWith('project:') ? 'projects' : id === 'secrets' ? null : id);
/** Set by the whiteboard so the Experience panel opens with the camera on the whiteboard instead of the ticket board. */
let viewOverride: { id: PanelId; view: string } | null = null;

const panel = new Panel(
  $('panel'),
  id => {
    if (id) setSitting(false, true);
    const view = id && viewOverride?.id === id ? viewOverride.view : sectionKey(id);
    viewOverride = null;
    world?.focus(view, !!id);
    screen.showProject(id?.startsWith('project:') ? id.slice(8) : null, performance.now() / 1000);
    const key = sectionKey(id);
    [...dock.children].forEach(b => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.id === key)));
  },
  id => open(id),
  cmd => run(cmd),
);

/** Opens a panel by typing the matching command into the terminal (or instantly if motion is reduced). */
function open(id: PanelId): void {
  stopGame(true);
  screen.showProject(null, 0);
  if (world && !reduced && booted) term.type(id === 'secrets' ? 'secrets' : commandFor(id));
  else panel.show(id);
}
function run(cmd: string): void {
  if (world && !reduced) term.type(cmd);
  else term.exec(cmd);
}

SECTIONS.forEach(s => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.id = s.id;
  b.innerHTML = `${s.label} <i>${s.obj}</i>`;
  b.addEventListener('click', () => open(s.id));
  dock.appendChild(b);
});

/* ---------- Sitting + games ---------- */
function setSitting(on: boolean, quiet = false): void {
  if (!world || world.sitting === on) return;
  if (on) panel.show(null); // close panels first: closing one sends the camera home
  world.sit(on);
  document.body.classList.toggle('sitting', on);
  if (on) {
    secrets.unlock('sit');
    if (!quiet) term.print(touch ? 'you pull up a chair. tap "stand up" to leave.' : 'you pull up a chair. esc to stand up.', 'dim');
  } else stopGame(true);
}
function startGame(name: 'snake' | 'tetris'): void {
  if (!world) return term.print('the desk is still loading.', 'dim');
  setSitting(true, true);
  const game = name === 'snake' ? new Snake(score => score >= 5 && secrets.unlock('snake')) : new Tetris(lines => lines >= 1 && secrets.unlock('tetris'));
  screen.play(game);
  term.print(`starting ${name}... ${touch ? 'swipe to move' + (name === 'tetris' ? ', tap to rotate' : '') : 'esc to quit'}`, 'teal');
}
function stopGame(quiet = false): void {
  const g = screen.currentGame;
  if (!g) return;
  screen.play(null);
  if (!quiet) term.print(`${g.name}: final score ${g.score}`, 'amber');
}
$('standBtn').addEventListener('click', () => {
  if (screen.currentGame) stopGame();
  setSitting(false);
});

/* ---------- Lamp, sound, duck, cat ---------- */
const lampBtn = $('lampBtn');
const soundBtn = $('soundBtn');
function setLamp(on: boolean, announce = true): void {
  world?.setLamp(on);
  lampBtn.setAttribute('aria-pressed', String(on));
  sound.blip('click');
  if (!on) secrets.unlock('night-owl');
  if (announce) term.print(on ? 'lamp: on' : 'lamp: off. very moody.', on ? 'amber' : 'pink');
}
function toggleRain(): boolean {
  sound.setRain(!sound.on);
  soundBtn.setAttribute('aria-pressed', String(sound.on));
  if (sound.on) secrets.unlock('rainy-day');
  return sound.on;
}
function quack(): void {
  world?.quack();
  sound.unlock();
  sound.blip('squeak');
  ['you explain the bug to the duck.', 'the duck stares back.', 'you realize it was an off-by-one error.'].forEach((l, i) => term.print(l, i === 2 ? 'amber' : 'dim'));
  secrets.unlock('rubber-duck');
}
function wakeCat(): boolean {
  const ok = world?.wakeCat() ?? false;
  if (ok) secrets.unlock('cat-nap');
  return ok;
}
lampBtn.addEventListener('click', () => setLamp(!(world?.lampOn ?? true)));
soundBtn.addEventListener('click', () => toggleRain());

/* ---------- Terminal ---------- */
term.setCommands(
  buildCommands({
    term,
    show: id => panel.show(id),
    toggleLamp: () => setLamp(!(world?.lampOn ?? true)),
    toggleRain,
    quack,
    setSky: p => world?.setSky(p) ?? null,
    wakeCat,
    unlock: id => secrets.unlock(id),
    startGame,
    sit: on => {
      if (!world) return term.print('the desk is still loading.', 'dim');
      if (world.sitting === on) return term.print(on ? 'already sitting.' : 'already standing.', 'dim');
      setSitting(on);
    },
    secretsSummary: () => `secrets found: ${secrets.count}/${secrets.total}`,
  }),
);
term.onKey = k => {
  world?.pressKey(k);
  sound.blip('key');
};
term.print('Last login: ' + new Date().toDateString() + ' on ttys001', 'dim');
term.print(`hi, I'm ${profile.first}. this is my desk.`, 'amber');
term.print('click around, or type `help` and press enter.');

/* ---------- Keyboard ---------- */
addEventListener('keydown', e => {
  if (!booted || e.metaKey || e.ctrlKey || e.altKey) return;
  const game = screen.currentGame;
  if (game) {
    if (e.key === 'Escape' || (e.key === 'q' && game.over)) stopGame();
    else if (game.handleKey(e.key.length === 1 ? e.key.toLowerCase() : e.key)) {
      world?.pressKey(e.key);
      e.preventDefault();
    }
    return;
  }
  if (e.key === 'Escape') {
    if (world?.sitting) setSitting(false);
    else if (panel.current) panel.show(null);
    return;
  }
  const ae = document.activeElement as HTMLElement | null;
  const onControl = ae && ae !== document.body && (ae.tagName === 'BUTTON' || ae.tagName === 'A');
  if (onControl && (e.key === 'Enter' || e.key === ' ' || e.key === 'Tab')) return;
  if (screen.showingProject && e.key.length === 1) screen.showProject(null, 0);
  if (term.handleKey(e)) {
    sound.unlock();
    if (e.key === ' ' || e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Backspace' || e.key === "'" || e.key === '/') e.preventDefault();
  }
});

/* ---------- Touch: swipe controls for games, tilt to look around ---------- */
const canvas = $<HTMLCanvasElement>('scene');
let touchStart: { x: number; y: number } | null = null;
canvas.addEventListener('touchstart', e => (touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }), { passive: true });
canvas.addEventListener('touchend', e => {
  const g = screen.currentGame;
  if (!g || !touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  let key = '';
  if (Math.hypot(dx, dy) < 24) key = g.over ? 'Enter' : g.name === 'tetris' ? 'ArrowUp' : '';
  else if (Math.abs(dx) > Math.abs(dy)) key = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
  else key = dy > 0 ? (g.name === 'tetris' ? ' ' : 'ArrowDown') : 'ArrowUp';
  if (key) g.handleKey(key);
});

let tiltAsked = false;
function enableTilt(): void {
  if (tiltAsked || reduced || !touch) return;
  tiltAsked = true;
  const listen = () =>
    addEventListener('deviceorientation', e => {
      if (e.gamma === null || e.beta === null) return;
      // gamma: left/right tilt; beta: front/back (phones are usually held about 45° up)
      world?.setPointer(Math.max(-0.5, Math.min(0.5, e.gamma / 40)), Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 50)));
    });
  const DO = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  if (DO?.requestPermission) DO.requestPermission().then(r => r === 'granted' && listen(), () => {});
  else listen();
}
addEventListener('touchend', enableTilt, { once: true });

/* ---------- 3D world, downloaded while the boot screen types ---------- */
const label = $('label');
if (import.meta.env.DEV) (window as unknown as { __term: Terminal }).__term = term;

const worldReady: Promise<World | null> = import('./scene/world')
  .then(({ createWorld }) =>
    createWorld({
      canvas,
      screen,
      reduced,
      onPick: key => {
        sound.unlock();
        if (key === 'lamp') setLamp(!(world?.lampOn ?? true));
        else if (key === 'whiteboard') {
          viewOverride = { id: 'work', view: 'whiteboard' };
          open('work');
        }
        else if (key === 'cat') {
          if (wakeCat()) term.print('the cat wakes up and stretches.', 'amber');
        } else if (key === 'duck') {
          term.echo('duck');
          quack();
        } else if (key === 'projects' && world?.sitting) return;
        else open(key as PanelId);
      },
      onHover: (text, x, y) => {
        label.hidden = !text;
        if (text) {
          label.textContent = text;
          label.style.left = x + 'px';
          label.style.top = y + 'px';
        }
      },
      onBuzz: () => sound.blip('buzz'),
      onCatKey: k => {
        screen.showProject(null, 0);
        term.inject(k);
      },
      onCatCrossed: () => {
        term.submit();
        term.print('the cat walked across your keyboard.', 'amber');
      },
      onAutoLamp: on => {
        lampBtn.setAttribute('aria-pressed', String(on));
        if (booted) term.print(on ? 'the sun went down. lamp on.' : 'good morning. lamp off.', 'dim');
      },
    }),
  )
  .catch(err => {
    console.error(err);
    return null;
  })
  .then(w => {
    world = w;
    if (w) lampBtn.setAttribute('aria-pressed', String(w.lampOn));
    else {
      const f = $('fallback');
      f.hidden = false;
      f.innerHTML = `<p>Your browser couldn't start the 3D desk.</p><p><a href="/resume/">Read the plain résumé</a> or use the buttons below.</p>`;
    }
    return w;
  });

runBoot($('boot'), $('bootText'), reduced, worldReady).then(() => {
  booted = true;
  world?.lightsOn();
});
