/**
 * projectIO — move a real project in and out of a room.
 *
 * Import reads files the visitor picks (a folder or a handful of files) and
 * returns them as room-friendly `{ path, content }` entries.
 * Export builds a ZIP on the device with no dependency and no upload: the room
 * never leaves the browser to be downloaded.
 */

const encoder = new TextEncoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const dosDateTime = (date = new Date()) => {
  const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() / 2) & 0x1f);
  const day = (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);
  return { time: time & 0xffff, date: day & 0xffff };
};

/** Store-only ZIP (method 0). Text projects compress poorly anyway, and this
 *  keeps the export dependency-free and instant. */
export function buildZip(entries) {
  const files = (entries || []).filter((entry) => entry && entry.path);
  const stamp = dosDateTime();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((entry) => {
    const nameBytes = encoder.encode(entry.path.replace(/\\/g, '/'));
    const dataBytes = entry.bytes instanceof Uint8Array ? entry.bytes : encoder.encode(entry.content ?? '');
    const crc = crc32(dataBytes);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 names
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, stamp.time, true);
    lv.setUint16(12, stamp.date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, stamp.time, true);
    cv.setUint16(14, stamp.date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);

    localParts.push(local, dataBytes);
    centralParts.push(central);
    offset += local.length + dataBytes.length;
  });

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
}

const triggerDownload = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export const safeFileName = (value, fallback = 'project') =>
  String(value || fallback)
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || fallback;

/** Zip the given `{ path, content }` entries and hand it to the OS. */
export const downloadProjectZip = (projectName, entries) => {
  if (!entries?.length) return false;
  const blob = buildZip(entries);
  triggerDownload(blob, `${safeFileName(projectName)}.zip`);
  return true;
};

export const downloadTextFile = (fileName, content) => {
  const blob = new Blob([content ?? ''], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, safeFileName(fileName, 'file.txt'));
  return true;
};

export const downloadJsonFile = (fileName, value) => {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  triggerDownload(blob, safeFileName(fileName, 'data.json'));
  return true;
};

/* ------------------------------------------------------------------ import */

const SKIP_DIRECTORIES = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
  '.cache', '.turbo', 'venv', '__pycache__', '.venv'
]);

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico', 'bmp',
  'woff', 'woff2', 'ttf', 'otf', 'eot', 'pdf', 'zip', 'gz', 'rar', '7z',
  'mp3', 'mp4', 'wav', 'ogg', 'webm', 'mov', 'glb', 'gltf', 'wasm', 'exe',
  'dll', 'so', 'psd', 'ai', 'sketch', 'fig'
]);

export const MAX_IMPORT_BYTES = 400 * 1024;

const extensionOf = (path) => {
  const match = /\.([a-z0-9]+)$/i.exec(path || '');
  return match ? match[1].toLowerCase() : '';
};

const normalizeImportedPath = (file) => {
  const raw = file.webkitRelativePath || file.relativePath || file.name || '';
  const parts = raw.replace(/\\/g, '/').split('/').filter(Boolean);
  if (raw.includes('/') && file.webkitRelativePath) parts.shift(); // drop the picked folder's own name
  return parts.join('/');
};

/**
 * Turn a FileList (from an <input> or a drop) into room entries.
 * Binary files and anything huge are skipped and counted, never silently lost.
 */
export async function readFilesForRoom(fileList) {
  const files = Array.from(fileList || []);
  const entries = [];
  const skipped = [];

  for (const file of files) {
    const path = normalizeImportedPath(file);
    if (!path) continue;
    if (path.split('/').some((segment) => SKIP_DIRECTORIES.has(segment))) continue;
    if (BINARY_EXTENSIONS.has(extensionOf(path))) {
      skipped.push({ path, reason: 'binary file' });
      continue;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      skipped.push({ path, reason: 'larger than 400 KB' });
      continue;
    }
    try {
      entries.push({ path, content: await file.text(), size: file.size });
    } catch {
      skipped.push({ path, reason: 'could not be read' });
    }
  }

  return { entries, skipped };
}

/** Open the OS picker. `directory` switches to folder selection. */
export const pickFiles = ({ directory = false } = {}) =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.style.display = 'none';
    if (directory) {
      input.webkitdirectory = true;
      input.setAttribute('webkitdirectory', '');
    }
    input.addEventListener('change', () => {
      const files = input.files;
      input.remove();
      resolve(files);
    });
    // If the picker is dismissed there is no change event, so clean up on focus.
    input.addEventListener('cancel', () => {
      input.remove();
      resolve(null);
    });
    document.body.appendChild(input);
    input.click();
  });
