// =========================================================
// Icons — minimal inline SVGs, stroke-based, currentColor
// =========================================================

const svg = (paths, viewBox = "0 0 24 24") =>
  `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

export const ICONS = {
  check: svg(`<path d="M20 6L9 17l-5-5"/>`),
  checkCircle: svg(`<circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/>`),
  store: svg(`<path d="M3 9l1-5h16l1 5"/><path d="M4 9v10h16V9"/><path d="M9 21v-6h6v6"/>`),
  mapPin: svg(`<path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>`),
  clock: svg(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`),
  calendar: svg(`<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>`),
  arrowRight: svg(`<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>`),
  arrowLeft: svg(`<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>`),
  logout: svg(`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>`),
  users: svg(`<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.6"/><path d="M14.7 14.2c2.9.4 5.3 2.5 5.3 5.8"/>`),
  userCheck: svg(`<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/><path d="M17 10l1.8 1.8L22 8.2"/>`),
  userX: svg(`<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16.5 8.5l4 4M20.5 8.5l-4 4"/>`),
  bell: svg(`<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 21a2 2 0 0 0 4 0"/>`),
  search: svg(`<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>`),
  chevronDown: svg(`<path d="M6 9l6 6 6-6"/>`),
  dashboard: svg(`<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="12" width="8" height="9" rx="1.5"/><rect x="3" y="14" width="8" height="7" rx="1.5"/>`),
  activity: svg(`<path d="M22 12h-4l-3 8-6-16-3 8H2"/>`),
  building: svg(`<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/>`),
  fileText: svg(`<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8 13h8M8 17h8M8 9h3"/>`),
  scan: svg(`<path d="M4 8V5a1 1 0 0 1 1-1h3M17 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M7 20H4a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="12" r="3.2"/>`),
  settings: svg(`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>`),
  info: svg(`<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>`),
  alertTriangle: svg(`<path d="M10.3 3.9L1.8 18a1.5 1.5 0 0 0 1.3 2.2h17.8a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z"/><path d="M12 9v4M12 17h.01"/>`),
  home: svg(`<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>`),
  plus: svg(`<path d="M12 5v14M5 12h14"/>`),
  refresh: svg(`<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>`),
  download: svg(`<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>`),
  edit: svg(`<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>`),
  camera: svg(`<path d="M4 8a2 2 0 0 1 2-2h1l1.5-2h7L17 6h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>`)
};
