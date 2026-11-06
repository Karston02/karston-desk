/**
 * Everything the site says lives in this file. The 3D desk, the terminal,
 * the side panels and the plain résumé page are all generated from it.
 *
 * A "TODO(karston): ..." note at the end of a string is stripped before it
 * reaches the page, so reminders here never ship.
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
  /** Leave empty to hide it. */
  year: string;
  stack: string[];
  /** Which mock app the 3D monitor shows when this case study is open. */
  screen: 'trading' | 'proxy' | 'tickets' | 'database' | 'desk';
  problem: string;
  approach: string[];
  result: string;
  links: Link[];
  /** Optional screenshot in /public (e.g. "/projects/dog-shelter.png"). Shown in the panel and on the monitor. */
  image?: string;
  /** For screen: 'database'. Up to 4 entities drawn as an EER diagram on the monitor (first three in a row, the fourth below the middle). */
  schema?: { name: string; fields: string[] }[];
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
    github: 'https://github.com/Karston02',
    linkedin: 'https://www.linkedin.com/in/karston-kuciemba',
    resumePdf: '/resume.pdf',
  },
  skills: [
    'TypeScript',
    'JavaScript',
    'Python',
    'SQL',
    'C++',
    'React',
    'Node.js',
    'Flask',
    'FastAPI',
    'AWS',
    'AWS Step Functions',
    'DynamoDB',
    'State machines',
    'ETL systems',
    'Data visualization',
    'REST APIs',
    'OpenAPI',
    'Git',
    'Technical specs',
    'System design',
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
    summary: 'Started as an intern, then Software Engineer II, now Software Engineer III, on K–12 products used by schools and districts.',
    bullets: [
      'Designed a modernized authentication system (credentials, SSO, SAML, rostering) with unified MFA and session handling; wrote the sequence, flow and entity diagrams and the Jira initiative to lead the build.',
      'Led multi-organization user management across the platform, so administrators can add, remove, restore and manage users across entire districts.',
      'Made the rostering pipeline more scalable and reliable with distributed processing and locking, and fixed import and sync issues.',
      'Built an AWS Step Functions ETL pipeline for Clever, SFTP and ClassLink that syncs rosters nightly for hundreds of districts, processing millions of user and class records.',
      'Secured 26 legacy endpoints with user-based middleware, separate business-logic and data-access layers, and standard request validation.',
      'As an intern, built 23 pages and 88 components from Figma designs in React and TypeScript, and led the upgrade from Mantine v5 to v6.',
    ],
    stack: ['TypeScript', 'React', 'Node.js', 'SQL', 'DynamoDB', 'AWS Step Functions'],
  },
  {
    ticket: 'KK-087',
    status: 'done',
    role: 'Software Engineering Intern',
    org: 'Kyndryl',
    start: 'May 2024',
    end: 'Aug 2024',
    summary: 'IoT telemetry, internal tools and billing automation.',
    bullets: [
      'Built an internal full-stack app that computes risk profiles and investment opportunities for seller proposals, saving 1,350 hours and $200,000 a year.',
      'Automated billing for a client with over 6,000 servers, saving 120+ hours per quarter.',
      'Built an API that streams IoT telemetry in real time, plus a front end with login that opens a digital twin for live warehouse analytics and device location.',
    ],
    stack: [],
  },
  {
    ticket: 'KK-042',
    status: 'done',
    role: 'Payroll/Processing Assistant',
    org: 'University of Colorado',
    start: 'Aug 2021',
    end: 'May 2022',
    summary: 'Payroll document processing and data entry.',
    bullets: [
      'Collected and organized hundreds of payroll documents (PDW, SSA-1945, I-9) a week, keeping them compliant with state and university rules.',
      'Did daily data entry for a range of clients and found ways to improve accuracy and efficiency with software.',
    ],
    stack: [],
  },
];

export const education: School[] = [
  { degree: 'M.S. Computer Science', school: 'Georgia Tech', when: 'Expected Aug 2027', note: 'Part-time while working full-time.' },
  { degree: 'B.S. Economics', school: 'The University of Texas at Austin', when: 'Completed' },
];

export const projects: Project[] = [
  {
    slug: 'algo-trading',
    title: 'Algorithmic Trading Platform',
    tagline: 'Signals, backtests and live trading in one place.',
    role: 'Solo',
    year: '',
    stack: ['Python', 'Pandas', 'React', 'TypeScript', 'Alpaca', 'Schwab API', 'SEC EDGAR', 'Parquet'],
    screen: 'trading',
    problem:
      'An end-to-end platform that combines historical and real-time market data, technical indicators and SEC Form 4 insider transactions to generate systematic equity and options trading signals.',
    approach: [
      'Built a reusable backtesting and risk-management framework that tests strategies across historical market regimes, tunes parameters and simulates execution before anything goes live.',
      'Integrated a live Charles Schwab brokerage account for real trade execution.',
      'Built a real-time React dashboard for positions, strategy parameters, trade signals, portfolio performance and interactive backtest results.',
    ],
    result: '',
    links: [],
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
    result: '',
    links: [],
  },
  {
    slug: 'dog-shelter',
    title: 'Dog Shelter Database',
    tagline: 'From written requirements to a working shelter app.',
    role: 'Team project, Georgia Tech',
    year: '2026',
    stack: ['SQL', 'EER modeling', 'Normalization'],
    screen: 'database',
    problem: 'Design and build a working application for a dog shelter, starting from written requirements.',
    approach: [
      'Turned the requirements into an information flow diagram (IFD) and an EER diagram.',
      'Mapped the EER model to a relational schema and normalized it.',
      'Wrote the SQL scripts and built the fully functional product on top of the schema.',
    ],
    result: '',
    links: [],
    // Illustrative entities for the monitor (mark keys with PK / FK)
    schema: [
      { name: 'Adopter', fields: ['email PK', 'name', 'phone'] },
      { name: 'Application', fields: ['app_id PK', 'email FK', 'status'] },
      { name: 'Dog', fields: ['dog_id PK', 'name', 'breed', 'surrender_date'] },
      { name: 'Adoption', fields: ['dog_id FK', 'app_id FK', 'adopted_on'] },
    ],
  },
  {
    slug: 'http-proxy',
    title: 'HTTP Proxy',
    tagline: 'A multi-threaded proxy server for any browser.',
    role: 'Solo',
    year: '',
    stack: ['Python', 'Sockets', 'Threading'],
    screen: 'proxy',
    problem: 'A proxy server that handles many browser requests at the same time, over both HTTP and HTTPS.',
    approach: [
      'Multi-threaded server that handles client requests concurrently and supports GET and CONNECT from any browser configured to use it.',
      'Rewrites headers on the way through, switching to non-persistent connections so every request can be logged, and manages connection headers before forwarding.',
      'Optional JSON logging of each request, the modified headers and the server response.',
    ],
    result: '',
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
  { id: 'KK-3', title: 'Rostering ETL · Step Functions', column: 'Done', tag: 'work' },
  { id: 'KK-4', title: 'SWE III · FullBloom / CharacterStrong', column: 'In Progress', tag: 'work' },
  { id: 'KK-5', title: 'M.S. CS · Georgia Tech', column: 'In Progress', tag: 'edu' },
  { id: 'KK-6', title: 'Graduate · Aug 2027', column: 'Backlog', tag: 'edu' },
  { id: 'KK-7', title: 'Desk v2: more secrets', column: 'Backlog', tag: 'side' },
];

export const site = {
  url: 'https://karston.dev',
  description: 'Karston Kuciemba is a software engineer in Austin building products for schools. Explore a 3D desk, or read the plain résumé.',
};
