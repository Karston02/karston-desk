import { profile, jobs, projects, education } from '../content/data';
import { esc, clean, profileLinks } from '../content/render';
import { SECRETS } from '../secrets';

let secretsFound: () => Set<string> = () => new Set();
/** Lets the panel read which secrets the visitor has found. */
export function setSecretsSource(fn: () => Set<string>): void {
  secretsFound = fn;
}

/** Panel ids: a section, or `project:<slug>` for a case study. */
export type PanelId = 'about' | 'projects' | 'work' | 'edu' | 'contact' | 'resume' | 'secrets' | `project:${string}`;

export const SECTIONS: { id: PanelId; label: string; obj: string }[] = [
  { id: 'about', label: 'About', obj: 'mug' },
  { id: 'projects', label: 'Projects', obj: 'monitor' },
  { id: 'work', label: 'Experience', obj: 'board' },
  { id: 'edu', label: 'Education', obj: 'books' },
  { id: 'resume', label: 'Résumé', obj: 'notebook' },
  { id: 'contact', label: 'Contact', obj: 'phone' },
];

const chips = (xs: string[]) => (xs.length ? `<div class="chips">${xs.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : '');
const linksHtml = () =>
  profileLinks()
    .map(l => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
    .join('');

function render(id: PanelId): string {
  if (id.startsWith('project:')) {
    const p = projects.find(x => x.slug === id.slice(8));
    if (!p) return render('projects');
    const result = clean(p.result);
    return `
      <button class="back" type="button" data-open="projects">← All projects</button>
      <div class="obj">Case study${p.year ? ` · ${esc(p.year)}` : ''}</div>
      <h2>${esc(p.title)}</h2>
      <p>${esc(p.tagline)}</p>
      <p class="when">${esc(p.role)}</p>
      ${chips(p.stack)}
      ${p.image ? `<img class="shot" src="${esc(p.image)}" alt="Screenshot of ${esc(p.title)}" />` : ''}
      <h3>Problem</h3><p>${esc(clean(p.problem))}</p>
      <h3>Approach</h3><ul>${p.approach.map(a => `<li>${esc(clean(a))}</li>`).join('')}</ul>
      ${result ? `<h3>Result</h3><p>${esc(result)}</p>` : ''}
      ${p.links.length ? `<div class="links">${p.links.map(l => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div>` : ''}
      <p class="tip">The monitor is showing this project now.</p>`;
  }
  switch (id) {
    case 'secrets': {
      const found = secretsFound();
      return `
        <div class="obj">Secrets · ${found.size} of ${SECRETS.length}</div>
        <h2>${found.size === SECRETS.length ? 'You found everything.' : 'Things hidden in the room'}</h2>
        <p class="m">${found.size === SECRETS.length ? 'Thanks for poking around. You should probably say hello.' : 'Hints for the ones you have not found yet. Progress is saved in this browser.'}</p>
        ${SECRETS.map(s => {
          const ok = found.has(s.id);
          return `<div class="secret ${ok ? 'found' : ''}"><span class="mark">${ok ? '★' : '☆'}</span><div><b>${ok ? esc(s.name) : '???'}</b><span class="m">${esc(s.hint)}</span></div></div>`;
        }).join('')}`;
    }
    case 'about':
      return `
        <div class="obj">The mug · About</div>
        <h2>Hi, I'm ${esc(profile.first)}.</h2>
        ${profile.about.map((p, i) => `<p class="${i ? 'm' : ''}">${esc(p)}</p>`).join('')}
        <p class="tip">Try typing <b>neofetch</b>.</p>`;
    case 'projects':
      return `
        <div class="obj">The monitor · Projects</div>
        <h2>Things I've built</h2>
        ${projects
          .map(
            p => `<button class="proj" type="button" data-open="project:${esc(p.slug)}">
              <b>${esc(p.title)} <span>Read →</span></b>
              <span class="m">${esc(p.tagline)}</span>${chips(p.stack)}</button>`,
          )
          .join('')}
        <h3>On this machine</h3>
        <div class="row"><button class="btn ghost" type="button" data-run="sit">Sit down at the desk</button><button class="btn ghost" type="button" data-run="snake">Play snake</button><button class="btn ghost" type="button" data-run="tetris">Play tetris</button></div>`;
    case 'work':
      return `
        <div class="obj">The board · Experience</div>
        <h2>Where I've worked</h2>
        ${jobs
          .map(
            j => `<div class="ticket ${j.status}">
              <div class="top"><span>${esc(j.ticket)} · ${esc(j.end ? `${j.start} – ${j.end}` : j.start)}</span><span class="status">${j.status === 'done' ? 'Done' : 'In progress'}</span></div>
              <b>${esc(j.role)}</b><span class="m">${esc(j.org)}</span>
              ${j.bullets.length ? `<ul class="m">${j.bullets.map(b => `<li>${esc(clean(b))}</li>`).join('')}</ul>` : ''}
              ${chips(j.stack)}
            </div>`,
          )
          .join('')}`;
    case 'edu':
      return `
        <div class="obj">The books · Education</div>
        <h2>School</h2>
        ${education.map(e => `<div class="item"><span class="when">${esc(e.when)}</span><b>${esc(e.degree)}, ${esc(e.school)}</b>${e.note ? `<span class="m">${esc(e.note)}</span>` : ''}</div>`).join('')}`;
    case 'resume':
      return `
        <div class="obj">The notebook · Résumé</div>
        <h2>The short version</h2>
        <p class="m">${esc(profile.summary)}</p>
        <div class="row">
          <a class="btn" href="/resume/">Open plain résumé</a>
          ${profile.links.resumePdf ? `<a class="btn ghost" href="${esc(profile.links.resumePdf)}" download>Download PDF</a>` : ''}
        </div>
        <p class="tip">Recruiter in a hurry? The plain page has everything, no WebGL needed.</p>`;
    case 'contact':
      return `
        <div class="obj">The phone · Contact</div>
        <h2>Say hello</h2>
        <p>${esc(profile.openTo)}</p>
        <span class="email" id="email">${esc(profile.email)}</span>
        <div class="row"><button class="btn" type="button" id="copy">Copy email</button><a class="btn ghost" href="mailto:${esc(profile.email)}">Email me</a></div>
        <div class="links">${linksHtml()}</div>`;
  }
  return '';
}

export class Panel {
  current: PanelId | null = null;

  constructor(
    private el: HTMLElement,
    /** Called whenever the open panel changes. */
    private onChange: (id: PanelId | null) => void,
    /** Called when something inside the panel asks to open another panel (lets the terminal echo it). */
    private onRequest: (id: PanelId) => void,
    /** Called when a panel button wants to run a terminal command. */
    private onRun: (cmd: string) => void = () => {},
  ) {
    el.addEventListener('click', e => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-open]');
      if (t) this.onRequest(t.dataset.open as PanelId);
      const r = (e.target as HTMLElement).closest<HTMLElement>('[data-run]');
      if (r) this.onRun(r.dataset.run as string);
    });
  }

  show(id: PanelId | null): void {
    this.current = id;
    document.body.classList.toggle('panel-open', !!id);
    if (!id) {
      this.el.hidden = true;
    } else {
      // restart the slide-in animation
      this.el.hidden = true;
      void this.el.offsetWidth;
      this.el.hidden = false;
      this.el.innerHTML = `<button class="close" type="button" aria-label="Close panel">×</button>${render(id)}`;
      this.el.scrollTop = 0;
      this.el.querySelector('.close')?.addEventListener('click', () => this.show(null));
      const copy = this.el.querySelector<HTMLButtonElement>('#copy');
      copy?.addEventListener('click', () => {
        navigator.clipboard?.writeText(profile.email).then(
          () => (copy.textContent = 'Copied'),
          () => (copy.textContent = 'Select the address above'),
        );
      });
    }
    this.onChange(id);
  }
}
