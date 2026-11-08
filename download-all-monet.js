const https = require('https');
const fs = require('fs');
const path = require('path');

const TARGET_ORIGIN = 'https://100yearsmonet.com';
const CACHE_DIR = path.join(__dirname, 'monet_assets');

// Full list of all lazy-loaded / remaining assets across the entire website
const FILES_TO_DOWNLOAD = [
  'favicon.ico',
  'apple-touch-icon.png',
  'og.jpg',
  'og.mp4',
  // Audio
  'audio/ambient.mp3',
  'audio/prologue-1.mp3',
  'audio/prologue-2.mp3',
  'audio/prologue-3.mp3',
  // UI & Garden layers
  'ui/garden-bridge.webp',
  'ui/garden-front-cata.webp',
  'ui/garden-front.webp',
  'ui/garden-full-sm.webp',
  'ui/garden-full.webp',
  'ui/garden-mid-sm.webp',
  'ui/garden-mid.webp',
  'ui/pre.jpg',
  'ui/sky.webp',
  'ui/sky-cata.webp',
  'ui/arch-color.webp',
  'ui/arch-depth.webp',
  'ui/arch-normal.webp',
  // Animated painting videos (in artworks.json)
  'video/footbridge.mp4',
  'video/gare-saint-lazare.mp4',
  'video/haystacks-sunset.mp4',
  'video/impression-sunrise.mp4',
  'video/poppies-giverny.mp4',
  'video/vetheuil.mp4'
];

// Add all 24 sprite sheets for the 1,247 works catalogue (works/s0.jpg .. works/s23.jpg)
for (let i = 0; i <= 23; i++) {
  FILES_TO_DOWNLOAD.push(`works/s${i}.jpg`);
}

// Add all 483 prologue desktop frames (prologue/d/001.webp .. 483.webp)
for (let i = 1; i <= 483; i++) {
  const num = String(i).padStart(3, '0');
  FILES_TO_DOWNLOAD.push(`prologue/d/${num}.webp`);
}

// Filter only files not yet downloaded (or 0 bytes)
const queue = FILES_TO_DOWNLOAD.filter((rel) => {
  const full = path.join(CACHE_DIR, rel);
  return !(fs.existsSync(full) && fs.statSync(full).size > 0);
});

console.log(`======================================================`);
console.log(`📦 Tổng số file trong danh sách: ${FILES_TO_DOWNLOAD.length}`);
console.log(`✅ Đã có sẵn trên ổ cứng:        ${FILES_TO_DOWNLOAD.length - queue.length}`);
console.log(`⬇️  Cần tải thêm:                 ${queue.length}`);
console.log(`======================================================\n`);

if (queue.length === 0) {
  console.log('🎉 Toàn bộ 100% tài nguyên đã nằm trong thư mục e:\\dohoa_cuoiky\\monet_assets!');
  process.exit(0);
}

let completed = 0;
let failed = 0;
let idx = 0;
const CONCURRENCY = 10;

function downloadOne(relPath) {
  return new Promise((resolve) => {
    const localPath = path.join(CACHE_DIR, relPath);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    const url = `${TARGET_ORIGIN}/${relPath}`;

    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://100yearsmonet.com/'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        failed++;
        console.log(`[Bỏ qua ${res.statusCode}] ${relPath}`);
        return resolve();
      }
      const tmpPath = localPath + '.tmp';
      const out = fs.createWriteStream(tmpPath);
      res.pipe(out);
      out.on('finish', () => {
        out.close(() => {
          try {
            fs.renameSync(tmpPath, localPath);
          } catch (e) {}
          completed++;
          if (completed % 10 === 0 || completed + failed === queue.length || !relPath.startsWith('prologue/')) {
            console.log(`[${completed + failed}/${queue.length}] Đã tải: ${relPath}`);
          }
          resolve();
        });
      });
      out.on('error', () => {
        failed++;
        resolve();
      });
    }).on('error', (err) => {
      failed++;
      console.log(`[Lỗi] ${relPath}: ${err.message}`);
      resolve();
    });
  });
}

async function run() {
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (idx < queue.length) {
      const current = queue[idx++];
      await downloadOne(current);
    }
  });
  await Promise.all(workers);
  console.log(`\n======================================================`);
  console.log(`🎉 HOÀN TẤT! Đã tải xong ${completed} file mới vào e:\\dohoa_cuoiky\\monet_assets`);
  console.log(`👉 Giờ bạn có thể tắt mạng Internet và chạy http://localhost:8088 bình thường!`);
  console.log(`======================================================`);
}

run();

