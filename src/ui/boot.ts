const LINES: [string, string, string?][] = [
  ['karston@austin ~ % ', './desk --lights-on'],
  ['', 'mounting room ............ ', 'ok'],
  ['', 'brewing coffee ........... ', 'ok'],
  ['', 'plugging in neon ......... ', 'ok'],
  ['', 'pinning tickets .......... ', 'ok'],
  ['', 'waking the cat ........... ', 'no'],
  ['', 'starting rain ............ ', 'ok'],
];

const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);

/**
 * Types the boot log while the 3D engine downloads, then fades out.
 * If the download is slow, it says so and points to the plain résumé.
 * Resolves when the room should light up. `quick` (phones) types a short
 * version in under a second, so people on a phone get to the desk fast.
 */
export function runBoot(el: HTMLElement, pre: HTMLElement, skip: boolean, ready: Promise<unknown>, quick = false): Promise<void> {
  const lines = quick ? [LINES[0], LINES[1], LINES[3]] : LINES;
  const speed = quick ? 0.4 : 1;
  if (quick) {
    const foot = el.querySelector('.boot-foot span');
    if (foot) foot.textContent = 'tap to skip';
  }
  return new Promise(resolve => {
    let done = false;
    let loaded = false;
    let typed = false;
    let skipRequested = false;
    const started = performance.now();
    void ready.then(() => {
      loaded = true;
      if (typed || skipRequested) finish();
    });
    const finish = () => {
      if (done) return;
      if (!loaded) {
        skipRequested = true;
        return;
      }
      done = true;
      el.classList.add('out');
      setTimeout(() => (el.hidden = true), 550);
      removeEventListener('keydown', onKey);
      resolve();
    };
    const onKey = () => finish();
    if (skip) {
      void ready.then(() => {
        el.hidden = true;
        done = true;
        resolve();
      });
      return;
    }
    el.addEventListener('click', e => {
      if ((e.target as HTMLElement).closest('a')) return;
      finish();
    });
    addEventListener('keydown', onKey);

    let li = 0;
    let ci = 0;
    let html = '';
    const waiting = () => {
      if (done) return;
      const secs = (performance.now() - started) / 1000;
      const dots = '.'.repeat(1 + (Math.floor(secs * 3) % 3));
      let extra = `loading 3d engine ${dots}`;
      if (secs > 6) {
        extra += '\n\n<span class="slow">slow connection? <a href="/resume/">read the plain résumé instead →</a></span>';
        el.classList.add('is-slow');
      }
      pre.innerHTML = html + extra;
      setTimeout(waiting, 300);
    };
    const step = () => {
      if (done) return;
      if (li >= lines.length) {
        typed = true;
        if (loaded) setTimeout(finish, quick ? 150 : 350);
        else waiting();
        return;
      }
      const [prefix, body, ok] = lines[li];
      if (ci === 0) html += esc(prefix);
      if (ci < body.length) {
        html += esc(body[ci++]);
        pre.innerHTML = `${html}<span class="ok">█</span>`;
        setTimeout(step, (li === 0 ? 38 : 8) * speed);
      } else {
        if (ok) html += `<span class="${ok === 'ok' ? 'ok' : 'no'}">${ok}</span>`;
        html += '\n';
        li++;
        ci = 0;
        pre.innerHTML = html;
        setTimeout(step, (li === 1 ? 260 : 110) * speed);
      }
    };
    step();
  });
}
