/**
 * aiKeyStore — keys added from the assistant panel while the server runs.
 *
 * Environment variables stay the primary source. This is the fallback for
 * people who would rather paste a key than edit server/.env and restart.
 * Values are written to server/data/ (gitignored), never logged and never
 * returned to the browser — the API only reports whether a key exists.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'ai-keys.json');

let cache = null;

const load = () => {
  if (cache) return cache;
  cache = {};
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      Object.entries(parsed).forEach(([id, value]) => {
        if (typeof value === 'string' && value.trim()) cache[id] = value.trim();
      });
    }
  } catch {
    /* first run, or the file was removed — an empty store is fine */
  }
  return cache;
};

const persist = () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, `${JSON.stringify(cache, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
};

const getSavedKey = (id) => load()[id] || '';

const setSavedKey = (id, key) => {
  load();
  cache[id] = String(key).trim();
  persist();
  return cache[id];
};

const removeSavedKey = (id) => {
  load();
  if (!cache[id]) return false;
  delete cache[id];
  persist();
  return true;
};

const listSavedIds = () => Object.keys(load());

module.exports = { getSavedKey, setSavedKey, removeSavedKey, listSavedIds, FILE };
