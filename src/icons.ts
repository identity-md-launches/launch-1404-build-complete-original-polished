const paths: Record<string, string> = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  play: '<path d="m9 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M9 5v14M16 5v14" stroke-width="3"/>',
  sound:
    '<path d="M4 9v6h4l5 4V5L8 9zm12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="M4 9v6h4l5 4V5L8 9zm13 0 5 6m0-6-5 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2l-1.5 1.5M12 16h.01"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  seed: '<path d="M5 19C3 6 10 3 20 4c1 10-4 17-15 15Zm0 0L15 9m-3 3v-5m0 5h5"/>',
  heart:
    '<path d="M12 20 3.8 12a5 5 0 0 1 7.1-7l1.1 1.2L13.1 5a5 5 0 0 1 7.1 7Z" fill="currentColor" stroke="none"/>',
  fly: '<ellipse cx="12" cy="14" rx="3" ry="5" fill="currentColor"/><path d="M10 11C0 10 3 1 8 5l3 5m3 1c10-1 7-10 2-6l-3 5"/>',
  flag: '<path d="M5 21V3m0 1c5-5 9 5 15 0v10c-6 5-10-5-15 0"/>',
  restart: '<path d="M4 10a8 8 0 1 1 1 8M4 3v7h7"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  jump: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  fire: '<path d="M13 3c2 5-4 7-1 10 1-3 5-3 5-6 8 10 1 16-5 15-6 0-10-7-5-12 0 4 2 4 2 4-2-5 4-6 4-11Z"/>',
  rotate:
    '<rect x="8" y="3" width="8" height="17" rx="2" transform="rotate(30 12 12)"/><path d="M2 8a10 10 0 0 1 4-5m12 18a10 10 0 0 0 4-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  trophy:
    '<path d="M7 3h10v6a5 5 0 0 1-10 0Zm0 2H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4m-4 2v6m-4 0h8"/>',
};
export const icon = (name: string, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.seed}</svg>`;
export const frogMark = `<svg class="frog-mark" viewBox="0 0 48 40" aria-hidden="true"><path fill="#b4d67a" d="M3 25C1 16 7 9 12 9 9-2 25-3 25 9 27-2 41 0 40 12c10 7 8 23-5 25H15C7 36 3 32 3 25Z"/><ellipse cx="17" cy="13" rx="6" ry="7" fill="#f4efd4"/><ellipse cx="33" cy="14" rx="6" ry="7" fill="#f4efd4"/><path d="M11 11h12M27 12h12" stroke="#649249" stroke-width="6"/><path d="M19 13v5m16-4v5" stroke="#233b30" stroke-width="3"/><path d="M10 28q14 6 28-2" stroke="#965b3e" stroke-width="6" stroke-linecap="round"/><path d="M11 27q14 4 26-2" stroke="#4d3b2c" stroke-width="2" fill="none"/></svg>`;
