/**
 * Pure string renderers (no DOM), so they run both in the browser and inside
 * vite.config.ts at build time.
 */
import { profile, jobs, projects, education, type Link } from './data';

export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Strips "TODO(karston): ..." notes so they never ship to the public page. */
export const clean = (s: string): string => s.replace(/\s*TODO\(karston\):[^]*$/, '').trim();

export function profileLinks(): Link[] {
  const out: Link[] = [];
  if (profile.links.github) out.push({ label: 'GitHub', href: profile.links.github });
  if (profile.links.linkedin) out.push({ label: 'LinkedIn', href: profile.links.linkedin });
  if (profile.links.resumePdf) out.push({ label: 'Résumé (PDF)', href: profile.links.resumePdf });
  return out;
}

const dates = (a: string, b: string) => (b ? `${a} – ${b}` : a);

export function renderResumeHTML(): string {
  const links = profileLinks()
    .map(l => `<a href="${esc(l.href)}">${esc(l.label)}</a>`)
    .join('');
  const jobsHtml = jobs
    .map(
      j => `
      <article class="r-item">
        <div class="r-when">${esc(dates(j.start, j.end))}</div>
        <div class="r-body">
          <h3>${esc(j.role)}<span class="r-org"> · ${esc(j.org)}</span></h3>
          ${j.bullets.length ? `<ul>${j.bullets.map(b => `<li>${esc(clean(b))}</li>`).join('')}</ul>` : `<p>${esc(clean(j.summary))}</p>`}
          ${j.stack.length ? `<p class="r-stack">${j.stack.map(esc).join(' · ')}</p>` : ''}
        </div>
      </article>`,
    )
    .join('');
  const projHtml = projects
    .map(p => {
      const result = clean(p.result);
      return `
      <article class="r-item">
        <div class="r-when">${esc(p.year)}</div>
        <div class="r-body">
          <h3>${esc(p.title)}<span class="r-org"> · ${esc(p.role)}</span></h3>
          <p>${esc(p.tagline)} ${esc(clean(p.problem))}</p>
          ${result ? `<p>${esc(result)}</p>` : ''}
          <p class="r-stack">${p.stack.map(esc).join(' · ')}${p.links.map(l => ` · <a href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}</p>
        </div>
      </article>`;
    })
    .join('');
  const eduHtml = education
    .map(
      e => `
      <article class="r-item">
        <div class="r-when">${esc(e.when)}</div>
        <div class="r-body"><h3>${esc(e.degree)}<span class="r-org"> · ${esc(e.school)}</span></h3>${e.note ? `<p>${esc(e.note)}</p>` : ''}</div>
      </article>`,
    )
    .join('');

  return `
  <header class="r-head">
    <div>
      <h1>${esc(profile.name)}</h1>
      <p class="r-title">${esc(profile.title)} · ${esc(profile.location)}</p>
    </div>
    <div class="r-contact">
      <span class="r-email">${esc(profile.email)}</span>
      ${links ? `<span class="r-links">${links}</span>` : ''}
      <a class="r-desk" href="/">Open the 3D desk →</a>
    </div>
  </header>
  <main>
    <section><h2>Summary</h2><p class="r-summary">${esc(profile.summary)}</p></section>
    <section><h2>Experience</h2>${jobsHtml}</section>
    <section><h2>Projects</h2>${projHtml}</section>
    <section><h2>Education</h2>${eduHtml}</section>
    <section><h2>Skills</h2><p class="r-skills">${profile.skills.map(esc).join(' · ')}</p></section>
  </main>
  <footer class="r-foot">${esc(profile.openTo)}</footer>`;
}

/** Shown to visitors without JavaScript (and read by crawlers) on the desk page. */
export function renderNoscript(): string {
  return `<noscript><div class="noscript">
    <h1>${esc(profile.name)}</h1>
    <p>${esc(profile.summary)}</p>
    <p>This page is an interactive 3D desk and needs JavaScript. <a href="/resume/">Read the plain résumé</a> or email ${esc(profile.email)}.</p>
  </div></noscript>`;
}
