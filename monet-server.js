const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 8088;
const MONET_DIR = path.join(__dirname, 'monet_assets');
const ONDO_DIR = path.join(__dirname, 'ondo_assets');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.ktx2': 'image/ktx2',
  '.wasm': 'application/wasm',
  '.hdr': 'application/octet-stream',
  '.webmanifest': 'application/manifest+json'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

const ONDO_BRIDGE_SCRIPT = `
<style>
  .monet-back-pill {
    position: fixed;
    left: 24px;
    bottom: 24px;
    z-index: 99999;
    padding: 10px 16px;
    border-radius: 999px;
    background: rgba(0, 60, 38, 0.88);
    color: #f3e5de;
    font: 500 12px/1 "Poppins-eff274c5f1fc31cf", sans-serif;
    letter-spacing: 0.06em;
    border: 1px solid rgba(243, 229, 222, 0.25);
    cursor: pointer;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition: opacity 0.35s ease, transform 0.35s ease, background 0.25s ease;
  }
  .monet-back-pill:hover {
    background: rgba(0, 60, 38, 1);
    transform: translateY(-2px);
  }
  .monet-back-pill.is-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateY(8px);
  }
</style>
<button type="button" class="monet-back-pill" id="monetBackPill" title="Bấm để quay lại hồ sen 3D">↑ Quay lại hồ sen 3D</button>
<script>
(function() {
  let enterTime = 0;
  let upAccum = 0;
  let lastWheelTime = 0;
  const pill = document.getElementById('monetBackPill');

  function exitToMonet() {
    upAccum = 0;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'ONDO_EXIT_TOP', fromPill: true }, '*');
    }
  }

  if (pill) {
    pill.addEventListener('click', exitToMonet);
    window.addEventListener('scroll', () => {
      pill.classList.toggle('is-hidden', window.scrollY > 360);
    }, { passive: true });
  }

  window.addEventListener('message', (e) => {
    if (!e.data || !e.data.type) return;
    if (e.data.type === 'ONDO_ENTER') {
      enterTime = performance.now();
      upAccum = 0;
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (window.LineDrawAnimation && typeof window.LineDrawAnimation.playDraw === 'function') {
        try {
          window.LineDrawAnimation.setProgress(0);
          window.LineDrawAnimation.playDraw();
        } catch (err) {}
      }
    } else if (e.data.type === 'ONDO_WHEEL_FORWARD') {
      window.scrollBy({ top: e.data.deltaY, behavior: 'auto' });
    }
  });

  window.addEventListener('wheel', (e) => {
    const now = performance.now();
    if (now - lastWheelTime > 450) upAccum = 0;
    lastWheelTime = now;

    // Cuộn lên chỉ cuộn ngược trong trang, không tự quay về hồ sen 3D
    upAccum = 0;
  }, { passive: true });

  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!e.touches || !e.touches[0]) return;
    const dy = e.touches[0].clientY - touchStartY;
    void dy;
  }, { passive: true });
})();
</script>
`;

function transformOndoHtml(html) {
  let out = html.replace(/https:\/\/images\.microcms-assets\.io\//g, '/_microcms/');
  out = out.replace(/<script[^>]+static\.cloudflareinsights\.com[^>]*><\/script>/gi, '');
  if (out.includes('</body>')) {
    out = out.replace('</body>', ONDO_BRIDGE_SCRIPT + '\n</body>');
  } else {
    out += ONDO_BRIDGE_SCRIPT;
  }
  return out;
}

function resolveAssetFile(safeRelPath) {
  const candidates = [
    path.join(MONET_DIR, safeRelPath),
    path.join(ONDO_DIR, safeRelPath),
    path.join(ONDO_DIR, safeRelPath, 'index.html'),
    path.join(ONDO_DIR, `${safeRelPath}.html`)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return c;
    }
  }
  return null;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. Serve combined Monet + Ondo page at "/" or "/test.html"
  if (pathname === '/' || pathname === '/index.html' || pathname === '/test.html') {
    const htmlPath = path.join(__dirname, 'test.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/<base\s+href=["']https:\/\/100yearsmonet\.com\/?["']\s*>/i, '');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // 2. Serve Ondo Collective embedded view at "/ondo-embed.html" or "/JD.html"
  if (pathname === '/ondo-embed.html' || pathname === '/JD.html') {
    const jdPath = path.join(__dirname, 'JD.html');
    const html = transformOndoHtml(fs.readFileSync(jdPath, 'utf8'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // 3. Serve static assets from monet_assets/ or ondo_assets/
  const safeRelPath = pathname.replace(/^\/+/, '').replace(/\.\./g, '');
  const filePath = resolveAssetFile(safeRelPath);

  if (filePath) {
    const stat = fs.statSync(filePath);
    const mime = getMimeType(filePath);

    if (mime.startsWith('text/html')) {
      const html = transformOndoHtml(fs.readFileSync(filePath, 'utf8'));
      res.writeHead(200, { 'Content-Type': mime });
      res.end(html);
      return;
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mime
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found: ' + pathname);
});

// Khi build web tĩnh (build-static.js) thì chỉ dùng các hàm, không mở server
module.exports = { transformOndoHtml, MONET_DIR, ONDO_DIR };
if (!process.env.MONET_BUILD) server.listen(PORT, () => {
  console.log('==========================================================');
  console.log(`  MONET 100 x ONDO COLLECTIVE (100% OFFLINE COMBINED)`);
  console.log(`  Mở trình duyệt tại: http://localhost:${PORT}`);
  console.log(`  - Font chữ 3D hành lang: Playfair Display (SemiBold 600)`);
  console.log(`  - Cuộn qua hoa sen 3D Monet -> Chuyển mượt sang Ondo Web`);
  console.log('==========================================================');
});
