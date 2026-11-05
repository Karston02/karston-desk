/** Hidden things to find. Progress is saved in the visitor's browser. */

export interface Secret {
  id: string;
  name: string;
  hint: string;
}

export const SECRETS: Secret[] = [
  { id: 'night-owl', name: 'Night owl', hint: 'Some people code better in the dark.' },
  { id: 'rubber-duck', name: 'Rubber duck debugging', hint: 'Explain your bug to someone small and yellow.' },
  { id: 'cat-nap', name: 'Do not disturb', hint: 'Something is sleeping in the lamp light.' },
  { id: 'sudo', name: 'Root access', hint: 'Recruiters get special privileges in the terminal.' },
  { id: 'neofetch', name: 'Flex', hint: "Every dev's favorite way to show off their machine." },
  { id: 'snake', name: 'Hungry', hint: 'There is a classic game on this machine. Eat 5 of something.' },
  { id: 'tetris', name: 'Line clear', hint: 'Another game. Blocks are involved.' },
  { id: 'sit', name: 'Pull up a chair', hint: 'Get closer to the screen.' },
  { id: 'time-traveler', name: 'Time traveler', hint: 'The sky takes requests.' },
  { id: 'rainy-day', name: 'Rainy day', hint: 'Turn it up.' },
];

const KEY = 'karston-desk:secrets';

export class Secrets {
  readonly found = new Set<string>();

  constructor(private onUnlock: (s: Secret, count: number, total: number) => void) {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]') as string[];
      saved.filter(id => SECRETS.some(s => s.id === id)).forEach(id => this.found.add(id));
    } catch {
      /* storage blocked: progress just won't persist */
    }
  }

  get count(): number {
    return this.found.size;
  }

  get total(): number {
    return SECRETS.length;
  }

  unlock(id: string): void {
    if (this.found.has(id)) return;
    const s = SECRETS.find(x => x.id === id);
    if (!s) return;
    this.found.add(id);
    try {
      localStorage.setItem(KEY, JSON.stringify([...this.found]));
    } catch {
      /* ignore */
    }
    this.onUnlock(s, this.count, this.total);
  }

  reset(): void {
    this.found.clear();
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}
