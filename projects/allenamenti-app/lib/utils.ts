export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const SCHEDA_COLORS = [
  '#1ed760', // green
  '#539df5', // blue
  '#f3727f', // coral
  '#ffa42b', // orange
  '#a78bfa', // purple
  '#f472b6', // pink
  '#22d3ee', // cyan
  '#facc15', // yellow
];

export function schedaColor(nome: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = ((hash << 5) - hash + nome.charCodeAt(i)) | 0;
  }
  const color = SCHEDA_COLORS[Math.abs(hash) % SCHEDA_COLORS.length];
  return { bg: color + '26', text: color };
}
