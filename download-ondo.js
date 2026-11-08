const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const TARGET_ORIGIN = 'https://ondocollective.jp';
const CACHE_DIR = path.join(__dirname, 'ondo_assets');
const HTML_PATH = path.join(__dirname, 'JD.html');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const visitedUrls = new Set();
const queue = [];

function enqueue(rawPath, baseRelDir = '/') {
  if (!rawPath) return;
  let clean = rawPath.trim().replace(/&amp;/g, '&');
  if (
    clean.startsWith('data:') ||
    clean.startsWith('mailto:') ||
    clean.startsWith('tel:') ||
    clean.startsWith('javascript:') ||
    clean.startsWith('#')
  ) {
    return;
  }

  // Handle full URLs
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    if (clean.startsWith(TARGET_ORIGIN)) {
      clean = clean.slice(TARGET_ORIGIN.length) || '/';
    } else if (clean.startsWith('https://images.microcms-assets.io/')) {
      // Also download microcms images into /_microcms/...
      const u = new URL(clean);
      const widthMatch = u.searchParams.get('w');
      const suffix = widthMatch ? `_w${widthMatch}` : '';
      const ext = path.extname(u.pathname) || '.webp';
      const base = u.pathname.replace(/^\//, '').replace(/\.[^.]+$/, '');
      const localRel = `_microcms/${base}${suffix}${ext}`;
      if (!visitedUrls.has(clean)) {
        visitedUrls.add(clean);
        queue.push({ remoteUrl: clean, localRel, isText: false, baseDir: '/' });
      }
      return;
    } else {
      return;
    }
  }

  // Resolve relative paths (like ./chunk.js inside /_astro/)
  let resolved;
  if (clean.startsWith('/')) {
    resolved = clean;
  } else {
    resolved = path.posix.join(baseRelDir, clean);
  }

  const u = new URL(resolved, TARGET_ORIGIN);
  let pathname = u.pathname;

  // Skip root "/" since we have JD.html
  if (pathname === '/') return;

  // If it's a subpage route like /projects/ or /visuals/, save as .../index.html
  let localRel = pathname.replace(/^\/+/, '');
  const ext = path.posix.extname(pathname).toLowerCase();
  if (!ext || pathname.endsWith('/')) {
    localRel = path.posix.join(localRel, 'index.html');
  }

  const remoteUrl = `${TARGET_ORIGIN}${pathname}${u.search}`;
  if (visitedUrls.has(remoteUrl)) return;
  visitedUrls.add(remoteUrl);

  const isText = /\.(js|mjs|css|json|html|svg|xml|txt|glsl|vert|frag)$/i.test(localRel);
  const baseDir = path.posix.dirname(pathname.endsWith('/') ? pathname + 'index.html' : pathname);

  queue.push({ remoteUrl, localRel, isText, baseDir });
}

