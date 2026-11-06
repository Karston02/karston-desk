# karston-desk

My portfolio: a 3D desk you can poke at, plus a plain résumé page for anyone in a hurry.

Built with **Vite + TypeScript + Three.js**. No 3D models or images: everything in the room, including the city outside and the cat, is built in code.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # type-checks, then builds to dist/
npm run preview    # serves the production build locally
```

Requires Node 18+.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New → Project**, import the repo. It detects Vite automatically (build: `npm run build`, output: `dist`).
3. Add your domain under **Settings → Domains**, then set `site.url` in `src/content/data.ts` (link previews use it).
4. **Analytics:** in the Vercel project, open **Analytics → Enable**. The tracking script is already added to production builds (not to `npm run dev`), so no package is needed.

Every push to `main` redeploys.

## Edit the content

Everything the site says lives in **`src/content/data.ts`**: profile, jobs, projects (with case studies), education, the wall board tickets and skills. The panels, the terminal and the `/resume/` page are all generated from it.

Search the project for `TODO(karston)` to find filler that still needs real details.

- **Screenshots:** drop an image in `public/projects/` and set `image: '/projects/name.png'` on the project. It shows in the case study and on the 3D monitor.
- **Résumé PDF:** put `resume.pdf` in `public/` and set `profile.links.resumePdf = '/resume.pdf'`.
- **GitHub / LinkedIn:** set `profile.links.github` and `profile.links.linkedin`.
- **Link preview image:** `public/og.png` (1200×630). Replace it with any screenshot you like.

## What's in the room

| Thing | What it does |
| --- | --- |
| Monitor | A real terminal. Shows a project preview while a case study is open, and runs the games. |
| Keyboard | Keys press down as you type. |
| Window | The sky follows the real sun over Austin (sunrise/sunset calculated for today). |
| Lamp | Turns on by itself after sunset. Click to toggle. |
| Cat | Sleeps in the lamp light. Click it and it walks across the keyboard. |
| Whiteboard | The nightly rostering sync pipeline, plus a supply-and-demand sketch. Opens Experience. |
| Ticket board | Career as Jira tickets. Opens Experience. |
| Books | Education. |
| Notebook | Résumé. |
| Mug, phone | About, Contact. |
| Rubber duck | Debugging. |

**Terminal commands:** `help`, `about`, `projects`, `open <project>`, `work` / `git log`, `education`, `resume` / `cat resume.txt`, `contact`, `neofetch`, `snake`, `tetris`, `sit`, `stand`, `sky dawn|day|dusk|night|live`, `sun`, `lamp`, `duck`, `pet`, `rain`, `secrets`, `clear`. Tab completes, ↑/↓ for history.

**Secrets:** 10 hidden achievements, tracked in the ★ counter (saved per browser). Defined in `src/secrets.ts`.

**Phones:** swipe to play the games, tilt the phone to look around (iOS asks for permission on first tap).

## How it's organized

```
index.html              the desk page (critical boot CSS inline, preview meta tags)
resume/index.html       the plain résumé (HTML injected at build time)
vite.config.ts          injects résumé/no-JS HTML, site URL, and production analytics
src/
  main.ts               wires everything together
  content/data.ts       ← all the words
  content/render.ts     résumé + noscript HTML (pure strings, runs at build time)
  secrets.ts            the 10 secrets
  audio.ts              rain, key clicks, duck squeak (all synthesized)
  ui/                   panels, boot/loading screen
  terminal/             the terminal and its commands
  games/                snake, tetris
  scene/
    world.ts            renderer, bloom, camera views, picking, main loop
    room.ts             walls, city window + rain, neon, clock, whiteboard, books, ticket board
    desk.ts             desk, monitor, keyboard, mug, notebook, phone, duck, lamp
    cat.ts              the cat
    sky.ts              Austin sunrise/sunset and sky colors
    screens.ts          what the monitor shows
    config.ts           light intensities, bloom, colors: tune the look here
```

The 3D engine loads as a separate chunk while the boot screen types, so the page appears instantly even on slow connections; after 6 seconds it offers the plain résumé.

## Notes

- Respects `prefers-reduced-motion`: no boot sequence, no camera drift, instant panels.
- Phones get a lighter render (lower pixel ratio, smaller shadows, fewer particles).
- If WebGL isn't available, the page points to `/resume/`.
