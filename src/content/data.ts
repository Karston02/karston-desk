/**
 * Everything the site says lives in this file. The 3D desk, the terminal,
 * the side panels and the plain résumé page are all generated from it.
 *
 * Search for "TODO(karston)" to find filler that still needs real details.
 */

export interface Link {
  label: string;
  href: string;
}

export interface Job {
  /** Ticket id shown on the wall board and in the Experience panel. */
  ticket: string;
  status: 'done' | 'in-progress';
  role: string;
  org: string;
  start: string;
  end: string;
  summary: string;
  bullets: string[];
  stack: string[];
}

export interface Project {
  slug: string;
  title: string;
  tagline: string;
  role: string;
  year: string;
  stack: string[];
  /** Which mock app the 3D monitor shows when this case study is open. */
  screen: 'scraper' | 'tickets' | 'database' | 'desk';
  problem: string;
  approach: string[];
  result: string;
  links: Link[];
  /** Optional screenshot in /public (e.g. "/projects/job-scraper.png"). Shown in the panel and on the monitor. */
  image?: string;
}

export interface School {
  degree: string;
  school: string;
  when: string;
  note?: string;
}

export interface BoardTicket {
  id: string;
  title: string;
  column: 'Backlog' | 'In Progress' | 'Done';
  tag: string;
}

export const profile = {
  name: 'Karston Kuciemba',
  first: 'Karston',
  title: 'Software Engineer',
  location: 'Austin, TX',
  email: 'kuciembakarston@gmail.com',
  pitch: 'Software engineer in Austin. I build products for schools.',
  summary:
    'Software Engineer III at FullBloom / CharacterStrong, building products that schools and educators use every day. I do my best work before the first commit: a clear spec, one diagram everyone agrees on, and tickets small enough to finish. B.S. in Economics from UT Austin; M.S. in Computer Science at Georgia Tech in progress.',
  about: [
    "I'm a Software Engineer III at FullBloom / CharacterStrong, where I build products that schools and educators use every day.",
    'Most of my best work happens before the first commit: a clear spec, one diagram everyone agrees on, and tickets small enough to finish in a day. I studied economics first, so I tend to ask what a feature is worth before I ask how to build it.',
    "I'm also working on an M.S. in Computer Science at Georgia Tech, nights and weekends.",
  ],
  openTo: 'Open to conversations about software, full-stack and forward deployed roles. Remote or Austin.',
  links: {
    github: '', // TODO(karston): e.g. 'https://github.com/your-handle'
    linkedin: '', // TODO(karston): e.g. 'https://www.linkedin.com/in/your-handle'
    resumePdf: '', // TODO(karston): put resume.pdf in /public and set this to '/resume.pdf'
  },
  skills: [
    // TODO(karston): replace with your real stack
    'TypeScript',
    'JavaScript',
    'Python',
    'SQL',
    'React',
    'Node.js',
    'REST APIs',
    'Technical specs',
    'System design',
    'Jira',
  ],
};

export const jobs: Job[] = [
  {
    ticket: 'KK-104',
    status: 'in-progress',
    role: 'Software Engineer III',
    org: 'FullBloom / CharacterStrong',
    start: 'May 2023',
    end: 'Present',
    summary: 'Full-stack work on K–12 education products used by schools and educators.',
    bullets: [
      'Build and maintain full-stack features for education products used by schools and educators.',
      'Write technical specs and system diagrams, then break large initiatives into scoped, estimable Jira tickets for the team.',
      'Use AI tooling daily to speed up spec writing, diagramming and project breakdown.',
      // TODO(karston): add 1–2 shipped highlights with a number each
    ],
    stack: ['TypeScript', 'React', 'Node.js', 'SQL'], // TODO(karston): confirm
  },
  {
    ticket: 'KK-087',
    status: 'done',
    role: 'Software Engineering Intern',
    org: 'Kyndryl',
    start: 'Summer 2022', // TODO(karston): real dates
    end: '',
    summary: 'Internal tooling and automation for infrastructure teams.', // TODO(karston)
    bullets: ['Built internal tooling and automation for infrastructure teams.'], // TODO(karston)
    stack: ['Python'], // TODO(karston)
  },
  {
    ticket: 'KK-042',
    status: 'done',
    role: 'Earlier roles', // TODO(karston): real titles
    org: 'Locus Construction · University of Colorado',
    start: '2019', // TODO(karston)
    end: '2021',
    summary: 'Work outside software that taught me how projects actually run.',
    bullets: [],
    stack: [],
  },
];