function extractFromContent(content, baseDir) {
  // 1. HTML attributes: href="...", src="...", poster="...", srcset="..."
  const attrRe = /(?:href|src|poster)=["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(content)) !== null) {
    enqueue(m[1], baseDir);
  }

  // 2. srcset="url1 750w, url2 1125w"
  const srcsetRe = /srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(content)) !== null) {
    const parts = m[1].split(',');
    for (const part of parts) {
      const urlPart = part.trim().split(/\s+/)[0];
      if (urlPart) enqueue(urlPart, baseDir);
    }
  }

  // 3. CSS url(...)
  const cssUrlRe = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((m = cssUrlRe.exec(content)) !== null) {
    enqueue(m[1], baseDir);
  }

  // 4. JS imports & asset strings: from "./...", import("./..."), "/_astro/...", "/webgl/...", "/video/...", "/assets/...", "/textures/...", "/images/...", "/models/..."
  const jsImportRe = /(?:from\s+|import\s*\(\s*)["']([^"']+\.(?:js|mjs|json|wasm|glb|webp|png|jpg|svg|css))["']/gi;
  while ((m = jsImportRe.exec(content)) !== null) {
    enqueue(m[1], baseDir);
  }

  const rootAssetRe = /["'`](\/(?:_astro|webgl|video|favicons|pdf|ogp|assets|textures|images|models|audio|fonts)\/[a-zA-Z0-9_./-]+)["'`]/g;
  while ((m = rootAssetRe.exec(content)) !== null) {
    enqueue(m[1], '/');
  }

  // 5. JSON or relative file references inside webgl configs (e.g., "textures/...", "/webgl/...")
  const fileExtRe = /["'`](\.?\/?[a-zA-Z0-9_./-]+\.(?:webp|png|jpg|jpeg|svg|mp4|webm|mp3|ogg|wav|json|glb|gltf|bin|ktx2|hdr|wasm|woff2|woff|css|js))["'`]/gi;
  while ((m = fileExtRe.exec(content)) !== null) {
    const candidate = m[1];
    if (
      candidate.startsWith('/') ||
      candidate.startsWith('./') ||
      candidate.startsWith('../') ||
      baseDir.includes('webgl') ||
      baseDir.includes('_astro')
    ) {
      enqueue(candidate, baseDir);
    }
  }
}

function downloadItem(item) {
  return new Promise((resolve) => {
    const fullLocalPath = path.join(CACHE_DIR, item.localRel);
    fs.mkdirSync(path.dirname(fullLocalPath), { recursive: true });

    // If already exists on disk, still parse it if it's text!
    if (fs.existsSync(fullLocalPath) && fs.statSync(fullLocalPath).size > 0) {
      if (item.isText) {
        try {
          const txt = fs.readFileSync(fullLocalPath, 'utf8');
          extractFromContent(txt, item.baseDir);
        } catch (e) {}
      }
      return resolve({ cached: true, ok: true });
    }

    https.get(item.remoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://ondocollective.jp/'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        enqueue(res.headers.location, item.baseDir);
        return resolve({ ok: false });
      }
      if (res.statusCode !== 200) {
        res.resume();
        console.log(`[Bỏ qua ${res.statusCode}] ${item.remoteUrl}`);
        return resolve({ ok: false });
      }

      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        try {
          fs.writeFileSync(fullLocalPath, buf);
        } catch (e) {}
        if (item.isText) {
          try {
            const txt = buf.toString('utf8');
            extractFromContent(txt, item.baseDir);
          } catch (e) {}
        }
        resolve({ ok: true, cached: false, size: buf.length });
      });
      res.on('error', () => resolve({ ok: false }));
    }).on('error', (err) => {
      console.log(`[Lỗi] ${item.remoteUrl}: ${err.message}`);
      resolve({ ok: false });
    });
  });
}

async function main() {
  console.log('🔍 Đang quét file JD.html...');
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf8');
  extractFromContent(htmlContent, '/');

  let downloadedCount = 0;
  let cachedCount = 0;
  let pointer = 0;
  const CONCURRENCY = 10;

  async function worker() {
    while (pointer < queue.length) {
      const currentIndex = pointer++;
      const item = queue[currentIndex];
      const res = await downloadItem(item);
      if (res.ok) {
        if (res.cached) {
          cachedCount++;
        } else {
          downloadedCount++;
          if (downloadedCount % 15 === 0 || !item.localRel.includes('/fonts/')) {
            console.log(`[Tải xong #${downloadedCount}] ${item.localRel}`);
          }
        }
      }
      // If new items were added to queue while downloading, loop continues naturally!
    }
  }

  // Run waves until queue stops growing
  while (pointer < queue.length) {
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  }

  console.log(`\n======================================================`);
  console.log(`🎉 HOÀN TẤT TẢI ONDO COLLECTIVE!`);
  console.log(`📦 Tổng số tài nguyên xử lý: ${queue.length}`);
  console.log(`⬇️  Tải mới:                  ${downloadedCount}`);
  console.log(`✅ Đã có sẵn:                ${cachedCount}`);
  console.log(`📁 Thư mục lưu trữ:          e:\\dohoa_cuoiky\\ondo_assets`);
  console.log(`======================================================`);
}

main();

