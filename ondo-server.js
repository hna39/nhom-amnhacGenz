const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 8089;
const TARGET_ORIGIN = 'https://ondocollective.jp';
const CACHE_DIR = path.join(__dirname, 'ondo_assets');
const MAIN_HTML = path.join(__dirname, 'JD.html');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
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
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.ktx2': 'image/ktx2',
  '.wasm': 'application/wasm',
  '.hdr': 'application/octet-stream'
};

function getMimeType(filePath, fallback) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || fallback || 'application/octet-stream';
}

// Rewrite microcms external URLs in HTML to local /_microcms/... paths so offline works 100%
function rewriteHtmlForOffline(html) {
  return html.replace(
    /https:\/\/images\.microcms-assets\.io\/([a-zA-Z0-9_./-]+)(\?[^"')\s]*)?/g,
    (match, relPath, query) => {
      let suffix = '';
      if (query) {
        const cleanQuery = query.replace(/&amp;/g, '&');
        const m = cleanQuery.match(/[?&]w=(\d+)/);
        if (m) suffix = `_w${m[1]}`;
      }
      const ext = path.posix.extname(relPath) || '.webp';
      const base = relPath.replace(/\.[^.]+$/, '');
      return `/_microcms/${base}${suffix}${ext}`;
    }
  );
}

function serveFileWithRange(req, res, filePath, isHtml = false) {
  if (isHtml) {
    const rawHtml = fs.readFileSync(filePath, 'utf8');
    const rewritten = rewriteHtmlForOffline(rawHtml);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(rewritten);
    return;
  }

  const stat = fs.statSync(filePath);
  const mime = getMimeType(filePath);
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

  // Serve JD.html at root "/"
  if (pathname === '/' || pathname === '/index.html' || pathname === '/JD.html') {
    serveFileWithRange(req, res, MAIN_HTML, true);
    return;
  }

  let safeRelPath = pathname.replace(/^\/+/, '').replace(/\.\./g, '');
  let localFilePath = path.join(CACHE_DIR, safeRelPath);

  // Check if path is a directory or subpage route (e.g. /projects/ -> ondo_assets/projects/index.html)
  if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).isDirectory()) {
    localFilePath = path.join(localFilePath, 'index.html');
  } else if (!path.extname(localFilePath) && fs.existsSync(path.join(localFilePath, 'index.html'))) {
    localFilePath = path.join(localFilePath, 'index.html');
  }

  if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile() && fs.statSync(localFilePath).size > 0) {
    const isHtml = localFilePath.endsWith('.html');
    serveFileWithRange(req, res, localFilePath, isHtml);
    return;
  }

  // Fallback proxy to https://ondocollective.jp if a file was not yet cached
  const remoteUrl = `${TARGET_ORIGIN}${parsedUrl.pathname}${parsedUrl.search}`;
  console.log(`[Proxy Fetch] ${remoteUrl}`);

  const options = {
    headers: {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
      'Accept': req.headers['accept'] || '*/*',
      'Referer': 'https://ondocollective.jp/',
      'Origin': 'https://ondocollective.jp'
    }
  };

  https.get(remoteUrl, options, (remoteRes) => {
    const statusCode = remoteRes.statusCode || 200;
    const contentType = getMimeType(localFilePath, remoteRes.headers['content-type']);
    res.writeHead(statusCode, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    if (statusCode === 200) {
      try {
        const saveTarget = (!path.extname(localFilePath)) ? path.join(localFilePath, 'index.html') : localFilePath;
        fs.mkdirSync(path.dirname(saveTarget), { recursive: true });
        remoteRes.pipe(fs.createWriteStream(saveTarget));
      } catch (e) {}
    }
    remoteRes.pipe(res);
  }).on('error', () => {
    res.writeHead(404);
    res.end('Offline / Not Found');
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🌿 Ondo Collective Local Server (100% Offline) đang chạy!`);
  console.log(`👉 Mở trình duyệt tại: http://localhost:${PORT}`);
  console.log(`📁 Thư mục tài nguyên local: e:\\dohoa_cuoiky\\ondo_assets`);
  console.log(`======================================================\n`);
});

