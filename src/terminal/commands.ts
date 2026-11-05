import { profile, jobs, projects, education } from '../content/data';
import type { Command, Terminal } from './terminal';
import type { PanelId } from '../ui/panel';
import { austinClock, sunTimesUTC, type SkyPhase, type SkyState } from '../scene/sky';

export interface CommandDeps {
  term: Terminal;
  show: (id: PanelId | null) => void;
  toggleLamp: () => void;
  toggleRain: () => boolean;
  quack: () => void;
  setSky: (phase: SkyPhase | null) => SkyState | null;
  wakeCat: () => boolean;
  unlock: (id: string) => void;
  startGame: (name: 'snake' | 'tetris') => void;
  sit: (on: boolean) => void;
  secretsSummary: () => string;
}

export function buildCommands({ term, show, toggleLamp, toggleRain, quack, setSky, wakeCat, unlock, startGame, sit, secretsSummary }: CommandDeps): Record<string, Command> {
  const p = term.print.bind(term);

  const openProject = (args: string[]) => {
    const slug = (args[0] || '').replace(/\/$/, '').replace(/^projects\//, '');
    const proj = projects.find(x => x.slug === slug);
    if (!proj) {
      p(slug ? `open: no such project: ${slug}` : 'usage: open <project>', 'pink');
      p('projects: ' + projects.map(x => x.slug).join(', '), 'dim');
      return;
    }
    p(`opening ${proj.slug}...`, 'dim');
    show(`project:${proj.slug}`);
  };

  const cmds: Record<string, Command> = {
    help: () => {
      p('commands:', 'amber');
      [
        ['about', 'who I am'],
        ['projects', "things I've built"],
        ['open <project>', 'read a case study'],
        ['work', "where I've worked (git log)"],
        ['education', 'school'],
        ['resume', 'the short version'],
        ['contact', 'get in touch'],
        ['neofetch', 'system info'],
        ['snake / tetris', 'games on this monitor'],
        ['sit / stand', 'pull up a chair'],
        ['secrets', "what you've found"],
        ['lamp', 'toggle the lamp'],
        ['duck', 'consult the duck'],
        ['rain', 'toggle rain sound'],
        ['sky [phase]', 'dawn, day, dusk, night or live'],
        ['sun', "today's sunrise and sunset in Austin"],
        ['clear', 'clear the screen'],
      ].forEach(([c, d]) => p('  ' + c.padEnd(16) + d));
      p('tab completes · ↑ ↓ history', 'dim');
    },
    about: () => {
      p(`${profile.name}, ${profile.title.toLowerCase()}, ${profile.location}`, 'teal');
      p(`${jobs[0].role} @ ${jobs[0].org}`);
      p(education.map(e => `${e.degree} @ ${e.school}`).join(' · '), 'dim');
      show('about');
    },
    projects: () => {
      p(`total ${projects.length}`, 'dim');
      projects.forEach(x => p(`drwxr-xr-x  karston  ${x.slug}/`, 'teal'));
      p('try: open ' + projects[0].slug, 'dim');
      show('projects');
    },
    open: openProject,
    cd: args => (args[0]?.startsWith('projects/') ? openProject(args) : p('you are already where you need to be.', 'dim')),
    cat: args => {
      const a = args[0] || '';
      if (a === 'resume.txt' || a === 'resume') return cmds.resume([], '');
      if (a.startsWith('projects/')) return openProject(args);
      if (!a) return p('meow? (that is `cat resume.txt`. the real cat is on the desk. try `pet`)', 'dim');
      p(`cat: ${a}: try resume.txt or projects/<name>`, 'pink');
    },
    work: () => {
      jobs.forEach((j, i) =>
        p(`* ${j.ticket}  ${i === 0 ? '(HEAD -> main) ' : ''}${j.role} @ ${j.org}`, i === 0 ? 'amber' : j.status === 'done' ? 'text' : 'dim'),
      );
      show('work');
    },
    education: () => {
      education.forEach((e, i) => p(`${e.degree} · ${e.school} · ${e.when}`, i ? 'text' : 'violet'));
      show('edu');
    },
    resume: () => {
      p(profile.summary.match(/.{1,70}(\s|$)/g)?.join('\n').trim() ?? profile.summary, 'text');
      p('full version: /resume/', 'teal');
      show('resume');
    },
    contact: () => {
      p(`email   ${profile.email}`, 'teal');
      p('opening contact card...', 'dim');
      show('contact');
    },
    neofetch: () => {
      const rows: [string, string, ('amber' | 'dim')?][] = [
        ['', 'karston@austin', 'amber'],
        ['', '--------------', 'dim'],
        ['role', jobs[0].role],
        ['employer', jobs[0].org],
        ['location', `${profile.location} (CT)`],
        ['school', `${education[0].school}, ${education[0].degree}`],
        ['degree', `${education[1].degree}, UT Austin`],
        ['shell', 'specs, diagrams, Jira'],
        ['uptime', 'coffee #' + (1 + (new Date().getHours() % 4))],
      ];
      rows.forEach(([k, v, c]) => p(k ? k.padEnd(10) + v : v, c ?? 'text'));
      unlock('neofetch');
    },
    lamp: () => toggleLamp(),
    duck: () => quack(),
    rain: () => p(toggleRain() ? 'rain sound: on' : 'rain sound: off', 'teal'),
    snake: () => startGame('snake'),
    tetris: () => startGame('tetris'),
    games: () => p('installed: snake, tetris. type one to play.', 'teal'),
    sit: () => sit(true),
    stand: () => sit(false),
    secrets: () => {
      p(secretsSummary(), 'amber');
      show('secrets');
    },
    clear: () => term.clear(),
    pet: () => p(wakeCat() ? 'the cat wakes up and stretches.' : 'the cat is busy.', 'amber'),
    sky: args => {
      const want = (args[0] || '') as SkyPhase | 'live' | '';
      if (!['dawn', 'day', 'dusk', 'night', 'live'].includes(want)) {
        p('usage: sky dawn | day | dusk | night | live', 'pink');
        p('the window follows the real sun over Austin. `sky live` to go back.', 'dim');
        return;
      }
      const s = setSky(want === 'live' ? null : (want as SkyPhase));
      if (want !== 'live') unlock('time-traveler');
      p(want === 'live' ? `sky: live Austin time (${s?.phase ?? 'unknown'})` : `sky: ${want}. time travel achieved.`, 'violet');
    },
    sun: () => {
      const t = sunTimesUTC(new Date());
      p(`austin, tx · sunrise ${austinClock(t.rise)} · sunset ${austinClock(t.set)}`, 'amber');
      p('the window and the lamp follow this. try `sky dusk`.', 'dim');
    },
    'sudo hire-karston': () => {
      p('[sudo] password for recruiter: ********', 'dim');
      p('access granted.', 'amber');
      unlock('sudo');
      p('opening contact...', 'dim');
      setTimeout(() => show('contact'), 500);
    },
    sudo: () => p('nice try. (hint: sudo hire-karston)', 'pink'),
    'rm -rf /': () => p('absolutely not.', 'pink'),
    exit: () => {
      p('there is no exit. try `contact`.', 'pink');
      show(null);
    },
    hello: () => p('hey! type `help` to look around.', 'teal'),
    vim: () => p('you are now trapped in vim. just kidding. :q', 'violet'),
    ls: () => cmds.projects([], ''),
    whoami: () => cmds.about([], ''),
    experience: () => cmds.work([], ''),
    'git log': () => cmds.work([], ''),
    edu: () => cmds.education([], ''),
    '*': args => p(`zsh: command not found: ${args[0]}   (try \`help\`)`, 'pink'),
  };
  return cmds;
}

/** The command each panel corresponds to, so clicking types it into the terminal. */
export function commandFor(id: PanelId): string {
  if (id.startsWith('project:')) return 'open ' + id.slice(8);
  return { about: 'about', projects: 'projects', work: 'work', edu: 'education', contact: 'contact', resume: 'cat resume.txt' }[id as string] ?? id;
}
