import * as THREE from 'three';
import { board } from '../content/data';
import { COLORS, LIGHTS, WALL_Z, WINDOW } from './config';
import { mix, skyColors, type SkyState } from './sky';
import { at, austinTime, box, canvasTex, cyl, flatGlow, mat, roundRect, seeded, wrap, type Frame, type Part, type Register } from './helpers';

/** Walls, floor, the rainy city window, the neon sign, the clock, the education shelf and the ticket board. */
export function buildRoom(scene: THREE.Scene, register: Register): Part {
  const frameM = mat(COLORS.frame, { roughness: 0.5, metalness: 0.3 });

  /* Floor and walls */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(0x1b1e2e, { roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.6;
  floor.receiveShadow = true;
  scene.add(floor);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), mat(0x2d2440, { roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, -2.59, 0.6);
  rug.receiveShadow = true;
  scene.add(rug);
  const wallMat = mat(0x22263a, { roughness: 0.95 });
  const wallNight = new THREE.Color(0x22263a);
  const wallDay = new THREE.Color(0x48506c);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), wallMat);
  at(wall, 0, 4, WALL_Z);
  wall.receiveShadow = true;
  scene.add(wall);
  scene.add(at(box(40, 0.18, 0.05, mat(0x1a1d2c)), 0, -2.5, WALL_Z + 0.03));

  /* City through the window */
  const city = canvasTex(1024, 640);
  const rand = seeded(42);
  const stars = Array.from({ length: 90 }, () => [rand() * 1024, rand() * 300, rand() * 1.4 + 0.3]);
  type Building = { x: number; w: number; h: number; near: boolean; col: string; wins: [number, number, boolean][]; spire: number };
  const buildings: Building[] = [];
  [false, true].forEach(near => {
    let x = -20;
    while (x < 1044) {
      const w = 40 + rand() * 70;
      const h = 120 + rand() * (near ? 340 : 260);
      const b: Building = { x, w, h, near, col: near ? '#14172C' : '#1D2140', wins: [], spire: rand() < 0.25 ? 20 + rand() * 50 : 0 };
      const cols = Math.floor(w / 14);
      const rows = Math.floor(h / 20);
      for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) if (rand() < 0.42) b.wins.push([x + 6 + c * 14, 640 - h + r * 20, rand() < 0.75]);
      buildings.push(b);
      x += w + (near ? 4 : -6) + rand() * 10;
    }
  });
  const drawCity = (t: number, sky: SkyState) => {
    const g = city.g;
    const [top, mid, glowC, horizon] = skyColors(sky);
    const grad = g.createLinearGradient(0, 0, 0, 640);
    grad.addColorStop(0, top);
    grad.addColorStop(0.55, mid);
    grad.addColorStop(0.85, glowC);
    grad.addColorStop(1, horizon);
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 640);
    const night = 1 - sky.day;
    // stars
    const starA = night * (1 - sky.twilight);
    if (starA > 0.01)
      stars.forEach(([x, y, r], i) => {
        g.globalAlpha = starA * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + i)));
        g.fillStyle = '#DDE3FF';
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      });
    g.globalAlpha = 1;
    // sun, travelling left to right across the window during the day
    if (sky.day > 0.01 || sky.twilight > 0.05) {
      const sx = 90 + sky.arc * 844;
      const sy = 600 - Math.sin(sky.arc * Math.PI) * 470;
      const warm = Math.max(sky.twilight, 1 - Math.sin(sky.arc * Math.PI));
      const halo = g.createRadialGradient(sx, sy, 10, sx, sy, 170);
      halo.addColorStop(0, mix('#FFF6D8', '#FFC27A', warm).replace('rgb', 'rgba').replace(')', ',.85)'));
      halo.addColorStop(1, 'rgba(255,220,160,0)');
      g.fillStyle = halo;
      g.fillRect(sx - 170, sy - 170, 340, 340);
      g.fillStyle = mix('#FFFBEA', '#FFB25E', warm);
      g.beginPath();
      g.arc(sx, sy, 30, 0, Math.PI * 2);
      g.fill();
    }
    // moon
    if (night > 0.05) {
      g.globalAlpha = night;
      const mg = g.createRadialGradient(800, 110, 10, 800, 110, 120);
      mg.addColorStop(0, 'rgba(255,240,220,.9)');
      mg.addColorStop(0.25, 'rgba(255,230,210,.25)');
      mg.addColorStop(1, 'rgba(255,230,210,0)');
      g.fillStyle = mg;
      g.fillRect(660, 0, 280, 260);
      g.fillStyle = '#FFF2DE';
      g.beginPath();
      g.arc(800, 110, 34, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = top;
      g.beginPath();
      g.arc(814, 102, 30, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
    // buildings: dark silhouettes at night, hazy blue-grey by day
    const litShare = 0.12 + 0.88 * night;
    buildings.forEach(b => {
      g.fillStyle = b.near ? mix('#14172C', '#4C5872', sky.day) : mix('#1D2140', '#7D8BA6', sky.day);
      g.fillRect(b.x, 640 - b.h, b.w, b.h);
      if (b.spire) {
        g.fillRect(b.x + b.w / 2 - 2, 640 - b.h - b.spire, 4, b.spire);
        g.fillStyle = Math.sin(t * 3 + b.x) > 0 ? '#FF4D5E' : '#5A1E2A';
        g.beginPath();
        g.arc(b.x + b.w / 2, 640 - b.h - b.spire, 3, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = (b.near ? 0.95 : 0.6) * (0.35 + 0.65 * night);
      b.wins.forEach(([x, y, on], i) => {
        if (!on || ((i * 7919 + b.x * 13) % 100) / 100 > litShare) return;
        const off = Math.sin(t * 0.3 + i * 12.9898 + b.x) > 0.96;
        g.fillStyle = off ? '#2A2D45' : b.near ? '#FFD38A' : '#C9A86A';
        g.fillRect(x, y, 6, 9);
      });
      g.globalAlpha = 1;
    });
    const hz = g.createLinearGradient(0, 480, 0, 640);
    hz.addColorStop(0, 'rgba(255,120,140,0)');
    hz.addColorStop(1, `rgba(255,120,140,${0.18 * night})`);
    g.fillStyle = hz;
    g.fillRect(0, 480, 1024, 160);
    city.t.needsUpdate = true;
  };
  scene.add(at(new THREE.Mesh(new THREE.PlaneGeometry(WINDOW.w, WINDOW.h), new THREE.MeshBasicMaterial({ map: city.t, toneMapped: false })), WINDOW.x, WINDOW.y, WALL_Z + 0.01));
  scene.add(
    at(
      new THREE.Mesh(new THREE.PlaneGeometry(WINDOW.w, WINDOW.h), new THREE.MeshStandardMaterial({ color: 0x8ea0d8, transparent: true, opacity: 0.07, roughness: 0.05, metalness: 0.8 })),
      WINDOW.x,
      WINDOW.y,
      WALL_Z + 0.07,
    ),
  );
  const ft = 0.07;
  (
    [
      [0, WINDOW.h / 2, WINDOW.w + ft * 2, ft],
      [0, -WINDOW.h / 2, WINDOW.w + ft * 2, ft],
      [0, 0, ft * 0.7, WINDOW.h],
      [0, 0.1, WINDOW.w, ft * 0.6],
      [-WINDOW.w / 2, 0, ft, WINDOW.h],
      [WINDOW.w / 2, 0, ft, WINDOW.h],
    ] as const
  ).forEach(([dx, dy, w, h]) => scene.add(at(box(w, h, 0.08, frameM), WINDOW.x + dx, WINDOW.y + dy, WALL_Z + 0.06)));
  scene.add(at(box(WINDOW.w + 0.4, 0.06, 0.26, frameM), WINDOW.x, WINDOW.y - WINDOW.h / 2 - 0.05, WALL_Z + 0.13));
  const cityLight = at(new THREE.PointLight(0x8a6ac8, LIGHTS.city, 7, 2), WINDOW.x, WINDOW.y, WALL_Z + 0.8);
  scene.add(cityLight);
  const nightCity = new THREE.Color(0x8a6ac8);
  const dayCity = new THREE.Color(0xdbe8ff);
  const duskCity = new THREE.Color(0xffa070);

  /* Rain streaking down the glass */
  const RAIN = 240;
  const rainPos = new Float32Array(RAIN * 6);
  const rainV = new Float32Array(RAIN);
  const resetDrop = (i: number, top: boolean) => {
    const x = WINDOW.x - WINDOW.w / 2 + Math.random() * WINDOW.w;
    const y = top ? WINDOW.y + WINDOW.h / 2 + Math.random() * 0.3 : WINDOW.y - WINDOW.h / 2 + Math.random() * WINDOW.h;
    const len = 0.06 + Math.random() * 0.1;
    rainPos.set([x, y, WALL_Z + 0.04, x - 0.015, y - len, WALL_Z + 0.04], i * 6);
    rainV[i] = 3 + Math.random() * 2.5;
  };
  for (let i = 0; i < RAIN; i++) resetDrop(i, false);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: 0xa9b8ff, transparent: true, opacity: 0.35, toneMapped: false });
  scene.add(new THREE.LineSegments(rainGeo, rainMat));

  /* Neon sign */
  const neon = canvasTex(1024, 360);
  const drawNeon = () => {
    const g = neon.g;
    g.clearRect(0, 0, 1024, 360);
    g.font = '200px Yellowtail, "Brush Script MT", cursive';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const pass = (blur: number, color: string, alpha: number, width: number) => {
      g.save();
      g.shadowColor = '#FF4FA0';
      g.shadowBlur = blur;
      g.globalAlpha = alpha;
      g.strokeStyle = color;
      g.lineWidth = width;
      g.lineJoin = 'round';
      g.strokeText('Karston', 512, 175);
      g.restore();
    };
    pass(60, '#FF4FA0', 0.9, 14);
    pass(24, '#FF8CC3', 1, 8);
    pass(4, '#FFE3F0', 1, 3);
    g.font = '700 54px "Space Mono", monospace';
    g.save();
    g.shadowColor = '#7FD1C7';
    g.shadowBlur = 30;
    g.fillStyle = '#C9FFF7';
    g.fillText('</>', 512, 312);
    g.restore();
    neon.t.needsUpdate = true;
  };
  drawNeon();
  document.fonts?.load('200px Yellowtail').then(drawNeon, () => {});
  document.fonts?.load('700 54px "Space Mono"').then(drawNeon, () => {});
  const NEON = { x: 2.75, y: 3.02 };
  const neonMat = new THREE.MeshBasicMaterial({ map: neon.t, transparent: true, toneMapped: false, depthWrite: false });
  neonMat.color.setScalar(1.6); // push above 1 so bloom catches it
  // Backing acrylic sits behind the tubes (its front face must stay behind the sign plane).
  scene.add(at(box(2.2, 0.72, 0.02, new THREE.MeshStandardMaterial({ color: 0x2a2440, transparent: true, opacity: 0.35, roughness: 0.2, depthWrite: false }), false), NEON.x, NEON.y, WALL_Z + 0.02));
  const neonGlow = at(flatGlow(COLORS.neon, 3.6, 1.9, 0.25), NEON.x, NEON.y, WALL_Z + 0.045);
  scene.add(neonGlow);
  scene.add(at(new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.81), neonMat), NEON.x, NEON.y, WALL_Z + 0.06));
  const neonLight = at(new THREE.PointLight(COLORS.neon, LIGHTS.neon, 4.5, 2), NEON.x, NEON.y + 0.1, WALL_Z + 0.55);
  scene.add(neonLight);

  /* Wall clock, real Austin time */
  const face = canvasTex(256, 256);
  {
    const g = face.g;
    g.fillStyle = '#EDE6D8';
    g.beginPath();
    g.arc(128, 128, 124, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#2A2D40';
    g.lineWidth = 8;
    g.stroke();
    g.fillStyle = '#2A2D40';
    for (let i = 0; i < 12; i++) {
      g.save();
      g.translate(128, 128);
      g.rotate((i * Math.PI) / 6);
      g.fillRect(-3, -112, 6, i % 3 ? 14 : 24);
      g.restore();
    }
    g.font = '700 20px "Space Mono", monospace';
    g.textAlign = 'center';
    g.fillText('ATX', 128, 176);
    face.t.needsUpdate = true;
  }
  const clock = at(new THREE.Group(), -3.25, 3.2, WALL_Z + 0.04);
  scene.add(clock);
  clock.add(new THREE.Mesh(new THREE.CircleGeometry(0.28, 48), new THREE.MeshStandardMaterial({ map: face.t, roughness: 0.6 })));
  clock.add(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.024, 12, 48), frameM));
  const hand = (len: number, w: number, color: number) => {
    const pivot = new THREE.Group();
    pivot.add(at(box(w, len, 0.01, mat(color), false), 0, len / 2 - 0.03, 0));
    pivot.position.z = 0.015;
    clock.add(pivot);
    return pivot;
  };
  const hH = hand(0.15, 0.024, 0x2a2d40);
  const mH = hand(0.22, 0.015, 0x2a2d40);
  const sH = hand(0.24, 0.007, 0xd8455b);
  const setClock = () => {
    const { h, m, s } = austinTime();
    sH.rotation.z = (-s / 60) * Math.PI * 2;
    mH.rotation.z = (-(m + s / 60) / 60) * Math.PI * 2;
    hH.rotation.z = (-((h % 12) + m / 60) / 12) * Math.PI * 2;
  };

  /* Books on the desk: education */
  const books = new THREE.Group();
  const bookendM = mat(0x2a2e44, { roughness: 0.35, metalness: 0.6 });
  books.add(at(box(0.04, 0.42, 0.34, bookendM), -0.5, 0.21, 0));
  books.add(at(box(0.04, 0.42, 0.34, bookendM), 0.36, 0.21, 0));
  (
    [
      [0xb3462e, 0.62, 0.13],
      [0x3e4fa0, 0.55, 0.11],
      [0xd8c49a, 0.6, 0.15],
      [0x3d6e62, 0.5, 0.1],
      [0x8f3a5c, 0.58, 0.12],
    ] as const
  ).forEach(([c, h, w], i) => {
    const b = at(box(w, h, 0.34, mat(c, { roughness: 0.75 })), -0.47 + i * 0.13 + w / 2, h / 2, 0);
    if (i === 4) {
      b.rotation.z = -0.22;
      b.position.x += 0.08;
      b.position.y -= 0.02;
    }
    books.add(b);
  });
  // graduation cap resting beside the books
  const capM = mat(0x16182a, { roughness: 0.6 });
  books.add(at(cyl(0.13, 0.15, 0.12, capM), 0.68, 0.06, 0.12));
  const capBoard = at(box(0.38, 0.02, 0.38, capM), 0.68, 0.13, 0.12);
  capBoard.rotation.y = 0.5;
  books.add(capBoard);
  books.add(at(cyl(0.008, 0.008, 0.16, mat(COLORS.lamp, { roughness: 0.5 }), 8), 0.83, 0.06, 0.2));
  books.add(at(cyl(0.022, 0.03, 0.06, mat(COLORS.lamp)), 0.83, -0.0, 0.2));
  at(books, -3.0, 0, -1.2);
  books.rotation.y = 0.12;
  scene.add(books);
  register('edu', 'books → Education', books, 'lift');

  /* Whiteboard: the nightly rostering sync from FullBloom, plus a little economics */
  const WB = { x: -3.25, y: 2.25, w: 1.8, h: 1.12 };
  const wb = canvasTex(1440, 896);
  const drawWhiteboard = () => {
    const g = wb.g;
    const rnd = seeded(7);
    const jitter = () => (rnd() - 0.5) * 3;
    const hand = '"Caveat", "Comic Sans MS", cursive';
    g.fillStyle = '#F7F7F4';
    g.fillRect(0, 0, 1440, 896);
    // faint ghosting of old erased notes
    g.globalAlpha = 0.05;
    g.fillStyle = '#1D3B8F';
    g.font = `64px ${hand}`;
    g.fillText('sprint goals??', 860, 820);
    g.globalAlpha = 1;
    const ink = (c: string, w = 5) => {
      g.strokeStyle = c;
      g.fillStyle = c;
      g.lineWidth = w;
      g.lineCap = 'round';
      g.lineJoin = 'round';
    };
    const wobblyRect = (x: number, y: number, w: number, h: number) => {
      g.beginPath();
      g.moveTo(x + jitter(), y + jitter());
      g.lineTo(x + w + jitter(), y + jitter());
      g.lineTo(x + w + jitter(), y + h + jitter());
      g.lineTo(x + jitter(), y + h + jitter());
      g.closePath();
      g.stroke();
    };
    const arrow = (x1: number, y1: number, x2: number, y2: number) => {
      g.beginPath();
      g.moveTo(x1, y1);
      g.quadraticCurveTo((x1 + x2) / 2 + jitter() * 4, (y1 + y2) / 2 + jitter() * 4, x2, y2);
      g.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1);
      g.beginPath();
      g.moveTo(x2, y2);
      g.lineTo(x2 - 22 * Math.cos(a - 0.45), y2 - 22 * Math.sin(a - 0.45));
      g.moveTo(x2, y2);
      g.lineTo(x2 - 22 * Math.cos(a + 0.45), y2 - 22 * Math.sin(a + 0.45));
      g.stroke();
    };
    const label = (t: string, x: number, y: number, size = 46) => {
      g.font = `${size}px ${hand}`;
      g.fillText(t, x, y);
    };

    ink('#1D2A44', 4);
    label('nightly rostering sync', 60, 92, 70);
    g.beginPath();
    g.moveTo(60, 108);
    g.lineTo(640, 104);
    g.stroke();

    // pipeline
    ink('#1D3B8F', 5);
    wobblyRect(60, 170, 250, 110);
    label('Clever', 90, 220);
    label('ClassLink · SFTP', 80, 262, 34);
    wobblyRect(420, 170, 260, 110);
    label('Step Functions', 440, 220);
    label('(per district)', 455, 262, 36);
    wobblyRect(790, 170, 240, 110);
    label('normalize', 830, 238);
    arrow(312, 225, 412, 225);
    arrow(682, 225, 782, 225);
    arrow(910, 284, 910, 360);

    ink('#B3261E', 5);
    wobblyRect(700, 368, 420, 150);
    label('lock + dedupe', 760, 420);
    label('external refs · retries', 735, 462, 36);
    label('no double imports', 760, 500, 38);
    ink('#1D3B8F', 5);
    arrow(700, 445, 560, 445);
    wobblyRect(300, 390, 250, 110);
    label('district roster', 312, 458);
    ink('#1F7A4C', 5);
    label('millions of records ✓', 306, 548, 38);

    // supply & demand corner
    ink('#1D2A44', 4);
    const ox = 1130;
    const oy = 830;
    arrow(ox, oy, ox, oy - 250);
    arrow(ox, oy, ox + 260, oy);
    label('P', ox - 34, oy - 230, 40);
    label('Q', ox + 236, oy + 40, 40);
    ink('#1D3B8F', 5);
    g.beginPath();
    g.moveTo(ox + 20, oy - 30);
    g.lineTo(ox + 230, oy - 220);
    g.stroke();
    label('S', ox + 236, oy - 214, 38);
    ink('#B3261E', 5);
    g.beginPath();
    g.moveTo(ox + 20, oy - 220);
    g.lineTo(ox + 230, oy - 30);
    g.stroke();
    label('D', ox + 236, oy - 22, 38);
    ink('#1F7A4C', 4);
    g.beginPath();
    g.arc(ox + 125, oy - 125, 10, 0, Math.PI * 2);
    g.fill();
    label('ship here', ox + 140, oy - 140, 34);

    // stray todo
    ink('#1D2A44', 3);
    label('TODO: mid-year transfers', 60, 820, 40);
    wb.t.needsUpdate = true;
  };
  drawWhiteboard();
  document.fonts?.load('46px Caveat').then(drawWhiteboard, () => {});
  const whiteboard = new THREE.Group();
  whiteboard.add(box(WB.w + 0.08, WB.h + 0.08, 0.04, mat(0xc9ccd4, { roughness: 0.35, metalness: 0.5 })));
  whiteboard.add(at(new THREE.Mesh(new THREE.PlaneGeometry(WB.w, WB.h), new THREE.MeshStandardMaterial({ map: wb.t, roughness: 0.3 })), 0, 0, 0.021));
  whiteboard.add(at(box(WB.w * 0.5, 0.03, 0.08, frameM), 0.2, -WB.h / 2 - 0.06, 0.04));
  [0x1d3b8f, 0xb3261e, 0x1f7a4c].forEach((c, i) => {
    const m = cyl(0.015, 0.015, 0.15, mat(c), 10);
    m.rotation.z = Math.PI / 2;
    whiteboard.add(at(m, 0.0 + i * 0.18, -WB.h / 2 - 0.03, 0.05));
  });
  at(whiteboard, WB.x, WB.y, WALL_Z + 0.04);
  scene.add(whiteboard);
  register('whiteboard', 'whiteboard → Experience', whiteboard, 'pop');

  /* Ticket board: experience */
  const BW = 2.05;
  const BH = 1.05;
  const boardTex = canvasTex(1230, 630);
  const drawBoard = () => {
    const g = boardTex.g;
    const W = 1230;
    const H = 630;
    g.fillStyle = '#EEF0F4';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#16171F';
    g.font = '700 30px Karla, sans-serif';
    g.fillText('KK board', 30, 50);
    g.fillStyle = '#6A6B78';
    g.font = '18px "Space Mono", monospace';
    g.fillText('career · active sprint', 170, 50);
    const cols = ['Backlog', 'In Progress', 'Done'] as const;
    const colW = (W - 60 - 40) / 3;
    const colors = { Backlog: '#9A9BA8', 'In Progress': '#3B6FD1', Done: '#2E9B6B' };
    cols.forEach((c, i) => {
      const x = 30 + i * (colW + 20);
      g.fillStyle = '#E1E4EB';
      roundRect(g, x, 76, colW, H - 100, 12);
      g.fill();
      g.fillStyle = '#5A5B68';
      g.font = '700 17px "Space Mono", monospace';
      const items = board.filter(b => b.column === c);
      g.fillText(`${c.toUpperCase()}  ${items.length}`, x + 18, 108);
      items.forEach((tk, j) => {
        const y = 128 + j * 128;
        g.fillStyle = '#FFFFFF';
        roundRect(g, x + 12, y, colW - 24, 112, 8);
        g.fill();
        g.fillStyle = colors[c];
        g.fillRect(x + 12, y, 6, 112);
        g.fillStyle = '#16171F';
        g.font = '600 22px Karla, sans-serif';
        wrap(g, tk.title, colW - 60)
          .slice(0, 2)
          .forEach((l, k) => g.fillText(l, x + 30, y + 38 + k * 28));
        g.fillStyle = '#8A8B97';
        g.font = '15px "Space Mono", monospace';
        g.fillText(tk.id, x + 30, y + 98);
        g.fillStyle = colors[c];
        g.textAlign = 'right';
        g.fillText(tk.tag, x + colW - 26, y + 98);
        g.textAlign = 'left';
      });
    });
    boardTex.t.needsUpdate = true;
  };
  drawBoard();
  document.fonts?.ready.then(drawBoard, () => {});
  const boardGroup = new THREE.Group();
  boardGroup.add(box(BW + 0.1, BH + 0.1, 0.04, mat(0xb9bdc8, { roughness: 0.4, metalness: 0.4 })));
  boardGroup.add(at(new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshStandardMaterial({ map: boardTex.t, roughness: 0.55 })), 0, 0, 0.021));
  boardGroup.add(at(box(BW * 0.6, 0.03, 0.08, frameM), 0, -BH / 2 - 0.06, 0.04)); // marker tray
  [0xd8455b, 0x3b6fd1].forEach((c, i) => {
    const m = cyl(0.015, 0.015, 0.16, mat(c), 10);
    m.rotation.z = Math.PI / 2;
    boardGroup.add(at(m, -0.2 + i * 0.22, -BH / 2 - 0.03, 0.05));
  });
  at(boardGroup, 2.75, 1.82, WALL_Z + 0.04);
  scene.add(boardGroup);
  register('work', 'board → Experience', boardGroup, 'pop');

  /* Per-frame */
  let lastCity = -1;
  let lastSec = -1;
  /** Neon flicker: a rare, gentle double blink of the tube. Never a strobe (at most 2 dips in half a second). */
  let flickerAt = 30 + Math.random() * 30;
  return {
    update(f: Frame) {
      const cs = Math.floor(f.t * 2);
      if (cs !== lastCity) {
        lastCity = cs;
        drawCity(f.t, f.sky);
      }
      cityLight.color.copy(nightCity).lerp(dayCity, f.sky.day).lerp(duskCity, f.sky.twilight * 0.7);
      cityLight.intensity = LIGHTS.city * (1 + f.sky.day * 2.5);
      rainMat.opacity = 0.35 - 0.2 * f.sky.day;
      wallMat.color.copy(wallNight).lerp(wallDay, f.sky.day);
      if (!f.reduced) {
        for (let i = 0; i < RAIN; i++) {
          const o = i * 6;
          const d = rainV[i] * f.dt;
          rainPos[o + 1] -= d;
          rainPos[o + 4] -= d;
          rainPos[o] -= d * 0.12;
          rainPos[o + 3] -= d * 0.12;
          if (rainPos[o + 4] < WINDOW.y - WINDOW.h / 2) resetDrop(i, true);
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
      // neon: brighter when the lamp is off, blinks twice every 30-60 seconds
      let on = 1;
      const since = f.t - flickerAt;
      if (!f.reduced && since >= 0) {
        if (since < 0.08 || (since > 0.22 && since < 0.3)) on = 0.6;
        if (since > 0.5) flickerAt = f.t + 30 + Math.random() * 30;
      }
      const night = 1 - f.lamp;
      neonMat.opacity = on;
      neonGlow.material.opacity = (0.22 + night * 0.15 + 0.03 * Math.sin(f.t * 3)) * on;
      // the light it casts on the room barely dips, so the whole room never pulses
      neonLight.intensity = LIGHTS.neon * (1 + night * 0.8) * (0.9 + 0.1 * on);
      const sec = Math.floor(Date.now() / 1000);
      if (sec !== lastSec) {
        lastSec = sec;
        setClock();
      }
    },
  };
}