export const education: School[] = [
  { degree: 'M.S. Computer Science', school: 'Georgia Tech', when: 'Expected Aug 2027', note: 'Part-time while working full-time.' },
  { degree: 'B.S. Economics', school: 'The University of Texas at Austin', when: 'May 2025' },
];

export const projects: Project[] = [
  {
    slug: 'job-scraper',
    title: 'Job Scraper',
    tagline: 'One short list instead of a dozen job boards.',
    role: 'Solo, built with Claude',
    year: '2026',
    stack: ['Python', 'Scraping', 'Scheduling'], // TODO(karston): confirm
    screen: 'scraper',
    problem:
      'Job boards are noisy. Checking a dozen sites by hand for roles that matched what I actually wanted (location, pay, role type, no on-call) took hours every week.',
    approach: [
      'Scrapers pull postings from several boards on a schedule and normalize them into one list.',
      'A rules layer filters on what I care about and drops dealbreakers before I ever see them.',
      'I paired with Claude throughout, which took it from idea to daily use quickly.',
    ],
    result: 'I now scan one short list instead of a dozen sites. TODO(karston): add a number, e.g. postings filtered per week or hours saved.',
    links: [], // TODO(karston): { label: 'Code', href: 'https://github.com/...' }
  },
  {
    slug: 'spec-to-tickets',
    title: 'Spec to Tickets',
    tagline: 'From a product brief to a sized backlog.',
    role: 'Solo, used at work',
    year: '2026',
    stack: ['LLM tooling', 'Jira', 'Diagrams'],
    screen: 'tickets',
    problem: 'Large projects stall when nobody has broken them down. Writing the spec, drawing the system and slicing the work used to take days.',
    approach: [
      'A set of reusable AI skills turns a product brief into a technical spec.',
      'The same flow drafts a system diagram from the spec for the team to react to.',
      'Finally it proposes sized Jira tickets with acceptance criteria, which I review and adjust.',
    ],
    result: 'TODO(karston): describe the impact, e.g. how much faster planning got or how many projects it has broken down.',
    links: [],
  },
  {
    slug: 'cs6400',
    title: 'CS6400 Database Project',
    tagline: 'Requirements to a working app on a normalized schema.',
    role: 'Team of 4, Georgia Tech', // TODO(karston): confirm team size
    year: '2026',
    stack: ['SQL', 'EER modeling', 'Normalization'],
    screen: 'database',
    problem: 'A multi-phase team project for Database Systems Concepts & Design: take a real-world application from written requirements to a working implementation.',
    approach: [
      'Turned the requirements into an EER diagram and information flow diagram.',
      'Mapped the model to a relational schema and normalized it.',
      'Implemented the queries and the application on top of it.',
    ],
    result: 'TODO(karston): what the app does and what part you owned.',
    links: [],
  },
  {
    slug: 'this-desk',
    title: 'This desk',
    tagline: 'A portfolio you can poke at.',
    role: 'Solo',
    year: '2026',
    stack: ['TypeScript', 'Three.js', 'Vite', 'Web Audio'],
    screen: 'desk',
    problem: 'Most portfolios are a list. I wanted one that shows how I build, and still lets a recruiter get the facts in 30 seconds.',
    approach: [
      'Everything in the room is built from code: no 3D models or images. The city outside is drawn on a canvas.',
      'The monitor is a real terminal, the keyboard reacts to your typing, and every panel is generated from one content file.',
      'A plain résumé page is rendered at build time from the same content, for speed, search engines and screen readers.',
    ],
    result: 'You are looking at it. Try typing `help`.',
    links: [],
  },
];

/** Cards on the wall board. Order inside a column is top to bottom. */
export const board: BoardTicket[] = [
  { id: 'KK-1', title: 'B.S. Economics · UT Austin', column: 'Done', tag: 'edu' },
  { id: 'KK-2', title: 'Internship · Kyndryl', column: 'Done', tag: 'work' },
  { id: 'KK-3', title: 'Ship the job scraper', column: 'Done', tag: 'side' },
  { id: 'KK-4', title: 'SWE III · FullBloom / CharacterStrong', column: 'In Progress', tag: 'work' },
  { id: 'KK-5', title: 'M.S. CS · Georgia Tech', column: 'In Progress', tag: 'edu' },
  { id: 'KK-6', title: 'Graduate · Aug 2027', column: 'Backlog', tag: 'edu' },
  { id: 'KK-7', title: 'Desk v2: more secrets', column: 'Backlog', tag: 'side' },
];

export const site = {
  url: 'https://karston.dev', // TODO(karston): your real domain, used in meta tags
  description: 'Karston Kuciemba is a software engineer in Austin building products for schools. Explore a 3D desk, or read the plain résumé.',
};
