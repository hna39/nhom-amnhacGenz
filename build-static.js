// Dựng bản web tĩnh vào thư mục dist/ để deploy lên Vercel / Cloudflare Pages / Netlify.
// Làm đúng những gì monet-server.js làm khi chạy local:
//   - "/" và "/test.html"       -> test.html (bỏ thẻ <base> trỏ về 100yearsmonet.com)
//   - "/ondo-embed.html", "/JD.html" -> JD.html đã gắn nút "Quay lại hồ sen 3D"
//   - file trong monet_assets/ được ưu tiên hơn ondo_assets/ khi trùng tên
//   - mọi trang .html trong thư mục tài nguyên cũng được gắn nút quay lại
// Chạy: node build-static.js
process.env.MONET_BUILD = '1';
const fs = require('fs');
const path = require('path');
const { transformOndoHtml, MONET_DIR, ONDO_DIR } = require('./monet-server.js');

const OUT = path.join(__dirname, 'dist');

function copyDir(src, dest) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(to, { recursive: true });
      copyDir(from, to);
    } else if (entry.name.toLowerCase().endsWith('.html')) {
      fs.writeFileSync(to, transformOndoHtml(fs.readFileSync(from, 'utf8')));
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// ondo trước, monet sau để monet ghi đè khi trùng tên (giống thứ tự ưu tiên của server)
copyDir(ONDO_DIR, OUT);
copyDir(MONET_DIR, OUT);

const home = fs.readFileSync(path.join(__dirname, 'test.html'), 'utf8')
  .replace(/<base\s+href=["']https:\/\/100yearsmonet\.com\/?["']\s*>/i, '');
fs.writeFileSync(path.join(OUT, 'index.html'), home);
fs.writeFileSync(path.join(OUT, 'test.html'), home);

const ondo = transformOndoHtml(fs.readFileSync(path.join(__dirname, 'JD.html'), 'utf8'));
fs.writeFileSync(path.join(OUT, 'ondo-embed.html'), ondo);
fs.writeFileSync(path.join(OUT, 'JD.html'), ondo);

let files = 0, bytes = 0;
(function count(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) count(p); else { files++; bytes += fs.statSync(p).size; }
  }
})(OUT);
console.log(`Đã dựng dist/: ${files} file, ${(bytes / 1048576).toFixed(1)} MB`);
