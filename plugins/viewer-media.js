const viewerMedia = (() => {
  const types = new Map(Object.entries({
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon',
    svg: 'image/svg+xml', pdf: 'application/pdf',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav',
    oga: 'audio/ogg', opus: 'audio/ogg', ogg: 'audio/ogg', flac: 'audio/flac',
    mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    ogv: 'video/ogg', mkv: 'video/x-matroska',
  }));

  function typeOf(file) {
    const extension = file.name.toLowerCase().split('.').at(-1);
    if (extension === 'html' || extension === 'htm') return 'text/html';
    return types.get(extension) || '';
  }

  function imagePreview(image, onDimensions) {
    const container = document.createElement('div');
    container.className = 'viewer-image';
    const controls = document.createElement('div');
    controls.className = 'viewer-image-controls';
    const stage = document.createElement('div');
    stage.className = 'viewer-image-stage';
    const zoom = document.createElement('output');
    const hint = document.createElement('span');
    hint.className = 'viewer-image-hint';
    hint.textContent = '滾輪縮放 · 拖曳平移 · 雙擊切換';
    const checkerLabel = document.createElement('label');
    checkerLabel.className = 'viewer-image-checker-toggle';
    const checker = document.createElement('input');
    checker.type = 'checkbox';
    checker.checked = (() => {
      try { return localStorage.getItem('viewer-image-checkerboard') !== 'off'; }
      catch (_) { return true; }
    })();
    checkerLabel.append(checker, document.createTextNode(' 顯示格線'));
    function updateChecker() {
      stage.classList.toggle('checkerboard', checker.checked);
      try { localStorage.setItem('viewer-image-checkerboard', checker.checked ? 'on' : 'off'); }
      catch (_) { /* 瀏覽器禁止儲存時，仍可在當前圖片切換 */ }
    }
    checker.addEventListener('change', updateChecker);
    updateChecker();
    let scale = 1;
    let x = 0;
    let y = 0;
    let fitted = true;
    function paint() {
      image.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
      zoom.textContent = Math.round(scale * 100) + '%' + (fitted ? '（適合視窗）' : '');
    }
    function fit() {
      if (!image.naturalWidth || !stage.clientWidth || !stage.clientHeight) return;
      fitted = true;
      scale = Math.min(1, stage.clientWidth / image.naturalWidth, stage.clientHeight / image.naturalHeight);
      x = (stage.clientWidth - image.naturalWidth * scale) / 2;
      y = (stage.clientHeight - image.naturalHeight * scale) / 2;
      paint();
    }
    function zoomAt(factor, px = stage.clientWidth / 2, py = stage.clientHeight / 2) {
      const next = Math.max(0.02, Math.min(40, scale * factor));
      x = px - (px - x) * next / scale;
      y = py - (py - y) * next / scale;
      scale = next;
      fitted = false;
      paint();
    }
    for (const [label, action] of [
      ['縮小', () => zoomAt(0.8)], ['放大', () => zoomAt(1.25)],
      ['適合視窗', fit], ['100%', () => zoomAt(1 / scale)],
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn';
      button.textContent = label;
      button.addEventListener('click', action);
      controls.append(button);
    }
    controls.append(zoom, checkerLabel, hint);
    stage.tabIndex = 0;
    stage.setAttribute('aria-label', '圖片檢視區：滾輪縮放、拖曳平移、雙擊切換');
    stage.addEventListener('dblclick', event => {
	  event.preventDefault();
      const rect = stage.getBoundingClientRect();
      if (Math.abs(scale - 1) < 0.01) fit();
      else zoomAt(1 / scale, event.clientX - rect.left, event.clientY - rect.top);
    });
    stage.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const pan = (dx, dy) => { x += dx; y += dy; fitted = false; paint(); };
      switch (event.key) {
        case '+': case '=': event.preventDefault(); zoomAt(1.25); break;
        case '-': case '_': event.preventDefault(); zoomAt(0.8); break;
        case '0': event.preventDefault(); fit(); break;
        case '1': event.preventDefault(); zoomAt(1 / scale); break;
        case 'ArrowLeft': event.preventDefault(); pan(60, 0); break;
        case 'ArrowRight': event.preventDefault(); pan(-60, 0); break;
        case 'ArrowUp': event.preventDefault(); pan(0, 60); break;
        case 'ArrowDown': event.preventDefault(); pan(0, -60); break;
      }
    });
    stage.addEventListener('wheel', event => {
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? stage.clientHeight : 1);
      zoomAt(Math.exp(-delta * 0.0015), event.clientX - rect.left, event.clientY - rect.top);
    }, { passive: false });
    let drag;
    stage.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      drag = { x: event.clientX - x, y: event.clientY - y };
      stage.setPointerCapture(event.pointerId);
      stage.focus({ preventScroll: true });
    });
    stage.addEventListener('pointermove', event => {
      if (!drag) return;
      fitted = false;
      x = event.clientX - drag.x;
      y = event.clientY - drag.y;
      paint();
    });
    stage.addEventListener('lostpointercapture', () => { drag = undefined; });
    stage.addEventListener('pointercancel', () => { drag = undefined; });
    image.addEventListener('load', () => {
      onDimensions?.(image.naturalWidth, image.naturalHeight);
      fit();
    });
    const observer = new ResizeObserver(() => { if (fitted) fit(); });
    observer.observe(stage);
    stage.append(image);
    container.append(controls, stage);
    return { node: container, dispose: () => observer.disconnect() };
  }

  const AV_AUDIO_EXT = 'mp3 m4a m4r m4b aac wav wave ogg oga opus flac weba mka wma ac3 eac3 dts aif aiff aifc amr ape mp2 mpc'.split(' ');
  const AV_VIDEO_EXT = 'mp4 m4v mov webm ogv mkv avi wmv flv m2ts mpg mpeg mpe vob 3gp 3g2 asf rm rmvb f4v divx'.split(' ');

  // .ts / .mts 也是 TypeScript 的副檔名：只有內容真的是 MPEG-TS（每 188 位元組一個 0x47，m2ts 前面多 4 位元組）才當影片
  const TS_EXT = new Set(['ts', 'mts', 'm2ts']);
  const isMpegTs = b => (b.length > 376 && b[0] === 0x47 && b[188] === 0x47 && b[376] === 0x47) || (b.length > 388 && b[4] === 0x47 && b[196] === 0x47 && b[388] === 0x47);
  const mu32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const mu16 = (b, o) => (b[o] << 8) | b[o + 1];
  const mstr = (b, o, n) => { let s = ''; for (let i = o; i < o + n && i < b.length; i++) s += String.fromCharCode(b[i]); return s; };
  const mutf8 = (b, o, n) => new TextDecoder('utf-8').decode(b.subarray(o, Math.min(b.length, o + n)));

  // 編碼名稱與對應的 canPlayType 字串（沒有字串的表示瀏覽器幾乎都不支援，或沒有統一寫法）
  const CODEC_INFO = {
    h264: ['H.264 / AVC', 'avc1.640028'], h265: ['H.265 / HEVC', 'hvc1.1.6.L93.B0'], av1: ['AV1', 'av01.0.05M.08'],
    vp9: ['VP9', 'vp09.00.10.08'], vp8: ['VP8', 'vp8'], mpeg4: ['MPEG-4 Part 2（DivX / Xvid）', null], mpeg2: ['MPEG-2', null],
    mpeg1: ['MPEG-1', null], theora: ['Theora', 'theora'], wmv: ['Windows Media Video', null], flv1: ['Sorenson H.263（FLV）', null],
    vp6: ['VP6', null], mjpeg: ['Motion JPEG', null], prores: ['Apple ProRes', null], h263: ['H.263', null],
    aac: ['AAC', 'mp4a.40.2'], mp3: ['MP3', 'mp3'], mp2: ['MP2', null], ac3: ['Dolby Digital（AC-3）', 'ac-3'],
    eac3: ['Dolby Digital Plus（E-AC-3）', 'ec-3'], dts: ['DTS', null], truehd: ['Dolby TrueHD', null], opus: ['Opus', 'opus'],
    vorbis: ['Vorbis', 'vorbis'], flac: ['FLAC', 'flac'], alac: ['ALAC', 'alac'], pcm: ['PCM（未壓縮）', null],
    wma: ['Windows Media Audio', null], amr: ['AMR', null], speex: ['Speex', null], other: ['其他編碼', null]
  };
  // 這些編碼在瀏覽器裡「通常」不支援（不是絕對，所以文字上只說「通常」）
  const RARELY_SUPPORTED = new Set(['mpeg4', 'mpeg2', 'mpeg1', 'wmv', 'flv1', 'vp6', 'mjpeg', 'prores', 'h263', 'dts', 'truehd', 'wma', 'amr', 'speex', 'mp2']);

  function codecFromFourcc(cc, kind) {
    const c = cc.toLowerCase();
    if (kind === 'video') {
      if (/^(avc[1-4]|h264|x264|davc)$/.test(c)) return 'h264';
      if (/^(hvc1|hev1|hevc|h265|x265|dvh1|dvhe)$/.test(c)) return 'h265';
      if (c === 'av01' || c === 'av1 ') return 'av1';
      if (/^vp09$/.test(c)) return 'vp9';
      if (/^vp08$/.test(c)) return 'vp8';
      if (/^(mp4v|xvid|divx|dx50|fmp4|dvx1|3ivd|mp4s)$/.test(c)) return 'mpeg4';
      if (/^(mpg2|mp2v|mpeg)$/.test(c)) return 'mpeg2';
      if (/^(mjpg|mjpa|mjpb|jpeg)$/.test(c)) return 'mjpeg';
      if (/^(wmv[1-3]|wvc1|wmva|mss[12])$/.test(c)) return 'wmv';
      if (/^(apch|apcn|apcs|apco|ap4h|ap4x)$/.test(c)) return 'prores';
      if (/^(s263|h263)$/.test(c)) return 'h263';
      if (/^(theo)$/.test(c)) return 'theora';
    } else {
      if (/^(mp4a)$/.test(c)) return 'aac';
      if (c === 'ac-3' || c === 'ac3 ') return 'ac3';
      if (c === 'ec-3') return 'eac3';
      if (/^(dtsc|dtsh|dtsl|dtse)$/.test(c)) return 'dts';
      if (c === 'opus') return 'opus';
      if (c === 'flac') return 'flac';
      if (c === 'alac') return 'alac';
      if (/^(sowt|twos|lpcm|ipcm|fl32|fl64|in24|in32|raw )$/.test(c)) return 'pcm';
      if (c === '.mp3') return 'mp3';
      if (/^(samr|sawb)$/.test(c)) return 'amr';
    }
    return null;
  }
  const cod = (key, detail) => ({ key, name: CODEC_INFO[key][0], detail: detail || '' });

  /* ----- MP4 / MOV / M4A / 3GP ----- */
  function* mp4Boxes(b, start, end) {
    let o = start;
    while (o + 8 <= end) {
      let s = mu32(b, o), hdr = 8;
      const t = mstr(b, o + 4, 4);
      if (s === 1) { s = mu32(b, o + 8) * 4294967296 + mu32(b, o + 12); hdr = 16; }
      else if (s === 0) s = end - o;
      if (s < hdr) break;
      const e = Math.min(end, o + s);
      yield { type: t, start: o + hdr, end: e, off: o, size: s };
      o += s;
    }
  }
  const H264_PROFILE = { 66: 'Baseline', 77: 'Main', 88: 'Extended', 100: 'High', 110: 'High 10', 122: 'High 4:2:2', 244: 'High 4:4:4', 44: 'CAVLC 4:4:4' };

  function esdsObjectType(b, s, e) {   // ES_Descriptor -> DecoderConfigDescriptor(0x04) 的第一個位元組 = objectTypeIndication
    let o = s + 4;
    const len = () => { let l = 0, n = 0, c; do { c = b[o++]; l = (l << 7) | (c & 0x7F); n++; } while ((c & 0x80) && n < 4); return l; };
    while (o < e) {
      const tag = b[o++];
      const l = len();
      if (tag === 0x03) o += 3;                   // ES_ID(2) + flags(1)
      else if (tag === 0x04) return b[o];
      else o += l;
    }
    return null;
  }

  function parseStsd(b, s, e, handler, out) {
    const count = mu32(b, s + 4);
    let o = s + 8;
    for (let i = 0; i < count && o + 8 <= e; i++) {
      const size = mu32(b, o), fmt = mstr(b, o + 4, 4);
      const end = Math.min(e, o + Math.max(size, 8));
      if (handler === 'vide') {
        const key = codecFromFourcc(fmt, 'video');
        let detail = '';
        for (const c of mp4Boxes(b, o + 8 + 78, end)) {
          if (c.type === 'avcC' && c.end - c.start >= 4) detail = (H264_PROFILE[b[c.start + 1]] || '') + ' Level ' + (b[c.start + 3] / 10).toFixed(1);
          if (c.type === 'hvcC' && c.end - c.start >= 2) { const p = b[c.start + 1] & 0x1F; detail = p === 1 ? 'Main' : p === 2 ? 'Main 10（10-bit）' : 'Profile ' + p; }
        }
        out.video.push(key ? cod(key, detail.trim()) : { key: 'other', name: '影像編碼「' + fmt + '」', detail: '' });
      } else if (handler === 'soun') {
        let key = codecFromFourcc(fmt, 'audio');
        if (fmt === 'mp4a') {
          for (const c of mp4Boxes(b, o + 8 + 28, end)) {
            if (c.type === 'esds') {
              const oti = esdsObjectType(b, c.start, c.end);
              if (oti === 0x6B || oti === 0x69) key = 'mp3';
              else if (oti === 0xA5) key = 'ac3';
              else if (oti === 0xA6) key = 'eac3';
              else if (oti === 0xA9 || oti === 0xA8) key = 'dts';
            }
          }
        }
        out.audio.push(key ? cod(key) : { key: 'other', name: '聲音編碼「' + fmt + '」', detail: '' });
      } else if (handler === 'sbtl' || handler === 'text' || handler === 'subt') {
        out.subs.push({ key: fmt, name: fmt === 'tx3g' ? '內嵌字幕（mov_text）' : '內嵌字幕（' + fmt + '）' });
      }
      o += Math.max(size, 8);
    }
  }

  function parseMoov(b, out) {
    const f = [...mp4Boxes(b, 0, b.length)][0];
    if (!f) return;
    const walk = (s, e, ctx) => {
      for (const bx of mp4Boxes(b, s, e)) {
        if (bx.type === 'mvhd') {
          const v = b[bx.start];
          const ts = v === 1 ? mu32(b, bx.start + 20) : mu32(b, bx.start + 12);
          const du = v === 1 ? mu32(b, bx.start + 24) * 4294967296 + mu32(b, bx.start + 28) : mu32(b, bx.start + 16);
          if (ts) out.duration = du / ts;
        } else if (bx.type === 'trak') { walk(bx.start, bx.end, { handler: '' }); }
        else if (bx.type === 'hdlr') { if (!ctx.inMinf) ctx.handler = mstr(b, bx.start + 8, 4); }
        else if (bx.type === 'minf') { const was = ctx.inMinf; ctx.inMinf = true; walk(bx.start, bx.end, ctx); ctx.inMinf = was; }
        else if (bx.type === 'mdia' || bx.type === 'stbl') { walk(bx.start, bx.end, ctx); }
        else if (bx.type === 'stsd') { parseStsd(b, bx.start, bx.end, ctx.handler, out); }
        else if (bx.type === 'udta') { walk(bx.start, bx.end, ctx); }
        else if (bx.type === 'meta') { walk(bx.start + 4, bx.end, ctx); }
        else if (bx.type === 'ilst') { out.tags = Object.assign(out.tags || {}, parseIlst(b, bx.start, bx.end)); }
      }
    };
    walk(f.start, f.end, { handler: '' });
  }

  function parseIlst(b, s, e) {
    const t = {};
    for (const it of mp4Boxes(b, s, e)) {
      for (const d of mp4Boxes(b, it.start, it.end)) {
        if (d.type !== 'data') continue;
        const kind = mu32(b, d.start) & 0xFFFFFF, p = d.start + 8;
        const text = () => mutf8(b, p, d.end - p);
        const name = it.type;
        if (name === '\xA9nam') t.title = text();
        else if (name === '\xA9ART' || name === 'aART') t.artist = t.artist || text();
        else if (name === '\xA9alb') t.album = text();
        else if (name === '\xA9day') t.year = text().slice(0, 4);
        else if (name === '\xA9gen') t.genre = text();
        else if (name === 'trkn' && d.end - p >= 6) t.track = mu16(b, p + 2) + (mu16(b, p + 4) ? '/' + mu16(b, p + 4) : '');
        else if (name === 'covr') t.cover = { mime: kind === 14 ? 'image/png' : kind === 13 ? 'image/jpeg' : 'image/jpeg', data: b.slice(p, d.end) };
      }
    }
    return t;
  }

  async function sniffMp4(read, size, head, out) {
    out.container = 'mp4';
    if (mstr(head, 4, 4) === 'ftyp') out.brand = mstr(head, 8, 4);
    let off = 0, guard = 0;
    while (off + 8 <= size && guard++ < 400) {
      const h = off === 0 ? head : await read(off, Math.min(size, off + 16));
      if (h.length < 8) break;
      let bsize = mu32(h, 0);
      const type = mstr(h, 4, 4);
      if (bsize === 1 && h.length >= 16) bsize = mu32(h, 8) * 4294967296 + mu32(h, 12);
      else if (bsize === 0) bsize = size - off;
      if (bsize < 8) break;
      if (type === 'moov') {
        const end = Math.min(size, off + bsize, off + 24 * 1024 * 1024);
        parseMoov(await read(off, end), out);
        out.foundMoov = true;
      }
      if (off + bsize > size) { out.notes.push('檔案可能被截斷：「' + type + '」區塊宣告有 ' + bsize + ' 位元組，但檔案只剩 ' + (size - off) + ' 位元組'); break; }
      off += bsize;
    }
    if (!out.foundMoov) out.notes.push('找不到 moov（檔案不完整、還沒寫完，或不是正常的 MP4）');
  }

  /* ----- Matroska / WebM（EBML） ----- */
  const MKV_V = { 'V_MPEG4/ISO/AVC': 'h264', 'V_MPEGH/ISO/HEVC': 'h265', 'V_VP8': 'vp8', 'V_VP9': 'vp9', 'V_AV1': 'av1', 'V_MPEG4/ISO/ASP': 'mpeg4', 'V_MPEG4/ISO/SP': 'mpeg4', 'V_MPEG4/MS/V3': 'mpeg4', 'V_MPEG2': 'mpeg2', 'V_MPEG1': 'mpeg1', 'V_THEORA': 'theora', 'V_PRORES': 'prores', 'V_MJPEG': 'mjpeg' };
  function mkvAudio(id) {
    if (id.startsWith('A_AAC')) return 'aac';
    if (id === 'A_MPEG/L3') return 'mp3';
    if (id === 'A_MPEG/L2' || id === 'A_MPEG/L1') return 'mp2';
    if (id === 'A_AC3' || id === 'A_AC3/BSID9' || id === 'A_AC3/BSID10') return 'ac3';
    if (id === 'A_EAC3') return 'eac3';
    if (id.startsWith('A_DTS')) return 'dts';
    if (id === 'A_OPUS') return 'opus';
    if (id === 'A_VORBIS') return 'vorbis';
    if (id === 'A_FLAC') return 'flac';
    if (id.startsWith('A_PCM')) return 'pcm';
    if (id.startsWith('A_TRUEHD') || id === 'A_MLP') return 'truehd';
    if (id === 'A_ALAC') return 'alac';
    return null;
  }
  function sniffMkv(b, out) {
    const idAt = o => { const f = b[o]; const n = f >= 0x80 ? 1 : f >= 0x40 ? 2 : f >= 0x20 ? 3 : f >= 0x10 ? 4 : 0; if (!n) return null; let id = 0; for (let i = 0; i < n; i++) id = id * 256 + b[o + i]; return { id, len: n }; };
    const szAt = o => { const f = b[o]; let n = 1, mask = 0x80; while (n <= 8 && !(f & mask)) { n++; mask >>= 1; } if (n > 8) return null; let v = f & (mask - 1), unk = v === mask - 1; for (let i = 1; i < n; i++) { v = v * 256 + b[o + i]; if (b[o + i] !== 0xFF) unk = false; } return { size: unk ? -1 : v, len: n }; };
    const uint = (o, n) => { let v = 0; for (let i = 0; i < n; i++) v = v * 256 + b[o + i]; return v; };
    let docType = '', scale = 1000000, dur = null;
    const tracks = [];
    const MASTER = new Set([0x1A45DFA3, 0x18538067, 0x1654AE6B, 0xAE, 0x1549A966, 0xE0, 0xE1]);
    const walk = (s, e, cur) => {
      let o = s;
      while (o + 2 <= e && o < b.length) {
        const id = idAt(o); if (!id) return;
        const sz = szAt(o + id.len); if (!sz) return;
        const ds = o + id.len + sz.len, de = sz.size < 0 ? e : Math.min(e, ds + sz.size);
        if (id.id === 0x1F43B675) return;                       // Cluster：後面都是影音資料
        if (id.id === 0x4282) docType = mstr(b, ds, de - ds);
        else if (id.id === 0x2AD7B1) scale = uint(ds, de - ds);
        else if (id.id === 0x4489) { const v = new DataView(b.buffer, b.byteOffset + ds, de - ds); dur = de - ds === 8 ? v.getFloat64(0) : v.getFloat32(0); }
        else if (id.id === 0xAE) { const t = { type: 0, codec: '' }; tracks.push(t); walk(ds, de, t); o = de; continue; }
        else if (cur && id.id === 0x83) cur.type = uint(ds, de - ds);
        else if (cur && id.id === 0x86) cur.codec = mstr(b, ds, de - ds);
        else if (MASTER.has(id.id)) walk(ds, de, cur);
        if (sz.size < 0) return;
        o = de;
      }
    };
    walk(0, b.length, null);
    out.container = docType === 'webm' ? 'webm' : 'mkv';
    if (dur != null) out.duration = dur * scale / 1e9;
    for (const t of tracks) {
      if (t.type === 1) { const k = MKV_V[t.codec]; out.video.push(k ? cod(k) : { key: 'other', name: '影像編碼「' + t.codec + '」', detail: '' }); }
      else if (t.type === 2) { const k = mkvAudio(t.codec); out.audio.push(k ? cod(k) : { key: 'other', name: '聲音編碼「' + t.codec + '」', detail: '' }); }
      else if (t.type === 17) out.subs.push({ key: t.codec, name: '內嵌字幕（' + t.codec.replace(/^S_/, '') + '）' });
    }
  }

  /* ----- AVI / WAV（RIFF） ----- */
  const WAVE_TAG = { 1: 'pcm', 3: 'pcm', 0x55: 'mp3', 0x2000: 'ac3', 0x2001: 'dts', 0xFF: 'aac', 0x1610: 'aac', 0x160: 'wma', 0x161: 'wma', 0x162: 'wma', 0x163: 'wma', 0x50: 'mp2' };
  function sniffRiff(b, out) {
    const le32 = o => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
    const le16 = o => b[o] | (b[o + 1] << 8);
    const form = mstr(b, 8, 4);
    if (form === 'WAVE') {
      out.container = 'wav';
      let o = 12;
      while (o + 8 <= b.length) {
        const id = mstr(b, o, 4), sz = le32(o + 4);
        if (id === 'fmt ') { let tag = le16(o + 8); if (tag === 0xFFFE && sz >= 26) tag = le16(o + 8 + 24); const k = WAVE_TAG[tag]; out.audio.push(k ? cod(k) : { key: 'other', name: '聲音格式代碼 0x' + tag.toString(16), detail: '' }); break; }
        o += 8 + sz + (sz & 1);
      }
      return;
    }
    if (form !== 'AVI ') return;
    out.container = 'avi';
    let lastType = '';
    const walk = (s, e) => {
      let o = s;
      while (o + 8 <= e && o + 8 <= b.length) {
        const id = mstr(b, o, 4), sz = le32(o + 4);
        if (id === 'LIST') { walk(o + 12, Math.min(e, o + 8 + sz)); }
        else if (id === 'strh') { lastType = mstr(b, o + 8, 4); lastType = lastType === 'vids' || lastType === 'auds' ? lastType : ''; out._h = mstr(b, o + 12, 4); }
        else if (id === 'strf') {
          if (lastType === 'vids') { const comp = mstr(b, o + 8 + 16, 4); const cc = comp.replace(/\0/g, '') ? comp : out._h; const k = codecFromFourcc(cc, 'video'); out.video.push(k ? cod(k) : { key: 'other', name: '影像編碼「' + cc + '」', detail: '' }); }
          else if (lastType === 'auds') { const k = WAVE_TAG[le16(o + 8)]; out.audio.push(k ? cod(k) : { key: 'other', name: '聲音格式代碼 0x' + le16(o + 8).toString(16), detail: '' }); }
        }
        else if (id === 'movi') return;
        if (id === 'LIST') { o += 8 + sz + (sz & 1); } else { o += 8 + sz + (sz & 1); }
      }
    };
    walk(12, b.length);
    delete out._h;
  }

  /* ----- Ogg / FLAC / MP3 / AAC / AC3 / FLV / ASF / TS ----- */
  function sniffOgg(b, out) {
    out.container = 'ogg';
    const s = mstr(b, 0, Math.min(b.length, 4096));
    if (s.includes('\x01vorbis')) out.audio.push(cod('vorbis'));
    if (s.includes('OpusHead')) out.audio.push(cod('opus'));
    if (s.includes('\x80theora')) out.video.push(cod('theora'));
    if (s.includes('\x7fFLAC')) out.audio.push(cod('flac'));
    if (s.includes('Speex   ')) out.audio.push(cod('speex'));
    if (s.includes('\x01video\0\0\0')) out.video.push({ key: 'other', name: 'Ogg 內的影像（Dirac 或其他）', detail: '' });
  }
  const MP_BR = {
    '3,3': [32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], '3,2': [32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384], '3,1': [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
    '2,3': [32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256], '2,2': [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], '2,1': [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
  };
  const MP_SR = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
  // 一個 MPEG 音訊影格的長度（位元組）；標頭不合法就回傳 0
  function mpegFrameLen(b, o) {
    if (o + 4 > b.length || b[o] !== 0xFF || (b[o + 1] & 0xE0) !== 0xE0) return 0;
    const ver = (b[o + 1] >> 3) & 3, layer = (b[o + 1] >> 1) & 3;
    if (ver === 1 || layer === 0) return 0;
    const bi = (b[o + 2] >> 4) & 0xF, si = (b[o + 2] >> 2) & 3, pad = (b[o + 2] >> 1) & 1;
    if (bi === 0 || bi === 15 || si === 3) return 0;
    const table = MP_BR[(ver === 3 ? 3 : 2) + ',' + layer];
    const br = table[bi - 1] * 1000, sr = MP_SR[ver][si];
    return layer === 3 ? (Math.floor(12 * br / sr + pad)) * 4 : (layer === 1 && ver !== 3 ? Math.floor(72 * br / sr) + pad : Math.floor(144 * br / sr) + pad);
  }
  function adtsFrameLen(b, o) {
    if (o + 7 > b.length || b[o] !== 0xFF || (b[o + 1] & 0xF6) !== 0xF0) return 0;
    const len = ((b[o + 3] & 3) << 11) | (b[o + 4] << 3) | (b[o + 5] >> 5);
    return len >= 7 ? len : 0;
  }
  function sniffMpegAudioAt(b, o, out) {
    const n = mpegFrameLen(b, o);
    if (n) {
      const next = o + n;
      if (next + 4 > b.length || mpegFrameLen(b, next)) { out.container = 'mp3'; out.audio.push(cod(((b[o + 1] >> 1) & 3) === 1 ? 'mp3' : 'mp2')); return true; }
    }
    const a = adtsFrameLen(b, o);
    if (a) { const next = o + a; if (next + 7 > b.length || adtsFrameLen(b, next)) { out.container = 'aac'; out.audio.push(cod('aac')); return true; } }
    return false;
  }
  function parseId3(b, out) {
    if (mstr(b, 0, 3) !== 'ID3') return 0;
    const ver = b[3], tagSize = ((b[6] & 0x7F) << 21) | ((b[7] & 0x7F) << 14) | ((b[8] & 0x7F) << 7) | (b[9] & 0x7F);
    const total = 10 + tagSize;
    const t = {};
    const dec = (enc, o, e) => {
      if (enc === 0) return Array.from(b.subarray(o, e)).map(c => String.fromCharCode(c)).join('');
      if (enc === 3) return mutf8(b, o, e - o);
      let le = true, s = o;
      if (b[s] === 0xFE && b[s + 1] === 0xFF) { le = false; s += 2; } else if (b[s] === 0xFF && b[s + 1] === 0xFE) { s += 2; } else if (enc === 2) le = false;
      return new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(b.subarray(s, e));
    };
    const clean = s => s.replace(/\0+$/, '').replace(/^\0+/, '');
    let o = 10;
    const idLen = ver === 2 ? 3 : 4;
    while (o + (ver === 2 ? 6 : 10) <= Math.min(b.length, total)) {
      const id = mstr(b, o, idLen);
      if (!/^[A-Z0-9]+$/.test(id)) break;
      let sz;
      if (ver === 2) sz = (b[o + 3] << 16) | (b[o + 4] << 8) | b[o + 5];
      else if (ver === 4) sz = ((b[o + 4] & 0x7F) << 21) | ((b[o + 5] & 0x7F) << 14) | ((b[o + 6] & 0x7F) << 7) | (b[o + 7] & 0x7F);
      else sz = mu32(b, o + 4);
      const ds = o + (ver === 2 ? 6 : 10), de = Math.min(b.length, ds + sz);
      if (sz <= 0 || de > b.length + 1) break;
      const text = () => clean(dec(b[ds], ds + 1, de)).split('\0')[0];
      if (id === 'TIT2' || id === 'TT2') t.title = text();
      else if (id === 'TPE1' || id === 'TP1') t.artist = text();
      else if (id === 'TALB' || id === 'TAL') t.album = text();
      else if (id === 'TYER' || id === 'TDRC' || id === 'TYE') t.year = text().slice(0, 4);
      else if (id === 'TRCK' || id === 'TRK') t.track = text();
      else if (id === 'TCON' || id === 'TCO') t.genre = text();
      else if (id === 'APIC' || id === 'PIC') {
        const enc = b[ds];
        let p = ds + 1, mime = '';
        if (id === 'PIC') { const f = mstr(b, p, 3); mime = f === 'PNG' ? 'image/png' : 'image/jpeg'; p += 3; }
        else { let q = p; while (q < de && b[q] !== 0) q++; mime = mstr(b, p, q - p) || 'image/jpeg'; p = q + 1; }
        p += 1;                                                  // picture type
        if (enc === 1 || enc === 2) { while (p + 1 < de && !(b[p] === 0 && b[p + 1] === 0)) p += 2; p += 2; } else { while (p < de && b[p] !== 0) p++; p += 1; }
        if (p < de && (!t.cover)) t.cover = { mime: mime === 'image/jpg' ? 'image/jpeg' : mime, data: b.slice(p, de) };
      }
      o = ds + sz;
    }
    out.tags = Object.assign(out.tags || {}, t);
    return total;
  }
  function sniffFlv(b, out) {
    out.container = 'flv';
    let o = mu32(b, 5) + 4;
    for (let i = 0; i < 40 && o + 11 <= b.length && (!out.video.length || !out.audio.length); i++) {
      const type = b[o], sz = (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3];
      const d = b[o + 11];
      if (type === 9 && !out.video.length && d !== undefined) { const c = d & 0x0F; const k = c === 7 ? 'h264' : c === 12 ? 'h265' : c === 2 ? 'flv1' : c === 4 || c === 5 ? 'vp6' : null; out.video.push(k ? cod(k) : { key: 'other', name: 'FLV 影像編碼 ' + c, detail: '' }); }
      if (type === 8 && !out.audio.length && d !== undefined) { const c = d >> 4; const k = c === 10 ? 'aac' : c === 2 ? 'mp3' : c === 0 || c === 3 ? 'pcm' : null; out.audio.push(k ? cod(k) : { key: 'other', name: 'FLV 聲音編碼 ' + c, detail: '' }); }
      o += 11 + sz + 4;
    }
  }
  function sniffTs(b, out) {
    out.container = 'ts';
    let pmtPid = -1;
    const pkt = n => b.subarray(n * 188, n * 188 + 188);
    for (let n = 0; n * 188 + 188 <= b.length && n < 300; n++) {
      const p = pkt(n);
      if (p[0] !== 0x47) break;
      const pid = ((p[1] & 0x1F) << 8) | p[2];
      const start = (p[1] & 0x40) !== 0;
      let o = 4;
      if (p[3] & 0x20) o += 1 + p[4];
      if (!start) continue;
      const ptr = p[o]; o += 1 + ptr;
      if (pid === 0 && pmtPid < 0 && p[o] === 0) pmtPid = ((p[o + 10] & 0x1F) << 8) | p[o + 11];
      else if (pid === pmtPid && p[o] === 2) {
        const secLen = ((p[o + 1] & 0x0F) << 8) | p[o + 2];
        const progInfo = ((p[o + 10] & 0x0F) << 8) | p[o + 11];
        let q = o + 12 + progInfo; const end = Math.min(188, o + 3 + secLen - 4);
        while (q + 5 <= end) {
          const st = p[q], esInfo = ((p[q + 3] & 0x0F) << 8) | p[q + 4];
          const V = { 0x01: 'mpeg1', 0x02: 'mpeg2', 0x10: 'mpeg4', 0x1B: 'h264', 0x24: 'h265' }, A = { 0x03: 'mp3', 0x04: 'mp3', 0x0F: 'aac', 0x11: 'aac', 0x81: 'ac3', 0x87: 'eac3', 0x82: 'dts', 0x8A: 'dts' };
          if (V[st]) out.video.push(cod(V[st])); else if (A[st]) out.audio.push(cod(A[st])); else if (st === 0x06) out.audio.push({ key: 'other', name: '私有資料串流（可能是 AC-3 / DTS / 字幕）', detail: '' });
          q += 5 + esInfo;
        }
        return;
      }
    }
  }

  // 主函式：read(start, end) -> Promise<Uint8Array>，size 是檔案大小，ext 是副檔名（小寫）
  async function sniffMedia(read, size, ext) {
    const out = { container: '', video: [], audio: [], subs: [], duration: null, tags: null, brand: '', notes: [], ext };
    if (!size) { out.notes.push('檔案是空的'); return out; }
    let head = await read(0, Math.min(size, 65536));
    try {
      const t4 = mstr(head, 4, 4);
      if (head.length >= 12 && (t4 === 'ftyp' || ['moov', 'mdat', 'free', 'wide', 'skip', 'pnot'].includes(t4))) await sniffMp4(read, size, head, out);
      else if (head[0] === 0x1A && head[1] === 0x45 && head[2] === 0xDF && head[3] === 0xA3) {
        if (size > head.length && head.length < 262144) head = await read(0, Math.min(size, 262144));
        sniffMkv(head, out);
      }
      else if (mstr(head, 0, 4) === 'RIFF') sniffRiff(head, out);
      else if (mstr(head, 0, 4) === 'OggS') sniffOgg(head, out);
      else if (mstr(head, 0, 4) === 'fLaC') { out.container = 'flac'; out.audio.push(cod('flac')); }
      else if (mstr(head, 0, 3) === 'FLV') sniffFlv(head, out);
      else if (head[0] === 0x30 && head[1] === 0x26 && head[2] === 0xB2 && head[3] === 0x75) { out.container = 'asf'; out.notes.push('Windows Media（ASF）容器'); }
      else if (head[0] === 0x47 && head[188] === 0x47 && head[376] === 0x47) sniffTs(head, out);
      else if (head[0] === 0 && head[1] === 0 && head[2] === 1 && head[3] === 0xBA) { out.container = 'mpegps'; out.video.push(cod('mpeg2')); }
      else if (head[0] === 0x0B && head[1] === 0x77) { out.container = 'ac3'; out.audio.push(cod('ac3')); }
      else if (head[0] === 0x7F && head[1] === 0xFE && head[2] === 0x80 && head[3] === 0x01) { out.container = 'dts'; out.audio.push(cod('dts')); }
      else if (mstr(head, 0, 4) === 'FORM' && /AIF[FC]/.test(mstr(head, 8, 4))) { out.container = 'aiff'; out.audio.push(cod('pcm')); }
      else if (mstr(head, 0, 4) === 'MAC ') { out.container = 'ape'; out.audio.push({ key: 'other', name: 'Monkey\'s Audio（APE）', detail: '' }); }
      else if (mstr(head, 0, 4) === '.RMF') { out.container = 'rm'; }
      else if (mstr(head, 0, 5) === '#!AMR') { out.container = 'amr'; out.audio.push(cod('amr')); }
      else {
        let o = 0;
        if (mstr(head, 0, 3) === 'ID3') { o = parseId3(head, out); if (o > head.length) { const more = await read(o, Math.min(size, o + 16)); head = more; o = 0; } }
        if (!sniffMpegAudioAt(head, o, out)) {
          // 找不到同步碼：往後找一小段（有些檔案開頭有垃圾資料）
          let found = false;
          for (let i = o; i < Math.min(head.length - 4, o + 4096) && !found; i++) found = sniffMpegAudioAt(head, i, out);
        }
      }
      if (out.container === 'mp3') {
        const full = mstr(head, 0, 3) === 'ID3' ? head : null;
        if (!out.tags) { const tail = size > 128 ? await read(size - 128, size) : null; if (tail && mstr(tail, 0, 3) === 'TAG') { const rtrim = (o, n) => mstr(tail, o, n).replace(/[\0 ]+$/, ''); out.tags = { title: rtrim(3, 30), artist: rtrim(33, 30), album: rtrim(63, 30), year: rtrim(93, 4) }; } }
        void full;
      }
    } catch (err) { out.notes.push('標頭解析失敗：' + ((err && err.message) || err)); }
    out.kind = out.video.length ? 'video' : 'audio';
    return out;
  }

  /* ----- 瀏覽器能不能播、為什麼播不了 ----- */
  const CONTAINER_NAME = { mp4: 'MP4 / MOV / M4A 系列', webm: 'WebM', mkv: 'Matroska（MKV）', avi: 'AVI', wav: 'WAV', ogg: 'Ogg', flac: 'FLAC', mp3: 'MP3', aac: 'AAC（ADTS）', flv: 'Flash 影片（FLV）', asf: 'Windows Media（WMV / WMA）', ts: 'MPEG-TS', mpegps: 'MPEG 節目串流（MPG / VOB）', ac3: 'AC-3', dts: 'DTS', aiff: 'AIFF', ape: 'APE', rm: 'RealMedia', amr: 'AMR' };
  // 瀏覽器正式支援的容器（canPlayType 的結果可以信）；其他（MKV、AVI…）瀏覽器不一定誠實回報，所以不事先警告
  const FORMAL = new Set(['mp4', 'webm', 'ogg', 'mp3', 'wav', 'flac', 'aac']);
  function containerMime(s) {
    const v = s.video.length > 0;
    return { mp4: v ? 'video/mp4' : 'audio/mp4', webm: v ? 'video/webm' : 'audio/webm', ogg: v ? 'video/ogg' : 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', aac: 'audio/aac' }[s.container] || '';
  }
  function codecLabel(c) { return c.name + (c.detail ? '（' + c.detail + '）' : ''); }

  // 編碼本身（不管裝在哪種容器）瀏覽器支不支援：用最常見的容器當探針來問 canPlayType
  const BARE_MIME = new Set(['audio/mpeg', 'audio/flac', 'audio/aac', 'audio/wav']);   // 這些類型本身就等於編碼，問 canPlayType 時不能再加 codecs 參數
  const PROBE_MIME = { h264: 'video/mp4', h265: 'video/mp4', av1: 'video/mp4', vp9: 'video/webm', vp8: 'video/webm', theora: 'video/ogg', aac: 'audio/mp4', mp3: 'audio/mpeg', ac3: 'audio/mp4', eac3: 'audio/mp4', flac: 'audio/flac', opus: 'audio/webm', vorbis: 'audio/ogg', alac: 'audio/mp4' };

  // 回傳 { level: 'ok' | 'warn' | 'error', lines: [說明...], bad: { video: [...], audio: [...] } }
  function mediaVerdict(s, canPlay) {
    const lines = [], bad = { video: [], audio: [] }, sure = new Set();
    const mime = containerMime(s);
    const formal = FORMAL.has(s.container) && !!mime;
    let level = 'ok';
    if (formal && !canPlay(mime)) { level = 'error'; lines.push('你的瀏覽器不支援 ' + (CONTAINER_NAME[s.container] || s.container) + ' 這種容器格式。'); }
    const test = c => {
      const cs = CODEC_INFO[c.key] && CODEC_INFO[c.key][1];
      const m = formal ? mime : PROBE_MIME[c.key];
      if (!cs || !m) return 'unknown';
      return canPlay(m + (BARE_MIME.has(m) ? '' : '; codecs="' + cs + '"')) ? 'yes' : 'no';   // audio/flac 這類類型帶 codecs 參數時，Chrome 會誤答「不支援」（實測）
    };
    for (const [list, name] of [[s.video, 'video'], [s.audio, 'audio']]) {
      for (const c of list) {
        const r = test(c);
        if (r === 'no') { bad[name].push(c); sure.add(c); }
        else if (RARELY_SUPPORTED.has(c.key) && !(s.container === 'wav' && c.key === 'pcm')) bad[name].push(c);   // 沒辦法問瀏覽器的，只能說「通常不支援」
      }
    }
    const word = list => (list.every(c => sure.has(c)) ? '你的瀏覽器不支援' : '瀏覽器通常不支援');
    if (s.video.length && s.video.every(c => bad.video.includes(c))) {
      level = 'error';
      lines.push('影像編碼是 ' + s.video.map(codecLabel).join('、') + '，' + word(s.video) + '。');
      if (s.video.some(c => c.key === 'h265')) lines.push('H.265 / HEVC：Safari 通常可以播；Chrome、Edge 要看電腦的硬體解碼支援，Firefox 通常不行。');
    }
    if (s.audio.length && s.audio.every(c => bad.audio.includes(c))) {
      const what = s.audio.map(codecLabel).join('、');
      if (s.video.length && level !== 'error') { level = 'warn'; lines.push('聲音編碼是 ' + what + '，' + word(s.audio) + '，所以可能只有畫面、沒有聲音。'); }
      else if (!s.video.length) { level = 'error'; lines.push('聲音編碼是 ' + what + '，' + word(s.audio) + '。'); }
    }
    if (level !== 'ok') lines.push('建議：改用其他播放器，或轉成 H.264 + AAC 的 MP4（影片）／ MP3、AAC（音樂）。');
    return { level, lines, bad };
  }

  // 真的播放失敗時（video.error.code），合成給使用者看的說明
  function explainMediaError(code, s, verdict) {
    const out = [];
    const fmt = s && s.container ? (CONTAINER_NAME[s.container] || s.container) : '';
    const names = s ? s.video.concat(s.audio).map(codecLabel).join('、') : '';
    if (s && s.container) out.push('檔案格式：' + fmt + (names ? '；編碼：' + names : '') + '。');
    else out.push('無法辨識這個檔案的格式（開頭的資料不像任何已知的影音容器）。');
    if (code === 4 || code === undefined || code === null) {
      if (verdict && verdict.lines.length) out.push(...verdict.lines.filter(l => !l.startsWith('建議')));
      else if (s && s.container === 'mkv') out.push(fmt + ' 不是瀏覽器正式支援的容器；Chrome、Edge 有時能播其中的 H.264 / VP9，Firefox、Safari 通常不行。');
      else if (s && s.container && !FORMAL.has(s.container)) out.push(fmt + ' 不是瀏覽器支援的容器格式，通常無法直接播放。');
      else if (s && s.container) out.push('容器與編碼看起來都在支援範圍內，但瀏覽器還是拒絕了它：檔案可能損毀，或使用了特殊的編碼參數。');
      out.push('瀏覽器回報：不支援這個來源（MEDIA_ERR_SRC_NOT_SUPPORTED）。');
    } else if (code === 3) {
      out.push('解碼失敗：檔案可能已損毀（例如下載到一半），或使用了瀏覽器不支援的編碼參數（例如 10-bit、特殊色彩格式）。');
      if (verdict && verdict.lines.length) out.push(...verdict.lines.filter(l => !l.startsWith('建議')));
    } else if (code === 2) out.push('讀取檔案時失敗：檔案可能已被移動、刪除，或授權已失效。請重新選擇資料夾。');
    else if (code === 1) out.push('播放被中止。');
    if (s && s.notes && s.notes.length) out.push('檔案檢查：' + s.notes.join('；') + '。');
    out.push('建議：改用其他播放器，或轉成 H.264 + AAC 的 MP4（影片）／ MP3、AAC（音樂）。');
    return out;
  }

  const AUDIO_MIME = { mp3: 'audio/mpeg', m4a: 'audio/mp4', m4r: 'audio/mp4', m4b: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', wave: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac', weba: 'audio/webm', mka: 'audio/x-matroska', mp2: 'audio/mpeg', aif: 'audio/aiff', aiff: 'audio/aiff' };
  const VIDEO_MIME = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', ogv: 'video/ogg', mkv: 'video/x-matroska', '3gp': 'video/3gpp', '3g2': 'video/3gpp2' };
  // 給 <video> / <audio> 的 blob 類型。M4R（iPhone 鈴聲）其實就是 AAC 的 MP4 音訊，只是瀏覽器不認得這個副檔名
  function mediaBlobMime(ext, s) {
    if (s && s.container === 'mp4') return s.video.length ? 'video/mp4' : 'audio/mp4';
    if (s && s.container === 'webm') return s.video.length ? 'video/webm' : 'audio/webm';
    return AUDIO_MIME[ext] || VIDEO_MIME[ext] || '';
  }

  /* ----- 字幕 ----- */
  const SUB_EXT = ['srt', 'vtt', 'ass', 'ssa'];
  const LANG_ORDER = [/(^|[._-])(zh[-_]?tw|zh[-_]?hant|zht|cht|tc|big5|繁體?|繁中|正體|台灣)([._-]|$)/i, /(^|[._-])(zh[-_]?cn|zh[-_]?hans|zhs|chs|sc|gb|gbk|简体?|簡體?|zh|chi|chinese)([._-]|$)/i, /(^|[._-])(en|eng|english)([._-]|$)/i];
  const LANG_NAME = [[/zh[-_]?tw|zh[-_]?hant|zht|cht|tc|big5|繁|正體|台灣/i, '繁體中文'], [/zh[-_]?cn|zh[-_]?hans|zhs|chs|sc|gb|简|簡|^zh$|chi|chinese/i, '簡體中文'], [/^(en|eng|english)$/i, 'English'], [/^(ja|jp|jpn|japanese)$/i, '日本語'], [/^(ko|kor|korean)$/i, '한국어']];
  // files: 所有檔案路徑；mediaPath: 影音檔路徑。回傳依偏好排序的字幕候選 [{ path, tag, label, ext }]
  function subtitleCandidates(files, mediaPath) {
    const dir = mediaPath.includes('/') ? mediaPath.slice(0, mediaPath.lastIndexOf('/') + 1) : '';
    const file = mediaPath.slice(dir.length);
    const dot = file.lastIndexOf('.');
    const stem = dot > 0 ? file.slice(0, dot) : file;
    const stems = [stem.toLowerCase(), file.toLowerCase()];          // movie.mp4 也可能有 movie.mp4.srt
    const out = [];
    for (const p of files) {
      if (!p.startsWith(dir) || p.slice(dir.length).includes('/')) continue;
      const name = p.slice(dir.length);
      const d = name.lastIndexOf('.');
      if (d <= 0) continue;
      const ext = name.slice(d + 1).toLowerCase();
      if (!SUB_EXT.includes(ext)) continue;
      const base = name.slice(0, d), low = base.toLowerCase();
      const hit = stems.find(s => low === s || low.startsWith(s + '.') || low.startsWith(s + '_') || low.startsWith(s + '-') || low.startsWith(s + ' '));
      if (!hit) continue;
      const tag = base.slice(hit.length).replace(/^[._\- ]+/, '');
      const nm = LANG_NAME.find(([re]) => re.test(tag));
      out.push({ path: p, tag, ext, label: (nm ? nm[1] : (tag || '字幕')) + (tag && nm ? '（' + tag + '）' : '') + ' · .' + ext });
    }
    const rank = c => { const i = LANG_ORDER.findIndex(re => re.test('.' + c.tag + '.')); return c.tag === '' ? 1.5 : i === -1 ? 9 : i; };
    return out.sort((a, b) => rank(a) - rank(b) || SUB_EXT.indexOf(a.ext) - SUB_EXT.indexOf(b.ext) || a.path.localeCompare(b.path));
  }

  const SUB_COMMON = '的一是不了人我在有他這中大來上國個到說們為子和你地出道也時年得就那要下以生會自著去之過家學對可她裡後小麼心多天而能好都然沒日於起還發成事只作當想看文無開手十用主行方又如前所本見經頭面公同三已老從動兩長知民樣現分將外但身些與高意進把法此實回二理美點月明其種聲全工己話兒者向情部正名定女問力機給等幾很業最間新什打便位因重被走電四第門相次東政海口使教西再平真聽世氣信北少關並內加化由卻代銷您吧嗎呢啊哦麼嗯喔哈啦呀咱啥俺咋這个们为来时会对开发关门问间说话见电车东书马鸟鱼风飞国学张长难过还没让认应该觉气爱听请谢经现从让妈爸亲儿师师岁点钱谁怎样么该给总场种样头乐边數據戶獲務軟設備網絡錯誤連接檢查試測稱碼頁項錄檔庫詢訂單發票軌號創建登歡運狀態資訊警告磁碟空間剩餘容量低於百分之十使用者成功本系統請至重新配號已用完無法伺服器數据户获务软设备网络错误连接检查试测称码页项录档库询订单发票轨号创建登欢运状态资讯警告磁盘空间剩余容量低于百分之十使用者成功本系统请至重新配号已用完无法服务器';
  const SUB_ENCODINGS = [['utf-8', 'UTF-8'], ['big5', '繁體中文 Big5'], ['gb18030', '簡體中文 GBK / GB18030'], ['shift_jis', '日文 Shift-JIS'], ['euc-kr', '韓文 EUC-KR'], ['windows-1252', '西歐 Windows-1252'], ['utf-16le', 'UTF-16 LE'], ['utf-16be', 'UTF-16 BE']];
  // 判斷字幕檔的文字編碼。hint 是檔名裡的語言標記（例如 zh-TW）。回傳 { text, encoding, guessed }
  function decodeSubtitle(bytes, hint, forced) {
    const dec = (enc, fatal) => new TextDecoder(enc, { fatal: !!fatal }).decode(bytes);
    if (forced) return { text: dec(forced, false).replace(/^\uFEFF/, ''), encoding: forced, guessed: false };
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return { text: dec('utf-8', false).replace(/^\uFEFF/, ''), encoding: 'utf-8', guessed: false };
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) return { text: dec('utf-16le', false).replace(/^\uFEFF/, ''), encoding: 'utf-16le', guessed: false };
    if (bytes[0] === 0xFE && bytes[1] === 0xFF) return { text: dec('utf-16be', false).replace(/^\uFEFF/, ''), encoding: 'utf-16be', guessed: false };
    try { return { text: dec('utf-8', true), encoding: 'utf-8', guessed: false }; } catch (_) {}
    const h = (hint || '').toLowerCase();
    const order = /tw|hant|zht|cht|big5|繁|tc/.test(h) ? ['big5', 'gb18030', 'shift_jis', 'euc-kr'] : /ja|jp/.test(h) ? ['shift_jis', 'big5', 'gb18030', 'euc-kr'] : /ko|kr/.test(h) ? ['euc-kr', 'big5', 'gb18030', 'shift_jis'] : ['gb18030', 'big5', 'shift_jis', 'euc-kr'];
    const common = new Set(SUB_COMMON);
    let best = null;
    order.forEach((enc, i) => {
      let t; try { t = dec(enc, true); } catch (_) { return; }
      let cjk = 0, hit = 0, bad = 0;
      for (const ch of t) { const c = ch.codePointAt(0); if (c >= 0x4E00 && c <= 0x9FFF) { cjk++; if (common.has(ch)) hit++; } else if ((c >= 0x3040 && c <= 0x30FF) || (c >= 0xAC00 && c <= 0xD7AF)) { cjk++; hit += 0.5; } else if (c === 0xFFFD || (c >= 0xE000 && c <= 0xF8FF)) bad++; }
      const score = (cjk ? hit / cjk : 0.3) - bad * 0.05 - i * 0.001;   // 同分時偏好 hint 指的那個
      if (!best || score > best.score) best = { text: t, encoding: enc, score };
    });
    if (best) return { text: best.text, encoding: best.encoding, guessed: true };
    return { text: dec('utf-8', false), encoding: 'utf-8', guessed: true };
  }

  function subTime(s) {
    const m = /^\s*(?:(\d+):)?(\d{1,2}):(\d{1,2})[.,:](\d{1,3})\s*$/.exec(s);
    if (!m) return NaN;
    return (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4].padEnd(3, '0')) / 1000;
  }
  function parseSrtVtt(text) {
    const cues = [];
    const blocks = text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '').split(/\n{2,}/);
    for (const blk of blocks) {
      const lines = blk.split('\n');
      let i = lines.findIndex(l => l.includes('-->'));
      if (i < 0 || /^(NOTE|STYLE|REGION)\b/.test(lines[0])) continue;
      const [a, rest] = lines[i].split('-->');
      const start = subTime(a), end = subTime((rest || '').trim().split(/\s+/)[0]);
      if (isNaN(start) || isNaN(end)) continue;
      const body = lines.slice(i + 1).join('\n').trim();
      if (body) cues.push({ start, end, text: body });
    }
    return cues.sort((x, y) => x.start - y.start);
  }
  function parseAss(text) {
    const cues = [];
    let fmt = null, inEvents = false;
    for (const raw of text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '').split('\n')) {
      const line = raw.trim();
      if (/^\[events\]/i.test(line)) { inEvents = true; continue; }
      if (/^\[/.test(line)) { inEvents = false; continue; }
      if (!inEvents) continue;
      if (/^format:/i.test(line)) { fmt = line.slice(7).split(',').map(s => s.trim().toLowerCase()); continue; }
      if (!/^dialogue:/i.test(line)) continue;
      const cols = fmt || ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text'];
      const parts = line.slice(9).split(',');
      const textIdx = cols.indexOf('text');
      const fields = parts.slice(0, textIdx);
      const body = parts.slice(textIdx).join(',');
      const start = subTime(fields[cols.indexOf('start')]), end = subTime(fields[cols.indexOf('end')]);
      if (isNaN(start) || isNaN(end)) continue;
      const t = body.replace(/\{[^}]*\}/g, '').replace(/\\N/g, '\n').replace(/\\n/g, ' ').replace(/\\h/g, '\u00A0').trim();
      if (t) cues.push({ start, end, text: t });
    }
    return cues.sort((x, y) => x.start - y.start);
  }
  function parseSubtitle(text, ext) { return (ext === 'ass' || ext === 'ssa') ? parseAss(text) : parseSrtVtt(text); }

  // 時間 t（秒）目前該顯示哪些字幕（可能同時有好幾條）
  function cuesAt(cues, t) {
    let lo = 0, hi = cues.length - 1, idx = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (cues[mid].start <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1; }
    const out = [];
    for (let i = idx; i >= 0 && i > idx - 30; i--) if (cues[i].end > t) out.unshift(cues[i]);
    return out;
  }
  // 把字幕文字拆成片段：<i> <b> <u> 變成樣式，其他標籤去掉。回傳 [{ text, i, b, u }]（換行用 '\n'）
  function subtitleRuns(text) {
    const runs = [];
    let st = { i: 0, b: 0, u: 0 };
    for (const part of text.split(/(<\/?[a-zA-Z][^>]*>)/)) {
      const m = /^<(\/?)([a-zA-Z]+)[^>]*>$/.exec(part);
      if (m) { const k = m[2].toLowerCase(); if (k === 'i' || k === 'b' || k === 'u') st = { ...st, [k]: m[1] ? 0 : 1 }; continue; }
      if (part) runs.push({ text: part, i: st.i, b: st.b, u: st.u });
    }
    return runs;
  }


  function playerPreview(media, file, kind, context = {}) {
    const root = document.createElement('div');
    root.className = 'viewer-player pv';
    const stage = document.createElement('div');
    stage.className = 'viewer-player-stage pv-stage';
    const bar = document.createElement('div');
    bar.className = 'viewer-player-controls pv-bar';
    const first = document.createElement('div');
    first.className = 'viewer-player-row pv-row';
    const second = document.createElement('div');
    second.className = 'viewer-player-row pv-row';
    const info = document.createElement('div');
    info.className = 'viewer-player-info pv-info';
    const subtitleOverlay = document.createElement('div');
    subtitleOverlay.className = 'pv-sub';
    const subtitleState = { candidates: [], current: null, cues: [], delay: 0, encoding: '', forced: '', enabled: true, error: '' };
    let sniff = null, verdict = null, subtitleRequest = 0;
    const mediaPath = context.path || file.name;
    const availableFiles = context.files || [];
    const formatDuration = seconds => Number.isFinite(seconds) ? Math.floor(seconds / 3600) > 0 ? Math.floor(seconds / 3600) + ':' + String(Math.floor(seconds % 3600 / 60)).padStart(2,'0') + ':' + String(Math.floor(seconds % 60)).padStart(2,'0') : Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2,'0') : '';
    const showSubtitle = () => {
      subtitleOverlay.replaceChildren();
      if (!subtitleState.enabled || !subtitleState.cues.length) return;
      const lines = cuesAt(subtitleState.cues, media.currentTime - subtitleState.delay);
      for (const cue of lines) {
        const line = document.createElement('div'); line.className = 'pv-line';
        const span = document.createElement('span'); span.className = 'pv-sp';
        for (const run of subtitleRuns(cue.text)) {
          const el = document.createElement('span'); el.textContent = run.text;
          el.style.whiteSpace = 'pre-wrap';
          if (run.i) el.style.fontStyle = 'italic';
          if (run.b) el.style.fontWeight = 'bold';
          if (run.u) el.style.textDecoration = 'underline';
          span.append(el);
        }
        line.append(span); subtitleOverlay.append(line);
      }
    };
    const readSubtitle = async (candidate, forced = '') => {
      const request = ++subtitleRequest;
      try {
        const source = candidate.file || await context.getFile?.(candidate.path);
        if (!source) throw new Error('找不到字幕檔');
        const data = decodeSubtitle(new Uint8Array(await source.arrayBuffer()), candidate.tag || '', forced);
        const cues = parseSubtitle(data.text, candidate.ext);
        if (request !== subtitleRequest) return;
        subtitleState.current = candidate; subtitleState.cues = cues;
        subtitleState.encoding = data.encoding; subtitleState.forced = forced;
        subtitleState.error = cues.length ? '' : '字幕檔沒有可辨識的字幕內容。';
        subtitleState.enabled = true;
      } catch (error) {
        if (request !== subtitleRequest) return;
        subtitleState.error = '字幕檔讀取失敗：' + error.message;
        subtitleState.cues = [];
      }
      buildSubtitlePanel(); showSubtitle();
    };
    const subtitleStatus = document.createElement('div');
    const subtitleFileSelect = document.createElement('select');
    const subtitleUpload = document.createElement('input');
    subtitleUpload.type = 'file'; subtitleUpload.accept = '.srt,.vtt,.ass,.ssa'; subtitleUpload.hidden = true;
    const subtitleEncoding = document.createElement('select');
    for (const [value, label] of SUB_ENCODINGS) subtitleEncoding.add(new Option(label, value));
    const subtitleDelay = document.createElement('span');
    const buildSubtitlePanel = () => {
      subtitleFileSelect.replaceChildren(new Option('不顯示字幕', ''));
      subtitleState.candidates.forEach((candidate, index) => subtitleFileSelect.add(new Option(candidate.label, String(index))));
      subtitleFileSelect.add(new Option('載入其他字幕檔…', '__file'));
      subtitleFileSelect.value = subtitleState.current ? String(subtitleState.candidates.indexOf(subtitleState.current)) : '';
      if (subtitleFileSelect.value === '-1') subtitleFileSelect.value = '';
      subtitleEncoding.value = subtitleState.encoding || 'utf-8';
      subtitleDelay.textContent = (subtitleState.delay >= 0 ? '+' : '') + subtitleState.delay.toFixed(1) + ' 秒';
      subtitleStatus.textContent = subtitleState.error || (subtitleState.current ? '目前：' + subtitleState.encoding + ' · ' + subtitleState.cues.length + ' 句' : '');
    };
    subtitleFileSelect.addEventListener('change', () => {
      if (subtitleFileSelect.value === '__file') { subtitleUpload.click(); return; }
      if (subtitleFileSelect.value === '') { subtitleState.enabled = false; subtitleState.current = null; subtitleState.cues = []; showSubtitle(); return; }
      readSubtitle(subtitleState.candidates[Number(subtitleFileSelect.value)]);
    });
    subtitleUpload.addEventListener('change', () => {
      const source = subtitleUpload.files?.[0]; if (!source) return;
      const ext = source.name.split('.').pop().toLowerCase();
      const candidate = { file: source, path: source.name, ext, tag: '', label: source.name };
      subtitleState.candidates.push(candidate); readSubtitle(candidate); subtitleUpload.value = '';
    });
    subtitleEncoding.addEventListener('change', () => { if (subtitleState.current) readSubtitle(subtitleState.current, subtitleEncoding.value); });
    const subtitleDelayButton = (label, delta) => {
      const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = label;
      b.addEventListener('click', () => { subtitleState.delay = label === '歸零' ? 0 : Math.round((subtitleState.delay + delta) * 10) / 10; subtitleDelay.textContent = (subtitleState.delay >= 0 ? '+' : '') + subtitleState.delay.toFixed(1) + ' 秒'; showSubtitle(); });
      return b;
    };

    const subtitlePanel = document.createElement('div');
    subtitlePanel.className = 'viewer-player-subtitles pv-panel';
    subtitlePanel.hidden = true;
    const button = (label, title, fn) => {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'btn'; el.textContent = label; el.title = title;
      el.addEventListener('click', fn); return el;
    };
    const time = document.createElement('span');
    time.className = 'viewer-player-time pv-time';
    const seek = document.createElement('input');
    seek.type = 'range'; seek.min = '0'; seek.max = '1000'; seek.value = '0'; seek.title = '播放位置';
    seek.className = 'viewer-player-seek pv-seek';
    const vol = document.createElement('input');
    vol.type = 'range'; vol.min = '0'; vol.max = '100'; vol.value = String(Math.round(media.volume * 100));
    vol.title = '音量'; vol.className = 'viewer-player-volume pv-vol';
    const fmt = t => Number.isFinite(t) ? Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') : '0:00';
    const jump = seconds => {
      const duration = Number.isFinite(media.duration) ? media.duration : Infinity;
      media.currentTime = Math.max(0, Math.min(duration, media.currentTime + seconds));
    };
    const rewind = button('⏮', '倒帶 10 秒', () => jump(-10));
    const play = button('▶', '播放／暫停', () => media.paused ? media.play().catch(() => {}) : media.pause());
    const forward = button('⏭', '快轉 10 秒', () => jump(10));
    const mute = button('音量', '靜音', () => { media.muted = !media.muted; });
    const rate = document.createElement('select');
    rate.className = 'viewer-player-rate pv-rate'; rate.title = '播放速度';
    for (const r of [0.25,0.5,0.75,1,1.25,1.5,1.75,2,3,4]) rate.add(new Option(r + '×', String(r)));
    rate.value = String(media.playbackRate);
    rate.addEventListener('change', () => { media.playbackRate = Number(rate.value); });
    const pitchLabel = document.createElement('label');
    const pitch = document.createElement('input'); pitch.type = 'checkbox'; pitch.checked = true;
    pitchLabel.className = 'pv-pitch';
    pitchLabel.append(pitch, ' 變速不變調');
    pitch.addEventListener('change', () => { if ('preservesPitch' in media) media.preservesPitch = pitch.checked; });
    const loop = button('循環', '循環播放', () => { media.loop = !media.loop; paint(); });
    const ab = {a:null,b:null};
    const abButton = button('A–B', '設定 A、B 區間，再按一次清除', () => {
      if (ab.a === null) ab.a = media.currentTime;
      else if (ab.b === null) { if (media.currentTime > ab.a + .5) { ab.b = media.currentTime; media.currentTime = ab.a; } }
      else { ab.a = null; ab.b = null; }
      paint();
    });
    const vt = {h:false,v:false,r:0};
    const transform = () => {
      media.style.transform = `scale(${vt.h ? -1 : 1},${vt.v ? -1 : 1}) rotate(${vt.r}deg)`;
    };
    const h = button('水平翻轉', '水平鏡像', () => { vt.h = !vt.h; transform(); });
    const v = button('垂直翻轉', '垂直鏡像', () => { vt.v = !vt.v; transform(); });
    const rotate = button('旋轉 90°', '順時針旋轉', () => { vt.r = (vt.r + 90) % 360; transform(); });
    const reset = button('還原畫面', '重設旋轉與翻轉', () => { vt.h = vt.v = false; vt.r = 0; transform(); });
    const subButton = button('字幕', '字幕設定', () => { subtitlePanel.hidden = !subtitlePanel.hidden; });
    const subtitleSelect = document.createElement('select');
    subtitleSelect.setAttribute('aria-label', '字幕軌');
    subtitleSelect.add(new Option('不顯示字幕', '-1'));
    const updateTracks = () => {
      while (subtitleSelect.options.length > 1) subtitleSelect.remove(1);
      Array.from(media.textTracks || []).forEach((track, index) => subtitleSelect.add(new Option(track.label || track.language || `字幕 ${index + 1}`, String(index))));
    };
    subtitleSelect.addEventListener('change', () => {
      Array.from(media.textTracks || []).forEach((track, index) => { track.mode = index === Number(subtitleSelect.value) ? 'showing' : 'disabled'; });
    });
    const subtitleRow = document.createElement('div'); subtitleRow.className = 'pv-prow';
    subtitleRow.append('字幕：', subtitleFileSelect, subtitleUpload, '編碼：', subtitleEncoding, subtitleStatus);
    const subtitleTimeRow = document.createElement('div'); subtitleTimeRow.className = 'pv-prow';
    subtitleTimeRow.append('時間：', subtitleDelayButton('−0.5', -.5), subtitleDelayButton('−0.1', -.1), subtitleDelay, subtitleDelayButton('+0.1', .1), subtitleDelayButton('+0.5', .5), subtitleDelayButton('歸零', 0));
    subtitlePanel.append(subtitleRow, subtitleTimeRow);
    // Native text tracks remain available if the browser exposes them.
    const nativeRow = document.createElement('div'); nativeRow.className = 'pv-prow';
    nativeRow.append('內建字幕軌：', subtitleSelect); subtitlePanel.append(nativeRow);
    const sniffPromise = (async () => {
      try {
        sniff = await sniffMedia((a,b) => file.slice(a,b).arrayBuffer().then(x => new Uint8Array(x)), file.size, file.name.split('.').pop().toLowerCase());
        verdict = mediaVerdict(sniff, value => !!media.canPlayType(value));
        subtitleState.candidates = kind === 'video' ? subtitleCandidates(availableFiles, mediaPath) : [];
        buildSubtitlePanel();
        if (subtitleState.candidates.length) await readSubtitle(subtitleState.candidates[0]);
        paint();
      } catch (error) { console.warn('影音標頭解析失敗', error); }
    })();

    const screenshot = button('截圖', '儲存目前畫面為 PNG', () => {
      if (!media.videoWidth || !media.videoHeight) return;
      const canvas = document.createElement('canvas'); canvas.width = media.videoWidth; canvas.height = media.videoHeight;
      canvas.getContext('2d').drawImage(media, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = file.name.replace(/\.[^.]+$/, '') + '_' + fmt(media.currentTime).replace(':','-') + '.png';
        a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');
    });
    const pip = button('子母畫面', '瀏覽器子母畫面', async () => {
      try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await media.requestPictureInPicture(); } catch (error) { console.warn(error); }
    });
    const full = button('全螢幕', '切換全螢幕', async () => {
      try { if (document.fullscreenElement) await document.exitFullscreen(); else await root.requestFullscreen(); } catch (error) { console.warn(error); }
    });
    // 全螢幕滑鼠閒置時隱藏控制列；焦點停留在按鈕上不應阻止隱藏。
    let fullscreenIdleTimer;
    let pointerIsDown = false;
    const clearFullscreenIdle = () => clearTimeout(fullscreenIdleTimer);
    const scheduleFullscreenIdle = () => {
      clearFullscreenIdle();
      if (document.fullscreenElement !== root || media.paused) return;
      fullscreenIdleTimer = setTimeout(() => {
        if (document.fullscreenElement === root && !media.paused && !pointerIsDown) {
          root.classList.add('idle');
        }
      }, 2500);
    };
    const showFullscreenControls = () => {
      root.classList.remove('idle');
      scheduleFullscreenIdle();
    };
    // 只在全螢幕影片畫面上點擊時切換控制列；操作按鈕、進度條不受影響。
    stage.addEventListener('click', event => {
      if (document.fullscreenElement !== root || event.target.closest('button, input, select, a')) return;
      if (root.classList.contains('idle')) {
        showFullscreenControls();
      } else {
        clearFullscreenIdle();
        root.classList.add('idle');
      }
    });
    root.addEventListener('pointermove', showFullscreenControls);
    root.addEventListener('pointerdown', () => { pointerIsDown = true; });
    window.addEventListener('pointerup', () => { pointerIsDown = false; scheduleFullscreenIdle(); });
    root.addEventListener('keydown', showFullscreenControls);
    root.addEventListener('focusin', showFullscreenControls);
    media.addEventListener('play', scheduleFullscreenIdle);
    media.addEventListener('pause', () => { clearFullscreenIdle(); root.classList.remove('idle'); });
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement === root) showFullscreenControls();
      else { clearFullscreenIdle(); root.classList.remove('idle'); pointerIsDown = false; }
    });
    const paint = () => {
      play.textContent = media.paused ? '▶' : '❚❚';
      time.textContent = fmt(media.currentTime) + ' / ' + fmt(media.duration);
      if (Number.isFinite(media.duration) && media.duration > 0) seek.value = String(Math.round(media.currentTime / media.duration * 1000));
      mute.textContent = media.muted || !media.volume ? '靜音' : '音量';
      vol.value = String(Math.round(media.volume * 100));
      rate.value = String(media.playbackRate);
      loop.classList.toggle('viewer-player-on', media.loop);
      abButton.classList.toggle('viewer-player-on', ab.a !== null);
      abButton.title = ab.a === null ? '設定 A 點' : ab.b === null ? '設定 B 點' : '清除 A–B 區間';
      const dimensions = kind === 'video' && media.videoWidth ? ` · ${media.videoWidth} × ${media.videoHeight}` : '';
      if (!sniff) {
        info.textContent = `${file.name} · ${(file.size / 1048576).toFixed(2)} MB${dimensions} · ${fmt(media.duration)}`;
      } else {
        const parts = [];
        if (sniff.container) parts.push(CONTAINER_NAME[sniff.container] || sniff.container);
        if (sniff.video.length) parts.push('影像：' + sniff.video.map(codecLabel).join('、'));
        if (sniff.audio.length) parts.push('聲音：' + sniff.audio.map(codecLabel).join('、'));
        if (sniff.subs.length) parts.push('內嵌字幕：' + sniff.subs.map(x => x.name).join('、') + '（瀏覽器無法直接提取）');
        if (Number.isFinite(media.duration) && media.duration > 0) parts.push('長度 ' + fmt(media.duration));
        else if (sniff.duration) parts.push('長度 ' + formatDuration(sniff.duration));
        parts.push((file.size / 1048576).toFixed(1) + ' MB');
        info.replaceChildren();
        const meta = document.createElement('div'); meta.className = 'pv-meta'; meta.textContent = parts.join(' · '); info.append(meta);
        const addMessage = (text, klass) => { const el = document.createElement('div'); el.className = klass; el.textContent = text; info.append(el); };
        if (sniff.notes.length) sniff.notes.forEach(note => addMessage('檔案檢查：' + note, 'pv-warn warn'));
        if (verdict && verdict.level !== 'ok') verdict.lines.forEach(line => addMessage(line, 'pv-warn ' + verdict.level));
        if (kind === 'video' && !subtitleState.candidates.length && !sniff.subs.length) addMessage('沒有找到同檔名的字幕檔（例如 ' + file.name.replace(/\.[^.]+$/, '') + '.srt）。可以在「字幕」裡手動載入。', 'pv-hint');
      }
    };
    seek.addEventListener('input', () => { if (Number.isFinite(media.duration)) media.currentTime = Number(seek.value) / 1000 * media.duration; });
    vol.addEventListener('input', () => { media.volume = Number(vol.value) / 100; media.muted = false; });
    const events = ['play','pause','ended','timeupdate','loadedmetadata','durationchange','volumechange','ratechange'];
    events.forEach(event => media.addEventListener(event, paint));
    media.addEventListener('timeupdate', () => { if (ab.b !== null && media.currentTime >= ab.b) media.currentTime = ab.a; });
    media.addEventListener('loadedmetadata', updateTracks);
    media.addEventListener('timeupdate', showSubtitle);
    media.addEventListener('seeked', showSubtitle);
    first.append(rewind, play, forward, time, seek, mute, vol);
    second.append(rate, pitchLabel, loop, abButton);
    if (kind === 'video') second.append(h, v, rotate, reset, subButton, pip, screenshot, full);
    bar.append(first, second);
    media.classList.add('pv-media');
    stage.append(media, subtitleOverlay);
    const ctl = document.createElement('div');
    ctl.className = 'pv-ctl';
    ctl.append(bar, info, subtitlePanel);
    root.append(stage, ctl);
    paint();
    return root;
  }

  async function create(file, type, reportError, resolveLocal, onImageDimensions, mediaContext = {}) {
    if (type === 'text/html') {
      const limit = 10 * 1024 * 1024;
      if (file.size > limit) throw new Error('HTML 預覽上限為 10 MB。');
      const result = await viewerText.read(file, limit);
      if (!result) throw new Error('無法辨識 HTML 文字。');
      const frame = document.createElement('iframe');
      frame.className = 'viewer-media-frame';
      frame.title = file.name;
      frame.setAttribute('sandbox', '');
      frame.referrerPolicy = 'no-referrer';
      const container = document.createElement('div');
      container.className = 'viewer-html';
      const toolbar = document.createElement('div');
      toolbar.className = 'viewer-image-controls';
      const scriptButton = document.createElement('button');
      const reload = document.createElement('button');
      for (const button of [scriptButton, reload]) {
        button.type = 'button';
        button.className = 'btn';
      }
      const resources = document.createElement('select');
      resources.setAttribute('aria-label', '外部資源');
      for (const [value, label] of [
        ['blocked', '外部資源：全部擋掉'], ['cdn', '外部資源：只允許常見 CDN'],
        ['all', '外部資源：全部允許（有風險）'],
      ]) resources.add(new Option(label, value));
      const status = document.createElement('div');
      status.className = 'viewer-html-status';
      status.setAttribute('role', 'status');
      let scripts = false;
      let external = 'blocked';
      let version = 0;
      async function update() {
        const request = ++version;
        const options = { scripts, external };
        status.textContent = '正在準備預覽…';
        try {
          const source = await viewerText.isolatedHtml(result.text, resolveLocal, typeOf, options);
          if (request !== version) return;
          frame.setAttribute('sandbox', scripts ? 'allow-scripts' : '');
          frame.srcdoc = source;
          status.textContent = scripts ? '此預覽已允許執行腳本。' :
            '此預覽尚未執行腳本。按「執行腳本」即可啟用。';
        } catch {
          if (request === version) status.textContent = '無法載入 HTML 預覽。';
        }
      }
      function updateScriptLabel() {
        scriptButton.textContent = scripts ? '停止腳本' : '▶ 執行腳本';
        scriptButton.setAttribute('aria-pressed', String(scripts));
      }
      updateScriptLabel();
      scriptButton.addEventListener('click', () => {
        scripts = !scripts;
        updateScriptLabel();
        update();
      });
      resources.addEventListener('change', () => {
        if (resources.value === 'all' && !window.confirm('允許此預覽載入所有網站的外部資源？')) {
          resources.value = external;
          return;
        }
        external = resources.value;
        update();
      });
      reload.textContent = '重新載入';
      reload.addEventListener('click', update);
      toolbar.append(scriptButton, resources, reload);
      container.append(toolbar, status, frame);
      await update();
      return { node: container, dispose() { version++; frame.removeAttribute('srcdoc'); } };
    }

    if (type === 'application/pdf') {
      const header = await file.slice(0, 1024).text();
      if (!header.includes('%PDF-')) throw new Error('檔案缺少 PDF 標頭。');
    }

    const kind = type.split('/')[0];
    const element = document.createElement(kind === 'image' ? 'img' : kind === 'application' ? 'iframe' : kind);
    const url = URL.createObjectURL(file.slice(0, file.size, type));
    let node = element;
    let disposeImage;
    if (kind === 'image') {
      element.alt = file.name;
      element.draggable = false;
      element.addEventListener('error', () => reportError('瀏覽器無法顯示此圖片。'));
      const view = imagePreview(element, onImageDimensions);
      node = view.node;
      disposeImage = view.dispose;
    } else if (kind === 'application') {
      element.className = 'viewer-media-frame';
      element.title = file.name;
    } else {
      element.controls = false;
      element.preload = 'metadata';
      node = playerPreview(element, file, kind, mediaContext);
      element.setAttribute('aria-label', file.name);
      element.addEventListener('error', () => reportError('瀏覽器無法播放此檔案，可能不支援它的格式或編碼。'));
    }
    element.src = url;
    return {
      node,
      isPlaying: () => (kind === 'audio' || kind === 'video') && !element.paused && !element.ended,
      resume: () => element.play?.().catch(() => {}),
      pause: () => element.pause?.(),
      dispose() {
        disposeImage?.();
        element.pause?.();
        element.removeAttribute('src');
        element.load?.();
        URL.revokeObjectURL(url);
      },
    };
  }

  return { typeOf, create };
})();
