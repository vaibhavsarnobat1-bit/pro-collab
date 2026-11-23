// Shared identity palette for collaborators. Index is assigned per peer, so the
// same person keeps the same colour across the caret, the tab strip and the
// member rail.
export const PRESENCE_COLORS = [
  { hex: '#ffffff', name: 'white' },
  { hex: '#ededed', name: 'chalk' },
  { hex: '#dbdbdb', name: 'silver' },
  { hex: '#c9c9c9', name: 'mist' },
  { hex: '#b7b7b7', name: 'steel' },
  { hex: '#a5a5a5', name: 'slate' },
  { hex: '#939393', name: 'ash' },
  { hex: '#818181', name: 'graphite' }
];

export const colorIndexFor = (key = '') => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 9973;
  }
  return hash % PRESENCE_COLORS.length;
};

export const colorFor = (key = '') => PRESENCE_COLORS[colorIndexFor(key)];

// Guests need a handle so presence and the activity log are not all "Anonymous".
const GUEST_WORDS = ['otter', 'falcon', 'comet', 'maple', 'cobalt', 'ember', 'harbor', 'quartz', 'willow', 'zephyr'];

export const makeGuestHandle = () => {
  const stored = sessionStorage.getItem('pc-guest-handle');
  if (stored) return stored;
  const word = GUEST_WORDS[Math.floor(Math.random() * GUEST_WORDS.length)];
  const handle = `${word}-${Math.floor(Math.random() * 90 + 10)}`;
  sessionStorage.setItem('pc-guest-handle', handle);
  return handle;
};
