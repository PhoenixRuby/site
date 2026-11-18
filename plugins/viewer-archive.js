const viewerArchivePattern = /\.(?:tar\.gz|tgz|tar|zip|gz)$/i;

const readViewerArchive = (() => {
  const maxBytes = 500 * 1024 * 1024;
  const maxFiles = 50000;
  const tooBig = () => new Error('壓縮檔超過 500 MB 或 50,000 個項目的上限。');

  function usablePath(name) {
    const path = archiveSafePath(name);
    return path && !viewerIgnoresPath(path) &&
      !path.split('/').some(part => part === '__MACOSX' || part.startsWith('._')) ? path : null;
  }

  async function gunzip(file) {
    const reader = file.stream().pipeThrough(new DecompressionStream('gzip')).getReader();
    const chunks = [];
    let total = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          throw tooBig();
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return new Uint8Array(await new Blob(chunks).arrayBuffer());
  }

  function zipEncryptedCount(u8) {
    if (u8.length < 22) return 0;
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let e = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 22 - 65535); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) return 0;
    let off = dv.getUint32(e + 16, true), n = dv.getUint16(e + 10, true), enc = 0;
    for (let k = 0; k < n && off + 46 <= u8.length; k++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      if (dv.getUint16(off + 8, true) & 1) enc++;
      off += 46 + dv.getUint16(off + 28, true) + dv.getUint16(off + 30, true) + dv.getUint16(off + 32, true);
    }
    return enc;
  }

  const tarStr = (u8, a, n) => {
    let e = a;
    const end = Math.min(u8.length, a + n);
    while (e < end && u8[e] !== 0) e++;
    return new TextDecoder().decode(u8.subarray(a, e));
  };
  function tarNum(u8, a, n) {
    if (u8[a] & 0x80) { let v = 0; for (let i = 1; i < n; i++) v = v * 256 + u8[a + i]; return v; }   // 超大檔案用 base-256
    const s = tarStr(u8, a, n).trim();
    return s ? parseInt(s, 8) : 0;
  }
  // pax 擴充標頭：每筆是「長度 key=value\n」，長度以位元組計
  function parsePax(data) {
    const out = Object.create(null);
    let i = 0;
    const dec = new TextDecoder();
    while (i < data.length) {
      let sp = i;
      while (sp < data.length && data[sp] !== 0x20) sp++;
      const len = parseInt(dec.decode(data.subarray(i, sp)), 10);
      if (!len || i + len > data.length) break;
      const rec = dec.decode(data.subarray(sp + 1, i + len - 1));
      const eq = rec.indexOf('=');
      if (eq > 0) out[rec.slice(0, eq)] = rec.slice(eq + 1);
      i += len;
    }
    return out;
  }

  // 解析 tar 位元組，回傳 [{ name, type, data }]。支援 ustar、GNU 長檔名（L）、pax（x）
  function parseTar(u8) {
    if (u8.length < 512) throw new Error('TAR 內容不完整。');
    const out = [];
    let pos = 0, longName = null, pax = null;
    while (pos + 512 <= u8.length) {
      let zero = true;
      for (let i = 0; i < 512; i++) if (u8[pos + i] !== 0) { zero = false; break; }
      if (zero) break;
      let checksum = 0;
      for (let i = 0; i < 512; i++) checksum += i >= 148 && i < 156 ? 32 : u8[pos + i];
      if (checksum !== tarNum(u8, pos + 148, 8)) throw new Error('TAR 標頭已損毀。');
      const size = tarNum(u8, pos + 124, 12);
      const type = String.fromCharCode(u8[pos + 156] || 48);
      const magic = tarStr(u8, pos + 257, 6);
      const prefix = magic.startsWith('ustar') ? tarStr(u8, pos + 345, 155) : '';
      let name = tarStr(u8, pos, 100);
      if (prefix) name = prefix + '/' + name;
      const dataStart = pos + 512;
      if (!Number.isSafeInteger(size) || size < 0 || dataStart + size > u8.length) throw new Error('壓縮檔已損毀或不完整（tar 內容被截斷）。');
      const data = u8.subarray(dataStart, dataStart + size);
      if (type === 'L') longName = tarStr(data, 0, data.length);
      else if (type === 'x') pax = parsePax(data);
      else if (type !== 'g' && type !== 'K') {
        if (longName !== null) { name = longName; longName = null; }
        if (pax && pax.path) name = pax.path;
        pax = null;
        if (out.length >= maxFiles) throw tooBig();
        out.push({ name, type, data });
      }
      pos = dataStart + Math.ceil(size / 512) * 512;
    }
    return out;
  }

  // 拒絕絕對路徑、磁碟代號和上層目錄，並統一分隔符號。
  function archiveSafePath(p) {
    if (/^(?:[A-Za-z]:|[\/\\])/.test(p) || p.includes('\0')) return null;
    const parts = p.replace(/\\/g, '/').split('/').filter(x => x && x !== '.');
    if (!parts.length || parts.some(x => x === '..') || /^[A-Za-z]:$/.test(parts[0])) return null;
    return parts.join('/');
  }

  return async function (file) {
    const name = file.name.toLowerCase();
    if (!viewerArchivePattern.test(name)) throw new Error('不支援的壓縮檔格式。');
    if (file.size > maxBytes) throw tooBig();
    let raw;
    if (name.endsWith('.zip')) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (zipEncryptedCount(bytes)) throw new Error('這個 ZIP 有密碼保護，目前無法開啟。');
      const fflate = await library('fflate');
      let total = 0;
      let count = 0;
      const files = fflate.unzipSync(bytes, {
        filter(entry) {
          if (++count > maxFiles) throw tooBig();
          if (!usablePath(entry.name)) return false;
          total += entry.originalSize;
          if (total > maxBytes) throw tooBig();
          return true;
        },
      });
      raw = Object.entries(files).map(([name, data]) => ({ name, data, type: name.endsWith('/') ? '5' : '0' }));
    } else {
      const bytes = name.endsWith('.tar') ? new Uint8Array(await file.arrayBuffer()) : await gunzip(file);
      const isTar = /\.(?:tar(?:\.gz)?|tgz)$/.test(name) || tarStr(bytes, 257, 5) === 'ustar';
      raw = isTar ? parseTar(bytes) : [{ name: file.name.slice(0, -3), type: '0', data: bytes }];
    }

    const root = usablePath(file.name) || 'archive';
    const entries = new Map();
    const directories = new Set([root]);
    for (const { name, type, data } of raw) {
      const relative = usablePath(name);
      if (!relative) continue;
      const path = root + '/' + relative;
      if (type === '5') directories.add(path);
      if (type === '0' || type === '7') {
        entries.set(path, { path, file: new File([data], relative.split('/').at(-1)) });
      }
    }
    return { entries: [...entries.values()], directories };
  };
})();
