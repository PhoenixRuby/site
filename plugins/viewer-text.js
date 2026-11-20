const viewerText = (() => {
  const SUB_COMMON = '的一是不了人我在有他這中大來上國個到說們為子和你地出道也時年得就那要下以生會自著去之過家學對可她裡後小麼心多天而能好都然沒日於起還發成事只作當想看文無開手十用主行方又如前所本見經頭面公同三已老從動兩長知民樣現分將外但身些與高意進把法此實回二理美點月明其種聲全工己話兒者向情部正名定女問力機給等幾很業最間新什打便位因重被走電四第門相次東政海口使教西再平真聽世氣信北少關並內加化由卻代銷您吧嗎呢啊哦麼嗯喔哈啦呀咱啥俺咋這个们为来时会对开发关门问间说话见电车东书马鸟鱼风飞国学张长难过还没让认应该觉气爱听请谢经现从让妈爸亲儿师师岁点钱谁怎样么该给总场种样头乐边數據戶獲務軟設備網絡錯誤連接檢查試測稱碼頁項錄檔庫詢訂單發票軌號創建登歡運狀態資訊警告磁碟空間剩餘容量低於百分之十使用者成功本系統請至重新配號已用完無法伺服器數据户获务软设备网络错误连接检查试测称码页项录档库询订单发票轨号创建登欢运状态资讯警告磁盘空间剩余容量低于百分之十使用者成功本系统请至重新配号已用完无法服务器';
  const TEXT_ENCODINGS = [['utf-8', 'UTF-8'], ['big5', 'Big5（繁體中文）'], ['gb18030', 'GBK / GB18030（簡體中文）'], ['shift_jis', 'Shift-JIS（日文）'], ['euc-kr', 'EUC-KR（韓文）'], ['windows-1252', 'Windows-1252（西歐）'], ['utf-16le', 'UTF-16 LE'], ['utf-16be', 'UTF-16 BE']];
  const encLabel = e => { const m = TEXT_ENCODINGS.find(x => x[0] === e); return m ? m[1] : e; };

  // UTF-16：有 BOM 就照 BOM；沒有 BOM 時看 NUL 位元組的分布（以英文為主的 UTF-16 檔，每隔一個位元組就是 0）
  function detectUtf16(b) {
    if (b.length >= 2 && b[0] === 0xFF && b[1] === 0xFE && !(b.length >= 4 && b[2] === 0 && b[3] === 0)) return 'utf-16le';
    if (b.length >= 2 && b[0] === 0xFE && b[1] === 0xFF) return 'utf-16be';
    const n = Math.min(b.length, 4000) & ~1;
    if (n < 8) return '';
    let ev = 0, od = 0;
    for (let i = 0; i < n; i += 2) { if (b[i] === 0) ev++; if (b[i + 1] === 0) od++; }
    const pairs = n / 2;
    if (od / pairs > 0.3 && ev / pairs < 0.02) return 'utf-16le';
    if (ev / pairs > 0.3 && od / pairs < 0.02) return 'utf-16be';
    return '';
  }
  // 解碼之後還是一堆控制字元或替代字元：其實是二進位檔，不是文字
  function looksLikeText(t) {
    const n = Math.min(t.length, 20000);
    if (!n) return true;
    let bad = 0;
    for (let i = 0; i < n; i++) { const c = t.charCodeAt(i); if (c === 0xFFFD || (c < 32 && c !== 9 && c !== 10 && c !== 13 && c !== 12 && c !== 27)) bad++; }
    return bad / n < 0.02;
  }
  // 被切在多位元組字元中間的 UTF-8 結尾：往回退到完整字元的邊界
  function trimPartialUtf8(b) {
    let i = b.length - 1, k = 0;
    while (i >= 0 && k < 3 && (b[i] & 0xC0) === 0x80) { i--; k++; }   // 往回找最後一個起始位元組
    if (i < 0) return b;
    const lead = b[i], need = lead >= 0xF0 ? 4 : lead >= 0xE0 ? 3 : lead >= 0xC0 ? 2 : 1;
    return b.length - i < need ? b.subarray(0, i) : b;   // 這個字元的位元組還沒到齊才切掉
  }

  // 回傳 { text, encoding, guessed, runnerUp }。forced：使用者手動指定的編碼
  function decodeTextBytes(bytes, forced) {
    const dec = (enc, fatal, b) => new TextDecoder(enc, { fatal: !!fatal }).decode(b || bytes);
    if (forced) return { text: dec(forced, false).replace(/^\uFEFF/, ''), encoding: forced, guessed: false, forced: true };
    const u16 = detectUtf16(bytes.subarray(0, 4000));
    if (u16) return { text: dec(u16, false).replace(/^\uFEFF/, ''), encoding: u16, guessed: false, bom: bytes[0] === 0xFF || bytes[0] === 0xFE };
    try { return { text: dec('utf-8', true), encoding: 'utf-8', guessed: false }; } catch (_) {}

    // 不是合法的 UTF-8：用內容判斷是哪種舊式編碼（只看前 400 KB）
    const sample0 = bytes.length > 400000 ? bytes.subarray(0, 400000) : bytes;
    const sample = sample0.length === bytes.length ? sample0 : sample0.subarray(0, sample0.length - 1);   // 取樣切在字元中間時，丟掉最後一個位元組
    // 位元組結構：高位元組後面接 0x40–0x7E 的比例。Big5 約三、四成；GB2312 範圍的簡體中文幾乎是 0
    let pairs = 0, low = 0, hi = 0, hiAdj = 0;
    for (let i = 0; i < sample.length; i++) {
      const c = sample[i];
      if (c >= 0x81 && c <= 0xFE) {
        hi++;
        if (i + 1 < sample.length && sample[i + 1] >= 0x80) hiAdj++;
        if (i + 1 < sample.length && sample[i + 1] >= 0x40) { pairs++; if (sample[i + 1] < 0x80) low++; i++; }
      } else if (c >= 0x80) hi++;
    }
    const p = pairs ? low / pairs : 0;
    const common = new Set(SUB_COMMON);
    const cands = [];
    for (const enc of ['big5', 'gb18030', 'shift_jis', 'euc-kr']) {
      let t; try { t = dec(enc, true, sample); } catch (_) { continue; }
      let n = 0, hit = 0, han = 0, kana = 0, hangul = 0, punct = 0, bad = 0;
      for (const ch of t) {
        const c = ch.codePointAt(0);
        if (c < 128) continue;
        n++;
        if (c >= 0x4E00 && c <= 0x9FFF) { han++; if (common.has(ch)) hit++; }
        else if (c >= 0x3040 && c <= 0x30FF) kana++;
        else if (c >= 0xAC00 && c <= 0xD7AF) hangul++;
        else if (c >= 0xFF61 && c <= 0xFF9F) bad++;                       // 半形片假名：真正的日文幾乎不會出現，通常是別種編碼被誤解
        else if ((c >= 0x3000 && c <= 0x303F) || (c >= 0xFF00 && c <= 0xFFEF)) punct++;
        else if (c === 0xFFFD || (c >= 0xE000 && c <= 0xF8FF) || (c >= 0x3400 && c <= 0x4DBF) || (c >= 0xF900 && c <= 0xFAFF)) bad++;
      }
      let score = n ? (hit + 0.7 * kana + 0.7 * hangul + 0.4 * punct - 1.2 * bad) / n : 0;
      if (enc === 'euc-kr' && n && han / n > 0.05) score *= Math.max(0, 1 - 3 * han / n);   // 韓文夾一堆漢字：多半是簡體 / 繁體中文被誤解
      if (enc === 'big5' && p > 0.1 && pairs >= 6) score += 0.25;
      if (enc === 'gb18030' && p < 0.02 && pairs >= 8) score += 0.15;
      cands.push({ enc, score });
    }
    // Windows-1252：高位元組多半單獨出現（é ü ñ…）。中文、日文、韓文的高位元組會兩兩相鄰
    const adj = hi ? hiAdj / hi : 0;
    let c1 = 0, sym = 0, hiCh = 0;
    try { for (const ch of dec('windows-1252', false, sample)) { const c = ch.codePointAt(0); if (c < 128) continue; hiCh++; if (c >= 0x80 && c <= 0x9F) c1++; else if (c >= 0xA1 && c <= 0xBF && c !== 0xBF && c !== 0xA1 && c !== 0xAA && c !== 0xBA && c !== 0xAB && c !== 0xBB) sym++; } } catch (_) {}
    // 真正的法文 / 德文 / 西文以小寫重音字母（é ü ñ）為主；Big5 誤解成西歐文字會滿是符號（© ³ ¹ ¤…）
    const symFrac = hiCh ? sym / hiCh : 0;
    const latin = adj < 0.3 && c1 === 0 && symFrac < 0.25 ? 0.55 + (0.3 - adj) - symFrac : 0;
    cands.push({ enc: 'windows-1252', score: latin });
    cands.sort((a, b) => b.score - a.score);
    const best = cands[0];
    return { text: dec(best.enc, false), encoding: best.enc, guessed: true, runnerUp: cands[1] && cands[1].score > 0 ? cands[1].enc : '' };
  }

  function csvParse(text, delim) {
    const rows = [];
    let row = [], cur = '', inQ = false, i = 0;
    const n = text.length;
    if (text.charCodeAt(0) === 0xFEFF) i = 1;
    for (; i < n; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += c;
      } else if (c === '"' && cur === '') inQ = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = '';
        rows.push(row); row = [];
      } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  // 猜分隔符號：前幾行裡，哪一種符號出現的次數最一致
  function csvDetect(text) {
    const lines = text.split(/\r?\n/, 12).filter(l => l.trim()).slice(0, 10);
    let best = ',', bestScore = 0;
    for (const d of [',', '\t', ';', '|']) {
      const counts = lines.map(l => l.split(d).length - 1);
      const min = Math.min(...counts);
      if (!lines.length || min < 1) continue;
      const score = min * 10 + (counts.every(c => c === counts[0]) ? 5 : 0);
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }
  async function read(file, limit, encoding) {
    if (/^(image|audio|video)\/|^application\/pdf$/.test(file.type)) return null;
    const bytes = new Uint8Array(await file.slice(0, limit).arrayBuffer());
    const result = decodeTextBytes(file.size > limit && (!encoding || encoding === 'utf-8') ? trimPartialUtf8(bytes) : bytes, encoding);
    return encoding || looksLikeText(result.text) ? result : null;
  }

  const languages = new Map(Object.entries({
    yaml: 'yaml', yml: 'yaml', js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
    ts: 'typescript', mts: 'typescript', cts: 'typescript', tsx: 'typescript', json: 'json',
    css: 'css', scss: 'scss', less: 'less', html: 'xml', htm: 'xml', xml: 'xml', svg: 'xml',
    sh: 'bash', bash: 'bash', zsh: 'bash', py: 'python', cs: 'csharp', java: 'java', go: 'go',
    c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', sql: 'sql',
    md: 'markdown', markdown: 'markdown', ini: 'ini', toml: 'ini', env: 'ini',
    rs: 'rust', rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin', kts: 'kotlin',
    lua: 'lua', pl: 'perl', r: 'r', graphql: 'graphql', gql: 'graphql',
    diff: 'diff', patch: 'diff', makefile: 'makefile', gnumakefile: 'makefile', mk: 'makefile',
  }));

  async function highlight(name, text, maxChars = 200000) {
    if (text.length > maxChars) return null;
    const filename = name.toLowerCase();
    const dockerfile = /^(?:dockerfile|containerfile)(?:\.|$)|\.(?:dockerfile|containerfile)$/.test(filename);
    const language = dockerfile ? 'dockerfile' :
      /^\.env(?:\.|$)/.test(filename) ? 'ini' : languages.get(filename.split('.').at(-1));
    if (!language) return null;
    const hljs = await library('hljs');
    if (dockerfile && !hljs.getLanguage(language)) {
      hljs.registerLanguage(language, hl => ({
        case_insensitive: true,
        contains: [
          hl.HASH_COMMENT_MODE,
          hl.QUOTE_STRING_MODE,
          hl.APOS_STRING_MODE,
          { scope: 'keyword', match: /(?<=^|\n)[ \t]*(?:FROM|RUN|CMD|LABEL|MAINTAINER|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\b/ },
        ],
      }));
    }
    return hljs.getLanguage(language) ? hljs.highlight(text, { language, ignoreIllegals: true }).value : null;
  }

  const cdnHosts = new Set([
    'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com', 'code.jquery.com',
    'ajax.googleapis.com', 'fonts.googleapis.com', 'fonts.gstatic.com',
    'stackpath.bootstrapcdn.com', 'maxcdn.bootstrapcdn.com', 'cdn.tailwindcss.com',
  ]);

  async function isolatedHtml(text, resolveLocal, mediaType, { scripts = false, external = 'blocked' } = {}) {
    const root = await sanitizeHtml(text, {
      WHOLE_DOCUMENT: true,
      RETURN_DOM: true,
      USE_PROFILES: { html: true },
      ADD_TAGS: scripts ? ['link', 'script'] : ['link'],
      FORBID_TAGS: ['base', 'meta', 'iframe', 'frame', 'object', 'embed', 'form', 'audio', 'video', 'source'],
      FORBID_ATTR: ['srcset', 'action', 'formaction', 'ping', 'poster'],
    });
    let bytes = 0;
    const maxBytes = 40 * 1024 * 1024;
    async function embed(reference, kind) {
      const file = resolveLocal?.(reference);
      const type = file && mediaType(file);
      const mime = kind === 'style' && /\.css$/i.test(file?.name) ? 'text/css' :
        kind === 'script' && /\.(?:js|mjs|cjs)$/i.test(file?.name) ? 'text/javascript' :
        kind === 'image' && type?.startsWith('image/') ? type : null;
      if (!file || !mime) return null;
      if (file.size > 8 * 1024 * 1024 || bytes + file.size > maxBytes) return null;
      bytes += file.size;
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file.slice(0, file.size, mime));
      });
    }
    async function resource(reference, kind) {
      if (!reference) return null;
      if (kind === 'image' && /^data:image\//i.test(reference)) return reference;
      if (/^(?:https?:)?\/\//i.test(reference)) {
        try {
          const url = new URL(reference, 'https://viewer.invalid');
          if (external === 'all' || (external === 'cdn' && cdnHosts.has(url.hostname) && !url.port)) return url.href;
        } catch {}
        return null;
      }
      return embed(reference, kind);
    }
    for (const node of root.querySelectorAll('[href], [src]')) {
      if (node.localName === 'link') {
        const href = node.rel.toLowerCase() === 'stylesheet' && await resource(node.getAttribute('href'), 'style');
        if (href) node.setAttribute('href', href);
        else node.remove();
      } else if (node.localName === 'img' && node.hasAttribute('src')) {
        const src = await resource(node.getAttribute('src'), 'image');
        if (src) node.setAttribute('src', src);
        else node.removeAttribute('src');
      } else if (node.localName === 'script' && scripts) {
        const src = await resource(node.getAttribute('src'), 'script');
        if (src) node.setAttribute('src', src);
        else node.remove();
      } else {
        node.removeAttribute('href');
        node.removeAttribute('src');
      }
    }
    const hosts = external === 'all' ? ' https: http:' :
      external === 'cdn' ? ' ' + [...cdnHosts].map(host => 'https://' + host).join(' ') : '';
    const directives = [
      "default-src 'none'", "connect-src 'none'", "base-uri 'none'", "form-action 'none'",
      "style-src 'unsafe-inline' data:" + hosts, 'img-src data:' + hosts, 'font-src data:' + hosts,
      scripts ? "script-src 'unsafe-inline' data:" + hosts : "script-src 'none'",
    ];
    const policy = `<meta http-equiv="Content-Security-Policy" content="${directives.join('; ')}">`;
    let head = root.querySelector('head');
    if (!head) {
      head = root.ownerDocument.createElement('head');
      root.prepend(head);
    }
    head.insertAdjacentHTML('afterbegin', policy);
    return '<!doctype html>' + root.outerHTML;
  }

  function mergeRanges(rs) {
    if (rs.length < 2) return rs;
    rs.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const out = [rs[0].slice()];
    for (let i = 1; i < rs.length; i++) {
      const last = out[out.length - 1], r = rs[i];
      if (r[0] <= last[1]) {
        if (r[1] > last[1]) last[1] = r[1];
        last[2] = last[2] && r[2] ? 1 : 0;
      } else out.push(r.slice());
    }
    return out;
  }

  // 解析查詢：空白分隔多組關鍵字，"雙引號" 內視為一組片語
  function parseQuery(q) {
    const terms = [], seen = new Set();
    const re = /"([^"]+)"|(\S+)/g;
    let m;
    while ((m = re.exec(q)) && terms.length < 8) {
      const t = (m[1] || m[2]).trim();
      const k = t.toLowerCase();
      if (t && !seen.has(k)) { seen.add(k); terms.push(t); }
    }
    return terms;
  }

  // 限定編輯距離的 Damerau-Levenshtein（相鄰字母對調算 1）
  function osa(a, b, max) {
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    let prev2 = null, prev = new Array(lb + 1), cur = new Array(lb + 1);
    for (let j = 0; j <= lb; j++) prev[j] = j;
    for (let i = 1; i <= la; i++) {
      cur[0] = i;
      let rowMin = cur[0];
      for (let j = 1; j <= lb; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
        cur[j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      prev2 = prev; prev = cur; cur = new Array(lb + 1);
    }
    return prev[lb];
  }

  // 單字層級的模糊比對：縮寫（子序列，需同字首）或打錯字（編輯距離）
  function fuzzyTokenMatch(nd, tok) {
    const L = nd.length;
    if (tok.length < 2 || tok.length > 64) return false;
    if (tok[0] === nd[0] && tok.length >= L && tok.length <= L * 3 + 2) {
      let i = 0;
      for (let j = 0; j < tok.length; j++) {
        if (tok[j] === nd[i] && ++i === L) { if (j + 1 <= L * 2) return true; break; }
      }
    }
    const d = L <= 4 ? 0 : L <= 7 ? 1 : 2;
    return d > 0 && osa(nd, tok, d) <= d;
  }

  const TOK_RE = /[A-Za-z0-9\u00C0-\uFFFF]+/g;

  function makeMatcher(terms, opts) {
    const needles = terms.map(t => (opts.cs ? t : t.toLowerCase()));
    //const fuzzable = needles.map(n => n.length >= 3 && !/\s/.test(n));
	const fuzzable = needles.map(n =>
		n.length >= 3 &&
		!/\s/.test(n) &&
		!/[^A-Za-z0-9\u00C0-\uFFFF]/.test(n)
	);
    const cache = needles.map(() => new Map());   // 每個關鍵字：單字 -> 是否模糊命中
    const prep = text => {
      if (opts.cs) return text;
      const l = text.toLowerCase();
      return l.length === text.length ? l : text;   // 少數字元轉小寫後長度會變，保持位置對齊
    };
    const fuzzyTok = (i, tok) => {
      const c = cache[i];
      let v = c.get(tok);
      if (v === undefined) { v = fuzzyTokenMatch(needles[i], tok); c.set(tok, v); }
      return v;
    };
    function matchExact(text) {
      const h = prep(text);
      let ranges = null;
      const found = new Set();
      for (let i = 0; i < needles.length; i++) {
        const nd = needles[i];
        let from = 0, p, cnt = 0;
        while (cnt < 50 && (p = h.indexOf(nd, from)) !== -1) {
          (ranges || (ranges = [])).push([p, p + nd.length, 0]);
          found.add(i);
          from = p + nd.length;
          cnt++;
        }
      }
      return found.size ? { ranges: mergeRanges(ranges), terms: found } : null;
    }
    function matchFuzzy(text, idxSet) {
      const h = prep(text);
      let ranges = null;
      const found = new Set();
      for (const i of idxSet) {
        if (!fuzzable[i]) continue;
        TOK_RE.lastIndex = 0;
        let m;
        while ((m = TOK_RE.exec(h))) {
          if (fuzzyTok(i, m[0])) {
            (ranges || (ranges = [])).push([m.index, m.index + m[0].length, 1]);
            found.add(i);
          }
        }
      }
      return found.size ? { ranges: mergeRanges(ranges), terms: found } : null;
    }
    return { terms, needles, opts, matchExact, matchFuzzy };
  }

  // 掃描一份文字（逐行）。先做精確比對；某關鍵字在這個檔案完全沒出現時，才用模糊比對補救
  function scanText(lines, matcher, cap) {
    const n = matcher.needles.length;
    const map = new Map();
    const termSet = new Set();
    let truncated = false;
    for (let i = 0; i < lines.length; i++) {
      const r = matcher.matchExact(lines[i]);
      if (!r) continue;
      r.terms.forEach(t => termSet.add(t));
      if (map.size < cap) map.set(i, { line: i, ranges: r.ranges, terms: r.terms });
      else { truncated = true; if (termSet.size === n) break; }
    }
    if (matcher.opts.fuzzy && termSet.size < n) {
      const missing = new Set();
      for (let t = 0; t < n; t++) if (!termSet.has(t)) missing.add(t);
      for (let i = 0; i < lines.length; i++) {
        const r = matcher.matchFuzzy(lines[i], missing);
        if (!r) continue;
        r.terms.forEach(t => termSet.add(t));
        const h = map.get(i);
        if (h) {
          h.ranges = mergeRanges(h.ranges.concat(r.ranges));
          r.terms.forEach(t => h.terms.add(t));
        } else if (map.size < cap) map.set(i, { line: i, ranges: r.ranges, terms: r.terms });
        else truncated = true;
      }
    }
    const hits = [...map.values()].sort((a, b) => a.line - b.line);
    return { hits, hmap: map, termSet, truncated };
  }

  return { parseQuery, makeMatcher, scanText, isolatedHtml, encodings: TEXT_ENCODINGS, read, highlight, csvParse, csvDetect };
})();
